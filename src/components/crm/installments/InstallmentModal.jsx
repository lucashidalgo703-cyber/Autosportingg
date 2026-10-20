import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, DollarSign, FileText, Activity, User, Phone, Tag, Banknote, Search, CheckCircle2, AlertTriangle, Car as CarIcon, RefreshCw } from 'lucide-react';

export default function InstallmentModal({ isOpen, onClose, installment, onSave, mode = 'edit' }) {
    const [formData, setFormData] = useState({
        saleId: '',
        clientId: '',
        vehicleId: '',
        installmentNumber: 1,
        dueDate: '',
        amount: '',
        currency: 'ARS',
        status: 'pendiente',
        notes: '',
        source: 'venta',
        customerName: '',
        customerPhone: '',
        concept: '',
        paymentMethod: ''
    });

    // Estado para búsqueda en vivo de venta vinculada
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedSaleData, setSelectedSaleData] = useState(null);

    const searchSales = useCallback(async (query) => {
        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/sales/search-for-installments?q=${encodeURIComponent(query.trim())}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.ok && Array.isArray(data.sales)) {
                    setSearchResults(data.sales);
                }
            }
        } catch (err) {
            console.error('Error buscando ventas para cuotas:', err);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                searchSales(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [searchQuery, searchSales]);

    const handleSelectSale = (sale) => {
        setSelectedSaleData(sale);
        setFormData(prev => ({
            ...prev,
            saleId: sale._id,
            clientId: sale.client?._id || '',
            vehicleId: sale.vehicle?._id || '',
            currency: sale.currency || 'ARS',
            installmentNumber: sale.nextInstallmentNumber || (prev.installmentNumber || 1),
            amount: prev.amount || (sale.pendingBalance > 0 ? String(Math.round(sale.pendingBalance)) : '')
        }));
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleClearSelectedSale = () => {
        setSelectedSaleData(null);
        setFormData(prev => ({
            ...prev,
            saleId: '',
            clientId: '',
            vehicleId: ''
        }));
    };

    useEffect(() => {
        if (installment && isOpen) {
            setFormData({
                saleId: installment.saleId || '',
                clientId: installment.clientId || '',
                vehicleId: installment.vehicleId || '',
                installmentNumber: installment.installmentNumber || 1,
                dueDate: installment.dueDate ? new Date(installment.dueDate).toISOString().split('T')[0] : '',
                amount: installment.amount || '',
                currency: installment.currency || 'ARS',
                status: installment.status || 'pendiente',
                notes: installment.notes || '',
                source: installment.source || (installment.saleId ? 'venta' : 'manual'),
                customerName: installment.customerName || '',
                customerPhone: installment.customerPhone || '',
                concept: installment.concept || '',
                paymentMethod: installment.paymentMethod || ''
            });
        } else if (isOpen && mode === 'create') {
            // Default to manual if no saleId is provided from context
            setFormData(prev => ({
                ...prev,
                saleId: '',
                clientId: '',
                vehicleId: '',
                installmentNumber: 1,
                dueDate: '',
                amount: '',
                currency: 'ARS',
                status: 'pendiente',
                notes: '',
                source: 'venta',
                customerName: '',
                customerPhone: '',
                concept: '',
                paymentMethod: ''
            }));
        }
    }, [installment, isOpen, mode]);

    if (!isOpen) return null;

    const cleanOptionalId = (value) => {
        if (!value) return undefined;
        if (typeof value === "string" && value.trim() === "") return undefined;
        if (typeof value === "object" && value._id) return value._id;
        return value;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const data = {
            ...formData,
            saleId: cleanOptionalId(formData.saleId),
            clientId: cleanOptionalId(formData.clientId),
            vehicleId: cleanOptionalId(formData.vehicleId),
            amount: Number(formData.amount),
            installmentNumber: Number(formData.installmentNumber) || 1
        };

        if (formData.source === 'manual') {
            delete data.saleId; // Force remove saleId if manual
        }
        
        Object.keys(data).forEach((key) => {
            if (data[key] === undefined || data[key] === "") {
                delete data[key];
            }
        });

        await onSave(data);
    };

    const isManual = formData.source === 'manual';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="bg-crm-surface border border-neutral-800 rounded-2xl w-full max-w-lg relative z-10 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-neutral-800 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {mode === 'create' ? 'Crear Cuota / Cuenta por Cobrar' : `Gestionar Cuota ${formData.installmentNumber}`}
                        </h2>
                        {mode === 'edit' && (
                            <p className="text-xs text-neutral-500 mt-1">Modifica los detalles de la cuota.</p>
                        )}
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-crm-surface-raised/50 text-neutral-400 hover:text-white hover:bg-crm-surface-raised transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="installment-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                        
                        {mode === 'create' && !installment?.saleId && (
                            <div className="flex bg-neutral-900 rounded-xl p-1 border border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, source: 'venta' })}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                                        !isManual ? 'bg-blue-600/20 text-blue-500 border border-blue-500/20' : 'text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    Vinculada a Venta
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, source: 'manual' })}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                                        isManual ? 'bg-purple-600/20 text-purple-500 border border-purple-500/20' : 'text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    Manual Independiente
                                </button>
                            </div>
                        )}

                        {!isManual && mode === 'create' && !installment?.saleId && (
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                                    Venta Asociada
                                </label>
                                
                                {selectedSaleData ? (
                                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white text-sm">
                                                        {selectedSaleData.client?.name || 'Cliente directo'}
                                                    </span>
                                                    {selectedSaleData.vehicle?.plate && (
                                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-blue-300 border border-blue-500/20">
                                                            {selectedSaleData.vehicle.plate}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-neutral-400 mt-0.5">
                                                    {selectedSaleData.vehicle?.description || 'Vehículo'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleClearSelectedSale}
                                                className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold"
                                            >
                                                Cambiar venta
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-blue-500/20">
                                            <div>
                                                <span className="text-neutral-500">Saldo pendiente:</span>{' '}
                                                <span className="font-bold text-emerald-400">
                                                    {selectedSaleData.currency} {Number(selectedSaleData.pendingBalance || 0).toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-neutral-500">Precio total:</span>{' '}
                                                <span className="font-bold text-neutral-300">
                                                    {selectedSaleData.currency} {Number(selectedSaleData.salePrice || 0).toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedSaleData.installmentsCount > 0 && (
                                            <div className="text-[11px] text-blue-300 bg-blue-900/30 px-2.5 py-1.5 rounded-lg border border-blue-700/30 flex items-center gap-1.5">
                                                <CheckCircle2 size={13} className="shrink-0" />
                                                <span>
                                                    Ya existen {selectedSaleData.installmentsCount} cuotas registradas (Total: {selectedSaleData.currency} {Number(selectedSaleData.installmentsTotal || 0).toLocaleString('es-AR')}). Sugerida: Cuota #{selectedSaleData.nextInstallmentNumber}.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="relative space-y-2">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Buscar por cliente, patente, marca o modelo..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 pr-10 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                                autoFocus
                                            />
                                            {isSearching && (
                                                <RefreshCw size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
                                            )}
                                        </div>

                                        {/* Dropdown de resultados */}
                                        {searchQuery.trim().length >= 2 && (
                                            <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden divide-y divide-neutral-800 max-h-56 overflow-y-auto shadow-2xl">
                                                {searchResults.length === 0 && !isSearching ? (
                                                    <p className="p-4 text-xs text-neutral-400 italic text-center">
                                                        No se encontraron operaciones activas coincidentes.
                                                    </p>
                                                ) : (
                                                    searchResults.map(s => (
                                                        <button
                                                            key={s._id}
                                                            type="button"
                                                            onClick={() => handleSelectSale(s)}
                                                            className="w-full p-3 text-left hover:bg-neutral-800/70 transition-colors flex items-center justify-between gap-3"
                                                        >
                                                            <div className="space-y-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-white text-xs">
                                                                        {s.client?.name || 'Cliente'}
                                                                    </span>
                                                                    {s.vehicle?.plate && (
                                                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black text-blue-300 border border-blue-900">
                                                                            {s.vehicle.plate}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[11px] text-neutral-400">
                                                                    {s.vehicle?.description}
                                                                </p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-xs font-black text-emerald-400">
                                                                    Saldo: {s.currency} {Number(s.pendingBalance || 0).toLocaleString('es-AR')}
                                                                </p>
                                                                <p className="text-[10px] text-neutral-500">
                                                                    {s.installmentsCount} cuotas exist.
                                                                </p>
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {isManual && (
                            <>
                                <div>
                                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Nombre del Deudor / Cliente</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                        <input
                                            type="text"
                                            required={isManual}
                                            placeholder="Ej: Juan Pérez"
                                            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                            value={formData.customerName}
                                            onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Teléfono (Opcional)</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Ej: 1123456789"
                                                className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                                value={formData.customerPhone}
                                                onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Concepto (Opcional)</label>
                                        <div className="relative">
                                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Ej: Préstamo, Saldo..."
                                                className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                                value={formData.concept}
                                                onChange={(e) => setFormData({...formData, concept: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {!isManual && (
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Número de Cuota</label>
                                <input
                                    type="number"
                                    required={!isManual}
                                    min="1"
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                    value={formData.installmentNumber}
                                    onChange={(e) => setFormData({...formData, installmentNumber: e.target.value})}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Vencimiento</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                                    />
                                </div>
                            </div>
                            {isManual && (
                                <div>
                                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Método Pago Prometido</label>
                                    <div className="relative">
                                        <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                        <select
                                            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none"
                                            value={formData.paymentMethod}
                                            onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="efectivo">Efectivo</option>
                                            <option value="transferencia">Transferencia</option>
                                            <option value="cheque">Cheque</option>
                                            <option value="otro">Otro</option>
                                        </select>
                                    </div>
                                </div>
                            )}
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

                        {selectedSaleData && Number(formData.amount) > Number(selectedSaleData.pendingBalance) && (
                            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-medium">
                                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                                <span>
                                    Atención: El importe ingresado ({formData.currency} {Number(formData.amount).toLocaleString('es-AR')}) supera el saldo pendiente de la venta ({formData.currency} {Number(selectedSaleData.pendingBalance).toLocaleString('es-AR')}). Verificá que no estés duplicando deuda.
                                </span>
                            </div>
                        )}

                        {mode === 'edit' && (
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Estado</label>
                                <div className="relative">
                                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                    <select
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                                        value={formData.status}
                                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                                    >
                                        <option value="pendiente">Pendiente</option>
                                        <option value="pagada_manual">Pagada Manualmente</option>
                                        <option value="anulada">Anulada</option>
                                    </select>
                                </div>
                                {formData.status === 'pagada_manual' && (
                                    <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-500 font-medium">
                                        Marcar como pagada manualmente no registra dinero en caja. Para registrar el cobro real, cargá un movimiento en Finanzas.
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Notas (Opcional)</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-3 text-neutral-500" size={16} />
                                <textarea
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors resize-none"
                                    rows="3"
                                    placeholder="Detalles adicionales..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                ></textarea>
                            </div>
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
                        form="installment-form"
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors"
                    >
                        Guardar {isManual ? 'Cuenta' : 'Cuota'}
                    </button>
                </div>
            </div>
        </div>
    );
}
