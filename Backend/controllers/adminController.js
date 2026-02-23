/**
 * Admin Controller — Analytics & Report endpoints
 */
const UserModel = require('../models/userModel');
const { Classroom } = require('../models/classroomModel');
const Assignment = require('../models/assignmentModel');
const Submission = require('../models/submissionModel');

/**
 * GET /admin/analytics
 * Returns aggregated platform statistics.
 */
const getAnalytics = async (req, res) => {
    try {
        const [
            totalTeachers,
            totalStudents,
            totalClassrooms,
            totalAssignments,
            totalSubmissions,
            aiEvaluated,
            published,
            activeMeets,
        ] = await Promise.all([
            UserModel.countDocuments({ role: 'teacher' }),
            UserModel.countDocuments({ role: 'student' }),
            Classroom.countDocuments(),
            Assignment.countDocuments(),
            Submission.countDocuments(),
            Submission.countDocuments({ isEvaluated: true }),
            Submission.countDocuments({ isPublished: true }),
            Classroom.countDocuments({ activeMeet: true }),
        ]);

        // Recent registrations (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentUsers = await UserModel.countDocuments({ createdAt: { $gte: weekAgo } });

        // Top classrooms by student count
        const topClassrooms = await Classroom.find()
            .populate('teacher', 'name email')
            .sort({ 'students': -1 })
            .limit(5)
            .select('name subject students code teacher');

        const topClassroomData = topClassrooms.map(c => ({
            name: c.name,
            subject: c.subject,
            code: c.code,
            studentCount: c.students?.length || 0,
            teacher: c.teacher?.name || c.teacher?.email || 'Unknown',
        }));

        res.json({
            success: true,
            analytics: {
                totalTeachers,
                totalStudents,
                totalUsers: totalTeachers + totalStudents,
                totalClassrooms,
                totalAssignments,
                totalSubmissions,
                aiEvaluated,
                published,
                activeMeets,
                recentUsers,
                topClassrooms: topClassroomData,
            },
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
};

/**
 * GET /admin/report-csv
 * Returns a downloadable CSV report of platform statistics.
 */
const downloadReport = async (req, res) => {
    try {
        const [
            totalTeachers,
            totalStudents,
            totalClassrooms,
            totalAssignments,
            totalSubmissions,
            aiEvaluated,
            published,
            activeMeets,
        ] = await Promise.all([
            UserModel.countDocuments({ role: 'teacher' }),
            UserModel.countDocuments({ role: 'student' }),
            Classroom.countDocuments(),
            Assignment.countDocuments(),
            Submission.countDocuments(),
            Submission.countDocuments({ isEvaluated: true }),
            Submission.countDocuments({ isPublished: true }),
            Classroom.countDocuments({ activeMeet: true }),
        ]);

        // All classrooms with details
        const classrooms = await Classroom.find()
            .populate('teacher', 'name email')
            .select('name subject code students activeMeet createdAt');

        // Build CSV
        const now = new Date().toISOString();
        let csv = `Virtual Classroom Platform Report\nGenerated: ${now}\n\n`;

        csv += `PLATFORM OVERVIEW\n`;
        csv += `Metric,Value\n`;
        csv += `Total Teachers,${totalTeachers}\n`;
        csv += `Total Students,${totalStudents}\n`;
        csv += `Total Classrooms,${totalClassrooms}\n`;
        csv += `Total Assignments,${totalAssignments}\n`;
        csv += `Total Submissions,${totalSubmissions}\n`;
        csv += `AI Evaluated,${aiEvaluated}\n`;
        csv += `Results Published,${published}\n`;
        csv += `Active Meets,${activeMeets}\n`;
        csv += `\n`;

        csv += `CLASSROOM DETAILS\n`;
        csv += `Name,Subject,Code,Students,Teacher,Active Meet,Created\n`;
        for (const c of classrooms) {
            const teacher = c.teacher?.name || c.teacher?.email || 'Unknown';
            csv += `"${c.name}","${c.subject || ''}","${c.code}",${c.students?.length || 0},"${teacher}",${c.activeMeet ? 'Yes' : 'No'},"${c.createdAt?.toISOString() || ''}"\n`;
        }

        // All teachers
        const teachers = await UserModel.find({ role: 'teacher' }).select('name email createdAt');
        csv += `\nTEACHERS\n`;
        csv += `Name,Email,Joined\n`;
        for (const t of teachers) {
            csv += `"${t.name}","${t.email}","${t.createdAt?.toISOString() || ''}"\n`;
        }

        // All students
        const students = await UserModel.find({ role: 'student' }).select('name email createdAt');
        csv += `\nSTUDENTS\n`;
        csv += `Name,Email,Joined\n`;
        for (const s of students) {
            csv += `"${s.name}","${s.email}","${s.createdAt?.toISOString() || ''}"\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="vc-report-${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Report CSV error:', error);
        res.status(500).json({ message: 'Failed to generate report' });
    }
};

module.exports = { getAnalytics, downloadReport };
