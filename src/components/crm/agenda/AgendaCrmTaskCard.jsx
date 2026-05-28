import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, CheckCircle2, AlertCircle, XCircle, ChevronDown, Handshake, Target, Clock4 } from 'lucide-react';

export default function AgendaCrmTaskCard({ task, onComplete, onCancel, onPostpone }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPostponing, setIsPostponing] = useState(false);
    const [newDate, setNewDate] = useState('');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(task.dueDate);
    const isOverdue = dueDate < today;
    const isToday = dueDate.getTime() === today.getTime();

    const getPriorityColor = (priority) => {
        switch(priority) {
            case 'alta': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'media': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            case 'baja': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            default: return 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20';
        }
    };

    const handlePostponeSubmit = () => {
        if (!newDate) return;
        onPostpone(task._id, newDate);
        setIsPostponing(false);
    };

    return (
        <div className={`bg-neutral-900 border ${isOverdue ? 'border-red-500/30' : isToday ? 'border-blue-500/30' : 'border-neutral-800'} rounded-2xl p-4 flex flex-col gap-3 relative transition-all overflow-hidden`}>
            
            {/* Top Bar: Type & Priority */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    {task.type === 'cobranza' ? (
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            <Target size={12} /> Cobranza
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            {task.type}
                        </span>
                    )}
                    <span className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
                    <Calendar size={12} className={isOverdue ? 'text-red-400' : ''} />
                    <span className={isOverdue ? 'text-red-400 font-bold' : ''}>
                        {dueDate.toLocaleDateString('es-AR')}
                    </span>
                    {task.dueTime && (
                        <span className="flex items-center gap-1 ml-1">
                            <Clock size={12} />
                            {task.dueTime}
                        </span>
                    )}
                </div>
            </div>

            {/* Title & Description */}
            <div>
                <h3 className="text-white font-bold text-base leading-tight mb-1">{task.title}</h3>
                
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-2"
                >
                    {isExpanded ? 'Ocultar notas' : 'Ver detalle de la nota'}
                    <ChevronDown size={14} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && task.description && (
                    <div className="mt-3 p-3 bg-black/40 rounded-xl border border-neutral-800 text-sm text-neutral-300 whitespace-pre-line leading-relaxed">
                        {task.description}
                    </div>
                )}
            </div>

            {/* Linked Data */}
            <div className="flex flex-col gap-2 mt-2 bg-black/20 p-3 rounded-xl border border-neutral-800/50">
                {task.clientId && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500 uppercase">Cliente</span>
                        <span className="text-white font-bold">{task.clientId.fullName || task.clientId.firstName || 'Sin cliente'}</span>
                    </div>
                )}
                {task.vehicleId && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500 uppercase">Vehículo</span>
                        <span className="text-neutral-300 truncate max-w-[150px]">{task.vehicleId.brand} {task.vehicleId.name}</span>
                    </div>
                )}
                
                {/* Action Links */}
                <div className="flex gap-3 mt-2 pt-2 border-t border-neutral-800">
                    {task.saleId && (
                        <Link href={`/admin/ventas/${task.saleId._id || task.saleId}`} className="text-xs font-bold text-blue-400 flex items-center gap-1 hover:text-blue-300 transition-colors">
                            <Handshake size={12} /> Ver Venta
                        </Link>
                    )}
                    {task.type === 'cobranza' && (
                        <Link href="/admin/cobranzas" className="text-xs font-bold text-orange-400 flex items-center gap-1 hover:text-orange-300 transition-colors">
                            <Target size={12} /> Ir a Cobranzas
                        </Link>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-2">
                <button
                    onClick={() => onComplete(task._id)}
                    className="flex-1 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold rounded-lg transition-colors border border-green-500/20 flex items-center justify-center gap-1.5"
                >
                    <CheckCircle2 size={14} /> Completar
                </button>
                
                <button
                    onClick={() => setIsPostponing(!isPostponing)}
                    className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-lg transition-colors border border-neutral-700"
                    title="Posponer"
                >
                    <Clock4 size={14} />
                </button>

                <button
                    onClick={() => onCancel(task._id)}
                    className="py-2 px-3 bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 text-xs font-bold rounded-lg transition-colors border border-neutral-700 hover:border-red-500/30"
                    title="Cancelar"
                >
                    <XCircle size={14} />
                </button>
            </div>

            {/* Postpone Form */}
            {isPostponing && (
                <div className="mt-2 p-3 bg-neutral-800 rounded-xl flex gap-2">
                    <input 
                        type="date" 
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="flex-1 bg-black/40 border border-neutral-700 rounded-lg px-2 text-xs text-white [color-scheme:dark]" 
                    />
                    <button 
                        onClick={handlePostponeSubmit}
                        className="bg-blue-500 text-white text-xs font-bold px-3 rounded-lg"
                    >
                        Ok
                    </button>
                </div>
            )}
        </div>
    );
}
