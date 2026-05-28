import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Trash2 } from 'lucide-react';

export default function TransactionModal({ isOpen, onClose, transaction, onSave, onAnnul }) {
    const isEdit = !!transaction;
    const isAnnulled = transaction?.status === 'anulado';

    const [formData, setFormData] = useState({
        type: 'ingreso',
        currency: 'ARS',
        amount: '',
        concept: '',
        category: '',
        paymentMethod: 'efectivo',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen && transaction) {
            setFormData({
                type: transaction.type?.toLowerCase() || 'ingreso',
                currency: transaction.currency || 'ARS',
                amount: transaction.amount || '',
                concept: transaction.concept || transaction.description || '',
                category: transaction.category || '',
                paymentMethod: transaction.paymentMethod || 'efectivo',
                date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                notes: transaction.notes || ''
            });
        } else if (isOpen) {
            setFormData({
                type: 'ingreso',
                currency: 'ARS',
                amount: '',
                concept: '',
                category: '',
                paymentMethod: 'efectivo',
                date: new Date().toISOString().split('T')[0],
                notes: ''
            });
        }
        setErrors({});
    }, [isOpen, transaction]);

    if (!isOpen) return null;

    const validate = () => {
        const newErrors = {};
        if (!formData.amount || formData.amount < 0) newErrors.amount = 'Monto inválido';
        if (!formData.concept.trim()) newErrors.concept = 'Requerido';
        if (!formData.category.trim()) newErrors.category = 'Requerido';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isAnnulled) return;
        if (validate()) {
            onSave({
                ...formData,
                amount: Number(formData.amount)
            });
        }
    };

    const handleAnnul = () => {
        if (window.confirm('¿Estás seguro de anular este movimiento? Esta acción registrará el cambio en la auditoría.')) {
            onAnnul(transaction._id);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#161619] border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-neutral-900/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {isEdit ? 'Detalle de Movimiento' : 'Nuevo Movimiento Manual'}
                        </h2>
                        {isEdit && <span className="text-sm text-neutral-500 mt-1 block">ID: {transaction._id}</span>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {isAnnulled && (
                    <div className="bg-red-500/10 border-b border-red-500/20 p-4 flex items-center gap-3">
                        <AlertTriangle className="text-red-500 shrink-0" size={20} />
                        <div>
                            <span className="font-bold text-red-500 block">Movimiento Anulado</span>
                            <p className="text-xs text-red-400">Este movimiento fue anulado y ya no se contabiliza en el balance.</p>
                        </div>
                    </div>
                )}

                {/* Form */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {!isEdit && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Tipo de Movimiento</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'ingreso' })}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border ${formData.type === 'ingreso' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-black/40 text-neutral-400 border-neutral-800 hover:border-neutral-700'}`}
                                        >
                                            Ingreso
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'egreso' })}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border ${formData.type === 'egreso' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-black/40 text-neutral-400 border-neutral-800 hover:border-neutral-700'}`}
                                        >
                                            Egreso
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Moneda</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, currency: 'ARS' })}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border ${formData.currency === 'ARS' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-black/40 text-neutral-400 border-neutral-800 hover:border-neutral-700'}`}
                                        >
                                            ARS
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, currency: 'USD' })}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border ${formData.currency === 'USD' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-black/40 text-neutral-400 border-neutral-800 hover:border-neutral-700'}`}
                                        >
                                            USD
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {isEdit && (
                            <div className="col-span-2 flex gap-4">
                                <div className="flex-1 bg-black/40 border border-neutral-800 rounded-xl p-3">
                                    <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Tipo Original</span>
                                    <span className={`text-sm font-bold ${transaction.type === 'Ingreso' ? 'text-green-400' : 'text-red-400'}`}>{transaction.type}</span>
                                </div>
                                <div className="flex-1 bg-black/40 border border-neutral-800 rounded-xl p-3">
                                    <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Moneda Original</span>
                                    <span className="text-sm font-bold text-white">{transaction.currency}</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Monto {formData.currency}</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className={`w-full bg-black/40 border ${errors.amount ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-neutral-600'} rounded-xl py-2.5 pl-8 pr-4 text-sm text-white focus:outline-none transition-colors`}
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    disabled={isAnnulled || (isEdit && transaction.status === 'anulado')}
                                />
                            </div>
                            {errors.amount && <span className="text-xs text-red-500 mt-1 block">{errors.amount}</span>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Fecha</label>
                            <input
                                type="date"
                                className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                disabled={isAnnulled}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Concepto</label>
                            <input
                                type="text"
                                placeholder="Ej: Pago servicio de limpieza"
                                className={`w-full bg-black/40 border ${errors.concept ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-neutral-600'} rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none transition-colors`}
                                value={formData.concept}
                                onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                                disabled={isAnnulled}
                            />
                            {errors.concept && <span className="text-xs text-red-500 mt-1 block">{errors.concept}</span>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Categoría</label>
                            <input
                                type="text"
                                placeholder="Ej: Mantenimiento, Gastos Varios"
                                className={`w-full bg-black/40 border ${errors.category ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-neutral-600'} rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none transition-colors`}
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                disabled={isAnnulled}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Método de Pago</label>
                            <select
                                className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                                value={formData.paymentMethod}
                                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                disabled={isAnnulled}
                            >
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="tarjeta">Tarjeta</option>
                                <option value="cheque">Cheque</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Notas (Opcional)</label>
                            <textarea
                                rows={3}
                                className="w-full bg-black/40 border border-neutral-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors resize-none"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                disabled={isAnnulled}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex justify-between shrink-0">
                    {isEdit && !isAnnulled ? (
                        <button
                            type="button"
                            onClick={handleAnnul}
                            className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-sm transition-colors flex items-center gap-2 border border-red-500/20"
                        >
                            <Trash2 size={16} />
                            Anular Movimiento
                        </button>
                    ) : (
                        <div></div>
                    )}
                    
                    {!isAnnulled && (
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-6 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                                <Save size={16} />
                                {isEdit ? 'Guardar Cambios' : 'Registrar Movimiento'}
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
