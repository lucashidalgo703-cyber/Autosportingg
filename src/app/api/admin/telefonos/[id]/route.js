import { NextResponse } from 'next/server';
import connectDB from '../../../../../config/db';
import PhoneContact from '../../../../../models/PhoneContact';

export async function PUT(request, { params }) {
    try {
        await connectDB();
        const { id } = params;
        const body = await request.json();
        
        const updatedContact = await PhoneContact.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        
        if (!updatedContact) {
            return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
        }
        
        return NextResponse.json(updatedContact);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    try {
        await connectDB();
        const { id } = params;
        
        const deletedContact = await PhoneContact.findByIdAndDelete(id);
        
        if (!deletedContact) {
            return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
        }
        
        return NextResponse.json({ message: 'Contacto eliminado correctamente' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
