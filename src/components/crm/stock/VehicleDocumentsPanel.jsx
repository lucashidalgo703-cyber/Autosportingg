"use client";
import { useState } from 'react';
import CrmCard from '../ui/CrmCard';
import CrmBadge from '../ui/CrmBadge';
import { FileCheck, FileX, FileMinus, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehicleDocumentsPanel({ vehicle, onSaveComplete }) {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Default docs structure
    const defaultDocs = {
        tituloAutomotor: 'pendiente',
        cedulaVerde: 'pendiente',
        verificacionPolicial: 'pendiente',
        informeDominio: 'pendiente',
        formulario08: 'pendiente',
        libreDeudaPatentes: 'pendiente'
    };

    const currentDocs = vehicle?.documentation || defaultDocs;

    const [formData, setFormData] = useState(currentDocs);

    const labels = {
        tituloAutomotor: 'Título Automotor',
        cedulaVerde: 'Cédula Verde/Azul',
        verificacionPolicial: 'Verificación Policial (12)',
        informeDominio: 'Informe de Dominio',
        formulario08: 'Formulario 08',
        libreDeudaPatentes: 'Libre Deuda Patentes'
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'recibido': return <FileCheck size={18} className="text-[#22C55E]" />;
            case 'pendiente': return <FileX size={18} className="text-[#EF3329]" />;
            case 'no aplica': return <FileMinus size={18} className="text-crm-fg-muted" />;
            default: return <FileMinus size={18} className="text-crm-fg-muted" />;
        }
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'recibido': return <CrmBadge variant="success">Recibido</CrmBadge>;
            case 'pendiente': return <CrmBadge variant="danger">Pendiente</CrmBadge>;
            case 'no aplica': return <CrmBadge variant="default">No Aplica</CrmBadge>;
            default: return <CrmBadge variant="default">N/A</CrmBadge>;
        }
    };

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');

            const res = await fetch(`${baseUrl}/api/admin/cars/${vehicle.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ documentation: formData })
            });

            if (!res.ok) throw new Error('Error al guardar documentación');
            
            toast.success('Documentación actualizada');
            setIsEditing(false);
            if (onSaveComplete) onSaveComplete();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData(currentDocs);
        setIsEditing(false);
    };

    return (
        <CrmCard>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold text-lg">Documentación Registral</h3>
                {!isEditing && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="text-crm-fg-muted hover:text-white transition-colors"
                    >
                        <Edit2 size={16} />
                    </button>
                )}
            </div>
            
            <div className="flex flex-col gap-2">
                {Object.keys(labels).map((key) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#161619] border border-crm-border rounded-lg gap-3">
                        <div className="flex items-center gap-3">
                            {getStatusIcon(isEditing ? formData[key] : currentDocs[key])}
                            <span className="text-sm text-white">{labels[key]}</span>
                        </div>
                        {isEditing ? (
                            <select 
                                value={formData[key]}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className="bg-crm-surface border border-crm-border text-white text-xs rounded px-2 py-1 outline-none focus:border-red-500"
                            >
                                <option value="pendiente">Pendiente</option>
                                <option value="recibido">Recibido</option>
                                <option value="no aplica">No Aplica</option>
                            </select>
                        ) : (
                            getStatusBadge(currentDocs[key])
                        )}
                    </div>
                ))}
            </div>

            {isEditing && (
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-crm-border">
                    <button 
                        onClick={handleCancel}
                        disabled={loading}
                        className="px-3 py-1.5 text-xs text-white bg-crm-surface-raised hover:bg-[#33333a] rounded transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="px-3 py-1.5 text-xs text-white bg-crm-red hover:bg-red-600 rounded shadow-[0_0_10px_rgba(230,48,39,0.3)] transition-all"
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            )}
        </CrmCard>
    );
}
