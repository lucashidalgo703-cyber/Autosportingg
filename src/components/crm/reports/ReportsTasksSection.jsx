import React from 'react';
import { CalendarClock, CheckCircle2, Clock, Target, FileText, Gift, Star, PhoneCall } from 'lucide-react';

export default function ReportsTasksSection({ data }) {
    const { tasks } = data;

    const total = tasks.length;
    const pendientes = tasks.filter(t => t.status === 'pendiente').length;
    const completadas = tasks.filter(t => t.status === 'completada').length;
    
    const now = new Date();
    now.setHours(0,0,0,0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23,59,59,999);
    
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    next7Days.setHours(23,59,59,999);

    let vencidas = 0;
    let paraHoy = 0;
    let proximos7Dias = 0;

    // Distribution by Type (Pending only)
    const typeDist = {
        general: 0,
        cobranza: 0,
        venta: 0,
        lead: 0,
        documentacion: 0,
        entrega: 0,
        postventa: 0
    };

    tasks.forEach(t => {
        if (t.status === 'pendiente') {
            const due = new Date(t.dueDate);
            due.setHours(0,0,0,0);

            if (due < now) vencidas++;
            else if (due.getTime() === now.getTime()) paraHoy++;
            else if (due <= next7Days) proximos7Dias++;

            const type = t.type || 'general';
            if (typeDist[type] !== undefined) {
                typeDist[type]++;
            }
        }
    });

    const getTypeConfig = (type) => {
        switch(type) {
            case 'cobranza': return { label: 'Cobranzas', icon: Target, color: 'text-red-400', bg: 'bg-crm-red/10', border: 'border-red-500/20' };
            case 'venta': return { label: 'Ventas', icon: Target, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
            case 'documentacion': return { label: 'Documentación', icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
            case 'entrega': return { label: 'Entregas', icon: Gift, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' };
            case 'postventa': return { label: 'Postventa', icon: Star, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' };
            case 'lead': return { label: 'Leads', icon: PhoneCall, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
            default: return { label: 'General', icon: CalendarClock, color: 'text-neutral-400', bg: 'bg-neutral-500/10', border: 'border-neutral-500/20' };
        }
    };

    const activeTypes = Object.entries(typeDist).filter(([_, count]) => count > 0).sort((a,b) => b[1] - a[1]);

    return (
        <div className="bg-crm-bg border border-crm-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-6 border-b border-crm-border pb-4">
                <CalendarClock size={18} className="text-yellow-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Agenda y Productividad CRM</h3>
                <span className="ml-auto text-xs font-bold bg-crm-surface-raised text-white px-2 py-0.5 rounded">Pdtes: {pendientes}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Timeline Stats */}
                <div className="flex flex-col gap-3">
                    <div className="bg-crm-surface rounded-xl p-4 flex items-center justify-between border border-crm-border">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-crm-red/10 text-crm-red flex items-center justify-center border border-red-500/20">
                                <Clock size={16} />
                            </div>
                            <span className="text-sm font-bold text-white">Vencidas</span>
                        </div>
                        <span className="text-xl font-bold text-crm-red">{vencidas}</span>
                    </div>

                    <div className="bg-crm-surface rounded-xl p-4 flex items-center justify-between border border-crm-border">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center border border-yellow-500/20">
                                <Target size={16} />
                            </div>
                            <span className="text-sm font-bold text-white">Para Hoy</span>
                        </div>
                        <span className="text-xl font-bold text-yellow-500">{paraHoy}</span>
                    </div>

                    <div className="bg-crm-surface rounded-xl p-4 flex items-center justify-between border border-crm-border">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                                <CalendarClock size={16} />
                            </div>
                            <span className="text-sm font-bold text-white">Próx. 7 Días</span>
                        </div>
                        <span className="text-xl font-bold text-blue-500">{proximos7Dias}</span>
                    </div>
                </div>

                {/* Distribution by Type */}
                <div className="md:col-span-2">
                    <h4 className="text-[10px] text-neutral-400 uppercase font-bold mb-3">Distribución de Tareas Pendientes</h4>
                    {activeTypes.length === 0 ? (
                        <div className="text-sm text-neutral-500 italic p-4 bg-crm-surface rounded-xl border border-crm-border">
                            No hay tareas pendientes.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {activeTypes.map(([type, count]) => {
                                const config = getTypeConfig(type);
                                const Icon = config.icon;
                                return (
                                    <div key={type} className="bg-crm-surface p-3 rounded-lg border border-crm-border flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-md flex items-center justify-center border ${config.bg} ${config.color} ${config.border}`}>
                                            <Icon size={14} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-neutral-400">{config.label}</div>
                                            <div className="text-base font-bold text-white">{count}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-crm-border flex items-center gap-4">
                        <div className="flex-1">
                            <div className="text-[10px] text-neutral-400 uppercase font-bold mb-1">Tareas Totales (Histórico)</div>
                            <div className="text-lg font-bold text-white">{total}</div>
                        </div>
                        <div className="flex-1">
                            <div className="text-[10px] text-neutral-400 uppercase font-bold mb-1">Completadas (Rendimiento)</div>
                            <div className="flex items-center gap-2">
                                <div className="text-lg font-bold text-green-400">{completadas}</div>
                                <span className="text-xs text-neutral-500 font-bold">({total > 0 ? Math.round((completadas/total)*100) : 0}%)</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
