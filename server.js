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
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';



const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET?.trim();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS_PER_IDENTITY = 5;
const LOGIN_MAX_ATTEMPTS_PER_IP = 20;
const loginAttempts = new Map();

// Connect to MongoDB (disabled at top-level to prevent Serverless/NextJS TDZ)
// connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Configure Multer for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'autosporting-cars',
        allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

const upload = multer({ storage: storage });

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

    return {
        ipKey: `ip:${ip}`,
        identityKey: `identity:${ip}:${email}`
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

const recordFailedLogin = (req) => {
    const { ipKey, identityKey } = getLoginAttemptKeys(req);
    incrementLoginAttempt(ipKey);
    incrementLoginAttempt(identityKey);
};

const clearLoginAttempts = (req) => {
    const { ipKey, identityKey } = getLoginAttemptKeys(req);
    loginAttempts.delete(identityKey);

    const ipAttempt = getActiveLoginAttempt(ipKey);
    if (ipAttempt) {
        ipAttempt.count = Math.max(0, ipAttempt.count - 1);
        if (ipAttempt.count === 0) loginAttempts.delete(ipKey);
    }
};

const requireJwtConfiguration = (req, res, next) => {
    if (!JWT_SECRET) {
        console.error('Authentication unavailable: JWT_SECRET is not configured.');
        return res.status(503).json({ message: 'Servicio de autenticacion no disponible.' });
    }
    next();
};

const enforceLoginRateLimit = (req, res, next) => {
    const { ipKey, identityKey } = getLoginAttemptKeys(req);
    const ipAttempt = getActiveLoginAttempt(ipKey);
    const identityAttempt = getActiveLoginAttempt(identityKey);

    if (
        (ipAttempt?.count || 0) >= LOGIN_MAX_ATTEMPTS_PER_IP ||
        (identityAttempt?.count || 0) >= LOGIN_MAX_ATTEMPTS_PER_IDENTITY
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
            recordFailedLogin(req);
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
            clearLoginAttempts(req);
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

        recordFailedLogin(req);

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
app.post('/api/admin/audit-logs/client-event', authenticateToken, async (req, res) => {
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
app.post('/api/cars', authenticateToken, upload.array('images', 20), async (req, res) => {
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

// GET all cars for Admin (Protected, Full Data)
app.get('/api/admin/cars', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        const cars = await Car.find().select('-auditLog').sort({ order: 1, createdAt: -1 }).lean();
        res.json(cars);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET single car for Admin (Protected, Full Data)
app.get('/api/admin/cars/:id', authenticateToken, async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ message: 'Car not found' });
        res.json(car);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH update car
app.patch('/api/admin/cars/:id', authenticateToken, upload.array('images', 20), async (req, res) => {
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
                updates.documentation = { ...car.documentation, ...parsedDocs };
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
app.put('/api/cars/reorder/batch', authenticateToken, async (req, res) => {
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

// DELETE car (Protected, Safe Delete)
app.delete('/api/cars/:id', authenticateToken, async (req, res) => {
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
app.get('/api/admin/clients', authenticateToken, async (req, res) => {
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
app.get('/api/admin/clients/:id', authenticateToken, async (req, res) => {
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
app.post('/api/admin/clients', authenticateToken, async (req, res) => {
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
app.patch('/api/admin/clients/:id', authenticateToken, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });
        
        const payload = req.body;
        const allowedFields = [
            'firstName', 'lastName', 'fullName', 'phone', 'email', 'dniCuit',
            'locality', 'province', 'address', 'type', 'source', 'status', 'tags', 'notes'
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
app.get('/api/admin/leads', authenticateToken, async (req, res) => {
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
app.get('/api/admin/leads/:id', authenticateToken, async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('vehicleId', 'brand name year plateOrVin price currency status')
            .populate('clientId', 'fullName firstName lastName phone email');
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        res.json(lead);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST new admin lead
app.post('/api/admin/leads', authenticateToken, async (req, res) => {
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
app.patch('/api/admin/leads/:id', authenticateToken, async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        
        const payload = req.body;
        const allowedFields = [
            'name', 'phone', 'email', 'vehicleId', 'source', 
            'crmStatus', 'priority', 'assignedTo', 'nextActionDate', 'pipelineStage'
        ];
        
        const user = req.user?.username || 'Admin';
        const newAuditLogs = [];
        
        allowedFields.forEach(field => {
            if (payload[field] !== undefined && payload[field] !== lead[field] && JSON.stringify(payload[field]) !== JSON.stringify(lead[field])) {
                let action = 'ACTUALIZACION';
                if (field === 'crmStatus') action = 'CAMBIO_ESTADO';
                if (field === 'priority') action = 'CAMBIO_PRIORIDAD';
                if (field === 'vehicleId') action = 'CAMBIO_VEHICULO';
                
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
app.patch('/api/admin/leads/:id/link-client', authenticateToken, async (req, res) => {
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
app.patch('/api/admin/leads/:id/tasks/:taskId', authenticateToken, async (req, res) => {
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
app.post('/api/leads', authenticateToken, async (req, res) => {
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
app.put('/api/leads/:id', authenticateToken, async (req, res) => {
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
app.delete('/api/leads/:id', authenticateToken, async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
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

app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { title, dueDate } = req.body;
        const newTask = new Task({ title, dueDate });
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
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

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
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
app.get('/api/accounts', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
        const accounts = await Account.find().sort({ name: 1 });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/accounts', authenticateToken, async (req, res) => {
    try {
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
        const { name, type, currency, openingBalance } = req.body;
        if (!name || !currency) {
            return res.status(400).json({ message: 'Nombre y moneda son requeridos' });
        }

        const balance = openingBalance ? Number(openingBalance) : 0;
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
                description: `Saldo inicial de caja ÔÇö ${name}`,
                category: 'Saldo inicial',
                date: new Date(),
                accountId: savedAccount._id
            });
            await initTx.save();
        }

        res.status(201).json(savedAccount);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/accounts/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
        await Transaction.deleteMany({ accountId: req.params.id });
        const account = await Account.findByIdAndDelete(req.params.id);
        if (!account) return res.status(404).json({ message: 'Account not found' });
        res.json({ message: 'Caja y sus movimientos asociados eliminados con ├®xito' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- FINANCE TRANSACTIONS ROUTES ---
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
        const transactions = await Transaction.find()
            .populate('accountId')
            .populate('carId')
            .sort({ date: -1, createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/transactions', authenticateToken, async (req, res) => {
    try {
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
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

app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
        const tx = await Transaction.findById(req.params.id);
        if (!tx) return res.status(404).json({ message: 'Transacci├│n no encontrada' });

        const account = await Account.findById(tx.accountId);
        if (account) {
            const revertChange = tx.type === 'Ingreso' ? -tx.amount : tx.amount;
            account.balance += revertChange;
            await account.save();
        }

        await Transaction.findByIdAndDelete(req.params.id);
        res.json({ message: 'Transacci├│n eliminada y balance de caja revertido' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- RESERVATIONS ROUTES ---

// GET all reservations
app.get('/api/admin/reservations', authenticateToken, async (req, res) => {
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
app.get('/api/admin/reservations/:id', authenticateToken, async (req, res) => {
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
app.post('/api/admin/reservations', authenticateToken, async (req, res) => {
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
app.patch('/api/admin/reservations/:id', authenticateToken, async (req, res) => {
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
app.delete('/api/admin/reservations/:id', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        const reservation = await Reservation.findById(req.params.id);
        
        if (!reservation) {
            return res.status(404).json({ error: 'Reserva no encontrada.' });
        }
        
        if (reservation.status !== 'cancelada' && reservation.status !== 'convertida') {
            return res.status(400).json({ error: 'Solo se pueden eliminar reservas canceladas o convertidas.' });
        }

        await Reservation.findByIdAndDelete(req.params.id);
        res.json({ message: 'Reserva eliminada exitosamente.' });
    } catch (error) {
        console.error('Error deleting reservation:', error);
        res.status(500).json({ error: 'Error interno al eliminar la reserva.' });
    }
});

// PATCH link client to reservation
app.patch('/api/admin/reservations/:id/link-client', authenticateToken, async (req, res) => {
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

// --- SALES ROUTES ---

// GET all sales
app.get('/api/admin/sales', authenticateToken, async (req, res) => {
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
app.get('/api/admin/sales/:id', authenticateToken, async (req, res) => {
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
app.post('/api/admin/sales', authenticateToken, async (req, res) => {
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
app.post('/api/admin/reservations/:id/convert-to-sale', authenticateToken, async (req, res) => {
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
app.patch('/api/admin/sales/:id/link-client', authenticateToken, async (req, res) => {
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
app.post('/api/admin/sales/:id/create-link-client', authenticateToken, async (req, res) => {
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

app.patch('/api/admin/sales/:id/link-vehicle', authenticateToken, async (req, res) => {
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

app.post('/api/admin/sales/:id/create-link-vehicle', authenticateToken, async (req, res) => {
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
app.post('/api/admin/sales/:id/backfill-client-from-reservation', authenticateToken, async (req, res) => {
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
app.patch('/api/admin/sales/:id/trade-ins', authenticateToken, async (req, res) => {
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
app.post('/api/admin/sales/:id/trade-ins/:tradeInIndex/create-stock-car', authenticateToken, async (req, res) => {
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
app.patch('/api/admin/sales/:id', authenticateToken, async (req, res) => {
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
        const { type, category, concept, amount, currency, paymentMethod, date, notes, saleId, reservationId, clientId, vehicleId, installmentId } = req.body;
        
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
        const { category, concept, paymentMethod, date, notes, status, saleId, reservationId, clientId, vehicleId, installmentId } = req.body;
        
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

app.get('/api/admin/installments', authenticateToken, async (req, res) => {
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

app.get('/api/admin/installments/:id', authenticateToken, async (req, res) => {
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

app.post('/api/admin/installments', authenticateToken, async (req, res) => {
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

app.patch('/api/admin/installments/:id', authenticateToken, async (req, res) => {
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
        const allowedUpdates = ['dueDate', 'amount', 'currency', 'status', 'notes', 'customerName', 'customerPhone', 'concept', 'paymentMethod'];
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

app.delete('/api/admin/installments/:id', authenticateToken, async (req, res) => {
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

        await Installment.findByIdAndDelete(req.params.id);
        
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

app.post('/api/admin/sales/:id/installments/generate', authenticateToken, async (req, res) => {
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

app.delete('/api/admin/sales/:id/installments', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Sale ID inválido' });
        }
        if (!req.user || (req.user.role !== 'owner' && req.user.role !== 'admin')) {
            return res.status(403).json({ message: 'Solo owner/admin pueden eliminar cuotas.' });
        }
        const saleId = req.params.id;

        // Removed safety checks per user request: deleting plan forcefully.

        await Installment.deleteMany({ saleId });

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
app.get('/api/admin/crm-tasks', authenticateToken, async (req, res) => {
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
app.post('/api/admin/crm-tasks', authenticateToken, async (req, res) => {
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
app.patch('/api/admin/crm-tasks/:id', authenticateToken, async (req, res) => {
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

app.get('/api/admin/team-dashboard', authenticateToken, async (req, res) => {
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

app.get('/api/admin/team-dashboard/:userId', authenticateToken, async (req, res) => {
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
app.get('/api/admin/team-productivity', authenticateToken, async (req, res) => {
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

app.get('/api/admin/communication-logs', authenticateToken, async (req, res) => {
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

app.post('/api/admin/communication-logs', authenticateToken, async (req, res) => {
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

app.patch('/api/admin/communication-logs/:id', authenticateToken, async (req, res) => {
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

app.delete('/api/admin/communication-logs/:id', authenticateToken, async (req, res) => {
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

app.get('/api/admin/message-templates', authenticateToken, async (req, res) => {
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

app.post('/api/admin/message-templates', authenticateToken, async (req, res) => {
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

app.patch('/api/admin/message-templates/:id', authenticateToken, async (req, res) => {
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

app.delete('/api/admin/message-templates/:id', authenticateToken, async (req, res) => {
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
app.post('/api/admin/message-templates/init', authenticateToken, async (req, res) => {
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

app.get('/api/admin/team-goals', authenticateToken, async (req, res) => {
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

app.post('/api/admin/team-goals', authenticateToken, async (req, res) => {
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

app.patch('/api/admin/team-goals/:id', authenticateToken, async (req, res) => {
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

app.get('/api/admin/team-goals/progress', authenticateToken, async (req, res) => {
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
app.patch('/api/admin/assignments', authenticateToken, async (req, res) => {
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
            'defaultCurrency', 'businessHours', 'thresholds', 'notifications'
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
        const transactions = await PersonalTransaction.find().sort({ transactionDate: -1, createdAt: -1 }).lean();
        res.json(transactions);
    } catch (error) {
        console.error('GET /api/admin/personal-transactions error:', error);
        res.status(500).json({ message: 'Error interno al obtener transacciones personales' });
    }
});

app.post('/api/admin/personal-transactions', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        const user = req.user ? (req.user.email || req.user.role) : 'System';
        const data = { ...req.body, createdBy: user };
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
        const user = req.user ? (req.user.email || req.user.role) : 'System';
        const updated = await PersonalTransaction.findByIdAndUpdate(
            id,
            { ...req.body, updatedBy: user },
            { new: true, runValidators: true }
        );
        if (!updated) {
            return res.status(404).json({ message: 'Transacción personal no encontrada' });
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
        const deleted = await PersonalTransaction.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Transacción personal no encontrada' });
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

app.get('/api/admin/quotes', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        const { search, status, clientId, limit = 50, page = 1 } = req.query;
        let query = {};

        if (status) query.status = status;
        if (clientId) query.clientId = clientId;
        if (search) {
            const isNum = !isNaN(parseInt(search));
            if (isNum) {
                query.quoteNumber = parseInt(search);
            } else {
                query.vehicleDescription = { $regex: new RegExp(search, 'i') };
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const parsedLimit = parseInt(limit);

        const quotes = await Quote.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parsedLimit)
            .populate('clientId', 'firstName lastName fullName phone email dniCuit')
            .populate('vehicleId', 'brand model year price')
            .populate('assignedTo', 'firstName lastName email')
            .lean();

        const total = await Quote.countDocuments(query);

        res.json({ quotes, total, pages: Math.ceil(total / parsedLimit) });
    } catch (error) {
        console.error('GET /api/admin/quotes error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/quotes/:id', authenticateToken, async (req, res) => {
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

app.post('/api/admin/quotes', authenticateToken, requirePermission(PERMISSIONS.COTIZACIONES_WRITE), async (req, res) => {
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

app.patch('/api/admin/quotes/:id', authenticateToken, requirePermission(PERMISSIONS.COTIZACIONES_WRITE), async (req, res) => {
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

app.delete('/api/admin/quotes/:id', authenticateToken, requirePermission(PERMISSIONS.COTIZACIONES_DELETE), async (req, res) => {
    try {
        await connectDB();
        const deleted = await Quote.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Cotización no encontrada' });
        
        await logAudit({
            req,
            action: 'ELIMINACION',
            module: 'cotizaciones',
            entityId: req.params.id,
            entityType: 'Quote',
            description: `Cotización #${deleted.quoteNumber} eliminada`
        });

        res.json({ message: 'Cotización eliminada correctamente' });
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
        const { fromAccountId, toAccountId, amount, currency, concept, date } = req.body;
        if (!fromAccountId || !toAccountId || !amount || !currency) {
            return res.status(400).json({ message: 'Campos requeridos faltantes' });
        }

        const [fromAccount, toAccount] = await Promise.all([
            Account.findById(fromAccountId),
            Account.findById(toAccountId)
        ]);

        if (!fromAccount || !toAccount) {
            return res.status(404).json({ message: 'Cuentas no encontradas' });
        }

        const txDate = date ? new Date(date) : new Date();

        // Egreso
        const egreso = new Transaction({
            type: 'Egreso',
            amount: Number(amount),
            currency,
            description: `Transferencia enviada a ${toAccount.name}`,
            category: 'Transferencia Interna',
            accountId: fromAccountId,
            concept: concept || 'Transferencia entre cuentas',
            module: 'crm_v2',
            source: 'manual',
            paymentMethod: 'otro',
            date: txDate,
            createdBy: req.user.username,
            transactionAuditLog: [{ action: 'CREACION', details: 'Transferencia saliente', user: req.user.username }]
        });

        // Ingreso
        const ingreso = new Transaction({
            type: 'Ingreso',
            amount: Number(amount),
            currency,
            description: `Transferencia recibida de ${fromAccount.name}`,
            category: 'Transferencia Interna',
            accountId: toAccountId,
            concept: concept || 'Transferencia entre cuentas',
            module: 'crm_v2',
            source: 'manual',
            paymentMethod: 'otro',
            date: txDate,
            createdBy: req.user.username,
            transactionAuditLog: [{ action: 'CREACION', details: 'Transferencia entrante', user: req.user.username }]
        });

        await Promise.all([egreso.save(), ingreso.save()]);

        await logAudit({
            req,
            action: 'TRANSFERENCIA_INTERNA',
            module: 'finanzas',
            entityId: null,
            entityType: 'Transaction',
            description: `Transferencia de ${currency} ${amount} desde ${fromAccount.name} a ${toAccount.name}`
        });

        res.json({ message: 'Transferencia exitosa' });
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
        const checks = await Check.find().sort({ dueDate: 1 }).lean();
        res.json(checks);
    } catch (error) {
        console.error('GET /api/admin/checks error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/checks', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
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
        const updated = await Check.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user.username, updatedAt: Date.now() }, { new: true });
        if (!updated) return res.status(404).json({ message: 'Cheque no encontrado' });
        await logAudit({
            req, action: 'MODIFICACION', module: 'finanzas', entityId: updated._id, entityType: 'Check', description: `Cheque ${updated.number} actualizado a estado ${updated.status}`
        });
        res.json(updated);
    } catch (error) {
        console.error('PATCH /api/admin/checks/:id error:', error);
        res.status(500).json({ message: error.message });
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

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;
