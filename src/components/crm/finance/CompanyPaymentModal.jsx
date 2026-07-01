import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function CompanyPaymentModal({ isOpen, onClose, onSubmit, accounts = [], isSubmitting }) {
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [payeeCompany, setPayeeCompany] = useState('');
    const [payeeVehicle, setPayeeVehicle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setCurrency('USD');
            setPayeeCompany('');
            setPayeeVehicle('');
            setDate(new Date().toISOString().split('T')[0]);
            setNotes('');
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) return toast.error('El monto debe ser mayor a 0');
        if (!payeeCompany) return toast.error('Debe seleccionar la empresa receptora');

        onSubmit({
            type: 'egreso',
            category: 'Pago a Proveedor',
            concept: `Pago a ${payeeCompany}`,
            amount: Number(amount),
            currency,
            payeeCompany,
            payeeVehicle,
            date,
            notes,
            paymentMethod: 'transferencia'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-black text-crm-fg">Registrar Pago a Empresa</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-crm-fg-muted">Monto</label>
                            <input type="number" required min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="Ej: 1000" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-crm-fg-muted">Moneda</label>
                            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none">
                                <option value="ARS">ARS</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Fecha del Pago</label>
                        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Empresa Receptora</label>
                        <select required value={payeeCompany} onChange={(e) => setPayeeCompany(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none">
                            <option value="">Seleccionar empresa...</option>
                            <option value="LHIVER">LHIVER</option>
                            <option value="AUTOTERRA">AUTOTERRA</option>
                            <option value="AKAR">AKAR</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Vehículo (Texto Libre / Opcional)</label>
                        <input type="text" value={payeeVehicle} onChange={(e) => setPayeeVehicle(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="Ej: Amarok V6 Negra..." />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Cuenta Origen</label>
                        <input type="text" readOnly value={currency === 'ARS' ? 'Caja en Pesos (ARS)' : 'Caja en Dólares (USD)'} className="w-full rounded-lg border border-crm-border bg-crm-bg/50 px-3 py-2 text-sm text-crm-fg-muted focus:outline-none cursor-not-allowed" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Notas (Opcional)</label>
                        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="Referencia o aclaración..." />
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-crm-border">
                        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-black text-crm-fg-muted hover:bg-crm-bg transition" disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-crm-red-gradient px-4 py-2 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95 disabled:opacity-50">
                            {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
