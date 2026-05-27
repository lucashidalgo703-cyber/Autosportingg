"use client";
import React, { useState, useEffect } from 'react';
import { X, DollarSign, Handshake, AlertTriangle, Info } from 'lucide-react';
import { useAdminReservations } from '../../../hooks/useAdminReservations';

export default function ConvertReservationToSaleModal({ isOpen, onClose, onSuccess, reservation }) {
    const { convertReservationToSale } = useAdminReservations();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        salePrice: 0,
        saleCurrency: 'USD',
        paymentMethod: 'contado',
        notes: ''
    });

    useEffect(() => {
        if (isOpen && reservation) {
            setFormData({
                salePrice: reservation.agreedPrice || 0,
                saleCurrency: reservation.agreedCurrency || 'USD',
                paymentMethod: 'contado',
                notes: ''
            });
            setError(null);
        }
    }, [isOpen, reservation]);

    if (!isOpen || !reservation) return null;

    const vehicleName = reservation.vehicleId ? `${reservation.vehicleId.brand} ${reservation.vehicleId.name}` : 'Vehículo no asignado';
    const clientName = reservation.clientId?.fullName || reservation.clientId?.firstName || reservation.leadId?.name || 'Sin Nombre';

    const handleConvert = async () => {
        if (formData.salePrice < 0) {
            setError("El precio de venta no puede ser negativo.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await convertReservationToSale(reservation._id, {
                salePrice: Number(formData.salePrice),
                saleCurrency: formData.saleCurrency,
                paymentMethod: formData.paymentMethod,
                notes: formData.notes
            });
            onSuccess();
        } catch (err) {
            console.error('Error al convertir reserva a venta:', err);
            setError(err.message || 'Ocurrió un error al intentar convertir la reserva.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#161619] border border-[#33333A] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-[#33333A] flex justify-between items-center bg-[#1E1E24]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Handshake size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Convertir a Venta</h2>
                            <p className="text-xs text-neutral-400 mt-0.5">Formalizar oportunidad comercial</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        disabled={loading}
                        className="text-neutral-500 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* Alerta importante UX */}
                    <div className="mb-6 bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex gap-3 items-start">
                        <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-orange-200">
                            <span className="font-bold block mb-1">¡Atención!</span>
                            Esta acción marcará la reserva como convertida, el vehículo como vendido y el lead como convertido. No moverá caja ni generará recibos.
                        </div>
                    </div>

                    {/* Resumen de datos */}
                    <div className="bg-black/30 border border-neutral-800 rounded-xl p-4 mb-6 grid gap-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-neutral-500 uppercase">Cliente / Lead</span>
                            <span className="text-sm font-medium text-white">{clientName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-neutral-500 uppercase">Vehículo</span>
                            <span className="text-sm font-medium text-white truncate ml-4">{vehicleName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-neutral-500 uppercase">Seña Aplicada</span>
                            <span className="text-sm font-bold text-green-400">
                                {reservation.depositCurrency} {(reservation.depositAmount || 0).toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-neutral-500 uppercase">Vendedor</span>
                            <span className="text-sm font-medium text-white">{reservation.salesperson || 'No asignado'}</span>
                        </div>
                    </div>

                    <div className="mb-6 flex gap-2 items-start text-xs text-neutral-400 bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                        <Info size={14} className="shrink-0 mt-0.5 text-blue-400" />
                        <p>Esta venta todavía no impacta en caja. La seña se aplicará solo como dato comercial de la venta.</p>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* Formulario de cierre */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                    Precio Final
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                        value={formData.salePrice}
                                        onChange={(e) => setFormData({...formData, salePrice: e.target.value})}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                    Moneda
                                </label>
                                <select
                                    className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer"
                                    value={formData.saleCurrency}
                                    onChange={(e) => setFormData({...formData, saleCurrency: e.target.value})}
                                    disabled={loading}
                                >
                                    <option value="USD">USD</option>
                                    <option value="ARS">ARS</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                Método de Pago
                            </label>
                            <select
                                className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer"
                                value={formData.paymentMethod}
                                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                                disabled={loading}
                            >
                                <option value="contado">Contado</option>
                                <option value="financiado">Financiado</option>
                                <option value="mixto">Mixto</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                Notas de la venta (opcional)
                            </label>
                            <textarea
                                rows={3}
                                className="w-full bg-black/40 border border-neutral-800 rounded-xl py-3 px-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                                placeholder="Condiciones especiales de entrega, aclaraciones comerciales..."
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-[#33333A] bg-[#1E1E24] flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl font-bold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConvert}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Convirtiendo...
                            </>
                        ) : (
                            <>
                                <Handshake size={18} />
                                Confirmar Venta
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
