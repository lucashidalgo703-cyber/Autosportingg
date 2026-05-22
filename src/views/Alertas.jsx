"use client";
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CalendarIcon, CheckCircle2, ChevronRight, Sparkles, User, Car as CarIcon, AlertCircle, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const Alertas = ({ cars = [] }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Todas'); // Todas, Alta, Novedades, Media, Baja

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
    }, []);

    const toggleTask = async (taskId) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const res = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ status: 'Completada' })
            });
            if (res.ok) {
                toast.success('Tarea marcada como completada');
                fetchTasks();
            }
        } catch (error) {
            toast.error('Error al actualizar la tarea');
        }
    };

    // 1. Calculate ALTA Alerts: Overdue tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = tasks.filter(t => {
        if (t.status === 'Completada') return false;
        const taskDate = new Date(t.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate < today;
    }).map(t => ({
        id: t._id,
        category: 'Alta',
        title: t.title,
        description: t.description || 'Tarea del calendario que requiere atención inmediata.',
        date: new Date(t.dueDate).toLocaleDateString('es-AR'),
        type: 'task',
        originalTask: t
    }));

    // 2. Calculate MEDIA Alerts: Vehicles without price or photos
    const stockWarnings = [];
    cars.forEach(car => {
        if (car.status === 'Disponible' || !car.status) {
            const hasNoPrice = !car.price || car.price === 0 || car.price === '0' || car.price === '';
            const hasNoPhotos = !car.images || car.images.length === 0;

            if (hasNoPrice) {
                stockWarnings.push({
                    id: `price-${car._id}`,
                    category: 'Media',
                    title: `Vehículo sin precio: ${car.brand} ${car.name}`,
                    description: `El vehículo de stock se encuentra marcado como DISPONIBLE pero no posee precio de venta asignado.`,
                    date: 'Pendiente',
                    type: 'stock-price',
                    carId: car._id
                });
            }
            if (hasNoPhotos) {
                stockWarnings.push({
                    id: `photo-${car._id}`,
                    category: 'Media',
                    title: `Vehículo sin imágenes: ${car.brand} ${car.name}`,
                    description: `El vehículo no posee fotografías en galería. Sube imágenes para mejorar su visualización en catálogo.`,
                    date: 'Pendiente',
                    type: 'stock-photo',
                    carId: car._id
                });
            }
        }
    });

    // 3. MOCK NOVEDADES & BAJA Alerts (Follow-ups, client birthdays, etc.)
    const novedadesAlerts = [
        {
            id: 'nov-1',
            category: 'Novedades',
            title: 'Actualización de Sistema CRM v2',
            description: 'Se completaron las migraciones del Cockpit CEO y el Calendario Ejecutivo de doble columna.',
            date: 'Hoy',
            type: 'system'
        }
    ];

    const bajaAlerts = [
        {
            id: 'baja-1',
            category: 'Baja',
            title: 'Cumpleaños de Lucas Hidalgo hoy 🎉',
            description: 'Lucas Hidalgo (Cliente de confianza) cumple años hoy. Envíale un saludo personalizado para fidelizar la relación.',
            date: 'Hoy',
            type: 'birthday',
            phone: '+54 9 11 2345-6789'
        }
    ];

    // Combine all alerts
    const allAlerts = [...overdueTasks, ...novedadesAlerts, ...stockWarnings, ...bajaAlerts];

    // Count categories
    const countAlta = overdueTasks.length;
    const countNovedades = novedadesAlerts.length;
    const countMedia = stockWarnings.length;
    const countBaja = bajaAlerts.length;

    // Filter by category selection
    const getFilteredAlerts = () => {
        if (activeTab === 'Todas') return allAlerts;
        return allAlerts.filter(a => a.category === activeTab);
    };

    const displayAlerts = getFilteredAlerts();

    if (loading) return <div className="text-center py-20 text-zinc-500 font-medium font-sans">Revisando panel de alertas del sistema...</div>;

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                    Alertas
                </h1>
                <p className="text-zinc-500 text-xs mt-1">Notificaciones dinámicas del sistema, tareas demoradas y avisos de stock.</p>
            </div>

            {/* Fila de Contadores Interactivos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Alta */}
                <button 
                    onClick={() => setActiveTab('Alta')}
                    className={`p-4 rounded-xl border flex flex-col justify-between items-start transition-all text-left group
                        ${activeTab === 'Alta' 
                            ? 'bg-red-500/10 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                            : 'bg-[#141416] border-white/5 hover:border-red-500/30'
                        }
                    `}
                >
                    <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Alta</span>
                        <AlertTriangle size={14} className="text-red-500" />
                    </div>
                    <span className="text-2xl font-bold text-white mt-4">{countAlta}</span>
                    <span className="text-[10px] text-gray-500 mt-1">Tareas demoradas</span>
                </button>

                {/* Novedades */}
                <button 
                    onClick={() => setActiveTab('Novedades')}
                    className={`p-4 rounded-xl border flex flex-col justify-between items-start transition-all text-left group
                        ${activeTab === 'Novedades' 
                            ? 'bg-green-500/10 border-green-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                            : 'bg-[#141416] border-white/5 hover:border-green-500/30'
                        }
                    `}
                >
                    <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Novedades</span>
                        <Sparkles size={14} className="text-green-500" />
                    </div>
                    <span className="text-2xl font-bold text-white mt-4">{countNovedades}</span>
                    <span className="text-[10px] text-gray-500 mt-1">Actualizaciones de sistema</span>
                </button>

                {/* Media */}
                <button 
                    onClick={() => setActiveTab('Media')}
                    className={`p-4 rounded-xl border flex flex-col justify-between items-start transition-all text-left group
                        ${activeTab === 'Media' 
                            ? 'bg-yellow-500/10 border-yellow-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                            : 'bg-[#141416] border-white/5 hover:border-yellow-500/30'
                        }
                    `}
                >
                    <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Media</span>
                        <Clock size={14} className="text-yellow-500" />
                    </div>
                    <span className="text-2xl font-bold text-white mt-4">{countMedia}</span>
                    <span className="text-[10px] text-gray-500 mt-1">Detalles de stock faltantes</span>
                </button>

                {/* Baja */}
                <button 
                    onClick={() => setActiveTab('Baja')}
                    className={`p-4 rounded-xl border flex flex-col justify-between items-start transition-all text-left group
                        ${activeTab === 'Baja' 
                            ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                            : 'bg-[#141416] border-white/5 hover:border-blue-500/30'
                        }
                    `}
                >
                    <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Baja</span>
                        <User size={14} className="text-blue-500" />
                    </div>
                    <span className="text-2xl font-bold text-white mt-4">{countBaja}</span>
                    <span className="text-[10px] text-gray-500 mt-1">Fidelización y cumpleaños</span>
                </button>
            </div>

            {/* Filter Clean / Clear button */}
            {activeTab !== 'Todas' && (
                <div className="flex justify-start">
                    <button 
                        onClick={() => setActiveTab('Todas')}
                        className="text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 bg-[#141416] border border-white/5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <span>Ver todas las alertas</span>
                        <ChevronRight size={12} />
                    </button>
                </div>
            )}

            {/* Panel Principal de Alertas */}
            <div className="space-y-4 w-full">
                {displayAlerts.length === 0 ? (
                    <div className="text-center py-16 bg-[#141416] rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full flex items-center justify-center shadow-lg">
                            <Check size={22} strokeWidth={3} />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-2">Todo en orden</h3>
                        <p className="text-gray-500 text-xs font-medium">No hay alertas de prioridad "{activeTab}" pendientes en este momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 w-full">
                        {displayAlerts.map(alert => {
                            // Define color tokens dynamically
                            let borderLeftColor = 'border-l-[#6366f1]';
                            let badgeBg = 'bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/20';
                            
                            if (alert.category === 'Alta') {
                                borderLeftColor = 'border-l-red-500';
                                badgeBg = 'bg-red-500/10 text-red-500 border-red-500/20';
                            } else if (alert.category === 'Novedades') {
                                borderLeftColor = 'border-l-green-500';
                                badgeBg = 'bg-green-500/10 text-green-500 border-green-500/20';
                            } else if (alert.category === 'Media') {
                                borderLeftColor = 'border-l-yellow-500';
                                badgeBg = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                            } else if (alert.category === 'Baja') {
                                borderLeftColor = 'border-l-blue-500';
                                badgeBg = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                            }

                            return (
                                <div 
                                    key={alert.id} 
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#141416] border border-white/5 hover:border-white/10 rounded-r-xl transition-all border-l-4 ${borderLeftColor} group`}
                                >
                                    <div className="flex-1 space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${badgeBg}`}>
                                                {alert.category}
                                            </span>
                                            <h4 className="text-sm font-bold text-white">{alert.title}</h4>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-2xl">{alert.description}</p>
                                        
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium pt-1">
                                            <Clock size={11} />
                                            <span>Estado: {alert.date}</span>
                                        </div>
                                    </div>

                                    {/* Action button */}
                                    <div className="shrink-0 flex items-center justify-start sm:justify-end border-t border-white/5 sm:border-none pt-3 sm:pt-0">
                                        {alert.type === 'task' && (
                                            <button 
                                                onClick={() => toggleTask(alert.id)}
                                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                                            >
                                                Marcar completado
                                            </button>
                                        )}
                                        {alert.type.startsWith('stock') && (
                                            <button 
                                                onClick={() => {
                                                    toast.success("Redirigiendo a edición de vehículo...");
                                                    window.location.href = '#stock';
                                                }}
                                                className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                                            >
                                                Cargar datos
                                            </button>
                                        )}
                                        {alert.type === 'birthday' && (
                                            <a 
                                                href={`https://wa.me/${alert.phone?.replace(/[^0-9]/g, '')}`}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-500 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
                                            >
                                                Enviar WhatsApp
                                            </a>
                                        )}
                                        {alert.type === 'system' && (
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest select-none">Al día</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Alertas;
