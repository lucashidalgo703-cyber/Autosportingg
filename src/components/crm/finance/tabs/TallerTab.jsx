import React, { useMemo } from 'react';
import { Plus, Wrench, Edit, Trash2 } from 'lucide-react';

export default function TallerTab({ allTransactions = [], onNew, onEdit, onDelete }) {
    // Filtrar solo los egresos que pertenezcan a la categoría taller, chapista o mecanico
    const tallerTransactions = useMemo(() => {
        return allTransactions.filter(tx => 
            tx.status !== 'anulado' && 
            tx.type?.toLowerCase() === 'egreso' &&
            (tx.category?.toLowerCase().includes('taller') || 
             tx.category?.toLowerCase().includes('chapista') || 
             tx.category?.toLowerCase().includes('mecanico') ||
             tx.category?.toLowerCase().includes('mecánico') ||
             tx.category?.toLowerCase().includes('repuestos') ||
             tx.concept?.toLowerCase().includes('taller') ||
             tx.concept?.toLowerCase().includes('chapista') ||
             tx.concept?.toLowerCase().includes('mecanico') ||
             tx.concept?.toLowerCase().includes('mecánico'))
        ).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    }, [allTransactions]);

    const metrics = useMemo(() => {
        let totalARS = 0;
        let totalUSD = 0;
        tallerTransactions.forEach(tx => {
            if (tx.currency === 'ARS') totalARS += tx.amount;
            if (tx.currency === 'USD') totalUSD += tx.amount;
        });
        return { totalARS, totalUSD };
    }, [tallerTransactions]);

    const formatMoney = (amount, currency = 'ARS') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">TOTAL GASTOS TALLER (ARS)</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(metrics.totalARS, 'ARS')}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">TOTAL GASTOS TALLER (USD)</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(metrics.totalUSD, 'USD')}</p>
                </div>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        <button className="h-9 rounded-none border-b-2 border-crm-red px-2 text-sm font-black text-crm-red transition">REGISTRO DE GASTOS DE TALLER</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-crm-border md:border-t-0 pt-4 md:pt-0 mt-4 md:mt-0">
                        <button onClick={onNew} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red-gradient px-4 text-xs font-black text-white shadow-crm-shadow-red transition hover:opacity-95">
                            <Plus size={14} /> Registrar Gasto
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Fecha</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Concepto</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Medio de Pago</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Monto</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {tallerTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-crm-bg flex items-center justify-center mb-2">
                                                <Wrench className="text-crm-fg-muted" size={24} />
                                            </div>
                                            <h4 className="font-bold text-crm-fg">Sin gastos registrados</h4>
                                            <p className="text-sm text-crm-fg-muted max-w-sm">No se encontraron egresos con la categoría "Taller", "Chapista" o "Mecánico".</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                tallerTransactions.map(tx => (
                                    <tr key={tx._id} className="hover:bg-crm-surface-raised transition-colors">
                                        <td className="px-4 py-3 text-sm text-crm-fg">{new Date(tx.date || tx.createdAt).toLocaleDateString('es-AR')}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-crm-fg">{tx.concept || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-crm-fg-subtle capitalize">{tx.paymentMethod || '-'}</td>
                                        <td className="px-4 py-3 text-sm font-black text-crm-fg">{formatMoney(tx.amount, tx.currency)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => onEdit(tx)} className="p-1.5 text-neutral-400 hover:text-white hover:bg-crm-bg rounded-lg transition-colors" title="Editar">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => onDelete(tx)} className="p-1.5 text-neutral-400 hover:text-crm-red hover:bg-crm-red/10 rounded-lg transition-colors" title="Anular">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
