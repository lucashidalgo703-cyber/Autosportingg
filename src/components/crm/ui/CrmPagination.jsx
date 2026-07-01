import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CrmButton from './CrmButton';

export default function CrmPagination({ currentPage, totalPages, totalItems, onPageChange, limit = 20 }) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-crm-border bg-crm-surface p-4 sm:flex-row mt-4">
            <div className="text-xs text-crm-fg-muted">
                Mostrando <span className="font-semibold text-crm-fg">{Math.min((currentPage - 1) * limit + 1, totalItems)}</span> a{' '}
                <span className="font-semibold text-crm-fg">{Math.min(currentPage * limit, totalItems)}</span> de{' '}
                <span className="font-semibold text-crm-fg">{totalItems}</span> resultados
            </div>
            
            <div className="flex items-center gap-2">
                <CrmButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                >
                    <ChevronLeft size={16} />
                    <span>Anterior</span>
                </CrmButton>
                
                <span className="text-xs font-semibold text-crm-fg px-2">
                    Página {currentPage} de {totalPages}
                </span>
                
                <CrmButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                >
                    <span>Siguiente</span>
                    <ChevronRight size={16} />
                </CrmButton>
            </div>
        </div>
    );
}
