import React, { useState, useMemo } from 'react';
import { Plus, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanyPaymentModal from '../CompanyPaymentModal';

export default function PagoEmpresasTab({ allTransactions = [], accounts = [], onCreatePayment }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filtrar solo las transacciones que tienen el campo payeeCompany definido
    const companyPayments = useMemo(() => {
        return allTransactions.filter(tx => tx.payeeCompany && tx.status !== 'anulado');
    }, [allTransactions]);

    const metrics = useMemo(() => {
        let totalARS = 0;
        let totalUSD = 0;
        companyPayments.forEach(tx => {
            if (tx.currency === 'ARS') totalARS += tx.amount;
            if (tx.currency === 'USD') totalUSD += tx.amount;
        });
        return { totalARS, totalUSD };
    }, [companyPayments]);

    const formatMoney = (amount, currency = 'USD') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    const handleCreate = async (payload) => {
        setIsSubmitting(true);
        try {
            await onCreatePayment(payload);
            setIsModalOpen(false);
            // El toast y recarga se manejan en el padre (onCreatePayment)
        } catch (err) {
            // Error manejado en padre o acá
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">TOTAL PAGADO A EMPRESAS (USD)</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(metrics.totalUSD, 'USD')}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">TOTAL PAGADO A EMPRESAS (ARS)</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(metrics.totalARS, 'ARS')}</p>
                </div>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        <button className="h-9 rounded-none border-b-2 border-crm-red px-2 text-sm font-black text-crm-red transition">TODOS LOS PAGOS</button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-crm-border pt-4 mt-4">
                    <button onClick={() => setIsModalOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red-gradient px-4 text-xs font-black text-white shadow-crm-shadow-red transition hover:opacity-95 ml-auto">
                        <Plus size={14} /> Nuevo pago a empresa
                    </button>
                </div>
            </section>

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Fecha</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Empresa Receptora</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Vehículo Vinculado</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {companyPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-crm-bg flex items-center justify-center mb-2">
                                                <Building2 className="text-crm-fg-muted" size={24} />
                                            </div>
                                            <h4 className="font-bold text-crm-fg">Sin pagos registrados</h4>
                                            <p className="text-sm text-crm-fg-muted max-w-sm">No se encontraron pagos vinculados a empresas (LHIVER, AUTOTERRA, AKAR).</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                companyPayments.map(tx => (
                                    <tr key={tx._id} className="hover:bg-crm-surface-raised transition-colors">
                                        <td className="px-4 py-3 text-sm text-crm-fg">{new Date(tx.date || tx.createdAt).toLocaleDateString('es-AR')}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-crm-fg">{tx.payeeCompany}</td>
                                        <td className="px-4 py-3 text-sm text-crm-fg-subtle">
                                            {tx.payeeVehicle || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-crm-fg">{formatMoney(tx.amount, tx.currency)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <CompanyPaymentModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSubmit={handleCreate} 
                accounts={accounts} 
                isSubmitting={isSubmitting} 
            />
        </div>
    );
}
