import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Truck, Save, CalendarDays, CheckCircle, CheckSquare, AlertTriangle } from 'lucide-react';
import ConfirmModal from '../../ui/ConfirmModal';

export default function SaleStatusPanel({ sale, onSave }) {
    const [docStatus, setDocStatus] = useState('pendiente');
    const [delStatus, setDelStatus] = useState('pendiente');
    const [estDate, setEstDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [confirmQuickActionModal, setConfirmQuickActionModal] = useState({ isOpen: false, action: null });

    useEffect(() => {
        if (sale) {
            setDocStatus(sale.documentationStatus || 'pendiente');
            setDelStatus(sale.deliveryStatus || 'pendiente');
            if (sale.estimatedDeliveryDate) {
                setEstDate(new Date(sale.estimatedDeliveryDate).toISOString().split('T')[0]);
            } else {
                setEstDate('');
            }
            setHasChanges(false);
        }
    }, [sale]);

    const handleDocChange = (e) => {
        setDocStatus(e.target.value);
        setHasChanges(true);
    };

    const handleDelChange = (e) => {
        setDelStatus(e.target.value);
        setHasChanges(true);
    };

    const handleEstDateChange = (e) => {
        setEstDate(e.target.value);
        setHasChanges(true);
    };

    const handleSaveClick = async () => {
        setIsSaving(true);
        try {
            setSaveError(null);
            const payload = {
                documentationStatus: docStatus,
                deliveryStatus: delStatus,
                estimatedDeliveryDate: estDate || null
            };
            
            if (delStatus === 'entregado' && sale.status !== 'entregada') {
                payload.status = 'entregada';
            }

            await onSave(payload);
            setHasChanges(false);
        } catch (error) {
            console.error('Error saving statuses', error);
            setSaveError(error.message || 'Error al guardar los estados operativos');
        } finally {
            setIsSaving(false);
        }
    };

    const handleQuickAction = (action) => {
        setConfirmQuickActionModal({ isOpen: true, action });
    };

    const confirmQuickAction = async () => {
        const { action } = confirmQuickActionModal;
        if (!action) return;

        setIsSaving(true);
        try {
            setSaveError(null);
            let payload = {};
            if (action === 'documentacion_completa') {
                payload.documentationStatus = 'completo';
                setDocStatus('completo');
            } else if (action === 'listo_para_entregar') {
                payload.deliveryStatus = 'listo_para_entregar';
                setDelStatus('listo_para_entregar');
            } else if (action === 'entregado') {
                payload.deliveryStatus = 'entregado';
                payload.status = 'entregada';
                setDelStatus('entregado');
            }
            
            await onSave(payload);
            setHasChanges(false);
        } catch (error) {
            console.error('Error saving quick action', error);
            setSaveError(error.message || 'Error al guardar la acción rápida');
        } finally {
            setIsSaving(false);
            setConfirmQuickActionModal({ isOpen: false, action: null });
        }
    };

    if (!sale) return null;

    const docSteps = ['pendiente', 'parcial', 'completo'];
    const delSteps = ['pendiente', 'preparando', 'listo_para_entregar', 'entregado'];

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-crm-surface">
                <div className="flex items-center gap-2">
                    <Activity size={16} className="text-orange-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Estados Operativos</h3>
                </div>
                {hasChanges && sale.status !== 'cancelada' && (
                    <button 
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className="h-8 px-3 rounded-lg bg-crm-red hover:bg-crm-red-hover text-white font-bold text-xs flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 flex-none gap-2"
                    >
                        {isSaving ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={14} />
                        )}
                        Guardar
                    </button>
                )}
            </div>

            <div className="p-5 flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                
                {/* Warning */}
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex gap-3 items-start">
                    <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-orange-200 uppercase tracking-wider">
                        Este módulo controla la operación y entrega. No registra cobros, caja ni comprobantes.
                    </p>
                </div>

                {sale.deliveryStatus === 'entregado' && sale.status !== 'entregada' && sale.status !== 'cancelada' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col gap-2">
                        <div className="flex gap-2 items-start">
                            <AlertTriangle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                                El vehículo fue entregado pero la venta sigue abierta ({sale.status}).
                            </p>
                        </div>
                        <button 
                            onClick={async () => {
                                setIsSaving(true);
                                try {
                                    await onSave({ status: 'entregada' });
                                } finally {
                                    setIsSaving(false);
                                }
                            }}
                            disabled={isSaving}
                            className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center transition-colors shadow-lg"
                        >
                            Cerrar Venta Comercialmente
                        </button>
                    </div>
                )}

                {saveError && (
                    <div className="bg-crm-red/10 border border-red-500/20 rounded-xl p-3 flex gap-3 items-start">
                        <AlertTriangle size={16} className="text-crm-red shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
                            {saveError}
                        </p>
                    </div>
                )}

                {/* Documentation Status */}
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck size={14} />
                            Documentación
                        </label>
                        {docStatus !== 'completo' && sale.status !== 'cancelada' && (
                            <button 
                                onClick={() => handleQuickAction('documentacion_completa')}
                                disabled={isSaving}
                                className="text-[10px] bg-crm-surface-raised hover:bg-neutral-700 text-white px-2 py-1 rounded transition-colors flex items-center gap-1"
                            >
                                <CheckSquare size={10} />
                                Marcar Completa
                            </button>
                        )}
                    </div>

                    {/* Progress Bar Doc */}
                    <div className="w-full flex justify-between items-center relative mb-1">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-crm-surface-raised -translate-y-1/2 z-0"></div>
                        <div className="absolute top-1/2 left-0 h-0.5 bg-purple-500 -translate-y-1/2 z-0 transition-all duration-500" style={{ width: `${(docSteps.indexOf(docStatus) / (docSteps.length - 1)) * 100}%` }}></div>
                        {docSteps.map((step, idx) => (
                            <div key={step} className={`w-3 h-3 rounded-full z-10 border-2 transition-colors ${docSteps.indexOf(docStatus) >= idx ? 'bg-purple-500 border-purple-500' : 'bg-neutral-900 border-neutral-700'}`} title={step}></div>
                        ))}
                    </div>

                    <select 
                        value={docStatus}
                        onChange={handleDocChange}
                        disabled={sale.status === 'cancelada'}
                        className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="pendiente">Pendiente (Incompleto)</option>
                        <option value="parcial">Parcial (En proceso)</option>
                        <option value="completo">Completo (Cerrado)</option>
                    </select>
                </div>

                {/* Delivery Status */}
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Truck size={14} />
                            Logística y Entrega
                        </label>
                        <div className="flex gap-1">
                            {delStatus === 'preparando' && docStatus === 'completo' && sale.status !== 'cancelada' && (
                                <button 
                                    onClick={() => handleQuickAction('listo_para_entregar')}
                                    disabled={isSaving}
                                    className="text-[10px] bg-crm-surface-raised hover:bg-neutral-700 text-white px-2 py-1 rounded transition-colors flex items-center gap-1"
                                >
                                    Listo para Entregar
                                </button>
                            )}
                            {delStatus === 'listo_para_entregar' && sale.status !== 'cancelada' && (
                                <button 
                                    onClick={() => handleQuickAction('entregado')}
                                    disabled={isSaving}
                                    className="text-[10px] bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded transition-colors flex items-center gap-1 font-bold"
                                >
                                    <CheckCircle size={10} />
                                    Entregar Vehículo
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar Del */}
                    <div className="w-full flex justify-between items-center relative mb-1">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-crm-surface-raised -translate-y-1/2 z-0"></div>
                        <div className="absolute top-1/2 left-0 h-0.5 bg-green-500 -translate-y-1/2 z-0 transition-all duration-500" style={{ width: `${(delSteps.indexOf(delStatus) / (delSteps.length - 1)) * 100}%` }}></div>
                        {delSteps.map((step, idx) => (
                            <div key={step} className={`w-3 h-3 rounded-full z-10 border-2 transition-colors ${delSteps.indexOf(delStatus) >= idx ? 'bg-green-500 border-green-500' : 'bg-neutral-900 border-neutral-700'}`} title={step.replace(/_/g, ' ')}></div>
                        ))}
                    </div>

                    <select 
                        value={delStatus}
                        onChange={handleDelChange}
                        disabled={sale.status === 'cancelada'}
                        className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="pendiente">Pendiente</option>
                        <option value="preparando">Preparando Vehículo</option>
                        <option value="listo_para_entregar">Listo para Entregar</option>
                        <option value="entregado">Entregado (Finalizado)</option>
                    </select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3 mt-auto">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarDays size={12} />
                            Fecha Estimada
                        </label>
                        <input 
                            type="date"
                            value={estDate}
                            onChange={handleEstDateChange}
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-neutral-600 transition-colors"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarDays size={12} />
                            Fecha Real
                        </label>
                        <div className="w-full bg-crm-surface-raised/50 border border-neutral-800 rounded-xl py-2 px-3 text-xs text-neutral-400">
                            {sale.actualDeliveryDate ? new Date(sale.actualDeliveryDate).toLocaleDateString() : 'Pendiente'}
                        </div>
                    </div>
                </div>

            </div>

            <ConfirmModal
                isOpen={confirmQuickActionModal.isOpen}
                onClose={() => setConfirmQuickActionModal({ isOpen: false, action: null })}
                onConfirm={confirmQuickAction}
                title="Confirmar Acción Rápida"
                message={`¿Estás seguro de marcar como ${confirmQuickActionModal.action?.replace(/_/g, ' ')}?`}
                confirmText="Confirmar"
                isDestructive={false}
            />
        </div>
    );
}
