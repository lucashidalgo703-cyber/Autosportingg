import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import Car from './src/models/Car.js';
import Sale from './src/models/Sale.js';

async function checkCars() {
    await connectDB();
    const cars = await Car.find({});
    console.log(`Total cars: ${cars.length}`);

    const counts = {};
    for (const car of cars) {
        counts[car.status] = (counts[car.status] || 0) + 1;
    }
    console.log("Status distribution:", counts);

    // Get the recently updated ones
    const recent = await Car.find({}).sort({ updatedAt: -1 }).limit(5);
    for (const car of recent) {
        console.log(`Car: ${car.brand} ${car.name}, Status: ${car.status}, ID: ${car._id}`);
    }

    mongoose.disconnect();
}

checkCars().catch(console.error);
