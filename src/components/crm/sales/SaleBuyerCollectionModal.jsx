'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import CrmModal from '../ui/CrmModal';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import CrmTextarea from '../ui/CrmTextarea';
import TreasuryCollectAndDistributeModal from '../treasury/TreasuryCollectAndDistributeModal';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { getSaleBuyer } from '../../../utils/salePresentation';
import { getArgentinaDateKey } from '../../../utils/cashProjection';
const money = (value, currency) => `${currency || ''} ${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
export default function SaleBuyerCollectionModal({ isOpen = true, sale, accounts = [], treasuryToken, onClose, onSuccess }) {
    const { token } = useAuth();
    if (!isOpen || !sale?._id) return null;
    return <Workspace key={`${token}:${sale._id}`} saleId={sale._id} accounts={accounts} treasuryToken={treasuryToken} onClose={onClose} onSuccess={onSuccess} />;
}
function Workspace({ saleId, accounts, treasuryToken, onClose, onSuccess }) {
    const { user } = useAuth(); const { salesRequest } = useAdminSales();
    const canDeclare = hasPermission(user, PERMISSIONS.VENTAS_WRITE) && hasPermission(user, PERMISSIONS.FINANZAS_WRITE);
    const canCash = hasPermission(user, PERMISSIONS.FINANZAS_WRITE) && hasPermission(user, PERMISSIONS.CAJA_WRITE) && ['owner', 'admin'].includes(user?.role);
    const [sale, setSale] = useState(null), [error, setError] = useState(''), [code, setCode] = useState(''), [mode, setMode] = useState(canCash ? 'cash' : 'external'), [cashOpen, setCashOpen] = useState(false), [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ amount: '', date: getArgentinaDateKey(new Date()), method: '', reason: '', idempotencyKey: crypto.randomUUID() });
    const mounted = useRef(true), lock = useRef(false);
    const load = async () => { setError(''); setCode(''); try { const result = await salesRequest(`/api/admin/sales/${saleId}`); if (mounted.current) { setSale(result); setForm(previous => ({ ...previous, amount: result.finance?.pendingBalance > 0 ? String(result.finance.pendingBalance) : '', idempotencyKey: crypto.randomUUID() })); } } catch (err) { if (mounted.current && err.name !== 'AbortError') setError(err.message); } };
    useEffect(() => { mounted.current = true; let cancelled = false; const controller = new AbortController(); salesRequest(`/api/admin/sales/${saleId}`, { signal: controller.signal }).then(result => { if (!cancelled) { setSale(result); setForm(previous => ({ ...previous, amount: result.finance?.pendingBalance > 0 ? String(result.finance.pendingBalance) : '' })); } }).catch(err => { if (!cancelled && err.name !== 'AbortError') setError(err.message); }); return () => { mounted.current = false; cancelled = true; controller.abort(); }; }, [salesRequest, saleId]);
    const save = async () => {
        if (!sale || lock.current || !canDeclare) return; lock.current = true; setBusy(true); setError(''); setCode('');
        try {
            const result = await salesRequest(`/api/admin/sales/${saleId}/buyer-payments`, { method: 'POST', body: JSON.stringify({ ...form, mode, currency: sale.saleCurrency, expectedPendingBalance: sale.finance?.pendingBalance }) });
            if (!mounted.current) return; setSale(result.sale); await onSuccess?.(result.sale); onClose?.();
        } catch (err) { if (mounted.current && err.name !== 'AbortError') { setError(err.message); setCode(err.code || ''); } }
        finally { lock.current = false; if (mounted.current) setBusy(false); }
    };
    if (cashOpen && sale) return <TreasuryCollectAndDistributeModal isOpen accounts={accounts} initialSale={sale} initialSaleId={sale._id} treasuryToken={treasuryToken} onClose={onClose} onSuccess={async result => { await onSuccess?.(result); onClose?.(); }} />;
    const finance = sale?.finance || {}, buyer = getSaleBuyer(sale || {}), historical = mode === 'historical', settled = mode === 'settled';
    const validOperation = sale && !sale.historicalOnly && !['borrador', 'cancelada'].includes(sale.status) && Number(finance.pendingBalance) > 0;
    return <CrmModal isOpen title="Registrar cobro" maxWidth="max-w-4xl" fullScreenOnMobile fullHeightOnDesktop onClose={() => { if (!busy) onClose?.(); }} footer={<div className="flex flex-wrap justify-end gap-2"><CrmButton variant="secondary" disabled={busy} onClick={onClose}>Cancelar</CrmButton>{mode === 'cash' ? <CrmButton disabled={!validOperation || !canCash || busy} onClick={() => setCashOpen(true)}>Continuar a Tesorería</CrmButton> : <CrmButton disabled={!validOperation || !canDeclare || busy || !form.reason.trim() || mode === 'external' && (!form.amount || !form.method)} onClick={save}>{busy ? 'Guardando…' : historical ? 'Registrar constancia histórica' : settled ? 'Dar por saldado' : 'Registrar pago externo'}</CrmButton>}</div>}>
        <div className="space-y-5 p-5 sm:p-6">
            {error && <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}{code === 'SALE_INSTALLMENT_WORKFLOW_REQUIRED' ? <Link href="/admin/cuotas" className="mt-2 block underline">Abrir Cuotas</Link> : <button type="button" className="ml-2 underline" onClick={load} disabled={busy}>Actualizar saldo</button>}</div>}
            {!sale ? <p className="text-sm text-crm-fg-muted">Consultando la operación…</p> : <>
                <div><h3 className="m-0 text-sm font-semibold">{sale.vehicleId?.brand} {sale.vehicleId?.name} {sale.vehicleId?.plateOrVin}</h3><p className="mb-0 mt-1 text-xs text-crm-fg-muted">{buyer.name || 'Sin comprador vinculado'} · {sale.saleCurrency}</p></div>
                <div className="grid grid-cols-3 gap-3">{[['Importe a cobrar', finance.totalToCollect], ['Pagos informados', finance.buyerPaymentsReceived ?? finance.netoCobrado], ['Falta', finance.pendingBalance]].map(([label, amount]) => <div key={label} className="rounded-xl border border-crm-border bg-crm-bg p-4"><p className="m-0 text-xs text-crm-fg-muted">{label}</p><p className="mb-0 mt-2 text-lg font-semibold">{money(amount, sale.saleCurrency)}</p></div>)}</div>
                <div className="grid gap-3 rounded-xl border border-crm-border p-4 text-xs sm:grid-cols-2"><span>Cobros registrados / seña aplicada: <strong>{money(finance.netoCobrado, sale.saleCurrency)}</strong></span><span>Pagos externos declarados: <strong>{money(finance.externalPaid, sale.saleCurrency)}</strong></span><span>Constancias históricas sin caja: <strong>{money(finance.historicalSettled, sale.saleCurrency)}</strong></span><span>Saldo dado por saldado: <strong>{money(finance.writtenOff, sale.saleCurrency)}</strong></span></div>
                {!validOperation && <p className="text-sm text-amber-300">Esta operación no tiene saldo pendiente registrable desde este formulario.</p>}
                <fieldset disabled={busy || !validOperation} className="m-0 space-y-4 border-0 p-0">
                    <div className="flex flex-wrap gap-4 rounded-xl border border-crm-border p-4">{canCash && <label className="flex items-center gap-2 text-sm"><input type="radio" name="buyer-payment-mode" checked={mode === 'cash'} onChange={() => setMode('cash')} />Caja de la agencia</label>}{canDeclare && <label className="flex items-center gap-2 text-sm"><input type="radio" name="buyer-payment-mode" checked={mode === 'external'} onChange={() => setMode('external')} />Pago externo · no pasa por Caja</label>}</div>
                    {mode === 'cash' ? <p className="text-xs leading-5 text-crm-fg-muted">Continúa al circuito real de Tesorería: conserva permisos, PIN, cuenta de destino y distribución. Este formulario no registra otro ingreso por su cuenta.</p> : <>
                        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">{historical ? 'Constancia de que el saldo restante ya fue contabilizado anteriormente. Reduce sólo ese pendiente; no crea dinero en Caja ni convierte la venta en histórica.' : settled ? 'Declaración explícita de que la agencia da por saldado el pendiente indicado. No representa un cobro, no cambia el estado comercial ni paga obligaciones de terceros.' : 'Pago recibido fuera de las cuentas de la agencia. Reduce el saldo del comprador en la moneda pactada; no registra ingreso en Caja ni distribuye capital o comisiones.'}</div>
                        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs text-crm-fg-muted">{mode === 'external' ? 'Importe externo' : 'Pendiente que se declara saldado'}<CrmInput className="mt-2" type="number" min="0.01" max={finance.pendingBalance} step="any" readOnly={mode !== 'external'} value={mode === 'external' ? form.amount : finance.pendingBalance ?? ''} onChange={event => setForm(previous => ({ ...previous, amount: event.target.value }))} /></label><label className="block text-xs text-crm-fg-muted">Moneda de la venta<CrmInput className="mt-2" value={sale.saleCurrency} readOnly /></label><label className="block text-xs text-crm-fg-muted">Fecha de la constancia<CrmInput className="mt-2" type="date" value={form.date} onChange={event => setForm(previous => ({ ...previous, date: event.target.value }))} /></label>{mode === 'external' && <label className="block text-xs text-crm-fg-muted">Medio externo<CrmSelect className="mt-2" value={form.method} onChange={event => setForm(previous => ({ ...previous, method: event.target.value }))}><option value="">Seleccionar</option>{[['efectivo', 'Efectivo'], ['transferencia', 'Transferencia'], ['cheque', 'Cheque'], ['otro', 'Otro']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</CrmSelect></label>}</div>
                        <label className="block text-xs text-crm-fg-muted">Motivo / constancia obligatoria<CrmTextarea className="mt-2 min-h-24" value={form.reason} onChange={event => setForm(previous => ({ ...previous, reason: event.target.value }))} /></label>
                    </>}
                    {canDeclare && <div className="flex flex-wrap gap-2 border-t border-crm-border pt-4"><CrmButton size="sm" variant={historical ? 'primary' : 'secondary'} onClick={() => setMode('historical')}>Ya contabilizado históricamente</CrmButton><CrmButton size="sm" variant={settled ? 'primary' : 'secondary'} onClick={() => setMode('settled')}>Dar por saldado</CrmButton></div>}
                </fieldset>
            </>}
        </div>
    </CrmModal>;
}
