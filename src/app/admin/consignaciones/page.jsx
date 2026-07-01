"use client";
import React, { useEffect, useState } from 'react';
import { Search, Car, User, Phone, MapPin, DollarSign, Calendar, Info, Link as LinkIcon } from 'lucide-react';
import { useAdminCars } from '../../../hooks/useAdminCars';
import Link from 'next/link';
import ConsignationKanban from '../../../components/crm/consignaciones/ConsignationKanban';
import toast from 'react-hot-toast';

export default function ConsignacionesPage() {
    const { cars, loading, error, refresh: fetchCars } = useAdminCars();
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('pipeline'); // 'lista' or 'pipeline'

    useEffect(() => {
        fetchCars();
    }, [fetchCars]);

    // Consignaciones = Vehículos en stock que tienen un consignador (consignedBy)
    // o que explícitamente no son de la agencia y tienen un dueño registrado.
    const consignaciones = cars.filter(car => {
        const isConsigned = (car.consignedBy && car.consignedBy.trim() !== '') || 
                            (car.agencyOwned === false && car.ownerName && car.ownerName.trim() !== '');
        
        return isConsigned && car.status !== 'Vendido' && car.status !== 'Cancelado';
    });

    const filteredConsignaciones = consignaciones.filter(car => {
        const query = search.toLowerCase();
        const brandModel = `${car.brand} ${car.name}`.toLowerCase();
        const ownerName = car.ownerName?.toLowerCase() || '';
        const plate = car.plateOrVin?.toLowerCase() || '';
        return brandModel.includes(query) || ownerName.includes(query) || plate.includes(query);
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Disponible': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'Reservado': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            case 'Pausado': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
            default: return 'text-crm-fg-muted border-crm-border bg-crm-bg';
        }
    };

    const handleStatusChange = async (carId, newConsignmentStatus) => {
        try {
            const token = localStorage.getItem('token');
            const car = consignaciones.find(c => c._id === carId);
            if (!car) return;
            if (car.consignmentStatus === newConsignmentStatus) return;

            let updates = { consignmentStatus: newConsignmentStatus };
            let actionDetails = `Cambio a etapa: ${newConsignmentStatus}`;

            if (newConsignmentStatus === 'publicado') {
                updates.status = 'Disponible';
                updates.visibleEnWeb = true;
                actionDetails += ' (Publicado en web)';
            } else if (newConsignmentStatus === 'reservado') {
                updates.status = 'Reservado';
            } else if (newConsignmentStatus === 'vendido' || newConsignmentStatus === 'cerrado') {
                updates.status = 'Vendido';
            } else if (newConsignmentStatus === 'cancelado') {
                updates.status = 'Cancelado';
            }

            const res = await fetch(`/api/admin/cars/${carId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...updates,
                    auditMessage: actionDetails
                })
            });

            if (!res.ok) throw new Error('Error al cambiar de estado');
            
            toast.success('Estado actualizado');
            fetchCars();
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 pb-24 md:p-6">
            <div className="flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg flex items-center gap-2">
                        <LinkIcon size={28} className="text-crm-red" />
                        Consignaciones
                    </h1>
                    <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                        Vehículos en stock de terceros (Gestión de dueños y comisiones).
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar dueño, auto, patente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-64 rounded-lg border border-crm-border bg-crm-surface pl-9 pr-3 text-sm text-crm-fg placeholder-crm-fg-muted focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red"
                        />
                    </div>
                </div>
            </div>

            <div className="flex space-x-1 border-b border-crm-border mt-2">
                <button
                    onClick={() => setViewMode('pipeline')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors relative ${viewMode === 'pipeline' ? 'text-white' : 'text-crm-fg-muted hover:text-white'}`}
                >
                    Pipeline Kanban
                    {viewMode === 'pipeline' && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-crm-red" />}
                </button>
                <button
                    onClick={() => setViewMode('lista')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors relative ${viewMode === 'lista' ? 'text-white' : 'text-crm-fg-muted hover:text-white'}`}
                >
                    Vista Lista
                    {viewMode === 'lista' && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-crm-red" />}
                </button>
            </div>

            {error && typeof error === 'string' && cars.length === 0 && (
                <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    {error}
                </div>
            )}

            {loading && cars.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                </div>
            ) : viewMode === 'pipeline' ? (
                <ConsignationKanban consignations={filteredConsignaciones} onChangeStatus={handleStatusChange} />
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {filteredConsignaciones.map(car => (
                        <div key={car._id} className="flex flex-col rounded-xl border border-crm-border bg-crm-surface p-5 transition-all hover:border-crm-red/50">
                            
                            <div className="mb-4 flex items-start gap-4 border-b border-crm-border pb-4">
                                {car.coverImage ? (
                                    <img src={car.coverImage} alt={car.name} className="h-16 w-24 rounded-lg object-cover border border-crm-border" />
                                ) : (
                                    <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-crm-bg border border-crm-border">
                                        <Car size={24} className="text-crm-fg-muted" />
                                    </div>
                                )}
                                
                                <div className="flex-1 overflow-hidden">
                                    <h3 className="text-base font-bold text-white truncate" title={`${car.brand} ${car.name}`}>
                                        {car.brand} {car.name}
                                    </h3>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        <span className="inline-block rounded px-2 py-0.5 text-[10px] font-bold tracking-wider bg-crm-bg border border-crm-border text-crm-fg-muted">
                                            {car.year} • {car.km?.toLocaleString('es-AR')} km
                                        </span>
                                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(car.status)}`}>
                                            {car.status}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-sm font-bold text-crm-red">
                                        {car.currency} {car.price?.toLocaleString('es-AR')}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-3 text-sm text-crm-fg-muted mb-4 flex-1">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-crm-red/80">Datos del Propietario</h4>
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-crm-fg opacity-70 shrink-0" />
                                    <span className="font-medium text-crm-fg truncate">{car.ownerName || 'No registrado'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-crm-fg opacity-70 shrink-0" />
                                    {car.ownerPhone ? (
                                        <a href={`https://wa.me/${car.ownerPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:text-crm-red transition-colors">
                                            {car.ownerPhone}
                                        </a>
                                    ) : (
                                        <span>No registrado</span>
                                    )}
                                </div>
                                {car.consignedBy && (
                                    <div className="flex items-center gap-2">
                                        <Info size={14} className="text-crm-fg opacity-70 shrink-0" />
                                        <span>Consignado por: <span className="text-crm-fg font-medium">{car.consignedBy}</span></span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-crm-fg opacity-70 shrink-0" />
                                    <span>Ubicación: {car.location || 'Salón Principal'}</span>
                                </div>
                            </div>

                            <Link href={`/admin/stock/${car._id}`} className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-crm-bg py-2 text-sm font-bold text-white border border-crm-border hover:bg-crm-border hover:text-crm-red transition-all">
                                Ver Ficha del Vehículo
                            </Link>
                        </div>
                    ))}
                    {filteredConsignaciones.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-crm-fg-muted">
                            <LinkIcon size={48} className="mb-4 opacity-20" />
                            <p>No hay vehículos en consignación activos.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
