import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

console.log("Testing Cloudinary Connection...");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key (Length):", process.env.CLOUDINARY_API_KEY?.length);
console.log("API Secret (Length):", process.env.CLOUDINARY_API_SECRET?.length);

cloudinary.api.ping((error, result) => {
    if (error) {
        console.error("PING FAILED:", error);
    } else {
        console.log("PING SUCCESS:", result);
    }
});
