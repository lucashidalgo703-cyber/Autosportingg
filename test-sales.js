import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
  .then(async () => {
    const db = mongoose.connection.db;
    const sales = await db.collection('sales').find({}).toArray();
    console.log("Total sales:", sales.length);
    if(sales.length > 0) {
        console.log("Sample sale status:", sales[0].status);
        console.log("Sample sale date:", sales[0].saleDate);
        console.log("Sample createdAt:", sales[0].createdAt);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
