import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import { createBuyerPortalIndexes } from '../src/services/buyerPortalService.js';
import { GptExpenseRateLimit } from '../src/models/GptExpenseAuthorization.js';
const expectedDatabase = process.argv[process.argv.indexOf('--isolated-db') + 1];
if (!process.argv.includes('--isolated-db') || !/^[\w-]*(test|staging|preview)[\w-]*$/i.test(expectedDatabase || '') || /prod(uction)?/i.test(expectedDatabase)) {
    throw new Error('Indicá --isolated-db <base_test_o_staging>. No se modificó ninguna base.');
}
const configuredDatabase = process.env.MONGODB_URI?.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/)?.[1];
if (configuredDatabase !== expectedDatabase) throw new Error('MONGODB_URI debe apuntar exactamente a la base aislada indicada.');
if ((process.env.BUYER_PORTAL_DOCUMENT_KEY || '').length < 32) throw new Error('Falta BUYER_PORTAL_DOCUMENT_KEY de al menos 32 caracteres, estable y exclusiva del entorno.');
mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
try {
    await connectDB();
    await createBuyerPortalIndexes(); await GptExpenseRateLimit.createIndexes();
    console.log('Índices del portal preparados en la base aislada indicada. No se crearon compradores ni operaciones.');
} finally { await mongoose.disconnect(); }
