import React, { useState, useEffect, useMemo } from 'react';
import { Landmark, Plus, Settings2, Calendar, Trash2 } from 'lucide-react';
import InstallmentModal from '../../installments/InstallmentModal';
import GenerateInstallmentsModal from '../../installments/GenerateInstallmentsModal';
import InstallmentStatusBadge from '../../installments/InstallmentStatusBadge';
import TransactionModal from '../../finance/TransactionModal';
import { useAdminInstallments } from '../../../../hooks/useAdminInstallments';
import { useAdminTransactions } from '../../../../hooks/useAdminTransactions';

export default function SaleInstallmentsPanel({ sale, saleFinanceData }) {
    const { fetchInstallments, createInstallment, updateInstallment, generateInstallments, deleteInstallment, deleteInstallmentPlan, loading, error } = useAdminInstallments();
    const { createTransaction } = useAdminTransactions();
    const [installments, setInstallments] = useState([]);
    
    // Modal state
    const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [selectedInst, setSelectedInst] = useState(null);
    const [selectedTransactionInst, setSelectedTransactionInst] = useState(null);
    const [modalMode, setModalMode] = useState('create');

    const loadData = async () => {
        const data = await fetchInstallments({ saleId: sale._id });
        setInstallments(data || []);
    };

    useEffect(() => {
        if (sale && sale._id) {
            loadData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sale]);

    const handleNewSingle = () => {
        let nextNumber = 1;
        if (installments.length > 0) {
            nextNumber = Math.max(...installments.filter(i => i.status !== 'anulada').map(i => i.installmentNumber)) + 1;
            if (!isFinite(nextNumber)) nextNumber = 1;
        }

        const getMongoId = (value) => {
            if (!value) return undefined;
            if (typeof value === "string" && value.trim() !== "") return value;
            if (typeof value === "object" && value._id) return value._id;
            return undefined;
        };

        setSelectedInst({
            saleId: getMongoId(sale),
            clientId: getMongoId(sale?.clientId),
            vehicleId: getMongoId(sale?.vehicleId),
            currency: sale.saleCurrency || 'ARS',
            installmentNumber: nextNumber,
            amount: saleFinanceData?.pendingBalance > 0 ? saleFinanceData.pendingBalance : ''
        });
        setModalMode('create');
        setIsSingleModalOpen(true);
    };

    const handleEdit = (inst) => {
        setSelectedInst(inst);
        setModalMode('edit');
        setIsSingleModalOpen(true);
    };

    const handleSaveSingle = async (data) => {
        try {
            if (modalMode === 'edit' && selectedInst && selectedInst._id) {
                await updateInstallment(selectedInst._id, data);
            } else {
                await createInstallment(data);
            }
            await loadData();
            setIsSingleModalOpen(false);
        } catch (err) {
            console.error(err.message);
        }
    };

    const handleDeleteSingle = async (inst) => {
        if (inst.status !== 'anulada') return;
        if (window.confirm('¿Estás seguro de que quieres eliminar esta cuota anulada permanentemente?')) {
            try {
                await deleteInstallment(inst._id);
                await loadData();
            } catch (err) {
                alert(err.message || 'Error al eliminar la cuota');
            }
        }
    };

    const handleGenerate = async (data) => {
        try {
            await generateInstallments(sale._id, data);
            await loadData();
            setIsGenerateModalOpen(false);
        } catch (err) {
            console.error(err.message);
        }
    };

    const handleDeletePlan = async () => {
        if (window.confirm('¿Estás seguro de que quieres eliminar TODO el plan de cuotas? Esta acción es irreversible.')) {
            try {
                await deleteInstallmentPlan(sale._id);
                await loadData();
            } catch (err) {
                alert(err.message || 'Error al eliminar el plan');
            }
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
            saleId: getMongoId(sale),
            clientId: getMongoId(sale?.clientId),
            vehicleId: getMongoId(sale?.vehicleId),
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
            console.error(err.message);
        }
    };

    const metrics = useMemo(() => {
        let pendienteARS = 0, vencidoARS = 0;
        let pendienteUSD = 0, vencidoUSD = 0;

        const now = new Date();

        installments.forEach(inst => {
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
    }, [installments]);

    const formatCurrency = (amount, currency) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    return (
        <div className="bg-[#121214] border border-neutral-800 rounded-2xl overflow-hidden mt-6">
            <div className="p-6 border-b border-neutral-800 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <Landmark size={20} className="text-purple-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-3">
                            Plan de Cuotas
                        </h2>
                        <p className="text-xs text-neutral-500 mt-0.5">
                            Este plan es operativo. No registra cobros reales ni movimientos de caja automáticamente.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {installments.length > 0 && (
                        <button
                            onClick={handleDeletePlan}
                            className="h-9 px-4 rounded-xl bg-crm-red/10 hover:bg-crm-red/20 text-crm-red font-bold text-sm transition-colors flex items-center gap-2 border border-red-500/20"
                        >
                            <Trash2 size={16} />
                            <span className="hidden sm:inline">Eliminar Plan</span>
                        </button>
                    )}
                    <button
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="h-9 px-4 rounded-xl bg-crm-surface-raised hover:bg-neutral-700 text-white font-bold text-sm transition-colors flex items-center gap-2"
                    >
                        <Settings2 size={16} />
                        <span className="hidden sm:inline">Generar Plan</span>
                    </button>
                    <button
                        onClick={handleNewSingle}
                        className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Crear Cuota Manual</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-crm-red/10 text-red-400 p-4 border-b border-neutral-800 text-sm">
                    {error}
                </div>
            )}

            <div className="p-6">
                
                {/* Metrics */}
                {installments.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-crm-surface-raised/30 rounded-xl p-4 border border-neutral-800">
                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Pdte. ARS</div>
                            <div className="text-sm font-bold text-white">{formatCurrency(metrics.pendienteARS, 'ARS')}</div>
                        </div>
                        <div className="bg-crm-surface-raised/30 rounded-xl p-4 border border-neutral-800">
                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Vencido ARS</div>
                            <div className={`text-sm font-bold ${metrics.vencidoARS > 0 ? 'text-red-400' : 'text-neutral-500'}`}>
                                {formatCurrency(metrics.vencidoARS, 'ARS')}
                            </div>
                        </div>
                        <div className="bg-crm-surface-raised/30 rounded-xl p-4 border border-neutral-800">
                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Pdte. USD</div>
                            <div className="text-sm font-bold text-white">{formatCurrency(metrics.pendienteUSD, 'USD')}</div>
                        </div>
                        <div className="bg-crm-surface-raised/30 rounded-xl p-4 border border-neutral-800">
                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Vencido USD</div>
                            <div className={`text-sm font-bold ${metrics.vencidoUSD > 0 ? 'text-red-400' : 'text-neutral-500'}`}>
                                {formatCurrency(metrics.vencidoUSD, 'USD')}
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-8 text-neutral-500">Cargando cuotas...</div>
                ) : installments.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 bg-crm-surface-raised/20 rounded-xl border border-neutral-800 border-dashed">
                        No hay cuotas registradas para esta venta.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-800 bg-crm-surface-raised/20">
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Cuota</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Vencimiento</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-right">Importe</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-right">Cobrado</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-right">Saldo</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-center">Estado</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...installments].sort((a, b) => a.installmentNumber - b.installmentNumber).map(inst => {
                                    const isOverdue = inst.status === 'pendiente' && new Date(inst.dueDate) < new Date();
                                    
                                    // Financial Status Calculation
                                    const fs = inst.financeSummary;
                                    let balanceCuota = 0;
                                    if (inst.currency === 'ARS') balanceCuota = (fs?.ingresosARS || 0) - (fs?.egresosARS || 0);
                                    if (inst.currency === 'USD') balanceCuota = (fs?.ingresosUSD || 0) - (fs?.egresosUSD || 0);
                                    
                                    const saldoCuota = inst.amount - balanceCuota;
                                    let finStatus = 'Sin cobro';
                                    if (balanceCuota > 0 && balanceCuota < inst.amount) finStatus = 'Parcialmente cobrada';
                                    if (balanceCuota >= inst.amount && balanceCuota <= inst.amount) finStatus = 'Cobrada financieramente';
                                    if (balanceCuota > inst.amount) finStatus = 'Sobrecobrada';

                                    const isPaidVisual = inst.status === 'pagada_manual';
                                    const hasWarning = isPaidVisual && saldoCuota > 0;

                                    return (
                                        <tr key={inst._id} className="border-b border-neutral-800/50 hover:bg-crm-surface-raised/30 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="text-sm font-bold text-white">Nº {inst.installmentNumber}</div>
                                                {finStatus !== 'Sin cobro' && (
                                                    <div className="text-[10px] text-green-400 mt-0.5">{finStatus}</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={12} className={isOverdue ? "text-red-400" : "text-neutral-500"} />
                                                    <span className={`text-sm ${isOverdue ? 'font-bold text-red-400' : 'text-neutral-300'}`}>
                                                        {new Date(inst.dueDate).toLocaleDateString('es-AR')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className={`text-sm font-bold ${inst.status === 'anulada' ? 'line-through opacity-50' : 'text-white'}`}>
                                                    {formatCurrency(inst.amount, inst.currency)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className={`text-sm ${balanceCuota > 0 ? 'text-green-400 font-bold' : 'text-neutral-500'}`}>
                                                    {balanceCuota > 0 ? formatCurrency(balanceCuota, inst.currency) : '-'}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className={`text-sm font-bold ${saldoCuota <= 0 ? 'text-neutral-500' : 'text-orange-400'}`}>
                                                    {saldoCuota > 0 ? formatCurrency(saldoCuota, inst.currency) : '0'}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <InstallmentStatusBadge status={inst.status} dueDate={inst.dueDate} />
                                                    {hasWarning && (
                                                        <span className="text-[9px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20" title="La cuota figura pagada manualmente, pero no tiene cobro financiero activo suficiente.">
                                                            Falta cobro real
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    {inst.status !== 'anulada' && (
                                                        <button 
                                                            onClick={() => handleRegisterPayment(inst)}
                                                            className="text-xs font-bold text-green-400 hover:text-green-300 transition-colors"
                                                        >
                                                            Cobrar
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleEdit(inst)}
                                                        className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                                                    >
                                                        Editar
                                                    </button>
                                                    {inst.status === 'anulada' && (
                                                        <button 
                                                            onClick={() => handleDeleteSingle(inst)}
                                                            className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors flex items-center justify-center ml-2"
                                                            title="Eliminar cuota"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <InstallmentModal
                isOpen={isSingleModalOpen}
                onClose={() => setIsSingleModalOpen(false)}
                installment={selectedInst}
                onSave={handleSaveSingle}
                mode={modalMode}
            />

            <GenerateInstallmentsModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                onGenerate={handleGenerate}
                saleData={saleFinanceData}
            />

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                transaction={selectedTransactionInst}
                onSave={handleSaveTransaction}
            />
        </div>
    );
}
