const Assignment = require('../models/assignmentModel');
const { Classroom } = require('../models/classroomModel');
const { uploadToImageKit, isImageKitConfigured } = require('../config/imagekit');

const getAssignmentFileUrl = (assignmentLike) => {
    const candidates = [assignmentLike?.fileUrl, assignmentLike?.fileURL];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }
    return null;
};

const createAssignment = async (req, res) => {
    try {
        const { title, description, classroomId, dueDate } = req.body;
        const file = req.file;
        const expectsFile = req.body?.hasFile === '1' || req.body?.hasFile === true;

        console.log('[assignment/create] Request received', {
            userId: req.user?.id || null,
            classroomId: classroomId || null,
            hasFile: !!file,
            expectsFile,
            bodyKeys: Object.keys(req.body || {}),
        });

        if (!title || !classroomId) {
            return res.status(400).json({ message: 'Title and Classroom ID are required.' });
        }

        if (expectsFile && !file) {
            return res.status(400).json({ message: 'File upload failed. Please send file using form-data field "file".' });
        }

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ message: 'Classroom not found.' });
        }

        if (classroom.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the classroom teacher can create assignments.' });
        }

        const assignment = new Assignment({
            title,
            description,
            classroom: classroomId,
            teacher: req.user.id,
            dueDate,
        });

        if (file) {
            console.log('[assignment/create] Uploading file to ImageKit', {
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
            });

            if (!isImageKitConfigured()) {
                return res.status(500).json({
                    message: 'ImageKit not configured. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT.',
                });
            }

            const uploadResult = await uploadToImageKit(file, 'assignments');
            assignment.fileUrl = uploadResult.url;
            assignment.fileURL = uploadResult.url;
            assignment.imagekitFileId = uploadResult.fileId;

            console.log('[assignment/create] File stored', {
                assignmentId: assignment._id,
                fileId: uploadResult.fileId,
                fileUrl: uploadResult.url,
            });
        }

        await assignment.save();

        await Classroom.updateOne(
            { _id: classroomId },
            { $addToSet: { assignments: assignment._id } }
        );

        console.log('[assignment/create] Response sent', {
            assignmentId: assignment._id,
            hasFile: !!assignment.fileUrl,
        });

        return res.status(201).json({ message: 'Assignment created successfully', assignment });
    } catch (error) {
        console.error('[assignment/create] Error:', error);
        return res.status(500).json({ message: error?.message || 'Failed to create assignment.' });
    }
};

const getClassroomAssignments = async (req, res) => {
    try {
        const { classroomId } = req.params;
        console.log('[assignment/classroom] Fetch request', {
            classroomId,
            userId: req.user?.id || null,
        });

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ message: 'Classroom not found.' });
        }

        const userId = req.user.id;
        const isTeacher = classroom.teacher.toString() === userId;
        const isStudent = classroom.students.some((studentId) => studentId.toString() === userId);
        if (!isTeacher && !isStudent) {
            return res.status(403).json({ message: 'Join the classroom to view assignments.' });
        }

        const assignments = await Assignment.find({
            classroom: classroomId,
            isDeleted: { $ne: true },
        }).sort({ createdAt: -1 });

        const formattedAssignments = [];
        const updates = [];

        for (const assignment of assignments) {
            const assignmentObj = assignment.toObject();
            const fileUrl = getAssignmentFileUrl(assignmentObj);
            const needsSync = !!fileUrl && (
                assignmentObj.fileUrl !== fileUrl ||
                assignmentObj.fileURL !== fileUrl
            );

            if (needsSync) {
                updates.push({
                    updateOne: {
                        filter: { _id: assignmentObj._id },
                        update: { $set: { fileUrl, fileURL: fileUrl } },
                    },
                });
            }

            assignmentObj.fileUrl = fileUrl;
            assignmentObj.fileURL = fileUrl;

            console.log('[assignment/classroom] Assignment URL', {
                assignmentId: assignmentObj._id,
                fileUrl: fileUrl || null,
                source: fileUrl ? 'stored' : 'missing',
            });

            formattedAssignments.push(assignmentObj);
        }

        if (updates.length > 0) {
            try {
                await Assignment.bulkWrite(updates);
            } catch (syncError) {
                console.error('[assignment/classroom] URL sync failed:', syncError);
            }
        }

        console.log('[assignment/classroom] Response sent', {
            classroomId,
            count: formattedAssignments.length,
        });
        return res.json({ assignments: formattedAssignments });
    } catch (error) {
        console.error('[assignment/classroom] Error:', error);
        return res.status(500).json({ message: 'Failed to fetch assignments.' });
    }
};

const getAssignmentById = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        console.log('[assignment/item] Fetch request', {
            assignmentId,
            userId: req.user?.id || null,
        });

        const assignment = await Assignment.findOne({
            _id: assignmentId,
            isDeleted: { $ne: true },
        });
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found.' });
        }

        const classroom = await Classroom.findById(assignment.classroom);
        if (!classroom) {
            return res.status(404).json({ message: 'Classroom not found.' });
        }

        const userId = req.user.id;
        const isTeacher = classroom.teacher.toString() === userId;
        const isStudent = classroom.students.some((studentId) => studentId.toString() === userId);
        if (!isTeacher && !isStudent) {
            return res.status(403).json({ message: 'Join the classroom to view this assignment.' });
        }

        const assignmentObj = assignment.toObject();
        const fileUrl = getAssignmentFileUrl(assignmentObj);
        const needsSync = !!fileUrl && (
            assignmentObj.fileUrl !== fileUrl ||
            assignmentObj.fileURL !== fileUrl
        );

        if (needsSync) {
            await Assignment.updateOne(
                { _id: assignmentObj._id },
                { $set: { fileUrl, fileURL: fileUrl } }
            );
        }

        assignmentObj.fileUrl = fileUrl;
        assignmentObj.fileURL = fileUrl;

        console.log('[assignment/item] Response sent', {
            assignmentId: assignmentObj._id,
            fileUrl: fileUrl || null,
        });

        return res.json({ assignment: assignmentObj });
    } catch (error) {
        console.error('[assignment/item] Error:', error);
        return res.status(500).json({ message: 'Failed to fetch assignment.' });
    }
};

module.exports = {
    createAssignment,
    getClassroomAssignments,
    getAssignmentById,
};
