"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import CrmModal from '../ui/CrmModal';
import { useVehicleFormClose } from './VehicleEditorDialog';

const button = 'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-crm-border bg-crm-surface px-3 py-1.5 text-xs font-medium text-crm-fg disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red';
const stamp = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' }) : 'No informado';
export default function VehicleOwnerPortalPanel({ vehicleId, canEdit = false, isOffline = false, onUpdated }) {
    const { token } = useAuth();
    const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const [consent, setConsent] = useState(false), [prepared, setPrepared] = useState(null), [resolving, setResolving] = useState(null), [resolution, setResolution] = useState(''), [formError, setFormError] = useState(''), [revokeConfirm, setRevokeConfirm] = useState(false);
    const session = useRef(token); session.current = token;
    const jobs = useRef(new Set()), loadingJob = useRef(null), preparedId = useRef(null);
    const resolutionClose = useVehicleFormClose({ isOpen: Boolean(resolving), onClose: () => setResolving(null), busy, resetKey: resolving?._id });
    const path = `/api/admin/cars/${vehicleId}/owner-portal`;
    const request = useCallback(async (url, options = {}, signal) => {
        const base = process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${base}${url}`, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal, cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (signal?.aborted || session.current !== token) throw new DOMException('La sesión cambió.', 'AbortError');
        if (!response.ok) throw new Error(result.message || 'No se pudo completar la operación del portal.');
        return result;
    }, [token]);
    const load = useCallback(async () => {
        if (isOffline || !token) { setLoading(false); return; }
        loadingJob.current?.abort(); const controller = new AbortController(); loadingJob.current = controller; setLoading(true); setError('');
        try { const result = await request(path, {}, controller.signal); setData(result); if (preparedId.current && String(result.access?._id || '') !== preparedId.current) { preparedId.current = null; setPrepared(null); } }
        catch (failure) { if (failure.name !== 'AbortError') setError(failure.message); }
        finally { if (!controller.signal.aborted) setLoading(false); }
    }, [isOffline, token, path, request]);
    useEffect(() => { setData(null); setPrepared(null); preparedId.current = null; load(); const active = jobs.current; return () => { loadingJob.current?.abort(); active.forEach(controller => controller.abort()); active.clear(); }; }, [load]);
    const mutate = async (kind, requestId) => {
        if (!canEdit || isOffline || busy || localStorage.getItem('token') !== token) return;
        if (kind === 'create' && !consent) return;
        const controller = new AbortController(); jobs.current.add(controller); setBusy(true); setError(''); setFormError('');
        try {
            const result = await request(kind === 'resolve' ? `${path}/requests/${requestId}` : path, { method: kind === 'create' ? 'POST' : kind === 'revoke' ? 'DELETE' : 'PATCH', body: kind === 'create' ? JSON.stringify({ consentConfirmed: true }) : kind === 'resolve' ? JSON.stringify({ resolution }) : undefined }, controller.signal);
            if (kind === 'create') { if (!/^\/propietario\/[a-f\d]{64}$/.test(result.path || '')) throw new Error('El servidor no devolvió un enlace de acceso válido.'); preparedId.current = String(result._id); setPrepared({ url: `${window.location.origin}${result.path}`, expiresAt: result.expiresAt }); setConsent(false); toast.success('Enlace del propietario preparado'); }
            if (kind === 'revoke') { setPrepared(null); preparedId.current = null; setRevokeConfirm(false); toast.success('Acceso revocado'); }
            if (kind === 'resolve') { setResolving(null); setResolution(''); toast.success('Solicitud resuelta sin modificar el precio de la unidad'); }
            await load(); onUpdated?.();
        } catch (failure) { if (failure.name !== 'AbortError') { if (kind === 'resolve') setFormError(failure.message); else setError(failure.message); } }
        finally { jobs.current.delete(controller); if (!controller.signal.aborted && session.current === token) setBusy(false); }
    };
    if (isOffline) return <p className="text-xs text-crm-fg-muted">El portal y las solicitudes del propietario requieren conexión.</p>;
    return <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="m-0 text-sm font-semibold text-crm-fg">Portal del propietario</h3><p className="mb-0 mt-1 text-xs text-crm-fg-muted">Consulta externa por enlace privado, con vencimiento y revocación.</p></div><button type="button" className={button} onClick={load} disabled={loading || busy} aria-label="Actualizar portal del propietario"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button></div>
        <div className="rounded-xl border border-crm-border bg-crm-bg/40 p-4 text-xs"><strong className="text-crm-fg">Qué se comparte</strong><p className="mb-0 text-crm-fg-muted">Marca, modelo, año, kilometraje, estado, precio publicado y moneda, fotos, equipamiento, mantenimiento y condiciones públicas. No se muestran nombres de clientes, consultas, costos, márgenes ni documentos internos.</p><p className="mb-0 text-crm-fg-muted">El propietario puede dejar solicitudes o proponer un precio. La agencia debe revisarlas; ninguna solicitud cambia automáticamente la ficha.</p></div>
        {error && <p role="alert" className="text-xs text-crm-red">{error}<button type="button" onClick={load} className="ml-2 underline">Reintentar consulta</button></p>}
        {loading && !data ? <p role="status" className="py-4 text-xs text-crm-fg-muted">Cargando acceso y solicitudes…</p> : data && <>
            <p className="text-xs text-crm-fg-muted">{data.access ? `Enlace activo hasta ${stamp(data.access.expiresAt)}.` : 'No hay un enlace activo.'} El enlace completo se muestra sólo al crearlo. Generar otro revoca los anteriores.</p>
            {prepared && <div className="space-y-2 rounded-xl border border-crm-border bg-crm-surface p-3"><label className="block text-xs text-crm-fg-muted">Enlace privado<input readOnly value={prepared.url} className="mt-1 h-9 w-full rounded-lg border border-crm-border bg-crm-bg px-3 text-xs text-crm-fg" /></label><p className="m-0 text-[11px] text-crm-fg-muted">Vence: {stamp(prepared.expiresAt)}. Compartilo únicamente con el propietario autorizado.</p><button type="button" className={button} onClick={async () => { try { await navigator.clipboard.writeText(prepared.url); toast.success('Enlace copiado'); } catch { setError('No se pudo copiar. Seleccioná el enlace para copiarlo manualmente.'); } }}><Copy size={12} />Copiar enlace</button></div>}
            {canEdit && <div className="space-y-3 rounded-xl border border-crm-border p-3"><label className="flex items-start gap-2 text-xs text-crm-fg"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} className="mt-0.5 accent-crm-red" />Confirmo que tengo autorización del propietario para compartir esta ficha y sus datos públicos.</label><div className="flex flex-wrap gap-2"><button type="button" className={`${button} !bg-crm-red !text-white`} disabled={!consent || busy || loading} onClick={() => mutate('create')}>{busy ? 'Guardando…' : data.access ? 'Generar nuevo enlace (revoca anterior)' : 'Crear enlace por 30 días'}</button>{data.access && <button type="button" className={button} disabled={busy} onClick={() => setRevokeConfirm(true)}>Revocar acceso</button>}</div></div>}
            <section><h4 className="m-0 text-sm font-semibold text-crm-fg">Solicitudes del propietario</h4><p className="text-[11px] text-crm-fg-muted">Las resoluciones son notas internas de la agencia y no se comparten en el portal.</p>{!data.requests?.length ? <p className="text-xs text-crm-fg-muted">No hay solicitudes registradas.</p> : <div className="space-y-2">{data.requests.map(item => <article key={item._id} className="rounded-xl border border-crm-border bg-crm-surface p-3 text-xs"><div className="flex flex-wrap justify-between gap-2"><span className="text-crm-fg-muted">{stamp(item.createdAt)}</span><span className="rounded-full border border-crm-border px-2 py-0.5 text-crm-fg-muted">{item.status === 'resuelta' ? 'Resuelta' : 'Pendiente'}</span></div><p className="whitespace-pre-wrap break-words text-crm-fg">{item.message}</p>{item.proposedPrice != null && <p className="text-crm-fg-muted">Precio propuesto: {item.currency} {Number(item.proposedPrice).toLocaleString('es-AR')} · No aplicado automáticamente.</p>}{item.resolution && <p className="mb-0 whitespace-pre-wrap border-t border-crm-border pt-2 text-crm-fg-muted">Resolución interna: {item.resolution}{item.resolvedBy ? ` · ${item.resolvedBy}` : ''}</p>}{canEdit && item.status === 'pendiente' && <button type="button" className={button} disabled={busy} onClick={() => { setResolving(item); setResolution(''); setFormError(''); }}>Registrar resolución</button>}</article>)}</div>}</section>
        </>}
        <CrmModal isOpen={Boolean(resolving)} onClose={resolutionClose.requestClose} title="Resolver solicitud del propietario" maxWidth="max-w-lg"><form onSubmit={event => { event.preventDefault(); mutate('resolve', resolving._id); }} className="space-y-3 p-4">{resolutionClose.closeNotice}<p className="text-xs text-crm-fg-muted">Esta nota cierra la solicitud. No modifica el precio ni la publicación; esos cambios se realizan desde la ficha.</p>{formError && <p role="alert" className="text-xs text-crm-red">{formError}</p>}<label className="block text-xs text-crm-fg-muted">Resolución interna<textarea required maxLength={5000} value={resolution} onChange={event => { setResolution(event.target.value); resolutionClose.markDirty(); }} className="mt-1 h-24 w-full rounded-lg border border-crm-border bg-crm-bg p-3 text-sm text-crm-fg" /></label><div className="flex justify-end gap-2"><button type="button" className={button} disabled={busy} onClick={resolutionClose.requestClose}>Cancelar</button><button type="submit" className={`${button} !bg-crm-red !text-white`} disabled={busy || !resolution.trim()}>{busy ? 'Guardando…' : 'Guardar resolución'}</button></div></form></CrmModal>
        <CrmModal isOpen={revokeConfirm} onClose={() => { if (!busy) setRevokeConfirm(false); }} title="Revocar acceso del propietario" maxWidth="max-w-md"><div className="space-y-3 p-4"><p className="text-sm text-crm-fg-muted">Los enlaces actuales dejarán de funcionar. Las solicitudes y su historial se conservarán.</p><div className="flex justify-end gap-2"><button type="button" className={button} disabled={busy} onClick={() => setRevokeConfirm(false)}>Cancelar</button><button type="button" className={`${button} !text-crm-red`} disabled={busy} onClick={() => mutate('revoke')}>{busy ? 'Revocando…' : 'Revocar acceso'}</button></div></div></CrmModal>
    </section>;
}
