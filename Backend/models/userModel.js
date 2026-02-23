const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: function () {
            return (this.authProvider || 'local') === 'local';
        },
        select: false,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    verified: {
        type: Boolean,
        required: true,
        default: true
    },
    role: {
        type: String,
        enum: ['teacher', 'student'],
        default: 'student'
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local',
    },
    googleId: {
        type: String,
        default: null,
        index: true,
    },
    classroomsJoined: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
    }],
    classroomsCreated: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
    }],
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema);