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
import { ShieldAlert, Target, XCircle, Info, CheckCircle } from 'lucide-react';
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
            <div className="flex min-h-[50vh] flex-1 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red"></div>
            </div>
        );
    }

    if (error || !sale) {
        return (
            <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
                <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-crm-red/30 bg-crm-red/10 p-6 text-center text-red-300">
                    <ShieldAlert size={48} />
                    <div>
                        <h2 className="text-xl font-bold mb-2">Error al cargar la venta</h2>
                        <p>{error || 'Venta no encontrada'}</p>
                    </div>
                    <button 
                        onClick={() => router.push('/admin/ventas')}
                        className="mt-4 rounded-lg border border-crm-border bg-crm-surface px-6 py-2 text-crm-fg transition-colors hover:bg-crm-surface-raised"
                    >
                        Volver a Ventas
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col p-4 pb-20 md:p-6">
            
            <SaleDetailHeader 
                sale={sale} 
                actions={
                    <div className="flex gap-2">
                        {sale.status === 'borrador' && (
                            <button
                                onClick={async () => {
                                    if (window.confirm('¿Estás seguro de que quieres activar esta venta? Pasará de Borrador a Activa.')) {
                                        await handleSave({ status: 'confirmada' });
                                    }
                                }}
                                className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                            >
                                <CheckCircle size={14} />
                                Activar Venta
                            </button>
                        )}
                        {sale.status !== 'cancelada' && (['owner', 'admin'].includes(user?.role) || hasPermission(user, PERMISSIONS.VENTAS_CANCEL)) && (
                            <button
                                onClick={() => setIsCancelModalOpen(true)}
                            className="flex items-center gap-2 rounded-lg border border-crm-red/20 bg-crm-red/10 px-3 py-1.5 text-xs font-bold text-red-300 transition-colors hover:bg-crm-red/20"
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
                            className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-300 transition-colors hover:bg-blue-500/20"
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
                        <SaleCommercialPanel sale={sale} onSave={handleSave} />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl border border-crm-red/30 bg-crm-surface p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <XCircle className="text-red-500" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-crm-fg">Anular Venta</h3>
                                <p className="text-xs text-neutral-400">Esta acción no se puede deshacer.</p>
                            </div>
                        </div>

                        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
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
                                className="min-h-[100px] w-full resize-none rounded-xl border border-crm-red/30 bg-crm-bg p-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                            ></textarea>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsCancelModalOpen(false)}
                                className="rounded-lg border border-crm-border bg-crm-surface px-4 py-2 text-sm font-bold text-crm-fg transition-colors hover:bg-crm-surface-raised"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCancelSale}
                                disabled={isCancelling || !cancelReason.trim()}
                                className="rounded-lg bg-crm-red px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-crm-red-hover disabled:opacity-50"
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
