"use client";
import CrmCard from '../ui/CrmCard';
import CrmBadge from '../ui/CrmBadge';
import { FileCheck, FileX, FileMinus } from 'lucide-react';

export default function VehicleDocumentsDemo({ vehicle }) {
    const documents = [
        { name: 'Título Automotor', status: 'recibido' },
        { name: 'Cédula Verde/Azul', status: 'recibido' },
        { name: 'Verificación Policial (12)', status: 'pendiente' },
        { name: 'Informe de Dominio', status: 'recibido' },
        { name: 'Formulario 08', status: 'no aplica' },
        { name: 'Libre Deuda Patentes', status: 'pendiente' },
    ];

    const getStatusIcon = (status) => {
        switch(status) {
            case 'recibido': return <FileCheck size={18} className="text-[#22C55E]" />;
            case 'pendiente': return <FileX size={18} className="text-[#EF3329]" />;
            default: return <FileMinus size={18} className="text-[#A1A1AA]" />;
        }
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'recibido': return <CrmBadge variant="success">Recibido</CrmBadge>;
            case 'pendiente': return <CrmBadge variant="danger">Pendiente</CrmBadge>;
            default: return <CrmBadge variant="default">N/A</CrmBadge>;
        }
    };

    return (
        <CrmCard>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold text-lg">Documentación (Demo)</h3>
            </div>
            
            <div className="flex flex-col gap-2">
                {documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#161619] border border-[#33333A] rounded-lg">
                        <div className="flex items-center gap-3">
                            {getStatusIcon(doc.status)}
                            <span className="text-sm text-white">{doc.name}</span>
                        </div>
                        {getStatusBadge(doc.status)}
                    </div>
                ))}
            </div>
        </CrmCard>
    );
}
