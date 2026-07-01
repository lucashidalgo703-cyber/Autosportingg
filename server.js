import CustomerVehicle from './src/models/CustomerVehicle.js';
import WorkshopProvider from './src/models/WorkshopProvider.js';
import WorkshopOrder, { canTransition } from './src/models/WorkshopOrder.js';
import WorkshopProviderQuote from './src/models/WorkshopProviderQuote.js';
import WorkshopEstimate from './src/models/WorkshopEstimate.js';
import { toWorkshopProviderDto, toCustomerVehicleDto, toWorkshopOrderDto, toWorkshopProviderQuoteDto, toWorkshopEstimateDto } from './src/utils/workshopDtos.js';
import { escapeRegex, handleMongoError } from './src/utils/workshopApiUtils.js';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import connectDB from './src/config/db.js';
import cloudinary from './src/config/cloudinary.js';
import Car from './src/models/Car.js';
import Lead from './src/models/Lead.js';
import Quote from './src/models/Quote.js';
import Client from './src/models/Client.js';
import Task from './src/models/Task.js';
import ActivityLog from './src/models/ActivityLog.js';
import Account from './src/models/Account.js';
import Transaction from './src/models/Transaction.js';
import Reservation from './src/models/Reservation.js';
import Sale from './src/models/Sale.js';
import Installment from './src/models/Installment.js';
import CrmTask from './src/models/CrmTask.js';
import AdminUser from './src/models/AdminUser.js';
import AuditLog from './src/models/AuditLog.js';
import NotificationReadState from './src/models/NotificationReadState.js';
import TeamGoal from './src/models/TeamGoal.js';
import Check from './src/models/Check.js';
import Loan from './src/models/Loan.js';
import FinanceBudget from './src/models/FinanceBudget.js';
import * as xlsx from 'xlsx';
import FinanceRecurringRule from './src/models/FinanceRecurringRule.js';
import CashCount from './src/models/CashCount.js';
import DailyCashClose from './src/models/DailyCashClose.js';
import BankReconciliation from './src/models/BankReconciliation.js';
import Settlement from './src/models/Settlement.js';
import Conversation from './src/models/Conversation.js';
import InternalMessage from './src/models/InternalMessage.js';
import { WhatsAppAdapter } from './src/lib/whatsappAdapter.js';
import { ArturitoService } from './src/services/ArturitoService.js';
import { EmailAdapter } from './src/lib/emailAdapter.js';
import CommunicationLog from './src/models/CommunicationLog.js';
import MessageTemplate from './src/models/MessageTemplate.js';
import NpsSurvey from './src/models/NpsSurvey.js';
import NpsResponse from './src/models/NpsResponse.js';
import ApprovalRequest from './src/models/ApprovalRequest.js';
import Suggestion from './src/models/Suggestion.js';
import TrashRecord from './src/models/TrashRecord.js';
import Opportunity from './src/models/Opportunity.js';
import Mandate from './src/models/Mandate.js';
import PersonalAsset from './src/models/PersonalAsset.js';
import CrmSettings from './src/models/CrmSettings.js';
import Complaint from './src/models/Complaint.js';
import { DailySummaryService } from './src/services/DailySummaryService.js';
import { getNextLeadAssignee, checkLeadSLA } from './src/services/leadRoutingService.js';
import { logAudit, logSystemAudit } from './src/utils/auditLogger.js';
import { hasPermission, PERMISSIONS, ROLES } from './src/utils/adminPermissions.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET?.trim();

// --- AES-256-GCM Encryption logic for 2FA Secrets ---
const TWO_FACTOR_ENCRYPTION_KEY = process.env.TWO_FACTOR_ENCRYPTION_KEY || JWT_SECRET;

if (!TWO_FACTOR_ENCRYPTION_KEY || TWO_FACTOR_ENCRYPTION_KEY.length < 32) {
    console.warn('WARNING: TWO_FACTOR_ENCRYPTION_KEY is not set or is too short. Using a derived fallback key. For production, set a secure 32+ byte string in .env.');
}

const getEncryptionKey = () => {
    return crypto.createHash('sha256').update(String(TWO_FACTOR_ENCRYPTION_KEY)).digest();
};

const encryptData = (text) => {
    try {
        const iv = crypto.randomBytes(12); // GCM standard IV size
        const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
        let encrypted = cipher.update(text, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag().toString('base64');
        return `${iv.toString('base64')}:${authTag}:${encrypted}`;
    } catch (err) {
        console.error('Encryption error:', err);
        throw err;
    }
};

const decryptData = (encryptedData) => {
    if (!encryptedData) return null;
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) return null;
        const iv = Buffer.from(parts[0], 'base64');
        const authTag = Buffer.from(parts[1], 'base64');
        const encryptedText = Buffer.from(parts[2], 'base64');

        const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Decryption error or corrupted secret:', err.message);
        return null;
    }
};
// ----------------------------------------------------
const REDIS_URL = process.env.REDIS_URL?.trim();
const REDIS_TOKEN = process.env.REDIS_TOKEN?.trim();
const isRedisConfigured = Boolean(REDIS_URL && REDIS_TOKEN);

const callRedis = async (commands) => {
    if (!isRedisConfigured) return null;
    try {
        const url = REDIS_URL.endsWith('/') ? `${REDIS_URL}pipeline` : `${REDIS_URL}/pipeline`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${REDIS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commands),
            signal: AbortSignal.timeout(3000)
        });
        if (!res.ok) {
            console.error(`Redis REST API returned error status: ${res.status}`);
            return null;
        }
        return await res.json();
    } catch (err) {
        console.error('Redis query error:', err.message);
        return null;
    }
};

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS_PER_IDENTITY = 5;
const LOGIN_MAX_ATTEMPTS_PER_IP = 20;
const loginAttempts = new Map();

// Connect to MongoDB (disabled at top-level to prevent Serverless/NextJS TDZ)
// connectDB();

// Middleware
app.use(cors());
app.use(express.json({
    limit: '15mb',
    verify: (req, res, buf) => {
        // Solo guardamos el rawBody si es para el webhook de whatsapp
        if (req.originalUrl && req.originalUrl.startsWith('/api/webhooks/whatsapp')) {
            req.rawBody = buf;
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure Multer for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'autosporting-cars',
        allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB por archivo (límite duro post-compresión)
        files: 20
    }
});

// Configure Multer for Suggestions
const suggestionStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'autosporting-suggestions',
        allowedFormats: ['jpg', 'png', 'jpeg', 'webp', 'pdf'],
        resource_type: 'auto'
    },
});

const uploadSuggestions = multer({
    storage: suggestionStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 5
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo PNG, JPG, WEBP y PDF.`));
        }
    }
});

const getClientIp = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
};

const getLoginAttemptKeys = (req) => {
    const ip = getClientIp(req);
    const email = typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : 'missing-email';

    const emailHash = crypto.createHash('sha256').update(email).digest('hex');

    return {
        ipKey: `login:ip:${ip}`,
        identityKey: `login:identity:${emailHash}`
    };
};

const getActiveLoginAttempt = (key) => {
    const attempt = loginAttempts.get(key);
    if (!attempt) return null;

    if (Date.now() - attempt.firstAttemptAt >= LOGIN_WINDOW_MS) {
        loginAttempts.delete(key);
        return null;
    }

    return attempt;
};

const incrementLoginAttempt = (key) => {
    const attempt = getActiveLoginAttempt(key);
    if (!attempt) {
        loginAttempts.set(key, { count: 1, firstAttemptAt: Date.now() });
        return;
    }

    attempt.count += 1;
    loginAttempts.set(key, attempt);
};

const recordFailedLogin = async (req) => {
    const { ipKey, identityKey } = getLoginAttemptKeys(req);
    let usedRedis = false;

    if (isRedisConfigured) {
        const result = await callRedis([
            ["INCR", ipKey],
            ["TTL", ipKey],
            ["INCR", identityKey],
            ["TTL", identityKey]
        ]);

        if (result && Array.isArray(result) && result.length === 4) {
            const ipTtl = result[1]?.result;
            const idTtl = result[3]?.result;

            const expireCmds = [];
            if (ipTtl === -1) {
                expireCmds.push(["EXPIRE", ipKey, Math.ceil(LOGIN_WINDOW_MS / 1000)]);
            }
            if (idTtl === -1) {
                expireCmds.push(["EXPIRE", identityKey, Math.ceil(LOGIN_WINDOW_MS / 1000)]);
            }

            if (expireCmds.length > 0) {
                await callRedis(expireCmds);
            }
            usedRedis = true;
        }
    }

    if (!usedRedis) {
        incrementLoginAttempt(ipKey);
        incrementLoginAttempt(identityKey);
    }
};

const clearLoginAttempts = async (req) => {
    const { identityKey } = getLoginAttemptKeys(req);
    let usedRedis = false;

    if (isRedisConfigured) {
        const result = await callRedis([
            ["DEL", identityKey]
        ]);

        if (result && Array.isArray(result) && result.length === 1) {
            usedRedis = true;
        }
    }

    if (!usedRedis) {
        loginAttempts.delete(identityKey);
    }
};

const requireJwtConfiguration = (req, res, next) => {
    if (!JWT_SECRET) {
        console.error('Authentication unavailable: JWT_SECRET is not configured.');
        return res.status(503).json({ message: 'Servicio de autenticacion no disponible.' });
    }
    next();
};

const enforceLoginRateLimit = async (req, res, next) => {
    const { ipKey, identityKey } = getLoginAttemptKeys(req);
    let ipCount = 0;
    let identityCount = 0;
    let usedRedis = false;

    if (isRedisConfigured) {
        const result = await callRedis([["MGET", ipKey, identityKey]]);
        if (result && Array.isArray(result) && result[0]?.result) {
            const [ipVal, identityVal] = result[0].result;
            ipCount = ipVal ? parseInt(ipVal, 10) : 0;
            identityCount = identityVal ? parseInt(identityVal, 10) : 0;
            usedRedis = true;
        }
    }

    if (!usedRedis) {
        const ipAttempt = getActiveLoginAttempt(ipKey);
        const identityAttempt = getActiveLoginAttempt(identityKey);
        ipCount = ipAttempt?.count || 0;
        identityCount = identityAttempt?.count || 0;
    }

    if (
        ipCount >= LOGIN_MAX_ATTEMPTS_PER_IP ||
        identityCount >= LOGIN_MAX_ATTEMPTS_PER_IDENTITY
    ) {
        res.setHeader('Retry-After', String(Math.ceil(LOGIN_WINDOW_MS / 1000)));
        return res.status(429).json({
            message: 'Demasiados intentos. Espera unos minutos antes de volver a intentar.'
        });
    }

    next();
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    if (!JWT_SECRET) {
        console.error('Authentication unavailable: JWT_SECRET is not configured.');
        return res.status(503).json({ message: 'Servicio de autenticacion no disponible.' });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        // No permitir que un token de desafío se use como sesión regular
        if (user.type === '2fa_challenge') {
            return res.status(403).json({ message: 'Token de desafío inválido para esta operación' });
        }

        req.user = user;
        req.user.id = user.id || user.userId;
        req.user.userId = user.userId || user.id;
        next();
    });
};

const requirePermission = (permission, allowedRoles = [ROLES.OWNER, ROLES.ADMIN]) => {
    return (req, res, next) => {
        const roleAllowed = allowedRoles.includes(req.user?.role);
        if (roleAllowed || hasPermission(req.user, permission)) {
            return next();
        }

        return res.status(403).json({ message: 'No tenes permisos para realizar esta accion.' });
    };
};

const requireAnyPermission = (permissions, allowedRoles = [ROLES.OWNER, ROLES.ADMIN]) => {
    return (req, res, next) => {
        const roleAllowed = allowedRoles.includes(req.user?.role);
        const permissionAllowed = permissions.some((permission) => hasPermission(req.user, permission));

        if (roleAllowed || permissionAllowed) {
            return next();
        }

        return res.status(403).json({ message: 'No tenes permisos para realizar esta accion.' });
    };
};

// Routes

// Helper functions for password hashing using native crypto
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

const verifyPassword = (password, hash) => {
    try {
        if (!hash || !hash.includes(':')) return false;
        const [salt, key] = hash.split(':');
        if (!salt || !key) return false;

        const hashBuffer = crypto.scryptSync(password, salt, 64);
        const keyBuffer = Buffer.from(key, 'hex');

        // Prevent timing attacks
        if (hashBuffer.length !== keyBuffer.length) return false;
        return crypto.timingSafeEqual(hashBuffer, keyBuffer);
    } catch (e) {
        console.error('Error verifying password:', e);
        return false;
    }
};

// Login Endpoint
app.post('/api/login', requireJwtConfiguration, enforceLoginRateLimit, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            await recordFailedLogin(req);
            return res.status(400).json({ message: 'Email y contrasena son obligatorios.' });
        }

        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            console.error('Authentication unavailable: MongoDB connection could not be established.');
            return res.status(503).json({ message: 'Servicio de autenticacion no disponible.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await AdminUser.findOne({ email: normalizedEmail });
        const isValid = Boolean(user?.active) && verifyPassword(password, user.passwordHash);

        if (isValid) {
            await clearLoginAttempts(req);

            if (user.twoFactorEnabled) {
                // Generate a temporary challenge token valid for 5 mins
                const challengeToken = jwt.sign(
                    { type: '2fa_challenge', challengeUserId: user._id },
                    JWT_SECRET,
                    { expiresIn: '5m' }
                );

                await logAudit({
                    req,
                    action: 'LOGIN_REQUIRES_2FA',
                    module: 'usuarios',
                    entityType: 'User',
                    entityId: user._id,
                    entityLabel: user.email,
                    description: `Login requiere 2FA para ${user.email}`
                });

                return res.json({ require2FA: true, challengeId: challengeToken });
            }

            user.lastLoginAt = new Date();
            await user.save();

            const token = jwt.sign(
                {
                    id: user._id,
                    userId: user._id,
                    email: user.email,
                    username: user.name,
                    role: user.role,
                    permissions: user.permissions
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            await logAudit({
                req,
                action: 'LOGIN_EXITOSO',
                module: 'usuarios',
                entityType: 'User',
                entityId: user._id,
                entityLabel: user.email,
                description: `Login exitoso DB de ${user.email}`
            });

            return res.json({ token, role: user.role, name: user.name });
        }

        await recordFailedLogin(req);

        await logAudit({
            req,
            action: 'LOGIN_FALLIDO',
            module: 'usuarios',
            entityType: 'User',
            entityLabel: normalizedEmail,
            description: `Intento de login fallido para ${normalizedEmail}`
        });

        res.status(401).json({ message: 'Credenciales invalidas.' });

    } catch (error) {
        console.error("Login Error: ", error);
        res.status(500).json({ message: 'Error interno de autenticacion.' });
    }
});

app.post('/api/login/2fa', requireJwtConfiguration, async (req, res) => {
    try {
        let { challengeId, code, recoveryCode } = req.body;

        const authHeader = req.headers['authorization'];
        const headerToken = authHeader && authHeader.split(' ')[1];

        if (headerToken && challengeId && headerToken !== challengeId) {
            return res.status(400).json({ message: 'Conflicto de tokens de desafío entre cabecera y cuerpo de la petición.' });
        }

        challengeId = challengeId || headerToken;

        if (!challengeId || (!code && !recoveryCode)) {
            return res.status(400).json({ message: 'Se requiere token de desafío y código TOTP/Recuperación.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(challengeId, JWT_SECRET);
            if (decoded.type !== '2fa_challenge') {
                return res.status(401).json({ message: 'Tipo de token inválido para este desafío.' });
            }
        } catch (err) {
            return res.status(401).json({ message: 'Desafío expirado o inválido.' });
        }

        const user = await AdminUser.findById(decoded.challengeUserId);
        if (!user || !user.active || !user.twoFactorEnabled) {
            return res.status(401).json({ message: 'Usuario inválido o 2FA no activo.' });
        }

        let isVerified = false;

        if (code) {
            const secret = decryptData(user.twoFactorSecret);
            if (!secret) {
                return res.status(500).json({ message: 'El secreto 2FA está corrupto o la clave de cifrado ha cambiado. Contacte a un administrador para restablecer su 2FA.' });
            }

            isVerified = speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: code,
                window: 1 // Permitir +- 30 segundos
            });
        } else if (recoveryCode) {
            const hashedInput = crypto.createHash('sha256').update(recoveryCode).digest('hex');
            const codeIndex = user.recoveryCodes.indexOf(hashedInput);

            if (codeIndex !== -1) {
                isVerified = true;
                user.recoveryCodes.splice(codeIndex, 1); // Consumir el código
            }
        }

        if (!isVerified) {
            return res.status(401).json({ message: 'Código inválido.' });
        }

        user.lastLoginAt = new Date();
        await user.save();

        const token = jwt.sign(
            {
                id: user._id,
                userId: user._id,
                email: user.email,
                username: user.name,
                role: user.role,
                permissions: user.permissions
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        await logAudit({
            req,
            action: 'LOGIN_EXITOSO_2FA',
            module: 'usuarios',
            entityType: 'User',
            entityId: user._id,
            entityLabel: user.email,
            description: `Login 2FA exitoso de ${user.email}`
        });

        return res.json({ token, role: user.role, name: user.name });

    } catch (error) {
        console.error("2FA Login Error: ", error);
        res.status(500).json({ message: 'Error interno verificando 2FA.' });
    }
});


// GET Current Auth User (Diagnostic)
app.get('/api/admin/auth/me', authenticateToken, async (req, res) => {
    try {
        const id = req.user?.id || req.user?.userId;
        const isValid = mongoose.Types.ObjectId.isValid(id);
        res.json({
            ok: true,
            user: {
                id,
                userId: id,
                email: req.user?.email,
                username: req.user?.username,
                role: req.user?.role,
                permissions: req.user?.permissions
            },
            hasValidObjectId: isValid
        });
    } catch (err) {
        res.status(500).json({ message: 'Error interno de autenticaci├│n me' });
    }
});

// GET Admin Users
app.get('/api/admin/users', authenticateToken, requirePermission(PERMISSIONS.USUARIOS_READ), async (req, res) => {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Sin permisos para ver usuarios' });
        }
        const users = await AdminUser.find().select('-passwordHash').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET Active Admin Users (for assignedTo dropdowns)
app.get('/api/admin/users/active', authenticateToken, async (req, res) => {
    try {
        const users = await AdminUser.find({ active: true }).select('name email role').sort({ name: 1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST Create Admin User
app.post('/api/admin/users', authenticateToken, requirePermission(PERMISSIONS.USUARIOS_WRITE), async (req, res) => {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Sin permisos para crear usuarios' });
        }
        const { name, email, password, role, permissions } = req.body;

        const existing = await AdminUser.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ message: 'El email ya est├í en uso' });

        const newUser = new AdminUser({
            name,
            email: email.toLowerCase(),
            passwordHash: hashPassword(password),
            role: role || 'solo_lectura',
            permissions: permissions || []
        });

        await newUser.save();

        await logAudit({
            req,
            action: 'USUARIO_CREADO',
            module: 'usuarios',
            entityType: 'User',
            entityId: newUser._id,
            entityLabel: newUser.email,
            description: `Usuario creado con rol ${newUser.role}`,
            metadata: { email: newUser.email, role: newUser.role }
        });

        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH Edit Admin User
app.patch('/api/admin/users/:id', authenticateToken, requirePermission(PERMISSIONS.USUARIOS_WRITE), async (req, res) => {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Sin permisos para editar usuarios' });
        }
        const { name, email, role, active, permissions } = req.body;

        const userToUpdate = await AdminUser.findById(req.params.id);
        if (!userToUpdate) return res.status(404).json({ message: 'Usuario no encontrado' });

        // Regla: No desactivar ni quitar rol owner al ├║ltimo owner
        if ((active === false || (role && role !== 'owner')) && userToUpdate.role === 'owner') {
            const ownerCount = await AdminUser.countDocuments({ role: 'owner', active: true });
            if (ownerCount <= 1 && userToUpdate.active) {
                return res.status(400).json({ message: 'No se puede desactivar o degradar al ├║ltimo Owner del sistema.' });
            }
        }

        if (name) userToUpdate.name = name;
        if (email) userToUpdate.email = email.toLowerCase();
        if (role) userToUpdate.role = role;
        if (active !== undefined) userToUpdate.active = active;
        if (permissions) userToUpdate.permissions = permissions;

        await userToUpdate.save();

        const actionStr = (active !== undefined && active !== userToUpdate.active)
            ? (active ? 'USUARIO_ACTIVADO' : 'USUARIO_DESACTIVADO')
            : (role ? 'ROL_ACTUALIZADO' : 'USUARIO_EDITADO');

        await logAudit({
            req,
            action: actionStr,
            module: 'usuarios',
            entityType: 'User',
            entityId: userToUpdate._id,
            entityLabel: userToUpdate.email,
            description: `Usuario editado: ${userToUpdate.email}`,
            metadata: { role: userToUpdate.role, active: userToUpdate.active }
        });

        res.json(userToUpdate);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH Change Password
app.patch('/api/admin/users/:id/password', authenticateToken, requirePermission(PERMISSIONS.USUARIOS_WRITE), async (req, res) => {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Sin permisos para cambiar contrase├▒as' });
        }
        const { password } = req.body;
        if (!password) return res.status(400).json({ message: 'Contrase├▒a requerida' });

        const userToUpdate = await AdminUser.findById(req.params.id);
        if (!userToUpdate) return res.status(404).json({ message: 'Usuario no encontrado' });

        userToUpdate.passwordHash = hashPassword(password);
        await userToUpdate.save();

        await logAudit({
            req,
            action: 'PASSWORD_ACTUALIZADA',
            module: 'usuarios',
            entityType: 'User',
            entityId: userToUpdate._id,
            entityLabel: userToUpdate.email,
            description: `Contrase├▒a actualizada para ${userToUpdate.email}`
        });

        res.json({ message: 'Contrase├▒a actualizada correctamente' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST Client Audit Logs
app.post('/api/admin/audit-logs/client-event', authenticateToken, requireAnyPermission([PERMISSIONS.CLIENTES_WRITE, PERMISSIONS.LEADS_WRITE]), async (req, res) => {
    try {
        const { action, module, entityType, entityId, entityLabel, description, metadata } = req.body;

        // Whitelist de acciones permitidas desde el cliente
        const allowedActions = ['REPORTE_EXPORTADO_CSV', 'REPORTE_IMPRESO'];

        if (!allowedActions.includes(action)) {
            return res.status(400).json({ message: 'Acci├│n no permitida desde el cliente' });
        }

        await logAudit({
            req,
            action,
            module: module || 'reportes',
            entityType,
            entityId,
            entityLabel,
            description,
            metadata
        });

        res.status(201).json({ message: 'Log registrado' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/audit-logs
app.get('/api/admin/audit-logs', authenticateToken, requirePermission(PERMISSIONS.AUDITORIA_READ), async (req, res) => {
    try {
        if (!req.user || (req.user.role !== 'owner' && req.user.role !== 'admin')) {
            return res.status(403).json({ message: 'Sin permisos de auditoria' });
        }
        const { user, role, module, action, startDate, endDate, search, page = 1, limit = 50 } = req.query;
        let query = {};

        if (user) query.userId = user;
        if (role) query.userRole = role;
        if (module) query.module = module;
        if (action) query.action = action;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        if (search) {
            query.$or = [
                { userName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { entityLabel: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const logs = await AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean();
        const total = await AuditLog.countDocuments(query);

        res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET public cars (Sanitized)
app.get('/api/public/cars', async (req, res) => {
    try {
        await connectDB();
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        // Only return visible/public cars. We use $ne: false so existing cars without the field are still visible.
        // We exclude specifically 'Vendido', 'Reservado', 'Pausado', 'Cancelado', 'Eliminado'
        const cars = await Car.find({
            visibleEnWeb: { $ne: false },
            status: { $nin: [/^vendido$/i, /^reservado$/i, /^pausado$/i, /^cancelado$/i, /^eliminado$/i] }
        })
            .select('-purchasePrice -purchaseCurrency -ownerName -ownerEmail -ownerPhone -linkedClient -consignedBy -notes -agencyOwned -engineNumber -chassisNumber -location -hasManuals -hasDuplicateKeys -hasOfficialServices -publishedOnML -publishedBy -mlLink -plateOrVin -expenses -visibleEnWeb -createdAt -updatedAt -__v -order -owners -auditLog')
            .sort({ order: 1, createdAt: -1 });
        res.json(cars);
    } catch (error) {
        res.status(500).json({ error: 'No se pudo cargar el cat├ílogo de veh├¡culos.' });
    }
});

// GET single public car (Sanitized)
app.get('/api/public/cars/:id', async (req, res) => {
    try {
        await connectDB();
        const car = await Car.findOne({
            _id: req.params.id,
            visibleEnWeb: { $ne: false },
            status: { $nin: [/^vendido$/i, /^reservado$/i, /^pausado$/i, /^cancelado$/i, /^eliminado$/i] }
        })
            .select('-purchasePrice -purchaseCurrency -ownerName -ownerEmail -ownerPhone -linkedClient -consignedBy -notes -agencyOwned -engineNumber -chassisNumber -location -hasManuals -hasDuplicateKeys -hasOfficialServices -publishedOnML -publishedBy -mlLink -plateOrVin -expenses -visibleEnWeb -createdAt -updatedAt -__v -order -owners -auditLog');

        if (!car) {
            return res.status(404).json({ message: 'Car not found' });
        }
        res.json(car);
    } catch (error) {
        res.status(500).json({ error: 'No se pudo cargar el veh├¡culo.' });
    }
});

// POST create new car (Protected)
app.post('/api/cars', authenticateToken, requirePermission(PERMISSIONS.STOCK_WRITE), upload.array('images', 20), async (req, res) => {
    try {
        await connectDB();
        const carData = req.body;
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        if (req.files && req.files.length > 0) {
            carData.images = req.files.map(file => file.path);
        }

        // Convert scalar string values that should be boolean or number if needed
        // Mongoose will cast them based on the schema, but just in case

        const newCar = new Car({
            ...carData,
            auditLog: [{
                action: 'ALTA',
                field: 'all',
                details: `Vehículo creado manualmente desde CRM`,
                user,
                source: 'CRM_V2'
            }]
        });

        const savedCar = await newCar.save();

        await logAudit({
            req,
            action: 'VEHICULO_CREADO',
            module: 'stock',
            entityType: 'Car',
            entityId: savedCar._id,
            entityLabel: `${savedCar.brand} ${savedCar.name}`,
            description: `Se dio de alta un nuevo vehículo en stock.`
        });

        res.status(201).json(savedCar);
    } catch (error) {
        console.error("POST /api/cars error:", error);
        res.status(400).json({ message: error.message });
    }
});

// GET export XLSX for Admin
app.get('/api/admin/cars/export', authenticateToken, requirePermission(PERMISSIONS.STOCK_READ), async (req, res) => {
    try {
        await connectDB();
        const cars = await Car.find().sort({ createdAt: -1 }).lean();

        // Data preparation
        const data = cars.map(car => {
            const origen = car.agencyOwned ? 'Propio' : (car.consignedBy ? 'Consignacion' : 'Tercero');
            return {
                'Marca': car.brand || '',
                'Modelo': car.name || '',
                'Version/Detalle': car.description || '',
                'Año': car.year || '',
                'Kilometraje': car.km || 0,
                'Combustible': car.fuel || '',
                'Dominio': car.plateOrVin || '',
                'Precio Publicado': car.price || 0,
                'Moneda': car.currency || '',
                'Estado': car.status || '',
                'Origen': origen,
                'Propietario': car.ownerName || car.consignedBy || '',
                'Notas': car.notes || ''
            };
        });

        const worksheet = xlsx.utils.json_to_sheet(data);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Stock');

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="stock-autosporting.xlsx"');
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting cars:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET all cars for Admin (Protected, Full Data)
app.get('/api/admin/cars', authenticateToken, requirePermission(PERMISSIONS.STOCK_READ), async (req, res) => {
    try {
        await connectDB();
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        const { page = 1, limit = 20, search = '', status = '', brand = '', tab = '', ml = '' } = req.query;

        // Fetch minimal info for ALL cars to calculate summary stats
        const allCarsForSummary = await Car.find({})
            .select('status currency purchaseCurrency price purchasePrice investor.percentage agencyOwned consignedBy km condition')
            .lean();

        // Calculate summary using same logic as frontend mapping
        const totalCarsCount = allCarsForSummary.length;
        const disponibles = allCarsForSummary.filter(c => (c.status || '').toLowerCase() === 'disponible');

        let valorActivoUSD = 0;
        let valorActivoARS = 0;
        let valorActivoInversionistasUSD = 0;
        let valorActivoInversionistasARS = 0;
        let capitalInvertidoInversionistasUSD = 0;
        let capitalInvertidoInversionistasARS = 0;

        disponibles.forEach(c => {
            const isShared = c.investor && c.investor.percentage > 0;
            const isConsignment = c.consignedBy && c.consignedBy !== '';
            const isPropio = c.agencyOwned;

            // Map origen
            const origen = isShared ? 'compartido' : (isPropio ? 'propio' : (isConsignment ? 'consignación' : 'tercero'));
            const currency = c.currency === 'U$S' || c.currency === 'USD' ? 'USD' : 'ARS';

            // monedaCompra logic from mapper
            const purchaseCurrency = ((c.purchaseCurrency || c.currency) === 'USD' || (c.purchaseCurrency || c.currency) === 'U$S') && c.purchasePrice > 200000 ? 'ARS' : (c.purchaseCurrency || (c.currency === 'U$S' || c.currency === 'USD' ? 'USD' : 'ARS'));

            if (origen === 'propio' || origen === 'compartido') {
                const investorPercentage = (origen === 'compartido' && c.investor) ? c.investor.percentage : 0;
                const agencyPercentage = 100 - investorPercentage;
                const priceVal = c.price || 0;

                if (currency === 'USD') {
                    valorActivoUSD += priceVal * (agencyPercentage / 100);
                } else {
                    valorActivoARS += priceVal * (agencyPercentage / 100);
                }
            }

            if (origen === 'compartido') {
                const priceVal = c.price || 0;
                const purchasePriceVal = c.purchasePrice || 0;
                const investorPercentage = c.investor?.percentage || 0;

                if (currency === 'USD') {
                    valorActivoInversionistasUSD += priceVal * (investorPercentage / 100);
                } else {
                    valorActivoInversionistasARS += priceVal * (investorPercentage / 100);
                }

                if (purchaseCurrency === 'USD') {
                    capitalInvertidoInversionistasUSD += purchasePriceVal * (investorPercentage / 100);
                } else {
                    capitalInvertidoInversionistasARS += purchasePriceVal * (investorPercentage / 100);
                }
            }
        });

        const summary = {
            total: totalCarsCount,
            disponibles: disponibles.length,
            consignaciones: allCarsForSummary.filter(c => c.consignedBy && c.consignedBy !== '').length,
            compartidos: allCarsForSummary.filter(c => c.investor && c.investor.percentage > 0).length,
            ceroKm: allCarsForSummary.filter(c => {
                const cond = (c.condition || '').toLowerCase().replace(/\s+/g, '');
                return cond === '0km' || cond === 'nuevo' || c.km === 0;
            }).length,
            valorActivoUSD,
            valorActivoARS,
            valorActivoInversionistasUSD,
            valorActivoInversionistasARS,
            capitalInvertidoInversionistasUSD,
            capitalInvertidoInversionistasARS
        };

        // Now build query for the current page
        let query = {};

        if (search) {
            const words = search.trim().split(/\s+/).filter(Boolean);
            if (words.length > 0) {
                query.$and = words.map(word => {
                    const escapedWord = escapeRegex(word);
                    const regex = { $regex: escapedWord, $options: 'i' };
                    const conditions = [
                        { brand: regex },
                        { name: regex },
                        { plateOrVin: regex },
                        { description: regex },
                        { ownerName: regex },
                        { ownerPhone: regex },
                        { consignedBy: regex },
                        { location: regex },
                        { notes: regex },
                        { 'investor.name': regex },
                        { engineNumber: regex },
                        { chassisNumber: regex }
                    ];

                    if (/^\d+$/.test(word)) {
                        const numVal = parseInt(word);
                        conditions.push({ year: numVal });
                        conditions.push({ km: numVal });
                    }

                    return { $or: conditions };
                });
            }
        }

        if (status && status !== 'todos') {
            const statusMap = {
                disponible: 'Disponible',
                senado: 'Reservado',
                vendido_sin_confirmar: 'Pausado',
                vendido: 'Vendido'
            };
            query.status = statusMap[status] || status;
        }

        if (brand && brand !== 'todas') {
            query.brand = brand;
        }

        if (tab && tab !== 'stock') {
            if (tab === 'consignaciones') {
                query.consignedBy = { $exists: true, $ne: '' };
            } else if (tab === 'compartidos') {
                query['investor.percentage'] = { $gt: 0 };
            } else if (tab === 'cero_km') {
                query.$or = [
                    { condition: { $in: ['0km', 'nuevo', 'Nuevo', '0KM'] } },
                    { km: 0 }
                ];
            }
        }

        if (ml === 'publicados') {
            query.publishedOnML = 'Sí';
        } else if (ml === 'no_publicados') {
            query.publishedOnML = { $ne: 'Sí' };
        }

        const parsedLimit = parseInt(limit);
        const parsedPage = parseInt(page);
        const skip = (parsedPage - 1) * parsedLimit;

        const totalFiltered = await Car.countDocuments(query);
        const cars = await Car.find(query)
            .select('-auditLog')
            .sort({ order: 1, createdAt: -1 })
            .skip(skip)
            .limit(parsedLimit)
            .lean();
        const brands = await Car.distinct('brand');
        res.json({
            cars,
            total: totalFiltered,
            pages: Math.ceil(totalFiltered / parsedLimit),
            page: parsedPage,
            limit: parsedLimit,
            summary,
            brands
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET dashboard upcoming dues (vencimientos próximos)
app.get('/api/admin/dashboard/upcoming-dues', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        await connectDB();

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

        // Vencimientos próximos: cuotas que vencen en los próximos 7 días (o ya vencidas pero no pagadas)
        const sevenDaysFromNow = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
        sevenDaysFromNow.setHours(23, 59, 59, 999);

        const query = {
            status: { $in: ['pendiente', 'parcial'] },
            dueDate: { $lte: sevenDaysFromNow }
        };

        const upcomingDues = await Installment.find(query)
            .populate('clientId', 'name fullName email phone')
            .populate('vehicleId', 'marca modelo version year precio')
            .sort({ dueDate: 1 })
            .limit(15)
            .lean();

        res.json(upcomingDues);
    } catch (error) {
        console.error('Error fetching upcoming dues:', error);
        res.status(500).json({ message: 'Error al obtener vencimientos próximos' });
    }
});

// GET single car for Admin (Protected, Full Data)
app.get('/api/admin/cars/:id', authenticateToken, requirePermission(PERMISSIONS.STOCK_READ), async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ message: 'Car not found' });
        res.json(car);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST append internal note to a car
app.post('/api/admin/cars/:id/notes', authenticateToken, requirePermission(PERMISSIONS.STOCK_WRITE), async (req, res) => {
    try {
        await connectDB();
        const note = (req.body?.note || '').toString().trim();
        if (!note) return res.status(400).json({ message: 'La observacion es obligatoria.' });
        if (note.length > 1000) return res.status(400).json({ message: 'La observacion no puede superar 1000 caracteres.' });

        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ message: 'Vehiculo no encontrado' });

        const previousNotes = car.notes || '';
        const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
        const entry = '[' + timestamp + '] ' + note;
        car.notes = previousNotes ? previousNotes + '\n\n' + entry : entry;

        const user = req.user ? (req.user.email || req.user.username || req.user.role) : 'System';
        if (!car.auditLog) car.auditLog = [];
        car.auditLog.push({
            action: 'OBSERVACION',
            field: 'notes',
            oldValue: previousNotes,
            newValue: car.notes,
            details: note,
            user,
            source: 'CRM_V2'
        });

        await car.save();
        res.json(car);
    } catch (error) {
        console.error('Error appending car note:', error);
        res.status(500).json({ message: error.message || 'Error al guardar observacion' });
    }
});

// Dedicated PUT endpoint for images
app.put('/api/admin/cars/:id/images', authenticateToken, requirePermission(PERMISSIONS.STOCK_WRITE), upload.array('images', 20), async (req, res) => {
    try {
        const missingCloudinaryVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
            .filter((key) => !process.env[key]);

        if (missingCloudinaryVars.length > 0) {
            return res.status(500).json({
                message: 'Cloudinary no esta configurado para subir imagenes.',
                detail: `Faltan variables de entorno: ${missingCloudinaryVars.join(', ')}`
            });
        }

        await connectDB();
        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ error: 'Car not found' });

        const newUploadedPaths = req.files ? req.files.map(file => file.path) : [];
        let finalImages = [];
        const { imageOrder } = req.body;

        if (imageOrder) {
            try {
                const order = JSON.parse(imageOrder);
                finalImages = order.map(item => {
                    if (item && item.toString().startsWith('__new__')) {
                        const indexStr = item.split('__new__')[1];
                        const idx = parseInt(indexStr);
                        return newUploadedPaths[idx];
                    } else {
                        return item;
                    }
                }).filter(img => img);
            } catch (e) {
                finalImages = [...(car.images || []), ...newUploadedPaths];
            }
        } else {
            finalImages = [...(car.images || []), ...newUploadedPaths];
        }

        car.images = finalImages;
        car.coverImage = finalImages.length > 0 ? finalImages[0] : '';

        const user = req.user ? (req.user.email || req.user.role) : 'System';
        if (!car.auditLog) car.auditLog = [];
        car.auditLog.push({
            action: 'EDICION',
            field: 'images',
            user,
            source: 'CRM_V2',
            details: `Imágenes actualizadas. Total: ${finalImages.length}`
        });

        await car.save();
        res.json({ success: true, images: finalImages, uploadedImages: newUploadedPaths });
    } catch (err) {
        console.error('PUT /api/admin/cars/:id/images error:', err);
        const statusCode = err?.http_code || err?.statusCode || 500;
        res.status(statusCode).json({
            message: err?.message || 'Error al guardar imagenes del vehiculo',
            detail: err?.name || err?.code || 'UPLOAD_ERROR'
        });
    }
});

// PATCH update car
app.patch('/api/admin/cars/:id', authenticateToken, requirePermission(PERMISSIONS.STOCK_WRITE), upload.array('images', 20), async (req, res) => {
    try {
        await connectDB();
        const carId = req.params.id;
        let updates = req.body;
        const user = req.user ? (req.user.email || req.user.role) : 'System';

        const car = await Car.findById(carId);
        if (!car) {
            return res.status(404).json({ message: 'Car not found' });
        }

        const newAuditLogs = [];
        const { _id, auditLog, createdAt, soldAt, expenses, documentation, images, ...otherUpdates } = updates;

        Object.keys(otherUpdates).forEach(key => {
            car[key] = otherUpdates[key];
        });

        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.path);
            updates.images = [...(car.images || []), ...newImages];
        }

        if (documentation) {
            let parsedDocs = documentation;
            if (typeof documentation === 'string') {
                try {
                    parsedDocs = JSON.parse(documentation);
                } catch (e) {
                    console.error("Error parsing documentation", e);
                }
            }
            if (typeof parsedDocs === 'object') {
                const nextDocumentation = { ...car.documentation, ...parsedDocs };
                const changedDocs = Object.keys(parsedDocs).filter((key) => {
                    return String(car.documentation?.[key] || '') !== String(parsedDocs[key] || '');
                });

                if (changedDocs.length > 0) {
                    newAuditLogs.push({
                        action: 'EDICION',
                        field: 'documentation',
                        oldValue: car.documentation,
                        newValue: nextDocumentation,
                        details: `Documentacion registral actualizada: ${changedDocs.join(', ')}`,
                        user,
                        source: 'CRM_V2'
                    });
                }

                car.documentation = nextDocumentation;
                car.markModified('documentation');
            }
        }

        if (createdAt !== undefined) {
            if (createdAt === null || createdAt === '') {
                car.createdAt = undefined;
            } else {
                const newCreatedAt = new Date(createdAt);
                if (!isNaN(newCreatedAt)) {
                    const oldTime = car.createdAt ? new Date(car.createdAt).getTime() : 0;
                if (oldTime !== newCreatedAt.getTime()) {
                    newAuditLogs.push({
                        action: 'EDICION',
                        field: 'createdAt',
                        oldValue: car.createdAt,
                        newValue: newCreatedAt,
                        details: `Fecha de ingreso modificada a ${newCreatedAt.toLocaleDateString('es-AR')}`,
                        user,
                        source: 'CRM_V2'
                    });
                    car.createdAt = newCreatedAt;
                }
            }
        }
        }

        if (soldAt !== undefined) {
            if (soldAt === null || soldAt === '') {
                car.soldAt = undefined;
            } else {
                const newSoldAt = new Date(soldAt);
                if (!isNaN(newSoldAt)) {
                    const oldTime = car.soldAt ? new Date(car.soldAt).getTime() : 0;
                    if (oldTime !== newSoldAt.getTime()) {
                        newAuditLogs.push({
                            action: 'EDICION',
                            field: 'soldAt',
                            oldValue: car.soldAt,
                            newValue: newSoldAt,
                            details: `Fecha de venta modificada a ${newSoldAt.toLocaleDateString('es-AR')}`,
                            user,
                            source: 'CRM_V2'
                        });
                        car.soldAt = newSoldAt;
                    }
                }
            }
        }

        // Expenses
        if (expenses !== undefined && Array.isArray(expenses)) {
            // Check for new expenses
            const oldLength = car.expenses ? car.expenses.length : 0;
            if (expenses.length > oldLength) {
                const newExp = expenses[expenses.length - 1]; // Assume the new one is appended
                newAuditLogs.push({
                    action: 'GASTO',
                    field: 'expenses',
                    newValue: newExp,
                    details: `Gasto agregado: ${newExp.concept} por ${newExp.currency} ${newExp.amount}${newExp.note ? ` (${newExp.note})` : ''}`,
                    user,
                    source: 'CRM_V2'
                });
            }
            car.expenses = expenses;
        }

        if (newAuditLogs.length > 0) {
            if (!car.auditLog) car.auditLog = [];
            car.auditLog.push(...newAuditLogs);
        }

        const updatedCar = await car.save();

        if (newAuditLogs.length > 0) {
            await logAudit({
                req,
                action: 'VEHICULO_EDITADO',
                module: 'stock',
                entityType: 'Car',
                entityId: updatedCar._id,
                entityLabel: `${updatedCar.brand} ${updatedCar.name}`,
                description: `Se editaron ${newAuditLogs.length} campos del veh├¡culo.`,
                metadata: { changes: newAuditLogs.map(l => ({ field: l.field, oldValue: l.oldValue, newValue: l.newValue })) }
            });
        }

        res.json(updatedCar);
    } catch (error) {
        console.error("PATCH error:", error);
        res.status(400).json({ message: error.message });
    }
});

// PUT reorder cars (Protected)
app.put('/api/cars/reorder/batch', authenticateToken, requirePermission(PERMISSIONS.STOCK_WRITE), async (req, res) => {
    try {
        const { orderedIds } = req.body; // Array of IDs in desired order
        if (!orderedIds || !Array.isArray(orderedIds)) {
            return res.status(400).json({ message: 'Invalid data format' });
        }

        const operations = orderedIds.map((id, index) => ({
            updateOne: {
                filter: { _id: id },
                update: { order: index }
            }
        }));

        await Car.bulkWrite(operations);
        res.json({ message: 'Order updated successfully' });
    } catch (error) {
        console.error('Reorder Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// PUT swap order of two cars (Protected)
app.put('/api/cars/reorder/swap', authenticateToken, requirePermission(PERMISSIONS.STOCK_WRITE), async (req, res) => {
    try {
        const { id1, id2, direction } = req.body;

        if (!id1) {
            return res.status(400).json({ message: 'El ID1 es obligatorio.' });
        }
        if (!mongoose.Types.ObjectId.isValid(id1)) {
            return res.status(400).json({ message: 'Formato de ID1 no válido.' });
        }

        await connectDB();

        const cars = await Car.find({}).sort({ order: 1, createdAt: -1 });
        const index1 = cars.findIndex(c => c._id.toString() === id1);
        if (index1 === -1) {
            return res.status(404).json({ message: 'Vehículo 1 no encontrado.' });
        }

        let resolvedId2 = id2;
        if (!resolvedId2) {
            if (!direction) {
                return res.status(400).json({ message: 'Debe proporcionar ID2 o una dirección (direction).' });
            }
            let index2;
            if (direction === 'up') {
                index2 = index1 - 1;
            } else if (direction === 'down') {
                index2 = index1 + 1;
            } else {
                return res.status(400).json({ message: 'Dirección no válida (debe ser up o down).' });
            }

            if (index2 < 0 || index2 >= cars.length) {
                return res.status(400).json({ message: 'Movimiento fuera de límites.' });
            }
            resolvedId2 = cars[index2]._id.toString();
        }

        if (id1 === resolvedId2) {
            return res.status(400).json({ message: 'Los IDs a intercambiar no pueden ser idénticos.' });
        }
        if (!mongoose.Types.ObjectId.isValid(resolvedId2)) {
            return res.status(400).json({ message: 'Formato de ID2 no válido.' });
        }

        const car1 = await Car.findById(id1);
        const car2 = await Car.findById(resolvedId2);

        if (!car1 || !car2) {
            return res.status(404).json({ message: 'Uno o ambos vehículos no fueron encontrados.' });
        }

        const needsNormalization = cars.some((c, i) => c.order === undefined || (i > 0 && c.order === cars[i - 1].order));

        if (needsNormalization) {
            const ops = cars.map((c, i) => ({
                updateOne: {
                    filter: { _id: c._id },
                    update: { order: i }
                }
            }));
            await Car.bulkWrite(ops);
            cars.forEach((c, i) => c.order = i);

            const updatedCar1 = cars.find(c => c._id.toString() === id1);
            const updatedCar2 = cars.find(c => c._id.toString() === resolvedId2);
            if (updatedCar1) car1.order = updatedCar1.order;
            if (updatedCar2) car2.order = updatedCar2.order;
        }

        const tempOrder = car1.order;
        car1.order = car2.order;
        car2.order = tempOrder;

        await Promise.all([
            Car.updateOne({ _id: id1 }, { order: car1.order }),
            Car.updateOne({ _id: resolvedId2 }, { order: car2.order })
        ]);

        res.json({ message: 'Orden intercambiado correctamente.' });
    } catch (error) {
        console.error('Swap Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// DELETE car (Protected, Safe Delete)
app.delete('/api/cars/:id', authenticateToken, requirePermission(PERMISSIONS.STOCK_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ message: 'Se requiere un motivo para eliminar el veh├¡culo.' });
        }

        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ message: 'Veh├¡culo no encontrado.' });

        // Reglas de negocio para borrado seguro:
        if (car.visibleEnWeb !== false) {
            return res.status(400).json({ message: 'No se puede eliminar un veh├¡culo visible en web. Ocultalo primero.' });
        }

        // Check active reservations
        const activeReservations = await Reservation.find({ vehicleId: car._id, status: 'activa' });
        if (activeReservations.length > 0) {
            return res.status(400).json({ message: 'El veh├¡culo tiene una reserva activa asociada. Cancelala primero.' });
        }

        // Check active sales
        const activeSales = await Sale.find({ vehicleId: car._id });
        if (activeSales.length > 0) {
            return res.status(400).json({ message: 'El veh├¡culo est├í asociado como unidad principal en una venta. Cancel├í la venta primero.' });
        }

        // Limpiar linkedStockCarId en permutas donde se ingres├│ este veh├¡culo de prueba
        const salesWithTradeIn = await Sale.find({ "tradeIns.linkedStockCarId": car._id });
        for (let sale of salesWithTradeIn) {
            let updated = false;
            for (let tradeIn of sale.tradeIns) {
                if (tradeIn.linkedStockCarId && tradeIn.linkedStockCarId.toString() === car._id.toString()) {
                    tradeIn.linkedStockCarId = null;
                    updated = true;
                }
            }
            if (updated) await sale.save();
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);
        await TrashRecord.create({
            entityType: 'Car',
            entityId: car._id,
            snapshot: car.toObject(),
            deletedBy: req.user?.userId || req.user?.id || req.user?.username || 'System',
            expiresAt
        });

        await Car.findByIdAndDelete(req.params.id);

        await logAudit({
            req,
            action: 'VEHICULO_STOCK_ELIMINADO',
            module: 'stock',
            entityType: 'Car',
            entityId: car._id,
            entityLabel: `${car.brand} ${car.name} (${car.plateOrVin || 'S/D'})`,
            description: `Motivo: ${reason}`,
            metadata: {
                reason,
                status: car.status,
                salesCleaned: salesWithTradeIn.length
            }
        });

        res.json({ message: 'Veh├¡culo eliminado con ├®xito.' });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: error.message });
    }
});

// --- CLIENTS ROUTES ---

// GET all clients
app.get('/api/admin/clients', authenticateToken, requirePermission(PERMISSIONS.CLIENTES_READ), async (req, res) => {
    try {
        await connectDB();
        const { search, type, source, status, segment, limit = 50, page = 1 } = req.query;
        let query = {};

        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [
                { fullName: regex },
                { phoneNormalized: regex },
                { emailNormalized: regex },
                { locality: regex }
            ];
        }
        if (type) query.type = type;
        if (source) query.source = source;
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const parsedLimit = parseInt(limit);

        const reqUserId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : null;
        if (segment === 'mis-clientes' && reqUserId) {
            query.assignedTo = reqUserId;
        } else if (segment === 'vendieron') {
            query.type = { $in: ['vendedor', 'ambos'] };
        }

        if (segment === 'contactados' || segment === 'sin-contactar' || segment === 'compraron') {
            const pipeline = [];
            if (Object.keys(query).length > 0) pipeline.push({ $match: query });

            if (segment === 'contactados' || segment === 'sin-contactar') {
                pipeline.push({ $lookup: { from: 'leads', localField: '_id', foreignField: 'clientId', as: 'relatedLeads' } });
                if (segment === 'sin-contactar') {
                    pipeline.push({
                        $match: {
                            $and: [
                                { $or: [{ interactions: { $exists: false } }, { interactions: { $size: 0 } }] },
                                { $or: [{ relatedLeads: { $size: 0 } }, { "relatedLeads": { $not: { $elemMatch: { crmStatus: { $ne: 'nuevo' } } } } }] }
                            ]
                        }
                    });
                } else if (segment === 'contactados') {
                    pipeline.push({
                        $match: {
                            $or: [
                                { "interactions.0": { $exists: true } },
                                { "relatedLeads": { $elemMatch: { crmStatus: { $ne: 'nuevo' } } } }
                            ]
                        }
                    });
                }
            } else if (segment === 'compraron') {
                pipeline.push({ $lookup: { from: 'sales', localField: '_id', foreignField: 'clientId', as: 'relatedSales' } });
                pipeline.push({
                    $match: { "relatedSales": { $elemMatch: { status: { $nin: ['cancelada', 'borrador'] } } } }
                });
            }

            const countPipeline = [...pipeline, { $count: 'total' }];
            const countResult = await Client.aggregate(countPipeline);
            const total = countResult.length > 0 ? countResult[0].total : 0;

            pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: parsedLimit }, { $project: { relatedLeads: 0, relatedSales: 0 } });
            const clients = await Client.aggregate(pipeline);
            return res.json({ clients, total, pages: Math.ceil(total / parsedLimit) });
        }

        const clients = await Client.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Client.countDocuments(query);

        res.json({ clients, total, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET single client
app.get('/api/admin/clients/:id', authenticateToken, requirePermission(PERMISSIONS.CLIENTES_READ), async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST validate import
app.post('/api/admin/clients/validate-import', authenticateToken, requirePermission(PERMISSIONS.CLIENTES_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { rows } = req.body;
        if (!Array.isArray(rows)) return res.status(400).json({ message: 'Rows must be an array' });

        const results = [];
        for (const row of rows) {
            let status = 'valid';
            let message = 'Listo para importar';
            let existingClient = null;

            // Normalize fields for check
            const phoneNormalized = row.phone ? String(row.phone).replace(/\D/g, '') : '';
            const emailNormalized = row.email ? String(row.email).toLowerCase().trim() : '';
            const dniCuit = row.dni ? String(row.dni).trim() : '';

            // Check duplicates
            const orConditions = [];
            if (phoneNormalized) orConditions.push({ phoneNormalized });
            if (emailNormalized) orConditions.push({ emailNormalized });
            if (dniCuit) orConditions.push({ dniCuit });

            if (orConditions.length > 0) {
                existingClient = await Client.findOne({ $or: orConditions }).lean();
            }

            if (existingClient) {
                status = 'duplicate';
                message = 'Cliente duplicado (coincide teléfono, email o DNI)';
            } else if (!row.firstName && !row.fullName) {
                status = 'error';
                message = 'Falta el nombre/apellido';
            } else if (!phoneNormalized && !emailNormalized) {
                status = 'error';
                message = 'Debe tener teléfono o email';
            }

            results.push({ ...row, _importStatus: status, _importMessage: message, _duplicateId: existingClient?._id });
        }

        res.json({ results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST bulk insert clients
app.post('/api/admin/clients/bulk', authenticateToken, requirePermission(PERMISSIONS.CLIENTES_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { clients } = req.body;
        if (!Array.isArray(clients)) return res.status(400).json({ message: 'Clients must be an array' });

        const toInsert = clients.map(clientData => {
            const client = new Client({
                firstName: clientData.firstName || '',
                lastName: clientData.lastName || '',
                fullName: clientData.fullName || `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim(),
                phone: clientData.phone || '',
                email: clientData.email || '',
                dniCuit: clientData.dni || '',
                locality: clientData.locality || '',
                type: clientData.type || 'potencial',
                source: clientData.source || 'otro',
                notes: clientData.notes || 'Importado via Excel',
                createdBy: req.user?.id || 'CRM_V2'
            });

            client.clientAuditLog.push({
                action: 'CREACION',
                details: 'Cliente importado masivamente',
                user: req.user?.id || 'CRM_V2'
            });

            return client;
        });

        const inserted = await Client.insertMany(toInsert);

        await logAudit({
            req,
            action: 'IMPORTACION_MASIVA',
            module: 'clientes',
            entityType: 'Client',
            description: `Se importaron ${inserted.length} clientes masivamente.`
        });

        res.json({ ok: true, count: inserted.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST new client
app.post('/api/admin/clients', authenticateToken, requirePermission(PERMISSIONS.CLIENTES_WRITE), async (req, res) => {
    try {
        const payload = req.body;

        // Basic Validation
        if (!payload.firstName && !payload.fullName) {
            return res.status(400).json({ message: 'El nombre es obligatorio.' });
        }
        if (!payload.phone && !payload.email) {
            return res.status(400).json({ message: 'Debe proveer un tel├®fono o un email.' });
        }

        // Sanitization using explicitly allowed fields
        const allowedFields = [
            'firstName', 'lastName', 'fullName', 'phone', 'email', 'dniCuit',
            'locality', 'province', 'address', 'type', 'source', 'status', 'tags', 'notes', 'assignedTo'
        ];

        let sanitizedData = {};
        allowedFields.forEach(field => {
            if (payload[field] !== undefined) {
                sanitizedData[field] = payload[field];
            }
        });

        if (sanitizedData.assignedTo === "") {
            sanitizedData.assignedTo = null;
        }

        sanitizedData.createdBy = req.user?.username || 'Admin';
        sanitizedData.clientAuditLog = [{
            action: 'CREACION',
            date: new Date(),
            user: sanitizedData.createdBy,
            source: 'CRM_V2',
            details: 'Cliente creado desde CRM'
        }];

        const newClient = new Client(sanitizedData);
        const savedClient = await newClient.save();

        await logAudit({
            req,
            action: 'CLIENTE_CREADO',
            module: 'clientes',
            entityType: 'Client',
            entityId: savedClient._id,
            entityLabel: savedClient.fullName || savedClient.firstName,
            description: `Se cre├│ el cliente ${savedClient.fullName || savedClient.firstName}.`,
            metadata: { type: savedClient.type, source: savedClient.source }
        });

        res.status(201).json(savedClient);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(400).json({ message: error.message });
    }
});

// PATCH update client
app.patch('/api/admin/clients/:id', authenticateToken, requirePermission(PERMISSIONS.CLIENTES_WRITE), async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        const payload = req.body;
        const allowedFields = [
            'firstName', 'lastName', 'fullName', 'phone', 'email', 'dniCuit',
            'locality', 'province', 'address', 'type', 'source', 'status', 'tags', 'notes', 'lastContactDate'
        ];

        const user = req.user?.username || 'Admin';
        const newAuditLogs = [];

        if (payload.assignedTo !== undefined) {
            let oldAssigned = client.assignedTo ? client.assignedTo.toString() : null;
            let newAssigned = payload.assignedTo === "" ? null : payload.assignedTo;
            if (oldAssigned !== newAssigned) {
                client.assignedTo = newAssigned;
                client.assignedAt = new Date();

                await logAudit({
                    req,
                    action: newAssigned ? 'RESPONSABLE_ASIGNADO' : 'RESPONSABLE_REMOVIDO',
                    module: 'clientes',
                    entityType: 'Client',
                    entityId: client._id,
                    entityLabel: client.fullName,
                    description: `Se reasign├│ el cliente.`,
                    metadata: { oldAssigned, newAssigned }
                });
            }
        }


        allowedFields.forEach(field => {
            if (payload[field] !== undefined && payload[field] !== client[field] && JSON.stringify(payload[field]) !== JSON.stringify(client[field])) {
                newAuditLogs.push({
                    action: 'ACTUALIZACION',
                    field: field,
                    oldValue: client[field],
                    newValue: payload[field],
                    user: user,
                    source: 'CRM_V2',
                    details: `Campo ${field} actualizado`
                });
                client[field] = payload[field];
            }
        });

        // Interactions are added separately if sent
        if (payload.newInteraction) {
            client.interactions.push({
                ...payload.newInteraction,
                user: user,
                date: new Date()
            });
            client.lastContactDate = new Date();
        }

        if (newAuditLogs.length > 0) {
            client.clientAuditLog.push(...newAuditLogs);
        }

        const updatedClient = await client.save();

        if (newAuditLogs.length > 0) {
            await logAudit({
                req,
                action: 'CLIENTE_EDITADO',
                module: 'clientes',
                entityType: 'Client',
                entityId: updatedClient._id,
                entityLabel: updatedClient.fullName || updatedClient.firstName,
                description: `Se editaron campos del cliente.`,
                metadata: { changes: newAuditLogs.map(l => ({ field: l.field, oldValue: l.oldValue, newValue: l.newValue })) }
            });
        }

        res.json(updatedClient);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(400).json({ message: error.message });
    }
});

// --- ADMIN LEADS ROUTES (CRM V2) ---

// GET admin leads
app.get('/api/admin/leads', authenticateToken, requirePermission(PERMISSIONS.LEADS_READ), async (req, res) => {
    try {
        const { search, crmStatus, priority, source, sourceDetail, clientId, unlinked, vehicleId, limit = 50, skip = 0 } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (crmStatus) query.crmStatus = crmStatus;
        if (priority) query.priority = priority;
        if (source) query.source = source;
        if (sourceDetail) query.sourceDetail = sourceDetail;
        if (vehicleId) query.vehicleId = vehicleId;

        if (unlinked === 'true') {
            query.clientId = null;
        } else if (clientId) {
            query.clientId = clientId;
        }

        const leads = await Lead.find(query)
            .populate('vehicleId', 'brand name year plateOrVin price currency')
            .populate('clientId', 'fullName phone email')
            .populate('assignedTo', 'name email role')
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .lean();

        const total = await Lead.countDocuments(query);

        res.json({ leads, total, skip: parseInt(skip), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET single admin lead
app.get('/api/admin/leads/:id', authenticateToken, requirePermission(PERMISSIONS.LEADS_READ), async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('vehicleId', 'brand name year plateOrVin price currency status')
            .populate('clientId', 'fullName firstName lastName phone email')
            .populate('assignedTo', 'name email role');
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        res.json(lead);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST new admin lead
app.post('/api/admin/leads', authenticateToken, requirePermission(PERMISSIONS.LEADS_WRITE), async (req, res) => {
    try {
        const payload = req.body;

        if (!payload.name) return res.status(400).json({ message: 'Name is required' });
        if (!payload.phone && !payload.email) return res.status(400).json({ message: 'Contact info is required' });

        const allowedFields = [
            'name', 'phone', 'email', 'clientId', 'vehicleId', 'source',
            'crmStatus', 'priority', 'assignedTo', 'nextActionDate', 'pipelineStage'
        ];

        let sanitizedData = {};
        allowedFields.forEach(field => {
            if (payload[field] !== undefined) {
                sanitizedData[field] = payload[field];
            }
        });

        if (sanitizedData.assignedTo === "") sanitizedData.assignedTo = null;
        if (!sanitizedData.assignedTo && req.user?.userId) {
            sanitizedData.assignedTo = req.user.userId;
            sanitizedData.assignedAt = new Date();
        }
        if (sanitizedData.vehicleId === "") sanitizedData.vehicleId = null;
        if (sanitizedData.clientId === "") sanitizedData.clientId = null;

        const user = req.user?.username || 'Admin';

        if (payload.notes) {
            sanitizedData.notes = [{ text: payload.notes, date: new Date() }];
        }

        sanitizedData.leadAuditLog = [{
            action: 'CREACION',
            date: new Date(),
            user: user,
            source: 'CRM_V2',
            details: 'Lead creado desde CRM V2'
        }];

        sanitizedData.sourceDetail = 'manual_crm';

        const newLead = new Lead(sanitizedData);
        const savedLead = await newLead.save();

        await logAudit({
            req,
            action: 'LEAD_CREADO',
            module: 'leads',
            entityType: 'Lead',
            entityId: savedLead._id,
            entityLabel: savedLead.name,
            description: `Se cre├│ el lead ${savedLead.name}.`,
            metadata: { source: savedLead.source, status: savedLead.crmStatus }
        });

        res.status(201).json(savedLead);
    } catch (error) {
        console.error('Error creating admin lead:', error);
        res.status(400).json({ message: error.message });
    }
});

// PATCH update admin lead
app.patch('/api/admin/leads/:id', authenticateToken, requirePermission(PERMISSIONS.LEADS_WRITE), async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        const payload = req.body;
        const allowedFields = [
            'name', 'phone', 'email', 'vehicleId', 'source',
            'crmStatus', 'priority', 'assignedTo', 'nextActionDate', 'pipelineStage', 'lastContactDate'
        ];

        const user = req.user?.username || 'Admin';
        const newAuditLogs = [];

        if (payload.assignedTo === "") payload.assignedTo = null;
        if (payload.vehicleId === "") payload.vehicleId = null;
        if (payload.clientId === "") payload.clientId = null;

        allowedFields.forEach(field => {
            if (payload[field] !== undefined && payload[field] !== lead[field] && JSON.stringify(payload[field]) !== JSON.stringify(lead[field])) {
                let action = 'ACTUALIZACION';
                if (field === 'crmStatus') action = 'CAMBIO_ESTADO';
                if (field === 'priority') action = 'CAMBIO_PRIORIDAD';
                if (field === 'vehicleId') action = 'CAMBIO_VEHICULO';
                if (field === 'assignedTo') {
                    action = 'CAMBIO_ASIGNACION';
                    lead.assignedAt = new Date();
                    lead.slaAlertGenerated = false;
                }

                newAuditLogs.push({
                    action: action,
                    field: field,
                    oldValue: lead[field],
                    newValue: payload[field],
                    user: user,
                    source: 'CRM_V2',
                    details: `Campo ${field} actualizado`
                });
                lead[field] = payload[field];
            }
        });

        if (payload.newTask) {
            const newTaskObj = {
                ...payload.newTask,
                user: user,
                createdAt: new Date()
            };
            lead.tasks.push(newTaskObj);
            newAuditLogs.push({
                action: 'TAREA',
                field: 'tasks',
                user: user,
                source: 'CRM_V2',
                details: `Nueva tarea: ${payload.newTask.title}`
            });

            // Native backend logic to auto-update nextActionDate based on new task dueDate
            if (payload.newTask.dueDate) {
                const newTaskDate = new Date(payload.newTask.dueDate);
                if (!lead.nextActionDate || newTaskDate < new Date(lead.nextActionDate)) {
                    lead.nextActionDate = newTaskDate;
                }
            }
        }

        if (payload.newNote) {
            lead.notes.push({
                text: payload.newNote,
                date: new Date()
            });
            lead.lastContactDate = new Date();
        }

        if (newAuditLogs.length > 0) {
            lead.leadAuditLog.push(...newAuditLogs);
        }

        const updatedLead = await lead.save();

        if (newAuditLogs.length > 0) {
            await logAudit({
                req,
                action: 'LEAD_EDITADO',
                module: 'leads',
                entityType: 'Lead',
                entityId: updatedLead._id,
                entityLabel: updatedLead.name,
                description: `Se actualiz├│ el lead (tareas/notas o campos).`,
                metadata: { changes: newAuditLogs.length }
            });
        }

        res.json(updatedLead);
    } catch (error) {
        console.error('Error updating admin lead:', error);
        res.status(400).json({ message: error.message });
    }
});

// PATCH link client to lead
app.patch('/api/admin/leads/:id/link-client', authenticateToken, requirePermission(PERMISSIONS.LEADS_WRITE), async (req, res) => {
    try {
        const { clientId } = req.body;
        if (!clientId) return res.status(400).json({ message: 'Client ID is required' });

        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        const client = await Client.findById(clientId);
        if (!client) return res.status(404).json({ message: 'Client not found in DB' });

        const user = req.user?.username || 'Admin';

        lead.clientId = clientId;
        lead.lastActivityAt = new Date();

        lead.leadAuditLog.push({
            action: 'VINCULACION_CLIENTE',
            field: 'clientId',
            newValue: clientId,
            user: user,
            source: 'CRM_V2',
            details: `Vinculado al cliente: ${client.fullName || client.firstName}`
        });

        const updatedLead = await lead.save();
        res.json(updatedLead);
    } catch (error) {
        console.error('Error linking client to lead:', error);
        res.status(400).json({ message: error.message });
    }
});

// PATCH update task status
app.patch('/api/admin/leads/:id/tasks/:taskId', authenticateToken, requireAnyPermission([PERMISSIONS.LEADS_WRITE, PERMISSIONS.AGENDA_WRITE]), async (req, res) => {
    try {
        const { status } = req.body;
        if (!status || !['pendiente', 'completada', 'cancelada'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        const task = lead.tasks.id(req.params.taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        if (task.status === status) {
            return res.json(lead);
        }

        const user = req.user?.username || 'Admin';
        task.status = status;

        let action = 'ACTUALIZACION';
        let detailMsg = `Tarea actualizada: ${task.title}`;

        if (status === 'completada') {
            task.completedAt = new Date();
            action = 'TAREA_COMPLETADA';
            detailMsg = `Tarea completada: ${task.title}`;
        } else if (status === 'cancelada') {
            action = 'TAREA_CANCELADA';
            detailMsg = `Tarea cancelada: ${task.title}`;
        }

        lead.leadAuditLog.push({
            action: action,
            field: 'tasks',
            user: user,
            source: 'CRM_V2',
            details: detailMsg
        });

        const updatedLead = await lead.save();
        res.json(updatedLead);
    } catch (error) {
        console.error('Error updating lead task:', error);
        res.status(400).json({ message: error.message });
    }
});

// --- LEADS ROUTES (LEGACY) ---

// POST new lead from public website (No Authentication Required)
app.post('/api/leads/public', async (req, res) => {
    try {
        const { name, phone, message, vehicleId, email, sourceDetail } = req.body;

        // Basic validations
        if (!name || !phone) return res.status(400).json({ message: 'Name and phone are required' });

        // Sanitize and limit lengths (basic protection)
        const sanitizedName = String(name).substring(0, 100).trim();
        const sanitizedPhone = String(phone).substring(0, 50).trim();
        const phoneNormalized = sanitizedPhone.replace(/[\s\-\(\)\+]/g, '');
        const sanitizedEmail = email ? String(email).substring(0, 100).trim() : undefined;
        const sanitizedMessage = message ? String(message).substring(0, 1000).trim() : undefined;

        // Note legacy array
        const notes = sanitizedMessage ? [{ text: `Mensaje web: ${sanitizedMessage}`, date: new Date() }] : [];

        // Vehicle Validation
        let parsedVehicleId = undefined;
        if (vehicleId) {
            // Check if vehicleId is a valid ObjectId (24 hex characters)
            if (/^[0-9a-fA-F]{24}$/.test(String(vehicleId))) {
                parsedVehicleId = vehicleId;
            } else {
                console.warn('Invalid vehicleId received on public lead endpoint:', vehicleId);
                // We ignore invalid vehicleId to not lose the lead
            }
        }

        // V2 Fields
        const crmStatus = 'nuevo';
        const priority = 'media';
        const source = 'web'; // Must match Enum

        const allowedSourceDetails = ["contact_form", "vehicle_detail_whatsapp", "financing_whatsapp", "manual_crm", "unknown"];
        const finalSourceDetail = allowedSourceDetails.includes(sourceDetail) ? sourceDetail : "unknown";

        // Audit log
        const leadAuditLog = [{
            action: 'CREACION_WEB',
            field: 'lead',
            details: 'Lead creado desde formulario web p├║blico',
            date: new Date(),
            user: 'Web P├║blica',
            source: 'CRM_V2'
        }];

        let automaticAssignment = null;
        try {
            automaticAssignment = await getNextLeadAssignee({
                source,
                sourceDetail: finalSourceDetail
            });
            if (automaticAssignment?.user) {
                leadAuditLog.push({
                    action: 'ASIGNACION_AUTOMATICA',
                    field: 'assignedTo',
                    newValue: automaticAssignment.user._id,
                    details: `Round-robin ${automaticAssignment.channelKey}: ${automaticAssignment.user.name || automaticAssignment.user.email}`,
                    user: 'Sistema'
                });
            }
        } catch (routingError) {
            console.error('Lead routing failed; lead will remain unassigned:', routingError.message);
        }

        const newLead = new Lead({
            name: sanitizedName,
            phone: sanitizedPhone,
            phoneNormalized: phoneNormalized,
            email: sanitizedEmail,
            emailNormalized: sanitizedEmail ? sanitizedEmail.toLowerCase() : undefined,
            pipelineStage: 'Nuevo Contacto', // Legacy support
            vehicleId: parsedVehicleId,
            notes: notes,
            crmStatus: crmStatus,
            priority: priority,
            source: source,
            sourceDetail: finalSourceDetail,
            leadAuditLog: leadAuditLog,
            assignedTo: automaticAssignment?.user?._id || null,
            assignedAt: automaticAssignment?.assignedAt || null,
            lastActivityAt: new Date()
        });

        const savedLead = await newLead.save();

        // Safe response without exposing internals
        res.status(201).json({
            success: true,
            message: 'Consulta recibida'
        });
    } catch (error) {
        console.error('Error on /api/leads/public:', error.message);
        res.status(400).json({ success: false, message: 'Error procesando la solicitud' });
    }
});

// GET all leads
app.get('/api/leads', authenticateToken, async (req, res) => {
    try {
        const leads = await Lead.find().populate('vehicleId').sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST new lead
app.post('/api/leads', authenticateToken, requirePermission(PERMISSIONS.LEADS_WRITE), async (req, res) => {
    try {
        const { name, phone, pipelineStage, vehicleId, notes } = req.body;
        // If vehicleId is an empty string, set it to undefined to avoid CastError
        const parsedVehicleId = vehicleId ? vehicleId : undefined;
        const newLead = new Lead({ name, phone, pipelineStage, vehicleId: parsedVehicleId, notes });
        const savedLead = await newLead.save();

        await ActivityLog.create({
            action: 'Nuevo Contacto',
            target: name,
            details: `Tom├ís cre├│ un nuevo prospecto en estado ${pipelineStage}`,
            user: 'Tom├ís'
        });

        res.status(201).json(savedLead);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT update lead
app.put('/api/leads/:id', authenticateToken, requirePermission(PERMISSIONS.LEADS_WRITE), async (req, res) => {
    try {
        const { name, phone, pipelineStage, vehicleId, notes, assignedTo } = req.body;
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        let oldAssigned = lead.assignedTo ? lead.assignedTo.toString() : null;
        let newAssigned = assignedTo === "" ? null : assignedTo;

        if (assignedTo !== undefined && oldAssigned !== newAssigned) {
            lead.assignedTo = newAssigned;
            lead.assignedAt = new Date();
            await logAudit({
                req,
                action: newAssigned ? 'RESPONSABLE_ASIGNADO' : 'RESPONSABLE_REMOVIDO',
                module: 'leads',
                entityType: 'Lead',
                entityId: lead._id,
                entityLabel: lead.name,
                description: `Se reasign├│ el lead.`,
                metadata: { oldAssigned, newAssigned }
            });
        }


        lead.name = name || lead.name;
        lead.phone = phone || lead.phone;

        // Handle unsetting vehicleId
        if (vehicleId === null || vehicleId === '') {
            lead.vehicleId = undefined;
        } else if (vehicleId !== undefined) {
            lead.vehicleId = vehicleId;
        }

        if (notes) lead.notes = notes;

        // Pipeline stage change logic and Car sync
        if (pipelineStage && pipelineStage !== lead.pipelineStage) {
            lead.pipelineStage = pipelineStage;

            await ActivityLog.create({
                action: 'Actualizaci├│n CRM',
                target: lead.name,
                details: `Tom├ís movi├│ el contacto a la etapa: ${pipelineStage}`,
                user: 'Tom├ís'
            });

            // Sync with Car status if needed
            if (lead.vehicleId) {
                let newCarStatus = null;
                if (pipelineStage === 'Se├▒ado') {
                    newCarStatus = 'Reservado';
                    await Car.findByIdAndUpdate(lead.vehicleId, { status: 'Reservado' });
                } else if (pipelineStage === 'Entregado / Vendido') {
                    newCarStatus = 'Vendido';
                    await Car.findByIdAndUpdate(lead.vehicleId, { status: 'Vendido', sold: true });
                }

                if (newCarStatus) {
                    const linkedCar = await Car.findById(lead.vehicleId);
                    if (linkedCar) {
                         await ActivityLog.create({
                             action: 'Auto ' + newCarStatus,
                             target: `${linkedCar.brand} ${linkedCar.name}`,
                             details: `El veh├¡culo pas├│ a estado ${newCarStatus} por un cierre en CRM.`,
                             user: 'Sistema'
                         });
                    }
                }
            }
        } else if (notes && notes.length > lead.notes.length) {
            await ActivityLog.create({
                action: 'Nueva Nota',
                target: lead.name,
                details: `Tom├ís a├▒adi├│ una nota al historial.`,
                user: 'Tom├ís'
            });
        }

        const updatedLead = await lead.save();
        const populatedLead = await Lead.findById(updatedLead._id).populate('vehicleId');
        res.json(populatedLead);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE lead
app.delete('/api/leads/:id', authenticateToken, requirePermission(PERMISSIONS.LEADS_WRITE), async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);
        await TrashRecord.create({
            entityType: 'Lead',
            entityId: lead._id,
            snapshot: lead.toObject(),
            deletedBy: req.user?.userId || req.user?.id || req.user?.username || 'System',
            expiresAt
        });

        await Lead.findByIdAndDelete(req.params.id);
        res.json({ message: 'Lead removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- TASKS ROUTES ---
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const tasks = await Task.find().sort({ dueDate: 1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/tasks', authenticateToken, requirePermission(PERMISSIONS.AGENDA_WRITE), async (req, res) => {
    try {
        const { title, dueDate } = req.body;
        const newTask = new Task({ title, dueDate });
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/tasks/:id', authenticateToken, requirePermission(PERMISSIONS.AGENDA_WRITE), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        task.status = req.body.status || task.status;
        const updatedTask = await task.save();
        res.json(updatedTask);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/tasks/:id', authenticateToken, requirePermission(PERMISSIONS.AGENDA_WRITE), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);
        await TrashRecord.create({
            entityType: 'Task',
            entityId: task._id,
            snapshot: task.toObject(),
            deletedBy: req.user?.userId || req.user?.id || req.user?.username || 'System',
            expiresAt
        });

        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: 'Task removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- DASHBOARD STATS ROUTE ---
app.get('/api/stats/dashboard', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        const stockCount = await Car.countDocuments({ status: 'Disponible' });
        const leadsCount = await Lead.countDocuments({ pipelineStage: { $ne: 'Entregado / Vendido' } });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const startOfNextMonth = new Date(startOfMonth);
        startOfNextMonth.setMonth(startOfNextMonth.getMonth() + 1);

        // Unidades Vendidas este mes
        const soldCarsThisMonth = await Sale.countDocuments({
            status: { $nin: ['cancelada', 'borrador'] },
            saleDate: { $gte: startOfMonth, $lt: startOfNextMonth }
        });

        // Or we can count Leads sold this month, both work. Let's use cars to reflect actual stock sales.

        const recentActivity = await ActivityLog.find().sort({ createdAt: -1 }).limit(5);

        res.json({
            stockCount,
            leadsCount,
            soldCarsThisMonth,
            recentActivity
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- FINANCE ACCOUNTS ROUTES ---
// Admin Accounts Routes (Secure)
app.get('/api/admin/accounts', authenticateToken, requirePermission(PERMISSIONS.CAJA_READ), async (req, res) => {
    try {
        await connectDB();
        let query = {};
        if (req.query.currency) query.currency = req.query.currency;
        if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';

        const accounts = await Account.find(query).sort({ name: 1 });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/accounts', authenticateToken, requirePermission(PERMISSIONS.CAJA_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { name, type, currency, openingBalance, isActive } = req.body;
        if (!name || !currency) {
            return res.status(400).json({ message: 'Nombre y moneda son requeridos' });
        }

        const balance = openingBalance ? Number(openingBalance) : 0;
        if (balance < 0) {
            return res.status(400).json({ message: 'El saldo inicial no puede ser negativo' });
        }

        const newAccount = new Account({
            name,
            type,
            currency,
            balance,
            isActive: isActive !== undefined ? isActive : true
        });

        const savedAccount = await newAccount.save();

        if (balance > 0) {
            const initTx = new Transaction({
                type: 'Ingreso',
                amount: balance,
                currency,
                description: `Saldo inicial de caja - ${name}`,
                concept: 'Saldo inicial',
                category: 'Saldo inicial',
                date: new Date(),
                accountId: savedAccount._id,
                module: 'crm_v2',
                source: 'manual',
                status: 'activo'
            });
            await initTx.save();
        }

        res.status(201).json(savedAccount);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.patch('/api/admin/accounts/:id', authenticateToken, requirePermission(PERMISSIONS.CAJA_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { name, type, currency, isActive } = req.body;
        const account = await Account.findById(req.params.id);
        if (!account) return res.status(404).json({ message: 'Cuenta no encontrada' });

        if (currency && currency !== account.currency) {
            const txCount = await Transaction.countDocuments({ accountId: account._id, status: 'activo' });
            if (txCount > 0) {
                return res.status(400).json({ message: 'No se puede cambiar la moneda de una cuenta con movimientos.' });
            }
            account.currency = currency;
        }

        if (name) account.name = name;
        if (type) account.type = type;
        if (isActive !== undefined) account.isActive = isActive;

        const updatedAccount = await account.save();
        res.json(updatedAccount);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/admin/accounts/:id', authenticateToken, requirePermission(PERMISSIONS.CAJA_WRITE), async (req, res) => {
    try {
        await connectDB();
        const account = await Account.findById(req.params.id);
        if (!account) return res.status(404).json({ message: 'Cuenta no encontrada' });

        account.isActive = false;
        await account.save();
        res.json({ message: 'Cuenta desactivada correctamente.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/accounts/recalculate', authenticateToken, requirePermission(PERMISSIONS.CAJA_WRITE), async (req, res) => {
    try {
        await connectDB();
        const accounts = await Account.find();
        let recalculatedCount = 0;

        for (const account of accounts) {
            const transactions = await Transaction.find({ accountId: account._id, status: 'activo' });
            let realBalance = 0;
            transactions.forEach(tx => {
                if (tx.type === 'Ingreso') realBalance += tx.amount;
                if (tx.type === 'Egreso') realBalance -= tx.amount;
            });

            if (account.balance !== realBalance) {
                account.balance = realBalance;
                await account.save();
                recalculatedCount++;
            }
        }

        res.json({ message: `Saldos recalculados exitosamente. Cuentas actualizadas: ${recalculatedCount}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Legacy Accounts Routes (Maintains backwards compatibility)
app.get('/api/accounts', authenticateToken, requirePermission(PERMISSIONS.CAJA_READ), async (req, res) => {
    try {
        await connectDB();
        const accounts = await Account.find().sort({ name: 1 });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/accounts', authenticateToken, requirePermission(PERMISSIONS.CAJA_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { name, type, currency, openingBalance } = req.body;
        if (!name || !currency) {
            return res.status(400).json({ message: 'Nombre y moneda son requeridos' });
        }

        const balance = openingBalance ? Number(openingBalance) : 0;
        if (balance < 0) {
            return res.status(400).json({ message: 'El saldo inicial no puede ser negativo' });
        }

        const newAccount = new Account({
            name,
            type,
            currency,
            balance
        });

        const savedAccount = await newAccount.save();

        if (balance > 0) {
            const initTx = new Transaction({
                type: 'Ingreso',
                amount: balance,
                currency,
                description: `Saldo inicial de caja - ${name}`,
                concept: 'Saldo inicial',
                category: 'Saldo inicial',
                date: new Date(),
                accountId: savedAccount._id,
                module: 'crm_v2',
                source: 'manual',
                status: 'activo'
            });
            await initTx.save();
        }

        res.status(201).json(savedAccount);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/accounts/:id', authenticateToken, requirePermission(PERMISSIONS.CAJA_WRITE), async (req, res) => {
    try {
        await connectDB();
        const account = await Account.findById(req.params.id);
        if (!account) return res.status(404).json({ message: 'Cuenta no encontrada' });
        account.isActive = false;
        await account.save();
        res.json({ message: 'Cuenta desactivada correctamente.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// --- FINANCE TRANSACTIONS ROUTES (LEGACY) ---
app.get('/api/transactions', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('accountId')
            .populate('carId')
            .sort({ date: -1, createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/transactions', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const { type, amount, currency, description, category, date, accountId, carId, notes } = req.body;
        if (!type || !amount || !currency || !description || !category || !accountId) {
            return res.status(400).json({ message: 'Campos requeridos faltantes' });
        }

        const account = await Account.findById(accountId);
        if (!account) {
            return res.status(404).json({ message: 'Cuenta no encontrada' });
        }

        if (account.currency !== currency) {
            return res.status(400).json({ message: 'La moneda del movimiento no coincide con la de la cuenta' });
        }

        const txAmount = Number(amount);
        const newTx = new Transaction({
            type,
            amount: txAmount,
            currency,
            description,
            category,
            date: date ? new Date(date) : new Date(),
            accountId,
            carId: carId ? carId : undefined,
            notes
        });

        const savedTx = await newTx.save();

        const balanceChange = type === 'Ingreso' ? txAmount : -txAmount;
        account.balance += balanceChange;
        await account.save();

        const populatedTx = await Transaction.findById(savedTx._id)
            .populate('accountId')
            .populate('carId');

        res.status(201).json(populatedTx);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/transactions/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const tx = await Transaction.findById(req.params.id);
        if (!tx) return res.status(404).json({ message: 'Transacci├│n no encontrada' });

        const account = await Account.findById(tx.accountId);
        if (account) {
            const revertChange = tx.type === 'Ingreso' ? -tx.amount : tx.amount;
            account.balance += revertChange;
            await account.save();
        }

        tx.status = 'anulado';
        await tx.save();
        res.json({ message: 'Transacción anulada y balance de caja revertido' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- RESERVATIONS ROUTES ---

// GET all reservations
app.get('/api/admin/reservations', authenticateToken, requirePermission(PERMISSIONS.RESERVAS_READ), async (req, res) => {
    try {
        await connectDB();
        const { vehicleId, leadId, clientId, status } = req.query;
        let query = {};

        if (vehicleId) query.vehicleId = vehicleId;
        if (leadId) query.leadId = leadId;
        if (clientId) query.clientId = clientId;
        if (status) query.status = status;

        const reservations = await Reservation.find(query)
            .populate({
                path: 'clientId',
                select: 'firstName lastName fullName phone email'
            })
            .populate({
                path: 'leadId',
                select: 'name phone sourceDetail crmStatus'
            })
            .populate({
                path: 'vehicleId',
                select: 'brand name year plateOrVin price currency status purchasePrice purchaseCurrency'
            })
            .sort({ createdAt: -1 })
            .select('-reservationAuditLog')
            .lean();

        res.json(reservations);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET reservation by id
app.get('/api/admin/reservations/:id', authenticateToken, requirePermission(PERMISSIONS.RESERVAS_READ), async (req, res) => {
    try {
        await connectDB();
        const reservation = await Reservation.findById(req.params.id)
            .populate('clientId')
            .populate('leadId')
            .populate('vehicleId');

        if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

        res.json(reservation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST create reservation
app.post('/api/admin/reservations', authenticateToken, requirePermission(PERMISSIONS.RESERVAS_WRITE), async (req, res) => {
    try {
        const { vehicleId, clientId, leadId, agreedPrice, agreedCurrency, depositAmount, depositCurrency, depositMethod, expiresAt, conditions, notes, salesperson } = req.body;

        // Basic integrity checks
        if (!vehicleId) return res.status(400).json({ message: 'Vehicle ID is required' });
        if (agreedPrice < 0) return res.status(400).json({ message: 'Agreed price cannot be negative' });
        if (depositAmount < 0) return res.status(400).json({ message: 'Deposit amount cannot be negative' });
        if (!['ARS', 'USD'].includes(agreedCurrency) || !['ARS', 'USD'].includes(depositCurrency)) {
            return res.status(400).json({ message: 'Invalid currency' });
        }

        if (expiresAt && new Date(expiresAt) < new Date(new Date().setHours(0,0,0,0))) {
            return res.status(400).json({ message: 'Expiration date cannot be in the past' });
        }

        const user = req.user?.username || 'Admin';

        // Check vehicle availability
        const vehicle = await Car.findById(vehicleId);
        if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

        if (vehicle.status === 'Vendido' || vehicle.status === 'Reservado') {
            return res.status(400).json({ message: 'Vehicle is already sold or reserved' });
        }

        // Check if there is already an active reservation for this vehicle
        const activeRes = await Reservation.findOne({ vehicleId, status: 'activa' });
        if (activeRes) {
            return res.status(400).json({ message: 'There is already an active reservation for this vehicle' });
        }

        const newReservation = new Reservation({
            vehicleId,
            clientId: clientId || undefined,
            leadId: leadId || undefined,
            agreedPrice,
            agreedCurrency,
            depositAmount,
            depositCurrency,
            depositMethod,
            expiresAt,
            conditions,
            notes,
            salesperson,
            createdBy: user,
            reservationAuditLog: [{
                action: 'RESERVA_CREADA',
                field: 'status',
                newValue: 'activa',
                details: `Reserva creada por ${depositCurrency} ${depositAmount}`,
                user: user,
                source: 'CRM_V2'
            }]
        });

        const savedReservation = await newReservation.save();

        // Update Vehicle Status
        vehicle.status = 'Reservado';
        vehicle.auditLog.push({
            action: 'ESTADO',
            field: 'status',
            oldValue: 'Disponible',
            newValue: 'Reservado',
            details: `Veh├¡culo reservado (Reserva ID: ${savedReservation._id})`,
            user: user,
            source: 'CRM_V2'
        });
        await vehicle.save();

        // Update Lead Status if leadId is provided
        if (leadId) {
            const lead = await Lead.findById(leadId);
            if (lead) {
                const oldStatus = lead.crmStatus;
                lead.crmStatus = 'reservado';
                lead.lastActivityAt = new Date();
                lead.leadAuditLog.push({
                    action: 'RESERVA_CREADA',
                    field: 'crmStatus',
                    oldValue: oldStatus,
                    newValue: 'reservado',
                    details: `Se├▒al de reserva recibida por el veh├¡culo asociado`,
                    user: user,
                    source: 'CRM_V2'
                });
                await lead.save();
            }
        }

        res.status(201).json(savedReservation);
    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(400).json({ message: error.message });
    }
});

// PATCH update reservation
app.patch('/api/admin/reservations/:id', authenticateToken, requirePermission(PERMISSIONS.RESERVAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { status, conditions, notes } = req.body;

        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

        const user = req.user?.username || 'Admin';
        const oldStatus = reservation.status;

        let hasChanges = false;

        if (req.body.assignedTo !== undefined) {
            let oldAssigned = reservation.assignedTo ? reservation.assignedTo.toString() : null;
            let newAssigned = req.body.assignedTo === "" ? null : req.body.assignedTo;
            if (oldAssigned !== newAssigned) {
                reservation.assignedTo = newAssigned;
                reservation.assignedAt = new Date();
                hasChanges = true;

                await logAudit({
                    req,
                    action: newAssigned ? 'RESPONSABLE_ASIGNADO' : 'RESPONSABLE_REMOVIDO',
                    module: 'reservas',
                    entityType: 'Reservation',
                    entityId: reservation._id,
                    entityLabel: 'Reserva',
                    description: `Se reasign├│ la reserva.`,
                    metadata: { oldAssigned, newAssigned }
                });
            }
        }

        if (conditions !== undefined && conditions !== reservation.conditions) {
            reservation.conditions = conditions;
            hasChanges = true;
        }

        if (notes !== undefined && notes !== reservation.notes) {
            reservation.notes = notes;
            hasChanges = true;
        }

        if (status !== undefined && status !== oldStatus) {
            if (!['activa', 'convertida', 'vencida', 'cancelada', 'devuelta', 'retenida'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }

            reservation.status = status;
            hasChanges = true;

            reservation.reservationAuditLog.push({
                action: 'CAMBIO_ESTADO',
                field: 'status',
                oldValue: oldStatus,
                newValue: status,
                details: `Estado de reserva actualizado a ${status}`,
                user: user,
                source: 'CRM_V2'
            });

            // If reservation is no longer active (cancelled, expired, returned, retained)
            // we should release the vehicle IF it's still 'Reservado' and there isn't another active reservation
            if (['vencida', 'cancelada', 'devuelta', 'retenida'].includes(status)) {
                const vehicle = await Car.findById(reservation.vehicleId);
                if (vehicle && vehicle.status === 'Reservado') {
                    // Double check if there's any OTHER active reservation for this vehicle (unlikely due to integrity rules, but safe to check)
                    const otherActive = await Reservation.findOne({ vehicleId: vehicle._id, status: 'activa', _id: { $ne: reservation._id } });
                    if (!otherActive) {
                        vehicle.status = 'Disponible';
                        vehicle.auditLog.push({
                            action: 'ESTADO',
                            field: 'status',
                            oldValue: 'Reservado',
                            newValue: 'Disponible',
                            details: `Veh├¡culo liberado por reserva ${status} (ID: ${reservation._id})`,
                            user: user,
                            source: 'CRM_V2'
                        });
                        await vehicle.save();
                    }
                }
            }
        }

        if (hasChanges) {
            reservation.updatedBy = user;
            const updatedReservation = await reservation.save();
            res.json(updatedReservation);
        } else {
            res.json(reservation);
        }
    } catch (error) {
        console.error('Error updating reservation:', error);
        res.status(400).json({ message: error.message });
    }
});

// DELETE reservation
app.delete('/api/admin/reservations/:id', authenticateToken, requirePermission(PERMISSIONS.RESERVAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ error: 'Reserva no encontrada.' });
        }

        if (reservation.status !== 'cancelada' && reservation.status !== 'convertida') {
            return res.status(400).json({ error: 'Solo se pueden eliminar reservas canceladas o convertidas.' });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);
        await TrashRecord.create({
            entityType: 'Reservation',
            entityId: reservation._id,
            snapshot: reservation.toObject(),
            deletedBy: req.user?.userId || req.user?.id || req.user?.username || 'System',
            expiresAt
        });

        await Reservation.findByIdAndDelete(req.params.id);
        res.json({ message: 'Reserva eliminada exitosamente.' });
    } catch (error) {
        console.error('Error deleting reservation:', error);
        res.status(500).json({ error: 'Error interno al eliminar la reserva.' });
    }
});

// PATCH link client to reservation
app.patch('/api/admin/reservations/:id/link-client', authenticateToken, requirePermission(PERMISSIONS.RESERVAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { clientId } = req.body;
        if (!clientId) return res.status(400).json({ error: 'Falta clientId' });

        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

        const client = await Client.findById(clientId);
        if (!client) return res.status(404).json({ error: 'Client not found' });

        const user = req.user?.username || 'Admin';
        const oldClient = reservation.clientId ? reservation.clientId.toString() : null;

        reservation.clientId = client._id;
        reservation.updatedBy = user;

        reservation.reservationAuditLog.push({
            action: 'CLIENTE_VINCULADO',
            field: 'clientId',
            oldValue: oldClient,
            newValue: client._id.toString(),
            details: `Cliente vinculado a la reserva: ${client.fullName || client.firstName}`,
            user: user,
            source: 'CRM_V2'
        });

        await logAudit({
            req,
            action: 'RESERVA_CLIENTE_VINCULADO',
            module: 'reservas',
            entityType: 'Reservation',
            entityId: reservation._id,
            entityLabel: 'Reserva',
            description: `Se vincul├│ el cliente ${client.fullName || client.firstName} a la reserva.`,
            metadata: { clientId: client._id, oldClient }
        });

        await reservation.save();

        const populatedReservation = await Reservation.findById(reservation._id)
            .populate('clientId', 'firstName lastName fullName phone email')
            .populate('vehicleId', 'brand name year plateOrVin price currency status')
            .lean();

        res.json(populatedReservation);
    } catch (error) {
        console.error('Error linking client to reservation:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- MANDATES ROUTES ---

// GET mandates
app.get('/api/admin/mandates', authenticateToken, requireAnyPermission([PERMISSIONS.STOCK_READ]), async (req, res) => {
    try {
        await connectDB();
        const mandates = await Mandate.find()
            .populate('linkedCarId', 'brand name year price currency status plateOrVin')
            .sort({ createdAt: -1 })
            .lean();
        res.json(mandates);
    } catch (error) {
        console.error('Error fetching mandates:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST mandate
app.post('/api/admin/mandates', authenticateToken, requireAnyPermission([PERMISSIONS.STOCK_WRITE]), async (req, res) => {
    let newMandate = null;
    try {
        await connectDB();
        const { createCar, ...mandateData } = req.body;

        mandateData.createdBy = req.user?.id || req.user?.userId;
        mandateData.createdByUsername = req.user?.username || req.user?.name || 'Admin';

        newMandate = new Mandate(mandateData);
        await newMandate.save();

        if (createCar) {
            try {
                const carData = {
                    brand: newMandate.brand,
                    name: newMandate.model,
                    year: newMandate.year,
                    km: newMandate.mileage || 0,
                    fuel: 'Nafta', // Valor por defecto ya que no se pide en mandato modal
                    condition: 'Usado',
                    price: newMandate.value || 0,
                    currency: newMandate.currency || 'USD',
                    plateOrVin: newMandate.plate,
                    color: newMandate.color,
                    engineNumber: newMandate.engineNumber,
                    chassisNumber: newMandate.chassisNumber,
                    agencyOwned: false,
                    consignedBy: newMandate.clientName,
                    ownerName: newMandate.clientName,
                    ownerPhone: newMandate.phone,
                    ownerEmail: newMandate.email,
                    status: 'Disponible' // Como se requirió
                };

                const car = new Car(carData);
                await car.save();

                newMandate.linkedCarId = car._id;
                await newMandate.save();
            } catch (carError) {
                console.error('Error creating linked Car, rolling back Mandate:', carError);
                await Mandate.findByIdAndDelete(newMandate._id);
                return res.status(500).json({ error: 'Error al crear vehículo vinculado. Mandato revertido.' });
            }
        }

        res.status(201).json(newMandate);
    } catch (error) {
        console.error('Error creating mandate:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH mandate
app.patch('/api/admin/mandates/:id', authenticateToken, requireAnyPermission([PERMISSIONS.STOCK_WRITE]), async (req, res) => {
    try {
        await connectDB();
        const mandate = await Mandate.findById(req.params.id);
        if (!mandate) return res.status(404).json({ error: 'Mandato no encontrado' });

        Object.assign(mandate, req.body);
        await mandate.save();

        res.json(mandate);
    } catch (error) {
        console.error('Error updating mandate:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE mandate (Soft delete)
app.delete('/api/admin/mandates/:id', authenticateToken, requireAnyPermission([PERMISSIONS.STOCK_WRITE]), async (req, res) => {
    try {
        await connectDB();
        const mandate = await Mandate.findById(req.params.id);
        if (!mandate) return res.status(404).json({ error: 'Mandato no encontrado' });

        mandate.status = 'borrado';
        await mandate.save();

        res.json({ message: 'Mandato eliminado (soft delete)' });
    } catch (error) {
        console.error('Error deleting mandate:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- OPPORTUNITIES ROUTES ---

// GET opportunities
app.get('/api/admin/opportunities', authenticateToken, requireAnyPermission([PERMISSIONS.STOCK_READ]), async (req, res) => {
    try {
        await connectDB();
        const opportunities = await Opportunity.find()
            .sort({ createdAt: -1 })
            .lean();
        res.json(opportunities);
    } catch (error) {
        console.error('Error fetching opportunities:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST opportunity
app.post('/api/admin/opportunities', authenticateToken, requireAnyPermission([PERMISSIONS.STOCK_WRITE]), async (req, res) => {
    try {
        await connectDB();
        const data = req.body;

        // Asignar creador usando el patron existente
        data.createdBy = req.user?.id || req.user?.userId;
        data.createdByUsername = req.user?.username || req.user?.name || 'Admin';

        const opportunity = new Opportunity(data);
        await opportunity.save();
        res.status(201).json(opportunity);
    } catch (error) {
        console.error('Error creating opportunity:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH opportunity
app.patch('/api/admin/opportunities/:id', authenticateToken, requireAnyPermission([PERMISSIONS.STOCK_WRITE]), async (req, res) => {
    try {
        await connectDB();
        const opportunity = await Opportunity.findById(req.params.id);
        if (!opportunity) return res.status(404).json({ error: 'Oportunidad no encontrada' });

        Object.assign(opportunity, req.body);
        await opportunity.save();

        res.json(opportunity);
    } catch (error) {
        console.error('Error updating opportunity:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE opportunity (Soft delete)
app.delete('/api/admin/opportunities/:id', authenticateToken, requireAnyPermission([PERMISSIONS.STOCK_WRITE]), async (req, res) => {
    try {
        await connectDB();
        const opportunity = await Opportunity.findById(req.params.id);
        if (!opportunity) return res.status(404).json({ error: 'Oportunidad no encontrada' });

        opportunity.status = 'borrada';
        await opportunity.save();

        res.json({ message: 'Oportunidad eliminada (soft delete)' });
    } catch (error) {
        console.error('Error deleting opportunity:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- SALES ROUTES ---

// GET all sales
app.get('/api/admin/sales', authenticateToken, requirePermission(PERMISSIONS.VENTAS_READ), async (req, res) => {
    try {
        await connectDB();
        const { vehicleId, clientId, leadId, status } = req.query;
        let query = {};

        if (vehicleId) query.vehicleId = vehicleId;
        if (clientId) query.clientId = clientId;
        if (leadId) query.leadId = leadId;
        if (status) query.status = status;

        const sales = await Sale.find(query)
            .populate({
                path: 'clientId',
                select: 'firstName lastName fullName phone email'
            })
            .populate({
                path: 'leadId',
                select: 'name phone sourceDetail crmStatus'
            })
            .populate({
                path: 'vehicleId',
                select: 'brand name year plateOrVin price currency status purchasePrice purchaseCurrency'
            })
            .populate({
                path: 'reservationId',
                select: 'status depositAmount depositCurrency expiresAt'
            })
            .sort({ saleDate: -1, createdAt: -1 })
            .select('-saleAuditLog -postSaleChecklist -documentationChecklist -deliveryChecklist')
            .lean();

        // Calculate collection status for each sale
        const saleIds = sales.map(s => s._id);
        const transactions = await Transaction.find({
            saleId: { $in: saleIds },
            status: 'activo',
            module: 'crm_v2'
        });

        // Optimizaci├│n O(N) para agrupar transacciones por saleId
        const txsBySale = {};
        transactions.forEach(tx => {
            const sid = String(tx.saleId);
            if (!txsBySale[sid]) txsBySale[sid] = [];
            txsBySale[sid].push(tx);
        });

        const salesWithFinance = sales.map(sale => {
            const saleTxs = txsBySale[String(sale._id)] || [];
            let netoCobrado = 0;

            // Also consider the applied deposit from the reservation if the currency matches the sale currency
            // Assuming depositAppliedAmount is stored in the Sale model
            let depositApplied = 0;
            if (sale.depositAppliedCurrency === sale.saleCurrency && sale.depositAppliedAmount) {
                depositApplied = sale.depositAppliedAmount;
                netoCobrado += depositApplied;
            }

            saleTxs.forEach(tx => {
                if (tx.currency === sale.saleCurrency) {
                    if (tx.type === 'Ingreso') netoCobrado += tx.amount;
                    else if (tx.type === 'Egreso') netoCobrado -= tx.amount;
                }
            });

            const tradeInValue = sale.tradeInTotalAmount || 0;
            const totalToCollect = Math.max(0, sale.salePrice - tradeInValue);
            const pendingBalance = totalToCollect - netoCobrado;

            let collectionStatus = 'sin_cobro';
            if (netoCobrado >= totalToCollect) {
                collectionStatus = netoCobrado > totalToCollect && totalToCollect > 0 ? 'sobrecobrada' : 'cobrada';
            } else if (netoCobrado > 0) {
                collectionStatus = 'parcial';
            }

            if (totalToCollect === 0 && netoCobrado === 0) {
                collectionStatus = 'cobrada';
            }

            sale.finance = {
                netoCobrado,
                pendingBalance,
                collectionStatus,
                depositApplied
            };
            return sale;
        });

        res.json(salesWithFinance);
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET sale by id
app.get('/api/admin/sales/:id', authenticateToken, requirePermission(PERMISSIONS.VENTAS_READ), async (req, res) => {
    try {
        await connectDB();
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Sale ID inv├ílido' });
        }
        const sale = await Sale.findById(req.params.id)
            .populate('clientId')
            .populate('leadId')
            .populate('vehicleId')
            .populate('reservationId');

        if (!sale) return res.status(404).json({ message: 'Sale not found' });

        const transactions = await Transaction.find({
            saleId: sale._id,
            status: 'activo',
            module: 'crm_v2'
        });

        let netoCobrado = 0;
        let depositApplied = 0;
        if (sale.depositAppliedCurrency === sale.saleCurrency && sale.depositAppliedAmount) {
            depositApplied = sale.depositAppliedAmount;
            netoCobrado += depositApplied;
        }

        transactions.forEach(tx => {
            if (tx.currency === sale.saleCurrency) {
                if (tx.type === 'Ingreso') netoCobrado += tx.amount;
                else if (tx.type === 'Egreso') netoCobrado -= tx.amount;
            }
        });

        const tradeInValue = sale.tradeInTotalAmount || 0;
        const totalToCollect = Math.max(0, sale.salePrice - tradeInValue);
        const pendingBalance = totalToCollect - netoCobrado;

        let collectionStatus = 'sin_cobro';
        if (netoCobrado >= totalToCollect) {
            collectionStatus = netoCobrado > totalToCollect && totalToCollect > 0 ? 'sobrecobrada' : 'cobrada';
        } else if (netoCobrado > 0) {
            collectionStatus = 'parcial';
        }

        if (totalToCollect === 0 && netoCobrado === 0) {
            collectionStatus = 'cobrada';
        }

        const saleObj = sale.toObject();
        saleObj.finance = {
            netoCobrado,
            pendingBalance,
            collectionStatus,
            depositApplied
        };

        res.json(saleObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST create manual sale
app.post('/api/admin/sales', authenticateToken, requirePermission(PERMISSIONS.VENTAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const {
            vehicleId, clientId, leadId, salePrice, saleCurrency, paymentMethod, notes, salesperson, saleDate, status,
            isManualImport, vehicleOwnerName, vehicleOwnerPhone,
            consignationOwnerId, consignationManagerId,
            commissionSettings, deliveryItems, installmentsCount, depositAppliedAmount, depositAppliedCurrency
        } = req.body;
        const finalSalePrice = Number(salePrice);
        const finalSaleCurrency = saleCurrency;
        const user = req.user?.username || 'Admin';

        // 1. Validaciones previas
        if (!isManualImport && !vehicleId) throw new Error('Vehicle ID is required for standard sales');
        if (!Number.isFinite(finalSalePrice) || finalSalePrice < 0) throw new Error('Sale price cannot be negative');
        if (!['ARS', 'USD'].includes(finalSaleCurrency)) throw new Error('Invalid sale currency');

        let vehicle = null;
        if (vehicleId) {
            vehicle = await Car.findById(vehicleId);
            if (!vehicle) throw new Error('Vehicle not found');
            if (vehicle.status !== 'Disponible') throw new Error(`Vehicle is ${vehicle.status}, only Disponible vehicles can be manually sold`);

            const existingSale = await Sale.findOne({ vehicleId, status: { $ne: 'cancelada' } });
            if (existingSale) throw new Error('There is already an active sale for this vehicle');
        }

        // 2. Creaci├│n
        const newSale = new Sale({
            vehicleId: vehicleId || undefined,
            clientId: clientId || undefined,
            leadId: leadId || undefined,
            salePrice: finalSalePrice,
            saleCurrency: finalSaleCurrency,
            paymentMethod: paymentMethod || 'contado',
            notes,
            salesperson,
            saleDate: saleDate || new Date(),
            status: status || 'confirmada',
            createdBy: user,

            // Nuevos campos
            isManualImport: !!isManualImport,
            vehicleOwnerName,
            vehicleOwnerPhone,
            consignationOwnerId: consignationOwnerId || undefined,
            consignationManagerId: consignationManagerId || undefined,
            commissionSettings,
            deliveryItems,
            installmentsCount: installmentsCount || 0,
            depositAppliedAmount: depositAppliedAmount || 0,
            depositAppliedCurrency,

            saleAuditLog: [{
                action: 'VENTA_CREADA_MANUAL',
                details: isManualImport ? 'Venta hist├│rica (manual import) registrada' : 'Venta creada manualmente sin reserva previa',
                user: user,
                source: 'CRM_V2'
            }]
        });

        const savedSale = await newSale.save();

        await logAudit({
            req,
            action: 'VENTA_CREADA',
            module: 'ventas',
            entityType: 'Sale',
            entityId: savedSale._id,
            entityLabel: vehicle ? `Venta de ${vehicle.brand} ${vehicle.name}` : `Venta hist├│rica manual`,
            description: `Se cre├│ una venta manual por ${finalSaleCurrency} ${finalSalePrice}.`,
            metadata: { vehicleId: vehicle?._id, salePrice: finalSalePrice, currency: finalSaleCurrency, isManualImport }
        });

        // 3. Rollback Manual Controlado (solo si hay veh├¡culo)
        try {
            if (vehicle) {
                const targetCarStatus = status === 'señado' ? 'Reservado' : 'Vendido';
                vehicle.status = targetCarStatus;
                vehicle.auditLog.push({
                    action: 'ESTADO',
                    field: 'status',
                    oldValue: 'Disponible',
                    newValue: targetCarStatus,
                    details: `Veh├¡culo vendido (Venta ID: ${savedSale._id})`,
                    user: user,
                    source: 'CRM_V2'
                });
                await vehicle.save();
            }

            if (leadId) {
                const lead = await Lead.findById(leadId);
                if (lead && lead.crmStatus !== 'convertido') {
                    const oldStatus = lead.crmStatus;
                    lead.crmStatus = 'convertido';
                    lead.lastActivityAt = new Date();
                    lead.leadAuditLog.push({
                        action: 'VENTA_CREADA',
                        field: 'crmStatus',
                        oldValue: oldStatus,
                        newValue: 'convertido',
                        details: 'Venta cerrada manualmente',
                        user: user,
                        source: 'CRM_V2'
                    });
                    await lead.save();
                }
            }

            res.status(201).json(savedSale);
        } catch (innerError) {
            console.error('Inner error during manual sale, performing manual rollback', innerError);
            await Sale.findByIdAndDelete(savedSale._id);

            if (vehicle && vehicle.status === 'Vendido') {
                vehicle.status = 'Disponible';
                vehicle.auditLog.pop();
                await vehicle.save();
            }

            throw new Error(`Transaction failed, manual rollback executed: ${innerError.message}`);
        }

    } catch (error) {
        console.error('Error creating manual sale:', error);
        res.status(400).json({ message: error.message });
    }
});

// Helper function to normalize trade-in data safely
const normalizeTradeInVehicle = (tradeIn) => {
    if (!tradeIn) return null;
    const safeNum = (val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
    };
    const safeRequiredNum = (val) => {
        if (val === '' || val === null || val === undefined) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    };

    return {
        brand: tradeIn.brand || 'S/D',
        model: tradeIn.model || 'S/D',
        version: tradeIn.version || '',
        year: safeNum(tradeIn.year),
        plate: tradeIn.plate || '',
        mileage: safeNum(tradeIn.mileage),
        estimatedValue: safeRequiredNum(tradeIn.estimatedValue),
        currency: tradeIn.currency || 'ARS',
        conditionNotes: tradeIn.conditionNotes || '',
        mechanicalNotes: tradeIn.mechanicalNotes || '',
        documentationStatus: tradeIn.documentationStatus || 'pendiente',
        hasDebt: Boolean(tradeIn.hasDebt),
        debtAmount: safeNum(tradeIn.debtAmount) || 0,
        hasLien: Boolean(tradeIn.hasLien),
        transferStatus: tradeIn.transferStatus || 'pendiente',
        shouldEnterStock: Boolean(tradeIn.shouldEnterStock)
    };
};

// POST convert reservation to sale
app.post('/api/admin/reservations/:id/convert-to-sale', authenticateToken, requirePermission(PERMISSIONS.VENTAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const reservationId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(reservationId)) {
            return res.status(400).json({ error: "ID de reserva inv├ílido." });
        }

        const { salePrice, saleCurrency, paymentMethod, saleDate, salesperson, tradeIns, tradeInTotalAmount, balanceAfterTradeIn } = req.body;
        const user = req.user?.username || 'Admin';

        // 1. Validaciones
        const reservation = await Reservation.findById(reservationId);
        if (!reservation) throw new Error('Reservation not found');
        if (reservation.status !== 'activa') throw new Error(`Cannot convert reservation with status ${reservation.status}`);

        const vehicleId = reservation.vehicleId;
        const vehicle = await Car.findById(vehicleId);
        if (!vehicle) throw new Error('Vehicle not found');
        if (vehicle.status !== 'Reservado') throw new Error(`Vehicle is not Reservado (current: ${vehicle.status})`);

        if (!reservation.clientId) {
            return res.status(400).json({ error: "La reserva debe tener un cliente vinculado antes de convertirla en venta." });
        }
        if (!reservation.vehicleId) {
            return res.status(400).json({ error: "La reserva debe tener un veh├¡culo vinculado antes de convertirla en venta." });
        }

        const existingSale = await Sale.findOne({ vehicleId, status: { $ne: 'cancelada' } }).populate('clientId', 'firstName fullName');
        if (existingSale) {
            return res.status(409).json({
                error: 'Este veh├¡culo ya tiene una venta activa asociada.',
                activeSaleId: existingSale._id,
                activeSaleStatus: existingSale.status,
                activeSaleClientName: existingSale.clientId ? (existingSale.clientId.fullName || existingSale.clientId.firstName) : 'Sin Nombre',
                canResolve: true
            });
        }

        const finalSalePrice = salePrice !== undefined ? salePrice : reservation.agreedPrice;
        const finalSaleCurrency = saleCurrency !== undefined ? saleCurrency : reservation.agreedCurrency;

        if (finalSalePrice < 0) throw new Error('Sale price cannot be negative');
        if (!['ARS', 'USD'].includes(finalSaleCurrency)) throw new Error('Invalid sale currency');

        // 2. Creaci├│n de Sale
        const newSale = new Sale({
            reservationId: reservation._id,
            vehicleId: vehicle._id,
            clientId: reservation.clientId, // Ahora es obligatorio
            leadId: reservation.leadId || undefined,
            salePrice: finalSalePrice,
            saleCurrency: finalSaleCurrency,
            depositAppliedAmount: reservation.depositAmount,
            depositAppliedCurrency: reservation.depositCurrency,
            paymentMethod: paymentMethod || 'contado',
            salesperson: salesperson || reservation.salesperson,
            saleDate: saleDate || new Date(),
            status: 'confirmada',
            tradeIns: Array.isArray(tradeIns) ? tradeIns.map(normalizeTradeInVehicle).filter(Boolean) : [],
            tradeInTotalAmount: tradeInTotalAmount || 0,
            balanceAfterTradeIn: balanceAfterTradeIn !== undefined ? balanceAfterTradeIn : (finalSalePrice - (reservation.depositAmount || 0) - (tradeInTotalAmount || 0)),
            createdBy: user,
            saleAuditLog: [{
                action: 'VENTA_CREADA_POR_CONVERSION',
                details: `Venta generada a partir de reserva ${reservation._id}`,
                user: user,
                source: 'CRM_V2'
            }]
        });

        const savedSale = await newSale.save();

        await logAudit({
            req,
            action: 'RESERVA_CONVERTIDA_A_VENTA',
            module: 'reservas',
            entityType: 'Sale',
            entityId: savedSale._id,
            entityLabel: `Conversi├│n Reserva a Venta ${vehicle.brand} ${vehicle.name}`,
            description: `Se convirti├│ la reserva ${reservation._id} a venta final por ${finalSaleCurrency} ${finalSalePrice}.`,
            metadata: { reservationId: reservation._id, vehicleId: vehicle._id }
        });

        // 3. Rollback track manual (por si MongoDB no soporta transacciones nativas replica set)
        try {
            // Update Reservation
            const oldResStatus = reservation.status;
            reservation.status = 'convertida';
            reservation.updatedBy = user;
            reservation.reservationAuditLog.push({
                action: 'RESERVA_CONVERTIDA_A_VENTA',
                field: 'status',
                oldValue: oldResStatus,
                newValue: 'convertida',
                details: `Reserva convertida a Venta ID: ${savedSale._id}`,
                user: user,
                source: 'CRM_V2'
            });
            await reservation.save();

            // Update Vehicle
            const oldVehStatus = vehicle.status;
            vehicle.status = 'Vendido';
            vehicle.auditLog.push({
                action: 'ESTADO',
                field: 'status',
                oldValue: oldVehStatus,
                newValue: 'Vendido',
                details: `Veh├¡culo vendido por conversi├│n de reserva (Venta ID: ${savedSale._id})`,
                user: user,
                source: 'CRM_V2'
            });
            await vehicle.save();

            // Update Lead
            if (reservation.leadId) {
                const lead = await Lead.findById(reservation.leadId);
                if (lead) {
                    const oldLeadStatus = lead.crmStatus;
                    if (oldLeadStatus !== 'convertido') {
                        lead.crmStatus = 'convertido';
                        lead.lastActivityAt = new Date();
                        lead.leadAuditLog.push({
                            action: 'VENTA_CREADA',
                            field: 'crmStatus',
                            oldValue: oldLeadStatus,
                            newValue: 'convertido',
                            details: `Lead convertido por venta de veh├¡culo`,
                            user: user,
                            source: 'CRM_V2'
                        });
                        await lead.save();
                    }
                }
            }

            // Success
            res.status(201).json(savedSale);

        } catch (innerError) {
            // Rollback manual
            console.error('Inner error during conversion, performing manual rollback', innerError);
            await Sale.findByIdAndDelete(savedSale._id); // Delete the sale

            if (reservation.status === 'convertida') {
                reservation.status = 'activa';
                reservation.reservationAuditLog.pop();
                await reservation.save();
            }

            if (vehicle.status === 'Vendido') {
                vehicle.status = 'Reservado';
                vehicle.auditLog.pop();
                await vehicle.save();
            }

            throw new Error(`Transaction failed, manual rollback executed: ${innerError.message}`);
        }

    } catch (error) {
        console.error("Error converting reservation to sale:", error);
        return res.status(500).json({
            error: "No se pudo convertir la reserva en venta. Reintent├í en unos segundos."
        });
    }
});

// PATCH link client to sale
app.patch('/api/admin/sales/:id/link-client', authenticateToken, requirePermission(PERMISSIONS.VENTAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { clientId } = req.body;
        if (!clientId) return res.status(400).json({ error: 'Falta clientId' });

        const sale = await Sale.findById(req.params.id);
        if (!sale) return res.status(404).json({ error: 'Sale not found' });

        const client = await Client.findById(clientId);
        if (!client) return res.status(404).json({ error: 'Client not found' });

        const user = req.user?.username || 'Admin';
        const oldClient = sale.clientId ? sale.clientId.toString() : null;

        sale.clientId = client._id;
        sale.updatedBy = user;

        if (!sale.saleAuditLog) sale.saleAuditLog = [];
        sale.saleAuditLog.push({
            action: 'CLIENTE_VINCULADO',
            field: 'clientId',
            oldValue: oldClient,
            newValue: client._id.toString(),
            details: `Cliente vinculado a la venta: ${client.fullName || client.firstName}`,
            user: user,
            source: 'CRM_V2'
        });

        await logAudit({
            req,
            action: 'VENTA_CLIENTE_VINCULADO',
            module: 'ventas',
            entityType: 'Sale',
            entityId: sale._id,
            entityLabel: 'Venta',
            description: `Se vincul├│ el cliente ${client.fullName || client.firstName} a la venta.`,
            metadata: { clientId: client._id, oldClient }
        });

        await sale.save();

        const populatedSale = await Sale.findById(sale._id)
            .populate('clientId', 'firstName lastName fullName phone email')
            .lean();

        res.json(populatedSale);
    } catch (error) {
        console.error('Error linking client to sale:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST create and link client to sale
app.post('/api/admin/sales/:id/create-link-client', authenticateToken, requirePermission(PERMISSIONS.VENTAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const saleId = req.params.id;
        const sale = await Sale.findById(saleId);
        if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });

        const user = req.user?.username || 'Admin';

        // Extract data from the sale itself if it exists, or from req.body
        const fullName = req.body.fullName || sale.buyerName || sale.vehicleOwnerName || 'Cliente de Venta Histórica';
        const phone = req.body.phone || sale.buyerPhone || '0000000000';
        const email = req.body.email || sale.buyerEmail || '';
        const dni = req.body.dni || sale.buyerDni || '';

        // Create the new client
                const newClient = new Client({
            firstName: fullName.split(' ')[0],
            lastName: fullName.split(' ').slice(1).join(' '),
            fullName: fullName,
            phone: phone,
            email: email,
            dniCuit: dni,
            source: 'otro',
            type: 'comprador',
            status: 'activo'
        });

        await newClient.save();

        const oldClient = sale.clientId ? sale.clientId.toString() : null;
        sale.clientId = newClient._id;
        sale.updatedBy = user;

        if (!sale.saleAuditLog) sale.saleAuditLog = [];
        sale.saleAuditLog.push({
            action: 'CLIENTE_CREADO_Y_VINCULADO',
            field: 'clientId',
            oldValue: oldClient,
            newValue: newClient._id.toString(),
            details: `Cliente creado manualmente desde la venta y vinculado: ${fullName}`,
            user: user,
            source: 'CRM_V2'
        });

        await sale.save();

        await logAudit({
            req,
            action: 'VENTA_CLIENTE_CREADO_Y_VINCULADO',
            module: 'ventas',
            entityType: 'Sale',
            entityId: sale._id,
            entityLabel: 'Venta',
            description: `Se creó y vinculó el cliente ${fullName} a la venta.`,
            metadata: { clientId: newClient._id }
        });

        res.json({ ok: true, sale, client: newClient });
    } catch (err) {
        console.error("Error creating and linking client:", err);
        res.status(500).json({ error: 'Error interno del servidor al crear y vincular cliente' });
    }
});

app.patch('/api/admin/sales/:id/link-vehicle', authenticateToken, requirePermission(PERMISSIONS.VENTAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { vehicleId } = req.body;
        if (!vehicleId) return res.status(400).json({ error: 'Falta vehicleId' });

        const sale = await Sale.findById(req.params.id);
        if (!sale) return res.status(404).json({ error: 'Sale not found' });

        const vehicle = await Car.findById(vehicleId);
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

        const user = req.user?.username || 'Admin';
        const oldVehicle = sale.vehicleId ? sale.vehicleId.toString() : null;

        sale.vehicleId = vehicle._id;
        sale.updatedBy = user;

        if (!sale.saleAuditLog) sale.saleAuditLog = [];
        sale.saleAuditLog.push({
            action: 'VEHICULO_VINCULADO',
            field: 'vehicleId',
            oldValue: oldVehicle,
            newValue: vehicle._id.toString(),
            details: `Vehículo vinculado a la venta: ${vehicle.brand} ${vehicle.name}`,
            user: user,
            source: 'CRM_V2'
        });

        await logAudit({
            req,
            action: 'VENTA_VEHICULO_VINCULADO',
            module: 'ventas',
            entityType: 'Sale',
            entityId: sale._id,
            entityLabel: 'Venta',
            description: `Se vinculó el vehículo ${vehicle.brand} ${vehicle.name} a la venta.`,
            metadata: { vehicleId: vehicle._id, oldVehicle }
        });

        await sale.save();

        const populatedSale = await Sale.findById(sale._id)
            .populate('vehicleId', 'brand name year plateOrVin price currency status')
            .lean();

        res.json(populatedSale);
    } catch (error) {
        console.error('Error linking vehicle to sale:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/sales/:id/create-link-vehicle', authenticateToken, requirePermission(PERMISSIONS.VENTAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { brand, name, plateOrVin } = req.body;
        if (!brand || !name) return res.status(400).json({ error: 'Marca y modelo son obligatorios' });

        const sale = await Sale.findById(req.params.id);
        if (!sale) return res.status(404).json({ error: 'Sale not found' });

        const user = req.user?.username || 'Admin';

        // Create the ghost vehicle
        const newVehicle = new Car({
            brand,
            name,
            plateOrVin: plateOrVin || '',
            year: new Date().getFullYear(),
            km: 0,
            fuel: 'Nafta',
            condition: 'Usado',
            price: sale.totalAmount || 0,
            currency: sale.currency || 'USD',
            status: 'Vendido',
            notes: `Vehículo creado manualmente desde la venta ${sale._id}`,
            auditLog: [{
                action: 'CREACION_MANUAL_DESDE_VENTA',
                details: `Creado al vuelo desde la venta ${sale._id}`,
                user: user,
                source: 'CRM_V2'
            }]
        });

        await newVehicle.save();

        const oldVehicle = sale.vehicleId ? sale.vehicleId.toString() : null;
        sale.vehicleId = newVehicle._id;
        sale.updatedBy = user;

        if (!sale.saleAuditLog) sale.saleAuditLog = [];
        sale.saleAuditLog.push({
            action: 'VEHICULO_CREADO_Y_VINCULADO',
            field: 'vehicleId',
            oldValue: oldVehicle,
            newValue: newVehicle._id.toString(),
            details: `Vehículo creado manualmente y vinculado: ${newVehicle.brand} ${newVehicle.name}`,
            user: user,
            source: 'CRM_V2'
        });

        await logAudit({
            req,
            action: 'VENTA_VEHICULO_CREADO_VINCULADO',
            module: 'ventas',
            entityType: 'Sale',
            entityId: sale._id,
            entityLabel: 'Venta',
            description: `Se creó y vinculó el vehículo ${newVehicle.brand} ${newVehicle.name} a la venta.`,
            metadata: { vehicleId: newVehicle._id, oldVehicle }
        });

        await sale.save();

        const populatedSale = await Sale.findById(sale._id)
            .populate('vehicleId', 'brand name year plateOrVin price currency status')
            .lean();

        res.json(populatedSale);
    } catch (error) {
        console.error('Error creating/linking vehicle to sale:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST backfill client from reservation
app.post('/api/admin/sales/:id/backfill-client-from-reservation', authenticateToken, requirePermission(PERMISSIONS.VENTAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const sale = await Sale.findById(req.params.id);
        if (!sale) return res.status(404).json({ error: 'Sale not found' });
        if (!sale.reservationId) return res.status(400).json({ error: 'La venta no proviene de una reserva' });

        const reservation = await Reservation.findById(sale.reservationId);
        if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
        if (!reservation.clientId) return res.status(400).json({ error: 'La reserva origen no tiene cliente vinculado' });

        const user = req.user?.username || 'Admin';
        const oldClient = sale.clientId ? sale.clientId.toString() : null;

        sale.clientId = reservation.clientId;
        sale.updatedBy = user;

        if (!sale.saleAuditLog) sale.saleAuditLog = [];
        sale.saleAuditLog.push({
            action: 'BACKFILL_CLIENTE_RESERVA',
            field: 'clientId',
            oldValue: oldClient,
            newValue: reservation.clientId.toString(),
            details: `Cliente copiado autom├íticamente desde la reserva de origen`,
            user: user,
            source: 'CRM_V2'
        });

        await logAudit({
            req,
            action: 'VENTA_BACKFILL_CLIENTE',
            module: 'ventas',
            entityType: 'Sale',
            entityId: sale._id,
            entityLabel: 'Venta',
            description: `Se copi├│ el cliente de la reserva ${reservation._id} a la venta.`,
            metadata: { clientId: reservation.clientId, reservationId: reservation._id }
        });

        await sale.save();

        const populatedSale = await Sale.findById(sale._id)
            .populate('clientId', 'firstName lastName fullName phone email')
            .lean();

        res.json(populatedSale);
    } catch (error) {
        console.error('Error backfilling client from reservation:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE sale
app.delete('/api/admin/sales/:id', authenticateToken, requirePermission(PERMISSIONS.VENTAS_CANCEL), async (req, res) => {
    try {
        await connectDB();
        const sale = await Sale.findById(req.params.id);

        if (!sale) {
            return res.status(404).json({ error: 'Venta no encontrada.' });
        }

        if (sale.status !== 'cancelada') {
            return res.status(400).json({ error: 'Solo se pueden eliminar ventas canceladas.' });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);
        await TrashRecord.create({
            entityType: 'Sale',
            entityId: sale._id,
            snapshot: sale.toObject(),
            deletedBy: req.user?.userId || req.user?.id || req.user?.username || 'System',
            expiresAt
        });

        await Sale.findByIdAndDelete(req.params.id);
        res.json({ message: 'Venta eliminada exitosamente.' });
    } catch (error) {
        console.error('Error deleting sale:', error);
        res.status(500).json({ error: 'Error interno al eliminar la venta.' });
    }
});

// PATCH cancel sale
app.patch('/api/admin/sales/:id/cancel', authenticateToken, requirePermission(PERMISSIONS.VENTAS_CANCEL), async (req, res) => {
    try {
        await connectDB();
        const { reason } = req.body;
        if (!reason || reason.trim() === '') {
            return res.status(400).json({ error: 'El motivo de anulaci├│n es obligatorio.' });
        }

        const sale = await Sale.findById(req.params.id);
        if (!sale) return res.status(404).json({ error: 'Sale not found' });

        if (sale.status === 'cancelada') {
            return res.status(400).json({ error: 'La venta ya se encuentra anulada.' });
        }

        const userRole = req.user?.role || 'solo_lectura';
        const user = req.user?.username || 'Admin';

        // Check for financial records to enforce permissions
        const transactions = await Transaction.find({ saleId: sale._id });
        const installments = await Installment.find({ saleId: sale._id });

        if (transactions.length > 0 || installments.length > 0) {
            if (!['owner', 'admin'].includes(userRole)) {
                return res.status(403).json({ error: 'La venta tiene movimientos o cuotas. Solo un administrador puede anularla.' });
            }
        } else {
            // Vendors might be allowed? The prompt says "Vendedor: no puede anular ventas salvo permiso expl├¡cito ya existente."
            // We'll enforce owner/admin or ventascancel permission. Since "ventascancel" might not exist, we just restrict to owner/admin.
            const perms = req.user?.permissions || [];
            if (!['owner', 'admin'].includes(userRole) && !perms.includes('ventas.cancel')) {
                return res.status(403).json({ error: 'No tienes permisos para anular ventas.' });
            }
        }

        sale.status = 'cancelada';
        sale.cancelledAt = new Date();
        sale.cancelledBy = user;
        sale.cancellationReason = reason;

        if (!sale.saleAuditLog) sale.saleAuditLog = [];
        sale.saleAuditLog.push({
            action: 'VENTA_ANULADA',
            field: 'status',
            oldValue: sale.status, // will be 'confirmada' or whatever it was
            newValue: 'cancelada',
            details: `Motivo: ${reason}`,
            user: user,
            source: 'CRM_V2'
        });

        await logAudit({
            req,
            action: 'VENTA_ANULADA',
            module: 'ventas',
            entityType: 'Sale',
            entityId: sale._id,
            entityLabel: 'Venta',
            description: `Se anul├│ la venta por motivo: ${reason}.`,
            metadata: { reason }
        });

        await sale.save();

        // Return updated sale
        const populatedSale = await Sale.findById(sale._id)
            .populate('clientId', 'firstName lastName fullName phone email')
            .lean();

        res.json(populatedSale);
    } catch (error) {
        console.error('Error cancelling sale:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH update trade-ins for a sale
app.patch('/api/admin/sales/:id/trade-ins', authenticateToken, requirePermission(PERMISSIONS.VENTAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { tradeIns, tradeInTotalAmount, balanceAfterTradeIn, paymentBreakdown } = req.body;

        const sale = await Sale.findById(req.params.id);
        if (!sale) return res.status(404).json({ error: 'Sale not found' });

        const user = req.user?.username || 'Admin';

        // Solo permitir editar si no est├í cancelada
        if (sale.status === 'cancelada') {
            return res.status(400).json({ error: 'No se puede editar una venta anulada.' });
        }

        sale.tradeIns = Array.isArray(tradeIns) ? tradeIns.map(normalizeTradeInVehicle).filter(Boolean) : [];
        if (tradeInTotalAmount !== undefined) sale.tradeInTotalAmount = tradeInTotalAmount;
        if (balanceAfterTradeIn !== undefined) sale.balanceAfterTradeIn = balanceAfterTradeIn;
        if (paymentBreakdown !== undefined) sale.paymentBreakdown = paymentBreakdown;

        if (!sale.saleAuditLog) sale.saleAuditLog = [];
        sale.saleAuditLog.push({
            action: 'VEHICULOS_RECIBIDOS_ACTUALIZADOS',
            field: 'tradeIns',
            details: `Se actualizaron los veh├¡culos recibidos en parte de pago. Valor total tomado: ${tradeInTotalAmount}`,
            user: user,
            source: 'CRM_V2'
        });

        await logAudit({
            req,
            action: 'VEHICULOS_RECIBIDOS_ACTUALIZADOS',
            module: 'ventas',
            entityType: 'Sale',
            entityId: sale._id,
            entityLabel: 'Venta',
            description: `Se actualizaron los veh├¡culos en parte de pago de la venta ${sale._id}.`,
            metadata: { tradeInTotalAmount, count: tradeIns?.length || 0 }
        });

        await sale.save();

        const populatedSale = await Sale.findById(sale._id)
            .populate('clientId', 'firstName lastName fullName phone email')
            .lean();

        res.json(populatedSale);
    } catch (error) {
        console.error('Error updating trade-ins:', error);
        res.status(500).json({ error: error.message });
    }
});

const buildCarFromTradeIn = ({ sale, tradeIn, tradeInIndex }) => {
    const year = Number(tradeIn.year);
    const mileage = Number(tradeIn.mileage || 0);
    const estimatedValue = Number(tradeIn.estimatedValue || 0);
    const name = `${tradeIn.brand} ${tradeIn.model} ${tradeIn.version || ""} ${tradeIn.year || ""}`.trim();

    if (!name) throw new Error("El nombre del veh├¡culo generado qued├│ vac├¡o.");

    return {
        name,
        brand: tradeIn.brand,
        year: isNaN(year) ? new Date().getFullYear() : year,
        km: isNaN(mileage) ? 0 : mileage,
        fuel: 'Nafta', // Default allowed
        condition: 'Usado', // Default allowed
        price: isNaN(estimatedValue) ? 0 : estimatedValue,
        currency: tradeIn.currency === 'USD' ? 'U$S' : '$',
        status: 'Pausado', // Valid enum value
        visibleEnWeb: false,
        plateOrVin: tradeIn.plate || '',
        purchasePrice: isNaN(estimatedValue) ? 0 : estimatedValue,
        purchaseCurrency: tradeIn.currency === 'USD' ? 'USD' : 'ARS',
        notes: `Veh├¡culo ingresado como parte de pago de venta ${sale._id}. \nEstado documental: ${tradeIn.documentationStatus}. \nObservaciones: ${tradeIn.conditionNotes || ''} ${tradeIn.mechanicalNotes || ''}`
    };
};

// POST create stock car from trade-in
app.post('/api/admin/sales/:id/trade-ins/:tradeInIndex/create-stock-car', authenticateToken, requirePermission(PERMISSIONS.VENTAS_WRITE), async (req, res) => {
    let carPayload = null;
    try {
        await connectDB();
        const { id, tradeInIndex } = req.params;
        const index = parseInt(tradeInIndex, 10);

        const sale = await Sale.findById(id).populate('clientId', 'firstName fullName');
        if (!sale) return res.status(404).json({ error: 'Sale not found' });

        if (!sale.tradeIns || !sale.tradeIns[index]) {
            return res.status(404).json({ error: 'Veh├¡culo recibido no encontrado en ese ├¡ndice.' });
        }

        const tradeIn = sale.tradeIns[index];

        if (tradeIn.linkedStockCarId) {
            return res.status(400).json({ error: 'Este veh├¡culo ya ha sido ingresado al stock.' });
        }

        const user = req.user?.username || 'Admin';

        if (!tradeIn.brand || !tradeIn.model || !tradeIn.estimatedValue) {
            return res.status(400).json({ error: "Faltan datos obligatorios para ingresar el veh├¡culo al stock." });
        }

        // Crear nuevo Car en stock usando mapper seguro
        carPayload = buildCarFromTradeIn({ sale, tradeIn, tradeInIndex: index });
        const newCar = new Car(carPayload);
        const savedCar = await newCar.save();

        // Actualizar el tradeIn en la venta de forma segura sin ownerDocument
        const now = new Date();
        await Sale.updateOne(
            { _id: sale._id },
            {
                $set: {
                    [`tradeIns.${index}.linkedStockCarId`]: savedCar._id,
                    [`tradeIns.${index}.shouldEnterStock`]: true,
                    [`tradeIns.${index}.enteredStockAt`]: now
                },
                $push: {
                    saleAuditLog: {
                        action: 'VEHICULO_RECIBIDO_INGRESADO_A_STOCK',
                        field: 'tradeIns',
                        details: `Veh├¡culo ${tradeIn.brand} ${tradeIn.model} ingresado a stock con ID ${savedCar._id}`,
                        user: user,
                        source: 'CRM_V2',
                        date: now
                    }
                }
            },
            { runValidators: false }
        );

        try {
            await logAudit({
                req,
                action: 'VEHICULO_RECIBIDO_INGRESADO_A_STOCK',
                module: 'ventas',
                entityType: 'Sale',
                entityId: sale._id,
                entityLabel: 'Venta',
                description: `Se ingres├│ el veh├¡culo recibido ${tradeIn.brand} ${tradeIn.model} al stock de AutoSporting.`,
                metadata: { stockCarId: savedCar._id, tradeInIndex: index }
            });
        } catch (auditErr) {
            console.error("Error logging audit for create-stock-car:", auditErr);
        }

        const populatedSale = await Sale.findById(sale._id)
            .populate('clientId', 'firstName lastName fullName phone email')
            .lean();

        res.json({ sale: populatedSale, car: savedCar });
    } catch (error) {
        console.error("Error creating stock car from trade-in:", {
            error: error.message,
            validationErrors: error.errors,
            payload: carPayload,
            saleId: req.params.id,
            tradeInIndex: req.params.tradeInIndex,
        });
        res.status(500).json({
            error: 'No se pudo ingresar el veh├¡culo al stock. Revis├í los datos del veh├¡culo recibido.',
            details: error.message
        });
    }
});

// PATCH update sale
app.patch('/api/admin/sales/:id', authenticateToken, requirePermission(PERMISSIONS.VENTAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const {
            status,
            paymentMethod,
            salePrice,
            saleCurrency,
            depositAppliedAmount,
            depositAppliedCurrency,
            notes,
            documentationChecklist,
            deliveryChecklist,
            documentationStatus,
            deliveryStatus,
            estimatedDeliveryDate,
            actualDeliveryDate,
            postSaleStatus,
            postSaleChecklist,
            postSaleNotes,
            satisfactionRating
        } = req.body;

        const sale = await Sale.findById(req.params.id);
        if (!sale) return res.status(404).json({ message: 'Sale not found' });

        const user = req.user?.username || 'Admin';
        const oldStatus = sale.status;
        let hasChanges = false;

        if (req.body.assignedTo !== undefined) {
            let oldAssigned = sale.assignedTo ? sale.assignedTo.toString() : null;
            let newAssigned = req.body.assignedTo === "" ? null : req.body.assignedTo;
            if (oldAssigned !== newAssigned) {
                sale.assignedTo = newAssigned;
                sale.assignedAt = new Date();
                hasChanges = true;

                await logAudit({
                    req,
                    action: newAssigned ? 'RESPONSABLE_ASIGNADO' : 'RESPONSABLE_REMOVIDO',
                    module: 'ventas',
                    entityType: 'Sale',
                    entityId: sale._id,
                    entityLabel: 'Venta',
                    description: `Se reasign├│ la venta.`,
                    metadata: { oldAssigned, newAssigned }
                });
            }
        }

        if (paymentMethod !== undefined && paymentMethod !== sale.paymentMethod) {
            sale.saleAuditLog.push({
                action: 'METODO_PAGO_ACTUALIZADO',
                field: 'paymentMethod',
                oldValue: sale.paymentMethod,
                newValue: paymentMethod,
                details: `M├®todo de pago actualizado a ${paymentMethod}`,
                user: user,
                source: 'CRM_V2'
            });
            sale.paymentMethod = paymentMethod;
            hasChanges = true;
        }

        if (salePrice !== undefined && Number(salePrice) !== Number(sale.salePrice || 0)) {
            sale.saleAuditLog.push({
                action: 'PRECIO_VENTA_ACTUALIZADO',
                field: 'salePrice',
                oldValue: sale.salePrice,
                newValue: Number(salePrice),
                details: `Precio de venta actualizado de ${sale.salePrice || 0} a ${salePrice}`,
                user: user,
                source: 'CRM_V2'
            });
            sale.salePrice = Number(salePrice);
            hasChanges = true;
        }

        if (saleCurrency !== undefined && saleCurrency !== sale.saleCurrency) {
            sale.saleCurrency = saleCurrency;
            hasChanges = true;
        }

        if (depositAppliedAmount !== undefined && Number(depositAppliedAmount) !== Number(sale.depositAppliedAmount || 0)) {
            sale.saleAuditLog.push({
                action: 'SENA_ACTUALIZADA',
                field: 'depositAppliedAmount',
                oldValue: sale.depositAppliedAmount,
                newValue: Number(depositAppliedAmount),
                details: `Se├▒a aplicada actualizada de ${sale.depositAppliedAmount || 0} a ${depositAppliedAmount}`,
                user: user,
                source: 'CRM_V2'
            });
            sale.depositAppliedAmount = Number(depositAppliedAmount);
            hasChanges = true;
        }

        if (depositAppliedCurrency !== undefined && depositAppliedCurrency !== sale.depositAppliedCurrency) {
            sale.depositAppliedCurrency = depositAppliedCurrency;
            hasChanges = true;
        }

        if (notes !== undefined && notes !== sale.notes) {
            sale.saleAuditLog.push({
                action: 'NOTAS_ACTUALIZADAS',
                field: 'notes',
                oldValue: sale.notes,
                newValue: notes,
                details: 'Notas comerciales actualizadas',
                user: user,
                source: 'CRM_V2'
            });
            sale.notes = notes;
            hasChanges = true;
        }

        if (documentationStatus !== undefined && documentationStatus !== sale.documentationStatus) {
            sale.saleAuditLog.push({
                action: 'DOCUMENTACION_ESTADO',
                field: 'documentationStatus',
                oldValue: sale.documentationStatus,
                newValue: documentationStatus,
                details: `Estado de documentaci├│n actualizado a ${documentationStatus}`,
                user: user,
                source: 'CRM_V2'
            });
            sale.documentationStatus = documentationStatus;
            hasChanges = true;
        }

        if (deliveryStatus !== undefined && deliveryStatus !== sale.deliveryStatus) {
            sale.saleAuditLog.push({
                action: 'ENTREGA_ESTADO',
                field: 'deliveryStatus',
                oldValue: sale.deliveryStatus,
                newValue: deliveryStatus,
                details: `Estado de entrega actualizado a ${deliveryStatus}`,
                user: user,
                source: 'CRM_V2'
            });
            sale.deliveryStatus = deliveryStatus;

            if (deliveryStatus === 'entregado' && !sale.actualDeliveryDate) {
                sale.actualDeliveryDate = new Date();
                sale.saleAuditLog.push({
                    action: 'ENTREGA_FECHA_REAL',
                    field: 'actualDeliveryDate',
                    oldValue: null,
                    newValue: sale.actualDeliveryDate,
                    details: `Fecha de entrega asignada autom├íticamente al marcar como entregado`,
                    user: user,
                    source: 'CRM_V2'
                });
            }
            hasChanges = true;
        }

        if (documentationChecklist !== undefined) {
            sale.documentationChecklist = documentationChecklist;
            sale.saleAuditLog.push({
                action: 'CHECKLIST_DOCUMENTACION',
                field: 'documentationChecklist',
                details: 'Checklist de documentaci├│n actualizado',
                user: user,
                source: 'CRM_V2'
            });
            hasChanges = true;
        }

        if (deliveryChecklist !== undefined) {
            sale.deliveryChecklist = deliveryChecklist;
            sale.saleAuditLog.push({
                action: 'CHECKLIST_ENTREGA',
                field: 'deliveryChecklist',
                details: 'Checklist de entrega actualizado',
                user: user,
                source: 'CRM_V2'
            });
            hasChanges = true;
        }

        if (estimatedDeliveryDate !== undefined && new Date(estimatedDeliveryDate).getTime() !== new Date(sale.estimatedDeliveryDate).getTime()) {
            sale.saleAuditLog.push({
                action: 'ESTIMATED_DELIVERY_DATE_UPDATED',
                field: 'estimatedDeliveryDate',
                oldValue: sale.estimatedDeliveryDate,
                newValue: estimatedDeliveryDate,
                details: 'Fecha estimada de entrega actualizada',
                user: user,
                source: 'CRM_V2'
            });
            sale.estimatedDeliveryDate = estimatedDeliveryDate;
            hasChanges = true;
        }

        if (actualDeliveryDate !== undefined && new Date(actualDeliveryDate).getTime() !== new Date(sale.actualDeliveryDate).getTime()) {
            sale.saleAuditLog.push({
                action: 'ACTUAL_DELIVERY_DATE_UPDATED',
                field: 'actualDeliveryDate',
                oldValue: sale.actualDeliveryDate,
                newValue: actualDeliveryDate,
                details: 'Fecha real de entrega actualizada',
                user: user,
                source: 'CRM_V2'
            });
            sale.actualDeliveryDate = actualDeliveryDate;
            hasChanges = true;
        }

        // POSTVENTA
        if (postSaleStatus !== undefined && postSaleStatus !== sale.postSaleStatus) {
            sale.saleAuditLog.push({
                action: 'POSTVENTA_ESTADO',
                field: 'postSaleStatus',
                oldValue: sale.postSaleStatus,
                newValue: postSaleStatus,
                details: `Estado de postventa actualizado a ${postSaleStatus}`,
                user: user,
                source: 'CRM_V2'
            });
            sale.postSaleStatus = postSaleStatus;
            hasChanges = true;
        }

        if (postSaleChecklist !== undefined) {
            // merge con el existente si hace falta, o sobrescribir todo el objeto
            sale.postSaleChecklist = { ...sale.postSaleChecklist, ...postSaleChecklist };
            sale.saleAuditLog.push({
                action: 'CHECKLIST_POSTVENTA',
                field: 'postSaleChecklist',
                details: 'Checklist de postventa actualizado',
                user: user,
                source: 'CRM_V2'
            });
            hasChanges = true;
        }

        if (postSaleNotes !== undefined && postSaleNotes !== sale.postSaleNotes) {
            sale.saleAuditLog.push({
                action: 'POSTVENTA_NOTAS',
                field: 'postSaleNotes',
                oldValue: sale.postSaleNotes,
                newValue: postSaleNotes,
                details: 'Notas de postventa actualizadas',
                user: user,
                source: 'CRM_V2'
            });
            sale.postSaleNotes = postSaleNotes;
            hasChanges = true;
        }

        if (satisfactionRating !== undefined && satisfactionRating !== sale.satisfactionRating) {
            sale.saleAuditLog.push({
                action: 'SATISFACCION_ACTUALIZADA',
                field: 'satisfactionRating',
                oldValue: sale.satisfactionRating,
                newValue: satisfactionRating,
                details: `Nivel de satisfacci├│n actualizado a ${satisfactionRating}`,
                user: user,
                source: 'CRM_V2'
            });
            sale.satisfactionRating = satisfactionRating;
            hasChanges = true;
        }

        if (status !== undefined && status !== oldStatus) {
            if (!['borrador', 'confirmada', 'pendiente_entrega', 'entregada', 'cancelada'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }

            sale.status = status;
            hasChanges = true;

            sale.saleAuditLog.push({
                action: 'CAMBIO_ESTADO',
                field: 'status',
                oldValue: oldStatus,
                newValue: status,
                details: `Estado de venta actualizado a ${status}`,
                user: user,
                source: 'CRM_V2'
            });
        }

        if (hasChanges) {
            sale.updatedBy = user;
            const updatedSale = await sale.save();

            await logAudit({
                req,
                action: 'VENTA_EDITADA',
                module: 'ventas',
                entityType: 'Sale',
                entityId: updatedSale._id,
                entityLabel: `Venta ID: ${updatedSale._id}`,
                description: `Se actualiz├│ la venta (estado: ${updatedSale.status}, documentacion: ${updatedSale.documentationStatus}, entrega: ${updatedSale.deliveryStatus}, postventa: ${updatedSale.postSaleStatus}).`,
                metadata: { status: updatedSale.status }
            });

            res.json(updatedSale);
        } else {
            res.json(sale);
        }
    } catch (error) {
        console.error('Error updating sale:', error);
        res.status(400).json({ message: error.message });
    }
});

// --- CRM V2 FINANCE ENDPOINTS ---

// Helper function to resolve CRM V2 Master Account
async function getOrCreateCrmV2Account(currency) {
    const accountName = `Caja Principal V2 ${currency}`;
    let account = await Account.findOne({ name: accountName, currency });

    if (!account) {
        account = new Account({
            name: accountName,
            type: 'Efectivo',
            currency: currency,
            balance: 0,
            isActive: true
        });
        await account.save();
    }
    return account;
}

// GET admin transactions
app.get('/api/admin/transactions', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        await connectDB();
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
        const query = { module: 'crm_v2' };

        // Apply filters
        if (req.query.type && req.query.type !== 'todas') {
            query.type = req.query.type === 'ingreso' ? 'Ingreso' : 'Egreso';
        }
        if (req.query.currency && req.query.currency !== 'todas') {
            query.currency = req.query.currency;
        }
        if (req.query.paymentMethod && req.query.paymentMethod !== 'todas') {
            query.paymentMethod = req.query.paymentMethod;
        }
        if (req.query.status && req.query.status !== 'todos') {
            query.status = req.query.status;
        }
        if (req.query.startDate && req.query.endDate) {
            query.date = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { concept: searchRegex },
                { category: searchRegex },
                { notes: searchRegex }
            ];
        }

        if (req.query.linkedTo && req.query.linkedTo !== 'todas') {
            if (req.query.linkedTo === 'unlinked') {
                query.saleId = { $exists: false };
                query.reservationId = { $exists: false };
                query.clientId = { $exists: false };
                query.vehicleId = { $exists: false };
            } else if (req.query.linkedTo === 'sale') {
                query.saleId = { $exists: true };
            } else if (req.query.linkedTo === 'reservation') {
                query.reservationId = { $exists: true };
            } else if (req.query.linkedTo === 'client') {
                query.clientId = { $exists: true };
            } else if (req.query.linkedTo === 'vehicle') {
                query.vehicleId = { $exists: true };
            }
        }

        // Extra query support for specific sale links (for the sale finance panel)
        if (req.query.saleId) {
            query.saleId = req.query.saleId;
        }

        const transactions = await Transaction.find(query).sort({ date: -1 }).lean();
        res.json(transactions);
    } catch (error) {
        console.error('GET /api/admin/transactions error:', error);
        return res.status(500).json({
            ok: false,
            error: 'No se pudieron cargar los movimientos financieros.'
        });
    }
});

// GET consolidated finance deposits / senas
app.get('/api/admin/finance/deposits', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        await connectDB();
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });

        const [reservations, sales, transactions] = await Promise.all([
            Reservation.find({ depositAmount: { $gt: 0 } })
                .populate('clientId', 'fullName firstName lastName phone')
                .populate('leadId', 'name phone')
                .populate('vehicleId', 'brand name model plateOrVin')
                .lean(),
            Sale.find({ depositAppliedAmount: { $gt: 0 } })
                .populate('clientId', 'fullName firstName lastName phone')
                .populate('vehicleId', 'brand name model plateOrVin')
                .populate('reservationId', 'depositAmount depositCurrency status')
                .lean(),
            Transaction.find({
                module: 'crm_v2',
                status: { $ne: 'anulado' },
                $or: [
                    { category: /se├▒a|sena|reserva/i },
                    { concept: /se├▒a|sena|reserva/i },
                    { notes: /se├▒a|sena|reserva/i },
                    { reservationId: { $exists: true } }
                ]
            }).lean()
        ]);

        const formatClient = (client, fallback) => {
            if (client?.fullName) return client.fullName;
            const name = `${client?.firstName || ''} ${client?.lastName || ''}`.trim();
            return name || fallback || 'Sin cliente';
        };

        const formatVehicle = (vehicle, fallback) => {
            if (!vehicle) return fallback || 'Sin vehiculo';
            return [vehicle.brand, vehicle.name || vehicle.model, vehicle.plateOrVin ? `(${vehicle.plateOrVin})` : '']
                .filter(Boolean)
                .join(' ')
                .trim() || fallback || 'Sin vehiculo';
        };

        const items = [];

        reservations.forEach((reservation) => {
            const status = reservation.status === 'devuelta' ? 'devuelta' : 'recibida';
            items.push({
                id: `reservation-${reservation._id}`,
                source: 'reservation',
                sourceLabel: 'Reserva',
                status,
                amount: Number(reservation.depositAmount || 0),
                currency: reservation.depositCurrency || 'USD',
                method: reservation.depositMethod || 'sin metodo',
                date: reservation.depositDate || reservation.createdAt,
                vehicle: formatVehicle(reservation.vehicleId),
                client: formatClient(reservation.clientId, reservation.leadId?.name),
                notes: reservation.notes || reservation.conditions || '',
                reservationId: reservation._id,
                clientId: reservation.clientId?._id,
                vehicleId: reservation.vehicleId?._id
            });
        });

        sales.forEach((sale) => {
            items.push({
                id: `sale-${sale._id}`,
                source: 'sale',
                sourceLabel: 'Venta',
                status: 'aplicada',
                amount: Number(sale.depositAppliedAmount || 0),
                currency: sale.depositAppliedCurrency || sale.saleCurrency || 'USD',
                method: sale.paymentMethod || 'sin metodo',
                date: sale.saleDate || sale.createdAt,
                vehicle: formatVehicle(sale.vehicleId),
                client: formatClient(sale.clientId, 'Sin cliente'),
                notes: sale.notes || '',
                saleId: sale._id,
                reservationId: sale.reservationId?._id || sale.reservationId,
                clientId: sale.clientId?._id,
                vehicleId: sale.vehicleId?._id
            });
        });

        transactions.forEach((tx) => {
            const searchText = `${tx.concept || ''} ${tx.description || ''} ${tx.category || ''} ${tx.notes || ''}`.toLowerCase();
            const status = tx.type === 'Egreso'
                ? 'devuelta'
                : searchText.includes('aplic')
                    ? 'aplicada'
                    : 'recibida';

            items.push({
                id: `transaction-${tx._id}`,
                source: 'transaction',
                sourceLabel: 'Movimiento',
                status,
                amount: Number(tx.amount || 0),
                currency: tx.currency || 'USD',
                method: tx.paymentMethod || 'sin metodo',
                date: tx.date || tx.createdAt,
                vehicle: tx.vehicleId ? 'Vehiculo vinculado' : 'Sin vehiculo',
                client: tx.clientId ? 'Cliente vinculado' : 'Sin cliente',
                notes: tx.notes || tx.concept || tx.description || '',
                transactionId: tx._id,
                saleId: tx.saleId,
                reservationId: tx.reservationId,
                clientId: tx.clientId,
                vehicleId: tx.vehicleId
            });
        });

        items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        const summary = items.reduce((acc, item) => {
            const currency = item.currency === 'ARS' ? 'ARS' : 'USD';
            if (item.status === 'recibida') acc.received[currency] += item.amount;
            if (item.status === 'aplicada') acc.applied[currency] += item.amount;
            if (item.status === 'devuelta') acc.returned[currency] += item.amount;
            return acc;
        }, {
            received: { ARS: 0, USD: 0 },
            applied: { ARS: 0, USD: 0 },
            returned: { ARS: 0, USD: 0 }
        });

        const activeCount = reservations.filter((reservation) => reservation.status === 'activa' && Number(reservation.depositAmount || 0) > 0).length;

        res.json({ items, summary: { ...summary, activeCount } });
    } catch (error) {
        console.error('GET /api/admin/finance/deposits error:', error);
        return res.status(500).json({
            ok: false,
            error: 'No se pudieron cargar las se├▒as financieras.'
        });
    }
});

// GET admin transactions export
app.get('/api/admin/transactions/export', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        await connectDB();
        const transactions = await Transaction.find({ module: 'crm_v2', status: { $ne: 'anulado' } })
            .populate('accountId', 'name')
            .sort({ date: -1 });

        const header = ['Fecha', 'Descripcion', 'Categoria', 'Caja', 'Moneda', 'Tipo', 'Monto'];
        const rows = transactions.map(tx => [
            new Date(tx.date || tx.createdAt).toLocaleDateString('es-AR'),
            `"${(tx.concept || tx.description || '').replace(/"/g, '""')}"`,
            `"${(tx.category || '').replace(/"/g, '""')}"`,
            `"${(tx.accountId?.name || '').replace(/"/g, '""')}"`,
            tx.currency,
            tx.type,
            tx.amount
        ]);

        const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="movimientos.csv"');
        res.send('\uFEFF' + csvContent); // UTF-8 BOM
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET admin transactions monthly-close
app.get('/api/admin/transactions/monthly-close', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        await connectDB();
        const transactions = await Transaction.find({ module: 'crm_v2', status: { $ne: 'anulado' } });

        const aggregated = {};
        transactions.forEach(tx => {
            const d = new Date(tx.date || tx.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!aggregated[key]) {
                aggregated[key] = {
                    period: key,
                    ARS: { income: 0, expense: 0, net: 0 },
                    USD: { income: 0, expense: 0, net: 0 }
                };
            }
            const curr = tx.currency === 'USD' ? 'USD' : 'ARS';
            if (tx.type === 'Ingreso' || tx.type === 'ingreso') {
                aggregated[key][curr].income += Number(tx.amount);
                aggregated[key][curr].net += Number(tx.amount);
            } else {
                aggregated[key][curr].expense += Number(tx.amount);
                aggregated[key][curr].net -= Number(tx.amount);
            }
        });

        const result = Object.values(aggregated).sort((a, b) => b.period.localeCompare(a.period));
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST admin transactions bulk-annul
app.post('/api/admin/transactions/bulk-annul', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { ids, confirmText } = req.body;
        if (confirmText !== 'ANULAR MOVIMIENTOS') {
            return res.status(400).json({ message: 'Confirmación inválida' });
        }
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No se proporcionaron IDs' });
        }

        let annulledCount = 0;
        for (const id of ids) {
            const tx = await Transaction.findOne({ _id: id, module: 'crm_v2' });
            if (tx && tx.status !== 'anulado') {
                const account = await Account.findById(tx.accountId);
                if (account) {
                    const revertChange = (tx.type === 'Ingreso' || tx.type === 'ingreso') ? -Number(tx.amount) : Number(tx.amount);
                    account.balance += revertChange;
                    await account.save();
                }
                tx.status = 'anulado';
                await tx.save();
                annulledCount++;
            }
        }

        res.json({ message: `${annulledCount} transacciones anuladas exitosamente.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE admin transaction by id
app.delete('/api/admin/transactions/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const tx = await Transaction.findOne({ _id: req.params.id, module: 'crm_v2' });
        if (!tx) return res.status(404).json({ message: 'Transacción no encontrada' });
        if (tx.status === 'anulado') return res.status(400).json({ message: 'La transacción ya está anulada' });

        const account = await Account.findById(tx.accountId);
        if (account) {
            const revertChange = (tx.type === 'Ingreso' || tx.type === 'ingreso') ? -Number(tx.amount) : Number(tx.amount);
            account.balance += revertChange;
            await account.save();
        }

        tx.status = 'anulado';
        await tx.save();

        try {
            if (typeof logAudit === 'function') {
                await logAudit({
                    req,
                    action: 'TRANSACCION_ANULADA',
                    module: 'finanzas',
                    entityType: 'Transaction',
                    entityId: tx._id,
                    entityLabel: 'Transacción',
                    description: `Transacción ${tx.type} de ${tx.currency} ${tx.amount} anulada.`,
                });
            }
        } catch (auditErr) {
            console.error('Audit log error on delete transaction:', auditErr);
        }

        res.json({ message: 'Transacción anulada y balance revertido' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET admin transaction by id
app.get('/api/admin/transactions/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        await connectDB();
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
        const transaction = await Transaction.findOne({ _id: req.params.id, module: 'crm_v2' });
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        res.json(transaction);
    } catch (error) {
        console.error('GET /api/admin/transactions/:id error:', error);
        return res.status(500).json({
            ok: false,
            error: 'No se pudo cargar el movimiento financiero.'
        });
    }
});

// POST admin transaction (manual only)
app.post('/api/admin/transactions', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
        const { type, category, concept, amount, currency, paymentMethod, date, notes, saleId, reservationId, clientId, vehicleId, installmentId, payeeCompany, payeeVehicle } = req.body;

        // Validations
        if (!type || !['ingreso', 'egreso'].includes(type)) return res.status(400).json({ message: 'Type is required and must be ingreso/egreso' });
        if (!currency || !['ARS', 'USD'].includes(currency)) return res.status(400).json({ message: 'Currency is required and must be ARS/USD' });
        if (amount === undefined || amount < 0) return res.status(400).json({ message: 'Amount is required and must be >= 0' });
        if (!concept) return res.status(400).json({ message: 'Concept is required' });
        if (!category) return res.status(400).json({ message: 'Category is required' });

        // V├¡nculos opcionales (Verificaci├│n de existencia)
        if (saleId) {
            const sale = await Sale.findById(saleId);
            if (!sale) return res.status(400).json({ message: 'La Venta vinculada no existe' });
        }
        if (reservationId) {
            const reservation = await Reservation.findById(reservationId);
            if (!reservation) return res.status(400).json({ message: 'La Reserva vinculada no existe' });
        }
        if (clientId) {
            const client = await Client.findById(clientId);
            if (!client) return res.status(400).json({ message: 'El Cliente vinculado no existe' });
        }
        if (vehicleId) {
            const vehicle = await Car.findById(vehicleId);
            if (!vehicle) return res.status(400).json({ message: 'El Veh├¡culo vinculado no existe' });
        }
        if (installmentId) {
            const installment = await Installment.findById(installmentId);
            if (!installment) return res.status(400).json({ message: 'La Cuota vinculada no existe' });
        }

        // Resolve accountId safely
        const account = await getOrCreateCrmV2Account(currency);

        const newTx = new Transaction({
            module: 'crm_v2',
            source: 'manual',
            type: type === 'ingreso' ? 'Ingreso' : 'Egreso', // map to legacy enum
            category,
            concept,
            description: concept, // map to legacy required field
            amount,
            currency,
            paymentMethod,
            date: date || new Date(),
            notes,
            accountId: account._id, // map to legacy required field
            status: 'activo',
            saleId: saleId || undefined,
            reservationId: reservationId || undefined,
            clientId: clientId || undefined,
            vehicleId: vehicleId || undefined,
            installmentId: installmentId || undefined,
            payeeCompany: payeeCompany || undefined,
            payeeVehicle: payeeVehicle || undefined,
            createdBy: req.user?.username || 'Admin',
            transactionAuditLog: [{
                action: 'CREACION_MANUAL',
                details: `Movimiento manual creado: ${concept}`,
                user: req.user?.username || 'Admin',
                source: 'CRM_V2'
            }]
        });

        const savedTx = await newTx.save();

        // Update account balance
        if (savedTx.type === 'Ingreso') {
            account.balance += savedTx.amount;
        } else {
            account.balance -= savedTx.amount;
        }
        await account.save();

        await logAudit({
            req,
            action: 'MOVIMIENTO_CREADO',
            module: 'finanzas',
            entityType: 'Transaction',
            entityId: savedTx._id,
            entityLabel: `${savedTx.type} - ${savedTx.concept}`,
            description: `Se cre├│ un movimiento financiero por ${savedTx.currency} ${savedTx.amount}.`,
            metadata: { type: savedTx.type, amount: savedTx.amount, currency: savedTx.currency }
        });

        res.status(201).json(savedTx);
    } catch (error) {
        console.error('POST /api/admin/transactions error:', error);
        return res.status(500).json({
            ok: false,
            error: 'No se pudo crear el movimiento financiero.'
        });
    }
});

// PATCH admin transaction
app.patch('/api/admin/transactions/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
        const { category, concept, paymentMethod, date, notes, status, saleId, reservationId, clientId, vehicleId, installmentId, payeeCompany, payeeVehicle } = req.body;

        const tx = await Transaction.findOne({ _id: req.params.id, module: 'crm_v2' });
        if (!tx) return res.status(404).json({ message: 'Transaction not found' });

        const user = req.user?.username || 'Admin';
        let hasChanges = false;

        if (category !== undefined && category !== tx.category) {
            tx.category = category;
            hasChanges = true;
        }

        if (concept !== undefined && concept !== tx.concept) {
            tx.description = concept; // sync legacy field
            tx.concept = concept;
            hasChanges = true;
        }

        if (paymentMethod !== undefined && paymentMethod !== tx.paymentMethod) {
            tx.paymentMethod = paymentMethod;
            hasChanges = true;
        }

        if (date !== undefined) {
            tx.date = date;
            hasChanges = true;
        }

        if (notes !== undefined && notes !== tx.notes) {
            tx.notes = notes;
            hasChanges = true;
        }

        // Actualizaci├│n de V├¡nculos
        const updateLink = async (field, value, model, name) => {
            if (value !== undefined && String(tx[field] || '') !== String(value || '')) {
                if (value) {
                    const entity = await model.findById(value);
                    if (!entity) throw new Error(`${name} vinculado no existe`);
                }
                tx[field] = value || undefined;
                hasChanges = true;
                tx.transactionAuditLog.push({
                    action: 'VINCULO_ACTUALIZADO',
                    field: field,
                    details: `V├¡nculo de ${name} actualizado`,
                    user: user,
                    source: 'CRM_V2'
                });
            }
        };

        await updateLink('saleId', saleId, Sale, 'Venta');
        await updateLink('reservationId', reservationId, Reservation, 'Reserva');
        await updateLink('clientId', clientId, Client, 'Cliente');
        await updateLink('vehicleId', vehicleId, Car, 'Veh├¡culo');
        await updateLink('installmentId', installmentId, Installment, 'Cuota');

        // Handle Annulment
        if (status === 'anulado' && tx.status !== 'anulado') {
            tx.status = 'anulado';
            tx.transactionAuditLog.push({
                action: 'ANULACION',
                field: 'status',
                oldValue: 'activo',
                newValue: 'anulado',
                details: 'Movimiento anulado manualmente',
                user: user,
                source: 'CRM_V2'
            });
            hasChanges = true;

            // Revert account balance
            const account = await Account.findById(tx.accountId);
            if (account) {
                if (tx.type === 'Ingreso') account.balance -= tx.amount;
                if (tx.type === 'Egreso') account.balance += tx.amount;
                await account.save();
            }
        }

        if (hasChanges && status !== 'anulado') {
            tx.transactionAuditLog.push({
                action: 'EDICION',
                details: 'Datos del movimiento editados',
                user: user,
                source: 'CRM_V2'
            });
        }

        if (hasChanges) {
            tx.updatedBy = user;
            const updatedTx = await tx.save();

            await logAudit({
                req,
                action: (status === 'anulado') ? 'MOVIMIENTO_ANULADO' : 'MOVIMIENTO_EDITADO',
                module: 'finanzas',
                entityType: 'Transaction',
                entityId: updatedTx._id,
                entityLabel: `${updatedTx.type} - ${updatedTx.concept}`,
                description: `Se actualiz├│ el movimiento financiero (estado: ${updatedTx.status}).`,
                metadata: { status: updatedTx.status }
            });

            res.json(updatedTx);
        } else {
            res.json(tx);
        }
    } catch (error) {
        console.error('PATCH /api/admin/transactions/:id error:', error);
        return res.status(500).json({
            ok: false,
            error: 'No se pudo actualizar el movimiento financiero.'
        });
    }
});

// ========================================== //
// ============ INSTALLMENTS V2 ============= //
// ========================================== //

app.get('/api/admin/installments', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        await connectDB();
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
        const query = {};
        if (req.query.saleId) query.saleId = req.query.saleId;
        if (req.query.clientId) query.clientId = req.query.clientId;
        if (req.query.vehicleId) query.vehicleId = req.query.vehicleId;
        if (req.query.status) query.status = req.query.status;

        const installments = await Installment.find(query)
            .populate('clientId', 'firstName lastName fullName phone')
            .populate('vehicleId', 'brand name plateOrVin')
            .sort({ dueDate: 1, installmentNumber: 1 })
            .lean();

        // Buscar transacciones asociadas
        const installmentIds = installments.map(i => i._id);
        const transactions = await Transaction.find({
            installmentId: { $in: installmentIds },
            status: { $ne: 'anulado' }
        }).lean();

        // Agrupar transacciones por installmentId
        const txByInstallment = {};
        transactions.forEach(tx => {
            const instId = tx.installmentId.toString();
            if (!txByInstallment[instId]) txByInstallment[instId] = [];
            txByInstallment[instId].push(tx);
        });

        // Inyectar financeSummary
        const enrichedInstallments = installments.map(inst => {
            const instId = inst._id.toString();
            const instTxs = txByInstallment[instId] || [];

            const financeSummary = {
                ingresosARS: 0,
                egresosARS: 0,
                balanceARS: 0,
                ingresosUSD: 0,
                egresosUSD: 0,
                balanceUSD: 0,
                linkedTransactions: instTxs
            };

            instTxs.forEach(tx => {
                const amount = Number(tx.amount) || 0;
                if (tx.currency === 'ARS') {
                    if (tx.type === 'Ingreso') financeSummary.ingresosARS += amount;
                    if (tx.type === 'Egreso') financeSummary.egresosARS += amount;
                } else if (tx.currency === 'USD') {
                    if (tx.type === 'Ingreso') financeSummary.ingresosUSD += amount;
                    if (tx.type === 'Egreso') financeSummary.egresosUSD += amount;
                }
            });

            financeSummary.balanceARS = financeSummary.ingresosARS - financeSummary.egresosARS;
            financeSummary.balanceUSD = financeSummary.ingresosUSD - financeSummary.egresosUSD;

            return { ...inst, financeSummary };
        });

        res.json(enrichedInstallments);
    } catch (error) {
        console.error('Error fetching installments:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/installments/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        await connectDB();
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Installment ID inv├ílido' });
        }
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
        const installment = await Installment.findById(req.params.id)
            .populate('clientId', 'firstName lastName fullName phone email')
            .populate('vehicleId', 'brand name year price currency plateOrVin')
            .populate('saleId', 'salePrice saleCurrency status paymentMethod')
            .lean();

        if (!installment) return res.status(404).json({ message: 'Installment not found' });

        const transactions = await Transaction.find({
            installmentId: installment._id,
            status: { $ne: 'anulado' }
        }).lean();

        const financeSummary = {
            ingresosARS: 0,
            egresosARS: 0,
            balanceARS: 0,
            ingresosUSD: 0,
            egresosUSD: 0,
            balanceUSD: 0,
            linkedTransactions: transactions
        };

        transactions.forEach(tx => {
            const amount = Number(tx.amount) || 0;
            if (tx.currency === 'ARS') {
                if (tx.type === 'Ingreso') financeSummary.ingresosARS += amount;
                if (tx.type === 'Egreso') financeSummary.egresosARS += amount;
            } else if (tx.currency === 'USD') {
                if (tx.type === 'Ingreso') financeSummary.ingresosUSD += amount;
                if (tx.type === 'Egreso') financeSummary.egresosUSD += amount;
            }
        });

        financeSummary.balanceARS = financeSummary.ingresosARS - financeSummary.egresosARS;
        financeSummary.balanceUSD = financeSummary.ingresosUSD - financeSummary.egresosUSD;

        res.json({ ...installment, financeSummary });
    } catch (error) {
        console.error('Error fetching installment details:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/installments', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const user = req.user ? (req.user.email || req.user.role) : 'System';
        const { saleId, clientId, vehicleId, installmentNumber, dueDate, amount, currency, notes, status, source, customerName, customerPhone, concept, paymentMethod } = req.body;
        const isManual = source === 'manual';

        if ((!isManual && !saleId) || (!isManual && !installmentNumber) || !dueDate || amount === undefined || !currency) {
            return res.status(400).json({
                message: 'Faltan campos obligatorios: número de cuota, vencimiento, importe o moneda.',
                missing: {
                    saleId: !isManual && !saleId,
                    installmentNumber: !isManual && !installmentNumber,
                    dueDate: !dueDate,
                    amount: amount === undefined,
                    currency: !currency
                }
            });
        }

        const sanitizeOptionalObjectId = (value) => {
            if (!value) return undefined;
            if (typeof value === "string" && value.trim() === "") return undefined;
            return value;
        };

        const cleanSaleId = sanitizeOptionalObjectId(saleId);
        const cleanClientId = sanitizeOptionalObjectId(clientId);
        const cleanVehicleId = sanitizeOptionalObjectId(vehicleId);

        if (!isManual && (!cleanSaleId || !mongoose.Types.ObjectId.isValid(cleanSaleId))) {
            return res.status(400).json({ message: "saleId inválido o faltante" });
        }
        if (cleanSaleId && !mongoose.Types.ObjectId.isValid(cleanSaleId)) {
            return res.status(400).json({ message: "saleId inválido" });
        }
        if (cleanClientId && !mongoose.Types.ObjectId.isValid(cleanClientId)) {
            return res.status(400).json({ message: "clientId inválido" });
        }
        if (cleanVehicleId && !mongoose.Types.ObjectId.isValid(cleanVehicleId)) {
            return res.status(400).json({ message: "vehicleId inválido" });
        }

        const newInstallment = new Installment({
            ...(cleanSaleId && { saleId: cleanSaleId }),
            ...(cleanClientId && { clientId: cleanClientId }),
            ...(cleanVehicleId && { vehicleId: cleanVehicleId }),
            source: isManual ? 'manual' : 'venta',
            customerName: isManual ? customerName : undefined,
            customerPhone: isManual ? customerPhone : undefined,
            concept: isManual ? concept : undefined,
            paymentMethod: isManual ? paymentMethod : undefined,
            installmentNumber: isManual ? (installmentNumber || 1) : installmentNumber,
            dueDate,
            amount,
            currency,
            status: status || 'pendiente',
            notes,
            createdBy: user,
            installmentAuditLog: [{
                action: 'CUOTA_CREADA',
                details: isManual ? 'Cuenta por cobrar manual creada' : 'Cuota manual creada',
                user: user
            }]
        });

        const savedInstallment = await newInstallment.save();

        await logAudit({
            req,
            action: 'CUOTA_CREADA',
            module: 'cuotas',
            entityType: 'Installment',
            entityId: savedInstallment._id,
            entityLabel: `Cuota ${savedInstallment.installmentNumber} (${savedInstallment.currency} ${savedInstallment.amount})`,
            description: `Se cre├│ la cuota manual n├║mero ${savedInstallment.installmentNumber} por ${savedInstallment.currency} ${savedInstallment.amount}.`,
            metadata: { saleId: savedInstallment.saleId, amount: savedInstallment.amount, currency: savedInstallment.currency }
        });

        res.status(201).json(savedInstallment);
    } catch (error) {
        console.error('Error creating installment:', error);
        res.status(400).json({ message: error.message });
    }
});

app.post('/api/admin/installments/:id/pay', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Installment ID inválido' });
        }

        const { amount, paymentMethod, accountId, notes } = req.body;
        const payAmount = Number(amount);

        if (!payAmount || payAmount <= 0) {
            return res.status(400).json({ message: 'El monto a pagar debe ser mayor a cero' });
        }
        if (!accountId) {
            return res.status(400).json({ message: 'Se requiere cuenta (accountId) para registrar el cobro' });
        }

        const installment = await Installment.findById(req.params.id);
        if (!installment) return res.status(404).json({ message: 'Cuota no encontrada' });

        if (installment.status === 'pagada' || installment.status === 'anulada') {
            return res.status(400).json({ message: `No se puede cobrar una cuota en estado ${installment.status}` });
        }

        const account = await Account.findById(accountId);
        if (!account) return res.status(404).json({ message: 'Cuenta financiera no encontrada' });
        if (account.currency !== installment.currency) {
            return res.status(400).json({ message: 'La moneda de la cuenta no coincide con la moneda de la cuota' });
        }

        // Idempotencia y validación de excedente
        const currentPaid = Number(installment.paidAmount || 0);
        const installmentTotal = Number(installment.amount || 0);
        const pending = installmentTotal - currentPaid;

        if (payAmount > pending) {
            return res.status(400).json({ message: `El monto (${payAmount}) supera el saldo pendiente (${pending})` });
        }

        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        // 1. Crear el movimiento (Transacción)
        const newTx = new Transaction({
            type: 'Ingreso',
            amount: payAmount,
            currency: installment.currency,
            description: `Cobro cuota ${installment.installmentNumber || ''} - ${installment.concept || ''}`,
            concept: 'Cobro de Cuota',
            category: 'Cobranzas',
            paymentMethod: paymentMethod || 'efectivo',
            date: new Date(),
            accountId: account._id,
            saleId: installment.saleId,
            clientId: installment.clientId,
            vehicleId: installment.vehicleId,
            installmentId: installment._id,
            notes: notes || '',
            module: 'crm_v2',
            source: 'cuota',
            status: 'activo',
            createdBy: user,
            transactionAuditLog: [{ action: 'CREACION', details: 'Cobro de cuota', user: user }]
        });

        await newTx.save();

        try {
            // 2. Actualizar balance de la cuenta
            account.balance += payAmount;
            await account.save();

            // 3. Actualizar estado de la cuota
            installment.paidAmount = currentPaid + payAmount;
            if (installment.paidAmount >= installmentTotal) {
                installment.status = 'pagada';
                installment.paymentDate = new Date();
            } else if (installment.paidAmount > 0) {
                installment.status = 'parcial';
                installment.paymentDate = new Date();
            }

            installment.updatedBy = user;
            installment.installmentAuditLog.push({
                action: 'COBRO_REGISTRADO',
                details: `Cobro por ${installment.currency} ${payAmount}. Nuevo saldo: ${installment.paidAmount}.`,
                user: user
            });

            await installment.save();
        } catch (saveError) {
            // Rollback manual si falla account o installment
            await Transaction.findByIdAndDelete(newTx._id);
            // Revert account balance if it was already saved
            const verifyAcc = await Account.findById(account._id);
            if (verifyAcc && verifyAcc.balance !== (account.balance - payAmount)) {
                verifyAcc.balance -= payAmount;
                await verifyAcc.save();
            }
            throw new Error(`Error en persistencia, cobro revertido: ${saveError.message}`);
        }

        try {
            if (typeof logAudit === 'function') {
                await logAudit({
                    req,
                    action: 'COBRO_CUOTA',
                    module: 'cuotas',
                    entityType: 'Installment',
                    entityId: installment._id,
                    entityLabel: `Cuota ${installment.installmentNumber}`,
                    description: `Cobro de ${installment.currency} ${payAmount} registrado en la caja ${account.name}.`
                });
            }
        } catch (auditErr) {
            console.error('Audit log error on pay installment:', auditErr);
        }

        res.json({ message: 'Cobro registrado correctamente', installment, transaction: newTx });
    } catch (error) {
        console.error('Error paying installment:', error);
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/installments/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Installment ID inv├ílido' });
        }
        const user = req.user ? (req.user.email || req.user.role) : 'System';
        const updates = req.body;

        const installment = await Installment.findById(req.params.id);
        if (!installment) return res.status(404).json({ message: 'Installment not found' });

        let hasChanges = false;
        const allowedUpdates = ['dueDate', 'amount', 'currency', 'status', 'notes', 'customerName', 'customerPhone', 'concept', 'paymentMethod', 'paidAmount', 'paymentDate'];
        let actionStr = 'CUOTA_EDITADA';

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined && updates[field] !== installment[field]) {
                const oldValue = installment[field];
                installment[field] = updates[field];
                hasChanges = true;

                if (field === 'status') {
                    if (updates[field] === 'pagada_manual') actionStr = 'CUOTA_MARCADA_PAGADA_MANUAL';
                    if (updates[field] === 'anulada') actionStr = 'CUOTA_ANULADA';
                }
            }
        });

        if (hasChanges) {
            installment.updatedBy = user;
            installment.installmentAuditLog.push({
                action: actionStr,
                details: `Actualizaci├│n manual.`,
                user: user
            });
            const updatedInst = await installment.save();

            await logAudit({
                req,
                action: actionStr,
                module: 'cuotas',
                entityType: 'Installment',
                entityId: updatedInst._id,
                entityLabel: `Cuota ${updatedInst.installmentNumber}`,
                description: `Se actualiz├│ la cuota (estado: ${updatedInst.status}).`,
                metadata: { status: updatedInst.status, amount: updatedInst.amount, currency: updatedInst.currency }
            });

            res.json(updatedInst);
        } else {
            res.json(installment);
        }
    } catch (error) {
        console.error('Error updating installment:', error);
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/admin/installments/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Installment ID inv├ílido' });
        }
        if (!req.user || (req.user.role !== 'owner' && req.user.role !== 'admin')) {
            return res.status(403).json({ message: 'Solo owner/admin pueden eliminar cuotas.' });
        }

        const installment = await Installment.findById(req.params.id);
        if (!installment) return res.status(404).json({ message: 'Cuota no encontrada' });

        const linkedTx = await Transaction.findOne({
            installmentId: installment._id,
            status: { $ne: 'anulado' }
        });

        if (linkedTx) {
            return res.status(400).json({
                message: 'No se puede eliminar esta cuota porque tiene movimientos financieros vinculados. Pod├®s anularla, pero no borrarla.'
            });
        }

        if (installment.paidAmount > 0 || installment.status === 'pagada') {
            return res.status(400).json({
                message: 'No se puede eliminar una cuota que registra cobros o figura pagada.'
            });
        }

        installment.status = 'anulada';
        await installment.save();

        await logAudit({
            req,
            action: 'CUOTA_ELIMINADA_DEFINITIVAMENTE',
            module: 'cuotas',
            entityType: 'Installment',
            entityId: installment._id,
            entityLabel: `Cuota ${installment.installmentNumber}`,
            description: `Se elimin├│ definitivamente la cuota ${installment.installmentNumber} de importe ${installment.amount}.`,
            metadata: { saleId: installment.saleId }
        });

        res.json({ message: 'Cuota eliminada definitivamente.' });

    } catch (error) {
        console.error('Error deleting installment:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/sales/:id/installments/generate', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Sale ID inv├ílido' });
        }
        const user = req.user ? (req.user.email || req.user.role) : 'System';
        const saleId = req.params.id;
        const { totalAmount, baseAmount, interestPercent, currency, installmentsCount, firstDueDate, frequency, notes, allowAppend } = req.body;

        const base = Number(baseAmount || totalAmount);
        const interest = Number(interestPercent || 0);
        const finalTotal = Math.round(base * (1 + interest / 100));

        if (!finalTotal || finalTotal <= 0) return res.status(400).json({ message: 'Total amount must be greater than 0' });
        if (!installmentsCount || installmentsCount <= 0) return res.status(400).json({ message: 'Installments count must be greater than 0' });
        if (!firstDueDate) return res.status(400).json({ message: 'First due date is required' });

        const sale = await Sale.findById(saleId);
        if (!sale) return res.status(404).json({ message: 'Sale not found' });

        const existingInstallments = await Installment.find({ saleId, status: { $ne: 'anulada' } }).sort({ installmentNumber: -1 });

        if (existingInstallments.length > 0 && !allowAppend) {
            return res.status(400).json({ message: 'Ya existen cuotas activas para esta venta.' });
        }

        let startNumber = 1;
        if (existingInstallments.length > 0) {
            startNumber = existingInstallments[0].installmentNumber + 1;
        }

        const baseInstAmount = Math.floor(finalTotal / installmentsCount);
        const remainder = finalTotal - (baseInstAmount * installmentsCount);

        const newInstallments = [];
        let currentDate = new Date(firstDueDate);

        const sanitizeOptionalObjectId = (value) => {
            if (!value) return undefined;
            if (typeof value === "string" && value.trim() === "") return undefined;
            if (typeof value === "object" && value._id) return value._id;
            return value;
        };
        const cleanClientId = sanitizeOptionalObjectId(sale.clientId);
        const cleanVehicleId = sanitizeOptionalObjectId(sale.vehicleId);

        for (let i = 0; i < installmentsCount; i++) {
            let amount = baseInstAmount;
            if (i === installmentsCount - 1) {
                amount += remainder;
            }

            newInstallments.push(new Installment({
                saleId: sale._id,
                ...(cleanClientId && { clientId: cleanClientId }),
                ...(cleanVehicleId && { vehicleId: cleanVehicleId }),
                installmentNumber: startNumber + i,
                dueDate: new Date(currentDate),
                amount,
                currency,
                status: 'pendiente',
                notes: notes || `Generada en plan de ${installmentsCount} cuotas. Base: ${base}. Inter├®s: ${interest}%.`,
                createdBy: user,
                installmentAuditLog: [{
                    action: 'PLAN_GENERADO',
                    details: `Cuota ${i+1} de ${installmentsCount} generada por sistema. Base: ${base}. Inter├®s: ${interest}%.`,
                    user: user
                }]
            }));

            // Frequency = mensual por ahora
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        const savedInstallments = await Installment.insertMany(newInstallments);
        res.status(201).json(savedInstallments);

    } catch (error) {
        console.error('Error generating installments:', error);
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/admin/sales/:id/installments', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Sale ID inválido' });
        }

        const saleId = req.params.id;

        // Removed safety checks per user request: deleting plan forcefully.

        await Installment.updateMany({ saleId }, { status: 'anulada' });

        await logAudit({
            req,
            action: 'PLAN_ELIMINADO',
            module: 'cuotas',
            entityType: 'Sale',
            entityId: saleId,
            entityLabel: `Venta ${saleId}`,
            description: `Se eliminó completamente el plan de cuotas de la venta.`,
            metadata: { saleId }
        });

        res.json({ message: 'Plan de cuotas eliminado exitosamente.' });
    } catch (error) {
        console.error('Error deleting installment plan:', error);
        res.status(500).json({ message: error.message });
    }
});


// ====================
// CRM TASKS ENDPOINTS
// ====================

// GET all active tasks
app.get('/api/admin/crm-tasks', authenticateToken, requirePermission(PERMISSIONS.AGENDA_READ), async (req, res) => {
    try {
        await connectDB();
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        const tasks = await CrmTask.find()
            .populate('clientId', 'firstName lastName fullName phone')
            .populate('vehicleId', 'brand name plate')
            .populate('saleId', '_id')
            .populate('installmentId', 'installmentNumber amount currency')
            .sort({ dueDate: 1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST new task
app.post('/api/admin/crm-tasks', authenticateToken, requirePermission(PERMISSIONS.AGENDA_WRITE), async (req, res) => {
    try {
        await connectDB();

        // Validation to prevent empty string cast to ObjectId errors
        const cleanObjectId = (val) => {
            if (!val) return undefined;
            if (typeof val === 'object') return val._id || val.id || undefined;
            const text = String(val).trim();
            return text ? text : undefined;
        };

        const taskData = { ...req.body };
        if (taskData.clientId) taskData.clientId = cleanObjectId(taskData.clientId);
        if (taskData.vehicleId) taskData.vehicleId = cleanObjectId(taskData.vehicleId);
        if (taskData.saleId) taskData.saleId = cleanObjectId(taskData.saleId);
        if (taskData.installmentId) taskData.installmentId = cleanObjectId(taskData.installmentId);
        if (taskData.leadId) taskData.leadId = cleanObjectId(taskData.leadId);

        const newTask = new CrmTask({
            ...taskData,
            user: req.user?.username || 'CRM_V2'
        });

        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PATCH task
app.patch('/api/admin/crm-tasks/:id', authenticateToken, requirePermission(PERMISSIONS.AGENDA_WRITE), async (req, res) => {
    try {
        await connectDB();

        const updateData = { ...req.body };
        const task = await CrmTask.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        let oldAssigned = task.assignedTo ? task.assignedTo.toString() : null;
        let newAssigned = updateData.assignedTo === "" ? null : updateData.assignedTo;

        if (updateData.assignedTo !== undefined && oldAssigned !== newAssigned) {
            task.assignedTo = newAssigned;
            task.assignedAt = new Date();

            await logAudit({
                req,
                action: newAssigned ? 'RESPONSABLE_ASIGNADO' : 'RESPONSABLE_REMOVIDO',
                module: 'agenda',
                entityType: 'CrmTask',
                entityId: task._id,
                entityLabel: task.title,
                description: `Se reasign├│ la tarea.`,
                metadata: { oldAssigned, newAssigned }
            });
        }

        // Handle completion/cancellation dates
        if (updateData.status === 'completada') {
            task.status = 'completada';
            task.completedAt = new Date();
        } else if (updateData.status === 'cancelada') {
            task.status = 'cancelada';
            task.canceledAt = new Date();
        } else if (updateData.status === 'pendiente') {
            task.status = 'pendiente';
            task.completedAt = undefined;
            task.canceledAt = undefined;
        }

        if (updateData.title) task.title = updateData.title;
        if (updateData.description !== undefined) task.description = updateData.description;
        if (updateData.priority) task.priority = updateData.priority;
        if (updateData.dueDate) task.dueDate = updateData.dueDate;
        if (updateData.dueTime !== undefined) task.dueTime = updateData.dueTime;

        await task.save();
        res.json(task);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// ========================================== //
// ============ NOTIFICACIONES ============= //
// ========================================== //

app.get('/api/admin/notifications', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        const userRole = req.user?.role || 'solo_lectura';
        const userId = req.user?.userId || req.user?.email || 'unknown';
        const perms = req.user?.permissions || [];

        const isOwnerAdmin = ['owner', 'admin'].includes(userRole);
        const isVentas = userRole === 'ventas';
        const canReadFinance = isOwnerAdmin || perms.includes('finanzas.read');
        const canReadInstallments = isOwnerAdmin || perms.includes('cuotas.read');
        const canReadTasks = isOwnerAdmin || perms.includes('agenda.read') || isVentas;
        const canReadDocs = isOwnerAdmin || perms.includes('documentacion.read') || isVentas;
        const canReadPostventa = isOwnerAdmin || perms.includes('postventa.read') || isVentas;
        const canReadReservations = isOwnerAdmin || perms.includes('reservas.read') || isVentas;
        const canReadLeads = isOwnerAdmin || perms.includes('leads.read') || isVentas;

        let rawNotifs = [];
        const now = new Date();
        const startOfToday = new Date(now.setHours(0,0,0,0));
        const in7Days = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

        // 1. CUOTAS
        if (canReadInstallments) {
            const installments = await Installment.find({ status: { $in: ['pendiente', 'parcial'] } })
                .populate('saleId', 'clientId vehicleId')
                .lean();

            installments.forEach(inst => {
                if (!inst.dueDate) return;
                const dueDate = new Date(inst.dueDate);
                dueDate.setHours(0,0,0,0);

                if (dueDate < startOfToday) {
                    rawNotifs.push({
                        type: 'installment_overdue',
                        severity: 'danger',
                        title: 'Cuota Vencida',
                        description: `La cuota ${inst.installmentNumber} (${inst.currency} ${inst.amount}) est├í vencida.`,
                        module: 'cuotas',
                        entityType: 'Installment',
                        entityId: inst._id.toString(),
                        href: '/admin/cuotas',
                        dueDate: inst.dueDate
                    });
                } else if (dueDate <= in7Days) {
                    rawNotifs.push({
                        type: 'installment_due_soon',
                        severity: 'warning',
                        title: 'Cuota Pr├│xima a Vencer',
                        description: `La cuota ${inst.installmentNumber} vence el ${new Date(inst.dueDate).toLocaleDateString('es-AR')}.`,
                        module: 'cuotas',
                        entityType: 'Installment',
                        entityId: inst._id.toString(),
                        href: '/admin/cuotas',
                        dueDate: inst.dueDate
                    });
                }
            });
        }

        // 2. TAREAS (CrmTasks)
        if (canReadTasks) {
            const tasksQuery = { status: 'pendiente' };
            const tasks = await CrmTask.find(tasksQuery).lean();

            tasks.forEach(task => {
                if (!isOwnerAdmin && task.assignedTo && task.assignedTo.toString() !== req.user?.userId) return;

                if (!task.dueDate) return;
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0,0,0,0);

                if (dueDate < startOfToday) {
                    rawNotifs.push({
                        type: 'task_overdue',
                        severity: 'danger',
                        title: 'Tarea Vencida',
                        description: task.title,
                        module: 'agenda',
                        entityType: 'CrmTask',
                        entityId: task._id.toString(),
                        href: '/admin/agenda',
                        dueDate: task.dueDate
                    });
                } else if (dueDate.getTime() === startOfToday.getTime()) {
                    rawNotifs.push({
                        type: 'task_today',
                        severity: 'warning',
                        title: 'Tarea para Hoy',
                        description: task.title,
                        module: 'agenda',
                        entityType: 'CrmTask',
                        entityId: task._id.toString(),
                        href: '/admin/agenda',
                        dueDate: task.dueDate
                    });
                }
            });
        }

        // 3. DOCUMENTACION / ENTREGAS / POSTVENTA
        if (canReadDocs || canReadPostventa) {
            const activeSales = await Sale.find({ status: { $in: ['confirmada', 'pendiente_entrega', 'entregada'] } }).lean();

            activeSales.forEach(sale => {
                if (!isOwnerAdmin && sale.assignedTo && sale.assignedTo.toString() !== req.user?.userId) return;

                // Doc
                if (canReadDocs && sale.documentationStatus !== 'completa') {
                    rawNotifs.push({
                        type: 'documentation_pending',
                        severity: 'warning',
                        title: 'Documentaci├│n Incompleta',
                        description: `La venta ${sale._id.toString().slice(-6).toUpperCase()} tiene doc pendiente.`,
                        module: 'documentacion',
                        entityType: 'Sale',
                        entityId: sale._id.toString(),
                        href: '/admin/documentacion',
                        dueDate: sale.createdAt
                    });
                }
                // Entrega
                if (canReadDocs && sale.deliveryStatus !== 'entregado' && sale.status !== 'borrador') {
                    rawNotifs.push({
                        type: 'delivery_pending',
                        severity: 'info',
                        title: 'Entrega Pendiente',
                        description: `Veh├¡culo pendiente de entrega (Venta ${sale._id.toString().slice(-6).toUpperCase()}).`,
                        module: 'documentacion',
                        entityType: 'Sale',
                        entityId: sale._id.toString(),
                        href: '/admin/documentacion',
                        dueDate: sale.estimatedDeliveryDate || sale.createdAt
                    });
                }
                // Postventa
                if (canReadPostventa && sale.postSaleStatus === 'incidencia') {
                    rawNotifs.push({
                        type: 'postventa_incident',
                        severity: 'danger',
                        title: 'Incidencia Postventa',
                        description: `Hay una incidencia abierta en la venta ${sale._id.toString().slice(-6).toUpperCase()}.`,
                        module: 'postventa',
                        entityType: 'Sale',
                        entityId: sale._id.toString(),
                        href: `/admin/postventa`,
                        dueDate: sale.updatedAt
                    });
                }
            });
        }

        // 4. RESERVAS
        if (canReadReservations) {
            const reservations = await Reservation.find({ status: 'activa' }).lean();
            reservations.forEach(res => {
                if (!isOwnerAdmin && res.assignedTo && res.assignedTo.toString() !== req.user?.userId) return;
                rawNotifs.push({
                    type: 'reservation_pending',
                    severity: 'info',
                    title: 'Reserva Activa',
                    description: `Reserva activa pendiente de conversi├│n.`,
                    module: 'reservas',
                    entityType: 'Reservation',
                    entityId: res._id.toString(),
                    href: '/admin/reservas',
                    dueDate: res.validUntil || res.createdAt
                });
            });
        }

        // 5. LEADS
        if (canReadLeads) {
            const leads = await Lead.find({ crmStatus: { $in: ['nuevo', 'contactado', 'interesado', 'seguimiento'] } }).lean();
            leads.forEach(lead => {
                if (!isOwnerAdmin && lead.assignedTo && lead.assignedTo.toString() !== req.user?.userId) return;

                const lastAct = new Date(lead.lastActivityAt || lead.createdAt);
                if ((now - lastAct) > 3 * 24 * 60 * 60 * 1000) {
                    rawNotifs.push({
                        type: 'lead_without_followup',
                        severity: 'warning',
                        title: 'Lead sin seguimiento',
                        description: `El lead ${lead.name} lleva 3 d├¡as sin actividad.`,
                        module: 'leads',
                        entityType: 'Lead',
                        entityId: lead._id.toString(),
                        href: '/admin/leads',
                        dueDate: lastAct
                    });
                }
            });
        }



        // 5. AUDITOR├ìA CR├ìTICA (Solo owner/admin)
        if (isOwnerAdmin) {
            const criticalLogs = await AuditLog.find({
                action: { $in: ['LOGIN_FALLIDO', 'CUOTA_ELIMINADA_DEFINITIVAMENTE', 'MOVIMIENTO_ANULADO', 'ROL_ACTUALIZADO'] },
                createdAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // ultimos 3 dias
            }).lean();

            criticalLogs.forEach(log => {
                rawNotifs.push({
                    type: 'audit_critical',
                    severity: 'danger',
                    title: 'Alerta de Seguridad',
                    description: `${log.action} por ${log.userId}`,
                    module: 'auditoria',
                    entityType: 'AuditLog',
                    entityId: log._id.toString(),
                    href: '/admin/auditoria',
                    dueDate: log.createdAt
                });
            });
        }

        // 6. METAS (TEAM GOALS)
        const canReadGoals = isOwnerAdmin || perms.includes('metas.read');
        if (canReadGoals) {
            const activeGoals = await TeamGoal.find({ active: true }).populate('userId', 'name email role active').lean();
            if (activeGoals.length > 0) {
                const goalsProgress = await getGoalsProgress(activeGoals);
                goalsProgress.forEach(goal => {
                    // Si no es admin y es una meta de otro usuario, ignorar
                    const reqUserId = req.user?.userId || req.user?._id;
                    if (!isOwnerAdmin && reqUserId && goal.userId?._id?.toString() !== reqUserId.toString()) return;

                    const nowTime = new Date().getTime();
                    const startT = new Date(goal.startDate).getTime();
                    const endT = new Date(goal.endDate).getTime();
                    const timePassedPercent = Math.min(((nowTime - startT) / (endT - startT)) * 100, 100);

                    const baseNotif = {
                        module: 'metas',
                        entityType: 'TeamGoal',
                        entityId: goal.goalId.toString(),
                        href: '/admin/metas',
                        dueDate: goal.endDate
                    };

                    if (goal.status === 'vencido') {
                        rawNotifs.push({ ...baseNotif, type: 'goal_overdue', severity: 'danger', title: 'Meta Vencida', description: `La meta de ${goal.userId?.name} cerr├│ sin cumplirse al 100%.` });
                    } else if (goal.overallPercent >= 120) {
                        rawNotifs.push({ ...baseNotif, type: 'goal_exceeded', severity: 'success', title: 'Meta Superada', description: `┬í${goal.userId?.name} super├│ la meta (${goal.overallPercent}%)!` });
                    } else if (goal.status === 'cumplido') {
                        rawNotifs.push({ ...baseNotif, type: 'goal_completed', severity: 'success', title: 'Meta Cumplida', description: `┬í${goal.userId?.name} alcanz├│ el 100% de la meta!` });
                    } else if (goal.status === 'sin_avance' && (nowTime - startT) > 3 * 24 * 60 * 60 * 1000) {
                        rawNotifs.push({ ...baseNotif, type: 'goal_no_progress', severity: 'warning', title: 'Meta Sin Avance', description: `La meta de ${goal.userId?.name} lleva varios d├¡as en 0%.` });
                    } else if (goal.overallPercent < timePassedPercent - 20 && timePassedPercent > 10) {
                        // Atrasado: va un 20% por detr├ís del tiempo ideal
                        rawNotifs.push({ ...baseNotif, type: 'goal_behind', severity: 'warning', title: 'Meta Atrasada', description: `${goal.userId?.name} va por debajo del progreso esperado (${goal.overallPercent}%).` });
                    } else if ((endT - nowTime) <= 3 * 24 * 60 * 60 * 1000 && (endT - nowTime) > 0 && goal.overallPercent < 100) {
                        rawNotifs.push({ ...baseNotif, type: 'goal_due_soon', severity: 'warning', title: 'Meta Pr├│xima a Vencer', description: `La meta de ${goal.userId?.name} vence en menos de 3 d├¡as y va al ${goal.overallPercent}%.` });
                    }
                });
            }
        }

        // Generar notificationKey para cada una
        const notifications = rawNotifs.map(n => {
            const keyBase = `${n.module}_${n.type}_${n.entityId}_${n.dueDate ? new Date(n.dueDate).getTime() : 'nodate'}`;
            n.id = keyBase; // usamos la misma key como id para el map del front
            n.createdAt = n.dueDate || new Date(); // fallback para ordenar
            return n;
        });

        // Filtrar le├¡das
        const keys = notifications.map(n => n.id);
        const readStates = await NotificationReadState.find({ userId, notificationKey: { $in: keys } }).lean();
        const readKeys = new Set(readStates.map(rs => rs.notificationKey));

        const finalNotifs = notifications.map(n => ({
            ...n,
            read: readKeys.has(n.id)
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 100);

        res.json(finalNotifs);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/notifications/:key/read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.email || 'unknown';
        const { key } = req.params;

        await NotificationReadState.findOneAndUpdate(
            { userId, notificationKey: key },
            { readAt: new Date() },
            { upsert: true }
        );

        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/notifications/read-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.email || 'unknown';
        const { keys } = req.body; // array de ids/keys

        if (keys && Array.isArray(keys) && keys.length > 0) {
            const operations = keys.map(key => ({
                updateOne: {
                    filter: { userId, notificationKey: key },
                    update: { readAt: new Date() },
                    upsert: true
                }
            }));
            await NotificationReadState.bulkWrite(operations);

            await logAudit({
                req,
                action: 'NOTIFICACIONES_MARCADAS_LEIDAS',
                module: 'sistema',
                entityType: 'Notification',
                entityLabel: 'Bulk',
                description: `Se marcaron ${keys.length} notificaciones como le├¡das.`,
                metadata: { count: keys.length }
            });
        }

        res.json({ message: 'All requested marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



// ========================================== //
// ============ TEAM DASHBOARD ============== //
// ========================================== //

app.get('/api/admin/team-dashboard', authenticateToken, requirePermission(PERMISSIONS.PRODUCTIVIDAD_READ), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];

        const canReadTeam = ['owner', 'admin'].includes(userRole) || perms.includes('equipo.read');
        if (!canReadTeam) {
            return res.status(403).json({ message: 'Sin permisos para ver el dashboard del equipo.' });
        }

        const activeUsers = await AdminUser.find({ active: true }).select('name email role lastLoginAt').lean();

        const tasks = await CrmTask.find({ status: 'pendiente' }).select('title dueDate assignedTo priority').lean();
        const leads = await Lead.find({ crmStatus: { $in: ['nuevo', 'contactado', 'interesado', 'seguimiento'] } }).select('name crmStatus assignedTo lastActivityAt').lean();
        const reservations = await Reservation.find({ status: 'activa' }).select('status assignedTo expiresAt _id').lean();
        const sales = await Sale.find({ status: { $in: ['confirmada', 'pendiente_entrega', 'entregada'] } }).select('status documentationStatus postSaleStatus assignedTo _id').lean();

        // Audit Logs (recent 100 max for active users context)
        const recentLogs = await AuditLog.find({
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }).sort({ createdAt: -1 }).limit(200).select('userId action module entityLabel createdAt').lean();

        // Obtener Metas Activas y Progreso
        const activeGoals = await TeamGoal.find({ active: true }).lean();
        const goalsProgress = await getGoalsProgress(activeGoals);

        // Agrupar por assignedTo
        const teamData = activeUsers.map(user => {
            const uid = user._id.toString();
            const uTasks = tasks.filter(t => t.assignedTo && t.assignedTo.toString() === uid);
            const uLeads = leads.filter(l => l.assignedTo && l.assignedTo.toString() === uid);
            const uReservations = reservations.filter(r => r.assignedTo && r.assignedTo.toString() === uid);
            const uSales = sales.filter(s => s.assignedTo && s.assignedTo.toString() === uid);

            const today = new Date().setHours(0,0,0,0);
            const overdueTasks = uTasks.filter(t => t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) < today);

            const uLogs = recentLogs.filter(l => l.userId === user.email || l.userId === user.name).slice(0, 5);

            const uGoals = goalsProgress.filter(g => g.userId?._id?.toString() === uid || g.userId?.toString() === uid);

            let goalSummary = {
                activeGoals: uGoals.length,
                completedGoals: uGoals.filter(g => g.status === 'cumplido' || g.status === 'superado').length,
                behindGoals: uGoals.filter(g => g.status === 'atrasado').length,
                overdueGoals: uGoals.filter(g => g.status === 'vencido').length,
                exceededGoals: uGoals.filter(g => g.status === 'superado').length,
                averageCompletion: uGoals.length ? Math.round(uGoals.reduce((a, b) => a + b.overallPercent, 0) / uGoals.length) : 0,
                mainStatus: uGoals.length === 0 ? 'sin_meta' :
                            uGoals.some(g => g.status === 'vencido') ? 'vencido' :
                            uGoals.some(g => g.status === 'atrasado') ? 'atrasado' :
                            uGoals.some(g => g.status === 'proximo_vencer') ? 'proximo_vencer' :
                            uGoals.every(g => g.status === 'cumplido' || g.status === 'superado') ? 'cumplido' : 'en_progreso'
            };

            return {
                ...user,
                stats: {
                    pendingTasks: uTasks.length,
                    overdueTasks: overdueTasks.length,
                    activeLeads: uLeads.length,
                    activeReservations: uReservations.length,
                    activeSales: uSales.length,
                    pendingDocs: uSales.filter(s => s.documentationStatus !== 'completo').length,
                    criticalPostSales: uSales.filter(s => ['incidencia', 'pendiente', 'contactado'].includes(s.postSaleStatus)).length
                },
                recentActivity: uLogs,
                goalSummary
            };
        });

        const unassigned = {
            tasks: tasks.filter(t => !t.assignedTo),
            leads: leads.filter(l => !l.assignedTo),
            reservations: reservations.filter(r => !r.assignedTo),
            sales: sales.filter(s => !s.assignedTo)
        };

        const globalStats = {
            totalUsers: activeUsers.length,
            totalVentas: activeUsers.filter(u => u.role === 'ventas').length,
            totalAdmin: activeUsers.filter(u => u.role === 'administrativo').length,
            totalTasks: tasks.length,
            totalOverdueTasks: tasks.filter(t => t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)).length,
            totalLeads: leads.length,
            totalUnassignedLeads: unassigned.leads.length,
            totalSales: sales.length,
            totalCriticalPostSales: sales.filter(s => ['incidencia', 'pendiente', 'contactado'].includes(s.postSaleStatus)).length
        };

        res.json({
            teamData,
            unassigned,
            globalStats
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/team-dashboard/:userId', authenticateToken, requirePermission(PERMISSIONS.PRODUCTIVIDAD_READ), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];

        const canReadTeam = ['owner', 'admin'].includes(userRole) || perms.includes('equipo.read');
        if (!canReadTeam) {
            return res.status(403).json({ message: 'Sin permisos para ver el dashboard del equipo.' });
        }

        const targetUserId = req.params.userId;
        const targetUser = await AdminUser.findById(targetUserId).select('name email role active lastLoginAt').lean();

        if (!targetUser) return res.status(404).json({ message: 'Usuario no encontrado' });

        const tasks = await CrmTask.find({ assignedTo: targetUserId }).lean();
        const leads = await Lead.find({ assignedTo: targetUserId }).lean();
        const reservations = await Reservation.find({ assignedTo: targetUserId }).populate('clientId', 'fullName').populate('vehicleId', 'brand name model year').lean();
        const sales = await Sale.find({ assignedTo: targetUserId }).populate('clientId', 'fullName').populate('vehicleId', 'brand name model year').lean();

        const recentLogs = await AuditLog.find({
            userId: { $in: [targetUser.email, targetUser.name] },
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }).sort({ createdAt: -1 }).limit(30).lean();

        const activeGoals = await TeamGoal.find({ userId: targetUserId, active: true }).lean();
        const goalsProgress = await getGoalsProgress(activeGoals);

        res.json({
            user: targetUser,
            tasks,
            leads,
            reservations,
            sales,
            recentLogs,
            goals: goalsProgress
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========================================== //
// ============ PRODUCTIVIDAD =============== //
// ========================================== //
app.get('/api/admin/team-productivity', authenticateToken, requirePermission(PERMISSIONS.PRODUCTIVIDAD_READ), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];

        const canReadProd = ['owner', 'admin'].includes(userRole) || perms.includes('productividad.read');
        if (!canReadProd) {
            return res.status(403).json({ message: 'Sin permisos para ver productividad.' });
        }

        let { period, userId, role, module } = req.query;

        // Determinar fechas
        const now = new Date();
        let fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30d default
        if (period === '7d') fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (period === '90d') fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        else if (period === 'year') fromDate = new Date(now.getFullYear(), 0, 1);

        // Filtro usuarios
        let userFilter = { active: true };
        if (userId) userFilter._id = userId;
        if (role) userFilter.role = role;

        const users = await AdminUser.find(userFilter).select('name email role lastLoginAt').lean();
        const userEmailsAndNames = users.flatMap(u => [u.email, u.name]);

        // Filtro AuditLog
        let auditQuery = {
            createdAt: { $gte: fromDate },
            userId: { $in: userEmailsAndNames }
        };
        if (module) auditQuery.module = module;

        const logs = await AuditLog.find(auditQuery).select('userId module action createdAt').lean();

        // Obtener estado actual de las entidades asignadas a los usuarios
        const userIdsObj = users.map(u => u._id);
        const tasks = await CrmTask.find({ assignedTo: { $in: userIdsObj } }).select('status dueDate assignedTo').lean();
        const leads = await Lead.find({ assignedTo: { $in: userIdsObj } }).select('crmStatus assignedTo').lean();
        const sales = await Sale.find({ assignedTo: { $in: userIdsObj } }).select('status postSaleStatus documentationStatus assignedTo').lean();
        const reservations = await Reservation.find({ assignedTo: { $in: userIdsObj } }).select('status assignedTo').lean();

        // Procesar datos diarios globales
        const dailyActivityMap = {};
        const moduleActivityMap = {};

        logs.forEach(log => {
            const dateStr = new Date(log.createdAt).toISOString().split('T')[0];

            if (!dailyActivityMap[dateStr]) dailyActivityMap[dateStr] = new Set();
            dailyActivityMap[dateStr].add(log._id.toString());

            if (!moduleActivityMap[log.module]) moduleActivityMap[log.module] = 0;
            moduleActivityMap[log.module]++;
        });

        const dailyActivity = Object.entries(dailyActivityMap).map(([date, actionsSet]) => ({
            date,
            actions: actionsSet.size
        })).sort((a,b) => a.date.localeCompare(b.date));

        // Metas
        const activeGoals = await TeamGoal.find({ active: true }).lean();
        const goalsProgress = await getGoalsProgress(activeGoals);

        // Procesar datos por usuario
        const today = new Date().setHours(0,0,0,0);
        const usersProductivity = users.map(user => {
            const uidStr = user._id.toString();
            const uLogs = logs.filter(l => l.userId === user.email || l.userId === user.name);
            const uTasks = tasks.filter(t => t.assignedTo?.toString() === uidStr);
            const uLeads = leads.filter(l => l.assignedTo?.toString() === uidStr);
            const uSales = sales.filter(s => s.assignedTo?.toString() === uidStr);
            const uReservations = reservations.filter(r => r.assignedTo?.toString() === uidStr);

            const completedTasks = uTasks.filter(t => t.status === 'completada').length;
            const pendingTasks = uTasks.filter(t => t.status === 'pendiente');
            const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) < today).length;

            const leadsWorked = uLogs.filter(l => l.module === 'leads').length;
            const salesUpdated = uLogs.filter(l => l.module === 'ventas').length;
            const postSaleDocs = uSales.filter(s => s.documentationStatus === 'completo' || s.postSaleStatus === 'cerrado').length;

            const score = completedTasks + leadsWorked + salesUpdated + postSaleDocs - (overdueTasks * 2);

            let lastActivityDate = null;
            if (uLogs.length > 0) {
                lastActivityDate = uLogs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt;
            }

            const uGoals = goalsProgress.filter(g => g.userId?._id?.toString() === uidStr || g.userId?.toString() === uidStr);
            let goalSummary = {
                activeGoals: uGoals.length,
                completedGoals: uGoals.filter(g => g.status === 'cumplido' || g.status === 'superado').length,
                behindGoals: uGoals.filter(g => g.status === 'atrasado').length,
                overdueGoals: uGoals.filter(g => g.status === 'vencido').length,
                exceededGoals: uGoals.filter(g => g.status === 'superado').length,
                averageCompletion: uGoals.length ? Math.round(uGoals.reduce((a, b) => a + b.overallPercent, 0) / uGoals.length) : 0,
                mainStatus: uGoals.length === 0 ? 'sin_meta' :
                            uGoals.some(g => g.status === 'vencido') ? 'vencido' :
                            uGoals.some(g => g.status === 'atrasado') ? 'atrasado' :
                            uGoals.some(g => g.status === 'proximo_vencer') ? 'proximo_vencer' :
                            uGoals.every(g => g.status === 'cumplido' || g.status === 'superado') ? 'cumplido' : 'en_progreso'
            };

            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                totalActions: uLogs.length,
                lastActivityAt: lastActivityDate,
                tasksCompleted: completedTasks,
                tasksOverdue: overdueTasks,
                leadsWorked,
                reservationsManaged: uReservations.length,
                salesUpdated,
                postSaleManaged: postSaleDocs,
                score,
                goalSummary
            };
        }).sort((a,b) => b.score - a.score);

        // Resumen
        const summary = {
            totalActions: logs.length,
            activeUsers: users.length,
            usersNoActivity: usersProductivity.filter(u => u.totalActions === 0).length,
            totalTasksCompleted: tasks.filter(t => t.status === 'completada').length,
            totalTasksOverdue: tasks.filter(t => t.status === 'pendiente' && t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) < today).length,
            totalLeadsWorked: leads.length,
            totalSalesUpdated: sales.length,
            totalPostSalesManaged: sales.filter(s => s.documentationStatus === 'completo' || s.postSaleStatus === 'cerrado').length
        };

        const lowActivityUsers = usersProductivity.filter(u => u.totalActions === 0 || u.tasksOverdue > 5);

        res.json({
            summary,
            usersProductivity,
            dailyActivity,
            moduleActivityMap,
            lowActivityUsers
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========================================== //
// ====== COMUNICACIONES (COMM LOGS) ======== //
// ========================================== //

app.get('/api/admin/communication-logs', authenticateToken, requirePermission(PERMISSIONS.COMMUNICATIONLOGS_READ), async (req, res) => {
    try {
        await connectDB();
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];
        const userId = req.user?.id || req.user?.userId;

        const canRead = ['owner', 'admin'].includes(userRole) || perms.includes('communicationLogs.read') || perms.includes('ventas.read');
        if (!canRead) return res.status(403).json({ message: 'Sin permisos para ver comunicaciones.' });

        const {
            entityType, entityId, clientId, leadId, saleId, reservationId, vehicleId, assignedTo, channel, outcome, importantOnly, limit
        } = req.query;

        let query = { isDeleted: false };

        if (entityType) query.entityType = entityType;
        if (entityId) query.entityId = entityId;
        if (clientId) query.clientId = clientId;
        if (leadId) query.leadId = leadId;
        if (saleId) query.saleId = saleId;
        if (reservationId) query.reservationId = reservationId;
        if (vehicleId) query.vehicleId = vehicleId;
        if (channel) query.channel = channel;
        if (outcome) query.outcome = outcome;
        if (importantOnly === 'true') query.isImportant = true;

        if (userRole === 'ventas' || (!['owner', 'admin'].includes(userRole) && perms.includes('communicationLogs.read') && !perms.includes('equipo.read'))) {
            // Vendedores solo ven lo suyo
            query.$or = [
                { assignedTo: userId },
                { createdBy: userId }
            ];
            if (assignedTo && assignedTo === userId) query.assignedTo = assignedTo;
        } else {
            if (assignedTo) query.assignedTo = assignedTo;
        }

        let dbQuery = CommunicationLog.find(query).sort({ contactDate: -1, createdAt: -1 });
        if (limit) dbQuery = dbQuery.limit(parseInt(limit));

        const logs = await dbQuery.populate('createdBy', 'name email').populate('assignedTo', 'name email').lean();
        res.json(logs);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/communication-logs', authenticateToken, requirePermission(PERMISSIONS.COMMUNICATIONLOGS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];
        const authUserId = req.user?.id || req.user?.userId;

        if (!authUserId || !mongoose.Types.ObjectId.isValid(authUserId)) {
            return res.status(401).json({ message: 'Usuario autenticado no v├ílido. Se requiere un usuario registrado con ID v├ílido.' });
        }

        const canWrite = ['owner', 'admin'].includes(userRole) || perms.includes('communicationLogs.write') || perms.includes('ventas.write');
        if (!canWrite) return res.status(403).json({ message: 'Sin permisos para crear comunicaciones.' });

        const cleanObjectId = (val) => (val && val.trim() !== '') ? val : null;

        const payload = req.body;
        delete payload.createdBy; // No aceptar desde el front

        let finalAssignedTo = cleanObjectId(payload.assignedTo) || authUserId;

        const newLog = new CommunicationLog({
            ...payload,
            createdBy: authUserId,
            assignedTo: finalAssignedTo
        });

        if (payload.shouldCreateTask && payload.nextActionDate) {
            const newTask = new CrmTask({
                title: `Seguimiento: ${payload.title}`,
                description: payload.notes ? payload.notes.substring(0, 500) : 'Generado desde historial de comunicaci├│n.',
                dueDate: payload.nextActionDate,
                assignedTo: finalAssignedTo,
                user: req.user?.username || req.user?.email || 'CRM_V2',
                priority: payload.isImportant ? 'alta' : 'media',
                leadId: cleanObjectId(payload.leadId),
                clientId: cleanObjectId(payload.clientId),
                saleId: cleanObjectId(payload.saleId),
                vehicleId: cleanObjectId(payload.vehicleId),
                source: 'manual'
            });
            await newTask.save();
            newLog.relatedTaskId = newTask._id;

            await logAudit({
                req,
                action: 'TAREA_CREADA',
                module: 'agenda',
                entityType: 'Task',
                entityId: newTask._id,
                entityLabel: newTask.title,
                description: `Tarea de seguimiento creada. Resumen: ${newTask.title}`
            });
        }

        await newLog.save();
        await logAudit({
            req,
            action: 'COMUNICACION_CREADA',
            module: 'communications',
            entityType: payload.entityType,
            entityId: newLog._id,
            entityLabel: newLog.title,
            description: `Canal: ${newLog.channel}, Resultado: ${newLog.outcome}`
        });

        res.status(201).json(newLog);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/communication-logs/:id', authenticateToken, requirePermission(PERMISSIONS.COMMUNICATIONLOGS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];

        const canWrite = ['owner', 'admin'].includes(userRole) || perms.includes('communicationLogs.write') || perms.includes('ventas.write');
        if (!canWrite) return res.status(403).json({ message: 'Sin permisos para editar comunicaciones.' });

        const allowedUpdates = ['channel', 'direction', 'outcome', 'title', 'notes', 'contactDate', 'nextActionDate', 'isImportant'];
        const updateData = {};
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) updateData[key] = req.body[key];
        });

        const updatedLog = await CommunicationLog.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: updateData },
            { new: true }
        );

        if (!updatedLog) return res.status(404).json({ message: 'Log no encontrado o eliminado.' });

        await logAudit({
            req,
            action: 'COMUNICACION_EDITADA',
            module: 'communications',
            entityType: updatedLog.entityType,
            entityId: updatedLog._id,
            entityLabel: updatedLog.title,
            description: `Resultado modificado a: ${updatedLog.outcome}`
        });

        res.json(updatedLog);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/admin/communication-logs/:id', authenticateToken, requirePermission(PERMISSIONS.COMMUNICATIONLOGS_DELETE), async (req, res) => {
    try {
        await connectDB();
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];

        const canDelete = ['owner', 'admin'].includes(userRole) || perms.includes('communicationLogs.delete');
        if (!canDelete) return res.status(403).json({ message: 'Sin permisos para eliminar comunicaciones.' });

        const log = await CommunicationLog.findOneAndUpdate(
            { _id: req.params.id },
            { $set: { isDeleted: true } }
        );

        if (!log) return res.status(404).json({ message: 'Log no encontrado.' });

        await logAudit({
            req,
            action: 'COMUNICACION_ARCHIVADA',
            module: 'communications',
            entityType: log.entityType,
            entityId: log._id,
            entityLabel: log.title,
            description: `Log archivado/eliminado.`
        });

        res.json({ message: 'Log eliminado exitosamente.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========================================== //
// ======== PLANTILLAS DE MENSAJES ========== //
// ========================================== //

app.get('/api/admin/message-templates', authenticateToken, requirePermission(PERMISSIONS.MESSAGETEMPLATES_READ), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];
        const canRead = ['owner', 'admin', 'ventas', 'administrativo'].includes(userRole) || perms.includes('messageTemplates.read');

        if (!canRead) return res.status(403).json({ message: 'Sin permisos para ver plantillas.' });

        const { category, channel, activeOnly, search } = req.query;
        let query = {};

        if (category) query.category = category;
        if (channel) query.channel = channel;
        if (activeOnly === 'true') query.isActive = true;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { body: { $regex: search, $options: 'i' } }
            ];
        }

        const templates = await MessageTemplate.find(query).sort({ category: 1, name: 1 }).lean();
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/message-templates', authenticateToken, requirePermission(PERMISSIONS.MESSAGETEMPLATES_WRITE), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];
        const userId = req.user?.id || req.user?.userId;

        const canWrite = ['owner', 'admin'].includes(userRole) || perms.includes('messageTemplates.write');
        if (!canWrite) return res.status(403).json({ message: 'Sin permisos para crear plantillas.' });

        const newTemplate = new MessageTemplate({
            ...req.body,
            createdBy: userId
        });

        await newTemplate.save();

        await logAudit({
            req,
            action: 'PLANTILLA_CREADA',
            module: 'configuracion',
            entityType: 'MessageTemplate',
            entityId: newTemplate._id,
            entityLabel: newTemplate.name,
            description: `Categor├¡a: ${newTemplate.category}`
        });

        res.status(201).json(newTemplate);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/message-templates/:id', authenticateToken, requirePermission(PERMISSIONS.MESSAGETEMPLATES_WRITE), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];
        const userId = req.user?.id || req.user?.userId;

        const canWrite = ['owner', 'admin'].includes(userRole) || perms.includes('messageTemplates.write');
        if (!canWrite) return res.status(403).json({ message: 'Sin permisos para editar plantillas.' });

        const updatedTemplate = await MessageTemplate.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedBy: userId },
            { new: true }
        );

        if (!updatedTemplate) return res.status(404).json({ message: 'Plantilla no encontrada' });

        await logAudit({
            req,
            action: 'PLANTILLA_EDITADA',
            module: 'configuracion',
            entityType: 'MessageTemplate',
            entityId: updatedTemplate._id,
            entityLabel: updatedTemplate.name,
            description: `Plantilla editada. Activa: ${updatedTemplate.isActive}`
        });

        res.json(updatedTemplate);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/admin/message-templates/:id', authenticateToken, requirePermission(PERMISSIONS.MESSAGETEMPLATES_DELETE), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];
        const userId = req.user?.id || req.user?.userId;

        const canDelete = ['owner', 'admin'].includes(userRole) || perms.includes('messageTemplates.delete');
        if (!canDelete) return res.status(403).json({ message: 'Sin permisos para desactivar plantillas.' });

        const template = await MessageTemplate.findByIdAndUpdate(
            req.params.id,
            { isActive: false, updatedBy: userId },
            { new: true }
        );

        if (!template) return res.status(404).json({ message: 'Plantilla no encontrada' });

        await logAudit({
            req,
            action: 'PLANTILLA_DESACTIVADA',
            module: 'configuracion',
            entityType: 'MessageTemplate',
            entityId: template._id,
            entityLabel: template.name,
            description: `Plantilla desactivada.`
        });

        res.json({ message: 'Plantilla desactivada', template });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint semilla interna para inicializar plantillas base
app.post('/api/admin/message-templates/init', authenticateToken, requirePermission(PERMISSIONS.MESSAGETEMPLATES_WRITE), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        if (!['owner', 'admin'].includes(userRole)) return res.status(403).json({ message: 'Sin permisos.' });

        const count = await MessageTemplate.countDocuments();
        if (count > 0) return res.json({ message: 'Las plantillas ya fueron inicializadas.' });

        const baseTemplates = [
            {
                name: 'Primer contacto lead',
                category: 'lead',
                channel: 'whatsapp',
                body: 'Hola {{nombre_cliente}}, ┬┐c├│mo est├ís? Te habla {{vendedor}} de AutoSporting. Recibimos tu consulta por {{vehiculo}}. ┬┐Quer├®s que te pase m├ís informaci├│n y coordinamos para verlo?',
                variables: ['nombre_cliente', 'vendedor', 'vehiculo'],
                isSystem: true
            },
            {
                name: 'Seguimiento lead sin respuesta',
                category: 'lead',
                channel: 'whatsapp',
                body: 'Hola {{nombre_cliente}}, ┬┐c├│mo est├ís? Te escribo nuevamente por la consulta del {{vehiculo}}. Si segu├¡s interesado, puedo pasarte detalles, opciones de financiaci├│n o coordinar una visita.',
                variables: ['nombre_cliente', 'vehiculo'],
                isSystem: true
            },
            {
                name: 'Pedido de documentaci├│n',
                category: 'documentation',
                channel: 'whatsapp',
                body: 'Hola {{nombre_cliente}}, para avanzar con la operaci├│n necesitamos que nos env├¡es la documentaci├│n correspondiente. Apenas la recibamos, seguimos con el proceso.',
                variables: ['nombre_cliente'],
                isSystem: true
            },
            {
                name: 'Confirmaci├│n de reserva',
                category: 'reservation',
                channel: 'whatsapp',
                body: 'Hola {{nombre_cliente}}, te confirmamos que la reserva del {{vehiculo}} qued├│ registrada. Cualquier novedad te vamos avisando por este medio.',
                variables: ['nombre_cliente', 'vehiculo'],
                isSystem: true
            },
            {
                name: 'Aviso de cuota pr├│xima',
                category: 'installment',
                channel: 'whatsapp',
                body: 'Hola {{nombre_cliente}}, te recordamos que el pr├│ximo vencimiento de tu cuota es el d├¡a {{fecha_vencimiento}} por {{monto_cuota}}. Cualquier consulta estamos a disposici├│n.',
                variables: ['nombre_cliente', 'fecha_vencimiento', 'monto_cuota'],
                isSystem: true
            },
            {
                name: 'Aviso de cuota vencida',
                category: 'installment',
                channel: 'whatsapp',
                body: 'Hola {{nombre_cliente}}, te contactamos porque figura pendiente el pago de la cuota con vencimiento {{fecha_vencimiento}}. Avisanos por favor cu├índo podr├¡as regularizarlo.',
                variables: ['nombre_cliente', 'fecha_vencimiento'],
                isSystem: true
            },
            {
                name: 'Postventa 24 hs',
                category: 'post_sale',
                channel: 'whatsapp',
                body: 'Hola {{nombre_cliente}}, ┬┐c├│mo est├ís? Te escribimos desde AutoSporting para saber c├│mo fue todo con tu veh├¡culo y si necesit├ís algo despu├®s de la entrega.',
                variables: ['nombre_cliente'],
                isSystem: true
            },
            {
                name: 'Pedido de rese├▒a Google',
                category: 'review',
                channel: 'whatsapp',
                body: 'Hola {{nombre_cliente}}, nos alegra que hayas confiado en AutoSporting. Si tu experiencia fue buena, nos ayudar├¡a mucho que nos dejes una rese├▒a en Google: {{link_google_reviews}}',
                variables: ['nombre_cliente', 'link_google_reviews'],
                isSystem: true
            },
            {
                name: 'Invitaci├│n a visitar agencia',
                category: 'lead',
                channel: 'whatsapp',
                body: 'Hola {{nombre_cliente}}, si quer├®s pod├®s acercarte a la agencia para ver la unidad personalmente y resolver cualquier duda. Coordinamos el horario que te quede c├│modo.',
                variables: ['nombre_cliente'],
                isSystem: true
            },
            {
                name: 'Reclamo postventa recibido',
                category: 'post_sale',
                channel: 'whatsapp',
                body: 'Hola {{nombre_cliente}}, recibimos tu consulta/reclamo y vamos a revisarlo internamente para darte una respuesta lo antes posible.',
                variables: ['nombre_cliente'],
                isSystem: true
            }
        ];

        const userId = req.user?.id || req.user?.userId;
        const templatesToSave = baseTemplates.map(t => ({ ...t, createdBy: userId }));

        await MessageTemplate.insertMany(templatesToSave);
        res.json({ message: 'Plantillas base creadas exitosamente.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========================================== //
// ============ METAS (GOALS) =============== //
// ========================================== //

app.get('/api/admin/team-goals', authenticateToken, requirePermission(PERMISSIONS.METAS_READ), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];

        const canRead = ['owner', 'admin'].includes(userRole) || perms.includes('metas.read');
        if (!canRead) {
            return res.status(403).json({ message: 'Sin permisos para ver metas.' });
        }

        const goals = await TeamGoal.find().populate('userId', 'name email role active').sort({ createdAt: -1 }).lean();
        res.json(goals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/team-goals', authenticateToken, requirePermission(PERMISSIONS.METAS_WRITE), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];

        const canWrite = ['owner', 'admin'].includes(userRole) || perms.includes('metas.write');
        if (!canWrite) {
            return res.status(403).json({ message: 'Sin permisos para crear metas.' });
        }

        const newGoal = new TeamGoal({
            ...req.body,
            createdBy: req.user.email
        });

        await newGoal.save();

        await logAudit({
            userId: req.user.email,
            action: 'META_CREADA',
            module: 'equipo',
            description: `Meta creada para ${req.body.userId}`,
            entityId: newGoal._id,
            entityType: 'TeamGoal',
            metadata: { targets: req.body.targets }
        });

        res.status(201).json(newGoal);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.patch('/api/admin/team-goals/:id', authenticateToken, requirePermission(PERMISSIONS.METAS_WRITE), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];

        const canWrite = ['owner', 'admin'].includes(userRole) || perms.includes('metas.write');
        if (!canWrite) {
            return res.status(403).json({ message: 'Sin permisos para editar metas.' });
        }

        const goal = await TeamGoal.findById(req.params.id);
        if (!goal) return res.status(404).json({ message: 'Meta no encontrada' });

        const previousTargets = goal.targets;
        const wasActive = goal.active;

        Object.assign(goal, req.body);
        goal.updatedBy = req.user.email;

        await goal.save();

        let actionLog = 'META_EDITADA';
        if (wasActive && req.body.active === false) actionLog = 'META_DESACTIVADA';
        else if (!wasActive && req.body.active === true) actionLog = 'META_REACTIVADA';

        await logAudit({
            userId: req.user.email,
            action: actionLog,
            module: 'equipo',
            description: `Meta ${actionLog} para ${goal.userId}`,
            entityId: goal._id,
            entityType: 'TeamGoal',
            metadata: { prev: previousTargets, new: goal.targets }
        });

        res.json(goal);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Funci├│n helper para calcular progreso
async function getGoalsProgress(activeGoals) {
    if (!activeGoals || !activeGoals.length) return [];

    const userIds = activeGoals.map(g => g.userId?._id || g.userId).filter(id => id);

    const users = await AdminUser.find({ _id: { $in: userIds } }).select('email name').lean();
    const userEmails = users.map(u => u.email);
    const userNames = users.map(u => u.name);
    const userIdentifiers = [...userEmails, ...userNames];

    const minDate = new Date(Math.min(...activeGoals.map(g => new Date(g.startDate))));
    const maxDate = new Date(Math.max(...activeGoals.map(g => new Date(g.endDate))));

    const logs = await AuditLog.find({
        createdAt: { $gte: minDate, $lte: maxDate },
        userId: { $in: userIdentifiers }
    }).lean();

    const tasks = await CrmTask.find({ assignedTo: { $in: userIds }, updatedAt: { $gte: minDate, $lte: maxDate } }).lean();
    const sales = await Sale.find({ assignedTo: { $in: userIds }, updatedAt: { $gte: minDate, $lte: maxDate } }).lean();

    return activeGoals.map(goal => {
        const uIdStr = (goal.userId?._id || goal.userId).toString();
        const userFound = users.find(u => u._id.toString() === uIdStr);
        if (!userFound) return null;

        const gStart = new Date(goal.startDate).getTime();
        const gEnd = new Date(goal.endDate).getTime();

        const uLogs = logs.filter(l =>
            (l.userId === userFound.email || l.userId === userFound.name) &&
            new Date(l.createdAt).getTime() >= gStart &&
            new Date(l.createdAt).getTime() <= gEnd
        );

        const uTasks = tasks.filter(t =>
            t.assignedTo?.toString() === uIdStr &&
            t.status === 'completada' &&
            new Date(t.updatedAt).getTime() >= gStart &&
            new Date(t.updatedAt).getTime() <= gEnd
        );

        const uSales = sales.filter(s =>
            s.assignedTo?.toString() === uIdStr &&
            new Date(s.updatedAt).getTime() >= gStart &&
            new Date(s.updatedAt).getTime() <= gEnd
        );

        const realValues = {
            tasksCompleted: uTasks.length,
            leadsWorked: uLogs.filter(l => l.module === 'leads' && ['LEAD_EDITADO', 'LEAD_ESTADO_ACTUALIZADO', 'LEAD_CREADO'].includes(l.action)).length,
            reservationsManaged: uLogs.filter(l => l.module === 'reservas' && ['RESERVA_EDITADA', 'RESERVA_CREADA', 'RESERVA_CONVERTIDA_A_VENTA'].includes(l.action)).length,
            salesUpdated: uLogs.filter(l => l.module === 'ventas' && ['VENTA_EDITADA', 'VENTA_ESTADO_ACTUALIZADO', 'VENTA_CREADA'].includes(l.action)).length,
            documentationCompleted: uSales.filter(s => s.documentationStatus === 'completo').length,
            postSalesManaged: uSales.filter(s => s.postSaleStatus === 'cerrado').length,
            reviewsRequested: 0,
            reviewsReceived: 0
        };

        let totalPercent = 0;
        let targetCount = 0;
        const progressDetail = {};

        Object.entries(goal.targets || {}).forEach(([key, targetVal]) => {
            if (targetVal > 0) {
                targetCount++;
                const real = realValues[key] || 0;
                let p = (real / targetVal) * 100;
                if (p > 100) p = 100;
                totalPercent += p;
                progressDetail[key] = { target: targetVal, real, percent: Math.round(p) };
            }
        });

        const overallPercent = targetCount > 0 ? Math.round(totalPercent / targetCount) : 0;
        let status = 'en_progreso';
        const now = new Date().getTime();
        const timePassedPercent = Math.min(((now - gStart) / (gEnd - gStart)) * 100, 100);

        if (overallPercent >= 120) status = 'superado';
        else if (overallPercent >= 100) status = 'cumplido';
        else if (now > gEnd) status = 'vencido';
        else if (overallPercent === 0 && (now - gStart) > 3 * 24 * 60 * 60 * 1000) status = 'sin_avance';
        else if ((gEnd - now) <= 3 * 24 * 60 * 60 * 1000 && overallPercent < 100) status = 'proximo_vencer';
        else if (overallPercent < timePassedPercent - 20 && timePassedPercent > 10) status = 'atrasado';

        return {
            goalId: goal._id,
            userId: goal.userId, // populate preserve
            periodType: goal.periodType,
            periodLabel: goal.periodLabel,
            startDate: goal.startDate,
            endDate: goal.endDate,
            targets: goal.targets,
            progress: progressDetail,
            overallPercent,
            status,
            notes: goal.notes
        };
    }).filter(g => g !== null);
}

app.get('/api/admin/team-goals/progress', authenticateToken, requirePermission(PERMISSIONS.METAS_READ), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];

        const canRead = ['owner', 'admin'].includes(userRole) || perms.includes('metas.read');
        if (!canRead) {
            return res.status(403).json({ message: 'Sin permisos para ver el progreso de las metas.' });
        }

        const activeGoals = await TeamGoal.find({ active: true }).populate('userId', 'name email role active').lean();

        if (!activeGoals.length) {
            return res.json([]);
        }

        const progressData = await getGoalsProgress(activeGoals);
        res.json(progressData);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========================================== //
// ============ QUICK ASSIGN ================ //
// ========================================== //
app.patch('/api/admin/assignments', authenticateToken, requirePermission(PERMISSIONS.ASIGNACIONES_WRITE), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];

        const canAssign = ['owner', 'admin'].includes(userRole) || perms.includes('asignaciones.write');
        if (!canAssign) {
            return res.status(403).json({ message: 'Sin permisos para asignar responsables.' });
        }

        const { entityType, entityId, assignedTo } = req.body;

        if (!['lead', 'reservation', 'sale', 'task'].includes(entityType)) {
            return res.status(400).json({ message: 'Tipo de entidad no v├ílido.' });
        }

        const newAssigned = assignedTo === "" || assignedTo === null ? null : assignedTo;

        let Model;
        let moduleName;
        let entityLabel = entityType;

        switch(entityType) {
            case 'lead': Model = Lead; moduleName = 'leads'; break;
            case 'reservation': Model = Reservation; moduleName = 'reservas'; break;
            case 'sale': Model = Sale; moduleName = 'ventas'; break;
            case 'task': Model = CrmTask; moduleName = 'agenda'; break;
        }

        const doc = await Model.findById(entityId);
        if (!doc) return res.status(404).json({ message: 'Entidad no encontrada.' });

        if (entityType === 'lead') entityLabel = doc.name;
        if (entityType === 'task') entityLabel = doc.title;

        let oldAssigned = doc.assignedTo ? doc.assignedTo.toString() : null;

        if (oldAssigned !== newAssigned) {
            doc.assignedTo = newAssigned;
            doc.assignedAt = new Date();
            await doc.save();

            let actionType = 'RESPONSABLE_CAMBIADO';
            if (!oldAssigned && newAssigned) actionType = 'RESPONSABLE_ASIGNADO';
            if (oldAssigned && !newAssigned) actionType = 'RESPONSABLE_REMOVIDO';

            await logAudit({
                req,
                action: actionType,
                module: moduleName,
                entityType: Model.modelName,
                entityId: doc._id,
                entityLabel: entityLabel,
                description: `Asignaci├│n r├ípida desde Team Dashboard.`,
                metadata: { oldAssigned, newAssigned }
            });
        }

        res.json(doc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// ========================================== //
// ============ CRM SETTINGS ================ //
// ========================================== //
async function getOrCreateCrmSettings() {
    try {
        let settings = await CrmSettings.findOne();
        if (settings) return settings;

        const defaultSettings = new CrmSettings();
        defaultSettings.updatedBy = undefined; // Avoid ObjectId cast errors
        await defaultSettings.save();
        return defaultSettings;
    } catch (err) {
        console.error("getOrCreateCrmSettings error:", err);
        // Fallback in memory si falla Mongoose
        return {
            agencyName: "AutoSporting",
            mainPhone: "",
            commercialEmail: "",
            address: "",
            googleReviewsUrl: "",
            defaultCurrency: "ARS",
            businessHours: {
                mondayToFriday: "09:00 - 18:00",
                saturday: "09:00 - 13:00",
                sunday: "Cerrado"
            },
            thresholds: {
                leadWithoutFollowupDays: 7,
                oldReservationDays: 7,
                postSalePendingDays: 7,
                installmentDueSoonDays: 3,
                stockCriticalDays: 90,
                taskOverdueGraceDays: 0
            },
            notifications: {
                enableGoalAlerts: true,
                enableInstallmentAlerts: true,
                enableTaskAlerts: true,
                enableDataQualityAlerts: false
            }
        };
    }
}
app.get('/api/admin/settings', authenticateToken, requireAnyPermission([PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE]), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];
        const canRead = ['owner', 'admin'].includes(userRole) || perms.includes('settings.read') || perms.includes('settings.write');

        if (!canRead) {
            return res.status(403).json({ message: 'Sin permisos para ver la configuraci├│n general.' });
        }

        const settings = await getOrCreateCrmSettings();
        res.json({ ok: true, settings });
    } catch (error) {
        console.error("GET /api/admin/settings error:", error);
        res.status(500).json({ ok: false, error: 'No se pudo cargar la configuraci├│n general.' });
    }
});

app.patch('/api/admin/settings', authenticateToken, requirePermission(PERMISSIONS.SETTINGS_WRITE), async (req, res) => {
    try {
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];
        const canWrite = ['owner', 'admin'].includes(userRole) || perms.includes('settings.write');

        if (!canWrite) {
            return res.status(403).json({ message: 'Sin permisos para editar la configuraci├│n general.' });
        }

        let settings = await CrmSettings.findOne();
        if (!settings) {
            settings = new CrmSettings();
        }

        const allowedUpdates = [
            'agencyName', 'mainPhone', 'commercialEmail', 'address', 'googleReviewsUrl',
            'defaultCurrency', 'businessHours', 'thresholds', 'notifications', 'assistantConfig', 'leadRouting'
        ];

        const updates = Object.keys(req.body);
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({ message: 'Updates no v├ílidos o campos no permitidos.' });
        }

        updates.forEach(update => {
            settings[update] = req.body[update];
        });

        // Validar ObjectID y seteamos updatedBy de forma segura
        if (req.user?.userId && mongoose.Types.ObjectId.isValid(req.user.userId)) {
            settings.updatedBy = req.user.userId;
        } else {
            settings.updatedBy = undefined; // Avoid cast error in "Master Admin" which lacks real user object
        }

        await settings.save();

        await logAudit({
            req,
            action: 'CONFIGURACION_ACTUALIZADA',
            module: 'configuracion',
            entityType: 'CrmSettings',
            entityId: settings._id,
            entityLabel: 'Configuraci├│n General',
            description: `Configuraci├│n general actualizada.`,
            metadata: { updatedFields: updates }
        });

        res.json({ ok: true, settings });
    } catch (error) {
        console.error("PATCH /api/admin/settings error:", error);
        res.status(400).json({ ok: false, message: error.message });
    }
});

// ========================================== //
// ============ SYSTEM HEALTH =============== //
// ========================================== //
app.get('/api/admin/system-health', authenticateToken, requirePermission(PERMISSIONS.SYSTEMHEALTH_READ), async (req, res) => {
    try {
        await connectDB();
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];
        const canRead = ['owner', 'admin'].includes(userRole) || perms.includes('systemHealth.read');

        if (!canRead) {
            return res.status(403).json({ message: 'Sin permisos para ver la salud del sistema.' });
        }

        const startPing = Date.now();
        let dbConnected = false;
        if (mongoose.connection.readyState === 1) {
            try {
                await mongoose.connection.db.admin().ping();
                dbConnected = true;
            } catch(e) {}
        }
        const latencyMs = Date.now() - startPing;

        const cloudinaryMissingVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
            .filter((key) => !process.env[key]);
        const emailStatus = EmailAdapter.getStatus();
        const whatsappStatus = WhatsAppAdapter.getStatus();
        const integrations = {
            mongodb: {
                key: 'mongodb',
                name: 'MongoDB Atlas',
                provider: 'mongoose',
                configured: !!process.env.MONGODB_URI,
                status: dbConnected ? 'ok' : 'critical',
                detail: dbConnected ? 'Conexion activa con MongoDB.' : 'MongoDB no responde o no esta conectado.',
                missing: process.env.MONGODB_URI ? [] : ['MONGODB_URI']
            },
            cloudinary: {
                key: 'cloudinary',
                name: 'Cloudinary',
                provider: 'cloudinary',
                configured: cloudinaryMissingVars.length === 0,
                status: cloudinaryMissingVars.length === 0 ? 'ok' : 'warning',
                detail: cloudinaryMissingVars.length === 0
                    ? 'Credenciales de Cloudinary presentes.'
                    : 'Faltan variables para subir imagenes.',
                missing: cloudinaryMissingVars
            },
            email: emailStatus,
            whatsapp: whatsappStatus
        };

        const [
            usersCount, activeUsersCount, carsCount, clientsCount, leadsCount,
            salesCount, reservationsCount, tasksCount, commLogsCount,
            templatesCount, installmentsCount, recentLogs, ownerCount
        ] = await Promise.all([
            AdminUser.countDocuments(),
            AdminUser.countDocuments({ status: 'activo' }),
            Car.countDocuments(),
            Client.countDocuments(),
            Lead.countDocuments(),
            Sale.countDocuments(),
            Reservation.countDocuments(),
            CrmTask.countDocuments(),
            CommunicationLog.countDocuments(),
            MessageTemplate.countDocuments(),
            Installment.countDocuments(),
            AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
            AdminUser.countDocuments({ role: 'owner', status: 'activo' })
        ]);

        const checks = [
            {
                name: 'Conexi├│n a Base de Datos',
                status: dbConnected ? 'ok' : 'critical',
                description: dbConnected ? 'MongoDB conectada.' : 'Falla al conectar a MongoDB.',
                suggestedAction: dbConnected ? '' : 'Revisar servidor de base de datos y credenciales.'
            },
            {
                name: 'Usuario Owner Activo',
                status: ownerCount > 0 ? 'ok' : 'critical',
                description: ownerCount > 0 ? 'Hay al menos un Owner activo.' : 'No hay usuarios Owner activos.',
                suggestedAction: ownerCount > 0 ? '' : 'Usar Master Password para crear un Owner.'
            },
            {
                name: 'Latencia de Base de Datos',
                status: latencyMs < 500 ? 'ok' : (latencyMs < 1500 ? 'warning' : 'critical'),
                description: `Latencia de ${latencyMs}ms.`,
                suggestedAction: latencyMs < 500 ? '' : 'Considerar optimizaci├│n de base de datos.'
            }
        ];

        const warnings = checks.filter(c => c.status !== 'ok');

        res.json({
            ok: true,
            generatedAt: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            database: {
                connected: dbConnected,
                status: dbConnected ? 'Online' : 'Offline',
                latencyMs
            },
            integrations,
            counts: {
                users: usersCount,
                activeUsers: activeUsersCount,
                cars: carsCount,
                clients: clientsCount,
                leads: leadsCount,
                sales: salesCount,
                reservations: reservationsCount,
                tasks: tasksCount,
                communicationLogs: commLogsCount,
                messageTemplates: templatesCount,
                installments: installmentsCount
            },
            recentActivity: recentLogs,
            checks,
            warnings
        });
    } catch (error) {
        console.error("GET /api/admin/system-health error:", error);
        res.status(500).json({ ok: false, error: 'No se pudo cargar la salud del sistema.' });
    }
});

// ========================================== //
// ============ DATA QUALITY ================ //
// ========================================== //
app.get('/api/admin/data-quality', authenticateToken, requirePermission(PERMISSIONS.DATAQUALITY_READ), async (req, res) => {
    try {
        await connectDB();
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];
        const userId = req.user?.userId;

        const canRead = ['owner', 'admin'].includes(userRole) || perms.includes('dataQuality.read');
        if (!canRead) {
            return res.status(403).json({ message: 'Sin permisos para ver la calidad de datos.' });
        }

        const isRestricted = !['owner', 'admin'].includes(userRole);

        const summary = { totalIssues: 0, critical: 0, warning: 0, info: 0 };
        const sections = {
            clients: [], leads: [], stock: [], reservations: [],
            sales: [], installments: [], tasks: [], communications: [],
            documentation: [], users: []
        };

        const addIssue = (section, severity, title, description, entityType, entityId, href, suggestedAction) => {
            sections[section].push({
                severity, title, description, entityType, entityId, href, suggestedAction,
                detectedAt: new Date().toISOString()
            });
            summary.totalIssues++;
            summary[severity]++;
        };

        const settingsDoc = await getOrCreateCrmSettings();
        const settings = settingsDoc.toObject ? settingsDoc.toObject() : settingsDoc;
        const thresholds = settings.thresholds || {
            leadWithoutFollowupDays: 7,
            oldReservationDays: 7,
            postSalePendingDays: 7
        };

        const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // A & B: Clients & Leads duplicados y hu├®rfanos
        // Hacemos query base dependiendo del user restricted
        const clientQuery = isRestricted ? { assignedTo: userId } : {};
        const leadQuery = isRestricted ? { assignedTo: userId } : {};

        // Leads sin responsable
        const orphanLeads = await Lead.find({ ...leadQuery, status: { $nin: ['perdido', 'convertido'] }, assignedTo: null }).lean();
        orphanLeads.forEach(l => {
            addIssue('leads', 'warning', 'Lead sin responsable', `El lead "${l.name}" no tiene vendedor asignado.`, 'lead', l._id, `/admin/leads/${l._id}`, 'Asignar responsable');
        });

        // Leads sin seguimiento
        const oldLeads = await Lead.find({
            ...leadQuery,
            status: { $nin: ['perdido', 'convertido'] },
            updatedAt: { $lt: daysAgo(thresholds.leadWithoutFollowupDays) }
        }).lean();
        for (const l of oldLeads) {
            addIssue('leads', 'warning', 'Lead sin seguimiento reciente', `El lead "${l.name}" lleva m├ís de ${thresholds.leadWithoutFollowupDays} d├¡as sin actualizaci├│n.`, 'lead', l._id, `/admin/leads/${l._id}`, 'Contactar o cerrar');
        }

        // E: Reservas viejas
        const resQuery = isRestricted ? { assignedTo: userId } : {};
        const oldReservations = await Reservation.find({
            ...resQuery,
            status: 'activa',
            createdAt: { $lt: daysAgo(thresholds.oldReservationDays) }
        }).lean();
        oldReservations.forEach(r => {
            addIssue('reservations', 'warning', 'Reserva antigua sin cerrar', `Reserva de m├ís de ${thresholds.oldReservationDays} d├¡as sin convertirse ni cancelarse.`, 'reservation', r._id, `/admin/reservas`, 'Gestionar reserva');
        });

        // F & G: Ventas sin cliente o responsable
        const saleQuery = isRestricted ? { assignedTo: userId } : {};
        const orphanSales = await Sale.find(saleQuery).lean();
        orphanSales.forEach(s => {
            if (!s.clientId) {
                addIssue('sales', 'critical', 'Venta sin cliente asociado', `Expediente ${s._id} no tiene cliente v├ílido.`, 'sale', s._id, `/admin/ventas/${s._id}`, 'Vincular cliente');
            }
            if (!s.assignedTo) {
                addIssue('sales', 'warning', 'Venta sin responsable', `Expediente ${s._id} no tiene responsable.`, 'sale', s._id, `/admin/ventas/${s._id}`, 'Asignar responsable');
            }
            if (s.status === 'entregado' && s.documentationStatus !== 'completo') {
                addIssue('documentation', 'warning', 'Venta entregada con documentaci├│n incompleta', `Expediente ${s._id} figurar como entregado pero falta documentaci├│n.`, 'sale', s._id, `/admin/ventas/${s._id}`, 'Completar documentaci├│n');
            }
            if (s.status === 'entregado' && s.postSaleStatus === 'pendiente' && new Date(s.updatedAt) < daysAgo(thresholds.postSalePendingDays)) {
                addIssue('documentation', 'info', 'Postventa sin seguimiento', `Venta entregada hace m├ís de ${thresholds.postSalePendingDays} d├¡as sin avance en postventa.`, 'sale', s._id, `/admin/ventas/${s._id}`, 'Contactar cliente');
            }
        });

        // H & I: Stock
        // Si el usuario es restricted (ventas) solo mostramos si le concierne, pero Stock es general.
        // Lo dejamos visible solo si no es restricted para evitar abrumar, o general si tiene permiso.
        // Mejor dejarlo general, no hay asignado en Car.
        const soldVisible = await Car.find({ status: { $in: ['Vendido', 'Se├▒ado'] }, isVisibleOnWeb: true }).lean();
        soldVisible.forEach(c => {
            addIssue('stock', 'critical', 'Veh├¡culo vendido/se├▒ado visible en web', `El veh├¡culo ${c.make} ${c.model} est├í publicado.`, 'car', c._id, `/admin/stock/${c._id}`, 'Ocultar publicaci├│n');
        });
        const reservedAvailable = await Car.find({ status: 'Disponible' }).lean(); // Deber├¡amos cruzar con reservas activas.
        const activeResVehicles = oldReservations.map(r => r.vehicleId?.toString()).filter(Boolean);
        reservedAvailable.forEach(c => {
            if (activeResVehicles.includes(c._id.toString())) {
                addIssue('stock', 'warning', 'Veh├¡culo reservado pero figura disponible', `El veh├¡culo ${c.make} ${c.model} tiene reserva activa.`, 'car', c._id, `/admin/stock/${c._id}`, 'Actualizar estado');
            }
        });

        // J: Cuotas sin venta
        if (!isRestricted) { // Solo si es admin para proteger algo de info (no devolvemos importes, pero por las dudas)
            const orphanInstallments = await Installment.find({ saleId: null }).lean();
            orphanInstallments.forEach(i => {
                addIssue('installments', 'critical', 'Cuota sin venta', `Hay una cuota sin expediente asociado.`, 'installment', i._id, `/admin/cuotas`, 'Revisar origen');
            });
        }

        // K: Tareas vencidas sin responsable
        const taskQuery = isRestricted ? { assignedTo: userId } : {};
        const oldTasks = await CrmTask.find({ ...taskQuery, status: 'pendiente', dueDate: { $lt: new Date() } }).lean();
        oldTasks.forEach(t => {
            if (!t.assignedTo) {
                addIssue('tasks', 'warning', 'Tarea vencida sin responsable', `"${t.title}" est├í vencida y no tiene asignado.`, 'task', t._id, `/admin/agenda`, 'Asignar responsable');
            }
        });

        res.json({
            ok: true,
            generatedAt: new Date().toISOString(),
            summary,
            sections
        });
    } catch (error) {
        console.error('Error Data Quality:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================== //
// ============ EXPORTS ===================== //
// ========================================== //

function toCSV(data, fields) {
    const BOM = '\uFEFF';
    const header = fields.join(';');
    const rows = data.map(item => {
        return fields.map(field => {
            let val = item[field];
            if (val === null || val === undefined) val = '';
            if (val instanceof Date) val = val.toISOString();
            else if (typeof val === 'object') {
                if (val && val._id) val = val._id.toString();
                else val = JSON.stringify(val);
            }
            val = String(val).replace(/"/g, '""');
            if (val.includes(';') || val.includes('"') || val.includes('\n')) {
                val = `"${val}"`;
            }
            return val;
        }).join(';');
    });
    return BOM + header + '\n' + rows.join('\n');
}

app.get('/api/admin/exports', authenticateToken, requireAnyPermission([PERMISSIONS.EXPORTS_READ, PERMISSIONS.EXPORTS_AUDIT]), async (req, res) => {
    try {
        await connectDB();
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];
        const canRead = ['owner', 'admin'].includes(userRole) || perms.includes('exports.read');
        const canAudit = ['owner', 'admin'].includes(userRole) || perms.includes('exports.audit');

        if (!canRead && !canAudit) {
            return res.json({ ok: true, available: [] });
        }

        const available = [];
        if (canRead) {
            available.push('stock', 'clientes', 'leads', 'reservas', 'ventas', 'cuotas', 'tareas', 'comunicaciones', 'plantillas', 'metas');
        }
        if (canAudit) {
            available.push('auditoria');
        }
        res.json({ ok: true, available });
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.get('/api/admin/exports/:type', authenticateToken, requireAnyPermission([PERMISSIONS.EXPORTS_READ, PERMISSIONS.EXPORTS_AUDIT]), async (req, res) => {
    try {
        const { type } = req.params;
        const userRole = req.user?.role || 'solo_lectura';
        const perms = req.user?.permissions || [];
        const isRestricted = !['owner', 'admin'].includes(userRole);
        const userId = req.user?.userId;

        const canRead = ['owner', 'admin'].includes(userRole) || perms.includes('exports.read');
        const canAudit = ['owner', 'admin'].includes(userRole) || perms.includes('exports.audit');

        if (type === 'auditoria' && !canAudit) {
            return res.status(403).json({ message: 'Sin permisos para exportar auditor├¡a.' });
        }
        if (type !== 'auditoria' && !canRead) {
            return res.status(403).json({ message: 'Sin permisos para exportar datos.' });
        }

        let data = [];
        let fields = [];

        const baseQuery = isRestricted ? { assignedTo: userId } : {};

        switch(type) {
            case 'stock':
                data = await Car.find().lean();
                fields = ['_id', 'make', 'model', 'version', 'year', 'domain', 'status', 'isVisibleOnWeb', 'createdAt', 'updatedAt'];
                break;
            case 'clientes':
                data = await Client.find(baseQuery).lean();
                fields = ['_id', 'firstName', 'lastName', 'phone', 'email', 'documentType', 'documentNumber', 'assignedTo', 'createdAt', 'updatedAt'];
                break;
            case 'leads':
                data = await Lead.find(baseQuery).lean();
                fields = ['_id', 'name', 'phone', 'email', 'status', 'source', 'assignedTo', 'vehicleId', 'createdAt', 'updatedAt'];
                break;
            case 'reservas':
                data = await Reservation.find(baseQuery).lean();
                fields = ['_id', 'clientId', 'leadId', 'vehicleId', 'status', 'assignedTo', 'createdAt', 'updatedAt'];
                break;
            case 'ventas':
                data = await Sale.find(baseQuery).lean();
                fields = ['_id', 'clientId', 'vehicleId', 'status', 'saleDate', 'deliveryDate', 'assignedTo', 'createdAt', 'updatedAt'];
                break;
            case 'cuotas':
                data = await Installment.find(baseQuery).lean();
                fields = ['_id', 'saleId', 'status', 'dueDate', 'createdAt', 'updatedAt'];
                break;
            case 'tareas':
                data = await CrmTask.find(baseQuery).lean();
                fields = ['_id', 'title', 'status', 'dueDate', 'assignedTo', 'source', 'createdAt', 'updatedAt'];
                break;
            case 'comunicaciones':
                data = await CommunicationLog.find(isRestricted ? { $or: [{ createdBy: userId }, { assignedTo: userId }] } : {}).lean();
                fields = ['_id', 'entityType', 'entityId', 'channel', 'direction', 'outcome', 'title', 'createdBy', 'assignedTo', 'contactDate', 'createdAt'];
                data.forEach(item => { if (item.notes) item.notesPreview = item.notes.substring(0, 120); });
                fields.push('notesPreview');
                break;
            case 'plantillas':
                data = await MessageTemplate.find().lean();
                fields = ['_id', 'name', 'category', 'channel', 'isActive', 'isSystem', 'createdAt', 'updatedAt'];
                data.forEach(item => { if (item.body) item.bodyPreview = item.body.substring(0, 150); });
                fields.push('bodyPreview');
                break;
            case 'metas':
                data = await TeamGoal.find(isRestricted ? { userId: userId } : {}).lean();
                fields = ['_id', 'userId', 'period', 'startDate', 'endDate', 'status', 'createdAt', 'updatedAt'];
                break;
            case 'auditoria':
                data = await AuditLog.find().sort({ createdAt: -1 }).lean();
                fields = ['_id', 'action', 'module', 'entityType', 'entityId', 'userId', 'createdAt'];
                data.forEach(item => { if (item.metadata) item.metadataSummary = JSON.stringify(item.metadata).substring(0, 120); });
                fields.push('metadataSummary');
                break;
            default:
                return res.status(400).json({ message: 'Tipo de exportaci├│n no v├ílido.' });
        }

        const csvContent = toCSV(data, fields);
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `autosporting_${type}_${dateStr}.csv`;

        // Registrar auditor├¡a
        await logAudit({
            req,
            action: 'EXPORTACION_GENERADA',
            module: 'exportaciones',
            description: `Export├│ ${data.length} registros de ${type}.`,
            metadata: { type, count: data.length }
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);

    } catch(e) {
        console.error("GET /api/admin/exports/:type error:", e);
        res.status(500).json({ ok: false, error: e.message });
    }
});

import PersonalTransaction from './src/models/PersonalTransaction.js';

app.get('/api/admin/personal-transactions', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        const query = hasPermission(req.user, PERMISSIONS.FINANZAS_READ) ? {} : { userId: req.user.userId || req.user.id };
        const transactions = await PersonalTransaction.find(query).sort({ transactionDate: -1, createdAt: -1 }).lean();
        res.json(transactions);
    } catch (error) {
        console.error('GET /api/admin/personal-transactions error:', error);
        res.status(500).json({ message: 'Error interno al obtener transacciones personales' });
    }
});

app.post('/api/admin/personal-transactions', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        const userId = req.user.userId || req.user.id;
        const userLabel = req.user ? (req.user.email || req.user.role) : 'System';

        let targetUserId = req.body.userId || userId;
        if (targetUserId !== userId && !hasPermission(req.user, PERMISSIONS.FINANZAS_WRITE)) {
            targetUserId = userId; // Force own userId
        }

        const data = { ...req.body, userId: targetUserId, createdBy: userLabel };
        const newTransaction = new PersonalTransaction(data);
        const saved = await newTransaction.save();
        res.status(201).json(saved);
    } catch (error) {
        console.error('POST /api/admin/personal-transactions error:', error);
        res.status(500).json({ message: 'Error interno al crear transacción personal', error: error.message });
    }
});

app.patch('/api/admin/personal-transactions/:id', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const userId = req.user.userId || req.user.id;
        const userLabel = req.user ? (req.user.email || req.user.role) : 'System';

        const query = hasPermission(req.user, PERMISSIONS.FINANZAS_WRITE) ? { _id: id } : { _id: id, userId };

        const updateData = { ...req.body, updatedBy: userLabel };
        if (!hasPermission(req.user, PERMISSIONS.FINANZAS_WRITE)) {
            delete updateData.userId;
        }

        const updated = await PersonalTransaction.findOneAndUpdate(
            query,
            updateData,
            { new: true, runValidators: true }
        );
        if (!updated) {
            return res.status(404).json({ message: 'Transacción personal no encontrada o sin permisos' });
        }
        res.json(updated);
    } catch (error) {
        console.error('PATCH /api/admin/personal-transactions error:', error);
        res.status(500).json({ message: 'Error interno al actualizar transacción personal', error: error.message });
    }
});

app.delete('/api/admin/personal-transactions/:id', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const userId = req.user.userId || req.user.id;
        const query = hasPermission(req.user, PERMISSIONS.FINANZAS_WRITE) ? { _id: id } : { _id: id, userId };

        const deleted = await PersonalTransaction.findOneAndUpdate(query, { status: 'cancelado' }, { new: true });
        if (!deleted) {
            return res.status(404).json({ message: 'Transacción personal no encontrada o sin permisos' });
        }
        res.json({ message: 'Transacción personal eliminada' });
    } catch (error) {
        console.error('DELETE /api/admin/personal-transactions error:', error);
        res.status(500).json({ message: 'Error interno al eliminar transacción personal', error: error.message });
    }
});

// =======================
// QUOTES (COTIZACIONES) ROUTES
// =======================

app.get('/api/admin/quotes', authenticateToken, requireAnyPermission([PERMISSIONS.COTIZACIONES_READ]), async (req, res) => {
    try {
        await connectDB();
        const { search, status, sellerId, dateFrom, dateTo, limit = 50, page = 1 } = req.query;
        let query = {};

        if (status) query.status = status;
        if (sellerId) query.assignedTo = sellerId;

        if (dateFrom || dateTo) {
            query.issueDate = {};
            if (dateFrom) query.issueDate.$gte = new Date(dateFrom);
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                query.issueDate.$lte = to;
            }
        }

        if (search) {
            const isNum = !isNaN(parseInt(search));
            let orConditions = [];

            if (isNum) {
                orConditions.push({ quoteNumber: parseInt(search) });
            }
            orConditions.push({ vehicleDescription: { $regex: new RegExp(search, 'i') } });
            orConditions.push({ notes: { $regex: new RegExp(search, 'i') } });

            // Search in related Client
            const matchedClients = await Client.find({ fullName: { $regex: new RegExp(search, 'i') } }).select('_id').lean();
            if (matchedClients.length > 0) {
                orConditions.push({ clientId: { $in: matchedClients.map(c => c._id) } });
            }

            // Search in related Car
            const matchedCars = await Car.find({
                $or: [
                    { brand: { $regex: new RegExp(search, 'i') } },
                    { model: { $regex: new RegExp(search, 'i') } },
                    { name: { $regex: new RegExp(search, 'i') } }
                ]
            }).select('_id').lean();
            if (matchedCars.length > 0) {
                orConditions.push({ vehicleId: { $in: matchedCars.map(c => c._id) } });
            }

            query.$or = orConditions;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const parsedLimit = parseInt(limit);

        const quotes = await Quote.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parsedLimit)
            .populate('clientId', 'firstName lastName fullName phone email dniCuit')
            .populate('vehicleId', 'brand model name year price')
            .populate('assignedTo', 'firstName lastName email')
            .lean();

        const total = await Quote.countDocuments(query);

        res.json({ quotes, total, pages: Math.ceil(total / parsedLimit) });
    } catch (error) {
        console.error('GET /api/admin/quotes error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/quotes/:id', authenticateToken, requireAnyPermission([PERMISSIONS.COTIZACIONES_READ]), async (req, res) => {
    try {
        await connectDB();
        const quote = await Quote.findById(req.params.id)
            .populate('clientId', 'firstName lastName fullName phone email dniCuit locality')
            .populate('vehicleId', 'brand model year price currency mileage domain')
            .populate('assignedTo', 'firstName lastName email')
            .lean();

        if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });
        res.json(quote);
    } catch (error) {
        console.error('GET /api/admin/quotes/:id error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/quotes/migrate-drafts', authenticateToken, requireAnyPermission([PERMISSIONS.COTIZACIONES_WRITE]), async (req, res) => {
    try {
        res.json({ migrated: 0, message: "No hay borradores legacy para migrar." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/quotes', authenticateToken, requireAnyPermission([PERMISSIONS.COTIZACIONES_WRITE]), async (req, res) => {
    try {
        await connectDB();

        // Auto-generate quoteNumber
        const lastQuote = await Quote.findOne({}, 'quoteNumber').sort({ quoteNumber: -1 });
        const nextNumber = lastQuote && lastQuote.quoteNumber ? lastQuote.quoteNumber + 1 : 1000;

        const payload = req.body;
        payload.quoteNumber = nextNumber;
        payload.createdBy = req.user?.id || 'CRM_V2';
        payload.quoteAuditLog = [{
            action: 'CREACION',
            details: 'Cotización inicial creada',
            user: req.user?.id || 'CRM_V2'
        }];

        const quote = new Quote(payload);
        const saved = await quote.save();

        await logAudit({
            req,
            action: 'CREACION',
            module: 'cotizaciones',
            entityId: saved._id,
            entityType: 'Quote',
            description: `Cotización #${saved.quoteNumber} creada`
        });

        res.status(201).json(saved);
    } catch (error) {
        console.error('POST /api/admin/quotes error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/quotes/:id', authenticateToken, requireAnyPermission([PERMISSIONS.COTIZACIONES_WRITE]), async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const payload = req.body;

        const quote = await Quote.findById(id);
        if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });

        // Add to audit log
        quote.quoteAuditLog.push({
            action: payload.status && payload.status !== quote.status ? 'CAMBIO_ESTADO' : 'ACTUALIZACION',
            details: payload.auditMessage || 'Cotización actualizada',
            user: req.user?.id || 'CRM_V2'
        });

        payload.updatedBy = req.user?.id || 'CRM_V2';

        Object.assign(quote, payload);
        const updated = await quote.save();

        res.json(updated);
    } catch (error) {
        console.error('PATCH /api/admin/quotes error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/admin/quotes/:id', authenticateToken, requireAnyPermission([PERMISSIONS.COTIZACIONES_DELETE]), async (req, res) => {
    try {
        await connectDB();
        const quote = await Quote.findById(req.params.id);
        if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);
        await TrashRecord.create({
            entityType: 'Quote',
            entityId: quote._id,
            snapshot: quote.toObject(),
            deletedBy: req.user.userId,
            expiresAt
        });

        await Quote.findByIdAndDelete(req.params.id);

        await logAudit({
            req,
            action: 'ELIMINACION_PAPELERA',
            module: 'cotizaciones',
            entityId: req.params.id,
            details: `Cotización movida a papelera`
        });

        res.status(200).json({ message: 'Cotización eliminada exitosamente' });
    } catch (error) {
        console.error('DELETE /api/admin/quotes error:', error);
        res.status(500).json({ message: error.message });
    }
});

// =======================
// STOCK (CARS) IMPORT ROUTES
// =======================

app.post('/api/admin/cars/validate-import', authenticateToken, requirePermission(PERMISSIONS.STOCK_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { rows } = req.body;
        if (!Array.isArray(rows)) return res.status(400).json({ message: 'Se esperaba un array de filas.' });

        const results = [];
        let validCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;

        for (const [index, row] of rows.entries()) {
            const rowIndex = index + 2; // Excel row logic

            if (!row.brand || !row.name) {
                results.push({ row: rowIndex, status: 'error', data: row, message: 'Falta marca o modelo' });
                errorCount++;
                continue;
            }

            // Normalization
            const plate = row.plateOrVin ? String(row.plateOrVin).trim().toUpperCase() : null;
            let statusEnum = 'Disponible';
            if (row.status) {
                const s = String(row.status).toLowerCase();
                if (s.includes('vendi')) statusEnum = 'Vendido';
                else if (s.includes('reserv') || s.includes('seña')) statusEnum = 'Reservado';
                else if (s.includes('paus')) statusEnum = 'Pausado';
            }

            let currency = 'USD';
            if (row.currency && String(row.currency).toUpperCase().includes('AR')) currency = 'ARS';

            // Check for duplicate by plateOrVin
            if (plate) {
                const existing = await Car.findOne({
                    $or: [
                        { plateOrVin: plate },
                        { dominio: plate }
                    ]
                }).lean();

                if (existing) {
                    results.push({ row: rowIndex, status: 'duplicate', data: row, message: `Patente/VIN duplicado (${plate})` });
                    duplicateCount++;
                    continue;
                }
            }

            // If we reach here, it's valid
            const cleanData = {
                brand: row.brand,
                name: row.name,
                year: Number(row.year) || new Date().getFullYear(),
                km: Number(row.km) || 0,
                price: Number(row.price) || 0,
                currency,
                fuel: row.fuel || 'Nafta',
                condition: row.condition || 'Usado',
                plateOrVin: plate,
                status: statusEnum,
                vehicleType: row.vehicleType || 'Auto',
                publishedOnML: row.publishedOnML || 'No'
            };

            results.push({ row: rowIndex, status: 'valid', data: cleanData });
            validCount++;
        }

        res.json({ results, summary: { validCount, duplicateCount, errorCount } });
    } catch (error) {
        console.error('POST /api/admin/cars/validate-import error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/cars/bulk', authenticateToken, requirePermission(PERMISSIONS.STOCK_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { cars } = req.body;

        if (!Array.isArray(cars) || cars.length === 0) {
            return res.status(400).json({ message: 'No hay autos para importar.' });
        }

        const toInsert = cars.map(car => ({
            ...car,
            auditLog: [{
                action: 'CREACION',
                details: 'Importación masiva XLSX',
                user: req.user?.id || 'CRM_V2'
            }]
        }));

        const inserted = await Car.insertMany(toInsert);

        // Global audit
        await logAudit({
            req,
            action: 'CREACION_MASIVA',
            module: 'stock',
            entityId: null,
            entityType: 'Car',
            description: `Se importaron ${inserted.length} vehículos desde XLSX`
        });

        res.json({ message: 'Importación exitosa', count: inserted.length });
    } catch (error) {
        console.error('POST /api/admin/cars/bulk error:', error);
        res.status(500).json({ message: error.message });
    }
});


// --- TESORERIA ROUTES ---

// Dashboard (Aggregates)
app.get('/api/admin/tesoreria/dashboard', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const accounts = await Account.find().lean();

        // Cuentas por cobrar/pagar de Installment
        const installments = await Installment.find({ status: { $in: ['pendiente', 'vencida'] } }).lean();
        let cuentasPorCobrar = { ARS: 0, USD: 0 };
        installments.forEach(inst => {
            const bal = Number(inst.amount) - Number(inst.paidAmount || 0);
            if (bal > 0) {
                if (inst.currency === 'USD') cuentasPorCobrar.USD += bal;
                else cuentasPorCobrar.ARS += bal;
            }
        });

        // Cheques en cartera
        const checks = await Check.find({ status: 'en_cartera' }).lean();

        res.json({ accounts, cuentasPorCobrar, checks });
    } catch (error) {
        console.error('GET /api/admin/tesoreria/dashboard error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Transfers between accounts
app.post('/api/admin/tesoreria/transfer', authenticateToken, requirePermission(PERMISSIONS.CAJA_WRITE), async (req, res) => {
    try {
        await connectDB();

        // Support both naming conventions for compatibility
        const sourceId = req.body.sourceAccountId || req.body.fromAccountId;
        const destId = req.body.destAccountId || req.body.toAccountId;
        const { amount, currency, concept, date, notes } = req.body;

        if (!sourceId || !destId || !amount || !currency) {
            return res.status(400).json({ message: 'Faltan datos de transferencia' });
        }
        if (sourceId === destId) {
            return res.status(400).json({ message: 'Origen y destino deben ser diferentes' });
        }

        const [fromAccount, toAccount] = await Promise.all([
            Account.findById(sourceId),
            Account.findById(destId)
        ]);

        if (!fromAccount || !toAccount) {
            return res.status(404).json({ message: 'Cuentas no encontradas' });
        }
        if (fromAccount.currency !== currency || toAccount.currency !== currency) {
            return res.status(400).json({ message: 'Las monedas de las cuentas no coinciden con la transferencia' });
        }

        const txAmount = Number(amount);
        if (txAmount <= 0) return res.status(400).json({ message: 'Monto inválido' });

        const txDate = date ? new Date(date) : new Date();

        // Egreso
        const egreso = new Transaction({
            type: 'Egreso',
            amount: txAmount,
            currency,
            description: `Transferencia enviada a ${toAccount.name}`,
            category: 'Transferencia Interna',
            accountId: sourceId,
            concept: concept || 'Transferencia entre cuentas',
            notes: notes || '',
            module: 'crm_v2',
            source: 'manual',
            paymentMethod: 'otro',
            date: txDate,
            createdBy: req.user?.username || 'Admin',
            status: 'activo',
            transactionAuditLog: [{ action: 'CREACION', details: 'Transferencia saliente', user: req.user?.username || 'Admin' }]
        });
        await egreso.save();
        fromAccount.balance -= txAmount;
        await fromAccount.save();

        // Ingreso
        const ingreso = new Transaction({
            type: 'Ingreso',
            amount: txAmount,
            currency,
            description: `Transferencia recibida de ${fromAccount.name}`,
            category: 'Transferencia Interna',
            accountId: destId,
            concept: concept || 'Transferencia entre cuentas',
            notes: notes || '',
            module: 'crm_v2',
            source: 'manual',
            paymentMethod: 'otro',
            date: txDate,
            createdBy: req.user?.username || 'Admin',
            status: 'activo',
            transactionAuditLog: [{ action: 'CREACION', details: 'Transferencia entrante', user: req.user?.username || 'Admin' }]
        });
        await ingreso.save();
        toAccount.balance += txAmount;
        await toAccount.save();

        const populatedEgreso = await Transaction.findById(egreso._id).populate('accountId');
        const populatedIngreso = await Transaction.findById(ingreso._id).populate('accountId');

        try {
            if (typeof logAudit === 'function') {
                await logAudit({
                    req,
                    action: 'TRANSFERENCIA_INTERNA',
                    module: 'finanzas',
                    entityId: null,
                    entityType: 'Transaction',
                    description: `Transferencia de ${currency} ${amount} desde ${fromAccount.name} a ${toAccount.name}`
                });
            }
        } catch (auditErr) {
            console.error('Audit log error on transfer:', auditErr);
        }

        res.json({
            message: 'Transferencia exitosa',
            transactions: [populatedEgreso, populatedIngreso]
        });
    } catch (error) {
        console.error('POST /api/admin/tesoreria/transfer error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Arqueo
app.post('/api/admin/tesoreria/arqueo', authenticateToken, requirePermission(PERMISSIONS.CAJA_WRITE), async (req, res) => {
    try {
        const { accountId, declaredBalance, systemBalance, notes } = req.body;

        await logAudit({
            req,
            action: 'ARQUEO_CAJA',
            module: 'finanzas',
            entityId: accountId,
            entityType: 'Account',
            description: `Arqueo de cuenta. Sistema: ${systemBalance}, Declarado: ${declaredBalance}. Notas: ${notes || '-'}`
        });

        res.json({ message: 'Arqueo registrado' });
    } catch (error) {
        console.error('POST /api/admin/tesoreria/arqueo error:', error);
        res.status(500).json({ message: error.message });
    }
});

// --- CHECKS ROUTES ---
app.get('/api/admin/checks', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const { status, month, direction, search } = req.query;
        let query = {};
        if (status) query.status = status;
        if (direction) query.direction = direction;
        if (month) { // YYYY-MM
            const [y, m] = month.split('-');
            if (y && m) {
                const startDate = new Date(y, m - 1, 1);
                const endDate = new Date(y, m, 0, 23, 59, 59);
                query.dueDate = { $gte: startDate, $lte: endDate };
            }
        }
        if (search) {
            query.$or = [
                { number: { $regex: search, $options: 'i' } },
                { bank: { $regex: search, $options: 'i' } },
                { issuerName: { $regex: search, $options: 'i' } },
                { beneficiaryName: { $regex: search, $options: 'i' } }
            ];
        }
        const checks = await Check.find(query).sort({ dueDate: 1 }).lean();
        res.json(checks);
    } catch (error) {
        console.error('GET /api/admin/checks error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/checks', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        if (!req.body.amount || req.body.amount <= 0) {
            return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
        }
        if (req.body.direction && !['recibido', 'emitido'].includes(req.body.direction)) {
            return res.status(400).json({ message: 'La dirección debe ser recibido o emitido' });
        }
        if (req.body.direction === 'emitido' && !req.body.beneficiaryName) {
            return res.status(400).json({ message: 'Debe especificar el beneficiario para un cheque emitido' });
        }
        if ((!req.body.direction || req.body.direction === 'recibido') && !req.body.issuerName) {
            return res.status(400).json({ message: 'Debe especificar el librador para un cheque recibido' });
        }

        const newCheck = new Check({ ...req.body, createdBy: req.user.username });
        const saved = await newCheck.save();
        await logAudit({
            req, action: 'CREACION', module: 'finanzas', entityId: saved._id, entityType: 'Check', description: `Cheque ${saved.number} registrado`
        });
        res.status(201).json(saved);
    } catch (error) {
        console.error('POST /api/admin/checks error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/checks/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID de cheque inválido' });
        }
        const existingCheck = await Check.findById(req.params.id);
        if (!existingCheck) return res.status(404).json({ message: 'Cheque no encontrado' });

        if (existingCheck.transactionId && req.body.status && req.body.status !== existingCheck.status) {
            return res.status(409).json({ message: 'No se puede cambiar el estado de un cheque ya imputado en caja.' });
        }

        const newStatus = req.body.status;
        const isNowCobrado = newStatus === 'depositado' || newStatus === 'cobrado';
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        let newTxId = null;
        let accountIdToRollback = null;
        let previousBalance = null;

        if (isNowCobrado && !existingCheck.transactionId) {
            // Must create transaction
            const checkAccountId = req.body.accountId || existingCheck.accountId;
            if (!checkAccountId) {
                return res.status(400).json({ message: 'Debe especificar una cuenta para depositar/cobrar el cheque' });
            }
            const account = await Account.findById(checkAccountId);
            if (!account) return res.status(404).json({ message: 'Cuenta no encontrada' });
            if (account.currency !== existingCheck.currency) {
                return res.status(400).json({ message: 'Moneda de la cuenta no coincide con la moneda del cheque' });
            }

            const direction = existingCheck.direction || 'recibido';

            const newTx = new Transaction({
                type: direction === 'emitido' ? 'Egreso' : 'Ingreso',
                amount: existingCheck.amount,
                currency: existingCheck.currency,
                description: `Cheque ${existingCheck.number} (${existingCheck.bank}) ${direction === 'emitido' ? 'cobrado' : 'depositado'}`,
                concept: direction === 'emitido' ? 'Pago con Cheque' : 'Cobro de Cheque',
                category: 'Cheques',
                paymentMethod: 'cheque',
                date: new Date(),
                accountId: account._id,
                saleId: existingCheck.saleId,
                clientId: existingCheck.clientId,
                notes: `Cheque ID: ${existingCheck._id}`,
                module: 'crm_v2',
                source: 'otro',
                status: 'activo',
                createdBy: user,
                transactionAuditLog: [{ action: 'CREACION', details: `Generado al marcar cheque ${existingCheck.number} como ${newStatus}`, user: user }]
            });

            await newTx.save();

            newTxId = newTx._id;
            accountIdToRollback = account._id;
            previousBalance = account.balance;

            try {
                if (direction === 'emitido') {
                    account.balance -= existingCheck.amount;
                } else {
                    account.balance += existingCheck.amount;
                }
                await account.save();

                req.body.transactionId = newTx._id;
                req.body.depositedAt = newStatus === 'depositado' ? new Date() : existingCheck.depositedAt;
                req.body.paidAt = newStatus === 'cobrado' ? new Date() : existingCheck.paidAt;
            } catch (err) {
                await Transaction.findByIdAndDelete(newTx._id);
                throw new Error(`Error al actualizar saldo de cuenta: ${err.message}`);
            }
        }

        let updated;
        try {
            updated = await Check.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: user, updatedAt: Date.now() }, { new: true, runValidators: true });

            if (!updated) {
                throw new Error('Cheque no encontrado al intentar guardar');
            }
        } catch (updateError) {
            // Rollback
            if (newTxId) {
                await Transaction.findByIdAndDelete(newTxId);
            }
            if (accountIdToRollback && previousBalance !== null) {
                await Account.findByIdAndUpdate(accountIdToRollback, { balance: previousBalance });
            }
            throw updateError;
        }

        try {
            if (typeof logAudit === 'function') {
                await logAudit({
                    req, action: 'MODIFICACION', module: 'finanzas', entityId: updated._id, entityType: 'Check', description: `Cheque ${updated.number} actualizado a estado ${updated.status}`
                });
            }
        } catch (logErr) {
            console.warn('Error en logAudit:', logErr.message);
        }

        res.json(updated);
    } catch (error) {
        console.error('PATCH /api/admin/checks/:id error:', error);
        res.status(500).json({ message: error.message });
    }
});

// --- PAGOS A PROPIETARIOS Y POR COBRAR/PAGAR (PAYABLES/RECEIVABLES) ---

app.get('/api/admin/finance/payables', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const { status, search } = req.query;

        const sales = await Sale.find({
            status: { $in: ['confirmada', 'pendiente_entrega', 'entregada'] }
        }).populate('vehicleId', 'brand name model year plateOrVin ownerName purchasePrice purchaseCurrency price currency agencyOwned consignmentStatus').lean();

        let payables = sales.filter(sale => {
            return sale.vehicleOwnerName || sale.ownerName || (sale.vehicleId && sale.vehicleId.ownerName);
        });

        const payablesWithData = await Promise.all(payables.map(async (sale) => {
            const txs = await Transaction.find({
                saleId: sale._id,
                category: { $regex: /pago a propietario/i },
                status: 'activo'
            }).lean();

            let paidARS = 0;
            let paidUSD = 0;

            txs.forEach(tx => {
                if (tx.currency === 'ARS') paidARS += tx.amount;
                if (tx.currency === 'USD') paidUSD += tx.amount;
            });

            const hasPayments = paidARS > 0 || paidUSD > 0;
            const currentStatus = hasPayments ? 'con_pagos' : 'sin_pagos';

            return {
                saleId: sale._id,
                vehicle: sale.vehicleId,
                ownerName: sale.vehicleOwnerName || sale.ownerName || (sale.vehicleId ? sale.vehicleId.ownerName : 'Desconocido'),
                ownerPhone: sale.vehicleOwnerPhone || '',
                salePrice: sale.salePrice,
                saleCurrency: sale.saleCurrency,
                purchasePrice: sale.vehicleId ? sale.vehicleId.purchasePrice : null,
                purchaseCurrency: sale.vehicleId ? sale.vehicleId.purchaseCurrency : null,
                paidToOwnerARS: paidARS,
                paidToOwnerUSD: paidUSD,
                amountDueToOwner: null,
                dueExplanation: "Monto adeudado no disponible en el modelo actual; registrar pago manual.",
                status: currentStatus
            };
        }));

        let filtered = payablesWithData;
        if (status && status !== 'todos') {
            filtered = filtered.filter(p => p.status === status);
        }
        if (search) {
            const s = search.toLowerCase();
            filtered = filtered.filter(p =>
                (p.ownerName && p.ownerName.toLowerCase().includes(s)) ||
                (p.vehicle && p.vehicle.plateOrVin && p.vehicle.plateOrVin.toLowerCase().includes(s)) ||
                (p.vehicle && p.vehicle.name && p.vehicle.name.toLowerCase().includes(s)) ||
                (p.vehicle && p.vehicle.brand && p.vehicle.brand.toLowerCase().includes(s)) ||
                (p.vehicle && p.vehicle.model && p.vehicle.model.toLowerCase().includes(s))
            );
        }

        res.json(filtered);
    } catch (error) {
        console.error('GET /api/admin/finance/payables error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/finance/payables/:id/pay', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const saleId = req.params.id;
        const { accountId, amount, currency, notes } = req.body;
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
        }
        if (currency !== 'ARS' && currency !== 'USD') {
            return res.status(400).json({ message: 'Moneda inválida (debe ser ARS o USD)' });
        }
        if (!accountId) {
            return res.status(400).json({ message: 'Debe especificar una cuenta' });
        }

        const sale = await Sale.findById(saleId).populate('vehicleId');
        if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });

        const ownerName = sale.vehicleOwnerName || sale.ownerName || (sale.vehicleId ? sale.vehicleId.ownerName : null);
        if (!ownerName) {
            return res.status(400).json({ message: 'No se puede registrar pago: la venta no tiene propietario asociado.' });
        }

        const account = await Account.findById(accountId);
        if (!account || account.isActive === false) return res.status(404).json({ message: 'Cuenta no encontrada o inactiva' });
        if (account.currency !== currency) return res.status(400).json({ message: 'La moneda de la cuenta no coincide' });

        const newTx = new Transaction({
            type: 'Egreso',
            category: 'Pago a Propietario',
            concept: 'Pago a Propietario',
            amount: parsedAmount,
            currency: currency,
            description: `Pago a propietario ${ownerName} por vehículo ${sale.vehicleId ? sale.vehicleId.name : ''}`,
            date: new Date(),
            accountId: account._id,
            saleId: sale._id,
            vehicleId: sale.vehicleId ? sale.vehicleId._id : undefined,
            notes: notes || '',
            module: 'crm_v2',
            source: 'otro',
            status: 'activo',
            createdBy: user,
            transactionAuditLog: [{ action: 'CREACION', details: `Pago a propietario registrado`, user: user }]
        });

        await newTx.save();

        try {
            account.balance -= parsedAmount;
            await account.save();
        } catch (err) {
            await Transaction.findByIdAndDelete(newTx._id);
            throw new Error(`Error al actualizar saldo de cuenta: ${err.message}`);
        }

        if (typeof logAudit === 'function') {
            try {
                await logAudit({
                    req, action: 'CREACION', module: 'finanzas', entityId: newTx._id, entityType: 'Transaction', description: `Pago a propietario ${ownerName} por ${parsedAmount} ${currency}`
                });
            } catch (e) {
                console.warn('Error en logAudit:', e.message);
            }
        }

        res.status(201).json(newTx);
    } catch (error) {
        console.error('POST /api/admin/finance/payables/:id/pay error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/finance/receivables-payables', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const pendingInstallments = await Installment.find({
            status: { $in: ['pendiente', 'vencida', 'parcial'] }
        }).lean();

        let cuotasARS = 0;
        let cuotasUSD = 0;
        pendingInstallments.forEach(inst => {
            const balance = Number(inst.amount || 0) - Number(inst.paidAmount || 0);
            if (inst.currency === 'ARS') cuotasARS += balance;
            if (inst.currency === 'USD') cuotasUSD += balance;
        });

        const receivables = {
            cuotas: {
                ARS: cuotasARS,
                USD: cuotasUSD,
                explanation: ""
            },
            ventas: {
                ARS: 0,
                USD: 0,
                explanation: "Saldo exacto de venta no disponible sin conciliación de precio vs pagos."
            },
            gastosComprador: {
                ARS: 0,
                USD: 0,
                explanation: "Dato no modelado."
            }
        };

        const pendingSettlements = await Settlement.find({
            status: { $in: ['borrador', 'revisada', 'aprobada'] }
        }).lean();

        let comisionesARS = 0;
        let comisionesUSD = 0;
        pendingSettlements.forEach(settle => {
            if (settle.currency === 'ARS') comisionesARS += Number(settle.totalAmount || 0);
            if (settle.currency === 'USD') comisionesUSD += Number(settle.totalAmount || 0);
        });

        const salesForPayables = await Sale.find({
            status: { $in: ['confirmada', 'pendiente_entrega', 'entregada'] }
        }).populate('vehicleId', 'ownerName').lean();

        let countPendingOwnerPayments = 0;

        await Promise.all(salesForPayables.map(async (sale) => {
            const ownerName = sale.vehicleOwnerName || sale.ownerName || (sale.vehicleId && sale.vehicleId.ownerName);
            if (ownerName) {
                const txs = await Transaction.find({
                    saleId: sale._id,
                    category: { $regex: /pago a propietario/i },
                    status: 'activo'
                }).lean();
                if (txs.length === 0) {
                    countPendingOwnerPayments++;
                }
            }
        }));

        const payables = {
            propietarios: {
                ARS: 0,
                USD: 0,
                countPendingOwnerPayments: countPendingOwnerPayments,
                explanation: "Monto a propietario requiere carga manual."
            },
            registros: {
                ARS: 0,
                USD: 0,
                explanation: "Dato no modelado."
            },
            comisiones: {
                ARS: comisionesARS,
                USD: comisionesUSD,
                explanation: ""
            }
        };

        res.json({ porCobrar: receivables, porPagar: payables });
    } catch (error) {
        console.error('GET /api/admin/finance/receivables-payables error:', error);
        res.status(500).json({ message: error.message });
    }
});


// --- TARJETA, RETIROS Y PRESTAMOS ---

app.get('/api/admin/finance/card-expenses', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const txs = await Transaction.find({
            module: 'crm_v2',
            $or: [{ paymentMethod: 'tarjeta' }, { category: 'Tarjeta' }]
        }).sort({ date: -1 }).lean();
        res.json(txs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/finance/card-expenses', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const { accountId, amount, currency, description, concept } = req.body;
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        if (!accountId) return res.status(400).json({ message: 'Debe especificar una cuenta' });
        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
        if (currency !== 'ARS' && currency !== 'USD') return res.status(400).json({ message: 'Moneda inválida (debe ser ARS o USD)' });

        const account = await Account.findById(accountId);
        if (!account || account.isActive === false) return res.status(404).json({ message: 'Cuenta no encontrada o inactiva' });
        if (account.currency !== currency) return res.status(400).json({ message: 'La moneda de la cuenta no coincide' });

        const newTx = new Transaction({
            type: 'Egreso',
            category: 'Tarjeta',
            concept: concept || 'Gasto Tarjeta',
            paymentMethod: 'tarjeta',
            amount: parsedAmount,
            currency,
            description: description || 'Gasto Tarjeta',
            date: new Date(),
            accountId: account._id,
            module: 'crm_v2',
            source: 'otro',
            status: 'activo',
            createdBy: user
        });
        await newTx.save();

        try {
            account.balance -= parsedAmount;
            await account.save();
        } catch (err) {
            await Transaction.findByIdAndDelete(newTx._id);
            throw new Error(`Error al actualizar saldo de cuenta: ${err.message}`);
        }

        res.status(201).json(newTx);
    } catch (error) {
        console.error('POST /api/admin/finance/card-expenses error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/finance/withdrawals', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const txs = await Transaction.find({
            category: 'Retiro'
        }).sort({ date: -1 }).lean();
        res.json(txs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/finance/withdrawals', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const { accountId, amount, currency, personName, reason, notes } = req.body;
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        if (!accountId) return res.status(400).json({ message: 'Debe especificar una cuenta' });
        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
        if (currency !== 'ARS' && currency !== 'USD') return res.status(400).json({ message: 'Moneda inválida (debe ser ARS o USD)' });

        const account = await Account.findById(accountId);
        if (!account || account.isActive === false) return res.status(404).json({ message: 'Cuenta no encontrada o inactiva' });
        if (account.currency !== currency) return res.status(400).json({ message: 'La moneda de la cuenta no coincide' });

        const desc = `Retiro${personName ? ' por ' + personName : ''}${reason ? ': ' + reason : ''}`;

        const newTx = new Transaction({
            type: 'Egreso',
            category: 'Retiro',
            concept: 'Retiro',
            amount: parsedAmount,
            currency,
            description: desc,
            notes: notes || '',
            date: new Date(),
            accountId: account._id,
            module: 'crm_v2',
            source: 'otro',
            status: 'activo',
            createdBy: user
        });
        await newTx.save();

        try {
            account.balance -= parsedAmount;
            await account.save();
        } catch (err) {
            await Transaction.findByIdAndDelete(newTx._id);
            throw new Error(`Error al actualizar saldo de cuenta: ${err.message}`);
        }

        res.status(201).json(newTx);
    } catch (error) {
        console.error('POST /api/admin/finance/withdrawals error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/finance/loans', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const query = {};
        if (req.query.status && ['pendiente', 'devuelto'].includes(req.query.status)) {
            query.status = req.query.status;
        }

        const loans = await Loan.find(query).populate('accountId transactionId returnTransactionId').sort({ date: -1 }).lean();
        res.json(loans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/finance/loans', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const { personName, accountId, amount, currency, expectedReturnDate, reason } = req.body;
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        if (!personName) return res.status(400).json({ message: 'Falta el nombre de la persona' });
        if (!accountId) return res.status(400).json({ message: 'Debe especificar una cuenta' });
        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
        if (currency !== 'ARS' && currency !== 'USD') return res.status(400).json({ message: 'Moneda inválida (debe ser ARS o USD)' });

        const account = await Account.findById(accountId);
        if (!account || account.isActive === false) return res.status(404).json({ message: 'Cuenta no encontrada o inactiva' });
        if (account.currency !== currency) return res.status(400).json({ message: 'La moneda de la cuenta no coincide' });

        const newTx = new Transaction({
            type: 'Egreso',
            category: 'Préstamo',
            concept: 'Préstamo otorgado',
            amount: parsedAmount,
            currency,
            description: `Préstamo otorgado a ${personName}`,
            notes: reason || '',
            date: new Date(),
            accountId: account._id,
            module: 'crm_v2',
            source: 'otro',
            status: 'activo',
            createdBy: user
        });
        await newTx.save();

        let newLoan;
        try {
            newLoan = new Loan({
                personName,
                amount: parsedAmount,
                currency,
                expectedReturnDate,
                reason,
                accountId: account._id,
                transactionId: newTx._id,
                createdBy: user
            });
            await newLoan.save();
        } catch (err) {
            await Transaction.findByIdAndDelete(newTx._id);
            throw new Error(`Error al crear préstamo: ${err.message}`);
        }

        try {
            account.balance -= parsedAmount;
            await account.save();
        } catch (err) {
            await Transaction.findByIdAndDelete(newTx._id);
            await Loan.findByIdAndDelete(newLoan._id);
            throw new Error(`Error al actualizar saldo de cuenta: ${err.message}`);
        }

        res.status(201).json(newLoan);
    } catch (error) {
        console.error('POST /api/admin/finance/loans error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/finance/loans/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const { status, targetAccountId } = req.body;
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        if (status !== 'devuelto') {
            return res.status(400).json({ message: 'Solo se permite marcar el préstamo como devuelto. La anulación requiere reversión contable y no está habilitada en esta fase.' });
        }

        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Préstamo no encontrado' });

        if (loan.status === 'devuelto' || loan.returnTransactionId) {
            return res.status(409).json({ message: 'El préstamo ya fue devuelto' });
        }

        if (!targetAccountId) return res.status(400).json({ message: 'Falta cuenta destino para devolución' });

        const account = await Account.findById(targetAccountId);
        if (!account || account.isActive === false) return res.status(404).json({ message: 'Cuenta no encontrada o inactiva' });
        if (account.currency !== loan.currency) return res.status(400).json({ message: 'La moneda de la cuenta no coincide con el préstamo' });

        const returnTx = new Transaction({
            type: 'Ingreso',
            category: 'Préstamo',
            concept: 'Devolución préstamo',
            amount: loan.amount,
            currency: loan.currency,
            description: `Devolución de préstamo de ${loan.personName}`,
            date: new Date(),
            accountId: account._id,
            module: 'crm_v2',
            source: 'otro',
            status: 'activo',
            createdBy: user
        });
        await returnTx.save();

        const previousBalance = account.balance;
        try {
            account.balance += loan.amount;
            await account.save();
        } catch (err) {
            await Transaction.findByIdAndDelete(returnTx._id);
            throw new Error(`Error al actualizar saldo de cuenta: ${err.message}`);
        }

        try {
            loan.status = 'devuelto';
            loan.returnedAt = new Date();
            loan.returnTransactionId = returnTx._id;
            loan.updatedBy = user;
            await loan.save();
        } catch (err) {
            account.balance = previousBalance;
            await account.save();
            await Transaction.findByIdAndDelete(returnTx._id);
            throw new Error(`Error al actualizar préstamo: ${err.message}`);
        }

        res.json(loan);
    } catch (error) {
        console.error('PATCH /api/admin/finance/loans/:id error:', error);
        res.status(500).json({ message: error.message });
    }
});


// --- PRESUPUESTOS ---

app.get('/api/admin/finance/budgets', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const query = { isActive: { $ne: false } };
        if (req.query.period) query.period = req.query.period;

        const budgets = await FinanceBudget.find(query).sort({ category: 1 }).lean();

        if (req.query.period) {
            const periodStr = req.query.period; // YYYY-MM
            const [year, month] = periodStr.split('-');
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);

            const transactions = await Transaction.find({
                status: 'activo',
                module: 'crm_v2',
                date: { $gte: startDate, $lte: endDate }
            }).lean();

            const executedByCategory = {};
            transactions.forEach(tx => {
                const key = `${tx.category}_${tx.currency}`;
                if (!executedByCategory[key]) executedByCategory[key] = 0;
                if (tx.type === 'Egreso') {
                    executedByCategory[key] += tx.amount;
                }
            });

            budgets.forEach(b => {
                const key = `${b.category}_${b.currency}`;
                b.executedAmount = executedByCategory[key] || 0;
            });
        }

        res.json(budgets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/finance/budgets', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const { period, category, plannedAmount, currency, notes } = req.body;
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        if (!period || !/^\d{4}-\d{2}$/.test(period)) return res.status(400).json({ message: 'Período inválido. Formato esperado YYYY-MM' });
        if (!category) return res.status(400).json({ message: 'La categoría es requerida' });

        const parsedPlannedAmount = Number(plannedAmount);
        if (!Number.isFinite(parsedPlannedAmount) || parsedPlannedAmount < 0) return res.status(400).json({ message: 'Monto planeado debe ser mayor o igual a 0' });
        if (currency !== 'ARS' && currency !== 'USD') return res.status(400).json({ message: 'Moneda inválida' });

        const budget = new FinanceBudget({
            period, category, plannedAmount: parsedPlannedAmount, currency, notes, createdBy: user
        });
        await budget.save();
        res.status(201).json(budget);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Ya existe un presupuesto para esta categoría y moneda en el período seleccionado' });
        }
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/finance/budgets/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        const updates = {};
        if (req.body.category !== undefined) updates.category = req.body.category;
        if (req.body.notes !== undefined) updates.notes = req.body.notes;

        if (req.body.plannedAmount !== undefined) {
            const parsedPlannedAmount = Number(req.body.plannedAmount);
            if (!Number.isFinite(parsedPlannedAmount) || parsedPlannedAmount < 0) return res.status(400).json({ message: 'Monto planeado debe ser mayor o igual a 0' });
            updates.plannedAmount = parsedPlannedAmount;
        }

        updates.updatedBy = user;

        const budget = await FinanceBudget.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        if (!budget) return res.status(404).json({ message: 'Presupuesto no encontrado' });
        res.json(budget);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/admin/finance/budgets/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';
        const budget = await FinanceBudget.findByIdAndUpdate(req.params.id, { isActive: false, updatedBy: user }, { new: true });
        if (!budget) return res.status(404).json({ message: 'Presupuesto no encontrado' });
        res.json({ message: 'Presupuesto eliminado (soft-delete)' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- RECURRENCIAS ---

app.get('/api/admin/finance/recurrences', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const query = req.query.includeInactive === 'true' ? {} : { isActive: { $ne: false } };
        const rules = await FinanceRecurringRule.find(query).populate('accountId').sort({ dayOfMonth: 1 }).lean();
        res.json(rules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/finance/recurrences', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const { name, type, category, amount, currency, dayOfMonth, accountId } = req.body;
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        if (!name || !type || !category || !accountId) return res.status(400).json({ message: 'Faltan campos requeridos' });

        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ message: 'Monto debe ser mayor a 0' });

        if (currency !== 'ARS' && currency !== 'USD') return res.status(400).json({ message: 'Moneda inválida' });

        const parsedDay = Number(dayOfMonth);
        if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) return res.status(400).json({ message: 'Día del mes inválido (1-31)' });

        if (type !== 'Ingreso' && type !== 'Egreso') return res.status(400).json({ message: 'Tipo debe ser Ingreso o Egreso' });

        const account = await Account.findById(accountId);
        if (!account || account.isActive === false) return res.status(404).json({ message: 'Cuenta no encontrada o inactiva' });
        if (account.currency !== currency) return res.status(400).json({ message: 'La moneda de la cuenta no coincide' });

        const rule = new FinanceRecurringRule({
            name, type, category, amount: parsedAmount, currency, dayOfMonth: parsedDay, accountId, createdBy: user
        });
        await rule.save();
        res.status(201).json(rule);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/finance/recurrences/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        const existing = await FinanceRecurringRule.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Regla no encontrada' });

        const updates = {};
        if (req.body.name !== undefined) updates.name = req.body.name;
        if (req.body.category !== undefined) updates.category = req.body.category;
        if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

        if (req.body.type !== undefined) {
            if (req.body.type !== 'Ingreso' && req.body.type !== 'Egreso') return res.status(400).json({ message: 'Tipo debe ser Ingreso o Egreso' });
            updates.type = req.body.type;
        }

        if (req.body.amount !== undefined) {
            const parsedAmount = Number(req.body.amount);
            if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ message: 'Monto debe ser mayor a 0' });
            updates.amount = parsedAmount;
        }

        if (req.body.dayOfMonth !== undefined) {
            const parsedDay = Number(req.body.dayOfMonth);
            if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) return res.status(400).json({ message: 'Día del mes inválido (1-31)' });
            updates.dayOfMonth = parsedDay;
        }

        const finalCurrency = req.body.currency ?? existing.currency;
        const finalAccountId = req.body.accountId ?? existing.accountId;

        if (req.body.currency !== undefined) updates.currency = finalCurrency;
        if (req.body.accountId !== undefined) updates.accountId = finalAccountId;

        if (req.body.accountId !== undefined || req.body.currency !== undefined) {
            if (req.body.accountId !== undefined && !req.body.accountId) return res.status(400).json({ message: 'Cuenta inválida' });
            if (req.body.currency !== undefined && req.body.currency !== 'ARS' && req.body.currency !== 'USD') return res.status(400).json({ message: 'Moneda inválida' });

            const account = await Account.findById(finalAccountId);
            if (!account || account.isActive === false) return res.status(400).json({ message: 'Cuenta no encontrada o inactiva' });
            if (account.currency !== finalCurrency) return res.status(400).json({ message: 'La moneda de la cuenta no coincide' });
        }

        updates.updatedBy = user;
        const rule = await FinanceRecurringRule.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        res.json(rule);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/admin/finance/recurrences/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';
        const rule = await FinanceRecurringRule.findByIdAndUpdate(req.params.id, { isActive: false, updatedBy: user }, { new: true });
        if (!rule) return res.status(404).json({ message: 'Regla no encontrada' });
        res.json({ message: 'Regla desactivada (eliminación lógica)' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/finance/recurrences/generate-month', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const { period } = req.body;
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        if (!period || !/^\d{4}-\d{2}$/.test(period)) {
            return res.status(400).json({ message: 'Período inválido. Formato esperado YYYY-MM' });
        }

        const [yearStr, monthStr] = period.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        const rules = await FinanceRecurringRule.find({ isActive: true });
        let created = 0;
        let skipped = 0;
        let errors = 0;
        const transactions = [];

        for (const rule of rules) {
            const signature = `[RECURRING:${rule._id}:${period}]`;
            const escapedSignature = signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            const existing = await Transaction.findOne({
                status: 'activo',
                notes: { $regex: escapedSignature }
            });

            if (existing) {
                skipped++;
                continue;
            }

            try {
                const account = await Account.findById(rule.accountId);
                if (!account || account.isActive === false) throw new Error('Cuenta inactiva o no existe');
                if (account.currency !== rule.currency) throw new Error('Moneda mismatch');

                // clamp date to max days of the month
                const maxDays = new Date(year, month, 0).getDate();
                const actualDay = Math.min(rule.dayOfMonth, maxDays);
                const txDate = new Date(year, month - 1, actualDay, 12, 0, 0);

                const newTx = new Transaction({
                    type: rule.type,
                    category: rule.category,
                    concept: rule.name,
                    amount: rule.amount,
                    currency: rule.currency,
                    date: txDate,
                    accountId: account._id,
                    module: 'crm_v2',
                    source: 'otro',
                    status: 'activo',
                    notes: `${signature} Generado por recurrencia ${rule.name}`,
                    createdBy: user
                });
                await newTx.save();

                try {
                    if (rule.type === 'Ingreso') account.balance += rule.amount;
                    else account.balance -= rule.amount;
                    await account.save();
                } catch (err) {
                    await Transaction.findByIdAndDelete(newTx._id);
                    throw err;
                }

                transactions.push(newTx);
                created++;
            } catch (err) {
                console.error(`Error generando regla ${rule._id}:`, err);
                errors++;
            }
        }

        res.json({ created, skipped, errors, transactions });
    } catch (error) {
        console.error('POST /api/admin/finance/recurrences/generate-month error:', error);
        res.status(500).json({ message: error.message });
    }
});


// --- ARQUEOS Y CIERRE DE CAJA ---

app.get('/api/admin/finance/cash-counts', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const query = {};
        if (req.query.accountId) query.accountId = req.query.accountId;
        if (req.query.currency) query.currency = req.query.currency;

        const counts = await CashCount.find(query).populate('accountId').sort({ countedAt: -1 }).lean();
        res.json(counts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/finance/cash-counts', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const { accountId, declaredBalance, notes } = req.body;
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        if (!accountId) return res.status(400).json({ message: 'Cuenta requerida' });
        const parsedDeclared = Number(declaredBalance);
        if (!Number.isFinite(parsedDeclared)) return res.status(400).json({ message: 'Saldo declarado inválido' });

        const account = await Account.findById(accountId);
        if (!account || account.isActive === false) return res.status(404).json({ message: 'Cuenta no encontrada o inactiva' });

        const systemBalance = account.balance;
        const difference = parsedDeclared - systemBalance;

        const cashCount = new CashCount({
            accountId,
            accountName: account.name,
            currency: account.currency,
            systemBalance,
            declaredBalance: parsedDeclared,
            difference,
            notes,
            createdBy: user
        });

        await cashCount.save();
        res.status(201).json(cashCount);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/finance/daily-closes', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const closes = await DailyCashClose.find().sort({ date: -1, sequence: -1 }).lean();
        res.json(closes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/finance/daily-closes', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const { notes, force } = req.body;
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        function getArgentinaDateString(date = new Date()) {
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/Argentina/Buenos_Aires',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).formatToParts(date);

            const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
            return `${map.year}-${map.month}-${map.day}`;
        }

        const dateStr = getArgentinaDateString();

        const existingCloses = await DailyCashClose.find({ date: dateStr }).sort({ sequence: -1 });

        let sequence = 1;
        if (existingCloses.length > 0) {
            if (force !== true) {
                return res.status(409).json({
                    message: 'Ya existe un cierre para el día de hoy',
                    latestClose: existingCloses[0]
                });
            }
            sequence = existingCloses[0].sequence + 1;
        }

        const accounts = await Account.find({ isActive: { $ne: false } }).lean();
        let totalsARS = 0;
        let totalsUSD = 0;
        const accountSnapshots = [];

        for (const acc of accounts) {
            accountSnapshots.push({
                accountId: acc._id,
                name: acc.name,
                currency: acc.currency,
                balance: acc.balance,
                type: acc.type
            });

            if (acc.currency === 'ARS') totalsARS += acc.balance;
            if (acc.currency === 'USD') totalsUSD += acc.balance;
        }

        const close = new DailyCashClose({
            date: dateStr,
            sequence,
            accountSnapshots,
            totalsARS,
            totalsUSD,
            notes,
            createdBy: user
        });

        await close.save();
        res.status(201).json(close);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/finance/daily-closes/export', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const closes = await DailyCashClose.find().sort({ date: -1, sequence: -1 }).lean();

        let csv = '\uFEFF'; // BOM for UTF-8
        csv += 'Fecha,Secuencia,CerradoEn,Cuenta,Tipo,Moneda,Saldo,TotalARS,TotalUSD,Usuario,Notas\n';

        const csvSafe = (value) => `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

        for (const close of closes) {
            const closedAtStr = new Date(close.closedAt).toLocaleString('es-AR').replace(/,/g, '');

            for (const snap of close.accountSnapshots) {
                const row = [
                    csvSafe(close.date),
                    close.sequence,
                    csvSafe(closedAtStr),
                    csvSafe(snap.name),
                    csvSafe(snap.type),
                    csvSafe(snap.currency),
                    snap.balance,
                    close.totalsARS,
                    close.totalsUSD,
                    csvSafe(close.createdBy),
                    csvSafe(close.notes)
                ];
                csv += row.join(',') + '\n';
            }
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="cierres-caja.csv"');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- CONCILIACIÓN BANCARIA ---

function parseCSVLine(line, delimiter = ',') {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === delimiter) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
    }
    result.push(current);
    return result;
}

function parseAmountAny(str) {
    let clean = (str || '').toString().trim().replace(/[^0-9.,-]/g, '');
    const commas = (clean.match(/,/g) || []).length;
    const dots = (clean.match(/\./g) || []).length;

    if (commas > 0 && dots > 0) {
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
            // e.g. 1.500.000,00 -> 1500000.00
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            // e.g. 1,500,000.00 -> 1500000.00
            clean = clean.replace(/,/g, '');
        }
    } else if (commas === 1 && dots === 0) {
        const parts = clean.split(',');
        if (parts[1].length === 1 || parts[1].length === 2) {
            // e.g. 1500,00 -> 1500.00
            clean = clean.replace(',', '.');
        } else if (parts[1].length === 3) {
            // e.g. 1500,000 -> 1500000
            clean = clean.replace(',', '');
        } else {
            // generic fallback
            clean = clean.replace(',', '.');
        }
    } else if (dots === 1 && commas === 0) {
        const parts = clean.split('.');
        if (parts[1].length === 3) {
            // e.g. 1.500 -> 1500
            clean = clean.replace('.', '');
        }
        // else keep dot as decimal
    } else if (dots > 1) {
        clean = clean.replace(/\./g, '');
    } else if (commas > 1) {
        clean = clean.replace(/,/g, '');
    }

    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseDateAny(str) {
    const clean = (str || '').toString().trim().split(' ')[0];

    // Explicit matches first
    const matchDMY = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (matchDMY) {
        const d = parseInt(matchDMY[1], 10);
        const m = parseInt(matchDMY[2], 10) - 1;
        const y = parseInt(matchDMY[3], 10);
        const date = new Date(y, m, d);
        if (date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) return date;
        return null;
    }

    const matchYMD = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (matchYMD) {
        const y = parseInt(matchYMD[1], 10);
        const m = parseInt(matchYMD[2], 10) - 1;
        const d = parseInt(matchYMD[3], 10);
        const date = new Date(y, m, d);
        if (date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) return date;
        return null;
    }

    // Fallback exactly to clean
    const dIso = new Date(clean);
    if (!isNaN(dIso)) return dIso;

    return null;
}

app.post('/api/admin/finance/reconciliation/upload', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { accountId, base64Csv, fileName } = req.body;
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        if (!accountId || !base64Csv) return res.status(400).json({ message: 'Cuenta y archivo son requeridos' });

        const account = await Account.findById(accountId);
        if (!account || account.isActive === false) return res.status(404).json({ message: 'Cuenta no encontrada o inactiva' });

        const buffer = Buffer.from(base64Csv, 'base64');
        if (buffer.length > 1024 * 1024) return res.status(400).json({ message: 'El archivo excede el límite de 1MB' });

        const csvText = buffer.toString('utf-8');
        const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length > 1000) return res.status(400).json({ message: 'El archivo excede el límite de 1000 líneas útiles' });

        const firstLine = lines[0] || '';
        const delimiter = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';

        // Load active transactions for this account up-front to match efficiently
        // We could also do it line by line, but doing it in memory is faster if we limit to last N months,
        // however doing Mongoose queries is safer.
        const recentTransactions = await Transaction.find({ accountId, status: 'activo' }).lean();

        const reconciliationLines = [];
        let parsedCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const cols = parseCSVLine(rawLine, delimiter);
            if (cols.length < 3) continue;

            const csvDate = parseDateAny(cols[0]);
            const csvDescription = cols[1]?.trim();
            const csvAmount = parseAmountAny(cols[2]);

            if (!csvDate || !csvDescription || csvAmount === null) continue; // Skip header or invalid

            parsedCount++;

            // Match logic
            const targetType = csvAmount >= 0 ? 'Ingreso' : 'Egreso';
            const absAmount = Math.abs(csvAmount);

            let bestMatch = null;
            let bestScore = Infinity;

            for (const tx of recentTransactions) {
                if (tx.type !== targetType) continue;

                const amountDiff = Math.abs(tx.amount - absAmount);
                if (amountDiff > 1.0) continue;

                const daysDiff = Math.abs(new Date(tx.date) - csvDate) / (1000 * 60 * 60 * 24);
                if (daysDiff > 3) continue;

                // Score: days diff + amount diff (lower is better)
                const score = daysDiff + amountDiff;
                if (score < bestScore) {
                    bestScore = score;
                    bestMatch = tx;
                }
            }

            reconciliationLines.push({
                rowIndex: i,
                rawLine: rawLine.substring(0, 200), // truncate just in case
                csvDate,
                csvDescription: csvDescription.substring(0, 200),
                csvAmount,
                matchStatus: bestMatch ? 'matched' : 'unmatched',
                matchedTransactionId: bestMatch ? bestMatch._id : null
            });
        }

        if (reconciliationLines.length === 0) {
            return res.status(400).json({ message: 'No se encontraron líneas válidas en el CSV' });
        }

        const reconciliation = new BankReconciliation({
            accountId,
            accountName: account.name,
            currency: account.currency,
            status: 'pendiente',
            sourceFileName: fileName || 'upload.csv',
            createdBy: user,
            lines: reconciliationLines
        });

        await reconciliation.save();
        res.status(201).json(reconciliation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/finance/reconciliation/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        await connectDB();
        const reconciliation = await BankReconciliation.findById(req.params.id)
            .populate('lines.matchedTransactionId', 'date description amount type category module source')
            .populate('lines.createdTransactionId', 'date description amount type category module source');

        if (!reconciliation) return res.status(404).json({ message: 'Conciliación no encontrada' });
        res.json(reconciliation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/finance/reconciliation/:id/confirm', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { decisions } = req.body;
        const user = req.user ? (req.user.username || req.user.email || req.user.role) : 'System';

        if (!Array.isArray(decisions)) return res.status(400).json({ message: 'Se esperaba un array de decisiones' });

        const reconciliation = await BankReconciliation.findById(req.params.id);
        if (!reconciliation) return res.status(404).json({ message: 'Conciliación no encontrada' });
        if (reconciliation.status === 'confirmado') return res.status(409).json({ message: 'Esta conciliación ya ha sido confirmada' });

        const account = await Account.findById(reconciliation.accountId);
        if (!account || account.isActive === false) return res.status(404).json({ message: 'Cuenta no encontrada o inactiva' });

        // Prevalidación
        const allowedActions = ['match', 'create', 'ignore'];
        const matchedTxIds = new Set();
        const txCache = {};

        for (const decision of decisions) {
            const { index, action, category, matchedTransactionId } = decision;
            if (!allowedActions.includes(action)) return res.status(400).json({ message: `Acción inválida: ${action}` });

            const line = reconciliation.lines.find(l => l.rowIndex === index);
            if (!line) return res.status(400).json({ message: `Línea no encontrada: ${index}` });

            if (action === 'create' && !category) {
                return res.status(400).json({ message: 'Categoría requerida para crear movimiento' });
            }

            if (action === 'match') {
                if (!matchedTransactionId) return res.status(400).json({ message: 'matchedTransactionId requerido para match' });
                if (matchedTxIds.has(matchedTransactionId.toString())) {
                    return res.status(400).json({ message: 'No se puede usar la misma transacción para múltiples matches' });
                }
                matchedTxIds.add(matchedTransactionId.toString());

                const tx = await Transaction.findById(matchedTransactionId);
                if (!tx || tx.status !== 'activo' || tx.accountId.toString() !== reconciliation.accountId.toString()) {
                    return res.status(400).json({ message: `Transacción inválida para match en línea ${index}` });
                }

                const expectedType = line.csvAmount >= 0 ? 'Ingreso' : 'Egreso';
                if (tx.type !== expectedType) return res.status(400).json({ message: `Tipo de transacción incompatible en línea ${index}` });

                const diffAmount = Math.abs(tx.amount - Math.abs(line.csvAmount));
                if (diffAmount >= 1.0) return res.status(400).json({ message: `Monto incompatible para match en línea ${index}` });

                const diffDays = Math.abs(new Date(tx.date) - line.csvDate) / (1000 * 60 * 60 * 24);
                if (diffDays > 3) return res.status(400).json({ message: `Fecha fuera de rango para match en línea ${index}` });

                txCache[matchedTransactionId] = tx;
            }
        }

        const prevBalance = account.balance;
        const createdTxs = [];

        try {
            for (const decision of decisions) {
                const { index, action, category, matchedTransactionId } = decision;
                const line = reconciliation.lines.find(l => l.rowIndex === index);

                if (action === 'ignore') {
                    line.matchStatus = 'ignored';
                } else if (action === 'match') {
                    line.matchStatus = 'matched';
                    line.matchedTransactionId = matchedTransactionId;
                } else if (action === 'create') {
                    const amountAbs = Math.abs(line.csvAmount);
                    const type = line.csvAmount >= 0 ? 'Ingreso' : 'Egreso';
                    const signature = `[RECON:${reconciliation._id}:line:${index}]`;

                    const existingTx = await Transaction.findOne({
                        accountId: account._id,
                        status: 'activo',
                        notes: signature
                    });

                    if (existingTx) {
                        line.matchStatus = 'created';
                        line.createdTransactionId = existingTx._id;
                        line.actionCategory = category;
                        continue;
                    }

                    const tx = new Transaction({
                        type,
                        amount: amountAbs,
                        currency: account.currency,
                        description: line.csvDescription,
                        category,
                        concept: category,
                        date: line.csvDate,
                        accountId: account._id,
                        module: 'crm_v2',
                        source: 'manual',
                        status: 'activo',
                        notes: signature,
                        createdBy: user
                    });

                    await tx.save();
                    createdTxs.push(tx._id);

                    if (type === 'Ingreso') account.balance += amountAbs;
                    else account.balance -= amountAbs;

                    line.matchStatus = 'created';
                    line.createdTransactionId = tx._id;
                    line.actionCategory = category;
                }
            }

            await account.save();

            reconciliation.status = 'confirmado';
            reconciliation.confirmedAt = new Date();
            reconciliation.confirmedBy = user;
            await reconciliation.save();

        } catch (execError) {
            console.error('Reconciliation confirm failed, rolling back:', execError);
            if (createdTxs.length > 0) {
                await Transaction.deleteMany({ _id: { $in: createdTxs } });
            }
            await Account.updateOne({ _id: account._id }, { $set: { balance: prevBalance } });

            return res.status(500).json({ message: 'Error al ejecutar confirmación. Se hizo rollback total.' });
        }

        const updatedReconciliation = await BankReconciliation.findById(reconciliation._id)
            .populate('lines.matchedTransactionId', 'date description amount type category module source')
            .populate('lines.createdTransactionId', 'date description amount type category module source');

        res.json(updatedReconciliation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- AFIP / IMPUESTOS ---

app.get('/api/admin/finance/tax-summary', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        await connectDB();
        const { period, currency = 'ARS' } = req.query; // YYYY-MM
        if (!period || !/^\d{4}-\d{2}$/.test(period)) {
            return res.status(400).json({ message: 'Periodo inválido (YYYY-MM esperado)' });
        }
        if (currency !== 'ARS' && currency !== 'USD') {
            return res.status(400).json({ message: 'Moneda inválida. Debe ser ARS o USD' });
        }

        const [year, month] = period.split('-');
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const txs = await Transaction.find({
            date: { $gte: startDate, $lte: endDate },
            status: 'activo',
            module: 'crm_v2',
            currency
        }).lean();

        const summary = {
            A: { movs: 0, ingresos: 0, egresos: 0, ivaCobrado: 0, ivaPagado: 0 },
            B: { movs: 0, ingresos: 0, egresos: 0, ivaCobrado: 0, ivaPagado: 0 },
            C: { movs: 0, ingresos: 0, egresos: 0, ivaCobrado: 0, ivaPagado: 0 },
            Exenta: { movs: 0, ingresos: 0, egresos: 0, ivaCobrado: 0, ivaPagado: 0 },
            'Sin clasificar': { movs: 0, ingresos: 0, egresos: 0, ivaCobrado: 0, ivaPagado: 0 }
        };

        for (const tx of txs) {
            const cat = tx.fiscalCategory || 'Sin clasificar';
            if (!summary[cat]) summary[cat] = { movs: 0, ingresos: 0, egresos: 0, ivaCobrado: 0, ivaPagado: 0 };

            summary[cat].movs++;
            if (tx.type === 'Ingreso') {
                summary[cat].ingresos += tx.amount;
                if (tx.ivaRate) summary[cat].ivaCobrado += (tx.amount * tx.ivaRate) / 100;
            } else {
                summary[cat].egresos += tx.amount;
                if (tx.ivaRate) summary[cat].ivaPagado += (tx.amount * tx.ivaRate) / 100;
            }
        }

        res.json(summary);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/admin/finance/tax-movements', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        await connectDB();
        const { period, currency = 'ARS' } = req.query; // YYYY-MM
        if (!period || !/^\d{4}-\d{2}$/.test(period)) {
            return res.status(400).json({ message: 'Periodo inválido (YYYY-MM esperado)' });
        }
        if (currency !== 'ARS' && currency !== 'USD') {
            return res.status(400).json({ message: 'Moneda inválida. Debe ser ARS o USD' });
        }

        const [year, month] = period.split('-');
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const txs = await Transaction.find({
            date: { $gte: startDate, $lte: endDate },
            status: 'activo',
            module: 'crm_v2',
            currency
        }).populate('accountId', 'name currency').sort({ date: -1 }).lean();

        res.json(txs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.patch('/api/admin/transactions/:id/fiscal', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { fiscalCategory, ivaRate, invoiceNumber, taxNotes } = req.body;

        const tx = await Transaction.findOne({ _id: req.params.id, module: 'crm_v2' });
        if (!tx) return res.status(404).json({ message: 'Transacción no encontrada o módulo inválido' });

        if (fiscalCategory !== undefined) {
            if (!['A', 'B', 'C', 'Exenta', 'Sin clasificar'].includes(fiscalCategory)) {
                return res.status(400).json({ message: 'Categoría fiscal inválida' });
            }
            tx.fiscalCategory = fiscalCategory;
        }

        if (ivaRate !== undefined) {
            const parsedRate = Number(ivaRate);
            if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
                return res.status(400).json({ message: 'Tasa de IVA inválida. Debe ser numérico entre 0 y 100.' });
            }
            tx.ivaRate = parsedRate;
        }

        if (invoiceNumber !== undefined) {
            const cleanInv = invoiceNumber.toString().trim();
            if (cleanInv.length > 80) return res.status(400).json({ message: 'Número de factura muy largo (max 80 chars)' });
            tx.invoiceNumber = cleanInv;
        }

        if (taxNotes !== undefined) {
            const cleanNotes = taxNotes.toString().trim();
            if (cleanNotes.length > 500) return res.status(400).json({ message: 'Notas muy largas (max 500 chars)' });
            tx.taxNotes = cleanNotes;
        }

        await tx.save();
        res.json(tx);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- LIQUIDACIONES Y COMISIONES ---

app.get('/api/admin/finance/profitability', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        await connectDB();
        const { period } = req.query; // YYYY-MM
        if (!period || !/^\d{4}-\d{2}$/.test(period)) {
            return res.status(400).json({ message: 'Periodo inválido' });
        }

        const [year, month] = period.split('-');
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // 1. Transacciones (ingresos/egresos operativos, excluyendo reportes)
        const txs = await Transaction.find({
            date: { $gte: startDate, $lte: endDate },
            status: 'activo',
            module: 'crm_v2'
        }).lean();

        const categories = { ARS: {}, USD: {} };
        const neto = { ARS: 0, USD: 0 };
        const totalsARS = { ingresos: 0, egresos: 0 };
        const totalsUSD = { ingresos: 0, egresos: 0 };

        for (const tx of txs) {
            const cur = tx.currency;
            if (!categories[cur][tx.category]) {
                categories[cur][tx.category] = { ingresos: 0, egresos: 0 };
            }
            if (tx.type === 'Ingreso') {
                categories[cur][tx.category].ingresos += tx.amount;
                neto[cur] += tx.amount;
                if(cur==='ARS') totalsARS.ingresos += tx.amount;
                else totalsUSD.ingresos += tx.amount;
            } else {
                categories[cur][tx.category].egresos += tx.amount;
                neto[cur] -= tx.amount;
                if(cur==='ARS') totalsARS.egresos += tx.amount;
                else totalsUSD.egresos += tx.amount;
            }
        }

        // 2. Señas activas
        const reservations = await Reservation.find({
            reservationDate: { $gte: startDate, $lte: endDate },
            status: 'vigente'
        }).lean();

        const activeReservations = {
            count: reservations.length,
            totalARS: reservations.filter(r => r.currency === 'ARS').reduce((acc, r) => acc + r.amount, 0),
            totalUSD: reservations.filter(r => r.currency === 'USD').reduce((acc, r) => acc + r.amount, 0),
        };

        // 3. Cuotas Pendientes
        const installments = await Installment.find({
            dueDate: { $gte: startDate, $lte: endDate },
            status: 'pendiente'
        }).lean();

        const pendingInstallments = {
            count: installments.length,
            totalARS: installments.filter(r => r.currency === 'ARS').reduce((acc, r) => acc + r.amount, 0),
            totalUSD: installments.filter(r => r.currency === 'USD').reduce((acc, r) => acc + r.amount, 0),
        };

        res.json({
            neto,
            categories,
            totalsARS,
            totalsUSD,
            activeReservations,
            pendingInstallments
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/admin/finance/seller-commissions', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        await connectDB();
        const { period, status } = req.query;

        const query = {};
        if (period) query.period = period;
        if (status) query.status = status; // pendiente, pagada, anulada

        const settlements = await Settlement.find(query).sort({ createdAt: -1 }).lean();
        res.json(settlements);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/admin/finance/seller-commissions/manual', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Sin permisos para cargar liquidaciones manuales' });
        }
        await connectDB();
        const { username, period, amount, currency, notes } = req.body;

        if (!username || typeof username !== 'string' || username.trim() === '') {
            return res.status(400).json({ message: 'username es requerido y debe ser texto' });
        }
        if (!period || !/^\d{4}-\d{2}$/.test(period)) {
            return res.status(400).json({ message: 'period es requerido y debe tener formato YYYY-MM' });
        }
        if (!['ARS', 'USD'].includes(currency)) {
            return res.status(400).json({ message: 'currency debe ser ARS o USD' });
        }
        if (amount === undefined || amount === null || typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) {
            return res.status(400).json({ message: 'amount es requerido, debe ser un número finito y distinto de 0' });
        }

        const adjustmentType = amount > 0 ? 'bono' : 'descuento';
        const actionUser = req.user.username || req.user.name || req.user.email || req.user.userId || 'Sistema';

        const settlement = new Settlement({
            username: username.trim(),
            period,
            includedSales: [],
            totalAmount: amount,
            status: 'borrador',
            adjustments: [{
                description: 'Ajuste Manual / Comisión Adicional',
                amount: amount,
                type: adjustmentType
            }],
            notes,
            currency,
            history: [{ action: 'CREACION_MANUAL', user: actionUser, notes }],
            createdBy: req.user.userId || req.user.id
        });

        await settlement.save();
        res.status(201).json(settlement);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/admin/settlements', authenticateToken, requirePermission(PERMISSIONS.LIQUIDACIONES_READ), async (req, res) => {
    try {
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.period) query.period = req.query.period;
        if (req.query.username) query.username = req.query.username;

        const settlements = await Settlement.find(query)
            .sort({ createdAt: -1 })
            .lean();
        res.json(settlements);
    } catch (error) {
        console.error('GET /api/admin/settlements error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/settlements/pending-sales/:username', authenticateToken, requirePermission(PERMISSIONS.LIQUIDACIONES_READ), async (req, res) => {
    try {
        const { username } = req.params;

        // Find user by username
        const user = await AdminUser.findOne({ username });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        // Buscamos liquidaciones activas (no anuladas) de este usuario
        const activeSettlements = await Settlement.find({
            username,
            status: { $ne: 'anulada' }
        }).select('includedSales.saleId').lean();

        const alreadyIncludedSaleIds = activeSettlements.flatMap(s => s.includedSales.map(is => is.saleId.toString()));

        // Buscamos ventas confirmadas o entregadas asignadas al vendedor que no estén ya liquidadas
        const sales = await Sale.find({
            $or: [{ salesperson: username }, { assignedTo: user._id }],
            status: { $in: ['confirmada', 'entregada'] },
            _id: { $nin: alreadyIncludedSaleIds }
        }).populate('vehicleId', 'brand model year').lean();

        res.json(sales);
    } catch (error) {
        console.error('GET /api/admin/settlements/pending-sales error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/settlements', authenticateToken, requirePermission(PERMISSIONS.LIQUIDACIONES_WRITE), async (req, res) => {
    try {
        const { period, username, includedSales, adjustments, totalAmount, currency, notes } = req.body;

        // Double check no sale is already in an active settlement
        const saleIds = includedSales.map(s => s.saleId);
        const existingSettlement = await Settlement.findOne({
            status: { $ne: 'anulada' },
            'includedSales.saleId': { $in: saleIds }
        });

        if (existingSettlement) {
            return res.status(400).json({ message: 'Una o más ventas ya están incluidas en otra liquidación activa' });
        }

        const newSettlement = new Settlement({
            period,
            username,
            includedSales,
            adjustments,
            totalAmount,
            currency,
            status: 'borrador',
            createdBy: req.user.username,
            history: [{
                action: 'CREADA',
                user: req.user.username,
                notes: notes || 'Borrador inicial creado'
            }]
        });

        const saved = await newSettlement.save();

        await logAudit({
            req, action: 'CREACION', module: 'finanzas', entityId: saved._id, entityType: 'Settlement',
            description: `Liquidación ${period} para ${username} creada (${currency} ${totalAmount})`
        });

        res.status(201).json(saved);
    } catch (error) {
        console.error('POST /api/admin/settlements error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/settlements/:id', authenticateToken, requirePermission(PERMISSIONS.LIQUIDACIONES_WRITE), async (req, res) => {
    try {
        const { status, notes, accountId, adjustments, totalAmount } = req.body;
        const settlement = await Settlement.findById(req.params.id);

        if (!settlement) return res.status(404).json({ message: 'Liquidación no encontrada' });

        const allowedStatuses = ['borrador', 'revisada', 'aprobada', 'pagada', 'anulada'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }

        if (settlement.status === 'pagada') {
            if (status !== 'anulada') {
                return res.status(400).json({ message: 'Una liquidación pagada no puede editarse salvo para ser anulada' });
            }
        }

        // Si se actualizan montos o ajustes (sólo en borrador/revisada)
        if (['borrador', 'revisada'].includes(settlement.status)) {
            if (adjustments) settlement.adjustments = adjustments;
            if (totalAmount) settlement.totalAmount = totalAmount;
        }

        const oldStatus = settlement.status;
        settlement.status = status;
        settlement.updatedBy = req.user.username;

        if (status === 'pagada' && oldStatus !== 'pagada') {
            const parsedTotal = Number(settlement.totalAmount);
            if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
                return res.status(400).json({ message: 'Monto total inválido o negativo' });
            }
            if (settlement.currency !== 'ARS' && settlement.currency !== 'USD') {
                return res.status(400).json({ message: 'Moneda de liquidación inválida' });
            }
            if (!accountId) return res.status(400).json({ message: 'Se requiere una cuenta de origen para pagar' });

            const account = await Account.findById(accountId);
            if (!account) return res.status(404).json({ message: 'Cuenta origen no encontrada' });
            if (account.isActive === false) return res.status(400).json({ message: 'La cuenta origen está inactiva' });
            if (account.currency !== settlement.currency) return res.status(400).json({ message: 'La moneda de la cuenta no coincide con la liquidación' });

            const signature = `[SETTLEMENT_PAYMENT:${settlement._id}]`;
            let savedTx = await Transaction.findOne({
                accountId: account._id,
                module: 'crm_v2',
                status: 'activo',
                notes: signature
            });

            if (!savedTx) {
                const prevBalance = account.balance;
                let txIdCreated = null;
                try {
                    const tx = new Transaction({
                        type: 'Egreso',
                        amount: parsedTotal,
                        currency: settlement.currency,
                        description: `Pago liquidación comisiones ${settlement.period} a ${settlement.username}`,
                        category: 'Comisiones',
                        accountId: account._id,
                        concept: 'Honorarios y Comisiones',
                        module: 'crm_v2',
                        source: 'manual',
                        status: 'activo',
                        notes: signature,
                        paymentMethod: 'transferencia',
                        date: new Date(),
                        createdBy: req.user.username,
                        transactionAuditLog: [{ action: 'CREACION', details: 'Pago generado por liquidación', user: req.user.username }]
                    });

                    savedTx = await tx.save();
                    txIdCreated = savedTx._id;

                    account.balance -= parsedTotal;
                    await account.save();

                    settlement.paymentInfo = {
                        paymentDate: new Date(),
                        transactionId: savedTx._id,
                        accountId: account._id
                    };

                    settlement.history.push({
                        action: status.toUpperCase(),
                        user: req.user.username,
                        notes: notes || `Estado cambiado a ${status}`
                    });

                    await settlement.save();

                } catch (err) {
                    if (txIdCreated) await Transaction.deleteOne({ _id: txIdCreated });
                    await Account.updateOne({ _id: account._id }, { $set: { balance: prevBalance } });
                    return res.status(500).json({ message: 'Error procesando el pago (rollback ejecutado).', error: err.message });
                }
            } else {
                // Si la transacción ya existía (idempotencia)
                settlement.paymentInfo = {
                    paymentDate: new Date(),
                    transactionId: savedTx._id,
                    accountId: account._id
                };
                settlement.history.push({
                    action: status.toUpperCase(),
                    user: req.user.username,
                    notes: notes || `Estado cambiado a ${status} (Idempotencia recuperada)`
                });
                await settlement.save();
            }
        } else {
            // Si no es un pago, guardar normalmente
            settlement.history.push({
                action: status.toUpperCase(),
                user: req.user.username,
                notes: notes || `Estado cambiado a ${status}`
            });
            await settlement.save();
        }

        const updated = settlement;

        try {
            await logAudit({
                req, action: 'MODIFICACION', module: 'finanzas', entityId: updated._id, entityType: 'Settlement',
                description: `Liquidación ${updated.period} de ${updated.username} pasó a ${status}`
            });
        } catch (auditErr) {
            console.error('Audit fail on settlement payment:', auditErr);
        }

        res.json(updated);
    } catch (error) {
        console.error('PATCH /api/admin/settlements/:id error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Sync Gestoria
app.post('/api/admin/settlements/sync-gestoria', authenticateToken, requirePermission(PERMISSIONS.LIQUIDACIONES_WRITE), async (req, res) => {
    try {
        // Find Gestoria models dynamically since it may not be imported
        const Gestoria = mongoose.model('Gestoria');
        const gestorias = await Gestoria.find({
            status: 'Finalizado',
            cost: { $gt: 0 },
            gestorName: { $exists: true, $ne: '' }
        });

        // Find already settled
        const existingSettlements = await Settlement.find({ type: 'gestoria', status: { $ne: 'anulada' } });
        const settledIds = new Set();
        existingSettlements.forEach(s => {
            if (s.includedGestorias) {
                s.includedGestorias.forEach(g => settledIds.add(g.gestoriaId.toString()));
            }
        });

        const elegibles = gestorias.filter(g => !settledIds.has(g._id.toString()));

        if (elegibles.length === 0) {
            return res.json({ message: 'No hay expedientes nuevos para sincronizar', count: 0 });
        }

        const groups = {};
        elegibles.forEach(g => {
            const periodDate = g.actualEndDate || g.updatedAt;
            const period = new Date(periodDate).toISOString().slice(0, 7);
            const key = `${g.gestorName}_${g.currency}_${period}`;
            if (!groups[key]) {
                groups[key] = {
                    gestorName: g.gestorName,
                    currency: g.currency,
                    period: period,
                    gestorias: [],
                    totalAmount: 0
                };
            }
            groups[key].gestorias.push(g);
            groups[key].totalAmount += g.cost;
        });

        const newSettlements = [];
        for (const key in groups) {
            const g = groups[key];
            const settlement = new Settlement({
                period: g.period,
                type: 'gestoria',
                beneficiaryName: g.gestorName,
                totalAmount: g.totalAmount,
                currency: g.currency,
                includedGestorias: g.gestorias.map(x => ({
                    gestoriaId: x._id,
                    amount: x.cost
                })),
                status: 'borrador',
                createdBy: req.user.username
            });
            await settlement.save();
            newSettlements.push(settlement);
        }

        res.json({ message: 'Sincronización completada', count: newSettlements.length });
    } catch (error) {
        console.error('POST /sync-gestoria error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Clean Duplicates - Preview
app.post('/api/admin/settlements/clean-duplicates/preview', authenticateToken, requirePermission(PERMISSIONS.LIQUIDACIONES_READ), async (req, res) => {
    try {
        const all = await Settlement.find({ status: { $ne: 'anulada' } }).lean();
        const duplicates = [];
        const seen = new Map(); // period_beneficiary/username_type

        for (const s of all) {
            const key = `${s.period}_${s.beneficiaryName || s.username || 'unknown'}_${s.type}`;
            if (seen.has(key)) {
                duplicates.push(s);
            } else {
                seen.set(key, s);
            }
        }

        res.json({ duplicates });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Clean Duplicates - Confirm
app.post('/api/admin/settlements/clean-duplicates/confirm', authenticateToken, requirePermission(PERMISSIONS.LIQUIDACIONES_WRITE), async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) return res.status(400).json({ message: 'IDs invalidos' });

        await Settlement.updateMany({ _id: { $in: ids } }, { $set: { status: 'anulada' } });
        res.json({ message: `Se anularon ${ids.length} liquidaciones duplicadas` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// My Commissions endpoint (for Ventas)
app.get('/api/admin/my-commissions', authenticateToken, requirePermission(PERMISSIONS.COMISIONES_READ), async (req, res) => {
    try {
        const canReadOthers = hasPermission(req.user, PERMISSIONS.LIQUIDACIONES_READ);
        let targetUsername = req.user.username;

        if (canReadOthers && req.query.seller) {
            targetUsername = req.query.seller;
        }

        const user = await AdminUser.findOne({ username: targetUsername });

        const query = { username: targetUsername };
        if (req.query.period && /^\d{4}-\d{2}$/.test(req.query.period)) {
            query.period = req.query.period;
        }

        // Mis liquidaciones
        const settlements = await Settlement.find(query).sort({ createdAt: -1 }).lean();

        // Mis ventas pendientes (ignorar si se está filtrando un periodo específico histórico)
        let pendingSales = [];
        if (!req.query.period) {
            // Necesitamos todas las liquidaciones para saber qué ventas ya se incluyeron
            const allSettlementsForUser = req.query.period ?
                await Settlement.find({ username: targetUsername }).lean() :
                settlements;

            const alreadyIncludedSaleIds = allSettlementsForUser
                .filter(s => s.status !== 'anulada')
                .flatMap(s => s.includedSales.map(is => is.saleId.toString()));

            pendingSales = await Sale.find({
                $or: [{ salesperson: targetUsername }, { assignedTo: user?._id }],
                status: { $in: ['confirmada', 'entregada'] },
                _id: { $nin: alreadyIncludedSaleIds }
            }).populate('vehicleId', 'brand model year price currency').lean();
        }

        res.json({ settlements, pendingSales, targetUsername });
    } catch (error) {
        console.error('GET /api/admin/my-commissions error:', error);
        res.status(500).json({ message: error.message });
    }
});


// --- MENSAJERIA INTERNA ---

app.get('/api/admin/messages/conversations', authenticateToken, requirePermission(PERMISSIONS.MENSAJES_READ), async (req, res) => {
    try {
        const username = req.user.username;

        // Sync General channel
        const allUsers = await AdminUser.find({ isActive: true }).select('username').lean();
        const activeUsernames = allUsers.map(u => u.username);
        let generalConv = await Conversation.findOne({ type: 'general' });
        if (!generalConv) {
            generalConv = new Conversation({
                type: 'general',
                subject: 'General',
                participants: activeUsernames
            });
            await generalConv.save();
        } else {
            const sortedCurrent = [...generalConv.participants].sort().join(',');
            const sortedActive = [...activeUsernames].sort().join(',');
            if (sortedCurrent !== sortedActive) {
                generalConv.participants = activeUsernames;
                await generalConv.save();
            }
        }

        // Obtenemos conversaciones donde el usuario es participante
        const conversations = await Conversation.find({ participants: username })
            .sort({ lastMessageAt: -1 })
            .lean();

        // Para cada conversación, buscar el último mensaje y el contador de no leídos
        const enrichedConversations = await Promise.all(conversations.map(async (conv) => {
            const clearedAt = conv.clearedAt && conv.clearedAt[username] ? new Date(conv.clearedAt[username]) : null;
            const queryLast = { conversationId: conv._id };
            if (clearedAt) queryLast.createdAt = { $gt: clearedAt };

            const lastMessage = await InternalMessage.findOne(queryLast)
                .sort({ createdAt: -1 })
                .lean();

            const queryUnread = {
                conversationId: conv._id,
                author: { $ne: username },
                readBy: { $ne: username }
            };
            if (clearedAt) queryUnread.createdAt = { $gt: clearedAt };

            const unreadCount = await InternalMessage.countDocuments(queryUnread);

            return {
                ...conv,
                lastMessage,
                unreadCount
            };
        }));

        res.json(enrichedConversations);
    } catch (error) {
        console.error('GET /api/admin/messages/conversations error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/messages/conversations', authenticateToken, requirePermission(PERMISSIONS.MENSAJES_WRITE), async (req, res) => {
    try {
        const { participants, subject, relatedEntity, isGroup, groupName } = req.body;
        const currentUsername = req.user.username;

        if (!participants || participants.length === 0) {
            return res.status(400).json({ message: 'Se requieren participantes' });
        }

        // Asegurar que el usuario creador esté en los participantes
        const allParticipants = [...new Set([...participants, currentUsername])];

        if (allParticipants.length < 2) {
            return res.status(400).json({ message: 'La conversación debe tener al menos otro participante' });
        }

        let type = 'direct';
        if (isGroup) type = 'group';

        // Si es 1-a-1 y no hay relatedEntity ni subject, ver si ya existe una conversación
        if (type === 'direct' && allParticipants.length === 2 && !subject && !relatedEntity) {
            const existing = await Conversation.findOne({
                type: { $ne: 'group' },
                participants: { $all: allParticipants, $size: 2 },
                subject: { $exists: false },
                relatedEntity: { $exists: false }
            });
            if (existing) {
                return res.json(existing);
            }
        }

        const newConv = new Conversation({
            participants: allParticipants,
            type,
            groupName,
            subject,
            relatedEntity
        });

        const savedConv = await newConv.save();
        res.status(201).json(savedConv);
    } catch (error) {
        console.error('POST /api/admin/messages/conversations error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/messages/conversations/:id/messages', authenticateToken, requirePermission(PERMISSIONS.MENSAJES_READ), async (req, res) => {
    try {
        const conversationId = req.params.id;
        const username = req.user.username;

        const conv = await Conversation.findById(conversationId);
        if (!conv) return res.status(404).json({ message: 'Conversación no encontrada' });
        if (!conv.participants.includes(username)) {
            return res.status(403).json({ message: 'No tienes acceso a esta conversación' });
        }

        const clearedAt = conv.clearedAt && conv.clearedAt.get(username);
        const query = { conversationId };
        if (clearedAt) {
            query.createdAt = { $gt: clearedAt };
        }

        const messages = await InternalMessage.find(query)
            .sort({ createdAt: 1 }) // Orden cronológico (antiguos primero)
            .lean();

        res.json(messages);
    } catch (error) {
        console.error('GET /api/admin/messages/conversations/:id/messages error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/messages/conversations/:id/messages', authenticateToken, requirePermission(PERMISSIONS.MENSAJES_WRITE), async (req, res) => {
    try {
        const conversationId = req.params.id;
        const { content, attachments } = req.body;
        const username = req.user.username;

        if ((!content || content.trim() === '') && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ message: 'El contenido o adjuntos son requeridos' });
        }

        // Validate attachments
        let validAttachments = [];
        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            if (attachments.length > 4) return res.status(400).json({ message: 'Máximo 4 archivos permitidos' });
            let totalSize = 0;
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];
            const blockedExts = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.scr', '.ps1', '.js', '.vbs', '.jar', '.com'];

            for (const file of attachments) {
                if (file.size > 2 * 1024 * 1024) return res.status(400).json({ message: `El archivo ${file.filename} supera los 2 MB` });
                totalSize += file.size;

                if (!allowedTypes.includes(file.contentType)) return res.status(400).json({ message: `Tipo de archivo no permitido: ${file.contentType}` });

                const lowerName = (file.filename || '').toLowerCase();
                if (blockedExts.some(ext => lowerName.endsWith(ext))) {
                    return res.status(400).json({ message: `Archivo ejecutable bloqueado: ${file.filename}` });
                }

                validAttachments.push({
                    filename: file.filename,
                    contentType: file.contentType,
                    size: file.size,
                    url: file.url
                });
            }
            if (totalSize > 6 * 1024 * 1024) return res.status(400).json({ message: 'El total de archivos supera los 6 MB' });
        }

        const conv = await Conversation.findById(conversationId);
        if (!conv) return res.status(404).json({ message: 'Conversación no encontrada' });
        if (!conv.participants.includes(username)) {
            return res.status(403).json({ message: 'No tienes acceso a esta conversación' });
        }

        const newMsg = new InternalMessage({
            conversationId,
            author: username,
            content: content || '',
            attachments: validAttachments,
            readBy: [username] // El autor ya lo leyó
        });

        const savedMsg = await newMsg.save();

        // Actualizar conversación: limpiar archivados para que reaparezca y setear lastMessageAt
        conv.lastMessageAt = new Date();
        conv.archivedBy = [];
        await conv.save();

        res.status(201).json(savedMsg);
    } catch (error) {
        console.error('POST /api/admin/messages/conversations/:id/messages error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/messages/conversations/:id/read', authenticateToken, requirePermission(PERMISSIONS.MENSAJES_READ), async (req, res) => {
    try {
        const conversationId = req.params.id;
        const username = req.user.username;

        const conv = await Conversation.findById(conversationId);
        if (!conv || !conv.participants.includes(username)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        await InternalMessage.updateMany(
            { conversationId, readBy: { $ne: username } },
            { $addToSet: { readBy: username } }
        );

        res.json({ message: 'Mensajes marcados como leídos' });
    } catch (error) {
        console.error('PATCH /api/admin/messages/conversations/:id/read error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/messages/conversations/:id/archive', authenticateToken, requirePermission(PERMISSIONS.MENSAJES_WRITE), async (req, res) => {
    try {
        const conversationId = req.params.id;
        const username = req.user.username;
        const { archive } = req.body; // boolean

        const conv = await Conversation.findById(conversationId);
        if (!conv || !conv.participants.includes(username)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        if (archive) {
            if (!conv.archivedBy.includes(username)) {
                conv.archivedBy.push(username);
            }
        } else {
            conv.archivedBy = conv.archivedBy.filter(u => u !== username);
        }

        await conv.save();
        res.json({ message: archive ? 'Conversación archivada' : 'Conversación desarchivada' });
    } catch (error) {
        console.error('PATCH /api/admin/messages/conversations/:id/archive error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/messages/conversations/:id/clear-history', authenticateToken, requirePermission(PERMISSIONS.MENSAJES_WRITE), async (req, res) => {
    try {
        const conversationId = req.params.id;
        const username = req.user.username;

        const conv = await Conversation.findById(conversationId);
        if (!conv || !conv.participants.includes(username)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        if (!conv.clearedAt) {
            conv.clearedAt = new Map();
        }
        conv.clearedAt.set(username, new Date());

        await conv.save();
        res.json({ message: 'Historial borrado localmente' });
    } catch (error) {
        console.error('POST /api/admin/messages/conversations/:id/clear-history error:', error);
        res.status(500).json({ message: error.message });
    }
});


// --- WHATSAPP ---

app.get('/api/admin/whatsapp/config', authenticateToken, requirePermission(PERMISSIONS.WHATSAPP_READ), (req, res) => {
    res.json({ configured: WhatsAppAdapter.isConfigured() });
});

app.get('/api/admin/whatsapp/inbox', authenticateToken, requirePermission(PERMISSIONS.WHATSAPP_READ), async (req, res) => {
    try {
        // Obtenemos los últimos mensajes de whatsapp
        const logs = await CommunicationLog.find({ channel: 'whatsapp' })
            .populate('clientId leadId')
            .sort({ contactDate: -1 })
            .lean();

        // Agrupamos por cliente/lead
        const grouped = {};
        for (const log of logs) {
            const key = log.clientId ? `client_${log.clientId._id}` : log.leadId ? `lead_${log.leadId._id}` : `unknown_${log._id}`;
            if (!grouped[key]) {
                grouped[key] = {
                    contact: log.clientId || log.leadId,
                    type: log.clientId ? 'client' : 'lead',
                    messages: []
                };
            }
            grouped[key].messages.push(log);
        }

        res.json(Object.values(grouped));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/whatsapp/templates', authenticateToken, requirePermission(PERMISSIONS.WHATSAPP_READ), (req, res) => {
    try {
        let templates = [];
        if (process.env.WHATSAPP_TEMPLATES_JSON) {
            try {
                templates = JSON.parse(process.env.WHATSAPP_TEMPLATES_JSON);
            } catch (e) {
                console.error('Error parseando WHATSAPP_TEMPLATES_JSON:', e.message);
            }
        }
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/whatsapp/send', authenticateToken, requirePermission(PERMISSIONS.WHATSAPP_WRITE), async (req, res) => {
    try {
        const { to, text, clientId, leadId, wasAiAssisted, suggestedMessage, templateName, templateLanguage } = req.body;

        if (!clientId && !leadId) {
            return res.status(400).json({ message: 'Se requiere especificar a qué cliente o lead pertenece el mensaje' });
        }

        if (!to || (!text && !templateName)) {
            return res.status(400).json({ message: 'Destinatario y texto o plantilla son requeridos' });
        }

        // Validate entity exists
        let entityExists = false;
        if (clientId) entityExists = await Client.exists({ _id: clientId });
        else if (leadId) entityExists = await Lead.exists({ _id: leadId });

        if (!entityExists) {
            return res.status(404).json({ message: 'La entidad asociada (cliente o lead) no existe. No se enviará el mensaje.' });
        }

        // Validate 24h window if sending free text
        if (!templateName) {
            const lastInbound = await CommunicationLog.findOne({
                channel: 'whatsapp',
                direction: 'inbound',
                $or: [{ clientId }, { leadId }]
            }).sort({ contactDate: -1 }).select('contactDate');

            const isWithin24h = lastInbound && ((new Date() - new Date(lastInbound.contactDate)) / (1000 * 60 * 60)) < 24;

            if (!isWithin24h) {
                return res.status(403).json({ message: 'Fuera de la ventana de 24h. Meta requiere el uso de plantillas pre-aprobadas.' });
            }
        }

        if (templateName) {
            let templates = [];
            if (process.env.WHATSAPP_TEMPLATES_JSON) {
                try { templates = JSON.parse(process.env.WHATSAPP_TEMPLATES_JSON); } catch(e){}
            }
            if (!templates.some(t => t.name === templateName)) {
                return res.status(400).json({ message: 'La plantilla solicitada no está configurada.' });
            }
        }

        // Enviamos el mensaje
        let result;
        if (templateName) {
            result = await WhatsAppAdapter.sendTemplateMessage(to, templateName, templateLanguage || 'es_AR', []);
        } else {
            result = await WhatsAppAdapter.sendMessage(to, text);
        }
        const externalId = result?.messages?.[0]?.id || null;

        // Creamos el log
        const newLog = new CommunicationLog({
            entityType: clientId ? 'client' : 'lead',
            entityId: clientId || leadId,
            clientId: clientId || null,
            leadId: leadId || null,
            createdBy: req.user.userId,
            channel: 'whatsapp',
            direction: 'outbound',
            title: templateName ? `Plantilla de WhatsApp a ${to}` : `Mensaje de WhatsApp a ${to}`,
            notes: text || `[Plantilla: ${templateName}]`,
            externalId,
            deliveryStatus: externalId ? 'sent' : 'failed'
        });

        await newLog.save();

        if (wasAiAssisted) {
            await logAudit({
                req,
                action: 'AI_ASSISTED_SEND',
                module: 'whatsapp',
                entityType: clientId ? 'Client' : 'Lead',
                entityId: clientId || leadId,
                entityLabel: to,
                description: 'Mensaje de WhatsApp enviado con asistencia de Arturito',
                metadata: {
                    suggestedMessage: suggestedMessage || '',
                    finalMessage: text,
                    wasEdited: (suggestedMessage || '') !== text,
                    channel: 'whatsapp'
                }
            });
        }

        res.status(201).json({ message: 'Mensaje enviado', log: newLog });
    } catch (error) {
        // Logs tecnicos para error (no loguear texto ni phone completo por PII)
        console.error('WhatsApp Send Error para entidad:', req.body.clientId || req.body.leadId, 'Error:', error.message);

        // Creamos log de error si podemos identificar al cliente
        if (req.body.clientId || req.body.leadId) {
            const errLog = new CommunicationLog({
                entityType: req.body.clientId ? 'client' : 'lead',
                entityId: req.body.clientId || req.body.leadId,
                clientId: req.body.clientId || null,
                leadId: req.body.leadId || null,
                createdBy: req.user.userId,
                channel: 'whatsapp',
                direction: 'outbound',
                title: `Error enviando WhatsApp`,
                notes: `Fallo de envío. Error técnico: ${error.message}`,
                deliveryStatus: 'failed',
                errorMessage: error.message
            });
            await errLog.save();
        }

        res.status(400).json({ message: error.message });
    }
});


// --- ARTURITO IA ---
app.get('/api/admin/arturito/status', authenticateToken, requirePermission(PERMISSIONS.WHATSAPP_READ), async (req, res) => {
    try {
        const status = await ArturitoService.getStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/admin/arturito/suggest-reply', authenticateToken, requirePermission(PERMISSIONS.WHATSAPP_WRITE), async (req, res) => {
    try {
        const { contactType, contactId } = req.body;
        if (!contactType || !contactId) return res.status(400).json({ message: 'contactType y contactId son requeridos' });

        const normalizedContactType = String(contactType).toLowerCase();
        if (!['client', 'lead'].includes(normalizedContactType)) {
            return res.status(400).json({ message: 'contactType debe ser client o lead' });
        }

        let contact = null;
        if (normalizedContactType === 'client') {
            contact = await Client.findById(contactId);
        } else {
            contact = await Lead.findById(contactId).populate('vehicleId', 'brand name year price currency plateOrVin');
        }

        if (!contact) return res.status(404).json({ message: 'Contacto no encontrado' });

        const recentLogs = await CommunicationLog.find({
            entityType: normalizedContactType,
            entityId: contactId,
            channel: 'whatsapp'
        }).sort({ contactDate: -1 }).limit(10).lean();

        const trimForPrompt = (value, max = 800) => String(value || '').slice(0, max);
        const chatHistory = recentLogs.reverse().map(log => {
            const prefix = log.direction === 'inbound' ? 'Cliente:' : 'Asesor:';
            return `${prefix} ${trimForPrompt(log.notes)}`;
        }).join('\n').slice(-6000) || 'Sin mensajes previos.';

        const contactName = contact.fullName || contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.phone || 'Contacto sin nombre';
        const vehicleInfo = contact.vehicleId
            ? [contact.vehicleId.brand, contact.vehicleId.name, contact.vehicleId.year, contact.vehicleId.price ? `${contact.vehicleId.currency || ''} ${contact.vehicleId.price}`.trim() : ''].filter(Boolean).join(' ')
            : 'No especificado';

        const suggestion = await ArturitoService.suggestReply({
            contactName,
            contactType: normalizedContactType,
            vehicleInfo,
            chatHistory
        });

        res.json({ suggestion });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- CORREOS ---

app.get('/api/admin/emails/config', authenticateToken, requirePermission(PERMISSIONS.CORREOS_READ), (req, res) => {
    res.json({ configured: EmailAdapter.isConfigured() });
});



// --- NPS (Net Promoter Score) ---

app.post('/api/admin/nps/generate', authenticateToken, requirePermission(PERMISSIONS.NPS_WRITE), async (req, res) => {
    try {
        const { clientId, saleId } = req.body;

        if (!clientId) {
            return res.status(400).json({ message: 'Client ID is required' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 dias

        const survey = new NpsSurvey({
            token,
            client: clientId,
            sale: saleId || null,
            seller: req.user.userId,
            expiresAt,
            generatedBy: req.user.userId
        });

        await survey.save();

        res.status(201).json({
            message: 'Survey generated',
            survey,
            url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/encuesta/${token}`
        });
    } catch (error) {
        console.error('NPS Generate Error:', error);
        res.status(500).json({ message: error.message });
    }
});


app.post('/api/admin/nps/manual', authenticateToken, requirePermission(PERMISSIONS.NPS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { clientId, score, comment = '', callDate } = req.body;
        const numericScore = Number(score);

        if (!clientId) return res.status(400).json({ message: 'Cliente requerido' });
        if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 10) {
            return res.status(400).json({ message: 'El puntaje debe estar entre 0 y 10' });
        }

        const client = await Client.findById(clientId).select('_id').lean();
        if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

        const responseDate = callDate ? new Date(callDate) : new Date();
        if (Number.isNaN(responseDate.getTime())) {
            return res.status(400).json({ message: 'Fecha de llamada invalida' });
        }

        const expiresAt = new Date(responseDate);
        expiresAt.setDate(expiresAt.getDate() + 7);
        const generatedBy = req.user.userId || req.user.id;
        const token = 'manual-' + crypto.randomBytes(16).toString('hex');

        const survey = new NpsSurvey({
            token,
            client: clientId,
            seller: generatedBy,
            status: 'completed',
            expiresAt,
            generatedBy
        });
        await survey.save();

        try {
            const npsResponse = new NpsResponse({
                survey: survey._id,
                score: numericScore,
                comment: comment.toString().slice(0, 1000),
                followUpStatus: numericScore <= 6 ? 'pending' : 'resolved',
                createdAt: responseDate,
                updatedAt: responseDate
            });
            await npsResponse.save();
            res.status(201).json({ survey, response: npsResponse });
        } catch (responseError) {
            await NpsSurvey.deleteOne({ _id: survey._id });
            throw responseError;
        }
    } catch (error) {
        console.error('NPS Manual Error:', error);
        res.status(500).json({ message: error.message || 'Error al registrar llamada NPS' });
    }
});

app.get('/api/admin/nps/dashboard', authenticateToken, requirePermission(PERMISSIONS.NPS_READ), async (req, res) => {
    try {
        const responses = await NpsResponse.find()
            .populate({
                path: 'survey',
                populate: { path: 'client sale seller' }
            })
            .sort({ createdAt: -1 })
            .lean();

        let promoters = 0;
        let passives = 0;
        let detractors = 0;
        const recentResponses = [];
        const actionRequired = [];

        responses.forEach(r => {
            if (r.classification === 'promoter') promoters++;
            else if (r.classification === 'passive') passives++;
            else if (r.classification === 'detractor') detractors++;

            if (recentResponses.length < 20) {
                recentResponses.push(r);
            }

            if (r.classification === 'detractor' && r.followUpStatus === 'pending') {
                actionRequired.push(r);
            }
        });

        const total = promoters + passives + detractors;
        const npsScore = total > 0 ? Math.round(((promoters / total) - (detractors / total)) * 100) : 0;

        res.json({
            metrics: { total, promoters, passives, detractors, npsScore },
            recentResponses,
            actionRequired
        });
    } catch (error) {
        console.error('NPS Dashboard Error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/nps/follow-up/:id', authenticateToken, requirePermission(PERMISSIONS.NPS_WRITE), async (req, res) => {
    try {
        const { status, notes } = req.body;
        const response = await NpsResponse.findByIdAndUpdate(
            req.params.id,
            { followUpStatus: status, followUpNotes: notes },
            { new: true }
        );

        if (!response) return res.status(404).json({ message: 'Response not found' });

        await logAudit({ req, action: 'UPDATE', module: 'Nps', entityType: 'NpsResponse', entityId: response._id, metadata: { status, notes } });

        res.json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/public/nps/:token', async (req, res) => {
    try {
        const survey = await NpsSurvey.findOne({ token: req.params.token });

        if (!survey) return res.status(404).json({ message: 'Encuesta no encontrada' });
        if (survey.status === 'completed') return res.status(400).json({ message: 'La encuesta ya fue completada', code: 'ALREADY_COMPLETED' });
        if (new Date() > new Date(survey.expiresAt) || survey.status === 'expired') return res.status(400).json({ message: 'La encuesta ha expirado', code: 'EXPIRED' });

        res.json({ valid: true, expiresAt: survey.expiresAt });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/public/nps/:token', async (req, res) => {
    try {
        const { score, comment } = req.body;

        if (score === undefined || score < 0 || score > 10) return res.status(400).json({ message: 'Calificación inválida' });

        const survey = await NpsSurvey.findOne({ token: req.params.token });

        if (!survey) return res.status(404).json({ message: 'Encuesta no encontrada' });
        if (survey.status === 'completed') return res.status(400).json({ message: 'La encuesta ya fue completada' });
        if (new Date() > new Date(survey.expiresAt)) return res.status(400).json({ message: 'La encuesta ha expirado' });

        const npsResponse = new NpsResponse({ survey: survey._id, score, comment });
        await npsResponse.save();

        survey.status = 'completed';
        await survey.save();

        res.status(201).json({ message: 'Gracias por tu respuesta' });
    } catch (error) {
        console.error('NPS Submit Error:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});


// --- AUTORIZACIONES (APPROVALS) ---

app.post('/api/admin/approvals', authenticateToken, requirePermission(PERMISSIONS.APPROVALS_READ), async (req, res) => {
    // APPROVALS_READ is enough to *request*, APPROVALS_WRITE is to *approve*.
    try {
        const { actionType, entityType, entityId, summary, reason } = req.body;

        if (!actionType || !entityType || !entityId || !reason) {
            return res.status(400).json({ message: 'Faltan campos requeridos' });
        }

        const request = new ApprovalRequest({
            requester: req.user.userId,
            actionType,
            entityType,
            entityId,
            summary,
            reason,
            history: [{ status: 'pending', changedBy: req.user.userId, notes: reason }]
        });

        await request.save();
        await logAudit({ req, action: 'CREATE', module: 'Approvals', entityType: 'ApprovalRequest', entityId: request._id, metadata: { actionType, entityId }, strict: true });

        res.status(201).json(request);
    } catch (error) {
        console.error('Approval Request Error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/approvals', authenticateToken, requirePermission(PERMISSIONS.APPROVALS_READ), async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};

        // Ventas solo ve sus propias solicitudes, admin ve todas
        if (req.user.role === ROLES.VENTAS) {
            query.requester = req.user.userId;
        }

        if (status) query.status = status;

        const requests = await ApprovalRequest.find(query)
            .populate('requester', 'name email')
            .populate('approver', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/approvals/:id', authenticateToken, requirePermission(PERMISSIONS.APPROVALS_WRITE), async (req, res) => {
    try {
        const { status, resolutionNotes } = req.body;

        if (!['approved', 'rejected', 'executed', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }

        const request = await ApprovalRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Solicitud no encontrada' });

        if (request.status === 'executed' || request.status === 'cancelled') {
            return res.status(400).json({ message: 'La solicitud ya no puede cambiar de estado' });
        }

        request.status = status;
        if (status === 'approved' || status === 'rejected') {
            request.approver = req.user.userId;
            request.resolutionNotes = resolutionNotes || '';
        }

        request.history.push({
            status,
            changedBy: req.user.userId,
            notes: resolutionNotes || ''
        });

        await request.save();
        await logAudit({ req, action: 'UPDATE', module: 'Approvals', entityType: 'ApprovalRequest', entityId: request._id, metadata: { status }, strict: true });

        res.json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- CLIENTES DORMIDOS (DORMANT) ---

app.get('/api/admin/dormidos', authenticateToken, requirePermission(PERMISSIONS.DORMANT_READ), async (req, res) => {
    try {
        const { days = 30, responsable } = req.query;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - parseInt(days));

        let clientQuery = {
            $or: [
                { lastContactDate: { $lt: thresholdDate } },
                { lastContactDate: null, createdAt: { $lt: thresholdDate } }
            ]
        };

        if (responsable) clientQuery.assignedTo = responsable;

        // Ventas solo ve sus asignados
        if (req.user.role === ROLES.VENTAS) {
            clientQuery.assignedTo = req.user.userId;
        }

        // Buscar clientes inactivos
        let dormantClients = await Client.find(clientQuery)
            .populate('assignedTo', 'name email')
            .lean();

        // Filtrar clientes que tienen ventas activas o cerradas exitosas (no anuladas)
        // Optimizacion: buscar todas las ventas de estos clientes
        const clientIds = dormantClients.map(c => c._id);
        const activeSales = await Sale.find({
            client: { $in: clientIds },
            status: { $in: ['pending', 'approved', 'delivered'] } // asumimos que si hay venta activa, no esta dormido
        }).select('client').lean();

        const activeClientIds = new Set(activeSales.map(s => s.client.toString()));

        // Filtrar los que no estan en activeClientIds
        dormantClients = dormantClients.filter(c => !activeClientIds.has(c._id.toString()));

        // Agregar leads inactivos
        let leadQuery = { ...clientQuery };
        if (leadQuery.lastContactDate) {
             leadQuery.lastContactDate = clientQuery.$or[0].lastContactDate;
             delete leadQuery.$or;
        }

        const dormantLeads = await Lead.find({
            $or: [
                { lastContactDate: { $lt: thresholdDate } },
                { lastContactDate: null, createdAt: { $lt: thresholdDate } }
            ],
            status: { $ne: 'closed_won' } // no incluir leads que ya son clientes cerrados
        }).populate('assignedTo', 'name email').lean();

        let finalLeads = dormantLeads;
        if (responsable || req.user.role === ROLES.VENTAS) {
             const resp = responsable || req.user.userId;
             finalLeads = dormantLeads.filter(l => {
                 if (!l.assignedTo) return false;
                 const assignedId = typeof l.assignedTo === 'object' && l.assignedTo !== null
                     ? (l.assignedTo._id ? l.assignedTo._id.toString() : null)
                     : l.assignedTo.toString();
                 return assignedId === resp;
             });
        }

        // Formatear salida unificada
        const results = [
            ...dormantClients.map(c => ({ ...c, type: 'client', daysInactive: Math.floor((new Date() - new Date(c.lastContactDate || c.createdAt)) / (1000 * 60 * 60 * 24)) })),
            ...finalLeads.map(l => ({ ...l, type: 'lead', daysInactive: Math.floor((new Date() - new Date(l.lastContactDate || l.createdAt)) / (1000 * 60 * 60 * 24)) }))
        ].sort((a, b) => b.daysInactive - a.daysInactive); // Ordenar por mas inactivos primero

        res.json(results);
    } catch (error) {
        console.error('Dormant API Error:', error);
        res.status(500).json({ message: error.message });
    }
});


// --- CLIENT DELETE (SOFT) ---
app.delete('/api/admin/clients/:id', authenticateToken, requirePermission(PERMISSIONS.CLIENTES_WRITE), async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);
        await TrashRecord.create({
            entityType: 'Client',
            entityId: client._id,
            snapshot: client.toObject(),
            deletedBy: req.user.userId,
            expiresAt
        });

        await Client.findByIdAndDelete(req.params.id);
        await logAudit({ req, action: 'DELETE', module: 'Clients', entityType: 'Client', entityId: req.params.id, metadata: { softDelete: true }, strict: true });

        res.json({ message: 'Client removed and sent to trash' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- SUGERENCIAS ---
app.get('/api/admin/suggestions', authenticateToken, async (req, res) => {
    try {
        const suggestions = await Suggestion.find()
            .populate('author', 'name email')
            .populate('comments.author', 'name email')
            .sort({ priority: -1, createdAt: -1 })
            .lean();
        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/suggestions', authenticateToken, (req, res) => {
    uploadSuggestions.array('attachments', 5)(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || 'Error al procesar archivos adjuntos.' });
        }

        try {
            if (req.files) {
                const totalSize = req.files.reduce((acc, f) => acc + (f.size || f.bytes || 0), 0);
                if (totalSize > 15 * 1024 * 1024) {
                    return res.status(413).json({ message: 'El tamaño total de los adjuntos excede los 15MB.' });
                }
            }

            const { title, description, category, priority } = req.body;

            const attachments = (req.files || []).map(f => ({
                name: f.originalname || f.filename || 'Archivo adjunto',
                url: f.path || f.secure_url,
                contentType: f.mimetype,
                size: f.size || f.bytes || 0,
                publicId: f.filename || f.public_id
            }));

            const sug = new Suggestion({
                title, description, category, priority,
                author: req.user.userId,
                attachments
            });
            await sug.save();
            res.status(201).json(sug);
        } catch (error) {
            console.error('POST /suggestions error:', error);
            res.status(500).json({ message: error.message });
        }
    });
});

app.patch('/api/admin/suggestions/:id', authenticateToken, requirePermission(PERMISSIONS.SUGGESTIONS_MANAGE), async (req, res) => {
    try {
        const { status, commentText } = req.body;
        const sug = await Suggestion.findById(req.params.id);
        if (!sug) return res.status(404).json({ message: 'No encontrada' });

        if (status) sug.status = status;
        if (commentText) {
            sug.comments.push({
                text: commentText,
                author: req.user.userId
            });
        }
        await sug.save();
        res.json(sug);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- PAPELERA ---
app.get('/api/admin/trash', authenticateToken, requirePermission(PERMISSIONS.TRASH_READ), async (req, res) => {
    try {
        // Limpiar expirados primero
        await TrashRecord.deleteMany({ expiresAt: { $lt: new Date() } });

        const records = await TrashRecord.find()
            .populate('deletedBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/trash/restore/:id', authenticateToken, requirePermission(PERMISSIONS.TRASH_RESTORE), async (req, res) => {
    try {
        const record = await TrashRecord.findById(req.params.id);
        if (!record) return res.status(404).json({ message: 'No encontrado' });

        const { entityType, snapshot } = record;

        let Model;
        if (entityType === 'Client') Model = Client;
        else if (entityType === 'Lead') Model = Lead;
        else if (entityType === 'Quote') Model = Quote;
        else if (entityType === 'Sale') Model = Sale;
        else if (entityType === 'Gestoria') Model = Gestoria;
        else return res.status(400).json({ message: 'Tipo no soportado' });

        // Integrity checks
        if (entityType === 'Sale') {
            if (snapshot.clientId) {
                const clientExists = await Client.findById(snapshot.clientId);
                if (!clientExists) return res.status(400).json({ message: 'No se puede restaurar la venta: El cliente asociado ya no existe.' });
            }
            if (snapshot.vehicleId) {
                const carExists = await Car.findById(snapshot.vehicleId);
                if (!carExists) return res.status(400).json({ message: 'No se puede restaurar la venta: El vehículo asociado ya no existe en el catálogo.' });
            }
        } else if (entityType === 'Gestoria') {
            if (snapshot.clientId) {
                const clientExists = await Client.findById(snapshot.clientId);
                if (!clientExists) return res.status(400).json({ message: 'No se puede restaurar el expediente: El cliente asociado ya no existe.' });
            }
            if (snapshot.vehicleId) {
                const carExists = await Car.findById(snapshot.vehicleId);
                if (!carExists) return res.status(400).json({ message: 'No se puede restaurar el expediente: El vehículo asociado ya no existe en el catálogo.' });
            }
            if (snapshot.saleId) {
                const saleExists = await Sale.findById(snapshot.saleId);
                if (!saleExists) return res.status(400).json({ message: 'No se puede restaurar el expediente: La venta asociada ya no existe.' });
            }
        }

        // Verificar duplicados
        const existing = await Model.findById(snapshot._id);
        if (existing) {
            return res.status(400).json({ message: 'El registro ya existe o fue restaurado previamente.' });
        }

        // Restaurar insertando el snapshot (respetando _id original)
        const newDoc = new Model(snapshot);
        await newDoc.save();

        await TrashRecord.findByIdAndDelete(req.params.id);
        await logAudit({ req, action: 'RESTORE', module: 'Trash', entityType, entityId: newDoc._id, strict: true });

        res.json({ message: 'Restaurado con éxito', entity: newDoc });
    } catch (error) {
        console.error('RESTORE ERROR:', error);
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/admin/trash/:id', authenticateToken, requirePermission(PERMISSIONS.TRASH_DELETE), async (req, res) => {
    try {
        await TrashRecord.findByIdAndDelete(req.params.id);
        res.json({ message: 'Eliminado definitivamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// --- 7C CONFIGURACION & BACKUPS ---
app.patch('/api/admin/settings/features', authenticateToken, requirePermission(PERMISSIONS.SETTINGS_WRITE), async (req, res) => {
    try {
        const settings = await getOrCreateCrmSettings();
        if (!settings.featureFlags) settings.featureFlags = {};

        // Merge updates
        const updates = req.body;
        for (const [key, value] of Object.entries(updates)) {
            settings.featureFlags[key] = value;
        }

        const id = req.user?.userId || req.user?.id; if (id && mongoose.Types.ObjectId.isValid(id)) { settings.updatedBy = id; } else { settings.updatedBy = undefined; } settings.markModified('featureFlags');
        await settings.save();
        res.json(settings.featureFlags);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/settings/assistant', authenticateToken, requirePermission(PERMISSIONS.SETTINGS_WRITE), async (req, res) => {
    try {
        const payload = req.body?.assistantConfig || req.body || {};
        const allowedProviders = ['openai', 'anthropic', 'custom'];
        const provider = payload.provider || 'openai';

        if (!allowedProviders.includes(provider)) {
            return res.status(400).json({ ok: false, message: 'Proveedor de IA no valido.' });
        }

        const id = req.user?.userId || req.user?.id;
        const updatedBy = id && mongoose.Types.ObjectId.isValid(id) ? id : undefined;

        const assistantConfig = {
            enabled: Boolean(payload.enabled),
            provider
        };

        const settings = await CrmSettings.findOneAndUpdate(
            {},
            {
                $set: {
                    assistantConfig: assistantConfig,
                    updatedBy: updatedBy
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json({ ok: true, assistantConfig: settings.assistantConfig });
    } catch (error) {
        console.error('PATCH /api/admin/settings/assistant error:', error);
        res.status(500).json({ ok: false, message: 'No se pudo guardar la configuracion de Arturito.' });
    }
});
app.patch('/api/admin/settings/daily-summary', authenticateToken, requirePermission(PERMISSIONS.SETTINGS_WRITE), async (req, res) => {
    try {
        const settings = await getOrCreateCrmSettings();
        const current = settings.dailySummary?.toObject?.() || settings.dailySummary || {};
        const currentSections = current.sections || {};

        const nextDailySummary = {
            enabled: current.enabled ?? false,
            sendTime: current.sendTime || '08:00',
            recipients: Array.isArray(current.recipients) ? current.recipients : [],
            channel: current.channel || 'internal',
            sections: {
                newLeads: currentSections.newLeads ?? true,
                unansweredConversations: currentSections.unansweredConversations ?? true,
                dailySales: currentSections.dailySales ?? true,
                dueInstallments: currentSections.dueInstallments ?? true,
                openComplaints: currentSections.openComplaints ?? true,
                criticalAlerts: currentSections.criticalAlerts ?? true
            }
        };

        const { enabled, sendTime, recipients, channel, sections } = req.body || {};

        if (enabled !== undefined) nextDailySummary.enabled = Boolean(enabled);
        if (sendTime !== undefined) nextDailySummary.sendTime = String(sendTime);
        if (Array.isArray(recipients)) nextDailySummary.recipients = recipients.map(item => String(item).trim()).filter(Boolean);
        if (channel !== undefined) {
            if (!['internal', 'email', 'whatsapp'].includes(channel)) {
                return res.status(400).json({ message: 'Canal de resumen diario no valido.' });
            }
            nextDailySummary.channel = channel;
        }
        if (sections && typeof sections === 'object') {
            const allowedSections = ['newLeads', 'unansweredConversations', 'dailySales', 'dueInstallments', 'openComplaints', 'criticalAlerts'];
            for (const key of allowedSections) {
                if (sections[key] !== undefined) nextDailySummary.sections[key] = Boolean(sections[key]);
            }
        }

        settings.dailySummary = nextDailySummary;

        const id = req.user.userId || req.user.id;
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            settings.updatedBy = id;
        } else {
            settings.updatedBy = undefined;
        }

        await settings.save();
        res.json(settings.dailySummary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/settings/daily-summary/preview', authenticateToken, requirePermission(PERMISSIONS.SETTINGS_READ), async (req, res) => {
    try {
        const settings = await getOrCreateCrmSettings();
        const config = settings.dailySummary || {};
        const sections = config.sections || {
            newLeads: true, unansweredConversations: true, dailySales: true,
            dueInstallments: true, openComplaints: true, criticalAlerts: true
        };
        const metrics = await DailySummaryService.generateData(sections);
        const payload = DailySummaryService.formatToMarkdown(metrics, new Date());

        res.json({ payload, metrics });
    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/jobs/daily-summary', async (req, res) => {
    try {
        // Authorization check: CRON_SECRET or Admin Auth
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = req.headers.authorization;
        let authorized = false;

        if (cronSecret && req.headers['x-cron-secret'] === cronSecret) {
            authorized = true;
        } else if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.role === 'admin' || decoded.role === 'owner') {
                    authorized = true;
                }
            } catch (e) {}
        }

        if (!authorized) {
            return res.status(401).json({ message: 'No autorizado' });
        }

        await connectDB();
        const settings = await CrmSettings.findOne(); // getOrCreateCrmSettings requires auth context usually, but wait, settings are singleton
        let config = {};
        if (settings) {
            config = settings.dailySummary;
        }

        const result = await DailySummaryService.runJob(config);
        res.json(result);

    } catch (error) {
        console.error('Job endpoint error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/backups/export', authenticateToken, async (req, res) => {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Solo owner o admin pueden exportar backups' });
    }
    try {
        // Obtenemos un snapshot de las colecciones más críticas
        const clients = await Client.find().lean();
        const leads = await Lead.find().lean();
        const quotes = await Quote.find().lean();
        const sales = await Sale.find().lean();

        const backup = {
            metadata: {
                timestamp: new Date().toISOString(),
                generatedBy: req.user.userId,
                version: '1.0'
            },
            data: {
                clients,
                leads,
                quotes,
                sales
            }
        };

        await logAudit({ req, action: 'EXPORT', module: 'Backups', entityType: 'System', metadata: { type: 'Database Backup' }, strict: true });

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=autosporting-backup-' + Date.now() + '.json');
        res.send(JSON.stringify(backup, null, 2));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- 2FA ENDPOINTS ---
app.get('/api/admin/2fa/status', authenticateToken, async (req, res) => {
    try {
        const user = await AdminUser.findById(req.user.id || req.user.userId);
        res.json({ active: !!user?.twoFactorEnabled });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/2fa/generate', authenticateToken, async (req, res) => {
    try {
        const user = await AdminUser.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const secret = speakeasy.generateSecret({
            name: `AutoSporting (${user.email})`
        });

        // Enviar solo de forma temporal (no guardar en DB hasta verificar)
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            secret: secret.base32,
            qrCode: qrCodeUrl
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/2fa/verify', authenticateToken, async (req, res) => {
    try {
        const { token, secret } = req.body;
        const user = await AdminUser.findById(req.user.userId);

        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token
        });

        if (verified) {
            try {
                user.twoFactorSecret = encryptData(secret);
            } catch (err) {
                return res.status(500).json({ message: 'No se puede habilitar 2FA sin TWO_FACTOR_ENCRYPTION_KEY configurada en producción.' });
            }

            user.twoFactorEnabled = true;

            // Generar códigos de recuperación
            const recoveryCodes = Array.from({length: 8}, () => crypto.randomBytes(4).toString('hex'));
            user.recoveryCodes = recoveryCodes.map(code => crypto.createHash('sha256').update(code).digest('hex'));

            await user.save();
            await logAudit({ req, action: 'UPDATE', module: 'Security', entityType: 'AdminUser', entityId: user._id, metadata: { action: '2FA Enabled' }, strict: true });

            res.json({
                message: '2FA activado correctamente',
                recoveryCodes // Only shown once
            });
        } else {
            res.status(400).json({ message: 'Código inválido' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/2fa/disable', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await AdminUser.findById(req.user.userId);

        if (!user.twoFactorEnabled) return res.status(400).json({ message: '2FA no está activo' });

        const secret = decryptData(user.twoFactorSecret);
        if (!secret) {
            return res.status(500).json({ message: 'El secreto 2FA está corrupto o la clave de cifrado ha cambiado. Contacte a un administrador para restablecer su 2FA.' });
        }

        // Verificar token actual para desactivar
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token
        });

        if (!verified) return res.status(400).json({ message: 'Código inválido' });

        user.twoFactorEnabled = false;
        user.twoFactorSecret = null;
        user.recoveryCodes = [];
        await user.save();

        await logAudit({ req, action: 'UPDATE', module: 'Security', entityType: 'AdminUser', entityId: user._id, metadata: { action: '2FA Disabled' }, strict: true });

        res.json({ message: '2FA desactivado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- WHATSAPP WEBHOOKS ---
app.get('/api/webhooks/whatsapp', (req, res) => {
    const verify_token = process.env.WHATSAPP_VERIFY_TOKEN || 'autosporting_webhook_token';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === verify_token) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

app.post('/api/webhooks/whatsapp', async (req, res) => {
    try {
        await connectDB();
        const body = req.body;

        // Validacion de firma (si hay APP_SECRET)
        if (process.env.WHATSAPP_APP_SECRET) {
            const signature = req.headers['x-hub-signature-256'];
            if (!signature) {
                if (process.env.NODE_ENV === 'production') return res.sendStatus(401);
                console.warn('Falta firma x-hub-signature-256 en webhook de WhatsApp');
            } else if (req.rawBody) {
                const hmac = crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET);
                const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');
                if (signature !== digest) {
                    console.error('Firma de Webhook de WhatsApp invalida');
                    return res.sendStatus(401);
                }
            }
        }

        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    const value = change.value;

                    // Manejo de statuses
                    if (value.statuses && value.statuses.length > 0) {
                        for (const status of value.statuses) {
                            let updates = { deliveryStatus: status.status };
                            if (status.status === 'failed' && status.errors) {
                                updates.errorMessage = JSON.stringify(status.errors);
                            }
                            await CommunicationLog.updateOne(
                                { externalId: status.id },
                                { $set: updates }
                            );
                        }
                    }

                    // Manejo de mensajes entrantes
                    if (value.messages && value.messages.length > 0) {
                        for (const msg of value.messages) {
                            const from = msg.from;
                            const text = msg.text?.body || '';
                            const messageId = msg.id;

                            // Normalizacion simple para busqueda local
                            let searchPhone = WhatsAppAdapter.formatPhoneNumber(from) || from;

                            let entityType = null;
                            let entityId = null;

                            let client = await Client.findOne({ phone: new RegExp(searchPhone, 'i') });
                            if (client) {
                                entityType = 'client';
                                entityId = client._id;
                            } else {
                                let lead = await Lead.findOne({ phone: new RegExp(searchPhone, 'i') });
                                if (lead) {
                                    entityType = 'lead';
                                    entityId = lead._id;
                                }
                            }

                            if (!entityId) {
                                // Crear Lead automatico
                                let contactName = 'Contacto WhatsApp';
                                if (value.contacts && value.contacts.length > 0) {
                                    const c = value.contacts.find(c => c.wa_id === from);
                                    if (c && c.profile?.name) contactName = c.profile.name;
                                }

                                let automaticAssignment = null;
                                try {
                                    automaticAssignment = await getNextLeadAssignee({
                                        source: 'whatsapp',
                                        sourceDetail: 'unknown'
                                    });
                                } catch (routingError) {
                                    console.error('WhatsApp lead routing failed:', routingError.message);
                                }

                                const newLead = new Lead({
                                    firstName: contactName,
                                    name: contactName,
                                    phone: searchPhone,
                                    source: 'whatsapp',
                                    sourceDetail: 'unknown',
                                    crmStatus: 'nuevo',
                                    assignedTo: automaticAssignment?.user?._id || null,
                                    assignedAt: automaticAssignment?.assignedAt || null,
                                    leadAuditLog: automaticAssignment?.user ? [{
                                        action: 'ASIGNACION_AUTOMATICA',
                                        field: 'assignedTo',
                                        newValue: automaticAssignment.user._id,
                                        details: `Round-robin ${automaticAssignment.channelKey}: ${automaticAssignment.user.name || automaticAssignment.user.email}`,
                                        user: 'Sistema',
                                        source: 'WHATSAPP_WEBHOOK'
                                    }] : []
                                });
                                await newLead.save();
                                entityType = 'lead';
                                entityId = newLead._id;
                            }

                            const intention = await ArturitoService.classifyMessage(text);
                            const intentionTag = intention ? `\n[Intención: ${intention}]` : `\n[Intención: sin_clasificar]`;

                            if (intention === 'compra' || intention === 'financiacion' || intention === 'permuta') {
                                if (entityType === 'lead') {
                                    await Lead.updateOne({ _id: entityId }, { $set: { priority: 'alta' } });
                                }
                            }

                            const configuredSystemUserId = process.env.SYSTEM_USER_ID;
                            let createdBy = null;
                            if (configuredSystemUserId && mongoose.Types.ObjectId.isValid(configuredSystemUserId)) {
                                const systemUser = await AdminUser.findById(configuredSystemUserId).select('_id').lean();
                                if (systemUser) createdBy = systemUser._id;
                            }
                            if (!createdBy) {
                                const fallbackUser = await AdminUser.findOne({ role: 'owner', active: { $ne: false } }).select('_id').lean()
                                    || await AdminUser.findOne({ active: { $ne: false } }).select('_id').lean();
                                createdBy = fallbackUser?._id;
                            }

                            if (!createdBy) {
                                continue; // Imposible cumplir createdBy
                            }

                            const newLog = new CommunicationLog({
                                entityType: entityType,
                                entityId: entityId,
                                channel: 'whatsapp',
                                direction: 'inbound',
                                contactDate: new Date(),
                                title: `Mensaje de WhatsApp entrante`,
                                createdBy,
                                notes: text + intentionTag,
                                externalId: messageId,
                                deliveryStatus: 'delivered'
                            });

                            if (entityType === 'client') newLog.clientId = entityId;
                            if (entityType === 'lead') newLog.leadId = entityId;

                            await newLog.save();
                        }
                    }
                }
            }
            res.status(200).send('EVENT_RECEIVED');
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        console.error("WhatsApp Webhook Error", err.message); // No se hace console.log(body) por seguridad
        res.status(200).send('ERROR_HANDLED_SAFELY'); // Fast 200, no romper Meta
    }
});

// --- EMAILS ENDPOINTS ---
app.post('/api/admin/emails/send', authenticateToken, requirePermission(PERMISSIONS.CORREOS_WRITE), async (req, res) => {
    try {
        const { to, subject, html, clientId, leadId, attachments } = req.body;

        if (!clientId && !leadId) {
            return res.status(400).json({ message: 'Se requiere un clientId o leadId para enviar un correo y registrarlo correctamente.' });
        }

        const entityType = clientId ? 'client' : 'lead';
        const entityId = clientId || leadId;
        const createdBy = req.user.userId || req.user.id;

        let validAttachments = [];
        if (attachments && Array.isArray(attachments)) {
            for (const file of attachments) {
                const sizeEstimate = file.content ? file.content.length * 0.75 : 0;
                if (sizeEstimate > 5 * 1024 * 1024) {
                    return res.status(400).json({ message: `El archivo ${file.filename} excede 5MB permitidos.` });
                }

                const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
                if (!allowedTypes.includes(file.contentType)) {
                    return res.status(400).json({ message: `El tipo de archivo ${file.contentType} no esta permitido.` });
                }

                const safeName = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_');

                validAttachments.push({
                    filename: safeName,
                    content: Buffer.from(file.content.split('base64,').pop() || file.content, 'base64'),
                    contentType: file.contentType
                });
            }
        }

        const info = await EmailAdapter.sendEmail(to, subject, html, validAttachments);

        const log = new CommunicationLog({
            entityType,
            entityId,
            clientId,
            leadId,
            createdBy,
            channel: 'email',
            direction: 'outbound',
            title: `Correo: ${subject}`,
            contactDate: new Date(),
            notes: `Asunto: ${subject}\n\n${html.replace(/<[^>]+>/g, ' ')}`, // Clean HTML for notes
            deliveryStatus: 'sent',
            externalId: info.messageId
        });
        await log.save();

        res.json({ message: 'Correo enviado correctamente', messageId: info.messageId });
    } catch (err) {
        const { clientId, leadId, subject } = req.body;
        const createdBy = req.user?.userId || req.user?.id;

        if ((clientId || leadId) && createdBy) {
            try {
                const entityType = clientId ? 'client' : 'lead';
                const entityId = clientId || leadId;

                const log = new CommunicationLog({
                    entityType,
                    entityId,
                    clientId,
                    leadId,
                    createdBy,
                    channel: 'email',
                    direction: 'outbound',
                    title: `Correo Fallido: ${subject || 'Sin asunto'}`,
                    contactDate: new Date(),
                    notes: `Fallo al enviar Asunto: ${subject}`,
                    deliveryStatus: 'failed',
                    errorMessage: err.message
                });
                await log.save();
            } catch (logErr) {
                console.error("Fallo al guardar log de error de email:", logErr);
            }
        }

        res.status(500).json({ message: err.message });
    }
});

// --- COMPANY ROUTE ---
app.get('/api/admin/company/subscription-summary', authenticateToken, requirePermission(PERMISSIONS.SETTINGS_READ), async (req, res) => {
    try {
        res.json({
            enabled: false,
            subscriptionExpiresAt: null,
            daysLeft: null,
            paymentEmail: null,
            planLabel: null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- EMAIL CONFIG (OAUTH MOCK) ---
app.get('/api/admin/email/oauth-config', authenticateToken, requirePermission(PERMISSIONS.CORREOS_READ), async (req, res) => {
    try {
        await connectDB();
        let settings = await CrmSettings.findOne({});
        if (!settings) settings = new CrmSettings();
        res.json(settings.emailConfig || { provider: 'smtp', status: 'disconnected' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/email/oauth-config', authenticateToken, requirePermission(PERMISSIONS.CORREOS_WRITE), async (req, res) => {
    try {
        const { clientId } = req.body;
        if (!clientId) return res.status(400).json({ message: "Client ID requerido" });

        await connectDB();
        let settings = await CrmSettings.findOne({});
        if (!settings) settings = new CrmSettings();

        settings.emailConfig = {
            provider: 'gmail-oauth',
            clientId,
            connectedBy: req.user.username || req.user.name || req.user.email,
            connectedAt: null, // Seteo nulo hasta que haya OAuth real
            status: 'disconnected' // Mock status as disconnected per user instruction
        };
        await settings.save();
        res.json(settings.emailConfig);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/admin/email/oauth-config', authenticateToken, requirePermission(PERMISSIONS.CORREOS_WRITE), async (req, res) => {
    try {
        await connectDB();
        let settings = await CrmSettings.findOne({});
        if (!settings) settings = new CrmSettings();

        settings.emailConfig = {
            provider: 'smtp',
            clientId: "",
            connectedBy: "",
            connectedAt: null,
            status: 'disconnected'
        };
        await settings.save();
        res.json({ message: 'Configuración borrada', emailConfig: settings.emailConfig });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- MI ESPACIO (PERSONAL ASSETS) ROUTES ---

app.get('/api/admin/my-space/assets', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        const assets = await PersonalAsset.find({ userId: req.user.id, status: 'activo' }).sort({ createdAt: -1 }).lean();
        res.json(assets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/my-space/assets', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        const assetData = {
            ...req.body,
            userId: req.user.id,
            createdByUsername: req.user.username || req.user.name || req.user.email
        };
        const asset = new PersonalAsset(assetData);
        await asset.save();
        res.status(201).json(asset);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.patch('/api/admin/my-space/assets/:id', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        const asset = await PersonalAsset.findOne({ _id: req.params.id, userId: req.user.id });
        if (!asset) return res.status(404).json({ message: 'Asset not found or unauthorized' });

        Object.assign(asset, req.body, { userId: req.user.id }); // force userId to stay the same
        await asset.save();
        res.json(asset);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/admin/my-space/assets/:id', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        const asset = await PersonalAsset.findOne({ _id: req.params.id, userId: req.user.id });
        if (!asset) return res.status(404).json({ message: 'Asset not found or unauthorized' });

        asset.status = 'borrado';
        await asset.save();
        res.json({ message: 'Asset deleted logically', id: asset._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- RECLAMOS (COMPLAINTS) ROUTES ---
app.get('/api/admin/reclamos', authenticateToken, requirePermission(PERMISSIONS.RECLAMOS_READ), async (req, res) => {
    try {
        await connectDB();
        const { status, priority, assignedTo } = req.query;
        let query = {};
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (assignedTo) query.assignedTo = assignedTo;

        const reclamos = await Complaint.find(query)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .populate('client', 'fullName firstName lastName phone email')
            .sort({ createdAt: -1 })
            .lean();

        res.json(reclamos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/reclamos', authenticateToken, requirePermission(PERMISSIONS.RECLAMOS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const { title, description, priority, assignedTo, client } = req.body;

        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'El título del reclamo es obligatorio.' });
        }
        if (!description || description.trim() === '') {
            return res.status(400).json({ message: 'La descripción del reclamo es obligatoria.' });
        }
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({ message: 'La prioridad seleccionada no es válida.' });
        }

        const newComplaint = new Complaint({
            title,
            description,
            priority: priority || 'medium',
            assignedTo,
            client,
            createdBy: req.user.userId || req.user.id
        });
        await newComplaint.save();
        res.status(201).json(newComplaint);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.patch('/api/admin/reclamos/:id', authenticateToken, requirePermission(PERMISSIONS.RECLAMOS_WRITE), async (req, res) => {
    try {
        await connectDB();
        const reclamo = await Complaint.findById(req.params.id);
        if (!reclamo) return res.status(404).json({ message: 'Reclamo no encontrado' });

        const { status, priority, assignedTo, newNote } = req.body;

        if (status) reclamo.status = status;
        if (priority) reclamo.priority = priority;
        if (assignedTo !== undefined) reclamo.assignedTo = assignedTo || null;

        if (newNote && newNote.trim() !== '') {
            reclamo.notes.push({
                text: newNote.trim(),
                author: req.user.userId || req.user.id
            });
        }

        reclamo.updatedBy = req.user.userId || req.user.id;
        await reclamo.save();

        const updatedReclamo = await Complaint.findById(reclamo._id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .populate('notes.author', 'name email');

        res.json(updatedReclamo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Global Error Handler (Timestamp: " + new Date().toISOString() + ")");
    console.dir(err, { depth: null, colors: true });

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.message === 'Unexpected field') {
            return res.status(400).json({
                message: `Upload Error: ${err.message}. (Field: ${err.field || 'unknown'})`,
                detail: 'Make sure the field name is "images" and you are not uploading more than 20 files.'
            });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                message: 'Las imágenes son demasiado pesadas. Comprimilas o subilas en tandas.'
            });
        }
        return res.status(400).json({ message: `Multer Error: ${err.message}`, detail: err });
    }
    if (err.message === 'Invalid image file') {
        return res.status(400).json({ message: 'Invalid file format. Only images (jpg, png, jpeg, webp) are allowed.' });
    }
    if (err) {
        return res.status(500).json({ message: err.message || 'Internal Server Error', error: err.toString() });
    }
    next();
});

// --- DAILY SUMMARY SCHEDULER ---
if (process.env.ENABLE_DAILY_SUMMARY_SCHEDULER === 'true') {
    console.log('[DailySummary] Scheduler enabled. Checking every 60s...');
    setInterval(async () => {
        try {
            await connectDB();
            const settings = await CrmSettings.findOne();
            if (!settings || !settings.dailySummary || !settings.dailySummary.enabled) return;

            const config = settings.dailySummary;
            const targetTime = config.sendTime || '08:00';

            // Format current time in local timezone (HH:MM)
            const localTime = new Date().toLocaleTimeString('en-GB', {
                timeZone: process.env.DAILY_SUMMARY_TIMEZONE || 'America/Argentina/Buenos_Aires',
                hour: '2-digit',
                minute: '2-digit'
            });

            if (localTime === targetTime) {
                console.log(`[DailySummary] Time match (${localTime}). Triggering job...`);
                await DailySummaryService.runJob(config);
            }
        } catch (error) {
            console.error('[DailySummary] Scheduler Error:', error);
        }
    }, 60000); // Check every minute
}





// ==========================================
// WORKSHOP MODULE ROUTES (FASE 2)
// ==========================================

const workshopStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'autosporting-workshop',
        allowedFormats: ['jpg', 'png', 'jpeg', 'webp']
    },
});

const uploadWorkshop = multer({
    storage: workshopStorage,
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('LIMIT_UNEXPECTED_FILE'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 12
    }
});

const cleanupWorkshopUploads = async (files) => {
    if (!files || files.length === 0) return;
    try {
        const publicIds = files.map(f => f.filename);
        for (const id of publicIds) {
            await cloudinary.uploader.destroy(id);
        }
    } catch (err) {
        console.error('[Workshop] Failed to cleanup cloudinary files:', err.message);
    }
};

class ValidationError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const uploadOrPass = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
        return next();
    }
    if (contentType.includes('multipart/form-data')) {
        return uploadWorkshop.array('photos', 12)(req, res, async (err) => {
            if (err) {
                if (req.files && req.files.length > 0) {
                    await cleanupWorkshopUploads(req.files);
                    req.files = [];
                }
                let friendlyMessage = 'Error en el procesamiento de imágenes de taller.';
                if (err.message === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_UNEXPECTED_FILE') {
                    friendlyMessage = 'Solo se permiten imágenes (JPEG, PNG, WEBP).';
                } else if (err.code === 'LIMIT_FILE_SIZE') {
                    friendlyMessage = 'El tamaño del archivo no puede superar los 5MB.';
                } else if (err.code === 'LIMIT_FILE_COUNT') {
                    friendlyMessage = 'No se permiten más de 12 fotos.';
                }
                return res.status(400).json({ message: friendlyMessage });
            }
            next();
        });
    }
    return res.status(415).json({ message: 'Content-Type no soportado. Debe ser application/json o multipart/form-data.' });
};

const parseChecklist = (val) => {
    if (val === undefined || val === null) return [];
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed.map(String);
            throw new Error('Checklist must be an array');
        } catch (e) {
            throw new Error('checklist tiene un formato JSON inválido.');
        }
    }
    throw new Error('El campo checklist debe ser un array de strings o un string JSON válido');
};

// ---------------- PROVIDERS ----------------

const validateProviderData = (data, isUpdate = false) => {
    const { name, specialties, contacts, acceptedCurrencies, active } = data;

    if (!isUpdate || name !== undefined) {
        if (!name || typeof name !== 'string' || !name.trim()) {
            throw new ValidationError(400, 'El nombre es obligatorio y debe ser un texto no vacío.');
        }
    }

    if (specialties !== undefined) {
        if (!Array.isArray(specialties) || !specialties.every(s => typeof s === 'string')) {
            throw new ValidationError(400, 'Specialties debe ser un array de strings.');
        }
    }

    if (contacts !== undefined) {
        if (!Array.isArray(contacts)) {
            throw new ValidationError(400, 'Contacts debe ser un array de objetos.');
        }
        for (const contact of contacts) {
            if (typeof contact !== 'object' || contact === null) {
                throw new ValidationError(400, 'Cada contacto debe ser un objeto.');
            }
            const { name: cName, phone, email, role } = contact;
            if (cName !== undefined && cName !== null && typeof cName !== 'string') {
                throw new ValidationError(400, 'El nombre del contacto debe ser un texto.');
            }
            if (phone !== undefined && phone !== null && typeof phone !== 'string') {
                throw new ValidationError(400, 'El teléfono del contacto debe ser un texto.');
            }
            if (email !== undefined && email !== null && typeof email !== 'string') {
                throw new ValidationError(400, 'El email del contacto debe ser un texto.');
            }
            if (role !== undefined && role !== null && typeof role !== 'string') {
                throw new ValidationError(400, 'El rol del contacto debe ser un texto.');
            }
        }
    }

    if (acceptedCurrencies !== undefined) {
        if (!Array.isArray(acceptedCurrencies) || !acceptedCurrencies.every(c => ['ARS', 'USD'].includes(c))) {
            throw new ValidationError(400, 'AcceptedCurrencies debe ser un array con los valores "ARS" o "USD".');
        }
    }

    if (active !== undefined && typeof active !== 'boolean') {
        throw new ValidationError(400, 'El campo active debe ser un booleano.');
    }
};

app.get('/api/admin/workshop/providers', authenticateToken, requirePermission(PERMISSIONS.TALLER_READ), async (req, res) => {
    try {
        const { active, search, specialty, page = 1, limit = 100 } = req.query;

        const query = {};
        if (active !== undefined) query.active = active === 'true';
        if (specialty) query.specialties = specialty;
        if (search) {
            const regex = new RegExp(escapeRegex(search), 'i');
            query.$or = [
                { name: regex },
                { businessName: regex },
                { cuit: regex }
            ];
        }

        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 100);
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const skip = (pageNum - 1) * limitNum;

        const providers = await WorkshopProvider.find(query)
            .sort({ name: 1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const total = await WorkshopProvider.countDocuments(query);

        res.json({
            data: providers.map(p => toWorkshopProviderDto(p, req.user)),
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum)
        });
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.get('/api/admin/workshop/providers/:id', authenticateToken, requirePermission(PERMISSIONS.TALLER_READ), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID inválido' });
        }
        const provider = await WorkshopProvider.findById(req.params.id).lean();
        if (!provider) {
            return res.status(404).json({ message: 'Proveedor no encontrado' });
        }
        res.json(toWorkshopProviderDto(provider, req.user));
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.post('/api/admin/workshop/providers', authenticateToken, requirePermission(PERMISSIONS.TALLER_ADMIN), async (req, res) => {
    try {
        try {
            validateProviderData(req.body, false);
        } catch (e) {
            return res.status(400).json({ message: e.message });
        }

        const { name, businessName, cuit, specialties, contacts, paymentConditions, acceptedCurrencies, defaultWarranty, notes } = req.body;

        const provider = new WorkshopProvider({
            name, businessName, cuit, specialties, contacts, paymentConditions, acceptedCurrencies, defaultWarranty, notes
        });

        await provider.save();

        await logAudit({
            req,
            action: 'PROVEEDOR_CREADO',
            module: 'taller',
            entityType: 'WorkshopProvider',
            entityId: provider._id,
            entityLabel: provider.name,
            description: `Proveedor creado: ${provider.name}`,
            strict: false
        });

        res.status(201).json(toWorkshopProviderDto(provider.toObject(), req.user));
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.patch('/api/admin/workshop/providers/:id', authenticateToken, requirePermission(PERMISSIONS.TALLER_ADMIN), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        try {
            validateProviderData(req.body, true);
        } catch (e) {
            return res.status(400).json({ message: e.message });
        }

        const provider = await WorkshopProvider.findById(req.params.id);
        if (!provider) return res.status(404).json({ message: 'Proveedor no encontrado' });

        const allowedFields = ['name', 'businessName', 'cuit', 'specialties', 'contacts', 'paymentConditions', 'acceptedCurrencies', 'defaultWarranty', 'notes', 'active'];
        let deactivated = false;

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                if (field === 'active' && req.body.active === false && provider.active === true) {
                    deactivated = true;
                }
                provider[field] = req.body[field];
            }
        }

        await provider.save();

        await logAudit({
            req,
            action: deactivated ? 'PROVEEDOR_DESACTIVADO' : 'PROVEEDOR_MODIFICADO',
            module: 'taller',
            entityType: 'WorkshopProvider',
            entityId: provider._id,
            entityLabel: provider.name,
            description: `Proveedor modificado: ${provider.name}`,
            strict: deactivated
        });

        res.json(toWorkshopProviderDto(provider.toObject(), req.user));
    } catch (err) {
        handleMongoError(err, res);
    }
});

// ---------------- VEHICLES ----------------

app.get('/api/admin/workshop/vehicles', authenticateToken, requirePermission(PERMISSIONS.TALLER_READ), async (req, res) => {
    try {
        const { plate, clientId, brand, model, page = 1, limit = 100 } = req.query;

        const query = {};
        if (plate) query.plate = new RegExp(escapeRegex(plate), 'i');
        if (clientId) {
            if (!mongoose.Types.ObjectId.isValid(clientId)) {
                return res.status(400).json({ message: 'El parámetro clientId es inválido' });
            }
            query.clientId = clientId;
        }
        if (brand) query.brand = new RegExp(escapeRegex(brand), 'i');
        if (model) query.model = new RegExp(escapeRegex(model), 'i');

        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 100);
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const skip = (pageNum - 1) * limitNum;

        const vehicles = await CustomerVehicle.find(query)
            .populate('clientId', 'name lastName email phone dni')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const total = await CustomerVehicle.countDocuments(query);

        res.json({
            data: vehicles.map(toCustomerVehicleDto),
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum)
        });
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.get('/api/admin/workshop/vehicles/:id', authenticateToken, requirePermission(PERMISSIONS.TALLER_READ), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const vehicle = await CustomerVehicle.findById(req.params.id)
            .populate('clientId', 'name lastName email phone dni')
            .lean();
        if (!vehicle) return res.status(404).json({ message: 'Vehículo no encontrado' });
        res.json(toCustomerVehicleDto(vehicle));
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.post('/api/admin/workshop/vehicles', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        const { clientId, brand, model, version, year, plate, vin, color, km } = req.body;

        if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) return res.status(400).json({ message: 'Cliente válido es obligatorio' });

        const client = await Client.findById(clientId).lean();
        if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

        const vehicle = new CustomerVehicle({
            clientId, brand, model, version, year, plate, vin, color, km, ownersHistory: []
        });

        await vehicle.save();

        await logAudit({
            req,
            action: 'VEHICULO_CLIENTE_CREADO',
            module: 'taller',
            entityType: 'CustomerVehicle',
            entityId: vehicle._id,
            entityLabel: vehicle.plate,
            description: `Vehículo creado: ${vehicle.plate}`
        });

        res.status(201).json(toCustomerVehicleDto(vehicle.toObject()));
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.patch('/api/admin/workshop/vehicles/:id', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const vehicle = await CustomerVehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ message: 'Vehículo no encontrado' });

        const allowedFields = ['brand', 'model', 'version', 'year', 'vin', 'color', 'km', 'active'];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                vehicle[field] = req.body[field];
            }
        }

        await vehicle.save();

        await logAudit({
            req,
            action: 'VEHICULO_CLIENTE_MODIFICADO',
            module: 'taller',
            entityType: 'CustomerVehicle',
            entityId: vehicle._id,
            entityLabel: vehicle.plate,
            description: `Vehículo modificado: ${vehicle.plate}`
        });

        res.json(toCustomerVehicleDto(vehicle.toObject()));
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.post('/api/admin/workshop/vehicles/:id/transfer', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID de vehículo inválido' });

        const { newClientId } = req.body;
        if (!newClientId || !mongoose.Types.ObjectId.isValid(newClientId)) {
            return res.status(400).json({ message: 'ID de cliente nuevo inválido' });
        }

        const newClient = await Client.findById(newClientId).lean();
        if (!newClient) return res.status(404).json({ message: 'Cliente nuevo no encontrado' });

        const vehicle = await CustomerVehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ message: 'Vehículo no encontrado' });

        if (vehicle.clientId.toString() === newClientId) {
            return res.status(400).json({ message: 'El cliente ya es el propietario actual' });
        }

        const oldClientId = vehicle.clientId;

        const updatedVehicle = await CustomerVehicle.findOneAndUpdate(
            { _id: vehicle._id, clientId: oldClientId },
            {
                $set: { clientId: newClientId },
                $push: { ownersHistory: { clientId: oldClientId, date: new Date() } }
            },
            { new: true, runValidators: true }
        );

        if (!updatedVehicle) {
            const currentVehicle = await CustomerVehicle.findById(req.params.id);
            if (!currentVehicle) {
                return res.status(404).json({ message: 'Vehículo no encontrado' });
            }
            if (currentVehicle.clientId.toString() === newClientId) {
                return res.json(toCustomerVehicleDto(currentVehicle.toObject()));
            }
            return res.status(409).json({ message: 'Conflicto: el propietario del vehículo cambió concurrentemente.' });
        }

        await logAudit({
            req,
            action: 'VEHICULO_CLIENTE_TRANSFERIDO',
            module: 'taller',
            entityType: 'CustomerVehicle',
            entityId: updatedVehicle._id,
            entityLabel: updatedVehicle.plate,
            description: `Vehículo ${updatedVehicle.plate} transferido a nuevo dueño`,
            strict: true
        });

        res.json(toCustomerVehicleDto(updatedVehicle.toObject()));
    } catch (err) {
        handleMongoError(err, res);
    }
});

// ---------------- ORDERS ----------------

const validateAdminUser = async (userId, fieldName) => {
    if (userId === undefined || userId === null || userId === '' || userId === 'null') return;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError(400, `El campo ${fieldName} debe ser un ID de usuario válido.`);
    }
    const adminUser = await AdminUser.findById(userId).lean();
    if (!adminUser) {
        throw new ValidationError(400, `El usuario especificado en ${fieldName} no existe.`);
    }
    if (adminUser.active !== true) {
        throw new ValidationError(400, `El usuario especificado en ${fieldName} no está activo.`);
    }
};

app.get('/api/admin/workshop/orders', authenticateToken, requirePermission(PERMISSIONS.TALLER_READ), async (req, res) => {
    try {
        const { status, clientId, providerId, page = 1, limit = 100 } = req.query;

        const query = {};
        if (status) {
            const ORDER_STATUSES = [
                'ingresado', 'cotizando', 'esperando_aprobacion', 'aprobado',
                'enviado_proveedor', 'en_trabajo', 'terminado_proveedor',
                'recibido', 'listo', 'entregado', 'cancelado', 'en_garantia'
            ];
            if (!ORDER_STATUSES.includes(status)) {
                return res.status(400).json({ message: 'El parámetro status es inválido' });
            }
            query.status = status;
        }
        if (clientId) {
            if (!mongoose.Types.ObjectId.isValid(clientId)) {
                return res.status(400).json({ message: 'El parámetro clientId es inválido' });
            }
            query.clientId = clientId;
        }
        if (providerId) {
            if (!mongoose.Types.ObjectId.isValid(providerId)) {
                return res.status(400).json({ message: 'El parámetro providerId es inválido' });
            }
            query.providerId = providerId;
        }

        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 100);
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const skip = (pageNum - 1) * limitNum;

        const orders = await WorkshopOrder.find(query)
            .populate('clientId', 'name lastName email phone dni')
            .populate('providerId', 'name businessName')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const total = await WorkshopOrder.countDocuments(query);

        res.json({
            data: orders.map(o => toWorkshopOrderDto(o, req.user)),
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum)
        });
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.get('/api/admin/workshop/orders/:id', authenticateToken, requirePermission(PERMISSIONS.TALLER_READ), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const order = await WorkshopOrder.findById(req.params.id)
            .populate('clientId', 'name lastName email phone dni')
            .populate('providerId', 'name businessName')
            .populate('assignedTo', 'name email')
            .lean();
        if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
        res.json(toWorkshopOrderDto(order, req.user));
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.post('/api/admin/workshop/orders', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), uploadOrPass, async (req, res) => {
    let filesUploaded = req.files || [];
    try {
        const { customerVehicleId, providerId, assignedTo, sellerId, fuelLevel, damage, accessories, requestedWork } = req.body;

        let checklist;
        try {
            checklist = parseChecklist(req.body.checklist);
        } catch (e) {
            throw new ValidationError(400, e.message);
        }

        let parsedKm = undefined;
        if (req.body.km !== undefined && req.body.km !== null && req.body.km !== '') {
            parsedKm = Number(req.body.km);
            if (isNaN(parsedKm) || parsedKm < 0 || !Number.isFinite(parsedKm)) {
                throw new ValidationError(400, 'El kilometraje (km) debe ser un número finito mayor o igual a 0.');
            }
        }

        if (!customerVehicleId || !mongoose.Types.ObjectId.isValid(customerVehicleId)) {
            throw new ValidationError(400, 'Vehículo válido es obligatorio');
        }

        if (providerId && !mongoose.Types.ObjectId.isValid(providerId)) {
            throw new ValidationError(400, 'ID de proveedor inválido');
        }

        if (assignedTo) {
            await validateAdminUser(assignedTo, 'assignedTo');
        }

        if (sellerId) {
            await validateAdminUser(sellerId, 'sellerId');
        }

        await connectDB();

        const vehicle = await CustomerVehicle.findById(customerVehicleId);
        if (!vehicle) {
            throw new ValidationError(404, 'Vehículo no encontrado');
        }

        if (vehicle.active === false) {
            throw new ValidationError(400, 'El vehículo está inactivo.');
        }

        const clientId = vehicle.clientId;
        const client = await Client.findById(clientId).lean();
        if (!client) {
            throw new ValidationError(404, 'Cliente no encontrado');
        }

        const activeOrder = await WorkshopOrder.findOne({
            customerVehicleId: vehicle._id,
            status: { $nin: ['entregado', 'cancelado'] }
        });
        if (activeOrder) {
            throw new ValidationError(409, 'El vehículo ya posee una orden de taller activa.');
        }

        if (providerId) {
            const provider = await WorkshopProvider.findById(providerId).lean();
            if (!provider || !provider.active) {
                throw new ValidationError(400, 'Proveedor no encontrado o inactivo');
            }
        }

        const photos = filesUploaded.map(f => ({
            url: f.path,
            publicId: f.filename,
            name: f.originalname,
            contentType: f.mimetype,
            size: f.size
        }));

        const actorId = req.user.userId || req.user.id;
        const actorLabel = req.user.username || req.user.name || req.user.email || String(actorId);

        const stateHistory = [{
            status: 'ingresado',
            changedBy: actorId,
            actorLabel: actorLabel,
            note: 'Orden creada'
        }];

        const vehicleSnapshot = {
            plate: vehicle.plate,
            brand: vehicle.brand,
            model: vehicle.model,
            km: vehicle.km || 0
        };

        const order = new WorkshopOrder({
            clientId,
            customerVehicleId,
            providerId,
            assignedTo: (assignedTo === 'null' || assignedTo === '') ? null : assignedTo,
            sellerId: (sellerId === 'null' || sellerId === '') ? null : sellerId,
            status: 'ingresado',
            vehicleSnapshot,
            km: parsedKm,
            fuelLevel,
            checklist,
            damage,
            accessories,
            requestedWork,
            photos,
            stateHistory
        });

        await order.save();

        await logAudit({
            req,
            action: 'ORDEN_TALLER_CREADA',
            module: 'taller',
            entityType: 'WorkshopOrder',
            entityId: order._id,
            entityLabel: String(order.orderNumber),
            description: `Orden de taller creada: ${order.orderNumber}`
        });

        res.status(201).json(toWorkshopOrderDto(order.toObject(), req.user));

    } catch (err) {
        try {
            if (filesUploaded && filesUploaded.length > 0) {
                await cleanupWorkshopUploads(filesUploaded);
            }
        } catch (cleanupErr) {
            console.error('[Workshop] Failed to cleanup cloudinary files during error handling:', cleanupErr.message);
        }

        if (err instanceof ValidationError) {
            return res.status(err.status).json({ message: err.message });
        }
        handleMongoError(err, res);
    }
});

app.patch('/api/admin/workshop/orders/:id', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const order = await WorkshopOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Orden no encontrada' });

        const allowedFields = ['providerId', 'assignedTo', 'sellerId', 'km', 'fuelLevel', 'checklist', 'damage', 'accessories', 'requestedWork', 'admissionDate', 'deliveryDate'];

        if (req.body.checklist !== undefined) {
            let checklist;
            try {
                checklist = parseChecklist(req.body.checklist);
            } catch (e) {
                return res.status(400).json({ message: e.message });
            }
            req.body.checklist = checklist;
        }

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                if (field === 'assignedTo') {
                    if (req.body.assignedTo === 'null' || req.body.assignedTo === '' || req.body.assignedTo === null) {
                        order.assignedTo = null;
                    } else {
                        await validateAdminUser(req.body.assignedTo, 'assignedTo');
                        order.assignedTo = req.body.assignedTo;
                    }
                } else if (field === 'sellerId') {
                    if (req.body.sellerId === 'null' || req.body.sellerId === '' || req.body.sellerId === null) {
                        order.sellerId = null;
                    } else {
                        await validateAdminUser(req.body.sellerId, 'sellerId');
                        order.sellerId = req.body.sellerId;
                    }
                } else if (field === 'providerId') {
                    if (req.body.providerId === 'null' || req.body.providerId === '' || req.body.providerId === null) {
                        order.providerId = null;
                    } else {
                        if (!mongoose.Types.ObjectId.isValid(req.body.providerId)) {
                            return res.status(400).json({ message: 'providerId inválido' });
                        }
                        const provider = await WorkshopProvider.findById(req.body.providerId).lean();
                        if (!provider || !provider.active) {
                            return res.status(400).json({ message: 'Proveedor no encontrado o inactivo' });
                        }
                        order.providerId = req.body.providerId;
                    }
                } else if (field === 'km') {
                    if (req.body.km !== null && req.body.km !== '') {
                        const parsedKm = Number(req.body.km);
                        if (isNaN(parsedKm) || parsedKm < 0 || !Number.isFinite(parsedKm)) {
                            return res.status(400).json({ message: 'El kilometraje (km) debe ser un número finito mayor o igual a 0.' });
                        }
                        order.km = parsedKm;
                    } else {
                        order.km = undefined;
                    }
                } else {
                    if ((field === 'admissionDate' || field === 'deliveryDate') && req.body[field]) {
                        if (isNaN(Date.parse(req.body[field]))) {
                            return res.status(400).json({ message: `${field} fecha inválida` });
                        }
                    }
                    order[field] = req.body[field];
                }
            }
        }

        await order.save();

        await logAudit({
            req,
            action: 'ORDEN_TALLER_MODIFICADA',
            module: 'taller',
            entityType: 'WorkshopOrder',
            entityId: order._id,
            entityLabel: String(order.orderNumber),
            description: `Orden de taller modificada: ${order.orderNumber}`
        });

        res.json(toWorkshopOrderDto(order.toObject(), req.user));
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(err.status).json({ message: err.message });
        }
        handleMongoError(err, res);
    }
});

app.post('/api/admin/workshop/orders/:id/transition', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const { toStatus, note } = req.body;
        if (!toStatus) return res.status(400).json({ message: 'toStatus es requerido' });

        const order = await WorkshopOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Orden no encontrada' });

        if (toStatus === 'cancelado') {
            return res.status(400).json({ message: 'Use el endpoint /cancel para cancelar órdenes' });
        }

        if (order.status === toStatus) {
            return res.json(toWorkshopOrderDto(order.toObject(), req.user));
        }

        if (!canTransition(order.status, toStatus)) {
            return res.status(400).json({ message: `Transición inválida desde ${order.status} a ${toStatus}` });
        }

        if (toStatus === 'esperando_aprobacion') {
            const hasValidEstimate = await WorkshopEstimate.findOne({
                workshopOrderId: order._id,
                status: { $in: ['listo_para_enviar', 'enviado', 'aprobado', 'parcialmente_aprobado'] }
            });
            if (!hasValidEstimate) {
                return res.status(400).json({ message: 'La orden de trabajo solo puede pasar de cotizando a esperando_aprobacion si existe una versión de presupuesto válida lista para enviar o enviada.' });
            }
        }

        const oldStatus = order.status;
        const actorId = req.user.userId || req.user.id;
        const actorLabel = req.user.username || req.user.name || req.user.email || String(actorId);

        const newHistoryRecord = {
            status: toStatus,
            changedBy: actorId,
            actorLabel: actorLabel,
            note: note || `Transición de ${oldStatus} a ${toStatus}`
        };

        const updatedOrder = await WorkshopOrder.findOneAndUpdate(
            { _id: order._id, status: oldStatus },
            {
                $set: { status: toStatus },
                $push: { stateHistory: newHistoryRecord }
            },
            { new: true, runValidators: true }
        );

        if (!updatedOrder) {
            const currentOrder = await WorkshopOrder.findById(req.params.id);
            if (!currentOrder) {
                return res.status(404).json({ message: 'Orden no encontrada' });
            }
            if (currentOrder.status === toStatus) {
                return res.json(toWorkshopOrderDto(currentOrder.toObject(), req.user));
            }
            return res.status(409).json({ message: 'Conflicto: el estado de la orden cambió concurrentemente.' });
        }

        await logAudit({
            req,
            action: 'ORDEN_TALLER_TRANSICION',
            module: 'taller',
            entityType: 'WorkshopOrder',
            entityId: updatedOrder._id,
            entityLabel: String(updatedOrder.orderNumber),
            description: `Orden ${updatedOrder.orderNumber} pasó a ${toStatus}`
        });

        res.json(toWorkshopOrderDto(updatedOrder.toObject(), req.user));
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.post('/api/admin/workshop/orders/:id/cancel', authenticateToken, requirePermission(PERMISSIONS.TALLER_ADMIN), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const { reason } = req.body;
        if (typeof reason !== 'string') {
            return res.status(400).json({ message: 'El motivo de cancelación debe ser un texto válido.' });
        }
        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            return res.status(400).json({ message: 'El motivo de cancelación es obligatorio' });
        }
        if (trimmedReason.length > 1000) {
            return res.status(400).json({ message: 'El motivo de cancelación no puede superar los 1000 caracteres.' });
        }

        const order = await WorkshopOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Orden no encontrada' });

        if (order.status === 'cancelado') {
            if (order.activeVehicleId) {
                await WorkshopOrder.updateOne({ _id: order._id }, { $unset: { activeVehicleId: '' } });
                order.activeVehicleId = undefined;
            }
            return res.json(toWorkshopOrderDto(order.toObject(), req.user));
        }

        if (order.status !== 'ingresado' && order.status !== 'cotizando') {
            return res.status(400).json({ message: 'Solo se puede cancelar una orden en estado ingresado o cotizando' });
        }

        const oldStatus = order.status;
        const actorId = req.user.userId || req.user.id;
        const actorLabel = req.user.username || req.user.name || req.user.email || String(actorId);

        const newHistoryRecord = {
            status: 'cancelado',
            changedBy: actorId,
            actorLabel: actorLabel,
            note: trimmedReason
        };

        const updatedOrder = await WorkshopOrder.findOneAndUpdate(
            { _id: order._id, status: oldStatus },
            {
                $set: { status: 'cancelado' },
                $unset: { activeVehicleId: '' },
                $push: { stateHistory: newHistoryRecord }
            },
            { new: true, runValidators: true }
        );

        if (!updatedOrder) {
            const currentOrder = await WorkshopOrder.findById(req.params.id);
            if (!currentOrder) {
                return res.status(404).json({ message: 'Orden no encontrada' });
            }
            if (currentOrder.status === 'cancelado') {
                if (currentOrder.activeVehicleId) {
                    await WorkshopOrder.updateOne({ _id: currentOrder._id }, { $unset: { activeVehicleId: '' } });
                    currentOrder.activeVehicleId = undefined;
                }
                return res.json(toWorkshopOrderDto(currentOrder.toObject(), req.user));
            }
            return res.status(409).json({ message: 'Conflicto: la orden cambió de estado concurrentemente.' });
        }

        await logAudit({
            req,
            action: 'ORDEN_TALLER_CANCELADA',
            module: 'taller',
            entityType: 'WorkshopOrder',
            entityId: updatedOrder._id,
            entityLabel: String(updatedOrder.orderNumber),
            description: `Orden ${updatedOrder.orderNumber} CANCELADA. Motivo: ${trimmedReason}`,
            strict: true
        });

        res.json(toWorkshopOrderDto(updatedOrder.toObject(), req.user));
    } catch (err) {
        handleMongoError(err, res);
    }
});


// ==========================================
// WORKSHOP QUOTES AND ESTIMATES (FASE 3)
// ==========================================

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

app.post('/api/admin/workshop/quotes', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        const { workshopOrderId, providerId, currency, items, notes } = req.body;
        if (!workshopOrderId || !mongoose.Types.ObjectId.isValid(workshopOrderId)) {
            return res.status(400).json({ message: 'workshopOrderId es requerido e inválido' });
        }
        if (!providerId || !mongoose.Types.ObjectId.isValid(providerId)) {
            return res.status(400).json({ message: 'providerId es requerido e inválido' });
        }
        if (!currency || !['ARS', 'USD'].includes(currency)) {
            return res.status(400).json({ message: 'Moneda inválida. Debe ser ARS o USD' });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'items debe ser un array no vacío' });
        }

        const order = await WorkshopOrder.findById(workshopOrderId);
        if (!order) return res.status(404).json({ message: 'Orden de taller no encontrada' });

        const lastQuote = await WorkshopProviderQuote.findOne({ workshopOrderId }).sort({ version: -1 });
        const version = lastQuote ? lastQuote.version + 1 : 1;

        let totalCost = 0;
        const formattedItems = items.map(item => {
            if (!item.type || !['labor', 'part', 'subcontracted'].includes(item.type)) {
                throw new Error('Tipo de ítem inválido. Debe ser labor, part o subcontracted');
            }
            if (!item.description || typeof item.description !== 'string' || !item.description.trim()) {
                throw new Error('La descripción del ítem es requerida');
            }
            const quantity = Number(item.quantity);
            if (isNaN(quantity) || quantity <= 0) {
                throw new Error('La cantidad debe ser mayor a 0');
            }
            const providerCost = Number(item.providerCost);
            if (isNaN(providerCost) || providerCost < 0) {
                throw new Error('El costo del proveedor no puede ser negativo');
            }

            const itemCost = round2(quantity * providerCost);
            totalCost += itemCost;

            return {
                type: item.type,
                description: item.description.trim(),
                quantity,
                providerCost: round2(providerCost)
            };
        });

        const newQuote = new WorkshopProviderQuote({
            workshopOrderId,
            providerId,
            version,
            currency,
            items: formattedItems,
            totalCost: round2(totalCost),
            notes: notes || '',
            status: 'borrador'
        });

        await newQuote.save();

        await logAudit({
            req,
            action: 'COTIZACION_PROVEEDOR_CREADA',
            module: 'taller',
            entityType: 'WorkshopProviderQuote',
            entityId: newQuote._id,
            entityLabel: `V${version} - Orden ${order.orderNumber}`,
            description: `Cotización de proveedor creada para orden ${order.orderNumber} (Versión ${version})`,
            strict: true
        });

        res.status(201).json(toWorkshopProviderQuoteDto(newQuote, req.user));
    } catch (err) {
        if (err.message && (err.message.startsWith('Tipo') || err.message.startsWith('La') || err.message.startsWith('El'))) {
            return res.status(400).json({ message: err.message });
        }
        handleMongoError(err, res);
    }
});

app.get('/api/admin/workshop/quotes', authenticateToken, requirePermission(PERMISSIONS.TALLER_READ), async (req, res) => {
    try {
        const { workshopOrderId } = req.query;
        const query = {};
        if (workshopOrderId) {
            if (!mongoose.Types.ObjectId.isValid(workshopOrderId)) {
                return res.status(400).json({ message: 'workshopOrderId inválido' });
            }
            query.workshopOrderId = workshopOrderId;
        }

        const quotes = await WorkshopProviderQuote.find(query).populate('providerId').sort({ version: -1 });
        const dtos = quotes
            .map(q => toWorkshopProviderQuoteDto(q, req.user))
            .filter(q => q !== null);
        res.json(dtos);
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.get('/api/admin/workshop/quotes/:id', authenticateToken, requirePermission(PERMISSIONS.TALLER_READ), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const quote = await WorkshopProviderQuote.findById(req.params.id).populate('providerId');
        if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });

        const dto = toWorkshopProviderQuoteDto(quote, req.user);
        if (!dto) {
            return res.status(403).json({ message: 'No tiene permisos para ver los costos del taller' });
        }
        res.json(dto);
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.put('/api/admin/workshop/quotes/:id', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const quote = await WorkshopProviderQuote.findById(req.params.id);
        if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });

        const linkedEstimate = await WorkshopEstimate.findOne({ providerQuoteId: quote._id, status: { $in: ['enviado', 'aprobado', 'parcialmente_aprobado'] } });
        if (linkedEstimate) {
            return res.status(400).json({ message: 'No se puede modificar la cotización porque está asociada a un presupuesto enviado o aprobado.' });
        }

        const { providerId, currency, items, notes, status } = req.body;

        if (providerId && !mongoose.Types.ObjectId.isValid(providerId)) {
            return res.status(400).json({ message: 'providerId inválido' });
        }
        if (currency && !['ARS', 'USD'].includes(currency)) {
            return res.status(400).json({ message: 'Moneda inválida' });
        }

        if (providerId) quote.providerId = providerId;
        if (currency) quote.currency = currency;
        if (notes !== undefined) quote.notes = notes;
        if (status && ['borrador', 'aprobado', 'rechazado', 'reemplazado'].includes(status)) {
            quote.status = status;
        }

        if (items) {
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ message: 'items debe ser un array no vacío' });
            }
            let totalCost = 0;
            quote.items = items.map(item => {
                if (!item.type || !['labor', 'part', 'subcontracted'].includes(item.type)) {
                    throw new Error('Tipo de ítem inválido');
                }
                if (!item.description || typeof item.description !== 'string' || !item.description.trim()) {
                    throw new Error('La descripción del ítem es requerida');
                }
                const quantity = Number(item.quantity);
                if (isNaN(quantity) || quantity <= 0) {
                    throw new Error('La cantidad debe ser mayor a 0');
                }
                const providerCost = Number(item.providerCost);
                if (isNaN(providerCost) || providerCost < 0) {
                    throw new Error('El costo del proveedor no puede ser negativo');
                }

                const itemCost = round2(quantity * providerCost);
                totalCost += itemCost;

                return {
                    type: item.type,
                    description: item.description.trim(),
                    quantity,
                    providerCost: round2(providerCost)
                };
            });
            quote.totalCost = round2(totalCost);
        }

        await quote.save();

        await logAudit({
            req,
            action: 'COTIZACION_PROVEEDOR_MODIFICADA',
            module: 'taller',
            entityType: 'WorkshopProviderQuote',
            entityId: quote._id,
            entityLabel: `V${quote.version}`,
            description: `Cotización de proveedor modificada (Versión ${quote.version})`,
            strict: true
        });

        res.json(toWorkshopProviderQuoteDto(quote, req.user));
    } catch (err) {
        if (err.message && (err.message.startsWith('Tipo') || err.message.startsWith('La') || err.message.startsWith('El'))) {
            return res.status(400).json({ message: err.message });
        }
        handleMongoError(err, res);
    }
});

app.delete('/api/admin/workshop/quotes/:id', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const quote = await WorkshopProviderQuote.findById(req.params.id);
        if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });

        const linkedEstimate = await WorkshopEstimate.findOne({ providerQuoteId: quote._id });
        if (linkedEstimate) {
            return res.status(400).json({ message: 'No se puede eliminar la cotización porque está asociada a un presupuesto comercial.' });
        }

        await quote.deleteOne();

        await logAudit({
            req,
            action: 'COTIZACION_PROVEEDOR_ELIMINADA',
            module: 'taller',
            entityType: 'WorkshopProviderQuote',
            entityId: quote._id,
            entityLabel: `V${quote.version}`,
            description: `Cotización de proveedor eliminada (Versión ${quote.version})`,
            strict: true
        });

        res.json({ message: 'Cotización eliminada exitosamente' });
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.post('/api/admin/workshop/estimates', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        const { workshopOrderId, providerQuoteId, currency, items, notes } = req.body;
        if (!workshopOrderId || !mongoose.Types.ObjectId.isValid(workshopOrderId)) {
            return res.status(400).json({ message: 'workshopOrderId es requerido e inválido' });
        }
        if (providerQuoteId && !mongoose.Types.ObjectId.isValid(providerQuoteId)) {
            return res.status(400).json({ message: 'providerQuoteId inválido' });
        }
        if (!currency || !['ARS', 'USD'].includes(currency)) {
            return res.status(400).json({ message: 'Moneda inválida. Debe ser ARS o USD' });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'items debe ser un array no vacío' });
        }

        const order = await WorkshopOrder.findById(workshopOrderId);
        if (!order) return res.status(404).json({ message: 'Orden de taller no encontrada' });

        const lastEstimate = await WorkshopEstimate.findOne({ workshopOrderId }).sort({ version: -1 });
        const version = lastEstimate ? lastEstimate.version + 1 : 1;

        let totalCost = 0;
        let totalPrice = 0;

        const formattedItems = items.map(item => {
            if (!item.type || !['labor', 'part', 'subcontracted'].includes(item.type)) {
                throw new Error('Tipo de ítem inválido. Debe ser labor, part o subcontracted');
            }
            if (!item.description || typeof item.description !== 'string' || !item.description.trim()) {
                throw new Error('La descripción del ítem es requerida');
            }
            const quantity = Number(item.quantity);
            if (isNaN(quantity) || quantity <= 0) {
                throw new Error('La cantidad debe ser mayor a 0');
            }
            const providerCost = Number(item.providerCost || 0);
            if (isNaN(providerCost) || providerCost < 0) {
                throw new Error('El costo del proveedor no puede ser negativo');
            }
            const clientPrice = Number(item.clientPrice);
            if (isNaN(clientPrice) || clientPrice < 0) {
                throw new Error('El precio al cliente no puede ser negativo');
            }

            const itemCost = round2(quantity * providerCost);
            const itemPrice = round2(quantity * clientPrice);

            totalCost += itemCost;
            totalPrice += itemPrice;

            return {
                type: item.type,
                description: item.description.trim(),
                quantity,
                providerCost: round2(providerCost),
                clientPrice: round2(clientPrice)
            };
        });

        const profit = round2(totalPrice - totalCost);
        const margin = totalPrice > 0 ? round2((profit / totalPrice) * 100) : 0;

        const newEstimate = new WorkshopEstimate({
            workshopOrderId,
            providerQuoteId: providerQuoteId || null,
            version,
            currency,
            items: formattedItems,
            totalCost: round2(totalCost),
            totalPrice: round2(totalPrice),
            profit,
            margin,
            notes: notes || '',
            status: 'borrador'
        });

        await newEstimate.save();

        await logAudit({
            req,
            action: 'PRESUPUESTO_COMERCIAL_CREADO',
            module: 'taller',
            entityType: 'WorkshopEstimate',
            entityId: newEstimate._id,
            entityLabel: `V${version} - Orden ${order.orderNumber}`,
            description: `Presupuesto comercial creado para orden ${order.orderNumber} (Versión ${version})`,
            strict: true
        });

        res.status(201).json(toWorkshopEstimateDto(newEstimate, req.user));
    } catch (err) {
        if (err.message && (err.message.startsWith('Tipo') || err.message.startsWith('La') || err.message.startsWith('El') || err.message.startsWith('La cantidad') || err.message.startsWith('El precio'))) {
            return res.status(400).json({ message: err.message });
        }
        handleMongoError(err, res);
    }
});

app.get('/api/admin/workshop/estimates', authenticateToken, requirePermission(PERMISSIONS.TALLER_READ), async (req, res) => {
    try {
        const { workshopOrderId } = req.query;
        const query = {};
        if (workshopOrderId) {
            if (!mongoose.Types.ObjectId.isValid(workshopOrderId)) {
                return res.status(400).json({ message: 'workshopOrderId inválido' });
            }
            query.workshopOrderId = workshopOrderId;
        }

        const estimates = await WorkshopEstimate.find(query).sort({ version: -1 });
        const dtos = estimates.map(e => toWorkshopEstimateDto(e, req.user));
        res.json(dtos);
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.get('/api/admin/workshop/estimates/:id', authenticateToken, requirePermission(PERMISSIONS.TALLER_READ), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const estimate = await WorkshopEstimate.findById(req.params.id);
        if (!estimate) return res.status(404).json({ message: 'Presupuesto no encontrado' });

        res.json(toWorkshopEstimateDto(estimate, req.user));
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.put('/api/admin/workshop/estimates/:id', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const estimate = await WorkshopEstimate.findById(req.params.id);
        if (!estimate) return res.status(404).json({ message: 'Presupuesto no encontrado' });

        if (!['borrador', 'listo_para_enviar'].includes(estimate.status)) {
            return res.status(400).json({ message: `No se puede modificar el presupuesto porque está en estado: ${estimate.status}. Solo se permiten modificaciones en borrador o listo para enviar.` });
        }

        const { providerQuoteId, currency, items, notes, status } = req.body;

        if (providerQuoteId && !mongoose.Types.ObjectId.isValid(providerQuoteId)) {
            return res.status(400).json({ message: 'providerQuoteId inválido' });
        }
        if (currency && !['ARS', 'USD'].includes(currency)) {
            return res.status(400).json({ message: 'Moneda inválida' });
        }

        if (providerQuoteId !== undefined) estimate.providerQuoteId = providerQuoteId || null;
        if (currency) estimate.currency = currency;
        if (notes !== undefined) estimate.notes = notes;
        if (status && ['borrador', 'listo_para_enviar', 'enviado', 'parcialmente_aprobado', 'aprobado', 'rechazado', 'vencido', 'reemplazado'].includes(status)) {
            estimate.status = status;
        }

        if (items) {
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ message: 'items debe ser un array no vacío' });
            }
            let totalCost = 0;
            let totalPrice = 0;

            estimate.items = items.map(item => {
                if (!item.type || !['labor', 'part', 'subcontracted'].includes(item.type)) {
                    throw new Error('Tipo de ítem inválido. Debe ser labor, part o subcontracted');
                }
                if (!item.description || typeof item.description !== 'string' || !item.description.trim()) {
                    throw new Error('La descripción del ítem es requerida');
                }
                const quantity = Number(item.quantity);
                if (isNaN(quantity) || quantity <= 0) {
                    throw new Error('La cantidad debe ser mayor a 0');
                }
                const providerCost = Number(item.providerCost || 0);
                if (isNaN(providerCost) || providerCost < 0) {
                    throw new Error('El costo del proveedor no puede ser negativo');
                }
                const clientPrice = Number(item.clientPrice);
                if (isNaN(clientPrice) || clientPrice < 0) {
                    throw new Error('El precio al cliente no puede ser negativo');
                }

                const itemCost = round2(quantity * providerCost);
                const itemPrice = round2(quantity * clientPrice);

                totalCost += itemCost;
                totalPrice += itemPrice;

                return {
                    type: item.type,
                    description: item.description.trim(),
                    quantity,
                    providerCost: round2(providerCost),
                    clientPrice: round2(clientPrice)
                };
            });

            estimate.totalCost = round2(totalCost);
            estimate.totalPrice = round2(totalPrice);
            estimate.profit = round2(totalPrice - totalCost);
            estimate.margin = totalPrice > 0 ? round2((estimate.profit / totalPrice) * 100) : 0;
        }

        await estimate.save();

        await logAudit({
            req,
            action: 'PRESUPUESTO_COMERCIAL_MODIFICADO',
            module: 'taller',
            entityType: 'WorkshopEstimate',
            entityId: estimate._id,
            entityLabel: `V${estimate.version}`,
            description: `Presupuesto comercial modificado (Versión ${estimate.version})`,
            strict: true
        });

        res.json(toWorkshopEstimateDto(estimate, req.user));
    } catch (err) {
        if (err.message && (err.message.startsWith('Tipo') || err.message.startsWith('La') || err.message.startsWith('El') || err.message.startsWith('La cantidad') || err.message.startsWith('El precio'))) {
            return res.status(400).json({ message: err.message });
        }
        handleMongoError(err, res);
    }
});

app.delete('/api/admin/workshop/estimates/:id', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const estimate = await WorkshopEstimate.findById(req.params.id);
        if (!estimate) return res.status(404).json({ message: 'Presupuesto no encontrado' });

        if (estimate.status !== 'borrador') {
            return res.status(400).json({ message: 'Solo se pueden eliminar presupuestos en estado borrador.' });
        }

        await estimate.deleteOne();

        await logAudit({
            req,
            action: 'PRESUPUESTO_COMERCIAL_ELIMINADO',
            module: 'taller',
            entityType: 'WorkshopEstimate',
            entityId: estimate._id,
            entityLabel: `V${estimate.version}`,
            description: `Presupuesto comercial eliminado (Versión ${estimate.version})`,
            strict: true
        });

        res.json({ message: 'Presupuesto eliminado exitosamente' });
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.post('/api/admin/workshop/estimates/:id/revision', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const original = await WorkshopEstimate.findById(req.params.id);
        if (!original) return res.status(404).json({ message: 'Presupuesto no encontrado' });

        if (['borrador', 'listo_para_enviar', 'enviado'].includes(original.status)) {
            original.status = 'reemplazado';
            await original.save();
        }

        const lastEstimate = await WorkshopEstimate.findOne({ workshopOrderId: original.workshopOrderId }).sort({ version: -1 });
        const version = lastEstimate ? lastEstimate.version + 1 : 1;

        const clone = new WorkshopEstimate({
            workshopOrderId: original.workshopOrderId,
            providerQuoteId: original.providerQuoteId,
            version,
            currency: original.currency,
            items: original.items.map(i => ({
                type: i.type,
                description: i.description,
                quantity: i.quantity,
                providerCost: i.providerCost,
                clientPrice: i.clientPrice
            })),
            totalCost: original.totalCost,
            totalPrice: original.totalPrice,
            profit: original.profit,
            margin: original.margin,
            notes: original.notes,
            status: 'borrador'
        });

        await clone.save();

        await logAudit({
            req,
            action: 'PRESUPUESTO_COMERCIAL_REVISION',
            module: 'taller',
            entityType: 'WorkshopEstimate',
            entityId: clone._id,
            entityLabel: `V${version}`,
            description: `Se creó una revisión V${version} desde la versión V${original.version}`,
            strict: true
        });

        res.status(201).json(toWorkshopEstimateDto(clone, req.user));
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.post('/api/admin/workshop/estimates/:id/ready', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const estimate = await WorkshopEstimate.findById(req.params.id);
        if (!estimate) return res.status(404).json({ message: 'Presupuesto no encontrado' });

        if (estimate.status !== 'borrador') {
            return res.status(400).json({ message: 'Solo se puede marcar como listo para enviar un presupuesto en estado borrador.' });
        }

        estimate.status = 'listo_para_enviar';
        await estimate.save();

        await logAudit({
            req,
            action: 'PRESUPUESTO_COMERCIAL_LISTO',
            module: 'taller',
            entityType: 'WorkshopEstimate',
            entityId: estimate._id,
            entityLabel: `V${estimate.version}`,
            description: `Presupuesto comercial versión V${estimate.version} marcado como listo para enviar`,
            strict: true
        });

        res.json(toWorkshopEstimateDto(estimate, req.user));
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.post('/api/admin/workshop/estimates/:id/send', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const estimate = await WorkshopEstimate.findById(req.params.id);
        if (!estimate) return res.status(404).json({ message: 'Presupuesto no encontrado' });

        if (estimate.status !== 'listo_para_enviar' && estimate.status !== 'borrador') {
            return res.status(400).json({ message: 'Solo se puede enviar un presupuesto en estado borrador o listo para enviar.' });
        }

        estimate.status = 'enviado';
        await estimate.save();

        await logAudit({
            req,
            action: 'PRESUPUESTO_COMERCIAL_ENVIADO',
            module: 'taller',
            entityType: 'WorkshopEstimate',
            entityId: estimate._id,
            entityLabel: `V${estimate.version}`,
            description: `Presupuesto comercial versión V${estimate.version} enviado al cliente`,
            strict: true
        });

        res.json(toWorkshopEstimateDto(estimate, req.user));
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.post('/api/admin/workshop/estimates/:id/status', authenticateToken, requirePermission(PERMISSIONS.TALLER_WRITE), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });

        const { status } = req.body;
        const validStatuses = ['aprobado', 'parcialmente_aprobado', 'rechazado', 'vencido', 'reemplazado'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ message: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}` });
        }

        const estimate = await WorkshopEstimate.findById(req.params.id);
        if (!estimate) return res.status(404).json({ message: 'Presupuesto no encontrado' });

        if (status === 'aprobado' && estimate.providerQuoteId) {
            await WorkshopProviderQuote.findByIdAndUpdate(estimate.providerQuoteId, { status: 'aprobado' });
        } else if (status === 'rechazado' && estimate.providerQuoteId) {
            await WorkshopProviderQuote.findByIdAndUpdate(estimate.providerQuoteId, { status: 'rechazado' });
        }

        estimate.status = status;
        await estimate.save();

        await logAudit({
            req,
            action: 'PRESUPUESTO_COMERCIAL_ESTADO_CAMBIADO',
            module: 'taller',
            entityType: 'WorkshopEstimate',
            entityId: estimate._id,
            entityLabel: `V${estimate.version}`,
            description: `Presupuesto comercial versión V${estimate.version} cambiado a estado: ${status}`,
            strict: true
        });

        res.json(toWorkshopEstimateDto(estimate, req.user));
    } catch (err) {
        handleMongoError(err, res);
    }
});

app.get('/api/admin/workshop/orders/:orderId/estimates', authenticateToken, requirePermission(PERMISSIONS.TALLER_READ), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) return res.status(400).json({ message: 'ID de orden inválido' });

        const estimates = await WorkshopEstimate.find({ workshopOrderId: req.params.orderId }).sort({ version: -1 });
        const dtos = estimates.map(e => toWorkshopEstimateDto(e, req.user));
        res.json(dtos);
    } catch (err) {
        handleMongoError(err, res);
    }
});


// ==========================================
// INTERNAL CRON JOBS
// ==========================================

const handleLeadSlaCron = async (req, res) => {
    try {
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || cronSecret.trim() === '') {
            return res.status(503).json({ message: 'CRON_SECRET not configured' });
        }

        const authHeader = req.headers['authorization'];
        if (!authHeader || authHeader === 'Bearer undefined' || authHeader !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ message: 'Unauthorized cron request' });
        }

        const result = await checkLeadSLA();
        res.json(result);
    } catch (err) {
        console.error('Error running lead SLA cron:', err);
        res.status(500).json({ error: err.message });
    }
};

app.get('/api/internal/jobs/lead-sla', handleLeadSlaCron);
app.post('/api/internal/jobs/lead-sla', handleLeadSlaCron);

// ==========================================

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;
