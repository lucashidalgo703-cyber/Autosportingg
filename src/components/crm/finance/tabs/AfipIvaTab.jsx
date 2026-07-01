import React, { useState, useEffect } from 'react';
import { ShieldAlert, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { parseResponseSafe } from '../../../../utils/apiHelper';
import CrmBadge from '../../ui/CrmBadge';

export default function AfipIvaTab() {
    const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
    const [currency, setCurrency] = useState('ARS');
    const [summary, setSummary] = useState(null);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(false);

    // Edit state
    const [editingTxId, setEditingTxId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [sumRes, movRes] = await Promise.all([
                fetch(`/api/admin/finance/tax-summary?period=${period}&currency=${currency}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`/api/admin/finance/tax-movements?period=${period}&currency=${currency}`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setSummary(await parseResponseSafe(sumRes));
            setMovements(await parseResponseSafe(movRes));
        } catch (error) {
            toast.error('Error cargando datos fiscales: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period, currency]);

    const handleEditStart = (tx) => {
        setEditingTxId(tx._id);
        setEditForm({
            fiscalCategory: tx.fiscalCategory || 'Sin clasificar',
            ivaRate: tx.ivaRate || 0,
            invoiceNumber: tx.invoiceNumber || '',
            taxNotes: tx.taxNotes || ''
        });
    };

    const handleEditSave = async (id) => {
        // UI validation
        if (!categories.includes(editForm.fiscalCategory)) {
            return toast.error('Categoría fiscal inválida');
        }
        const parsedRate = Number(editForm.ivaRate);
        if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
            return toast.error('Tasa de IVA inválida. Debe ser un número entre 0 y 100.');
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/transactions/${id}/fiscal`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fiscalCategory: editForm.fiscalCategory,
                    ivaRate: parsedRate,
                    invoiceNumber: editForm.invoiceNumber?.toString().trim() || '',
                    taxNotes: editForm.taxNotes?.toString().trim() || ''
                })
            });
            await parseResponseSafe(res);
            toast.success('Clasificación guardada');
            setEditingTxId(null);
            fetchData();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const formatMoney = (amount) => {
        return `${currency} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    const categories = ['A', 'B', 'C', 'Exenta', 'Sin clasificar'];

    const totalIvaCobrado = categories.reduce((sum, cat) => sum + (summary?.[cat]?.ivaCobrado || 0), 0);
    const totalIvaPagado = categories.reduce((sum, cat) => sum + (summary?.[cat]?.ivaPagado || 0), 0);
    const saldoIva = totalIvaCobrado - totalIvaPagado;

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                <p className="text-sm font-bold text-crm-fg-muted">AFIP / IVA: categorización fiscal por movimiento y cálculo estimativo de saldos (uso interno).</p>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                        <label className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">PERÍODO FISCAL:</label>
                        <input
                            type="month"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="h-9 rounded-lg border border-crm-border bg-crm-bg px-3 text-xs font-bold text-crm-fg outline-none transition focus:border-crm-red"
                        />
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="h-9 rounded-lg border border-crm-border bg-crm-bg px-3 text-xs font-bold text-crm-fg outline-none transition focus:border-crm-red"
                        >
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">IVA COBRADO (DÉBITO)</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(totalIvaCobrado)}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">IVA PAGADO (CRÉDITO)</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(totalIvaPagado)}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">SALDO IVA (ESTIMADO)</h3>
                    <p className={`mt-2 text-xl font-black ${saldoIva > 0 ? 'text-crm-red' : saldoIva < 0 ? 'text-green-500' : 'text-crm-fg'}`}>
                        {formatMoney(saldoIva)}
                    </p>
                </div>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">CATEGORÍA</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-center">MOVS</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-right">INGRESOS</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-right">EGRESOS</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-right">IVA COBRADO</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-right">IVA PAGADO</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border text-sm">
                            {summary ? categories.map(cat => {
                                const data = summary[cat] || { movs: 0, ingresos: 0, egresos: 0, ivaCobrado: 0, ivaPagado: 0 };
                                return (
                                    <tr key={cat}>
                                        <td className="px-4 py-3 font-medium text-crm-fg">
                                            {cat === 'Sin clasificar' ? '⚠ Sin clasificar' : cat}
                                        </td>
                                        <td className="px-4 py-3 text-center text-crm-fg-muted">{data.movs}</td>
                                        <td className="px-4 py-3 text-right text-crm-fg-muted">{formatMoney(data.ingresos)}</td>
                                        <td className="px-4 py-3 text-right text-crm-fg-muted">{formatMoney(data.egresos)}</td>
                                        <td className="px-4 py-3 text-right text-crm-fg-muted">{formatMoney(data.ivaCobrado)}</td>
                                        <td className="px-4 py-3 text-right text-crm-fg-muted">{formatMoney(data.ivaPagado)}</td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan={6} className="p-4 text-center text-sm text-crm-fg-muted">Cargando resumen...</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <div>
                <h3 className="text-base font-black text-crm-fg mb-4">Clasificar movimientos del período {period}</h3>

                {loading ? (
                    <div className="text-center p-8 text-crm-fg-muted">Cargando...</div>
                ) : movements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-crm-border bg-crm-surface py-12 px-4 text-center">
                        <div className="h-12 w-12 rounded-full bg-crm-bg flex items-center justify-center mb-2">
                            <ShieldAlert className="text-crm-fg-muted" size={24} />
                        </div>
                        <h4 className="font-bold text-crm-fg">Sin movimientos en este período</h4>
                        <p className="text-sm text-crm-fg-muted max-w-sm">No hay movimientos financieros cargados en el mes seleccionado para clasificar fiscalmente.</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead className="bg-crm-surface-raised border-b border-crm-border">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Fecha</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Movimiento</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-right">Monto</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Categoría</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Tasa IVA %</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Factura / Notas</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-crm-border text-sm">
                                    {movements.map(tx => {
                                        const isEditing = editingTxId === tx._id;

                                        return (
                                            <tr key={tx._id} className="hover:bg-crm-surface-raised transition-colors">
                                                <td className="px-4 py-3 text-crm-fg">
                                                    {new Date(tx.date).toLocaleDateString('es-AR')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-bold text-crm-fg truncate max-w-[200px]" title={tx.description}>{tx.description}</p>
                                                    <p className="text-xs text-crm-fg-muted">{tx.accountId?.name || '---'}</p>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold">
                                                    <span className={tx.type === 'Ingreso' ? 'text-green-500' : 'text-crm-red'}>
                                                        {tx.type === 'Ingreso' ? '+' : '-'}{formatMoney(tx.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <select
                                                            value={editForm.fiscalCategory}
                                                            onChange={e => setEditForm({...editForm, fiscalCategory: e.target.value})}
                                                            className="w-full rounded border border-crm-border bg-crm-bg px-2 py-1 text-xs focus:outline-none"
                                                        >
                                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                    ) : (
                                                        <CrmBadge variant={tx.fiscalCategory === 'Sin clasificar' || !tx.fiscalCategory ? 'warning' : 'info'}>
                                                            {tx.fiscalCategory || 'Sin clasificar'}
                                                        </CrmBadge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={editForm.ivaRate}
                                                            onChange={e => setEditForm({...editForm, ivaRate: e.target.value})}
                                                            className="w-20 rounded border border-crm-border bg-crm-bg px-2 py-1 text-xs focus:outline-none"
                                                        />
                                                    ) : (
                                                        <span className="text-crm-fg">{tx.ivaRate || 0}%</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <div className="flex flex-col gap-1">
                                                            <input
                                                                type="text"
                                                                placeholder="Nº Factura"
                                                                value={editForm.invoiceNumber}
                                                                onChange={e => setEditForm({...editForm, invoiceNumber: e.target.value})}
                                                                className="w-full rounded border border-crm-border bg-crm-bg px-2 py-1 text-xs focus:outline-none"
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Notas"
                                                                value={editForm.taxNotes}
                                                                onChange={e => setEditForm({...editForm, taxNotes: e.target.value})}
                                                                className="w-full rounded border border-crm-border bg-crm-bg px-2 py-1 text-xs focus:outline-none"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col">
                                                            <span className="text-crm-fg font-medium truncate max-w-[150px]" title={tx.invoiceNumber}>{tx.invoiceNumber || '---'}</span>
                                                            <span className="text-xs text-crm-fg-muted truncate max-w-[150px]" title={tx.taxNotes}>{tx.taxNotes || ''}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {isEditing ? (
                                                        <div className="flex gap-2 justify-end">
                                                            <button onClick={() => setEditingTxId(null)} className="text-xs font-bold text-crm-fg-muted hover:text-crm-fg">Cancelar</button>
                                                            <button onClick={() => handleEditSave(tx._id)} className="inline-flex items-center gap-1 rounded bg-crm-success/20 px-2 py-1 text-xs font-bold text-crm-success hover:bg-crm-success/30">
                                                                <Check size={12}/> Guardar
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => handleEditStart(tx)} className="text-xs font-bold text-crm-fg-muted hover:text-crm-red transition-colors">
                                                            Clasificar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}