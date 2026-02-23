const express = require('express');
const { allVerifiedColleges, evaluatePaper } = require('../controllers/toolsController');
const toolsRouter = express.Router();
const multer = require("multer");
const authenticateToken = require('../utils/auth');
const { requireTeacher } = require('../utils/requireTeacher');

const upload = multer({ storage: multer.memoryStorage() });


toolsRouter.get('/colleges', allVerifiedColleges);
toolsRouter.post('/evaluate', upload.fields([
    { name: "model", maxCount: 1 },
    { name: "student", maxCount: 1 },
]), authenticateToken, requireTeacher, evaluatePaper);

module.exports = { toolsRouter };