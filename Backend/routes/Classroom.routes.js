const express = require('express');
const {
    createClassroom,
    getMyClassrooms,
    getAllClassrooms,
    getClassroomByCode,
    joinClassroom,
    joinClassroomByLink,
} = require('../controllers/classroomController');
const authenticateToken = require('../utils/auth');
const { requireTeacher } = require('../utils/requireTeacher');

const classroomRouter = express.Router();

// Teacher creates a classroom (requires auth)
classroomRouter.post('/create', authenticateToken, requireTeacher, createClassroom);

// Teacher's own classrooms (requires auth)
classroomRouter.get('/my-classrooms', authenticateToken, getMyClassrooms);

// All classrooms (public, for students to browse)
classroomRouter.get('/all', getAllClassrooms);

// Get a classroom by its code (requires auth)
classroomRouter.get('/:code', authenticateToken, getClassroomByCode);

// Join a classroom by its code (requires auth)
classroomRouter.post('/join', authenticateToken, joinClassroom);

// Join a classroom via a shared link (requires auth)
classroomRouter.post('/join-link', authenticateToken, joinClassroomByLink);

module.exports = { classroomRouter };
