"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Award, Users, X, RefreshCw, Phone, Mail } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { workshopFetch } from '../../../utils/workshopApiClient';
import CrmModal from '../ui/CrmModal';
import CrmButton from '../ui/CrmButton';
import WorkshopProvidersView from './WorkshopProvidersView';

export default function WorkshopConfigModal({ isOpen, onClose }) {
    const { token } = useAuth();
    const [activeSubTab, setActiveSubTab] = useState('providers');
    const [mechanics, setMechanics] = useState([]);
    const [loadingMechanics, setLoadingMechanics] = useState(false);

    const fetchMechanics = useCallback(async () => {
        if (!token) return;
        setLoadingMechanics(true);
        try {
            const res = await workshopFetch('/api/admin/users/active', { token });
            if (res.ok) {
                const data = await res.json();
                // Filter users that could be mechanics or just list all active admin/responsible users
                setMechanics(data || []);
            }
        } catch (err) {
            console.error('Error fetching mechanics:', err);
        } finally {
            setLoadingMechanics(false);
        }
    }, [token]);

    useEffect(() => {
        if (isOpen && activeSubTab === 'mechanics') {
            fetchMechanics();
        }
    }, [isOpen, activeSubTab, fetchMechanics]);

    if (!isOpen) return null;

    return (
        <CrmModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Settings className="text-crm-fg-muted" size={20} />
                    <div>
                        <h2 className="m-0 text-lg font-bold text-crm-fg tracking-tight">Configuración del Taller</h2>
                        <p className="m-0 text-xs text-crm-fg-muted font-medium">Administra proveedores, mecánicos y parámetros operativos.</p>
                    </div>
                </div>
            }
            maxWidth="max-w-5xl"
            footer={
                <div className="flex justify-end">
                    <CrmButton variant="secondary" onClick={onClose} className="px-5 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised">
                        Cerrar
                    </CrmButton>
                </div>
            }
        >
            <div className="flex flex-col h-[75vh]">
                {/* Sub tabs selector */}
                <div className="flex border-b border-crm-border px-6 bg-crm-surface/50">
                    <button
                        onClick={() => setActiveSubTab('providers')}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-0 border-b-2 bg-transparent transition-colors ${
                            activeSubTab === 'providers'
                                ? 'border-crm-red text-crm-fg'
                                : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                        }`}
                    >
                        <Award size={14} />
                        Proveedores / Talleres
                    </button>
                    <button
                        onClick={() => setActiveSubTab('mechanics')}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-0 border-b-2 bg-transparent transition-colors ${
                            activeSubTab === 'mechanics'
                                ? 'border-crm-red text-crm-fg'
                                : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                        }`}
                    >
                        <Users size={14} />
                        Mecánicos / Personal
                    </button>
                </div>

                {/* Sub Tab Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeSubTab === 'providers' && (
                        <div className="space-y-4">
                            <WorkshopProvidersView />
                        </div>
                    )}

                    {activeSubTab === 'mechanics' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="m-0 text-xs font-black uppercase text-crm-fg-muted tracking-wider">Personal Activo del Taller</h3>
                                <CrmButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={fetchMechanics}
                                    disabled={loadingMechanics}
                                    className="h-8 w-8 !p-0 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised"
                                >
                                    <RefreshCw size={14} className={loadingMechanics ? 'animate-spin text-crm-red' : 'text-crm-fg-muted'} />
                                </CrmButton>
                            </div>

                            {loadingMechanics ? (
                                <div className="flex h-48 items-center justify-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                                        <span className="text-xs text-crm-fg-muted font-bold">Cargando personal...</span>
                                    </div>
                                </div>
                            ) : mechanics.length === 0 ? (
                                <div className="text-center py-12 text-sm text-crm-fg-muted border border-dashed border-crm-border rounded-xl">
                                    No hay personal activo registrado.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {mechanics.map((m) => (
                                        <div key={m._id} className="bg-crm-surface border border-crm-border rounded-xl p-4 flex flex-col justify-between hover:border-crm-red/20 transition-all shadow-sm">
                                            <div>
                                                <h4 className="text-sm font-bold text-crm-fg m-0">{m.name || 'Sin Nombre'}</h4>
                                                <span className="text-[10px] text-crm-red font-black uppercase tracking-wider block mt-1">{m.role || 'Operario'}</span>
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-crm-border/40 space-y-1.5">
                                                <div className="text-xs text-crm-fg-muted flex items-center gap-2">
                                                    <Mail size={12} className="text-crm-fg-subtle" />
                                                    <span>{m.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </CrmModal>
    );
}
