const express = require('express');
const { createAssignment, getClassroomAssignments, getAssignmentById } = require('../controllers/assignmentController');
const authenticateToken = require('../utils/auth');
const { requireTeacher } = require('../utils/requireTeacher');
const multer = require('multer');

const assignmentRouter = express.Router();

// Use memory storage - files are uploaded directly to ImageKit
const uploadAssignmentFile = multer({ storage: multer.memoryStorage() });

const logAssignmentCreateRequest = (req, _res, next) => {
    console.log('[assignment/create] Route hit', {
        contentType: req.headers['content-type'],
        userId: req.user?.id || null,
    });
    next();
};

assignmentRouter.post('/create', authenticateToken, requireTeacher, logAssignmentCreateRequest, uploadAssignmentFile.single('file'), createAssignment);
assignmentRouter.get('/classroom/:classroomId', authenticateToken, getClassroomAssignments);
assignmentRouter.get('/item/:assignmentId', authenticateToken, getAssignmentById);

module.exports = { assignmentRouter };
