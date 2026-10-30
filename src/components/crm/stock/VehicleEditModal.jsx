"use client";
import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, HelpCircle, FileText, Upload, Eye, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { parseArgentineMoney } from '../../../utils/saleCommercial';

export default function VehicleEditModal({ isOpen, onClose, onSave, vehicleData }) {
    const [formData, setFormData] = useState({});
    const [docFiles, setDocFiles] = useState({});
    const [deletedDocs, setDeletedDocs] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const docFieldsConfig = [
        { key: 'tituloAutomotor', label: 'Título Automotor' },
        { key: 'cedulaVerde', label: 'Cédula Verde/Azul' },
        { key: 'verificacionPolicial', label: 'Verificación Policial (12)' },
        { key: 'informeDominio', label: 'Informe de Dominio' },
        { key: 'formulario08', label: 'Formulario 08' },
        { key: 'libreDeudaPatentes', label: 'Libre Deuda Patentes' }
    ];

    useEffect(() => {
        if (isOpen && vehicleData) {
            setDeletedDocs([]);
            // Flatten the nested structure for the form.
            setFormData({
                brand: vehicleData.marca || '',
                name: vehicleData.modelo || '',
                description: vehicleData._original?.description || '',
                year: vehicleData.año || '',
                km: vehicleData.kilometraje || 0,
                fuel: vehicleData.combustible || 'Nafta',
                condition: vehicleData.condicion || 'Usado',
                price: vehicleData.precioPublicado || 0,
                currency: vehicleData.moneda || 'USD',
                status: vehicleData._original?.status || 'Disponible',
                visibleEnWeb: vehicleData.visibleEnWeb,
                
                // Internal fields
                purchasePrice: vehicleData.precioCompra || 0,
                purchaseCurrency: vehicleData.monedaCompra || 'USD',
                purchasePriceChangeType: 'correccion_precio',
                purchasePriceJustification: '',
                purchasePriceExpenseConcept: '',
                agencyOwned: vehicleData._original?.agencyOwned || vehicleData.origen === 'propio' || false,
                consignedBy: vehicleData._original?.consignedBy || (vehicleData.origen === 'consignación' ? 'Consignador' : ''),
                plateOrVin: vehicleData.dominio || '',
                location: vehicleData._original?.location || 'Salón Principal',
                notes: vehicleData.observaciones === 'Sin observaciones.' ? '' : vehicleData.observaciones,
                createdAt: vehicleData._original?.createdAt ? new Date(vehicleData._original.createdAt).toISOString().split('T')[0] : '',
                soldAt: vehicleData._original?.soldAt ? new Date(vehicleData._original.soldAt).toISOString().split('T')[0] : '',
                isSharedInvestment: !!(vehicleData.investor && vehicleData.investor.percentage > 0),
                investorName: vehicleData.investor?.name || '',
                investorPercentage: vehicleData.investor?.percentage || 50
            });
        }
    }, [isOpen, vehicleData]);

    if (!isOpen) return null;

    const isTradeIn = Boolean(
        vehicleData?.tradeInOrigin?.saleId || 
        vehicleData?.acquisitionSource === 'valor_de_toma' || 
        vehicleData?._original?.tradeInOrigin?.saleId
    );
    const initialPurchasePrice = parseArgentineMoney(vehicleData?.precioCompra ?? vehicleData?.tradeInOrigin?.value ?? 0) || 0;
    const currentPurchasePrice = parseArgentineMoney(formData.purchasePrice);
    const hasPurchasePriceChanged = Number.isFinite(currentPurchasePrice) && Math.abs(currentPurchasePrice - initialPurchasePrice) > 0.001;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleDocChange = (e, fieldName) => {
        const file = e.target.files[0];
        if (file) {
            setDocFiles(prev => ({ ...prev, [fieldName]: file }));
        }
    };

    const handleOrigenChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({
            ...prev,
            agencyOwned: val === 'propio',
            consignedBy: val === 'consignación' ? (prev.consignedBy || 'Dueño ') : ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const parsedPrice = parseArgentineMoney(formData.price);
        const parsedPurchasePrice = parseArgentineMoney(formData.purchasePrice);
        const parsedKm = parseArgentineMoney(formData.km);

        if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
            toast.error('El precio de publicación debe ser un número válido y positivo.');
            return;
        }

        if (Number.isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0) {
            toast.error('Ingresá un valor de toma / costo de compra válido (número positivo).');
            return;
        }

        if (Number.isNaN(parsedKm) || parsedKm < 0) {
            toast.error('El kilometraje debe ser un número válido y positivo.');
            return;
        }

        if (hasPurchasePriceChanged) {
            if (!String(formData.purchasePriceJustification || '').trim()) {
                toast.error(isTradeIn
                    ? 'Debés ingresar una justificación obligatoria para modificar el valor de toma acordado.'
                    : 'Debés ingresar una justificación obligatoria para modificar el costo de compra/toma.'
                );
                return;
            }
            if (!['correccion_precio', 'gasto_adicional'].includes(formData.purchasePriceChangeType)) {
                toast.error('Seleccioná si el cambio es una corrección del precio de compra/toma o un gasto adicional.');
                return;
            }
            if (formData.purchasePriceChangeType === 'gasto_adicional' && currentPurchasePrice <= initialPurchasePrice) {
                toast.error('Para registrar un gasto adicional, el nuevo importe debe ser superior al costo base actual.');
                return;
            }
        }

        try {
            setIsSaving(true);
            
            const payload = {
                brand: formData.brand,
                name: formData.name,
                description: formData.description,
                year: Number(formData.year),
                km: Number(formData.km),
                fuel: formData.fuel,
                condition: formData.condition,
                price: parsedPrice,
                currency: formData.currency,
                status: formData.status,
                visibleEnWeb: formData.visibleEnWeb,
                
                purchasePrice: parsedPurchasePrice,
                purchaseCurrency: formData.purchaseCurrency,
                ...(hasPurchasePriceChanged ? {
                    purchasePriceChangeType: formData.purchasePriceChangeType,
                    purchasePriceJustification: String(formData.purchasePriceJustification).trim(),
                    purchasePriceExpenseConcept: String(formData.purchasePriceExpenseConcept || '').trim()
                } : {}),
                agencyOwned: formData.agencyOwned,
                consignedBy: formData.consignedBy,
                plateOrVin: formData.plateOrVin,
                location: formData.location,
                notes: formData.notes,
                createdAt: formData.createdAt ? formData.createdAt : undefined,
                soldAt: formData.soldAt ? formData.soldAt : undefined,
                investor: formData.isSharedInvestment ? {
                    name: formData.investorName,
                    percentage: Number(formData.investorPercentage)
                } : { name: '', percentage: 0 }
            };

            const docsToUpload = Object.keys(docFiles).filter(key => docFiles[key] instanceof File);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');

            let docsUpdated = false;

            // Handle deletions
            if (deletedDocs.length > 0) {
                toast.loading('Eliminando documentos...', { id: 'deleteDocs' });
                for (const docKey of deletedDocs) {
                    const deleteRes = await fetch(`${baseUrl}/api/admin/cars/${vehicleData._original?._id || vehicleData.id}/docs/${docKey}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!deleteRes.ok) {
                        throw new Error(`Error al eliminar el documento ${docKey}`);
                    }
                }
                toast.success('Documentos eliminados', { id: 'deleteDocs' });
                docsUpdated = true;
            }

            if (docsToUpload.length > 0) {
                toast.loading('Guardando documentos...', { id: 'saveDocs' });
                const docsFormData = new FormData();
                docsToUpload.forEach(key => {
                    docsFormData.append(key, docFiles[key]);
                });

                const docsRes = await fetch(`${baseUrl}/api/admin/cars/${vehicleData._original?._id || vehicleData.id}/docs`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: docsFormData
                });

                if (!docsRes.ok) {
                    toast.error('Error al guardar los documentos', { id: 'saveDocs' });
                } else {
                    toast.success('Documentos subidos', { id: 'saveDocs' });
                    docsUpdated = true;
                }
            }
            
            
            // Save main vehicle data which will also trigger a refetch in the parent
            await onSave(payload);

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('vehicle-updated'));
            }
            
            if (docsUpdated) {
                toast.success('Vehículo y documentos actualizados', { id: 'saveVehicle' });
            } else {
                toast.success('Vehículo actualizado', { id: 'saveVehicle' });
            }
            
            onClose();
        } catch (error) {
            toast.error(error.message || 'Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const isVisibleWarning = !formData.visibleEnWeb;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-fadeIn">
            <div className="bg-crm-surface border border-crm-border rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
                
                {/* Header fijo al tope del modal (sin sticky problemático) */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border bg-crm-surface-raised shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-crm-red/10 border border-crm-red/30 flex items-center justify-center text-crm-red shrink-0">
                            <Edit size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-bold text-white leading-tight">Editar Vehículo</h2>
                                {vehicleData?.dominio && (
                                    <span className="text-[10px] font-mono font-bold bg-white/10 text-white/80 border border-white/20 px-2 py-0.5 rounded">
                                        {vehicleData.dominio}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-crm-fg-muted">
                                {vehicleData?.marca} {vehicleData?.modelo} {vehicleData?.año ? `• ${vehicleData.año}` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/admin/ayuda?tema=stock" className="p-1.5 text-crm-fg-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors" title="Ver ayuda sobre catálogo de vehículos">
                            <HelpCircle size={18} />
                        </Link>
                        <button onClick={onClose} className="p-1.5 text-crm-fg-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer" disabled={isSaving}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    {/* Contenido con scroll independiente sin superposición */}
                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* DATOS PÚBLICOS */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-crm-red font-semibold flex items-center gap-2 border-b border-crm-border pb-2">
                                Datos Públicos (Catálogo)
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Marca *</label>
                                    <input type="text" required name="brand" value={formData.brand} onChange={handleChange} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Modelo *</label>
                                    <input type="text" required name="name" value={formData.name} onChange={handleChange} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Versión / Descripción Corta</label>
                                <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="Ej. 1.4 TSI Highline" className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Año *</label>
                                    <input type="number" required min="1900" max={new Date().getFullYear() + 1} name="year" value={formData.year} onChange={handleChange} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Kilometraje *</label>
                                    <input type="number" required min="0" name="km" value={formData.km} onChange={handleChange} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Combustible</label>
                                    <select name="fuel" value={formData.fuel} onChange={handleChange} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="Nafta">Nafta</option>
                                        <option value="Diésel">Diésel</option>
                                        <option value="GNC">GNC</option>
                                        <option value="Híbrido">Híbrido</option>
                                        <option value="Eléctrico">Eléctrico</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Condición</label>
                                    <select name="condition" value={formData.condition} onChange={handleChange} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="Usado">Usado</option>
                                        <option value="0km">0km</option>
                                        <option value="Nuevo">Nuevo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-[1fr_80px] gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Precio Publicado *</label>
                                    <input type="number" required min="0" name="price" value={formData.price} onChange={handleChange} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Moneda</label>
                                    <select name="currency" value={formData.currency} onChange={handleChange} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="USD">USD</option>
                                        <option value="U$S">U$S</option>
                                        <option value="ARS">ARS</option>
                                        <option value="$">$</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 mt-2 bg-crm-surface-raised p-4 rounded-lg border border-crm-border">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" name="visibleEnWeb" checked={formData.visibleEnWeb} onChange={handleChange} className="w-5 h-5 rounded border-crm-red text-crm-red focus:ring-crm-red bg-crm-bg cursor-pointer" />
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium group-hover:text-crm-red transition-colors">Visible en Catálogo Público</span>
                                        <span className="text-xs text-crm-fg-muted">Si desmarcas, el auto se ocultará del sitio web.</span>
                                    </div>
                                </label>
                                {isVisibleWarning && (
                                    <div className="flex items-start gap-2 p-2 bg-[#EAB308]/10 border border-[#EAB308]/30 rounded mt-1">
                                        <AlertTriangle size={14} className="text-[#EAB308] mt-0.5 shrink-0" />
                                        <p className="text-xs text-[#EAB308]">El vehículo no aparecerá en Autosportingg.com.</p>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* DATOS INTERNOS */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-crm-fg-muted font-semibold flex items-center gap-2 border-b border-crm-border pb-2">
                                Datos Internos (Solo CRM)
                            </h3>
                            
                            <div className="grid grid-cols-[1fr_80px] gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider flex items-center justify-between">
                                        <span>{isTradeIn ? 'Valor de Toma Acordado' : 'Costo de Compra / Toma'}</span>
                                        {isTradeIn && (
                                            <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/30">
                                                Permuta
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        name="purchasePrice"
                                        value={formData.purchasePrice}
                                        onChange={handleChange}
                                        placeholder="0"
                                        className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red font-mono"
                                    />
                                    {Number.isFinite(currentPurchasePrice) && currentPurchasePrice > 0 && (
                                        <span className="text-[10px] text-crm-fg-muted">
                                            Interpretado: {formData.purchaseCurrency} {currentPurchasePrice.toLocaleString('es-AR')}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Moneda</label>
                                    <select name="purchaseCurrency" value={formData.purchaseCurrency} onChange={handleChange} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="USD">USD</option>
                                        <option value="ARS">ARS</option>
                                    </select>
                                </div>
                            </div>

                            {hasPurchasePriceChanged && (
                                <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-amber-300">Justificación obligatoria por cambio de costo</span>
                                        <span className="text-crm-fg-muted">
                                            Anterior: {formData.purchaseCurrency} {initialPurchasePrice.toLocaleString('es-AR')} → Nuevo: {formData.purchaseCurrency} {currentPurchasePrice.toLocaleString('es-AR')}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-semibold uppercase tracking-wider text-crm-fg-muted">Tipo de modificación *</label>
                                        <select
                                            name="purchasePriceChangeType"
                                            value={formData.purchasePriceChangeType || 'correccion_precio'}
                                            onChange={handleChange}
                                            className="rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white focus:border-crm-red focus:outline-none"
                                        >
                                            <option value="correccion_precio">Corrección del precio de compra / valor de toma acordado</option>
                                            <option value="gasto_adicional">Gasto adicional del vehículo (taller, gestoría, traslado, alistamiento)</option>
                                        </select>
                                        <p className="m-0 text-[11px] text-crm-fg-muted">
                                            {formData.purchasePriceChangeType === 'gasto_adicional'
                                                ? `Se mantendrá el costo base original (${formData.purchaseCurrency} ${initialPurchasePrice.toLocaleString('es-AR')}) y se sumará únicamente la diferencia (${formData.purchaseCurrency} ${Math.max(0, currentPurchasePrice - initialPurchasePrice).toLocaleString('es-AR')}) como gasto del vehículo, sin duplicar costos.`
                                                : 'Se corregirá el valor base de compra/toma sin generar un gasto adicional ni un egreso duplicado.'}
                                        </p>
                                    </div>

                                    {formData.purchasePriceChangeType === 'gasto_adicional' && (
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[11px] font-semibold uppercase tracking-wider text-crm-fg-muted">Concepto del gasto adicional</label>
                                            <input
                                                type="text"
                                                name="purchasePriceExpenseConcept"
                                                value={formData.purchasePriceExpenseConcept || ''}
                                                onChange={handleChange}
                                                placeholder="Ej: Reparación tren delantero / Gestoría / Chapista"
                                                className="rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white focus:border-crm-red focus:outline-none"
                                            />
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-semibold uppercase tracking-wider text-crm-fg-muted">Motivo / Justificación para el Historial Interno *</label>
                                        <input
                                            type="text"
                                            required
                                            name="purchasePriceJustification"
                                            value={formData.purchasePriceJustification || ''}
                                            onChange={handleChange}
                                            placeholder="Explicá por qué se modifica el valor de compra/toma..."
                                            className="rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white focus:border-crm-red focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Origen del Vehículo</label>
                                    <select 
                                        value={formData.agencyOwned ? 'propio' : (formData.consignedBy ? 'consignación' : 'tercero')} 
                                        onChange={handleOrigenChange} 
                                        className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red"
                                    >
                                        <option value="propio">Propio (Agencia)</option>
                                        <option value="consignación">Consignación</option>
                                        <option value="tercero">Tercero</option>
                                    </select>
                                </div>
                                {!formData.agencyOwned && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Consignado Por</label>
                                        <input type="text" name="consignedBy" value={formData.consignedBy} onChange={handleChange} placeholder="Nombre del dueño" className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 p-4 bg-crm-surface-raised border border-crm-border rounded-lg">
                                <label className="flex items-center gap-3 cursor-pointer group w-fit">
                                    <input type="checkbox" name="isSharedInvestment" checked={formData.isSharedInvestment} onChange={handleChange} className="w-5 h-5 rounded border-blue-500 text-blue-500 focus:ring-blue-500 bg-crm-bg cursor-pointer" />
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium group-hover:text-blue-400 transition-colors text-sm">Vehículo con inversión compartida</span>
                                        <span className="text-[10px] text-crm-fg-muted">El auto fue comprado a medias con un inversionista.</span>
                                    </div>
                                </label>

                                {formData.isSharedInvestment && (
                                    <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Nombre del Inversor *</label>
                                            <input list="edit-companies-datalist" type="text" name="investorName" value={formData.investorName || ''} onChange={handleChange} required={formData.isSharedInvestment} placeholder="Seleccionar empresa o nombre..." className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                            <datalist id="edit-companies-datalist">
                                                <option value="LHIVER" />
                                                <option value="AUTOTERRA" />
                                                <option value="AKAR" />
                                                <option value="ALWAYS SAS" />
                                            </datalist>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Porcentaje (%) *</label>
                                            <input type="number" name="investorPercentage" value={formData.investorPercentage || ''} onChange={handleChange} required={formData.isSharedInvestment} min="1" max="100" className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Dominio / VIN</label>
                                    <input type="text" name="plateOrVin" value={formData.plateOrVin} onChange={handleChange} placeholder="Ej. AE 123 CD" className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red uppercase" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Ubicación Física</label>
                                    <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Ej. Salón, Taller" className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Estado Operativo</label>
                                    <select name="status" value={formData.status} onChange={handleChange} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="Disponible">Disponible</option>
                                        <option value="Reservado">Reservado</option>
                                        <option value="Vendido">Vendido</option>
                                        <option value="Pausado">Pausado</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Fecha Ingreso</label>
                                    <input type="date" name="createdAt" value={formData.createdAt} onChange={handleChange} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red appearance-none" style={{colorScheme: 'dark'}} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Fecha Venta</label>
                                    <input type="date" name="soldAt" value={formData.soldAt} onChange={handleChange} disabled={formData.status !== 'Vendido'} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red appearance-none disabled:opacity-50" style={{colorScheme: 'dark'}} />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 flex-1">
                                <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Observaciones Internas</label>
                                <textarea 
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Detalles, reparaciones pendientes, historial..."
                                    className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red resize-none flex-1 min-h-[100px]"
                                />
                            </div>

                        </div>
                    </div>

                    {/* DOCUMENTACIÓN REGISTRAL */}
                        <div>
                            <h3 className="text-crm-fg-muted font-semibold flex items-center gap-2 border-b border-crm-border pb-2 mb-4">
                                <FileText size={16} /> Documentación Registral (Archivos)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {docFieldsConfig.map(field => {
                                    const existingUrl = vehicleData?._original?.documentationFiles?.[field.key] || vehicleData?.documentationFiles?.[field.key];
                                    const hasNewFile = docFiles[field.key] instanceof File;
                                    
                                    return (
                                        <div key={field.key} className="flex flex-col gap-2 p-3 bg-crm-bg border border-crm-border rounded-lg">
                                            <span className="text-xs font-medium text-white">{field.label}</span>
                                            <div className="flex items-center gap-2">
                                                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-crm-surface-raised hover:bg-crm-surface-raised-hover cursor-pointer border border-crm-border border-dashed rounded text-xs text-crm-fg-muted transition-colors text-center">
                                                    <Upload size={14} />
                                                    <span className="truncate">{hasNewFile ? docFiles[field.key].name : 'Subir archivo'}</span>
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        accept="image/png, image/jpeg, image/webp, application/pdf"
                                                        onChange={(e) => handleDocChange(e, field.key)} 
                                                    />
                                                </label>
                                                {existingUrl && !hasNewFile && !deletedDocs.includes(field.key) && (
                                                    <div className="flex items-center gap-1">
                                                        <a href={existingUrl} target="_blank" rel="noreferrer" className="p-2 bg-crm-surface-raised hover:bg-crm-surface-raised-hover border border-crm-border rounded text-crm-fg-muted hover:text-white transition-colors" title="Ver archivo actual">
                                                            <Eye size={16} />
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeletedDocs(prev => [...prev, field.key])}
                                                            className="p-2 bg-crm-surface-raised hover:bg-crm-surface-raised-hover border border-crm-border rounded text-crm-fg-muted hover:text-crm-red transition-colors cursor-pointer"
                                                            title="Eliminar archivo"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer fijo al pie del modal */}
                    <div className="px-6 py-4 border-t border-crm-border bg-crm-surface-raised flex items-center justify-between shrink-0">
                        <span className="text-xs text-crm-fg-muted hidden sm:inline">
                            Los cambios actualizan automáticamente el stock y la ficha técnica
                        </span>
                        <div className="flex items-center gap-3 ml-auto">
                            <button 
                                type="button" 
                                onClick={onClose}
                                disabled={isSaving}
                                className="px-4 py-2 bg-transparent border border-crm-border text-crm-fg rounded-lg hover:bg-crm-surface-raised transition-colors font-medium text-xs cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="px-5 py-2 bg-crm-red hover:bg-red-600 text-white rounded-lg transition-all font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                            >
                                {isSaving ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div> : <Save size={14} />}
                                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}
