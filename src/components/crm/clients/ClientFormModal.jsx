import React, { useState, useEffect, useRef } from 'react';
import { X, Save, AlertCircle, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { CLIENT_PIPELINE_STAGES, getClientPipelineStage, clientCalendarKey } from '../../../utils/clientCommercial';

export default function ClientFormModal({ isOpen, onClose, onSave, client = null }) {
    const { token } = useAuth();
    const modalRef = useRef(null);
    const saving = useRef(false);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        if (!isOpen) return;
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        modalRef.current?.querySelector('input')?.focus();
        const keydown = event => {
            if (event.key === 'Escape' && !saving.current) { event.preventDefault(); closeRef.current?.(); }
            if (event.key !== 'Tab') return;
            const nodes = [...(modalRef.current?.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])') || [])];
            if (!nodes.length) return;
            if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1)?.focus(); }
            else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
        };
        window.addEventListener('keydown', keydown);
        return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', keydown); previousFocus?.focus?.(); };
    }, [isOpen]);
    const [users, setUsers] = useState([]);
    const [usersError, setUsersError] = useState(false);
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
        assignedTo: '',
        reason: 'lead_digital',
        pipelineStage: 'sin_contactar',
        vehicleOfInterest: '',
        description: '',
        brand: '',
        model: '',
        currency: 'USD',
        maxBudget: '',
        yearFrom: '',
        yearTo: '',
        nextAction: '', nextActionDate: '', lastContactDate: '',
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
                assignedTo: client.assignedTo?._id || client.assignedTo || '',
                reason: client.reason || 'lead_digital',
                pipelineStage: getClientPipelineStage(client),
                vehicleOfInterest: client.vehicleOfInterest || '',
                description: client.description || '',
                brand: client.brand || '',
                model: client.model || '',
                currency: client.currency || 'USD',
                maxBudget: client.maxBudget ?? '',
                yearFrom: client.yearFrom || '',
                yearTo: client.yearTo || '',
                nextAction: client.nextAction || '', nextActionDate: clientCalendarKey(client.nextActionDate), lastContactDate: clientCalendarKey(client.lastContactDate),
                notes: client.notes || ''
            });
        } else {
            setFormData({
                firstName: '', lastName: '', phone: '', email: '', dniCuit: '',
                locality: '', province: '', address: '',
                type: 'potencial', source: 'otro', status: 'activo',
                assignedTo: '', reason: 'lead_digital', pipelineStage: 'sin_contactar',
                vehicleOfInterest: '', description: '', brand: '', model: '',
                currency: 'USD', maxBudget: '', yearFrom: '', yearTo: '', nextAction: '', nextActionDate: '', lastContactDate: '', notes: ''
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

    useEffect(() => {
        if (!isOpen || !token) return;
        const controller = new AbortController();
        setUsers([]); setUsersError(false);
        fetch('/api/admin/users/active', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
            .then(response => { if (!response.ok) throw new Error(); return response.json(); })
            .then(data => { if (!controller.signal.aborted) setUsers(Array.isArray(data) ? data : []); })
            .catch(error => { if (error.name !== 'AbortError') setUsersError(true); });
        return () => controller.abort();
    }, [isOpen, token]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving.current) return;

        if (!formData.firstName.trim()) {
            toast.error('El nombre es obligatorio');
            return;
        }

        saving.current = true;
        setIsSubmitting(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            toast.error(error.message || 'Error al guardar el cliente');
        } finally {
            saving.current = false;
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
            <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="client-form-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-crm-border bg-crm-surface shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-crm-border bg-crm-topbar p-5">
                    <div className="flex items-center gap-3">
                        <h2 id="client-form-title" className="m-0 text-lg font-bold text-crm-fg">
                            {client ? 'Editar Cliente' : 'Nuevo Cliente'}
                        </h2>
                        <Link href="/admin/ayuda?tema=clientes" className="text-crm-fg-muted hover:text-crm-red transition-colors" title="Ver ayuda sobre clientes y pipeline">
                            <HelpCircle size={18} />
                        </Link>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar formulario de cliente"
                        disabled={isSubmitting}
                        className="m-0 flex h-9 w-9 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg"
                    >
                        <X size={19} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form id="client-form" onSubmit={handleSubmit} className="space-y-4">

                        {/* Alerta de datos mínimos */}
                        <div className="flex gap-3 rounded-lg border border-crm-red/20 bg-crm-red/10 p-3 text-sm text-red-200">
                            <AlertCircle size={18} className="mt-0.5 shrink-0 text-crm-red" />
                            <p>Campo mínimo: <strong>Nombre</strong>. El resto se puede completar más tarde.</p>
                        </div>

                        {duplicateWarning && (
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex gap-3 text-sm text-orange-200">
                                <AlertCircle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                                <p>{duplicateWarning}</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                                    <label htmlFor="phone" className="block text-xs text-crm-fg-muted mb-1">Teléfono</label>
                                    <input
                                        type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+54 9 297..."
                                        aria-label="Teléfono del cliente"
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
<div className="md:col-span-2"><label htmlFor="client-nextAction" className="mb-1 block text-xs text-crm-fg-muted">Próxima acción (opcional)</label><input id="client-nextAction" name="nextAction" value={formData.nextAction || ''} onChange={handleChange} maxLength={500} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg" /></div>
<div><label htmlFor="client-nextActionDate" className="mb-1 block text-xs text-crm-fg-muted">Fecha del próximo paso</label><input id="client-nextActionDate" type="date" name="nextActionDate" value={formData.nextActionDate || ''} onChange={handleChange} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg" /></div>
                        </div>
                        <details key={client?._id || 'nuevo'} open={Boolean(client)} className="rounded-lg border border-crm-border bg-crm-bg/30 px-3 py-3">
                            <summary className="cursor-pointer text-sm font-semibold text-crm-fg">Más datos y asignación</summary>
                            {usersError && <p role="status" className="text-xs text-amber-300">No se pudo cargar el equipo. Podés conservar el vendedor actual o guardar sin asignar.</p>}
                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
<div>
                                    <label htmlFor="email" className="block text-xs text-crm-fg-muted mb-1">Email</label>
                                    <input
                                        type="email" id="email" name="email" value={formData.email} onChange={handleChange}
                                        aria-label="Email del cliente"
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
                                    <label htmlFor="assignedTo" className="block text-xs text-crm-fg-muted mb-1">Vendedor asignado</label>
                                    <select id="assignedTo" name="assignedTo" aria-label="Vendedor asignado al cliente" value={formData.assignedTo} onChange={handleChange} className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red">
                                        <option value="">— Sin vendedor —</option>
                                        {client?.assignedTo && !users.some(user => user._id === formData.assignedTo) && <option value={formData.assignedTo}>{client.assignedTo?.name || 'Vendedor actual'}</option>}
                                        {users.map(user => <option key={user._id} value={user._id}>{user.name || user.email}</option>)}
                                    </select>
                                </div>
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
                                        {!CLIENT_PIPELINE_STAGES.some(stage => stage.id === formData.pipelineStage) && <option value={formData.pipelineStage}>Etapa a revisar</option>}
                                        {CLIENT_PIPELINE_STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                                    </select>
                                </div>
<div className="md:col-span-2">
                                    <label htmlFor="vehicleOfInterest" className="block text-xs text-crm-fg-muted mb-1">Vehículo del stock de interés</label>
                                    <input
                                        type="text" id="vehicleOfInterest" name="vehicleOfInterest" value={formData.vehicleOfInterest} onChange={handleChange} placeholder="Ej: Volkswagen Amarok 2.0 TDI"
                                        aria-label="Vehículo de interés"
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red"
                                    />
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
<div><label htmlFor="client-lastContactDate" className="mb-1 block text-xs text-crm-fg-muted">Último contacto</label><input id="client-lastContactDate" type="date" name="lastContactDate" value={formData.lastContactDate || ''} onChange={handleChange} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg" /></div>
                            </div>
                            {client && <p className="mb-0 mt-4 text-xs text-crm-fg-muted">Fecha de alta: {new Date(client.createdAt).toLocaleDateString('es-AR')}</p>}
                        </details>
                        <div>
<div className="mb-4">
                                <label htmlFor="notes" className="block text-xs text-crm-fg-muted mb-1">Notas Internas</label>
                                <textarea
                                    id="notes" name="notes" value={formData.notes} onChange={handleChange} rows="3"
                                    aria-label="Notas internas"
                                    placeholder="Observaciones generales sobre el cliente..."
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red resize-none"
                                ></textarea>
                            </div>
                            <p className="mb-0 text-xs text-crm-fg-muted">Esta carga guarda datos y notas. No adjunta archivos ni realiza escaneo de documentos.</p>
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
