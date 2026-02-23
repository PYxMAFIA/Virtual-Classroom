const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true,
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Backward-compatible
    fileUrl: {
        type: String,
        required: true,
    },
    // Preferred name from the spec
    solutionFileURL: {
        type: String,
        default: null,
    },

    // Legacy evaluation fields
    marks: {
        type: Number,
        default: 0,
    },
    feedback: {
        type: [String],
        default: [],
    },
    evaluated: {
        type: Boolean,
        default: false,
    },

    // Spec-aligned evaluation/publish fields
    aiScore: {
        type: Number,
        default: null,
    },
    aiFeedback: {
        type: String,
        default: null,
    },
    isEvaluated: {
        type: Boolean,
        default: false,
    },
    isPublished: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

submissionSchema.pre('save', function (next) {
    // Keep old + new fields in sync for a smooth transition.
    if (this.fileUrl && !this.solutionFileURL) this.solutionFileURL = this.fileUrl;
    if (this.solutionFileURL && !this.fileUrl) this.fileUrl = this.solutionFileURL;

    if (this.isEvaluated && !this.evaluated) this.evaluated = true;
    if (this.evaluated && !this.isEvaluated) this.isEvaluated = true;

    if (typeof this.aiScore === 'number') this.marks = this.aiScore;
    if (typeof this.marks === 'number' && this.aiScore === null) this.aiScore = this.marks;

    if (this.aiFeedback && (!this.feedback || this.feedback.length === 0)) {
        this.feedback = String(this.aiFeedback).split('\n').filter(Boolean);
    }
    if ((!this.aiFeedback || this.aiFeedback === null) && Array.isArray(this.feedback) && this.feedback.length > 0) {
        this.aiFeedback = this.feedback.join('\n');
    }

    next();
});

module.exports = mongoose.model('Submission', submissionSchema);
