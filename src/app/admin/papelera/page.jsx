"use client";

import React, { useEffect, useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, CalendarX2, FileText, User, Info, Search, Car, CheckSquare, DollarSign } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS, hasPermission } from '../../../utils/adminPermissions';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';

export default function PapeleraPage() {
    const { user } = useAuth();
    const canRestore = hasPermission(user, PERMISSIONS.TRASH_RESTORE);
    const canDelete = hasPermission(user, PERMISSIONS.TRASH_DELETE);

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, id: null });

    const [tab, setTab] = useState('clientes'); // clientes, ventas, expedientes
    const [searchTerm, setSearchTerm] = useState('');

    const fetchTrash = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/trash`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar papelera');
            const data = await res.json();
            setRecords(data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrash();
    }, []);

    const handleRestore = async (id) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/trash/restore/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al restaurar');
            }
            toast.success('Elemento restaurado con éxito');
            fetchTrash();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/trash/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al eliminar definitivamente');
            toast.success('Eliminado de forma permanente');
            fetchTrash();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const getEntityIcon = (type) => {
        if (type === 'Client') return <User className="text-blue-500" size={16} />;
        if (type === 'Lead') return <User className="text-purple-500" size={16} />;
        if (type === 'Quote') return <FileText className="text-yellow-500" size={16} />;
        if (type === 'Sale') return <DollarSign className="text-green-500" size={16} />;
        if (type === 'Gestoria') return <FileText className="text-indigo-500" size={16} />;
        if (type === 'Car') return <Car className="text-orange-500" size={16} />;
        if (type === 'Task') return <CheckSquare className="text-indigo-500" size={16} />;
        return <FileText className="text-gray-500" size={16} />;
    };

    const getEntityName = (record) => {
        const s = record.snapshot;
        if (!s) return 'Desconocido';
        if (record.entityType === 'Client' || record.entityType === 'Lead') {
            return `${s.firstName || s.name || ''} ${s.lastName || ''}`.trim() || 'Sin Nombre';
        }
        if (record.entityType === 'Quote') {
            return `Cotización ${s.status ? '('+s.status+')' : ''}`;
        }
        if (record.entityType === 'Sale') {
            return `Venta ${s.saleNumber || ''} - ${s.clientName || s.vehicleOwnerName || 'Desconocida'}`.trim();
        }
        if (record.entityType === 'Gestoria') {
            return `Trámite: ${s.title || s.type || 'Desconocido'}`;
        }
        if (record.entityType === 'Car') {
            return `${s.brand || ''} ${s.name || ''}`;
        }
        if (record.entityType === 'Task') {
            return `Tarea: ${s.title || ''}`;
        }
        return record.entityId;
    };

    const filteredRecords = records.filter(r => {
        // Tab logic
        if (tab === 'clientes' && !['Client', 'Lead', 'Quote'].includes(r.entityType)) return false;
        if (tab === 'ventas' && !['Sale'].includes(r.entityType)) return false;
        if (tab === 'expedientes' && !['Gestoria', 'Car', 'Task', 'Reservation', 'Opportunity', 'Complaint', 'Mandate'].includes(r.entityType)) return false;

        // Search logic
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const eName = getEntityName(r).toLowerCase();
            const dBy = (r.deletedBy?.name || r.deletedBy?.email || 'sistema').toLowerCase();
            const reason = (r.reason || '').toLowerCase();
            if (!eName.includes(term) && !dBy.includes(term) && !reason.includes(term)) return false;
        }

        return true;
    });

    return (
        <PermissionGuard permission={PERMISSIONS.TRASH_READ}>
            <div className="flex h-[calc(100vh-64px)] w-full flex-col bg-crm-bg p-4 md:p-6 overflow-y-auto">
                <div className="max-w-6xl mx-auto w-full space-y-6">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-crm-fg flex items-center gap-2">
                                <Trash2 className="text-crm-red" /> Papelera de Reciclaje
                            </h1>
                            <p className="text-sm text-crm-fg-muted mt-1">Recupera elementos eliminados recientemente (auto-purga a 60 días).</p>
                        </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                        <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="text-sm font-bold text-blue-700">Sistema de Retención (Soft Delete)</h4>
                            <p className="text-xs text-blue-600/80 mt-1">
                                Actualmente la papelera soporta la recuperación automática de <strong>Clientes, Leads, Cotizaciones, Ventas y Expedientes</strong>. 
                                Los elementos en esta vista se eliminarán automáticamente tras 60 días.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-crm-surface border border-crm-border p-2 rounded-xl">
                        <div className="flex gap-1 bg-crm-bg p-1 rounded-lg w-full md:w-auto">
                            <button onClick={() => setTab('clientes')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors ${tab === 'clientes' ? 'bg-crm-surface text-crm-fg shadow-sm' : 'text-crm-fg-muted hover:text-crm-fg'}`}>
                                Clientes & Cotizaciones
                            </button>
                            <button onClick={() => setTab('ventas')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors ${tab === 'ventas' ? 'bg-crm-surface text-crm-fg shadow-sm' : 'text-crm-fg-muted hover:text-crm-fg'}`}>
                                Ventas
                            </button>
                            <button onClick={() => setTab('expedientes')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors ${tab === 'expedientes' ? 'bg-crm-surface text-crm-fg shadow-sm' : 'text-crm-fg-muted hover:text-crm-fg'}`}>
                                Expedientes
                            </button>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                            <input 
                                type="text"
                                placeholder="Buscar título, usuario o motivo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 rounded-xl border border-crm-border bg-crm-bg text-sm text-crm-fg outline-none focus:border-crm-red transition-colors"
                            />
                        </div>
                    </div>

                    {/* Tabla de Papelera */}
                    <div className="bg-crm-surface border border-crm-border rounded-2xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                        <div className="p-0 overflow-x-auto">
                            {loading ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <div className="w-8 h-8 border-4 border-crm-red border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className="text-sm font-bold text-crm-fg-muted">Cargando papelera...</p>
                                </div>
                            ) : filteredRecords.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <Trash2 size={48} className="text-crm-border mb-4" />
                                    <h3 className="text-lg font-black text-crm-fg">La papelera está vacía</h3>
                                    <p className="text-sm font-medium text-crm-fg-muted">No hay elementos eliminados para esta vista.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm text-crm-fg whitespace-nowrap">
                                    <thead className="bg-crm-bg text-xs font-bold uppercase text-crm-fg-muted border-b border-crm-border">
                                        <tr>
                                            <th className="px-6 py-4">Tipo</th>
                                            <th className="px-6 py-4">Detalle Original</th>
                                            <th className="px-6 py-4">Eliminado Por</th>
                                            <th className="px-6 py-4">Expira En</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-crm-border">
                                        {filteredRecords.map(r => {
                                            const isRestorable = ['Client', 'Lead', 'Quote', 'Sale', 'Gestoria'].includes(r.entityType);
                                            return (
                                                <tr key={r._id} className="hover:bg-crm-bg/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 font-bold bg-crm-bg px-2 py-1 rounded-lg w-max border border-crm-border">
                                                            {getEntityIcon(r.entityType)} {r.entityType}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold max-w-[200px] truncate" title={getEntityName(r)}>{getEntityName(r)}</div>
                                                        <div className="text-[10px] text-crm-fg-subtle font-mono mt-1">ID: {r.entityId}</div>
                                                        {r.reason && <div className="text-xs text-crm-red mt-1 max-w-[200px] truncate" title={r.reason}>Motivo: {r.reason}</div>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-crm-fg-muted">
                                                            {r.deletedBy ? (r.deletedBy.name || r.deletedBy.email) : 'Sistema'}
                                                        </div>
                                                        <div className="text-xs text-crm-fg-subtle">
                                                            {new Date(r.createdAt).toLocaleString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-crm-warning">
                                                            <CalendarX2 size={14} />
                                                            {new Date(r.expiresAt).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {canRestore && (
                                                                <button 
                                                                    onClick={() => isRestorable && setConfirmModal({ isOpen: true, action: 'restore', id: r._id })}
                                                                    disabled={actionLoading || !isRestorable}
                                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isRestorable ? 'bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white' : 'bg-gray-500/10 text-gray-500 cursor-not-allowed opacity-50'}`}
                                                                    title={isRestorable ? "Restaurar" : "Restauración no disponible todavía"}
                                                                >
                                                                    <RotateCcw size={14} /> Restaurar
                                                                </button>
                                                            )}
                                                            {canDelete && (
                                                                <button 
                                                                    onClick={() => setConfirmModal({ isOpen: true, action: 'delete', id: r._id })}
                                                                    disabled={actionLoading}
                                                                    className="flex items-center gap-1 bg-crm-surface border border-crm-border text-crm-red hover:bg-crm-red hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                                                    title="Eliminar Definitivamente"
                                                                >
                                                                    <AlertTriangle size={14} /> Destruir
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, action: null, id: null })}
                onConfirm={() => {
                    if (confirmModal.action === 'restore') handleRestore(confirmModal.id);
                    if (confirmModal.action === 'delete') handleDelete(confirmModal.id);
                }}
                title={confirmModal.action === 'restore' ? "Restaurar elemento" : "Eliminar definitivamente"}
                message={confirmModal.action === 'restore' ? "¿Estás seguro de que deseas restaurar este elemento? Volverá a su ubicación original." : "¡ADVERTENCIA! Esta acción eliminará el registro de forma PERMANENTE e IRREVERSIBLE. ¿Continuar?"}
                confirmText={confirmModal.action === 'restore' ? "Restaurar" : "Eliminar"}
                isDestructive={confirmModal.action === 'delete'}
            />
        </PermissionGuard>
    );
}
