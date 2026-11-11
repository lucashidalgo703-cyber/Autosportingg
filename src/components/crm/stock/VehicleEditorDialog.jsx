"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';

export function useVehicleFormClose({ isOpen, onClose, busy = false, resetKey }) {
    const [dirty, setDirty] = useState(false);
    const [confirmingClose, setConfirmingClose] = useState(false);
    useEffect(() => { setDirty(false); setConfirmingClose(false); }, [isOpen, resetKey]);
    useEffect(() => {
        if (!isOpen || !dirty) return;
        const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [isOpen, dirty]);
    return {
        dirty,
        markDirty: () => setDirty(true),
        requestClose: () => {
            if (busy) return;
            if (dirty) setConfirmingClose(true);
            else onClose();
        },
        closeNotice: confirmingClose ? (
            <div role="alert" className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-crm-fg">
                <p className="m-0">Tenés cambios sin guardar.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setConfirmingClose(false)} className="rounded-lg border border-crm-border px-3 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red">Seguir editando</button>
                    <button type="button" onClick={onClose} className="rounded-lg bg-crm-red px-3 py-2 text-xs font-semibold text-white">Descartar cambios y cerrar</button>
                </div>
            </div>
        ) : null
    };
}

export function revealVehicleField(field, prefix) {
    const element = document.getElementById(`${prefix}-${field}`);
    if (!element) return;
    let ancestor = element.parentElement;
    while (ancestor) {
        if (ancestor.tagName === 'DETAILS') ancestor.open = true;
        ancestor = ancestor.parentElement;
    }
    requestAnimationFrame(() => { element.focus(); element.scrollIntoView({ block: 'center' }); });
}

export function VehicleFormErrors({ errors, prefix }) {
    const entries = Object.entries(errors || {});
    if (!entries.length) return null;
    return (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-crm-fg">
            <p className="mb-2 font-semibold">Revisá estos datos para guardar:</p>
            <ul className="m-0 list-inside list-disc space-y-1">
                {entries.map(([field, message]) => <li key={field}><button type="button" onClick={() => revealVehicleField(field, prefix)} className="text-left underline underline-offset-2">{message}</button></li>)}
            </ul>
        </div>
    );
}

export function VehicleFormSection({ title, children, initiallyOpen = false, id }) {
    return (
        <details id={id} open={initiallyOpen || undefined} className="group rounded-xl border border-crm-border bg-crm-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-crm-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red">
                {title}<ChevronDown size={16} className="shrink-0 text-crm-fg-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-crm-border p-4">{children}</div>
        </details>
    );
}

export default function VehicleEditorDialog({ isOpen, onClose, title, subtitle, footer, children, busy = false, suspendKeyboard = false, closeLabel = 'Cerrar formulario de vehículo' }) {
    const panel = useRef(null);
    const titleId = useId();
    const subtitleId = useId();
    const onCloseRef = useRef(onClose);
    const interactionRef = useRef({busy, suspendKeyboard});
    onCloseRef.current = onClose;
    interactionRef.current = {busy, suspendKeyboard};
    useEffect(() => {
        if (!isOpen) return;
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const focusable = () => Array.from(panel.current?.querySelectorAll('button, a[href], input, select, textarea, summary, [tabindex="0"]') || []).filter(el => !el.matches(':disabled') && el.getClientRects().length > 0);
        const frame = requestAnimationFrame(() => focusable()[0]?.focus());
        const keydown = (event) => {
            const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
            if (interactionRef.current.suspendKeyboard || dialogs[dialogs.length - 1] !== panel.current) return;
            if (event.key === 'Escape') { event.preventDefault(); if (!interactionRef.current.busy) onCloseRef.current?.(); }
            if (event.key !== 'Tab') return;
            const elements = focusable();
            if (!elements.length) { event.preventDefault(); panel.current?.focus(); return; }
            const first = elements[0], last = elements[elements.length - 1];
            if (event.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', keydown);
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('keydown', keydown);
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [isOpen]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-0 backdrop-blur-sm md:p-5">
            <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitle ? subtitleId : undefined} aria-busy={busy || undefined} tabIndex={-1} className="flex h-dvh max-h-dvh w-full max-w-4xl flex-col overflow-hidden border-crm-border bg-crm-surface text-crm-fg shadow-2xl md:h-auto md:max-h-[calc(100dvh-64px)] md:rounded-2xl md:border">
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-crm-border px-4 py-3 sm:px-5">
                    <div className="min-w-0"><h2 id={titleId} className="m-0 text-base font-semibold leading-5 text-crm-fg">{title}</h2>{subtitle && <p id={subtitleId} className="mb-0 mt-1 text-xs leading-5 text-crm-fg-muted">{subtitle}</p>}</div>
                    <button type="button" aria-label={closeLabel} disabled={busy} onClick={onClose} className="-mr-1 shrink-0 rounded-lg p-2 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg disabled:opacity-40"><X size={18} /></button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar" onInvalidCapture={event => { let ancestor = event.target.parentElement; while (ancestor && ancestor !== panel.current) { if (ancestor.tagName === 'DETAILS') ancestor.open = true; ancestor = ancestor.parentElement; } }}>{children}</div>
                {footer && <footer className="shrink-0 border-t border-crm-border bg-crm-surface px-4 py-3 sm:px-5">{footer}</footer>}
            </div>
        </div>
    );
}
