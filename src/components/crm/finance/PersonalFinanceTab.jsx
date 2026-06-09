import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Wallet, FileText, Trash2, Edit } from 'lucide-react';
import { useAdminPersonalFinance } from '../../../hooks/useAdminPersonalFinance';
import PersonalTransactionModal from './PersonalTransactionModal';

const formatMoney = (amount, currency = 'ARS') => {
    const value = Number(amount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${currency} ${value}`;
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-AR');
};

export default function PersonalFinanceTab() {
    const { fetchTransactions, createTransaction, updateTransaction, deleteTransaction, loading } = useAdminPersonalFinance();
    const [transactions, setTransactions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);

    const loadData = async () => {
        const data = await fetchTransactions();
        setTransactions(data || []);
    };

    useEffect(() => {
        loadData();
    }, []);

    const metrics = useMemo(() => {
        return transactions.reduce((acc, tx) => {
            const currency = tx.currency;
            const amount = Number(tx.amount || 0);

            if (tx.type === 'ingreso') {
                acc[currency].income += amount;
            } else if (tx.type === 'egreso') {
                acc[currency].expense += amount;
            }

            return acc;
        }, {
            ARS: { income: 0, expense: 0 },
            USD: { income: 0, expense: 0 }
        });
    }, [transactions]);

    const balances = useMemo(() => ({
        ARS: metrics.ARS.income - metrics.ARS.expense,
        USD: metrics.USD.income - metrics.USD.expense
    }), [metrics]);

    const handleSave = async (data) => {
        try {
            if (selectedTx) {
                await updateTransaction(selectedTx._id, data);
            } else {
                await createTransaction(data);
            }
            await loadData();
            setIsModalOpen(false);
            setSelectedTx(null);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Seguro que querés eliminar este movimiento personal?')) {
            try {
                await deleteTransaction(id);
                await loadData();
            } catch (error) {
                alert(error.message);
            }
        }
    };

    const openNewModal = () => {
        setSelectedTx(null);
        setIsModalOpen(true);
    };

    const openEditModal = (tx) => {
        setSelectedTx(tx);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header / KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="rounded-2xl border border-neutral-800 bg-[#121214] p-5">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base font-black text-white">💰 Gastos Personales</h2>
                            <p className="mt-1 text-xs text-neutral-400">Total acumulado en tu caja independiente.</p>
                        </div>
                        <Wallet className="text-blue-500" size={20} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-black border border-neutral-800 p-4">
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Total ARS</p>
                            <p className={`text-xl font-black ${balances.ARS >= 0 ? 'text-white' : 'text-red-500'}`}>
                                {formatMoney(balances.ARS, 'ARS')}
                            </p>
                        </div>
                        <div className="rounded-xl bg-black border border-neutral-800 p-4">
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Total USD</p>
                            <p className={`text-xl font-black ${balances.USD >= 0 ? 'text-white' : 'text-red-500'}`}>
                                {formatMoney(balances.USD, 'USD')}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-neutral-800 bg-[#121214] p-5">
                    <h2 className="mb-5 text-base font-black text-white">📊 Resumen Histórico</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-black border border-neutral-800 p-4">
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Ingresos USD</p>
                            <p className="text-lg font-black text-green-500">{formatMoney(metrics.USD.income, 'USD')}</p>
                        </div>
                        <div className="rounded-xl bg-black border border-neutral-800 p-4">
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Egresos USD</p>
                            <p className="text-lg font-black text-red-500">{formatMoney(metrics.USD.expense, 'USD')}</p>
                        </div>
                    </div>
                </section>
            </div>

            {/* List Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Movimientos</h3>
                <button
                    onClick={openNewModal}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-500"
                >
                    <Plus size={16} />
                    Nuevo Movimiento
                </button>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-neutral-800 bg-[#121214] overflow-hidden">
                {loading && transactions.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500">Cargando movimientos...</div>
                ) : transactions.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <FileText size={40} className="text-neutral-700 mb-4" />
                        <h4 className="text-white font-bold mb-1">Sin movimientos</h4>
                        <p className="text-sm text-neutral-500 mb-4">No hay movimientos registrados en tu caja personal.</p>
                        <button onClick={openNewModal} className="text-sm font-bold text-blue-500 hover:text-blue-400">Crear el primero</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-black/50 text-neutral-400 font-medium">
                                <tr>
                                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Fecha</th>
                                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Tipo</th>
                                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Concepto / Categoría</th>
                                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Importe</th>
                                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Estado</th>
                                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {transactions.map((tx) => (
                                    <tr key={tx._id} className="hover:bg-neutral-800/30 transition-colors">
                                        <td className="px-4 py-3 text-neutral-300">{formatDate(tx.transactionDate)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                tx.type === 'ingreso' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                            }`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-white font-medium">{tx.concept}</p>
                                            <p className="text-xs text-neutral-500 mt-0.5">{tx.category} • {tx.paymentMethod}</p>
                                        </td>
                                        <td className={`px-4 py-3 font-black ${tx.type === 'ingreso' ? 'text-green-500' : 'text-white'}`}>
                                            {tx.type === 'ingreso' ? '+' : '-'}{formatMoney(tx.amount, tx.currency)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                tx.status === 'pagado' ? 'text-green-400' : 'text-yellow-500'
                                            }`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openEditModal(tx)} className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors">
                                                    <Edit size={15} />
                                                </button>
                                                <button onClick={() => handleDelete(tx._id)} className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-800 transition-colors">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <PersonalTransactionModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                transaction={selectedTx}
                onSave={handleSave}
            />
        </div>
    );
}
