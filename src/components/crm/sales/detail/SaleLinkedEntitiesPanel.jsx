import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Link2, CarFront, User, CalendarClock, ChevronRight, AlertTriangle, Search, Handshake } from 'lucide-react';

export default function SaleLinkedEntitiesPanel({ sale, onUpdate }) {
    const [clientSearch, setClientSearch] = useState('');
    const [clientSearchResults, setClientSearchResults] = useState([]);
    const [searchingClient, setSearchingClient] = useState(false);
    
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [vehicleSearchResults, setVehicleSearchResults] = useState([]);
    const [searchingVehicle, setSearchingVehicle] = useState(false);
    
    // Manual Vehicle State
    const [isManualVehicleMode, setIsManualVehicleMode] = useState(false);
    const [manualBrand, setManualBrand] = useState('');
    const [manualModel, setManualModel] = useState('');
    const [manualPlate, setManualPlate] = useState('');

    const [isLinking, setIsLinking] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (clientSearch.length > 2) {
            const delayDebounceFn = setTimeout(async () => {
                setSearchingClient(true);
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`/api/admin/clients?search=${encodeURIComponent(clientSearch)}&limit=5`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setClientSearchResults(data.clients || []);
                    }
                } catch (err) {
                    console.error("Error searching clients", err);
                } finally {
                    setSearchingClient(false);
                }
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setClientSearchResults([]);
        }
    }, [clientSearch]);

    useEffect(() => {
        if (vehicleSearch.length > 2) {
            const delayDebounceFn = setTimeout(async () => {
                setSearchingVehicle(true);
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`/api/admin/cars?search=${encodeURIComponent(vehicleSearch)}&limit=5`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        // In /api/admin/cars, data is usually the array directly or inside a wrapper. 
                        // It returns an array directly based on my previous checks.
                        setVehicleSearchResults(Array.isArray(data) ? data : (data.cars || []));
                    }
                } catch (err) {
                    console.error("Error searching vehicles", err);
                } finally {
                    setSearchingVehicle(false);
                }
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setVehicleSearchResults([]);
        }
    }, [vehicleSearch]);

    const handleLinkClient = async (clientId) => {
        setIsLinking(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/sales/${sale._id}/link-client`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ clientId })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al vincular cliente');
            }
            if (onUpdate) onUpdate();
            else window.location.reload();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLinking(false);
        }
    };
    const handleCreateLinkClient = async () => {
        setIsLinking(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/sales/${sale._id}/create-link-client`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al crear y vincular cliente');
            }
            if (onUpdate) onUpdate();
            else window.location.reload();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLinking(false);
        }
    };

    const handleLinkVehicle = async (vehicleId) => {
        setIsLinking(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/sales/${sale._id}/link-vehicle`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vehicleId })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al vincular vehículo');
            }
            if (onUpdate) onUpdate();
            else window.location.reload();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLinking(false);
        }
    };

    const handleManualVehicleCreate = async () => {
        if (!manualBrand.trim() || !manualModel.trim()) {
            setError('Marca y modelo son obligatorios');
            return;
        }
        setIsLinking(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/sales/${sale._id}/create-link-vehicle`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    brand: manualBrand,
                    name: manualModel,
                    plateOrVin: manualPlate
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al crear vehículo manual');
            }
            if (onUpdate) onUpdate();
            else window.location.reload();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLinking(false);
        }
    };

    const handleBackfillFromReservation = async () => {
        setIsLinking(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/sales/${sale._id}/backfill-client-from-reservation`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al obtener cliente de reserva');
            }
            if (onUpdate) onUpdate();
            else window.location.reload();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLinking(false);
        }
    };
    if (!sale) return null;

    const vehicleName = sale.vehicleId ? `${sale.vehicleId.brand} ${sale.vehicleId.name}` : 'Vehículo no asignado';
    const vehicleVin = sale.vehicleId?.plateOrVin || '';
    const vehicleHref = sale.vehicleId?._id ? `/admin/stock/${sale.vehicleId._id}` : '#';

    const clientName = sale.clientId?.fullName || sale.clientId?.firstName || sale.leadId?.name || 'Sin Nombre';
    const clientPhone = sale.clientId?.phone || sale.leadId?.phone || 'Sin teléfono';
    const clientEmail = sale.clientId?.email || sale.leadId?.email || '';
    const hasClientLink = sale.clientId?._id || sale.leadId?._id;
    const clientHref = sale.clientId?._id ? `/admin/clientes/${sale.clientId._id}` : (sale.leadId?._id ? `/admin/leads/${sale.leadId._id}` : '#');

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-neutral-800 flex items-center gap-2 bg-[#1E1E24]">
                <Link2 size={16} className="text-blue-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Entidades Vinculadas</h3>
            </div>
            
            <div className="p-5 space-y-4 flex-1">
                
                {/* Vehicle */}
                {sale.vehicleId ? (
                    <div className="bg-black/30 border border-neutral-800/50 rounded-xl p-4 flex justify-between items-center group hover:bg-neutral-800 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center border border-neutral-700">
                                <CarFront size={18} className="text-neutral-400" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">Vehículo</span>
                                <span className="text-sm font-bold text-white">{vehicleName}</span>
                                {vehicleVin && <span className="text-[10px] text-neutral-500 font-mono mt-1">{vehicleVin}</span>}
                            </div>
                        </div>
                        <Link href={vehicleHref} className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors shadow-sm">
                            <ChevronRight size={18} />
                        </Link>
                    </div>
                ) : (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex flex-col gap-4">
                        <div className="flex gap-3 items-start">
                            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <span className="text-sm font-bold text-red-400 block mb-1">Venta sin vehículo vinculado</span>
                                <p className="text-xs text-red-200/70">Esta venta no tiene un vehículo oficial asociado. Búscalo o cárgalo manualmente para mantener la integridad del CRM.</p>
                            </div>
                        </div>

                        {error && <div className="text-xs text-red-400 font-bold">{error}</div>}

                        {/* Tabs for Vehicle Linking */}
                        <div className="flex gap-2 p-1 bg-black/40 rounded-lg">
                            <button
                                onClick={() => setIsManualVehicleMode(false)}
                                className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-colors ${!isManualVehicleMode ? 'bg-[#EF3329] text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                            >
                                Buscar en Stock
                            </button>
                            <button
                                onClick={() => setIsManualVehicleMode(true)}
                                className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-colors ${isManualVehicleMode ? 'bg-[#EF3329] text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                            >
                                Cargar Manual
                            </button>
                        </div>

                        {!isManualVehicleMode ? (
                            <>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Buscar vehículo por marca, modelo, patente o VIN..."
                                        className="w-full bg-black/40 border border-neutral-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-[#EF3329]/50 transition-colors"
                                        value={vehicleSearch}
                                        onChange={(e) => setVehicleSearch(e.target.value)}
                                        disabled={isLinking}
                                    />
                                </div>

                                {vehicleSearchResults.length > 0 && (
                                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar bg-[#161619] rounded-lg p-2 border border-neutral-800">
                                        {vehicleSearchResults.map(car => (
                                            <div key={car._id} className="flex items-center justify-between bg-black/40 p-2 rounded-lg">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-white">{car.brand} {car.name}</span>
                                                    <span className="text-[10px] text-neutral-500 font-mono">{car.plateOrVin}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleLinkVehicle(car._id)}
                                                    disabled={isLinking}
                                                    className="px-2 py-1 text-[10px] font-bold bg-[#E63027] hover:bg-[#C42620] text-white rounded transition-colors disabled:opacity-50"
                                                >
                                                    Vincular
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {vehicleSearch.length > 2 && vehicleSearchResults.length === 0 && !searchingVehicle && (
                                    <div className="text-[10px] text-neutral-500 text-center">No se encontraron vehículos.</div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-3 bg-black/20 p-3 rounded-xl border border-neutral-800/50">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 block">Marca *</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/40 border border-neutral-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#EF3329]/50 transition-colors"
                                            placeholder="Ej: Toyota"
                                            value={manualBrand}
                                            onChange={(e) => setManualBrand(e.target.value)}
                                            disabled={isLinking}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 block">Modelo *</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/40 border border-neutral-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#EF3329]/50 transition-colors"
                                            placeholder="Ej: Hilux SRV"
                                            value={manualModel}
                                            onChange={(e) => setManualModel(e.target.value)}
                                            disabled={isLinking}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 block">Patente (Opcional)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black/40 border border-neutral-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#EF3329]/50 transition-colors uppercase"
                                        placeholder="Ej: AB123CD"
                                        value={manualPlate}
                                        onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                                        disabled={isLinking}
                                    />
                                </div>
                                <button
                                    onClick={handleManualVehicleCreate}
                                    disabled={isLinking || !manualBrand.trim() || !manualModel.trim()}
                                    className="w-full mt-2 bg-[#EF3329] hover:bg-[#D92B22] text-white text-[11px] font-bold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <CarFront size={14} />
                                    Crear y Vincular Vehículo
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Client / Lead */}
                {sale.clientId ? (
                    <div className="bg-black/30 border border-neutral-800/50 rounded-xl p-4 flex justify-between items-center group hover:bg-neutral-800 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center border border-neutral-700">
                                <User size={18} className="text-neutral-400" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">
                                    Cliente Oficial
                                </span>
                                <span className="text-sm font-bold text-white">{clientName}</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-neutral-400">{clientPhone}</span>
                                    {clientEmail && (
                                        <>
                                            <span className="w-1 h-1 bg-neutral-700 rounded-full"></span>
                                            <span className="text-[10px] text-neutral-400 truncate max-w-[150px]">{clientEmail}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        {hasClientLink && (
                            <Link href={clientHref} className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors shadow-sm">
                                <ChevronRight size={18} />
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex flex-col gap-4">
                        <div className="flex gap-3 items-start">
                            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <span className="text-sm font-bold text-red-400 block mb-1">Venta sin cliente vinculado</span>
                                <p className="text-xs text-red-200/70">Esta venta no tiene un cliente oficial asociado. Vincula un cliente para mantener la integridad del CRM.</p>
                            </div>
                        </div>

                        {error && <div className="text-xs text-red-400 font-bold">{error}</div>}

                        {sale.reservationId && (
                            <button
                                onClick={handleBackfillFromReservation}
                                disabled={isLinking}
                                className="w-full flex items-center justify-center gap-2 bg-[#1E1E24] hover:bg-[#28282E] border border-[#33333A] text-white py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                                <CalendarClock size={14} />
                                Usar cliente de la reserva
                            </button>
                        )}

                        <button
                            onClick={handleCreateLinkClient}
                            disabled={isLinking}
                            className="w-full flex items-center justify-center gap-2 bg-[#EF3329]/10 hover:bg-[#EF3329]/20 border border-[#EF3329]/30 text-[#EF3329] py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                            <User size={14} />
                            Crear y Vincular Cliente Rápido
                        </button>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                            <input
                                type="text"
                                placeholder="Buscar cliente por DNI, nombre..."
                                className="w-full bg-black/40 border border-neutral-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-[#EF3329]/50 transition-colors"
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                disabled={isLinking}
                            />
                        </div>

                        {clientSearchResults.length > 0 && (
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar bg-[#161619] rounded-lg p-2 border border-neutral-800">
                                {clientSearchResults.map(client => (
                                    <div key={client._id} className="flex items-center justify-between bg-black/40 p-2 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-white">{client.fullName || client.firstName}</span>
                                            <span className="text-[10px] text-neutral-500">{client.phone}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleLinkClient(client._id)}
                                            disabled={isLinking}
                                            className="px-2 py-1 text-[10px] font-bold bg-[#E63027] hover:bg-[#C42620] text-white rounded transition-colors disabled:opacity-50"
                                        >
                                            Vincular
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {clientSearch.length > 2 && clientSearchResults.length === 0 && !searchingClient && (
                            <div className="text-[10px] text-neutral-500 text-center">No se encontraron clientes.</div>
                        )}
                    </div>
                )}

                {/* Reservation */}
                {sale.reservationId && (
                    <div className="bg-black/30 border border-neutral-800/50 rounded-xl p-4 flex justify-between items-center group hover:bg-neutral-800 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center border border-neutral-700">
                                <CalendarClock size={18} className="text-neutral-400" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">Reserva Previa</span>
                                <span className="text-sm font-bold text-white">Convertida Exitosamente</span>
                            </div>
                        </div>
                        <Link href="/admin/reservas" className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors shadow-sm">
                            <ChevronRight size={18} />
                        </Link>
                    </div>
                )}

            </div>
        </div>
    );
}
