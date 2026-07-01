"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Receipt, Plus, FileText, CheckCircle, CreditCard, XCircle, Search, RefreshCcw, Trash2 } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';

const formatMoney = (amount, currency = 'ARS') => {
    return `${currency} ${Number(amount || 0).toLocaleString('es-AR')}`;
};

const getStatusBadge = (status) => {
    const badges = {
        'borrador': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        'revisada': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'aprobada': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        'pagada': 'bg-crm-success/10 text-crm-success border-crm-success/20',
        'anulada': 'bg-crm-red/10 text-crm-red border-crm-red/20',
    };
    return badges[status] || badges['borrador'];
};

export default function LiquidacionesPage() {
    const { user } = useAuth();
    const [settlements, setSettlements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    // Modals
    const [isCreateOpen, setCreateOpen] = useState(false); // Deprecated but kept for compatibility
    const [isPayOpen, setPayOpen] = useState(false);
    const [isManualTransferOpen, setManualTransferOpen] = useState(false);
    const [isCleanDuplicatesOpen, setCleanDuplicatesOpen] = useState(false);

    const [selectedSettlement, setSelectedSettlement] = useState(null);
    const [activeTab, setActiveTab] = useState('liquidaciones'); // transferencias | liquidaciones | resumen
    const [filterState, setFilterState] = useState('todos'); // todos | finalizados | proceso
    const [confirmCancelModal, setConfirmCancelModal] = useState({ isOpen: false, id: null });

    const loadSettlements = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/settlements', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar liquidaciones');
            const data = await res.json();
            // Data includes ventas, gestoria, transferencia_manual
            setSettlements(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettlements();
    }, []);

    const handleSyncGestoria = async () => {
        setIsSyncing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/settlements/sync-gestoria', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al sincronizar expedientes');
            const data = await res.json();
            
            if (data.count === 0) {
                toast.success('No hay expedientes nuevos para liquidar');
            } else {
                toast.success(`Sincronización completada: ${data.count} liquidaciones nuevas`);
                loadSettlements();
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/settlements/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
            }
            toast.success(`Liquidación marcada como ${newStatus}`);
            loadSettlements();
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Derived states
    const filteredSettlements = settlements.filter(s => {
        const matchesSearch = (s.username?.toLowerCase() || s.beneficiaryName?.toLowerCase() || '').includes(search.toLowerCase()) || 
                              s.period.toLowerCase().includes(search.toLowerCase());
        
        const matchesState = filterState === 'todos' ? true : 
                             filterState === 'finalizados' ? ['pagada', 'anulada'].includes(s.status) :
                             !['pagada', 'anulada'].includes(s.status); // proceso
        
        let matchesTab = true;
        if (activeTab === 'transferencias') matchesTab = s.type === 'transferencia_manual';
        if (activeTab === 'liquidaciones') matchesTab = s.type === 'gestoria' || s.type === 'ventas' || !s.type;
        
        return matchesSearch && matchesState && matchesTab;
    });

    const renderSummary = () => {
        const totalVentas = settlements.filter(s => (!s.type || s.type === 'ventas') && s.status === 'pagada').reduce((acc, s) => acc + s.totalAmount, 0);
        const totalGestoria = settlements.filter(s => s.type === 'gestoria' && s.status === 'pagada').reduce((acc, s) => acc + s.totalAmount, 0);
        const totalManuales = settlements.filter(s => s.type === 'transferencia_manual' && s.status === 'pagada').reduce((acc, s) => acc + s.totalAmount, 0);
        
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-crm-surface border border-crm-border p-6 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-2">Total Pagado a Vendedores</p>
                    <p className="text-3xl font-black text-crm-fg">{formatMoney(totalVentas, 'USD')}</p>
                </div>
                <div className="bg-crm-surface border border-crm-border p-6 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-2">Total Pagado a Gestoría</p>
                    <p className="text-3xl font-black text-crm-success">{formatMoney(totalGestoria, 'USD')}</p>
                </div>
                <div className="bg-crm-surface border border-crm-border p-6 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-2">Transferencias Manuales</p>
                    <p className="text-3xl font-black text-indigo-400">{formatMoney(totalManuales, 'USD')}</p>
                </div>
            </div>
        );
    };

    return (
        <PermissionGuard permission={PERMISSIONS.LIQUIDACIONES_READ}>
            <div className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-6">
                <CrmPageHeader
                    title="Liquidaciones de gestoría"
                    subtitle="Gestión de comisiones, pagos a gestores y transferencias manuales."
                    actions={
                        <PermissionGuard permission={PERMISSIONS.LIQUIDACIONES_WRITE}>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    disabled={isSyncing}
                                    onClick={handleSyncGestoria}
                                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-crm-border bg-crm-surface px-4 text-sm font-bold text-crm-fg transition hover:bg-crm-surface-raised disabled:opacity-50"
                                >
                                    <RefreshCcw size={16} className={isSyncing ? 'animate-spin' : ''} />
                                    Sync con expedientes
                                </button>
                                <button
                                    onClick={() => setCleanDuplicatesOpen(true)}
                                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-crm-border bg-crm-surface px-4 text-sm font-bold text-crm-fg transition hover:bg-crm-surface-raised"
                                >
                                    <XCircle size={16} />
                                    Limpiar duplicadas
                                </button>
                                <button
                                    onClick={() => setManualTransferOpen(true)}
                                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-crm-red-gradient px-4 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95"
                                >
                                    <Plus size={16} />
                                    Nueva transferencia
                                </button>
                            </div>
                        </PermissionGuard>
                    }
                />

                {error && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-crm-warning/20 bg-crm-warning/10 p-4 text-sm font-bold text-crm-warning">
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}

                <div className="mb-6 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" size={16} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por beneficiario o período..."
                        className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg pl-10 pr-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                    />
                </div>

                {loading ? (
                    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-crm-border bg-crm-surface">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-t-crm-red" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* VISTAS SUPERIORES (TABS) */}
                        <div className="flex border-b border-crm-border">
                            {[
                                { id: 'transferencias', label: 'Transferencias' },
                                { id: 'liquidaciones', label: 'Liquidación mensual' },
                                { id: 'resumen', label: 'Resumen agencia' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-3 text-sm font-black transition-colors ${activeTab === tab.id ? 'border-b-2 border-crm-red text-crm-red' : 'text-crm-fg-muted hover:text-crm-fg bg-transparent border-0 appearance-none'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'resumen' ? renderSummary() : (
                            <>
                                {/* ESTADOS / FILTROS */}
                                <div className="flex gap-2 mb-4">
                                    {[
                                        { id: 'todos', label: 'Todos' },
                                        { id: 'finalizados', label: 'Finalizados' },
                                        { id: 'proceso', label: 'En proceso' }
                                    ].map(state => (
                                        <button
                                            key={state.id}
                                            onClick={() => setFilterState(state.id)}
                                            className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors ${filterState === state.id ? 'bg-crm-bg border-crm-red text-crm-red' : 'bg-crm-surface border-crm-border text-crm-fg-muted hover:text-crm-fg'}`}
                                        >
                                            {state.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-crm-fg">
                                            <thead className="bg-crm-bg text-xs font-bold uppercase text-crm-fg-muted">
                                                <tr>
                                                    <th className="px-4 py-4">Período</th>
                                                    <th className="px-4 py-4">Tipo / Beneficiario</th>
                                                    <th className="px-4 py-4">Ítems Inc.</th>
                                                    <th className="px-4 py-4">Total Liquidado</th>
                                                    <th className="px-4 py-4">Estado</th>
                                                    <th className="px-4 py-4 text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredSettlements.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="p-12 text-center text-crm-fg-muted">
                                                            <Receipt size={48} className="mx-auto text-crm-border mb-4 opacity-50" />
                                                            <p className="text-sm font-bold">Sin registros de {activeTab}</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredSettlements.map(s => (
                                                        <tr key={s._id} className="border-t border-crm-border hover:bg-crm-bg/50 transition-colors">
                                                            <td className="px-4 py-3 font-bold">{s.period}</td>
                                                            <td className="px-4 py-3">
                                                                <div className="font-bold text-crm-fg">{s.beneficiaryName || s.username || 'Sin nombre'}</div>
                                                                <div className="text-[10px] uppercase text-crm-fg-subtle">{s.type || 'ventas'}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-crm-fg-muted">
                                                                {s.type === 'gestoria' ? `${s.includedGestorias?.length || 0} exp.` :
                                                                 s.type === 'transferencia_manual' ? 'Manual' : 
                                                                 `${s.includedSales?.length || 0} ventas`}
                                                            </td>
                                                            <td className="px-4 py-3 font-black text-crm-success">{formatMoney(s.totalAmount, s.currency)}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${getStatusBadge(s.status)}`}>
                                                                    {s.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <PermissionGuard permission={PERMISSIONS.LIQUIDACIONES_WRITE}>
                                                                    <div className="flex justify-end gap-2">
                                                                        {s.status === 'borrador' && (
                                                                            <button onClick={() => handleStatusChange(s._id, 'revisada')} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors" title="Marcar como Revisada">
                                                                                <FileText size={16} />
                                                                            </button>
                                                                        )}
                                                                        {s.status === 'revisada' && (
                                                                            <button onClick={() => handleStatusChange(s._id, 'aprobada')} className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors" title="Aprobar">
                                                                                <CheckCircle size={16} />
                                                                            </button>
                                                                        )}
                                                                        {s.status === 'aprobada' && (
                                                                            <button onClick={() => { setSelectedSettlement(s); setPayOpen(true); }} className="p-1.5 text-crm-success hover:bg-crm-success/10 rounded-lg transition-colors" title="Pagar Liquidación">
                                                                                <CreditCard size={16} />
                                                                            </button>
                                                                        )}
                                                                        {s.status !== 'anulada' && s.status !== 'pagada' && (
                                                                            <button onClick={() => setConfirmCancelModal({ isOpen: true, id: s._id })} className="p-1.5 text-crm-red hover:bg-crm-red/10 rounded-lg transition-colors" title="Anular">
                                                                                <XCircle size={16} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </PermissionGuard>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <ManualTransferModal
                isOpen={isManualTransferOpen}
                onClose={() => setManualTransferOpen(false)}
                onSuccess={loadSettlements}
            />

            <CleanDuplicatesModal
                isOpen={isCleanDuplicatesOpen}
                onClose={() => setCleanDuplicatesOpen(false)}
                onSuccess={loadSettlements}
            />

            <PaySettlementModal
                isOpen={isPayOpen}
                onClose={() => { setPayOpen(false); setSelectedSettlement(null); }}
                settlement={selectedSettlement}
                onSuccess={loadSettlements}
            />

            <ConfirmModal
                isOpen={confirmCancelModal.isOpen}
                onClose={() => setConfirmCancelModal({ isOpen: false, id: null })}
                onConfirm={() => {
                    if (confirmCancelModal.id) {
                        handleStatusChange(confirmCancelModal.id, 'anulada');
                    }
                }}
                title="Anular Liquidación"
                message="¿Seguro que deseas anular esta liquidación? Esta acción marcará la liquidación como anulada."
                confirmText="Anular"
                isDestructive={true}
            />
        </PermissionGuard>
    );
}

// === Modals ===

function CleanDuplicatesModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [duplicates, setDuplicates] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isCleaning, setIsCleaning] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchPreview();
        } else {
            setDuplicates([]);
            setSelectedIds(new Set());
        }
    }, [isOpen]);

    const fetchPreview = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/settlements/clean-duplicates/preview', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error buscando duplicados');
            const data = await res.json();
            setDuplicates(data.duplicates || []);
            // Autoselect all duplicates for easy cleanup
            setSelectedIds(new Set((data.duplicates || []).map(d => d._id)));
        } catch (err) {
            toast.error(err.message);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleClean = async () => {
        if (selectedIds.size === 0) return toast.error('No hay liquidaciones seleccionadas');
        setIsCleaning(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/settlements/clean-duplicates/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ids: Array.from(selectedIds) })
            });
            if (!res.ok) throw new Error('Error al anular duplicados');
            const data = await res.json();
            toast.success(data.message);
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsCleaning(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-crm-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between border-b border-crm-border px-6 py-4">
                    <h3 className="text-lg font-black text-crm-fg">Limpiar Duplicadas (Preview)</h3>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-crm-fg">✕</button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center p-8"><RefreshCcw className="animate-spin text-crm-red" /></div>
                    ) : duplicates.length === 0 ? (
                        <div className="text-center p-8">
                            <CheckCircle size={48} className="mx-auto text-crm-success/50 mb-4" />
                            <p className="text-sm font-bold text-crm-fg">¡Todo en orden!</p>
                            <p className="text-xs text-crm-fg-muted">No se encontraron liquidaciones solapadas en estado activo.</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-crm-fg-muted mb-4">
                                Se encontraron {duplicates.length} liquidaciones que solapan en periodo, tipo y beneficiario. Selecciona las que deseas marcar como <b>anuladas</b>.
                            </p>
                            <div className="border border-crm-border rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm text-crm-fg">
                                    <thead className="bg-crm-bg text-xs font-bold uppercase text-crm-fg-muted border-b border-crm-border">
                                        <tr>
                                            <th className="px-4 py-2 w-10">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIds.size === duplicates.length && duplicates.length > 0}
                                                    onChange={(e) => setSelectedIds(e.target.checked ? new Set(duplicates.map(d => d._id)) : new Set())}
                                                />
                                            </th>
                                            <th className="px-4 py-2">Beneficiario</th>
                                            <th className="px-4 py-2">Periodo</th>
                                            <th className="px-4 py-2">Tipo</th>
                                            <th className="px-4 py-2">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-crm-border">
                                        {duplicates.map(d => (
                                            <tr key={d._id} className="bg-crm-surface hover:bg-crm-bg/50">
                                                <td className="px-4 py-2">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedIds.has(d._id)}
                                                        onChange={() => {
                                                            const newSet = new Set(selectedIds);
                                                            if (newSet.has(d._id)) newSet.delete(d._id);
                                                            else newSet.add(d._id);
                                                            setSelectedIds(newSet);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-2 font-bold">{d.beneficiaryName || d.username}</td>
                                                <td className="px-4 py-2">{d.period}</td>
                                                <td className="px-4 py-2 text-xs uppercase">{d.type || 'ventas'}</td>
                                                <td className="px-4 py-2 font-medium">{formatMoney(d.totalAmount, d.currency)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-crm-border p-4 bg-crm-bg flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-crm-fg-muted hover:text-crm-fg">Cerrar</button>
                    {duplicates.length > 0 && (
                        <button disabled={isCleaning || selectedIds.size === 0} onClick={handleClean} className="rounded-xl bg-crm-red px-6 py-2 text-sm font-black text-white shadow-sm disabled:opacity-50 flex items-center gap-2">
                            {isCleaning ? <RefreshCcw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Anular Seleccionadas
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ManualTransferModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [beneficiaryName, setBeneficiaryName] = useState('');
    const [period, setPeriod] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('ARS');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setBeneficiaryName('');
            setAmount('');
            setNotes('');
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!beneficiaryName || !amount) return toast.error('Beneficiario y monto son obligatorios');

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Crearemos un Settlement "manual", en estado borrador, para que se audite/pague.
            const payload = {
                period,
                type: 'transferencia_manual',
                beneficiaryName,
                totalAmount: Number(amount),
                currency,
                adjustments: [{
                    description: notes || 'Transferencia manual directa',
                    amount: Number(amount),
                    type: 'bono'
                }]
            };

            const res = await fetch('/api/admin/settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
            }
            
            toast.success('Transferencia manual (Borrador) creada exitosamente');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-crm-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-crm-border px-6 py-4 bg-crm-bg rounded-t-2xl">
                    <h3 className="text-lg font-black text-crm-fg">Nueva Transferencia Manual</h3>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-crm-fg">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm font-medium text-crm-fg-muted mb-4">
                        Crea una liquidación independiente para proveedores o retiros directos, auditada y pendiente de pago.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-crm-fg-muted mb-1">Período</label>
                            <input
                                type="month" required
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg outline-none focus:border-crm-red"
                                value={period} onChange={e => setPeriod(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-crm-fg-muted mb-1">Moneda</label>
                            <select 
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg outline-none focus:border-crm-red"
                                value={currency} onChange={e => setCurrency(e.target.value)}
                            >
                                <option value="ARS">ARS - Pesos</option>
                                <option value="USD">USD - Dólares</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-crm-fg-muted mb-1">Nombre Beneficiario</label>
                        <input
                            type="text" required placeholder="Ej. Gestoría López"
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg outline-none focus:border-crm-red"
                            value={beneficiaryName} onChange={e => setBeneficiaryName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-crm-fg-muted mb-1">Monto a Transferir</label>
                        <input
                            type="number" required placeholder="0.00" min="1" step="0.01"
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg outline-none focus:border-crm-red font-black"
                            value={amount} onChange={e => setAmount(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-crm-fg-muted mb-1">Concepto / Referencia</label>
                        <input
                            type="text" placeholder="Opcional. Ej. Trámites mes agosto..."
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg outline-none focus:border-crm-red"
                            value={notes} onChange={e => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-crm-border mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-crm-fg-muted hover:text-crm-fg">Cancelar</button>
                        <button disabled={loading} type="submit" className="rounded-xl bg-crm-red-gradient px-6 py-2 text-sm font-black text-white shadow-sm disabled:opacity-50">
                            Crear Borrador
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function PaySettlementModal({ isOpen, onClose, settlement, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [accountId, setAccountId] = useState('');

    useEffect(() => {
        if (isOpen && settlement) {
            const token = localStorage.getItem('token');
            fetch('/api/admin/tesoreria/dashboard', { headers: { 'Authorization': `Bearer ${token}` }})
                .then(res => res.json())
                .then(data => {
                    setAccounts((data.accounts || []).filter(a => a.currency === settlement.currency));
                })
                .catch(err => toast.error('Error cargando cajas'));
        }
    }, [isOpen, settlement]);

    if (!isOpen || !settlement) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/settlements/${settlement._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: 'pagada', accountId })
            });
            if (!res.ok) throw new Error('Error al registrar el pago');
            toast.success('Liquidación pagada con éxito. Egreso registrado en caja.');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-crm-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-crm-border px-6 py-4 bg-crm-bg rounded-t-2xl">
                    <h3 className="text-lg font-black text-crm-fg">Pagar Liquidación</h3>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-crm-fg">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-crm-bg p-4 rounded-xl border border-crm-border text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            A Pagar a {settlement.beneficiaryName || settlement.username}
                        </p>
                        <p className="text-3xl font-black text-crm-success">{formatMoney(settlement.totalAmount, settlement.currency)}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">Caja Origen de Fondos</label>
                        <select
                            required
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg outline-none focus:border-crm-red"
                            value={accountId}
                            onChange={e => setAccountId(e.target.value)}
                        >
                            <option value="">Seleccionar caja origen...</option>
                            {accounts.map(a => <option key={a._id} value={a._id}>{a.name} ({formatMoney(a.balance, a.currency)})</option>)}
                        </select>
                        {accounts.length === 0 && <p className="text-xs text-crm-warning mt-1">No hay cajas disponibles en {settlement.currency}</p>}
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-crm-border mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-crm-fg-muted hover:text-crm-fg">Cancelar</button>
                        <button disabled={loading || !accountId} type="submit" className="rounded-xl bg-crm-red-gradient px-6 py-2 text-sm font-black text-white shadow-sm disabled:opacity-50">
                            Confirmar Pago
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
