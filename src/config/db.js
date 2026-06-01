import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export default async function connectDB() {
    try {
        if (mongoose.connection.readyState === 1) {
            return mongoose.connection;
        }
        mongoose.set('bufferCommands', false); // Disable buffering to prevent timeout hangs
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
    }
}
