import { NextResponse } from 'next/server';
import connectDB from '../../../../config/db.js';
import { withAdminAuth } from '../../../../utils/nextAdminAuth';
import { PERMISSIONS } from '../../../../utils/adminPermissions';
import { getGestoriaNotification } from '../../../../services/gestoriaStatusService.js';

export const GET = withAdminAuth(PERMISSIONS.GESTORIA_READ, async (request, { params }) => {
    try {
        await connectDB();
        const { id } = await Promise.resolve(params);
        const emailNotification = await getGestoriaNotification(request.user, id);
        return NextResponse.json({ emailNotification }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        return NextResponse.json({ error: error.status ? error.message : 'No se pudo consultar el aviso.' }, { status: error.status || 503 });
    }
});
