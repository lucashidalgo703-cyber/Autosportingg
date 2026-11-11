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
            case 'cerrado': return <span className="text-crm-fg-muted bg-neutral-500/10 px-2 py-0.5 rounded font-bold uppercase text-[10px]">Cerrado</span>;
            case 'conforme': return <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded font-bold uppercase text-[10px]">Conforme</span>;
            case 'incidencia': return <span className="text-red-400 bg-crm-red/10 px-2 py-0.5 rounded font-bold uppercase text-[10px]">Incidencia</span>;
            case 'contactado': return <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-bold uppercase text-[10px]">Contactado</span>;
            default: return <span className="text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded font-bold uppercase text-[10px]">Pendiente</span>;
        }
    };

    return (
        <div className="min-w-0 overflow-hidden rounded-2xl border border-crm-border bg-crm-surface shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-crm-border bg-crm-surface-raised/50 p-4">
                <div className="flex items-center gap-2">
                    <Star size={16} className="text-crm-red" />
                    <h3 className="m-0 text-sm font-semibold text-crm-fg">Postventa y Fidelización</h3>
                </div>
                <Link 
                    href="/admin/postventa"
                    className="flex items-center gap-1 text-[10px] font-bold text-crm-red hover:text-crm-fg transition-colors uppercase"
                >
                    Ir al módulo
                    <ChevronRight size={14} />
                </Link>
            </div>
            
            <div className="grid gap-4 p-4 sm:grid-cols-2">
                
                {/* Resumen Principal */}
                <div className="min-w-0 flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[10px] text-crm-fg-muted font-bold uppercase">Estado actual</span>
                            <div>{getStatusBadge(status)}</div>
                        </div>
                        <div className="flex flex-col gap-1 flex-1 border-l border-crm-border pl-4">
                            <span className="text-[10px] text-crm-fg-muted font-bold uppercase">Satisfacción</span>
                            <div className="flex gap-0.5 text-yellow-500 mt-0.5">
                                {rating > 0 ? (
                                    [...Array(5)].map((_, i) => (
                                        <Star key={i} size={14} fill={i < rating ? "currentColor" : "transparent"} />
                                    ))
                                ) : (
                                    <span className="text-xs text-crm-fg-muted">Sin calificar</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-2">
                        <span className="text-[10px] text-crm-fg-muted font-bold uppercase">Checklist Postventa</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                            <div className={`px-2 py-1 rounded border text-[10px] font-bold ${chk.seguimiento24h ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-transparent text-crm-fg-muted border-crm-border'}`}>24H</div>
                            <div className={`px-2 py-1 rounded border text-[10px] font-bold ${chk.seguimiento7d ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-transparent text-crm-fg-muted border-crm-border'}`}>7D</div>
                            <div className={`px-2 py-1 rounded border text-[10px] font-bold ${chk.seguimiento30d ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-transparent text-crm-fg-muted border-crm-border'}`}>30D</div>
                            
                            <div className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 ${chk.resenaRecibida ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-transparent text-crm-fg-muted border-crm-border'}`}>
                                <MessageCircle size={10} /> Reseña
                            </div>
                            <div className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 ${chk.obsequioEntregado ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-transparent text-crm-fg-muted border-crm-border'}`}>
                                <Gift size={10} /> Obsequio
                            </div>
                            <div className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 ${chk.incidenciaResuelta ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-transparent text-crm-fg-muted border-crm-border'}`}>
                                <AlertTriangle size={10} /> Incidencia resuelta
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notas y Acciones */}
                <div className="min-w-0 flex flex-col gap-3 rounded-xl border border-crm-border bg-crm-surface-raised/40 p-3">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] text-crm-fg-muted font-bold uppercase">Notas Postventa</span>
                        <p className="m-0 break-words text-xs leading-5 text-crm-fg">
                            {sale.postSaleNotes ? `"${sale.postSaleNotes}"` : 'No hay notas de postventa.'}
                        </p>
                    </div>
                    
                    <div className="flex justify-end pt-2 border-t border-crm-border">
                        <Link
                            href="/admin/postventa"
                            className="flex items-center gap-2 px-3 py-1.5 bg-crm-surface-raised hover:bg-crm-surface-raised text-crm-fg rounded-lg text-xs font-bold transition-colors border border-crm-border"
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
