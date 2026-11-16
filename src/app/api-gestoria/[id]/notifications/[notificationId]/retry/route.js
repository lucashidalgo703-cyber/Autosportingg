import { NextResponse } from 'next/server';
import connectDB from '../../../../../../config/db.js';
import { withAdminAuth } from '../../../../../../utils/nextAdminAuth';
import { PERMISSIONS } from '../../../../../../utils/adminPermissions';
import { retryGestoriaNotification } from '../../../../../../services/gestoriaStatusService.js';

export const POST = withAdminAuth(PERMISSIONS.GESTORIA_WRITE, async (request, { params }) => {
    try {
        await connectDB();
        const { id, notificationId } = await Promise.resolve(params);
        const emailNotification = await retryGestoriaNotification(request.user, id, notificationId);
        return NextResponse.json({ emailNotification }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        return NextResponse.json({ error: error.status ? error.message : 'No se pudo reintentar el aviso.' }, { status: error.status || 503 });
    }
});
