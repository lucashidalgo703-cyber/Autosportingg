"use client";

import React, { useEffect, useState } from 'react';
import { Shield, Check, X, Clock, PlayCircle, AlertCircle } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS, hasPermission } from '../../../utils/adminPermissions';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';

export default function AutorizacionesPage() {
    const { user } = useAuth();
    const canApprove = hasPermission(user, PERMISSIONS.APPROVALS_WRITE);
    
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // pending, history

    // Modal state
    const [selectedReq, setSelectedReq] = useState(null);
    const [notes, setNotes] = useState('');
    const [modalAction, setModalAction] = useState(null); // 'approve', 'reject'
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmActionModal, setConfirmActionModal] = useState({ isOpen: false, id: null, status: null });

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/approvals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar autorizaciones');
            const data = await res.json();
            setRequests(data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/approvals/${selectedReq._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: modalAction === 'approve' ? 'approved' : 'rejected', resolutionNotes: notes })
            });

            if (!res.ok) throw new Error('Error al procesar la solicitud');
            toast.success(modalAction === 'approve' ? 'Solicitud aprobada' : 'Solicitud rechazada');
            setModalAction(null);
            setSelectedReq(null);
            setNotes('');
            fetchRequests();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleExecuteOrCancel = (id, newStatus) => {
        setConfirmActionModal({ isOpen: true, id, status: newStatus });
    };

    const confirmExecuteOrCancel = async () => {
        const { id, status: newStatus } = confirmActionModal;
        if (!id || !newStatus) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/approvals/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (!res.ok) throw new Error('Error de conexión');
            toast.success('Estado actualizado');
            fetchRequests();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const filteredRequests = requests.filter(r => {
        if (filter === 'pending') return r.status === 'pending' || r.status === 'approved';
        return r.status === 'rejected' || r.status === 'cancelled' || r.status === 'executed';
    });

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
            approved: 'bg-green-500/10 text-green-600 border-green-500/20',
            rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
            cancelled: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
            executed: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
        };
        const labels = {
            pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada',
            cancelled: 'Cancelada', executed: 'Ejecutada'
        };
        return <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${styles[status]}`}>{labels[status]}</span>;
    };

    return (
        <PermissionGuard permission={PERMISSIONS.APPROVALS_READ}>
            <div className="flex h-[calc(100vh-64px)] w-full flex-col bg-crm-bg p-4 md:p-6 overflow-y-auto">
                <div className="max-w-6xl mx-auto w-full space-y-6">
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-crm-fg flex items-center gap-2">
                                <Shield className="text-blue-500" /> Autorizaciones
                            </h1>
                            <p className="text-sm text-crm-fg-muted mt-1">Cada decisión queda trazada con motivo, fecha y usuario.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button disabled className="bg-crm-surface border border-crm-border text-crm-fg-muted font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-2 opacity-50 cursor-not-allowed" title="Pendiente de configuración">
                                <Shield size={16} className="text-crm-red" />
                                PIN de emergencia
                            </button>
                        </div>
                    </div>

                    <div className="bg-crm-surface border border-crm-border rounded-2xl shadow-sm overflow-hidden">
                        <div className="border-b border-crm-border flex p-2 gap-2 bg-crm-bg/50">
                            <button
                                onClick={() => setFilter('pending')}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filter === 'pending' ? 'bg-crm-surface text-crm-fg shadow-sm border border-crm-border' : 'text-crm-fg-muted hover:text-crm-fg'}`}
                            >
                                Pendientes
                            </button>
                            <button
                                onClick={() => setFilter('history')}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filter === 'history' ? 'bg-crm-surface text-crm-fg shadow-sm border border-crm-border' : 'text-crm-fg-muted hover:text-crm-fg'}`}
                            >
                                Histórico
                            </button>
                        </div>

                        <div className="p-0 overflow-x-auto">
                            {loading ? (
                                <div className="p-8 text-center text-crm-fg-muted">Cargando...</div>
                            ) : filteredRequests.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <Shield size={48} className="text-crm-border mb-4" />
                                    <p className="text-sm font-bold text-crm-fg">No hay autorizaciones en esta vista.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm text-crm-fg whitespace-nowrap">
                                    <thead className="bg-crm-bg text-xs font-bold uppercase text-crm-fg-muted border-b border-crm-border">
                                        <tr>
                                            <th className="px-6 py-4">Fecha</th>
                                            <th className="px-6 py-4">Solicitante</th>
                                            <th className="px-6 py-4">Acción Requerida</th>
                                            <th className="px-6 py-4">Estado</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-crm-border">
                                        {filteredRequests.map(r => (
                                            <React.Fragment key={r._id}>
                                                <tr className="hover:bg-crm-bg/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold">{new Date(r.createdAt).toLocaleDateString()}</div>
                                                        <div className="text-xs text-crm-fg-subtle">{new Date(r.createdAt).toLocaleTimeString()}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold">{r.requester?.name || r.requester?.email || 'Sistema'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-crm-red">{r.summary}</div>
                                                        <div className="text-xs text-crm-fg-subtle truncate max-w-[250px] font-medium" title={r.reason}>
                                                            Motivo: {r.reason}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {getStatusBadge(r.status)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        {/* Acciones para Aprobador */}
                                                        {canApprove && r.status === 'pending' && (
                                                            <>
                                                                <button onClick={() => { setSelectedReq(r); setModalAction('approve'); }} className="p-2 bg-green-500/10 text-green-600 rounded-lg hover:bg-green-500 hover:text-white transition-colors" title="Aprobar">
                                                                    <Check size={16} />
                                                                </button>
                                                                <button onClick={() => { setSelectedReq(r); setModalAction('reject'); }} className="p-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-colors" title="Rechazar">
                                                                    <X size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                        {/* Acciones para Solicitante */}
                                                        {r.status === 'pending' && !canApprove && (
                                                            <button onClick={() => handleExecuteOrCancel(r._id, 'cancelled')} className="text-xs font-bold text-crm-fg-muted hover:text-crm-red transition-colors">Cancelar</button>
                                                        )}
                                                        {r.status === 'approved' && (
                                                            <button onClick={() => handleExecuteOrCancel(r._id, 'executed')} className="flex items-center gap-1 ml-auto text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-500 transition-colors">
                                                                <PlayCircle size={14} /> Marcar Ejecutada
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                                {/* Detalle si está rechazada o tiene notas del aprobador */}
                                                {(r.resolutionNotes || r.approver) && filter === 'history' && (
                                                    <tr className="bg-crm-bg/30">
                                                        <td colSpan={5} className="px-6 py-3 border-t-0 text-xs text-crm-fg-subtle border-l-2 border-l-crm-border ml-2">
                                                            <div className="flex items-start gap-2 max-w-3xl">
                                                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                                                <div>
                                                                    <strong>Resolución por {r.approver?.name || r.approver?.email || 'Admin'}:</strong> {r.resolutionNotes || 'Sin comentarios.'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Aprobación/Rechazo */}
            {modalAction && selectedReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-crm-surface shadow-2xl overflow-hidden flex flex-col">
                        <div className={`flex items-center justify-between border-b border-crm-border px-6 py-4 ${modalAction === 'approve' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <h3 className={`text-lg font-black ${modalAction === 'approve' ? 'text-green-600' : 'text-red-600'}`}>
                                {modalAction === 'approve' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
                            </h3>
                            <button onClick={() => setModalAction(null)} className="text-crm-fg-muted hover:text-crm-fg">✕</button>
                        </div>
                        
                        <form onSubmit={handleAction} className="p-6 space-y-4">
                            <div>
                                <p className="text-sm font-bold text-crm-fg mb-1">Solicitado por: {selectedReq.requester?.name || selectedReq.requester?.email || 'Sistema'}</p>
                                <p className="text-xs text-crm-fg-muted mb-4">{selectedReq.summary}</p>
                                
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Notas de Resolución (Opcional)</label>
                                <textarea
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg p-3 text-sm text-crm-fg outline-none focus:border-crm-red transition-colors resize-none"
                                    rows={4}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder={modalAction === 'approve' ? "Instrucciones o comentarios sobre la aprobación..." : "Motivo del rechazo..."}
                                    required={modalAction === 'reject'}
                                ></textarea>
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setModalAction(null)} className="px-4 py-2 text-sm font-bold text-crm-fg-muted hover:text-crm-fg">Cancelar</button>
                                <button disabled={actionLoading} type="submit" className={`rounded-xl px-6 py-2 text-sm font-black text-white shadow-sm disabled:opacity-50 ${modalAction === 'approve' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}>
                                    Confirmar {modalAction === 'approve' ? 'Aprobación' : 'Rechazo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmActionModal.isOpen}
                onClose={() => setConfirmActionModal({ isOpen: false, id: null, status: null })}
                onConfirm={confirmExecuteOrCancel}
                title="Actualizar Estado"
                message={`¿Estás seguro de marcar esta solicitud como ${confirmActionModal.status}?`}
                confirmText="Confirmar"
                isDestructive={confirmActionModal.status === 'cancelled'}
            />
        </PermissionGuard>
    );
}
