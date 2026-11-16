// Local-only QA: disposable database, fictitious accounts and an in-memory mailbox.
// No message leaves this process and this script never reads a deployment's settings.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = 3100;
const password = 'Ficticia-Local-2026!';
const mailbox = [];
const sockets = new Set();
let mongod;
let mongoose;
let server;
let nextApp;
let stopping = false;

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const hashPassword = () => {
    const salt = crypto.randomBytes(16).toString('hex');
    return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
};

async function stop(exitCode = 0) {
    if (stopping) return;
    stopping = true;
    for (const socket of sockets) socket.destroy();
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    if (nextApp) await nextApp.close().catch(() => {});
    if (mongoose) await mongoose.disconnect().catch(() => {});
    if (mongod) await mongod.stop().catch(() => {});
    process.exit(exitCode);
}
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());

try {
    process.chdir(root);
    const envFiles = ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local'];
    if (envFiles.some(name => fs.existsSync(path.join(root, name)))) {
        throw new Error('Usá una copia limpia sin archivos .env para esta prueba aislada. No se cargó ningún archivo de configuración.');
    }
    const cachedBinary = path.join(root, 'node_modules/.cache/mongodb-binaries/mongod-x64-win32-8.2.6.exe');
    mongod = await MongoMemoryServer.create({
        binary: {
            downloadDir: path.join(root, 'node_modules/.cache/mongodb-binaries'),
            ...(process.platform === 'win32' && fs.existsSync(cachedBinary) ? { systemBinary: cachedBinary } : {})
        },
        instance: { launchTimeout: 60000 }
    });
    Object.assign(process.env, {
        MONGODB_URI: mongod.getUri('autosporting_email_login_preview'),
        JWT_SECRET: crypto.randomBytes(48).toString('hex'),
        TWO_FACTOR_ENCRYPTION_KEY: crypto.randomBytes(48).toString('hex'),
        EMAIL_LOGIN_HMAC_SECRET: crypto.randomBytes(48).toString('hex'),
        NODE_ENV: 'production', // Suppress server.js's standalone listener during import.
        SECURITY_ALERT_EMAIL: 'administrador@example.test',
        SMTP_HOST: '127.0.0.1', SMTP_PORT: '1',
        SMTP_USER: 'smtp-local@example.test', SMTP_PASS: 'local-only',
        SMTP_FROM: 'AutoSporting prueba <smtp-local@example.test>',
        SMTP_OAUTH_CLIENT_ID: '', SMTP_OAUTH_CLIENT_SECRET: '', SMTP_OAUTH_REFRESH_TOKEN: '',
        REDIS_URL: '', REDIS_TOKEN: '', MONGODB_DNS_SERVERS: '',
        CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '',
        WHATSAPP_API_TOKEN: '', WHATSAPP_PHONE_NUMBER_ID: '', WHATSAPP_APP_SECRET: '',
        CRON_SECRET: crypto.randomBytes(32).toString('hex'),
        ENABLE_LOCAL_PROXY: 'false', LOCAL_DECOUPLED_PROXY: 'false', VERCEL: '',
        NEXT_PUBLIC_API_URL: `http://${host}:${port}`
    });
    mongoose = (await import('mongoose')).default;
    mongoose.set('autoCreate', false);
    const { default: expressApp } = await import('../server.js');
    const { default: connectDB } = await import('../src/config/db.js');
    const { default: AdminUser } = await import('../src/models/AdminUser.js');
    const { default: LoginChallenge } = await import('../src/models/LoginChallenge.js');
    const { default: LoginEmailRateLimit } = await import('../src/models/LoginEmailRateLimit.js');
    const { default: LoginSession } = await import('../src/models/LoginSession.js');
    const { EmailAdapter } = await import('../src/lib/emailAdapter.js');
    EmailAdapter.sendEmail = async (to, subject, html) => {
        if (to !== 'administrador@example.test') throw new Error('Destinatario de prueba inesperado.');
        const messageId = crypto.randomUUID();
        mailbox.push({ to, subject, html, receivedAt: new Date(), messageId });
        return { accepted: [to], rejected: [], messageId };
    };
    await connectDB();
    await Promise.all([LoginChallenge.createIndexes(), LoginEmailRateLimit.createIndexes(), LoginSession.createIndexes()]);
    await AdminUser.create([
        { name: 'Vendedor ficticio uno', email: 'vendedor.uno@example.test', passwordHash: hashPassword(), role: 'ventas', active: true },
        { name: 'Vendedor ficticio dos', email: 'vendedor.dos@example.test', passwordHash: hashPassword(), role: 'ventas', active: true },
        { name: 'Administrador ficticio', email: 'admin@example.test', passwordHash: hashPassword(), role: 'admin', active: true }
    ]);
    process.env.NODE_ENV = 'development';
    delete process.env.TURBOPACK;
    delete process.env.IS_TURBOPACK_TEST;
    const next = (await import('next')).default;
    nextApp = next({ dev: true, webpack: true, hostname: host, port, dir: root });
    await nextApp.prepare();
    const handleNext = nextApp.getRequestHandler();
    server = http.createServer((req, res) => {
        const url = new URL(req.url, `http://${host}:${port}`);
        if (url.pathname === '/__test-mail') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            const messages = mailbox.slice().reverse().map(message => `<tr><td>${escapeHtml(message.receivedAt.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }))}</td><td>${escapeHtml(message.to)}</td><td>${escapeHtml(message.subject)}</td><td><iframe sandbox title="Correo de prueba" srcdoc="${escapeHtml(message.html)}"></iframe></td></tr>`).join('');
            res.end(`<!doctype html><html lang="es"><meta charset="utf-8"><meta http-equiv="refresh" content="5"><title>Correo local de prueba | AutoSporting</title><style>body{font:15px system-ui;background:#15151a;color:#f4f4f5;padding:24px}a{color:#f87171}table{border-collapse:collapse;width:100%}th,td{border:1px solid #48484f;padding:12px;text-align:left;vertical-align:top}iframe{width:460px;height:460px;border:0;background:white}code{color:#fecaca}</style><h1>Correo local de prueba</h1><p>Todos los mensajes se guardan en memoria y se eliminan al cerrar este proceso. No se envían correos reales.</p><p><a href="/login">Abrir ingreso</a> · Actualización automática cada 5 segundos.</p><table><thead><tr><th>Hora argentina</th><th>Destinatario</th><th>Asunto</th><th>Mensaje</th></tr></thead><tbody>${messages || '<tr><td colspan="4">Todavía no hay solicitudes de ingreso.</td></tr>'}</tbody></table></html>`);
            return;
        }
        const nativeNextApi = /^\/api\/admin\/(telefonos|pedidos|infracciones)(\/|$)/.test(url.pathname) || /^\/api-gestoria(\/|$)/.test(url.pathname);
        if (url.pathname.startsWith('/api/') && !nativeNextApi) {
            expressApp(req, res);
            return;
        }
        void handleNext(req, res).catch(() => {
            if (!res.headersSent) res.writeHead(500);
            res.end('Error de vista previa local.');
        });
    });
    server.on('connection', socket => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, resolve);
    });
    console.log(`Vista previa aislada: http://${host}:${port}/login`);
    console.log(`Correo de prueba: http://${host}:${port}/__test-mail`);
    console.log('Usuarios ficticios: vendedor.uno@example.test, vendedor.dos@example.test, admin@example.test');
    console.log(`Contraseña exclusiva de la prueba local: ${password}`);
    console.log('Los códigos solo se muestran en el buzón local. Ctrl+C elimina la base y los mensajes.');
} catch (error) {
    console.error(`No se pudo iniciar la prueba aislada: ${error.message}`);
    await stop(1);
}
