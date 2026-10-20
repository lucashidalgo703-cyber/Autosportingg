"use client";

import React, { useState, useEffect } from 'react';
import {
    X,
    Car,
    Search,
    ArrowRight,
    AlertTriangle,
    CheckCircle2,
    DollarSign,
    FileText,
    Percent,
    ShieldAlert,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SaleChangeVehicleModal({
    isOpen,
    onClose,
    sale,
    onSuccess
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedCar, setSelectedCar] = useState(null);

    const [previewData, setPreviewData] = useState(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const [documentsChecklist, setDocumentsChecklist] = useState([
        { key: 'form_08', label: 'Formulario 08 / Transferencia de dominio', checked: false },
        { key: 'verif_policial', label: 'Verificación Policial (F-12)', checked: false },
        { key: 'informe_dominio', label: 'Informe de dominio e inhibición', checked: false },
        { key: 'seguro', label: 'Seguro y baja/alta de cobertura', checked: false },
        { key: 'recibo_entrega', label: 'Póliza / Recibo y Acta de entrega de la unidad', checked: false }
    ]);

    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Búsqueda de vehículos disponibles en stock
    useEffect(() => {
        if (!searchTerm || searchTerm.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const timeout = setTimeout(async () => {
            setIsSearching(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/admin/cars?search=${encodeURIComponent(searchTerm)}&status=Disponible&limit=10`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const list = data.cars || data.items || (Array.isArray(data) ? data : []);
                    // Filtrar para excluir el auto actual de la venta
                    const filtered = list.filter(c => c._id !== sale?.vehicleId?._id && c._id !== sale?.vehicleId);
                    setSearchResults(filtered);
                }
            } catch (err) {
                console.error('Error buscando vehículos:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchTerm, sale]);

    // Al seleccionar nuevo vehículo, pedir preview comparativa al backend
    const handleSelectNewCar = async (car) => {
        setSelectedCar(car);
        setIsLoadingPreview(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/sales/${sale._id}/change-vehicle/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newVehicleId: car._id })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'No se pudo generar la comparativa del vehículo');
                setSelectedCar(null);
                setPreviewData(null);
                return;
            }
            setPreviewData(data.preview);
            if (data.preview.documentsChecklist) {
                setDocumentsChecklist(data.preview.documentsChecklist);
            }
        } catch {
            toast.error('Error al conectar con el servidor para comparativa');
            setSelectedCar(null);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleToggleDoc = (key) => {
        setDocumentsChecklist(prev =>
            prev.map(d => d.key === key ? { ...d, checked: !d.checked } : d)
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCar) {
            toast.error('Debés seleccionar el nuevo vehículo.');
            return;
        }
        if (!reason || !reason.trim()) {
            toast.error('El motivo del cambio de vehículo es obligatorio.');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/sales/${sale._id}/change-vehicle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    newVehicleId: selectedCar._id,
                    reason: reason.trim(),
                    documentsChecklist,
                    notes: notes.trim()
                })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al cambiar vehículo');
                return;
            }
            toast.success(data.message || 'Vehículo cambiado con éxito');
            if (onSuccess) onSuccess();
            onClose();
        } catch {
            toast.error('Error de conexión al procesar cambio de vehículo');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !sale) return null;

    const currentCar = sale.vehicleId || {};
    const curr = sale.saleCurrency === 'USD' ? 'USD' : '$';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-crm-surface">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <RefreshCw size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Cambiar Vehículo de la Venta</h3>
                            <p className="text-xs text-neutral-400">
                                Reemplazar el vehículo asignado conservando cliente, cobros pactados y cuotas
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
                    {/* Sección 1: Vehículo Actual vs Nuevo Vehículo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Auto Actual */}
                        <div className="bg-black/40 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block mb-1">
                                    Vehículo Actual en Venta
                                </span>
                                <h4 className="text-sm font-bold text-white">
                                    {currentCar.brand || 'Sin marca'} {currentCar.name || 'Sin modelo'}
                                </h4>
                                <span className="text-xs font-mono text-neutral-400">
                                    {currentCar.plateOrVin || 'Sin patente'} {currentCar.year ? `· Año ${currentCar.year}` : ''}
                                </span>
                            </div>
                            <div className="mt-4 pt-3 border-t border-neutral-800/60 grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                    <span className="text-neutral-500 block">Costo de Compra:</span>
                                    <span className="font-mono text-neutral-300">
                                        {currentCar.purchasePrice ? `${currentCar.purchaseCurrency || '$'} ${Number(currentCar.purchasePrice).toLocaleString('es-AR')}` : 'No reg.'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-neutral-500 block">Inversor:</span>
                                    <span className="font-mono text-neutral-300">
                                        {currentCar.investor?.percentage ? `${currentCar.investor.percentage}% (${currentCar.investor.name || 'Inversor'})` : '100% Propio'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Nuevo Auto Seleccionado */}
                        <div className={`rounded-xl p-4 flex flex-col justify-between border transition-all ${
                            selectedCar
                                ? 'bg-blue-500/10 border-blue-500/40'
                                : 'bg-black/20 border-dashed border-neutral-800 flex items-center justify-center text-center'
                        }`}>
                            {selectedCar ? (
                                <>
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 block mb-1">
                                                Nuevo Vehículo Seleccionado
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedCar(null); setPreviewData(null); }}
                                                className="text-[10px] text-neutral-400 hover:text-white underline"
                                            >
                                                Cambiar selección
                                            </button>
                                        </div>
                                        <h4 className="text-sm font-bold text-white">
                                            {selectedCar.brand} {selectedCar.name}
                                        </h4>
                                        <span className="text-xs font-mono text-blue-300">
                                            {selectedCar.plateOrVin || 'Sin patente'} · Año {selectedCar.year}
                                        </span>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-blue-500/20 grid grid-cols-2 gap-2 text-[11px]">
                                        <div>
                                            <span className="text-neutral-400 block">Costo de Compra:</span>
                                            <span className="font-mono text-white font-bold">
                                                {selectedCar.purchasePrice ? `${selectedCar.purchaseCurrency || '$'} ${Number(selectedCar.purchasePrice).toLocaleString('es-AR')}` : 'No reg.'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-neutral-400 block">Inversor:</span>
                                            <span className="font-mono text-white font-bold">
                                                {selectedCar.investor?.percentage ? `${selectedCar.investor.percentage}% (${selectedCar.investor.name || 'Inversor'})` : '100% Propio'}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-4 space-y-1">
                                    <Car size={24} className="mx-auto text-neutral-600 mb-2" />
                                    <span className="text-xs font-bold text-neutral-400 block">Seleccioná una unidad abajo</span>
                                    <span className="text-[10px] text-neutral-500 block">Buscá por patente, marca o modelo disponible</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Selector / Buscador si no hay auto seleccionado */}
                    {!selectedCar && (
                        <div>
                            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                                Buscar unidad disponible en stock
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar por patente, marca o modelo (ej.: Corolla, AF123ZZ, Cronos)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/50 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Resultados */}
                            {searchResults.length > 0 && (
                                <div className="mt-2 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-800/60 max-h-48 overflow-y-auto shadow-xl">
                                    {searchResults.map((car) => (
                                        <div
                                            key={car._id}
                                            onClick={() => handleSelectNewCar(car)}
                                            className="p-3 hover:bg-neutral-800/80 cursor-pointer flex justify-between items-center transition-colors text-xs"
                                        >
                                            <div>
                                                <span className="font-bold text-white block">{car.brand} {car.name}</span>
                                                <span className="text-neutral-400 text-[11px] font-mono">
                                                    Patente: {car.plateOrVin || 'Sin patente'} · Año {car.year}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono text-emerald-400 font-bold block">
                                                    {car.currency || '$'} {Number(car.price || 0).toLocaleString('es-AR')}
                                                </span>
                                                <span className="text-[10px] text-neutral-500 uppercase">Disponible</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Comparativa y Alertas si se seleccionó vehículo */}
                    {selectedCar && previewData && (
                        <div className="space-y-4">
                            {/* Alerta de precio si difiere del pactado */}
                            {previewData.priceWarning && (
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex gap-3 items-start">
                                    <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                                    <div className="text-xs text-neutral-300">
                                        <strong className="text-amber-300 block mb-0.5">Precio pactado preservado</strong>
                                        <p>{previewData.priceWarning}</p>
                                    </div>
                                </div>
                            )}

                            {/* Indicadores de diferencias */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-black/30 border border-neutral-800 rounded-xl p-3">
                                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                                        Variación de Costo de Compra
                                    </span>
                                    <span className={`font-mono text-sm font-bold ${
                                        previewData.costDiff > 0 ? 'text-amber-400' : (previewData.costDiff < 0 ? 'text-emerald-400' : 'text-neutral-300')
                                    }`}>
                                        {previewData.costDiff > 0 ? '+' : ''}${Number(previewData.costDiff).toLocaleString('es-AR')}
                                    </span>
                                </div>
                                <div className="bg-black/30 border border-neutral-800 rounded-xl p-3">
                                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                                        Variación Part. Inversores
                                    </span>
                                    <span className="font-mono text-sm font-bold text-neutral-200">
                                        {previewData.investorDiff > 0 ? `+${previewData.investorDiff}%` : `${previewData.investorDiff}%`}
                                    </span>
                                </div>
                            </div>

                            {/* Checklist de Documentos Afectados */}
                            <div className="bg-black/30 border border-neutral-800 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                                    <FileText size={14} className="text-blue-400" />
                                    Documentación Afectada para Revisión
                                </h4>
                                <div className="space-y-2">
                                    {documentsChecklist.map((doc) => (
                                        <label
                                            key={doc.key}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800/40 cursor-pointer text-xs transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={doc.checked}
                                                onChange={() => handleToggleDoc(doc.key)}
                                                className="w-4 h-4 rounded text-blue-500 bg-black/40 border-neutral-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                            />
                                            <span className={`${doc.checked ? 'text-white font-medium line-through opacity-70' : 'text-neutral-300'}`}>
                                                {doc.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Motivo Obligatorio */}
                    {selectedCar && (
                        <div>
                            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                                Motivo obligatorio del cambio de vehículo <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                required
                                rows={3}
                                placeholder="Ej.: Corrección por error de carga en patente, cliente optó por la unidad Focus del mismo valor..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-black/50 border border-neutral-800 rounded-xl p-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                            />
                            <span className="text-[11px] text-neutral-500 mt-1 block">
                                Se registrará la desvinculación en el auto anterior (volverá a Disponible) y la vinculación en el nuevo auto y la venta.
                            </span>
                        </div>
                    )}

                    {/* Observaciones opcionales */}
                    {selectedCar && (
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                                Notas u observaciones internas (opcional)
                            </label>
                            <input
                                type="text"
                                placeholder="Detalles de entrega, acuerdos complementarios..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-black/50 border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition-colors"
                            />
                        </div>
                    )}

                    {/* Footer */}
                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedCar || !reason.trim()}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/10"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Guardando Cambio...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} />
                                    Confirmar Cambio de Vehículo
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
