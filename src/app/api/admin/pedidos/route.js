import { NextResponse } from 'next/server';
import connectDB from '../../../../config/db';
import Pedido from '../../../../models/Pedido';
import { withAdminAuth } from '../../../../utils/nextAdminAuth';
import { PERMISSIONS } from '../../../../utils/adminPermissions';

export const GET = withAdminAuth(PERMISSIONS.PEDIDOS_READ, async (request) => {
    try {
        await connectDB();
        const pedidos = await Pedido.find()
            .populate('assignedTo', 'firstName lastName')
            .populate('clientId', 'firstName lastName fullName email phone document documentNumber')
            .sort({ createdAt: -1 });
        return NextResponse.json(pedidos);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withAdminAuth(PERMISSIONS.PEDIDOS_WRITE, async (request) => {
    try {
        await connectDB();
        const body = await request.json();
        
        const newPedido = new Pedido(body);
        await newPedido.save();
        
        return NextResponse.json(newPedido, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
});
