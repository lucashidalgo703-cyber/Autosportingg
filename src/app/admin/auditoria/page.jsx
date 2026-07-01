"use client";
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, RefreshCw, Filter } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import { useAuth } from '../../../context/AuthContext';

export default function AuditPage() {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        module: '',
        action: ''
    });

    const limit = 50;

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams({
                page,
                limit,
                ...(filters.search && { search: filters.search }),
                ...(filters.module && { module: filters.module }),
                ...(filters.action && { action: filters.action })
            });

            const res = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Error al cargar logs');
            
            const data = await res.json();
            setLogs(data.logs || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filters.module, filters.action]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchLogs();
    };

    return (
        <PermissionGuard permission={PERMISSIONS.AUDITORIA_READ}>
            <div className="max-w-7xl mx-auto flex flex-col h-full min-h-[85vh]">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-crm-red/10 flex items-center justify-center border border-crm-red/20">
                            <ShieldAlert size={20} className="text-crm-red" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Auditoría</h1>
                            <p className="text-sm text-crm-fg-muted mt-1">Historial de acciones críticas del sistema.</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="h-10 px-4 rounded-xl bg-crm-surface hover:bg-crm-surface-raised text-white text-sm transition-colors flex items-center gap-2"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        <span>Actualizar</span>
                    </button>
                </div>

                {/* Filters */}
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" />
                        <input 
                            type="text" 
                            placeholder="Buscar por usuario o descripción..." 
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="w-full bg-crm-bg border border-crm-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-crm-fg placeholder-crm-fg-muted focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors"
                        />
                    </div>
                    <div className="flex gap-4">
                        <select
                            value={filters.module}
                            onChange={(e) => { setFilters(prev => ({ ...prev, module: e.target.value })); setPage(1); }}
                            className="bg-crm-bg border border-crm-border rounded-xl px-4 py-2.5 text-sm text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors min-w-[150px]"
                        >
                            <option value="">Módulos (Todos)</option>
                            <option value="usuarios">Usuarios / Login</option>
                            <option value="cuotas">Cuotas</option>
                            <option value="ventas">Ventas</option>
                            <option value="finanzas">Finanzas</option>
                            <option value="stock">Stock</option>
                        </select>
                        <button type="submit" className="px-4 bg-crm-red text-white rounded-xl text-sm font-bold hover:bg-crm-red-hover transition-colors">
                            Buscar
                        </button>
                    </div>
                </form>

                {/* Table */}
                <div className="bg-crm-surface border border-crm-border rounded-2xl overflow-hidden flex-1">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-crm-border bg-crm-bg">
                                    <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Fecha</th>
                                    <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Usuario</th>
                                    <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Acción / Módulo</th>
                                    <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-crm-border">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-crm-fg-muted">
                                            {loading ? 'Cargando logs...' : 'No hay registros de auditoría que coincidan con la búsqueda.'}
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map(log => (
                                        <tr key={log._id} className="hover:bg-crm-surface-raised transition-colors">
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-bold text-white">
                                                        {new Date(log.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-xs text-crm-fg-muted">
                                                        {new Date(log.createdAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-bold text-white">{log.userName}</span>
                                                    <span className="text-[10px] uppercase text-crm-fg-muted">{log.userRole}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded w-max ${log.action.includes('FALLIDO') || log.action.includes('ELIMINADA') ? 'bg-red-500/10 text-red-400' : 'bg-crm-surface-raised text-crm-fg-muted'}`}>
                                                        {log.action}
                                                    </span>
                                                    <span className="text-xs text-crm-fg-muted capitalize">{log.module}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm text-crm-fg max-w-md break-words">
                                                    {log.description}
                                                </p>
                                                {log.entityLabel && (
                                                    <p className="text-xs text-crm-fg-muted mt-1">
                                                        Entidad: {log.entityLabel}
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {total > limit && (
                        <div className="p-4 border-t border-crm-border flex justify-between items-center bg-crm-surface">
                            <span className="text-xs text-crm-fg-muted">
                                Mostrando {logs.length} de {total} registros
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="px-3 py-1 rounded bg-crm-bg text-crm-fg-muted border border-crm-border text-xs disabled:opacity-50 hover:bg-crm-surface-raised transition-colors"
                                >
                                    Anterior
                                </button>
                                <button 
                                    disabled={page * limit >= total}
                                    onClick={() => setPage(p => p + 1)}
                                    className="px-3 py-1 rounded bg-crm-bg text-crm-fg-muted border border-crm-border text-xs disabled:opacity-50 hover:bg-crm-surface-raised transition-colors"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PermissionGuard>
    );
}
