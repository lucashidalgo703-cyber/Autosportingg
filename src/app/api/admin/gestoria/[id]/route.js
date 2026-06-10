import { NextResponse } from 'next/server';
import connectDB from '../../../../../config/db';
import Gestoria from '../../../../../models/Gestoria';

export async function PUT(request, { params }) {
    try {
        await connectDB();
        const { id } = params;
        const body = await request.json();
        
        const updatedTramite = await Gestoria.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        
        if (!updatedTramite) {
            return NextResponse.json({ error: 'Trámite no encontrado' }, { status: 404 });
        }
        
        return NextResponse.json(updatedTramite);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    try {
        await connectDB();
        const { id } = params;
        
        const deletedTramite = await Gestoria.findByIdAndDelete(id);
        
        if (!deletedTramite) {
            return NextResponse.json({ error: 'Trámite no encontrado' }, { status: 404 });
        }
        
        return NextResponse.json({ message: 'Trámite eliminado correctamente' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
