import React from 'react';
import { Target } from 'lucide-react';

export default function LeadEmptyState({ hasFilters }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-black/20 rounded-xl border-2 border-dashed border-neutral-800">
            <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-4">
                <Target size={32} className="text-neutral-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
                {hasFilters ? 'No se encontraron resultados' : 'No hay oportunidades registradas'}
            </h3>
            <p className="text-neutral-400 text-center max-w-md">
                {hasFilters 
                    ? 'Intenta ajustar los filtros de búsqueda para encontrar lo que necesitas.' 
                    : 'Todavía no hay oportunidades registradas. Las oportunidades provenientes de formularios web y WhatsApp aparecerán aquí automáticamente.'}
            </p>
        </div>
    );
}
