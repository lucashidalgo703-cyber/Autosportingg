import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Car from './src/models/Car.js';
import Sale from './src/models/Sale.js';
import Reservation from './src/models/Reservation.js';
import fs from 'fs';

if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB.");

        const cars = await Car.find({
            brand: { $regex: /peugeot/i },
            name: { $regex: /208/i },
            year: 2024,
            status: 'Pausado',
            visibleEnWeb: false
        }).lean();

        console.log(`Found ${cars.length} duplicated Peugeots.`);

        for (let car of cars) {
            console.log(`\n--- Car: ${car._id} | ${car.plateOrVin} | ${car.price} ---`);
            const linkedSales = await Sale.find({ "tradeIns.linkedStockCarId": car._id }).lean();
            console.log(`Linked to Sales (tradeIn): ${linkedSales.length}`);
            if (linkedSales.length > 0) {
                console.log(`Sale IDs: ${linkedSales.map(s => s._id).join(', ')}`);
            }
            const activeReservations = await Reservation.find({ vehicleId: car._id, status: 'activa' }).lean();
            console.log(`Active Reservations: ${activeReservations.length}`);
            const activeSales = await Sale.find({ vehicleId: car._id }).lean();
            console.log(`Active Sales (as main vehicle): ${activeSales.length}`);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
