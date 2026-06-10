import { NextResponse } from 'next/server';
import connectDB from '../../../../config/db';
import Pedido from '../../../../models/Pedido';

export async function GET(request) {
    try {
        await connectDB();
        const pedidos = await Pedido.find()
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });
        return NextResponse.json(pedidos);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectDB();
        const body = await request.json();
        
        const newPedido = new Pedido(body);
        await newPedido.save();
        
        return NextResponse.json(newPedido, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
