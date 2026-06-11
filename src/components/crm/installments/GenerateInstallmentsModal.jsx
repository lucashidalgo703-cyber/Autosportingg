import React, { useState } from 'react';
import { X, Calendar, DollarSign, Layers, FileText } from 'lucide-react';

export default function GenerateInstallmentsModal({ isOpen, onClose, onGenerate, saleData }) {
    const [formData, setFormData] = useState({
        baseAmount: saleData?.pendingBalance > 0 ? saleData.pendingBalance : '',
        interestPercent: '',
        installmentsCount: 3,
        firstDueDate: '',
        currency: saleData?.saleCurrency || 'ARS',
        notes: ''
    });

    const baseAmountNum = Number(formData.baseAmount) || 0;
    const interestNum = Number(formData.interestPercent) || 0;
    const totalAmountNum = Math.round(baseAmountNum * (1 + interestNum / 100));
    const estimatedPerInstallment = formData.installmentsCount > 0 ? Math.floor(totalAmountNum / formData.installmentsCount) : 0;

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = {
            ...formData,
            baseAmount: baseAmountNum,
            interestPercent: interestNum,
            totalAmount: totalAmountNum,
            installmentsCount: Number(formData.installmentsCount),
            frequency: 'mensual',
            allowAppend: true // We allow appending by default from the UI to be safe
        };
        await onGenerate(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="bg-[#121214] border border-neutral-800 rounded-2xl w-full max-w-md relative z-10 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-neutral-800 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Generar Plan de Cuotas</h2>
                        <p className="text-xs text-neutral-500 mt-1">Crea múltiples cuotas mensuales automáticamente.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-crm-surface-raised/50 text-neutral-400 hover:text-white hover:bg-crm-surface-raised transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="generate-installments-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                        
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Monto Base a Financiar</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                        value={formData.baseAmount}
                                        onChange={(e) => setFormData({...formData, baseAmount: e.target.value})}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="w-32">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Interés % (Opc)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">%</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                        value={formData.interestPercent}
                                        onChange={(e) => setFormData({...formData, interestPercent: e.target.value})}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="w-32">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Moneda</label>
                                <select
                                    required
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                                    value={formData.currency}
                                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                >
                                    <option value="ARS">ARS</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Cantidad de Cuotas</label>
                                <div className="relative">
                                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="120"
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                        value={formData.installmentsCount}
                                        onChange={(e) => setFormData({...formData, installmentsCount: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">1° Vencimiento</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                                        value={formData.firstDueDate}
                                        onChange={(e) => setFormData({...formData, firstDueDate: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-crm-surface-raised/50 border border-neutral-700/50 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-neutral-400">Total financiado con interés:</span>
                                <span className="text-sm font-bold text-white">{totalAmountNum.toLocaleString()} {formData.currency}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-neutral-400">Valor estimado por cuota:</span>
                                <span className="text-sm font-bold text-blue-400">~{estimatedPerInstallment.toLocaleString()} {formData.currency}</span>
                            </div>
                            <p className="text-[11px] text-neutral-500 leading-relaxed mt-3 border-t border-neutral-700/50 pt-2">
                                Se generarán {formData.installmentsCount || 0} cuotas mensuales. La diferencia por redondeo se ajustará en la última cuota.
                            </p>
                        </div>
                        
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-500 font-medium">
                            El interés del plan es operativo. No registra cobros reales ni movimientos de caja.
                        </div>

                        <div>
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Notas (Opcional)</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-3 text-neutral-500" size={16} />
                                <textarea
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors resize-none"
                                    rows="2"
                                    placeholder="Ej: Plan de pago inicial..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                ></textarea>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-neutral-800 shrink-0 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white bg-crm-surface-raised hover:bg-neutral-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="generate-installments-form"
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors"
                    >
                        Generar Plan
                    </button>
                </div>
            </div>
        </div>
    );
}
