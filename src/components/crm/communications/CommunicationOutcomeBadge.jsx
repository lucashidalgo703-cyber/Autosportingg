import React from 'react';

export default function CommunicationOutcomeBadge({ outcome, className = '' }) {
    const getOutcomeData = (o) => {
        switch (o) {
            case 'contacted': return { text: 'Contactado', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
            case 'no_response': return { text: 'Sin Respuesta', color: 'bg-crm-red/10 text-red-400 border-red-500/20' };
            case 'interested': return { text: 'Interesado', color: 'bg-green-500/10 text-green-400 border-green-500/20' };
            case 'not_interested': return { text: 'No Interesado', color: 'bg-gray-500/10 text-crm-fg-muted border-gray-500/20' };
            case 'pending_reply': return { text: 'Espera Respuesta', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
            case 'requested_financing': return { text: 'Pidió Financiación', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
            case 'requested_visit': return { text: 'Pidió Visita', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
            case 'requested_documentation': return { text: 'Pidió Docs', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
            case 'documentation_sent': return { text: 'Docs Enviados', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' };
            case 'reservation_followup': return { text: 'Seguim. Reserva', color: 'bg-indigo-600/10 text-indigo-400 border-indigo-600/20' };
            case 'sale_followup': return { text: 'Seguim. Venta', color: 'bg-green-600/10 text-green-400 border-green-600/20' };
            case 'post_sale_followup': return { text: 'Seguim. Postventa', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' };
            case 'review_requested': return { text: 'Pidió Reseña', color: 'bg-yellow-600/10 text-yellow-500 border-yellow-600/20' };
            case 'complaint': return { text: 'Reclamo', color: 'bg-red-600/10 text-crm-red border-red-600/20' };
            case 'resolved': return { text: 'Resuelto', color: 'bg-green-500/20 text-green-500 border-green-500/30 font-bold' };
            case 'other': default: return { text: 'Otro', color: 'bg-gray-600/10 text-crm-fg-muted border-gray-600/20' };
        }
    };

    const data = getOutcomeData(outcome);

    return (
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-semibold border ${data.color} ${className}`}>
            {data.text}
        </span>
    );
}
