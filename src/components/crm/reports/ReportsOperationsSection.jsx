import React from 'react';
import { FileText, Star } from 'lucide-react';

export default function ReportsOperationsSection({ data }) {
    const { sales } = data;

    // Documentación
    const docCompleta = sales.filter(s => s.documentationStatus === 'completo').length;
    const docPendiente = sales.filter(s => s.documentationStatus === 'pendiente' || !s.documentationStatus).length;
    const docParcial = sales.filter(s => s.documentationStatus === 'parcial').length;

    // Postventa
    const postventaConforme = sales.filter(s => s.postSaleStatus === 'conforme').length;
    const postventaIncidencia = sales.filter(s => s.postSaleStatus === 'incidencia').length;
    const postventaPendiente = sales.filter(s => s.postSaleStatus === 'pendiente').length;

    const resenasSolicitadas = sales.filter(s => s.postSaleChecklist?.resenaSolicitada && !s.postSaleChecklist?.resenaRecibida).length;
    const resenasRecibidas = sales.filter(s => s.postSaleChecklist?.resenaRecibida).length;

    return (
        <div className="bg-[#161619] border border-crm-border rounded-2xl p-5 flex flex-col h-full">
            
            <div className="flex-1 mb-6">
                <div className="flex items-center gap-2 mb-4 border-b border-crm-border pb-3">
                    <FileText size={16} className="text-orange-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Documentación</h3>
                </div>
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-neutral-400">Completa</span>
                        <span className="text-sm font-bold text-white">{docCompleta}</span>
                    </div>
                    <div className="h-1 w-full bg-crm-surface-raised rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${sales.length ? (docCompleta/sales.length)*100 : 0}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-neutral-400">Parcial</span>
                        <span className="text-sm font-bold text-white">{docParcial}</span>
                    </div>
                    <div className="h-1 w-full bg-crm-surface-raised rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: `${sales.length ? (docParcial/sales.length)*100 : 0}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-neutral-400">Pendiente</span>
                        <span className="text-sm font-bold text-white">{docPendiente}</span>
                    </div>
                    <div className="h-1 w-full bg-crm-surface-raised rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500" style={{ width: `${sales.length ? (docPendiente/sales.length)*100 : 0}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="flex-1">
                <div className="flex items-center gap-2 mb-4 border-b border-crm-border pb-3">
                    <Star size={16} className="text-pink-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Postventa</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#1E1E24] p-3 rounded-lg border border-crm-border flex flex-col justify-center items-center">
                        <div className="text-lg font-bold text-green-400">{postventaConforme}</div>
                        <div className="text-[9px] text-neutral-400 font-bold uppercase mt-1">Conformes</div>
                    </div>
                    <div className="bg-[#1E1E24] p-3 rounded-lg border border-crm-border flex flex-col justify-center items-center">
                        <div className="text-lg font-bold text-red-400">{postventaIncidencia}</div>
                        <div className="text-[9px] text-neutral-400 font-bold uppercase mt-1">Incidencias</div>
                    </div>
                    <div className="bg-[#1E1E24] p-3 rounded-lg border border-crm-border flex flex-col justify-center items-center">
                        <div className="text-lg font-bold text-white">{resenasRecibidas}</div>
                        <div className="text-[9px] text-neutral-400 font-bold uppercase mt-1">Reseñas</div>
                    </div>
                    <div className="bg-[#1E1E24] p-3 rounded-lg border border-crm-border flex flex-col justify-center items-center">
                        <div className="text-lg font-bold text-white">{resenasSolicitadas}</div>
                        <div className="text-[9px] text-neutral-400 font-bold uppercase mt-1">Reseñas Pdtes</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
