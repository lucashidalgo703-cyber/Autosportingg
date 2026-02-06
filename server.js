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
app.post('/api/cars', upload.array('images', 20), async (req, res) => {
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

// PUT update car
app.put('/api/cars/:id', upload.array('images', 20), async (req, res) => {
    try {
        const { brand, name, year, km, fuel, condition, price, currency, featured, sold, imageOrder, imagePosition } = req.body;

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
            // No order provided? (Shouldn't happen with new frontend, but safe fallback)
            // Just append new ones to current ones? Or text only update?
            // Let's assume text only if no provided, OR append if files provided.
            if (newUploadedPaths.length > 0) {
                finalImages = [...car.images, ...newUploadedPaths];
            } else {
                // If no imageOrder and no new files, maybe we are just updating text.
                // But wait, what if user deleted all images?
                // If imageOrder is NOT sent, we assume we keep images as is (or handled by fallback).
                // Better safe fallback: don't touch images if not specified.
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
        car.imagePosition = imagePosition || car.imagePosition;
        car.price = price !== undefined ? Number(price) : car.price;
        car.currency = currency || car.currency;
        car.featured = featured === 'true';
        car.sold = sold === 'true';

        // If imageOrder was sent (even empty array), we update images.
        if (imageOrder) {
            car.images = finalImages;
            car.coverImage = finalImages.length > 0 ? finalImages[0] : '';
        }

        const updatedCar = await car.save();
        res.json(updatedCar);

    } catch (error) {
        console.error('Update Error:', error);
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
