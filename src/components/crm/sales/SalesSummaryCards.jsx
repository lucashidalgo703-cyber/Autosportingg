import React from 'react';
import { Handshake, DollarSign, CheckCircle2, Clock, Truck, XCircle, AlertTriangle } from 'lucide-react';

export default function SalesSummaryCards({ sales }) {
    if (!sales) return null;

    const metrics = sales.reduce((acc, sale) => {
        acc.total++;
        if (sale.status === 'confirmada') acc.confirmadas++;
        if (sale.status === 'pendiente_entrega') acc.pendientes++;
        if (sale.status === 'entregada') acc.entregadas++;
        if (sale.status === 'cancelada') acc.canceladas++;

        if (sale.status !== 'cancelada') {
            if (sale.saleCurrency === 'ARS') {
                acc.totalARS += (sale.salePrice || 0);
            } else if (sale.saleCurrency === 'USD') {
                acc.totalUSD += (sale.salePrice || 0);
            }
        }
        return acc;
    }, {
        total: 0,
        confirmadas: 0,
        pendientes: 0,
        entregadas: 0,
        canceladas: 0,
        totalARS: 0,
        totalUSD: 0,
        docPendiente: 0,
        listaParaEntregar: 0,
        demoradas: 0
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sales.forEach(sale => {
        if (sale.status === 'cancelada') return;

        if (sale.documentationStatus !== 'completo') {
            metrics.docPendiente++;
        }
        if (sale.deliveryStatus === 'listo_para_entregar') {
            metrics.listaParaEntregar++;
        }
        if (sale.estimatedDeliveryDate && sale.deliveryStatus !== 'entregado') {
            const estDate = new Date(sale.estimatedDeliveryDate);
            if (estDate < today) {
                metrics.demoradas++;
            }
        }
    });

    return (
        <div className="mb-6">
            <div className="mb-4 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-start gap-3">
                <AlertTriangle size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                    <span className="font-bold text-blue-400 block text-sm">Ventas Comerciales Registradas</span>
                    <p className="text-xs text-blue-200 mt-1">Estos valores reflejan el volumen comercial de ventas. No representan la caja real ni los cobros efectivamente ingresados.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Volumen Comercial USD */}
                <div className="bg-gradient-to-br from-green-900/40 to-green-900/10 border border-green-500/30 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all duration-500"></div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/30">
                            <DollarSign size={16} className="text-green-400" />
                        </div>
                        <span className="text-xs font-bold text-green-500 uppercase tracking-wider">Volumen USD</span>
                    </div>
                    <p className="text-2xl font-black text-white mt-2 font-mono">
                        U$S {metrics.totalUSD.toLocaleString('es-AR')}
                    </p>
                    <p className="text-[10px] text-green-400/80 mt-1 uppercase tracking-wider">Excluye canceladas</p>
                </div>

                {/* Volumen Comercial ARS */}
                <div className="bg-gradient-to-br from-green-900/20 to-neutral-900/50 border border-green-500/20 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
                            <DollarSign size={16} className="text-green-500/70" />
                        </div>
                        <span className="text-xs font-bold text-green-500/70 uppercase tracking-wider">Volumen ARS</span>
                    </div>
                    <p className="text-2xl font-black text-white mt-2 font-mono">
                        $ {metrics.totalARS.toLocaleString('es-AR')}
                    </p>
                    <p className="text-[10px] text-green-500/50 mt-1 uppercase tracking-wider">Excluye canceladas</p>
                </div>

                {/* Métricas de Estado */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 size={14} className="text-blue-500" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Confirmadas</span>
                        </div>
                        <span className="text-xl font-bold text-white">{metrics.confirmadas}</span>
                    </div>

                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock size={14} className="text-orange-500" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Pdte. Entrega</span>
                        </div>
                        <span className="text-xl font-bold text-white">{metrics.pendientes}</span>
                    </div>

                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <Truck size={14} className="text-green-500" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Entregadas</span>
                        </div>
                        <span className="text-xl font-bold text-white">{metrics.entregadas}</span>
                    </div>

                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <XCircle size={14} className="text-red-500" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Canceladas</span>
                        </div>
                        <span className="text-xl font-bold text-white">{metrics.canceladas}</span>
                    </div>
                </div>

                {/* Métricas Operativas y Logísticas */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck size={14} className="text-purple-500" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Doc. Incompleta</span>
                        </div>
                        <span className="text-xl font-bold text-white">{metrics.docPendiente}</span>
                    </div>

                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <Truck size={14} className="text-blue-500" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Lista p/Entregar</span>
                        </div>
                        <span className="text-xl font-bold text-white">{metrics.listaParaEntregar}</span>
                    </div>

                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 size={14} className="text-green-500" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Vehíc. Entregados</span>
                        </div>
                        <span className="text-xl font-bold text-white">{metrics.entregadas}</span>
                    </div>

                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={14} className="text-red-500" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Ent. Demoradas</span>
                        </div>
                        <span className="text-xl font-bold text-white">{metrics.demoradas}</span>
                    </div>
                </div>
                
            </div>
        </div>
    );
}
