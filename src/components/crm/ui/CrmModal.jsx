import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function CrmModal({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'max-w-2xl',
    hideCloseButton = false,
    fullScreenOnMobile = false,
    fullHeightOnDesktop = false,
    bodyClassName = '',
    footer
}) {
    const modalRef = useRef(null);
    const titleId = useId();
    const previousFocusRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        const focusable = () => Array.from(modalRef.current?.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])') || []).filter(element => !element.matches(':disabled') && element.getClientRects().length > 0);
        const isTopDialog = () => { const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]'); return dialogs[dialogs.length - 1] === modalRef.current; };
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isTopDialog()) {
                e.preventDefault();
                onCloseRef.current?.();
            }
        };

        const handleTab = (e) => {
            if (e.key !== 'Tab' || !modalRef.current || !isTopDialog()) return;
            
            const focusableElements = focusable();
            if (!focusableElements.length) { e.preventDefault(); modalRef.current.focus(); return; }
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
                    lastElement?.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
                    firstElement?.focus();
                    e.preventDefault();
                }
            }
        };

        previousFocusRef.current = document.activeElement;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEscape);
        window.addEventListener('keydown', handleTab);
        const frame = requestAnimationFrame(() => (focusable()[0] || modalRef.current)?.focus());

        return () => {
            cancelAnimationFrame(frame);
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleEscape);
            window.removeEventListener('keydown', handleTab);
            if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const desktopFrame = fullHeightOnDesktop
        ? 'sm:h-auto sm:max-h-[calc(100dvh-64px)] sm:rounded-[16px]'
        : 'sm:h-auto sm:max-h-[90dvh] sm:rounded-[var(--crm-radius)]';

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${fullScreenOnMobile ? 'p-0 sm:p-6' : 'p-4 sm:p-6'} bg-black/80 backdrop-blur-sm animate-fade-in`}>
            <div
                ref={modalRef}
                tabIndex="-1"
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                className={`bg-crm-surface w-full ${maxWidth} ${fullScreenOnMobile ? `h-[100dvh] max-h-[100dvh] rounded-none border-0 ${desktopFrame} sm:border` : `max-h-[90dvh] rounded-[var(--crm-radius)] border ${fullHeightOnDesktop ? desktopFrame : ''}`} border-crm-border shadow-[var(--crm-shadow-card)] flex flex-col overflow-hidden`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex shrink-0 justify-between items-center p-4 sm:p-5 border-b border-crm-border bg-crm-bg/50">
                    <h2 id={titleId} className="m-0 text-base font-semibold text-crm-fg leading-5">{title}</h2>
                    {!hideCloseButton && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 -mr-2 text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface-raised rounded-lg transition-colors flex items-center justify-center"
                            aria-label="Cerrar modal"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Body (scrollable) */}
                <div className={`min-h-0 flex-1 overflow-y-auto custom-scrollbar bg-crm-surface ${bodyClassName}`}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="shrink-0 p-4 border-t border-crm-border bg-crm-surface/50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
