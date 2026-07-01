import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import CrmModal from '../ui/CrmModal';

export default function TransferModal({ isOpen, onClose, accounts, onSubmit, isSubmitting }) {
    const [formData, setFormData] = useState({
        sourceAccountId: '',
        destAccountId: '',
        amount: '',
        currency: 'ARS',
        notes: ''
    });

    if (!isOpen) return null;

    return (
        <CrmModal isOpen={isOpen} onClose={onClose} title="Nueva Transferencia" maxWidth="max-w-md">
            <div className="space-y-4 p-5">
                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">Moneda</label>
                    <select
                        value={formData.currency}
                        onChange={e => setFormData({ ...formData, currency: e.target.value, sourceAccountId: '', destAccountId: '' })}
                        className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                    >
                        <option value="ARS">Pesos (ARS)</option>
                        <option value="USD">Dólares (USD)</option>
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">Cuenta Origen</label>
                    <select
                        value={formData.sourceAccountId}
                        onChange={e => setFormData({ ...formData, sourceAccountId: e.target.value })}
                        className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                    >
                        <option value="">Seleccione origen...</option>
                        {accounts.filter(a => a.currency === formData.currency && a.isActive !== false).map(a => (
                            <option key={a._id} value={a._id}>{a.name} ({a.balance})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">Cuenta Destino</label>
                    <select
                        value={formData.destAccountId}
                        onChange={e => setFormData({ ...formData, destAccountId: e.target.value })}
                        className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                    >
                        <option value="">Seleccione destino...</option>
                        {accounts.filter(a => a.currency === formData.currency && a.isActive !== false && a._id !== formData.sourceAccountId).map(a => (
                            <option key={a._id} value={a._id}>{a.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">Monto a transferir</label>
                    <input
                        type="number"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                        placeholder="0"
                    />
                </div>
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
                        onClick={() => onSubmit(formData)}
                        disabled={!formData.sourceAccountId || !formData.destAccountId || !formData.amount || isSubmitting}
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
