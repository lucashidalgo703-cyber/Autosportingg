"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAdminLeads } from '../../../../hooks/useAdminLeads';
import LeadDetailHeader from '../../../../components/crm/leads/LeadDetailHeader';
import LeadInfoPanel from '../../../../components/crm/leads/LeadInfoPanel';
import LeadClientPanel from '../../../../components/crm/leads/LeadClientPanel';
import LeadVehiclePanel from '../../../../components/crm/leads/LeadVehiclePanel';
import LeadActivityPanel from '../../../../components/crm/leads/LeadActivityPanel';
import LeadEditModal from '../../../../components/crm/leads/LeadEditModal';
import LeadLinkClientModal from '../../../../components/crm/leads/LeadLinkClientModal';
import LeadTasksPanel from '../../../../components/crm/leads/LeadTasksPanel';
import LeadTaskModal from '../../../../components/crm/leads/LeadTaskModal';
import ReservationModal from '../../../../components/crm/reservations/ReservationModal';
import ReservationCancelModal from '../../../../components/crm/reservations/ReservationCancelModal';
import CommunicationLogPanel from '../../../../components/crm/communications/CommunicationLogPanel';
import MessageTemplatePicker from '../../../../components/crm/templates/MessageTemplatePicker';
import { useAdminReservations } from '../../../../hooks/useAdminReservations';
import { useAuth } from '../../../../context/AuthContext';

function getMongoId(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value._id) return value._id;
    return null;
}

export default function AdminLeadDetailPage() {
    const { id } = useParams();
    const { token } = useAuth();
    const { fetchLeadById, updateLead, linkClientToLead, updateTaskStatus, loading, error } = useAdminLeads();
    
    const [lead, setLead] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [isCancelReservationModalOpen, setIsCancelReservationModalOpen] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    
    const { fetchReservations } = useAdminReservations();
    const [activeReservation, setActiveReservation] = useState(null);

    const loadLead = async () => {
        try {
            const data = await fetchLeadById(id);
            setLead(data);
            
            const vehicleMongoId = getMongoId(data?.vehicleId);
            if (vehicleMongoId) {
                const reservations = await fetchReservations({ vehicleId: vehicleMongoId, status: 'activa' });
                if (reservations && reservations.length > 0) {
                    setActiveReservation(reservations[0]);
                } else {
                    setActiveReservation(null);
                }
            } else {
                setActiveReservation(null);
            }
        } catch (err) {
            setFetchError(err.message);
        }
    };

    useEffect(() => {
        if (id) {
            loadLead();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleUpdate = async (updatedData) => {
        await updateLead(id, updatedData);
        await loadLead(); // Reload fresh data after update
    };

    const handleLinkClient = async (clientId) => {
        await linkClientToLead(id, clientId);
        await loadLead(); // Reload fresh data after linking
    };

    const handleAddTask = async (taskPayload) => {
        await updateLead(id, taskPayload);
        await loadLead();
    };

    const handleUpdateTaskStatus = async (taskId, status) => {
        await updateTaskStatus(id, taskId, status);
        await loadLead();
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
                    entityType: 'lead',
                    entityId: id,
                    leadId: id,
                    clientId: lead?.clientId?._id || lead?.clientId || null,
                    vehicleId: lead?.vehicleId?._id || lead?.vehicleId || null,
                    assignedTo: lead?.assignedTo?._id || lead?.assignedTo || null,
                    channel: template.channel || 'whatsapp',
                    direction: 'outbound',
                    outcome: 'contacted',
                    title: `Plantilla usada: ${template.name}`,
                    notes: copiedText.length > 500 ? copiedText.substring(0, 500) + '...' : copiedText,
                    contactDate: new Date().toISOString()
                })
            });
            // La vista de communication log usa swr o recarga si lo integramos,
            // pero para no forzar reload, podemos mutar o simplemente loggear.
            // Para simplicidad, podemos forzar un reload del componente lead si quisiéramos,
            // pero CommunicationLogPanel carga de forma independiente. Si usamos mutate, mejor.
            // Al ser un POST desde fuera, al menos la UI avisará que copió.
            // Dispatch custom event para CommunicationLogPanel
            window.dispatchEvent(new CustomEvent('refresh-communications'));
        } catch (error) {
            console.error('Error logging template action:', error);
        }
    };

    if (loading && !lead) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
        );
    }

    if (fetchError || (!loading && !lead)) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl flex items-center gap-3 max-w-xl">
                    <AlertCircle size={24} />
                    <p>{fetchError || 'No se encontró la oportunidad comercial solicitada.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full pb-10">
            <LeadDetailHeader 
                lead={lead} 
                onEdit={() => setIsEditModalOpen(true)} 
                onReserve={() => setIsReservationModalOpen(true)}
                onCancelReserve={() => setIsCancelReservationModalOpen(true)}
                activeReservation={activeReservation}
                extraActions={
                    <MessageTemplatePicker 
                        category="lead"
                        entityData={{
                            name: lead.name,
                            phone: lead.phone,
                            email: lead.email,
                            vehicleName: lead.vehicleId?.model ? `${lead.vehicleId.make} ${lead.vehicleId.model}` : '',
                            assignedToName: lead.assignedTo?.name || ''
                        }}
                        onLogAction={handleLogTemplateAction}
                    />
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Columna Izquierda: Data Principal */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <LeadInfoPanel lead={lead} />
                    <LeadTasksPanel 
                        lead={lead} 
                        onOpenTaskModal={() => setIsTaskModalOpen(true)}
                        onUpdateTaskStatus={handleUpdateTaskStatus}
                    />
                </div>
                
                {/* Columna Derecha: Relaciones */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <LeadClientPanel lead={lead} onOpenLinkModal={() => setIsLinkModalOpen(true)} />
                    <LeadVehiclePanel lead={lead} />
                    <div className="h-[500px]">
                        <CommunicationLogPanel 
                            entityType="lead" 
                            entityId={getMongoId(lead)} 
                            clientId={getMongoId(lead?.clientId)} 
                            vehicleId={getMongoId(lead?.vehicleId)}
                            assignedTo={getMongoId(lead?.assignedTo)}
                        />
                    </div>
                </div>
            </div>

            {/* Fila Inferior: Actividad */}
            <div className="mt-2">
                <LeadActivityPanel lead={lead} />
            </div>

            <LeadEditModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                onSave={handleUpdate}
                lead={lead}
            />

            <LeadLinkClientModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                onLink={handleLinkClient}
                lead={lead}
            />

            <LeadTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSave={handleAddTask}
            />

            <ReservationModal
                isOpen={isReservationModalOpen}
                onClose={() => setIsReservationModalOpen(false)}
                onSuccess={() => {
                    setIsReservationModalOpen(false);
                    loadLead();
                }}
                initialData={{
                    leadId: getMongoId(lead),
                    leadName: lead?.name || '',
                    clientId: getMongoId(lead?.clientId),
                    clientName: lead?.clientId?.firstName ? `${lead.clientId.firstName} ${lead.clientId.lastName || ''}`.trim() : null,
                    vehicleId: getMongoId(lead?.vehicleId),
                    vehicleName: lead?.vehicleId?.brand ? `${lead.vehicleId.brand} ${lead.vehicleId.name} ${lead.vehicleId.year || ''}`.trim() : null,
                    agreedPrice: lead?.vehicleId?.price,
                    agreedCurrency: lead?.vehicleId?.currency || 'USD'
                }}
            />

            {activeReservation?._id && (
                <ReservationCancelModal
                    isOpen={isCancelReservationModalOpen}
                    onClose={() => setIsCancelReservationModalOpen(false)}
                    onSuccess={() => {
                        setIsCancelReservationModalOpen(false);
                        loadLead();
                    }}
                    reservation={activeReservation}
                />
            )}
        </div>
    );
}
