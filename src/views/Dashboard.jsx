"use client";
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Activity, ArrowUpRight, TrendingUp, Info, ChevronLeft, ChevronRight, PenLine, Car, FileText, AlertTriangle, Gauge, LayoutDashboard, Sparkles, DollarSign, Users, Award, ShieldAlert, BadgeHelp } from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = ({ cars = [] }) => {
    const [stats, setStats] = useState({
        stockCount: cars.length,
        leadsCount: 0,
        soldCarsThisMonth: 0,
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);
    const [hideAmounts, setHideAmounts] = useState(false);
    const [activeTab, setActiveTab] = useState('cockpit'); // cockpit, general
    
    // Real-time fleet metrics
    const totalCars = cars.length;
    const totalDisponibles = cars.filter(c => c.status === 'Disponible' || !c.status).length;
    const totalReservados = cars.filter(c => c.status === 'Señado').length;
    const totalVendidos = cars.filter(c => c.status === 'Vendido' || c.status === 'Vendido sin confirmar').length;
    const totalPreparacion = cars.filter(c => c.status === 'En preparación').length;

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL;
                const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
                const res = await fetch(`${baseUrl}/api/stats/dashboard`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setStats(prev => ({
                        ...prev,
                        ...data,
                        stockCount: cars.length
                    }));
                } else {
                    if (res.status === 401 || res.status === 403) {
                         toast.error('Sesión expirada.');
                         window.location.href = '/login';
                    }
                }
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [cars.length]);

    // Date calculations
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthProgress = Math.round((currentDay / daysInMonth) * 100);
    const monthName = today.toLocaleString('es-AR', { month: 'long' });
    const year = today.getFullYear();
    
    const formattedDate = today.toLocaleString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    const dateDisplay = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    // Business calculations
    const salesTarget = 30;
    const projectedSales = currentDay > 0 ? Math.round((stats.soldCarsThisMonth / currentDay) * daysInMonth) : 0;
    const simulatedRevenueUSD = stats.soldCarsThisMonth * 2500;
    
    // Shared classes matching CRM Sote spec
    const cardClass = "bg-[#18181b]/50 border border-[#27272a] rounded-2xl p-6 shadow-md shadow-black/10 flex flex-col justify-between group hover:border-[#3f3f46] transition-all duration-300";

    if (loading) {
        return (
            <div className="w-full min-h-screen bg-[#09090b] text-[#fafafa] flex items-center justify-center font-sans">
                <div className="text-zinc-500 font-medium text-xs tracking-wider uppercase">Cargando Cockpit...</div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-[#09090b] text-[#f4f4f5] p-6 space-y-8 overflow-x-hidden custom-scrollbar font-sans">
            
            {/* Header Fila 1 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#27272a] pb-6">
                <div className="flex flex-col space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-white">Hola, Bondoliona</h1>
                    <p className="text-xs text-zinc-500 font-medium tracking-wide uppercase">{dateDisplay}</p>
                </div>
                
                <button 
                    onClick={() => setHideAmounts(!hideAmounts)}
                    className="flex items-center gap-2 bg-[#18181b] hover:bg-zinc-800 text-zinc-400 hover:text-white px-3 py-2 rounded-lg transition-all border border-[#27272a] text-xs font-semibold uppercase tracking-wider"
                >
                    {hideAmounts ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
                    {hideAmounts ? 'Mostrar montos' : 'Ocultar montos'}
                </button>
            </div>

            {/* Pestañas de Navegación Fila 2 */}
            <div className="flex space-x-6 border-b border-[#27272a] pb-0 mb-6">
                <button 
                    onClick={() => setActiveTab('cockpit')}
                    className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider pb-3 transition-all border-b-2 ${
                        activeTab === 'cockpit' 
                        ? 'text-[#dc2626] border-[#dc2626]' 
                        : 'text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                >
                    <Gauge size={14} />
                    Cockpit CEO
                </button>
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider pb-3 transition-all border-b-2 ${
                        activeTab === 'general' 
                        ? 'text-[#dc2626] border-[#dc2626]' 
                        : 'text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                >
                    <LayoutDashboard size={14} />
                    Dashboard general
                </button>
            </div>

            {/* VISTA: COCKPIT CEO */}
            {activeTab === 'cockpit' && (
                <div className="space-y-6 animate-in fade-in duration-300">

                    {/* Banner de Progreso del Mes */}
                    <div className="w-full bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-zinc-950 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between text-white border border-purple-500/20 shadow-md shadow-black/20 relative overflow-hidden">
                        <div className="space-y-1 relative z-10">
                            <span className="text-[9px] uppercase tracking-widest font-extrabold text-purple-400 block">Cockpit CEO</span>
                            <h2 className="text-2xl font-bold tracking-tight">Buen día, Bondoliona</h2>
                            <p className="text-xs text-purple-300/80 font-medium capitalize mt-1">{monthName} {year} — Día {currentDay} de {daysInMonth}</p>
                        </div>
                        
                        <div className="mt-6 md:mt-0 flex flex-col md:items-end w-full md:w-80 space-y-2 relative z-10">
                            <div className="flex justify-between items-end w-full">
                                <span className="text-[10px] font-extrabold text-purple-300/80 tracking-wider uppercase">AVANCE DEL MES</span>
                                <span className="text-lg font-bold text-purple-400">{monthProgress}%</span>
                            </div>
                            <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
                                <div className="bg-purple-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${monthProgress}%` }}></div>
                            </div>
                            <span className="text-[10px] text-purple-300/60 font-semibold">{currentDay} de {daysInMonth} días transcurridos</span>
                        </div>
                    </div>

                    {/* Selector de Periodo */}
                    <div className="w-full bg-[#18181b]/50 border border-[#27272a] rounded-2xl p-3 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-2">
                            <button className="p-1.5 hover:bg-zinc-850 rounded-lg border border-white/5 text-zinc-400 hover:text-white transition-colors">
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                Viendo Cockpit de: <span className="text-white font-extrabold">Mes Actual</span>
                            </span>
                            <button className="p-1.5 hover:bg-zinc-850 rounded-lg border border-white/5 text-zinc-400 hover:text-white transition-colors" disabled>
                                <ChevronRight size={14} className="opacity-40" />
                            </button>
                        </div>
                        <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> En vivo
                        </div>
                    </div>

                    {/* Grilla de Métricas Principales (2 Columnas) */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
                        
                        {/* Autos Vendidos */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🚗</span>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Autos Vendidos</p>
                                </div>
                                <span className="text-[9px] font-bold bg-[#27272a] text-zinc-400 px-2 py-0.5 rounded-md uppercase">Mensual</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-center my-2">
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-5xl font-extrabold tracking-tighter text-white">{hideAmounts ? '***' : stats.soldCarsThisMonth}</h3>
                                    <span className="text-sm font-semibold text-zinc-500">/ {salesTarget} obj</span>
                                </div>
                                {/* Progress bar matching exact style */}
                                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-3">
                                    <div className="bg-[#dc2626] h-full" style={{ width: `${Math.min(100, (stats.soldCarsThisMonth / salesTarget) * 100)}%` }}></div>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-[#27272a]">
                                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                                    PROY. FIN MES: <span className="text-white font-extrabold">{hideAmounts ? '***' : projectedSales}</span>
                                </p>
                            </div>
                        </div>

                        {/* Ganancia del Mes */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">💵</span>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ganancia del Mes</p>
                                </div>
                                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 uppercase">En vivo</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-center my-2">
                                <h3 className="text-4xl font-extrabold text-emerald-400 tracking-tighter">
                                    {hideAmounts ? '***' : `USD ${simulatedRevenueUSD.toLocaleString()}`}
                                </h3>
                                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-1">ARS 0 (Cotización oficial)</p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-[#27272a] flex justify-between items-center">
                                <div className="flex gap-4 text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                                    <span>OBJ: <span className="text-white font-extrabold">USD 110.000</span></span>
                                    <span>PROY: <span className="text-zinc-500 font-extrabold">USD 0</span></span>
                                </div>
                                <button className="text-[10px] text-[#dc2626] font-bold hover:underline transition-colors uppercase tracking-wider flex items-center gap-1">
                                    <span>🔍 Ver detalle</span>
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Grilla de Métricas Secundarias (3 Columnas) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
                        
                        {/* Ganancia por Auto */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ganancia × Auto (USD)</p>
                                <TrendingUp size={14} className="text-zinc-500" />
                            </div>
                            <div className="flex-1 flex flex-col justify-center space-y-2 py-2">
                                <div className="flex justify-between items-center pb-1 border-b border-[#27272a]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">HIST</span>
                                        <span className="text-[11px] font-semibold text-zinc-300">Año 2025</span>
                                    </div>
                                    <span className="text-[13px] font-bold text-white">{hideAmounts ? '***' : 'USD 1,250'}</span>
                                </div>
                                <div className="flex justify-between items-center pb-1 border-b border-[#27272a]">
                                    <span className="text-[11px] font-semibold text-zinc-400 pl-8">Año 2024</span>
                                    <span className="text-[13px] font-semibold text-zinc-400">{hideAmounts ? '***' : 'USD 1,100'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-semibold text-zinc-400 pl-8">Año 2023</span>
                                    <span className="text-[13px] font-semibold text-zinc-400">{hideAmounts ? '***' : 'USD 980'}</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-[#27272a]">
                                <span className="text-[10px] text-zinc-500 font-medium italic">Métrica real de calidad — más importante que volumen.</span>
                            </div>
                        </div>

                        {/* Tu Operación */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tu Operación</p>
                                <span className="text-[9px] font-bold bg-[#27272a] text-zinc-400 px-2 py-0.5 rounded uppercase">YTD</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-center py-2">
                                <div className="flex items-baseline gap-2 mb-3">
                                    <span className="text-3xl font-extrabold text-white tracking-tight">{hideAmounts ? '***' : '0%'}</span>
                                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">participación del mes</span>
                                </div>
                                <div className="flex justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                                    <span>Traído + vendido: <span className="text-white">0 autos</span></span>
                                    <span>Posición: <span className="text-white">#0</span></span>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-[#27272a]">
                                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block">Mismo mes año anterior: <span className="text-zinc-600 font-bold">Sin datos</span></span>
                            </div>
                        </div>

                        {/* Histórico Comparativo */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Mismo Mes - Año Anterior</p>
                                <Info size={14} className="text-zinc-500" />
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                                <p className="text-xs text-zinc-600 italic">No se registran operaciones históricas cargadas para este mes en la base de datos.</p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-[#27272a]">
                                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block">Total acumulado: <span className="text-white font-extrabold">USD 0</span></span>
                            </div>
                        </div>

                    </div>

                    {/* Módulo Especial de Infracciones y Gestoría */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full mt-4">
                        {/* Infracciones */}
                        <div className="bg-[#18181b]/50 border border-[#27272a] rounded-2xl p-5 flex flex-col justify-between group hover:border-[#3f3f46] transition-all">
                            <div className="flex justify-between items-center text-zinc-400 uppercase tracking-wider font-bold text-[10px]">
                                <span className="flex items-center gap-1.5">🚨 Ganancia Infracciones · Mes</span>
                                <span className="text-[10px] text-zinc-500 font-normal">0 gestionadas</span>
                            </div>
                            <div className="my-4">
                                <span className="text-2xl font-extrabold text-white tracking-tight">{hideAmounts ? '***' : 'ARS 0'}</span>
                            </div>
                            <div className="space-y-1.5 pt-3 border-t border-[#27272a] text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                                <div className="flex justify-between"><span>Ganancia Bruta (Cliente - Real)</span><span className="text-white font-extrabold">{hideAmounts ? '***' : 'ARS 0'}</span></div>
                                <div className="flex justify-between"><span>Parte Sote (70% / 30% planilla)</span><span className="text-white font-extrabold">{hideAmounts ? '***' : 'ARS 0'}</span></div>
                            </div>
                        </div>

                        {/* Gestoría */}
                        <div className="bg-[#18181b]/50 border border-[#27272a] rounded-2xl p-5 flex flex-col justify-between group hover:border-[#3f3f46] transition-all">
                            <div className="flex justify-between items-center text-zinc-400 uppercase tracking-wider font-bold text-[10px]">
                                <span className="flex items-center gap-1.5">📁 Gestoría / Transferencias</span>
                                <span className="text-[10px] text-zinc-500 font-normal">0 expedientes</span>
                            </div>
                            <div className="my-4">
                                <span className="text-2xl font-extrabold text-white tracking-tight">{hideAmounts ? '***' : 'ARS 0'}</span>
                            </div>
                            <div className="pt-3 border-t border-[#27272a] text-[11px] text-zinc-500 italic font-medium">
                                No se registran gastos cobrados a compradores por transferencias, gestoría y trámites en este periodo.
                            </div>
                        </div>
                    </div>

                    {/* Módulo Calificaciones de Ventas */}
                    <div className="bg-[#0c1912]/80 border border-[#1b3d2b] p-6 rounded-2xl w-full text-zinc-300">
                        <div className="flex items-center justify-between text-xs font-bold text-[#4ade80] mb-4 uppercase tracking-wider">
                            <span className="flex items-center gap-2">⭐ Calificaciones de ventas — mes en curso</span>
                            <span className="text-[10px] text-zinc-500 font-normal">0 recibidas · 0 pedidas · 0% del total</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                            <div className="space-y-1">
                                <span className="text-[10px] text-zinc-400 tracking-wider block font-bold uppercase">PROMEDIO</span>
                                <span className="text-3xl font-extrabold text-white block mt-0.5">Sin calif.</span>
                                <span className="text-[10px] text-zinc-500 font-medium block">Pide a tus compradores que califiquen su experiencia</span>
                            </div>
                            <div className="space-y-1 text-[11px] text-zinc-400 font-semibold">
                                <span className="text-[10px] tracking-wider block text-zinc-500 font-bold mb-2">DISTRIBUCIÓN</span>
                                {[5, 4, 3, 2, 1].map((stars) => (
                                    <div key={stars} className="flex items-center space-x-2 text-[10px]">
                                        <span className="w-4 text-right text-zinc-400 font-bold">{stars}★</span>
                                        <div className="bg-zinc-950 h-1 rounded-full w-32 overflow-hidden border border-white/5">
                                            <div className="bg-amber-400 h-full" style={{ width: '0%' }}></div>
                                        </div>
                                        <span className="w-4 text-left text-zinc-600 font-bold">0</span>
                                    </div>
                                ))}
                            </div>
                            <div className="border-l border-zinc-800/80 pl-6 h-full flex flex-col justify-center">
                                <span className="text-[10px] text-zinc-400 tracking-wider block font-bold uppercase">🏆 MEJOR CALIFICADO</span>
                                <span className="text-[11px] text-zinc-500 italic block mt-2 font-medium">Falta más datos (mínimo 2 calificaciones por vendedor para rankear en el podio).</span>
                            </div>
                        </div>
                    </div>

                    {/* Proyección de Caja */}
                    <div className="bg-[#18181b]/50 border border-[#27272a] rounded-2xl p-6 w-full">
                        <div className="flex justify-between items-center text-xs font-bold text-white border-b border-[#27272a] pb-3 mb-4 uppercase tracking-wider">
                            <span className="flex items-center space-x-2 text-[13px]">💼 Proyección de caja</span>
                            <span className="text-[10px] text-zinc-500 font-normal">0 entradas · 0 salidas previstas <span className="text-yellow-500 cursor-pointer ml-1 hover:underline">Ver más →</span></span>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="bg-[#141416] p-4 rounded-xl border border-white/5 hover:border-zinc-700 transition-colors">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2">SALDO ACTUAL</span>
                                <span className="text-[15px] font-bold text-white">{hideAmounts ? '***' : 'USD 0'}</span>
                            </div>
                            <div className="bg-[#141416] p-4 rounded-xl border border-white/5 hover:border-emerald-500/40 transition-colors">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2">↗ A COBRAR</span>
                                <span className="text-[15px] font-bold text-emerald-400">{hideAmounts ? '***' : 'USD 0'}</span>
                            </div>
                            <div className="bg-[#141416] p-4 rounded-xl border border-white/5 hover:border-rose-500/40 transition-colors">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2">↘ A PAGAR</span>
                                <span className="text-[15px] font-bold text-rose-400">{hideAmounts ? '***' : 'USD 0'}</span>
                            </div>
                            <div className="bg-[#141416] p-4 rounded-xl border border-white/5 hover:border-cyan-500/40 transition-colors">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2">~ RESULTADO</span>
                                <span className="text-[15px] font-bold text-cyan-400">{hideAmounts ? '***' : 'USD 0'}</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                            <div className="bg-[#141416]/30 p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between items-center text-emerald-400 mb-2">
                                    <span className="text-[10px] font-extrabold tracking-wider uppercase">↑ ENTRADAS PREVISTAS</span>
                                    <span className="bg-[#4ade80]/10 px-2 py-0.5 rounded text-[9px] font-extrabold">TOP 0</span>
                                </div>
                                <div className="italic text-zinc-600 text-[10px] pt-1">Sin entradas previstas registradas.</div>
                            </div>
                            <div className="bg-[#141416]/30 p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between items-center text-rose-400 mb-2">
                                    <span className="text-[10px] font-extrabold tracking-wider uppercase">↓ SALIDAS PREVISTAS</span>
                                    <span className="bg-rose-400/10 px-2 py-0.5 rounded text-[9px] font-extrabold">TOP 0</span>
                                </div>
                                <div className="italic text-zinc-600 text-[10px] pt-1">Sin salidas previstas registradas.</div>
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {/* VISTA: DASHBOARD GENERAL */}
            {activeTab === 'general' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    
                    {/* Fila de Resúmenes Básicos */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Revenue del mes */}
                        <div className="bg-[#18181b]/50 border border-[#27272a] rounded-2xl p-5 shadow-sm hover:border-[#3f3f46] transition-all flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">REVENUE DEL MES</span>
                                <span className="text-2xl font-extrabold text-white tracking-tight">{hideAmounts ? '***' : `USD ${simulatedRevenueUSD.toLocaleString()}`}</span>
                            </div>
                            <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-lg border border-emerald-500/10">
                                <span className="text-xl">💰</span>
                            </div>
                        </div>

                        {/* Stock Activo */}
                        <div className="bg-[#18181b]/50 border border-[#27272a] rounded-2xl p-5 shadow-sm hover:border-[#3f3f46] transition-all flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">STOCK ACTIVO</span>
                                <span className="text-2xl font-extrabold text-white tracking-tight">{hideAmounts ? '***' : totalCars} u.</span>
                            </div>
                            <div className="bg-blue-500/10 text-blue-400 p-2.5 rounded-lg border border-blue-500/10">
                                <span className="text-xl">🔑</span>
                            </div>
                        </div>

                        {/* Operaciones del Mes */}
                        <div className="bg-[#18181b]/50 border border-[#27272a] rounded-2xl p-5 shadow-sm hover:border-[#3f3f46] transition-all flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">OPERACIONES</span>
                                <span className="text-2xl font-extrabold text-white tracking-tight">1</span>
                            </div>
                            <div className="bg-amber-500/10 text-amber-400 p-2.5 rounded-lg border border-amber-500/10">
                                <span className="text-xl">📊</span>
                            </div>
                        </div>

                        {/* Clientes Activos */}
                        <div className="bg-[#18181b]/50 border border-[#27272a] rounded-2xl p-5 shadow-sm hover:border-[#3f3f46] transition-all flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">CLIENTES ACTIVOS</span>
                                <span className="text-2xl font-extrabold text-white tracking-tight">3</span>
                            </div>
                            <div className="bg-purple-500/10 text-purple-400 p-2.5 rounded-lg border border-purple-500/10">
                                <span className="text-xl">👥</span>
                            </div>
                        </div>
                    </div>

                    {/* Estado del Stock (Réplica Visual Identica) */}
                    <div className="bg-[#18181b]/50 border border-[#27272a] rounded-2xl p-6 shadow-sm">
                        <div className="flex justify-between items-center border-b border-[#27272a] pb-3 mb-5">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Estado del Stock</span>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{totalCars} vehículos en total</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Disponible */}
                            <div className="bg-[#141416]/50 p-4 rounded-xl border border-white/5 hover:border-emerald-500/40 transition-colors">
                                <div className="flex items-center justify-between text-emerald-400 mb-2">
                                    <span className="text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Disponibles
                                    </span>
                                    <span className="text-xs font-extrabold">{hideAmounts ? '***' : totalDisponibles}</span>
                                </div>
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mt-1">Total: <span className="text-white">USD 0</span></span>
                                <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-3">
                                    <div className="bg-emerald-500 h-full" style={{ width: `${totalCars > 0 ? (totalDisponibles / totalCars) * 100 : 0}%` }}></div>
                                </div>
                            </div>

                            {/* Reservado */}
                            <div className="bg-[#141416]/50 p-4 rounded-xl border border-white/5 hover:border-amber-500/40 transition-colors">
                                <div className="flex items-center justify-between text-amber-400 mb-2">
                                    <span className="text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Reservados
                                    </span>
                                    <span className="text-xs font-extrabold">{hideAmounts ? '***' : totalReservados}</span>
                                </div>
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mt-1">Total: <span className="text-white">USD 0</span></span>
                                <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-3">
                                    <div className="bg-amber-500 h-full" style={{ width: `${totalCars > 0 ? (totalReservados / totalCars) * 100 : 0}%` }}></div>
                                </div>
                            </div>

                            {/* Vendido */}
                            <div className="bg-[#141416]/50 p-4 rounded-xl border border-white/5 hover:border-red-500/40 transition-colors">
                                <div className="flex items-center justify-between text-red-500 mb-2">
                                    <span className="text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Vendidos
                                    </span>
                                    <span className="text-xs font-extrabold">{hideAmounts ? '***' : totalVendidos}</span>
                                </div>
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mt-1">Total: <span className="text-white">USD 0</span></span>
                                <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-3">
                                    <div className="bg-red-500 h-full" style={{ width: `${totalCars > 0 ? (totalVendidos / totalCars) * 100 : 0}%` }}></div>
                                </div>
                            </div>

                            {/* En preparación */}
                            <div className="bg-[#141416]/50 p-4 rounded-xl border border-white/5 hover:border-blue-500/40 transition-colors">
                                <div className="flex items-center justify-between text-blue-400 mb-2">
                                    <span className="text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> En Prep.
                                    </span>
                                    <span className="text-xs font-extrabold">{hideAmounts ? '***' : totalPreparacion}</span>
                                </div>
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mt-1">Total: <span className="text-white">USD 0</span></span>
                                <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-3">
                                    <div className="bg-blue-500 h-full" style={{ width: `${totalCars > 0 ? (totalPreparacion / totalCars) * 100 : 0}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gráficos y Tablas Anuales */}
                    <div className="space-y-6">
                        {/* Gráfico 12 meses */}
                        <div className="bg-[#18181b]/50 border border-[#27272a] rounded-2xl p-6 flex flex-col min-h-[300px]">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Últimos 12 meses - Ganancia USD</div>
                                <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-600"></span><span className="text-zinc-500">MES ACTUAL</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-zinc-500">SUPERÓ OBJ</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-600"></span><span className="text-zinc-500">MES NORMAL</span></div>
                                </div>
                            </div>
                            <div className="flex-1 flex items-end justify-between gap-3 border-b border-[#27272a] pb-3 px-2 bg-zinc-950/20 rounded-t-lg pt-4">
                               {/* Slim emerald bars with hovers */}
                               {[40, 60, 30, 80, 50, 90, 70, 45, 85, 55, 75, 65].map((h, i) => (
                                   <div key={i} className="flex flex-col justify-end w-full items-center h-full relative group">
                                       <div className="w-4 md:w-6 bg-emerald-500/80 rounded-t-sm transition-all hover:bg-emerald-400 hover:scale-x-105 cursor-pointer" style={{ height: `${h}%` }}></div>
                                   </div>
                               ))}
                            </div>
                            <div className="flex justify-between mt-3 text-[10px] text-zinc-500 uppercase font-bold px-2">
                                <span className="w-8 text-center">Ene<br/><span className="text-[8px] opacity-40">25</span></span>
                                <span className="w-8 text-center">Feb<br/><span className="text-[8px] opacity-40">25</span></span>
                                <span className="w-8 text-center">Mar<br/><span className="text-[8px] opacity-40">25</span></span>
                                <span className="w-8 text-center">Abr<br/><span className="text-[8px] opacity-40">25</span></span>
                                <span className="w-8 text-center">May<br/><span className="text-[8px] opacity-40">25</span></span>
                                <span className="w-8 text-center">Jun<br/><span className="text-[8px] opacity-40">25</span></span>
                                <span className="w-8 text-center">Jul<br/><span className="text-[8px] opacity-40">25</span></span>
                                <span className="w-8 text-center">Ago<br/><span className="text-[8px] opacity-40">25</span></span>
                                <span className="w-8 text-center">Sep<br/><span className="text-[8px] opacity-40">25</span></span>
                                <span className="w-8 text-center">Oct<br/><span className="text-[8px] opacity-40">25</span></span>
                                <span className="w-8 text-center">Nov<br/><span className="text-[8px] opacity-40">25</span></span>
                                <span className="w-8 text-center">Dic<br/><span className="text-[8px] opacity-40">25</span></span>
                            </div>
                        </div>
                        
                        {/* Resumen Anual Horizontal */}
                        <div className="bg-[#18181b]/50 border border-[#27272a] rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-purple-400 bg-purple-400/10 p-1.5 rounded-lg border border-purple-500/10"><Activity size={14} /></span>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Resumen Anual Histórico</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {[year-4, year-3, year-2, year-1, year].map((y, idx) => (
                                    <div key={y} className="bg-[#141416]/50 border border-white/5 rounded-lg p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
                                        <span className="text-[10px] text-zinc-500 font-bold mb-3 tracking-wider">{y} {idx === 4 ? '- EN CURSO' : ''}</span>
                                        <div>
                                            <span className="text-xl font-bold text-white block mb-1">{hideAmounts ? '***' : '0'} <span className="text-[10px] text-zinc-500 font-normal ml-1 tracking-widest">AUTOS</span></span>
                                            <span className="text-[12px] text-zinc-400 font-semibold">{hideAmounts ? '***' : 'USD 0'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                </div>
            )}
        </div>
    );
};

export default Dashboard;
