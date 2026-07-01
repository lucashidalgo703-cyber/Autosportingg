"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Search, Filter, Clock, CheckCircle2, User, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS, hasPermission } from '../../../utils/adminPermissions';
import toast from 'react-hot-toast';

export default function ReclamosPage() {
    const { user, token } = useAuth();
    const canWrite = hasPermission(user, PERMISSIONS.RECLAMOS_WRITE);

    const [reclamos, setReclamos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('abiertos'); // abiertos, en_curso, cerrados
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPriority, setFilterPriority] = useState('all');

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedReclamo, setSelectedReclamo] = useState(null);

    // Form states
    const [newReclamo, setNewReclamo] = useState({ title: '', description: '', priority: 'medium' });
    const [statusUpdate, setStatusUpdate] = useState('');
    const [priorityUpdate, setPriorityUpdate] = useState('');
    const [newNote, setNewNote] = useState('');

    const getUserDisplayName = (account, fallback = 'Sin asignar') => {
        if (!account) return fallback;
        const fullName = [account.firstName, account.lastName].filter(Boolean).join(' ').trim();
        return account.name || fullName || account.email || fallback;
    };

    const fetchReclamos = async () => {
        if (!token) return;
        try {
            const res = await fetch(`/api/admin/reclamos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error cargando reclamos');
            const data = await res.json();
            setReclamos(data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReclamos();
    }, [token]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/admin/reclamos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newReclamo)
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al crear reclamo');
            }
            toast.success('Reclamo registrado con éxito');
            setIsCreateOpen(false);
            setNewReclamo({ title: '', description: '', priority: 'medium' });
            fetchReclamos();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const body = {};
            if (statusUpdate && statusUpdate !== selectedReclamo.status) body.status = statusUpdate;
            if (priorityUpdate && priorityUpdate !== selectedReclamo.priority) body.priority = priorityUpdate;
            if (newNote) body.newNote = newNote;

            if (Object.keys(body).length === 0) return;

            const res = await fetch(`/api/admin/reclamos/${selectedReclamo._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Error actualizando');
            toast.success('Actualizado correctamente');
            
            const updatedReclamo = await res.json();
            setSelectedReclamo(updatedReclamo);
            setNewNote('');
            fetchReclamos();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const openManageModal = (r) => {
        setSelectedReclamo(r);
        setStatusUpdate(r.status);
        setPriorityUpdate(r.priority);
        setNewNote('');
    };

    // Filtros
    const filteredReclamos = reclamos.filter(r => {
        // Status filter
        if (filterStatus === 'abiertos' && r.status !== 'open') return false;
        if (filterStatus === 'en_curso' && r.status !== 'in_progress') return false;
        if (filterStatus === 'cerrados' && r.status !== 'closed') return false;
        
        // Priority filter
        if (filterPriority !== 'all' && r.priority !== filterPriority) return false;

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term);
        }
        return true;
    });

    // Métricas (KPIs)
    const SLA_LIMIT_HOURS = 48;
    const stats = {
        abiertos: reclamos.filter(r => r.status === 'open').length,
        enCurso: reclamos.filter(r => r.status === 'in_progress').length,
        urgentes: reclamos.filter(r => r.status !== 'closed' && r.priority === 'urgent').length,
        estancados: reclamos.filter(r => {
            if (r.status === 'closed') return false;
            const hoursSinceLastActivity = (new Date() - new Date(r.lastActivityAt || r.createdAt)) / (1000 * 60 * 60);
            return hoursSinceLastActivity > SLA_LIMIT_HOURS;
        }).length
    };

    const getStatusBadge = (status) => {
        const styles = {
            open: 'bg-yellow-500/10 text-yellow-600',
            in_progress: 'bg-blue-500/10 text-blue-600',
            closed: 'bg-green-500/10 text-green-600'
        };
        const labels = { open: 'Abierto', in_progress: 'En Curso', closed: 'Cerrado' };
        return <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${styles[status]}`}>{labels[status]}</span>;
    };

    const getPriorityBadge = (prio) => {
        const styles = {
            low: 'text-gray-400',
            medium: 'text-blue-500',
            high: 'text-orange-500',
            urgent: 'text-crm-red'
        };
        const labels = { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
        return <span className={`text-xs font-bold ${styles[prio]}`}>Prioridad {labels[prio]}</span>;
    };

    return (
        <PermissionGuard permission={PERMISSIONS.RECLAMOS_READ}>
            <div className="flex h-[calc(100vh-64px)] w-full flex-col bg-crm-bg p-4 md:p-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-crm-fg flex items-center gap-2">
                            <AlertTriangle className="text-crm-red" /> Reclamos
                        </h1>
                        <p className="text-sm text-crm-fg-muted mt-1">Gestión y seguimiento de reclamos de clientes y operativos.</p>
                    </div>
                    {canWrite && (
                        <button 
                            onClick={() => setIsCreateOpen(true)}
                            className="flex items-center gap-2 bg-crm-red-gradient text-white px-4 py-2 rounded-xl text-sm font-black shadow-crm-shadow-red hover:opacity-90 transition-opacity"
                        >
                            <Plus size={18} /> Nuevo Reclamo
                        </button>
                    )}
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                        <div className="text-crm-fg-muted text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><FileText size={14}/> Abiertos</div>
                        <div className="text-2xl font-black text-crm-fg">{stats.abiertos}</div>
                    </div>
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                        <div className="text-crm-fg-muted text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Clock size={14}/> En Curso</div>
                        <div className="text-2xl font-black text-crm-fg">{stats.enCurso}</div>
                    </div>
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                        <div className="text-crm-fg-muted text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><AlertTriangle size={14}/> Urgentes</div>
                        <div className="text-2xl font-black text-crm-red">{stats.urgentes}</div>
                    </div>
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                        <div className="text-crm-fg-muted text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><AlertCircle size={14}/> Estancados / SLA</div>
                        <div className="text-2xl font-black text-orange-500">{stats.estancados}</div>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-crm-surface p-4 rounded-2xl border border-crm-border shadow-sm">
                    <div className="flex gap-2 w-full md:w-auto">
                        {['abiertos', 'en_curso', 'cerrados'].map(f => (
                            <button key={f} onClick={() => setFilterStatus(f)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filterStatus === f ? 'bg-crm-bg border border-crm-border text-crm-fg shadow-sm' : 'text-crm-fg-muted hover:text-crm-fg'}`}>
                                {f === 'abiertos' ? 'Abiertos' : f === 'en_curso' ? 'En Curso' : 'Cerrados'}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <select 
                            className="h-10 rounded-xl border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg outline-none"
                            value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                        >
                            <option value="all">Todas las Prioridades</option>
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                        </select>
                        <div className="relative flex-1 md:w-64">
                            <input 
                                type="text" 
                                placeholder="Buscar reclamo..." 
                                className="w-full h-10 pl-9 pr-4 rounded-xl border border-crm-border bg-crm-bg text-sm text-crm-fg outline-none focus:border-crm-red transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search size={16} className="absolute left-3 top-3 text-crm-fg-muted" />
                        </div>
                    </div>
                </div>

                {/* Listado */}
                {loading ? (
                    <div className="text-center p-12 text-crm-fg-muted">Cargando reclamos...</div>
                ) : filteredReclamos.length === 0 ? (
                    <div className="text-center p-12 bg-crm-surface border border-crm-border rounded-2xl shadow-sm flex flex-col items-center">
                        <CheckCircle2 size={48} className="text-crm-border mb-4" />
                        <p className="text-crm-fg font-bold text-lg mb-1">Todo en orden</p>
                        <p className="text-crm-fg-muted text-sm">No hay reclamos que coincidan con los filtros actuales.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredReclamos.map(r => (
                            <div key={r._id} className="bg-crm-surface border border-crm-border rounded-2xl p-5 shadow-sm flex flex-col cursor-pointer hover:border-crm-red/30 transition-colors" onClick={() => openManageModal(r)}>
                                <div className="flex justify-between items-start mb-3">
                                    {getStatusBadge(r.status)}
                                    {getPriorityBadge(r.priority)}
                                </div>
                                <h3 className="font-black text-crm-fg text-lg mb-2">{r.title}</h3>
                                <p className="text-sm text-crm-fg-muted line-clamp-2 mb-4 flex-1">{r.description}</p>
                                
                                <div className="flex items-center justify-between text-xs text-crm-fg-subtle pt-4 border-t border-crm-border">
                                    <div className="flex items-center gap-1 font-medium">
                                        <User size={12} /> {getUserDisplayName(r.assignedTo)}
                                    </div>
                                    <div className="flex items-center gap-1 font-medium">
                                        <Clock size={12} /> {new Date(r.lastActivityAt || r.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Crear Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-crm-surface shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b border-crm-border px-6 py-4">
                            <h3 className="text-lg font-black text-crm-fg">Nuevo Reclamo</h3>
                            <button onClick={() => setIsCreateOpen(false)} className="text-crm-fg-muted hover:text-crm-fg">✕</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Título del Reclamo</label>
                                <input required className="w-full h-11 rounded-xl border border-crm-border bg-crm-bg px-4 text-sm text-crm-fg outline-none focus:border-crm-red"
                                    value={newReclamo.title} onChange={e => setNewReclamo({...newReclamo, title: e.target.value})} placeholder="Ej: Problema con documentación..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Descripción Detallada</label>
                                <textarea required rows={4} className="w-full rounded-xl border border-crm-border bg-crm-bg p-4 text-sm text-crm-fg outline-none focus:border-crm-red resize-none"
                                    value={newReclamo.description} onChange={e => setNewReclamo({...newReclamo, description: e.target.value})} placeholder="Describe el problema del cliente..."></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Prioridad Inicial</label>
                                <select className="w-full h-11 rounded-xl border border-crm-border bg-crm-bg px-4 text-sm text-crm-fg outline-none"
                                    value={newReclamo.priority} onChange={e => setNewReclamo({...newReclamo, priority: e.target.value})}>
                                    <option value="low">Baja</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-sm font-bold text-crm-fg-muted hover:text-crm-fg">Cancelar</button>
                                <button type="submit" className="rounded-xl bg-crm-red-gradient px-6 py-2 text-sm font-black text-white shadow-sm">Crear Reclamo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Ver / Gestionar Modal */}
            {selectedReclamo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-crm-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between border-b border-crm-border px-6 py-4 bg-crm-bg/50">
                            <h3 className="text-lg font-black text-crm-fg flex items-center gap-3">
                                {getStatusBadge(selectedReclamo.status)} Seguimiento de Reclamo
                            </h3>
                            <button onClick={() => setSelectedReclamo(null)} className="text-crm-fg-muted hover:text-crm-fg">✕</button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-crm-fg mb-2">{selectedReclamo.title}</h2>
                                <p className="text-sm text-crm-fg-muted whitespace-pre-wrap">{selectedReclamo.description}</p>
                                <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-crm-fg-subtle">
                                    <span>Creado por: {getUserDisplayName(selectedReclamo.createdBy, 'Sin dato')}</span>
                                    <span>•</span>
                                    <span>{new Date(selectedReclamo.createdAt).toLocaleString()}</span>
                                    {selectedReclamo.assignedTo && (
                                        <>
                                            <span>•</span>
                                            <span className="text-crm-red">Asignado a: {getUserDisplayName(selectedReclamo.assignedTo)}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Timeline de Notas */}
                            {selectedReclamo.notes && selectedReclamo.notes.length > 0 && (
                                <div className="space-y-3 bg-crm-bg border border-crm-border rounded-xl p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-2">Historial y Notas</h4>
                                    <div className="space-y-2">
                                        {selectedReclamo.notes.map((note, i) => (
                                            <div key={i} className="bg-crm-surface border border-crm-border rounded-lg p-3">
                                                <p className="text-sm text-crm-fg mb-1 whitespace-pre-wrap">{note.text}</p>
                                                <div className="text-[10px] text-crm-fg-subtle font-bold">
                                                    {getUserDisplayName(note.author, 'Sistema')} - {new Date(note.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Panel Admin / Edición */}
                            {canWrite && selectedReclamo.status !== 'closed' ? (
                                <form onSubmit={handleUpdate} className="border-t border-crm-border pt-4 space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Actualizar Estado</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold mb-1">Estado</label>
                                            <select className="w-full h-11 rounded-xl border border-crm-border bg-crm-bg px-4 text-sm text-crm-fg outline-none focus:border-crm-red"
                                                value={statusUpdate} onChange={e => setStatusUpdate(e.target.value)}>
                                                <option value="open">Abierto</option>
                                                <option value="in_progress">En Curso</option>
                                                <option value="closed">Cerrado / Resuelto</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold mb-1">Prioridad</label>
                                            <select className="w-full h-11 rounded-xl border border-crm-border bg-crm-bg px-4 text-sm text-crm-fg outline-none focus:border-crm-red"
                                                value={priorityUpdate} onChange={e => setPriorityUpdate(e.target.value)}>
                                                <option value="low">Baja</option>
                                                <option value="medium">Media</option>
                                                <option value="high">Alta</option>
                                                <option value="urgent">Urgente</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Añadir Nota / Actualización</label>
                                        <textarea className="w-full rounded-xl border border-crm-border bg-crm-bg p-4 text-sm text-crm-fg outline-none focus:border-crm-red resize-none"
                                            rows={2}
                                            value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Escribe un avance o nota interna..." />
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button type="submit" disabled={statusUpdate === selectedReclamo.status && priorityUpdate === selectedReclamo.priority && !newNote} className="rounded-xl bg-crm-red-gradient px-6 py-2 text-sm font-black text-white shadow-sm disabled:opacity-50">
                                            Guardar Cambios
                                        </button>
                                    </div>
                                </form>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
            </div>
        </PermissionGuard>
    );
}
