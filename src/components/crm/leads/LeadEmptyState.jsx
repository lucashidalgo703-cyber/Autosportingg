import React from 'react';
import { Target } from 'lucide-react';

export default function LeadEmptyState({ hasFilters }) {
    return (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-surface px-6 py-16 text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-crm-border bg-crm-bg text-crm-fg-muted">
                <Target size={20} />
            </div>
            <h3 className="m-0 text-lg font-bold text-crm-fg">
                {hasFilters ? 'No se encontraron resultados' : 'No hay oportunidades registradas'}
            </h3>
            <p className="m-0 mt-2 max-w-md text-sm leading-6 text-crm-fg-muted">
                {hasFilters
                    ? 'Ajusta los filtros de busqueda para encontrar el lead que necesitas.'
                    : 'Las oportunidades provenientes de formularios web y WhatsApp apareceran automaticamente aca.'}
            </p>
        </div>
    );
}
