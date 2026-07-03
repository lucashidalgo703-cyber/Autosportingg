"use client";
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Filter, Users, Eye, MousePointerClick, MessageCircle, FileText, CheckCircle2, TrendingDown } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';

export default function AnaliticaPage() {
    const { token } = useAuth();
    const [funnelData, setFunnelData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFunnel = async () => {
            if (!token) return;
            try {
                // In a real scenario, this fetches from /api/admin/analytics/funnel
                // Mocking it based on standard conversion rates for now until the backend is fully wired
                const mockData = [
                    { stage: 'Inicio', value: 1250, label: 'Sesiones Totales', icon: Users, color: '#3b82f6' },
                    { stage: 'Catálogo', value: 890, label: 'Vistas Inventario', icon: Filter, color: '#0ea5e9' },
                    { stage: 'Fichas', value: 450, label: 'Vistas Vehículos', icon: Eye, color: '#06b6d4' },
                    { stage: 'Interacción', value: 120, label: 'Clics WhatsApp / Formularios', icon: MousePointerClick, color: '#14b8a6' },
                    { stage: 'Leads', value: 85, label: 'Contactos Efectivos', icon: MessageCircle, color: '#10b981' },
                    { stage: 'Oportunidades', value: 45, label: 'En Negociación', icon: FileText, color: '#f59e0b' },
                    { stage: 'Ventas', value: 12, label: 'Cierres Exitosos', icon: CheckCircle2, color: '#f97316' },
                ];
                setFunnelData(mockData);
            } catch (error) {
                console.error("Error loading funnel data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFunnel();
    }, [token]);

    const calculateDropoff = (current, previous) => {
        if (!previous) return 0;
        return (((previous - current) / previous) * 100).toFixed(1);
    };

    const calculateConversion = (current, total) => {
        if (!total) return 0;
        return ((current / total) * 100).toFixed(1);
    };

    if (loading) return <div className="p-8 text-center text-[var(--c-text-muted)] animate-pulse">Cargando embudo analítico...</div>;

    const totalSessions = funnelData[0]?.value || 1;

    return (
        <ProtectedRoute requiredPermission="view_dashboard">
            <div className="p-6 max-w-7xl mx-auto space-y-8">
                
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--c-text)]">Embudo de Conversión (Funnel)</h1>
                        <p className="text-[var(--c-text-muted)]">Rendimiento del tráfico web hacia ventas efectivas (Últimos 30 días)</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    
                    {/* Graphical Funnel */}
                    <div className="xl:col-span-2 bg-[var(--c-bg-card)] rounded-xl border border-[var(--c-border)] p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-[var(--c-text)] mb-6">Tráfico por Etapa</h2>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--c-border)" />
                                    <XAxis type="number" stroke="var(--c-text-muted)" />
                                    <YAxis dataKey="stage" type="category" stroke="var(--c-text)" width={100} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: '8px', color: 'var(--c-text)' }}
                                    />
                                    <Bar dataKey="value" fill="var(--c-accent-blue)" radius={[0, 4, 4, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Step by Step Breakdown */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-[var(--c-text)] mb-4">Métricas de Drop-off</h2>
                        {funnelData.map((step, index) => {
                            const dropoff = index > 0 ? calculateDropoff(step.value, funnelData[index - 1].value) : 0;
                            const conversionRate = calculateConversion(step.value, totalSessions);
                            const Icon = step.icon;

                            return (
                                <div key={step.stage} className="bg-[var(--c-bg-card)] border border-[var(--c-border)] rounded-lg p-4 flex items-center justify-between relative overflow-hidden group">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 opacity-80" style={{ backgroundColor: step.color }}></div>
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-opacity-10" style={{ backgroundColor: `${step.color}20`, color: step.color }}>
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-[var(--c-text)]">{step.label}</h4>
                                            <p className="text-xs text-[var(--c-text-muted)]">Conversión Global: {conversionRate}%</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-[var(--c-text)]">{step.value}</div>
                                        {index > 0 && (
                                            <div className="flex items-center text-xs text-red-500 justify-end gap-1" title={`Caída desde ${funnelData[index-1].stage}`}>
                                                <TrendingDown size={12} /> {dropoff}%
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </ProtectedRoute>
    );
}
