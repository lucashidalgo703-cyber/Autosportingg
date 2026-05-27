import React from 'react';
import { Target, Phone, Mail, FileText, User, CalendarDays, Inbox } from 'lucide-react';

export default function LeadInfoPanel({ lead }) {
    if (!lead) return null;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Target size={20} className="text-red-500" />
                Información Comercial
            </h3>

            <div className="flex flex-col gap-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Nombre del Contacto</span>
                        <div className="flex items-center gap-2 text-white bg-black/30 p-3 rounded-lg border border-neutral-800">
                            <User size={16} className="text-neutral-400" />
                            {lead.name}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Teléfono Principal</span>
                        <div className="flex items-center gap-2 text-white bg-black/30 p-3 rounded-lg border border-neutral-800">
                            <Phone size={16} className="text-neutral-400" />
                            {lead.phone}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Email</span>
                        <div className="flex items-center gap-2 text-white bg-black/30 p-3 rounded-lg border border-neutral-800">
                            <Mail size={16} className="text-neutral-400" />
                            {lead.email || <span className="text-neutral-600 italic">No proporcionado</span>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Asignado A</span>
                        <div className="flex items-center gap-2 text-white bg-black/30 p-3 rounded-lg border border-neutral-800">
                            <User size={16} className="text-red-400" />
                            {lead.assignedTo || <span className="text-neutral-600 italic">Sin asignar</span>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Próxima Acción</span>
                        <div className="flex items-center gap-2 text-white bg-black/30 p-3 rounded-lg border border-neutral-800">
                            <CalendarDays size={16} className="text-blue-400" />
                            {lead.nextActionDate ? new Date(lead.nextActionDate).toLocaleDateString() : <span className="text-neutral-600 italic">No programada</span>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Stage Legacy</span>
                        <div className="flex items-center gap-2 text-neutral-400 bg-black/30 p-3 rounded-lg border border-neutral-800 text-sm">
                            <Inbox size={16} />
                            {lead.pipelineStage || 'No aplica'}
                        </div>
                    </div>
                </div>

                {/* Notes section */}
                <div className="flex flex-col gap-3 mt-4 flex-1">
                    <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider flex items-center gap-2">
                        <FileText size={14} /> Notas del Lead
                    </span>
                    <div className="bg-black/30 p-4 rounded-xl border border-neutral-800 flex-1 min-h-[150px] max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-3">
                        {Array.isArray(lead.notes) && lead.notes.length > 0 ? (
                            lead.notes.map((note, idx) => (
                                <div key={idx} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg">
                                    <p className="text-sm text-neutral-300">{note?.text || note}</p>
                                    {note?.date && <span className="text-[10px] text-neutral-500 mt-2 block">{new Date(note.date).toLocaleString()}</span>}
                                </div>
                            ))
                        ) : typeof lead.notes === 'string' && lead.notes.length > 0 ? (
                            <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg">
                                <p className="text-sm text-neutral-300">{lead.notes}</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-sm text-neutral-600 italic">
                                Sin notas registradas.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
