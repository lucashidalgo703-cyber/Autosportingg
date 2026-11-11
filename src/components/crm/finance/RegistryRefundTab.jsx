'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useRegistryRequest } from '../../../hooks/useRegistryRefunds';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import CrmModal from '../ui/CrmModal';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import CrmTextarea from '../ui/CrmTextarea';
import { getBusinessDateKey } from '../../../utils/cashProjection';
const labels = { por_confirmar: 'Por confirmar', acreditada: 'Acreditadas', devuelta_cliente: 'Devueltas al cliente' };
const money = (value, currency) => `${currency} ${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
export default function RegistryRefundTab({ onUpdated }) {
    const { user, token } = useAuth();
    if (!hasPermission(user, PERMISSIONS.FINANZAS_READ)) return <p className="text-sm text-crm-fg-muted">Necesitás permiso de consulta de Finanzas.</p>;
    return <Workspace key={token} onUpdated={onUpdated} />;
}
function Workspace({ onUpdated }) {
    const { user } = useAuth(); const { request } = useRegistryRequest();
    const [data, setData] = useState({ items: [], summary: {}, total: 0, pages: 1 });
    const [status, setStatus] = useState('por_confirmar'), [search, setSearch] = useState(''), [page, setPage] = useState(1), [error, setError] = useState(''), [loading, setLoading] = useState(true), [action, setAction] = useState(null), [reason, setReason] = useState(''), [accountId, setAccountId] = useState(''), [accounts, setAccounts] = useState([]), [busy, setBusy] = useState(false);
    const mounted = useRef(true), revision = useRef(0), write = useRef(false);
    const canWrite = hasPermission(user, PERMISSIONS.FINANZAS_WRITE), canCash = hasPermission(user, PERMISSIONS.CAJA_WRITE) && hasPermission(user, PERMISSIONS.CAJA_READ);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; revision.current++; }; }, []);
    const load = useCallback(async () => {
        const current = ++revision.current; setLoading(true); setError('');
        try { const result = await request(`/api/admin/finance/registry-refunds?${new URLSearchParams({ status, search, page: String(page) })}`); if (mounted.current && revision.current === current) setData(result); }
        catch (err) { if (mounted.current && err.name !== 'AbortError' && revision.current === current) setError(err.message); }
        finally { if (mounted.current && revision.current === current) setLoading(false); }
    }, [request, status, search, page]);
    useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
    useEffect(() => { if (!canCash) return; request('/api/admin/accounts').then(result => { if (mounted.current) setAccounts(Array.isArray(result) ? result : result.accounts || []); }).catch(err => { if (mounted.current && err.name !== 'AbortError') setError(err.message); }); }, [canCash, request]);
    const open = (row, target) => { setAction({ row, target }); setReason(''); setAccountId(''); setError(''); };
    const resolve = async () => {
        if (!action || write.current) return; write.current = true; setBusy(true); setError('');
        try {
            await request(`/api/admin/finance/registry-refunds/${action.row._id}`, 'PATCH', { status: action.target, reason, ...(action.target === 'acreditada' ? { accountId } : {}) });
            if (!mounted.current) return; setAction(null); await load(); await onUpdated?.();
        } catch (err) { if (mounted.current && err.name !== 'AbortError') setError(err.message); }
        finally { write.current = false; if (mounted.current) setBusy(false); }
    };
    return <div className="space-y-4"><div className="grid gap-3 md:grid-cols-3">{Object.entries(labels).map(([key, label]) => <div key={key} className="rounded-xl border border-crm-border bg-crm-surface p-4"><p className="m-0 text-xs text-crm-fg-muted">{label} · {data.summary[key]?.count || 0}</p>{['ARS', 'USD'].map(currency => <p key={currency} className="mb-0 mt-2 text-lg font-semibold">{error ? '—' : money(data.summary[key]?.[currency], currency)}</p>)}</div>)}</div>
        <p className="rounded-lg border border-crm-border p-3 text-xs leading-5 text-crm-fg-muted">Gestoría carga estos reintegros desde la transferencia transferida o finalizada, cuando informa una devolución de aranceles del Registro. No se crean desde Finanzas. Acreditar registra un ingreso real en una cuenta; declarar la devolución directa al cliente no mueve caja.</p>
        <div className="flex flex-wrap gap-2">{Object.entries(labels).map(([key, label]) => <button type="button" key={key} aria-pressed={status === key} className={`rounded-lg border px-3 py-2 text-xs ${status === key ? 'border-crm-red bg-crm-red text-white' : 'border-crm-border text-crm-fg-muted'}`} onClick={() => { setStatus(key); setPage(1); }}>{label}</button>)}<span className="flex-1" /><CrmButton variant="secondary" size="sm" onClick={load} disabled={loading}>Actualizar</CrmButton></div>
        <CrmInput aria-label="Buscar devolución del Registro" placeholder="Buscar patente, cliente o gestor…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}{loading && <p role="status" className="text-xs text-crm-fg-muted">Consultando reintegros…</p>}
        <div className="overflow-x-auto rounded-xl border border-crm-border"><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-crm-bg text-crm-fg-muted"><tr>{['Fecha', 'Vehículo', 'Cliente', 'Gestor', 'Importe', 'Estado', 'Acciones'].map(label => <th className="p-3 font-medium" key={label}>{label}</th>)}</tr></thead><tbody>{data.items.map(row => <tr key={row._id} className="border-t border-crm-border"><td className="p-3">{getBusinessDateKey(row.date)}</td><td className="p-3"><span className="block">{row.vehicleName || 'Sin unidad vinculada'}</span><span className="text-crm-fg-muted">{row.vehiclePlate || 'Sin patente'}</span></td><td className="p-3">{row.clientName || 'Sin cliente vinculado'}</td><td className="p-3">{row.gestorName || 'Sin asignar'}</td><td className="whitespace-nowrap p-3 font-semibold">{money(row.amount, row.currency)}</td><td className="p-3">{labels[row.status]}</td><td className="p-3"><div className="flex flex-wrap gap-2">{hasPermission(user, PERMISSIONS.GESTORIA_READ) && <Link className="text-crm-red" href="/admin/gestoria">Ver trámite</Link>}{row.status === 'por_confirmar' && canWrite && <>{canCash && <CrmButton size="sm" variant="secondary" onClick={() => open(row, 'acreditada')}>Confirmar acreditación</CrmButton>}<CrmButton size="sm" variant="secondary" onClick={() => open(row, 'devuelta_cliente')}>Devuelta al cliente</CrmButton></>}{row.status !== 'por_confirmar' && <span className="text-crm-fg-muted">{row.resolutionNote} · {row.resolvedBy}</span>}</div></td></tr>)}</tbody></table>{!data.items.length && !loading && !error && <p className="p-6 text-center text-sm text-crm-fg-muted">No hay reintegros para esta vista.</p>}</div>
        <div className="flex items-center justify-end gap-3 text-xs"><span>{data.total} registros · {page}/{data.pages}</span><CrmButton variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</CrmButton><CrmButton variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage(value => value + 1)}>Siguiente</CrmButton></div>
        {action && <CrmModal isOpen title={action.target === 'acreditada' ? 'Confirmar acreditación del Registro' : 'Declarar devolución directa al cliente'} onClose={() => { if (!busy) setAction(null); }} fullScreenOnMobile maxWidth="max-w-lg" footer={<div className="flex justify-end gap-2"><CrmButton variant="secondary" disabled={busy} onClick={() => setAction(null)}>Cancelar</CrmButton><CrmButton disabled={busy || !reason.trim() || action.target === 'acreditada' && !accountId} onClick={resolve}>{busy ? 'Guardando…' : 'Confirmar'}</CrmButton></div>}><div className="space-y-4 p-5"><p className="text-sm">{money(action.row.amount, action.row.currency)} · {action.row.vehiclePlate || 'Trámite sin patente'}</p>{action.target === 'acreditada' ? <label className="block text-xs text-crm-fg-muted">Cuenta de ingreso<CrmSelect className="mt-2" value={accountId} onChange={event => setAccountId(event.target.value)}><option value="">Seleccionar cuenta activa</option>{accounts.filter(account => account.isActive !== false && account.currency === action.row.currency).map(account => <option key={account._id} value={account._id}>{account.name} · {account.currency}</option>)}</CrmSelect></label> : <p className="text-xs leading-5 text-crm-fg-muted">Declaración de que el Registro devolvió este importe directamente al cliente. No registra ingreso ni egreso en la agencia.</p>}<label className="block text-xs text-crm-fg-muted">Constancia / motivo<CrmTextarea className="mt-2" value={reason} onChange={event => setReason(event.target.value)} /></label>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}</div></CrmModal>}
    </div>;
}
