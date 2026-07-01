import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function CrmModal({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'max-w-2xl',
    hideCloseButton = false,
    footer
}) {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div
                className={`bg-crm-surface w-full ${maxWidth} rounded-[var(--crm-radius)] border border-crm-border shadow-[var(--crm-shadow-card)] flex flex-col max-h-[90dvh] overflow-hidden`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 sm:p-5 border-b border-crm-border bg-crm-bg/50">
                    <h2 className="m-0 text-lg sm:text-xl font-bold text-crm-fg tracking-tight">{title}</h2>
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
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-crm-surface">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-4 border-t border-crm-border bg-crm-surface/50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
