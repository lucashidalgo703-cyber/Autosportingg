"use client";
import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Car, User, DollarSign, Calendar } from 'lucide-react';
import { usePedidos } from '../../../hooks/usePedidos';
import CrmButton from '../../../components/crm/ui/CrmButton';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';
import PedidosTable from '../../../components/crm/pedidos/PedidosTable';
import PedidosMobileCards from '../../../components/crm/pedidos/PedidosMobileCards';
import PedidoCreateModal from '../../../components/crm/pedidos/PedidoCreateModal';

const TABS = [
    { id: 'activos', label: 'Activos (Pendiente / Buscando)' },
    { id: 'completados', label: 'Completados' },
    { id: 'cancelados', label: 'Cancelados' },
    { id: 'todos', label: 'Todos' }
];

export default function PedidosPage() {
    const { pedidos, loading, error, fetchPedidos, createPedido, updatePedido, deletePedido } = usePedidos();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('activos');
    const [filterAssigned, setFilterAssigned] = useState('todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPedido, setEditingPedido] = useState(null);
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, id: null });

    useEffect(() => {
        fetchPedidos();
    }, [fetchPedidos]);

    const filteredPedidos = pedidos.filter(p => {
        const matchesSearch = p.clientName?.toLowerCase().includes(search.toLowerCase()) || 
                              p.requestedBrand?.toLowerCase().includes(search.toLowerCase()) ||
                              p.requestedModel?.toLowerCase().includes(search.toLowerCase());
        
        let matchesTab = true;
        if (activeTab === 'activos') matchesTab = p.status === 'Pendiente' || p.status === 'Buscando';
        if (activeTab === 'completados') matchesTab = p.status === 'Cumplido';
        if (activeTab === 'cancelados') matchesTab = p.status === 'Cancelado';
        
        let matchesAssigned = true;
        if (filterAssigned !== 'todos') {
            matchesAssigned = p.assignedTo?._id === filterAssigned || p.assignedTo === filterAssigned;
        }

        return matchesSearch && matchesTab && matchesAssigned;
    });

    // Extract unique sellers from data for the filter
    const sellers = Array.from(new Set(pedidos.map(p => p.assignedTo?._id).filter(Boolean)))
        .map(id => pedidos.find(p => p.assignedTo?._id === id).assignedTo);

    const handleOpenModal = (pedido = null) => {
        setEditingPedido(pedido);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPedido(null);
    };

    const handleDelete = (id) => {
        setConfirmDeleteModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = confirmDeleteModal.id;
        if (!id) return;
        try {
            await deletePedido(id);
            fetchPedidos();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const getStatusColor = (status) => {
        // preserved logic moved to components, keeping here just in case though not used directly in page anymore
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 pb-24 md:p-6">
            <div className="flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Pedidos <span className="text-xl">🔍</span></h1>
                    <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                        Búsqueda activa de vehículos a pedido de clientes.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <select
                            value={filterAssigned}
                            onChange={(e) => setFilterAssigned(e.target.value)}
                            className="h-9 rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none"
                        >
                            <option value="todos">Todos los vendedores</option>
                            {sellers.map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar pedido..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-64 rounded-lg border border-crm-border bg-crm-surface pl-9 pr-3 text-sm text-crm-fg placeholder-crm-fg-muted focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red"
                        />
                    </div>
                    <CrmButton variant="primary" size="sm" onClick={() => handleOpenModal()} className="h-9 shadow-[0_0_28px_rgba(239,51,41,0.45)]">
                        <Plus size={14} />
                        Nuevo pedido
                    </CrmButton>
                </div>
            </div>

            <div className="flex space-x-1 border-b border-crm-border mt-2">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-semibold transition-colors relative ${activeTab === tab.id ? 'text-white' : 'text-crm-fg-muted hover:text-white'}`}
                    >
                        {tab.label}
                        {activeTab === tab.id && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-crm-red" />}
                    </button>
                ))}
            </div>

            {error && (
                <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    {error}
                </div>
            )}

            {loading && pedidos.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                </div>
            ) : (
                <>
                    <div className="hidden lg:block">
                        <PedidosTable data={filteredPedidos} onEdit={handleOpenModal} onDelete={handleDelete} />
                    </div>
                    <div className="block lg:hidden">
                        <PedidosMobileCards data={filteredPedidos} onEdit={handleOpenModal} onDelete={handleDelete} />
                    </div>
                </>
            )}

            <PedidoCreateModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                editingPedido={editingPedido}
                onSaved={fetchPedidos}
            />

            <ConfirmModal
                isOpen={confirmDeleteModal.isOpen}
                onClose={() => setConfirmDeleteModal({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Eliminar Pedido"
                message="¿Seguro que deseas eliminar este pedido? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                isDestructive={true}
            />
        </div>
    );
}
