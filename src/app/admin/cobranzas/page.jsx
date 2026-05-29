"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Target } from 'lucide-react';
import { useAdminInstallments } from '../../../hooks/useAdminInstallments';
import { useAdminTransactions } from '../../../hooks/useAdminTransactions';
import { useAdminCrmTasks } from '../../../hooks/useAdminCrmTasks';

import CollectionsSummaryCards from '../../../components/crm/collections/CollectionsSummaryCards';
import CollectionsFilters from '../../../components/crm/collections/CollectionsFilters';
import CollectionsTable from '../../../components/crm/collections/CollectionsTable';
import CollectionsMobileCards from '../../../components/crm/collections/CollectionsMobileCards';
import DebtBySaleTable from '../../../components/crm/collections/DebtBySaleTable';
import InstallmentModal from '../../../components/crm/installments/InstallmentModal';
import TransactionModal from '../../../components/crm/finance/TransactionModal';
import ReminderModal from '../../../components/crm/collections/ReminderModal';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';

export default function CobranzasPage() {
    const { fetchInstallments, updateInstallment, createInstallment, loading: loadingInst, error: errorInst } = useAdminInstallments();
    const { createTransaction } = useAdminTransactions();
    const { fetchTasks, createTask, tasks, loading: loadingTasks } = useAdminCrmTasks();
    
    const [allInstallments, setAllInstallments] = useState([]);
    
    // Tab State
    const [activeTab, setActiveTab] = useState('cuotas'); // 'cuotas' or 'venta'

    // Modal state
    const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    
    const [selectedInst, setSelectedInst] = useState(null);
    const [selectedTransactionInst, setSelectedTransactionInst] = useState(null);
    const [selectedReminderInst, setSelectedReminderInst] = useState(null);

    const [filters, setFilters] = useState({
        search: '',
        statusOperativo: 'todas',
        statusFinanciero: 'todos',
        vencimiento: 'todas',
        moneda: 'todas'
    });

    const loadData = async () => {
        const data = await fetchInstallments();
        setAllInstallments(data || []);
        await fetchTasks();
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredInstallments = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return allInstallments.filter(inst => {
            // Financial Status Calculation
            const fs = inst.financeSummary;
            let balanceCuota = 0;
            if (inst.currency === 'ARS') balanceCuota = (fs?.ingresosARS || 0) - (fs?.egresosARS || 0);
            if (inst.currency === 'USD') balanceCuota = (fs?.ingresosUSD || 0) - (fs?.egresosUSD || 0);
            
            const saldoCuota = inst.amount - balanceCuota;
            let finStatus = 'sin_cobro';
            if (balanceCuota > 0 && balanceCuota < inst.amount) finStatus = 'parcial';
            if (balanceCuota >= inst.amount && balanceCuota <= inst.amount) finStatus = 'cobrada';
            if (balanceCuota > inst.amount) finStatus = 'sobrecobrada';

            // 1. Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const clientName = (inst.clientId?.fullName || inst.clientId?.firstName || '').toLowerCase();
                const clientPhone = (inst.clientId?.phone || '').toLowerCase();
                const vehicleBrand = (inst.vehicleId?.brand || '').toLowerCase();
                const vehicleName = (inst.vehicleId?.name || '').toLowerCase();
                const vehiclePlate = (inst.vehicleId?.plate || '').toLowerCase();
                const notes = (inst.notes || '').toLowerCase();

                const matchSearch = 
                    clientName.includes(searchLower) || 
                    clientPhone.includes(searchLower) ||
                    vehicleBrand.includes(searchLower) || 
                    vehicleName.includes(searchLower) || 
                    vehiclePlate.includes(searchLower) || 
                    notes.includes(searchLower);

                if (!matchSearch) return false;
            }

            // 2. Operative status filter
            const isOverdue = inst.status === 'pendiente' && new Date(inst.dueDate) < now;
            const effectiveStatus = isOverdue ? 'vencida' : inst.status;
            
            if (filters.statusOperativo !== 'todas' && effectiveStatus !== filters.statusOperativo) {
                return false;
            }

            // 3. Financial status filter
            if (filters.statusFinanciero !== 'todos' && finStatus !== filters.statusFinanciero) {
                return false;
            }

            // 4. Vencimiento filter
            if (filters.vencimiento !== 'todas') {
                const dueDate = new Date(inst.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                
                const diffTime = dueDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (filters.vencimiento === 'vencidas' && diffDays >= 0) return false;
                if (filters.vencimiento === 'hoy' && diffDays !== 0) return false;
                if (filters.vencimiento === '7dias' && (diffDays < 0 || diffDays > 7)) return false;
                if (filters.vencimiento === '30dias' && (diffDays < 0 || diffDays > 30)) return false;
            }

            // 5. Currency filter
            if (filters.moneda !== 'todas' && inst.currency !== filters.moneda) {
                return false;
            }

            return true;
        });
    }, [allInstallments, filters]);

    const stats = useMemo(() => {
        let cuotasPendientes = 0, cuotasVencidas = 0;
        let vencenHoy = 0, vencen7Dias = 0;
        let pendienteARS = 0, vencidoARS = 0;
        let pendienteUSD = 0, vencidoUSD = 0;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        allInstallments.forEach(inst => {
            if (inst.status !== 'pendiente') return;

            const fs = inst.financeSummary;
            let balanceCuota = 0;
            if (inst.currency === 'ARS') balanceCuota = (fs?.ingresosARS || 0) - (fs?.egresosARS || 0);
            if (inst.currency === 'USD') balanceCuota = (fs?.ingresosUSD || 0) - (fs?.egresosUSD || 0);
            
            const saldoCuota = inst.amount - balanceCuota;
            
            if (saldoCuota <= 0) return; // Ya está cobrada financieramente aunque figure pendiente visual

            const dueDate = new Date(inst.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            const diffTime = dueDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            cuotasPendientes++;
            
            if (diffDays < 0) cuotasVencidas++;
            if (diffDays === 0) vencenHoy++;
            if (diffDays >= 0 && diffDays <= 7) vencen7Dias++;

            if (inst.currency === 'ARS') {
                pendienteARS += saldoCuota;
                if (diffDays < 0) vencidoARS += saldoCuota;
            } else if (inst.currency === 'USD') {
                pendienteUSD += saldoCuota;
                if (diffDays < 0) vencidoUSD += saldoCuota;
            }
        });

        return { cuotasPendientes, cuotasVencidas, vencenHoy, vencen7Dias, pendienteARS, vencidoARS, pendienteUSD, vencidoUSD };
    }, [allInstallments]);

    const handleEditInstallment = (inst) => {
        setSelectedInst(inst);
        setIsInstallmentModalOpen(true);
    };

    const handleSaveInstallment = async (data) => {
        try {
            if (selectedInst?._id) {
                await updateInstallment(selectedInst._id, data);
            } else {
                await createInstallment(data);
            }
            await loadData();
            setIsInstallmentModalOpen(false);
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
            
            // Reload data so the financeSummary refreshes
            await loadData();
            
            if (window.confirm('Movimiento registrado. ¿Querés marcar esta cuota como pagada_manual?')) {
                await updateInstallment(data.installmentId, { status: 'pagada_manual' });
                await loadData();
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const handleCreateReminder = (inst) => {
        setSelectedReminderInst(inst);
        setIsReminderModalOpen(true);
    };

    const handleSaveReminder = async (taskData) => {
        await createTask(taskData);
        // fetchTasks is called inside createTask, so it will update the state
    };

    // Calculate reminder status per installment
    const getReminderStatus = (instId) => {
        const instTasks = tasks.filter(t => 
            t.type === 'cobranza' && 
            t.installmentId && 
            (t.installmentId === instId || t.installmentId._id === instId)
        );

        if (instTasks.length === 0) return { status: 'none', task: null };

        // Priority 1: Overdue pending
        const overduePending = instTasks.find(t => t.status === 'pendiente' && new Date(t.dueDate) < new Date());
        if (overduePending) return { status: 'vencido', task: overduePending };

        // Priority 2: Future pending
        const futurePending = instTasks.find(t => t.status === 'pendiente');
        if (futurePending) return { status: 'pendiente', task: futurePending };

        // Priority 3: Completed (most recent)
        const completed = instTasks.filter(t => t.status === 'completada').sort((a, b) => new Date(b.completedAt || b.dueDate) - new Date(a.completedAt || a.dueDate));
        if (completed.length > 0) return { status: 'completado', task: completed[0] };

        // Priority 4: Canceled
        const canceled = instTasks.filter(t => t.status === 'cancelada').sort((a, b) => new Date(b.canceledAt || b.dueDate) - new Date(a.canceledAt || a.dueDate));
        if (canceled.length > 0) return { status: 'cancelado', task: canceled[0] };

        return { status: 'none', task: null };
    };

    const installmentsWithReminders = useMemo(() => {
        return filteredInstallments.map(inst => ({
            ...inst,
            reminderInfo: getReminderStatus(inst._id)
        }));
    }, [filteredInstallments, tasks]);

    const loading = loadingInst || loadingTasks;
    const error = errorInst;

    return (
        <PermissionGuard permission={PERMISSIONS.COBRANZAS_READ}>
        <div className="max-w-7xl mx-auto flex flex-col h-full min-h-[85vh]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Target size={20} className="text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Cobranzas</h1>
                        <p className="text-sm text-neutral-400 mt-1">Tablero operativo de seguimiento de deuda y vencimientos.</p>
                    </div>
                </div>
            </div>

            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-2">
                <p className="text-xs text-yellow-500 font-bold">Este panel muestra vencimientos y deuda operativa. Los cobros reales se registran solo mediante movimientos manuales en Finanzas.</p>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {/* Cards */}
            <CollectionsSummaryCards stats={stats} />

            {/* Filters */}
            <CollectionsFilters filters={filters} setFilters={setFilters} />

            {/* Tabs */}
            <div className="flex gap-4 border-b border-neutral-800 mb-6">
                <button
                    onClick={() => setActiveTab('cuotas')}
                    className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'cuotas' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    Listado de Cuotas
                    {activeTab === 'cuotas' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('venta')}
                    className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'venta' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    Deuda por Venta
                    {activeTab === 'venta' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 rounded-t-full" />}
                </button>
            </div>

            {/* Loading State */}
            {loading && allInstallments.length === 0 ? (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {activeTab === 'cuotas' ? (
                        <>
                            <CollectionsTable 
                                installments={installmentsWithReminders} 
                                onEdit={handleEditInstallment} 
                                onRegisterPayment={handleRegisterPayment}
                                onCreateReminder={handleCreateReminder}
                            />
                            <CollectionsMobileCards 
                                installments={installmentsWithReminders} 
                                onEdit={handleEditInstallment} 
                                onRegisterPayment={handleRegisterPayment}
                                onCreateReminder={handleCreateReminder}
                            />
                        </>
                    ) : (
                        <DebtBySaleTable 
                            installments={installmentsWithReminders} 
                        />
                    )}
                </>
            )}

            {/* Modals */}
            <InstallmentModal
                isOpen={isInstallmentModalOpen}
                onClose={() => setIsInstallmentModalOpen(false)}
                installment={selectedInst}
                onSave={handleSaveInstallment}
                mode={selectedInst ? 'edit' : 'create'}
            />

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                transaction={selectedTransactionInst}
                onSave={handleSaveTransaction}
            />

            <ReminderModal
                isOpen={isReminderModalOpen}
                onClose={() => setIsReminderModalOpen(false)}
                installment={selectedReminderInst}
                onSave={handleSaveReminder}
            />
        </div>
        </PermissionGuard>
    );
}
