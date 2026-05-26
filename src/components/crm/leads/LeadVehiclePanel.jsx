import React from 'react';
import { Car, ArrowRight, Ghost } from 'lucide-react';
import Link from 'next/link';

export default function LeadVehiclePanel({ lead }) {
    if (!lead) return null;

    const hasVehicle = Boolean(lead.vehicleId);

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Car size={20} className="text-red-500" />
                Vehículo de Interés
            </h3>

            {hasVehicle ? (
                <div className="flex flex-col gap-4 flex-1">
                    <div className="bg-black/30 border border-red-500/20 rounded-xl overflow-hidden flex flex-col">
                        <div className="h-20 bg-neutral-800 relative">
                            {/* Acá idealmente iría la portada del auto */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                <Car size={40} className="text-white" />
                            </div>
                        </div>
                        <div className="p-4 flex flex-col gap-1">
                            <span className="text-xs text-red-500 font-bold uppercase tracking-wider">{lead.vehicleId.marca}</span>
                            <span className="text-white font-bold text-lg leading-tight line-clamp-1">{lead.vehicleId.modelo} {lead.vehicleId.version}</span>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="bg-neutral-800 text-neutral-300 text-[10px] px-2 py-0.5 rounded font-medium border border-neutral-700">
                                    {lead.vehicleId.anio}
                                </span>
                                {lead.vehicleId.dominio && (
                                    <span className="bg-neutral-800 text-neutral-300 text-[10px] px-2 py-0.5 rounded font-medium border border-neutral-700 uppercase">
                                        Patente: {lead.vehicleId.dominio}
                                    </span>
                                )}
                            </div>
                            <div className="mt-3 pt-3 border-t border-neutral-800/50 flex justify-between items-center">
                                <span className="text-sm text-neutral-400">Precio Lista</span>
                                <span className="text-white font-bold">
                                    {lead.vehicleId.moneda} {lead.vehicleId.precioVenta?.toLocaleString('es-AR')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-4">
                        <Link 
                            href={`/admin/stock/${lead.vehicleId._id}`}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition-colors border border-neutral-700"
                        >
                            Ver en Stock
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
                    <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                        <Ghost size={32} className="text-neutral-500" />
                    </div>
                    <h4 className="text-white font-bold mb-2">Sin vehículo</h4>
                    <p className="text-sm text-neutral-400 max-w-[200px]">
                        Esta oportunidad es genérica y no está asociada a un vehículo específico del stock.
                    </p>
                </div>
            )}
        </div>
    );
}
