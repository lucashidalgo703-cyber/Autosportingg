"use client";
import { useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import { portalRequest } from './portalClient';
import styles from './PortalEmailNotificationStatus.module.css';

export default function PortalEmailNotificationStatus({ notification, endpoint, token, canRetry = false, audience = 'cliente', onChanged }) {
    const [override, setOverride] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const source = JSON.stringify([notification?.id, notification?.status, notification?.reason, notification?.sentAt, notification?.retryable]);
    const current = override?.endpoint === endpoint && override.source === source ? override.notification : notification;
    if (!current || current.status === 'not_needed') return null;
    const uncertain = ['delivery_uncertain', 'confirmation_pending'].includes(current.reason);
    const message = uncertain ? 'No se pudo confirmar la entrega. Revisá el correo antes de reenviar.' : {
        sent: 'Enviado.', pending: 'Pendiente de envío.', failed: 'No se pudo enviar. El cambio quedó guardado.',
        skipped: current.reason === 'admin_recipient_missing' ? 'Falta configurar el destinatario administrador.'
            : ['recipient_missing', 'recipient_inactive', 'buyer_missing'].includes(current.reason) ? 'Revisá el correo y la ficha del comprador.'
                : 'No se envió porque el destinatario o la operación ya no coincide con este aviso.'
    }[current.status] || 'Entrega pendiente de confirmación.';
    const retry = async () => {
        if (busy || !canRetry || !current.retryable || uncertain) return;
        setBusy(true); setError('');
        try {
            const result = await portalRequest(endpoint + '/retry', { token, method: 'POST', body: {} });
            setOverride({ endpoint, source, notification: result });
        } catch (err) { setError(err.message || 'No se pudo reintentar. Actualizá para consultar el estado del aviso.'); }
        finally { setBusy(false); try { await onChanged?.(); } catch {} }
    };
    return <div className={styles.notice} data-portal-email-notification data-email-status={current.status}>
        <p className={styles.message} role="status"><Mail size={16} aria-hidden="true"/><span>Aviso al {audience}: {message}</span></p>
        {canRetry && current.retryable && !uncertain && <button type="button" className={styles.retry} disabled={busy} onClick={() => { void retry(); }} aria-label={`Reintentar aviso al ${audience}`}><RefreshCw size={15} aria-hidden="true"/>{busy ? 'Reintentando…' : 'Reintentar aviso'}</button>}
        {error && <p className={styles.error} role="alert">{error}</p>}
    </div>;
}
