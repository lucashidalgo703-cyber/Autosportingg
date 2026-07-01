import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import connectDB from '../src/config/db.js';
import AdminUser from '../src/models/AdminUser.js';

dotenv.config();

const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

async function run() {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name = process.env.SEED_ADMIN_NAME;

    if (!email || !password || !name) {
        console.error('ERROR: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD and SEED_ADMIN_NAME environment variables are required.');
        process.exit(1);
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const confirmProd = process.env.CONFIRM_PRODUCTION_SEED === 'true';

    if (isProduction && !confirmProd) {
        console.error('ERROR: Execution blocked in production unless CONFIRM_PRODUCTION_SEED=true is set.');
        process.exit(1);
    }

    try {
        await connectDB();
        
        if (mongoose.connection.readyState !== 1) {
            console.error('ERROR: Could not connect to database.');
            process.exit(1);
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await AdminUser.findOne({ email: normalizedEmail });

        if (existingUser) {
            console.log(`User with email ${normalizedEmail} already exists. Skipping creation.`);
            process.exit(0);
        }

        const passwordHash = hashPassword(password);
        const newUser = new AdminUser({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash: passwordHash,
            role: 'owner',
            active: true,
            permissions: []
        });

        await newUser.save();
        console.log(`Successfully created admin user: ${normalizedEmail} (Role: owner)`);
    } catch (err) {
        console.error('ERROR during seed:', err);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
}

run();
