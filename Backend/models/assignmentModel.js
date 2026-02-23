const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    // Backward-compatible
    fileUrl: {
        type: String, // Path to the homework file (e.g., PDF)
    },
    // Preferred name from the spec
    fileURL: {
        type: String,
        default: null,
    },
    modelAnswerUrl: {
        type: String, // Path to the model answer for AI grading
    },
    classroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        required: true,
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    dueDate: {
        type: Date,
    },
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
