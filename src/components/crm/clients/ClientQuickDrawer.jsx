"use client";
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { ClientWorkspaceBody } from './ClientDetailWorkspace';

export default function ClientQuickDrawer({ isOpen, clientId, onClose, onUpdated, onOpenFull, onEdit }) {
    const { token } = useAuth();
    const dialog = useRef(null);
    const close = useRef(onClose); close.current = onClose;
    const titleId = useId();
    const [heading, setHeading] = useState({ token: null, clientId: null, name: '' });
    const loaded = useCallback(client => setHeading({ token, clientId, name: client.fullName || 'Cliente' }), [token, clientId]);
    const title = heading.token === token && heading.clientId === clientId ? heading.name : 'Cliente';
    useEffect(() => {
        if (!isOpen) return;
        const priorFocus = document.activeElement;
        const priorOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const focusable = () => Array.from(dialog.current?.querySelectorAll('button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])') || []).filter(element => !element.matches(':disabled') && element.getClientRects().length);
        const topDialog = () => { const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]'); return dialogs[dialogs.length - 1] === dialog.current; };
        const handleKey = event => {
            if (!topDialog()) return;
            if (event.key === 'Escape') { event.preventDefault(); close.current?.(); }
            if (event.key !== 'Tab') return;
            const elements = focusable(), first = elements[0], last = elements[elements.length - 1];
            if (!elements.length) { event.preventDefault(); dialog.current?.focus(); }
            else if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && (document.activeElement === last || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
        };
        window.addEventListener('keydown', handleKey);
        const frame = requestAnimationFrame(() => (focusable()[0] || dialog.current)?.focus());
        return () => {
            cancelAnimationFrame(frame); window.removeEventListener('keydown', handleKey);
            document.body.style.overflow = priorOverflow;
            if (priorFocus?.isConnected) priorFocus.focus();
        };
    }, [isOpen]);
    if (!isOpen) return null;
    return <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
        <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="flex h-[100dvh] w-full max-w-[448px] flex-col border-l border-crm-border bg-crm-surface shadow-2xl outline-none">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-crm-border px-4 py-3"><h2 id={titleId} className="m-0 min-w-0 break-words text-base font-semibold leading-5 text-crm-fg">{title}</h2><button type="button" aria-label="Cerrar resumen del cliente" onClick={onClose} className="shrink-0 rounded-lg p-2 text-crm-fg-muted hover:bg-crm-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red"><X size={18} /></button></header>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden"><ClientWorkspaceBody key={`${token}:${clientId}`} clientId={clientId} compact onUpdated={onUpdated} onOpenFull={onOpenFull} onEdit={onEdit} onClientLoaded={loaded} onRemoved={onClose} /></div>
        </section>
    </div>;
}
