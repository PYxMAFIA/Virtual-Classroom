const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    section: {
        type: String,
        default: '',
        trim: true,
    },
    // Backward-compatible: the existing frontend uses `code`
    code: {
        type: String,
        required: true,
        unique: true,
    },
    // Preferred name from the spec
    classroomCode: {
        type: String,
        default: function () {
            return this.code;
        },
        index: true,
    },
    joinLink: {
        type: String,
        default: null,
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    teacherName: {
        type: String,
        default: '',
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    assignments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
    }],

    // Meet state
    activeMeet: {
        type: Boolean,
        default: false,
    },
    meetRoomId: {
        type: String,
        default: null,
    },
    meetLink: {
        type: String,
        default: null,
    },
    meetStartedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
}, { timestamps: true });

const Classroom = mongoose.model('Classroom', classroomSchema);

module.exports = { Classroom };
