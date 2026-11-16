"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../utils/adminPermissions';
import { portalRequest } from './portalClient';

export default function BuyerDocumentNotificationStatus({ documentId }) {
    const { token, user } = useAuth();
    const [open, setOpen] = useState(false);
    const [notice, setNotice] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const url = '/api/admin/buyer-portal/documents/' + encodeURIComponent(documentId) + '/notification';
    useEffect(() => {
        if (!open || !token) return;
        let active = true;
        portalRequest(url, { token }).then(result => { if (active) setNotice(result); })
            .catch(() => { if (active) setError('No se pudo consultar el aviso.'); });
        return () => { active = false; };
    }, [open, token, url]);
    const retry = async () => {
        setBusy(true); setError('');
        try { setNotice(await portalRequest(url + '/retry', { method: 'POST', body: {}, token })); }
        catch { setError('No se pudo reintentar el aviso. Volvé a consultar su estado.'); }
        finally { setBusy(false); }
    };
    const uncertain = notice?.reason === 'delivery_uncertain' || notice?.reason === 'confirmation_pending';
    const message = uncertain ? 'La entrega del aviso está por confirmar.' : {
        sent: 'Aviso de carga enviado al administrador.', pending: 'Aviso de carga pendiente.',
        failed: 'El aviso de carga no se pudo enviar.', skipped: 'El aviso de este archivo no se envió.',
        not_needed: 'Este archivo no tiene un aviso registrado.'
    }[notice?.status] || 'Consultando aviso…';
    return <details className="text-xs text-neutral-400" open={open} onToggle={event => setOpen(event.currentTarget.open)} data-document-mail-status>
        <summary className="min-h-9 cursor-pointer py-2">Aviso por correo al administrador</summary>
        <div className="space-y-2 pb-2"><p role="status">{message}</p>
            {notice?.retryable && hasPermission(user, PERMISSIONS.GESTORIA_WRITE) && <button type="button" disabled={busy} onClick={retry} className="min-h-10 rounded-lg border border-solid border-neutral-600 px-3 text-neutral-200 disabled:opacity-50">{busy ? 'Reintentando…' : 'Reintentar aviso de carga'}</button>}
            {error && <p role="alert" className="text-amber-200">{error}</p>}
        </div>
    </details>;
}
