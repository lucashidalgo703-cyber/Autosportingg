import React from 'react';
import { Calendar, User, FileText, Settings, Trash2, Edit2, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export default function MandateTable({ data, onEdit, onDelete }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-crm-border border-dashed bg-crm-surface/50 py-20">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-crm-bg text-crm-fg-muted shadow-inner">
                    <FileText size={28} />
                </div>
                <h3 className="mb-1 text-lg font-bold text-white">Sin mandatos</h3>
                <p className="mb-6 max-w-sm text-center text-sm text-crm-fg-muted">
                    No se encontraron mandatos que coincidan con los filtros seleccionados.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-hidden rounded-xl border border-crm-border bg-crm-surface">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm text-crm-fg">
                    <thead className="bg-crm-bg text-xs uppercase text-crm-fg-muted">
                        <tr>
                            <th className="px-4 py-3 font-bold">Vehículo / Mandante</th>
                            <th className="px-4 py-3 font-bold">Fecha / Plazo</th>
                            <th className="px-4 py-3 font-bold">Mandatario</th>
                            <th className="px-4 py-3 font-bold">Valor</th>
                            <th className="px-4 py-3 font-bold text-center">Vínculo Stock</th>
                            <th className="px-4 py-3 font-bold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
                        {data.map((mandate) => (
                            <tr key={mandate._id} className="hover:bg-crm-bg/50 transition-colors group">
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white">
                                            {mandate.brand} {mandate.model}
                                        </span>
                                        <span className="text-xs text-crm-fg-muted flex items-center gap-1">
                                            <User size={10} /> {mandate.clientName}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="text-crm-fg">
                                            {new Date(mandate.mandateDate).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs text-crm-fg-muted flex items-center gap-1">
                                            <Calendar size={10} /> {mandate.termDays} días
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-crm-fg">{mandate.representativeName}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-crm-red">
                                            {mandate.currency} {mandate.value?.toLocaleString()}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {mandate.linkedCarId ? (
                                        <span className="inline-flex items-center gap-1 rounded bg-crm-bg border border-crm-border px-2 py-1 text-xs font-semibold text-crm-fg-muted">
                                            <LinkIcon size={12} /> Stock ID
                                        </span>
                                    ) : (
                                        <span className="text-xs text-crm-fg-subtle">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Edit disabled for MVP, user requests simple UI but we can open modal if needed */}
                                        <button 
                                            onClick={() => onDelete(mandate)}
                                            className="p-1.5 rounded bg-crm-bg text-crm-red hover:text-white hover:bg-red-900/30 transition-colors"
                                            title="Eliminar mandato"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
