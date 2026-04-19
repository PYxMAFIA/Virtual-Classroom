const express = require('express');
const {
	submitAssignment,
	getAssignmentSubmissions,
	evaluateSubmission,
	evaluateSubmissionWithAI,
	getSubmissionQueue,
	evaluateNextInQueue,
	publishResults,
	getMySubmission,
} = require('../controllers/submissionController');
const authenticateToken = require('../utils/auth');
const multer = require('multer');
const { requireTeacher } = require('../utils/requireTeacher');

// Use memory storage for submissions - files are uploaded directly to ImageKit
const uploadSubmission = multer({ storage: multer.memoryStorage() });
const uploadModel = multer({ storage: multer.memoryStorage() });

const submissionRouter = express.Router();

const logSubmissionRequest = (req, _res, next) => {
	console.log('[submission/submit] Route hit', {
		contentType: req.headers['content-type'],
		userId: req.user?.id || null,
	});
	next();
};

submissionRouter.post('/submit', authenticateToken, logSubmissionRequest, uploadSubmission.single('file'), submitAssignment);

// Student views their own submission (results visible only when published)
submissionRouter.get('/my', authenticateToken, getMySubmission);

// Teacher views class submissions
submissionRouter.get('/assignment/:assignmentId', authenticateToken, requireTeacher, getAssignmentSubmissions);

// Teacher queue (paginated)
submissionRouter.get('/queue', authenticateToken, requireTeacher, getSubmissionQueue);

// Manual evaluation (teacher only)
submissionRouter.post('/evaluate/:submissionId', authenticateToken, requireTeacher, evaluateSubmission);

// AI evaluation (teacher only) - requires a model answer PDF upload
submissionRouter.post('/evaluate-ai/:submissionId', authenticateToken, requireTeacher, uploadModel.single('model'), evaluateSubmissionWithAI);

// AI queue evaluation: evaluate next pending submission (teacher only)
submissionRouter.post('/evaluate-next', authenticateToken, requireTeacher, evaluateNextInQueue);

// Publish results for the classroom (teacher only)
submissionRouter.post('/publish', authenticateToken, requireTeacher, publishResults);

module.exports = { submissionRouter };
