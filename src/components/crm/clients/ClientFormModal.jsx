import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Scan, Upload } from 'lucide-react';
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
        assignee: '',
        reason: 'lead_digital',
        pipelineStage: 'nuevo',
        vehicleOfInterest: '',
        description: '',
        brand: '',
        model: '',
        currency: 'USD',
        maxBudget: '',
        yearFrom: '',
        yearTo: '',
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
                assignee: client.assignee || '',
                reason: client.reason || 'lead_digital',
                pipelineStage: client.pipelineStage || 'nuevo',
                vehicleOfInterest: client.vehicleOfInterest || '',
                description: client.description || '',
                brand: client.brand || '',
                model: client.model || '',
                currency: client.currency || 'USD',
                maxBudget: client.maxBudget || '',
                yearFrom: client.yearFrom || '',
                yearTo: client.yearTo || '',
                notes: client.notes || ''
            });
        } else {
            setFormData({
                firstName: '', lastName: '', phone: '', email: '', dniCuit: '',
                locality: '', province: '', address: '',
                type: 'potencial', source: 'otro', status: 'activo', 
                assignee: '', reason: 'lead_digital', pipelineStage: 'nuevo', 
                vehicleOfInterest: '', description: '', brand: '', model: '', 
                currency: 'USD', maxBudget: '', yearFrom: '', yearTo: '', notes: ''
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-crm-border bg-crm-surface shadow-2xl">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-crm-border bg-crm-topbar p-5">
                    <h2 className="m-0 text-lg font-bold text-crm-fg">
                        {client ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="m-0 flex h-9 w-9 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg"
                    >
                        <X size={19} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Alerta de datos mínimos */}
                        <div className="flex gap-3 rounded-lg border border-crm-red/20 bg-crm-red/10 p-3 text-sm text-red-200">
                            <AlertCircle size={18} className="mt-0.5 shrink-0 text-crm-red" />
                            <p>El <strong>Nombre</strong> es obligatorio, junto con al menos un medio de contacto (<strong>Teléfono</strong> o <strong>Email</strong>).</p>
                        </div>

                        {duplicateWarning && (
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex gap-3 text-sm text-orange-200">
                                <AlertCircle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                                <p>{duplicateWarning}</p>
                            </div>
                        )}

                        {/* Escaneo DNI */}
                        <div className="bg-crm-surface border border-dashed border-crm-border rounded-xl p-4 flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                    <Scan size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white mb-0.5">Escanear DNI (opcional)</p>
                                    <p className="text-[10px] text-gray-400">Extraer datos automáticamente.</p>
                                </div>
                            </div>
                            <button type="button" className="bg-crm-surface-raised hover:bg-crm-surface-raised border border-crm-border text-white text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                                <Upload size={14} /> Subir
                            </button>
                        </div>

                        {/* Datos Principales */}
                        <div>
                            <h3 className="text-sm font-bold text-crm-fg-muted uppercase tracking-wider mb-4 border-b border-crm-border pb-2">Datos Personales</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-xs text-crm-fg-muted mb-1">Nombre *</label>
                                    <input 
                                        type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required
                                        aria-label="Nombre del cliente"
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-xs text-crm-fg-muted mb-1">Apellido</label>
                                    <input 
                                        type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange}
                                        aria-label="Apellido del cliente"
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div>
                                    <label htmlFor="dniCuit" className="block text-xs text-crm-fg-muted mb-1">DNI / CUIT</label>
                                    <input 
                                        type="text" id="dniCuit" name="dniCuit" value={formData.dniCuit} onChange={handleChange}
                                        aria-label="DNI o CUIT del cliente"
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-xs text-crm-fg-muted mb-1">Teléfono</label>
                                    <input 
                                        type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+54 9 297..."
                                        aria-label="Teléfono del cliente"
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-xs text-crm-fg-muted mb-1">Email</label>
                                    <input 
                                        type="email" id="email" name="email" value={formData.email} onChange={handleChange}
                                        aria-label="Email del cliente"
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div>
                                    <label htmlFor="locality" className="block text-xs text-crm-fg-muted mb-1">Localidad</label>
                                    <input 
                                        type="text" id="locality" name="locality" value={formData.locality} onChange={handleChange}
                                        aria-label="Localidad del cliente"
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div>
                                    <label htmlFor="province" className="block text-xs text-crm-fg-muted mb-1">Provincia</label>
                                    <input 
                                        type="text" id="province" name="province" value={formData.province} onChange={handleChange}
                                        aria-label="Provincia del cliente"
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="address" className="block text-xs text-crm-fg-muted mb-1">Dirección</label>
                                    <input 
                                        type="text" id="address" name="address" value={formData.address} onChange={handleChange}
                                        aria-label="Dirección del cliente"
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Clasificación */}
                        <div>
                            <h3 className="text-sm font-bold text-crm-fg-muted uppercase tracking-wider mb-4 border-b border-crm-border pb-2">Clasificación</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label htmlFor="type" className="block text-xs text-crm-fg-muted mb-1">Tipo</label>
                                    <select id="type" name="type" aria-label="Tipo de cliente" value={formData.type} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="potencial">Potencial</option>
                                        <option value="comprador">Comprador</option>
                                        <option value="vendedor">Vendedor</option>
                                        <option value="ambos">Ambos</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="status" className="block text-xs text-crm-fg-muted mb-1">Estado</label>
                                    <select id="status" name="status" aria-label="Estado del cliente" value={formData.status} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                        <option value="bloqueado">Bloqueado</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="source" className="block text-xs text-crm-fg-muted mb-1">Origen</label>
                                    <select id="source" name="source" aria-label="Origen del cliente" value={formData.source} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
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
                                    <label htmlFor="assignee" className="block text-xs text-crm-fg-muted mb-1">Vendedor asignado</label>
                                    <select id="assignee" name="assignee" aria-label="Vendedor asignado al cliente" value={formData.assignee} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="">— Sin vendedor —</option>
                                        <option value="vendedor1">Vendedor 1</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Información Comercial */}
                        <div>
                            <h3 className="text-sm font-bold text-crm-fg-muted uppercase tracking-wider mb-4 border-b border-crm-border pb-2">Información Comercial</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label htmlFor="reason" className="block text-xs text-crm-fg-muted mb-1">Motivo</label>
                                    <select id="reason" name="reason" aria-label="Motivo del contacto" value={formData.reason} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="lead_digital">Lead digital</option>
                                        <option value="entro_puerta">Entró por la puerta</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="pipelineStage" className="block text-xs text-crm-fg-muted mb-1">Pipeline (Etapa comercial)</label>
                                    <select id="pipelineStage" name="pipelineStage" aria-label="Etapa del pipeline" value={formData.pipelineStage} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="nuevo">Nuevo</option>
                                        <option value="contactado">Contactado</option>
                                        <option value="cita_agendada">Cita agendada</option>
                                        <option value="mostrando_autos">Mostrando autos</option>
                                        <option value="en_negociacion">En negociación</option>
                                        <option value="propuesta_enviada">Propuesta enviada</option>
                                        <option value="cerrado">Cerrado</option>
                                        <option value="sin_interes">Sin interés</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="md:col-span-2">
                                    <label htmlFor="vehicleOfInterest" className="block text-xs text-crm-fg-muted mb-1">Vehículo del stock de interés</label>
                                    <input 
                                        type="text" id="vehicleOfInterest" name="vehicleOfInterest" value={formData.vehicleOfInterest} onChange={handleChange} placeholder="Ej: Volkswagen Amarok 2.0 TDI"
                                        aria-label="Vehículo de interés"
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" 
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="description" className="block text-xs text-crm-fg-muted mb-1">Descripción libre de lo que busca</label>
                                    <textarea 
                                        id="description" name="description" value={formData.description} onChange={handleChange} rows="2"
                                        aria-label="Descripción libre"
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red resize-none" 
                                    ></textarea>
                                </div>
                                <div>
                                    <label htmlFor="brand" className="block text-xs text-crm-fg-muted mb-1">Marca deseada</label>
                                    <input type="text" id="brand" name="brand" value={formData.brand} onChange={handleChange} aria-label="Marca" className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                </div>
                                <div>
                                    <label htmlFor="model" className="block text-xs text-crm-fg-muted mb-1">Modelo deseado</label>
                                    <input type="text" id="model" name="model" value={formData.model} onChange={handleChange} aria-label="Modelo" className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                </div>
                                <div>
                                    <label htmlFor="maxBudget" className="block text-xs text-crm-fg-muted mb-1">Presupuesto máximo</label>
                                    <div className="flex gap-2">
                                        <select id="currency" name="currency" aria-label="Moneda" value={formData.currency} onChange={handleChange} className="w-24 bg-crm-bg border border-crm-border rounded-lg px-2 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                            <option value="USD">USD</option>
                                            <option value="ARS">ARS</option>
                                        </select>
                                        <input type="number" id="maxBudget" name="maxBudget" value={formData.maxBudget} onChange={handleChange} aria-label="Presupuesto máximo" className="flex-1 bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="yearFrom" className="block text-xs text-crm-fg-muted mb-1">Año (Desde - Hasta)</label>
                                    <div className="flex gap-2">
                                        <input type="number" id="yearFrom" name="yearFrom" value={formData.yearFrom} onChange={handleChange} placeholder="Desde" aria-label="Año desde" className="w-1/2 bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                        <input type="number" id="yearTo" name="yearTo" value={formData.yearTo} onChange={handleChange} placeholder="Hasta" aria-label="Año hasta" className="w-1/2 bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                </div>
                            </div>
                            {client && (
                                <div className="grid grid-cols-2 gap-4 mt-4 bg-crm-surface-raised p-3 rounded-lg border border-crm-border">
                                    <div>
                                        <p className="text-[10px] text-crm-fg-muted uppercase font-bold tracking-wider mb-0.5">Fecha de Alta</p>
                                        <p className="text-xs text-crm-fg font-mono">{new Date(client.createdAt || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-crm-fg-muted uppercase font-bold tracking-wider mb-0.5">Último Contacto</p>
                                        <p className="text-xs text-crm-fg font-mono">{client.lastContact ? new Date(client.lastContact).toLocaleDateString() : '--'}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notas */}
                        <div>
                            <h3 className="text-sm font-bold text-crm-fg-muted uppercase tracking-wider mb-4 border-b border-crm-border pb-2">Notas y Adjuntos</h3>
                            <div className="mb-4">
                                <label htmlFor="notes" className="block text-xs text-crm-fg-muted mb-1">Notas Internas</label>
                                <textarea 
                                    id="notes" name="notes" value={formData.notes} onChange={handleChange} rows="3"
                                    aria-label="Notas internas"
                                    placeholder="Observaciones generales sobre el cliente..."
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red resize-none" 
                                ></textarea>
                            </div>
                            <div className="bg-crm-bg border border-dashed border-crm-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-white/20 transition-colors">
                                <Upload size={18} className="text-gray-500 mb-2" />
                                <p className="text-gray-300 text-xs font-medium">Subir archivos adjuntos</p>
                                <p className="text-gray-600 text-[10px] mt-1">Cotizaciones, fotos, documentos...</p>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-crm-border bg-crm-topbar p-5">
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
