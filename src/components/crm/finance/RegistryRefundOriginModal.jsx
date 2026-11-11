'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useRegistryRequest } from '../../../hooks/useRegistryRefunds';
import CrmModal from '../ui/CrmModal';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import CrmTextarea from '../ui/CrmTextarea';
import { getArgentinaDateKey } from '../../../utils/cashProjection';
export default function RegistryRefundOriginModal({ tramite, onClose }) {
    const { request, token } = useRegistryRequest();
    return <Origin key={`${token}:${tramite._id}`} tramite={tramite} onClose={onClose} request={request} />;
}
function Origin({ tramite, onClose, request }) {
    const [form, setForm] = useState({ amount: '', currency: 'ARS', date: getArgentinaDateKey(new Date()), notes: '', idempotencyKey: crypto.randomUUID() }), [items, setItems] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
    const mounted = useRef(true), lock = useRef(false);
    useEffect(() => { mounted.current = true; request(`/api/admin/gestoria/${tramite._id}/registry-refunds`).then(result => { if (mounted.current) setItems(result.items); }).catch(err => { if (mounted.current && err.name !== 'AbortError') setError(err.message); }); return () => { mounted.current = false; }; }, [request, tramite._id]);
    const save = async () => {
        if (lock.current || saved) return; lock.current = true; setBusy(true); setError('');
        try { const result = await request(`/api/admin/gestoria/${tramite._id}/registry-refunds`, 'POST', form); if (mounted.current) { setSaved(true); setItems(previous => [...previous, result.item]); } }
        catch (err) { if (mounted.current && err.name !== 'AbortError') setError(err.message); }
        finally { lock.current = false; if (mounted.current) setBusy(false); }
    };
    return <CrmModal isOpen title="Informar devolución del Registro" onClose={() => { if (!busy) onClose?.(); }} maxWidth="max-w-lg" fullScreenOnMobile footer={<div className="flex justify-end gap-2"><CrmButton variant="secondary" disabled={busy} onClick={onClose}>{saved ? 'Cerrar' : 'Cancelar'}</CrmButton>{!saved && <CrmButton disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Informar a Finanzas'}</CrmButton>}</div>}><div className="space-y-4 p-5"><p className="text-sm">{tramite.title} · {tramite.vehiclePlate || 'Sin patente'}</p><p className="text-xs leading-5 text-crm-fg-muted">Registrá sólo el importe efectivamente informado por el Registro al finalizar la transferencia. Quedará por confirmar en Finanzas. Esta carga no acredita caja ni reintegra dinero automáticamente.</p>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}{saved ? <p role="status" className="text-sm text-emerald-300">Reintegro informado. Finanzas podrá confirmar su acreditación o declarar que fue devuelto directamente al cliente.</p> : <fieldset disabled={busy} className="m-0 space-y-3 border-0 p-0"><label className="block text-xs text-crm-fg-muted">Importe<CrmInput className="mt-2" type="number" min="0.01" step="any" value={form.amount} onChange={event => setForm(previous => ({ ...previous, amount: event.target.value }))} /></label><label className="block text-xs text-crm-fg-muted">Moneda<CrmSelect className="mt-2" value={form.currency} onChange={event => setForm(previous => ({ ...previous, currency: event.target.value }))}><option>ARS</option><option>USD</option></CrmSelect></label><label className="block text-xs text-crm-fg-muted">Fecha informada<CrmInput className="mt-2" type="date" value={form.date} onChange={event => setForm(previous => ({ ...previous, date: event.target.value }))} /></label><label className="block text-xs text-crm-fg-muted">Observaciones<CrmTextarea className="mt-2" value={form.notes} onChange={event => setForm(previous => ({ ...previous, notes: event.target.value }))} /></label></fieldset>}{items.length > 0 && <details><summary className="cursor-pointer text-xs text-crm-fg-muted">Reintegros ya informados de este trámite ({items.length})</summary>{items.map(row => <p className="text-xs" key={row._id}>{row.currency} {Number(row.amount).toLocaleString('es-AR')} · {row.status.replaceAll('_', ' ')}</p>)}</details>}</div></CrmModal>;
}
