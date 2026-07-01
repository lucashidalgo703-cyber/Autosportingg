import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, X } from 'lucide-react';
import CrmModal from '../ui/CrmModal';

export default function MonthlyCloseModal({ isOpen, onClose, fetchMonthlyClose }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            fetchMonthlyClose()
                .then(res => {
                    setData(res || []);
                    setLoading(false);
                })
                .catch(err => {
                    toast.error(err.message || 'Error cargando cierres mensuales');
                    setLoading(false);
                });
        }
    }, [isOpen, fetchMonthlyClose]);

    const formatMoney = (amount, currency = 'ARS') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    if (!isOpen) return null;

    return (
        <CrmModal isOpen={isOpen} onClose={onClose} title="Cierres Mensuales" maxWidth="max-w-4xl">
            <div className="p-5">
                {loading ? (
                    <div className="flex min-h-[200px] items-center justify-center">
                        <Loader2 className="animate-spin text-crm-red" size={32} />
                    </div>
                ) : data.length === 0 ? (
                    <div className="p-8 text-center text-crm-fg-muted">
                        No hay información de cierres mensuales.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-crm-border">
                        <table className="w-full text-left whitespace-nowrap border-collapse">
                            <thead className="bg-crm-surface-raised border-b border-crm-border">
                                <tr>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Período</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-success text-right">Ingresos (USD)</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-red text-right">Egresos (USD)</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-info text-right">Neto (USD)</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-success text-right">Ingresos (ARS)</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-red text-right">Egresos (ARS)</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-info text-right">Neto (ARS)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-crm-border">
                                {data.map((row) => (
                                    <tr key={row.period} className="hover:bg-crm-surface-raised transition">
                                        <td className="px-4 py-3 text-xs font-bold text-crm-fg">{row.period}</td>
                                        <td className="px-4 py-3 text-xs font-black text-crm-success text-right">{formatMoney(row.USD.income, 'USD')}</td>
                                        <td className="px-4 py-3 text-xs font-black text-crm-red text-right">{formatMoney(row.USD.expense, 'USD')}</td>
                                        <td className="px-4 py-3 text-xs font-black text-crm-info text-right">{formatMoney(row.USD.net, 'USD')}</td>
                                        <td className="px-4 py-3 text-xs font-black text-crm-success text-right">{formatMoney(row.ARS.income, 'ARS')}</td>
                                        <td className="px-4 py-3 text-xs font-black text-crm-red text-right">{formatMoney(row.ARS.expense, 'ARS')}</td>
                                        <td className="px-4 py-3 text-xs font-black text-crm-info text-right">{formatMoney(row.ARS.net, 'ARS')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex justify-end pt-4">
                    <button
                        onClick={onClose}
                        className="h-10 rounded-xl bg-crm-surface-raised px-6 text-sm font-bold text-crm-fg hover:bg-crm-border transition"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </CrmModal>
    );
}
