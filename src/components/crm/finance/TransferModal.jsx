import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import CrmModal from '../ui/CrmModal';

export default function TransferModal({ isOpen, onClose, accounts, onSubmit, isSubmitting }) {
    const [formData, setFormData] = useState({
        sourceAccountId: '',
        destAccountId: '',
        amount: '',
        currency: 'ARS',
        exchangeRate: '',
        destAmount: '',
        notes: ''
    });

    const sourceAccount = accounts.find(a => a._id === formData.sourceAccountId);
    const destAccount = accounts.find(a => a._id === formData.destAccountId);
    const isConversion = sourceAccount && destAccount && sourceAccount.currency !== destAccount.currency;

    // Recalculate destAmount when amount or rate changes
    useEffect(() => {
        if (isConversion && formData.amount && formData.exchangeRate) {
            const amt = Number(formData.amount);
            const rate = Number(formData.exchangeRate);
            if (!isNaN(amt) && !isNaN(rate)) {
                // If converting from USD to ARS: destAmount = USD * rate
                // If converting from ARS to USD: destAmount = ARS / rate
                let calculated = amt;
                if (sourceAccount.currency === 'USD' && destAccount.currency === 'ARS') {
                    calculated = amt * rate;
                } else if (sourceAccount.currency === 'ARS' && destAccount.currency === 'USD') {
                    calculated = amt / rate;
                }
                setFormData(prev => ({ ...prev, destAmount: calculated.toFixed(2) }));
            }
        }
    }, [formData.amount, formData.exchangeRate, isConversion, sourceAccount?.currency, destAccount?.currency]);

    if (!isOpen) return null;

    const handleFormSubmit = () => {
        const payload = {
            ...formData,
            currency: sourceAccount ? sourceAccount.currency : formData.currency,
            exchangeRate: isConversion ? Number(formData.exchangeRate) : undefined,
            destAmount: isConversion ? Number(formData.destAmount) : undefined
        };
        onSubmit(payload);
    };

    return (
        <CrmModal isOpen={isOpen} onClose={onClose} title="Nueva Transferencia" maxWidth="max-w-md">
            <div className="space-y-4 p-5">
                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">Cuenta Origen</label>
                    <select
                        value={formData.sourceAccountId}
                        onChange={e => setFormData({ ...formData, sourceAccountId: e.target.value, destAccountId: '' })}
                        className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                    >
                        <option value="">Seleccione origen...</option>
                        {accounts.filter(a => a.isActive !== false).map(a => (
                            <option key={a._id} value={a._id}>{a.name} ({a.currency} {a.balance?.toLocaleString('es-AR')})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">Cuenta Destino</label>
                    <select
                        value={formData.destAccountId}
                        onChange={e => setFormData({ ...formData, destAccountId: e.target.value })}
                        disabled={!formData.sourceAccountId}
                        className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red disabled:opacity-50"
                    >
                        <option value="">Seleccione destino...</option>
                        {accounts.filter(a => a.isActive !== false && a._id !== formData.sourceAccountId).map(a => (
                            <option key={a._id} value={a._id}>{a.name} ({a.currency} {a.balance?.toLocaleString('es-AR')})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">
                        Monto a debitar {sourceAccount && `(${sourceAccount.currency})`}
                    </label>
                    <input
                        type="number"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                        placeholder="0"
                    />
                </div>

                {isConversion && (
                    <div className="p-3 bg-crm-surface rounded-xl border border-crm-border space-y-3">
                        <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Conversión de Moneda Detectada</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Cotización *</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.exchangeRate}
                                    onChange={e => setFormData({ ...formData, exchangeRate: e.target.value })}
                                    className="h-9 w-full rounded-lg border border-crm-border bg-crm-bg px-3 text-xs font-medium text-crm-fg outline-none focus:border-crm-red"
                                    placeholder="Ej: 1100"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Monto Acreditar ({destAccount.currency}) *</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.destAmount}
                                    onChange={e => setFormData({ ...formData, destAmount: e.target.value })}
                                    className="h-9 w-full rounded-lg border border-crm-border bg-crm-bg px-3 text-xs font-medium text-crm-fg outline-none focus:border-crm-red"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">Notas (Opcional)</label>
                    <input
                        type="text"
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                        placeholder="Motivo de la transferencia..."
                    />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <button
                        onClick={onClose}
                        type="button"
                        className="h-10 rounded-xl px-4 text-sm font-bold text-crm-fg-muted hover:bg-crm-surface-raised transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleFormSubmit}
                        disabled={!formData.sourceAccountId || !formData.destAccountId || !formData.amount || (isConversion && (!formData.exchangeRate || !formData.destAmount)) || isSubmitting}
                        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-crm-red-gradient px-6 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95 disabled:opacity-50"
                    >
                        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                        Transferir
                    </button>
                </div>
            </div>
        </CrmModal>
    );
}
