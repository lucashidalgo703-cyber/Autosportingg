import React, { useState } from 'react';
import CrmModal from '../ui/CrmModal';
import { toast } from 'react-hot-toast';
import { Camera } from 'lucide-react';

export default function MandateStockModal({ isOpen, onClose, onSave }) {
    const [formData, setFormData] = useState({
        clientName: '',
        dniCuit: '',
        address: '',
        phone: '',
        email: '',
        brand: '',
        model: '',
        year: '',
        color: '',
        plate: '',
        mileage: '',
        mandateDate: new Date().toISOString().split('T')[0],
        termDays: 30,
        procedureType: 'Venta',
        representativeName: '',
        registryOffice: '',
        bodyType: '',
        engineNumber: '',
        chassisNumber: '',
        previousOwners: 1,
        officialServices: false,
        manuals: false,
        duplicateKeys: false,
        spareTire: false,
        value: '',
        currency: 'USD',
        createCar: true
    });
    const [isSaving, setIsSaving] = useState(false);

    // Resets form on open/close
    React.useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                mandateDate: new Date().toISOString().split('T')[0]
            }));
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.clientName || !formData.address || !formData.brand || !formData.model || !formData.year || !formData.mandateDate || !formData.termDays || !formData.representativeName) {
            toast.error('Por favor completa todos los campos requeridos (*)');
            return;
        }

        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            toast.error(error.message || 'Error al guardar mandato');
        } finally {
            setIsSaving(false);
        }
    };

    const footer = (
        <div className="flex justify-between items-center w-full gap-4">
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer font-bold">
                <input
                    type="checkbox"
                    name="createCar"
                    checked={formData.createCar}
                    onChange={handleChange}
                    className="rounded border-crm-border bg-crm-bg text-crm-red focus:ring-crm-red"
                />
                Agregar también este vehículo al stock
            </label>
            <div className="flex gap-3">
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
                    {isSaving ? 'Guardando...' : 'Guardar Mandato'}
                </button>
            </div>
        </div>
    );

    return (
        <CrmModal
            isOpen={isOpen}
            onClose={onClose}
            title="Nuevo Mandato + Stock"
            maxWidth="max-w-4xl"
            footer={footer}
        >
            <form id="mandate-form" className="space-y-6" onSubmit={handleSubmit}>
                
                {/* Mandante */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white border-b border-crm-border pb-2">Datos del Mandante</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1 lg:col-span-2">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Nombre / Razón Social *</label>
                            <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} required className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">DNI / CUIT</label>
                            <input type="text" name="dniCuit" value={formData.dniCuit} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                        <div className="space-y-1 lg:col-span-3">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Domicilio *</label>
                            <input type="text" name="address" value={formData.address} onChange={handleChange} required className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                        <div className="space-y-1 lg:col-span-2">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Teléfono</label>
                            <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                    </div>
                </div>

                {/* Vehículo */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end border-b border-crm-border pb-2">
                        <h3 className="text-sm font-bold text-white">Datos del Vehículo</h3>
                        <button type="button" className="flex items-center gap-1 text-xs font-bold text-crm-red hover:text-red-400">
                            <Camera size={14} /> Escanear Cédula Verde
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1 lg:col-span-2">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Marca *</label>
                            <input type="text" name="brand" value={formData.brand} onChange={handleChange} required className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                        <div className="space-y-1 lg:col-span-2">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Modelo *</label>
                            <input type="text" name="model" value={formData.model} onChange={handleChange} required className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Año *</label>
                            <input type="number" name="year" value={formData.year} onChange={handleChange} required className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Kilómetros</label>
                            <input type="number" name="mileage" value={formData.mileage} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Color</label>
                            <input type="text" name="color" value={formData.color} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Dominio</label>
                            <input type="text" name="plate" value={formData.plate} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                    </div>
                </div>

                {/* Mandato */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white border-b border-crm-border pb-2">Datos del Mandato</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Fecha *</label>
                            <input type="date" name="mandateDate" value={formData.mandateDate} onChange={handleChange} required className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Plazo (Días) *</label>
                            <input type="number" name="termDays" value={formData.termDays} onChange={handleChange} required className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                        <div className="space-y-1 lg:col-span-2">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Mandatario (Representante) *</label>
                            <input type="text" name="representativeName" value={formData.representativeName} onChange={handleChange} required className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                    </div>
                </div>

                {/* Valor */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white border-b border-crm-border pb-2">Valor Estimado / Consignación</h3>
                    <div className="flex gap-4 max-w-sm">
                        <div className="space-y-1 flex-1">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Valor</label>
                            <input type="number" name="value" value={formData.value} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red" />
                        </div>
                        <div className="space-y-1 w-32">
                            <label className="text-xs font-bold text-crm-fg-muted uppercase">Moneda</label>
                            <select name="currency" value={formData.currency} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-red">
                                <option value="USD">USD</option>
                                <option value="ARS">ARS</option>
                            </select>
                        </div>
                    </div>
                </div>

            </form>
        </CrmModal>
    );
}
