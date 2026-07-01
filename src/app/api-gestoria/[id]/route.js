import { NextResponse } from 'next/server';
import connectDB from '../../../config/db';
import Gestoria from '../../../models/Gestoria';
import { withAdminAuth } from '../../../utils/nextAdminAuth';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import TrashRecord from '../../../models/TrashRecord';

export const PUT = withAdminAuth(PERMISSIONS.GESTORIA_WRITE, async (request, { params }) => {
    try {
        await connectDB();
        const resolvedParams = await Promise.resolve(params);
        const id = resolvedParams.id;
        const body = await request.json();
        const existingTramite = await Gestoria.findById(id);
        if (!existingTramite) {
            return NextResponse.json({ error: 'Trámite no encontrado' }, { status: 404 });
        }

        if (body.status && existingTramite.status !== body.status) {
            body.auditLog = existingTramite.auditLog || [];
            body.auditLog.push({
                action: 'CAMBIO_ESTADO',
                details: `Estado cambió de ${existingTramite.status} a ${body.status}`,
                date: new Date(),
                user: request.user?.name || request.user?.email || 'Usuario Desconocido'
            });
        }

        const updatedTramite = await Gestoria.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        
        return NextResponse.json(updatedTramite);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
});

export const DELETE = withAdminAuth('ADMIN_OR_OWNER', async (request, { params }) => {
    try {
        await connectDB();
        const resolvedParams = await Promise.resolve(params);
        const id = resolvedParams.id;
        const tramite = await Gestoria.findById(id);
        if (!tramite) {
            // If it's already deleted (e.g. ghost data from cache), we consider it a success.
            return NextResponse.json({ message: 'Trámite eliminado correctamente (o ya no existía)' });
        }
        
        // TrashRecord
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);
        
        await TrashRecord.create({
            entityType: 'Gestoria',
            entityId: tramite._id,
            snapshot: tramite.toObject(),
            deletedBy: request.user?.userId || request.user?.id || 'System',
            expiresAt
        });

        const deletedTramite = await Gestoria.findByIdAndDelete(id);
        if (!deletedTramite) {
            // If it's already deleted (e.g. ghost data from cache), we consider it a success.
            return NextResponse.json({ message: 'Trámite eliminado correctamente (o ya no existía)' });
        }
        
        return NextResponse.json({ message: 'Trámite eliminado correctamente' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
