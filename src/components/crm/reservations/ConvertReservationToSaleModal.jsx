"use client";
import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { X, DollarSign, Handshake, AlertTriangle, Info } from 'lucide-react';
import { useAdminReservations } from '../../../hooks/useAdminReservations';

export default function ConvertReservationToSaleModal({ isOpen, onClose, onSuccess, reservation }) {
    const { convertReservationToSale } = useAdminReservations();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [conflictData, setConflictData] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);

    const [formData, setFormData] = useState({
        salePrice: 0,
        saleCurrency: 'USD',
        paymentMethod: 'contado',
        notes: '',
        hasTradeIn: false,
        tradeInBrand: '',
        tradeInModel: '',
        tradeInYear: new Date().getFullYear(),
        tradeInEstimatedValue: 0
    });

    const [clientSearch, setClientSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchingClient, setSearchingClient] = useState(false);
    const [linkingClient, setLinkingClient] = useState(false);

    // Búsqueda de clientes
    useEffect(() => {
        if (clientSearch.length > 2) {
            const delayDebounceFn = setTimeout(async () => {
                setSearchingClient(true);
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`/api/admin/clients?search=${encodeURIComponent(clientSearch)}&limit=5`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setSearchResults(data.clients || []);
                    }
                } catch (err) {
                    console.error("Error searching clients", err);
                } finally {
                    setSearchingClient(false);
                }
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setSearchResults([]);
        }
    }, [clientSearch]);

    const handleLinkClient = async (clientId) => {
        setLinkingClient(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const reservationId = reservation?._id || reservation?.id;
            const res = await fetch(`/api/admin/reservations/${reservationId}/link-client`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ clientId })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al vincular cliente');
            }
            if (typeof onSuccess === 'function') {
                await onSuccess(); // Recargar datos para que venga con cliente poblado
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLinkingClient(false);
        }
    };

    useEffect(() => {
        if (isOpen && reservation) {
            setFormData({
                salePrice: reservation.agreedPrice || 0,
                saleCurrency: reservation.agreedCurrency || 'USD',
                paymentMethod: 'contado',
                notes: '',
                hasTradeIn: false,
                tradeInBrand: '',
                tradeInModel: '',
                tradeInYear: new Date().getFullYear(),
                tradeInEstimatedValue: 0
            });
            setError(null);
            setConflictData(null);
            setShowCancelModal(false);
            setCancelReason('');
        }
    }, [isOpen, reservation]);

    if (!isOpen || !reservation) return null;

    const vehicleName = reservation.vehicleId ? `${reservation.vehicleId.brand} ${reservation.vehicleId.name}` : 'Vehículo no asignado';
    const hasClient = !!reservation.clientId;
    const clientName = hasClient 
        ? (reservation.clientId.fullName || reservation.clientId.firstName || 'Sin Nombre') 
        : 'Cliente No Vinculado';

    const handleConvert = async () => {
        const reservationId = reservation?._id || reservation?.id;
        if (!reservationId) {
            setError("No se pudo identificar la reserva. Faltan datos requeridos.");
            return;
        }

        if (!hasClient) {
            setError("Debes vincular un cliente antes de convertir la reserva.");
            return;
        }

        if (formData.salePrice < 0) {
            setError("El precio de venta no puede ser negativo.");
            return;
        }

        setLoading(true);
        setError(null);
        setConflictData(null);

        try {
            if (typeof convertReservationToSale !== 'function') {
                throw new Error('La función de conversión no está disponible en el hook.');
            }

            let tradeIns = [];
            let tradeInTotalAmount = 0;
            if (formData.hasTradeIn && formData.tradeInEstimatedValue > 0) {
                const yearNum = formData.tradeInYear ? Number(formData.tradeInYear) : undefined;
                const estValueNum = Number(formData.tradeInEstimatedValue) || 0;
                
                tradeIns.push({
                    brand: formData.tradeInBrand || 'S/D',
                    model: formData.tradeInModel || 'S/D',
                    year: isNaN(yearNum) ? undefined : yearNum,
                    estimatedValue: isNaN(estValueNum) ? 0 : estValueNum,
                    currency: formData.saleCurrency
                });
                tradeInTotalAmount = isNaN(estValueNum) ? 0 : estValueNum;
            }

            const balanceAfterTradeIn = Number(formData.salePrice) - (reservation.depositAmount || 0) - tradeInTotalAmount;

            await convertReservationToSale(reservationId, {
                salePrice: Number(formData.salePrice),
                saleCurrency: formData.saleCurrency,
                paymentMethod: formData.paymentMethod,
                notes: formData.notes,
                tradeIns,
                tradeInTotalAmount,
                balanceAfterTradeIn
            });
            
            if (typeof onSuccess === 'function') {
                await onSuccess();
            }
        } catch (err) {
            console.error('Error al convertir reserva a venta:', err);
            if (err.data && err.data.activeSaleId) {
                setConflictData(err.data);
            } else {
                let errorMsg = err.message || 'Ocurrió un error al intentar convertir la reserva.';
                if (errorMsg.includes('validation failed') || errorMsg.includes('Cast to Number failed')) {
                    errorMsg = 'No se pudo guardar el vehículo recibido. Revisá año y valor tomado.';
                } else if (errorMsg.includes('timed out') || errorMsg.includes('buffering')) {
                    errorMsg = 'No se pudo convertir la reserva en venta. Reintentá en unos segundos.';
                }
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancelActiveSale = async () => {
        if (!cancelReason.trim()) {
            toast.error('El motivo es obligatorio.');
            return;
        }

        setIsCancelling(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/sales/${conflictData.activeSaleId}/cancel`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: cancelReason })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al anular la venta');
            }

            // Éxito, ocultar el conflicto para permitir intentar de nuevo
            setConflictData(null);
            setShowCancelModal(false);
            setCancelReason('');
            toast.error('Venta anulada correctamente. Ahora podés intentar convertir la reserva.');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsCancelling(false);
        }
    };

    const handleCreateClientFromLead = async () => {
        if (!reservation.leadId) return;
        setLinkingClient(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const reservationId = reservation?._id || reservation?.id;

            // 1. Crear el cliente
            const clientPayload = {
                fullName: reservation.leadId.name,
                phone: reservation.leadId.phone,
                source: 'otro',
                notes: 'Creado automáticamente desde reserva/lead'
            };

            const createRes = await fetch(`/api/admin/clients`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clientPayload)
            });

            if (!createRes.ok) {
                const data = await createRes.json();
                throw new Error(data.message || 'Error al crear cliente');
            }

            const clientData = await createRes.json();
            const newClientId = clientData._id || clientData.id;

            // 2. Vincular a la reserva
            const linkRes = await fetch(`/api/admin/reservations/${reservationId}/link-client`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ clientId: newClientId })
            });

            if (!linkRes.ok) {
                const data = await linkRes.json();
                throw new Error(data.error || 'Error al vincular el cliente recién creado');
            }

            if (typeof onSuccess === 'function') {
                await onSuccess();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLinkingClient(false);
        }
    };

    const handleClose = () => {
        if (typeof onClose === 'function') {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-crm-surface border border-crm-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-crm-border bg-crm-surface flex justify-between items-center rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-crm-red/10 flex items-center justify-center border border-crm-red/20">
                            <Handshake size={20} className="text-crm-red" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Convertir a Venta</h2>
                            <p className="text-xs text-crm-fg-muted mt-0.5">Formalizar oportunidad comercial</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleClose}
                        disabled={loading}
                        className="text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface-raised p-2 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* Conflicto de Venta Activa */}
                    {conflictData && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col gap-3">
                            <div className="flex gap-3 items-start">
                                <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-red-200">
                                    <span className="font-bold block mb-1">Este vehículo ya tiene una venta activa asociada.</span>
                                    <p className="opacity-80 mb-2">No se puede convertir la reserva hasta que la venta actual sea anulada o resuelta.</p>
                                    <div className="bg-black/40 p-2 rounded text-xs space-y-1 mb-3 font-medium">
                                        <div className="flex justify-between">
                                            <span className="text-red-400/80">Vehículo:</span>
                                            <span>{vehicleName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-red-400/80">Cliente:</span>
                                            <span>{conflictData.activeSaleClientName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-red-400/80">Estado:</span>
                                            <span className="uppercase">{conflictData.activeSaleStatus}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2">
                                        <a 
                                            href={`/admin/ventas/${conflictData.activeSaleId}`} 
                                            target="_blank" rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs font-bold transition-colors"
                                        >
                                            Ver venta activa
                                        </a>
                                        <button 
                                            onClick={() => setShowCancelModal(true)}
                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold transition-colors"
                                        >
                                            Anular venta activa
                                        </button>
                                        <button 
                                            onClick={() => setConflictData(null)}
                                            className="px-3 py-1.5 bg-transparent border border-red-500/30 hover:bg-red-500/10 text-red-300 rounded text-xs font-bold transition-colors"
                                        >
                                            Reintentar conversión
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {showCancelModal && (
                                <div className="mt-2 p-3 bg-red-950/40 border border-red-500/30 rounded-lg">
                                    <p className="text-xs text-red-300 mb-2 font-bold flex items-center gap-1">
                                        <Info size={12} />
                                        La venta quedará anulada para auditoría. No se modificarán caja, cuotas ni movimientos financieros automáticamente.
                                    </p>
                                    <input 
                                        type="text" 
                                        placeholder="Motivo de la anulación (obligatorio)" 
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        className="w-full bg-black/40 border border-red-500/30 rounded py-2 px-3 text-sm text-white mb-2 focus:outline-none focus:border-red-500"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => setShowCancelModal(false)}
                                            className="px-3 py-1.5 bg-neutral-800 text-neutral-300 text-xs rounded font-bold"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={handleCancelActiveSale}
                                            disabled={isCancelling || !cancelReason.trim()}
                                            className="px-3 py-1.5 bg-red-600 text-white text-xs rounded font-bold disabled:opacity-50"
                                        >
                                            {isCancelling ? 'Anulando...' : 'Confirmar anulación'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Alerta importante UX */}
                    <div className="mb-6 bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex gap-3 items-start">
                        <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-orange-200">
                            <span className="font-bold block mb-1">¡Atención!</span>
                            Esta acción marcará la reserva como convertida, el vehículo como vendido y el lead como convertido. No moverá caja ni generará recibos.
                        </div>
                    </div>

                    {/* Alerta si no hay cliente */}
                    {!hasClient && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex gap-3 items-start">
                            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                            <div className="text-sm text-red-200">
                                <span className="font-bold block mb-1">Cliente no vinculado</span>
                                Esta reserva no tiene un cliente vinculado. Buscá y vinculá un cliente para habilitar la conversión a venta.
                            </div>
                        </div>
                    )}

                    {/* Resumen de datos */}
                    <div className="bg-crm-bg border border-crm-border rounded-xl p-4 mb-6 grid gap-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-crm-fg-muted uppercase">Cliente / Lead</span>
                            <span className={`text-sm font-medium ${hasClient ? 'text-white' : 'text-red-400'}`}>{clientName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-crm-fg-muted uppercase">Vehículo</span>
                            <span className="text-sm font-medium text-white truncate ml-4">{vehicleName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-crm-fg-muted uppercase">Seña Aplicada</span>
                            <span className="text-sm font-bold text-green-400">
                                {reservation.depositCurrency} {(reservation.depositAmount || 0).toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-crm-fg-muted uppercase">Vendedor</span>
                            <span className="text-sm font-medium text-white">{reservation.salesperson || 'No asignado'}</span>
                        </div>
                    </div>

                    <div className="mb-6 flex gap-2 items-start text-xs text-crm-fg-muted bg-crm-bg p-3 rounded-lg border border-crm-border">
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
                                <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-2">
                                    Precio Final
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        className="w-full bg-crm-bg border border-crm-border rounded-xl py-2.5 pl-9 pr-4 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors"
                                        value={formData.salePrice}
                                        onChange={(e) => setFormData({...formData, salePrice: e.target.value})}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-2">
                                    Moneda
                                </label>
                                <select
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl py-2.5 px-4 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors appearance-none cursor-pointer"
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
                            <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-2">
                                Método de Pago
                            </label>
                            <select
                                className="w-full bg-crm-bg border border-crm-border rounded-xl py-2.5 px-4 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors appearance-none cursor-pointer"
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
                            <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-2">
                                Notas de la venta (opcional)
                            </label>
                            <textarea
                                rows={3}
                                className="w-full bg-crm-bg border border-crm-border rounded-xl py-3 px-4 text-crm-fg placeholder:text-crm-fg-muted focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors resize-none"
                                placeholder="Condiciones especiales de entrega, aclaraciones comerciales..."
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                disabled={loading}
                            />
                        </div>
                        <div className="bg-crm-surface-raised border border-crm-border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-bold text-white flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.hasTradeIn} 
                                        onChange={(e) => setFormData({...formData, hasTradeIn: e.target.checked})}
                                        className="rounded border-crm-border bg-crm-bg text-crm-red focus:ring-crm-red"
                                    />
                                    ¿El cliente entrega vehículo en parte de pago?
                                </label>
                            </div>

                            {formData.hasTradeIn && (
                                <div className="space-y-4 pt-2 border-t border-crm-border">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-1">Marca</label>
                                            <input type="text" value={formData.tradeInBrand} onChange={(e) => setFormData({...formData, tradeInBrand: e.target.value})} className="w-full bg-crm-bg border border-crm-border rounded py-2 px-3 text-sm text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" placeholder="Ej. Toyota" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-1">Modelo</label>
                                            <input type="text" value={formData.tradeInModel} onChange={(e) => setFormData({...formData, tradeInModel: e.target.value})} className="w-full bg-crm-bg border border-crm-border rounded py-2 px-3 text-sm text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" placeholder="Ej. Corolla" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-1">Año</label>
                                            <input type="number" value={formData.tradeInYear} onChange={(e) => setFormData({...formData, tradeInYear: e.target.value})} className="w-full bg-crm-bg border border-crm-border rounded py-2 px-3 text-sm text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-1">Valor Tomado ({formData.saleCurrency})</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-red" size={14} />
                                            <input type="number" value={formData.tradeInEstimatedValue} onChange={(e) => setFormData({...formData, tradeInEstimatedValue: e.target.value})} className="w-full bg-crm-bg border border-crm-border rounded py-2 pl-8 pr-3 text-sm text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red font-bold" />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-crm-bg border border-crm-border p-3 rounded-lg flex justify-between items-center">
                                        <span className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Diferencia / Saldo:</span>
                                        <span className="text-sm font-black text-white">
                                            {formData.saleCurrency} {(Number(formData.salePrice) - (reservation.depositAmount || 0) - Number(formData.tradeInEstimatedValue)).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Buscador de clientes si no hay cliente */}
                    {!hasClient && (
                        <div className="mt-6 pt-6 border-t border-crm-border">
                            <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-2">
                                Vincular Cliente Existente
                            </label>
                            <input
                                type="text"
                                placeholder="Buscar por nombre, DNI, teléfono o email..."
                                className="w-full bg-crm-bg border border-crm-border rounded-xl py-2.5 px-4 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors mb-2"
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                disabled={linkingClient}
                            />
                            {searchingClient && <div className="text-xs text-crm-fg-muted mb-2">Buscando...</div>}
                            {searchResults.length > 0 && (
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {searchResults.map(client => (
                                        <div key={client._id} className="flex items-center justify-between bg-crm-surface-raised border border-crm-border rounded-xl p-3">
                                            <div>
                                                <p className="text-sm font-bold text-white">{client.fullName || client.firstName}</p>
                                                <p className="text-xs text-crm-fg-muted">{client.phone} {client.documentNumber ? `| DNI: ${client.documentNumber}` : ''}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleLinkClient(client._id)}
                                                disabled={linkingClient}
                                                className="px-3 py-1.5 text-xs font-bold bg-crm-red hover:bg-crm-red-hover text-white rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                Vincular
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {clientSearch.length > 2 && searchResults.length === 0 && !searchingClient && (
                                <div className="text-xs text-crm-fg-muted mb-2">No se encontraron clientes con esos datos.</div>
                            )}

                            {reservation.leadId && reservation.leadId.name && (
                                <div className="mt-4 pt-4 border-t border-crm-border">
                                    <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-2">
                                        O crear cliente desde el Lead asociado
                                    </label>
                                    <div className="bg-crm-surface-raised border border-crm-border rounded-xl p-3 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-bold text-white">{reservation.leadId.name}</p>
                                            <p className="text-xs text-crm-fg-muted">{reservation.leadId.phone}</p>
                                        </div>
                                        <button
                                            onClick={handleCreateClientFromLead}
                                            disabled={linkingClient}
                                            className="px-3 py-1.5 text-xs font-bold bg-crm-bg border border-crm-border hover:bg-crm-surface-raised text-white rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            Crear y Vincular
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-crm-border bg-crm-surface flex gap-3 justify-end rounded-b-2xl">
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl font-bold text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface-raised transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConvert}
                        disabled={loading || !hasClient}
                        className="px-6 py-2.5 rounded-xl font-bold bg-crm-red hover:bg-crm-red-hover text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
