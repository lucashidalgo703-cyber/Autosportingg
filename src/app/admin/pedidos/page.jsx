"use client";
import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Car, User, DollarSign, Calendar } from 'lucide-react';
import { usePedidos } from '../../../hooks/usePedidos';
import CrmButton from '../../../components/crm/ui/CrmButton';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';
import PedidosTable from '../../../components/crm/pedidos/PedidosTable';
import PedidosMobileCards from '../../../components/crm/pedidos/PedidosMobileCards';

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
    const [formData, setFormData] = useState({
        clientName: '', clientPhone: '', requestedBrand: '', requestedModel: '',
        yearRange: '', budget: '', currency: 'ARS', status: 'Pendiente', notes: '',
        nextActionDate: ''
    });
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, id: null });

    useEffect(() => {
        fetchPedidos();
    }, [fetchPedidos]);

    const filteredPedidos = pedidos.filter(p => {
        const matchesSearch = p.clientName?.toLowerCase().includes(search.toLowerCase()) || 
                              p.requestedBrand?.toLowerCase().includes(search.toLowerCase()) ||
                              p.requestedModel?.toLowerCase().includes(search.toLowerCase());
        
        let matchesTab = true;
        if (activeTab === 'activos') matchesTab = p.status === 'Pendiente' || p.status === 'Buscando' || p.status === 'Encontrado';
        if (activeTab === 'completados') matchesTab = p.status === 'Completado';
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
        if (pedido) {
            setEditingPedido(pedido);
            setFormData({ 
                clientName: pedido.clientName, clientPhone: pedido.clientPhone, 
                requestedBrand: pedido.requestedBrand, requestedModel: pedido.requestedModel,
                yearRange: pedido.yearRange || '', budget: pedido.budget || '', 
                currency: pedido.currency || 'ARS', status: pedido.status || 'Pendiente', 
                notes: pedido.notes || '',
                nextActionDate: pedido.nextActionDate ? new Date(pedido.nextActionDate).toISOString().slice(0, 10) : ''
            });
        } else {
            setEditingPedido(null);
            setFormData({ 
                clientName: '', clientPhone: '', requestedBrand: '', requestedModel: '',
                yearRange: '', budget: '', currency: 'ARS', status: 'Pendiente', notes: '',
                nextActionDate: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPedido(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingPedido) {
                await updatePedido(editingPedido._id, formData);
            } else {
                await createPedido(formData);
            }
            handleCloseModal();
            fetchPedidos();
        } catch (err) {
            toast.error(err.message);
        }
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

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl rounded-2xl border border-crm-border bg-crm-surface shadow-2xl my-auto">
                        <div className="flex items-center justify-between border-b border-crm-border px-6 py-4 sticky top-0 bg-crm-surface z-10 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-white">{editingPedido ? 'Editar Pedido' : 'Nuevo Pedido'}</h2>
                            <button type="button" onClick={handleCloseModal} className="text-crm-fg-muted hover:text-white text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-crm-red border-b border-crm-border/50 pb-2 uppercase tracking-wider">Datos del Cliente</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Nombre del Cliente *</label>
                                        <input required type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Teléfono / WhatsApp *</label>
                                        <input required type="text" value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-crm-red border-b border-crm-border/50 pb-2 uppercase tracking-wider">Vehículo Buscado</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Marca *</label>
                                        <input required type="text" placeholder="Ej: Volkswagen" value={formData.requestedBrand} onChange={e => setFormData({...formData, requestedBrand: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Modelo *</label>
                                        <input required type="text" placeholder="Ej: Amarok V6" value={formData.requestedModel} onChange={e => setFormData({...formData, requestedModel: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Rango de Años</label>
                                        <input type="text" placeholder="Ej: 2018 - 2022" value={formData.yearRange} onChange={e => setFormData({...formData, yearRange: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-1/3">
                                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Moneda</label>
                                            <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                                <option value="ARS">ARS</option>
                                                <option value="USD">USD</option>
                                            </select>
                                        </div>
                                        <div className="w-2/3">
                                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Presupuesto</label>
                                            <input type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-crm-red border-b border-crm-border/50 pb-2 uppercase tracking-wider">Estado y Observaciones</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Estado del Pedido</label>
                                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-white font-bold focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="Buscando">Buscando</option>
                                            <option value="Encontrado">Encontrado</option>
                                            <option value="Cancelado">Cancelado</option>
                                            <option value="Completado">Completado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Notas Internas</label>
                                        <textarea rows="2" placeholder="Colores preferidos, formas de pago, etc." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red resize-none"></textarea>
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Próxima Acción (Fecha)</label>
                                        <input type="date" value={formData.nextActionDate} onChange={e => setFormData({...formData, nextActionDate: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-crm-border">
                                <CrmButton type="button" variant="secondary" onClick={handleCloseModal}>Cancelar</CrmButton>
                                <CrmButton type="submit" variant="primary">Guardar Pedido</CrmButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
