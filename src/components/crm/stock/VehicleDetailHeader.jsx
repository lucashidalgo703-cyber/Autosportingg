"use client";
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import VehicleStatusBadge from './VehicleStatusBadge';
import VehicleRotationAlert from './VehicleRotationAlert';

export default function VehicleDetailHeader({ vehicle, activeReservation, returnPath = '/admin/stock' }) {
    return (
        <div className="flex min-w-0 flex-col justify-between gap-3 rounded-xl border border-crm-border bg-crm-surface p-4 lg:flex-row lg:items-center">
            <div className="flex flex-col gap-2">
                <Link 
                    href={returnPath}
                    className="flex min-h-8 w-fit items-center gap-2 text-xs text-crm-fg-muted transition-colors hover:text-crm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red"
                >
                    <ArrowLeft size={16} />
                    Volver al Stock
                </Link>
                <h1 className="m-0 break-words text-xl font-semibold leading-7 text-crm-fg">
                    {vehicle.marca} {vehicle.modelo} <span className="font-light text-crm-fg-muted">| {vehicle.año}</span>
                </h1>
                <p className="m-0 break-words text-xs text-crm-fg-muted">{vehicle.dominio || 'Sin dominio'} · {Number(vehicle.kilometraje || 0).toLocaleString('es-AR')} km{vehicle.technicalVersion ? ` · ${vehicle.technicalVersion}` : ''}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                {vehicle.visibleEnWeb && String(vehicle._original?.status || vehicle.estado || '').toLowerCase() === 'disponible' && !vehicle._original?.sold ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Visible en catálogo
                    </span>
                ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#A1A1AA]/10 text-crm-fg-muted border border-crm-border">
                        Fuera del catálogo
                    </span>
                )}
                <VehicleStatusBadge status={vehicle.estado} />
                {activeReservation?._id && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-crm-red/10 text-red-400 border border-red-500/20">
                        <Lock size={12} />
                        RESERVA ACTIVA
                    </span>
                )}
                <div className="h-6 w-px bg-crm-surface-raised hidden md:block"></div>
                <VehicleRotationAlert dias={vehicle.diasEnStock} />
            </div>
        </div>
    );
}
