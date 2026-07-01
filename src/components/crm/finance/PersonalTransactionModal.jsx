import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, FileText, Tag, Banknote, ListFilter } from 'lucide-react';

export default function PersonalTransactionModal({ isOpen, onClose, transaction, initialData, onSave }) {
    const [formData, setFormData] = useState({
        type: 'egreso',
        concept: '',
        category: '',
        amount: '',
        currency: 'USD',
        status: 'pagado',
        expenseType: 'eventual',
        frequency: 'unica',
        paymentMethod: 'efectivo',
        transactionDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (transaction) {
                setFormData({
                    type: transaction.type || 'egreso',
                    concept: transaction.concept || '',
                    category: transaction.category || '',
                    amount: transaction.amount || '',
                    currency: transaction.currency || 'USD',
                    status: transaction.status || 'pagado',
                    expenseType: transaction.expenseType || 'eventual',
                    frequency: transaction.frequency || 'unica',
                    paymentMethod: transaction.paymentMethod || 'efectivo',
                    transactionDate: transaction.transactionDate ? new Date(transaction.transactionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    notes: transaction.notes || ''
                });
            } else if (initialData) {
                setFormData(prev => ({ ...prev, ...initialData }));
            } else {
                setFormData({
                    type: 'egreso',
                    concept: '',
                    category: '',
                    amount: '',
                    currency: 'USD',
                    status: 'pagado',
                    expenseType: 'eventual',
                    frequency: 'unica',
                    paymentMethod: 'efectivo',
                    transactionDate: new Date().toISOString().split('T')[0],
                    notes: ''
                });
            }
        }
    }, [isOpen, transaction, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave({
            ...formData,
            amount: Number(formData.amount)
        });
    };

    const isIncome = formData.type === 'ingreso';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="bg-crm-surface border border-neutral-800 rounded-2xl w-full max-w-lg relative z-10 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-neutral-800 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {transaction ? 'Editar Movimiento Personal' : 'Nuevo Movimiento Personal'}
                        </h2>
                        <p className="text-xs text-neutral-500 mt-1">Este movimiento es 100% privado y no afecta la caja de AutoSporting.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-crm-surface-raised/50 text-neutral-400 hover:text-white hover:bg-crm-surface-raised transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="personal-transaction-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                        
                        <div className="flex bg-neutral-900 rounded-xl p-1 border border-neutral-800">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'ingreso' })}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                                    formData.type === 'ingreso' ? 'bg-green-600/20 text-green-500 border border-green-500/20' : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                Ingreso a mi caja
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'egreso' })}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                                    formData.type === 'egreso' ? 'bg-red-600/20 text-crm-red border border-red-500/20' : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                Gasto Personal
                            </button>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Concepto / Detalle</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                <input
                                    type="text"
                                    required
                                    placeholder={isIncome ? "Ej: Transferencia desde Banco Galicia" : "Ej: Compra supermercado"}
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                    value={formData.concept}
                                    onChange={(e) => setFormData({...formData, concept: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Categoría</label>
                                <div className="relative">
                                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                    <select
                                        required
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none"
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                    >
                                        <option value="" disabled>Seleccionar...</option>
                                        {isIncome ? (
                                            <>
                                                <option value="Aporte de capital">Aporte de capital</option>
                                                <option value="Retiro AutoSporting">Retiro AutoSporting</option>
                                                <option value="Otros ingresos">Otros ingresos</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="Obra social">Obra social</option>
                                                <option value="Alquiler/Vivienda">Alquiler/Vivienda</option>
                                                <option value="Tarjetas">Tarjetas</option>
                                                <option value="Seguro">Seguro</option>
                                                <option value="Celular">Celular</option>
                                                <option value="Salud">Salud</option>
                                                <option value="Vehiculos personales">Vehículos personales</option>
                                                <option value="Gimnasio">Gimnasio</option>
                                                <option value="Compras">Compras</option>
                                                <option value="Viajes">Viajes</option>
                                                <option value="Otros">Otros</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Fecha</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                        value={formData.transactionDate}
                                        onChange={(e) => setFormData({...formData, transactionDate: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Importe</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="w-32">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Moneda</label>
                                <select
                                    required
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                                    value={formData.currency}
                                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                >
                                    <option value="ARS">ARS</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Medio de Pago</label>
                                <div className="relative">
                                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                    <select
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none"
                                        value={formData.paymentMethod}
                                        onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                                    >
                                        <option value="efectivo">Efectivo</option>
                                        <option value="transferencia">Transferencia</option>
                                        <option value="tarjeta">Tarjeta</option>
                                        <option value="debito">Débito</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Estado</label>
                                <select
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none"
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="pagado">Pagado</option>
                                    <option value="pendiente">Pendiente</option>
                                </select>
                            </div>
                        </div>

                        {!isIncome && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Tipo de Gasto</label>
                                    <div className="relative">
                                        <ListFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                        <select
                                            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none"
                                            value={formData.expenseType}
                                            onChange={(e) => setFormData({...formData, expenseType: e.target.value})}
                                        >
                                            <option value="eventual">Eventual</option>
                                            <option value="fijo">Fijo</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Frecuencia</label>
                                    <select
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none"
                                        value={formData.frequency}
                                        onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                                    >
                                        <option value="unica">Única vez</option>
                                        <option value="semanal">Semanal</option>
                                        <option value="mensual">Mensual</option>
                                        <option value="anual">Anual</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Notas (Opcional)</label>
                            <textarea
                                className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors resize-none"
                                rows="2"
                                placeholder="Detalles adicionales..."
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            ></textarea>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-neutral-800 shrink-0 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white bg-crm-surface-raised hover:bg-neutral-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="personal-transaction-form"
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors"
                    >
                        {transaction ? 'Guardar Cambios' : 'Registrar Movimiento'}
                    </button>
                </div>
            </div>
        </div>
    );
}
