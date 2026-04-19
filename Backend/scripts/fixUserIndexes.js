/**
 * Script to fix User collection indexes
 * Removes any incorrect unique index on 'name' field
 * Ensures only 'email' has the unique constraint
 *
 * Run once: node scripts/fixUserIndexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fixUserIndexes() {
    console.log('Starting User index fix...');

    try {
        await mongoose.connect(process.env.mongoURL);
        console.log('✅ Connected to MongoDB');

        const User = mongoose.model('User', new mongoose.Schema({
            name: String,
            email: String,
        }), 'users');

        // Get all current indexes
        const indexes = await User.listIndexes();
        console.log('\n📋 Current indexes:');
        indexes.forEach(idx => {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
            if (idx.unique) {
                console.log(`    ⚠️  UNIQUE constraint`);
            }
        });

        // Find and drop any unique index on 'name'
        const indexesToDrop = indexes.filter(idx => {
            return idx.key.name === 1 && idx.unique === true;
        });

        if (indexesToDrop.length > 0) {
            console.log('\n🗑️  Dropping incorrect unique index on name field...');
            for (const idx of indexesToDrop) {
                await User.collection.dropIndex(idx.name);
                console.log(`   Dropped: ${idx.name}`);
            }
            console.log('✅ Incorrect index removed!');
        } else {
            console.log('\n✅ No incorrect unique index on name found.');
        }

        // Verify the email unique index exists
        const emailIndex = indexes.find(idx => idx.key.email === 1);
        if (!emailIndex || !emailIndex.unique) {
            console.log('\n⚠️  Email unique index missing. Creating...');
            await User.collection.createIndex({ email: 1 }, { unique: true });
            console.log('✅ Email unique index created.');
        } else {
            console.log('\n✅ Email unique index is correctly set.');
        }

        console.log('\n✨ Index fix completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Index fix failed:', error.message);
        process.exit(1);
    }
}

fixUserIndexes();
