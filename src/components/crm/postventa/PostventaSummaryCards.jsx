import React from 'react';
import { Star, MessageSquareHeart, PhoneCall, Gift, AlertTriangle, MessageCircle } from 'lucide-react';

export default function PostventaSummaryCards({ sales, getSaleTaskStatus }) {
    if (!sales) return null;

    const entregadas = sales.length;
    const postventaPendiente = sales.filter(s => s.postSaleStatus === 'pendiente').length;
    const contactados = sales.filter(s => s.postSaleStatus === 'contactado').length;
    const conformes = sales.filter(s => s.postSaleStatus === 'conforme').length;
    const incidencias = sales.filter(s => s.postSaleStatus === 'incidencia').length;
    
    let resenasSolicitadas = 0;
    let resenasRecibidas = 0;
    let obsequiosEntregados = 0;

    sales.forEach(s => {
        if (s.postSaleChecklist?.resenaSolicitada) resenasSolicitadas++;
        if (s.postSaleChecklist?.resenaRecibida) resenasRecibidas++;
        if (s.postSaleChecklist?.obsequioEntregado) obsequiosEntregados++;
    });

    const cards = [
        {
            title: 'Pdtes de Seguimiento',
            value: postventaPendiente,
            icon: PhoneCall,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20'
        },
        {
            title: 'Clientes Conformes',
            value: conformes,
            icon: MessageSquareHeart,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20'
        },
        {
            title: 'Reseñas Recibidas',
            value: `${resenasRecibidas}/${resenasSolicitadas}`,
            icon: Star,
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20'
        },
        {
            title: 'Incidencias Abiertas',
            value: incidencias,
            icon: AlertTriangle,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20'
        },
        {
            title: 'Obsequios Entregados',
            value: obsequiosEntregados,
            icon: Gift,
            color: 'text-pink-500',
            bg: 'bg-pink-500/10',
            border: 'border-pink-500/20'
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {cards.map((card, index) => (
                <div key={index} className="bg-[#161619] border border-[#33333A] rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center border ${card.border}`}>
                            <card.icon size={20} className={card.color} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white mb-1">{card.value}</div>
                        <div className="text-xs text-[#A1A1AA] font-medium tracking-wide uppercase">{card.title}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
