import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import Lead from './src/models/Lead.js';
import Car from './src/models/Car.js';

async function test() {
    await connectDB();
    try {
        const newLead = new Lead({ 
            name: "Test User", 
            phone: "123456789", 
            pipelineStage: "Nuevo Contacto",
            vehicleId: undefined, // Simulating what the route does
            notes: []
        });
        await newLead.save();
        console.log("Lead created successfully:", newLead);
    } catch (error) {
        console.error("Error creating lead:", error);
    }
    process.exit(0);
}

test();
