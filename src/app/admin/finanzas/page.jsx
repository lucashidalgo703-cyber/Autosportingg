"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, ShieldAlert, Plus } from 'lucide-react';
import { useAdminTransactions } from '../../../hooks/useAdminTransactions';
import FinanceSummaryCards from '../../../components/crm/finance/FinanceSummaryCards';
import FinanceFilters from '../../../components/crm/finance/FinanceFilters';
import TransactionsTable from '../../../components/crm/finance/TransactionsTable';
import TransactionMobileCards from '../../../components/crm/finance/TransactionMobileCards';
import TransactionModal from '../../../components/crm/finance/TransactionModal';

export default function FinanzasPage() {
    const { fetchTransactions, createTransaction, updateTransaction, loading, error } = useAdminTransactions();
    const [allTransactions, setAllTransactions] = useState([]);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);

    const [filters, setFilters] = useState({
        search: '',
        type: 'todas',
        currency: 'todas',
        paymentMethod: 'todas',
        status: 'todos',
        startDate: '',
        endDate: ''
    });

    const loadData = async () => {
        const data = await fetchTransactions();
        setAllTransactions(data || []);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredTransactions = useMemo(() => {
        return allTransactions.filter(tx => {
            // Search
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchSearch = 
                    (tx.concept || tx.description || '').toLowerCase().includes(searchLower) || 
                    (tx.category || '').toLowerCase().includes(searchLower) || 
                    (tx.notes || '').toLowerCase().includes(searchLower);
                if (!matchSearch) return false;
            }

            // Type
            if (filters.type !== 'todas') {
                const txTypeLower = tx.type?.toLowerCase();
                if (txTypeLower !== filters.type) return false;
            }

            // Currency
            if (filters.currency !== 'todas' && tx.currency !== filters.currency) return false;

            // Payment Method
            if (filters.paymentMethod !== 'todas' && tx.paymentMethod !== filters.paymentMethod) return false;

            // Status
            if (filters.status !== 'todos' && tx.status !== filters.status) return false;

            // Dates
            if (filters.startDate && filters.endDate) {
                const txDate = new Date(tx.date || tx.createdAt).setHours(0,0,0,0);
                const start = new Date(filters.startDate).setHours(0,0,0,0);
                const end = new Date(filters.endDate).setHours(0,0,0,0);
                if (txDate < start || txDate > end) return false;
            }

            return true;
        });
    }, [allTransactions, filters]);

    const handleNewTransaction = () => {
        setSelectedTx(null);
        setIsModalOpen(true);
    };

    const handleEditTransaction = (tx) => {
        setSelectedTx(tx);
        setIsModalOpen(true);
    };

    const handleSaveTransaction = async (data) => {
        try {
            if (selectedTx) {
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

    return (
        <div className="max-w-7xl mx-auto flex flex-col h-full min-h-[85vh]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Wallet size={20} className="text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Caja y Finanzas</h1>
                        <p className="text-sm text-neutral-400 mt-0.5">Control de ingresos y egresos manuales</p>
                    </div>
                </div>
                <button
                    onClick={handleNewTransaction}
                    className="h-10 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Nuevo Movimiento</span>
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3">
                    <ShieldAlert size={20} />
                    {error}
                </div>
            )}

            {loading && allTransactions.length === 0 ? (
                <div className="flex-1 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    <FinanceSummaryCards transactions={allTransactions} />
                    <FinanceFilters filters={filters} setFilters={setFilters} />
                    
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-white">
                            Historial de Movimientos <span className="text-neutral-500 font-normal">({filteredTransactions.length})</span>
                        </h2>
                    </div>

                    <TransactionsTable 
                        transactions={filteredTransactions} 
                        onEdit={handleEditTransaction} 
                    />
                    
                    <TransactionMobileCards 
                        transactions={filteredTransactions} 
                        onEdit={handleEditTransaction} 
                    />
                </>
            )}

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
