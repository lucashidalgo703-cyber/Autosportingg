import React, { useState, useEffect } from 'react';
import { MessageCircle, Plus, AlertTriangle, RefreshCw } from 'lucide-react';
import CommunicationLogItem from './CommunicationLogItem';
import CommunicationLogForm from './CommunicationLogForm';

export default function CommunicationLogPanel({ 
    entityType, 
    entityId, 
    clientId = null, 
    leadId = null, 
    saleId = null, 
    reservationId = null, 
    vehicleId = null,
    assignedTo = null 
}) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/communication-logs?entityType=${entityType}&entityId=${entityId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                if (res.status === 403) throw new Error("Sin permisos para ver historial.");
                throw new Error("Error al cargar historial");
            }
            const data = await res.json();
            setLogs(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (entityId) {
            fetchLogs();
        }
    }, [entityId]);

    const handleSave = (newLog) => {
        // En lugar de recargar todo, podemos inyectarlo o simplemente recargar. 
        // Recargar es más seguro para obtener las populates (createdBy name).
        fetchLogs();
    };

    return (
        <div className="bg-[#161619] border border-[#33333A] rounded-xl overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-[#33333A] bg-[#24242B] flex justify-between items-center shrink-0">
                <h3 className="font-bold text-white uppercase text-sm flex items-center gap-2">
                    <MessageCircle size={18} className="text-indigo-400" />
                    Historial de Contacto
                </h3>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={fetchLogs} 
                        className="p-1.5 text-gray-400 hover:text-white bg-[#1E1E24] hover:bg-[#33333A] rounded transition-colors"
                        title="Actualizar historial"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button 
                        onClick={() => setIsFormOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1"
                    >
                        <Plus size={14} /> Registrar
                    </button>
                </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-[#161619] min-h-[300px] max-h-[500px] custom-scrollbar">
                {error ? (
                    <div className="bg-red-900/20 text-red-400 p-3 rounded-lg border border-red-900/50 flex items-center gap-2 text-sm">
                        <AlertTriangle size={16} /> {error}
                    </div>
                ) : loading ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                        <MessageCircle size={32} className="mb-2 text-[#33333A]" />
                        <p className="text-sm">No hay interacciones registradas aún.</p>
                        <p className="text-xs mt-1">Registrá la primera llamada, WhatsApp o reunión.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {logs.map(log => (
                            <CommunicationLogItem key={log._id} log={log} />
                        ))}
                    </div>
                )}
            </div>

            {isFormOpen && (
                <CommunicationLogForm 
                    isOpen={isFormOpen} 
                    onClose={() => setIsFormOpen(false)} 
                    onSave={handleSave}
                    entityType={entityType}
                    entityId={entityId}
                    clientId={clientId}
                    leadId={leadId}
                    saleId={saleId}
                    reservationId={reservationId}
                    vehicleId={vehicleId}
                    assignedTo={assignedTo}
                />
            )}
        </div>
    );
}
