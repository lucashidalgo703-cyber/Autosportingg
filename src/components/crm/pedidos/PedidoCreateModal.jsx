import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { parseResponseSafe } from '../../../utils/apiHelper';
import CrmButton from '../ui/CrmButton';
import toast from 'react-hot-toast';

export default function PedidoCreateModal({ isOpen, onClose, editingPedido = null, onSaved }) {
    const { token, user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [clients, setClients] = useState([]);
    const [sellers, setSellers] = useState([]);

    const [formData, setFormData] = useState({
        clientId: '',
        clientName: '',
        clientPhone: '',
        requestedBrand: '',
        requestedModel: '',
        yearRange: '',
        budget: '',
        currency: 'USD',
        status: 'Pendiente',
        notes: '',
        assignedTo: user?.id || '',
        nextActionDate: ''
    });

    useEffect(() => {
        if (!isOpen || !token) return;
        
        const fetchInitialData = async () => {
            try {
                const [clientsRes, sellersRes] = await Promise.all([
                    fetch('/api/admin/clients?limit=1000', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (clientsRes.ok) {
                    const data = await parseResponseSafe(clientsRes);
                    setClients(data.clients || data || []);
                }
                if (sellersRes.ok) {
                    const data = await parseResponseSafe(sellersRes);
                    setSellers(data || []);
                }
            } catch (err) {
                console.error('Error fetching initial data', err);
            }
        };
        fetchInitialData();
    }, [isOpen, token]);

    useEffect(() => {
        if (editingPedido) {
            setFormData({
                clientId: editingPedido.clientId?._id || editingPedido.clientId || '',
                clientName: editingPedido.clientName || '',
                clientPhone: editingPedido.clientPhone || '',
                requestedBrand: editingPedido.requestedBrand || '',
                requestedModel: editingPedido.requestedModel || '',
                yearRange: editingPedido.yearRange || '',
                budget: editingPedido.budget || '',
                currency: editingPedido.currency || 'USD',
                status: editingPedido.status || 'Pendiente',
                notes: editingPedido.notes || '',
                assignedTo: editingPedido.assignedTo?._id || editingPedido.assignedTo || user?.id || '',
                nextActionDate: editingPedido.nextActionDate ? new Date(editingPedido.nextActionDate).toISOString().split('T')[0] : ''
            });
        } else {
            setFormData({
                clientId: '',
                clientName: '',
                clientPhone: '',
                requestedBrand: '',
                requestedModel: '',
                yearRange: '',
                budget: '',
                currency: 'USD',
                status: 'Pendiente',
                notes: '',
                assignedTo: user?.id || '',
                nextActionDate: ''
            });
        }
    }, [editingPedido, isOpen, user?.id]);

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        if (!formData.clientName && !formData.clientId) {
            toast.error('Debe vincular o ingresar un nombre de cliente');
            return;
        }
        if (!formData.requestedBrand || !formData.requestedModel) {
            toast.error('Marca y Modelo son obligatorios');
            return;
        }

        setSaving(true);
        try {
            const payload = { 
                ...formData,
                budget: Number(formData.budget) || 0
            };
            if (!payload.clientId) delete payload.clientId;
            if (!payload.nextActionDate) delete payload.nextActionDate;

            const url = editingPedido ? `/api/admin/pedidos/${editingPedido._id}` : '/api/admin/pedidos';
            const method = editingPedido ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await parseResponseSafe(res);
                throw new Error(errorData.error || errorData.message || 'Error al guardar el pedido');
            }

            toast.success(editingPedido ? 'Pedido actualizado' : 'Pedido creado');
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6">
            <div className="relative flex h-[90vh] max-h-[700px] w-full max-w-[800px] flex-col rounded-xl border border-crm-border bg-[#1C1C1F] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-crm-border p-5">
                    <div>
                        <h2 className="m-0 text-xl font-bold text-crm-fg">{editingPedido ? 'Editar Pedido' : 'Nuevo Pedido'}</h2>
                        <p className="m-0 mt-1 text-xs text-crm-fg-muted">Búsqueda activa de vehículos a solicitud.</p>
                    </div>
                    <button onClick={onClose} className="rounded p-1 text-crm-fg-muted hover:bg-white/10 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-crm-border">
                    <form id="pedido-form" onSubmit={handleSave} className="flex flex-col gap-8">
                        {/* Section 1: Cliente */}
                        <div className="flex flex-col gap-4">
                            <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-crm-fg-muted flex items-center gap-2">
                                <Search size={14} /> DATOS DEL CLIENTE
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Cliente (del CRM)</label>
                                    <select 
                                        className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                        value={formData.clientId}
                                        onChange={(e) => {
                                            handleChange('clientId', e.target.value);
                                            const c = clients.find(cl => cl._id === e.target.value);
                                            if (c) {
                                                handleChange('clientName', c.fullName || c.firstName);
                                                handleChange('clientPhone', c.phone || '');
                                            }
                                        }}
                                    >
                                        <option value="">— Sin vincular —</option>
                                        {clients.map(c => (
                                            <option key={c._id} value={c._id}>{c.fullName || c.firstName} {c.phone ? `(${c.phone})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Nombre del cliente <span className="text-crm-red">*</span></label>
                                    <input 
                                        type="text"
                                        required
                                        value={formData.clientName}
                                        onChange={(e) => handleChange('clientName', e.target.value)}
                                        className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Teléfono / Contacto</label>
                                    <input 
                                        type="text"
                                        value={formData.clientPhone}
                                        onChange={(e) => handleChange('clientPhone', e.target.value)}
                                        className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Vendedor Asignado</label>
                                    <select 
                                        className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                        value={formData.assignedTo}
                                        onChange={(e) => handleChange('assignedTo', e.target.value)}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {sellers.map(s => (
                                            <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Vehículo Buscado */}
                        <div className="flex flex-col gap-4 border-t border-crm-border pt-6">
                            <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-crm-fg-muted flex items-center gap-2">
                                VEHÍCULO BUSCADO
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Marca <span className="text-crm-red">*</span></label>
                                    <input type="text" required placeholder="Ej: Volkswagen" value={formData.requestedBrand} onChange={e => handleChange('requestedBrand', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Modelo <span className="text-crm-red">*</span></label>
                                    <input type="text" required placeholder="Ej: Amarok V6" value={formData.requestedModel} onChange={e => handleChange('requestedModel', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Año (Rango)</label>
                                    <input type="text" placeholder="Ej: 2018 - 2022" value={formData.yearRange} onChange={e => handleChange('yearRange', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Presupuesto Máximo</label>
                                    <div className="flex gap-2">
                                        <select value={formData.currency} onChange={e => handleChange('currency', e.target.value)} className="h-10 w-[100px] rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none">
                                            <option value="USD">USD</option>
                                            <option value="ARS">ARS</option>
                                        </select>
                                        <input type="number" placeholder="0.00" value={formData.budget} onChange={e => handleChange('budget', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Gestión */}
                        <div className="flex flex-col gap-4 border-t border-crm-border pt-6">
                            <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-crm-fg-muted flex items-center gap-2">
                                ESTADO Y SEGUIMIENTO
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Estado del Pedido</label>
                                    <select value={formData.status} onChange={e => handleChange('status', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm font-bold text-white focus:border-crm-red focus:outline-none">
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Buscando">Buscando</option>
                                        <option value="Cumplido">Cumplido</option>
                                        <option value="Cancelado">Cancelado</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Próximo seguimiento</label>
                                    <input type="date" value={formData.nextActionDate} onChange={e => handleChange('nextActionDate', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 mt-2">
                                <label className="text-sm font-medium text-crm-fg">Notas / Detalles adicionales</label>
                                <textarea 
                                    rows={3}
                                    placeholder="Ej. Colores preferidos, manual o automático, posibles permutas que entrega..."
                                    value={formData.notes}
                                    onChange={e => handleChange('notes', e.target.value)}
                                    className="w-full resize-none rounded-md border border-crm-border bg-crm-surface p-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-crm-border bg-crm-surface p-4 rounded-b-xl">
                    <CrmButton variant="ghost" onClick={onClose} disabled={saving}>
                        Cancelar
                    </CrmButton>
                    <CrmButton variant="primary" form="pedido-form" type="submit" loading={saving}>
                        Guardar Pedido
                    </CrmButton>
                </div>
            </div>
        </div>
    );
}
