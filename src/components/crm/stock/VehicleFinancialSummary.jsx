"use client";
import React, { useState, useEffect } from 'react';
import CrmCard from '../ui/CrmCard';
import { Edit, DollarSign, CheckCircle2, Clock, AlertTriangle, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehicleFinancialSummary({ vehicle, onEdit, onPaymentSaved }) {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const paymentState = vehicle?.purchasePaymentState || {};
    const isAgencyOwned = Boolean(vehicle?.agencyOwned || vehicle?.origen === 'propio');
    const pendingDebt = Number(paymentState.pendingDebt ?? (isAgencyOwned ? (vehicle?.precioCompra || 0) : 0));
    const amountPaid = Number(paymentState.amountPaid || 0);
    const paymentStatus = paymentState.status || (isAgencyOwned && pendingDebt > 0 ? 'pendiente' : 'pagado');

    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        accountId: '',
        paymentMethod: 'Transferencia bancaria',
        reference: '',
        deductFromStrategicBox: false,
        notes: ''
    });

    useEffect(() => {
        if (isPaymentModalOpen && accounts.length === 0 && !loadingAccounts) {
            setLoadingAccounts(true);
            const token = localStorage.getItem('token');
            fetch('/api/admin/accounts', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
                .then(res => res.ok ? res.json() : [])
                .then(data => {
                    const list = Array.isArray(data) ? data : (data.accounts || []);
                    const filtered = list.filter(a => a.isActive !== false);
                    setAccounts(filtered);
                    if (filtered.length > 0) {
                        setPaymentForm(prev => ({ ...prev, accountId: filtered[0]._id }));
                    }
                })
                .catch(err => console.error('Error cargando cuentas:', err))
                .finally(() => setLoadingAccounts(false));
        }
    }, [isPaymentModalOpen, accounts.length, loadingAccounts]);

    const handleOpenPaymentModal = () => {
        setPaymentForm({
            amount: String(pendingDebt > 0 ? pendingDebt : ''),
            accountId: accounts[0]?._id || '',
            paymentMethod: 'Transferencia bancaria',
            reference: '',
            deductFromStrategicBox: false,
            notes: ''
        });
        setIsPaymentModalOpen(true);
    };

    const handleConfirmPayment = async (e) => {
        e.preventDefault();
        const numAmount = Number(paymentForm.amount);
        if (!numAmount || numAmount <= 0) {
            toast.error('Ingresá un importe válido mayor a 0');
            return;
        }
        if (!paymentForm.accountId) {
            toast.error('Seleccioná la cuenta física de origen');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/cars/${vehicle.id}/purchase-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: numAmount,
                    accountId: paymentForm.accountId,
                    paymentMethod: paymentForm.paymentMethod,
                    reference: paymentForm.reference,
                    deductFromStrategicBox: paymentForm.deductFromStrategicBox,
                    notes: paymentForm.notes
                })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al registrar el pago de compra');
                return;
            }

            toast.success('Pago de compra registrado exitosamente');
            setIsPaymentModalOpen(false);
            if (onPaymentSaved) onPaymentSaved();
        } catch (err) {
            console.error('Error confirmando pago:', err);
            toast.error('Error de conexión al registrar pago');
        } finally {
            setIsSubmitting(false);
        }
    };

    const comisionEstimada = (vehicle.precioPublicado || 0) * 0.013;
    const margenNeto = (vehicle.margenEstimado || 0) - comisionEstimada;
    const margenNetoPorcentual = vehicle.costoTotal > 0 
        ? ((margenNeto / vehicle.costoTotal) * 100).toFixed(1)
        : 0;

    return (
        <CrmCard>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">Resumen Financiero</h3>
                {onEdit && (
                    <button onClick={onEdit} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-crm-fg-muted bg-crm-surface-raised border border-crm-border rounded hover:text-white hover:border-crm-fg transition-colors">
                        <Edit size={14} />
                        Editar Valores
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1 p-3 bg-crm-bg rounded-lg border border-crm-border">
                    <span className="text-xs text-crm-fg-muted">Costo de Compra</span>
                    <span className="text-white font-medium">
                        {vehicle.precioCompra > 0 ? `${vehicle.moneda} ${vehicle.precioCompra.toLocaleString('es-AR')}` : 'N/A'}
                    </span>
                </div>
                
                <div className="flex flex-col gap-1 p-3 bg-crm-bg rounded-lg border border-crm-border">
                    <span className="text-xs text-crm-fg-muted">Gastos Operativos</span>
                    <span className="text-white font-medium">
                        {vehicle.gastos > 0 ? `${vehicle.moneda} ${vehicle.gastos.toLocaleString('es-AR')}` : 'N/A'}
                    </span>
                </div>

                <div className="flex flex-col gap-1 p-3 bg-crm-bg rounded-lg border border-crm-border">
                    <span className="text-xs text-crm-fg-muted">Costo Total</span>
                    <span className="text-white font-bold">
                        {vehicle.costoTotal > 0 ? `${vehicle.moneda} ${vehicle.costoTotal.toLocaleString('es-AR')}` : 'N/A'}
                    </span>
                </div>

                <div className="flex flex-col gap-1 p-3 bg-crm-bg rounded-lg border border-crm-red/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#E63027]/10 to-transparent"></div>
                    <span className="text-xs text-crm-fg-muted">Margen Estimado</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[#22C55E] font-bold">
                            {margenNeto > 0 ? `${vehicle.moneda} ${margenNeto.toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : 'N/A'}
                        </span>
                        {margenNetoPorcentual > 0 && (
                            <span className="text-xs text-crm-fg-muted">({margenNetoPorcentual}%)</span>
                        )}
                    </div>
                </div>
            </div>

            {/* SECCIÓN PAGO DE COMPRA PARA UNIDADES PROPIAS */}
            {isAgencyOwned && (
                <div className="mt-4 p-4 rounded-xl border border-crm-border bg-crm-bg/60 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-crm-fg-muted">
                                Pago de Compra de la Unidad
                            </span>
                            {paymentStatus === 'pagado' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    <CheckCircle2 size={12} /> Pagado / Liquidado
                                </span>
                            ) : paymentStatus === 'parcial' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                    <Clock size={12} /> Pago Parcial
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                    <AlertTriangle size={12} /> Pendiente de Pago
                                </span>
                            )}
                        </div>

                        {pendingDebt > 0 && (
                            <button
                                type="button"
                                onClick={handleOpenPaymentModal}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow transition-colors"
                            >
                                <DollarSign size={13} />
                                Registrar pago de compra
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                        <div>
                            <span className="text-gray-400 block">Costo adquisición:</span>
                            <span className="font-bold text-white">
                                {vehicle.moneda} {Number(vehicle.precioCompra || 0).toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Abonado a la fecha:</span>
                            <span className="font-bold text-emerald-400">
                                {vehicle.moneda} {amountPaid.toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Saldo pendiente de pago:</span>
                            <span className={`font-bold ${pendingDebt > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                                {vehicle.moneda} {pendingDebt.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>

                    {paymentState.expectedFundsNote && (
                        <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                            <span className="font-bold">Previsión de fondos:</span> {paymentState.expectedFundsNote}
                        </div>
                    )}
                </div>
            )}

            <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between p-4 bg-crm-surface-raised rounded-lg border border-crm-border gap-4 md:gap-0">
                <div>
                    <span className="block text-sm text-crm-fg-muted">Precio Publicado</span>
                    <span className="block text-2xl font-bold text-white mt-1">
                        {vehicle.moneda} {vehicle.precioPublicado.toLocaleString('es-AR')}
                    </span>
                </div>
                <div className="md:text-center">
                    <span className="block text-sm text-crm-fg-muted">Comisión Estimada (1.3%)</span>
                    <span className="block text-lg font-medium text-[#22C55E] mt-1 opacity-90">
                        {vehicle.moneda} {comisionEstimada.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="md:text-right">
                    <span className="block text-sm text-crm-fg-muted">Precio Mínimo (Reserva)</span>
                    <span className="block text-lg font-medium text-white mt-1 opacity-80">
                        {vehicle.precioMinimo > 0 ? `${vehicle.moneda} ${vehicle.precioMinimo.toLocaleString('es-AR')}` : 'No definido'}
                    </span>
                </div>
            </div>

            {/* MODAL REGISTRAR PAGO DE COMPRA */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-crm-border pb-3">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                                    <DollarSign size={18} />
                                </span>
                                <div>
                                    <h4 className="text-sm font-black text-white">Registrar Pago de Compra</h4>
                                    <p className="text-[11px] text-crm-fg-muted">{vehicle.marca} {vehicle.modelo} ({vehicle.dominio})</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                    Monto a Pagar ({vehicle.moneda})
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={pendingDebt > 0 ? pendingDebt : undefined}
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                                    required
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none font-bold"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Saldo pendiente total: {vehicle.moneda} {pendingDebt.toLocaleString('es-AR')}
                                </p>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                    Cuenta física de origen (egreso de fondos)
                                </label>
                                <select
                                    value={paymentForm.accountId}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, accountId: e.target.value }))}
                                    required
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="">— Seleccionar cuenta —</option>
                                    {accounts.map(acc => (
                                        <option key={acc._id} value={acc._id}>
                                            {acc.name} ({acc.currency} {Number(acc.balance || 0).toLocaleString('es-AR')})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">Medio de pago</label>
                                    <select
                                        value={paymentForm.paymentMethod}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                        className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white focus:outline-none"
                                    >
                                        <option value="Transferencia bancaria">Transferencia</option>
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">Referencia</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Transf. 9811"
                                        value={paymentForm.reference}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                                        className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            <label className="flex items-start gap-2.5 pt-2 border-t border-crm-border cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={paymentForm.deductFromStrategicBox}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, deductFromStrategicBox: e.target.checked }))}
                                    className="w-4 h-4 mt-0.5 rounded border-crm-border text-emerald-500 focus:ring-emerald-500 bg-crm-bg"
                                />
                                <div>
                                    <span className="text-xs font-bold text-white block">
                                        Deducir asignación de caja estratégica Stock / Reposición
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                        Descuenta de la reserva de reposición en Tesorería Estratégica.
                                    </span>
                                </div>
                            </label>

                            <div className="flex gap-2 pt-3 border-t border-crm-border">
                                <button
                                    type="button"
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-crm-border text-crm-fg-muted hover:text-white hover:bg-crm-surface-raised font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                                    Confirmar Pago
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </CrmCard>
    );
}
