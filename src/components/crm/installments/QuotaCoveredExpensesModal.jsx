import React, { useState, useEffect } from 'react';
import { X, Layers, AlertCircle, CheckCircle2, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import { useExpenseQuotaAssignments } from '../../../hooks/useExpenseQuotaAssignments';

export default function QuotaCoveredExpensesModal({
    isOpen,
    onClose,
    installment
}) {
    const { fetchQuotaCoveredExpenses, loading } = useExpenseQuotaAssignments();
    const [data, setData] = useState(null);

    useEffect(() => {
        if (isOpen && installment?._id) {
            fetchQuotaCoveredExpenses(installment._id)
                .then(res => setData(res))
                .catch(err => console.error('Error fetching covered expenses:', err));
        } else {
            setData(null);
        }
    }, [isOpen, installment, fetchQuotaCoveredExpenses]);

    if (!isOpen || !installment) return null;

    const currency = installment.currency || 'ARS';
    const totalAmount = Number(installment.amount || 0);
    const totalCommitted = data?.totalCommitted || 0;
    const availableAmount = data?.availableAmount !== undefined ? data.availableAmount : totalAmount;
    const coveredExpenses = data?.coveredExpenses || [];

    const formatMoney = (val) => `${currency === 'USD' ? 'USD' : '$'} ${Number(val || 0).toLocaleString('es-AR')}`;

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-crm-bg border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <Layers size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white">Gastos Cubiertos por esta Cuota</h2>
                            <p className="text-xs text-neutral-400 mt-0.5">
                                Cuota #{installment.installmentNumber || 1} • {installment.customerName || installment.clientId?.fullName || 'Cliente'} • {formatMoney(totalAmount)}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                    {/* Metrics card */}
                    <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl border border-neutral-800 bg-crm-surface">
                        <div>
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Total Cuota</span>
                            <span className="text-sm font-black text-white">{formatMoney(totalAmount)}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Comprometido en Gastos</span>
                            <span className="text-sm font-black text-purple-400">{formatMoney(totalCommitted)}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Saldo Disponible</span>
                            <span className={`text-sm font-black ${availableAmount > 0 ? 'text-green-400' : 'text-neutral-500'}`}>
                                {formatMoney(availableAmount)}
                            </span>
                        </div>
                    </div>

                    {/* List */}
                    <div>
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                            Obligaciones y Gastos Asignados ({coveredExpenses.length})
                        </h3>

                        {loading ? (
                            <div className="p-6 text-center text-xs text-neutral-500">Cargando compromisos...</div>
                        ) : coveredExpenses.length === 0 ? (
                            <div className="p-6 text-center text-xs text-neutral-500 rounded-xl border border-neutral-800 bg-neutral-900/20">
                                Esta cuota no tiene cobros comprometidos para ningún gasto. Todo el saldo está disponible.
                            </div>
                        ) : (
                            <div className="rounded-xl border border-neutral-800 overflow-hidden divide-y divide-neutral-800/60 bg-crm-surface">
                                {coveredExpenses.map(item => (
                                    <div key={item.assignmentId} className="p-3.5 flex items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-white">{item.concept}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                                                    {item.category}
                                                </span>
                                                <span className={`text-[10px] font-bold ${item.status === 'activo' ? 'text-green-400' : 'text-yellow-400'}`}>
                                                    {item.status === 'activo' ? 'Pagado' : 'Pendiente'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-3">
                                                <span>Beneficiario: <strong className="text-neutral-300">{item.beneficiary}</strong></span>
                                                <span>•</span>
                                                <span>Total Gasto: {formatMoney(item.expenseAmount)}</span>
                                                {item.dueDate && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Vence: {new Date(item.dueDate).toLocaleDateString('es-AR')}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Comprometido</span>
                                            <span className="text-sm font-black text-purple-400">{formatMoney(item.assignedAmount)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
