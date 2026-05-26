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
                notes: vehicleData.observaciones === 'Sin observaciones.' ? '' : vehicleData.observaciones
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
                notes: formData.notes
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#161619] border border-[#33333A] rounded-xl w-full max-w-4xl my-8 flex flex-col relative">
                
                <div className="flex items-center justify-between p-4 border-b border-[#33333A] sticky top-0 bg-[#161619] z-10 rounded-t-xl">
                    <h2 className="text-xl font-bold text-white">Editar Vehículo</h2>
                    <button onClick={onClose} className="p-1 text-[#A1A1AA] hover:text-white transition-colors" disabled={isSaving}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* DATOS PÚBLICOS */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-[#E63027] font-semibold flex items-center gap-2 border-b border-[#33333A] pb-2">
                                Datos Públicos (Catálogo)
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-[#A1A1AA]">Marca *</label>
                                    <input type="text" required name="brand" value={formData.brand} onChange={handleChange} className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-[#A1A1AA]">Modelo *</label>
                                    <input type="text" required name="name" value={formData.name} onChange={handleChange} className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-[#A1A1AA]">Versión / Descripción Corta</label>
                                <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="Ej. 1.4 TSI Highline" className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-[#A1A1AA]">Año *</label>
                                    <input type="number" required min="1900" max={new Date().getFullYear() + 1} name="year" value={formData.year} onChange={handleChange} className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-[#A1A1AA]">Kilometraje *</label>
                                    <input type="number" required min="0" name="km" value={formData.km} onChange={handleChange} className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-[#A1A1AA]">Combustible</label>
                                    <select name="fuel" value={formData.fuel} onChange={handleChange} className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]">
                                        <option value="Nafta">Nafta</option>
                                        <option value="Diésel">Diésel</option>
                                        <option value="GNC">GNC</option>
                                        <option value="Híbrido">Híbrido</option>
                                        <option value="Eléctrico">Eléctrico</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-[#A1A1AA]">Condición</label>
                                    <select name="condition" value={formData.condition} onChange={handleChange} className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]">
                                        <option value="Usado">Usado</option>
                                        <option value="0km">0km</option>
                                        <option value="Nuevo">Nuevo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-[1fr_80px] gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-[#A1A1AA]">Precio Publicado *</label>
                                    <input type="number" required min="0" name="price" value={formData.price} onChange={handleChange} className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-[#A1A1AA]">Moneda</label>
                                    <select name="currency" value={formData.currency} onChange={handleChange} className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]">
                                        <option value="USD">USD</option>
                                        <option value="U$S">U$S</option>
                                        <option value="ARS">ARS</option>
                                        <option value="$">$</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 mt-2 bg-[#24242B] p-4 rounded-lg border border-[#33333A]">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" name="visibleEnWeb" checked={formData.visibleEnWeb} onChange={handleChange} className="w-5 h-5 rounded border-[#E63027] text-[#E63027] focus:ring-[#E63027] bg-[#09090B] cursor-pointer" />
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium group-hover:text-[#E63027] transition-colors">Visible en Catálogo Público</span>
                                        <span className="text-xs text-[#A1A1AA]">Si desmarcas, el auto se ocultará del sitio web.</span>
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
                            <h3 className="text-[#A1A1AA] font-semibold flex items-center gap-2 border-b border-[#33333A] pb-2">
                                Datos Internos (Solo CRM)
                            </h3>
                            
                            <div className="grid grid-cols-[1fr_80px] gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-[#A1A1AA]">Costo de Compra</label>
                                    <input type="number" min="0" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-[#A1A1AA]">Moneda</label>
                                    <select name="purchaseCurrency" value={formData.purchaseCurrency} onChange={handleChange} className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]">
                                        <option value="USD">USD</option>
                                        <option value="ARS">ARS</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-[#A1A1AA]">Origen del Vehículo</label>
                                    <select 
                                        value={formData.agencyOwned ? 'propio' : (formData.consignedBy ? 'consignación' : 'tercero')} 
                                        onChange={handleOrigenChange} 
                                        className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]"
                                    >
                                        <option value="propio">Propio (Agencia)</option>
                                        <option value="consignación">Consignación</option>
                                        <option value="tercero">Tercero</option>
                                    </select>
                                </div>
                                {!formData.agencyOwned && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-[#A1A1AA]">Consignado Por</label>
                                        <input type="text" name="consignedBy" value={formData.consignedBy} onChange={handleChange} placeholder="Nombre del dueño" className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]" />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-[#A1A1AA]">Dominio / VIN</label>
                                    <input type="text" name="plateOrVin" value={formData.plateOrVin} onChange={handleChange} placeholder="Ej. AE 123 CD" className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027] uppercase" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-[#A1A1AA]">Ubicación Física</label>
                                    <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Ej. Salón, Taller" className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-[#A1A1AA]">Estado Operativo</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]">
                                    <option value="Disponible">Disponible</option>
                                    <option value="Reservado">Reservado</option>
                                    <option value="Vendido">Vendido</option>
                                    <option value="Pausado">Pausado</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5 flex-1">
                                <label className="text-sm font-medium text-[#A1A1AA]">Observaciones Internas</label>
                                <textarea 
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Detalles, reparaciones pendientes, historial..."
                                    className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027] resize-none flex-1 min-h-[100px]"
                                />
                            </div>

                        </div>
                    </div>

                    <div className="p-4 border-t border-[#33333A] flex justify-end gap-3 sticky bottom-0 bg-[#161619] rounded-b-xl z-10">
                        <button 
                            type="button" 
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-transparent border border-[#33333A] text-white rounded-lg hover:bg-[#24242B] transition-colors font-medium text-sm"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-[#E63027] text-white rounded-lg hover:bg-[#C42620] transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50"
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
