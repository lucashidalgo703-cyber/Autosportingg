"use client";
import CrmCard from '../ui/CrmCard';
import { Edit, CalendarClock, ShoppingCart, Receipt, MessageSquare, Lock, Trash2, Printer } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { canReserveVehicle, getVehicleOperationalStatus } from '../../../utils/vehicleDetail';

export default function VehicleActionsPanel({ vehicle, onEdit, onAddExpense, onReserve, onCancelReserve, onDelete, onAddNote, onStartSale, onPrintFlyer, activeReservation, isOffline = false, reservationUnavailable = false }) {
    const { user } = useAuth();
    const canEdit = hasPermission(user, PERMISSIONS.STOCK_WRITE) && !isOffline;
    const canReserve = hasPermission(user, PERMISSIONS.RESERVAS_WRITE) && !isOffline;
    const canStartSale = hasPermission(user, PERMISSIONS.VENTAS_WRITE) && !isOffline;
    const reserveDisabled = reservationUnavailable || !canReserveVehicle(vehicle, activeReservation);
    const status = getVehicleOperationalStatus(vehicle);
    const actions = [
        canEdit && { label: 'Editar vehículo', hint: 'Datos, propiedad y precios', icon: Edit, onClick: onEdit },
        canReserve && { label: 'Tomar reserva', hint: reservationUnavailable ? 'Actualizá la reserva vigente' : activeReservation?._id ? 'Ya tiene una reserva activa' : status !== 'disponible' ? 'Solo para unidades disponibles' : 'Bloquear la unidad con seña', icon: CalendarClock, onClick: onReserve, disabled: reserveDisabled },
        canReserve && activeReservation?._id && { label: 'Liberar reserva', hint: 'Cancelación y condiciones de la seña', icon: Lock, onClick: onCancelReserve },
        canStartSale && { label: 'Ir a Ventas', hint: 'Gestionar la operación comercial', icon: ShoppingCart, onClick: onStartSale },
        canEdit && { label: 'Agregar gasto', hint: 'Registrar un costo de la unidad', icon: Receipt, onClick: onAddExpense },
        canEdit && { label: 'Agregar observación', hint: 'Guardar una nota en el historial', icon: MessageSquare, onClick: onAddNote },
        { label: 'Imprimir ficha', hint: 'Ficha de la unidad en A4 / PDF', icon: Printer, onClick: () => onPrintFlyer?.(vehicle) },
        canEdit && { label: 'Eliminar vehículo', hint: 'Revisar vínculos y consecuencias', icon: Trash2, onClick: onDelete, danger: true }
    ].filter(Boolean);
    return <CrmCard className="min-w-0">
        <h2 className="mb-3 text-sm font-semibold text-crm-fg">Acciones de la unidad</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">{actions.map(({ label, hint, icon: Icon, onClick, disabled, danger }) => <button key={label} type="button" onClick={onClick} disabled={disabled} className={`flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red disabled:cursor-not-allowed disabled:opacity-50 ${danger ? 'border-red-500/20 bg-crm-red/5 text-crm-red hover:bg-crm-red/10' : 'border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised'}`}><Icon size={15} className="shrink-0" /><span className="min-w-0"><span className="block text-xs font-medium">{label}</span><span className="block break-words text-[10px] font-normal text-crm-fg-muted">{hint}</span></span></button>)}</div>
    </CrmCard>;
}
