const Submission = require('../models/submissionModel');
const Assignment = require('../models/assignmentModel');
const { Classroom } = require('../models/classroomModel');
const { extractText } = require("../utils/extractText");
const { evaluateSolution } = require('../services/aiEvaluator');
const path = require('path');
const fs = require('fs');

const submitAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.body;
        const file = req.file;

        if (!assignmentId || !file) {
            return res.status(400).json({ message: 'Assignment ID and file are required.' });
        }

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found.' });
        }

        const classroom = await Classroom.findById(assignment.classroom);
        if (!classroom) {
            return res.status(404).json({ message: 'Classroom not found.' });
        }

        const userId = req.user.id;
        const isStudent = classroom.students.some((s) => s.toString() === userId);
        if (!isStudent) return res.status(403).json({ message: 'Only classroom students can submit work.' });

        const relativeUrl = `/uploads/submissions/${file.filename}`;

        // Allow resubmission: replace previous submission for this assignment+student
        let submission = await Submission.findOne({ assignment: assignmentId, student: req.user.id });
        if (!submission) {
            submission = new Submission({
                assignment: assignmentId,
                student: req.user.id,
                fileUrl: relativeUrl,
                solutionFileURL: relativeUrl,
                isEvaluated: false,
                isPublished: false,
            });
        } else {
            submission.fileUrl = relativeUrl;
            submission.solutionFileURL = relativeUrl;
            submission.marks = 0;
            submission.feedback = [];
            submission.evaluated = false;
            submission.aiScore = null;
            submission.aiFeedback = null;
            submission.isEvaluated = false;
            submission.isPublished = false;
        }
        await submission.save();

        res.status(201).json({ message: 'Assignment submitted successfully', submission });
    } catch (error) {
        console.error('Error submitting assignment:', error);
        res.status(500).json({ message: 'Failed to submit assignment.' });
    }
};

const getAssignmentSubmissions = async (req, res) => {
    try {
        const { assignmentId } = req.params;

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found.' });
        }

        // Only the teacher who created the assignment can view submissions
        if (assignment.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not allowed to view these submissions.' });
        }

        const submissions = await Submission.find({ assignment: assignmentId }).populate('student', 'name email');
        res.json({ submissions });
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ message: 'Failed to fetch submissions.' });
    }
};

const evaluateSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { marks, feedback } = req.body;

        const submission = await Submission.findById(submissionId);
        if (!submission) return res.status(404).json({ message: 'Submission not found' });

        const assignment = await Assignment.findById(submission.assignment);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
        if (assignment.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not allowed to evaluate this submission.' });
        }

        if (marks !== undefined) submission.marks = marks;
        if (feedback !== undefined) submission.feedback = feedback;
        submission.evaluated = true;

        await submission.save();

        res.json({ message: 'Evaluation saved successfully', submission });
    } catch (error) {
        console.error('Error evaluating submission:', error);
        res.status(500).json({ message: 'Failed to save evaluation.' });
    }
};

// Backward-compatible: evaluate a specific submission with AI
// (the old UI uploaded a model answer PDF; we now grade against the assignment prompt)
const evaluateSubmissionWithAI = async (req, res) => {
    try {
        const { submissionId } = req.params;

        const submission = await Submission.findById(submissionId);
        if (!submission) return res.status(404).json({ message: 'Submission not found' });

        const assignment = await Assignment.findById(submission.assignment);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
        if (assignment.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not allowed to evaluate this submission.' });
        }

        const submissionPath = path.resolve(__dirname, '..', submission.fileUrl.replace(/^\//, ''));
        if (!fs.existsSync(submissionPath)) {
            return res.status(404).json({ message: 'Student submission file not found on server.' });
        }

        const studentBuffer = fs.readFileSync(submissionPath);
        const studentText = await extractText(studentBuffer, { filename: submission.fileUrl });

        const ai = await evaluateSolution({
            assignmentTitle: assignment?.title,
            assignmentPrompt: assignment?.description,
            studentAnswerText: studentText,
        });

        submission.aiScore = ai.score;
        submission.aiFeedback = ai.feedback;
        submission.isEvaluated = true;
        submission.evaluated = true;
        submission.marks = ai.score;
        submission.feedback = String(ai.feedback || '').split('\n').filter(Boolean);
        await submission.save();

        res.json({ message: 'AI evaluation completed', submission });
    } catch (error) {
        console.error('Error evaluating submission with AI:', error);
        res.status(500).json({ message: 'Failed to evaluate submission with AI.' });
    }
};

// NEW: teacher queue view (pagination)
const getSubmissionQueue = async (req, res) => {
    try {
        const { classroomId } = req.query;
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);

        if (!classroomId) return res.status(400).json({ message: 'classroomId is required' });

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) return res.status(404).json({ message: 'Classroom not found' });
        if (classroom.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the classroom teacher can view the submission queue.' });
        }

        const assignments = await Assignment.find({ classroom: classroomId }).select('_id');
        const assignmentIds = assignments.map((a) => a._id);

        const query = { assignment: { $in: assignmentIds } };
        const total = await Submission.countDocuments(query);

        const submissions = await Submission.find(query)
            .sort({ createdAt: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('student', 'name email')
            .populate('assignment', 'title');

        res.json({
            page,
            limit,
            total,
            submissions,
        });
    } catch (error) {
        console.error('Error fetching submission queue:', error);
        res.status(500).json({ message: 'Failed to fetch submission queue.' });
    }
};

// NEW: evaluate next submission in queue (oldest unevaluated)
const evaluateNextInQueue = async (req, res) => {
    try {
        const { classroomId } = req.body;
        if (!classroomId) return res.status(400).json({ message: 'classroomId is required' });

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) return res.status(404).json({ message: 'Classroom not found' });
        if (classroom.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the classroom teacher can run AI evaluation.' });
        }

        const assignments = await Assignment.find({ classroom: classroomId }).select('_id title description');
        const assignmentIds = assignments.map((a) => a._id);

        const submission = await Submission.findOne({
            assignment: { $in: assignmentIds },
            isEvaluated: false,
        }).sort({ createdAt: 1 });

        if (!submission) return res.json({ message: 'No pending submissions to evaluate', submission: null });

        const assignment = assignments.find((a) => a._id.toString() === submission.assignment.toString())
            || await Assignment.findById(submission.assignment);

        const submissionPath = path.resolve(__dirname, '..', submission.fileUrl.replace(/^\//, ''));
        if (!fs.existsSync(submissionPath)) {
            return res.status(404).json({ message: 'Student submission file not found on server.' });
        }

        const studentBuffer = fs.readFileSync(submissionPath);
        const studentText = await extractText(studentBuffer, { filename: submission.fileUrl });

        const ai = await evaluateSolution({
            assignmentTitle: assignment?.title,
            assignmentPrompt: assignment?.description,
            studentAnswerText: studentText,
        });

        submission.aiScore = ai.score;
        submission.aiFeedback = ai.feedback;
        submission.isEvaluated = true;
        submission.evaluated = true;
        submission.marks = ai.score;
        submission.feedback = String(ai.feedback || '').split('\n').filter(Boolean);
        await submission.save();

        res.json({ message: 'AI evaluation completed', submission });
    } catch (error) {
        console.error('Error evaluating next submission:', error);
        res.status(500).json({ message: 'Failed to evaluate submission with AI.' });
    }
};

// NEW: publish evaluated results for a classroom
const publishResults = async (req, res) => {
    try {
        const { classroomId } = req.body;
        if (!classroomId) return res.status(400).json({ message: 'classroomId is required' });

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) return res.status(404).json({ message: 'Classroom not found' });
        if (classroom.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the classroom teacher can publish results.' });
        }

        const assignments = await Assignment.find({ classroom: classroomId }).select('_id');
        const assignmentIds = assignments.map((a) => a._id);

        const result = await Submission.updateMany(
            { assignment: { $in: assignmentIds }, isEvaluated: true, isPublished: false },
            { $set: { isPublished: true } }
        );

        res.json({ message: 'Results published', modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error('Error publishing results:', error);
        res.status(500).json({ message: 'Failed to publish results.' });
    }
};

// NEW: student sees own submission; scores/feedback only when published
const getMySubmission = async (req, res) => {
    try {
        const { assignmentId } = req.query;
        if (!assignmentId) return res.status(400).json({ message: 'assignmentId is required' });

        const submission = await Submission.findOne({ assignment: assignmentId, student: req.user.id });
        if (!submission) return res.status(404).json({ message: 'Submission not found' });

        if (!submission.isPublished) {
            return res.json({
                submission: {
                    _id: submission._id,
                    assignment: submission.assignment,
                    student: submission.student,
                    fileUrl: submission.fileUrl,
                    solutionFileURL: submission.solutionFileURL,
                    createdAt: submission.createdAt,
                    isEvaluated: submission.isEvaluated,
                    isPublished: submission.isPublished,
                },
            });
        }

        res.json({ submission });
    } catch (error) {
        console.error('Error fetching my submission:', error);
        res.status(500).json({ message: 'Failed to fetch submission.' });
    }
};

module.exports = {
    submitAssignment,
    getAssignmentSubmissions,
    evaluateSubmission,
    evaluateSubmissionWithAI,
    getSubmissionQueue,
    evaluateNextInQueue,
    publishResults,
    getMySubmission,
};
