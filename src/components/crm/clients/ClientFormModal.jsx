import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClientFormModal({ isOpen, onClose, onSave, client = null }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        dniCuit: '',
        locality: '',
        province: '',
        address: '',
        type: 'potencial',
        source: 'otro',
        status: 'activo',
        notes: ''
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState(null);

    useEffect(() => {
        if (client) {
            setFormData({
                firstName: client.firstName || '',
                lastName: client.lastName || '',
                phone: client.phone || '',
                email: client.email || '',
                dniCuit: client.dniCuit || '',
                locality: client.locality || '',
                province: client.province || '',
                address: client.address || '',
                type: client.type || 'potencial',
                source: client.source || 'otro',
                status: client.status || 'activo',
                notes: client.notes || ''
            });
        } else {
            setFormData({
                firstName: '', lastName: '', phone: '', email: '', dniCuit: '',
                locality: '', province: '', address: '',
                type: 'potencial', source: 'otro', status: 'activo', notes: ''
            });
        }
    }, [client, isOpen]);

    useEffect(() => {
        const checkDuplicate = async () => {
            if ((!formData.phone || formData.phone.length < 5) && (!formData.email || formData.email.length < 5)) {
                setDuplicateWarning(null);
                return;
            }
            try {
                const token = localStorage.getItem('token');
                const query = formData.phone || formData.email;
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                const baseUrl = process.env.NODE_ENV === 'production' ? '' : API_URL;
                
                const res = await fetch(`${baseUrl}/api/admin/clients?search=${encodeURIComponent(query)}&limit=5`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    const others = data.clients.filter(c => c._id !== client?._id);
                    if (others.length > 0) {
                        setDuplicateWarning('Posible cliente duplicado. Ya existe un registro con este teléfono o email.');
                    } else {
                        setDuplicateWarning(null);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        };

        if (isOpen) {
            const timeoutId = setTimeout(checkDuplicate, 800);
            return () => clearTimeout(timeoutId);
        }
    }, [formData.phone, formData.email, client, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.firstName) {
            toast.error('El nombre es obligatorio');
            return;
        }
        
        if (!formData.phone && !formData.email) {
            toast.error('Debe ingresar un teléfono o un email');
            return;
        }
        
        setIsSubmitting(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            toast.error(error.message || 'Error al guardar el cliente');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-crm-surface border border-crm-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-crm-border bg-crm-surface">
                    <h2 className="text-xl font-bold text-white">
                        {client ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </h2>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-crm-fg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Alerta de datos mínimos */}
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-3 text-sm text-red-200">
                            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <p>El <strong>Nombre</strong> es obligatorio, junto con al menos un medio de contacto (<strong>Teléfono</strong> o <strong>Email</strong>).</p>
                        </div>

                        {duplicateWarning && (
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex gap-3 text-sm text-orange-200">
                                <AlertCircle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                                <p>{duplicateWarning}</p>
                            </div>
                        )}

                        {/* Datos Principales */}
                        <div>
                            <h3 className="text-sm font-bold text-crm-fg-muted uppercase tracking-wider mb-4 border-b border-crm-border pb-2">Datos Principales</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-crm-fg-muted mb-1">Nombre *</label>
                                    <input 
                                        type="text" name="firstName" value={formData.firstName} onChange={handleChange} required
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-crm-fg-muted mb-1">Apellido</label>
                                    <input 
                                        type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-crm-fg-muted mb-1">DNI / CUIT</label>
                                    <input 
                                        type="text" name="dniCuit" value={formData.dniCuit} onChange={handleChange}
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contacto */}
                        <div>
                            <h3 className="text-sm font-bold text-crm-fg-muted uppercase tracking-wider mb-4 border-b border-crm-border pb-2">Contacto</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-crm-fg-muted mb-1">Teléfono</label>
                                    <input 
                                        type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+54 9 297..."
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-crm-fg-muted mb-1">Email</label>
                                    <input 
                                        type="email" name="email" value={formData.email} onChange={handleChange}
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-crm-fg-muted mb-1">Localidad</label>
                                    <input 
                                        type="text" name="locality" value={formData.locality} onChange={handleChange}
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-crm-fg-muted mb-1">Provincia</label>
                                    <input 
                                        type="text" name="province" value={formData.province} onChange={handleChange}
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs text-crm-fg-muted mb-1">Dirección</label>
                                    <input 
                                        type="text" name="address" value={formData.address} onChange={handleChange}
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Clasificación */}
                        <div>
                            <h3 className="text-sm font-bold text-crm-fg-muted uppercase tracking-wider mb-4 border-b border-crm-border pb-2">Clasificación</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-crm-fg-muted mb-1">Tipo</label>
                                    <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="potencial">Potencial</option>
                                        <option value="comprador">Comprador</option>
                                        <option value="vendedor">Vendedor</option>
                                        <option value="ambos">Ambos</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-crm-fg-muted mb-1">Origen</label>
                                    <select name="source" value={formData.source} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="otro">Otro</option>
                                        <option value="web">Web</option>
                                        <option value="whatsapp">WhatsApp</option>
                                        <option value="instagram">Instagram</option>
                                        <option value="referido">Referido</option>
                                        <option value="local">Local</option>
                                        <option value="mercadolibre">MercadoLibre</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-crm-fg-muted mb-1">Estado</label>
                                    <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                        <option value="bloqueado">Bloqueado</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Notas */}
                        <div>
                            <h3 className="text-sm font-bold text-crm-fg-muted uppercase tracking-wider mb-4 border-b border-crm-border pb-2">Notas Internas</h3>
                            <textarea 
                                name="notes" value={formData.notes} onChange={handleChange} rows="3"
                                placeholder="Observaciones generales sobre el cliente..."
                                className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                            ></textarea>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-crm-border bg-crm-surface flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-crm-fg-muted hover:text-crm-fg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        form="client-form"
                        disabled={isSubmitting}
                        className="bg-crm-red hover:bg-crm-red-hover text-white px-6 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save size={18} />
                        {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
                    </button>
                </div>
            </div>
        </div>
    );
}
