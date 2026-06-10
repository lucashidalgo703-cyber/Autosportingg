import { NextResponse } from 'next/server';
import connectDB from '../../../../../config/db';
import Pedido from '../../../../../models/Pedido';

export async function PUT(request, { params }) {
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
}

export async function DELETE(request, { params }) {
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
}
