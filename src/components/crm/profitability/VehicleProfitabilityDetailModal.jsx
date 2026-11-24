"use client";
import React, { useState } from 'react';
import {
    X,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    DollarSign,
    Car,
    Clock,
    Scale,
    FileText,
    TrendingUp,
    Percent,
    GitBranch,
    ShieldCheck,
    CreditCard,
    Users,
    Calendar,
    HelpCircle,
    Info,
    ExternalLink
} from 'lucide-react';
import TradeInChainPanel from '../stock/TradeInChainPanel';

function formatMoney(amount, currency = 'ARS') {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/D';
    const isNegative = amount < 0;
    const formatted = Math.abs(Math.round(amount)).toLocaleString('es-AR');
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD ' : '$ '}${formatted}`;
}

export default function VehicleProfitabilityDetailModal({ isOpen, onClose, vehicle, onNavigateToStock }) {
    const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'gastos' | 'permutas' | 'auditoria'

    if (!isOpen || !vehicle) return null;

    const isSold = vehicle.vehicleType === 'sold';
    const cur = vehicle.currency || 'ARS';
    const participation = vehicle.participation || { hasPartner: false, agencyPercentage: 100, partnerPercentage: 0 };
    const efficiency = vehicle.capitalEfficiency || {};
    const tradeIns = vehicle.tradeIns || {};
    const originSaleInfo = tradeIns.originSaleInfo || null;
    const financing = vehicle.financing || {};
    const cashMetrics = vehicle.cashMetrics || { cashCollected: {}, pendingReceivable: {} };
    const traceability = vehicle.traceability || { calculationSteps: [], assumptions: [] };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-crm-border bg-crm-surface shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-crm-border bg-crm-bg/90 flex items-start justify-between">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                <TrendingUp size={12} /> FICHA DE RENTABILIDAD REAL
                            </span>
                            
                            {/* Badge de Reconocimiento y Estado */}
                            {isSold ? (
                                vehicle.isDelivered ? (
                                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                        <CheckCircle2 size={11} /> Entregada (Definitivamente Realizada)
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                        <Clock size={11} /> Pendiente Entrega (Devengado Condicional)
                                    </span>
                                )
                            ) : (
                                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                                    En Stock ({vehicle.status || 'Disponible'})
                                </span>
                            )}

                            {vehicle.plateOrVin && (
                                <span className="font-mono text-xs font-bold bg-crm-surface px-2 py-0.5 rounded border border-crm-border text-white">
                                    {vehicle.plateOrVin}
                                </span>
                            )}
                        </div>

                        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                            {vehicle.brand} {vehicle.name} <span className="text-crm-fg-muted font-bold text-sm">({vehicle.year})</span>
                        </h2>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-crm-fg-muted">
                            <span className="flex items-center gap-1">
                                <Calendar size={13} className="text-crm-fg-subtle" />
                                Ingreso: <strong className="text-crm-fg">{vehicle.intakeDate || 'N/D'}</strong>
                            </span>
                            {isSold && (
                                <span className="flex items-center gap-1">
                                    <Calendar size={13} className="text-crm-fg-subtle" />
                                    Venta: <strong className="text-crm-fg">{vehicle.saleDate || 'N/D'}</strong>
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Clock size={13} className="text-crm-fg-subtle" />
                                Inmovilización: <strong className="text-white font-bold">{vehicle.daysImmobilized || vehicle.daysInStock || 1} días</strong>
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-crm-fg-subtle hover:text-white hover:bg-crm-surface transition-colors"
                        title="Cerrar ficha"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Sub-tabs de la ficha */}
                <div className="flex border-b border-crm-border bg-crm-surface/50 px-4 sm:px-5 gap-2 text-xs overflow-x-auto custom-scrollbar">
                    <button
                        onClick={() => setActiveTab('resumen')}
                        className={`py-3 px-3 font-bold border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === 'resumen'
                                ? 'border-purple-500 text-purple-300'
                                : 'border-transparent text-crm-fg-muted hover:text-white'
                        }`}
                    >
                        Margen Comercial y Rendimiento
                    </button>
                    <button
                        onClick={() => setActiveTab('gastos')}
                        className={`py-3 px-3 font-bold border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === 'gastos'
                                ? 'border-purple-500 text-purple-300'
                                : 'border-transparent text-crm-fg-muted hover:text-white'
                        }`}
                    >
                        Gastos y Costos ({ (vehicle.carExpensesList || []).length + (vehicle.saleExpensesList || []).length })
                    </button>
                    <button
                        onClick={() => setActiveTab('permutas')}
                        className={`py-3 px-3 font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                            activeTab === 'permutas'
                                ? 'border-purple-500 text-purple-300'
                                : 'border-transparent text-crm-fg-muted hover:text-white'
                        }`}
                    >
                        <GitBranch size={13} />
                        Trazabilidad de Permutas
                    </button>
                    <button
                        onClick={() => setActiveTab('auditoria')}
                        className={`py-3 px-3 font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                            activeTab === 'auditoria'
                                ? 'border-purple-500 text-purple-300'
                                : 'border-transparent text-crm-fg-muted hover:text-white'
                        }`}
                    >
                        <Scale size={13} />
                        Auditoría y Metodología Contable
                    </button>
                </div>

                {/* Contenido scrolleable */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-crm-bg/40">

                    {/* TAB 1: RESUMEN ECONÓMICO */}
                    {activeTab === 'resumen' && (
                        <div className="space-y-6">
                            
                            {/* Aclaración de reconocimiento contable si está pendiente de entrega */}
                            {isSold && !vehicle.isDelivered && (
                                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                                    <div className="text-xs space-y-0.5">
                                        <p className="font-bold text-amber-200">Reconocimiento Contable Condicional a la Entrega</p>
                                        <p className="text-amber-300/80 leading-relaxed">
                                            La venta se encuentra formalizada por contrato pero pendiente de entrega física y transferencia. El margen devengado se registrará como definitivamente realizado una vez confirmado el traspaso de la unidad.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Cards de Métricas Principales */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                
                                {/* 1. Precio */}
                                <div className="rounded-xl border border-crm-border bg-crm-surface p-4 space-y-1">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                                        {isSold ? 'Precio de Venta Pactado' : 'Precio de Lista Publicado'}
                                    </span>
                                    <p className="text-lg sm:text-xl font-black text-white">
                                        {formatMoney(isSold ? vehicle.agreedPrice : vehicle.listPrice, cur)}
                                    </p>
                                    <p className="text-[10px] text-crm-fg-subtle">
                                        {isSold ? `Cobro ${vehicle.paymentMethod || 'contado'}` : 'Sujeto a negociación'}
                                    </p>
                                </div>

                                {/* 2. Costo Total */}
                                <div className="rounded-xl border border-crm-border bg-crm-surface p-4 space-y-1">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                                        Inversión Económica Total
                                    </span>
                                    <p className="text-lg sm:text-xl font-black text-white">
                                        {formatMoney(isSold ? vehicle.totalCostWithSaleExpenses : vehicle.totalEconomicCost, cur)}
                                    </p>
                                    <p className="text-[10px] text-crm-fg-subtle">
                                        Adquisición ({vehicle.acquisitionSource}) + Gastos
                                    </p>
                                </div>

                                {/* 3. Margen Comercial Neto */}
                                <div className={`rounded-xl border p-4 space-y-1 ${
                                    (isSold ? vehicle.netProfit : vehicle.potentialNetProfit) >= 0
                                        ? 'border-emerald-500/30 bg-emerald-500/5'
                                        : 'border-red-500/30 bg-red-500/5'
                                }`}>
                                    <span className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                                        {isSold ? 'Margen Comercial Neto' : 'Margen Potencial Estimado'}
                                    </span>
                                    <p className={`text-lg sm:text-xl font-black ${
                                        (isSold ? vehicle.netProfit : vehicle.potentialNetProfit) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                        {formatMoney(isSold ? vehicle.netProfit : vehicle.potentialNetProfit, cur)}
                                    </p>
                                    <p className="text-[10px] text-crm-fg-subtle">
                                        {isSold ? 'Contribución directa de la operación' : 'Sobre lista deducida comisión est. (1.3%)'}
                                    </p>
                                </div>

                                {/* 4. Margen % sobre Costo */}
                                <div className="rounded-xl border border-crm-border bg-crm-surface p-4 space-y-1">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                                        Margen % sobre Costo Real
                                    </span>
                                    <p className="text-lg sm:text-xl font-black text-cyan-400">
                                        {isSold 
                                            ? (vehicle.marginOnCostPct !== null ? `${vehicle.marginOnCostPct}%` : 'N/D')
                                            : (vehicle.potentialMarginPct !== null ? `${vehicle.potentialMarginPct}%` : 'N/D')
                                        }
                                    </p>
                                    <p className="text-[10px] text-crm-fg-subtle">
                                        {isSold 
                                            ? `Sobre precio: ${vehicle.marginOnSalePct !== null ? vehicle.marginOnSalePct + '%' : 'N/D'}`
                                            : 'Margen estimado de salida'
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Desglose de Capital Propio y Socios */}
                            <div className="rounded-xl border border-crm-border bg-crm-surface p-4 sm:p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-crm-border/60 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-purple-400" />
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                            Capital Propio y Reparto con Socios
                                        </h3>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                                        participation.hasPartner 
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    }`}>
                                        {participation.hasPartner ? `Coparticipación con ${participation.partnerName}` : '100% Capital Propio Agencia'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="rounded-lg border border-crm-border bg-crm-bg p-3.5 space-y-2">
                                        <span className="text-xs font-bold text-white flex items-center justify-between">
                                            <span>Agencia ({participation.agencyPercentage}%)</span>
                                            <span className="text-emerald-400 font-mono">
                                                {formatMoney(isSold ? vehicle.agencyNetProfit : vehicle.potentialAgencyNetProfit, cur)}
                                            </span>
                                        </span>
                                        <div className="text-xs space-y-1 text-crm-fg-muted font-mono">
                                            <div className="flex justify-between">
                                                <span>Capital propio inmovilizado:</span>
                                                <strong className="text-white">{formatMoney(vehicle.agencyCapitalInvested, cur)}</strong>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Margen propio sobre capital:</span>
                                                <strong className="text-cyan-400">
                                                    {vehicle.agencyMarginOnCostPct !== null ? `${vehicle.agencyMarginOnCostPct}%` : 'N/D'}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    {participation.hasPartner ? (
                                        <div className="rounded-lg border border-crm-border bg-crm-bg p-3.5 space-y-2">
                                            <span className="text-xs font-bold text-white flex items-center justify-between">
                                                <span>Socio: {participation.partnerName} ({participation.partnerPercentage}%)</span>
                                                <span className="text-purple-300 font-mono">
                                                    {formatMoney(isSold ? vehicle.partnerNetProfit : null, cur)}
                                                </span>
                                            </span>
                                            <div className="text-xs space-y-1 text-crm-fg-muted font-mono">
                                                <div className="flex justify-between">
                                                    <span>Capital aportado por el socio:</span>
                                                    <strong className="text-white">{formatMoney(vehicle.partnerCapitalInvested, cur)}</strong>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Margen devengado para el socio:</span>
                                                    <strong className="text-purple-300">
                                                        {formatMoney(isSold ? vehicle.partnerNetProfit : null, cur)}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-crm-border/40 bg-crm-bg/50 p-3.5 flex items-center justify-center text-xs text-crm-fg-subtle">
                                            Sin socios inversores. El 100% del margen y del capital pertenece a la agencia.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Eficiencia del Capital y Rotación */}
                            <div className="rounded-xl border border-crm-border bg-crm-surface p-4 sm:p-5 space-y-4">
                                <div className="flex items-center gap-2 border-b border-crm-border/60 pb-3">
                                    <Clock size={16} className="text-cyan-400" />
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                        Velocidad del Capital y Rotación
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="rounded-lg border border-crm-border bg-crm-bg p-3 space-y-1">
                                        <span className="text-[11px] font-bold text-crm-fg-muted">Días Inmovilizado</span>
                                        <p className="text-base font-black text-white">
                                            {efficiency.daysImmobilized || efficiency.daysInStock || 1} días
                                        </p>
                                        <p className="text-[10px] text-crm-fg-subtle">
                                            {isSold ? 'Tiempo exacto hasta venta' : 'Tiempo acumulado en salón'}
                                        </p>
                                    </div>

                                    <div className="rounded-lg border border-crm-border bg-crm-bg p-3 space-y-1">
                                        <span className="text-[11px] font-bold text-crm-fg-muted">Velocidad ($ / día)</span>
                                        <p className="text-base font-black text-emerald-400">
                                            {formatMoney(isSold ? efficiency.agencyDailyProfit : efficiency.potentialDailyProfit, cur)} / día
                                        </p>
                                        <p className="text-[10px] text-crm-fg-subtle">
                                            Margen generado por día inmovilizado
                                        </p>
                                    </div>

                                    <div className="rounded-lg border border-crm-border bg-crm-bg p-3 space-y-1">
                                        <span className="text-[11px] font-bold text-purple-300">
                                            [Secundario] ROI Anualizado
                                        </span>
                                        <p className="text-base font-black text-purple-300">
                                            {isSold 
                                                ? (efficiency.agencyAnnualizedRoiPct !== null ? `${efficiency.agencyAnnualizedRoiPct}%` : 'N/D')
                                                : (efficiency.potentialAnnualizedRoiPct !== null ? `${efficiency.potentialAnnualizedRoiPct}%` : 'N/D')
                                            }
                                        </p>
                                        <p className="text-[10px] text-crm-fg-subtle">
                                            Proyección teórica a 365 días
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Financiación y Caja Cobrada (Separación estricta de devengado vs cobrado) */}
                            {isSold && (
                                <div className="rounded-xl border border-crm-border bg-crm-surface p-4 sm:p-5 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-crm-border/60 pb-3">
                                        <div className="flex items-center gap-2">
                                            <CreditCard size={16} className="text-amber-400" />
                                            <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                                Caja Cobrada vs Financiación (Control de Efectivo)
                                            </h3>
                                        </div>
                                        <span className="text-xs text-crm-fg-muted">
                                            El margen económico devengado no equivale a efectivo en mano
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="rounded-lg border border-crm-border bg-crm-bg p-3.5 space-y-2">
                                            <span className="text-xs font-bold text-white">Efectivo Ingresado a Cajas</span>
                                            <div className="text-xs space-y-1 font-mono text-crm-fg-muted">
                                                <div className="flex justify-between">
                                                    <span>Dinero cobrado registrado:</span>
                                                    <strong className="text-emerald-400 font-bold">
                                                        {formatMoney(cashMetrics.cashCollected[cur] || 0, cur)}
                                                    </strong>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Recibos de cobro vinculados:</span>
                                                    <span className="text-white">{cashMetrics.txCount || 0} recibos</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-crm-border bg-crm-bg p-3.5 space-y-2">
                                            <span className="text-xs font-bold text-white">Saldos por Cobrar / Financiado</span>
                                            <div className="text-xs space-y-1 font-mono text-crm-fg-muted">
                                                <div className="flex justify-between">
                                                    <span>Cuotas pendientes por cobrar:</span>
                                                    <strong className="text-amber-300 font-bold">
                                                        {formatMoney(cashMetrics.pendingReceivable[cur] || 0, cur)}
                                                    </strong>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Plan de financiación:</span>
                                                    <span className="text-white">
                                                        {financing.hasFinancing ? `${financing.installmentsCount} cuotas pactadas` : 'Contado sin saldo financiado'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* TAB 2: GASTOS DETALLADOS */}
                    {activeTab === 'gastos' && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-crm-border bg-crm-surface p-4 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                                    Gastos Atribuibles al Vehículo ({ (vehicle.carExpensesList || []).length })
                                </h3>
                                {(vehicle.carExpensesList || []).length > 0 ? (
                                    <div className="divide-y divide-crm-border/60">
                                        {vehicle.carExpensesList.map((exp, idx) => (
                                            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                                                <div>
                                                    <p className="font-bold text-white">{exp.concept || 'Gasto operativo'}</p>
                                                    <p className="text-[10px] text-crm-fg-muted">
                                                        {exp.date ? new Date(exp.date).toLocaleDateString('es-AR') : 'Sin fecha'} • Pagado por: {exp.paidBy || 'Agencia'}
                                                    </p>
                                                </div>
                                                <span className="font-mono font-bold text-crm-red">
                                                    {formatMoney(exp.amount, exp.currency || cur)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-crm-fg-muted italic">No se registraron gastos de taller o preparación en la ficha del vehículo.</p>
                                )}
                            </div>

                            {isSold && (
                                <div className="rounded-xl border border-crm-border bg-crm-surface p-4 space-y-3">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                                        Gastos Comerciales de la Venta ({ (vehicle.saleExpensesList || []).length })
                                    </h3>
                                    {(vehicle.saleExpensesList || []).length > 0 ? (
                                        <div className="divide-y divide-crm-border/60">
                                            {vehicle.saleExpensesList.map((exp, idx) => (
                                                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                                                    <div>
                                                        <p className="font-bold text-white">{exp.description || exp.concept || 'Gasto de venta'}</p>
                                                        <p className="text-[10px] text-crm-fg-muted">Estado: {exp.status || 'Pendiente'}</p>
                                                    </div>
                                                    <span className="font-mono font-bold text-crm-red">
                                                        {formatMoney(exp.amount, exp.currency || cur)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-crm-fg-muted italic">No se registraron gastos comerciales adicionales en la venta.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: PERMUTAS ENCADENADAS */}
                    {activeTab === 'permutas' && (
                        <div className="space-y-4">
                            
                            {/* Panel Informativo de Origen si proviene de permuta */}
                            {tradeIns.hasTradeInOrigin && originSaleInfo ? (
                                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-300">
                                        <GitBranch size={15} />
                                        Vehículo Recibido en Parte de Pago (Venta de Origen #{originSaleInfo.saleId.slice(-6)})
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 font-mono">
                                        <div className="bg-crm-bg/80 p-2.5 rounded border border-crm-border">
                                            <span className="text-crm-fg-muted font-sans block text-[10px]">Vehículo vendido en origen:</span>
                                            <strong className="text-white font-sans">{originSaleInfo.parentCarName}</strong>
                                        </div>
                                        <div className="bg-crm-bg/80 p-2.5 rounded border border-crm-border">
                                            <span className="text-crm-fg-muted font-sans block text-[10px]">Valor comercial de toma acordado:</span>
                                            <strong className="text-cyan-400">{formatMoney(originSaleInfo.tradeInAgreedValue, originSaleInfo.currency)}</strong>
                                        </div>
                                        <div className="bg-crm-bg/80 p-2.5 rounded border border-crm-border">
                                            <span className="text-crm-fg-muted font-sans block text-[10px]">Resultado reconocido en origen:</span>
                                            <strong className="text-emerald-400">{formatMoney(originSaleInfo.recognizedProfitOnOriginSale, originSaleInfo.currency)}</strong>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-purple-300/80 pt-1">
                                        {originSaleInfo.auditNotice}
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-crm-border bg-crm-surface p-4 text-xs text-crm-fg-muted">
                                    Este vehículo ingresó por compra directa (no proviene de una permuta anterior).
                                </div>
                            )}

                            {/* Permutas tomadas en la venta actual */}
                            {isSold && (tradeIns.receivedTradeIns || []).length > 0 && (
                                <div className="rounded-xl border border-crm-border bg-crm-surface p-4 space-y-2">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                                        Vehículos Tomados en Parte de Pago en esta Venta ({tradeIns.receivedTradeIns.length})
                                    </h4>
                                    <div className="divide-y divide-crm-border/60">
                                        {tradeIns.receivedTradeIns.map((t, idx) => (
                                            <div key={idx} className="py-2 flex items-center justify-between text-xs">
                                                <div>
                                                    <span className="font-bold text-white">{t.brand} {t.model} ({t.year})</span>
                                                    <span className="text-crm-fg-muted block text-[10px]">Patente: {t.plate || 'S/D'}</span>
                                                </div>
                                                <div className="text-right font-mono">
                                                    <span className="font-bold text-cyan-400">{formatMoney(t.estimatedValue, t.currency)}</span>
                                                    <span className="text-[10px] text-crm-fg-subtle block font-sans">Valor de toma acordado</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Árbol interactivo canónico de permutas */}
                            <TradeInChainPanel carId={vehicle.carId} onUpdated={() => {}} />
                        </div>
                    )}

                    {/* TAB 4: AUDITORÍA Y METODOLOGÍA CONTABLE */}
                    {activeTab === 'auditoria' && (
                        <div className="space-y-4">
                            
                            {/* Pasos de Cálculo */}
                            <div className="rounded-xl border border-crm-border bg-crm-surface p-4 sm:p-5 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                                    <Scale size={14} className="text-purple-400" />
                                    Trazabilidad y Desglose Paso a Paso del Cálculo
                                </h3>
                                <div className="rounded-lg border border-crm-border bg-crm-bg divide-y divide-crm-border/60">
                                    {traceability.calculationSteps.map((step, idx) => (
                                        <div key={idx} className="p-3 flex items-center justify-between text-xs">
                                            <div>
                                                <span className={`${
                                                    step.type === 'total' || step.type === 'share_agency' ? 'font-bold text-white' : 'text-crm-fg-muted'
                                                }`}>
                                                    {step.label}
                                                </span>
                                                {step.description && (
                                                    <p className="text-[10px] text-crm-fg-subtle">{step.description}</p>
                                                )}
                                            </div>
                                            <span className={`font-mono font-bold ${
                                                step.amount < 0 ? 'text-red-400' : step.amount > 0 ? 'text-emerald-400' : 'text-crm-fg'
                                            }`}>
                                                {step.amount !== null ? formatMoney(step.amount, step.currency) : 'N/D'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Denominación Contable y Políticas */}
                            <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-4 sm:p-5 space-y-2">
                                <h3 className="text-xs font-black uppercase tracking-wider text-blue-300 flex items-center gap-2">
                                    <Info size={14} /> Denominación Contable y Políticas de Reconocimiento
                                </h3>
                                <ul className="list-disc pl-5 space-y-1 text-xs text-crm-fg-muted leading-relaxed">
                                    <li><strong className="text-white">Denominación Precisa:</strong> {traceability.accountingConcept}</li>
                                    <li><strong className="text-white">Política de Entrega:</strong> {traceability.deliveryPolicy}</li>
                                    {(traceability.assumptions || []).map((asmp, idx) => (
                                        <li key={idx}>{asmp}</li>
                                    ))}
                                </ul>
                            </div>

                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-crm-border bg-crm-surface flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-crm-fg-muted">
                        ID: <span className="font-mono text-crm-fg">{vehicle.carId}</span>
                    </span>
                    <div className="flex items-center gap-2">
                        {onNavigateToStock && (
                            <button
                                type="button"
                                onClick={() => onNavigateToStock(vehicle.carId)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-crm-border bg-crm-bg text-xs font-bold text-white hover:bg-crm-surface-raised transition-colors"
                            >
                                <ExternalLink size={13} /> Ir a la ficha de stock
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 rounded-lg bg-crm-surface-raised text-xs font-bold text-white hover:bg-white/10 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
