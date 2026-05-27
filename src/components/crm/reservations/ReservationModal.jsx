"use client";
import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, Check, AlertCircle } from 'lucide-react';
import { useAdminReservations } from '../../../hooks/useAdminReservations';

export default function ReservationModal({ 
    isOpen, 
    onClose, 
    onSuccess, 
    initialData = {} 
}) {
    const { createReservation } = useAdminReservations();
    
    // Form State
    const [agreedPrice, setAgreedPrice] = useState(initialData.agreedPrice || '');
    const [agreedCurrency, setAgreedCurrency] = useState(initialData.agreedCurrency || 'USD');
    const [depositAmount, setDepositAmount] = useState(0); // Optional seña init
    const [depositCurrency, setDepositCurrency] = useState(initialData.agreedCurrency || 'USD');
    const [depositMethod, setDepositMethod] = useState('transferencia');
    const [expiresAt, setExpiresAt] = useState(initialData.expiresAt ? new Date(initialData.expiresAt).toISOString().split('T')[0] : '');
    const [salesperson, setSalesperson] = useState(initialData.salesperson || '');
    const [conditions, setConditions] = useState('');
    const [notes, setNotes] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && initialData) {
            setAgreedPrice(initialData.agreedPrice || '');
            setAgreedCurrency(initialData.agreedCurrency || 'USD');
            setDepositCurrency(initialData.agreedCurrency || 'USD');
            setDepositAmount(0);
            setDepositMethod('transferencia');
            setSalesperson(initialData.salesperson || '');
            setConditions('');
            setNotes('');
            setError('');
            
            // Default expiration to 7 days if not provided
            if (initialData.expiresAt) {
                setExpiresAt(new Date(initialData.expiresAt).toISOString().split('T')[0]);
            } else {
                const defaultDate = new Date();
                defaultDate.setDate(defaultDate.getDate() + 7);
                setExpiresAt(defaultDate.toISOString().split('T')[0]);
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        // Basic frontend validations
        if (!initialData.vehicleId) {
            setError('Falta el ID del vehículo a reservar.');
            return;
        }
        if (Number(agreedPrice) < 0) {
            setError('El precio acordado no puede ser negativo.');
            return;
        }
        if (Number(depositAmount) < 0) {
            setError('La seña no puede ser negativa.');
            return;
        }
        if (!expiresAt) {
            setError('La fecha de vencimiento es obligatoria.');
            return;
        }
        
        const expirationDate = new Date(expiresAt);
        const today = new Date(new Date().setHours(0,0,0,0));
        if (expirationDate < today) {
            setError('El vencimiento no puede ser anterior a hoy.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                vehicleId: initialData.vehicleId,
                leadId: initialData.leadId,
                clientId: initialData.clientId,
                agreedPrice: Number(agreedPrice),
                agreedCurrency,
                depositAmount: Number(depositAmount),
                depositCurrency,
                depositMethod,
                expiresAt: expirationDate,
                salesperson,
                conditions,
                notes
            };

            await createReservation(payload);
            setLoading(false);
            onSuccess();
        } catch (err) {
            setError(err.message || 'Error al procesar la reserva. Verifica que el vehículo no esté ya reservado.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#1E1E24] border border-[#33333A] rounded-2xl w-full max-w-2xl shadow-2xl relative my-8">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[#33333A]">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500/10 text-red-500 p-2 rounded-lg">
                            <Tag size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Tomar Reserva</h2>
                            <p className="text-xs text-neutral-400">Bloquea el vehículo y genera la oportunidad formal</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-neutral-500 hover:text-white transition-colors"
                        disabled={loading}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
                    
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Read-Only Context info */}
                    <div className="bg-black/30 p-4 rounded-xl border border-[#33333A] flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <span className="text-neutral-500 text-xs font-bold uppercase">Vehículo a reservar</span>
                            <span className="text-white font-medium text-sm">{initialData.vehicleName || 'Desconocido'}</span>
                        </div>
                        {initialData.leadName && (
                            <div className="flex justify-between items-center border-t border-[#33333A] pt-2">
                                <span className="text-neutral-500 text-xs font-bold uppercase">Lead / Prospecto</span>
                                <span className="text-blue-400 font-medium text-sm">{initialData.leadName}</span>
                            </div>
                        )}
                        {initialData.clientName && (
                            <div className="flex justify-between items-center border-t border-[#33333A] pt-2">
                                <span className="text-neutral-500 text-xs font-bold uppercase">Cliente Formal</span>
                                <span className="text-green-400 font-medium text-sm">{initialData.clientName}</span>
                            </div>
                        )}
                    </div>

                    {/* Financials Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Agreed Price */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1">Precio Acordado *</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                                    <DollarSign size={16} />
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={agreedPrice}
                                    onChange={(e) => setAgreedPrice(e.target.value)}
                                    className="w-full bg-[#161619] border border-[#33333A] text-white rounded-lg pl-9 pr-20 py-2 focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
                                    placeholder="Ej: 15000"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center">
                                    <select
                                        value={agreedCurrency}
                                        onChange={(e) => setAgreedCurrency(e.target.value)}
                                        className="h-full bg-transparent text-neutral-400 border-l border-[#33333A] rounded-r-lg px-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="ARS">ARS</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Deposit Amount */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1">Monto de Seña (Opcional)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                                    <DollarSign size={16} />
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="w-full bg-[#161619] border border-[#33333A] text-white rounded-lg pl-9 pr-20 py-2 focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
                                    placeholder="0 = Sin seña aún"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center">
                                    <select
                                        value={depositCurrency}
                                        onChange={(e) => setDepositCurrency(e.target.value)}
                                        className="h-full bg-transparent text-neutral-400 border-l border-[#33333A] rounded-r-lg px-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="ARS">ARS</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Deposit Details Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1">Medio de Seña</label>
                            <select
                                value={depositMethod}
                                onChange={(e) => setDepositMethod(e.target.value)}
                                className="w-full bg-[#161619] border border-[#33333A] text-white rounded-lg px-3 py-2 focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
                            >
                                <option value="transferencia">Transferencia Bancaria</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="tarjeta">Tarjeta</option>
                                <option value="otro">Otro / Pendiente</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1">Vencimiento de la Reserva *</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                                    <Calendar size={16} />
                                </div>
                                <input
                                    type="date"
                                    required
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-[#161619] border border-[#33333A] text-white rounded-lg pl-10 pr-3 py-2 focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Vendedor */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">Vendedor / Responsable</label>
                        <input
                            type="text"
                            value={salesperson}
                            onChange={(e) => setSalesperson(e.target.value)}
                            className="w-full bg-[#161619] border border-[#33333A] text-white rounded-lg px-3 py-2 focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
                            placeholder="Nombre del vendedor"
                        />
                    </div>

                    {/* Textareas */}
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1">Condiciones de Venta</label>
                            <textarea
                                value={conditions}
                                onChange={(e) => setConditions(e.target.value)}
                                rows={2}
                                className="w-full bg-[#161619] border border-[#33333A] text-white rounded-lg px-3 py-2 focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                                placeholder="Ej: Entregar transferido, pintar paragolpe..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1">Notas Internas (Opcional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className="w-full bg-[#161619] border border-[#33333A] text-white rounded-lg px-3 py-2 focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                                placeholder="No visible para el cliente"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-[#33333A] flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-[#E63027] hover:bg-[#C42620] text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Check size={18} />
                                    Confirmar Reserva
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
