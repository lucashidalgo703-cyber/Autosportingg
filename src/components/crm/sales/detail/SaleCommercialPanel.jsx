import React from 'react';
import { DollarSign, Info, Landmark } from 'lucide-react';

export default function SaleCommercialPanel({ sale }) {
    if (!sale) return null;

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-crm-border bg-crm-surface">
            <div className="flex items-center gap-2 border-b border-crm-border bg-crm-topbar p-4">
                <DollarSign size={16} className="text-emerald-300" />
                <h3 className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-crm-fg">Condiciones Comerciales</h3>
            </div>

            <div className="flex flex-1 flex-col gap-5 p-5">
                <div className="flex items-center justify-between rounded-xl border border-crm-border bg-crm-bg p-4">
                    <span className="text-sm font-bold text-crm-fg-muted">Precio Final</span>
                    <span className={`text-2xl font-black ${sale.status === 'cancelada' ? 'text-crm-fg-muted line-through' : 'text-emerald-300'}`}>
                        {sale.saleCurrency} {(sale.salePrice || 0).toLocaleString('es-AR')}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Metodo de Pago</span>
                        <div className="flex items-center gap-2">
                            <Landmark size={14} className="text-crm-fg-muted" />
                            <span className="text-sm font-bold uppercase text-crm-fg">{sale.paymentMethod || 'contado'}</span>
                        </div>
                    </div>

                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3 text-right">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Sena Aplicada</span>
                        <span className="text-sm font-bold text-crm-fg">
                            {sale.depositAppliedAmount > 0
                                ? `${sale.depositAppliedCurrency} ${sale.depositAppliedAmount.toLocaleString('es-AR')}`
                                : 'No aplicada'
                            }
                        </span>
                    </div>
                </div>

                {sale.tradeInTotalAmount > 0 && (
                    <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/10 p-3">
                        <span className="text-xs font-bold uppercase tracking-[0.08em] text-purple-300">Vehiculo Tomado</span>
                        <span className="text-sm font-bold text-purple-200">
                            - {sale.saleCurrency} {sale.tradeInTotalAmount.toLocaleString('es-AR')}
                        </span>
                    </div>
                )}

                {sale.tradeInTotalAmount > 0 && (
                    <div className="flex items-center justify-between border-t border-crm-border pt-3">
                        <span className="text-sm font-bold text-crm-fg-muted">Saldo a Cobrar</span>
                        <span className="text-lg font-black text-crm-fg">
                            {sale.saleCurrency} {sale.balanceAfterTradeIn?.toLocaleString('es-AR')}
                        </span>
                    </div>
                )}

                <div className="mt-auto flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                    <Info size={16} className="mt-0.5 shrink-0 text-blue-300" />
                    <p className="m-0 text-xs leading-5 text-blue-100/80">
                        Los cobros, facturacion, cuotas y comisiones se gestionan en los modulos financieros. Esta vista es exclusivamente comercial.
                    </p>
                </div>
            </div>
        </div>
    );
}
