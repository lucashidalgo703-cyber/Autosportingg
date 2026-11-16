// Run against the explicitly selected database after configuring its MONGODB_URI.
// Creates only authentication indexes; it never synchronizes or drops other indexes.
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import LoginChallenge from '../src/models/LoginChallenge.js';
import LoginEmailRateLimit from '../src/models/LoginEmailRateLimit.js';
import LoginSession from '../src/models/LoginSession.js';

try {
    await connectDB();
    for (const model of [LoginChallenge, LoginEmailRateLimit, LoginSession]) {
        await model.createIndexes();
        console.log(`Índices de autenticación creados: ${model.collection.name}`);
    }
} catch (error) {
    console.error(`No se pudieron crear los índices de autenticación: ${error.message}`);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
