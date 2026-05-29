"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Landmark } from 'lucide-react';
import { useAdminInstallments } from '../../../hooks/useAdminInstallments';
import InstallmentsSummaryCards from '../../../components/crm/installments/InstallmentsSummaryCards';
import InstallmentsFilters from '../../../components/crm/installments/InstallmentsFilters';
import InstallmentsTable from '../../../components/crm/installments/InstallmentsTable';
import InstallmentMobileCards from '../../../components/crm/installments/InstallmentMobileCards';
import InstallmentModal from '../../../components/crm/installments/InstallmentModal';
import TransactionModal from '../../../components/crm/finance/TransactionModal';
import { useAdminTransactions } from '../../../hooks/useAdminTransactions';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';

export default function InstallmentsPage() {
    const { fetchInstallments, updateInstallment, createInstallment, loading, error } = useAdminInstallments();
    const [allInstallments, setAllInstallments] = useState([]);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [selectedInst, setSelectedInst] = useState(null);
    const [selectedTransactionInst, setSelectedTransactionInst] = useState(null);
    const [modalMode, setModalMode] = useState('edit');

    const { createTransaction } = useAdminTransactions();

    const [filters, setFilters] = useState({
        search: '',
        status: 'todas',
        currency: 'todas'
    });

    const loadData = async () => {
        const data = await fetchInstallments();
        setAllInstallments(data || []);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredInstallments = useMemo(() => {
        return allInstallments.filter(inst => {
            // 1. Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const clientName = (inst.clientId?.fullName || inst.clientId?.firstName || '').toLowerCase();
                const vehicleBrand = (inst.vehicleId?.brand || '').toLowerCase();
                const vehicleName = (inst.vehicleId?.name || '').toLowerCase();
                const notes = (inst.notes || '').toLowerCase();

                const matchSearch = 
                    clientName.includes(searchLower) || 
                    vehicleBrand.includes(searchLower) || 
                    vehicleName.includes(searchLower) || 
                    notes.includes(searchLower);

                if (!matchSearch) return false;
            }

            // 2. Status filter
            const isOverdue = inst.status === 'pendiente' && new Date(inst.dueDate) < new Date();
            const effectiveStatus = isOverdue ? 'vencida' : inst.status;
            
            if (filters.status !== 'todas' && effectiveStatus !== filters.status) {
                return false;
            }

            // 3. Currency filter
            if (filters.currency !== 'todas' && inst.currency !== filters.currency) {
                return false;
            }

            return true;
        });
    }, [allInstallments, filters]);

    const stats = useMemo(() => {
        let pendienteARS = 0, vencidoARS = 0;
        let pendienteUSD = 0, vencidoUSD = 0;

        const now = new Date();

        allInstallments.forEach(inst => {
            if (inst.status !== 'pendiente') return;
            const amount = Number(inst.amount) || 0;
            const isOverdue = new Date(inst.dueDate) < now;

            if (inst.currency === 'ARS') {
                pendienteARS += amount;
                if (isOverdue) vencidoARS += amount;
            } else if (inst.currency === 'USD') {
                pendienteUSD += amount;
                if (isOverdue) vencidoUSD += amount;
            }
        });

        return { pendienteARS, vencidoARS, pendienteUSD, vencidoUSD };
    }, [allInstallments]);

    const handleEdit = (inst) => {
        setSelectedInst(inst);
        setIsModalOpen(true);
    };

    const handleSave = async (data) => {
        try {
            if (modalMode === 'edit' && selectedInst?._id) {
                await updateInstallment(selectedInst._id, data);
            } else {
                await createInstallment(data);
            }
            await loadData();
            setIsModalOpen(false);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleRegisterPayment = (inst) => {
        const getMongoId = (value) => {
            if (!value) return undefined;
            if (typeof value === "string" && value.trim() !== "") return value;
            if (typeof value === "object" && value._id) return value._id;
            return undefined;
        };

        setSelectedTransactionInst({
            type: 'Ingreso',
            category: 'Cobro cuota',
            concept: `Cobro manual cuota N° ${inst.installmentNumber}`,
            amount: inst.amount,
            currency: inst.currency,
            saleId: getMongoId(inst.saleId),
            clientId: getMongoId(inst.clientId),
            vehicleId: getMongoId(inst.vehicleId),
            installmentId: inst._id,
            notes: `Cobro vinculado a cuota N° ${inst.installmentNumber}`
        });
        setIsTransactionModalOpen(true);
    };

    const handleSaveTransaction = async (data) => {
        try {
            await createTransaction(data);
            setIsTransactionModalOpen(false);
            await loadData();
            
            if (window.confirm('Movimiento registrado. ¿Querés marcar esta cuota como pagada_manual?')) {
                await updateInstallment(data.installmentId, { status: 'pagada_manual' });
                await loadData();
            }
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <PermissionGuard permission={PERMISSIONS.CUOTAS_READ}>
        <div className="max-w-7xl mx-auto flex flex-col h-full min-h-[85vh]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <Landmark size={20} className="text-purple-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Cuotas</h1>
                        <p className="text-sm text-neutral-400 mt-1">Control operativo de vencimientos de pagos.</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setSelectedInst(null);
                        setModalMode('create');
                        setIsModalOpen(true);
                    }}
                    className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-colors flex items-center gap-2"
                >
                    <Landmark size={16} />
                    <span>Crear Cuota Manual</span>
                </button>
            </div>

            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-2">
                <p className="text-xs text-yellow-500 font-bold">Este plan de cuotas es operativo. No registra cobros reales ni movimientos de caja automáticamente.</p>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {/* Cards */}
            <InstallmentsSummaryCards stats={stats} />

            {/* Filters */}
            <InstallmentsFilters filters={filters} setFilters={setFilters} />

            {/* Loading State */}
            {loading && allInstallments.length === 0 ? (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    <InstallmentsTable 
                        installments={filteredInstallments} 
                        onEdit={handleEdit} 
                        onRegisterPayment={handleRegisterPayment}
                    />
                    <InstallmentMobileCards 
                        installments={filteredInstallments} 
                        onEdit={handleEdit} 
                        onRegisterPayment={handleRegisterPayment}
                    />
                </>
            )}

            {/* Modal */}
            <InstallmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                installment={selectedInst}
                onSave={handleSave}
                mode={modalMode}
            />

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                transaction={selectedTransactionInst}
                onSave={handleSaveTransaction}
            />
        </div>
        </PermissionGuard>
    );
}
