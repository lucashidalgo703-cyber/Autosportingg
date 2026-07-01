import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function ErrorState({
    title = 'Error',
    message = 'Ha ocurrido un error inesperado al cargar la información.',
    onRetry = null,
    className = ''
}) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center rounded-[var(--crm-radius)] border border-crm-red/20 bg-crm-red/5 ${className}`}>
            <AlertCircle size={42} className="mb-4 text-crm-red" />
            <h3 className="m-0 text-base font-bold text-crm-fg">{title}</h3>
            <p className="m-0 mt-2 max-w-md text-sm leading-6 text-crm-fg-muted">
                {message}
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="mt-6 appearance-none rounded-lg bg-crm-red hover:bg-crm-red-hover px-4 py-2 text-sm font-semibold text-white transition-colors"
                >
                    Reintentar
                </button>
            )}
        </div>
    );
}
