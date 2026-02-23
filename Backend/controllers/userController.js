const UserModel = require('../models/userModel')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const SUPER_ADMIN = process.env.SUPER_ADMIN;
require('dotenv').config();
const { OAuth2Client } = require('google-auth-library');

const googleClient = process.env.GOOGLE_CLIENT_ID
    ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
    : null;

const signToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role, name: user.name },
        process.env.SECRET_KEY,
        { expiresIn: '30d' }
    );
};

const register = async (req, res) => {
    try {
        const { college, name, password, email, role } = req.body;
        const displayName = name || college;

        if (!displayName || !password || !email) {
            return res.send({
                success: false,
                status: 400,
                message: "Enter All Fields"
            })
        }

        const existing = await UserModel.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.send({
                success: false,
                status: 401,
                message: "Already Registered Try Logging in"
            })
        }

        const hashPassword = await bcrypt.hash(password, 10);
        const user = new UserModel({
            name: displayName,
            password: hashPassword,
            email: email.toLowerCase(),
            role: role || 'student',
            verified: true,
            authProvider: 'local',
        })
        await user.save()
        const token = signToken(user);

        return res.send({
            success: true,
            status: 200,
            message: "User Registered Successfully wait for the admin to verify or contact at " + process.env.CONTACT,
            token: token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, status: 500, message: 'Server error' });
    }
}

const login = async (req, res) => {
    try {
        const { password, email } = req.body;
        if (!password || !email) {

            return res.send({
                status: 400,
                success: false,
                message: "Enter All Fields"
            })
        }

        const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user) {
            return res.send({
                success: false,
                status: 401,
                message: "User Not Found"
            })

        }

        let superAdmin = 0;
        if (email === SUPER_ADMIN) {
            superAdmin = 1;
        }

        // Legacy verification is kept for backward compatibility, but defaults to verified.
        if (user.verified === false) {
            return res.send({
                success: true,
                status: 201,
                message: "Wait for the admin to verify or contact at " + process.env.CONTACT,
            })
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.send({
                success: false,
                status: 401,
                message: "Invalid credentials",
                superAdmin: superAdmin
            })
        }
        const token = signToken(user);


        return res.send({
            status: 200,
            success: true,
            message: "User logged in Successfully",
            token: token,
            superAdmin: superAdmin,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        })


    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, status: 500, message: 'Server error' });
    }
}

// Google login using Google Identity Services ID token
const googleLogin = async (req, res) => {
    try {
        const { idToken, credential, role } = req.body;
        const tokenToVerify = idToken || credential;
        if (!tokenToVerify) return res.status(400).json({ message: 'Missing Google idToken' });
        if (!googleClient) return res.status(500).json({ message: 'GOOGLE_CLIENT_ID not configured' });

        const ticket = await googleClient.verifyIdToken({
            idToken: tokenToVerify,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = String(payload?.email || '').toLowerCase();
        const name = payload?.name || payload?.given_name || 'Google User';
        const googleId = payload?.sub;

        if (!email || !googleId) return res.status(400).json({ message: 'Invalid Google token payload' });

        let user = await UserModel.findOne({ email });
        if (!user) {
            user = await UserModel.create({
                name,
                email,
                role: role || 'student',
                verified: true,
                authProvider: 'google',
                googleId,
            });
        } else {
            // Link Google account (non-destructive)
            user.googleId = user.googleId || googleId;
            user.authProvider = user.authProvider || 'google';
            user.verified = true;
            await user.save();
        }

        const jwtToken = signToken(user);
        return res.status(200).json({
            success: true,
            token: jwtToken,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        console.error('googleLogin error:', error);
        return res.status(401).json({ message: 'Google authentication failed' });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({
            success: true,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { register, login, googleLogin, getProfile };