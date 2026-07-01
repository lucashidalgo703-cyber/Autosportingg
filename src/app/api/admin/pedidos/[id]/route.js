import { NextResponse } from 'next/server';
import connectDB from '../../../../../config/db';
import Pedido from '../../../../../models/Pedido';
import { withAdminAuth } from '../../../../../utils/nextAdminAuth';
import { PERMISSIONS } from '../../../../../utils/adminPermissions';

export const PUT = withAdminAuth(PERMISSIONS.PEDIDOS_WRITE, async (request, { params }) => {
    try {
        await connectDB();
        const { id } = params;
        const body = await request.json();
        
        const updatedPedido = await Pedido.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        
        if (!updatedPedido) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }
        
        return NextResponse.json(updatedPedido);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
});

export const DELETE = withAdminAuth('ADMIN_OR_OWNER', async (request, { params }) => {
    try {
        await connectDB();
        const { id } = params;
        
        const deletedPedido = await Pedido.findByIdAndDelete(id);
        
        if (!deletedPedido) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }
        
        return NextResponse.json({ message: 'Pedido eliminado correctamente' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
