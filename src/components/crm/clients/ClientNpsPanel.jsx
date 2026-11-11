"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, MessageCircle, ClipboardCheck, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { NPS_CONTEXTS, npsContextLabel } from '../../../utils/nps';
import { clientTodayKey } from '../../../utils/clientCommercial';
import CrmModal from '../ui/CrmModal';

const API = () => process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const button = 'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-crm-border bg-crm-surface px-3 py-1.5 text-xs font-medium text-crm-fg hover:bg-crm-surface-raised disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red';
const field = 'mt-1 h-9 w-full min-w-0 rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg focus:outline-none focus:ring-2 focus:ring-crm-red disabled:opacity-60';
const deliveryLabels = { not_sent: 'Sin enviar', sending: 'En proceso de envío', sent: 'Enviado', failed: 'Envío rechazado / no realizado', uncertain: 'Necesita verificación' };
const channelLabels = { manual: 'Registro manual', whatsapp: 'WhatsApp', link: 'Enlace preparado', legacy: 'Registro anterior' };
const stamp = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' }) : 'Sin fecha';
const freshForm = () => ({ sellerId: '', context: '', score: null, comment: '', callDate: clientTodayKey(), consentConfirmed: false, result: '', note: '' });

export default function ClientNpsPanel({ clientId, client, onUpdated, initialAction }) {
    const { user, token } = useAuth();
    const canRead = hasPermission(user, PERMISSIONS.NPS_READ), canWrite = hasPermission(user, PERMISSIONS.NPS_WRITE);
    const [config, setConfig] = useState(null), [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true), [error, setError] = useState('');
    const [modal, setModal] = useState(null), [form, setForm] = useState(freshForm), [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState(''), [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false), [preparedUrl, setPreparedUrl] = useState('');
    const session = useRef(token); session.current = token;
    const controllers = useRef(new Set()), loadingController = useRef(null), requestKey = useRef(null), initialOpened = useRef(false);
    const request = useCallback(async (path, options = {}, signal) => {
        if (!token || localStorage.getItem('token') !== token) throw new DOMException('La sesión cambió.', 'AbortError');
        const response = await fetch(`${API()}${path}`, { ...options, signal, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
        const data = await response.json().catch(() => ({}));
        if (session.current !== token || signal?.aborted) throw new DOMException('La sesión cambió.', 'AbortError');
        if (!response.ok) throw Object.assign(new Error(data.message || 'No se pudo completar la solicitud NPS.'), { code: data.code, surveyId: data.surveyId });
        return data;
    }, [token]);
    const load = useCallback(async () => {
        if (!clientId || !token || !canRead && !canWrite) return;
        loadingController.current?.abort();
        const controller = new AbortController(); loadingController.current = controller;
        setLoading(true); setError('');
        try {
            const [settings, records] = await Promise.all([request(`/api/admin/nps/config?clientId=${encodeURIComponent(clientId)}`, {}, controller.signal), canRead ? request(`/api/admin/clients/${encodeURIComponent(clientId)}/nps`, {}, controller.signal) : null]);
            if (!controller.signal.aborted) { setConfig(settings); setHistory(records); }
        } catch (failure) { if (failure.name !== 'AbortError') setError(failure.message); }
        finally { if (!controller.signal.aborted) setLoading(false); }
    }, [clientId, token, canRead, canWrite, request]);
    useEffect(() => {
        setConfig(null); setHistory(null); setModal(null); setBusy(false); setPreparedUrl(''); initialOpened.current = false;
        load();
        const active = controllers.current;
        return () => { loadingController.current?.abort(); active.forEach(controller => controller.abort()); active.clear(); };
    }, [load]);
    const open = (kind, survey) => {
        const selected = survey?.seller?._id || client?.assignedTo?._id || client?.assignedTo;
        const ownId = user?.id || user?._id || user?.userId;
        const sellerId = survey?.seller?._id ? String(survey.seller._id) : config?.sellers?.some(seller => seller._id === String(selected)) ? String(selected) : config?.sellers?.some(seller => seller._id === String(ownId)) ? String(ownId) : '';
        setForm({ ...freshForm(), sellerId, context: survey?.context || '' });
        requestKey.current = crypto.randomUUID(); setDirty(false); setDiscard(false); setFormError(''); setPreparedUrl(''); setModal({ kind, survey });
    };
    useEffect(() => { if (initialAction && config && !loading && !initialOpened.current && canWrite) { initialOpened.current = true; open(initialAction); } }, [initialAction, config, loading, canWrite]);
    const close = () => { if (busy) return; if (dirty && !preparedUrl) setDiscard(true); else setModal(null); };
    const change = patch => { setForm(previous => ({ ...previous, ...patch })); setDirty(true); };
    const blocked = Boolean(client?.doNotContact || config?.contactBlocked || history?.contactBlocked);
    const canSend = Boolean(config?.permissions?.canSend);
    const unresolved = history?.surveys?.some(survey => ['sending', 'uncertain'].includes(survey.delivery?.status));
    const save = async event => {
        event.preventDefault(); if (busy || !modal) return;
        const controller = new AbortController(); controllers.current.add(controller); setBusy(true); setFormError('');
        const kind = modal.kind;
        try {
            const path = kind === 'verify' ? `/api/admin/nps/surveys/${modal.survey._id}/verify` : kind === 'retry' ? `/api/admin/nps/surveys/${modal.survey._id}/retry` : `/api/admin/nps/${kind === 'manual' ? 'manual' : kind === 'link' ? 'generate' : 'send'}`;
            const body = kind === 'verify' ? { result: form.result, note: form.note } : kind === 'retry' ? { consentConfirmed: form.consentConfirmed } : { clientId, sellerId: form.sellerId, context: form.context, ...(kind === 'manual' ? { score: form.score, comment: form.comment, callDate: form.callDate } : { consentConfirmed: form.consentConfirmed }), idempotencyKey: requestKey.current };
            const result = await request(path, { method: kind === 'verify' ? 'PATCH' : 'POST', body: JSON.stringify(body) }, controller.signal);
            if (kind === 'link') { setPreparedUrl(result.url); setDirty(false); toast.success('Enlace preparado. No se envió ningún mensaje.'); }
            else { setModal(null); setDirty(false); toast.success(kind === 'manual' ? 'Respuesta NPS registrada' : kind === 'verify' ? 'Verificación registrada' : result.replayed ? 'Este envío ya estaba confirmado' : 'WhatsApp confirmó el envío'); if (result.warning) toast(result.warning, { duration: 8000 }); }
            await load(); if (kind !== 'link') onUpdated?.();
        } catch (failure) {
            if (failure.name !== 'AbortError') { setFormError(failure.message); if (kind !== 'manual') await load(); }
        } finally { controllers.current.delete(controller); if (!controller.signal.aborted && session.current === token) setBusy(false); }
    };
    if (!canRead && !canWrite) return null;
    return <section className="rounded-xl border border-crm-border bg-crm-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="m-0 text-sm font-semibold text-crm-fg">Satisfacción / NPS</h3><p className="mb-0 mt-1 text-xs text-crm-fg-muted">Respuestas de 0 a 10 e invitaciones de este cliente.</p></div><button type="button" onClick={load} disabled={loading} className={button} aria-label="Actualizar NPS"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button></div>
        {error && <p role="alert" className="text-xs text-crm-red">{error}<button type="button" onClick={load} className="ml-2 underline">Reintentar</button></p>}
        {blocked && <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-500">No contactar: se bloquean invitaciones y envíos. Podés registrar una respuesta que el cliente ya dio.</p>}
        {canWrite && <div className="my-3 flex flex-wrap gap-2"><button type="button" className={button} disabled={loading || !config} onClick={() => open('manual')}><ClipboardCheck size={13} />Cargar NPS manual</button>{canSend && <button type="button" className={button} disabled={loading || blocked || !config?.whatsapp?.available || unresolved} onClick={() => open('send')}><MessageCircle size={13} />Enviar por WhatsApp</button>}<button type="button" className={button} disabled={loading || blocked || !config} onClick={() => open('link')}><LinkIcon size={13} />Preparar enlace</button></div>}
        {canWrite && !blocked && config?.whatsapp?.reason && <p className="text-xs text-crm-fg-muted">{config.whatsapp.reason}</p>}
        {unresolved && <p className="text-xs text-amber-500">Hay un envío en proceso o sin confirmación. Revisá el historial antes de crear otra invitación.</p>}
        {loading && !history ? <p role="status" className="py-4 text-xs text-crm-fg-muted">Cargando NPS…</p> : !canRead ? <p className="text-xs text-crm-fg-muted">Consultar el historial requiere permiso de lectura de NPS.</p> : <>
            <dl className="my-3 grid grid-cols-3 gap-2 text-xs"><div className="rounded-lg border border-crm-border p-2"><dt className="text-crm-fg-muted">Respuestas</dt><dd className="m-0 mt-1 font-semibold">{history?.metrics?.total ?? 0}</dd></div><div className="rounded-lg border border-crm-border p-2"><dt className="text-crm-fg-muted">Promedio /10</dt><dd className="m-0 mt-1 font-semibold">{history?.metrics?.averageScore ?? '—'}</dd></div><div className="rounded-lg border border-crm-border p-2"><dt className="text-crm-fg-muted">NPS</dt><dd className="m-0 mt-1 font-semibold">{history?.metrics?.npsScore ?? '—'}</dd></div></dl>
            {!history?.surveys?.length ? <p className="text-xs text-crm-fg-muted">No hay respuestas ni invitaciones registradas para este cliente.</p> : <div className="space-y-2">{history.surveys.map(survey => <article key={survey._id} className="rounded-lg border border-crm-border bg-crm-bg/40 p-3 text-xs"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong>{npsContextLabel(survey.context)}</strong><p className="mb-0 mt-1 text-crm-fg-muted">{survey.seller?.name || 'Vendedor no disponible'} · {channelLabels[survey.channel]} · {stamp(survey.createdAt)}</p></div><span className="rounded-full border border-crm-border px-2 py-1">{survey.response ? `${survey.response.score}/10` : survey.channel === 'whatsapp' ? survey.delivery?.confirmationSource === 'manual' ? 'Envío verificado manualmente' : deliveryLabels[survey.delivery?.status] || 'Sin confirmar' : survey.status === 'expired' ? 'Vencida' : 'Sin respuesta'}</span></div>{survey.response?.comment && <p className="mb-0 mt-2 whitespace-pre-wrap break-words text-crm-fg-muted">{survey.response.comment}</p>}{survey.delivery?.errorMessage && <p className="mb-0 mt-2 text-amber-500">{survey.delivery.errorMessage}</p>}{survey.delivery?.verificationNote && <p className="mb-0 mt-2 text-crm-fg-muted">Verificación manual: {survey.delivery.verificationNote}</p>}{canSend && !survey.response && <div className="mt-2 flex flex-wrap gap-2">{survey.delivery?.status === 'failed' && <button type="button" className={button} disabled={blocked || loading} onClick={() => open('retry', survey)}>Reintentar mismo envío</button>}{survey.delivery?.status === 'uncertain' && <button type="button" className={button} onClick={() => open('verify', survey)}>Registrar verificación en WhatsApp</button>}</div>}</article>)}</div>}
            {history?.total > 100 && <p className="text-xs text-crm-fg-muted">Se muestran las últimas 100 invitaciones de {history.total}.</p>}
        </>}
        <CrmModal isOpen={Boolean(modal)} onClose={close} title={modal?.kind === 'manual' ? 'Cargar NPS manual' : modal?.kind === 'verify' ? 'Verificar resultado en WhatsApp' : modal?.kind === 'link' ? 'Preparar enlace de encuesta' : modal?.kind === 'retry' ? 'Reintentar el mismo envío' : 'Enviar encuesta por WhatsApp'} maxWidth="max-w-xl">
            <form onSubmit={save} className="space-y-3 p-4">
                <label className="block text-xs text-crm-fg-muted">Cliente<input readOnly value={client?.fullName || [client?.firstName, client?.lastName].filter(Boolean).join(' ') || 'Cliente de esta ficha'} className={field} /></label>
                {formError && <p role="alert" className="rounded-lg border border-crm-red/30 p-3 text-xs text-crm-red">{formError}</p>}
                {blocked && !['manual', 'verify'].includes(modal?.kind) && <p role="alert" className="text-xs text-amber-500">El cliente pidió no recibir contactos. No se generará ni enviará una invitación.</p>}
                {['send', 'retry'].includes(modal?.kind) && !config?.whatsapp?.available && <p role="status" className="text-xs text-crm-fg-muted">{config?.whatsapp?.reason || 'Actualizá la configuración antes de enviar.'}</p>}
                {discard && <div role="alert" className="rounded-lg border border-amber-500/30 p-3 text-xs"><p className="mt-0">Tenés cambios sin guardar.</p><div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => setDiscard(false)}>Seguir editando</button><button type="button" className={button} onClick={() => setModal(null)}>Descartar y cerrar</button></div></div>}
                {preparedUrl ? <><p className="text-xs text-crm-fg-muted">Enlace preparado. No se envió ningún mensaje. Vence en 7 días.</p><input readOnly value={preparedUrl} aria-label="Enlace NPS preparado" className={field} /><button type="button" className={button} onClick={async () => { try { await navigator.clipboard.writeText(preparedUrl); toast.success('Enlace copiado'); } catch { setFormError('No se pudo copiar. Seleccioná el enlace para copiarlo manualmente.'); } }}>Copiar enlace</button></> : modal?.kind === 'verify' ? <><p className="text-xs text-crm-fg-muted">Revisá la bandeja real de WhatsApp. Esta acción registra tu comprobación; no envía mensajes.</p><label className="block text-xs text-crm-fg-muted">Resultado comprobado<select required value={form.result} onChange={event => change({ result: event.target.value })} className={field}><option value="">Elegí lo que verificaste</option><option value="sent">La invitación sí fue enviada</option><option value="not_sent">La invitación no fue enviada</option></select></label><label className="block text-xs text-crm-fg-muted">Detalle de la comprobación<textarea required minLength={5} maxLength={1000} value={form.note} onChange={event => change({ note: event.target.value })} className={`${field} !h-20 py-2`} /></label></> : <>
                    <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-crm-fg-muted">Vendedor<select required disabled={busy || modal?.kind === 'retry'} value={form.sellerId} onChange={event => change({ sellerId: event.target.value })} className={field}><option value="">Elegí un vendedor</option>{modal?.survey?.seller?._id && !config?.sellers?.some(seller => seller._id === modal.survey.seller._id) && <option value={modal.survey.seller._id}>{modal.survey.seller.name || "Vendedor original"}</option>}{config?.sellers?.map(seller => <option key={seller._id} value={seller._id}>{seller.name}</option>)}</select></label><label className="text-xs text-crm-fg-muted">Contexto<select required disabled={busy || modal?.kind === 'retry'} value={form.context} onChange={event => change({ context: event.target.value })} className={field}><option value="">Elegí un contexto</option>{NPS_CONTEXTS.map(context => <option key={context.value} value={context.value}>{context.label}</option>)}</select></label></div>
                    {modal?.kind === 'manual' ? <><fieldset className="m-0 border-0 p-0"><legend className="mb-2 text-xs text-crm-fg-muted">Puntaje de 0 a 10</legend><div className="flex flex-wrap gap-1.5">{Array.from({ length: 11 }, (_, score) => <button key={score} type="button" aria-pressed={form.score === score} onClick={() => change({ score })} className={`${button} !h-9 !min-w-9 !px-2 ${form.score === score ? '!border-crm-red !bg-crm-red !text-white' : ''}`}>{score}</button>)}</div></fieldset><label className="block text-xs text-crm-fg-muted">Comentario<textarea maxLength={1000} value={form.comment} onChange={event => change({ comment: event.target.value })} className={`${field} !h-20 py-2`} /></label><label className="block text-xs text-crm-fg-muted">Fecha de respuesta<input type="date" required value={form.callDate} onChange={event => change({ callDate: event.target.value })} className={field} /></label><p className="text-xs text-crm-fg-muted">Registro interno de una respuesta recibida. No envía mensajes ni reactiva el contacto del cliente.</p></> : <><p className="text-xs text-crm-fg-muted">{modal?.kind === 'link' ? 'Se generará un enlace para compartir por tu cuenta. Esta acción no envía WhatsApp.' : 'La encuesta se enviará al teléfono registrado del cliente mediante la integración configurada. No se envía una puntuación en su nombre.'}</p><label className="flex items-start gap-2 text-xs text-crm-fg"><input type="checkbox" required checked={form.consentConfirmed} onChange={event => change({ consentConfirmed: event.target.checked })} className="mt-0.5 accent-crm-red" />Confirmo que el cliente autorizó recibir esta encuesta.</label></>}
                </>}
                <div className="flex flex-wrap justify-end gap-2 border-t border-crm-border pt-3"><button type="button" className={button} disabled={busy} onClick={close}>{preparedUrl ? 'Cerrar' : 'Cancelar'}</button>{!preparedUrl && <button type="submit" disabled={busy || modal?.kind === 'manual' && form.score === null || blocked && !['manual', 'verify'].includes(modal?.kind) || ['send', 'retry'].includes(modal?.kind) && !config?.whatsapp?.available} className={`${button} !border-crm-red !bg-crm-red !text-white`}>{busy ? 'Guardando…' : modal?.kind === 'manual' ? 'Guardar respuesta' : modal?.kind === 'verify' ? 'Guardar verificación' : modal?.kind === 'link' ? 'Preparar enlace' : 'Enviar cuestionario'}</button>}</div>
            </form>
        </CrmModal>
    </section>;
}
