import React, { useState, useEffect } from 'react';
import { CheckSquare, Save, AlertTriangle } from 'lucide-react';

const DEFAULT_DOC_CHECKLIST = [
    { key: 'dni', label: 'DNI / datos del comprador verificados' },
    { key: 'boleto', label: 'Boleto / formulario interno preparado' },
    { key: 'informe', label: 'Informe de dominio revisado' },
    { key: 'libre_deuda', label: 'Libre deuda / infracciones revisadas' },
    { key: 'doc_vehiculo', label: 'Documentación del vehículo controlada' },
    { key: 'seguro', label: 'Seguro coordinado' },
    { key: 'transferencia', label: 'Transferencia iniciada' }
];

const DEFAULT_DELIVERY_CHECKLIST = [
    { key: 'lavado', label: 'Lavado / preparación estética' },
    { key: 'revision', label: 'Revisión visual final' },
    { key: 'llaves', label: 'Segunda llave / manuales verificados' },
    { key: 'accesorios', label: 'Accesorios y pertenencias controladas' },
    { key: 'fotos', label: 'Fotos de entrega tomadas' },
    { key: 'obsequio', label: 'Obsequio entregado' },
    { key: 'informado', label: 'Cliente informado sobre próximos pasos' }
];

export default function SaleChecklistPanel({ sale, type, onSave }) {
    const [checklist, setChecklist] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [saveError, setSaveError] = useState(null);

    const isDoc = type === 'documentation';
    const title = isDoc ? 'Checklist Documental' : 'Checklist de Entrega';
    const fieldName = isDoc ? 'documentationChecklist' : 'deliveryChecklist';

    useEffect(() => {
        if (!sale) return;
        
        let currentList = sale[fieldName];
        if (!Array.isArray(currentList) || currentList.length === 0) {
            // Seed defaults if empty
            currentList = (isDoc ? DEFAULT_DOC_CHECKLIST : DEFAULT_DELIVERY_CHECKLIST).map(item => ({
                ...item,
                completed: false,
                completedAt: null,
                completedBy: null
            }));
        }
        setChecklist(currentList);
        setHasChanges(false);
    }, [sale, fieldName, isDoc]);

    const handleToggle = (key) => {
        if (sale.status === 'cancelada') return;
        setChecklist(prev => prev.map(item => {
            if (item.key === key) {
                const nowCompleted = !item.completed;
                return {
                    ...item,
                    completed: nowCompleted,
                    completedAt: nowCompleted ? new Date().toISOString() : null,
                    completedBy: nowCompleted ? 'Usuario Actual' : null // Assuming current user in backend
                };
            }
            return item;
        }));
        setHasChanges(true);
    };

    const handleSaveClick = async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            await onSave({ [fieldName]: checklist });
            setHasChanges(false);
        } catch (error) {
            console.error('Error saving checklist', error);
            setSaveError(error.message || 'Error al guardar el checklist');
        } finally {
            setIsSaving(false);
        }
    };

    if (!sale) return null;

    const completedCount = checklist.filter(i => i.completed).length;
    const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

    return (
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-crm-border bg-crm-surface shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-crm-border bg-crm-surface-raised px-4 py-3">
                <div className="flex items-center gap-2">
                    <CheckSquare size={16} className={isDoc ? "text-purple-500" : "text-green-500"} />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
                </div>
                {hasChanges && sale.status !== 'cancelada' && (
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

            <div className="flex flex-col gap-3 p-4">
                
                {saveError && (
                    <div className="bg-crm-red/10 border border-red-500/20 rounded-xl p-3 flex gap-3 items-start">
                        <AlertTriangle size={16} className="text-crm-red shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
                            {saveError}
                        </p>
                    </div>
                )}

                {/* Progress bar */}
                <div className="w-full bg-crm-surface-raised rounded-full h-1.5 overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-500 ${isDoc ? 'bg-purple-500' : 'bg-green-500'}`}
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <div className="flex justify-between items-center text-xs text-crm-fg-muted font-bold uppercase tracking-wider">
                    <span>Progreso</span>
                    <span>{completedCount} / {checklist.length}</span>
                </div>

                {/* Items */}
                <div className="space-y-2">
                    {checklist.map(item => (
                        <label 
                            key={item.key} 
                            className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors group ${
                                item.completed 
                                    ? 'bg-crm-bg border-crm-border opacity-60'
                                    : 'bg-crm-surface-raised/30 border-crm-border-strong hover:bg-crm-surface-raised'
                            }`}
                        >
                            <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={item.completed}
                                onChange={() => handleToggle(item.key)}
                                disabled={sale.status === 'cancelada'}
                            />
                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border mt-0.5 transition-colors ${
                                item.completed 
                                    ? (isDoc ? 'bg-purple-500 border-purple-500' : 'bg-green-500 border-green-500') 
                                    : (sale.status === 'cancelada' ? 'bg-crm-surface-raised/50 border-crm-border-strong' : 'bg-crm-bg border-neutral-600 group-hover:border-neutral-500')
                            }`}>
                                {item.completed && <CheckSquare size={12} className="text-white opacity-0" />}
                                {item.completed && (
                                    <svg viewBox="0 0 14 14" className="w-3 h-3 fill-current text-white absolute">
                                        <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-sm font-medium transition-colors ${item.completed ? 'text-crm-fg-muted line-through' : 'text-crm-fg'}`}>
                                    {item.label}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
