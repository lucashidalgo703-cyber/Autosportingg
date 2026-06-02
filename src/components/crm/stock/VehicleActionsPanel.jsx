"use client";
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';
import { Edit, CalendarClock, Handshake, Receipt, MessageSquare, Lock, Trash2 } from 'lucide-react';

export default function VehicleActionsPanel({ vehicle, onEdit, onAddExpense, onReserve, onCancelReserve, onDelete, activeReservation }) {
    return (
        <CrmCard>
            <h3 className="text-white font-semibold text-lg mb-4">Acciones de Stock</h3>
            
            <div className="flex flex-col gap-3">
                <CrmButton onClick={onEdit} className="flex items-center justify-start gap-3 w-full bg-[#161619] border-[#33333A] hover:bg-[#24242B] text-white">
                    <Edit size={16} className="text-[#E63027]" />
                    <div className="flex flex-col items-start text-left">
                        <span className="font-medium">Editar Vehículo</span>
                        <span className="text-[10px] text-[#A1A1AA] font-normal">Actualizar datos y visibilidad</span>
                    </div>
                </CrmButton>

                <CrmButton 
                    onClick={onReserve}
                    disabled={vehicle?.status === 'Vendido' || vehicle?.status === 'Reservado' || !!activeReservation?._id}
                    className={`flex items-center justify-start gap-3 w-full border-[#33333A] ${vehicle?.status === 'Vendido' || vehicle?.status === 'Reservado' || activeReservation?._id ? 'opacity-50 cursor-not-allowed bg-[#24242B] hover:bg-[#24242B]' : 'bg-[#161619] hover:bg-[#24242B] text-white'}`}
                >
                    <CalendarClock size={16} className={vehicle?.status === 'Vendido' || vehicle?.status === 'Reservado' || activeReservation?._id ? '' : 'text-[#E63027]'} />
                    <div className="flex flex-col items-start text-left">
                        <span>Tomar Reserva</span>
                        <span className="text-[10px] text-[#A1A1AA] font-normal">
                            {activeReservation?._id ? 'Ya existe reserva activa' : 
                             vehicle?.status === 'Vendido' ? 'Vehículo vendido' : 
                             vehicle?.status === 'Reservado' ? 'Vehículo reservado' : 
                             'Bloquear vehículo con seña'}
                        </span>
                    </div>
                </CrmButton>

                {activeReservation?._id && (
                    <CrmButton 
                        onClick={onCancelReserve}
                        className="flex items-center justify-start gap-3 w-full bg-[#161619] border-red-500/30 hover:bg-[#24242B] text-white"
                    >
                        <Lock size={16} className="text-red-500" />
                        <div className="flex flex-col items-start text-left">
                            <span className="text-red-400">Liberar Reserva</span>
                            <span className="text-[10px] text-[#A1A1AA] font-normal">Desactivar y desbloquear auto</span>
                        </div>
                    </CrmButton>
                )}

                <CrmButton className="flex items-center justify-start gap-3 w-full opacity-50 cursor-not-allowed bg-[#24242B] border-[#33333A] hover:bg-[#24242B]">
                    <Handshake size={16} />
                    <div className="flex flex-col items-start text-left">
                        <span>Marcar Vendido</span>
                        <span className="text-[10px] text-[#A1A1AA] font-normal">Próxima fase</span>
                    </div>
                </CrmButton>

                <div className="h-px w-full bg-[#33333A] my-1"></div>

                <CrmButton onClick={onAddExpense} className="flex items-center justify-start gap-3 w-full bg-[#161619] border-[#33333A] hover:bg-[#24242B] text-white">
                    <Receipt size={16} className="text-[#22C55E]" />
                    <div className="flex flex-col items-start text-left">
                        <span className="font-medium">Agregar Gasto</span>
                        <span className="text-[10px] text-[#A1A1AA] font-normal">Registrar costo interno</span>
                    </div>
                </CrmButton>

                <CrmButton className="flex items-center justify-start gap-3 w-full opacity-50 cursor-not-allowed bg-[#24242B] border-[#33333A] hover:bg-[#24242B]">
                    <MessageSquare size={16} />
                    <div className="flex flex-col items-start text-left">
                        <span>Agregar Observación</span>
                        <span className="text-[10px] text-[#A1A1AA] font-normal">Disponible en próxima fase</span>
                    </div>
                </CrmButton>

                <div className="h-px w-full bg-[#33333A] my-1"></div>

                <CrmButton onClick={onDelete} className="flex items-center justify-start gap-3 w-full bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-500 transition-colors">
                    <Trash2 size={16} />
                    <div className="flex flex-col items-start text-left">
                        <span className="font-medium">Eliminar Vehículo</span>
                        <span className="text-[10px] text-red-400/80 font-normal">Acción destructiva</span>
                    </div>
                </CrmButton>
            </div>
        </CrmCard>
    );
}
