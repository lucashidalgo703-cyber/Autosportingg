"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, UserCheck, UserPlus, Users } from 'lucide-react';
import { useAdminClients } from '../../../hooks/useAdminClients';
import ClientFilters from '../../../components/crm/clients/ClientFilters';
import ClientsTable from '../../../components/crm/clients/ClientsTable';
import ClientMobileCards from '../../../components/crm/clients/ClientMobileCards';
import ClientFormModal from '../../../components/crm/clients/ClientFormModal';
import CrmButton from '../../../components/crm/ui/CrmButton';

const summaryCards = [
    { key: 'total', label: 'Clientes cargados', icon: Users, tone: 'bg-blue-500/15 text-blue-300' },
    { key: 'activos', label: 'Activos', icon: UserCheck, tone: 'bg-emerald-500/15 text-emerald-300' },
    { key: 'compradores', label: 'Compradores', icon: UserPlus, tone: 'bg-purple-500/15 text-purple-300' },
    { key: 'potenciales', label: 'Potenciales', icon: Users, tone: 'bg-amber-500/15 text-amber-300' }
];

export default function AdminClientesPage() {
    const { clients, loading, error, total, fetchClients, createClient } = useAdminClients();

    const [filters, setFilters] = useState({ search: '', type: '', source: '', status: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchClients(filters);
    }, []); // Initial load

    const handleSearch = (newFilters) => {
        fetchClients(newFilters);
    };

    const handleCreateClient = async (clientData) => {
        await createClient(clientData);
        fetchClients(filters); // Reload list
    };

    const summary = useMemo(() => {
        const source = clients || [];

        return {
            total: total || source.length,
            activos: source.filter(client => client.status === 'activo').length,
            compradores: source.filter(client => client.type === 'comprador' || client.type === 'ambos').length,
            potenciales: source.filter(client => client.type === 'potencial').length
        };
    }, [clients, total]);

    return (
        <div className="mx-auto w-full max-w-7xl p-4 pb-20 md:p-6">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Clientes</h1>
                            <span className="rounded border border-crm-success/20 bg-crm-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-success">
                                Base Real
                            </span>
                        </div>
                        <p className="m-0 mt-1 text-sm text-crm-fg-muted">
                            Base de contactos y clientes comerciales de AutoSporting.
                        </p>
                    </div>

                    <CrmButton
                        variant="primary"
                        size="sm"
                        onClick={() => setIsModalOpen(true)}
                        className="w-full gap-2 md:w-auto"
                    >
                        <Plus size={16} />
                        Nuevo Cliente
                    </CrmButton>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {summaryCards.map((card) => {
                        const Icon = card.icon;

                        return (
                            <div key={card.key} className="rounded-xl border border-crm-border bg-crm-surface p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">{card.label}</p>
                                        <p className="m-0 mt-3 text-2xl font-bold leading-none text-crm-fg">{summary[card.key]}</p>
                                    </div>
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.tone}`}>
                                        <Icon size={18} />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-col">
                    <ClientFilters filters={filters} setFilters={setFilters} onSearch={handleSearch} />

                    {error && (
                        <div className="mb-6 rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                                <span className="text-sm text-crm-fg-muted">Cargando clientes...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="hidden md:block">
                                <ClientsTable clients={clients} />
                            </div>

                            <div className="md:hidden">
                                <ClientMobileCards clients={clients} />
                            </div>
                        </>
                    )}
                </div>

                <ClientFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleCreateClient}
                />
            </div>
        </div>
    );
}
