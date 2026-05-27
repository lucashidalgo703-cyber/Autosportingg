import express from 'express';
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
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import jwt from 'jsonwebtoken';



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

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Contraseña incorrecta' });
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
        const { search, crmStatus, priority, source, clientId, unlinked, vehicleId, limit = 50, skip = 0 } = req.query;
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
        if (vehicleId) query.vehicleId = vehicleId;
        
        if (unlinked === 'true') {
            query.clientId = null;
        } else if (clientId) {
            query.clientId = clientId;
        }
        
        const leads = await Lead.find(query)
            .populate('vehicleId', 'marca modelo version dominio precioVenta moneda')
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
            .populate('vehicleId')
            .populate('clientId');
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
        const { name, phone, message, vehicleId, email } = req.body;
        
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
        const accounts = await Account.find().sort({ name: 1 });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/accounts', authenticateToken, async (req, res) => {
    try {
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
