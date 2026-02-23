const express = require('express');
const { createAssignment, getClassroomAssignments, getAssignmentById } = require('../controllers/assignmentController');
const authenticateToken = require('../utils/auth');
const { requireTeacher } = require('../utils/requireTeacher');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const assignmentRouter = express.Router();

const assignmentsDir = path.join(__dirname, '../uploads/assignments');
if (!fs.existsSync(assignmentsDir)) {
	fs.mkdirSync(assignmentsDir, { recursive: true });
}

const assignmentStorage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, assignmentsDir);
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		cb(null, uniqueSuffix + path.extname(file.originalname));
	},
});

const uploadAssignmentFile = multer({ storage: assignmentStorage });

assignmentRouter.post('/create', authenticateToken, requireTeacher, uploadAssignmentFile.single('file'), createAssignment);
assignmentRouter.get('/classroom/:classroomId', authenticateToken, getClassroomAssignments);
assignmentRouter.get('/item/:assignmentId', authenticateToken, getAssignmentById);

module.exports = { assignmentRouter };
