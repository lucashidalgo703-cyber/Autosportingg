import React from 'react';
import { ArrowLeft, Edit2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CrmButton from '../ui/CrmButton';

export default function ClientDetailHeader({ client, onEdit, extraActions }) {
    const router = useRouter();

    if (!client) return null;

    const getStatusColor = (status) => {
        switch (status) {
            case 'activo': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
            case 'bloqueado': return 'border-crm-red/30 bg-crm-red/10 text-red-300';
            default: return 'border-crm-border bg-crm-bg text-crm-fg-muted';
        }
    };

    return (
        <div className="rounded-xl border border-crm-border bg-crm-surface p-4 md:p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/clientes')}
                        className="m-0 mb-4 inline-flex appearance-none items-center gap-2 border-0 bg-transparent p-0 text-sm font-semibold text-crm-fg-muted transition-colors hover:text-crm-fg"
                    >
                        <ArrowLeft size={16} />
                        Volver a clientes
                    </button>

                    <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-crm-border bg-crm-bg text-crm-fg-muted">
                            <User size={26} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="m-0 truncate text-2xl font-bold leading-tight text-crm-fg">
                                    {client.fullName}
                                </h1>
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${getStatusColor(client.status)}`}>
                                    {client.status || 'sin estado'}
                                </span>
                            </div>
                            <p className="m-0 mt-1 text-sm text-crm-fg-muted">
                                Registrado el {new Date(client.createdAt).toLocaleDateString('es-AR')}
                                {client.createdBy && <span className="text-crm-fg-subtle"> · Por {client.createdBy}</span>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
                    {client.tags && client.tags.map((tag, idx) => (
                        <span key={idx} className="rounded-lg border border-crm-border bg-crm-bg px-3 py-1.5 text-xs font-semibold text-crm-fg-muted">
                            #{tag}
                        </span>
                    ))}

                    {extraActions && extraActions}

                    <CrmButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onEdit}
                        className="flex-1 gap-2 md:flex-none"
                    >
                        <Edit2 size={15} />
                        Editar
                    </CrmButton>
                </div>
            </div>
        </div>
    );
}
