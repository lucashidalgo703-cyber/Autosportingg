"use client";
import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Headset, Search, Filter, PhoneCall, CheckCircle, AlertOctagon, Star, MessageSquare } from 'lucide-react';
import { useAdminSales } from '../../../hooks/useAdminSales';

export default function PostventaPage() {
    const { sales, loading, error, fetchSales, updateSale } = useAdminSales();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('pendientes'); // pendientes, contactados, conformes, incidencias, cerrados
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchSales();
        fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        .then(res => res.json())
        .then(data => setUsers(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }, [fetchSales]);

    // Filtrar ventas entregadas o listas
    const postventas = sales.filter(sale => 
        sale.status === 'entregada' || sale.deliveryStatus === 'entregado'
    );

    const filteredPostventas = postventas.filter(sale => {
        const query = search.toLowerCase();
        const clientName = ((sale.clientId?.fullName || sale.clientId?.firstName || '').toLowerCase()) || '';
        const carName = `${sale.vehicleId?.brand} ${sale.vehicleId?.name}`.toLowerCase();
        
        let matchesTab = false;
        const status = sale.postSaleStatus || 'pendiente';
        if (activeTab === 'pendientes') matchesTab = status === 'pendiente';
        else if (activeTab === 'contactados') matchesTab = status === 'contactado';
        else if (activeTab === 'conformes') matchesTab = status === 'conforme';
        else if (activeTab === 'incidencias') matchesTab = status === 'incidencia';
        else if (activeTab === 'cerrados') matchesTab = status === 'cerrado';
        
        return matchesTab && (clientName.includes(query) || carName.includes(query));
    });

    const handleUpdateChecklist = async (saleId, field, value) => {
        const sale = sales.find(s => s._id === saleId);
        if (!sale) return;
        
        const updatedChecklist = {
            ...sale.postSaleChecklist,
            [field]: value
        };
        
        try {
            await updateSale(saleId, { postSaleChecklist: updatedChecklist });
        } catch (err) {
            toast.error('Error al actualizar checklist: ' + err.message);
        }
    };

    const handleUpdateStatus = async (saleId, newStatus) => {
        try {
            await updateSale(saleId, { postSaleStatus: newStatus });
        } catch (err) {
            toast.error('Error al actualizar estado: ' + err.message);
        }
    };

    const handleUpdateField = async (saleId, field, value) => {
        try {
            await updateSale(saleId, { [field]: value });
        } catch (err) {
            toast.error(`Error al actualizar ${field}: ` + err.message);
        }
    };

    const handleUpdateNotes = async (saleId, notes) => {
        try {
            await updateSale(saleId, { postSaleNotes: notes });
        } catch (err) {
            toast.error('Error al actualizar notas: ' + err.message);
        }
    };

    const tabs = [
        { id: 'pendientes', label: 'Pendientes', icon: <Headset size={16} /> },
        { id: 'contactados', label: 'Contactados', icon: <PhoneCall size={16} /> },
        { id: 'conformes', label: 'Conformes', icon: <CheckCircle size={16} /> },
        { id: 'incidencias', label: 'Incidencias', icon: <AlertOctagon size={16} /> },
        { id: 'cerrados', label: 'Cerrados', icon: <Star size={16} /> }
    ];

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 pb-24 md:p-6">
            <div className="flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg flex items-center gap-2">
                        <Headset size={28} className="text-crm-red" />
                        Postventa
                    </h1>
                    <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                        Seguimiento y fidelización de clientes con vehículos entregados.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar cliente, vehículo..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-64 rounded-lg border border-crm-border bg-crm-surface pl-9 pr-3 text-sm text-crm-fg placeholder-crm-fg-muted focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red"
                        />
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex space-x-1 rounded-xl bg-crm-surface p-1 border border-crm-border overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all whitespace-nowrap px-4 ${
                            activeTab === tab.id
                                ? 'bg-crm-border text-white shadow-sm'
                                : 'text-crm-fg-muted hover:text-white hover:bg-crm-bg/50'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    {error}
                </div>
            )}

            {loading && sales.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {filteredPostventas.map(sale => (
                        <div key={sale._id} className="flex flex-col rounded-xl border border-crm-border bg-crm-surface p-5 transition-all hover:border-crm-red/50">
                            <div className="mb-4 flex items-start justify-between border-b border-crm-border pb-4">
                                <div>
                                    <h3 className="text-xl font-black text-white leading-tight flex items-center gap-2">
                                        {(sale.clientId?.fullName || sale.clientId?.firstName) || 'Cliente desconocido'}
                                        {sale.clientId && (
                                            <a href={`/admin/clientes/${sale.clientId._id}`} target="_blank" rel="noreferrer" className="text-xs text-crm-fg-muted hover:text-crm-red underline">Ver</a>
                                        )}
                                    </h3>
                                    <div className="text-sm text-crm-fg-muted mt-1 font-medium flex items-center gap-2">
                                        {sale.vehicleId?.brand} {sale.vehicleId?.name} ({sale.vehicleId?.plateOrVin})
                                        {sale.vehicleId && (
                                            <a href={`/admin/stock/${sale.vehicleId._id}`} target="_blank" rel="noreferrer" className="text-xs text-crm-fg-muted hover:text-crm-red underline">Ver</a>
                                        )}
                                    </div>
                                    <div className="text-xs text-crm-fg-muted mt-1 flex items-center gap-2">
                                        <span>Entregado: {sale.actualDeliveryDate ? new Date(sale.actualDeliveryDate).toLocaleDateString('es-AR') : 'S/F'}</span>
                                        <span>•</span>
                                        <a href={`/admin/ventas/${sale._id}`} target="_blank" rel="noreferrer" className="text-crm-fg-muted hover:text-crm-red underline">Ver Venta</a>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 items-end">
                                    <select 
                                        value={sale.postSaleStatus || 'pendiente'} 
                                        onChange={(e) => handleUpdateStatus(sale._id, e.target.value)}
                                        className="h-8 rounded bg-crm-bg border border-crm-border text-xs font-bold text-crm-fg focus:border-crm-red focus:outline-none px-2 uppercase"
                                    >
                                        <option value="pendiente">Pendiente</option>
                                        <option value="contactado">Contactado</option>
                                        <option value="conforme">Conforme</option>
                                        <option value="incidencia">Incidencia</option>
                                        <option value="cerrado">Cerrado</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-2 mb-4 border-b border-crm-border pb-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Tipo de contacto</label>
                                    <select 
                                        value={sale.postSaleType || 'WhatsApp'} 
                                        onChange={(e) => handleUpdateField(sale._id, 'postSaleType', e.target.value)}
                                        className="h-8 rounded bg-crm-bg border border-crm-border text-xs text-crm-fg focus:border-crm-red focus:outline-none px-2"
                                    >
                                        <option value="WhatsApp">WhatsApp</option>
                                        <option value="Llamado">Llamado</option>
                                        <option value="Email">Email</option>
                                        <option value="Presencial">Presencial</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Próximo contacto</label>
                                    <input 
                                        type="date" 
                                        value={sale.postSaleNextContact ? new Date(sale.postSaleNextContact).toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleUpdateField(sale._id, 'postSaleNextContact', e.target.value)}
                                        className="h-8 rounded bg-crm-bg border border-crm-border text-xs text-crm-fg focus:border-crm-red focus:outline-none px-2"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Responsable</label>
                                    <select 
                                        value={sale.postSaleResponsible?._id || sale.postSaleResponsible || ''} 
                                        onChange={(e) => handleUpdateField(sale._id, 'postSaleResponsible', e.target.value)}
                                        className="h-8 rounded bg-crm-bg border border-crm-border text-xs text-crm-fg focus:border-crm-red focus:outline-none px-2"
                                    >
                                        <option value="">Sin asignar</option>
                                        {users.map(u => (
                                            <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-2">
                                {/* Checklist */}
                                <label className="flex items-center gap-2 text-sm text-crm-fg-muted hover:text-white cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={sale.postSaleChecklist?.seguimiento24h || false} 
                                        onChange={e => handleUpdateChecklist(sale._id, 'seguimiento24h', e.target.checked)}
                                        className="rounded border-crm-border bg-crm-bg text-crm-red focus:ring-crm-red"
                                    />
                                    Llamado 24/48hs
                                </label>
                                <label className="flex items-center gap-2 text-sm text-crm-fg-muted hover:text-white cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={sale.postSaleChecklist?.seguimiento7d || false} 
                                        onChange={e => handleUpdateChecklist(sale._id, 'seguimiento7d', e.target.checked)}
                                        className="rounded border-crm-border bg-crm-bg text-crm-red focus:ring-crm-red"
                                    />
                                    Seguimiento 7 Días
                                </label>
                                <label className="flex items-center gap-2 text-sm text-crm-fg-muted hover:text-white cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={sale.postSaleChecklist?.obsequioEntregado || false} 
                                        onChange={e => handleUpdateChecklist(sale._id, 'obsequioEntregado', e.target.checked)}
                                        className="rounded border-crm-border bg-crm-bg text-crm-red focus:ring-crm-red"
                                    />
                                    Obsequio Entregado
                                </label>
                                <label className="flex items-center gap-2 text-sm text-crm-fg-muted hover:text-white cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={sale.postSaleChecklist?.resenaSolicitada || false} 
                                        onChange={e => handleUpdateChecklist(sale._id, 'resenaSolicitada', e.target.checked)}
                                        className="rounded border-crm-border bg-crm-bg text-crm-red focus:ring-crm-red"
                                    />
                                    Reseña Solicitada
                                </label>
                            </div>

                            <div className="mt-4 pt-4 border-t border-crm-border">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-2">
                                    <MessageSquare size={14} />
                                    Notas y Comentarios del Cliente
                                </label>
                                <textarea 
                                    className="w-full rounded-lg bg-crm-bg border border-crm-border p-3 text-sm text-crm-fg focus:border-crm-red focus:ring-1 focus:ring-crm-red resize-none"
                                    rows="2"
                                    placeholder="Anotaciones de llamadas, quejas o conformidades..."
                                    defaultValue={sale.postSaleNotes || ''}
                                    onBlur={(e) => handleUpdateNotes(sale._id, e.target.value)}
                                ></textarea>
                            </div>
                        </div>
                    ))}
                    
                    {filteredPostventas.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-crm-fg-muted">
                            <Headset size={48} className="mb-4 opacity-20" />
                            <p>No hay operaciones en este estado de postventa.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
