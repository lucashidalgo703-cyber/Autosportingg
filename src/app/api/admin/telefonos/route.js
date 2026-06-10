import { NextResponse } from 'next/server';
import connectDB from '../../../../config/db';
import PhoneContact from '../../../../models/PhoneContact';
// If authentication is needed, we would add the token check here,
// similar to other admin API routes. We can start with a basic CRUD.

export async function GET(request) {
    try {
        await connectDB();
        const contacts = await PhoneContact.find().sort({ name: 1 });
        return NextResponse.json(contacts);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectDB();
        const body = await request.json();
        
        // We could extract the user from auth header if needed for createdBy
        const newContact = new PhoneContact(body);
        await newContact.save();
        
        return NextResponse.json(newContact, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
