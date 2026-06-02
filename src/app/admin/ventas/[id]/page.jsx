"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminSales } from '../../../../hooks/useAdminSales';
import SaleDetailHeader from '../../../../components/crm/sales/detail/SaleDetailHeader';
import SaleCommercialPanel from '../../../../components/crm/sales/detail/SaleCommercialPanel';
import SaleTradeInPanel from '../../../../components/crm/sales/detail/SaleTradeInPanel';
import SaleLinkedEntitiesPanel from '../../../../components/crm/sales/detail/SaleLinkedEntitiesPanel';
import SaleChecklistPanel from '../../../../components/crm/sales/detail/SaleChecklistPanel';
import SaleNotesPanel from '../../../../components/crm/sales/detail/SaleNotesPanel';
import SaleStatusPanel from '../../../../components/crm/sales/detail/SaleStatusPanel';
import SaleAuditTimeline from '../../../../components/crm/sales/detail/SaleAuditTimeline';
import SaleFinancePanel from '../../../../components/crm/sales/detail/SaleFinancePanel';
import SaleInstallmentsPanel from '../../../../components/crm/sales/detail/SaleInstallmentsPanel';
import SalePostventaPanel from '../../../../components/crm/sales/detail/SalePostventaPanel';
import CommunicationLogPanel from '../../../../components/crm/communications/CommunicationLogPanel';
import MessageTemplatePicker from '../../../../components/crm/templates/MessageTemplatePicker';
import CrmTaskModal from '../../../../components/crm/agenda/CrmTaskModal';
import { useAdminCrmTasks } from '../../../../hooks/useAdminCrmTasks';
import { ShieldAlert, Target, XCircle, Info } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../../utils/adminPermissions';

export default function SaleDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { fetchSaleById, updateSale, loading, error } = useAdminSales();
    const { createTask } = useAdminCrmTasks();
    const { user, token } = useAuth();
    const [sale, setSale] = useState(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        if (id) {
            loadSale();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadSale = async () => {
        const data = await fetchSaleById(id);
        if (data) {
            setSale(data);
        }
    };

    const handleSave = async (payload) => {
        const updatedSale = await updateSale(id, payload);
        if (updatedSale) {
            setSale(updatedSale);
        }
    };

    const handleCreateTask = async (taskData) => {
        try {
            await createTask(taskData);
            alert('Tarea agendada exitosamente');
            setIsTaskModalOpen(false);
        } catch (err) {
            alert('Error al crear la tarea: ' + err.message);
        }
    };

    const handleLogTemplateAction = async (template, copiedText) => {
        try {
            await fetch('/api/admin/communication-logs', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    entityType: 'sale',
                    entityId: id,
                    saleId: id,
                    clientId: sale?.clientId?._id || sale?.clientId || null,
                    vehicleId: sale?.vehicleId?._id || sale?.vehicleId || null,
                    assignedTo: sale?.assignedTo?._id || sale?.assignedTo || null,
                    channel: template.channel || 'whatsapp',
                    direction: 'outbound',
                    outcome: 'contacted',
                    title: `Plantilla usada: ${template.name}`,
                    notes: copiedText.length > 500 ? copiedText.substring(0, 500) + '...' : copiedText,
                    contactDate: new Date().toISOString()
                })
            });
            window.dispatchEvent(new CustomEvent('refresh-communications'));
        } catch (error) {
            console.error('Error logging template action:', error);
        }
    };

    const handleCancelSale = async () => {
        if (!cancelReason.trim()) {
            alert('El motivo de anulación es obligatorio.');
            return;
        }

        setIsCancelling(true);
        try {
            const res = await fetch(`/api/admin/sales/${id}/cancel`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: cancelReason })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || data.message || 'Error al anular la venta');
            }

            const updatedSale = await res.json();
            setSale(updatedSale);
            setIsCancelModalOpen(false);
            setCancelReason('');
            alert('La venta ha sido anulada exitosamente.');
        } catch (error) {
            alert(error.message);
        } finally {
            setIsCancelling(false);
        }
    };

    if (loading && !sale) {
        return (
            <div className="flex-1 flex justify-center items-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error || !sale) {
        return (
            <div className="max-w-7xl mx-auto p-4">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex flex-col items-center justify-center gap-4 text-center">
                    <ShieldAlert size={48} />
                    <div>
                        <h2 className="text-xl font-bold mb-2">Error al cargar la venta</h2>
                        <p>{error || 'Venta no encontrada'}</p>
                    </div>
                    <button 
                        onClick={() => router.push('/admin/ventas')}
                        className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors mt-4"
                    >
                        Volver a Ventas
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto flex flex-col h-full min-h-[85vh] pb-12">
            
            <SaleDetailHeader 
                sale={sale} 
                actions={
                    <div className="flex gap-2">
                        {sale.status !== 'cancelada' && (['owner', 'admin'].includes(user?.role) || hasPermission(user, PERMISSIONS.VENTAS_CANCEL)) && (
                            <button
                                onClick={() => setIsCancelModalOpen(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-colors"
                            >
                                <XCircle size={14} />
                                Anular Venta
                            </button>
                        )}
                        <MessageTemplatePicker 
                            category="sale"
                            entityData={{
                                clientName: sale.clientId?.fullName,
                                clientPhone: sale.clientId?.phone,
                                clientEmail: sale.clientId?.email,
                                vehicleName: sale.vehicleId?.model ? `${sale.vehicleId.make} ${sale.vehicleId.model}` : '',
                                assignedToName: sale.assignedTo?.name || ''
                            }}
                            onLogAction={handleLogTemplateAction}
                        />
                        <button
                            onClick={() => setIsTaskModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold transition-colors"
                        >
                            <Target size={14} />
                            Crear Tarea
                        </button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Columna Izquierda: Entidades y Resumen Comercial */}
                <div className="flex flex-col gap-6 lg:col-span-1">
                    <div className="h-auto">
                        <SaleLinkedEntitiesPanel sale={sale} onUpdate={loadSale} />
                    </div>
                    <div className="h-auto">
                        <SaleCommercialPanel sale={sale} />
                    </div>
                    <div className="h-auto">
                        <SaleTradeInPanel sale={sale} onUpdate={loadSale} />
                    </div>
                    <div className="h-[300px]">
                        <SaleStatusPanel sale={sale} onSave={handleSave} />
                    </div>
                </div>

                {/* Columna Central: Checklists */}
                <div className="flex flex-col gap-6 lg:col-span-1">
                    <div className="h-[400px]">
                        <SaleChecklistPanel 
                            sale={sale} 
                            type="documentation" 
                            onSave={handleSave} 
                        />
                    </div>
                    <div className="h-[400px]">
                        <SaleChecklistPanel 
                            sale={sale} 
                            type="delivery" 
                            onSave={handleSave} 
                        />
                    </div>
                </div>

                {/* Columna Derecha: Notas y Auditoría */}
                <div className="flex flex-col gap-6 lg:col-span-1">
                    <div className="h-[300px]">
                        <SaleNotesPanel sale={sale} onSave={handleSave} onCreateTask={() => setIsTaskModalOpen(true)} />
                    </div>
                    <div className="h-[500px]">
                        <SaleAuditTimeline sale={sale} />
                    </div>
                </div>

            </div>

            {/* Panel de Comunicaciones (Ancho completo) */}
            <div className="mt-6 h-[500px]">
                <CommunicationLogPanel 
                    entityType="sale" 
                    entityId={sale._id} 
                    clientId={sale.clientId?._id || sale.clientId}
                    vehicleId={sale.vehicleId?._id || sale.vehicleId}
                    assignedTo={sale.assignedTo?._id || sale.assignedTo}
                />
            </div>

            {/* Panel de Postventa (Ancho completo) */}
            <div className="mt-6">
                <SalePostventaPanel sale={sale} />
            </div>

            {/* Panel de Movimientos Financieros (Ancho completo) */}
            {hasPermission(user, PERMISSIONS.FINANZAS_READ) && (
                <div className="mt-6">
                    <SaleFinancePanel sale={sale} />
                </div>
            )}

            {/* Panel de Cuotas Manuales (Ancho completo) */}
            {hasPermission(user, PERMISSIONS.CUOTAS_READ) && (
                <div className="mt-6">
                    <SaleInstallmentsPanel sale={sale} saleFinanceData={sale.finance} />
                </div>
            )}

            <CrmTaskModal 
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSave={handleCreateTask}
                defaultData={{
                    source: 'ventas',
                    type: 'venta',
                    title: 'Seguimiento venta',
                    saleId: sale._id,
                    ...(sale.clientId && { clientId: sale.clientId._id || sale.clientId }),
                    ...(sale.vehicleId && { vehicleId: sale.vehicleId._id || sale.vehicleId })
                }}
            />

            {isCancelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#161619] border border-red-900/50 rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <XCircle className="text-red-500" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Anular Venta</h3>
                                <p className="text-xs text-neutral-400">Esta acción no se puede deshacer.</p>
                            </div>
                        </div>

                        <div className="mb-4 bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg">
                            <p className="text-xs text-orange-200 flex items-start gap-2">
                                <Info size={14} className="shrink-0 mt-0.5" />
                                La venta quedará anulada para auditoría. No se modificarán caja, cuotas ni movimientos financieros automáticamente.
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-neutral-400 uppercase mb-2">
                                Motivo de Anulación
                            </label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Escribe el motivo aquí..."
                                className="w-full bg-black/40 border border-red-500/30 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500 min-h-[100px] resize-none"
                            ></textarea>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsCancelModalOpen(false)}
                                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-bold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCancelSale}
                                disabled={isCancelling || !cancelReason.trim()}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {isCancelling ? 'Anulando...' : 'Confirmar Anulación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
