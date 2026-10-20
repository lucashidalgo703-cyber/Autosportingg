import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Calendar, Filter, RefreshCw, FileText } from 'lucide-react';

export default function AccountMovementsModal({ isOpen, onClose, account }) {
    const [movements, setMovements] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('todos');
    const [period, setPeriod] = useState('todos');

    const fetchMovements = useCallback(async () => {
        if (!account?._id) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let query = `type=${filterType}`;

            if (period === 'mes_actual') {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                query += `&from=${firstDay}&to=${lastDay}`;
            } else if (period === 'ultimos_30') {
                const now = new Date();
                const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                query += `&from=${past}`;
            }

            const res = await fetch(`/api/admin/accounts/${account._id}/movements?${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setMovements(data.movements || []);
                setSummary(data.summary || null);
            }
        } catch (err) {
            console.error('Error fetching account movements:', err);
        } finally {
            setLoading(false);
        }
    }, [account?._id, filterType, period]);

    useEffect(() => {
        if (isOpen && account?._id) {
            fetchMovements();
        }
    }, [isOpen, account?._id, fetchMovements]);

    if (!isOpen || !account) return null;

    const curr = account.currency || 'ARS';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl border border-crm-border bg-crm-surface shadow-2xl overflow-hidden">
                {/* Cabecera */}
                <div className="p-5 border-b border-crm-border bg-crm-surface/90 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-black text-white">{account.name}</h3>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-crm-bg text-crm-fg-muted font-bold border border-crm-border">
                                {account.type || 'Fondo'} · {curr}
                            </span>
                        </div>
                        <p className="text-xs text-crm-fg-muted mt-1">
                            Saldo actual en sistema:{' '}
                            <span className="font-bold text-white">
                                {curr} {Number(account.balance || 0).toLocaleString('es-AR')}
                            </span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-crm-fg-muted hover:text-white rounded-lg hover:bg-crm-surface-raised transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Métricas del período */}
                {summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-crm-bg/40 border-b border-crm-border text-xs">
                        <div className="p-3 bg-crm-bg rounded-xl border border-crm-border">
                            <span className="text-[10px] uppercase font-bold text-crm-fg-muted block mb-1">Total Ingresos</span>
                            <span className="text-base font-black text-emerald-400">
                                +{curr} {Number(summary.totalIngresos || 0).toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div className="p-3 bg-crm-bg rounded-xl border border-crm-border">
                            <span className="text-[10px] uppercase font-bold text-crm-fg-muted block mb-1">Egresos Operativos</span>
                            <span className="text-base font-black text-rose-400">
                                -{curr} {Number(summary.totalEgresosOperativos || 0).toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div className="p-3 bg-crm-bg rounded-xl border border-crm-border">
                            <span className="text-[10px] uppercase font-bold text-crm-fg-muted block mb-1">Compra Stock</span>
                            <span className="text-base font-black text-purple-400">
                                -{curr} {Number(summary.totalEgresosStock || 0).toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div className="p-3 bg-crm-bg rounded-xl border border-crm-border">
                            <span className="text-[10px] uppercase font-bold text-crm-fg-muted block mb-1">Flujo Neto Período</span>
                            <span className={`text-base font-black ${summary.netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {summary.netFlow >= 0 ? '+' : ''}{curr} {Number(summary.netFlow || 0).toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>
                )}

                {/* Filtros */}
                <div className="p-3 px-5 border-b border-crm-border flex flex-wrap items-center justify-between gap-3 bg-crm-surface-raised/40">
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-crm-fg-muted" />
                        <span className="text-xs font-bold text-white">Tipo:</span>
                        <div className="flex gap-1">
                            {['todos', 'ingreso', 'egreso'].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setFilterType(t)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                                        filterType === t
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-crm-bg text-crm-fg-muted hover:text-white'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-crm-fg-muted" />
                        <span className="text-xs font-bold text-white">Período:</span>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="bg-crm-bg border border-crm-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                        >
                            <option value="todos">Todos los tiempos</option>
                            <option value="mes_actual">Mes actual</option>
                            <option value="ultimos_30">Últimos 30 días</option>
                        </select>
                    </div>
                </div>

                {/* Tabla de movimientos */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-crm-fg-muted gap-2">
                            <RefreshCw size={20} className="animate-spin text-purple-400" />
                            <span className="text-xs">Cargando historial de la cuenta...</span>
                        </div>
                    ) : movements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-crm-fg-muted gap-2">
                            <FileText size={28} className="text-crm-fg-muted/60" />
                            <span className="text-xs font-semibold">No hay movimientos registrados en este período.</span>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-crm-border text-crm-fg-muted text-[10px] uppercase">
                                    <th className="py-2.5 px-3">Fecha</th>
                                    <th className="py-2.5 px-3">Concepto / Referencia</th>
                                    <th className="py-2.5 px-3">Categoría</th>
                                    <th className="py-2.5 px-3">Medio de Pago</th>
                                    <th className="py-2.5 px-3 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-crm-border/60">
                                {movements.map(m => {
                                    const isIngreso = (m.type || '').toLowerCase() === 'ingreso';
                                    const isStock = (m.category || '').toLowerCase().includes('compra_vehiculo');
                                    return (
                                        <tr key={m._id} className="hover:bg-crm-surface-raised/60 transition-colors">
                                            <td className="py-3 px-3 text-crm-fg-muted whitespace-nowrap">
                                                {new Date(m.date || m.createdAt).toLocaleDateString('es-AR')}
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="font-bold text-white flex items-center gap-1.5">
                                                    {isIngreso ? (
                                                        <ArrowDownRight size={14} className="text-emerald-400 shrink-0" />
                                                    ) : (
                                                        <ArrowUpRight size={14} className="text-rose-400 shrink-0" />
                                                    )}
                                                    <span>{m.concept || m.description || 'Movimiento de cuenta'}</span>
                                                </div>
                                                {m.reference && (
                                                    <span className="text-[10px] text-crm-fg-muted block mt-0.5">
                                                        Ref: {m.reference}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                    isStock
                                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                        : 'bg-crm-bg text-crm-fg-muted'
                                                }`}>
                                                    {isStock ? 'Compra Stock' : (m.category || 'General')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-crm-fg-muted whitespace-nowrap">
                                                {m.paymentMethod || '—'}
                                            </td>
                                            <td className="py-3 px-3 text-right whitespace-nowrap font-black">
                                                <span className={isIngreso ? 'text-emerald-400' : 'text-rose-400'}>
                                                    {isIngreso ? '+' : '-'}{curr} {Number(m.amount || 0).toLocaleString('es-AR')}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pie */}
                <div className="p-4 border-t border-crm-border bg-crm-surface/90 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-crm-surface-raised hover:bg-crm-surface-raised/80 text-white font-bold text-xs transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
