"use client";

import React, { useEffect, useState } from 'react';
import { Lightbulb, Plus, MessageSquare, Tag, AlertCircle, Paperclip, FileText, Image, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { PERMISSIONS, hasPermission } from '../../../utils/adminPermissions';
import toast from 'react-hot-toast';

export default function SugerenciasPage() {
    const { user } = useAuth();
    const canManage = hasPermission(user, PERMISSIONS.SUGGESTIONS_MANAGE);

    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, completed
    const [viewMode, setViewMode] = useState('list'); // list, grouped

    // Form state
    const [newSug, setNewSug] = useState({ title: '', description: '', category: 'nueva_funcionalidad', priority: 'low' });
    const [attachments, setAttachments] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal
    const [selectedSug, setSelectedSug] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [statusUpdate, setStatusUpdate] = useState('');

    const fetchSuggestions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/suggestions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error cargando sugerencias');
            const data = await res.json();
            setSuggestions(data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuggestions();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (attachments.length > 5) throw new Error('Máximo 5 archivos permitidos.');
            const totalSize = attachments.reduce((acc, f) => acc + f.size, 0);
            if (totalSize > 15 * 1024 * 1024) throw new Error('El tamaño total excede los 15MB.');

            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('title', newSug.title);
            formData.append('description', newSug.description);
            formData.append('category', newSug.category);
            formData.append('priority', newSug.priority);
            attachments.forEach(file => formData.append('attachments', file));

            const res = await fetch(`/api/admin/suggestions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // FormData handled automatically
                body: formData
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al enviar sugerencia');
            }
            toast.success('Sugerencia registrada con éxito');
            setNewSug({ title: '', description: '', category: 'nueva_funcionalidad', priority: 'low' });
            setAttachments([]);
            fetchSuggestions();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const body = {};
            if (statusUpdate && statusUpdate !== selectedSug.status) body.status = statusUpdate;
            if (commentText) body.commentText = commentText;

            if (Object.keys(body).length === 0) return;

            const res = await fetch(`/api/admin/suggestions/${selectedSug._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Error actualizando');
            toast.success('Actualizado correctamente');
            setSelectedSug(null);
            setCommentText('');
            setStatusUpdate('');
            fetchSuggestions();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const openManageModal = (sug) => {
        setSelectedSug(sug);
        setStatusUpdate(sug.status);
        setCommentText('');
    };

    const filteredSuggestions = suggestions.filter(s => {
        const isPending = s.status === 'nueva' || s.status === 'evaluando' || s.status === 'planificada' || s.status === 'pendiente' || s.status === 'en_revision' || s.status === 'en_progreso';
        if (filter === 'pending') return isPending;
        if (filter === 'completed') return !isPending;
        return true;
    });

    const getStatusLabel = (status) => {
        const labels = {
            nueva: 'Pendiente', evaluando: 'En revisión', planificada: 'En progreso', implementada: 'Implementado', implementado: 'Implementado', rechazada: 'No aplicable',
            pendiente: 'Pendiente', en_revision: 'En revisión', en_progreso: 'En progreso', no_aplicable: 'No aplicable'
        };
        return labels[status] || status;
    };

    const getCategoryLabel = (category) => {
        const labels = {
            UI: 'Diseño/UI', Funcionalidad: 'Nueva funcionalidad', Error: 'Error/Bug', Otro: 'Otro',
            diseno_ui: 'Diseño/UI', nueva_funcionalidad: 'Nueva funcionalidad', error_bug: 'Error/Bug', mejora_existente: 'Mejora existente', otro: 'Otro'
        };
        return labels[category] || category;
    };

    const getStatusBadge = (status) => {
        const styles = {
            nueva: 'bg-blue-500/10 text-blue-600',
            evaluando: 'bg-purple-500/10 text-purple-600',
            planificada: 'bg-yellow-500/10 text-yellow-600',
            implementada: 'bg-green-500/10 text-green-600',
            implementado: 'bg-green-500/10 text-green-600',
            rechazada: 'bg-red-500/10 text-red-600',
            pendiente: 'bg-blue-500/10 text-blue-600',
            en_revision: 'bg-purple-500/10 text-purple-600',
            en_progreso: 'bg-yellow-500/10 text-yellow-600',
            no_aplicable: 'bg-gray-500/10 text-gray-600'
        };
        return <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${styles[status] || 'bg-gray-500/10 text-gray-600'}`}>{getStatusLabel(status)}</span>;
    };

    const getPriorityBadge = (prio) => {
        const icons = {
            low: <span className="text-gray-400">Baja</span>,
            medium: <span className="text-yellow-500">Media</span>,
            high: <span className="text-crm-red">Alta</span>
        };
        return <div className="text-xs font-bold flex items-center gap-1">Prioridad {icons[prio]}</div>;
    };

    const groupedByUser = filteredSuggestions.reduce((acc, sug) => {
        const authorName = sug.author?.name || sug.author?.email || 'Desconocido';
        if (!acc[authorName]) acc[authorName] = [];
        acc[authorName].push(sug);
        return acc;
    }, {});

    return (
        <div className="flex h-[calc(100vh-64px)] w-full flex-col bg-crm-bg p-4 md:p-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-crm-fg flex items-center gap-2">
                            <Lightbulb className="text-yellow-500" /> Tablero de Sugerencias
                        </h1>
                        <p className="text-sm text-crm-fg-muted mt-1">Comparte tus ideas para mejorar la plataforma.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Formulario Lateral */}
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-5 shadow-sm h-fit">
                        <h2 className="text-lg font-black text-crm-fg mb-4">Añadir Sugerencia</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Título corto y descriptivo</label>
                                <input required className="w-full h-11 rounded-xl border border-crm-border bg-crm-bg px-4 text-sm text-crm-fg outline-none focus:border-crm-red transition-colors"
                                    value={newSug.title} onChange={e => setNewSug({...newSug, title: e.target.value})} placeholder="Ej: Mejorar buscador de clientes..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Categoría</label>
                                <select className="w-full h-11 rounded-xl border border-crm-border bg-crm-bg px-4 text-sm text-crm-fg outline-none transition-colors"
                                    value={newSug.category} onChange={e => setNewSug({...newSug, category: e.target.value})}>
                                    <option value="diseno_ui">Diseño/UI</option>
                                    <option value="nueva_funcionalidad">Nueva funcionalidad</option>
                                    <option value="error_bug">Error/Bug</option>
                                    <option value="mejora_existente">Mejora existente</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Prioridad</label>
                                <select className="w-full h-11 rounded-xl border border-crm-border bg-crm-bg px-4 text-sm text-crm-fg outline-none transition-colors"
                                    value={newSug.priority} onChange={e => setNewSug({...newSug, priority: e.target.value})}>
                                    <option value="low">Baja (Deseable)</option>
                                    <option value="medium">Media (Útil)</option>
                                    <option value="high">Alta (Urgente)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Detalles / Explicación</label>
                                <textarea required rows={4} className="w-full rounded-xl border border-crm-border bg-crm-bg p-4 text-sm text-crm-fg outline-none focus:border-crm-red resize-none transition-colors"
                                    value={newSug.description} onChange={e => setNewSug({...newSug, description: e.target.value})} placeholder="Cuéntanos más..."></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5 flex justify-between">
                                    <span>Adjuntos <span className="opacity-70">(Opcional)</span></span>
                                    <span className="text-[10px] opacity-70">Max 5 archivos, 15MB total</span>
                                </label>
                                
                                <input 
                                    type="file" 
                                    multiple 
                                    accept=".png,.jpg,.jpeg,.webp,.pdf"
                                    className="hidden"
                                    id="sug-attachments"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files);
                                        const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
                                        if (files.length > validFiles.length) toast.error('Algunos archivos exceden los 5MB y fueron omitidos.');
                                        
                                        setAttachments(prev => {
                                            const newArr = [...prev, ...validFiles];
                                            if (newArr.length > 5) {
                                                toast.error('Solo se permiten 5 archivos máximo.');
                                                return newArr.slice(0, 5);
                                            }
                                            return newArr;
                                        });
                                        e.target.value = null; // reset
                                    }}
                                />
                                
                                {attachments.length > 0 && (
                                    <div className="mb-2 space-y-2">
                                        {attachments.map((f, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-crm-surface border border-crm-border text-xs">
                                                <div className="flex items-center gap-2 truncate">
                                                    {f.type.includes('pdf') ? <FileText size={14} className="text-red-400 flex-shrink-0" /> : <Image size={14} className="text-blue-400 flex-shrink-0" />}
                                                    <span className="truncate max-w-[150px]" title={f.name}>{f.name}</span>
                                                    <span className="text-crm-fg-subtle">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                                                </div>
                                                <button type="button" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="text-crm-fg-muted hover:text-crm-red transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {attachments.length < 5 && (
                                    <label htmlFor="sug-attachments" className="w-full rounded-xl border border-dashed border-crm-border bg-crm-bg p-4 text-center cursor-pointer hover:bg-crm-surface transition-colors flex flex-col items-center">
                                        <Paperclip className="text-crm-fg-muted mb-2" size={20} />
                                        <p className="text-sm font-medium text-crm-fg-muted">Haz clic para seleccionar archivos</p>
                                        <p className="text-[10px] text-crm-fg-subtle">PNG, JPG, WEBP, PDF permitidos</p>
                                    </label>
                                )}
                            </div>
                            <button disabled={isSubmitting} type="submit" className="w-full rounded-xl bg-crm-red-gradient px-6 py-3 text-sm font-black text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                                {isSubmitting ? 'Enviando...' : 'Enviar Sugerencia'}
                            </button>
                        </form>
                    </div>

                    {/* Lista Principal */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-crm-surface border border-crm-border rounded-xl p-2">
                            <div className="flex gap-1 bg-crm-bg p-1 rounded-lg">
                                {['all', 'pending', 'completed'].map(f => (
                                    <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filter === f ? 'bg-crm-surface text-crm-fg shadow-sm' : 'text-crm-fg-muted hover:text-crm-fg'}`}>
                                        {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Cerradas'}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-1 bg-crm-bg p-1 rounded-lg">
                                <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'list' ? 'bg-crm-surface text-crm-fg shadow-sm' : 'text-crm-fg-muted hover:text-crm-fg'}`}>
                                    Lista
                                </button>
                                <button onClick={() => setViewMode('grouped')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'grouped' ? 'bg-crm-surface text-crm-fg shadow-sm' : 'text-crm-fg-muted hover:text-crm-fg'}`}>
                                    Por Usuario
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center p-12 text-crm-fg-muted">Cargando...</div>
                        ) : filteredSuggestions.length === 0 ? (
                            <div className="text-center p-12 bg-crm-surface border border-crm-border rounded-2xl shadow-sm">
                                <Lightbulb size={48} className="mx-auto text-crm-border mb-4" />
                                <p className="text-crm-fg font-bold">No hay sugerencias en esta vista.</p>
                            </div>
                        ) : viewMode === 'list' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredSuggestions.map(sug => (
                                    <div key={sug._id} className="bg-crm-surface border border-crm-border rounded-2xl p-5 shadow-sm flex flex-col cursor-pointer hover:border-crm-red/30 transition-colors" onClick={() => openManageModal(sug)}>
                                        <div className="flex justify-between items-start mb-3">
                                            {getStatusBadge(sug.status)}
                                            {getPriorityBadge(sug.priority)}
                                        </div>
                                        <h3 className="font-black text-crm-fg text-base mb-2">{sug.title}</h3>
                                        <p className="text-sm text-crm-fg-muted line-clamp-2 mb-4 flex-1">{sug.description}</p>
                                        
                                        <div className="flex items-center justify-between text-xs text-crm-fg-subtle pt-3 border-t border-crm-border">
                                            <div className="flex items-center gap-1 font-medium">
                                                <Tag size={12} /> {getCategoryLabel(sug.category)}
                                            </div>
                                            <div className="flex items-center gap-1 font-medium">
                                                <MessageSquare size={12} /> {sug.comments.length}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(groupedByUser).map(([user, sugs]) => (
                                    <div key={user} className="bg-crm-surface border border-crm-border rounded-2xl overflow-hidden">
                                        <div className="bg-crm-bg/50 border-b border-crm-border px-5 py-3 font-bold text-sm text-crm-fg">
                                            {user} ({sugs.length})
                                        </div>
                                        <div className="p-4 grid grid-cols-1 gap-3">
                                            {sugs.map(sug => (
                                                <div key={sug._id} className="border border-crm-border rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-crm-red/30 cursor-pointer transition-colors" onClick={() => openManageModal(sug)}>
                                                    <div>
                                                        <h4 className="font-bold text-crm-fg text-sm mb-1">{sug.title}</h4>
                                                        <div className="flex items-center gap-2 text-[10px] text-crm-fg-subtle">
                                                            <span>{getCategoryLabel(sug.category)}</span>
                                                            <span>•</span>
                                                            <span>{new Date(sug.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    {getStatusBadge(sug.status)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Ver / Gestionar Modal */}
            {selectedSug && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-crm-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between border-b border-crm-border px-6 py-4 bg-crm-bg/50">
                            <h3 className="text-lg font-black text-crm-fg flex items-center gap-3">
                                {getStatusBadge(selectedSug.status)} Detalle de Sugerencia
                            </h3>
                            <button onClick={() => setSelectedSug(null)} className="text-crm-fg-muted hover:text-crm-fg">✕</button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-crm-fg mb-2">{selectedSug.title}</h2>
                                <p className="text-sm text-crm-fg-muted whitespace-pre-wrap">{selectedSug.description}</p>
                                <div className="mt-4 flex items-center gap-4 text-xs font-bold text-crm-fg-subtle border-b border-crm-border pb-4">
                                    <span>Autor: {selectedSug.author?.name || selectedSug.author?.email || 'Sistema'}</span>
                                    <span>•</span>
                                    <span>{new Date(selectedSug.createdAt).toLocaleDateString()}</span>
                                </div>
                                
                                {selectedSug.attachments && selectedSug.attachments.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-2 flex items-center gap-2">
                                            <Paperclip size={14} /> Archivos Adjuntos ({selectedSug.attachments.length})
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedSug.attachments.map((att, i) => (
                                                <a 
                                                    key={i} 
                                                    href={att.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="flex items-center gap-2 p-2 pr-3 rounded-lg bg-crm-bg border border-crm-border text-xs font-medium hover:border-crm-red/50 transition-colors"
                                                >
                                                    {att.contentType?.includes('pdf') ? <FileText size={14} className="text-red-400" /> : <Image size={14} className="text-blue-400" />}
                                                    <span className="truncate max-w-[150px]">{att.name}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Comentarios */}
                            {selectedSug.comments.length > 0 && (
                                <div className="space-y-3 bg-crm-bg border border-crm-border rounded-xl p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-2">Comentarios Oficiales</h4>
                                    {selectedSug.comments.map((c, i) => (
                                        <div key={i} className="bg-crm-surface border border-crm-border rounded-lg p-3">
                                            <p className="text-sm text-crm-fg mb-1">{c.text}</p>
                                            <div className="text-[10px] text-crm-fg-subtle font-bold">
                                                {c.author?.name || c.author?.email || 'Admin'} - {new Date(c.date).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Panel Admin */}
                            {canManage ? (
                                <form onSubmit={handleUpdate} className="border-t border-crm-border pt-4 space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted flex items-center gap-2">
                                        <AlertCircle size={14}/> Acciones de Administración
                                    </h4>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold mb-1">Actualizar Estado</label>
                                            <select className="w-full h-11 rounded-xl border border-crm-border bg-crm-bg px-4 text-sm text-crm-fg outline-none"
                                                value={statusUpdate} onChange={e => setStatusUpdate(e.target.value)}>
                                                <option value="pendiente">Pendiente</option>
                                                <option value="en_revision">En revisión</option>
                                                <option value="en_progreso">En progreso</option>
                                                <option value="implementado">Implementado</option>
                                                <option value="no_aplicable">No aplicable</option>
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold mb-1">Añadir Comentario</label>
                                            <input className="w-full h-11 rounded-xl border border-crm-border bg-crm-bg px-4 text-sm text-crm-fg outline-none"
                                                value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Opcional..." />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button type="submit" disabled={statusUpdate === selectedSug.status && !commentText} className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-black text-white shadow-sm disabled:opacity-50">
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
    );
}
