import React, { useState, useEffect } from 'react';
import CrmModal from '../ui/CrmModal';
import { toast } from 'react-hot-toast';

export default function OpportunityModal({ isOpen, onClose, onSave, opportunity = null }) {
    const [formData, setFormData] = useState({
        type: 'ofrece',
        brand: '',
        model: '',
        year: '',
        mileage: '',
        price: '',
        currency: 'ARS',
        fuel: '',
        transmission: '',
        color: '',
        plate: '',
        notes: '',
        inspection: {
            mechanical: 0,
            suspension: 0,
            brakes: 0,
            paint: 0,
            interior: 0,
            tires: 0
        },
        documentation: {
            title: false,
            vtv: false,
            debtFree: false,
            transferable: false
        },
        photos: [] // No implementamos upload complejo en esta fase, pero preparamos el array.
    });

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (opportunity && isOpen) {
            setFormData({
                type: opportunity.type || 'ofrece',
                brand: opportunity.brand || '',
                model: opportunity.model || '',
                year: opportunity.year || '',
                mileage: opportunity.mileage || '',
                price: opportunity.price || '',
                currency: opportunity.currency || 'ARS',
                fuel: opportunity.fuel || '',
                transmission: opportunity.transmission || '',
                color: opportunity.color || '',
                plate: opportunity.plate || '',
                notes: opportunity.notes || '',
                inspection: opportunity.inspection || {
                    mechanical: 0, suspension: 0, brakes: 0, paint: 0, interior: 0, tires: 0
                },
                documentation: opportunity.documentation || {
                    title: false, vtv: false, debtFree: false, transferable: false
                },
                photos: opportunity.photos || []
            });
        } else if (!opportunity && isOpen) {
            setFormData({
                type: 'ofrece',
                brand: '', model: '', year: '', mileage: '', price: '', currency: 'ARS',
                fuel: '', transmission: '', color: '', plate: '', notes: '',
                inspection: { mechanical: 0, suspension: 0, brakes: 0, paint: 0, interior: 0, tires: 0 },
                documentation: { title: false, vtv: false, debtFree: false, transferable: false },
                photos: []
            });
        }
    }, [opportunity, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name.startsWith('inspection.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                inspection: { ...prev.inspection, [field]: Number(value) }
            }));
        } else if (name.startsWith('documentation.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                documentation: { ...prev.documentation, [field]: checked }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.brand || !formData.model) {
            toast.error('Marca y modelo son obligatorios');
            return;
        }

        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            toast.error(error.message || 'Error al guardar oportunidad');
        } finally {
            setIsSaving(false);
        }
    };

    const footer = (
        <div className="flex justify-end gap-3 w-full">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-bold text-crm-fg-muted hover:bg-crm-surface hover:text-white transition-colors"
                disabled={isSaving}
            >
                Cancelar
            </button>
            <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-crm-red text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            >
                {isSaving ? 'Guardando...' : (opportunity ? 'Guardar Cambios' : 'Publicar')}
            </button>
        </div>
    );

    return (
        <CrmModal
            isOpen={isOpen}
            onClose={onClose}
            title={opportunity ? 'Editar Oportunidad' : 'Publicar Oportunidad'}
            maxWidth="max-w-4xl"
            footer={footer}
        >
            <form id="opportunity-form" className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-crm-fg-muted uppercase">Tipo</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red"
                        >
                            <option value="ofrece">Ofrezco Vehículo</option>
                            <option value="busca">Busco Vehículo</option>
                            <option value="permuta">Permuta Disponible</option>
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <div className="space-y-1 flex-1">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Precio</label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="0"
                                className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red"
                            />
                        </div>
                        <div className="space-y-1 w-24">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Moneda</label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red"
                            >
                                <option value="ARS">ARS</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-crm-fg-muted uppercase">Marca *</label>
                        <input
                            type="text"
                            name="brand"
                            value={formData.brand}
                            onChange={handleChange}
                            required
                            className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-crm-fg-muted uppercase">Modelo *</label>
                        <input
                            type="text"
                            name="model"
                            value={formData.model}
                            onChange={handleChange}
                            required
                            className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-crm-fg-muted uppercase">Año</label>
                        <input
                            type="number"
                            name="year"
                            value={formData.year}
                            onChange={handleChange}
                            className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-crm-fg-muted uppercase">Kilometraje</label>
                        <input
                            type="number"
                            name="mileage"
                            value={formData.mileage}
                            onChange={handleChange}
                            className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-crm-fg-muted uppercase">Combustible</label>
                        <select
                            name="fuel"
                            value={formData.fuel}
                            onChange={handleChange}
                            className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="Nafta">Nafta</option>
                            <option value="Diésel">Diésel</option>
                            <option value="GNC">GNC</option>
                            <option value="Híbrido">Híbrido</option>
                            <option value="Eléctrico">Eléctrico</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-crm-fg-muted uppercase">Transmisión</label>
                        <select
                            name="transmission"
                            value={formData.transmission}
                            onChange={handleChange}
                            className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="Manual">Manual</option>
                            <option value="Automática">Automática</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-crm-fg-muted uppercase">Color</label>
                        <input
                            type="text"
                            name="color"
                            value={formData.color}
                            onChange={handleChange}
                            className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-crm-fg-muted uppercase">Dominio (Patente)</label>
                        <input
                            type="text"
                            name="plate"
                            value={formData.plate}
                            onChange={handleChange}
                            className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red"
                        />
                    </div>
                </div>

                <div className="border-t border-crm-border pt-4">
                    <h3 className="text-sm font-bold text-white mb-3">Documentación</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries({
                            title: 'Título en Mano',
                            vtv: 'VTV Vigente',
                            debtFree: 'Libre de Deuda',
                            transferable: 'Transferible'
                        }).map(([key, label]) => (
                            <label key={key} className="flex items-center gap-2 text-sm text-crm-fg-muted hover:text-white cursor-pointer">
                                <input
                                    type="checkbox"
                                    name={`documentation.${key}`}
                                    checked={formData.documentation[key]}
                                    onChange={handleChange}
                                    className="rounded border-crm-border bg-crm-bg text-crm-red focus:ring-crm-red"
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="border-t border-crm-border pt-4">
                    <h3 className="text-sm font-bold text-white mb-3">Peritaje (%)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries({
                            mechanical: 'Mecánica',
                            suspension: 'Suspensión',
                            brakes: 'Frenos',
                            paint: 'Chapa y Pintura',
                            interior: 'Interior',
                            tires: 'Neumáticos'
                        }).map(([key, label]) => (
                            <div key={key} className="space-y-1">
                                <label className="text-xs font-bold text-crm-fg-muted uppercase">{label}</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    name={`inspection.${key}`}
                                    value={formData.inspection[key]}
                                    onChange={handleChange}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-crm-border pt-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-crm-fg-muted uppercase">Observaciones</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red custom-scrollbar"
                            placeholder="Detalles adicionales, agencias con las que comparte, comisiones, etc."
                        />
                    </div>
                </div>
            </form>
        </CrmModal>
    );
}
