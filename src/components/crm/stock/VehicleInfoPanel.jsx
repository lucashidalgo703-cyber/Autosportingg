"use client";
import CrmCard from '../ui/CrmCard';
import { Edit } from 'lucide-react';

export default function VehicleInfoPanel({ vehicle, onEdit }) {
    return (
        <CrmCard>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">Datos Generales</h3>
                {onEdit && (
                    <button onClick={onEdit} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-crm-fg-muted bg-crm-surface-raised border border-crm-border rounded hover:text-white hover:border-crm-fg transition-colors">
                        <Edit size={14} />
                        Editar Datos
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                <div>
                    <span className="block text-xs text-crm-fg-muted mb-1">Kilometraje</span>
                    <span className="text-sm text-white font-medium">{vehicle.kilometraje.toLocaleString('es-AR')} km</span>
                </div>
                <div>
                    <span className="block text-xs text-crm-fg-muted mb-1">Color</span>
                    <span className="text-sm text-white font-medium">{vehicle.color || 'No especificado'}</span>
                </div>
                <div>
                    <span className="block text-xs text-crm-fg-muted mb-1">Dominio</span>
                    <span className="text-sm font-mono text-white bg-crm-bg px-2 py-0.5 rounded border border-crm-border w-fit">
                        {vehicle.dominio || 'S/D'}
                    </span>
                </div>
                <div>
                    <span className="block text-xs text-crm-fg-muted mb-1">Origen</span>
                    <span className="text-sm text-white capitalize font-medium flex items-center gap-2">
                        {vehicle.origen}
                        {vehicle.investor && vehicle.investor.percentage > 0 && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 uppercase tracking-wide" title="Capital Inicial Invertido (Costo de Compra)">
                                {vehicle.investor.name} ({vehicle.investor.percentage}% | {vehicle.monedaCompra || 'USD'} {((vehicle.precioCompra || 0) * (vehicle.investor.percentage / 100)).toLocaleString('es-AR')})
                            </span>
                        )}
                    </span>
                </div>
                <div>
                    <span className="block text-xs text-crm-fg-muted mb-1">Fecha de Ingreso</span>
                    <span className="text-sm text-white font-medium">{new Date(vehicle.fechaIngreso).toLocaleDateString('es-AR')}</span>
                </div>
            </div>

            {vehicle.observaciones && (
                <div className="mt-6 pt-4 border-t border-crm-border">
                    <span className="block text-xs text-crm-fg-muted mb-2">Observaciones Internas</span>
                    <p className="text-sm text-white bg-crm-bg p-3 rounded-lg border border-crm-border m-0">
                        {vehicle.observaciones}
                    </p>
                </div>
            )}

            {vehicle.documentationFiles && Object.keys(vehicle.documentationFiles).length > 0 && (
                <div className="mt-6 pt-4 border-t border-crm-border">
                    <span className="block text-xs text-crm-fg-muted mb-3 uppercase tracking-wider">Imágenes de Documentación</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {Object.entries(vehicle.documentationFiles).map(([key, url]) => {
                            const isPdf = url.toLowerCase().endsWith('.pdf');
                            const labels = {
                                tituloAutomotor: 'Título Automotor',
                                cedulaVerde: 'Cédula Verde',
                                verificacionPolicial: 'Verificación Policial',
                                informeDominio: 'Informe de Dominio',
                                formulario08: 'Formulario 08',
                                libreDeudaPatentes: 'Libre Deuda Patentes'
                            };
                            return (
                                <a 
                                    key={key} 
                                    href={url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex flex-col gap-2 group cursor-pointer"
                                    title={`Ver ${labels[key] || key}`}
                                >
                                    <div className="w-full h-24 bg-crm-bg border border-crm-border rounded-lg overflow-hidden relative flex items-center justify-center group-hover:border-crm-red transition-colors">
                                        {isPdf ? (
                                            <div className="flex flex-col items-center text-crm-fg-muted group-hover:text-crm-red transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                <span className="text-xs mt-1 font-medium">PDF</span>
                                            </div>
                                        ) : (
                                            <img src={url} alt={key} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        </div>
                                    </div>
                                    <span className="text-xs text-center text-crm-fg-muted group-hover:text-white transition-colors truncate px-1">
                                        {labels[key] || key}
                                    </span>
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}
        </CrmCard>
    );
}
