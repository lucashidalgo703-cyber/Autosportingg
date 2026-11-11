"use client";
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function VehicleDialogSurface({ title, subtitle, children, onClose, drawer = false, footer }) {
    const dialogRef = useRef(null);
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; }, [onClose]);
    useEffect(() => {
        const previous = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const dialog = dialogRef.current;
        const topmost = () => [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(element => element.getClientRects().length).at(-1) === dialog;
        const focusable = () => [...(dialog?.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || [])].filter(element => element.getClientRects().length);
        const keyboard = event => {
            if (!topmost()) return;
            if (event.key === 'Escape') { event.preventDefault(); closeRef.current?.(); }
            if (event.key !== 'Tab') return;
            const items = focusable();
            if (!items.length) { event.preventDefault(); dialog?.focus(); return; }
            if (event.shiftKey && (document.activeElement === items[0] || !dialog.contains(document.activeElement))) { event.preventDefault(); items.at(-1).focus(); }
            else if (!event.shiftKey && (document.activeElement === items.at(-1) || !dialog.contains(document.activeElement))) { event.preventDefault(); items[0].focus(); }
        };
        window.addEventListener('keydown', keyboard);
        focusable()[0]?.focus();
        return () => { window.removeEventListener('keydown', keyboard); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
    }, []);
    return <div className={`fixed inset-0 z-50 flex bg-black/75 ${drawer ? 'justify-end' : 'items-center justify-center p-2 sm:p-8'}`}>
        <button type="button" aria-label="Cerrar ficha del vehículo" onClick={onClose} className="absolute inset-0 border-0 bg-transparent" tabIndex={-1} />
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={`relative flex min-h-0 w-full flex-col overflow-hidden border border-crm-border bg-crm-surface shadow-2xl ${drawer ? 'h-full max-w-[440px] border-r-0' : 'h-[calc(100dvh-16px)] max-h-[calc(100dvh-16px)] max-w-[896px] rounded-2xl sm:h-[calc(100dvh-64px)] sm:max-h-[calc(100dvh-64px)]'}`}>
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-crm-border px-4 py-3"><div className="min-w-0"><h2 className="m-0 break-words text-base font-semibold leading-5 text-crm-fg">{title}</h2>{subtitle && <p className="m-0 mt-1 text-xs text-crm-fg-muted">{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="Cerrar ficha" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-crm-fg-muted hover:bg-crm-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red"><X size={18} /></button></div>
            <div className={drawer ? 'min-h-0 flex-1 overflow-y-auto' : 'flex min-h-0 flex-1 overflow-hidden'}>{children}</div>
            {footer && <div className="shrink-0 border-t border-crm-border px-4 py-3">{footer}</div>}
        </div>
    </div>;
}
