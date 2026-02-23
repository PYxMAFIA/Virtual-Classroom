const express = require('express');
const { getAnalytics, downloadReport } = require('../controllers/adminController');
const authenticateToken = require('../utils/auth');

const adminRouter = express.Router();

// Both endpoints require admin authentication
adminRouter.get('/analytics', authenticateToken, getAnalytics);
adminRouter.get('/report-csv', authenticateToken, downloadReport);

module.exports = { adminRouter };
