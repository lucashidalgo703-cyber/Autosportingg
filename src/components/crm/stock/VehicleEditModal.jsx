"use client";
import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehicleEditModal({ isOpen, onClose, onSave, vehicleData }) {
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && vehicleData) {
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
                agencyOwned: vehicleData.origen === 'propio',
                consignedBy: vehicleData.origen === 'consignación' ? (vehicleData._original?.consignedBy || 'Consignador') : '',
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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleOrigenChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({
            ...prev,
            agencyOwned: val === 'propio',
            consignedBy: val === 'consignación' ? prev.consignedBy : ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.price < 0 || formData.purchasePrice < 0 || formData.km < 0) {
            toast.error('Precios y kilometraje deben ser positivos.');
            return;
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
                price: Number(formData.price),
                currency: formData.currency,
                status: formData.status,
                visibleEnWeb: formData.visibleEnWeb,
                
                purchasePrice: Number(formData.purchasePrice),
                purchaseCurrency: formData.purchaseCurrency,
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

            await onSave(payload);
            toast.success('Vehículo actualizado');
            onClose();
        } catch (error) {
            toast.error(error.message || 'Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const isVisibleWarning = !formData.visibleEnWeb;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-crm-surface border border-crm-border rounded-xl w-full max-w-4xl my-8 flex flex-col relative">
                
                <div className="flex items-center justify-between p-4 border-b border-crm-border sticky top-0 bg-crm-surface z-10 rounded-t-xl">
                    <h2 className="text-xl font-bold text-white">Editar Vehículo</h2>
                    <button onClick={onClose} className="p-1 text-crm-fg-muted hover:text-crm-fg transition-colors" disabled={isSaving}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
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
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Costo de Compra</label>
                                    <input type="number" min="0" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Moneda</label>
                                    <select name="purchaseCurrency" value={formData.purchaseCurrency} onChange={handleChange} className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="USD">USD</option>
                                        <option value="ARS">ARS</option>
                                    </select>
                                </div>
                            </div>

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
                                            <input type="text" name="investorName" value={formData.investorName || ''} onChange={handleChange} required={formData.isSharedInvestment} placeholder="Ej: Juan" className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
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

                    <div className="p-4 border-t border-crm-border flex justify-end gap-3 sticky bottom-0 bg-crm-surface rounded-b-xl z-10">
                        <button 
                            type="button" 
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-transparent border border-crm-border text-crm-fg rounded-lg hover:bg-crm-surface-raised transition-colors font-medium text-sm"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-crm-red text-white rounded-lg hover:bg-crm-red-hover transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={18} />}
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
