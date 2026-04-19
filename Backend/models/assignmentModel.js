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
        index: true,
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    dueDate: {
        type: Date,
    },
    // Soft delete protection - assignments are never truly deleted
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: {
        type: Date,
        default: null,
    },

    // ImageKit file storage reference
    imagekitFileId: {
        type: String,
        default: null,
    },
}, { timestamps: true });

// Index for efficient classroom assignment queries
assignmentSchema.index({ classroom: 1, isDeleted: 1, createdAt: -1 });

// Pre-save hook to ensure isDeleted is always set
assignmentSchema.pre('save', function(next) {
    if (this.isDeleted === undefined || this.isDeleted === null) {
        this.isDeleted = false;
    }
    next();
});

module.exports = mongoose.model('Assignment', assignmentSchema);
