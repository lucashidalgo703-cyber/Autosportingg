require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Car = require('../src/models/Car.js');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const cars = await Car.find({});
    let usd = 0;
    let ars = 0;
    cars.forEach(c => {
        if((c.status || '').toLowerCase() === 'disponible') {
            const price = Number(c.price) || 0;
            const curr = (c.currency === 'U$S' || c.currency === 'USD') ? 'USD' : 'ARS';
            if (curr === 'USD') usd += price;
            else ars += price;
        }
    });
    console.log('USD:', usd, 'ARS:', ars);
    process.exit(0);
});
