const { Classroom } = require('../models/classroomModel');
const crypto = require('crypto');
const User = require('../models/userModel');

const extractCodeFromJoinLink = (joinLinkOrCode) => {
    if (!joinLinkOrCode) return null;
    const raw = String(joinLinkOrCode).trim();
    if (!raw) return null;

    // If it already looks like a 6-char code, accept it.
    const direct = raw.replace(/[^a-z0-9]/gi, '').toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(direct)) return direct;

    // Try parsing as URL first (handles ?code=ABC123 too)
    try {
        const url = new URL(raw);
        const codeParam = url.searchParams.get('code') || url.searchParams.get('classroomCode');
        if (codeParam) {
            const cleaned = String(codeParam).replace(/[^a-z0-9]/gi, '').toUpperCase();
            if (/^[A-Z0-9]{6}$/.test(cleaned)) return cleaned;
        }

        const parts = url.pathname.split('/').filter(Boolean);
        const idx = parts.findIndex((p) => p.toLowerCase() === 'classroom');
        const candidate = idx >= 0 ? parts[idx + 1] : parts[parts.length - 1];
        const cleaned = String(candidate || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
        if (/^[A-Z0-9]{6}$/.test(cleaned)) return cleaned;
    } catch (_) {
        // Not a valid absolute URL, fall through to path parsing.
    }

    // Fall back: attempt to extract code from a path-like string
    const match = raw.match(/\/classroom\/([a-z0-9]{6})/i) || raw.match(/\b([a-z0-9]{6})\b/i);
    if (match && match[1]) return match[1].toUpperCase();
    return null;
};

// Generate a short join code (6 chars)
const generateCode = () => {
    let code = '';
    while (code.length < 6) {
        code += crypto
            .randomBytes(4)
            .toString('base64')
            .replace(/[^A-Z0-9]/gi, '')
            .toUpperCase();
    }
    return code.slice(0, 6);
};

// Create a new classroom
const createClassroom = async (req, res) => {
    try {
        const { name, subject, section } = req.body;

        if (!name || !subject) {
            return res.status(400).json({ message: 'Name and subject are required.' });
        }

        const code = generateCode();

        const frontendBase = process.env.FRONTEND_URL || '';
        const joinLink = frontendBase ? `${frontendBase.replace(/\/$/, '')}/classroom/${code}` : null;

        const classroom = new Classroom({
            name,
            subject,
            section: section || '',
            code,
            classroomCode: code,
            joinLink,
            teacher: req.user.id,
            teacherName: req.user.email || '',
        });

        await classroom.save();

        await User.updateOne(
            { _id: req.user.id },
            { $addToSet: { classroomsCreated: classroom._id } }
        );

        res.status(201).json({
            message: 'Classroom created successfully',
            classroom,
        });
    } catch (error) {
        console.error('Error creating classroom:', error);
        res.status(500).json({ message: 'Failed to create classroom.' });
    }
};

// Get classrooms for the authenticated teacher
const getMyClassrooms = async (req, res) => {
    try {
        const userId = req.user.id;
        const query = req.user.role === 'teacher'
            ? { teacher: userId }
            : { students: userId };

        const classrooms = await Classroom.find(query).populate('teacher', 'name email').sort({ createdAt: -1 });
        res.json({ classrooms });
    } catch (error) {
        console.error('Error fetching classrooms:', error);
        res.status(500).json({ message: 'Failed to fetch classrooms.' });
    }
};

// Get all classrooms (for students to browse)
const getAllClassrooms = async (req, res) => {
    try {
        const classrooms = await Classroom.find().populate('teacher', 'name').sort({ createdAt: -1 });
        res.json({ classrooms });
    } catch (error) {
        console.error('Error fetching classrooms:', error);
        res.status(500).json({ message: 'Failed to fetch classrooms.' });
    }
};

// Get a classroom by its code
const getClassroomByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const classroom = await Classroom.findOne({ $or: [{ code }, { classroomCode: code }] }).populate('teacher', 'name email').populate('students', 'name email');

        if (!classroom) {
            return res.status(404).json({ message: 'Classroom not found.' });
        }

        res.json({ classroom });
    } catch (error) {
        console.error('Error fetching classroom:', error);
        res.status(500).json({ message: 'Failed to fetch classroom.' });
    }
};

// Join a classroom by its code (for students)
const joinClassroom = async (req, res) => {
    try {
        const { code } = req.body;
        const normalizedCode = extractCodeFromJoinLink(code);
        if (!normalizedCode) {
            return res.status(400).json({ message: 'Valid classroom code is required.' });
        }

        const classroom = await Classroom.findOne({ $or: [{ code: normalizedCode }, { classroomCode: normalizedCode }] });

        if (!classroom) {
            return res.status(404).json({ message: 'Classroom not found.' });
        }

        // Check if student is already in the classroom
        if (classroom.students.includes(req.user.id)) {
            return res.status(400).json({ message: 'You are already a member of this classroom.' });
        }

        classroom.students.push(req.user.id);
        await classroom.save();

        await User.updateOne(
            { _id: req.user.id },
            { $addToSet: { classroomsJoined: classroom._id } }
        );

        res.json({ message: 'Joined classroom successfully', classroom });
    } catch (error) {
        console.error('Error joining classroom:', error);
        res.status(500).json({ message: 'Failed to join classroom.' });
    }
};

// Join a classroom by a full join link (or code)
const joinClassroomByLink = async (req, res) => {
    try {
        const { joinLink, code } = req.body || {};
        const extracted = extractCodeFromJoinLink(joinLink || code);
        if (!extracted) {
            return res.status(400).json({ message: 'Valid join link or classroom code is required.' });
        }

        // Reuse the same join logic by delegating to joinClassroom-like flow
        const classroom = await Classroom.findOne({ $or: [{ code: extracted }, { classroomCode: extracted }] });

        if (!classroom) {
            return res.status(404).json({ message: 'Classroom not found.' });
        }

        if (classroom.students.includes(req.user.id)) {
            return res.status(400).json({ message: 'You are already a member of this classroom.' });
        }

        classroom.students.push(req.user.id);
        await classroom.save();

        await User.updateOne(
            { _id: req.user.id },
            { $addToSet: { classroomsJoined: classroom._id } }
        );

        res.json({ message: 'Joined classroom successfully', classroom });
    } catch (error) {
        console.error('Error joining classroom by link:', error);
        res.status(500).json({ message: 'Failed to join classroom.' });
    }
};

module.exports = {
    createClassroom,
    getMyClassrooms,
    getAllClassrooms,
    getClassroomByCode,
    joinClassroom,
    joinClassroomByLink,
};
