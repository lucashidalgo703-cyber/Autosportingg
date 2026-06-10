import { NextResponse } from 'next/server';
import connectDB from '../../../../config/db';
import Infraccion from '../../../../models/Infraccion';

export async function GET(request) {
    try {
        await connectDB();
        const infracciones = await Infraccion.find()
            .populate('vehicleId', 'brand name')
            .sort({ createdAt: -1 });
        return NextResponse.json(infracciones);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectDB();
        const body = await request.json();
        
        const newInfraccion = new Infraccion(body);
        await newInfraccion.save();
        
        return NextResponse.json(newInfraccion, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
