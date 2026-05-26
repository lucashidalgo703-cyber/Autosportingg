"use client";
import CrmCard from '../ui/CrmCard';
import { Clock, Plus, Tag, Flag } from 'lucide-react';

export default function VehicleHistoryTimeline({ vehicle }) {
    // Generamos un historial simulado basado en el vehiculo
    const timeline = [
        {
            id: 1,
            icon: Plus,
            title: 'Ingreso al Stock',
            desc: `Vehículo dado de alta en origen ${vehicle.origen}`,
            date: new Date(vehicle.fechaIngreso).toLocaleDateString('es-AR'),
            color: 'bg-[#3B82F6]'
        },
        {
            id: 2,
            icon: Tag,
            title: 'Precio Establecido',
            desc: `Se fijó precio de publicación en ${vehicle.moneda} ${vehicle.precioPublicado.toLocaleString('es-AR')}`,
            date: new Date(new Date(vehicle.fechaIngreso).getTime() + 86400000).toLocaleDateString('es-AR'), // un día después
            color: 'bg-[#22C55E]'
        }
    ];

    if (vehicle.estado !== 'disponible') {
        timeline.push({
            id: 3,
            icon: Flag,
            title: 'Cambio de Estado',
            desc: `El vehículo pasó a estado: ${vehicle.estado}`,
            date: new Date().toLocaleDateString('es-AR'), // hoy
            color: 'bg-[#E63027]'
        });
    }

    return (
        <CrmCard>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-semibold text-lg">Historial de Actividad</h3>
            </div>
            
            <div className="flex flex-col relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-[#33333A] gap-6">
                {timeline.map((item, index) => (
                    <div key={item.id} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active`}>
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#1E1E24] ${item.color} text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow z-10`}>
                            <item.icon size={16} />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#161619] p-4 rounded-xl border border-[#33333A]">
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="font-semibold text-sm text-white">{item.title}</h4>
                                <span className="text-xs text-[#A1A1AA] flex items-center gap-1"><Clock size={12}/> {item.date}</span>
                            </div>
                            <p className="text-xs text-[#A1A1AA] leading-snug m-0">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </CrmCard>
    );
}
