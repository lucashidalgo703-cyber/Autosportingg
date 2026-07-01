"use client";

import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, AlertTriangle, Phone, Mail, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { workshopFetch } from '../../../utils/workshopApiClient';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import CrmTextarea from '../ui/CrmTextarea';
import CrmModal from '../ui/CrmModal';

const FieldLabel = ({ children, required = false }) => (
    <label className="mb-1.5 block text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">
        {children}{required && <span className="text-crm-red"> *</span>}
    </label>
);

const SectionTitle = ({ children }) => (
    <h3 className="m-0 mb-3.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted border-b border-crm-border pb-1.5">
        {children}
    </h3>
);

export default function WorkshopProviderModal({ isOpen, provider, onClose, onSuccess }) {
    const { token } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        businessName: '',
        cuit: '',
        specialties: [],
        contacts: [],
        paymentConditions: '',
        acceptedCurrencies: ['USD', 'ARS'],
        defaultWarranty: '',
        notes: '',
        active: true
    });

    // Temp state for adding a contact
    const [newContact, setNewContact] = useState({
        name: '',
        phone: '',
        email: '',
        role: ''
    });

    const specialtiesList = [
        'chapa', 'pintura', 'mecanica', 'electricidad', 'gomería',
        'alineacion', 'tapizado', 'lavado', 'cerrajería', 'vidrios',
        'instrumentación', 'otros'
    ];

    useEffect(() => {
        if (isOpen) {
            setError('');
            setNewContact({ name: '', phone: '', email: '', role: '' });

            if (provider) {
                // Edit mode
                setFormData({
                    name: provider.name || '',
                    businessName: provider.businessName || '',
                    cuit: provider.cuit || '',
                    specialties: provider.specialties || [],
                    contacts: provider.contacts || [],
                    paymentConditions: provider.paymentConditions || '',
                    acceptedCurrencies: provider.acceptedCurrencies || ['USD', 'ARS'],
                    defaultWarranty: provider.defaultWarranty || '',
                    notes: provider.notes || '',
                    active: provider.active !== false
                });
            } else {
                // Create mode
                setFormData({
                    name: '',
                    businessName: '',
                    cuit: '',
                    specialties: [],
                    contacts: [],
                    paymentConditions: '',
                    acceptedCurrencies: ['USD', 'ARS'],
                    defaultWarranty: '',
                    notes: '',
                    active: true
                });
            }
        }
    }, [isOpen, provider]);

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSpecialtyToggle = (spec) => {
        setFormData(prev => {
            const list = prev.specialties || [];
            const newList = list.includes(spec)
                ? list.filter(x => x !== spec)
                : [...list, spec];
            return { ...prev, specialties: newList };
        });
    };

    const handleCurrencyToggle = (curr) => {
        setFormData(prev => {
            const list = prev.acceptedCurrencies || [];
            const newList = list.includes(curr)
                ? list.filter(x => x !== curr)
                : [...list, curr];
            return { ...prev, acceptedCurrencies: newList };
        });
    };

    // Contacts management
    const handleAddContact = () => {
        if (!newContact.name.trim()) {
            toast.error('El nombre del contacto es obligatorio.');
            return;
        }

        setFormData(prev => ({
            ...prev,
            contacts: [...prev.contacts, { ...newContact }]
        }));

        setNewContact({ name: '', phone: '', email: '', role: '' });
        toast.success('Contacto añadido a la lista.');
    };

    const handleRemoveContact = (index) => {
        setFormData(prev => ({
            ...prev,
            contacts: prev.contacts.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async () => {
        setError('');

        if (!formData.name.trim()) {
            setError('El nombre del proveedor / taller es obligatorio.');
            return;
        }

        setLoading(true);
        try {
            const isEdit = !!provider;
            const url = isEdit
                ? `/api/admin/workshop/providers/${provider.id || provider._id}`
                : `/api/admin/workshop/providers`;

            const method = isEdit ? 'PATCH' : 'POST';

            const payload = {
                name: formData.name.trim(),
                businessName: formData.businessName.trim() || undefined,
                cuit: formData.cuit.trim() || undefined,
                specialties: formData.specialties,
                contacts: formData.contacts,
                paymentConditions: formData.paymentConditions,
                acceptedCurrencies: formData.acceptedCurrencies,
                defaultWarranty: formData.defaultWarranty ? Number(formData.defaultWarranty) : undefined,
                notes: formData.notes,
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
                throw new Error(errorData.message || 'Error al guardar proveedor.');
            }

            toast.success(isEdit ? 'Proveedor modificado con éxito.' : 'Proveedor creado con éxito.');
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isEdit = !!provider;

    const modalTitle = (
        <div>
            <h2 className="m-0 text-lg font-bold text-crm-fg tracking-tight">
                {isEdit ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
            </h2>
            <p className="m-0 mt-1 text-xs text-crm-fg-muted">
                Administración de convenios de taller, especialistas de chapa/pintura y mecánicos asociados.
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
                <Save size={14} className="mr-1.5" /> {loading ? 'Guardando...' : 'Guardar Proveedor'}
            </CrmButton>
        </div>
    );

    return (
        <CrmModal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            maxWidth="max-w-3xl"
            footer={modalFooter}
        >
            <div className="px-6 py-6 custom-scrollbar max-h-[70vh] overflow-y-auto space-y-6">
                {error && (
                    <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 px-4 py-3 text-sm font-semibold text-crm-red flex items-center gap-2">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* General Data */}
                <div className="space-y-4">
                    <SectionTitle>Datos Generales</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <FieldLabel required>Nombre del Taller / Proveedor</FieldLabel>
                            <CrmInput
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder="Ej: Taller Mecánico San José"
                                className="h-10 bg-crm-bg text-crm-fg"
                            />
                        </div>
                        <div>
                            <FieldLabel>Razón Social (Opcional)</FieldLabel>
                            <CrmInput
                                value={formData.businessName}
                                onChange={(e) => updateField('businessName', e.target.value)}
                                placeholder="Ej: Talleres San José S.R.L."
                                className="h-10 bg-crm-bg text-crm-fg"
                            />
                        </div>
                        <div>
                            <FieldLabel>CUIT (Opcional)</FieldLabel>
                            <CrmInput
                                value={formData.cuit}
                                onChange={(e) => updateField('cuit', e.target.value)}
                                placeholder="Ej: 30-12345678-9"
                                className="h-10 bg-crm-bg text-crm-fg font-mono"
                            />
                        </div>
                        <div>
                            <FieldLabel>Garantía de Trabajo por Defecto (días)</FieldLabel>
                            <CrmInput
                                type="number"
                                min="0"
                                value={formData.defaultWarranty}
                                onChange={(e) => updateField('defaultWarranty', e.target.value)}
                                placeholder="Ej: 90"
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
                                <option value="false">Inactivo</option>
                            </CrmSelect>
                        </div>
                    </div>
                </div>

                {/* Specialties and Currencies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <SectionTitle>Especialidades</SectionTitle>
                        <div className="grid grid-cols-2 gap-2">
                            {specialtiesList.map(s => {
                                const checked = formData.specialties.includes(s);
                                return (
                                    <label key={s} className="flex items-center gap-2 cursor-pointer text-xs text-crm-fg capitalize hover:text-crm-red transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => handleSpecialtyToggle(s)}
                                            className="h-3.5 w-3.5 rounded border-crm-border bg-crm-bg text-crm-red"
                                        />
                                        <span>{s}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <SectionTitle>Monedas Aceptadas</SectionTitle>
                        <div className="flex gap-4">
                            {['USD', 'ARS'].map(c => {
                                const checked = formData.acceptedCurrencies.includes(c);
                                return (
                                    <label key={c} className="flex items-center gap-2 cursor-pointer text-xs text-crm-fg font-bold hover:text-crm-red transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => handleCurrencyToggle(c)}
                                            className="h-3.5 w-3.5 rounded border-crm-border bg-crm-bg text-crm-red"
                                        />
                                        <span>{c}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Contacts List Manager */}
                <div className="space-y-4">
                    <SectionTitle>Contactos Internos del Proveedor</SectionTitle>

                    {/* Add Contact Row */}
                    <div className="bg-crm-surface border border-crm-border rounded-xl p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                                <FieldLabel>Nombre Contacto</FieldLabel>
                                <CrmInput
                                    value={newContact.name}
                                    onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ej: Juan Pérez"
                                    className="h-8 bg-crm-bg text-xs"
                                />
                            </div>
                            <div>
                                <FieldLabel>Rol / Cargo</FieldLabel>
                                <CrmInput
                                    value={newContact.role}
                                    onChange={(e) => setNewContact(prev => ({ ...prev, role: e.target.value }))}
                                    placeholder="Ej: Jefe de Taller"
                                    className="h-8 bg-crm-bg text-xs"
                                />
                            </div>
                            <div>
                                <FieldLabel>Teléfono</FieldLabel>
                                <CrmInput
                                    value={newContact.phone}
                                    onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="Ej: +54 11..."
                                    className="h-8 bg-crm-bg text-xs"
                                />
                            </div>
                            <div>
                                <FieldLabel>Email</FieldLabel>
                                <CrmInput
                                    value={newContact.email}
                                    onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="Ej: jperez@..."
                                    className="h-8 bg-crm-bg text-xs"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <CrmButton
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleAddContact}
                                className="h-8 text-xs font-bold gap-1 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised"
                            >
                                <Plus size={13} />
                                <span>Añadir Contacto</span>
                            </CrmButton>
                        </div>
                    </div>

                    {/* Added Contacts Grid */}
                    {formData.contacts && formData.contacts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {formData.contacts.map((contact, idx) => (
                                <div key={idx} className="bg-crm-surface border border-crm-border rounded-xl p-3 flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="text-xs font-bold text-crm-fg flex items-center gap-1">
                                            <User size={12} className="text-crm-red" /> {contact.name}
                                        </div>
                                        {contact.role && <div className="text-[10px] text-crm-fg-muted uppercase tracking-wider">{contact.role}</div>}
                                        <div className="space-y-0.5 pt-1.5">
                                            {contact.phone && <div className="text-[11px] text-crm-fg-muted flex items-center gap-1"><Phone size={10} /> {contact.phone}</div>}
                                            {contact.email && <div className="text-[11px] text-crm-fg-muted flex items-center gap-1"><Mail size={10} /> {contact.email}</div>}
                                        </div>
                                    </div>
                                    <CrmButton
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleRemoveContact(idx)}
                                        className="h-6 w-6 !p-0 border-crm-border text-crm-fg-muted hover:text-crm-red hover:bg-crm-red/5"
                                        title="Eliminar Contacto"
                                    >
                                        <Trash2 size={12} />
                                    </CrmButton>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-crm-fg-muted italic">No se han agregado contactos a este proveedor.</div>
                    )}
                </div>

                {/* Confidential Info */}
                <div className="space-y-4">
                    <SectionTitle>Información Operativa / Condiciones Comerciales (Confidencial)</SectionTitle>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <FieldLabel>Condiciones de Pago / Descuentos acordados</FieldLabel>
                            <CrmTextarea
                                value={formData.paymentConditions}
                                onChange={(e) => updateField('paymentConditions', e.target.value)}
                                placeholder="Ej: Cuenta corriente a 30 días, 10% de descuento por pago en dólares en efectivo..."
                                className="bg-crm-bg min-h-[80px] text-crm-fg"
                            />
                        </div>
                        <div>
                            <FieldLabel>Notas Internas del Taller</FieldLabel>
                            <CrmTextarea
                                value={formData.notes}
                                onChange={(e) => updateField('notes', e.target.value)}
                                placeholder="Notas internas para el equipo de compras/administración..."
                                className="bg-crm-bg min-h-[80px] text-crm-fg"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </CrmModal>
    );
}
