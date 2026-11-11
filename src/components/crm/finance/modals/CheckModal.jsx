import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

export default function CheckModal({ isOpen, onClose, onSave, isSubmitting, mode = 'create', check = null, accounts = [] }) {
    const [formData, setFormData] = useState({
        direction: 'recibido',
        number: '',
        bank: '',
        amount: '',
        currency: 'ARS',
        issueDate: '',
        dueDate: '',
        status: 'en_cartera',
        issuerName: '',
        issuerCuit: '',
        beneficiaryName: '',
        notes: '',
        accountId: ''
    });

    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && check) {
                setFormData({
                    direction: check.direction || 'recibido',
                    number: check.number || '',
                    bank: check.bank || '',
                    amount: check.amount || '',
                    currency: check.currency || 'ARS',
                    issueDate: check.issueDate ? new Date(check.issueDate).toISOString().split('T')[0] : '',
                    dueDate: check.dueDate ? new Date(check.dueDate).toISOString().split('T')[0] : '',
                    status: check.status || 'en_cartera',
                    issuerName: check.issuerName || '',
                    issuerCuit: check.issuerCuit || '',
                    beneficiaryName: check.beneficiaryName || '',
                    notes: check.notes || '',
                    accountId: check.accountId || ''
                });
            } else {
                // Modo create: limpiar
                setFormData({
                    direction: check?.direction || 'recibido', // Por si queremos prellenar desde la UI
                    number: '',
                    bank: '',
                    amount: '',
                    currency: 'ARS',
                    issueDate: new Date().toISOString().split('T')[0],
                    dueDate: '',
                    status: 'en_cartera',
                    issuerName: '',
                    issuerCuit: '',
                    beneficiaryName: '',
                    notes: '',
                    accountId: ''
                });
            }
            setError(null);
        }
    }, [isOpen, mode, check]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        if (!formData.number || !formData.bank || !formData.amount || !formData.issueDate || !formData.dueDate) {
            setError('Complete todos los campos obligatorios (*)');
            return;
        }

        if ((formData.status === 'depositado' || formData.status === 'cobrado') && !formData.accountId) {
            setError('Debe seleccionar la cuenta de caja donde se depositó/cobró el cheque.');
            return;
        }

        try {
            await onSave({
                ...formData,
                amount: Number(formData.amount)
            });
        } catch (err) {
            setError(err.message || 'Error al guardar');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-crm-surface border border-neutral-800 rounded-2xl w-full max-w-2xl relative z-10 flex flex-col shadow-2xl max-h-[90vh]">
                
                <div className="p-6 border-b border-neutral-800 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-white">
                        {mode === 'create' ? 'Nuevo Cheque' : 'Editar Cheque'}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-crm-surface-raised/50 text-neutral-400 hover:text-white hover:bg-crm-surface-raised transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="check-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
                        
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Tipo (Dirección)</label>
                                <select
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                    value={formData.direction}
                                    onChange={(e) => setFormData({...formData, direction: e.target.value})}
                                    disabled={mode === 'edit'}
                                >
                                    <option value="recibido">A Cobrar (Recibido)</option>
                                    <option value="emitido">Emitido</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Estado</label>
                                <select
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                    disabled={mode === 'create'} // Al crear siempre es en_cartera, luego se cambia
                                >
                                    <option value="en_cartera">En Cartera</option>
                                    <option value="depositado">Depositado</option>
                                    <option value="cobrado">Cobrado</option>
                                    <option value="rechazado">Rechazado</option>
                                    <option value="entregado_a_tercero">Entregado a Tercero</option>
                                    <option value="anulado">Anulado</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Número *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                    value={formData.number}
                                    onChange={(e) => setFormData({...formData, number: e.target.value})}
                                    placeholder="N° Cheque"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Banco *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                    value={formData.bank}
                                    onChange={(e) => setFormData({...formData, bank: e.target.value})}
                                    placeholder="Ej: Santander"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Moneda</label>
                                <select
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                    value={formData.currency}
                                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                >
                                    <option value="ARS">ARS</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Monto *</label>
                                <input
                                    type="number"
                                    required
                                    min="0.01"
                                    step="0.01"
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                />
                            </div>
                        </div>

                        {(formData.status === 'depositado' || formData.status === 'cobrado') && (
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Cuenta de Caja (Destino/Origen) *</label>
                                <select
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                    value={formData.accountId}
                                    onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                                    required
                                >
                                    <option value="">-- Seleccionar Cuenta --</option>
                                    {accounts.filter(a => a.currency === formData.currency && a.isActive !== false).map(acc => (
                                        <option key={acc._id} value={acc._id}>
                                            {acc.name} (Saldo actual: {acc.currency} {Number(acc.balance).toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Fecha de Emisión *</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                    value={formData.issueDate}
                                    onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Fecha de Vencimiento *</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                                />
                            </div>
                        </div>

                        {formData.direction === 'recibido' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Librador (Nombre) *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                        value={formData.issuerName}
                                        onChange={(e) => setFormData({...formData, issuerName: e.target.value})}
                                        placeholder="Quién lo emitió"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">CUIT Librador (Opcional)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                        value={formData.issuerCuit}
                                        onChange={(e) => setFormData({...formData, issuerCuit: e.target.value})}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Beneficiario *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                    value={formData.beneficiaryName}
                                    onChange={(e) => setFormData({...formData, beneficiaryName: e.target.value})}
                                    placeholder="A quién se emite"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Notas / Detalles</label>
                            <input
                                type="text"
                                className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            />
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-neutral-800 shrink-0 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-sm text-white hover:bg-neutral-800 transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="check-form"
                        className="px-6 py-3 rounded-xl font-bold text-sm text-black bg-white hover:bg-neutral-200 transition-colors flex items-center gap-2"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                {mode === 'create' ? 'Crear Cheque' : 'Guardar Cambios'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
