"use client";
import { Mail, RefreshCw } from 'lucide-react';

const reasons = {
    recipient_missing: 'El comprador no tiene un correo válido registrado.',
    recipient_inactive: 'El comprador no está activo; el aviso no se envió.',
    sale_unavailable: 'La venta vinculada ya no está disponible para este aviso.',
    procedure_changed: 'Cambió la vinculación del trámite; este aviso no se envió.',
    superseded: 'Este aviso fue reemplazado por un cambio de estado más reciente.',
    portal_changed: 'Cambió el acceso del portal; este aviso no se envió.',
    preparation_failed: 'No se pudo preparar el aviso por correo.',
    delivery_failed: 'Falló el envío por correo.',
    recipient_changed: 'Cambió el comprador o su correo; este aviso no se envió.',
    delivery_uncertain: 'No se pudo confirmar el envío; revisá antes de reenviar.',
    confirmation_pending: 'El aviso está guardado, pero falta confirmar el resultado del envío.'
};

export default function GestoriaStatusEmailNotice({ notification, retrying, retryError, onRetry, historical = false }) {
    if (!notification || notification.status === 'not_needed') return null;
    const sent = notification.status === 'sent';
    const failed = notification.status === 'failed';
    const skipped = notification.status === 'skipped';
    const unconfirmed = ['delivery_uncertain', 'confirmation_pending'].includes(notification.reason);
    const message = unconfirmed ? (historical ? 'El resultado del último aviso de este trámite está por confirmar.' : 'El estado quedó actualizado; el resultado del aviso está por confirmar.')
        : historical ? (sent ? 'Último aviso de este trámite: enviado al cliente.'
        : failed ? 'El último aviso de este trámite no se pudo enviar.'
        : skipped ? 'El último cambio de estado no generó un envío al cliente.'
        : 'El último aviso de este trámite está pendiente de envío.') : sent ? 'Estado actualizado y aviso enviado al cliente.'
        : failed ? 'El estado quedó actualizado, pero no se pudo enviar el aviso al cliente.'
        : skipped ? 'El estado quedó actualizado. El aviso no se envió.'
        : 'El estado quedó actualizado y el aviso al cliente está pendiente de envío.';
    const detail = reasons[notification.reason];
    return <section role="status" aria-live="polite" aria-label="Aviso por correo del trámite" className={`min-w-0 space-y-3 rounded-xl border border-solid p-4 ${sent ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`} data-gestoria-email-notice>
        <p className={`flex items-start gap-2 text-sm font-semibold ${sent ? 'text-emerald-300' : 'text-amber-200'}`}><Mail size={18} className="mt-0.5 shrink-0"/><span>{message}</span></p>
        {detail && <p className="text-sm text-crm-fg-muted">{detail}</p>}
        {(failed || notification.status === 'pending') && notification.retryable !== false && notification.id && onRetry && <button type="button" onClick={onRetry} disabled={retrying} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-solid border-crm-border bg-crm-surface px-3 text-sm font-semibold text-crm-fg disabled:opacity-50"><RefreshCw size={15} className={retrying ? 'animate-spin motion-reduce:animate-none' : ''}/>{retrying ? 'Reintentando aviso…' : 'Reintentar aviso'}</button>}
        {retryError && <p role="alert" className="text-sm text-red-300">{retryError}</p>}
    </section>;
}
