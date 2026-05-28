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
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-[#1E1E24]">
                <div className="flex items-center gap-2">
                    <AlignLeft size={16} className="text-blue-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Notas Comerciales</h3>
                </div>
                <div className="flex gap-2 items-center">
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
                        className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 flex-none gap-2"
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
            
            <div className="p-4 flex-1 flex flex-col">
                <textarea
                    value={notes}
                    onChange={handleChange}
                    placeholder="Escribe notas operativas o recordatorios comerciales aquí..."
                    className="flex-1 w-full bg-black/30 border border-neutral-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors resize-none custom-scrollbar min-h-[150px]"
                ></textarea>
                <p className="text-[10px] text-neutral-500 mt-3 flex items-center justify-between">
                    <span>Estas notas son visibles para todo el equipo comercial.</span>
                    {hasChanges && <span className="text-blue-400">Hay cambios sin guardar</span>}
                </p>
            </div>
        </div>
    );
}
