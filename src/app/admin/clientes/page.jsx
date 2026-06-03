"use client";
import React, { useEffect, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { useAdminClients } from '../../../hooks/useAdminClients';
import ClientFilters from '../../../components/crm/clients/ClientFilters';
import ClientsTable from '../../../components/crm/clients/ClientsTable';
import ClientMobileCards from '../../../components/crm/clients/ClientMobileCards';
import ClientFormModal from '../../../components/crm/clients/ClientFormModal';

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

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
            <div className="flex flex-col gap-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-crm-fg m-0 mb-1 flex items-center gap-2">
                            Gestión de Clientes
                            <span className="bg-crm-success/10 text-crm-success text-[10px] px-2 py-0.5 rounded font-medium border border-crm-success/20">
                                Base Real
                            </span>
                        </h1>
                        <p className="text-sm text-crm-fg-muted m-0">
                            Total registrados: <strong className="text-crm-fg">{total}</strong> clientes
                        </p>
                    </div>
                
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-crm-red-gradient text-white hover:opacity-90 active:opacity-80 shadow-crm-red h-8 px-3 text-xs rounded-lg font-medium transition-all flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <Plus size={16} />
                        Nuevo Cliente
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-col">
                <ClientFilters filters={filters} setFilters={setFilters} onSearch={handleSearch} />
                
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">
                        {error}
                    </div>
                )}
                
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
                    </div>
                ) : (
                    <>
                        {/* Vista Desktop */}
                        <div className="hidden md:block">
                            <ClientsTable clients={clients} />
                        </div>
                        
                        {/* Vista Mobile */}
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
