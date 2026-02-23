const express = require('express');
const { login, register, googleLogin, getProfile } = require('../controllers/userController.js');
const authenticateToken = require('../utils/auth');

const userRouter = express.Router();

userRouter.post('/login', login);
userRouter.post('/register', register);
userRouter.post('/google-login', googleLogin);
userRouter.get('/profile', authenticateToken, getProfile);

module.exports = { userRouter };
