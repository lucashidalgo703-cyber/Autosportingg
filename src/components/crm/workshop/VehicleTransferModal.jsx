"use client";

import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { workshopFetch } from '../../../utils/workshopApiClient';
import WorkshopClientSelect from './WorkshopClientSelect';
import CrmButton from '../ui/CrmButton';
import CrmModal from '../ui/CrmModal';

const FieldLabel = ({ children, required = false }) => (
    <label className="mb-1.5 block text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">
        {children}{required && <span className="text-crm-red"> *</span>}
    </label>
);

export default function VehicleTransferModal({ isOpen, vehicle, onClose, onSuccess }) {
    const { token } = useAuth();

    const [newClientId, setNewClientId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNewClientId('');
            setError('');
        }
    }, [isOpen]);

    const handleTransfer = async () => {
        setError('');

        if (!newClientId) {
            setError('Debes seleccionar el nuevo propietario del vehículo.');
            return;
        }

        const currentOwnerId = vehicle?.clientId?._id || vehicle?.clientId;
        if (currentOwnerId === newClientId) {
            setError('El cliente seleccionado ya es el propietario actual del vehículo.');
            return;
        }

        setLoading(true);
        try {
            const res = await workshopFetch(`/api/admin/workshop/vehicles/${vehicle._id || vehicle.id}/transfer`, {
                method: 'POST',
                token,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ newClientId })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al transferir vehículo.');
            }

            toast.success('Transferencia de propietario completada.');
            onSuccess?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !vehicle) return null;

    const currentOwnerName = vehicle.clientId?.name
        ? `${vehicle.clientId.name} ${vehicle.clientId.lastName || ''}`
        : 'S/D';

    const modalTitle = (
        <div className="flex items-center gap-2">
            <ArrowLeftRight className="text-crm-red" size={20} />
            <h2 className="m-0 text-lg font-bold text-crm-fg tracking-tight">Transferir Titularidad</h2>
        </div>
    );

    const modalFooter = (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
            <CrmButton type="button" variant="secondary" onClick={onClose} disabled={loading} className="px-6 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised">
                Cancelar
            </CrmButton>
            <div className="flex-1 hidden sm:block"></div>
            <CrmButton type="button" variant="primary" onClick={handleTransfer} disabled={loading} className="px-6 bg-crm-red hover:bg-crm-red/90 text-white">
                <ArrowLeftRight size={14} className="mr-1.5" /> {loading ? 'Transfiriendo...' : 'Confirmar Transferencia'}
            </CrmButton>
        </div>
    );

    return (
        <CrmModal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            maxWidth="max-w-md"
            footer={modalFooter}
        >
            <div className="px-6 py-6 space-y-4">
                {error && (
                    <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 px-4 py-3 text-sm font-semibold text-crm-red flex items-center gap-2">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="bg-crm-surface border border-crm-border rounded-xl p-4 space-y-3">
                    <div className="text-xs text-crm-fg">
                        Vehículo: <span className="font-bold text-crm-fg">{vehicle.brand} {vehicle.model}</span>
                    </div>
                    <div className="text-xs text-crm-fg">
                        Patente: <span className="font-mono font-bold uppercase text-crm-fg bg-crm-bg border border-crm-border px-1.5 py-0.5 rounded ml-1">{vehicle.plate}</span>
                    </div>
                    <div className="text-xs text-crm-fg border-t border-crm-border/40 pt-2.5">
                        Propietario Actual: <span className="font-bold text-crm-red">{currentOwnerName}</span>
                    </div>
                </div>

                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 flex gap-2">
                    <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={15} />
                    <div className="text-[11px] text-crm-fg leading-relaxed">
                        El dueño actual será movido al <span className="font-bold text-crm-fg">Historial de Propietarios</span> del vehículo y el nuevo dueño pasará a ser el titular para futuras órdenes de taller.
                    </div>
                </div>

                <div>
                    <FieldLabel required>Nuevo Propietario / Cliente</FieldLabel>
                    <WorkshopClientSelect
                        value={newClientId}
                        onChange={setNewClientId}
                        placeholder="Buscar cliente por nombre o DNI..."
                    />
                </div>
            </div>
        </CrmModal>
    );
}
