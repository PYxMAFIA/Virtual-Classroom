/**
 * Cleanup script for stale meet states
 * Runs periodically to reset meets that weren't properly ended
 *
 * Usage: node scripts/cleanupStaleMeets.js
 *
 * Can be scheduled via cron to run every 5 minutes:
 * */5 * * * * cd /path/to/Backend && node scripts/cleanupStaleMeets.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Classroom } = require('../models/classroomModel');

const STALE_THRESHOLD_MINUTES = 5;

async function cleanupStaleMeets() {
    console.log('Starting stale meet cleanup...');

    try {
        await mongoose.connect(process.env.mongoURL);
        console.log('Connected to MongoDB');

        const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000);

        // Find classrooms with active meets that have stale heartbeats
        const staleMeets = await Classroom.find({
            activeMeet: true,
            meetLastHeartbeat: { $lt: staleThreshold },
        });

        if (staleMeets.length === 0) {
            console.log('No stale meets found.');
            process.exit(0);
        }

        console.log(`Found ${staleMeets.length} stale meet(s) to clean up:`);
        staleMeets.forEach(cls => {
            console.log(`  - Classroom: ${cls.name} (${cls._id}), Room: ${cls.meetRoomId}`);
        });

        // Reset all stale meet states
        const result = await Classroom.updateMany(
            {
                activeMeet: true,
                meetLastHeartbeat: { $lt: staleThreshold },
            },
            {
                $set: {
                    activeMeet: false,
                    meetRoomId: null,
                    meetLink: null,
                    meetStartedBy: null,
                    meetStartedAt: null,
                    meetLastHeartbeat: null,
                },
            }
        );

        console.log(`✅ Cleaned up ${result.modifiedCount} stale meet(s).`);
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

cleanupStaleMeets();
