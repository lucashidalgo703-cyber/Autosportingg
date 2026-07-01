import React, { useState, useEffect } from 'react';
import { X, HandCoins, AlertCircle } from 'lucide-react';

export default function PayInstallmentModal({ isOpen, onClose, installment, accounts, onPay, isSubmitting }) {
    const [formData, setFormData] = useState({
        accountId: '',
        amount: '',
        paymentMethod: 'efectivo',
        notes: 'Cobro de cuota'
    });

    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && installment) {
            const balance = Number(installment.amount || 0) - Number(installment.paidAmount || 0);
            
            // Buscar cuentas compatibles
            const compatibleAccounts = accounts?.filter(a => a.currency === installment.currency && a.isActive !== false) || [];
            
            setFormData({
                accountId: compatibleAccounts.length > 0 ? compatibleAccounts[0]._id : '',
                amount: balance > 0 ? balance.toString() : '',
                paymentMethod: 'efectivo',
                notes: 'Cobro de cuota'
            });
            setError(null);
        }
    }, [isOpen, installment, accounts]);

    if (!isOpen || !installment) return null;

    const compatibleAccounts = accounts?.filter(a => a.currency === installment.currency && a.isActive !== false) || [];
    const balance = Number(installment.amount || 0) - Number(installment.paidAmount || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        if (!formData.accountId) {
            setError('Debe seleccionar una cuenta de caja');
            return;
        }
        
        if (!formData.amount || Number(formData.amount) <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }

        if (Number(formData.amount) > balance) {
            setError(`El monto no puede superar el saldo pendiente (${balance})`);
            return;
        }

        await onPay(installment._id, {
            amount: Number(formData.amount),
            accountId: formData.accountId,
            paymentMethod: formData.paymentMethod,
            notes: formData.notes
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-crm-surface border border-neutral-800 rounded-2xl w-full max-w-md relative z-10 flex flex-col shadow-2xl">
                
                <div className="p-6 border-b border-neutral-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                            <HandCoins size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Saldar Cuota</h2>
                            <p className="text-xs text-neutral-400 mt-1">
                                {installment.concept || `Cuota ${installment.installmentNumber || ''}`} - {installment.currency} {Number(installment.amount).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-crm-surface-raised/50 text-neutral-400 hover:text-white hover:bg-crm-surface-raised transition-colors"
                        disabled={isSubmitting}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="pay-installment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                        
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="p-4 bg-black/40 border border-neutral-800 rounded-xl mb-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-neutral-400">Saldo Pendiente</span>
                                <span className="text-lg font-black text-white">{installment.currency} {balance.toLocaleString()}</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Cuenta de Caja (Destino)</label>
                            <select
                                className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                                value={formData.accountId}
                                onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                                required
                            >
                                <option value="">-- Seleccionar Cuenta --</option>
                                {compatibleAccounts.map(acc => (
                                    <option key={acc._id} value={acc._id}>
                                        {acc.name} (Saldo: {acc.currency} {Number(acc.balance).toLocaleString()})
                                    </option>
                                ))}
                            </select>
                            {compatibleAccounts.length === 0 && (
                                <p className="text-xs text-crm-red mt-1">No hay cuentas disponibles para la moneda {installment.currency}.</p>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Monto a Cobrar</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">$</span>
                                    <input
                                        type="number"
                                        required
                                        min="0.01"
                                        step="0.01"
                                        max={balance}
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-8 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="flex-1">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Método</label>
                                <select
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                                >
                                    <option value="efectivo">Efectivo</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="tarjeta">Tarjeta</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Notas (Opcional)</label>
                            <input
                                type="text"
                                className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                placeholder="Ref:..."
                            />
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-neutral-800 shrink-0 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white bg-crm-surface-raised hover:bg-neutral-700 transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="pay-installment-form"
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors flex justify-center items-center gap-2"
                        disabled={isSubmitting || compatibleAccounts.length === 0}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Procesando...
                            </>
                        ) : (
                            'Registrar Cobro'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
