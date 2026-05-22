"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Phone, Car, MapPin, MessageCircle, FileText, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const Clientes = ({ cars }) => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLead, setSelectedLead] = useState(null);

    const fetchLeads = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const res = await fetch(`${baseUrl}/api/leads`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLeads(data);
            }
        } catch (error) {
            console.error('Error fetching leads:', error);
            toast.error('Error al cargar clientes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    // Filter leads by name, phone, and car model
    const filteredLeads = useMemo(() => {
        if (!searchTerm) return leads;
        const term = searchTerm.toLowerCase();
        
        return leads.filter(lead => {
            const matchName = lead.name?.toLowerCase().includes(term);
            const matchPhone = lead.phone?.toLowerCase().includes(term);
            
            // Check if linked car matches
            let matchCar = false;
            if (lead.vehicleId) {
                const carBrand = lead.vehicleId.brand?.toLowerCase() || '';
                const carName = lead.vehicleId.name?.toLowerCase() || '';
                matchCar = carBrand.includes(term) || carName.includes(term);
            }
            
            return matchName || matchPhone || matchCar;
        });
    }, [leads, searchTerm]);

    const getWaLink = (phone) => {
        const cleanPhone = phone.replace(/\D/g, '');
        return `https://wa.me/${cleanPhone}`;
    };

    if (loading) {
        return <div className="text-center py-20 text-zinc-500 font-medium">Cargando directorio...</div>;
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-300">
            {/* Lista Izquierda (Directorio) */}
            <div className={`bg-zinc-950 border border-zinc-800/80 rounded-2xl flex flex-col shadow-xl transition-all ${selectedLead ? 'hidden lg:flex lg:w-1/3' : 'w-full'}`}>
                <div className="p-5 border-b border-zinc-800/80">
                    <h2 className="text-lg font-bold text-white tracking-tight mb-4">Directorio de Clientes</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre, teléfono o vehículo..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-zinc-600"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    {filteredLeads.length === 0 ? (
                        <p className="text-center text-zinc-500 text-sm mt-8">No se encontraron clientes.</p>
                    ) : (
                        <div className="space-y-2">
                            {filteredLeads.map(lead => (
                                <button
                                    key={lead._id}
                                    onClick={() => setSelectedLead(lead)}
                                    className={`w-full text-left p-4 rounded-xl transition-all flex items-center justify-between group border ${selectedLead?._id === lead._id ? 'bg-red-500/10 border-red-500/30' : 'bg-transparent border-transparent hover:bg-zinc-900 hover:border-zinc-800'}`}
                                >
                                    <div className="overflow-hidden">
                                        <h3 className="text-white font-bold text-sm truncate">{lead.name}</h3>
                                        <p className="text-zinc-500 text-xs mt-1 truncate">{lead.phone}</p>
                                    </div>
                                    {lead.vehicleId && (
                                        <div className="shrink-0 bg-zinc-800/50 p-1.5 rounded-lg text-zinc-400 group-hover:text-white transition-colors">
                                            <Car size={16} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Panel Derecho (Detalles) */}
            <div className={`flex-1 bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden flex-col relative ${selectedLead ? 'flex' : 'hidden lg:flex items-center justify-center'}`}>
                {!selectedLead ? (
                    <div className="text-center p-8">
                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                            <Users size={24} className="text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Selecciona un Cliente</h3>
                        <p className="text-zinc-500 text-sm">Haz clic en un cliente de la lista para ver sus detalles, vehículo de interés e historial.</p>
                    </div>
                ) : (
                    <>
                        {/* Header Panel */}
                        <div className="p-8 border-b border-zinc-800/80 relative">
                            <button 
                                onClick={() => setSelectedLead(null)}
                                className="lg:hidden absolute top-4 right-4 bg-zinc-900 text-zinc-400 p-2 rounded-lg"
                            >
                                Cerrar
                            </button>

                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
                                        {selectedLead.pipelineStage}
                                    </div>
                                    <h2 className="text-3xl font-black text-white tracking-tight mb-2">{selectedLead.name}</h2>
                                    <div className="flex items-center gap-4 text-zinc-400 text-sm font-medium">
                                        <span className="flex items-center gap-1.5"><Phone size={14} /> {selectedLead.phone}</span>
                                        <span className="flex items-center gap-1.5"><Calendar size={14} /> Creado: {new Date(selectedLead.createdAt).toLocaleDateString('es-AR')}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="mt-6 flex gap-3">
                                <a 
                                    href={getWaLink(selectedLead.phone)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(22,163,74,0.3)]"
                                >
                                    <MessageCircle size={18} /> WhatsApp Web
                                </a>
                            </div>
                        </div>

                        {/* Body Panel */}
                        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8">
                            
                            {/* Auto Vinculado */}
                            {selectedLead.vehicleId ? (
                                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex items-center gap-6">
                                    <div className="w-24 h-24 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700">
                                        {(selectedLead.vehicleId.coverImage || (selectedLead.vehicleId.images && selectedLead.vehicleId.images[0])) ? (
                                            <img src={selectedLead.vehicleId.coverImage || selectedLead.vehicleId.images[0]} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-600"><Car /></div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Vehículo de Interés</h4>
                                        <h3 className="text-xl font-bold text-white mb-2">{selectedLead.vehicleId.brand} {selectedLead.vehicleId.name}</h3>
                                        <div className="flex gap-4 text-xs font-mono text-zinc-400">
                                            <span>{selectedLead.vehicleId.year}</span>
                                            <span>{selectedLead.vehicleId.km.toLocaleString()} km</span>
                                            <span className="text-white font-bold">{selectedLead.vehicleId.currency === 'USD' ? 'U$S' : '$'} {selectedLead.vehicleId.price.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-zinc-900/30 border border-dashed border-zinc-800 p-6 rounded-2xl flex items-center justify-center gap-3 text-zinc-500">
                                    <Car size={20} />
                                    <span className="text-sm font-medium">Sin vehículo asignado</span>
                                </div>
                            )}

                            {/* Notas Historial */}
                            <div>
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-zinc-800/50 pb-2">
                                    <FileText size={14} /> Historial de CRM
                                </h4>
                                
                                {(!selectedLead.notes || selectedLead.notes.length === 0) ? (
                                    <p className="text-sm text-zinc-600 italic">No hay notas registradas para este cliente.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {selectedLead.notes.slice().reverse().map((note, idx) => (
                                            <div key={idx} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl relative">
                                                <div className="absolute -left-1.5 top-5 w-3 h-3 bg-red-600 rounded-full border-2 border-zinc-950"></div>
                                                <p className="text-sm text-zinc-300 leading-relaxed pl-3">{note.text}</p>
                                                <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider block mt-3 pl-3">
                                                    {new Date(note.date).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </>
                )}
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #27272a;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #3f3f46;
                }
            `}</style>
        </div>
    );
};

export default Clientes;
