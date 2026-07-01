import toast from 'react-hot-toast';
import React, { useState } from 'react';
import { DollarSign, Info, Landmark, Edit2, X, Check } from 'lucide-react';
import CrmInput from '../../ui/CrmInput';
import CrmSelect from '../../ui/CrmSelect';

export default function SaleCommercialPanel({ sale, onSave }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        salePrice: 0,
        saleCurrency: 'USD',
        paymentMethod: 'contado',
        depositAppliedAmount: 0,
        depositAppliedCurrency: 'USD'
    });

    if (!sale) return null;

    const handleEditClick = () => {
        setEditForm({
            salePrice: sale.salePrice || 0,
            saleCurrency: sale.saleCurrency || 'USD',
            paymentMethod: sale.paymentMethod || 'contado',
            depositAppliedAmount: sale.depositAppliedAmount || 0,
            depositAppliedCurrency: sale.depositAppliedCurrency || sale.saleCurrency || 'USD'
        });
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const handleSaveClick = async () => {
        if (!onSave) return;
        setIsSaving(true);
        try {
            await onSave({
                salePrice: Number(editForm.salePrice),
                saleCurrency: editForm.saleCurrency,
                paymentMethod: editForm.paymentMethod,
                depositAppliedAmount: Number(editForm.depositAppliedAmount),
                depositAppliedCurrency: editForm.depositAppliedCurrency
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving commercial conditions:", error);
            toast.error("Error al guardar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const canEdit = sale.status !== 'cancelada' && onSave;

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-crm-border bg-crm-surface">
            <div className="flex items-center justify-between border-b border-crm-border bg-crm-topbar p-4">
                <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-300" />
                    <h3 className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-crm-fg">Condiciones Comerciales</h3>
                </div>
                {canEdit && !isEditing && (
                    <button
                        onClick={handleEditClick}
                        className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-crm-bg px-3 py-1.5 text-xs font-bold text-crm-fg transition-colors hover:bg-crm-surface-raised"
                    >
                        <Edit2 size={12} />
                        Editar
                    </button>
                )}
                {isEditing && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-crm-bg px-2 py-1 text-xs font-bold text-crm-fg-muted transition-colors hover:text-white disabled:opacity-50"
                        >
                            <X size={14} />
                        </button>
                        <button
                            onClick={handleSaveClick}
                            disabled={isSaving}
                            className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/30 border border-emerald-500/30 disabled:opacity-50"
                        >
                            <Check size={14} />
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-5 p-5">
                {/* PRECIO FINAL */}
                <div className={`flex flex-col gap-2 rounded-xl border p-4 ${isEditing ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-crm-border bg-crm-bg items-center justify-between flex-row'}`}>
                    <span className="text-sm font-bold text-crm-fg-muted">Precio Final</span>
                    {isEditing ? (
                        <div className="flex gap-2 w-full mt-1">
                            <div className="w-24 shrink-0">
                                <CrmSelect 
                                    value={editForm.saleCurrency} 
                                    onChange={(e) => setEditForm({...editForm, saleCurrency: e.target.value})} 
                                    className="h-10 bg-crm-surface font-bold text-emerald-300 border-emerald-500/30 focus:border-emerald-400"
                                >
                                    <option value="USD">USD</option>
                                    <option value="ARS">ARS</option>
                                </CrmSelect>
                            </div>
                            <div className="flex-1">
                                <CrmInput 
                                    type="number" 
                                    min="0" 
                                    value={editForm.salePrice} 
                                    onChange={(e) => setEditForm({...editForm, salePrice: e.target.value})} 
                                    className="h-10 bg-crm-surface font-bold text-emerald-300 border-emerald-500/30 focus:border-emerald-400" 
                                />
                            </div>
                        </div>
                    ) : (
                        <span className={`text-2xl font-black ${sale.status === 'cancelada' ? 'text-crm-fg-muted line-through' : 'text-emerald-300'}`}>
                            {sale.saleCurrency} {(sale.salePrice || 0).toLocaleString('es-AR')}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* METODO DE PAGO */}
                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Metodo de Pago</span>
                        {isEditing ? (
                            <CrmSelect 
                                value={editForm.paymentMethod} 
                                onChange={(e) => setEditForm({...editForm, paymentMethod: e.target.value})} 
                                className="h-8 bg-crm-surface text-xs font-bold"
                            >
                                <option value="contado">CONTADO</option>
                                <option value="financiado">FINANCIADO</option>
                            </CrmSelect>
                        ) : (
                            <div className="flex items-center gap-2 mt-1">
                                <Landmark size={14} className="text-crm-fg-muted" />
                                <span className="text-sm font-bold uppercase text-crm-fg">{sale.paymentMethod || 'contado'}</span>
                            </div>
                        )}
                    </div>

                    {/* SEÑA APLICADA */}
                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted text-right">Sena Aplicada</span>
                        {isEditing ? (
                            <div className="flex gap-2">
                                <div className="w-16 shrink-0">
                                    <CrmSelect 
                                        value={editForm.depositAppliedCurrency} 
                                        onChange={(e) => setEditForm({...editForm, depositAppliedCurrency: e.target.value})} 
                                        className="h-8 bg-crm-surface px-1 text-xs font-bold"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="ARS">ARS</option>
                                    </CrmSelect>
                                </div>
                                <div className="flex-1">
                                    <CrmInput 
                                        type="number" 
                                        min="0" 
                                        value={editForm.depositAppliedAmount} 
                                        onChange={(e) => setEditForm({...editForm, depositAppliedAmount: e.target.value})} 
                                        className="h-8 bg-crm-surface px-2 text-xs font-bold text-right" 
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="text-right mt-1">
                                <span className="text-sm font-bold text-crm-fg">
                                    {sale.depositAppliedAmount > 0
                                        ? `${sale.depositAppliedCurrency} ${sale.depositAppliedAmount.toLocaleString('es-AR')}`
                                        : 'No aplicada'
                                    }
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {sale.tradeInTotalAmount > 0 && (
                    <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/10 p-3">
                        <span className="text-xs font-bold uppercase tracking-[0.08em] text-purple-300">Vehiculo Tomado</span>
                        <span className="text-sm font-bold text-purple-200">
                            - {sale.saleCurrency} {sale.tradeInTotalAmount.toLocaleString('es-AR')}
                        </span>
                    </div>
                )}

                {sale.tradeInTotalAmount > 0 && !isEditing && (
                    <div className="flex items-center justify-between border-t border-crm-border pt-3">
                        <span className="text-sm font-bold text-crm-fg-muted">Saldo a Cobrar</span>
                        <span className="text-lg font-black text-crm-fg">
                            {sale.saleCurrency} {sale.balanceAfterTradeIn?.toLocaleString('es-AR')}
                        </span>
                    </div>
                )}
                {sale.tradeInTotalAmount > 0 && isEditing && (
                    <div className="flex flex-col border-t border-crm-border pt-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-crm-fg-muted">Saldo a Cobrar</span>
                            <span className="text-lg font-black text-crm-fg">
                                {editForm.saleCurrency} {(Number(editForm.salePrice) - sale.tradeInTotalAmount).toLocaleString('es-AR')}
                            </span>
                        </div>
                        <span className="text-[10px] text-crm-fg-muted text-right mt-1">* Calculado dinámicamente según el nuevo precio de venta.</span>
                    </div>
                )}

                <div className="mt-auto flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                    <Info size={16} className="mt-0.5 shrink-0 text-blue-300" />
                    <p className="m-0 text-xs leading-5 text-blue-100/80">
                        Los cobros, facturacion, cuotas y comisiones se gestionan en los modulos financieros. Esta vista es exclusivamente comercial.
                    </p>
                </div>
            </div>
        </div>
    );
}
