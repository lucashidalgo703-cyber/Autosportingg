"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAdminClients } from '../../../../hooks/useAdminClients';
import ClientDetailHeader from '../../../../components/crm/clients/ClientDetailHeader';
import ClientInfoPanel from '../../../../components/crm/clients/ClientInfoPanel';
import ClientActivityPanel from '../../../../components/crm/clients/ClientActivityPanel';
import ClientRelatedLeadsPanel from '../../../../components/crm/clients/ClientRelatedLeadsPanel';
import ClientRelatedSalesPanel from '../../../../components/crm/clients/ClientRelatedSalesPanel';
import ClientFormModal from '../../../../components/crm/clients/ClientFormModal';
import CommunicationLogPanel from '../../../../components/crm/communications/CommunicationLogPanel';
import MessageTemplatePicker from '../../../../components/crm/templates/MessageTemplatePicker';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

export default function AdminClientDetailPage() {
    const { id } = useParams();
    const { token } = useAuth();
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

    const handleLogTemplateAction = async (template, copiedText) => {
        try {
            await fetch('/api/admin/communication-logs', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    entityType: 'client',
                    entityId: id,
                    clientId: id,
                    assignedTo: client?.assignedTo?._id || client?.assignedTo || null,
                    channel: template.channel || 'whatsapp',
                    direction: 'outbound',
                    outcome: 'contacted',
                    title: `Plantilla usada: ${template.name}`,
                    notes: copiedText.length > 500 ? copiedText.substring(0, 500) + '...' : copiedText,
                    contactDate: new Date().toISOString()
                })
            });
            window.dispatchEvent(new CustomEvent('refresh-communications'));
        } catch (error) {
            console.error('Error logging template action:', error);
        }
    };

    if (loading && !client) {
        return (
            <div className="mx-auto flex h-[50vh] w-full max-w-7xl items-center justify-center p-4 md:p-6">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
            </div>
        );
    }

    if (fetchError || (!loading && !client)) {
        return (
            <div className="mx-auto flex h-[50vh] w-full max-w-7xl items-center justify-center p-4 md:p-6">
                <div className="flex items-center gap-3 rounded-xl border border-crm-red/30 bg-crm-red/10 p-6 text-red-300">
                    <AlertCircle size={24} />
                    <p>{fetchError || 'Cliente no encontrado'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 pb-20 md:p-6">
            <ClientDetailHeader 
                client={client} 
                onEdit={() => setIsEditModalOpen(true)}
                extraActions={
                    <MessageTemplatePicker 
                        category="client"
                        entityData={{
                            clientName: client.fullName,
                            clientPhone: client.phone,
                            clientEmail: client.email,
                            assignedToName: client.assignedTo?.name || ''
                        }}
                        onLogAction={handleLogTemplateAction}
                    />
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="flex-1 min-h-[400px]">
                        <ClientInfoPanel client={client} />
                    </div>
                </div>
                
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <ClientActivityPanel client={client} />
                    </div>
                    <ClientRelatedLeadsPanel client={client} />
                    <ClientRelatedSalesPanel client={client} />
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
