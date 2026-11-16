"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Eye, Link2, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../utils/adminPermissions';
import BuyerPortalView from './BuyerPortalView';
import { portalDate, portalRequest } from './portalClient';

export default function BuyerPortalPanel({ sale }) {
    const { token, user } = useAuth();
    const canWrite = hasPermission(user, PERMISSIONS.VENTAS_WRITE);
    const canReadProcedures = hasPermission(user, PERMISSIONS.GESTORIA_READ);
    const base = '/api/admin/buyer-portal/sales/' + sale._id;
    const [configuration, setConfiguration] = useState(null);
    const [mode, setMode] = useState(sale.tradeIns?.length ? 'with_trade_in' : 'without_trade_in');
    const [days, setDays] = useState('30');
    const [tracking, setTracking] = useState({ latestUpdate: '', nextStep: '', actionRequired: false });
    const [previewOpen, setPreviewOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true); setError('');
        try {
            const result = await portalRequest(base, { token });
            setConfiguration(result);
            setMode(result.mode || (sale.tradeIns?.length ? 'with_trade_in' : 'without_trade_in'));
            setTracking({ latestUpdate: result.preview?.latestUpdate || '', nextStep: result.preview?.nextStep || '', actionRequired: Boolean(result.preview?.actionRequired) });
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, [token, base, sale.tradeIns?.length]);
    useEffect(() => { void load(); }, [load]);
    useEffect(() => {
        if (!previewOpen) return;
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const close = event => {
            if (event.key === 'Escape') setPreviewOpen(false);
            if (event.key !== 'Tab') return;
            const controls = [...document.querySelectorAll('[data-buyer-portal-preview] a[href], [data-buyer-portal-preview] button:not([disabled]), [data-buyer-portal-preview] input:not([disabled]), [data-buyer-portal-preview] select:not([disabled]), [data-buyer-portal-preview] textarea:not([disabled])')].filter(element => element.offsetParent !== null);
            const first = controls[0], last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        };
        document.addEventListener('keydown', close);
        return () => { document.removeEventListener('keydown', close); document.body.style.overflow = previousOverflow; previousFocus?.focus?.(); };
    }, [previewOpen]);
    const mutate = async (action, method, body, suffix = '') => {
        setBusy(action); setError(''); setNotice('');
        try {
            const result = await portalRequest(base + suffix, { token, method, body });
            await load();
            setNotice(action === 'revoke' ? 'El enlace y los accesos anteriores quedaron revocados.' : action === 'tracking' ? 'Novedad visible actualizada en la venta.' : 'Enlace privado listo para compartir.');
            return result;
        } catch (err) { setError(err.message); }
        finally { setBusy(''); }
    };
    const requestAccess = useCallback(id => portalRequest('/api/admin/buyer-portal/documents/' + encodeURIComponent(id) + '/access', { token, method: 'POST', body: {} }), [token]);
    const portalUrl = configuration?.url && typeof window !== 'undefined' ? new URL(configuration.url, window.location.origin).href : '';
    const copy = async () => {
        setError(''); setNotice('');
        try { await navigator.clipboard.writeText(portalUrl); setNotice('Enlace privado copiado.'); }
        catch { setError('Seleccioná el enlace de abajo y copialo para compartirlo.'); }
    };
    const phone = String(sale.clientId?.phone || '').replace(/\D/g, '');
    const share = 'https://wa.me/' + phone + '?text=' + encodeURIComponent('Hola, este es tu portal privado de AutoSporting. Verificá tu correo para consultar el avance de tu compra: ' + portalUrl);
    const procedureStatus = String(configuration?.preview?.procedureStatus || sale.expedienteStatus || 'pendiente').replace(/_/g, ' ');
    return <section className="min-w-0 space-y-5 rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5" aria-label="Portal del cliente">
        <header className="space-y-2"><h2 className="flex items-center gap-2 text-lg font-bold text-crm-fg"><Link2 size={19} className="text-crm-red"/>Portal del cliente</h2><p className="text-sm text-crm-fg-muted">Un solo enlace privado por operación. La vista del comprador muestra el seguimiento de Venta y Gestoría y, cuando corresponde, los documentos del vehículo en toma.</p></header>
        {loading && !configuration && <p role="status" className="text-sm text-crm-fg-muted">Preparando portal…</p>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
        <div className="grid gap-4 md:grid-cols-2"><fieldset disabled={!canWrite || Boolean(busy)} className="space-y-2"><legend className="mb-2 text-sm font-semibold text-crm-fg">Modalidad del portal</legend><div className="flex flex-wrap gap-2">{[['with_trade_in', 'Con toma'], ['without_trade_in', 'Sin toma']].map(([value, label]) => <label key={value} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm ${mode === value ? 'border-crm-red bg-crm-red/10 text-crm-fg' : 'border-crm-border text-crm-fg-muted'}`}><input type="radio" name={'buyer-portal-mode-' + sale._id} value={value} checked={mode === value} disabled={value === 'with_trade_in' && !sale.tradeIns?.length} onChange={() => setMode(value)}/>{label}</label>)}</div><p className="text-xs text-crm-fg-muted">{mode === 'with_trade_in' ? 'Seguimiento y legajo del vehículo entregado en parte de pago.' : 'Únicamente seguimiento. Este enlace no da acceso a documentos de tomas.'}</p></fieldset><label className="block space-y-2 text-sm font-semibold text-crm-fg">Vencimiento del enlace<select value={days} onChange={event => setDays(event.target.value)} disabled={!canWrite || Boolean(busy)} className="min-h-11 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg"><option value="7">7 días</option><option value="15">15 días</option><option value="30">30 días</option></select></label></div>
        {configuration && !configuration.canVerify && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">Completá el correo registrado del comprador para habilitar la verificación del portal.{sale.clientId?._id && <> <Link href={'/admin/clientes/' + sale.clientId._id} className="underline">Abrir ficha del cliente</Link>.</>}</p>}
        {configuration?.canVerify && <p className="inline-flex items-center gap-2 text-xs text-crm-fg-muted"><ShieldCheck size={15}/>Verificación por correo: {configuration.maskedDestination}</p>}
        <div className="flex flex-wrap gap-2">{canWrite && <button type="button" onClick={() => mutate('enable', 'PUT', { mode, days: Number(days) })} disabled={Boolean(busy) || !configuration?.canVerify || sale.status === 'cancelada'} className="min-h-11 rounded-xl bg-crm-red px-4 text-sm font-bold text-white disabled:opacity-50">{busy === 'enable' ? 'Guardando…' : configuration?.enabled ? 'Actualizar acceso' : 'Habilitar enlace privado'}</button>}<button type="button" onClick={() => setPreviewOpen(true)} disabled={!configuration?.preview} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-crm-border px-4 text-sm font-semibold text-crm-fg disabled:opacity-50"><Eye size={16}/>Ver como cliente</button></div>
        {configuration?.enabled && configuration.url && <div className="space-y-3 rounded-xl border border-crm-border bg-crm-bg p-3"><label className="block space-y-1 text-xs text-crm-fg-muted">Enlace privado del comprador<input readOnly value={portalUrl} onFocus={event => event.target.select()} className="min-h-11 w-full rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg"/></label><p className="text-xs text-crm-fg-muted">Vence: {portalDate(configuration.expiresAt)}. Cada acceso a documentación requiere verificar el correo registrado.</p><div className="flex flex-wrap gap-2"><button type="button" onClick={copy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-crm-border px-3 text-xs font-semibold text-crm-fg"><Copy size={14}/>Copiar enlace privado</button><a href={share} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-500/30 px-3 text-xs font-semibold text-emerald-300"><MessageCircle size={14}/>Compartir por WhatsApp</a>{canWrite && <button type="button" disabled={Boolean(busy)} onClick={() => mutate('revoke', 'DELETE')} className="min-h-10 rounded-lg border border-red-500/30 px-3 text-xs font-semibold text-red-300 disabled:opacity-50">{busy === 'revoke' ? 'Revocando…' : 'Revocar enlace'}</button>}</div></div>}
        <section className="space-y-3 rounded-xl border border-crm-border bg-crm-bg p-4" aria-label="Dónde editar el estado del trámite">
            <h3 className="text-sm font-bold text-crm-fg">Estado del trámite: {procedureStatus.charAt(0).toUpperCase() + procedureStatus.slice(1)}</h3>
            <p className="text-sm text-crm-fg-muted">Se edita en Gestoría: abrí el trámite vinculado a esta venta con el lápiz, cambiá «Estado del Trámite» y presioná «Guardar Trámite».</p>
            <p className="text-xs text-crm-fg-muted">Si todavía no tiene un trámite, crealo con «Nuevo Trámite» y seleccioná esta venta en «Vincular Expediente (Venta)». Hasta entonces, el portal muestra el estado del expediente comercial.</p>
            {canReadProcedures ? <Link href="/admin/gestoria" className="inline-flex min-h-11 items-center rounded-xl border border-crm-border px-4 text-sm font-semibold text-crm-fg">Abrir Gestoría</Link> : <p className="text-xs text-crm-fg-muted">Pedile a una cuenta con permisos de Gestoría que actualice el trámite.</p>}
        </section>
        <form className="space-y-3 border-t border-crm-border pt-4" onSubmit={event => { event.preventDefault(); void mutate('tracking', 'PATCH', tracking, '/tracking'); }}><h3 className="text-sm font-bold text-crm-fg">Información visible para el comprador</h3><p className="text-xs text-crm-fg-muted">Los estados se consultan directamente desde Venta y Gestoría. Estos mensajes se guardan en esta misma venta.</p><fieldset disabled={!canWrite || Boolean(busy)} className="space-y-3"><label className="block space-y-1 text-sm text-crm-fg-muted">Última novedad visible<textarea maxLength={1000} value={tracking.latestUpdate} onChange={event => setTracking(previous => ({ ...previous, latestUpdate: event.target.value }))} className="min-h-20 w-full rounded-xl border border-crm-border bg-crm-bg p-3 text-sm text-crm-fg"/></label><label className="block space-y-1 text-sm text-crm-fg-muted">Próximo paso<textarea maxLength={1000} value={tracking.nextStep} onChange={event => setTracking(previous => ({ ...previous, nextStep: event.target.value }))} className="min-h-20 w-full rounded-xl border border-crm-border bg-crm-bg p-3 text-sm text-crm-fg"/></label><label className="flex min-h-10 items-center gap-2 text-sm text-crm-fg"><input type="checkbox" checked={tracking.actionRequired} onChange={event => setTracking(previous => ({ ...previous, actionRequired: event.target.checked }))}/>El comprador tiene una acción pendiente</label><button type="submit" className="min-h-11 rounded-xl border border-crm-border px-4 text-sm font-semibold text-crm-fg disabled:opacity-50">{busy === 'tracking' ? 'Guardando…' : 'Guardar novedad visible'}</button></fieldset></form>
        {previewOpen && configuration?.preview && <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/90 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Vista previa del portal del cliente" data-buyer-portal-preview><div className="mx-auto w-full max-w-3xl"><div className="sticky top-0 z-10 mb-2 flex items-center justify-between gap-3 rounded-xl border border-neutral-700 bg-neutral-900 p-3"><p className="text-sm font-bold text-white">Vista del comprador · {configuration.preview.mode === 'with_trade_in' ? 'Con toma' : 'Sin toma'}</p><button type="button" autoFocus onClick={() => setPreviewOpen(false)} aria-label="Cerrar vista previa del portal" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-neutral-700 text-white"><X size={19}/></button></div><BuyerPortalView data={configuration.preview} preview requestAccess={requestAccess}/></div></div>}
    </section>;
}
