import React from 'react';
import { DollarSign, Landmark, Info } from 'lucide-react';

export default function SaleCommercialPanel({ sale }) {
    if (!sale) return null;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-neutral-800 flex items-center gap-2 bg-[#1E1E24]">
                <DollarSign size={16} className="text-green-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Condiciones Comerciales</h3>
            </div>
            
            <div className="p-5 space-y-5 flex-1">
                
                <div className="bg-black/30 border border-neutral-800 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-sm font-bold text-neutral-400">Precio Final</span>
                    <span className={`text-2xl font-black ${sale.status === 'cancelada' ? 'text-neutral-500 line-through' : 'text-green-400'}`}>
                        {sale.saleCurrency} {(sale.salePrice || 0).toLocaleString('es-AR')}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-800/30 rounded-xl p-3 border border-neutral-800/50">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Método de Pago</span>
                        <div className="flex items-center gap-2">
                            <Landmark size={14} className="text-neutral-400" />
                            <span className="text-sm font-bold text-white uppercase">{sale.paymentMethod || 'contado'}</span>
                        </div>
                    </div>
                    
                    <div className="bg-neutral-800/30 rounded-xl p-3 border border-neutral-800/50 text-right">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Seña Aplicada</span>
                        <span className="text-sm font-bold text-neutral-300">
                            {sale.depositAppliedAmount > 0 
                                ? `${sale.depositAppliedCurrency} ${sale.depositAppliedAmount.toLocaleString('es-AR')}`
                                : 'No aplicada'
                            }
                        </span>
                    </div>
                </div>

                {sale.tradeInTotalAmount > 0 && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Vehículo Tomado</span>
                        <span className="text-sm font-bold text-purple-300">
                            - {sale.saleCurrency} {sale.tradeInTotalAmount.toLocaleString('es-AR')}
                        </span>
                    </div>
                )}

                {sale.tradeInTotalAmount > 0 && (
                    <div className="flex justify-between items-center pt-3 border-t border-neutral-800">
                        <span className="text-sm font-bold text-neutral-400">Saldo a Cobrar</span>
                        <span className="text-lg font-black text-white">
                            {sale.saleCurrency} {sale.balanceAfterTradeIn?.toLocaleString('es-AR')}
                        </span>
                    </div>
                )}

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex gap-3 items-start">
                    <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-200">
                        Los cobros, facturación, cuotas y comisiones se gestionan en los módulos financieros. Esta vista es exclusivamente comercial.
                    </p>
                </div>

            </div>
        </div>
    );
}
