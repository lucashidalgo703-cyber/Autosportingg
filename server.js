import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import connectDB from './src/config/db.js';
import cloudinary from './src/config/cloudinary.js';
import Car from './src/models/Car.js';
import Lead from './src/models/Lead.js';
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
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';



const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_123';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '116sporting';

// Connect to MongoDB
connectDB();

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

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Routes

// Helper functions for password hashing using native crypto
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, key] = storedHash.split(':');
    const hashBuffer = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, 'hex');
    // Prevent timing attacks
    if (hashBuffer.length !== keyBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, keyBuffer);
};

// Login Endpoint (Mixed fallback)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // 1. Try to find the user in the database if email is provided
        if (email) {
            const user = await AdminUser.findOne({ email: email.toLowerCase() });
            if (user && user.active) {
                const isValid = verifyPassword(password, user.passwordHash);
                if (isValid) {
                    // Update last login
                    user.lastLoginAt = new Date();
                    await user.save();
                    
                    const token = jwt.sign(
                        { 
                            userId: user._id, 
                            email: user.email, 
                            name: user.name, 
                            role: user.role,
                            permissions: user.permissions 
                        }, 
                        JWT_SECRET, 
                        { expiresIn: '24h' }
                    );
                    return res.json({ token, role: user.role, name: user.name });
                }
            }
        }

        // 2. Fallback to Legacy Master Password if no DB match or no email provided
        if (password === ADMIN_PASSWORD) {
            // Emite token con rol owner como fallback de seguridad (acceso total)
            const token = jwt.sign({ role: 'owner', name: 'Master Admin' }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ token, role: 'owner', name: 'Master Admin' });
        }

        return res.status(401).json({ message: 'Credenciales incorrectas o usuario inactivo' });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: 'Error interno de autenticación' });
    }
});

// GET Admin Users
app.get('/api/admin/users', authenticateToken, async (req, res) => {
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

// POST Create Admin User
app.post('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Sin permisos para crear usuarios' });
        }
        const { name, email, password, role, permissions } = req.body;
        
        const existing = await AdminUser.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ message: 'El email ya está en uso' });

        const newUser = new AdminUser({
            name,
            email: email.toLowerCase(),
            passwordHash: hashPassword(password),
            role: role || 'solo_lectura',
            permissions: permissions || []
        });

        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH Edit Admin User
app.patch('/api/admin/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Sin permisos para editar usuarios' });
        }
        const { name, email, role, active, permissions } = req.body;
        
        const userToUpdate = await AdminUser.findById(req.params.id);
        if (!userToUpdate) return res.status(404).json({ message: 'Usuario no encontrado' });

        // Regla: No desactivar ni quitar rol owner al último owner
        if ((active === false || (role && role !== 'owner')) && userToUpdate.role === 'owner') {
            const ownerCount = await AdminUser.countDocuments({ role: 'owner', active: true });
            if (ownerCount <= 1 && userToUpdate.active) {
                return res.status(400).json({ message: 'No se puede desactivar o degradar al último Owner del sistema.' });
            }
        }

        if (name) userToUpdate.name = name;
        if (email) userToUpdate.email = email.toLowerCase();
        if (role) userToUpdate.role = role;
        if (active !== undefined) userToUpdate.active = active;
        if (permissions) userToUpdate.permissions = permissions;

        await userToUpdate.save();
        res.json(userToUpdate);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH Change Password
app.patch('/api/admin/users/:id/password', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Sin permisos para cambiar contraseñas' });
        }
        const { password } = req.body;
        if (!password) return res.status(400).json({ message: 'Contraseña requerida' });

        const userToUpdate = await AdminUser.findById(req.params.id);
        if (!userToUpdate) return res.status(404).json({ message: 'Usuario no encontrado' });

        userToUpdate.passwordHash = hashPassword(password);
        await userToUpdate.save();
        
        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET public cars (Sanitized)
app.get('/api/public/cars', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        // Only return visible/public cars. We use $ne: false so existing cars without the field are still visible.
        const cars = await Car.find({ visibleEnWeb: { $ne: false } })
            .select('-purchasePrice -purchaseCurrency -ownerName -ownerEmail -ownerPhone -linkedClient -consignedBy -notes -agencyOwned -engineNumber -chassisNumber -location -hasManuals -hasDuplicateKeys -hasOfficialServices -publishedOnML -publishedBy -mlLink -plateOrVin -expenses -visibleEnWeb -createdAt -updatedAt -__v -order -owners -auditLog')
            .sort({ order: 1, createdAt: -1 });
        res.json(cars);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET single public car (Sanitized)
app.get('/api/public/cars/:id', async (req, res) => {
    try {
        const car = await Car.findOne({ _id: req.params.id, visibleEnWeb: { $ne: false } })
            .select('-purchasePrice -purchaseCurrency -ownerName -ownerEmail -ownerPhone -linkedClient -consignedBy -notes -agencyOwned -engineNumber -chassisNumber -location -hasManuals -hasDuplicateKeys -hasOfficialServices -publishedOnML -publishedBy -mlLink -plateOrVin -expenses -visibleEnWeb -createdAt -updatedAt -__v -order -owners -auditLog');
        
        if (!car) {
            return res.status(404).json({ message: 'Car not found' });
        }
        res.json(car);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET all cars for Admin (Protected, Full Data)
app.get('/api/admin/cars', authenticateToken, async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        const cars = await Car.find().sort({ order: 1, createdAt: -1 });
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

// POST new car (Protected)
app.post('/api/cars', authenticateToken, upload.array('images', 20), async (req, res) => {
    try {
        const { 
            brand, name, year, km, fuel, condition, description, price, currency, featured, sold, status,
            vehicleType, plateOrVin, color, purchasePrice, purchaseCurrency, location, owners, agencyOwned,
            ownerName, linkedClient, ownerPhone, ownerEmail, consignedBy, engineNumber, chassisNumber,
            hasManuals, hasDuplicateKeys, hasOfficialServices, publishedOnML, publishedBy, mlLink, notes
        } = req.body;

        // Map uploaded files to Cloudinary URLs
        const imageUrls = req.files.map(file => file.path);
        const coverImage = imageUrls.length > 0 ? imageUrls[0] : ''; // Default first image as cover

        const newCar = new Car({
            brand,
            name,
            year: Number(year),
            km: Number(km),
            fuel,
            condition,
            description,
            price: Number(price),
            currency,
            featured: featured === 'true',
            sold: sold === 'true',
            status: status || 'Disponible',
            vehicleType, plateOrVin, color, 
            purchasePrice: purchasePrice ? Number(purchasePrice) : undefined, 
            purchaseCurrency, location, 
            owners: owners ? Number(owners) : 1, 
            agencyOwned: agencyOwned === 'true',
            ownerName, linkedClient, ownerPhone, ownerEmail, consignedBy, engineNumber, chassisNumber,
            hasManuals, hasDuplicateKeys, hasOfficialServices, publishedOnML, publishedBy, mlLink, notes,
            images: imageUrls,
            coverImage
        });

        const savedCar = await newCar.save();
        res.status(201).json(savedCar);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
});

// PUT update car (Protected)
app.put('/api/cars/:id', authenticateToken, upload.array('images', 20), async (req, res) => {
    try {
        const { 
            brand, name, year, km, fuel, condition, description, price, currency, featured, sold, status, imageOrder, imagePosition,
            vehicleType, plateOrVin, color, purchasePrice, purchaseCurrency, location, owners, agencyOwned,
            ownerName, linkedClient, ownerPhone, ownerEmail, consignedBy, engineNumber, chassisNumber,
            hasManuals, hasDuplicateKeys, hasOfficialServices, publishedOnML, publishedBy, mlLink, notes
        } = req.body;

        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ message: 'Car not found' });

        // Handle Images with Order
        // imageOrder should be a JSON array of strings.
        // strings starting with "__new__" represent new uploaded files in order.
        // other strings are existing URLs.

        const newUploadedPaths = req.files ? req.files.map(file => file.path) : [];
        let finalImages = [];

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
                }).filter(img => img); // Ensure no undefineds
            } catch (e) {
                console.error("Error parsing imageOrder:", e);
                // Fallback: Keep existing + append new
                finalImages = [...car.images, ...newUploadedPaths];
            }
        } else {
            if (newUploadedPaths.length > 0) {
                finalImages = [...car.images, ...newUploadedPaths];
            } else {
                finalImages = car.images;
            }
        }

        // Update fields
        car.brand = brand || car.brand;
        car.name = name || car.name;
        car.year = year ? Number(year) : car.year;
        car.km = km !== undefined ? Number(km) : car.km;
        car.fuel = fuel || car.fuel;
        car.condition = condition || car.condition;
        car.description = description || car.description;
        car.imagePosition = imagePosition || car.imagePosition;
        car.price = price !== undefined ? Number(price) : car.price;
        car.currency = currency || car.currency;
        car.featured = featured === 'true';
        car.sold = sold === 'true';
        if (status) car.status = status;

        // New Fields Update
        if (vehicleType !== undefined) car.vehicleType = vehicleType;
        if (plateOrVin !== undefined) car.plateOrVin = plateOrVin;
        if (color !== undefined) car.color = color;
        if (purchasePrice !== undefined) car.purchasePrice = purchasePrice ? Number(purchasePrice) : undefined;
        if (purchaseCurrency !== undefined) car.purchaseCurrency = purchaseCurrency;
        if (location !== undefined) car.location = location;
        if (owners !== undefined) car.owners = owners ? Number(owners) : 1;
        if (agencyOwned !== undefined) car.agencyOwned = agencyOwned === 'true';
        if (ownerName !== undefined) car.ownerName = ownerName;
        if (linkedClient !== undefined) car.linkedClient = linkedClient;
        if (ownerPhone !== undefined) car.ownerPhone = ownerPhone;
        if (ownerEmail !== undefined) car.ownerEmail = ownerEmail;
        if (consignedBy !== undefined) car.consignedBy = consignedBy;
        if (engineNumber !== undefined) car.engineNumber = engineNumber;
        if (chassisNumber !== undefined) car.chassisNumber = chassisNumber;
        if (hasManuals !== undefined) car.hasManuals = hasManuals;
        if (hasDuplicateKeys !== undefined) car.hasDuplicateKeys = hasDuplicateKeys;
        if (hasOfficialServices !== undefined) car.hasOfficialServices = hasOfficialServices;
        if (publishedOnML !== undefined) car.publishedOnML = publishedOnML;
        if (publishedBy !== undefined) car.publishedBy = publishedBy;
        if (mlLink !== undefined) car.mlLink = mlLink;
        if (notes !== undefined) car.notes = notes;

        // If imageOrder was sent (even empty array), we update images.
        if (imageOrder) {
            car.images = finalImages;
            car.coverImage = finalImages.length > 0 ? finalImages[0] : '';
        }

        const updatedCar = await car.save();
        
        // Log car update if status changed
        if (status) {
            await ActivityLog.create({
                action: 'Cambio de Estado',
                target: `${updatedCar.brand} ${updatedCar.name}`,
                details: `Tomás actualizó el estado a ${status}`,
                user: 'Tomás'
            });
        }

        res.json(updatedCar);

    } catch (error) {
        console.error('Update Error:', error);
        res.status(400).json({ message: error.message });
    }
});

// PATCH update car (Protected, clean JSON, for CRM)
app.patch('/api/admin/cars/:id', authenticateToken, async (req, res) => {
    try {
        const { 
            brand, name, year, km, fuel, condition, description, price, currency, featured, sold, status,
            vehicleType, plateOrVin, color, purchasePrice, purchaseCurrency, location, owners, agencyOwned,
            ownerName, linkedClient, ownerPhone, ownerEmail, consignedBy, engineNumber, chassisNumber,
            notes, visibleEnWeb, expenses
        } = req.body;

        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ message: 'Car not found' });

        const user = req.user?.username || 'Admin'; // Requires auth token to include username or default
        const newAuditLogs = [];

        const checkAndLog = (field, newValue, action, detailsFormatter) => {
            if (newValue !== undefined && car[field] !== newValue) {
                // For expenses, we handle it separately
                if (field !== 'expenses') {
                    newAuditLogs.push({
                        action,
                        field,
                        oldValue: car[field],
                        newValue,
                        details: detailsFormatter(car[field], newValue),
                        user,
                        source: 'CRM_V2'
                    });
                }
            }
        };

        // Update fields if provided & generate logs
        if (brand !== undefined && car.brand !== brand) { checkAndLog('brand', brand, 'EDICION', (o,n) => `Marca modificada de ${o} a ${n}`); car.brand = brand; }
        if (name !== undefined && car.name !== name) { checkAndLog('name', name, 'EDICION', (o,n) => `Modelo modificado de ${o} a ${n}`); car.name = name; }
        if (year !== undefined && car.year !== Number(year)) { checkAndLog('year', Number(year), 'EDICION', (o,n) => `Año modificado de ${o} a ${n}`); car.year = Number(year); }
        if (km !== undefined && car.km !== Number(km)) { checkAndLog('km', Number(km), 'EDICION', (o,n) => `Kilometraje modificado de ${o} a ${n}`); car.km = Number(km); }
        if (fuel !== undefined && car.fuel !== fuel) { checkAndLog('fuel', fuel, 'EDICION', (o,n) => `Combustible modificado de ${o} a ${n}`); car.fuel = fuel; }
        if (condition !== undefined && car.condition !== condition) { checkAndLog('condition', condition, 'EDICION', (o,n) => `Condición modificada de ${o} a ${n}`); car.condition = condition; }
        if (description !== undefined && car.description !== description) { checkAndLog('description', description, 'EDICION', () => `Descripción modificada`); car.description = description; }
        
        if (price !== undefined && car.price !== Number(price)) { 
            checkAndLog('price', Number(price), 'PRECIO', (o,n) => `Precio publicado modificado de ${car.currency || ''} ${o} a ${car.currency || ''} ${n}`); 
            car.price = Number(price); 
        }
        if (currency !== undefined && car.currency !== currency) { checkAndLog('currency', currency, 'PRECIO', (o,n) => `Moneda modificada de ${o} a ${n}`); car.currency = currency; }
        
        if (featured !== undefined && car.featured !== featured) { checkAndLog('featured', featured, 'EDICION', (o,n) => `Destacado cambiado a ${n ? 'Sí' : 'No'}`); car.featured = featured; }
        if (sold !== undefined && car.sold !== sold) { car.sold = sold; }
        
        if (status !== undefined && car.status !== status) { 
            checkAndLog('status', status, 'ESTADO', (o,n) => `Estado modificado de ${o} a ${n}`); 
            car.status = status; 
        }
        
        if (visibleEnWeb !== undefined && car.visibleEnWeb !== visibleEnWeb) { 
            checkAndLog('visibleEnWeb', visibleEnWeb, 'VISIBILIDAD', (o,n) => `Visibilidad web cambiada a ${n ? 'Público' : 'Oculto'}`); 
            car.visibleEnWeb = visibleEnWeb; 
        }

        // Internal fields
        if (vehicleType !== undefined && car.vehicleType !== vehicleType) { checkAndLog('vehicleType', vehicleType, 'EDICION', (o,n) => `Tipo modificado`); car.vehicleType = vehicleType; }
        if (plateOrVin !== undefined && car.plateOrVin !== plateOrVin) { checkAndLog('plateOrVin', plateOrVin, 'EDICION', (o,n) => `Dominio/VIN modificado de ${o || 'nada'} a ${n}`); car.plateOrVin = plateOrVin; }
        if (color !== undefined && car.color !== color) { checkAndLog('color', color, 'EDICION', (o,n) => `Color modificado de ${o} a ${n}`); car.color = color; }
        if (purchasePrice !== undefined && car.purchasePrice !== Number(purchasePrice)) { checkAndLog('purchasePrice', Number(purchasePrice), 'PRECIO', (o,n) => `Costo de compra modificado de ${o} a ${n}`); car.purchasePrice = Number(purchasePrice); }
        if (purchaseCurrency !== undefined && car.purchaseCurrency !== purchaseCurrency) { checkAndLog('purchaseCurrency', purchaseCurrency, 'PRECIO', (o,n) => `Moneda de compra modificada de ${o} a ${n}`); car.purchaseCurrency = purchaseCurrency; }
        if (location !== undefined && car.location !== location) { checkAndLog('location', location, 'EDICION', (o,n) => `Ubicación modificada de ${o} a ${n}`); car.location = location; }
        if (owners !== undefined && car.owners !== Number(owners)) { car.owners = Number(owners); }
        if (agencyOwned !== undefined && car.agencyOwned !== agencyOwned) { checkAndLog('agencyOwned', agencyOwned, 'EDICION', (o,n) => `Origen propio cambiado a ${n ? 'Sí' : 'No'}`); car.agencyOwned = agencyOwned; }
        if (ownerName !== undefined && car.ownerName !== ownerName) { checkAndLog('ownerName', ownerName, 'EDICION', (o,n) => `Dueño modificado a ${n}`); car.ownerName = ownerName; }
        if (linkedClient !== undefined && car.linkedClient !== linkedClient) { car.linkedClient = linkedClient; }
        if (ownerPhone !== undefined && car.ownerPhone !== ownerPhone) { car.ownerPhone = ownerPhone; }
        if (ownerEmail !== undefined && car.ownerEmail !== ownerEmail) { car.ownerEmail = ownerEmail; }
        if (consignedBy !== undefined && car.consignedBy !== consignedBy) { checkAndLog('consignedBy', consignedBy, 'EDICION', (o,n) => `Consignado por modificado a ${n}`); car.consignedBy = consignedBy; }
        if (engineNumber !== undefined && car.engineNumber !== engineNumber) { car.engineNumber = engineNumber; }
        if (chassisNumber !== undefined && car.chassisNumber !== chassisNumber) { car.chassisNumber = chassisNumber; }
        if (notes !== undefined && car.notes !== notes) { checkAndLog('notes', notes, 'OBSERVACION', () => `Observación interna actualizada`); car.notes = notes; }

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

// DELETE car (Protected)
app.delete('/api/cars/:id', authenticateToken, async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ message: 'Car not found' });

        // Optional: Delete images from Cloudinary here (would need public_ids)

        await Car.findByIdAndDelete(req.params.id);
        res.json({ message: 'Car removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- CLIENTS ROUTES ---

// GET all clients
app.get('/api/admin/clients', authenticateToken, async (req, res) => {
    try {
        const { search, type, source, status, limit = 50, page = 1 } = req.query;
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
        
        const clients = await Client.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
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

// POST new client
app.post('/api/admin/clients', authenticateToken, async (req, res) => {
    try {
        const payload = req.body;
        
        // Basic Validation
        if (!payload.firstName && !payload.fullName) {
            return res.status(400).json({ message: 'El nombre es obligatorio.' });
        }
        if (!payload.phone && !payload.email) {
            return res.status(400).json({ message: 'Debe proveer un teléfono o un email.' });
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
            'locality', 'province', 'address', 'type', 'source', 'status', 'tags', 'notes', 'assignedTo'
        ];
        
        const user = req.user?.username || 'Admin';
        const newAuditLogs = [];
        
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
            .limit(parseInt(limit));
            
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
            details: 'Lead creado desde formulario web público',
            date: new Date(),
            user: 'Web Pública',
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
            details: `Tomás creó un nuevo prospecto en estado ${pipelineStage}`,
            user: 'Tomás'
        });

        res.status(201).json(savedLead);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT update lead
app.put('/api/leads/:id', authenticateToken, async (req, res) => {
    try {
        const { name, phone, pipelineStage, vehicleId, notes } = req.body;
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

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
                action: 'Actualización CRM',
                target: lead.name,
                details: `Tomás movió el contacto a la etapa: ${pipelineStage}`,
                user: 'Tomás'
            });

            // Sync with Car status if needed
            if (lead.vehicleId) {
                let newCarStatus = null;
                if (pipelineStage === 'Señado') {
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
                             details: `El vehículo pasó a estado ${newCarStatus} por un cierre en CRM.`,
                             user: 'Sistema'
                         });
                    }
                }
            }
        } else if (notes && notes.length > lead.notes.length) {
            await ActivityLog.create({
                action: 'Nueva Nota',
                target: lead.name,
                details: `Tomás añadió una nota al historial.`,
                user: 'Tomás'
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
        const stockCount = await Car.countDocuments({ status: 'Disponible' });
        const leadsCount = await Lead.countDocuments({ pipelineStage: { $ne: 'Entregado / Vendido' } });
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        // Unidades Vendidas este mes
        const soldCarsThisMonth = await Car.countDocuments({ 
            status: 'Vendido',
            updatedAt: { $gte: startOfMonth }
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
                description: `Saldo inicial de caja — ${name}`,
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
        res.json({ message: 'Caja y sus movimientos asociados eliminados con éxito' });
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
        if (!tx) return res.status(404).json({ message: 'Transacción no encontrada' });

        const account = await Account.findById(tx.accountId);
        if (account) {
            const revertChange = tx.type === 'Ingreso' ? -tx.amount : tx.amount;
            account.balance += revertChange;
            await account.save();
        }

        await Transaction.findByIdAndDelete(req.params.id);
        res.json({ message: 'Transacción eliminada y balance de caja revertido' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- RESERVATIONS ROUTES ---

// GET all reservations
app.get('/api/admin/reservations', authenticateToken, async (req, res) => {
    try {
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
                select: 'brand name year plateOrVin price currency status'
            })
            .sort({ createdAt: -1 });
        
        res.json(reservations);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET reservation by id
app.get('/api/admin/reservations/:id', authenticateToken, async (req, res) => {
    try {
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
            details: `Vehículo reservado (Reserva ID: ${savedReservation._id})`,
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
                    details: `Señal de reserva recibida por el vehículo asociado`,
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
        const { status, conditions, notes } = req.body;
        
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
        
        const user = req.user?.username || 'Admin';
        const oldStatus = reservation.status;
        
        let hasChanges = false;
        
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
                            details: `Vehículo liberado por reserva ${status} (ID: ${reservation._id})`,
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

// --- SALES ROUTES ---

// GET all sales
app.get('/api/admin/sales', authenticateToken, async (req, res) => {
    try {
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
                select: 'brand name year plateOrVin price currency status'
            })
            .populate({
                path: 'reservationId',
                select: 'status depositAmount depositCurrency expiresAt'
            })
            .sort({ saleDate: -1, createdAt: -1 })
            .lean();

        // Calculate collection status for each sale
        const saleIds = sales.map(s => s._id);
        const transactions = await Transaction.find({ 
            saleId: { $in: saleIds }, 
            status: 'activo', 
            module: 'crm_v2' 
        });

        // Optimización O(N) para agrupar transacciones por saleId
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

            let collectionStatus = 'sin_cobro';
            const pendingBalance = sale.salePrice - netoCobrado;

            if (netoCobrado > 0 && netoCobrado < sale.salePrice) collectionStatus = 'parcial';
            else if (netoCobrado === sale.salePrice) collectionStatus = 'cobrada';
            else if (netoCobrado > sale.salePrice) collectionStatus = 'sobrecobrada';

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

        let collectionStatus = 'sin_cobro';
        const pendingBalance = sale.salePrice - netoCobrado;

        if (netoCobrado > 0 && netoCobrado < sale.salePrice) collectionStatus = 'parcial';
        else if (netoCobrado === sale.salePrice) collectionStatus = 'cobrada';
        else if (netoCobrado > sale.salePrice) collectionStatus = 'sobrecobrada';

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
        const { vehicleId, clientId, leadId, salePrice, saleCurrency, paymentMethod, notes, salesperson, saleDate } = req.body;
        const user = req.user?.username || 'Admin';

        // 1. Validaciones previas
        if (!vehicleId) throw new Error('Vehicle ID is required');
        if (salePrice < 0) throw new Error('Sale price cannot be negative');
        if (!['ARS', 'USD'].includes(saleCurrency)) throw new Error('Invalid sale currency');

        const vehicle = await Car.findById(vehicleId);
        if (!vehicle) throw new Error('Vehicle not found');
        if (vehicle.status !== 'Disponible') throw new Error(`Vehicle is ${vehicle.status}, only Disponible vehicles can be manually sold`);

        const existingSale = await Sale.findOne({ vehicleId, status: { $ne: 'cancelada' } });
        if (existingSale) throw new Error('There is already an active sale for this vehicle');

        // 2. Creación
        const newSale = new Sale({
            vehicleId,
            clientId: clientId || undefined,
            leadId: leadId || undefined,
            salePrice,
            saleCurrency,
            paymentMethod: paymentMethod || 'contado',
            notes,
            salesperson,
            saleDate: saleDate || new Date(),
            status: 'confirmada',
            createdBy: user,
            saleAuditLog: [{
                action: 'VENTA_CREADA_MANUAL',
                details: 'Venta creada manualmente sin reserva previa',
                user: user,
                source: 'CRM_V2'
            }]
        });

        const savedSale = await newSale.save();

        // 3. Rollback Manual Controlado
        try {
            vehicle.status = 'Vendido';
            vehicle.auditLog.push({
                action: 'ESTADO',
                field: 'status',
                oldValue: 'Disponible',
                newValue: 'Vendido',
                details: `Vehículo vendido (Venta ID: ${savedSale._id})`,
                user: user,
                source: 'CRM_V2'
            });
            await vehicle.save();

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
            
            if (vehicle.status === 'Vendido') {
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

// POST convert reservation to sale
app.post('/api/admin/reservations/:id/convert-to-sale', authenticateToken, async (req, res) => {
    try {
        const reservationId = req.params.id;
        const { salePrice, saleCurrency, paymentMethod, saleDate, salesperson } = req.body;
        const user = req.user?.username || 'Admin';

        // 1. Validaciones
        const reservation = await Reservation.findById(reservationId);
        if (!reservation) throw new Error('Reservation not found');
        if (reservation.status !== 'activa') throw new Error(`Cannot convert reservation with status ${reservation.status}`);

        const vehicleId = reservation.vehicleId;
        const vehicle = await Car.findById(vehicleId);
        if (!vehicle) throw new Error('Vehicle not found');
        if (vehicle.status !== 'Reservado') throw new Error(`Vehicle is not Reservado (current: ${vehicle.status})`);

        const existingSale = await Sale.findOne({ vehicleId, status: { $ne: 'cancelada' } });
        if (existingSale) throw new Error('There is already an active sale for this vehicle');

        const finalSalePrice = salePrice !== undefined ? salePrice : reservation.agreedPrice;
        const finalSaleCurrency = saleCurrency !== undefined ? saleCurrency : reservation.agreedCurrency;

        if (finalSalePrice < 0) throw new Error('Sale price cannot be negative');
        if (!['ARS', 'USD'].includes(finalSaleCurrency)) throw new Error('Invalid sale currency');

        // 2. Creación de Sale
        const newSale = new Sale({
            reservationId: reservation._id,
            vehicleId: vehicle._id,
            clientId: reservation.clientId || undefined,
            leadId: reservation.leadId || undefined,
            salePrice: finalSalePrice,
            saleCurrency: finalSaleCurrency,
            depositAppliedAmount: reservation.depositAmount,
            depositAppliedCurrency: reservation.depositCurrency,
            paymentMethod: paymentMethod || 'contado',
            salesperson: salesperson || reservation.salesperson,
            saleDate: saleDate || new Date(),
            status: 'confirmada',
            createdBy: user,
            saleAuditLog: [{
                action: 'VENTA_CREADA_POR_CONVERSION',
                details: `Venta generada a partir de reserva ${reservation._id}`,
                user: user,
                source: 'CRM_V2'
            }]
        });

        const savedSale = await newSale.save();

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
                details: `Vehículo vendido por conversión de reserva (Venta ID: ${savedSale._id})`,
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
                            details: `Lead convertido por venta de vehículo`,
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
        console.error('Error converting reservation to sale:', error);
        res.status(400).json({ message: error.message });
    }
});

// PATCH update sale
app.patch('/api/admin/sales/:id', authenticateToken, async (req, res) => {
    try {
        const { 
            status, 
            paymentMethod, 
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
        
        if (paymentMethod !== undefined && paymentMethod !== sale.paymentMethod) {
            sale.paymentMethod = paymentMethod;
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
                details: `Estado de documentación actualizado a ${documentationStatus}`,
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
                    details: `Fecha de entrega asignada automáticamente al marcar como entregado`,
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
                details: 'Checklist de documentación actualizado',
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
                details: `Nivel de satisfacción actualizado a ${satisfactionRating}`,
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
app.get('/api/admin/transactions', authenticateToken, async (req, res) => {
    try {
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

        const transactions = await Transaction.find(query).sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching admin transactions:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET admin transaction by id
app.get('/api/admin/transactions/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
        const transaction = await Transaction.findOne({ _id: req.params.id, module: 'crm_v2' });
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        res.json(transaction);
    } catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST admin transaction (manual only)
app.post('/api/admin/transactions', authenticateToken, async (req, res) => {
    try {
        if (req.user && req.user.role === 'ventas') return res.status(403).json({ message: 'Sin permisos financieros' });
        const { type, category, concept, amount, currency, paymentMethod, date, notes, saleId, reservationId, clientId, vehicleId, installmentId } = req.body;
        
        // Validations
        if (!type || !['ingreso', 'egreso'].includes(type)) return res.status(400).json({ message: 'Type is required and must be ingreso/egreso' });
        if (!currency || !['ARS', 'USD'].includes(currency)) return res.status(400).json({ message: 'Currency is required and must be ARS/USD' });
        if (amount === undefined || amount < 0) return res.status(400).json({ message: 'Amount is required and must be >= 0' });
        if (!concept) return res.status(400).json({ message: 'Concept is required' });
        if (!category) return res.status(400).json({ message: 'Category is required' });

        // Vínculos opcionales (Verificación de existencia)
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
            if (!vehicle) return res.status(400).json({ message: 'El Vehículo vinculado no existe' });
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

        res.status(201).json(savedTx);
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(400).json({ message: error.message });
    }
});

// PATCH admin transaction
app.patch('/api/admin/transactions/:id', authenticateToken, async (req, res) => {
    try {
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

        // Actualización de Vínculos
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
                    details: `Vínculo de ${name} actualizado`,
                    user: user,
                    source: 'CRM_V2'
                });
            }
        };

        await updateLink('saleId', saleId, Sale, 'Venta');
        await updateLink('reservationId', reservationId, Reservation, 'Reserva');
        await updateLink('clientId', clientId, Client, 'Cliente');
        await updateLink('vehicleId', vehicleId, Car, 'Vehículo');
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
            res.json(updatedTx);
        } else {
            res.json(tx);
        }
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================== //
// ============ INSTALLMENTS V2 ============= //
// ========================================== //

app.get('/api/admin/installments', authenticateToken, async (req, res) => {
    try {
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
        const user = req.user ? (req.user.email || req.user.role) : 'System';
        const { saleId, clientId, vehicleId, installmentNumber, dueDate, amount, currency, notes, status } = req.body;

        if (!saleId || !installmentNumber || !dueDate || amount === undefined || !currency) {
            return res.status(400).json({ 
                message: 'Faltan campos obligatorios: venta, número de cuota, vencimiento, importe o moneda.',
                missing: {
                    saleId: !saleId,
                    installmentNumber: !installmentNumber,
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

        const cleanClientId = sanitizeOptionalObjectId(clientId);
        const cleanVehicleId = sanitizeOptionalObjectId(vehicleId);

        if (!saleId || !mongoose.Types.ObjectId.isValid(saleId)) {
            return res.status(400).json({ message: "saleId inválido o faltante" });
        }
        if (cleanClientId && !mongoose.Types.ObjectId.isValid(cleanClientId)) {
            return res.status(400).json({ message: "clientId inválido" });
        }
        if (cleanVehicleId && !mongoose.Types.ObjectId.isValid(cleanVehicleId)) {
            return res.status(400).json({ message: "vehicleId inválido" });
        }

        const newInstallment = new Installment({
            saleId,
            ...(cleanClientId && { clientId: cleanClientId }),
            ...(cleanVehicleId && { vehicleId: cleanVehicleId }),
            installmentNumber,
            dueDate,
            amount,
            currency,
            status: status || 'pendiente',
            notes,
            createdBy: user,
            installmentAuditLog: [{
                action: 'CUOTA_CREADA',
                details: 'Cuota manual creada',
                user: user
            }]
        });

        const savedInstallment = await newInstallment.save();
        res.status(201).json(savedInstallment);
    } catch (error) {
        console.error('Error creating installment:', error);
        res.status(400).json({ message: error.message });
    }
});

app.patch('/api/admin/installments/:id', authenticateToken, async (req, res) => {
    try {
        const user = req.user ? (req.user.email || req.user.role) : 'System';
        const updates = req.body;
        
        const installment = await Installment.findById(req.params.id);
        if (!installment) return res.status(404).json({ message: 'Installment not found' });

        let hasChanges = false;
        const allowedUpdates = ['dueDate', 'amount', 'currency', 'status', 'notes'];
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
                details: `Actualización manual.`,
                user: user
            });
            const updatedInst = await installment.save();
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
                message: 'No se puede eliminar esta cuota porque tiene movimientos financieros vinculados. Podés anularla, pero no borrarla.' 
            });
        }

        if (installment.paidAmount > 0 || installment.status === 'pagada') {
            return res.status(400).json({ 
                message: 'No se puede eliminar una cuota que registra cobros o figura pagada.' 
            });
        }

        await Installment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Cuota eliminada definitivamente.' });

    } catch (error) {
        console.error('Error deleting installment:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/sales/:id/installments/generate', authenticateToken, async (req, res) => {
    try {
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
                notes: notes || `Generada en plan de ${installmentsCount} cuotas. Base: ${base}. Interés: ${interest}%.`,
                createdBy: user,
                installmentAuditLog: [{
                    action: 'PLAN_GENERADO',
                    details: `Cuota ${i+1} de ${installmentsCount} generada por sistema. Base: ${base}. Interés: ${interest}%.`,
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


// ====================
// CRM TASKS ENDPOINTS
// ====================

// GET all active tasks
app.get('/api/admin/crm-tasks', authenticateToken, async (req, res) => {
    try {
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
        // Validation to prevent empty string cast to ObjectId errors
        const cleanObjectId = (val) => (val && val.trim() !== '') ? val : undefined;

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
        const updateData = { ...req.body };
        
        // Handle completion/cancellation dates
        if (updateData.status === 'completada') {
            updateData.completedAt = new Date();
        } else if (updateData.status === 'cancelada') {
            updateData.canceledAt = new Date();
        } else if (updateData.status === 'pendiente') {
            updateData.$unset = { completedAt: 1, canceledAt: 1 };
        }

        const task = await CrmTask.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(task);
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
