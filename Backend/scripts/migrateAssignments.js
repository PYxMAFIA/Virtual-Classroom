/**
 * Migration script to ensure all existing assignments have the isDeleted flag
 * Run once to update legacy documents
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Assignment = require('../models/assignmentModel');
const { Classroom } = require('../models/classroomModel');

async function migrateAssignments() {
    console.log('Starting assignments migration...');

    try {
        // Connect to database
        await mongoose.connect(process.env.mongoURL);
        console.log('Connected to MongoDB');

        // Update all assignments that don't have isDeleted set
        const result = await Assignment.updateMany(
            { isDeleted: { $exists: false } },
            { $set: { isDeleted: false } }
        );

        console.log(`Migration complete. Updated ${result.modifiedCount} assignments.`);

        // Verify classroom-assignment references
        const classrooms = await Classroom.find({}).populate('assignments');
        let fixedCount = 0;

        for (const classroom of classrooms) {
            const validAssignmentIds = classroom.assignments
                .filter(a => a && !a.isDeleted)
                .map(a => a._id);

            if (validAssignmentIds.length !== classroom.assignments.length) {
                await Classroom.updateOne(
                    { _id: classroom._id },
                    { $set: { assignments: validAssignmentIds } }
                );
                fixedCount++;
            }
        }

        console.log(`Fixed ${fixedCount} classrooms with deleted assignment references.`);

        // Find orphaned assignments (not referenced by any classroom)
        const allClassroomAssignmentIds = await Classroom.distinct('assignments');
        const orphaned = await Assignment.find({
            _id: { $nin: allClassroomAssignmentIds },
            isDeleted: false
        });

        if (orphaned.length > 0) {
            console.warn(`Found ${orphaned.length} orphaned assignments (not linked to any classroom).`);
            console.warn('These assignments exist in DB but won\'t show up in any classroom.');
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateAssignments();
