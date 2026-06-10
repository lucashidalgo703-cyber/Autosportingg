import { NextResponse } from 'next/server';
import connectDB from '../../../../../config/db';
import Infraccion from '../../../../../models/Infraccion';

export async function PUT(request, { params }) {
    try {
        await connectDB();
        const { id } = params;
        const body = await request.json();
        
        const updatedInfraccion = await Infraccion.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        
        if (!updatedInfraccion) {
            return NextResponse.json({ error: 'Infracción no encontrada' }, { status: 404 });
        }
        
        return NextResponse.json(updatedInfraccion);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    try {
        await connectDB();
        const { id } = params;
        
        const deletedInfraccion = await Infraccion.findByIdAndDelete(id);
        
        if (!deletedInfraccion) {
            return NextResponse.json({ error: 'Infracción no encontrada' }, { status: 404 });
        }
        
        return NextResponse.json({ message: 'Infracción eliminada correctamente' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
