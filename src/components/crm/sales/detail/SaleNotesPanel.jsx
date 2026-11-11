import React, { useState, useEffect } from 'react';
import { AlignLeft, Save } from 'lucide-react';

export default function SaleNotesPanel({ sale, onSave, onCreateTask }) {
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (sale) {
            setNotes(sale.notes || '');
            setHasChanges(false);
        }
    }, [sale]);

    const handleChange = (e) => {
        setNotes(e.target.value);
        setHasChanges(e.target.value !== (sale?.notes || ''));
    };

    const handleSaveClick = async () => {
        setIsSaving(true);
        try {
            await onSave({ notes });
            setHasChanges(false);
        } catch (error) {
            console.error('Error saving notes', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!sale) return null;

    return (
        <div className="min-w-0 overflow-hidden rounded-2xl border border-crm-border bg-crm-surface shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-crm-border bg-crm-surface-raised/50 p-4">
                <div className="flex items-center gap-2">
                    <AlignLeft size={16} className="text-blue-500" />
                    <h3 className="m-0 text-sm font-semibold text-crm-fg">Notas Comerciales</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {onCreateTask && (
                        <button
                            onClick={onCreateTask}
                            className="h-8 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-bold text-xs flex items-center justify-center transition-colors"
                        >
                            Crear seguimiento
                        </button>
                    )}
                {hasChanges && (
                    <button 
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className="h-8 px-3 rounded-lg bg-crm-red hover:bg-crm-red-hover text-white font-bold text-xs flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 flex-none gap-2"
                    >
                        {isSaving ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={14} />
                        )}
                        Guardar
                    </button>
                )}
                </div>
            </div>
            
            <div className="space-y-3 p-4">
                <textarea
                    rows={4}
                    value={notes}
                    onChange={handleChange}
                    placeholder="Escribe notas operativas o recordatorios comerciales aquí..."
                    className="min-h-[112px] w-full resize-y rounded-xl border border-crm-border bg-crm-surface-raised/40 p-3 text-sm leading-5 text-crm-fg outline-none transition-colors placeholder:text-crm-fg-muted focus:border-crm-red/50 custom-scrollbar"
                ></textarea>
                <p className="m-0 flex flex-wrap items-center justify-between gap-2 text-[11px] leading-4 text-crm-fg-muted">
                    <span>Estas notas son visibles para todo el equipo comercial.</span>
                    {hasChanges && <span className="text-blue-400">Hay cambios sin guardar</span>}
                </p>
            </div>
        </div>
    );
}
