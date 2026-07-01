import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, Loader2, X } from 'lucide-react';
import ConfirmModal from '../../ui/ConfirmModal';
import CrmModal from '../../ui/CrmModal';

export default function CuentasTab({ balances, accounts = [], fetchAccounts, createAccount, updateAccount, deleteAccount, recalculateBalances }) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatMoney = (amount, currency = 'ARS') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    const handleOpenForm = (account = null) => {
        setEditingAccount(account);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (account) => {
        setConfirmAction({
            title: 'Desactivar Cuenta',
            message: `¿Estás seguro de desactivar la cuenta "${account.name}"? Si tiene movimientos, no se borrará físicamente, sino que se archivará.`,
            action: async () => {
                try {
                    await deleteAccount(account._id);
                    toast.success('Cuenta desactivada exitosamente');
                    if(fetchAccounts) fetchAccounts();
                } catch (err) {
                    toast.error(err.message || 'Error al desactivar cuenta');
                }
            }
        });
        setIsConfirmOpen(true);
    };

    const handleRecalculate = () => {
        setConfirmAction({
            title: 'Recalcular Saldos',
            message: '¿Estás seguro de recalcular los saldos de TODAS las cuentas? Esta operación leerá todos los movimientos desde cero.',
            action: async () => {
                try {
                    await recalculateBalances();
                    toast.success('Saldos recalculados con éxito');
                    if(fetchAccounts) fetchAccounts();
                } catch (err) {
                    toast.error(err.message || 'Error al recalcular saldos');
                }
            }
        });
        setIsConfirmOpen(true);
    };

    return (
        <div className="space-y-4">
            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h2 className="text-base font-black text-crm-fg">Cuentas y Fondos</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-crm-border pt-4 mt-4">
                    <button onClick={handleRecalculate} className="h-9 rounded-lg border border-crm-border bg-crm-bg px-3 text-xs font-bold text-crm-fg-muted hover:text-crm-fg transition">Resetear saldos</button>
                    <button onClick={() => handleOpenForm(null)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red-gradient px-4 text-xs font-black text-white shadow-crm-shadow-red transition hover:opacity-95 ml-auto">
                        <Plus size={14} /> Nueva Cuenta
                    </button>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">Total en USD</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(balances?.USD, 'USD')}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">Total en ARS</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(balances?.ARS, 'ARS')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {accounts.filter(a => a.isActive !== false).map(account => (
                    <div key={account._id} className="rounded-xl border border-crm-border bg-crm-bg p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-sm font-black text-crm-fg">{account.name}</h3>
                                    <p className="text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider">{account.type || 'Fondo'} · {account.currency}</p>
                                </div>
                            </div>
                            <p className="text-2xl font-black text-crm-fg">{formatMoney(account.balance, account.currency)}</p>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-crm-border">
                            <button onClick={() => handleOpenForm(account)} className="p-2 text-crm-fg-muted hover:text-crm-fg transition-colors"><Edit2 size={16}/></button>
                            <button onClick={() => handleDeleteClick(account)} className="p-2 text-crm-fg-muted hover:text-crm-red transition-colors"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {isFormOpen && (
                <AccountFormModal
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    account={editingAccount}
                    onSubmit={async (data) => {
                        setIsSubmitting(true);
                        try {
                            if (editingAccount) {
                                await updateAccount(editingAccount._id, data);
                                toast.success('Cuenta actualizada');
                            } else {
                                await createAccount(data);
                                toast.success('Cuenta creada');
                            }
                            if(fetchAccounts) fetchAccounts();
                            setIsFormOpen(false);
                        } catch (err) {
                            toast.error(err.message || 'Error guardando cuenta');
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                    isSubmitting={isSubmitting}
                />
            )}

            {isConfirmOpen && (
                <ConfirmModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={async () => {
                        await confirmAction?.action();
                        setIsConfirmOpen(false);
                    }}
                    title={confirmAction?.title}
                    message={confirmAction?.message}
                    confirmText="Confirmar"
                    cancelText="Cancelar"
                />
            )}
        </div>
    );
}

function AccountFormModal({ isOpen, onClose, account, onSubmit, isSubmitting }) {
    const [formData, setFormData] = useState({
        name: account?.name || '',
        type: account?.type || 'Efectivo',
        currency: account?.currency || 'ARS',
        openingBalance: account?.balance || 0,
        isActive: account?.isActive !== false
    });

    if (!isOpen) return null;

    return (
        <CrmModal isOpen={isOpen} onClose={onClose} title={account ? 'Editar Cuenta' : 'Nueva Cuenta'} maxWidth="max-w-md">
            <div className="space-y-4 p-5">
                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">Nombre de la cuenta</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                        placeholder="Ej. Caja Fuerte, Banco Galicia..."
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">Tipo</label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                            className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                        >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Banco">Banco</option>
                            <option value="Tarjeta">Tarjeta</option>
                            <option value="Billetera">Billetera</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">Moneda</label>
                        <select
                            value={formData.currency}
                            onChange={e => setFormData({ ...formData, currency: e.target.value })}
                            disabled={!!account}
                            className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="ARS">Pesos (ARS)</option>
                            <option value="USD">Dólares (USD)</option>
                        </select>
                    </div>
                </div>
                {!account && (
                    <div>
                        <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">Saldo Inicial</label>
                        <input
                            type="number"
                            value={formData.openingBalance}
                            onChange={e => setFormData({ ...formData, openingBalance: e.target.value })}
                            className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                            placeholder="0"
                        />
                    </div>
                )}
                {account && (
                    <label className="flex items-center gap-2 mt-4 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                            className="accent-crm-red w-4 h-4"
                        />
                        <span className="text-sm font-medium text-crm-fg">Cuenta Activa</span>
                    </label>
                )}
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
                        disabled={!formData.name || isSubmitting}
                        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-crm-red-gradient px-6 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95 disabled:opacity-50"
                    >
                        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                        {account ? 'Guardar Cambios' : 'Crear Cuenta'}
                    </button>
                </div>
            </div>
        </CrmModal>
    );
}