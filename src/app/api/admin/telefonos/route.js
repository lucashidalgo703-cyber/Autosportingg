import { NextResponse } from 'next/server';
import connectDB from '../../../../config/db';
import PhoneContact from '../../../../models/PhoneContact';
import { withAdminAuth } from '../../../../utils/nextAdminAuth';
import { PERMISSIONS } from '../../../../utils/adminPermissions';

export const GET = withAdminAuth(PERMISSIONS.TELEFONOS_READ, async (request) => {
    try {
        await connectDB();
        const contacts = await PhoneContact.find().sort({ name: 1 });
        return NextResponse.json(contacts);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withAdminAuth(PERMISSIONS.TELEFONOS_WRITE, async (request) => {
    try {
        await connectDB();
        const body = await request.json();
        
        if (request.user) {
            body.createdBy = request.user.name || request.user.email;
        }

        const newContact = new PhoneContact(body);
        await newContact.save();
        
        return NextResponse.json(newContact, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
});
