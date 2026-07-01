import { NextResponse } from 'next/server';
import connectDB from '../../../../config/db';
import Infraccion from '../../../../models/Infraccion';
import { withAdminAuth } from '../../../../utils/nextAdminAuth';
import { PERMISSIONS } from '../../../../utils/adminPermissions';

export const GET = withAdminAuth(PERMISSIONS.INFRACCIONES_READ, async (request) => {
    try {
        await connectDB();
        const infracciones = await Infraccion.find()
            .populate('vehicleId', 'brand name plateOrVin')
            .populate('clientId', 'name')
            .populate('saleId', 'status')
            .populate('responsible', 'name')
            .sort({ createdAt: -1 });
        return NextResponse.json(infracciones);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withAdminAuth(PERMISSIONS.INFRACCIONES_WRITE, async (request) => {
    try {
        await connectDB();
        const body = await request.json();
        
        const newInfraccion = new Infraccion(body);
        await newInfraccion.save();
        
        return NextResponse.json(newInfraccion, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
});
