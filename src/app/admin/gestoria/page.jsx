"use client";
import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, FileSignature, DollarSign, Calendar, CarFront, User } from 'lucide-react';
import { useGestoria } from '../../../hooks/useGestoria';
import { useAdminSales } from '../../../hooks/useAdminSales';
import CrmButton from '../../../components/crm/ui/CrmButton';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';

export default function GestoriaPage() {
    const { tramites, loading, error, fetchTramites, createTramite, updateTramite, deleteTramite } = useGestoria();
    const { sales, fetchSales } = useAdminSales();
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTramite, setEditingTramite] = useState(null);
    const [formData, setFormData] = useState({
        title: '', type: 'Transferencia Ingreso', vehiclePlate: '', gestorName: '',
        status: 'Iniciado', cost: '', currency: 'ARS', estimatedEndDate: '', notes: '',
        saleId: '', organismo: '', chargedToClient: false
    });
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, id: null });

    useEffect(() => {
        fetchTramites();
        fetchSales();
    }, [fetchTramites, fetchSales]);

    const filteredTramites = tramites.filter(t => 
        t.title?.toLowerCase().includes(search.toLowerCase()) || 
        t.type?.toLowerCase().includes(search.toLowerCase()) ||
        t.vehiclePlate?.toLowerCase().includes(search.toLowerCase()) ||
        t.gestorName?.toLowerCase().includes(search.toLowerCase())
    );

    const handleOpenModal = (tramite = null) => {
        if (tramite) {
            setEditingTramite(tramite);
            setFormData({ 
                title: tramite.title, type: tramite.type, 
                vehiclePlate: tramite.vehiclePlate || '', gestorName: tramite.gestorName || '',
                status: tramite.status || 'Iniciado', cost: tramite.cost || '', 
                currency: tramite.currency || 'ARS', 
                estimatedEndDate: tramite.estimatedEndDate ? new Date(tramite.estimatedEndDate).toISOString().split('T')[0] : '', 
                notes: tramite.notes || '',
                saleId: tramite.saleId || '',
                organismo: tramite.organismo || '',
                chargedToClient: tramite.chargedToClient || false
            });
        } else {
            setEditingTramite(null);
            setFormData({ 
                title: '', type: 'Transferencia Ingreso', vehiclePlate: '', gestorName: '',
                status: 'Iniciado', cost: '', currency: 'ARS', estimatedEndDate: '', notes: '',
                saleId: '', organismo: '', chargedToClient: false
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTramite(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTramite) {
                await updateTramite(editingTramite._id, formData);
            } else {
                await createTramite(formData);
            }
            handleCloseModal();
            fetchTramites();
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
            await deleteTramite(id);
            fetchTramites();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Iniciado': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            case 'En Registro': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
            case 'Observado': return 'text-red-400 border-red-400/30 bg-red-400/10';
            case 'Para Retirar': return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
            case 'Finalizado': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'Cancelado': return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
            default: return 'text-crm-fg-muted border-crm-border bg-crm-bg';
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 pb-24 md:p-6">
            <div className="flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg flex items-center gap-2">
                        <FileSignature size={28} className="text-crm-red" />
                        Gestoría
                    </h1>
                    <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                        Seguimiento de trámites, transferencias e inscripciones.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar trámite, patente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-64 rounded-lg border border-crm-border bg-crm-surface pl-9 pr-3 text-sm text-crm-fg placeholder-crm-fg-muted focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red"
                        />
                    </div>
                    <CrmButton variant="primary" size="sm" onClick={() => handleOpenModal()} className="h-9 shadow-[0_0_28px_rgba(239,51,41,0.45)]">
                        <Plus size={14} />
                        Nuevo Trámite
                    </CrmButton>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    {error}
                </div>
            )}

            {loading && tramites.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {filteredTramites.map(tramite => (
                        <div key={tramite._id} className="flex flex-col rounded-xl border border-crm-border bg-crm-surface p-5 transition-all hover:border-crm-red/50">
                            <div className="mb-4 flex items-start justify-between border-b border-crm-border pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white leading-tight">
                                        {tramite.title}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-crm-bg border border-crm-border text-crm-fg-muted">
                                            {tramite.type}
                                        </span>
                                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(tramite.status)}`}>
                                            {tramite.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(tramite)} className="text-crm-fg-muted hover:text-crm-fg transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(tramite._id)} className="text-crm-fg-muted hover:text-crm-red transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-y-3 text-sm text-crm-fg-muted">
                                <div className="flex items-center gap-2">
                                    <CarFront size={14} className="text-crm-fg opacity-70" />
                                    <span className="font-medium text-crm-fg uppercase">{tramite.vehiclePlate || 'S/D'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-crm-fg opacity-70" />
                                    <span className="truncate">{tramite.gestorName || 'Gestor no asignado'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-crm-fg opacity-70" />
                                    <span>
                                        Iniciado: {new Date(tramite.startDate).toLocaleDateString('es-AR', {day: '2-digit', month: '2-digit', year: '2-digit'})}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DollarSign size={14} className="text-crm-fg opacity-70" />
                                    <span className="font-medium text-crm-fg">{tramite.currency} {tramite.cost?.toLocaleString('es-AR') || '0'}</span>
                                    {tramite.chargedToClient && <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase">Cobrado</span>}
                                </div>
                                {tramite.saleId && (
                                    <div className="col-span-full mt-2 pt-2 border-t border-crm-border flex items-center justify-between">
                                        <span className="text-xs text-crm-fg-muted">Expediente Vinculado:</span>
                                        <a href={`/admin/ventas/${tramite.saleId}`} className="text-xs font-bold text-crm-red hover:text-red-400 uppercase">
                                            Ir al Expediente
                                        </a>
                                    </div>
                                )}
                            </div>

                            {tramite.notes && (
                                <div className="mt-4 rounded-lg bg-crm-bg p-3 text-xs italic text-crm-fg-muted border border-crm-border/50">
                                    {tramite.notes}
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredTramites.length === 0 && (
                        <div className="col-span-full py-12 text-center text-crm-fg-muted">
                            No se encontraron trámites de gestoría.
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl rounded-2xl border border-crm-border bg-crm-surface shadow-2xl my-auto">
                        <div className="flex items-center justify-between border-b border-crm-border px-6 py-4 sticky top-0 bg-crm-surface z-10 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-white">{editingTramite ? 'Editar Trámite' : 'Nuevo Trámite'}</h2>
                            <button type="button" onClick={handleCloseModal} className="text-crm-fg-muted hover:text-white text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-crm-red border-b border-crm-border/50 pb-2 uppercase tracking-wider">Identificación del Trámite</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-full">
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Título Corto *</label>
                                        <input required type="text" placeholder="Ej: Transferencia Hilux SRV" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Tipo de Trámite</label>
                                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                            <option value="Transferencia Ingreso">Transferencia Ingreso (Permuta/Compra)</option>
                                            <option value="Transferencia Egreso">Transferencia Egreso (Venta)</option>
                                            <option value="08 Blanco">Firma 08 en Blanco</option>
                                            <option value="Informe Dominio">Informe de Dominio</option>
                                            <option value="Alta Patente">Alta Patente</option>
                                            <option value="Baja Patente">Baja Patente</option>
                                            <option value="Duplicado Título">Duplicado de Título</option>
                                            <option value="Cédula Azul">Cédula Azul / Autorizado</option>
                                            <option value="Otro">Otro Trámite</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Patente del Vehículo</label>
                                        <input type="text" placeholder="Ej: AB123CD" value={formData.vehiclePlate} onChange={e => setFormData({...formData, vehiclePlate: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg uppercase focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Vincular Expediente (Venta)</label>
                                        <select value={formData.saleId} onChange={e => {
                                            const selectedSale = sales.find(s => s._id === e.target.value);
                                            setFormData({
                                                ...formData, 
                                                saleId: e.target.value,
                                                vehiclePlate: selectedSale?.vehicleId?.plateOrVin || formData.vehiclePlate
                                            });
                                        }} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                            <option value="">Ninguno</option>
                                            {sales.filter(s => s.status !== 'cancelada' && s.status !== 'borrador').map(s => (
                                                <option key={s._id} value={s._id}>
                                                    {(s.clientId?.fullName || s.clientId?.firstName)} - {s.vehicleId?.brand} {s.vehicleId?.name} ({s.vehicleId?.plateOrVin})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-crm-red border-b border-crm-border/50 pb-2 uppercase tracking-wider">Seguimiento y Costos</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Gestor Asignado</label>
                                        <input type="text" placeholder="Nombre del gestor/estudio" value={formData.gestorName} onChange={e => setFormData({...formData, gestorName: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Fecha Estimada de Finalización</label>
                                        <input type="date" value={formData.estimatedEndDate} onChange={e => setFormData({...formData, estimatedEndDate: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red [color-scheme:dark]" />
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
                                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Costo / Arancel</label>
                                            <input type="number" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Organismo Registral</label>
                                        <input type="text" placeholder="Ej: RNPA Seccional 2" value={formData.organismo} onChange={e => setFormData({...formData, organismo: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" id="chargedToClient" checked={formData.chargedToClient} onChange={e => setFormData({...formData, chargedToClient: e.target.checked})} className="h-4 w-4 rounded border-crm-border text-crm-red focus:ring-crm-red" />
                                        <label htmlFor="chargedToClient" className="text-sm font-medium text-crm-fg">Costos a cargo del Cliente (Cobrado)</label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-crm-red border-b border-crm-border/50 pb-2 uppercase tracking-wider">Estado y Observaciones</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Estado del Trámite</label>
                                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-white font-bold focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                            <option value="Iniciado">Iniciado</option>
                                            <option value="En Registro">En Registro</option>
                                            <option value="Observado">Observado (Con Problemas)</option>
                                            <option value="Para Retirar">Para Retirar</option>
                                            <option value="Finalizado">Finalizado</option>
                                            <option value="Cancelado">Cancelado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Observaciones</label>
                                        <textarea rows="2" placeholder="Firma pendiente de la esposa, falta libre deuda..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red resize-none"></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-crm-border">
                                <CrmButton type="button" variant="secondary" onClick={handleCloseModal}>Cancelar</CrmButton>
                                <CrmButton type="submit" variant="primary">Guardar Trámite</CrmButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmDeleteModal.isOpen}
                onClose={() => setConfirmDeleteModal({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Eliminar Trámite"
                message="¿Seguro que deseas eliminar este trámite de gestoría? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                isDestructive={true}
            />
        </div>
    );
}
