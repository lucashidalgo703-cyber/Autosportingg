"use client";
import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail, Building2, AlignLeft } from 'lucide-react';
import { useTelefonos } from '../../../hooks/useTelefonos';
import CrmButton from '../../../components/crm/ui/CrmButton';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';

export default function TelefonosPage() {
    const { telefonos, loading, error, fetchTelefonos, createTelefono, updateTelefono, deleteTelefono } = useTelefonos();
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [formData, setFormData] = useState({ name: '', category: 'Otro', phone: '', email: '', notes: '' });
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

    useEffect(() => {
        fetchTelefonos();
    }, [fetchTelefonos]);

    const filteredTelefonos = telefonos.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase()) || 
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        t.phone.toLowerCase().includes(search.toLowerCase())
    );

    const handleOpenModal = (contact = null) => {
        if (contact) {
            setEditingContact(contact);
            setFormData({ name: contact.name, category: contact.category, phone: contact.phone, email: contact.email || '', notes: contact.notes || '' });
        } else {
            setEditingContact(null);
            setFormData({ name: '', category: 'Otro', phone: '', email: '', notes: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingContact(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingContact) {
                await updateTelefono(editingContact._id, formData);
            } else {
                await createTelefono(formData);
            }
            handleCloseModal();
            fetchTelefonos();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDeleteClick = (id) => {
        setConfirmDelete({ isOpen: true, id });
    };

    const confirmDeletion = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteTelefono(confirmDelete.id);
            fetchTelefonos();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setConfirmDelete({ isOpen: false, id: null });
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 pb-24 md:p-6">
            <div className="flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Teléfonos Útiles <span className="text-xl">☎️</span></h1>
                    <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                        Directorio de contactos clave: Gestoría, Seguros, Talleres y más.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar teléfono..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-64 rounded-lg border border-crm-border bg-crm-surface pl-9 pr-3 text-sm text-crm-fg placeholder-crm-fg-muted focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red"
                        />
                    </div>
                    <CrmButton variant="primary" size="sm" onClick={() => handleOpenModal()} className="h-9 shadow-[0_0_28px_rgba(239,51,41,0.45)]">
                        <Plus size={14} />
                        Nuevo teléfono
                    </CrmButton>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    {error}
                </div>
            )}

            {loading && telefonos.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTelefonos.map(contact => (
                        <div key={contact._id} className="flex flex-col rounded-xl border border-crm-border bg-crm-surface p-5 transition-all hover:border-crm-red/50">
                            <div className="mb-4 flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-crm-fg">{contact.name}</h3>
                                    <span className="mt-1 inline-block rounded bg-crm-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted border border-crm-border">
                                        {contact.category}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(contact)} className="text-crm-fg-muted hover:text-crm-fg transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteClick(contact._id)} className="text-crm-fg-muted hover:text-crm-red transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-3 text-sm text-crm-fg-muted">
                                <div className="flex items-center gap-3">
                                    <Phone size={16} className="text-crm-fg opacity-70" />
                                    <a href={`tel:${contact.phone}`} className="hover:text-crm-red transition-colors font-medium text-crm-fg">{contact.phone}</a>
                                </div>
                                {contact.email && (
                                    <div className="flex items-center gap-3">
                                        <Mail size={16} className="text-crm-fg opacity-70" />
                                        <a href={`mailto:${contact.email}`} className="hover:text-crm-red transition-colors">{contact.email}</a>
                                    </div>
                                )}
                                {contact.notes && (
                                    <div className="flex items-start gap-3 mt-1 pt-3 border-t border-crm-border/50">
                                        <AlignLeft size={16} className="text-crm-fg opacity-70 mt-0.5 shrink-0" />
                                        <p className="text-xs leading-relaxed italic">{contact.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredTelefonos.length === 0 && (
                        <div className="col-span-full py-12 text-center text-crm-fg-muted">
                            No se encontraron contactos.
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface shadow-2xl">
                        <div className="flex items-center justify-between border-b border-crm-border px-6 py-4">
                            <h2 className="text-lg font-bold text-crm-fg">{editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}</h2>
                            <button onClick={handleCloseModal} className="text-crm-fg-muted hover:text-crm-fg text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Nombre completo / Empresa *</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Teléfono *</label>
                                        <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Categoría</label>
                                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                            <option value="Gestoría">Gestoría</option>
                                            <option value="Seguro">Seguro</option>
                                            <option value="Taller">Taller</option>
                                            <option value="Repuestos">Repuestos</option>
                                            <option value="Grúa">Grúa</option>
                                            <option value="Administración">Administración</option>
                                            <option value="Escribanía">Escribanía</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Email (Opcional)</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Notas adicionales</label>
                                    <textarea rows="3" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red resize-none"></textarea>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <CrmButton type="button" variant="secondary" onClick={handleCloseModal}>Cancelar</CrmButton>
                                <CrmButton type="submit" variant="primary">Guardar Contacto</CrmButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                onConfirm={confirmDeletion}
                title="Eliminar Contacto"
                message="¿Seguro que deseas eliminar este contacto? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                isDestructive={true}
            />
        </div>
    );
}
