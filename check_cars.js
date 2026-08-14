import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import Car from './src/models/Car.js';

async function checkCars() {
    await connectDB();
    const cars = await Car.find({});
    console.log(`Total cars: ${cars.length}`);

    const counts = {};
    for (const car of cars) {
        counts[car.status] = (counts[car.status] || 0) + 1;
    }
    console.log("Status distribution:", counts);

    mongoose.disconnect();
}

checkCars().catch(console.error);
