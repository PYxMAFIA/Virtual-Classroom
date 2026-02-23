const Assignment = require('../models/assignmentModel');
const { Classroom } = require('../models/classroomModel');

const createAssignment = async (req, res) => {
    try {
        const { title, description, classroomId, dueDate } = req.body;
        const file = req.file;

        if (!title || !classroomId) {
            return res.status(400).json({ message: 'Title and Classroom ID are required.' });
        }

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ message: 'Classroom not found.' });
        }

        // Teacher can only post into their own classroom
        if (classroom.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the classroom teacher can create assignments.' });
        }

        const assignment = new Assignment({
            title,
            description,
            classroom: classroomId,
            teacher: req.user.id,
            dueDate,
        });

        if (file) {
            const relativeUrl = `/uploads/assignments/${file.filename}`;
            assignment.fileUrl = relativeUrl;
            assignment.fileURL = relativeUrl;
        }

        await assignment.save();

        await Classroom.updateOne(
            { _id: classroomId },
            { $addToSet: { assignments: assignment._id } }
        );

        res.status(201).json({ message: 'Assignment created successfully', assignment });
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ message: 'Failed to create assignment.' });
    }
};

const getClassroomAssignments = async (req, res) => {
    try {
        const { classroomId } = req.params;

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ message: 'Classroom not found.' });
        }

        const userId = req.user.id;
        const isTeacher = classroom.teacher.toString() === userId;
        const isStudent = classroom.students.some((s) => s.toString() === userId);
        if (!isTeacher && !isStudent) {
            return res.status(403).json({ message: 'Join the classroom to view assignments.' });
        }

        const assignments = await Assignment.find({ classroom: classroomId }).sort({ createdAt: -1 });
        res.json({ assignments });
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Failed to fetch assignments.' });
    }
};

const getAssignmentById = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

        const classroom = await Classroom.findById(assignment.classroom);
        if (!classroom) return res.status(404).json({ message: 'Classroom not found.' });

        const userId = req.user.id;
        const isTeacher = classroom.teacher.toString() === userId;
        const isStudent = classroom.students.some((s) => s.toString() === userId);
        if (!isTeacher && !isStudent) {
            return res.status(403).json({ message: 'Join the classroom to view this assignment.' });
        }

        res.json({ assignment });
    } catch (error) {
        console.error('Error fetching assignment:', error);
        res.status(500).json({ message: 'Failed to fetch assignment.' });
    }
};

module.exports = {
    createAssignment,
    getClassroomAssignments,
    getAssignmentById,
};
