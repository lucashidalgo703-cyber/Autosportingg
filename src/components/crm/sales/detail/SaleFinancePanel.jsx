"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, Plus, ShieldAlert } from 'lucide-react';
import TransactionModal from '../../finance/TransactionModal';
import { useAdminTransactions } from '../../../../hooks/useAdminTransactions';

export default function SaleFinancePanel({ sale }) {
    const { fetchTransactions, createTransaction, updateTransaction, loading, error } = useAdminTransactions();
    const [transactions, setTransactions] = useState([]);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);

    const loadData = async () => {
        // Fetch only transactions linked to this sale
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/admin/transactions?saleId=${sale._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTransactions(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Error loading linked transactions", err);
        }
    };

    useEffect(() => {
        if (sale && sale._id) {
            loadData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sale]);

    const handleNewTransaction = () => {
        setSelectedTx({
            saleId: sale._id,
            clientId: sale.clientId?._id || sale.clientId,
            vehicleId: sale.vehicleId?._id || sale.vehicleId,
            type: 'ingreso',
            currency: sale.saleCurrency || 'ARS'
        });
        setIsModalOpen(true);
    };

    const handleEditTransaction = (tx) => {
        setSelectedTx(tx);
        setIsModalOpen(true);
    };

    const handleSaveTransaction = async (data) => {
        try {
            if (selectedTx && selectedTx._id) {
                await updateTransaction(selectedTx._id, data);
            } else {
                await createTransaction(data);
            }
            await loadData();
            setIsModalOpen(false);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleAnnulTransaction = async (id) => {
        try {
            await updateTransaction(id, { status: 'anulado' });
            await loadData();
            setIsModalOpen(false);
        } catch (err) {
            alert(err.message);
        }
    };

    const metrics = useMemo(() => {
        let ingresosARS = 0, egresosARS = 0;
        let ingresosUSD = 0, egresosUSD = 0;

        transactions.forEach(tx => {
            if (tx.status === 'anulado') return;
            const amount = Number(tx.amount) || 0;
            
            if (tx.currency === 'ARS') {
                if (tx.type === 'Ingreso') ingresosARS += amount;
                else egresosARS += amount;
            } else if (tx.currency === 'USD') {
                if (tx.type === 'Ingreso') ingresosUSD += amount;
                else egresosUSD += amount;
            }
        });

        return {
            ingresosARS, egresosARS, balanceARS: ingresosARS - egresosARS,
            ingresosUSD, egresosUSD, balanceUSD: ingresosUSD - egresosUSD
        };
    }, [transactions]);

    const formatCurrency = (amount, currency) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    return (
        <div className="bg-[#121214] border border-neutral-800 rounded-2xl overflow-hidden mt-6">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Wallet size={20} className="text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Movimientos financieros vinculados</h2>
                        <p className="text-xs text-neutral-500 mt-0.5">Estos movimientos son registros manuales vinculados. No representan un plan de cuotas ni una conciliación automática.</p>
                    </div>
                </div>
                <button
                    onClick={handleNewTransaction}
                    className="h-9 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-colors flex items-center gap-2"
                >
                    <Plus size={16} />
                    <span>Registrar movimiento</span>
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 text-red-400 p-4 border-b border-neutral-800 flex items-center gap-2 text-sm">
                    <ShieldAlert size={16} />
                    {error}
                </div>
            )}

            <div className="p-6">
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                    {/* ARS Metrics */}
                    <div className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-800">
                        <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Ingresos ARS</div>
                        <div className="text-sm font-bold text-green-400">{formatCurrency(metrics.ingresosARS, 'ARS')}</div>
                    </div>
                    <div className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-800">
                        <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Egresos ARS</div>
                        <div className="text-sm font-bold text-red-400">{formatCurrency(metrics.egresosARS, 'ARS')}</div>
                    </div>
                    <div className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-800">
                        <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Balance ARS</div>
                        <div className={`text-sm font-bold ${metrics.balanceARS >= 0 ? 'text-white' : 'text-red-400'}`}>
                            {formatCurrency(metrics.balanceARS, 'ARS')}
                        </div>
                    </div>

                    {/* USD Metrics */}
                    <div className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-800">
                        <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Ingresos USD</div>
                        <div className="text-sm font-bold text-green-400">{formatCurrency(metrics.ingresosUSD, 'USD')}</div>
                    </div>
                    <div className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-800">
                        <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Egresos USD</div>
                        <div className="text-sm font-bold text-red-400">{formatCurrency(metrics.egresosUSD, 'USD')}</div>
                    </div>
                    <div className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-800">
                        <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Balance USD</div>
                        <div className={`text-sm font-bold ${metrics.balanceUSD >= 0 ? 'text-white' : 'text-red-400'}`}>
                            {formatCurrency(metrics.balanceUSD, 'USD')}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-neutral-500">Cargando movimientos...</div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 bg-neutral-800/20 rounded-xl border border-neutral-800 border-dashed">
                        No hay movimientos manuales vinculados a esta venta.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-800 bg-neutral-800/20">
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Fecha</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Concepto</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-right">Monto</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-center">Estado</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => (
                                    <tr key={tx._id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="text-sm text-neutral-300">
                                                {new Date(tx.date || tx.createdAt).toLocaleDateString('es-AR')}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-sm font-bold text-white">{tx.concept}</div>
                                            <div className="text-xs text-neutral-500 capitalize">{tx.paymentMethod}</div>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className={`text-sm font-bold ${tx.type === 'Ingreso' ? 'text-green-400' : 'text-red-400'} ${tx.status === 'anulado' ? 'line-through opacity-50' : ''}`}>
                                                {tx.type === 'Ingreso' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {tx.status === 'anulado' ? (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/10 px-2 py-1 rounded-md border border-red-400/20">
                                                    Anulado
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-400/10 px-2 py-1 rounded-md border border-green-400/20">
                                                    Activo
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button 
                                                onClick={() => handleEditTransaction(tx)}
                                                className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                transaction={selectedTx}
                onSave={handleSaveTransaction}
                onAnnul={handleAnnulTransaction}
            />
        </div>
    );
}
