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
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Users className="text-red-600" size={32} />
                        <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Clientes</h1>
                        <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ml-2">
                            Base Real
                        </span>
                    </div>
                    <p className="text-neutral-400 text-sm">
                        Total registrados: <strong className="text-white">{total}</strong> clientes
                    </p>
                </div>
                
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-900/20 w-full md:w-auto justify-center"
                >
                    <Plus size={20} />
                    Nuevo Cliente
                </button>
            </div>

            {/* Content */}
            <div className="bg-black/20 p-4 md:p-6 rounded-2xl border border-neutral-800/50">
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
    );
}
