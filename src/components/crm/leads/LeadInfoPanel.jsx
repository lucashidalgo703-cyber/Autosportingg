import React from 'react';
import { CalendarDays, FileText, Inbox, Mail, Phone, Target, User } from 'lucide-react';

export default function LeadInfoPanel({ lead }) {
    if (!lead) return null;

    const InfoItem = ({ icon: Icon, label, value, accent = 'text-crm-fg-muted' }) => (
        <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
            <div className="mb-1 flex items-center gap-2 text-crm-fg-muted">
                <Icon size={14} className={accent} />
                <span className="text-[11px] font-bold uppercase tracking-[0.08em]">{label}</span>
            </div>
            <div className="text-sm font-semibold text-crm-fg">
                {value || <span className="font-normal italic text-crm-fg-subtle">No especificado</span>}
            </div>
        </div>
    );

    const notes = Array.isArray(lead.notes) ? lead.notes : null;

    return (
        <div className="flex h-full flex-col rounded-xl border border-crm-border bg-crm-surface p-5">
            <h3 className="m-0 mb-5 flex items-center gap-2 text-lg font-bold text-crm-fg">
                <Target size={19} className="text-crm-red" />
                Informacion comercial
            </h3>

            <div className="flex flex-1 flex-col gap-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <InfoItem icon={User} label="Nombre del contacto" value={lead.name} />
                    <InfoItem icon={Phone} label="Telefono principal" value={lead.phone} />
                    <InfoItem icon={Mail} label="Email" value={lead.email} />
                    <InfoItem icon={User} label="Asignado a" value={lead.assignedTo} accent="text-crm-red" />
                    <InfoItem
                        icon={CalendarDays}
                        label="Proxima accion"
                        value={lead.nextActionDate ? new Date(lead.nextActionDate).toLocaleDateString() : null}
                        accent="text-blue-300"
                    />
                    <InfoItem icon={Inbox} label="Stage legacy" value={lead.pipelineStage || 'No aplica'} />
                </div>

                <div className="flex flex-1 flex-col gap-3">
                    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">
                        <FileText size={14} />
                        Notas de la cotizacion
                    </span>
                    <div className="flex max-h-[300px] min-h-[150px] flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-crm-border bg-crm-bg p-4 custom-scrollbar">
                        {notes && notes.length > 0 ? (
                            notes.map((note, idx) => (
                                <div key={idx} className="rounded-lg border border-crm-border bg-crm-surface p-3">
                                    <p className="m-0 text-sm text-crm-fg-muted">{note?.text || note}</p>
                                    {note?.date && <span className="mt-2 block text-[10px] text-crm-fg-subtle">{new Date(note.date).toLocaleString()}</span>}
                                </div>
                            ))
                        ) : typeof lead.notes === 'string' && lead.notes.length > 0 ? (
                            <div className="rounded-lg border border-crm-border bg-crm-surface p-3">
                                <p className="m-0 text-sm text-crm-fg-muted">{lead.notes}</p>
                            </div>
                        ) : (
                            <div className="flex flex-1 items-center justify-center text-sm italic text-crm-fg-subtle">
                                Sin notas registradas.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
