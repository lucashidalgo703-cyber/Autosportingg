"use client";
import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Car, User, DollarSign, Calendar } from 'lucide-react';
import { usePedidos } from '../../../hooks/usePedidos';
import CrmButton from '../../../components/crm/ui/CrmButton';

export default function PedidosPage() {
    const { pedidos, loading, error, fetchPedidos, createPedido, updatePedido, deletePedido } = usePedidos();
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPedido, setEditingPedido] = useState(null);
    const [formData, setFormData] = useState({
        clientName: '', clientPhone: '', requestedBrand: '', requestedModel: '',
        yearRange: '', budget: '', currency: 'ARS', status: 'Pendiente', notes: ''
    });

    useEffect(() => {
        fetchPedidos();
    }, [fetchPedidos]);

    const filteredPedidos = pedidos.filter(p => 
        p.clientName?.toLowerCase().includes(search.toLowerCase()) || 
        p.requestedBrand?.toLowerCase().includes(search.toLowerCase()) ||
        p.requestedModel?.toLowerCase().includes(search.toLowerCase())
    );

    const handleOpenModal = (pedido = null) => {
        if (pedido) {
            setEditingPedido(pedido);
            setFormData({ 
                clientName: pedido.clientName, clientPhone: pedido.clientPhone, 
                requestedBrand: pedido.requestedBrand, requestedModel: pedido.requestedModel,
                yearRange: pedido.yearRange || '', budget: pedido.budget || '', 
                currency: pedido.currency || 'ARS', status: pedido.status || 'Pendiente', 
                notes: pedido.notes || '' 
            });
        } else {
            setEditingPedido(null);
            setFormData({ 
                clientName: '', clientPhone: '', requestedBrand: '', requestedModel: '',
                yearRange: '', budget: '', currency: 'ARS', status: 'Pendiente', notes: '' 
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
            alert(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Seguro que deseas eliminar este pedido?')) {
            try {
                await deletePedido(id);
                fetchPedidos();
            } catch (err) {
                alert(err.message);
            }
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pendiente': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
            case 'Buscando': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            case 'Encontrado': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'Cancelado': return 'text-red-400 border-red-400/30 bg-red-400/10';
            case 'Completado': return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
            default: return 'text-crm-fg-muted border-crm-border bg-crm-bg';
        }
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
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {filteredPedidos.map(pedido => (
                        <div key={pedido._id} className="flex flex-col rounded-xl border border-crm-border bg-crm-surface p-5 transition-all hover:border-crm-red/50">
                            <div className="mb-4 flex items-start justify-between border-b border-crm-border pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crm-bg border border-crm-border">
                                        <Car size={20} className="text-crm-fg-muted" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white leading-tight">
                                            {pedido.requestedBrand} {pedido.requestedModel}
                                        </h3>
                                        <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(pedido.status)}`}>
                                            {pedido.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(pedido)} className="text-crm-fg-muted hover:text-crm-fg transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(pedido._id)} className="text-crm-fg-muted hover:text-crm-red transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-y-3 text-sm text-crm-fg-muted">
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-crm-fg opacity-70" />
                                    <span className="font-medium text-crm-fg">{pedido.clientName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs">📱</span>
                                    <a href={`https://wa.me/${pedido.clientPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:text-crm-red transition-colors">{pedido.clientPhone}</a>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-crm-fg opacity-70" />
                                    <span>Años: {pedido.yearRange || 'Cualquiera'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DollarSign size={14} className="text-crm-fg opacity-70" />
                                    <span className="font-medium text-crm-fg">{pedido.currency} {pedido.budget?.toLocaleString('es-AR') || 'Sin límite'}</span>
                                </div>
                            </div>

                            {pedido.notes && (
                                <div className="mt-4 rounded-lg bg-crm-bg p-3 text-xs italic text-crm-fg-muted border border-crm-border/50">
                                    {pedido.notes}
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredPedidos.length === 0 && (
                        <div className="col-span-full py-12 text-center text-crm-fg-muted">
                            No se encontraron pedidos activos.
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
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
        </div>
    );
}
