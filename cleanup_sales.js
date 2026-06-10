import 'dotenv/config';
import connectDB from './src/config/db.js';
import Sale from './src/models/Sale.js';
import mongoose from 'mongoose';

async function run() {
  await connectDB();
  const result = await Sale.deleteMany({ status: 'cancelada' });
  console.log(`Borradas ${result.deletedCount} ventas canceladas.`);
  await mongoose.disconnect();
}

run().catch(console.error);
