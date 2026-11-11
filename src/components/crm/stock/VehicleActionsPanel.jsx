"use client";
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';
import { Edit, CalendarClock, ShoppingCart, Receipt, MessageSquare, Lock, Trash2, Printer } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';

export default function VehicleActionsPanel({
    vehicle,
    onEdit,
    onAddExpense,
    onReserve,
    onCancelReserve,
    onDelete,
    onAddNote,
    onStartSale,
    onPrintFlyer,
    activeReservation
}) {
    const { user } = useAuth();
    const canEditStock = hasPermission(user, PERMISSIONS.STOCK_WRITE);
    const canReserve = hasPermission(user, PERMISSIONS.RESERVAS_WRITE) || hasPermission(user, PERMISSIONS.VENTAS_WRITE);
    const canAddExpense = hasPermission(user, PERMISSIONS.STOCK_WRITE) || hasPermission(user, PERMISSIONS.FINANZAS_WRITE);
    const canStartSale = hasPermission(user, PERMISSIONS.VENTAS_WRITE);
    const reserveDisabled = vehicle?.status === 'Vendido' || vehicle?.status === 'Reservado' || !!activeReservation?._id;

    return (
        <CrmCard>
            <h3 className="text-white font-semibold text-lg mb-4">Acciones de Stock</h3>

            <div className="flex flex-col gap-3">
                {canEditStock && (
                    <CrmButton onClick={onEdit} className="flex items-center justify-start gap-3 w-full bg-crm-bg border-crm-border hover:bg-crm-surface-raised text-white">
                        <Edit size={16} className="text-crm-red" />
                        <div className="flex flex-col items-start text-left">
                            <span className="font-medium">Editar Vehiculo</span>
                            <span className="text-[10px] text-crm-fg-muted font-normal">Actualizar datos y visibilidad</span>
                        </div>
                    </CrmButton>
                )}

                {canReserve && (
                    <CrmButton
                        onClick={onReserve}
                        disabled={reserveDisabled}
                        className={'flex items-center justify-start gap-3 w-full border-crm-border ' + (reserveDisabled ? 'opacity-50 cursor-not-allowed bg-crm-surface-raised hover:bg-crm-surface-raised' : 'bg-crm-bg hover:bg-crm-surface-raised text-white')}
                    >
                        <CalendarClock size={16} className={reserveDisabled ? '' : 'text-crm-red'} />
                        <div className="flex flex-col items-start text-left">
                            <span>Tomar Reserva</span>
                            <span className="text-[10px] text-crm-fg-muted font-normal">
                                {activeReservation?._id ? 'Ya existe reserva activa' :
                                 vehicle?.status === 'Vendido' ? 'Vehiculo vendido' :
                                 vehicle?.status === 'Reservado' ? 'Vehiculo reservado' :
                                 'Bloquear vehiculo con seña'}
                            </span>
                        </div>
                    </CrmButton>
                )}

                {canReserve && activeReservation?._id && (
                    <CrmButton
                        onClick={onCancelReserve}
                        className="flex items-center justify-start gap-3 w-full bg-crm-bg border-red-500/30 hover:bg-crm-surface-raised text-white"
                    >
                        <Lock size={16} className="text-crm-red" />
                        <div className="flex flex-col items-start text-left">
                            <span className="text-red-400">Liberar Reserva</span>
                            <span className="text-[10px] text-crm-fg-muted font-normal">Desactivar y desbloquear auto</span>
                        </div>
                    </CrmButton>
                )}

                {canStartSale && (
                    <CrmButton
                        onClick={onStartSale}
                        disabled={vehicle?.status === 'Vendido'}
                        className="flex items-center justify-start gap-3 w-full bg-crm-bg border-crm-border hover:bg-crm-surface-raised text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ShoppingCart size={16} className="text-crm-red" />
                        <div className="flex flex-col items-start text-left">
                            <span>Iniciar Venta</span>
                            <span className="text-[10px] text-crm-fg-muted font-normal">Abrir gestion de ventas</span>
                        </div>
                    </CrmButton>
                )}

                <div className="h-px w-full bg-crm-surface-raised my-1"></div>

                {canAddExpense && (
                    <CrmButton onClick={onAddExpense} className="flex items-center justify-start gap-3 w-full bg-crm-bg border-crm-border hover:bg-crm-surface-raised text-white">
                        <Receipt size={16} className="text-[#22C55E]" />
                        <div className="flex flex-col items-start text-left">
                            <span className="font-medium">Agregar Gasto</span>
                            <span className="text-[10px] text-crm-fg-muted font-normal">Registrar costo interno</span>
                        </div>
                    </CrmButton>
                )}

                {canEditStock && (
                    <CrmButton onClick={onAddNote} className="flex items-center justify-start gap-3 w-full bg-crm-bg border-crm-border hover:bg-crm-surface-raised text-white">
                        <MessageSquare size={16} className="text-crm-fg-muted" />
                        <div className="flex flex-col items-start text-left">
                            <span>Agregar Observacion</span>
                            <span className="text-[10px] text-crm-fg-muted font-normal">Guardar nota interna</span>
                        </div>
                    </CrmButton>
                )}

                <CrmButton onClick={() => onPrintFlyer?.(vehicle)} className="flex items-center justify-start gap-3 w-full bg-crm-bg border-crm-border hover:bg-crm-surface-raised text-white">
                    <Printer size={16} className="text-blue-500" />
                    <div className="flex flex-col items-start text-left">
                        <span className="font-medium">Imprimir Ficha</span>
                        <span className="text-[10px] text-crm-fg-muted font-normal">Exportar ficha en A4 / PDF</span>
                    </div>
                </CrmButton>

                {canEditStock && (
                    <>
                        <div className="h-px w-full bg-crm-surface-raised my-1"></div>

                        <CrmButton onClick={onDelete} className="flex items-center justify-start gap-3 w-full bg-crm-red/10 border-red-500/20 hover:bg-crm-red/20 text-crm-red transition-colors">
                            <Trash2 size={16} />
                            <div className="flex flex-col items-start text-left">
                                <span className="font-medium">Eliminar Vehiculo</span>
                                <span className="text-[10px] text-red-400/80 font-normal">Accion destructiva</span>
                            </div>
                        </CrmButton>
                    </>
                )}
            </div>
        </CrmCard>
    );
}
