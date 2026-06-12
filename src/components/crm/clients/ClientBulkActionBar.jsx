import React from 'react';
import { Download } from 'lucide-react';
import CrmButton from '../ui/CrmButton';

export default function ClientBulkActionBar({ selectedIds, onClearSelection, onExport }) {
    if (!selectedIds || selectedIds.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-crm-surface border border-crm-border shadow-2xl rounded-2xl p-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="flex items-center gap-3 px-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-crm-red/20 text-crm-red text-xs font-bold">
                    {selectedIds.length}
                </div>
                <span className="text-sm font-bold text-white">
                    {selectedIds.length === 1 ? 'Cliente seleccionado' : 'Clientes seleccionados'}
                </span>
            </div>

            <div className="h-8 w-px bg-crm-border"></div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onExport}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-white bg-crm-surface-raised hover:bg-crm-border rounded-xl transition-colors"
                >
                    <Download size={16} />
                    Exportar XLSX
                </button>
                <button
                    onClick={onClearSelection}
                    className="px-3 py-1.5 text-sm font-bold text-crm-fg-muted hover:text-white transition-colors"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}
