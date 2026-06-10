import { NextResponse } from 'next/server';
import connectDB from '../../../../config/db';
import Gestoria from '../../../../models/Gestoria';

export async function GET(request) {
    try {
        await connectDB();
        // Populate vehicle to show brand/model if linked
        const tramites = await Gestoria.find()
            .populate('vehicleId', 'brand name plateOrVin')
            .populate('clientId', 'name')
            .sort({ createdAt: -1 });
        return NextResponse.json(tramites);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectDB();
        const body = await request.json();
        
        const newTramite = new Gestoria(body);
        await newTramite.save();
        
        return NextResponse.json(newTramite, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
