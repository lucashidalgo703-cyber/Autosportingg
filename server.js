import express from 'express';
import cors from 'cors';
import multer from 'multer';
import connectDB from './src/config/db.js';
import cloudinary from './src/config/cloudinary.js';
import Car from './src/models/Car.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const app = express();
const PORT = process.env.PORT || 3001;

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

// Routes

// GET all cars
app.get('/api/cars', async (req, res) => {
    try {
        const cars = await Car.find().sort({ createdAt: -1 });
        res.json(cars);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET single car
app.get('/api/cars/:id', async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ message: 'Car not found' });
        res.json(car);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST new car
app.post('/api/cars', upload.array('images', 10), async (req, res) => {
    try {
        const { brand, name, year, km, fuel, condition, price, currency, featured, sold } = req.body;

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
            price: Number(price),
            currency,
            featured: featured === 'true',
            sold: sold === 'true',
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

// DELETE car
app.delete('/api/cars/:id', async (req, res) => {
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

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Global Error Handler (Timestamp: " + new Date().toISOString() + ")");
    console.dir(err, { depth: null, colors: true });

    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Multer Error: ${err.message}`, detail: err });
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
