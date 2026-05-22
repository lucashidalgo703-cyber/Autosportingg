"use client";
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Circle, Clock, Plus, Trash2, ChevronLeft, ChevronRight, X, Search, Filter, AlertCircle, Info, User, Car as CarIcon, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

const Calendario = ({ cars = [] }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Calendar view state
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    
    // Filtering state
    const [activeTab, setActiveTab] = useState('Proximos'); // Proximos, Pasados, Todos
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('Todos los tipos');
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedColor, setSelectedColor] = useState('#6366f1'); // Default Indigo
    
    const [formData, setFormData] = useState({
        title: '',
        type: 'Reunión',
        date: '',
        time: '',
        notifyTo: 'Todos los sectores',
        client: 'Sin cliente',
        clientPhone: '',
        vehicle: 'Sin vehículo',
        notes: ''
    });

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    
    const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const eventColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
    const eventTypes = ['Reunión', 'Entrega', 'Visita', 'Cobro', 'Gestoría', 'Administrativo', 'Otro'];

    const fetchTasks = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const res = await fetch(`${baseUrl}/api/tasks`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        
        // Setup initial date pickers for the current month
        const firstDay = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        const lastDay = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
        setDateFrom(firstDay);
        setDateTo(lastDay);
    }, [currentMonth, currentYear]);

    // Handle Month Navigation
    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    // Calculate Grid offset
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOffset = new Date(currentYear, currentMonth, 1).getDay();

    const handleDayClick = (day) => {
        const clickedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(clickedDateStr);
        setFormData(prev => ({
            ...prev,
            date: clickedDateStr
        }));
        setIsModalOpen(true);
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.date) {
            toast.error("Por favor completa los campos obligatorios (*)");
            return;
        }

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            
            // Build rich metadata string in description
            let descriptionText = formData.notes;
            if (formData.client !== 'Sin cliente') {
                descriptionText += `\n\n[Cliente: ${formData.client} - Tel: ${formData.clientPhone || 'N/A'}]`;
            }
            if (formData.vehicle !== 'Sin vehículo') {
                descriptionText += `\n[Vehículo: ${formData.vehicle}]`;
            }

            const res = await fetch(`${baseUrl}/api/tasks`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ 
                    title: `[${formData.type}] ${formData.title}`,
                    dueDate: formData.date,
                    status: 'Pendiente',
                    color: selectedColor,
                    description: descriptionText
                })
            });

            if (res.ok) {
                toast.success('Evento agendado con éxito');
                setIsModalOpen(false);
                setFormData({
                    title: '',
                    type: 'Reunión',
                    date: '',
                    time: '',
                    notifyTo: 'Todos los sectores',
                    client: 'Sin cliente',
                    clientPhone: '',
                    vehicle: 'Sin vehículo',
                    notes: ''
                });
                fetchTasks();
            } else {
                throw new Error();
            }
        } catch (error) {
            toast.error('Error al agendar el evento');
        }
    };

    const handleDeleteEvent = async (id) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const res = await fetch(`${baseUrl}/api/tasks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                toast.success('Evento eliminado');
                fetchTasks();
            }
        } catch (error) {
            toast.error('Error al eliminar evento');
        }
    };

    // Filter Logic
    const getFilteredEvents = () => {
        return tasks.filter(task => {
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0, 0, 0, 0);
            
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);

            // Tab logic
            if (activeTab === 'Proximos' && taskDate < todayDate) return false;
            if (activeTab === 'Pasados' && taskDate >= todayDate) return false;

            // Search logic
            const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

            // Date Range logic
            let matchesRange = true;
            if (dateFrom) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                if (taskDate < from) matchesRange = false;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                if (taskDate > to) matchesRange = false;
            }

            // Type filter
            let matchesType = true;
            if (selectedTypeFilter !== 'Todos los tipos') {
                matchesType = task.title.includes(`[${selectedTypeFilter}]`);
            }

            return matchesSearch && matchesRange && matchesType;
        });
    };

    const filteredEvents = getFilteredEvents();

    // Get events for specific monthly day
    const getDayEvents = (day) => {
        return tasks.filter(t => {
            const d = new Date(t.dueDate);
            return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
    };

    if (loading) return <div className="text-center py-20 text-zinc-500 font-medium">Cargando agenda...</div>;

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                    Calendario
                </h1>
                <p className="text-zinc-500 text-xs mt-1">Planificación y seguimiento de compromisos y entregas.</p>
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                
                {/* Left Card: Month Grid */}
                <div className="lg:col-span-8 bg-[#141416] border border-white/5 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                            {monthNames[currentMonth]} <span className="text-gray-500 font-normal">{currentYear}</span>
                        </h2>
                        <div className="flex items-center gap-1.5">
                            <button onClick={handlePrevMonth} className="p-1.5 bg-[#1e1e22] hover:bg-[#27272a] rounded-lg border border-white/5 text-gray-400 hover:text-white transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); }} className="px-3 py-1.5 bg-[#1e1e22] hover:bg-[#27272a] rounded-lg border border-white/5 text-xs text-gray-300 hover:text-white transition-colors font-medium">
                                Hoy
                            </button>
                            <button onClick={handleNextMonth} className="p-1.5 bg-[#1e1e22] hover:bg-[#27272a] rounded-lg border border-white/5 text-gray-400 hover:text-white transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Weekday Titles */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {weekdays.map(d => (
                            <span key={d} className="text-[10px] font-bold text-gray-500 uppercase tracking-widest py-2">{d}</span>
                        ))}
                    </div>

                    {/* Month Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {/* Offsets */}
                        {Array.from({ length: firstDayOffset }).map((_, i) => (
                            <div key={`offset-${i}`} className="aspect-square bg-transparent"></div>
                        ))}
                        
                        {/* Day Cells */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const isTodayDay = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                            const dayEvents = getDayEvents(day);
                            
                            return (
                                <button 
                                    key={day} 
                                    onClick={() => handleDayClick(day)}
                                    className={`aspect-square relative rounded-xl flex flex-col items-center justify-between p-2 transition-all group border border-transparent
                                        ${isTodayDay 
                                            ? 'bg-[#e63027] text-white font-bold shadow-[0_0_15px_rgba(230,48,39,0.3)] hover:bg-[#f43f5e]' 
                                            : 'bg-[#1a1a1f]/30 hover:bg-[#1e1e22] hover:border-white/10 text-gray-300'
                                        }
                                    `}
                                >
                                    <span className="text-xs font-semibold">{day}</span>
                                    
                                    {/* Event indicator dots */}
                                    {dayEvents.length > 0 && (
                                        <div className="flex gap-1 items-center justify-center flex-wrap max-w-full">
                                            {dayEvents.slice(0, 3).map((e, idx) => (
                                                <div 
                                                    key={e._id || idx} 
                                                    className="w-1.5 h-1.5 rounded-full" 
                                                    style={{ backgroundColor: e.color || '#6366f1' }}
                                                ></div>
                                            ))}
                                            {dayEvents.length > 3 && <span className="text-[7px] text-gray-500 font-bold leading-none">+</span>}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Card: Upcoming Events List */}
                <div className="lg:col-span-4 bg-[#141416] border border-white/5 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[300px]">
                    <div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Próximos eventos</span>
                            <span className="bg-[#e63027]/10 text-[#e63027] text-[10px] font-bold px-2 py-0.5 rounded">
                                {tasks.filter(t => new Date(t.dueDate) >= today.setHours(0,0,0,0)).length} activos
                            </span>
                        </div>

                        <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1 custom-scrollbar">
                            {tasks.filter(t => new Date(t.dueDate) >= new Date().setHours(0,0,0,0)).slice(0, 5).length === 0 ? (
                                <div className="text-center py-12 text-gray-600 text-xs italic">Sin próximos eventos.</div>
                            ) : (
                                tasks.filter(t => new Date(t.dueDate) >= new Date().setHours(0,0,0,0)).slice(0, 5).map(task => (
                                    <div key={task._id} className="bg-[#1a1a1f] p-3 rounded-xl border border-white/5 hover:border-gray-700 transition-colors flex items-start gap-3">
                                        <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: task.color || '#6366f1' }}></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white truncate leading-tight">{task.title}</p>
                                            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-500 font-medium">
                                                <Clock size={10} />
                                                <span>{new Date(task.dueDate).toLocaleDateString('es-AR')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    
                    <button onClick={() => { setSelectedDate(new Date().toISOString().split('T')[0]); setIsModalOpen(true); }} className="w-full mt-4 py-2.5 bg-[#e63027] hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(230,48,39,0.2)] flex items-center justify-center gap-2">
                        <Plus size={14} /> Agendar compromiso
                    </button>
                </div>
            </div>

            {/* Filtering Bar */}
            <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 space-y-4 shadow-sm w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* Tabs */}
                    <div className="flex border-b border-white/5 w-full md:w-auto gap-6">
                        {['Proximos', 'Pasados', 'Todos'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-2 text-xs font-bold transition-all relative uppercase tracking-wider ${activeTab === tab ? 'text-[#e63027]' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {tab === 'Proximos' ? 'Próximos' : tab}
                                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#e63027] rounded-t-full"></div>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Search query */}
                    <div className="flex items-center bg-[#1e1e22] rounded-lg px-3 py-2 border border-white/5 text-gray-400 focus-within:border-gray-500 transition-colors">
                        <Search size={14} className="shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Buscar título, notas..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs w-full ml-2 text-white placeholder-gray-600"
                        />
                    </div>
                    {/* Date Pickers */}
                    <div className="flex items-center bg-[#1e1e22] rounded-lg px-3 py-2 border border-white/5 text-gray-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider mr-2 shrink-0">Desde:</span>
                        <input 
                            type="date" 
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs text-white w-full font-medium"
                        />
                    </div>
                    <div className="flex items-center bg-[#1e1e22] rounded-lg px-3 py-2 border border-white/5 text-gray-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider mr-2 shrink-0">Hasta:</span>
                        <input 
                            type="date" 
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs text-white w-full font-medium"
                        />
                    </div>
                    {/* Category Select */}
                    <div className="bg-[#1e1e22] rounded-lg border border-white/5 flex items-center px-3 py-2 text-gray-400">
                        <Filter size={12} className="mr-2 shrink-0" />
                        <select 
                            value={selectedTypeFilter}
                            onChange={(e) => setSelectedTypeFilter(e.target.value)}
                            className="bg-transparent text-xs text-white outline-none w-full appearance-none font-medium cursor-pointer"
                        >
                            <option value="Todos los tipos">Todos los tipos</option>
                            {eventTypes.map(t => (
                                <option key={t} value={t} className="bg-[#1e1e22]">{t}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Event List Results */}
            <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-[#1a1a1f] px-4 py-3 border-b border-white/5 flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
                    <span>Lista de Eventos ({filteredEvents.length} encontrados)</span>
                </div>
                <div className="divide-y divide-white/5">
                    {filteredEvents.length === 0 ? (
                        <div className="p-12 text-center text-sm text-gray-500 flex flex-col items-center justify-center gap-2">
                            <CalendarIcon size={32} className="text-gray-700" />
                            <span>Sin resultados / Todavía no hay eventos cargados.</span>
                        </div>
                    ) : (
                        filteredEvents.map(event => (
                            <div key={event._id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-[#1a1a1f] transition-colors group">
                                <div className="flex items-start gap-4">
                                    {/* Color box */}
                                    <div className="w-1.5 h-10 rounded-full shrink-0 mt-1" style={{ backgroundColor: event.color || '#6366f1' }}></div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-white">{event.title}</h4>
                                        <p className="text-xs text-gray-400 max-w-xl whitespace-pre-line leading-relaxed">{event.description || 'Sin descripción adicional.'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t border-white/5 sm:border-none pt-3 sm:pt-0">
                                    <div className="flex flex-col sm:items-end">
                                        <span className="text-xs font-bold text-white">{new Date(event.dueDate).toLocaleDateString('es-AR')}</span>
                                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Fecha límite</span>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteEvent(event._id)}
                                        className="p-2 bg-[#e63027]/10 hover:bg-[#e63027]/20 border border-[#e63027]/20 text-[#e63027] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Eliminar evento"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Gorgeous Dual-Column Nuevo Evento Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#141416] w-full max-w-3xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Nuevo Evento</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white p-1 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEvent} className="p-6 flex flex-col md:flex-row gap-6">
                            {/* Left Column: Detalles */}
                            <div className="flex-1 space-y-4">
                                <span className="text-[10px] font-bold text-[#e63027] uppercase tracking-wider block border-b border-white/5 pb-1">Detalles del Compromiso</span>
                                
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Título *</label>
                                    <input 
                                        type="text"
                                        required
                                        placeholder="Ej. Reunión con cliente, entrega Hilux"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full bg-[#1e1e22] border border-white/5 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-gray-500 transition-colors text-xs font-semibold"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Tipo *</label>
                                        <select 
                                            value={formData.type}
                                            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                            className="w-full bg-[#1e1e22] border border-white/5 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-gray-500 transition-colors text-xs font-semibold"
                                        >
                                            {eventTypes.map(t => (
                                                <option key={t} value={t} className="bg-[#1e1e22]">{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Fecha *</label>
                                        <input 
                                            type="date"
                                            required
                                            value={formData.date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                            className="w-full bg-[#1e1e22] border border-white/5 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-gray-500 transition-colors text-xs font-semibold font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Hora (opcional)</label>
                                        <input 
                                            type="time"
                                            value={formData.time}
                                            onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                                            className="w-full bg-[#1e1e22] border border-white/5 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-gray-500 transition-colors text-xs font-semibold font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Notificar a</label>
                                        <select 
                                            value={formData.notifyTo}
                                            onChange={(e) => setFormData(prev => ({ ...prev, notifyTo: e.target.value }))}
                                            className="w-full bg-[#1e1e22] border border-white/5 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-gray-500 transition-colors text-xs font-semibold"
                                        >
                                            <option value="Todos los sectores">Todos los sectores</option>
                                            <option value="Administración">Administración</option>
                                            <option value="Ventas">Ventas</option>
                                            <option value="CEO">CEO</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Color de Etiqueta</label>
                                    <div className="flex gap-2">
                                        {eventColors.map(c => (
                                            <button 
                                                type="button"
                                                key={c}
                                                onClick={() => setSelectedColor(c)}
                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-115
                                                    ${selectedColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}
                                                `}
                                                style={{ backgroundColor: c }}
                                            >
                                                {selectedColor === c && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Vinculación */}
                            <div className="flex-1 space-y-4">
                                <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider block border-b border-white/5 pb-1">Vinculación y Notas</span>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Cliente</label>
                                        <select 
                                            value={formData.client}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData(prev => ({ 
                                                    ...prev, 
                                                    client: val,
                                                    clientPhone: val === 'Sin cliente' ? '' : (val === 'Lucas Hidalgo' ? '+54 9 11 2345-6789' : '+54 9 11 9876-5432')
                                                }));
                                            }}
                                            className="w-full bg-[#1e1e22] border border-white/5 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-gray-500 transition-colors text-xs font-semibold"
                                        >
                                            <option value="Sin cliente">Sin cliente</option>
                                            <option value="Lucas Hidalgo">Lucas Hidalgo</option>
                                            <option value="María Eugenia">María Eugenia</option>
                                            <option value="Carlos Gardel">Carlos Gardel</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Teléfono Cliente</label>
                                        <input 
                                            type="text"
                                            placeholder="Ingresa teléfono"
                                            value={formData.clientPhone}
                                            onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                                            className="w-full bg-[#1e1e22] border border-white/5 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-gray-500 transition-colors text-xs font-semibold font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Vehículo del Stock</label>
                                    <select 
                                        value={formData.vehicle}
                                        onChange={(e) => setFormData(prev => ({ ...prev, vehicle: e.target.value }))}
                                        className="w-full bg-[#1e1e22] border border-white/5 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-gray-500 transition-colors text-xs font-semibold"
                                    >
                                        <option value="Sin vehículo">Sin vehículo</option>
                                        {cars.map(c => (
                                            <option key={c._id} value={`${c.brand} ${c.name} (${c.year})`}>{c.brand} {c.name} ({c.year})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Creador / Asignado</label>
                                    <input 
                                        type="text"
                                        disabled
                                        value="Lucashidalgo703"
                                        className="w-full bg-[#141416] border border-white/5 text-gray-500 px-3 py-2 rounded-lg text-xs font-semibold cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Descripción / Notas</label>
                                    <textarea 
                                        rows="2"
                                        placeholder="Escribe comentarios, notas o la agenda de la reunión..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                        className="w-full bg-[#1e1e22] border border-white/5 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-gray-500 transition-colors text-xs font-semibold resize-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-3">
                                    <button 
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 bg-[#1e1e22] hover:bg-[#27272a] border border-white/5 text-gray-300 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-5 py-2 bg-[#e63027] hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors shadow-[0_0_15px_rgba(230,48,39,0.2)]"
                                    >
                                        Crear Evento
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendario;
