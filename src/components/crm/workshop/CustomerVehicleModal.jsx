"use client";

import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { workshopFetch } from '../../../utils/workshopApiClient';
import WorkshopClientSelect from './WorkshopClientSelect';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import CrmModal from '../ui/CrmModal';

const FieldLabel = ({ children, required = false }) => (
    <label className="mb-1.5 block text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">
        {children}{required && <span className="text-crm-red"> *</span>}
    </label>
);

export default function CustomerVehicleModal({ isOpen, vehicle, onClose, onSuccess }) {
    const { token } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        clientId: '',
        brand: '',
        model: '',
        version: '',
        year: new Date().getFullYear(),
        plate: '',
        vin: '',
        color: '',
        km: '',
        active: true
    });

    useEffect(() => {
        if (isOpen) {
            setError('');
            if (vehicle) {
                // Edit Mode
                setFormData({
                    clientId: vehicle.clientId?._id || vehicle.clientId || '',
                    brand: vehicle.brand || '',
                    model: vehicle.model || '',
                    version: vehicle.version || '',
                    year: vehicle.year || new Date().getFullYear(),
                    plate: vehicle.plate || '',
                    vin: vehicle.vin || '',
                    color: vehicle.color || '',
                    km: vehicle.km || '',
                    active: vehicle.active !== false
                });
            } else {
                // Create Mode
                setFormData({
                    clientId: '',
                    brand: '',
                    model: '',
                    version: '',
                    year: new Date().getFullYear(),
                    plate: '',
                    vin: '',
                    color: '',
                    km: '',
                    active: true
                });
            }
        }
    }, [isOpen, vehicle]);

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        setError('');

        if (!formData.clientId) {
            setError('El propietario (cliente) es obligatorio.');
            return;
        }
        if (!formData.brand.trim()) {
            setError('La marca es obligatoria.');
            return;
        }
        if (!formData.model.trim()) {
            setError('El modelo es obligatorio.');
            return;
        }
        if (!formData.year || isNaN(formData.year)) {
            setError('El año debe ser un número válido.');
            return;
        }
        if (!vehicle && !formData.plate.trim()) {
            // Plate is only required on creation since it is immutable on edit
            setError('La patente es obligatoria.');
            return;
        }

        setLoading(true);
        try {
            const isEdit = !!vehicle;
            const url = isEdit
                ? `/api/admin/workshop/vehicles/${vehicle.id || vehicle._id}`
                : `/api/admin/workshop/vehicles`;

            const method = isEdit ? 'PATCH' : 'POST';

            // On update, we send only the allowed modifiable fields (cannot update plate or clientId directly)
            const payload = isEdit ? {
                brand: formData.brand,
                model: formData.model,
                version: formData.version,
                year: Number(formData.year),
                vin: formData.vin,
                color: formData.color,
                km: formData.km ? Number(formData.km) : undefined,
                active: formData.active
            } : {
                clientId: formData.clientId,
                brand: formData.brand,
                model: formData.model,
                version: formData.version,
                year: Number(formData.year),
                plate: formData.plate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                vin: formData.vin,
                color: formData.color,
                km: formData.km ? Number(formData.km) : undefined,
                active: formData.active
            };

            const res = await workshopFetch(url, {
                method,
                token,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al guardar el vehículo.');
            }

            toast.success(isEdit ? 'Vehículo modificado con éxito.' : 'Vehículo registrado con éxito.');
            onSuccess?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isEdit = !!vehicle;

    const modalTitle = (
        <div>
            <h2 className="m-0 text-lg font-bold text-crm-fg tracking-tight">
                {isEdit ? 'Editar Vehículo de Cliente' : 'Registrar Nuevo Vehículo'}
            </h2>
            <p className="m-0 mt-1 text-xs text-crm-fg-muted">
                {isEdit
                    ? 'Actualice los datos técnicos del vehículo.'
                    : 'Registre una nueva unidad asociada a la ficha comercial de un cliente.'}
            </p>
        </div>
    );

    const modalFooter = (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
            <CrmButton type="button" variant="secondary" onClick={onClose} disabled={loading} className="px-6 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised">
                Cancelar
            </CrmButton>
            <div className="flex-1 hidden sm:block"></div>
            <CrmButton type="button" variant="primary" onClick={handleSubmit} disabled={loading} className="px-6 bg-crm-red hover:bg-crm-red/90 text-white">
                <Save size={14} className="mr-1.5" /> {loading ? 'Guardando...' : 'Guardar Vehículo'}
            </CrmButton>
        </div>
    );

    // Prepare initial client object for WorkshopClientSelect in Edit Mode
    const initialClient = isEdit && vehicle.clientId ? {
        id: vehicle.clientId._id || vehicle.clientId,
        name: vehicle.clientId.name || '',
        lastName: vehicle.clientId.lastName || '',
        dni: vehicle.clientId.dni || ''
    } : null;

    return (
        <CrmModal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            maxWidth="max-w-2xl"
            footer={modalFooter}
        >
            <div className="px-6 py-6 custom-scrollbar max-h-[70vh] overflow-y-auto">
                {error && (
                    <div className="mb-6 rounded-xl border border-crm-red/30 bg-crm-red/10 px-4 py-3 text-sm font-semibold text-crm-red flex items-center gap-2">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-5">
                    {/* Warning about Plate immutability in Edit Mode */}
                    {isEdit && (
                        <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/5 p-3 flex gap-2">
                            <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={15} />
                            <div className="text-xs text-crm-fg leading-relaxed">
                                <span className="font-bold text-yellow-500">Nota de seguridad:</span> La patente (<span className="font-mono uppercase">{formData.plate}</span>) y el propietario original no se pueden modificar directamente para preservar la integridad de las órdenes anteriores. Para cambiar de dueño use el botón <span className="font-semibold text-crm-fg">Transferir</span>.
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Owner Selection (WorkshopClientSelect) */}
                        <div className={isEdit ? 'opacity-50 pointer-events-none' : ''}>
                            <FieldLabel required={!isEdit}>Propietario / Cliente</FieldLabel>
                            {isEdit ? (
                                <CrmInput
                                    value={initialClient ? `${initialClient.name} ${initialClient.lastName} (${initialClient.dni || 'S/D'})` : '—'}
                                    disabled
                                    className="h-10 bg-crm-bg text-crm-fg font-medium disabled:opacity-50"
                                />
                            ) : (
                                <WorkshopClientSelect
                                    value={formData.clientId}
                                    onChange={(val) => updateField('clientId', val)}
                                    placeholder="Buscar cliente por nombre o DNI..."
                                />
                            )}
                        </div>

                        {/* Plate (VIN fallback) */}
                        <div>
                            <FieldLabel required={!isEdit}>Patente</FieldLabel>
                            <CrmInput
                                value={formData.plate}
                                onChange={(e) => updateField('plate', e.target.value)}
                                disabled={isEdit}
                                placeholder="Ej: AB123CD o AAA111"
                                className="h-10 bg-crm-bg uppercase font-bold text-crm-fg disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <FieldLabel required>Marca</FieldLabel>
                            <CrmInput
                                value={formData.brand}
                                onChange={(e) => updateField('brand', e.target.value)}
                                placeholder="Ej: Ford"
                                className="h-10 bg-crm-bg text-crm-fg"
                            />
                        </div>

                        <div>
                            <FieldLabel required>Modelo</FieldLabel>
                            <CrmInput
                                value={formData.model}
                                onChange={(e) => updateField('model', e.target.value)}
                                placeholder="Ej: Focus"
                                className="h-10 bg-crm-bg text-crm-fg"
                            />
                        </div>

                        <div>
                            <FieldLabel>Versión</FieldLabel>
                            <CrmInput
                                value={formData.version}
                                onChange={(e) => updateField('version', e.target.value)}
                                placeholder="Ej: 2.0 Titanium SE"
                                className="h-10 bg-crm-bg text-crm-fg"
                            />
                        </div>

                        <div>
                            <FieldLabel required>Año</FieldLabel>
                            <CrmInput
                                type="number"
                                min="1900"
                                max={new Date().getFullYear() + 1}
                                value={formData.year}
                                onChange={(e) => updateField('year', e.target.value)}
                                placeholder="Ej: 2018"
                                className="h-10 bg-crm-bg text-crm-fg"
                            />
                        </div>

                        <div>
                            <FieldLabel>Nº Chasis / VIN (Opcional)</FieldLabel>
                            <CrmInput
                                value={formData.vin}
                                onChange={(e) => updateField('vin', e.target.value)}
                                placeholder="Ej: 9BF..."
                                className="h-10 bg-crm-bg text-crm-fg uppercase"
                            />
                        </div>

                        <div>
                            <FieldLabel>Color</FieldLabel>
                            <CrmInput
                                value={formData.color}
                                onChange={(e) => updateField('color', e.target.value)}
                                placeholder="Ej: Gris Plata"
                                className="h-10 bg-crm-bg text-crm-fg"
                            />
                        </div>

                        <div>
                            <FieldLabel>Kilometraje Actual (km)</FieldLabel>
                            <CrmInput
                                type="number"
                                min="0"
                                value={formData.km}
                                onChange={(e) => updateField('km', e.target.value)}
                                placeholder="Ej: 64500"
                                className="h-10 bg-crm-bg text-crm-fg"
                            />
                        </div>

                        <div>
                            <FieldLabel>Estado</FieldLabel>
                            <CrmSelect
                                value={formData.active ? 'true' : 'false'}
                                onChange={(e) => updateField('active', e.target.value === 'true')}
                                className="h-10 bg-crm-bg text-crm-fg font-medium"
                            >
                                <option value="true">Activo</option>
                                <option value="false">Inactivo / Desvinculado</option>
                            </CrmSelect>
                        </div>
                    </div>
                </div>
            </div>
        </CrmModal>
    );
}
