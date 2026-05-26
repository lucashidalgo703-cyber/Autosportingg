"use client";
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';
import { Edit, CalendarClock, Handshake, Receipt, MessageSquare } from 'lucide-react';

export default function VehicleActionsPanel({ vehicle }) {
    return (
        <CrmCard>
            <h3 className="text-white font-semibold text-lg mb-4">Acciones (Fase Demo)</h3>
            
            <div className="flex flex-col gap-3">
                <CrmButton className="flex items-center justify-start gap-3 w-full opacity-50 cursor-not-allowed bg-[#24242B] border-[#33333A] hover:bg-[#24242B]">
                    <Edit size={16} />
                    <div className="flex flex-col items-start text-left">
                        <span>Editar Vehículo</span>
                        <span className="text-[10px] text-[#A1A1AA] font-normal">Disponible en próxima fase</span>
                    </div>
                </CrmButton>

                <CrmButton className="flex items-center justify-start gap-3 w-full opacity-50 cursor-not-allowed bg-[#24242B] border-[#33333A] hover:bg-[#24242B]">
                    <CalendarClock size={16} />
                    <div className="flex flex-col items-start text-left">
                        <span>Generar Reserva</span>
                        <span className="text-[10px] text-[#A1A1AA] font-normal">Disponible en próxima fase</span>
                    </div>
                </CrmButton>

                <CrmButton className="flex items-center justify-start gap-3 w-full opacity-50 cursor-not-allowed bg-[#24242B] border-[#33333A] hover:bg-[#24242B]">
                    <Handshake size={16} />
                    <div className="flex flex-col items-start text-left">
                        <span>Marcar Vendido</span>
                        <span className="text-[10px] text-[#A1A1AA] font-normal">Disponible en próxima fase</span>
                    </div>
                </CrmButton>

                <div className="h-px w-full bg-[#33333A] my-1"></div>

                <CrmButton className="flex items-center justify-start gap-3 w-full opacity-50 cursor-not-allowed bg-[#24242B] border-[#33333A] hover:bg-[#24242B]">
                    <Receipt size={16} />
                    <div className="flex flex-col items-start text-left">
                        <span>Agregar Gasto</span>
                        <span className="text-[10px] text-[#A1A1AA] font-normal">Disponible en próxima fase</span>
                    </div>
                </CrmButton>

                <CrmButton className="flex items-center justify-start gap-3 w-full opacity-50 cursor-not-allowed bg-[#24242B] border-[#33333A] hover:bg-[#24242B]">
                    <MessageSquare size={16} />
                    <div className="flex flex-col items-start text-left">
                        <span>Agregar Observación</span>
                        <span className="text-[10px] text-[#A1A1AA] font-normal">Disponible en próxima fase</span>
                    </div>
                </CrmButton>
            </div>
        </CrmCard>
    );
}
