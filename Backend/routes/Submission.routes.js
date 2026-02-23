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
const path = require('path');
const fs = require('fs');
const { requireTeacher } = require('../utils/requireTeacher');

const submissionsDir = path.join(__dirname, '../uploads/submissions');
if (!fs.existsSync(submissionsDir)) {
	fs.mkdirSync(submissionsDir, { recursive: true });
}

const submissionStorage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, submissionsDir);
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		cb(null, uniqueSuffix + path.extname(file.originalname));
	},
});

const uploadSubmission = multer({ storage: submissionStorage });
const uploadModel = multer({ storage: multer.memoryStorage() });

const submissionRouter = express.Router();

submissionRouter.post('/submit', authenticateToken, uploadSubmission.single('file'), submitAssignment);

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
