"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Receipt, Plus, FileText, CheckCircle, CreditCard, XCircle, Search } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

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

    // Modals
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [isPayOpen, setPayOpen] = useState(false);
    const [selectedSettlement, setSelectedSettlement] = useState(null);

    const loadSettlements = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/settlements', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar liquidaciones');
            const data = await res.json();
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

    const filteredSettlements = settlements.filter(s => 
        s.username.toLowerCase().includes(search.toLowerCase()) || 
        s.period.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <PermissionGuard permission={PERMISSIONS.LIQUIDACIONES_READ}>
            <div className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-6">
                <CrmPageHeader
                    title="Liquidaciones y Comisiones"
                    subtitle="Gestión de comisiones, premios y pagos a vendedores."
                    actions={
                        <PermissionGuard permission={PERMISSIONS.LIQUIDACIONES_WRITE}>
                            <button
                                onClick={() => setCreateOpen(true)}
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-crm-red-gradient px-4 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95"
                            >
                                <Plus size={16} />
                                Nueva Liquidación
                            </button>
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
                        placeholder="Buscar por vendedor o período..."
                        className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg pl-10 pr-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                    />
                </div>

                {loading ? (
                    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-crm-border bg-crm-surface">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-t-crm-red" />
                    </div>
                ) : (
                    <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-crm-fg">
                                <thead className="bg-crm-bg text-xs font-bold uppercase text-crm-fg-muted">
                                    <tr>
                                        <th className="px-4 py-4">Período</th>
                                        <th className="px-4 py-4">Vendedor</th>
                                        <th className="px-4 py-4">Ventas Inc.</th>
                                        <th className="px-4 py-4">Total Liquidado</th>
                                        <th className="px-4 py-4">Estado</th>
                                        <th className="px-4 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSettlements.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-crm-fg-muted">No hay liquidaciones registradas.</td>
                                        </tr>
                                    ) : (
                                        filteredSettlements.map(s => (
                                            <tr key={s._id} className="border-t border-crm-border hover:bg-crm-bg/50 transition-colors">
                                                <td className="px-4 py-3 font-bold">{s.period}</td>
                                                <td className="px-4 py-3 font-medium">{s.username}</td>
                                                <td className="px-4 py-3 text-crm-fg-muted">{s.includedSales.length} ventas</td>
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
                                                                <button onClick={() => {
                                                                    if(confirm('¿Seguro que deseas anular esta liquidación?')) handleStatusChange(s._id, 'anulada');
                                                                }} className="p-1.5 text-crm-red hover:bg-crm-red/10 rounded-lg transition-colors" title="Anular">
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
                )}
            </div>

            <CreateSettlementModal
                isOpen={isCreateOpen}
                onClose={() => setCreateOpen(false)}
                onSuccess={loadSettlements}
            />

            <PaySettlementModal
                isOpen={isPayOpen}
                onClose={() => { setPayOpen(false); setSelectedSettlement(null); }}
                settlement={selectedSettlement}
                onSuccess={loadSettlements}
            />
        </PermissionGuard>
    );
}

// === Modals ===

function CreateSettlementModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [period, setPeriod] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    const [pendingSales, setPendingSales] = useState([]);
    const [selectedSaleIds, setSelectedSaleIds] = useState(new Set());
    const [adjustments, setAdjustments] = useState([]);
    
    // New Adjustment State
    const [adjDesc, setAdjDesc] = useState('');
    const [adjAmount, setAdjAmount] = useState('');
    const [adjType, setAdjType] = useState('bono');

    useEffect(() => {
        if (!isOpen) {
            setUsername('');
            setPendingSales([]);
            setSelectedSaleIds(new Set());
            setAdjustments([]);
        }
    }, [isOpen]);

    const fetchPendingSales = async () => {
        if (!username) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/settlements/pending-sales/${username}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al buscar ventas');
            const data = await res.json();
            setPendingSales(data);
            setSelectedSaleIds(new Set(data.map(s => s._id))); // Select all by default
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleSale = (id) => {
        const newSet = new Set(selectedSaleIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedSaleIds(newSet);
    };

    const addAdjustment = () => {
        if (!adjDesc || !adjAmount) return;
        setAdjustments([...adjustments, { description: adjDesc, amount: Number(adjAmount), type: adjType }]);
        setAdjDesc('');
        setAdjAmount('');
    };

    const removeAdjustment = (index) => {
        setAdjustments(adjustments.filter((_, i) => i !== index));
    };

    const calculateTotals = () => {
        let commissions = 0;
        const included = pendingSales.filter(s => selectedSaleIds.has(s._id)).map(s => {
            // Very simple fallback calculation if commissionSettings isn't fully robust
            let amount = 0;
            if (s.commissionSettings) {
                if (s.commissionSettings.isManual) {
                    amount = s.commissionSettings.extraAmount || 0;
                } else {
                    amount = (s.salePrice || 0) * ((s.commissionSettings.sellerPct || 0) / 100);
                }
            }
            commissions += amount;
            return { saleId: s._id, amount };
        });

        const adjTotal = adjustments.reduce((acc, adj) => acc + (adj.type === 'bono' ? adj.amount : -adj.amount), 0);
        return { included, totalAmount: commissions + adjTotal };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { included, totalAmount } = calculateTotals();
        
        if (included.length === 0 && adjustments.length === 0) {
            return toast.error('Debe incluir ventas o ajustes para crear una liquidación');
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    period,
                    username,
                    includedSales: included,
                    adjustments,
                    totalAmount,
                    currency: 'USD' // Asumimos liquidación en USD por ahora, ajustable
                })
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
            }
            
            toast.success('Liquidación (Borrador) creada');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const { totalAmount } = calculateTotals();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-3xl rounded-2xl bg-crm-surface shadow-2xl my-8">
                <div className="flex items-center justify-between border-b border-crm-border px-6 py-4 sticky top-0 bg-crm-surface z-10 rounded-t-2xl">
                    <h3 className="text-lg font-black text-crm-fg">Nueva Liquidación</h3>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-crm-fg">✕</button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Header: User & Period */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">Período</label>
                            <input
                                type="month" required
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg"
                                value={period}
                                onChange={e => setPeriod(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">Vendedor (Username)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text" required placeholder="ej. tomasbrazao"
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                />
                                <button type="button" onClick={fetchPendingSales} className="px-3 rounded-xl bg-crm-bg border border-crm-border text-sm font-bold text-crm-fg hover:bg-crm-surface-raised">
                                    Buscar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Pending Sales */}
                    {pendingSales.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-crm-fg mb-3">Ventas Comisionables Encontradas</h4>
                            <div className="rounded-xl border border-crm-border bg-crm-bg overflow-hidden">
                                <table className="w-full text-left text-sm text-crm-fg">
                                    <thead className="bg-crm-surface text-xs font-bold uppercase text-crm-fg-muted">
                                        <tr>
                                            <th className="px-4 py-2 w-10">Inc.</th>
                                            <th className="px-4 py-2">Vehículo</th>
                                            <th className="px-4 py-2">Precio Venta</th>
                                            <th className="px-4 py-2">Comisión %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingSales.map(s => (
                                            <tr key={s._id} className="border-t border-crm-border">
                                                <td className="px-4 py-2">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedSaleIds.has(s._id)} 
                                                        onChange={() => toggleSale(s._id)} 
                                                    />
                                                </td>
                                                <td className="px-4 py-2 font-medium">{s.vehicleId?.brand} {s.vehicleId?.model} ({s.vehicleId?.year})</td>
                                                <td className="px-4 py-2">{formatMoney(s.salePrice, s.saleCurrency)}</td>
                                                <td className="px-4 py-2 text-crm-success font-bold">
                                                    {s.commissionSettings?.isManual ? 'Manual' : `${s.commissionSettings?.sellerPct || 0}%`}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Adjustments */}
                    <div>
                        <h4 className="text-sm font-bold text-crm-fg mb-3">Ajustes Manuales (Premios/Descuentos)</h4>
                        <div className="flex gap-2 mb-3">
                            <input 
                                type="text" placeholder="Descripción..." 
                                className="flex-1 rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg"
                                value={adjDesc} onChange={e => setAdjDesc(e.target.value)}
                            />
                            <input 
                                type="number" placeholder="Monto" 
                                className="w-24 rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg"
                                value={adjAmount} onChange={e => setAdjAmount(e.target.value)}
                            />
                            <select 
                                className="rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg"
                                value={adjType} onChange={e => setAdjType(e.target.value)}
                            >
                                <option value="bono">Bono (+)</option>
                                <option value="descuento">Descuento (-)</option>
                            </select>
                            <button type="button" onClick={addAdjustment} className="px-3 rounded-xl bg-crm-surface border border-crm-border font-bold">Add</button>
                        </div>
                        {adjustments.length > 0 && (
                            <ul className="space-y-2">
                                {adjustments.map((a, i) => (
                                    <li key={i} className="flex justify-between text-sm bg-crm-bg p-2 rounded-lg border border-crm-border">
                                        <span className="text-crm-fg">{a.description}</span>
                                        <div className="flex items-center gap-3">
                                            <span className={a.type === 'bono' ? 'text-crm-success' : 'text-crm-red'}>
                                                {a.type === 'bono' ? '+' : '-'}{a.amount}
                                            </span>
                                            <button type="button" onClick={() => removeAdjustment(i)} className="text-crm-fg-muted hover:text-crm-red">✕</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="border-t border-crm-border p-6 bg-crm-surface rounded-b-2xl flex items-center justify-between sticky bottom-0">
                    <div className="text-sm">
                        <span className="text-crm-fg-muted uppercase tracking-wider font-bold text-xs mr-2">Total Proyectado:</span>
                        <span className="text-xl font-black text-crm-success">{formatMoney(totalAmount, 'USD')}</span>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-crm-fg-muted hover:text-crm-fg">Cancelar</button>
                        <button disabled={loading || !username} onClick={handleSubmit} className="rounded-xl bg-crm-red-gradient px-6 py-2 text-sm font-black text-white shadow-crm-shadow-red disabled:opacity-50">
                            Generar Borrador
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PaySettlementModal({ isOpen, onClose, settlement, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [accountId, setAccountId] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Cargar cuentas para poder pagar
            const token = localStorage.getItem('token');
            fetch('/api/admin/tesoreria/dashboard', { headers: { 'Authorization': `Bearer ${token}` }})
                .then(res => res.json())
                .then(data => {
                    // Filtrar solo las que coinciden con la moneda de la liquidación
                    setAccounts((data.accounts || []).filter(a => a.currency === settlement?.currency));
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
            toast.success('Liquidación pagada con éxito. Se ha generado un movimiento en caja.');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-crm-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-crm-border px-6 py-4">
                    <h3 className="text-lg font-black text-crm-fg">Pagar Liquidación</h3>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-crm-fg">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-crm-bg p-4 rounded-xl border border-crm-border text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">A Pagar a {settlement.username}</p>
                        <p className="text-3xl font-black text-crm-success">{formatMoney(settlement.totalAmount, settlement.currency)}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">Caja / Origen de Fondos</label>
                        <select
                            required
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg"
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
                        <button disabled={loading || !accountId} type="submit" className="rounded-xl bg-crm-red-gradient px-6 py-2 text-sm font-black text-white shadow-crm-shadow-red disabled:opacity-50">
                            Confirmar Pago
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
