// Explicitly named isolated database only. This script never reads Vercel settings.
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import { GptExpenseCode, GptExpenseGrant, GptExpenseRateLimit } from '../src/models/GptExpenseAuthorization.js';
import { createGptExpenseIndexes } from '../src/services/gptExpenseService.js';

const expectedDatabase = process.argv[process.argv.indexOf('--isolated-db') + 1];
if (!process.argv.includes('--isolated-db') || !/^[\w-]*(test|staging|preview)[\w-]*$/i.test(expectedDatabase || '')) {
    throw new Error('Indicá --isolated-db <nombre_test_o_staging>. No se ejecutó ninguna escritura.');
}
const configuredDatabase = process.env.MONGODB_URI?.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/)?.[1];
if (configuredDatabase !== expectedDatabase || /prod(uction)?/i.test(expectedDatabase)) {
    throw new Error('La base de MONGODB_URI no coincide exactamente con la base aislada indicada.');
}
try {
    await connectDB();
    await createGptExpenseIndexes();
    await Promise.all([GptExpenseCode.createIndexes(), GptExpenseGrant.createIndexes(), GptExpenseRateLimit.createIndexes()]);
    console.log('Índices de gastos y OAuth preparados en la base aislada indicada.');
} finally { await mongoose.disconnect(); }
