"use client";
import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Link2, CheckCircle } from 'lucide-react';
import CrmModal from '../ui/CrmModal';
import toast from 'react-hot-toast';

export default function MLActionModal({ isOpen, onClose, vehicle, onSave }) {
    const [published, setPublished] = useState(false);
    const [mlLink, setMlLink] = useState('');
    const [publishedBy, setPublishedBy] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && vehicle) {
            setPublished(vehicle._original?.publishedOnML === 'Si');
            setMlLink(vehicle._original?.mlLink || '');
            setPublishedBy(vehicle._original?.publishedBy || '');
        }
    }, [isOpen, vehicle]);

    if (!isOpen || !vehicle) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/cars/${vehicle.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    publishedOnML: published ? 'Si' : 'No',
                    mlLink,
                    publishedBy,
                    auditMessage: `Publicación ML actualizada a ${published ? 'Si' : 'No'}`
                })
            });

            if (!res.ok) throw new Error('Error al actualizar Mercado Libre');
            toast.success('Estado en Mercado Libre actualizado');
            onSave();
            onClose();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <CrmModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="text-yellow-500">Mercado Libre</span>
                    </h2>
                    <p className="text-xs text-crm-fg-muted mt-1">Gestionar la publicación de {vehicle.marca} {vehicle.modelo}</p>
                </div>
            }
            maxWidth="max-w-md"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-xs font-medium text-white bg-crm-bg hover:bg-crm-surface-raised transition-colors">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-yellow-600 hover:bg-yellow-500 transition-colors flex items-center gap-2">
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            }
        >
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                    <div>
                        <div className="text-sm font-bold text-yellow-500 mb-1">Estado en ML</div>
                        <div className="text-xs text-crm-fg-muted">¿Este vehículo está publicado en Mercado Libre?</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={published} onChange={e => setPublished(e.target.checked)} />
                        <div className="w-11 h-6 bg-crm-bg rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                </div>

                {published && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div>
                            <label className="text-xs font-bold text-crm-fg-muted mb-2 flex items-center gap-2">
                                <Link2 size={14} /> Link de la publicación
                            </label>
                            <input 
                                type="url" 
                                value={mlLink}
                                onChange={e => setMlLink(e.target.value)}
                                placeholder="https://auto.mercadolibre.com.ar/..."
                                className="w-full bg-crm-bg border border-crm-border rounded-lg p-3 text-sm text-white focus:border-yellow-500 outline-none transition-colors"
                            />
                            {mlLink && (
                                <a href={mlLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-yellow-500 hover:text-yellow-400">
                                    <ExternalLink size={12} /> Abrir publicación actual
                                </a>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-crm-fg-muted mb-2 block">Publicado por</label>
                            <input 
                                type="text" 
                                value={publishedBy}
                                onChange={e => setPublishedBy(e.target.value)}
                                placeholder="Responsable de la publicación..."
                                className="w-full bg-crm-bg border border-crm-border rounded-lg p-3 text-sm text-white focus:border-yellow-500 outline-none transition-colors"
                            />
                        </div>
                    </div>
                )}
            </div>
        </CrmModal>
    );
}
