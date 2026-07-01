"use client";
import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExpenseAddModal({ isOpen, onClose, onSave, vehicleCurrency }) {
    const [concept, setConcept] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState(vehicleCurrency || 'USD');
    const [note, setNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setConcept('');
            setAmount('');
            setCurrency(vehicleCurrency || 'USD');
            setNote('');
        }
    }, [isOpen, vehicleCurrency]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!concept || !amount || amount <= 0) {
            toast.error('Concepto y monto (positivo) son requeridos.');
            return;
        }

        try {
            setIsSaving(true);
            await onSave({
                concept,
                amount: Number(amount),
                currency,
                note
            });
            toast.success('Gasto añadido');
            onClose();
        } catch (error) {
            toast.error(error.message || 'Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const isDifferentCurrency = currency !== vehicleCurrency;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-crm-bg border border-crm-border rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="flex items-center justify-between p-4 border-b border-crm-border">
                    <h2 className="text-lg font-bold text-white">Agregar Gasto</h2>
                    <button onClick={onClose} className="p-1 text-crm-fg-muted hover:text-white transition-colors" disabled={isSaving}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-crm-fg-muted">Concepto *</label>
                        <input 
                            type="text" 
                            required
                            placeholder="Ej. Cambio de cubiertas, Gestoría..."
                            value={concept}
                            onChange={e => setConcept(e.target.value)}
                            className="bg-crm-bg border border-crm-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red"
                        />
                    </div>

                    <div className="flex gap-3">
                        <div className="flex flex-col gap-1.5 flex-1">
                            <label className="text-sm font-medium text-crm-fg-muted">Monto *</label>
                            <input 
                                type="number" 
                                required
                                min="1"
                                step="any"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="bg-crm-bg border border-crm-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 w-24">
                            <label className="text-sm font-medium text-crm-fg-muted">Moneda</label>
                            <select 
                                value={currency}
                                onChange={e => setCurrency(e.target.value)}
                                className="bg-crm-bg border border-crm-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red"
                            >
                                <option value="USD">USD</option>
                                <option value="ARS">ARS</option>
                            </select>
                        </div>
                    </div>

                    {isDifferentCurrency && (
                        <div className="flex items-start gap-2 p-3 bg-[#EAB308]/10 border border-[#EAB308]/30 rounded-lg">
                            <AlertTriangle size={16} className="text-[#EAB308] mt-0.5 shrink-0" />
                            <p className="text-xs text-[#EAB308]">
                                El vehículo fue comprado en {vehicleCurrency}. Añadir un gasto en {currency} podría afectar el cálculo del costo total debido a variaciones cambiarias.
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-crm-fg-muted">Nota (opcional)</label>
                        <textarea 
                            rows={2}
                            placeholder="Detalles adicionales..."
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="bg-crm-bg border border-crm-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red resize-none"
                        />
                    </div>

                    <div className="pt-4 flex gap-3 mt-auto">
                        <button 
                            type="button" 
                            onClick={onClose}
                            disabled={isSaving}
                            className="flex-1 px-4 py-2 bg-transparent border border-crm-border text-white rounded-lg hover:bg-crm-surface-raised transition-colors font-medium text-sm"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className="flex-1 px-4 py-2 bg-crm-red text-white rounded-lg hover:bg-crm-red-hover transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={16} />}
                            {isSaving ? 'Guardando...' : 'Guardar Gasto'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
