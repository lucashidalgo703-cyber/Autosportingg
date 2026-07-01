"use client";

import React, { useEffect, useState } from 'react';
import { Moon, RefreshCw, Filter, MessageCircle, CalendarPlus, UserPlus, CheckCircle, X } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS, hasPermission } from '../../../utils/adminPermissions';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

export default function DormidosPage() {
    const { user } = useAuth();
    const [dormantList, setDormantList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [daysFilter, setDaysFilter] = useState('360'); // 12 months = ~360 days

    // Local filters
    const [sellerFilter, setSellerFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');

    // Action Modals State
    const [activeModal, setActiveModal] = useState(null); // 'reactivate', 'task', 'reassign'
    const [selectedContact, setSelectedContact] = useState(null);

    const canWriteDormant = hasPermission(user, PERMISSIONS.DORMANT_WRITE);

    const fetchDormant = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/dormidos?days=${daysFilter}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar inactivos');
            const data = await res.json();
            setDormantList(data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDormant();
    }, [daysFilter]);

    const handleActionClick = (action, contact) => {
        if (!canWriteDormant) {
            toast.error('No tienes permiso para realizar esta acción');
            return;
        }
        setSelectedContact(contact);
        setActiveModal(action);
    };

    const handleModalSuccess = () => {
        setActiveModal(null);
        setSelectedContact(null);
        fetchDormant();
    };

    const filteredList = dormantList.filter(d => 
        (!sellerFilter || (d.assignedTo?.name || d.assignedTo?.email) === sellerFilter) && 
        (!brandFilter || d.brand === brandFilter)
    );

    return (
        <PermissionGuard permission={PERMISSIONS.DORMANT_READ}>
            <div className="flex h-[calc(100vh-64px)] w-full flex-col bg-crm-bg p-4 md:p-6 overflow-y-auto">
                <div className="max-w-7xl mx-auto w-full space-y-6">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-crm-fg flex items-center gap-2">
                                <Moon className="text-indigo-500" /> Clientes Dormidos
                            </h1>
                            <p className="text-sm text-crm-fg-muted mt-1">Recuperación de cartera que superó el umbral de inactividad.</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-crm-surface border border-crm-border px-3 py-1.5 rounded-xl">
                                <Filter size={16} className="text-crm-fg-muted" />
                                <select 
                                    className="bg-transparent text-sm font-bold text-crm-fg outline-none"
                                    value={daysFilter}
                                    onChange={(e) => setDaysFilter(e.target.value)}
                                >
                                    <option value="360">+12 meses inactivos</option>
                                    <option value="540">+18 meses inactivos</option>
                                    <option value="720">+24 meses inactivos</option>
                                    <option value="900">+30 meses inactivos</option>
                                    <option value="1080">+36 meses inactivos</option>
                                </select>
                            </div>
                            <button onClick={fetchDormant} className="p-2 bg-crm-surface border border-crm-border rounded-xl text-crm-fg-muted hover:text-crm-fg transition-colors">
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Filtros locales extra */}
                    <div className="flex gap-3 mt-4 flex-wrap">
                        {Array.from(new Set(dormantList.filter(d => d.assignedTo).map(d => d.assignedTo.name || d.assignedTo.email))).length > 0 && (
                            <div className="flex items-center gap-2 bg-crm-surface border border-crm-border px-3 py-1.5 rounded-xl">
                                <span className="text-xs font-bold text-crm-fg-muted">Vendedor:</span>
                                <select 
                                    className="bg-transparent text-sm text-crm-fg outline-none"
                                    value={sellerFilter}
                                    onChange={(e) => setSellerFilter(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    {Array.from(new Set(dormantList.filter(d => d.assignedTo).map(d => d.assignedTo.name || d.assignedTo.email))).map(seller => (
                                        <option key={seller} value={seller}>{seller}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {Array.from(new Set(dormantList.filter(d => d.brand).map(d => d.brand))).length > 0 && (
                            <div className="flex items-center gap-2 bg-crm-surface border border-crm-border px-3 py-1.5 rounded-xl">
                                <span className="text-xs font-bold text-crm-fg-muted">Marca:</span>
                                <select 
                                    className="bg-transparent text-sm text-crm-fg outline-none"
                                    value={brandFilter}
                                    onChange={(e) => setBrandFilter(e.target.value)}
                                >
                                    <option value="">Todas</option>
                                    {Array.from(new Set(dormantList.filter(d => d.brand).map(d => d.brand))).map(brand => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* KPI Resumen */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="bg-crm-surface border border-crm-border p-5 rounded-2xl shadow-sm flex flex-col gap-2">
                            <p className="text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">Total Dormidos</p>
                            <p className="text-3xl font-black text-crm-fg">{dormantList.length}</p>
                        </div>
                        <div className="bg-crm-surface border border-crm-border p-5 rounded-2xl shadow-sm flex flex-col gap-2">
                            <p className="text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">Con Filtro</p>
                            <p className="text-3xl font-black text-crm-fg">{filteredList.length}</p>
                        </div>
                        <div className="bg-crm-surface border border-crm-border p-5 rounded-2xl shadow-sm flex flex-col gap-2">
                            <p className="text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">Clientes VIP</p>
                            <p className="text-3xl font-black text-amber-500">{dormantList.filter(d => d.tags?.includes('vip') || d.isVip).length}</p>
                        </div>
                        <div className="bg-crm-surface border border-crm-border p-5 rounded-2xl shadow-sm flex flex-col gap-2">
                            <p className="text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">Potencial Renovación</p>
                            <p className="text-3xl font-black text-emerald-500">{dormantList.filter(d => d.type === 'client').length}</p>
                        </div>
                    </div>

                    {/* Tabla de Dormidos */}
                    <div className="bg-crm-surface border border-crm-border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                        <div className="p-0 overflow-x-auto">
                            {loading ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className="text-sm font-bold text-crm-fg-muted">Calculando cartera inactiva...</p>
                                </div>
                            ) : dormantList.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <CheckCircle size={48} className="text-green-500/50 mb-4" />
                                    <h3 className="text-lg font-black text-crm-fg">¡Excelente trabajo!</h3>
                                    <p className="text-sm font-medium text-crm-fg-muted">No hay contactos inactivos en este rango de tiempo.</p>
                                </div>
                            ) : filteredList.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <Moon size={48} className="text-crm-fg-muted opacity-50 mb-4" />
                                    <h3 className="text-lg font-black text-crm-fg">Sin coincidencias</h3>
                                    <p className="text-sm font-medium text-crm-fg-muted">Los filtros aplicados no arrojaron resultados.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm text-crm-fg whitespace-nowrap">
                                    <thead className="bg-crm-bg text-xs font-bold uppercase text-crm-fg-muted border-b border-crm-border">
                                        <tr>
                                            <th className="px-6 py-4">Contacto</th>
                                            <th className="px-6 py-4">Días Inactivo</th>
                                            <th className="px-6 py-4">Responsable</th>
                                            <th className="px-6 py-4">Última Interacción</th>
                                            <th className="px-6 py-4 text-right">Acciones Rápidas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-crm-border">
                                        {filteredList.map(contact => (
                                            <tr key={contact._id} className="hover:bg-crm-bg/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white ${contact.type === 'lead' ? 'bg-blue-500' : 'bg-green-500'}`}>
                                                            {contact.firstName ? contact.firstName.charAt(0) : (contact.name ? contact.name.charAt(0) : '?')}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold">{contact.firstName || contact.name} {contact.lastName || ''}</div>
                                                            <div className="text-[10px] text-crm-fg-subtle uppercase tracking-wider">{contact.type} {contact.brand && `· ${contact.brand}`}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-black text-crm-red">{contact.daysInactive} días</span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-crm-fg-muted">
                                                    {contact.assignedTo ? (contact.assignedTo.name || contact.assignedTo.email || 'Sin asignar') : 'Sin asignar'}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-crm-fg-subtle">
                                                    {contact.lastContactDate ? new Date(contact.lastContactDate).toLocaleDateString() : (contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'N/A')}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {canWriteDormant && (
                                                            <>
                                                                <button 
                                                                    title="Reactivar / Log" 
                                                                    onClick={() => handleActionClick('reactivate', contact)}
                                                                    className="p-2 bg-crm-surface border border-crm-border text-crm-fg rounded-lg hover:bg-crm-bg transition-colors"
                                                                >
                                                                    <MessageCircle size={16} />
                                                                </button>
                                                                <button 
                                                                    title="Crear Tarea" 
                                                                    onClick={() => handleActionClick('task', contact)}
                                                                    className="p-2 bg-crm-surface border border-crm-border text-crm-fg rounded-lg hover:bg-crm-bg transition-colors"
                                                                >
                                                                    <CalendarPlus size={16} />
                                                                </button>
                                                                <button 
                                                                    title="Reasignar" 
                                                                    onClick={() => handleActionClick('reassign', contact)}
                                                                    className="p-2 bg-crm-surface border border-crm-border text-crm-fg rounded-lg hover:bg-crm-bg transition-colors"
                                                                >
                                                                    <UserPlus size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <a href={`/admin/${contact.type === 'client' ? 'clientes' : 'leads'}/${contact._id}`} className="ml-2 text-xs font-bold bg-crm-red-gradient text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                                                            Ver Ficha
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modals placed outside the table */}
                {activeModal === 'reactivate' && (
                    <ReactivateModal contact={selectedContact} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />
                )}
                {activeModal === 'task' && (
                    <TaskModal contact={selectedContact} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />
                )}
                {activeModal === 'reassign' && (
                    <ReassignModal contact={selectedContact} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />
                )}
            </div>
        </PermissionGuard>
    );
}

function ReactivateModal({ contact, onClose, onSuccess }) {
    const [note, setNote] = useState('');
    const [type, setType] = useState('llamada');
    const [isSaving, setIsSaving] = useState(false);
    const isClient = contact.type === 'client';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!note.trim()) return toast.error('Debes ingresar una nota para reactivarlo');

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const endpoint = isClient ? `/api/admin/clients/${contact._id}` : `/api/admin/leads/${contact._id}`;
            
            const payload = isClient 
                ? { newInteraction: { type, note } }
                : { newNote: note };

            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al registrar interacción');
            }
            toast.success('Contacto reactivado exitosamente');
            onSuccess();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-crm-surface shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between border-b border-crm-border bg-crm-bg p-4">
                    <h3 className="text-lg font-bold text-crm-fg">Reactivar Contacto</h3>
                    <button onClick={onClose} className="rounded-full p-2 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4">
                    <form id="reactivate-form" onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm font-medium text-crm-fg-muted mb-2">
                            Registra un contacto con <strong className="text-crm-fg">{contact.firstName || contact.name}</strong> para sacarlo de la cartera de dormidos.
                        </p>
                        {isClient && (
                            <div>
                                <label className="mb-1 block text-sm font-bold text-crm-fg-muted">Canal de Interacción</label>
                                <select 
                                    value={type}
                                    onChange={e => setType(e.target.value)}
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-crm-fg outline-none focus:border-crm-red"
                                >
                                    <option value="llamada">Llamada</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="email">Email</option>
                                    <option value="visita">Visita</option>
                                    <option value="nota">Nota Interna</option>
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="mb-1 block text-sm font-bold text-crm-fg-muted">Nota de Reactivación</label>
                            <textarea 
                                required
                                rows="3"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Detalles de la comunicación..."
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-crm-fg outline-none focus:border-crm-red"
                            ></textarea>
                        </div>
                    </form>
                </div>
                <div className="border-t border-crm-border bg-crm-bg p-4 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-bold text-crm-fg-muted hover:bg-crm-surface-raised">
                        Cancelar
                    </button>
                    <button type="submit" form="reactivate-form" disabled={isSaving} className="rounded-xl bg-crm-red px-6 py-2 font-bold text-white transition hover:bg-red-600 disabled:opacity-50 flex items-center gap-2">
                        {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                        Reactivar
                    </button>
                </div>
            </div>
        </div>
    );
}

function TaskModal({ contact, onClose, onSuccess }) {
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return toast.error('El título es requerido');
        if (!dueDate) return toast.error('La fecha límite es requerida');

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                title,
                dueDate
            };
            if (contact.type === 'client') payload.clientId = contact._id;
            else payload.leadId = contact._id;

            const res = await fetch('/api/admin/crm-tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al crear tarea');
            }
            toast.success('Tarea creada exitosamente');
            onSuccess();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-crm-surface shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between border-b border-crm-border bg-crm-bg p-4">
                    <h3 className="text-lg font-bold text-crm-fg">Agendar Tarea</h3>
                    <button onClick={onClose} className="rounded-full p-2 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4">
                    <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm font-medium text-crm-fg-muted mb-2">
                            Crear una próxima acción para <strong className="text-crm-fg">{contact.firstName || contact.name}</strong>.
                        </p>
                        <div>
                            <label className="mb-1 block text-sm font-bold text-crm-fg-muted">Título de la Tarea</label>
                            <input 
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Ej. Llamar para ofrecer financiamiento"
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-crm-fg outline-none focus:border-crm-red"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-bold text-crm-fg-muted">Fecha y Hora Límite</label>
                            <input 
                                type="datetime-local"
                                required
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-crm-fg outline-none focus:border-crm-red"
                            />
                        </div>
                    </form>
                </div>
                <div className="border-t border-crm-border bg-crm-bg p-4 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-bold text-crm-fg-muted hover:bg-crm-surface-raised">
                        Cancelar
                    </button>
                    <button type="submit" form="task-form" disabled={isSaving} className="rounded-xl bg-crm-red px-6 py-2 font-bold text-white transition hover:bg-red-600 disabled:opacity-50 flex items-center gap-2">
                        {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
                        Crear Tarea
                    </button>
                </div>
            </div>
        </div>
    );
}

function ReassignModal({ contact, onClose, onSuccess }) {
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [assignedTo, setAssignedTo] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/admin/users/active', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data);
                }
            } finally {
                setLoadingUsers(false);
            }
        };
        loadUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!assignedTo) return toast.error('Debe seleccionar un asesor');

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const endpoint = contact.type === 'client' 
                ? `/api/admin/clients/${contact._id}` 
                : `/api/admin/leads/${contact._id}`;

            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ assignedTo })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al reasignar el contacto');
            }
            toast.success('Contacto reasignado exitosamente');
            onSuccess();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-crm-surface shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between border-b border-crm-border bg-crm-bg p-4">
                    <h3 className="text-lg font-bold text-crm-fg">Reasignar Contacto</h3>
                    <button onClick={onClose} className="rounded-full p-2 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4">
                    <form id="reassign-form" onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm font-medium text-crm-fg-muted mb-2">
                            Transfiere la responsabilidad de <strong className="text-crm-fg">{contact.firstName || contact.name}</strong> a un nuevo asesor de la lista de activos.
                        </p>
                        <div>
                            <label className="mb-1 block text-sm font-bold text-crm-fg-muted">Nuevo Asesor</label>
                            {loadingUsers ? (
                                <div className="h-10 flex items-center gap-2 text-sm text-crm-fg-muted">
                                    <RefreshCw size={16} className="animate-spin" /> Cargando asesores...
                                </div>
                            ) : (
                                <select 
                                    required
                                    value={assignedTo}
                                    onChange={e => setAssignedTo(e.target.value)}
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-crm-fg outline-none focus:border-crm-red"
                                >
                                    <option value="" disabled>Seleccionar asesor...</option>
                                    {users.map(u => (
                                        <option key={u._id} value={u._id}>{u.name || u.username} ({u.email})</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </form>
                </div>
                <div className="border-t border-crm-border bg-crm-bg p-4 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-bold text-crm-fg-muted hover:bg-crm-surface-raised">
                        Cancelar
                    </button>
                    <button type="submit" form="reassign-form" disabled={isSaving || loadingUsers} className="rounded-xl bg-crm-red px-6 py-2 font-bold text-white transition hover:bg-red-600 disabled:opacity-50 flex items-center gap-2">
                        {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <UserPlus size={16} />}
                        Reasignar
                    </button>
                </div>
            </div>
        </div>
    );
}
