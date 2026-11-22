import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

export async function bootIsolatedReplica({ listen = true, persistent = null } = {}) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const envFiles = ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local'];
    if (envFiles.some(name => fs.existsSync(path.join(root, name)))) throw new Error('Las pruebas aisladas requieren un checkout sin archivos .env.');
    const binary = path.join(root, 'node_modules/.cache/mongodb-binaries/mongod-x64-win32-8.2.6.exe');
    const mongod = await MongoMemoryReplSet.create({
        binary: { downloadDir: path.dirname(binary), ...(process.platform === 'win32' && fs.existsSync(binary) ? { systemBinary: binary } : {}) },
        instanceOpts: [{ launchTimeout: 60000, ...(persistent ?? {}) }], replSet: { count: 1, storageEngine: 'wiredTiger' }
    });
    Object.assign(process.env, {
        MONGODB_URI: mongod.getUri(persistent ? 'autosporting_financial_pilot_local' : 'autosporting_mobile_crm_test'), NODE_ENV: 'production',
        JWT_SECRET: crypto.randomBytes(48).toString('hex'), EMAIL_LOGIN_HMAC_SECRET: crypto.randomBytes(48).toString('hex'),
        TWO_FACTOR_ENCRYPTION_KEY: crypto.randomBytes(48).toString('hex'), SECURITY_ALERT_EMAIL: 'administrador@example.test',
        SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: 'prueba@example.test', SMTP_PASS: 'local-only', SMTP_FROM: 'prueba@example.test',
        SMTP_OAUTH_CLIENT_ID: '', SMTP_OAUTH_CLIENT_SECRET: '', SMTP_OAUTH_REFRESH_TOKEN: '',
        GPT_EXPENSE_CLIENT_ID: 'gastos-autosporting-local', GPT_EXPENSE_CLIENT_SECRET: 'local-fixture-only-never-use-in-deployment-2026',
        GPT_EXPENSE_REDIRECT_URIS: 'https://chatgpt.com/aip/g-autosporting-local/oauth/callback',
        GPT_EXPENSE_PUBLIC_ORIGIN: '',
        REDIS_URL: '', REDIS_TOKEN: '', MONGODB_DNS_SERVERS: '', VERCEL: '', ENABLE_LOCAL_PROXY: 'false', LOCAL_DECOUPLED_PROXY: 'false',
        CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '',
        WHATSAPP_API_TOKEN: '', WHATSAPP_PHONE_NUMBER_ID: '', WHATSAPP_APP_SECRET: '', CRON_SECRET: crypto.randomBytes(32).toString('hex')
    });
    const mongoose = (await import('mongoose')).default;
    mongoose.set('autoCreate', false);
    const { default: app } = await import('../../server.js');
    const { default: connectDB } = await import('../../src/config/db.js');
    const { EmailAdapter } = await import('../../src/lib/emailAdapter.js');
    const mailbox = [];
    EmailAdapter.sendEmail = async (to, subject, html) => {
        if (![process.env.SECURITY_ALERT_EMAIL, 'vendedor.uno@example.test', 'vendedor.dos@example.test'].includes(to)) throw new Error('Se bloqueó un destinatario externo en la prueba.');
        mailbox.push({ to, subject, html });
        return { accepted: [to], messageId: crypto.randomUUID(), rejected: [] };
    };
    await connectDB();
    // Create collections outside transactions; only disposable local data is touched.
    const collections = Object.values(mongoose.models);
    for (let i = 0; i < collections.length; i += 10) await Promise.all(collections.slice(i, i + 10).map(model => model.createCollection()));
    for (const name of ['LoginChallenge', 'LoginEmailRateLimit', 'LoginSession', 'GptExpenseCode', 'GptExpenseGrant', 'GptExpenseRateLimit', 'GptExpenseDraft', 'Transaction']) {
        if (mongoose.models[name]) await mongoose.models[name].createIndexes();
    }
    let server, base;
    if (listen) {
        server = app.listen(0, '127.0.0.1');
        await once(server, 'listening');
        base = `http://127.0.0.1:${server.address().port}`;
    }
    const call = async (method, route, body, token = null, extraHeaders = {}) => {
        const response = await fetch(base + route, { method,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extraHeaders },
            body: body === undefined ? undefined : JSON.stringify(body) });
        return { status: response.status, json: await response.json().catch(() => ({})) };
    };
    const stop = async () => {
        if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
        await mongoose.disconnect();
        await mongod.stop({doCleanup:!persistent});
    };
    return { app, mongoose, models: mongoose.models, base, call, mailbox, stop };
}
