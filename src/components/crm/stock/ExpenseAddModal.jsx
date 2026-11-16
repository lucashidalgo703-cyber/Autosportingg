"use client";
import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExpenseAddModal({ isOpen, onClose, onSave, vehicleCurrency }) {
    const [concept, setConcept] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState(vehicleCurrency || '');
    const [note, setNote] = useState('');
    const [allocation, setAllocation] = useState('shared');
    const [agencyPercentage, setAgencyPercentage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setConcept('');
            setAmount('');
            setCurrency(vehicleCurrency || '');
            setNote('');
            setAllocation('shared');
            setAgencyPercentage('');
        }
    }, [isOpen, vehicleCurrency]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!concept || !amount || !currency || amount <= 0) {
            toast.error('Concepto y monto (positivo) son requeridos.');
            return;
        }
        if (allocation === 'custom' && (agencyPercentage === '' || !Number.isFinite(Number(agencyPercentage)) || Number(agencyPercentage) < 0 || Number(agencyPercentage) > 100)) {
            toast.error('Indicá qué porcentaje del gasto corresponde a AutoSporting (0 a 100).');
            return;
        }

        try {
            setIsSaving(true);
            await onSave({
                concept,
                amount: Number(amount),
                currency,
                note,
                paidBy: allocation === 'custom' ? 'shared' : allocation,
                ...(allocation === 'custom' ? { agencyPercentage: Number(agencyPercentage) } : {})
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
                            <label htmlFor="expense-currency" className="text-sm font-medium text-crm-fg-muted">Moneda</label>
                            <select 
                                id="expense-currency"
                                required
                                value={currency}
                                onChange={e => setCurrency(e.target.value)}
                                className="bg-crm-bg border border-crm-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red"
                            >
                                <option value="">Elegir</option>
                                <option value="USD">USD</option>
                                <option value="ARS">ARS</option>
                            </select>
                        </div>
                    </div>

                    {isDifferentCurrency && (
                        <div className="flex items-start gap-2 p-3 bg-[#EAB308]/10 border border-[#EAB308]/30 rounded-lg">
                            <AlertTriangle size={16} className="text-[#EAB308] mt-0.5 shrink-0" />
                            <p className="text-xs text-[#EAB308]">
                                Este gasto se conserva en {currency}. Los costos en ARS y USD se muestran separados, sin conversión automática.
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="expense-allocation" className="text-sm font-medium text-crm-fg-muted">Quién asume este gasto</label>
                        <select id="expense-allocation" value={allocation} onChange={event => setAllocation(event.target.value)} className="min-h-11 rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-white">
                            <option value="shared">Según la participación registrada de la unidad</option>
                            <option value="agency">100% AutoSporting</option>
                            <option value="investor">100% inversor</option>
                            <option value="custom">Distribución específica de este gasto</option>
                        </select>
                        {allocation === 'custom' && <label className="mt-2 text-xs text-crm-fg-muted">Porcentaje del gasto de AutoSporting<input aria-label="Porcentaje del gasto de AutoSporting" type="number" min="0" max="100" step="0.01" required value={agencyPercentage} onChange={event => setAgencyPercentage(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-white" /></label>}
                        <p className="text-xs text-crm-fg-muted">La distribución modifica el costo de cada parte. Si falta verificar la participación registrada, se identifica como pendiente en el desglose.</p>
                    </div>

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
