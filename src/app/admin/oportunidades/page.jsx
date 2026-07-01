"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, MapPin, Calendar, Gauge, Key, MoreVertical, Edit2, Trash2, Phone } from 'lucide-react';
import { useAdminOpportunities } from '../../../hooks/useAdminOpportunities';
import OpportunityModal from '../../../components/crm/opportunities/OpportunityModal';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';

export default function OportunidadesPage() {
    const { user } = useAuth();
    const { opportunities, loading, fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity } = useAdminOpportunities();
    const [activeTab, setActiveTab] = useState('todas');
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, opportunityId: null });

    useEffect(() => {
        fetchOpportunities();
    }, [fetchOpportunities]);

    const handleSave = async (formData) => {
        if (editingOpportunity) {
            await updateOpportunity(editingOpportunity._id, formData);
            toast.success('Oportunidad actualizada');
        } else {
            await createOpportunity(formData);
            toast.success('Oportunidad publicada');
        }
        fetchOpportunities(); // Refresh just in case other fields were computed
    };

    const handleDelete = async () => {
        if (!deleteModal.opportunityId) return;
        try {
            await deleteOpportunity(deleteModal.opportunityId);
            toast.success('Oportunidad eliminada');
        } catch (error) {
            toast.error(error.message || 'Error al eliminar');
        } finally {
            setDeleteModal({ isOpen: false, opportunityId: null });
        }
    };

    const openEditModal = (opp) => {
        setEditingOpportunity(opp);
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingOpportunity(null);
        setIsModalOpen(true);
    };

    const tabs = [
        { id: 'todas', label: 'Todas' },
        { id: 'ofrecen', label: 'Ofrecen' },
        { id: 'buscan', label: 'Buscan' },
        { id: 'permutas', label: 'Permutas' },
        { id: 'mias', label: 'Mías' }
    ];

    const filteredOpportunities = useMemo(() => {
        return opportunities.filter(opp => {
            // Text Search
            const query = searchQuery.toLowerCase();
            const brandMatch = opp.brand?.toLowerCase().includes(query);
            const modelMatch = opp.model?.toLowerCase().includes(query);
            const agencyMatch = opp.agencyName?.toLowerCase().includes(query);
            if (searchQuery && !brandMatch && !modelMatch && !agencyMatch) return false;

            // Tabs
            if (activeTab === 'ofrecen' && opp.type !== 'ofrece') return false;
            if (activeTab === 'buscan' && opp.type !== 'busca') return false;
            if (activeTab === 'permutas' && opp.type !== 'permuta') return false;
            if (activeTab === 'mias' && opp.createdBy !== user?.id && opp.createdBy !== user?.userId) return false;

            return true;
        });
    }, [opportunities, activeTab, searchQuery, user]);

    return (
        <div className="flex h-full flex-col bg-crm-bg overflow-hidden relative">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                <span className="text-crm-red">🤝</span> Oportunidades
                            </h1>
                        </div>
                        <p className="text-sm text-crm-fg-muted font-medium">Autos publicados por todas las agencias de la red.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 rounded-lg bg-crm-red px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600 shadow-lg shadow-crm-red/20 shrink-0"
                    >
                        <Plus size={18} />
                        Publicar
                    </button>
                </div>

                {/* Filtros */}
                <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex bg-crm-surface p-1 rounded-lg w-full md:w-auto overflow-x-auto custom-scrollbar">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-all ${
                                    activeTab === tab.id 
                                    ? 'bg-crm-bg text-white shadow-sm' 
                                    : 'text-crm-fg-muted hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-72 shrink-0">
                        <input
                            type="text"
                            placeholder="Marca, modelo, agencia…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-crm-surface border border-crm-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-crm-fg-muted focus:outline-none focus:border-crm-red transition-colors"
                        />
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-crm-fg-muted" />
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-crm-border border-t-crm-red"></div>
                    </div>
                ) : filteredOpportunities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-crm-surface/50 border border-crm-border border-dashed rounded-xl">
                        <div className="h-16 w-16 mb-4 rounded-full bg-crm-bg flex items-center justify-center text-crm-fg-muted shadow-inner">
                            <Search size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">Sin oportunidades</h3>
                        <p className="text-sm text-crm-fg-muted text-center max-w-sm mb-6">
                            No se encontraron oportunidades que coincidan con los filtros seleccionados.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredOpportunities.map(opp => (
                            <OpportunityCard 
                                key={opp._id} 
                                opp={opp} 
                                onEdit={() => openEditModal(opp)}
                                onDelete={() => setDeleteModal({ isOpen: true, opportunityId: opp._id })}
                                isOwner={opp.createdBy === user?.id || opp.createdBy === user?.userId || user?.role === 'owner'}
                            />
                        ))}
                    </div>
                )}
            </div>

            <OpportunityModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                opportunity={editingOpportunity}
            />

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, opportunityId: null })}
                onConfirm={handleDelete}
                title="Eliminar oportunidad"
                message="¿Estás seguro de que deseas eliminar esta oportunidad? Esta acción no se puede deshacer de forma simple."
                confirmText="Sí, eliminar"
                isDestructive={true}
            />
        </div>
    );
}

function OpportunityCard({ opp, onEdit, onDelete, isOwner }) {
    const typeColors = {
        'ofrece': 'bg-crm-success/10 text-crm-success border-crm-success/20',
        'busca': 'bg-crm-warning/10 text-crm-warning border-crm-warning/20',
        'permuta': 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    };
    const typeColor = typeColors[opp.type] || 'bg-crm-fg-muted/10 text-crm-fg border-crm-border';

    return (
        <div className="bg-crm-surface border border-crm-border rounded-xl p-4 flex flex-col hover:border-crm-fg-muted transition-colors relative group">
            {isOwner && (
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onEdit} className="p-1.5 rounded bg-crm-bg text-crm-fg-muted hover:text-white transition-colors"><Edit2 size={14} /></button>
                    <button onClick={onDelete} className="p-1.5 rounded bg-crm-bg text-crm-red hover:text-white hover:bg-red-900/30 transition-colors"><Trash2 size={14} /></button>
                </div>
            )}
            <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wider ${typeColor}`}>
                    {opp.type}
                </span>
                <span className="text-xs text-crm-fg-muted font-medium ml-auto flex items-center gap-1">
                    <MapPin size={12}/> {opp.agencyName || 'Red Sote'}
                </span>
            </div>

            <h3 className="text-lg font-black text-white leading-tight mb-1">
                {opp.brand} {opp.model}
            </h3>
            <div className="text-sm font-bold text-crm-red mb-3">
                {opp.currency} {opp.price?.toLocaleString()}
            </div>

            <div className="flex items-center gap-3 text-xs text-crm-fg-muted font-medium mb-4 flex-wrap">
                {opp.year && <span className="flex items-center gap-1"><Calendar size={12}/> {opp.year}</span>}
                {opp.mileage !== undefined && <span className="flex items-center gap-1"><Gauge size={12}/> {opp.mileage.toLocaleString()} km</span>}
            </div>

            <div className="mt-auto border-t border-crm-border pt-3">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-crm-bg border border-crm-border flex items-center justify-center text-[10px] font-bold text-crm-fg">
                        {(opp.createdByUsername || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div className="text-xs text-crm-fg-muted font-medium flex-1 truncate">
                        {opp.createdByUsername || 'Agente'}
                    </div>
                </div>
            </div>
        </div>
    );
}
