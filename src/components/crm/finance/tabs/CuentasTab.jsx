import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, Loader2, X, History, AlertTriangle } from 'lucide-react';
import AccountMovementsModal from '../AccountMovementsModal';
import ConfirmModal from '../../ui/ConfirmModal';
import CrmModal from '../../ui/CrmModal';

export default function CuentasTab({ balances, accounts = [], fetchAccounts, createAccount, updateAccount, deleteAccount, recalculateBalances }) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedAccountForHistory, setSelectedAccountForHistory] = useState(null);
    const [recalculatePreview, setRecalculatePreview] = useState(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

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

    const handleRecalculate = async () => {
        setIsLoadingPreview(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/accounts/recalculate?preview=true', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setRecalculatePreview(data);
                setIsPreviewModalOpen(true);
            } else {
                toast.error('No se pudo obtener la vista previa del recálculo');
            }
        } catch (err) {
            toast.error('Error de red al consultar vista previa');
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleConfirmRecalculate = async () => {
        try {
            await recalculateBalances();
            toast.success('Saldos recalculados y auditados con éxito');
            setIsPreviewModalOpen(false);
            if(fetchAccounts) fetchAccounts();
        } catch (err) {
            toast.error(err.message || 'Error al recalcular saldos');
        }
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
                        <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-crm-border">
                            <button
                                type="button"
                                onClick={() => setSelectedAccountForHistory(account)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-crm-surface-raised hover:bg-crm-surface border border-crm-border rounded-lg transition-colors"
                            >
                                <History size={14} className="text-purple-400" />
                                Historial
                            </button>
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleOpenForm(account)} title="Editar cuenta" className="p-2 text-crm-fg-muted hover:text-white transition-colors"><Edit2 size={16}/></button>
                                <button onClick={() => handleDeleteClick(account)} title="Desactivar cuenta" className="p-2 text-crm-fg-muted hover:text-crm-red transition-colors"><Trash2 size={16}/></button>
                            </div>
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

            <AccountMovementsModal
                isOpen={Boolean(selectedAccountForHistory)}
                onClose={() => setSelectedAccountForHistory(null)}
                account={selectedAccountForHistory}
            />

            {isPreviewModalOpen && recalculatePreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-crm-border pb-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={20} className="text-amber-400" />
                                <h4 className="text-base font-black text-white">Vista Previa: Resetear / Recalcular Saldos</h4>
                            </div>
                            <button type="button" onClick={() => setIsPreviewModalOpen(false)} className="text-crm-fg-muted hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-crm-fg-muted">
                            Se compararon los saldos almacenados contra la suma real de todos los movimientos de ingreso y egreso registrados en la base de datos.
                        </p>

                        {recalculatePreview.differencesCount === 0 ? (
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold text-center">
                                Todos los saldos coinciden exactamente con sus movimientos. No se detectaron desvíos.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-amber-300">
                                    Se detectaron diferencias en {recalculatePreview.differencesCount} cuenta(s):
                                </p>
                                <div className="divide-y divide-crm-border rounded-xl border border-crm-border bg-crm-bg/70 max-h-48 overflow-y-auto">
                                    {recalculatePreview.differences.map(d => (
                                        <div key={d.accountId} className="p-3 text-xs flex items-center justify-between">
                                            <div>
                                                <span className="font-bold text-white block">{d.name}</span>
                                                <span className="text-[11px] text-crm-fg-muted">
                                                    Actual: {d.currency} {Number(d.currentBalance).toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-black text-emerald-400 block">
                                                    Calculado: {d.currency} {Number(d.calculatedBalance).toLocaleString('es-AR')}
                                                </span>
                                                <span className="text-[10px] text-amber-400">
                                                    Dif: {d.diff > 0 ? '+' : ''}{Number(d.diff).toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-3 border-t border-crm-border">
                            <button
                                type="button"
                                onClick={() => setIsPreviewModalOpen(false)}
                                className="flex-1 py-2.5 rounded-xl border border-crm-border text-crm-fg-muted hover:text-white hover:bg-crm-surface-raised font-bold text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmRecalculate}
                                className="flex-1 py-2.5 rounded-xl bg-crm-red hover:bg-crm-red-hover text-white font-bold text-xs"
                            >
                                Confirmar Recálculo y Auditar
                            </button>
                        </div>
                    </div>
                </div>
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
                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">{account ? 'Saldo Actual (Ajuste)' : 'Saldo Inicial'}</label>
                    <input
                        type="number"
                        value={formData.openingBalance}
                        onChange={e => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                        className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                        placeholder="Ej. 100000"
                    />
                </div>
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