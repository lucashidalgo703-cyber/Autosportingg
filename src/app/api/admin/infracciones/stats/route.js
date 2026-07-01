import { NextResponse } from 'next/server';
import connectDB from '../../../../../config/db';
import Infraccion from '../../../../../models/Infraccion';
import { withAdminAuth } from '../../../../../utils/nextAdminAuth';
import { PERMISSIONS } from '../../../../../utils/adminPermissions';

export const GET = withAdminAuth(PERMISSIONS.INFRACCIONES_READ, async (request) => {
    try {
        await connectDB();
        
        // Calcular mes actual
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        // Sumamos importes, costos y calculamos ganancia del mes
        const infraccionesMes = await Infraccion.find({
            createdAt: { $gte: startOfMonth },
            status: { $ne: 'cancelada' } // Excluir canceladas
        });
        
        let totalImporte = 0;
        let totalCosto = 0;
        let ganancia = 0;
        
        infraccionesMes.forEach(inf => {
            // Unificamos moneda si fuera necesario, asumimos ARS para el resumen simple
            if (inf.currency === 'ARS') {
                totalImporte += (inf.amount || 0);
                totalCosto += (inf.cost || 0);
                
                // Si la pagó el cliente (chargedToClient), la ganancia es lo que se cobró menos el costo
                // O si la agencia la resolvió más barato:
                if (inf.chargedToClient) {
                    ganancia += (inf.amount || 0) - (inf.cost || 0);
                }
            }
        });
        
        return NextResponse.json({
            month: startOfMonth.getMonth() + 1,
            year: startOfMonth.getFullYear(),
            totalImporte,
            totalCosto,
            gananciaNeta: ganancia,
            count: infraccionesMes.length
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
