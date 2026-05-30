"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAdminClients } from '../../../../hooks/useAdminClients';
import ClientDetailHeader from '../../../../components/crm/clients/ClientDetailHeader';
import ClientInfoPanel from '../../../../components/crm/clients/ClientInfoPanel';
import ClientActivityPanel from '../../../../components/crm/clients/ClientActivityPanel';
import ClientRelatedLeadsPanel from '../../../../components/crm/clients/ClientRelatedLeadsPanel';
import ClientFormModal from '../../../../components/crm/clients/ClientFormModal';
import CommunicationLogPanel from '../../../../components/crm/communications/CommunicationLogPanel';
import { AlertCircle } from 'lucide-react';

export default function AdminClientDetailPage() {
    const { id } = useParams();
    const { fetchClientById, updateClient, loading, error } = useAdminClients();
    const [client, setClient] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    const loadClient = async () => {
        try {
            const data = await fetchClientById(id);
            setClient(data);
        } catch (err) {
            setFetchError(err.message);
        }
    };

    useEffect(() => {
        if (id) {
            loadClient();
        }
    }, [id]);

    const handleUpdate = async (updatedData) => {
        await updateClient(id, updatedData);
        await loadClient(); // Reload after update
    };

    if (loading && !client) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
        );
    }

    if (fetchError || (!loading && !client)) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl flex items-center gap-3">
                    <AlertCircle size={24} />
                    <p>{fetchError || 'Cliente no encontrado'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
            <ClientDetailHeader 
                client={client} 
                onEdit={() => setIsEditModalOpen(true)} 
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="flex-1 min-h-[400px]">
                        <ClientInfoPanel client={client} />
                    </div>
                </div>
                
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ClientActivityPanel client={client} />
                    <ClientRelatedLeadsPanel client={client} />
                </div>
            </div>

            <div className="h-[500px]">
                <CommunicationLogPanel 
                    entityType="client" 
                    entityId={client._id} 
                    clientId={client._id}
                />
            </div>

            <ClientFormModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                onSave={handleUpdate}
                client={client}
            />
        </div>
    );
}
