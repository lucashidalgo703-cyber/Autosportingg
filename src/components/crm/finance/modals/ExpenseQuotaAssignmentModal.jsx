import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    X,
    Search,
    AlertTriangle,
    AlertCircle,
    CheckCircle2,
    Calendar,
    DollarSign,
    User,
    FileText,
    Plus,
    Trash2,
    Clock,
    RefreshCw,
    ShieldAlert,
    Landmark,
    Layers,
    ArrowRight,
    Edit2,
    Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useExpenseQuotaAssignments } from '../../../../hooks/useExpenseQuotaAssignments';
import ConfirmModal from '../../ui/ConfirmModal';
import CrmBadge from '../../ui/CrmBadge';

export default function ExpenseQuotaAssignmentModal({
    isOpen,
    onClose,
    expense,
    onUpdated
}) {
    const {
        loading,
        fetchExpenseAssignments,
        assignQuota,
        releaseAssignment,
        updateAssignmentAmount,
        searchQuotas,
        createManualQuotaAndAssign
    } = useExpenseQuotaAssignments();

    const [assignmentData, setAssignmentData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Cartera search state
    const [searchQuery, setSearchQuery] = useState('');
    const [carteraResults, setCarteraResults] = useState([]);
    const [isSearchingCartera, setIsSearchingCartera] = useState(false);
    const [customAssignAmounts, setCustomAssignAmounts] = useState({});

    // Manual quota form state
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualForm, setManualForm] = useState({
        customerName: '',
        customerPhone: '',
        concept: '',
        amount: '',
        dueDate: '',
        installmentNumber: 1,
        notes: ''
    });
    const [possibleDuplicates, setPossibleDuplicates] = useState(null);
    const [isSavingManual, setIsSavingManual] = useState(false);

    // Inline edit for existing assignment
    const [editingAssignmentId, setEditingAssignmentId] = useState(null);
    const [editAmountVal, setEditAmountVal] = useState('');

    // Confirm release
    const [confirmReleaseId, setConfirmReleaseId] = useState(null);

    const expenseId = expense?._id;
    const currency = expense?.currency || 'ARS';

    const loadAssignments = useCallback(async () => {
        if (!expenseId) return;
        setIsLoadingData(true);
        try {
            const data = await fetchExpenseAssignments(expenseId);
            setAssignmentData(data);
        } catch (err) {
            toast.error(err.message || 'Error cargando asignaciones');
        } finally {
            setIsLoadingData(false);
        }
    }, [expenseId, fetchExpenseAssignments]);

    const performSearchQuotas = useCallback(async (queryText = '') => {
        if (!currency) return;
        setIsSearchingCartera(true);
        try {
            const results = await searchQuotas({
                currency,
                search: queryText,
                expenseId: expenseId || ''
            });
            setCarteraResults(results);
        } catch (err) {
            console.error('Error buscando cuotas:', err);
        } finally {
            setIsSearchingCartera(false);
        }
    }, [currency, expenseId, searchQuotas]);

    useEffect(() => {
        if (isOpen && expenseId) {
            loadAssignments();
            performSearchQuotas('');
            setShowManualForm(false);
            setPossibleDuplicates(null);
            setManualForm({
                customerName: '',
                customerPhone: '',
                concept: `Cuota para cubrir: ${expense?.concept || 'Gasto'}`,
                amount: '',
                dueDate: expense?.dueDate ? new Date(expense.dueDate).toISOString().split('T')[0] : '',
                installmentNumber: 1,
                notes: ''
            });
        }
    }, [isOpen, expenseId, loadAssignments, performSearchQuotas, expense]);

    // Handle searching with debounce
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            performSearchQuotas(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, isOpen, performSearchQuotas]);

    if (!isOpen || !expense) return null;

    const summary = assignmentData?.summary || {
        expenseAmount: expense.amount || 0,
        coveredTotal: 0,
        remainingToCover: expense.amount || 0,
        coveragePercentage: 0,
        collectedPortionTotal: 0,
        isFullyCovered: false
    };

    const assignments = assignmentData?.assignments || [];
    const activeAssignments = assignments.filter(a => a.status === 'activa');

    const formatMoney = (amount, curr = currency) => {
        return `${curr === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    // Quick assign handler
    const handleAssignQuota = async (quota, amountToAssign) => {
        const amt = Number(amountToAssign);
        if (!amt || amt <= 0) {
            toast.error('Ingrese un monto válido');
            return;
        }

        try {
            await assignQuota(expenseId, {
                installmentId: quota._id,
                assignedAmount: amt,
                notes: `Asignado a ${expense.concept || 'Gasto'}`
            });
            toast.success('Cuota asignada correctamente');
            loadAssignments();
            performSearchQuotas(searchQuery);
            if (onUpdated) onUpdated();
        } catch (err) {
            toast.error(err.message || 'Error al asignar cuota');
        }
    };

    // Save inline edit amount
    const handleSaveEditAmount = async (assignmentId) => {
        const amt = Number(editAmountVal);
        if (!amt || amt <= 0) {
            toast.error('Monto inválido');
            return;
        }
        try {
            await updateAssignmentAmount(assignmentId, amt);
            toast.success('Importe actualizado');
            setEditingAssignmentId(null);
            loadAssignments();
            performSearchQuotas(searchQuery);
            if (onUpdated) onUpdated();
        } catch (err) {
            toast.error(err.message || 'Error actualizando importe');
        }
    };

    // Release assignment
    const handleConfirmRelease = async () => {
        if (!confirmReleaseId) return;
        try {
            await releaseAssignment(confirmReleaseId, 'Liberación voluntaria desde panel');
            toast.success('Asignación liberada. Monto devuelto a cartera.');
            setConfirmReleaseId(null);
            loadAssignments();
            performSearchQuotas(searchQuery);
            if (onUpdated) onUpdated();
        } catch (err) {
            toast.error(err.message || 'Error liberando asignación');
        }
    };

    // Manual Quota Submit
    const handleManualSubmit = async (e, force = false) => {
        if (e) e.preventDefault();
        if (!manualForm.customerName.trim()) return toast.error('Ingresá el cliente / deudor');
        if (!manualForm.concept.trim()) return toast.error('Ingresá el concepto');
        if (!manualForm.amount || Number(manualForm.amount) <= 0) return toast.error('Monto inválido');
        if (!manualForm.dueDate) return toast.error('Ingresá la fecha de vencimiento');

        setIsSavingManual(true);
        try {
            const res = await createManualQuotaAndAssign({
                ...manualForm,
                currency,
                forceCreate: force,
                expenseId,
                assignedAmount: Math.min(Number(manualForm.amount), summary.remainingToCover > 0 ? summary.remainingToCover : Number(manualForm.amount))
            });

            if (res.duplicateWarning) {
                setPossibleDuplicates(res.duplicates);
                toast('Se encontraron cuotas similares en cartera', { icon: '⚠️' });
                return;
            }

            toast.success('Cuota manual creada y asignada con éxito');
            setShowManualForm(false);
            setPossibleDuplicates(null);
            setManualForm({
                customerName: '',
                customerPhone: '',
                concept: '',
                amount: '',
                dueDate: '',
                installmentNumber: 1,
                notes: ''
            });
            loadAssignments();
            performSearchQuotas(searchQuery);
            if (onUpdated) onUpdated();
        } catch (err) {
            toast.error(err.message || 'Error guardando cuota manual');
        } finally {
            setIsSavingManual(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-crm-bg border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
                
                {/* Header */}
                <div className="p-5 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <Layers size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white">Asignar Cuota para Cubrir Pago</h2>
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${expense.status === 'activo' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                                    {expense.status === 'activo' ? 'Pago Realizado' : 'Gasto Pendiente'}
                                </span>
                            </div>
                            <p className="text-xs text-neutral-400 mt-0.5">
                                Reserva cobros previstos de cartera para cubrir esta obligación sin alterar la caja real.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-crm-surface-raised rounded-xl text-neutral-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                    
                    {/* Expense & Coverage Summary Card */}
                    <div className="rounded-xl border border-neutral-800 bg-crm-surface p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-neutral-800/60">
                            <div>
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Concepto de Gasto</span>
                                <span className="text-sm font-bold text-white block truncate">{expense.concept || expense.description}</span>
                                <span className="text-[11px] text-neutral-400">{expense.category || 'General'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Beneficiario</span>
                                <span className="text-sm font-bold text-neutral-200 block truncate">
                                    {expense.beneficiary || expense.targetUser || expense.payeeCompany || 'Sin especificar'}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Vencimiento del Gasto</span>
                                <span className="text-sm font-bold text-neutral-200 flex items-center gap-1.5 mt-0.5">
                                    <Calendar size={14} className="text-neutral-500" />
                                    {expense.dueDate ? new Date(expense.dueDate).toLocaleDateString('es-AR') : (expense.date ? new Date(expense.date).toLocaleDateString('es-AR') : 'Sin fecha')}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Importe Total</span>
                                <span className="text-lg font-black text-white block">
                                    {formatMoney(expense.amount, currency)}
                                </span>
                            </div>
                        </div>

                        {/* Cobertura Prevista vs Real */}
                        <div className="mt-4 pt-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-3 rounded-lg bg-black/30 border border-neutral-800">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] font-bold text-neutral-400">Cobertura Prevista</span>
                                    <span className="text-xs font-black text-purple-400">{summary.coveragePercentage}%</span>
                                </div>
                                <div className="text-base font-black text-purple-300">
                                    {formatMoney(summary.coveredTotal, currency)}
                                </div>
                                <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className="bg-purple-500 h-full rounded-full transition-all duration-300"
                                        style={{ width: `${summary.coveragePercentage}%` }}
                                    />
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-black/30 border border-neutral-800">
                                <span className="text-[11px] font-bold text-neutral-400 block">Faltante por Cubrir</span>
                                <div className={`text-base font-black mt-1 ${summary.remainingToCover === 0 ? 'text-green-400' : 'text-crm-red'}`}>
                                    {formatMoney(summary.remainingToCover, currency)}
                                </div>
                                <span className="text-[10px] text-neutral-500 mt-1 block">
                                    {summary.remainingToCover === 0 ? '✓ Pago 100% comprometido' : 'Pendiente de asignar cuotas'}
                                </span>
                            </div>

                            <div className="p-3 rounded-lg bg-black/30 border border-neutral-800">
                                <span className="text-[11px] font-bold text-neutral-400 block">Recaudado Real de Cuotas</span>
                                <div className="text-base font-black text-green-400 mt-1">
                                    {formatMoney(summary.collectedPortionTotal, currency)}
                                </div>
                                <span className="text-[10px] text-neutral-500 mt-1 block">
                                    {summary.collectedPortionTotal > 0 ? 'Cobrado por clientes en caja' : 'Aún sin cobranzas reales'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Active Warnings / Alerts */}
                    {activeAssignments.some(a => a.alerts?.isDelayed || a.alerts?.isDateMismatch) && (
                        <div className="space-y-2">
                            {activeAssignments.filter(a => a.alerts?.isDelayed).map(a => (
                                <div key={`alert-delayed-${a._id}`} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3 text-red-400 text-xs">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-crm-red" />
                                    <div>
                                        <span className="font-bold block text-red-300">Cuota Atrasada en Cobranza</span>
                                        La cuota asignada de <strong className="text-white">{a.installmentId?.customerName || a.installmentId?.clientId?.fullName}</strong> ({formatMoney(a.assignedAmount, currency)}) está demorada por {a.alerts.delayedDays} días (venció el {new Date(a.installmentId?.dueDate).toLocaleDateString('es-AR')}).
                                    </div>
                                </div>
                            ))}
                            {activeAssignments.filter(a => a.alerts?.isDateMismatch).map(a => (
                                <div key={`alert-mismatch-${a._id}`} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3 text-amber-300 text-xs">
                                    <Clock size={16} className="shrink-0 mt-0.5 text-amber-400" />
                                    <div>
                                        <span className="font-bold block text-amber-200">Descalce de Vencimientos</span>
                                        El gasto vence antes de la fecha prevista de cobro de la cuota ({new Date(a.installmentId?.dueDate).toLocaleDateString('es-AR')}). Podría requerir adelanto o fondos puente.
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Section: Cuotas Asignadas Actualmente */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-purple-400" />
                                Cuotas Asignadas a Este Pago ({activeAssignments.length})
                            </h3>
                            {activeAssignments.length > 0 && (
                                <span className="text-xs text-neutral-500">
                                    Total Comprometido: <strong className="text-purple-300">{formatMoney(summary.coveredTotal, currency)}</strong>
                                </span>
                            )}
                        </div>

                        {activeAssignments.length === 0 ? (
                            <div className="p-6 text-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900/30">
                                <p className="text-xs text-neutral-500">
                                    No hay cuotas asignadas a este gasto todavía. Buscá abajo en la cartera o creá una cuota manual.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-neutral-800 overflow-hidden divide-y divide-neutral-800/60 bg-crm-surface">
                                {activeAssignments.map(a => {
                                    const inst = a.installmentId || {};
                                    const isEditing = editingAssignmentId === a._id;
                                    const clientName = inst.customerName || inst.clientId?.fullName || 'Cliente cartera';
                                    const concept = inst.concept || (inst.vehicleId ? `${inst.vehicleId.brand} ${inst.vehicleId.name}` : 'Cuota de venta');

                                    return (
                                        <div key={a._id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-800/20 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 text-xs font-bold">
                                                    #{inst.installmentNumber || 1}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-white">{clientName}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                                                            {inst.source === 'manual' ? 'Cuota Manual' : 'Venta'}
                                                        </span>
                                                        <span className={`text-[10px] font-bold ${inst.status === 'pagada' ? 'text-green-400' : (inst.status === 'parcial' ? 'text-yellow-400' : 'text-neutral-400')}`}>
                                                            {inst.status === 'pagada' ? 'Cobrada' : (inst.status === 'parcial' ? 'Cobro parcial' : 'Pendiente')}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-neutral-400 mt-0.5 flex flex-wrap items-center gap-3">
                                                        <span>{concept}</span>
                                                        <span>•</span>
                                                        <span>Cobro previsto: <strong className="text-neutral-300">{new Date(inst.dueDate).toLocaleDateString('es-AR')}</strong></span>
                                                        <span>•</span>
                                                        <span>Total cuota: {formatMoney(inst.amount, currency)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="any"
                                                            value={editAmountVal}
                                                            onChange={(e) => setEditAmountVal(e.target.value)}
                                                            className="w-28 bg-black/40 border border-purple-500/50 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                                                            placeholder="Monto"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleSaveEditAmount(a._id)}
                                                            className="p-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition"
                                                            title="Guardar"
                                                        >
                                                            <Save size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingAssignmentId(null)}
                                                            className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white text-xs transition"
                                                            title="Cancelar"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-right">
                                                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Asignado</span>
                                                        <span className="text-sm font-black text-purple-300">{formatMoney(a.assignedAmount, currency)}</span>
                                                    </div>
                                                )}

                                                {!isEditing && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setEditingAssignmentId(a._id);
                                                                setEditAmountVal(String(a.assignedAmount));
                                                            }}
                                                            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
                                                            title="Modificar monto"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmReleaseId(a._id)}
                                                            className="p-1.5 text-neutral-400 hover:text-crm-red hover:bg-crm-red/10 rounded-lg transition"
                                                            title="Quitar asignación y liberar monto"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Section: Buscar Cuotas de la Cartera & Cargar Manual */}
                    <div className="border-t border-neutral-800 pt-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                                    <Search size={14} className="text-blue-400" />
                                    Buscar Cuotas Disponibles en Cartera ({currency})
                                </h3>
                                <p className="text-[11px] text-neutral-500 mt-0.5">
                                    Seleccioná cuotas con saldo disponible para reservar hacia este gasto.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowManualForm(!showManualForm);
                                    setPossibleDuplicates(null);
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${showManualForm ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700'}`}
                            >
                                <Plus size={14} />
                                {showManualForm ? 'Ocultar Cuota Manual' : 'Cargar cuota manual'}
                            </button>
                        </div>

                        {/* Inline Form: Cargar Cuota Manual */}
                        {showManualForm && (
                            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/10 space-y-4 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                                        <Landmark size={14} />
                                        Nueva Cuota Manual por Cobrar
                                    </span>
                                    <span className="text-[10px] text-neutral-400">
                                        No inventa venta/vehículo ni altera capital
                                    </span>
                                </div>

                                {possibleDuplicates && possibleDuplicates.length > 0 && (
                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                                        <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                                            <AlertTriangle size={14} />
                                            Posibles cuotas duplicadas encontradas en cartera:
                                        </div>
                                        <div className="divide-y divide-amber-500/10 text-xs">
                                            {possibleDuplicates.map(dup => (
                                                <div key={dup._id} className="py-1.5 flex items-center justify-between">
                                                    <div>
                                                        <span className="font-bold text-white">{dup.customerName || dup.clientId?.fullName}</span>
                                                        <span className="text-neutral-400 ml-2">{formatMoney(dup.amount, dup.currency)}</span>
                                                        <span className="text-neutral-500 ml-2">Vence: {new Date(dup.dueDate).toLocaleDateString('es-AR')}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleAssignQuota(dup, Math.min(dup.amount, summary.remainingToCover > 0 ? summary.remainingToCover : dup.amount));
                                                            setShowManualForm(false);
                                                            setPossibleDuplicates(null);
                                                        }}
                                                        className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px]"
                                                    >
                                                        Usar esta cuota existente
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-2 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={(e) => handleManualSubmit(e, true)}
                                                className="text-[11px] text-neutral-400 hover:text-white underline font-bold"
                                            >
                                                Confirmar y crear de todos modos
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={(e) => handleManualSubmit(e, false)} className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                                                Cliente / Persona Deudora *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ej: Marcelo Rossi"
                                                value={manualForm.customerName}
                                                onChange={(e) => setManualForm({ ...manualForm, customerName: e.target.value })}
                                                className="w-full bg-black/40 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                                                Teléfono de Contacto
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ej: +54 9 11 ..."
                                                value={manualForm.customerPhone}
                                                onChange={(e) => setManualForm({ ...manualForm, customerPhone: e.target.value })}
                                                className="w-full bg-black/40 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                                                Concepto o Referencia *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ej: Cobro saldo trámite o pagaré"
                                                value={manualForm.concept}
                                                onChange={(e) => setManualForm({ ...manualForm, concept: e.target.value })}
                                                className="w-full bg-black/40 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                                                Importe ({currency}) *
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="any"
                                                required
                                                placeholder="Ej: 500000"
                                                value={manualForm.amount}
                                                onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                                                className="w-full bg-black/40 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                                                Fecha de Vencimiento *
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={manualForm.dueDate}
                                                onChange={(e) => setManualForm({ ...manualForm, dueDate: e.target.value })}
                                                className="w-full bg-black/40 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                                                N° de Cuota
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={manualForm.installmentNumber}
                                                onChange={(e) => setManualForm({ ...manualForm, installmentNumber: e.target.value })}
                                                className="w-full bg-black/40 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                                            Observaciones (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Detalles adicionales para trazabilidad..."
                                            value={manualForm.notes}
                                            onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                                            className="w-full bg-black/40 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowManualForm(false)}
                                            className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white text-xs font-bold transition"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSavingManual}
                                            className="px-4 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition shadow-lg shadow-purple-500/20 disabled:opacity-50"
                                        >
                                            {isSavingManual ? 'Guardando...' : 'Crear y Asignar a Pago'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Search Input for Cartera */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={15} />
                            <input
                                type="text"
                                placeholder="Buscar por cliente, deudor, operación o concepto..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/40 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 transition"
                            />
                        </div>

                        {/* Cartera Results */}
                        {isSearchingCartera ? (
                            <div className="p-6 text-center text-xs text-neutral-500">
                                Buscando cuotas en cartera...
                            </div>
                        ) : carteraResults.length === 0 ? (
                            <div className="p-6 text-center text-xs text-neutral-500 rounded-xl border border-neutral-800/60 bg-neutral-900/30">
                                No se encontraron cuotas pendientes en {currency} disponibles para comprometer.
                            </div>
                        ) : (
                            <div className="rounded-xl border border-neutral-800 overflow-hidden divide-y divide-neutral-800/60 bg-crm-surface max-h-72 overflow-y-auto custom-scrollbar">
                                {carteraResults.map(q => {
                                    const customAmt = customAssignAmounts[q._id] !== undefined
                                        ? customAssignAmounts[q._id]
                                        : (summary.remainingToCover > 0
                                            ? Math.min(q.availableToAssign, summary.remainingToCover)
                                            : q.availableToAssign);

                                    const isAlreadyAssigned = activeAssignments.some(a => a.installmentId?._id === q._id);
                                    const canAssign = q.availableToAssign > 0 && summary.remainingToCover > 0;

                                    return (
                                        <div key={q._id} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-neutral-800/20 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 text-xs font-bold">
                                                    #{q.installmentNumber}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-white">{q.clientName}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                                                            {q.operationRef}
                                                        </span>
                                                        {isAlreadyAssigned && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                                                                Ya asignada ({formatMoney(q.assignedToCurrentExpense, currency)})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-neutral-400 mt-0.5 flex flex-wrap items-center gap-3">
                                                        <span>{q.concept}</span>
                                                        <span>•</span>
                                                        <span>Vence: <strong className="text-neutral-300">{new Date(q.dueDate).toLocaleDateString('es-AR')}</strong></span>
                                                        <span>•</span>
                                                        <span>Total: {formatMoney(q.amount, currency)}</span>
                                                        {q.committedToOthers > 0 && (
                                                            <span className="text-amber-400">
                                                                • Comprometido en otros: {formatMoney(q.committedToOthers, currency)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                                                <div className="text-right">
                                                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Disponible</span>
                                                    <span className={`text-xs font-black ${q.availableToAssign > 0 ? 'text-green-400' : 'text-neutral-500'}`}>
                                                        {formatMoney(q.availableToAssign, currency)}
                                                    </span>
                                                </div>

                                                {canAssign && (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500 font-bold">$</span>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={Math.min(q.availableToAssign, summary.remainingToCover)}
                                                                step="any"
                                                                value={customAmt}
                                                                onChange={(e) => setCustomAssignAmounts({
                                                                    ...customAssignAmounts,
                                                                    [q._id]: e.target.value
                                                                })}
                                                                className="w-24 bg-black/40 border border-neutral-800 rounded-lg pl-5 pr-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAssignQuota(q, customAmt)}
                                                            className="px-2.5 py-1 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm shadow-purple-500/20"
                                                        >
                                                            Asignar
                                                        </button>
                                                    </div>
                                                )}

                                                {q.availableToAssign === 0 && (
                                                    <span className="text-[11px] text-neutral-500 italic">Sin saldo libre</span>
                                                )}
                                                {summary.remainingToCover === 0 && q.availableToAssign > 0 && (
                                                    <span className="text-[11px] text-green-400 font-bold">100% Cubierto</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex justify-between items-center shrink-0">
                    <div className="text-xs text-neutral-400">
                        {summary.remainingToCover === 0 ? (
                            <span className="text-green-400 font-bold flex items-center gap-1.5">
                                <CheckCircle2 size={15} /> Gasto totalmente cubierto por cuotas
                            </span>
                        ) : (
                            <span>
                                Falta cubrir: <strong className="text-white">{formatMoney(summary.remainingToCover, currency)}</strong>
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition"
                    >
                        Listo / Cerrar
                    </button>
                </div>

            </div>

            {/* Confirm Release Modal */}
            <ConfirmModal
                isOpen={!!confirmReleaseId}
                onClose={() => setConfirmReleaseId(null)}
                onConfirm={handleConfirmRelease}
                title="Quitar Asignación de Cuota"
                message="¿Estás seguro de quitar esta cuota asignada? El monto reservado quedará liberado inmediatamente para la cartera y otros gastos, conservando la trazabilidad en auditoría."
                confirmText="Liberar Cuota"
                isDestructive={false}
            />
        </div>
    );
}
