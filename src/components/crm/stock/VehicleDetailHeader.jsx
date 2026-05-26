"use client";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import VehicleStatusBadge from './VehicleStatusBadge';
import VehicleRotationAlert from './VehicleRotationAlert';

export default function VehicleDetailHeader({ vehicle }) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1E1E24] p-6 rounded-xl border border-[#33333A]">
            <div className="flex flex-col gap-2">
                <Link 
                    href="/admin/stock"
                    className="flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white transition-colors w-fit mb-2"
                >
                    <ArrowLeft size={16} />
                    Volver al Stock
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold text-white m-0">
                    {vehicle.marca} {vehicle.modelo} <span className="font-light text-[#A1A1AA]">| {vehicle.año}</span>
                </h1>
                <p className="text-sm text-[#A1A1AA] m-0">{vehicle.version}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                {vehicle.visibleEnWeb ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Público Web
                    </span>
                ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#A1A1AA]/10 text-[#A1A1AA] border border-[#33333A]">
                        Oculto Web
                    </span>
                )}
                <VehicleStatusBadge status={vehicle.estado} />
                <div className="h-6 w-px bg-[#33333A] hidden md:block"></div>
                <VehicleRotationAlert dias={vehicle.diasEnStock} />
            </div>
        </div>
    );
}
