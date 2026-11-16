"use client";
import { useCallback, useEffect, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../utils/adminPermissions';
import PrivateAttachment from './PrivateAttachment';
import { documentRequirements, documentStatus, portalDate, portalRequest, vehicleLabel } from './portalClient';

export default function BuyerDocumentsPanel({ saleId, tradeInId, carId }) {
    const { token, user } = useAuth();
    const canReview = hasPermission(user, PERMISSIONS.VENTAS_WRITE) && (hasPermission(user, PERMISSIONS.DOCUMENTACION_WRITE) || hasPermission(user, PERMISSIONS.STOCK_WRITE));
    const [open, setOpen] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState('');
    const [correctionId, setCorrectionId] = useState('');
    const [reason, setReason] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const selected = data?.vehicles?.find(vehicle => `${vehicle.saleId}:${vehicle.tradeInId || vehicle.id}` === selectedVehicle);
    const query = new URLSearchParams(selected ? { saleId: selected.saleId, tradeInId: selected.tradeInId || selected.id } : carId ? { carId } : { saleId: saleId || '', tradeInId: tradeInId || '' }).toString();
    const load = useCallback(async () => {
        if (!token || !open) return;
        setLoading(true); setError('');
        try { setData(await portalRequest('/api/admin/buyer-portal/documents?' + query, { token })); }
        catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, [token, open, query]);
    useEffect(() => { void load(); }, [load]);
    const requestAccess = useCallback(id => portalRequest('/api/admin/buyer-portal/documents/' + encodeURIComponent(id) + '/access', { token, method: 'POST', body: {} }), [token]);
    const mutate = async (key, url, body) => {
        setBusy(key); setError(''); setNotice('');
        try {
            await portalRequest(url, { token, method: 'PATCH', body });
            await load();
            setNotice('El legajo quedó actualizado.'); setCorrectionId(''); setReason('');
        } catch (err) { setError(err.message); }
        finally { setBusy(''); }
    };
    const review = (entry, status) => mutate(entry.id, '/api/admin/buyer-portal/documents/' + encodeURIComponent(entry.id), { status, ...(status === 'correction_requested' ? { reason: reason.trim() } : {}) });
    const currentVehicle = selected || data?.vehicle || data?.vehicles?.[0] || {};
    const contextSaleId = data?.saleId || currentVehicle.saleId || saleId;
    const contextTradeInId = data?.tradeInId || currentVehicle.tradeInId || currentVehicle.id || tradeInId;
    const requirements = data?.requirements?.length ? data.requirements : documentRequirements;
    const groups = data?.groups || [];
    const entries = groups.flatMap(group => group.entries || []);
    const renderEntry = entry => <article key={entry.id} data-admin-document={entry.id} data-document-current={entry.isCurrent !== false} className="min-w-0 space-y-2 rounded-xl border border-neutral-700 bg-neutral-950 p-3">
        <PrivateAttachment entry={entry} requestAccess={requestAccess}/>
        <h5 className="text-sm font-bold text-white">{entry.description || entry.fileName}</h5>
        <p className="text-xs text-neutral-400">{portalDate(entry.createdAt)} · {entry.origin === 'buyer' ? 'Portal del comprador' : entry.origin} · Versión {entry.version || 1}</p>
        <p className={`text-xs font-semibold ${entry.status === 'correction_requested' ? 'text-amber-200' : entry.status === 'reviewed' ? 'text-emerald-300' : 'text-neutral-300'}`}>{entry.isCurrent === false ? 'Versión anterior' : documentStatus(entry.status)}</p>
        {entry.issuedAt && <p className="text-xs text-neutral-400">Emisión: {new Date(entry.issuedAt).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</p>}
        {entry.correctionReason && <p className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-sm text-amber-200">Motivo de corrección: {entry.correctionReason}</p>}
        {entry.isCurrent !== false && canReview && <div className="space-y-2 border-t border-neutral-800 pt-2"><div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy) || entry.status === 'reviewed'} onClick={() => review(entry, 'reviewed')} className="min-h-10 rounded-lg border border-emerald-500/30 px-3 text-xs font-semibold text-emerald-300 disabled:opacity-40">Marcar revisada</button><button type="button" disabled={Boolean(busy)} onClick={() => { setCorrectionId(entry.id); setReason(''); }} className="min-h-10 rounded-lg border border-amber-500/30 px-3 text-xs font-semibold text-amber-200 disabled:opacity-40">Pedir corrección de esta imagen</button></div>
            {correctionId === entry.id && <form className="space-y-2" onSubmit={event => { event.preventDefault(); void review(entry, 'correction_requested'); }}><label className="block text-xs text-neutral-300">Motivo para corregir {entry.description || 'esta imagen'}<textarea value={reason} onChange={event => setReason(event.target.value)} required minLength={3} maxLength={500} className="mt-1 min-h-20 w-full rounded-lg border border-neutral-700 bg-neutral-900 p-2 text-sm text-white"/></label><div className="flex gap-2"><button type="submit" disabled={Boolean(busy) || reason.trim().length < 3} className="min-h-10 rounded-lg bg-amber-500/20 px-3 text-xs font-bold text-amber-100 disabled:opacity-40">Guardar pedido de corrección</button><button type="button" onClick={() => setCorrectionId('')} className="min-h-10 px-2 text-xs text-neutral-400">Cancelar</button></div></form>}
        </div>}
        {entry.history?.length > 0 && <details className="text-xs text-neutral-400"><summary className="cursor-pointer">Historial de revisión</summary><ul className="mt-2 space-y-1">{entry.history.map((item, index) => <li key={item.id || index}>{portalDate(item.at || item.date)} · {documentStatus(item.status)}{item.reason ? ` · ${item.reason}` : ''}</li>)}</ul></details>}
    </article>;
    return <details className="min-w-0 rounded-xl border border-crm-border bg-crm-surface" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
        <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold text-crm-fg"><FileCheck2 size={17} className="shrink-0 text-blue-400"/>Documentación entregada por el cliente</summary>
        {open && <div className="min-w-0 space-y-4 border-t border-crm-border p-3 sm:p-4">
            <p className="text-xs leading-relaxed text-crm-fg-muted">Legajo de la unidad recibida, conservado desde el preingreso. Una copia digital, su revisión y la recepción física del original son estados distintos.</p>
            {data?.vehicles?.length > 1 && <label className="block text-sm text-crm-fg-muted">Unidad del legajo<select value={selectedVehicle} onChange={event => setSelectedVehicle(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-crm-border bg-crm-bg p-2 text-crm-fg"><option value="">Seleccionar unidad</option>{data.vehicles.map(vehicle => <option key={`${vehicle.saleId}:${vehicle.tradeInId || vehicle.id}`} value={`${vehicle.saleId}:${vehicle.tradeInId || vehicle.id}`}>{vehicleLabel(vehicle)} · {vehicle.plate || 'Sin patente'}</option>)}</select></label>}
            {(currentVehicle.brand || currentVehicle.plate) && <p className="text-sm font-bold text-crm-fg">{vehicleLabel(currentVehicle)} · {currentVehicle.plate || 'Sin patente'}</p>}
            {loading && <p role="status" className="text-sm text-crm-fg-muted">Cargando legajo privado…</p>}
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
            {data && !loading && <><p className="text-xs text-crm-fg-muted">{groups.filter(group => group.complete).length} de 6 requisitos con copia digital completa · {entries.filter(entry => entry.isCurrent !== false).length} archivos vigentes</p><div className="space-y-3">{requirements.map(requirement => {
                const group = groups.find(item => item.key === requirement.key);
                const current = (group?.entries || []).filter(entry => entry.isCurrent !== false);
                const previous = (group?.entries || []).filter(entry => entry.isCurrent === false);
                return <section key={requirement.key} data-admin-requirement={requirement.key} className="min-w-0 space-y-3 rounded-xl border border-neutral-700 bg-neutral-900 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><h4 className="text-sm font-bold text-white">{requirement.label}</h4><span className="text-xs text-neutral-400">{current.length} archivos vigentes</span></div><p className="text-xs text-neutral-400">{requirement.guidance}</p><p className="text-xs text-neutral-300">Digital: {current.length ? 'Copia recibida' : 'Pendiente'} · Original: {group?.originalReceived ? 'Recibido' : 'Pendiente de recepción física'}</p>{current.length > 0 && <div className="grid min-w-0 gap-3 sm:grid-cols-2">{current.map(renderEntry)}</div>}{previous.length > 0 && <details><summary className="cursor-pointer text-xs text-neutral-400">Ver {previous.length} versiones anteriores</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{previous.map(renderEntry)}</div></details>}{canReview && contextSaleId && contextTradeInId && <button type="button" disabled={Boolean(busy)} onClick={() => mutate('original:' + requirement.key, '/api/admin/buyer-portal/requirements/original', { saleId: contextSaleId, tradeInId: contextTradeInId, requirementKey: requirement.key, received: !group?.originalReceived })} className="min-h-10 rounded-lg border border-neutral-600 px-3 text-xs font-semibold text-neutral-300 disabled:opacity-40">{group?.originalReceived ? 'Corregir: original aún no recibido' : 'Marcar original recibido físicamente'}</button>}</section>;
            })}</div></>}
        </div>}
    </details>;
}
