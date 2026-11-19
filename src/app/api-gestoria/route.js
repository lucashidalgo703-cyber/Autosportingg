import { NextResponse } from 'next/server';
import connectDB from '../../config/db';
import Gestoria from '../../models/Gestoria';
import '../../models/Car';
import '../../models/Client';
import { withAdminAuth } from '../../utils/nextAdminAuth';
import { PERMISSIONS } from '../../utils/adminPermissions';
import { assertGestoriaAccess, gestoriaScope } from '../../services/gestoriaStatusService.js';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(PERMISSIONS.GESTORIA_READ, async (request) => {
    try {
        await connectDB();
        // Populate vehicle to show brand/model if linked
            const tramites = await Gestoria.find(await gestoriaScope(request.user))
            .populate('vehicleId', 'brand name plateOrVin')
            .populate('clientId', 'firstName lastName fullName documentNumber')
            .populate('sellerId', 'firstName lastName fullName documentNumber')
            .sort({ createdAt: -1 });
        return NextResponse.json(tramites);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withAdminAuth(PERMISSIONS.GESTORIA_WRITE, async (request) => {
    try {
        await connectDB();
        const body = await request.json();
        
        ['vehicleId', 'clientId', 'sellerId', 'saleId', 'createdBy'].forEach(field => {
            if (body[field] === '') body[field] = null;
        });
        
        body.createdBy = request.user.id;
        await assertGestoriaAccess(request.user, body, PERMISSIONS.GESTORIA_WRITE);
        const newTramite = new Gestoria(body);
        await newTramite.save();
        
        return NextResponse.json(newTramite, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.status ? error.message : 'No se pudo crear el trámite. Revisá los datos.' }, { status: error.status || 400 });
    }
});
