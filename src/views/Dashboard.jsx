"use client";
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Activity, ArrowUpRight, TrendingUp, Info, ChevronLeft, ChevronRight, PenLine, Car, FileText, AlertTriangle, Gauge, LayoutDashboard } from 'lucide-react';
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
    
    // MOCK: CalendarDays array
    const CalendarDays = Array.from({ length: 31 }, (_, i) => i + 1);

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
                    setStats(data);
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
    }, []);

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
    
    // Shared classes for cards
    const cardClass = "bg-[#1e1e22] border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[160px] group hover:border-gray-600 transition-colors";

    if (loading) {
        return (
            <div className="w-full min-h-screen bg-black text-[#fafafa] flex items-center justify-center">
                <div className="text-gray-500 font-medium text-sm">Cargando Cockpit...</div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-black text-[#fafafa] p-6 space-y-8 overflow-x-hidden custom-scrollbar">
            
            {/* Fila 1: Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="flex flex-col space-y-1">
                    <h1 className="text-2xl font-semibold text-white">Hola, Bondoliona</h1>
                    <p className="text-xs text-gray-400">{dateDisplay}</p>
                </div>
                
                <button 
                    onClick={() => setHideAmounts(!hideAmounts)}
                    className="flex items-center gap-2 bg-[#1e1e22] hover:bg-[#1a1a1f] text-gray-400 hover:text-white px-3 py-2 rounded-lg transition-all border border-white/5 text-xs font-medium"
                >
                    {hideAmounts ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                    {hideAmounts ? 'Mostrar montos' : 'Ocultar montos'}
                </button>
            </div>

            {/* Fila 2: Pestañas (Diseño interactivo integrado) */}
            <div className="flex space-x-8 border-b border-white/5 pb-0 mb-6">
                <button 
                    onClick={() => setActiveTab('cockpit')}
                    className={`flex items-center gap-2 text-sm font-medium pb-3 transition-colors border-b-2 ${
                        activeTab === 'cockpit' 
                        ? 'text-red-500 border-red-500' 
                        : 'text-gray-400 border-transparent hover:text-white'
                    }`}
                >
                    <Gauge size={16} />
                    Cockpit CEO
                </button>
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-2 text-sm font-medium pb-3 transition-colors border-b-2 ${
                        activeTab === 'general' 
                        ? 'text-red-500 border-red-500' 
                        : 'text-gray-400 border-transparent hover:text-white'
                    }`}
                >
                    <LayoutDashboard size={16} />
                    Dashboard general
                </button>
            </div>

            {/* VISTA: COCKPIT CEO */}
            {activeTab === 'cockpit' && (
                <div className="space-y-8 animate-in fade-in duration-300">

            {/* Fila 3: Banner de Progreso */}
            <div className="w-full bg-[#581c87] rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between text-white shadow-[0_0_40px_rgba(88,28,135,0.4)] relative overflow-hidden">
                <div className="space-y-1 relative z-10">
                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-75">Cockpit CEO</span>
                    <h2 className="text-2xl font-bold tracking-tight">Buen día, Bondoliona</h2>
                    <p className="text-xs opacity-90 capitalize">{monthName} {year} — Día {currentDay} de {daysInMonth}</p>
                </div>
                
                <div className="mt-6 md:mt-0 flex flex-col md:items-end w-full md:w-64 space-y-2 relative z-10">
                    <div className="flex justify-between items-end w-full">
                        <span className="text-xs font-semibold opacity-90 tracking-wide uppercase">AVANCE DEL MES</span>
                        <span className="text-xl font-bold leading-none">{monthProgress}%</span>
                    </div>
                    <div className="w-full bg-indigo-900/50 h-2 rounded-full overflow-hidden">
                        <div className="bg-white h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${monthProgress}%` }}></div>
                    </div>
                    <span className="text-[10px] opacity-75 md:self-end">{currentDay} de {daysInMonth} días</span>
                </div>
            </div>

            {/* Fila 4: Selector de Mes */}
            <div className="w-full bg-[#1e1e24]/40 border border-white/5 rounded-2xl p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-[#33333a] rounded-md transition-colors text-gray-400 hover:text-white">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-semibold text-gray-300">
                        Viendo Cockpit de: <span className="text-white">Mes Actual</span>
                    </span>
                    <button className="p-1 hover:bg-[#33333a] rounded-md transition-colors text-gray-400 hover:text-white" disabled>
                        <ChevronRight size={16} className="opacity-50" />
                    </button>
                </div>
                <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1.5 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> EN VIVO
                </div>
            </div>

            {/* Fila 5: Métricas Principales (2 Columnas) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
                
                {/* Autos Vendidos */}
                <div className={cardClass}>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-normal text-[#8a8a8e] uppercase tracking-widest">Autos Vendidos</p>
                        <Car size={16} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-semibold tracking-tight">{hideAmounts ? '***' : stats.soldCarsThisMonth}</h3>
                            <span className="text-sm font-medium text-gray-500">/ {salesTarget} obj</span>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5">
                        <p className="text-[11px] font-medium text-gray-400">
                            PROY. FIN MES: {hideAmounts ? '***' : projectedSales}
                        </p>
                    </div>
                </div>

                {/* Ganancia del Mes */}
                <div className={cardClass}>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-normal text-[#8a8a8e] uppercase tracking-widest">Ganancia del Mes</p>
                        <Activity size={16} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                        <h3 className="text-2xl font-semibold text-emerald-400 mb-1">
                            {hideAmounts ? '***' : `USD ${simulatedRevenueUSD.toLocaleString()}`}
                        </h3>
                        <button className="text-[10px] text-gray-500 hover:text-white underline decoration-dotted transition-colors self-start">
                            Ver detalle del cálculo
                        </button>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5">
                        <div className="flex justify-between items-center w-full text-[11px] text-gray-500">
                            <span>OBJ: USD 110.000</span>
                            <span>PROY: USD 0</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Fila 6: Métricas Secundarias (3 Columnas) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
                
                {/* Ganancia por Auto */}
                <div className={cardClass}>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-normal text-[#8a8a8e] uppercase tracking-widest">Ganancia × Auto (USD)</p>
                        <TrendingUp size={14} className="text-gray-500" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center space-y-2">
                        <div className="flex justify-between items-center pb-1 border-b border-white/5/50">
                            <span className="text-[11px] font-semibold text-gray-300">HIST 2025</span>
                            <span className="text-[13px] font-medium text-white">{hideAmounts ? '***' : '1,250'}</span>
                        </div>
                        <div className="flex justify-between items-center pb-1 border-b border-white/5/50">
                            <span className="text-[11px] font-medium text-gray-500">HIST 2024</span>
                            <span className="text-[13px] font-medium text-gray-400">{hideAmounts ? '***' : '1,100'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[11px] font-medium text-gray-500">HIST 2023</span>
                            <span className="text-[13px] font-medium text-gray-400">{hideAmounts ? '***' : '980'}</span>
                        </div>
                    </div>
                </div>

                {/* Tu Operación */}
                <div className={cardClass}>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-normal text-[#8a8a8e] uppercase tracking-widest">Tu Operación</p>
                        <div className="text-[9px] font-bold bg-[#1e1e24] border border-white/5 text-gray-400 px-1.5 py-0.5 rounded uppercase">
                            YTD
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-2xl font-semibold tracking-tight">{hideAmounts ? '***' : '42%'}</span>
                            <span className="text-xs font-medium text-gray-500">del total anual</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-medium text-gray-400">
                            <span>Posición: <span className="text-white">#2</span></span>
                            <span>Total: <span className="text-white">{hideAmounts ? '***' : '84 uds'}</span></span>
                        </div>
                    </div>
                </div>

                {/* Mismo Mes - Año Anterior */}
                <div className={cardClass}>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-normal text-[#8a8a8e] uppercase tracking-widest">Mismo Mes - Año Anterior</p>
                        <Info size={14} className="text-gray-500" />
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-gray-600 italic">Sin datos del año anterior</p>
                    </div>
                </div>

            </div>

            {/* 1. Fila de Operaciones Especiales (2 Columnas) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full mt-5">
              {/* Ganancia Infracciones */}
              <div className="bg-[#1e1e22] border border-white/5 rounded-2xl p-5 flex flex-col justify-between text-xs text-gray-400 transition-colors">
                <div className="flex justify-between items-center text-gray-400 uppercase tracking-wider font-medium">
                  <span>¡ Ganancia Infracciones · Mes</span>
                  <span className="text-[10px] opacity-60">0 gestionadas</span>
                </div>
                <div className="my-4">
                  <span className="text-2xl font-medium text-white">{hideAmounts ? '***' : 'ARS 0'}</span>
                </div>
                <div className="space-y-1 pt-2 border-t border-white/5 text-[11px] font-normal">
                  <div className="flex justify-between"><span>Ganancia Bruta (Cliente - Real)</span><span className="text-white">{hideAmounts ? '***' : 'ARS 0'}</span></div>
                  <div className="flex justify-between"><span>Parte Sote (70% / 30% en planilla Cely)</span><span className="text-white">{hideAmounts ? '***' : 'ARS 0'}</span></div>
                  <div className="text-gray-500 italic mt-1">Sin Infracciones gestionadas este mes</div>
                </div>
              </div>

              {/* Gestoría / Transferencias */}
              <div className="bg-[#1e1e22] border border-white/5 rounded-2xl p-5 flex flex-col justify-between text-xs text-gray-400 transition-colors">
                <div className="flex justify-between items-center text-gray-400 uppercase tracking-wider font-medium">
                  <span>📁 Gestoría / Transferencias · Mes</span>
                  <span className="text-[10px] opacity-60">0 expedientes</span>
                </div>
                <div className="my-4">
                  <span className="text-2xl font-medium text-white">{hideAmounts ? '***' : 'ARS 0'}</span>
                </div>
                <div className="pt-2 border-t border-white/5 text-[11px] text-gray-500 italic font-normal">
                  Sin gastos cargados a compradores este mes. Total cobrado a compradores por transferencias, gestoría y trámites.
                </div>
              </div>
            </div>

            {/* 2. Módulo de Calificaciones de Ventas (Fondo Verde Sutil) */}
            <div className="bg-[#0c1912] border border-[#1b3d2b] p-4 rounded-2xl w-full mt-5 text-gray-300">
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#4ade80] mb-3">
                <span>⭐ Calificaciones de ventas — mes en curso</span>
                <span className="text-[10px] text-gray-400 font-normal ml-2">0 recibidas · 0 pedidas · 0% del total</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <span className="text-[10px] text-gray-400 tracking-wider block">PROMEDIO</span>
                  <span className="text-xl font-medium text-white block mt-0.5">Sin calif.</span>
                  <span className="text-[10px] text-gray-500 mt-1 block">Pedile a los compradores que califiquen</span>
                </div>
                <div className="space-y-1 text-[11px] text-gray-400">
                  <span className="text-[10px] tracking-wider block text-gray-500 mb-1">DISTRIBUCIÓN</span>
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <div key={stars} className="flex items-center space-x-1 text-[11px]">
                      <span className="w-3 text-right">{stars}★</span>
                      <div className="bg-gray-900 h-1 rounded-full w-24 overflow-hidden">
                        <div className="bg-gray-700 h-full" style={{ width: '0%' }}></div>
                      </div>
                      <span className="w-4 text-right text-gray-500">0</span>
                    </div>
                  ))}
                </div>
                <div className="border-l border-gray-800/80 pl-4">
                  <span className="text-[10px] text-gray-400 tracking-wider block mb-1">🏆 MEJOR CALIFICADO</span>
                  <span className="text-[10px] text-gray-500 italic block mt-1">Falta más datos (mín. 2 calificaciones por vendedor para rankear).</span>
                </div>
              </div>
            </div>

            {/* 3. Módulo de Proyección de Caja */}
            <div className="bg-[#1e1e22] border border-white/5 rounded-2xl p-6 w-full mt-5">
              <div className="flex justify-between items-center text-xs font-semibold text-white border-b border-white/5 pb-3 mb-4">
                <span className="flex items-center space-x-2 text-[13px]">💼 Proyección de caja</span>
                <span className="text-[10px] text-gray-400 font-normal">0 entradas · 0 salidas previstas <span className="text-yellow-500 cursor-pointer ml-1 hover:underline">Ver más →</span></span>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-[#1e1e22] p-4 rounded-xl border border-white/5 hover:border-gray-600 transition-colors">
                  <span className="text-[10px] text-[#8a8a8e] font-normal uppercase tracking-widest block mb-2">SALDO ACTUAL</span>
                  <span className="text-[15px] font-medium text-white">{hideAmounts ? '***' : 'USD 0'}</span>
                </div>
                <div className="bg-[#1e1e22] p-4 rounded-xl border border-white/5 hover:border-[#4ade80]/50 transition-colors">
                  <span className="text-[10px] text-[#8a8a8e] font-normal uppercase tracking-widest block mb-2">↗ A COBRAR</span>
                  <span className="text-[15px] font-medium text-[#4ade80]">{hideAmounts ? '***' : 'USD 0'}</span>
                </div>
                <div className="bg-[#1e1e22] p-4 rounded-xl border border-white/5 hover:border-[#fb7185]/50 transition-colors">
                  <span className="text-[10px] text-[#8a8a8e] font-normal uppercase tracking-widest block mb-2">↘ A PAGAR</span>
                  <span className="text-[15px] font-medium text-[#fb7185]">{hideAmounts ? '***' : 'USD 0'}</span>
                </div>
                <div className="bg-[#1e1e22] p-4 rounded-xl border border-white/5 hover:border-[#22d3ee]/50 transition-colors">
                  <span className="text-[10px] text-[#8a8a8e] font-normal uppercase tracking-widest block mb-2">~ RESULTADO</span>
                  <span className="text-[15px] font-medium text-[#22d3ee]">{hideAmounts ? '***' : 'USD 0'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-gray-400">
                <div className="bg-[#1e1e22]/50 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center text-[#4ade80] mb-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase">↑ ENTRADAS PREVISTAS</span>
                    <span className="bg-[#4ade80]/10 px-2 py-0.5 rounded text-[9px] font-medium">TOP 0</span>
                  </div>
                  <div className="italic text-gray-500 text-[10px] pt-1">Sin entradas previstas.</div>
                </div>
                <div className="bg-[#1e1e22]/50 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center text-rose-400 mb-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase">↓ SALIDAS PREVISTAS</span>
                    <span className="bg-rose-400/10 px-2 py-0.5 rounded text-[9px] font-medium">TOP 0</span>
                  </div>
                  <div className="italic text-gray-500 text-[10px] pt-1">Sin salidas previstas.</div>
                </div>
              </div>
              
              <div className="mt-5 text-[10px] text-gray-600 font-medium">
                  Mismos números que la pantalla x Cobrar/Pagar — a cobrar: valor de vehículos, cuotas y gastos del comprador; a pagar: pagos a propietarios, transferencias a registros y comisiones.
              </div>
            </div>

            {/* 4. Sección de Históricos y Resumen Anual */}
            <div className="space-y-6 mt-5">
                {/* Gráfico 12 meses */}
                <div className="bg-[#1e1e22] border border-white/5 rounded-2xl p-6 flex flex-col min-h-[300px]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div className="text-[10px] font-normal text-[#8a8a8e] uppercase tracking-widest">Últimos 12 meses - Ganancia USD</div>
                        <div className="flex items-center gap-4 text-[9px] font-medium uppercase tracking-widest">
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-600"></span><span className="text-gray-400">MES ACTUAL</span></div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4ade80]"></span><span className="text-gray-400">SUPERÓ OBJ</span></div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-600"></span><span className="text-gray-400">MES NORMAL</span></div>
                        </div>
                    </div>
                    <div className="flex-1 flex items-end justify-between gap-2 border-b border-white/5 pb-3 px-2 bg-[#1e1e22]/30 rounded-t-lg pt-4">
                       {/* Slim emerald bars */}
                       {[40, 60, 30, 80, 50, 90, 70, 45, 85, 55, 75, 65].map((h, i) => (
                           <div key={i} className="flex flex-col justify-end w-full items-center h-full">
                               <div className="w-3 md:w-5 bg-[#4ade80] rounded-t-sm transition-all hover:bg-emerald-400 opacity-80" style={{ height: `${h}%` }}></div>
                           </div>
                       ))}
                    </div>
                    <div className="flex justify-between mt-3 text-[10px] text-gray-500 uppercase font-medium px-2">
                        <span className="w-8 text-center">Ene<br/><span className="text-[8px] opacity-50">25</span></span>
                        <span className="w-8 text-center">Feb<br/><span className="text-[8px] opacity-50">25</span></span>
                        <span className="w-8 text-center">Mar<br/><span className="text-[8px] opacity-50">25</span></span>
                        <span className="w-8 text-center">Abr<br/><span className="text-[8px] opacity-50">25</span></span>
                        <span className="w-8 text-center">May<br/><span className="text-[8px] opacity-50">25</span></span>
                        <span className="w-8 text-center">Jun<br/><span className="text-[8px] opacity-50">25</span></span>
                        <span className="w-8 text-center">Jul<br/><span className="text-[8px] opacity-50">25</span></span>
                        <span className="w-8 text-center">Ago<br/><span className="text-[8px] opacity-50">25</span></span>
                        <span className="w-8 text-center">Sep<br/><span className="text-[8px] opacity-50">25</span></span>
                        <span className="w-8 text-center">Oct<br/><span className="text-[8px] opacity-50">25</span></span>
                        <span className="w-8 text-center">Nov<br/><span className="text-[8px] opacity-50">25</span></span>
                        <span className="w-8 text-center">Dic<br/><span className="text-[8px] opacity-50">25</span></span>
                    </div>
                </div>
                
                {/* Resumen Anual Horizontal */}
                <div className="bg-[#1e1e22] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-purple-400 bg-purple-400/10 p-1.5 rounded-lg"><Activity size={16} /></span>
                        <span className="text-[10px] font-normal text-[#8a8a8e] uppercase tracking-widest">Resumen Anual</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[year-4, year-3, year-2, year-1, year].map((y, idx) => (
                            <div key={y} className="bg-[#1a1a1f] border border-white/5 rounded-lg p-4 flex flex-col justify-between hover:border-gray-600 transition-colors">
                                <span className="text-[11px] text-gray-500 font-medium mb-3 tracking-wider">{y} {idx === 4 ? '- EN CURSO' : ''}</span>
                                <div>
                                    <span className="text-xl font-medium text-white block mb-1">{hideAmounts ? '***' : '0'} <span className="text-[10px] text-gray-500 font-normal ml-1 tracking-widest">AUTOS</span></span>
                                    <span className="text-[13px] text-gray-400">{hideAmounts ? '***' : 'USD 0'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            </div>
            )}

            {/* VISTA: DASHBOARD GENERAL (Contenedor de diseño premium) */}
            {activeTab === 'general' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    
                    {/* Fila de Resúmenes Básicos */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Resumen de Inventario */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-normal text-[#8a8a8e] uppercase tracking-widest">Resumen de Inventario</p>
                                <Car size={16} className="text-gray-500" />
                            </div>
                            <div className="flex-1 flex flex-col justify-center">
                                <span className="text-3xl font-bold text-white">{hideAmounts ? '***' : totalCars}</span>
                                <span className="text-xs text-gray-500 mt-2">Vehículos activos en plataforma</span>
                            </div>
                        </div>

                        {/* Cotizaciones Activas */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-normal text-[#8a8a8e] uppercase tracking-widest">Cotizaciones Activas</p>
                                <FileText size={16} className="text-gray-500" />
                            </div>
                            <div className="flex-1 flex flex-col justify-center">
                                <span className="text-3xl font-bold text-white">{hideAmounts ? '***' : '1'}</span>
                                <span className="text-xs text-gray-500 mt-2">Operaciones en progreso</span>
                            </div>
                        </div>

                        {/* Tasa de Conversión */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-normal text-[#8a8a8e] uppercase tracking-widest">Tasa de Conversión</p>
                                <TrendingUp size={16} className="text-gray-500" />
                            </div>
                            <div className="flex-1 flex flex-col justify-center">
                                <span className="text-3xl font-bold text-white">{hideAmounts ? '***' : '0%'}</span>
                                <span className="text-xs text-gray-500 mt-2">Cierre exitoso sobre total</span>
                            </div>
                        </div>
                    </div>

                    {/* Estado del Stock Fleet Grid */}
                    <div className="bg-[#1e1e22] border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col justify-between group hover:border-gray-600 transition-colors">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Estado del Stock</span>
                            <span className="text-[10px] text-gray-500 font-normal">{totalCars} vehículos en total</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-[#141416] p-4 rounded-xl border border-white/5 hover:border-[#4ade80]/50 transition-colors">
                                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#4ade80] uppercase tracking-wider">
                                    <div className="w-1.5 h-1.5 bg-[#4ade80] rounded-full"></div>
                                    Disponibles
                                </div>
                                <span className="text-2xl font-bold text-white">{totalDisponibles}</span>
                            </div>
                            <div className="bg-[#141416] p-4 rounded-xl border border-white/5 hover:border-yellow-500/50 transition-colors">
                                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-yellow-500 uppercase tracking-wider">
                                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                                    Reservados
                                </div>
                                <span className="text-2xl font-bold text-white">{totalReservados}</span>
                            </div>
                            <div className="bg-[#141416] p-4 rounded-xl border border-white/5 hover:border-red-500/50 transition-colors">
                                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-red-500 uppercase tracking-wider">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                    Vendidos
                                </div>
                                <span className="text-2xl font-bold text-white">{totalVendidos}</span>
                            </div>
                            <div className="bg-[#141416] p-4 rounded-xl border border-white/5 hover:border-blue-500/50 transition-colors">
                                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-blue-500 uppercase tracking-wider">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                    En preparación
                                </div>
                                <span className="text-2xl font-bold text-white">{totalPreparacion}</span>
                            </div>
                        </div>
                    </div>

                    {/* Módulo de Proyección de Caja */}
                    <div className="bg-[#1e1e22] border border-white/5 rounded-2xl p-6 w-full">
                        <div className="flex justify-between items-center text-xs font-semibold text-white border-b border-white/5 pb-3 mb-4">
                            <span className="flex items-center space-x-2 text-[13px]">💼 Proyección de caja</span>
                            <span className="text-[10px] text-gray-400 font-normal">0 entradas · 0 salidas previstas <span className="text-yellow-500 cursor-pointer ml-1 hover:underline">Ver más →</span></span>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="bg-[#141416] p-4 rounded-xl border border-white/5 hover:border-gray-600 transition-colors">
                                <span className="text-[10px] text-[#8a8a8e] font-normal uppercase tracking-widest block mb-2">SALDO ACTUAL</span>
                                <span className="text-[15px] font-medium text-white">{hideAmounts ? '***' : 'USD 0'}</span>
                            </div>
                            <div className="bg-[#141416] p-4 rounded-xl border border-white/5 hover:border-[#4ade80]/50 transition-colors">
                                <span className="text-[10px] text-[#8a8a8e] font-normal uppercase tracking-widest block mb-2">↗ A COBRAR</span>
                                <span className="text-[15px] font-medium text-[#4ade80]">{hideAmounts ? '***' : 'USD 0'}</span>
                            </div>
                            <div className="bg-[#141416] p-4 rounded-xl border border-white/5 hover:border-[#fb7185]/50 transition-colors">
                                <span className="text-[10px] text-[#8a8a8e] font-normal uppercase tracking-widest block mb-2">↘ A PAGAR</span>
                                <span className="text-[15px] font-medium text-[#fb7185]">{hideAmounts ? '***' : 'USD 0'}</span>
                            </div>
                            <div className="bg-[#141416] p-4 rounded-xl border border-white/5 hover:border-[#22d3ee]/50 transition-colors">
                                <span className="text-[10px] text-[#8a8a8e] font-normal uppercase tracking-widest block mb-2">~ RESULTADO</span>
                                <span className="text-[15px] font-medium text-[#22d3ee]">{hideAmounts ? '***' : 'USD 0'}</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-gray-400">
                            <div className="bg-[#141416]/50 p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between items-center text-[#4ade80] mb-2">
                                    <span className="text-[10px] font-bold tracking-wider uppercase">↑ ENTRADAS PREVISTAS</span>
                                    <span className="bg-[#4ade80]/10 px-2 py-0.5 rounded text-[9px] font-medium">TOP 0</span>
                                </div>
                                <div className="italic text-gray-500 text-[10px] pt-1">Sin entradas previstas.</div>
                            </div>
                            <div className="bg-[#141416]/50 p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between items-center text-rose-400 mb-2">
                                    <span className="text-[10px] font-bold tracking-wider uppercase">↓ SALIDAS PREVISTAS</span>
                                    <span className="bg-rose-400/10 px-2 py-0.5 rounded text-[9px] font-medium">TOP 0</span>
                                </div>
                                <div className="italic text-gray-500 text-[10px] pt-1">Sin salidas previstas.</div>
                            </div>
                        </div>
                    </div>

                    {/* Gráficos Históricos */}
                    <div className="space-y-6">
                        {/* Gráfico 12 meses */}
                        <div className="bg-[#1e1e22] border border-white/5 rounded-2xl p-6 flex flex-col min-h-[300px]">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                <div className="text-[10px] font-normal text-[#8a8a8e] uppercase tracking-widest">Últimos 12 meses - Ganancia USD</div>
                                <div className="flex items-center gap-4 text-[9px] font-medium uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-600"></span><span className="text-gray-400">MES ACTUAL</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4ade80]"></span><span className="text-gray-400">SUPERÓ OBJ</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-600"></span><span className="text-gray-400">MES NORMAL</span></div>
                                </div>
                            </div>
                            <div className="flex-1 flex items-end justify-between gap-2 border-b border-white/5 pb-3 px-2 bg-[#1e1e22]/30 rounded-t-lg pt-4">
                               {/* Slim emerald bars */}
                               {[40, 60, 30, 80, 50, 90, 70, 45, 85, 55, 75, 65].map((h, i) => (
                                   <div key={i} className="flex flex-col justify-end w-full items-center h-full">
                                       <div className="w-3 md:w-5 bg-[#4ade80] rounded-t-sm transition-all hover:bg-emerald-400 opacity-80" style={{ height: `${h}%` }}></div>
                                   </div>
                               ))}
                            </div>
                            <div className="flex justify-between mt-3 text-[10px] text-gray-500 uppercase font-medium px-2">
                                <span className="w-8 text-center">Ene<br/><span className="text-[8px] opacity-50">25</span></span>
                                <span className="w-8 text-center">Feb<br/><span className="text-[8px] opacity-50">25</span></span>
                                <span className="w-8 text-center">Mar<br/><span className="text-[8px] opacity-50">25</span></span>
                                <span className="w-8 text-center">Abr<br/><span className="text-[8px] opacity-50">25</span></span>
                                <span className="w-8 text-center">May<br/><span className="text-[8px] opacity-50">25</span></span>
                                <span className="w-8 text-center">Jun<br/><span className="text-[8px] opacity-50">25</span></span>
                                <span className="w-8 text-center">Jul<br/><span className="text-[8px] opacity-50">25</span></span>
                                <span className="w-8 text-center">Ago<br/><span className="text-[8px] opacity-50">25</span></span>
                                <span className="w-8 text-center">Sep<br/><span className="text-[8px] opacity-50">25</span></span>
                                <span className="w-8 text-center">Oct<br/><span className="text-[8px] opacity-50">25</span></span>
                                <span className="w-8 text-center">Nov<br/><span className="text-[8px] opacity-50">25</span></span>
                                <span className="w-8 text-center">Dic<br/><span className="text-[8px] opacity-50">25</span></span>
                            </div>
                        </div>
                        
                        {/* Resumen Anual Horizontal */}
                        <div className="bg-[#1e1e22] border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-purple-400 bg-purple-400/10 p-1.5 rounded-lg"><Activity size={16} /></span>
                                <span className="text-[10px] font-normal text-[#8a8a8e] uppercase tracking-widest">Resumen Anual</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {[year-4, year-3, year-2, year-1, year].map((y, idx) => (
                                    <div key={y} className="bg-[#141416] border border-white/5 rounded-lg p-4 flex flex-col justify-between hover:border-gray-600 transition-colors">
                                        <span className="text-[11px] text-gray-500 font-medium mb-3 tracking-wider">{y} {idx === 4 ? '- EN CURSO' : ''}</span>
                                        <div>
                                            <span className="text-xl font-medium text-white block mb-1">{hideAmounts ? '***' : '0'} <span className="text-[10px] text-gray-500 font-normal ml-1 tracking-widest">AUTOS</span></span>
                                            <span className="text-[13px] text-gray-400">{hideAmounts ? '***' : 'USD 0'}</span>
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
