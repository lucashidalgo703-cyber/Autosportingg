import React from 'react';
import Link from 'next/link';
import { Star, CheckCircle2, Gift, MessageCircle, AlertTriangle, Target, ChevronRight } from 'lucide-react';

export default function SalePostventaPanel({ sale }) {
    if (!sale) return null;

    const chk = sale.postSaleChecklist || {};
    const status = sale.postSaleStatus || 'pendiente';
    const rating = sale.satisfactionRating || 0;

    const getStatusBadge = (s) => {
        switch (s) {
            case 'cerrado': return <span className="text-neutral-400 bg-neutral-500/10 px-2 py-0.5 rounded font-bold uppercase text-[10px]">Cerrado</span>;
            case 'conforme': return <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded font-bold uppercase text-[10px]">Conforme</span>;
            case 'incidencia': return <span className="text-red-400 bg-crm-red/10 px-2 py-0.5 rounded font-bold uppercase text-[10px]">Incidencia</span>;
            case 'contactado': return <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-bold uppercase text-[10px]">Contactado</span>;
            default: return <span className="text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded font-bold uppercase text-[10px]">Pendiente</span>;
        }
    };

    return (
        <div className="bg-crm-bg border border-crm-border rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-crm-border flex justify-between items-center bg-crm-surface">
                <div className="flex items-center gap-2">
                    <Star size={16} className="text-pink-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Postventa y Fidelización</h3>
                </div>
                <Link 
                    href="/admin/postventa"
                    className="flex items-center gap-1 text-[10px] font-bold text-pink-400 hover:text-pink-300 transition-colors uppercase"
                >
                    Ir al módulo
                    <ChevronRight size={14} />
                </Link>
            </div>
            
            <div className="p-5 flex flex-col md:flex-row gap-6">
                
                {/* Resumen Principal */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[10px] text-neutral-400 font-bold uppercase">Estado actual</span>
                            <div>{getStatusBadge(status)}</div>
                        </div>
                        <div className="flex flex-col gap-1 flex-1 border-l border-crm-border pl-4">
                            <span className="text-[10px] text-neutral-400 font-bold uppercase">Satisfacción</span>
                            <div className="flex gap-0.5 text-yellow-500 mt-0.5">
                                {rating > 0 ? (
                                    [...Array(5)].map((_, i) => (
                                        <Star key={i} size={14} fill={i < rating ? "currentColor" : "transparent"} />
                                    ))
                                ) : (
                                    <span className="text-xs text-neutral-500">Sin calificar</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-2">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Checklist Postventa</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                            <div className={`px-2 py-1 rounded border text-[10px] font-bold ${chk.seguimiento24h ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-transparent text-neutral-600 border-neutral-700'}`}>24H</div>
                            <div className={`px-2 py-1 rounded border text-[10px] font-bold ${chk.seguimiento7d ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-transparent text-neutral-600 border-neutral-700'}`}>7D</div>
                            <div className={`px-2 py-1 rounded border text-[10px] font-bold ${chk.seguimiento30d ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-transparent text-neutral-600 border-neutral-700'}`}>30D</div>
                            
                            <div className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 ${chk.resenaRecibida ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-transparent text-neutral-600 border-neutral-700'}`}>
                                <MessageCircle size={10} /> Reseña
                            </div>
                            <div className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 ${chk.obsequioEntregado ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-transparent text-neutral-600 border-neutral-700'}`}>
                                <Gift size={10} /> Obsequio
                            </div>
                            <div className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 ${chk.incidenciaResuelta ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-transparent text-neutral-600 border-neutral-700'}`}>
                                <AlertTriangle size={10} /> Incidencia resuelta
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notas y Acciones */}
                <div className="flex-1 flex flex-col gap-3 justify-between bg-black/20 rounded-xl p-3 border border-neutral-800">
                    <div className="flex flex-col gap-1.5 flex-1">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase">Notas Postventa</span>
                        <p className="text-xs text-neutral-300 italic flex-1">
                            {sale.postSaleNotes ? `"${sale.postSaleNotes}"` : 'No hay notas de postventa.'}
                        </p>
                    </div>
                    
                    <div className="flex justify-end pt-2 border-t border-neutral-800">
                        <Link
                            href="/admin/postventa"
                            className="flex items-center gap-2 px-3 py-1.5 bg-crm-surface-raised hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold transition-colors border border-neutral-700"
                        >
                            <Target size={14} />
                            Gestionar seguimiento
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}
