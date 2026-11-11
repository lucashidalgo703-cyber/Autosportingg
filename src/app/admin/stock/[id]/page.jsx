"use client";
import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import VehicleDetailWorkspace from '../../../../components/crm/stock/VehicleDetailWorkspace';

export default function VehicleDetailPage() {
    const { token } = useAuth();
    const params = useParams();
    return <Suspense fallback={<p role="status" className="p-6 text-sm text-crm-fg-muted">Cargando ficha…</p>}><VehicleDetailWorkspace key={`${token}:${params?.id}`} vehicleId={params?.id} /></Suspense>;
}
