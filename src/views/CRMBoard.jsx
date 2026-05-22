"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, MessageCircle, X, Car as CarIcon, Calendar, Check, Clock, StickyNote, MoreVertical, TrendingUp, TrendingDown, Target, DollarSign, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const PIPELINE_STAGES = [
    'Nuevo Contacto',
    'Seguimiento Activo',
    'Visita / Test Drive',
    'Evaluación de Usado',
    'Señado',
    'Entregado / Vendido'
];

const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price).replace('US$', 'U$S');
};

const CRMBoard = ({ cars, refreshCars }) => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draggedLead, setDraggedLead] = useState(null);
    const [selectedLead, setSelectedLead] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [formData, setFormData] = useState({ name: '', phone: '', pipelineStage: 'Nuevo Contacto', vehicleId: '' });
    const [newNote, setNewNote] = useState('');

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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    // --- KPIs Calculation ---
    const kpis = useMemo(() => {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        const todayLeadsCount = leads.filter(l => new Date(l.createdAt).toDateString() === today).length;
        const yesterdayLeadsCount = leads.filter(l => new Date(l.createdAt).toDateString() === yesterday).length;
        
        let leadsTrend = 0;
        if (yesterdayLeadsCount === 0 && todayLeadsCount > 0) leadsTrend = 100;
        else if (yesterdayLeadsCount > 0) leadsTrend = Math.round(((todayLeadsCount - yesterdayLeadsCount) / yesterdayLeadsCount) * 100);

        const soldLeads = leads.filter(l => l.pipelineStage === 'Entregado / Vendido');
        const conversionRate = leads.length === 0 ? 0 : Math.round((soldLeads.length / leads.length) * 100);

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlySales = soldLeads.filter(l => {
            const date = new Date(l.updatedAt || l.createdAt);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const monthlyRevenue = monthlySales.reduce((acc, l) => acc + (l.vehicleId?.price || 0), 0);
        const avgTicket = monthlySales.length === 0 ? 0 : Math.round(monthlyRevenue / monthlySales.length);
        
        // Mock Goal: 10 sales a month
        const targetGoal = 10;
        const goalProgress = Math.min(Math.round((monthlySales.length / targetGoal) * 100), 100);

        return {
            todayLeads: todayLeadsCount,
            leadsTrend,
            conversionRate,
            monthlySalesCount: monthlySales.length,
            avgTicket,
            goalProgress
        };
    }, [leads]);

    const handleDragStart = (lead) => {
        setDraggedLead(lead);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); 
    };

    const handleDrop = async (stage) => {
        if (!draggedLead || draggedLead.pipelineStage === stage) {
            setDraggedLead(null);
            return;
        }

        const updatedLead = { ...draggedLead, pipelineStage: stage };
        setLeads(prev => prev.map(l => l._id === draggedLead._id ? updatedLead : l));
        setDraggedLead(null);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const res = await fetch(`${baseUrl}/api/leads/${draggedLead._id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ 
                    pipelineStage: stage, 
                    vehicleId: updatedLead.vehicleId?._id || updatedLead.vehicleId || null 
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                if (res.status === 401 || res.status === 403) {
                    toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
                    window.location.href = '/login';
                    return;
                }
                throw new Error(errorData.message || 'Error al actualizar el estado');
            }
            
            const savedLead = await res.json();
            setLeads(prev => prev.map(l => l._id === savedLead._id ? savedLead : l));
            
            if ((stage === 'Señado' || stage === 'Entregado / Vendido') && savedLead.vehicleId) {
                toast.success(`Vehículo actualizado a ${stage === 'Señado' ? 'Señado' : 'Vendido'}`);
                refreshCars();
            }
        } catch (error) {
            toast.error('No se pudo actualizar el estado');
            fetchLeads(); 
        }
    };

    const openModal = (lead = null) => {
        if (lead) {
            setSelectedLead(lead);
            setFormData({
                name: lead.name,
                phone: lead.phone,
                pipelineStage: lead.pipelineStage,
                vehicleId: lead.vehicleId?._id || ''
            });
        } else {
            setSelectedLead(null);
            setFormData({ name: '', phone: '', pipelineStage: 'Nuevo Contacto', vehicleId: '' });
        }
        setNewNote('');
        setIsModalOpen(true);
    };

    const saveLead = async () => {
        if (!formData.name || !formData.phone) {
            toast.error('Nombre y teléfono requeridos');
            return;
        }

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const url = selectedLead ? `${baseUrl}/api/leads/${selectedLead._id}` : `${baseUrl}/api/leads`;
            const method = selectedLead ? 'PUT' : 'POST';

            let notesPayload = selectedLead ? selectedLead.notes : [];
            if (newNote.trim()) {
                notesPayload = [...notesPayload, { text: newNote.trim() }];
            }

            const body = {
                ...formData,
                notes: notesPayload
            };

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                if (res.status === 401 || res.status === 403) {
                    toast.error('Sesión expirada.');
                    window.location.href = '/login';
                    return;
                }
                throw new Error(errorData.message || 'Error al guardar');
            }
            
            toast.success(selectedLead ? 'Ficha actualizada' : 'Prospecto creado');
            fetchLeads();
            
            if ((formData.pipelineStage === 'Señado' || formData.pipelineStage === 'Entregado / Vendido') && formData.vehicleId) {
                refreshCars();
            }

            setIsModalOpen(false);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const deleteLead = async () => {
        if (!selectedLead || !confirm('¿Estás seguro de eliminar este prospecto?')) return;
        
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            await fetch(`${baseUrl}/api/leads/${selectedLead._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success('Prospecto eliminado');
            fetchLeads();
            setIsModalOpen(false);
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const getWaLink = (phone) => {
        const cleanPhone = phone.replace(/\D/g, '');
        return `https://wa.me/${cleanPhone}`;
    };

    if (loading) return <div className="text-center py-20 text-zinc-500 font-medium tracking-wide">Iniciando Sote CRM...</div>;

    return (
        <div className="w-full max-w-[1800px] mx-auto pb-12 font-sans bg-black min-h-screen text-zinc-200 p-6 md:p-8 rounded-2xl border border-zinc-900/50 shadow-2xl">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                        CRM <span className="text-red-600 font-extrabold">AutoSporting</span>
                    </h2>
                    <p className="text-zinc-500 text-sm font-medium tracking-wide">Plataforma de Gestión Ejecutiva Multimarcas</p>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-red-900/20 active:scale-95"
                >
                    <Plus size={18} strokeWidth={2.5} /> Nuevo Prospecto
                </button>
            </div>

            {/* PANEL DE KPIs (Estilo Sote) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {/* KPI 1: Leads Hoy */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl shadow-sm backdrop-blur-md">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Leads Hoy</p>
                        <Users size={16} className="text-zinc-600" />
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-3xl font-bold text-white tracking-tighter">{kpis.todayLeads}</h3>
                        {kpis.leadsTrend !== 0 && (
                            <span className={`text-xs font-medium flex items-center gap-1 ${kpis.leadsTrend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {kpis.leadsTrend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {Math.abs(kpis.leadsTrend)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* KPI 2: Tasa Conversión */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl shadow-sm backdrop-blur-md">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Conversión</p>
                        <Target size={16} className="text-zinc-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-white tracking-tighter">{kpis.conversionRate}%</h3>
                </div>

                {/* KPI 3: Ventas del Mes */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl shadow-sm backdrop-blur-md">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Ventas del Mes</p>
                        <CarIcon size={16} className="text-zinc-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-white tracking-tighter">{kpis.monthlySalesCount}</h3>
                </div>

                {/* KPI 4: Ticket Promedio / Progreso */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl shadow-sm backdrop-blur-md flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Ticket Promedio</p>
                        <DollarSign size={16} className="text-zinc-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tighter truncate mb-2">{kpis.avgTicket > 0 ? formatPrice(kpis.avgTicket) : '---'}</h3>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-red-600 h-1.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${kpis.goalProgress}%` }}></div>
                    </div>
                </div>
            </div>

            {/* TABLERO KANBAN */}
            <div className="flex overflow-x-auto gap-5 pb-8 custom-scrollbar items-start min-h-[60vh] select-none">
                {PIPELINE_STAGES.map((stage) => {
                    const stageLeads = leads.filter(l => l.pipelineStage === stage);
                    
                    return (
                        <div 
                            key={stage}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(stage)}
                            className="bg-zinc-950/50 rounded-2xl min-w-[300px] w-[300px] flex flex-col border border-zinc-800/80 shrink-0 shadow-inner"
                        >
                            {/* COLUMNA HEADER */}
                            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/20 rounded-t-2xl">
                                <h3 className="font-semibold text-[13px] uppercase tracking-wider text-zinc-300">{stage}</h3>
                                <span className="bg-black border border-zinc-800 text-zinc-400 text-xs px-2.5 py-0.5 rounded-md font-mono">{stageLeads.length}</span>
                            </div>

                            {/* COLUMNA BODY */}
                            <div className="p-3.5 flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                                {stageLeads.map(lead => (
                                    <div
                                        key={lead._id}
                                        draggable
                                        onDragStart={() => handleDragStart(lead)}
                                        onClick={() => openModal(lead)}
                                        className="bg-zinc-900 p-4 rounded-xl shadow-md border border-zinc-800 hover:border-zinc-700 hover:scale-[1.01] cursor-grab active:cursor-grabbing transition-all duration-200 group"
                                    >
                                        <div className="flex justify-between items-start mb-3 gap-2">
                                            <h4 className="text-sm font-semibold text-white tracking-tight leading-tight">{lead.name}</h4>
                                            <a 
                                                href={getWaLink(lead.phone)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-zinc-500 hover:text-green-500 bg-zinc-800 hover:bg-green-500/10 p-1.5 rounded-md transition-colors shrink-0"
                                            >
                                                <MessageCircle size={14} />
                                            </a>
                                        </div>
                                        
                                        {lead.vehicleId && (
                                            <div className="mb-4">
                                                <div className="bg-neutral-800 border border-zinc-700 text-zinc-300 rounded px-2 py-0.5 text-xs font-mono inline-flex items-center gap-1.5 w-full">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
                                                    <span className="truncate">{lead.vehicleId.brand} {lead.vehicleId.name}</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-between items-center mt-auto pt-2 border-t border-zinc-800/50">
                                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                                                <Clock size={12} className="text-zinc-600" />
                                                {new Date(lead.updatedAt || lead.createdAt).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })}
                                            </div>
                                            {lead.notes && lead.notes.length > 0 && (
                                                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                                    <StickyNote size={12} /> {lead.notes.length}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {stageLeads.length === 0 && (
                                    <div className="text-zinc-600 text-[11px] uppercase tracking-widest font-medium text-center py-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/30">
                                        Arrastrar Aquí
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* MODAL FICHA CLIENTE */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-950 w-full sm:max-w-md h-full border-l border-zinc-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-zinc-950">
                            <h2 className="text-lg font-bold text-white tracking-tight">
                                {selectedLead ? 'Ficha Ejecutiva' : 'Nuevo Contacto'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-2 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar bg-black/20">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nombre Completo</label>
                                    <input 
                                        type="text" 
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full bg-zinc-900 border border-zinc-800 py-3 px-4 rounded-xl text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-600/50 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Teléfono</label>
                                    <input 
                                        type="text" 
                                        value={formData.phone} 
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                        className="w-full bg-zinc-900 border border-zinc-800 py-3 px-4 rounded-xl text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-600/50 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Etapa Actual</label>
                                    <select 
                                        value={formData.pipelineStage} 
                                        onChange={e => setFormData({...formData, pipelineStage: e.target.value})}
                                        className="w-full bg-zinc-900 border border-zinc-800 py-3 px-4 rounded-xl text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-600/50 outline-none transition-all cursor-pointer appearance-none"
                                    >
                                        {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Vehículo de Interés</label>
                                    <select 
                                        value={formData.vehicleId} 
                                        onChange={e => setFormData({...formData, vehicleId: e.target.value})}
                                        className="w-full bg-zinc-900 border border-zinc-800 py-3 px-4 rounded-xl text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-600/50 outline-none transition-all cursor-pointer appearance-none"
                                    >
                                        <option value="">-- Sin asignar --</option>
                                        {cars.map(c => (
                                            <option key={c._id} value={c._id}>{c.brand} {c.name} ({c.status})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {selectedLead && (
                                <div className="border-t border-zinc-900 pt-6 space-y-4">
                                    <h3 className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                                        <Calendar size={12}/> Historial CRM
                                    </h3>
                                    
                                    <div className="bg-zinc-900 rounded-xl p-1 border border-zinc-800 focus-within:border-zinc-700 transition-colors shadow-inner">
                                        <textarea 
                                            value={newNote}
                                            onChange={e => setNewNote(e.target.value)}
                                            placeholder="Registrar interacción o nota..."
                                            className="w-full bg-transparent p-3 text-white placeholder-zinc-600 border-none outline-none resize-none text-sm"
                                            rows="2"
                                        />
                                    </div>

                                    {selectedLead.notes && selectedLead.notes.length > 0 && (
                                        <div className="space-y-3 mt-4">
                                            {selectedLead.notes.slice().reverse().map((note, i) => (
                                                <div key={i} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 relative">
                                                    <p className="text-sm text-zinc-300 leading-relaxed">{note.text}</p>
                                                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider mt-2 block font-medium">
                                                        {new Date(note.date).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-zinc-900 bg-zinc-950 flex gap-3">
                            {selectedLead && (
                                <button 
                                    onClick={deleteLead}
                                    className="bg-zinc-900 hover:bg-red-950/50 text-zinc-400 hover:text-red-500 px-4 py-3 rounded-xl text-sm font-semibold transition-colors border border-zinc-800 hover:border-red-900/50"
                                >
                                    Eliminar
                                </button>
                            )}
                            <button 
                                onClick={saveLead}
                                className="flex-1 bg-white hover:bg-zinc-200 text-black px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Check size={16} strokeWidth={3} /> {selectedLead ? 'Actualizar Ficha' : 'Guardar Prospecto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
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

export default CRMBoard;
