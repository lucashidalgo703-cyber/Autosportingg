'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ShieldAlert, RefreshCw, AlertTriangle, Info, AlertOctagon, ArrowRight, Activity, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export default function DataQualityPage() {
    const { token, loading: authLoading } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterSeverity, setFilterSeverity] = useState('all');

    const fetchDataQuality = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/data-quality', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                if (res.status === 403) throw new Error('No tienes permisos para ver la calidad de datos.');
                throw new Error('Error al cargar calidad de datos');
            }
            const json = await res.json();
            setData(json);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && token) {
            fetchDataQuality();
        }
    }, [authLoading, token]);

    if (authLoading) return <div className="flex justify-center items-center h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div></div>;

    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex flex-col items-center justify-center gap-4 text-center">
                    <ShieldAlert size={48} />
                    <p className="text-lg font-bold">{error}</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const sections = Object.entries(data.sections).filter(([_, items]) => items.length > 0);
    let totalFilteredIssues = 0;

    const renderSeverityBadge = (severity) => {
        switch(severity) {
            case 'critical': return <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 uppercase"><AlertOctagon size={12}/> Crítico</span>;
            case 'warning': return <span className="flex items-center gap-1 text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 uppercase"><AlertTriangle size={12}/> Advertencia</span>;
            case 'info': return <span className="flex items-center gap-1 text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 uppercase"><Info size={12}/> Sugerencia</span>;
            default: return null;
        }
    };

    const sectionNames = {
        clients: 'Clientes', leads: 'Leads', stock: 'Stock', reservations: 'Reservas',
        sales: 'Ventas', installments: 'Cuotas', tasks: 'Tareas', communications: 'Comunicaciones',
        documentation: 'Documentación y Postventa', users: 'Usuarios'
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Activity className="text-red-500" />
                        Calidad de Datos
                    </h1>
                    <p className="text-neutral-400 mt-1 text-sm">
                        Detecta automáticamente inconsistencias operativas en el CRM.
                        Actualizado: {new Date(data.generatedAt).toLocaleTimeString('es-AR')}
                    </p>
                </div>
                <button 
                    onClick={fetchDataQuality}
                    disabled={loading}
                    className="flex items-center gap-2 bg-[#161619] hover:bg-[#1E1E24] text-white px-4 py-2 rounded-lg font-medium transition-colors border border-[#33333A]"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    {loading ? 'Analizando...' : 'Actualizar Análisis'}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#1E1E24] border border-[#33333A] p-4 rounded-xl">
                    <p className="text-neutral-400 text-sm font-medium">Total Problemas</p>
                    <p className="text-2xl font-bold text-white">{data.summary.totalIssues}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                    <p className="text-red-400 text-sm font-medium">Críticos</p>
                    <p className="text-2xl font-bold text-red-500">{data.summary.critical}</p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                    <p className="text-yellow-400 text-sm font-medium">Advertencias</p>
                    <p className="text-2xl font-bold text-yellow-500">{data.summary.warning}</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                    <p className="text-blue-400 text-sm font-medium">Sugerencias</p>
                    <p className="text-2xl font-bold text-blue-500">{data.summary.info}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                {['all', 'critical', 'warning', 'info'].map(sev => (
                    <button
                        key={sev}
                        onClick={() => setFilterSeverity(sev)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                            filterSeverity === sev 
                            ? 'bg-[#E63027] text-white border-[#E63027]' 
                            : 'bg-[#161619] text-[#A1A1AA] border-[#33333A] hover:bg-[#1E1E24]'
                        }`}
                    >
                        {sev === 'all' ? 'Todos' : sev === 'critical' ? 'Críticos' : sev === 'warning' ? 'Advertencias' : 'Sugerencias'}
                    </button>
                ))}
            </div>

            {sections.length === 0 ? (
                <div className="text-center py-20 bg-[#1E1E24] border border-[#33333A] rounded-2xl">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 text-green-500 border border-green-500/20">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white">¡Todo Perfecto!</h3>
                    <p className="text-neutral-400 mt-2">No se detectaron inconsistencias en la base de datos.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {sections.map(([sectionKey, items]) => {
                        const filteredItems = filterSeverity === 'all' ? items : items.filter(i => i.severity === filterSeverity);
                        if (filteredItems.length === 0) return null;
                        totalFilteredIssues += filteredItems.length;

                        return (
                            <div key={sectionKey} className="bg-[#1E1E24] border border-[#33333A] rounded-2xl overflow-hidden">
                                <div className="bg-[#161619] px-6 py-4 border-b border-[#33333A]">
                                    <h3 className="text-lg font-bold text-white flex items-center justify-between">
                                        <span>{sectionNames[sectionKey] || sectionKey}</span>
                                        <span className="text-xs font-mono bg-[#161619] px-2 py-1 rounded text-neutral-400">{filteredItems.length} incidencias</span>
                                    </h3>
                                </div>
                                <div className="divide-y divide-[#33333A]">
                                    {filteredItems.map((issue, idx) => (
                                        <div key={idx} className="p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-[#161619] transition-colors">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-3">
                                                    {renderSeverityBadge(issue.severity)}
                                                    <h4 className="font-semibold text-white">{issue.title}</h4>
                                                </div>
                                                <p className="text-sm text-neutral-400">{issue.description}</p>
                                            </div>
                                            <div className="shrink-0 flex items-center gap-3">
                                                <div className="text-right">
                                                    <p className="text-xs text-neutral-500 font-mono">ID: {issue.entityId?.substring(0, 8)}...</p>
                                                </div>
                                                <Link 
                                                    href={issue.href}
                                                    className="flex items-center gap-2 bg-[#161619] hover:bg-[#1E1E24] text-white px-3 py-1.5 rounded-lg text-sm transition-colors border border-[#33333A]"
                                                >
                                                    <LinkIcon size={14} />
                                                    Revisar
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {totalFilteredIssues === 0 && (
                        <div className="text-center py-10 text-neutral-500">
                            No hay incidencias que coincidan con el filtro actual.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
// placeholder para CheckCircle porque olvidé importarlo
const CheckCircle = ({size}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
