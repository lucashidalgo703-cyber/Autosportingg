// src/components/crm/stock/rotation/VehicleStrategicDetailModal.jsx
"use client";

import React, { useState, useEffect } from 'react';
import {
    X,
    TrendingUp,
    TrendingDown,
    Clock,
    DollarSign,
    ShieldAlert,
    ExternalLink,
    AlertTriangle,
    CheckCircle2,
    Sliders,
    Layers,
    Calendar,
    Save,
    Users,
    Percent,
    Flame
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatMoney(amount, currency = 'ARS') {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/D';
    const isNegative = amount < 0;
    const formatted = Math.abs(Math.round(amount)).toLocaleString('es-AR');
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD ' : '$ '}${formatted}`;
}

export default function VehicleStrategicDetailModal({ vehicle, onClose, token, onDecisionSaved }) {
    if (!vehicle) return null;

    const [activeTab, setActiveTab] = useState('mercado'); // 'mercado' | 'simulador' | 'oportunidad' | 'decisiones'
    const cur = vehicle.currency || 'ARS';

    // Estado del simulador
    const [customDiscount, setCustomDiscount] = useState('');
    const [customPriceInput, setCustomPriceInput] = useState('');
    const [scenarios, setScenarios] = useState([]);
    const [simLoading, setSimLoading] = useState(false);

    // Estado del historial de decisiones
    const [decisions, setDecisions] = useState([]);
    const [decisionsLoading, setDecisionsLoading] = useState(false);

    // Formulario de nueva decisión
    const [decisionType, setDecisionType] = useState('ajuste_precio');
    const [newPrice, setNewPrice] = useState(vehicle.price || 0);
    const [reason, setReason] = useState('');
    const [savingDecision, setSavingDecision] = useState(false);

    // Formulario de comparable manual
    const [compUrl, setCompUrl] = useState('');
    const [compPrice, setCompPrice] = useState('');
    const [compTitle, setCompTitle] = useState('');
    const [savingComp, setSavingComp] = useState(false);

    // Cargar simulación inicial
    useEffect(() => {
        const fetchSimulation = async () => {
            setSimLoading(true);
            try {
                const res = await fetch('/api/admin/stock/rotation/simulate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        carId: vehicle.carId,
                        customDiscountPct: Number(customDiscount) || 0,
                        customPrice: customPriceInput ? Number(customPriceInput) : null
                    })
                });
                const result = await res.json();
                if (result.ok && result.scenarios) {
                    setScenarios(result.scenarios);
                }
            } catch (err) {
                console.error('Error cargando simulador:', err);
            } finally {
                setSimLoading(false);
            }
        };

        if (token) fetchSimulation();
    }, [vehicle.carId, token, customDiscount, customPriceInput]);

    // Cargar historial de decisiones
    const fetchDecisions = async () => {
        setDecisionsLoading(true);
        try {
            const res = await fetch(`/api/admin/stock/rotation/decision/${vehicle.carId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.ok) {
                setDecisions(result.decisions || []);
            }
        } catch (err) {
            console.error('Error cargando decisiones:', err);
        } finally {
            setDecisionsLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchDecisions();
    }, [vehicle.carId, token]);

    // Guardar decisión del propietario
    const handleSaveDecision = async (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            toast.error('Ingresá el motivo fundamentado de la decisión.');
            return;
        }

        setSavingDecision(true);
        try {
            const res = await fetch('/api/admin/stock/rotation/decision', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    carId: vehicle.carId,
                    decisionType,
                    previousPrice: vehicle.price,
                    newAuthorizedPrice: decisionType === 'ajuste_precio' ? Number(newPrice) : null,
                    currency: cur,
                    reason,
                    marketEvidence: {
                        hasMarketData: vehicle.hasMarketEvidence,
                        marketMedian: vehicle.marketMedian,
                        percentDifferenceVsMarket: vehicle.priceDifferenceVsMarket
                    }
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Error guardando decisión');
            toast.success('Decisión comercial registrada exitosamente');
            setReason('');
            fetchDecisions();
            if (onDecisionSaved) onDecisionSaved();
        } catch (err) {
            console.error('Error guardando decisión:', err);
            toast.error(err.message || 'Error al guardar decisión');
        } finally {
            setSavingDecision(false);
        }
    };

    // Guardar comparable manual
    const handleSaveComparable = async (e) => {
        e.preventDefault();
        const p = Number(compPrice);
        if (!p || p <= 0) {
            toast.error('Ingresá un precio de referencia válido.');
            return;
        }

        setSavingComp(true);
        try {
            const res = await fetch(`/api/admin/stock/rotation/comparables/${vehicle.carId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    url: compUrl,
                    price: p,
                    title: compTitle,
                    currency: cur
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Error vinculando comparable');
            toast.success('Comparable vinculado al vehículo');
            setCompUrl('');
            setCompPrice('');
            setCompTitle('');
            if (onDecisionSaved) onDecisionSaved();
        } catch (err) {
            console.error('Error vinculando comparable:', err);
            toast.error(err.message || 'Error al vincular comparable');
        } finally {
            setSavingComp(false);
        }
    };

    const thresholds = vehicle.thresholds || {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl max-h-[92vh] rounded-3xl border border-crm-border bg-crm-surface overflow-hidden flex flex-col shadow-2xl animate-fadeIn">
                
                {/* Header del Modal */}
                <div className="flex items-center justify-between p-5 border-b border-crm-border bg-crm-bg/80">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-white">
                                {vehicle.brand} {vehicle.name} ({vehicle.year})
                            </h2>
                            {vehicle.plate && (
                                <span className="font-mono text-xs bg-crm-surface px-2 py-0.5 rounded border border-crm-border text-purple-300 font-bold">
                                    {vehicle.plate}
                                </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                vehicle.agingClass?.key === 'revision_prioritaria' ? 'bg-red-500/20 text-red-400' :
                                vehicle.agingClass?.key === 'atencion' ? 'bg-amber-500/20 text-amber-300' :
                                'bg-cyan-500/20 text-cyan-300'
                            }`}>
                                {vehicle.daysInStock} días ({vehicle.agingClass?.label})
                            </span>
                        </div>
                        <p className="text-xs text-crm-fg-muted">
                            Ficha de Inteligencia de Rotación, Evaluación de Mercado y Toma de Decisiones.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="h-9 w-9 rounded-xl border border-crm-border bg-crm-surface text-crm-fg-muted hover:text-white flex items-center justify-center transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Sub-Header con Métricas Rápidas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-crm-surface border-b border-crm-border text-xs font-mono">
                    <div className="bg-crm-bg p-2.5 rounded-xl border border-crm-border">
                        <span className="text-crm-fg-muted block text-[10px] font-sans">Precio Publicado:</span>
                        <strong className="text-white text-sm">{formatMoney(vehicle.price, cur)}</strong>
                    </div>
                    <div className="bg-crm-bg p-2.5 rounded-xl border border-crm-border">
                        <span className="text-crm-fg-muted block text-[10px] font-sans">Capital Propio:</span>
                        <strong className="text-emerald-400 text-sm">{formatMoney(vehicle.capitalOwnInvested, cur)}</strong>
                    </div>
                    <div className="bg-crm-bg p-2.5 rounded-xl border border-crm-border">
                        <span className="text-crm-fg-muted block text-[10px] font-sans">Mediana de Mercado:</span>
                        <strong className="text-cyan-400 text-sm">
                            {vehicle.hasMarketEvidence ? formatMoney(vehicle.marketMedian, cur) : 'Sin datos'}
                        </strong>
                    </div>
                    <div className="bg-crm-bg p-2.5 rounded-xl border border-crm-border">
                        <span className="text-crm-fg-muted block text-[10px] font-sans">Prioridad Comercial:</span>
                        <strong className="text-amber-300 text-sm">
                            {vehicle.priorityTier} ({vehicle.priorityScore} pts)
                        </strong>
                    </div>
                </div>

                {/* Tabs de Navegación */}
                <div className="flex border-b border-crm-border px-4 gap-2 bg-crm-bg/40">
                    {[
                        { id: 'mercado', label: '1. Diagnóstico & Mercado' },
                        { id: 'simulador', label: '2. Simulador de Precios' },
                        { id: 'oportunidad', label: '3. Costo de Oportunidad' },
                        { id: 'decisiones', label: '4. Decisiones & Historial' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                                activeTab === tab.id
                                    ? 'border-purple-500 text-purple-300'
                                    : 'border-transparent text-crm-fg-muted hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Contenido del Tab Activo */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-xs">
                    
                    {/* TAB 1: DIAGNÓSTICO & MERCADO */}
                    {activeTab === 'mercado' && (
                        <div className="space-y-5">
                            
                            {/* Desglose de Antigüedad y Estados */}
                            <div className="rounded-2xl border border-crm-border bg-crm-bg p-4 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                    <Clock size={14} className="text-purple-400" />
                                    Trazabilidad Temporal de Antigüedad (Sin reseteo por edición)
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
                                    <div className="bg-crm-surface p-2.5 rounded-xl border border-crm-border">
                                        <span className="text-crm-fg-muted block text-[10px] font-sans">Días Totales:</span>
                                        <strong className="text-white text-sm">{vehicle.daysBreakdown?.totalDays} d.</strong>
                                    </div>
                                    <div className="bg-crm-surface p-2.5 rounded-xl border border-crm-border">
                                        <span className="text-crm-fg-muted block text-[10px] font-sans">Disponible Venta:</span>
                                        <strong className="text-emerald-400 text-sm">{vehicle.daysBreakdown?.daysAvailable} d.</strong>
                                    </div>
                                    <div className="bg-crm-surface p-2.5 rounded-xl border border-crm-border">
                                        <span className="text-crm-fg-muted block text-[10px] font-sans">Publicado Activo:</span>
                                        <strong className="text-cyan-400 text-sm">{vehicle.daysBreakdown?.daysPublished} d.</strong>
                                    </div>
                                    <div className="bg-crm-surface p-2.5 rounded-xl border border-crm-border">
                                        <span className="text-crm-fg-muted block text-[10px] font-sans">Días Pausado:</span>
                                        <strong className="text-gray-300 text-sm">{vehicle.daysBreakdown?.daysPaused} d.</strong>
                                    </div>
                                    <div className="bg-crm-surface p-2.5 rounded-xl border border-crm-border">
                                        <span className="text-crm-fg-muted block text-[10px] font-sans">Días Reservado:</span>
                                        <strong className="text-amber-300 text-sm">{vehicle.daysBreakdown?.daysReserved} d.</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Demanda Comercial Observada */}
                            <div className="rounded-2xl border border-crm-border bg-crm-bg p-4 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                    <Users size={14} className="text-purple-400" />
                                    Demanda Comercial Registrada en el CRM
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                                    <div className="bg-crm-surface p-2.5 rounded-xl border border-crm-border">
                                        <span className="text-crm-fg-muted block text-[10px] font-sans">Consultas Recibidas:</span>
                                        <strong className="text-white text-sm">{vehicle.demandMetrics?.inquiriesCount || 0}</strong>
                                    </div>
                                    <div className="bg-crm-surface p-2.5 rounded-xl border border-crm-border">
                                        <span className="text-crm-fg-muted block text-[10px] font-sans">Leads Activos:</span>
                                        <strong className="text-emerald-400 text-sm">{vehicle.demandMetrics?.activeLeadsCount || 0}</strong>
                                    </div>
                                    <div className="bg-crm-surface p-2.5 rounded-xl border border-crm-border">
                                        <span className="text-crm-fg-muted block text-[10px] font-sans">Visitas / Test Drives:</span>
                                        <strong className="text-cyan-400 text-sm">{vehicle.demandMetrics?.testDrivesCount || 0}</strong>
                                    </div>
                                    <div className="bg-crm-surface p-2.5 rounded-xl border border-crm-border">
                                        <span className="text-crm-fg-muted block text-[10px] font-sans">Reserva Activa:</span>
                                        <strong className={`text-sm ${vehicle.demandMetrics?.hasActiveReservation ? 'text-amber-300' : 'text-crm-fg-muted'}`}>
                                            {vehicle.demandMetrics?.hasActiveReservation ? 'Sí' : 'No'}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            {/* Comparables de Mercado */}
                            <div className="rounded-2xl border border-crm-border bg-crm-bg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                                        Comparables de Mercado & Fuentes Verificadas
                                    </h3>
                                    <span className="text-[10px] text-crm-fg-subtle">
                                        Priorización Patagonia y Mercado Nacional
                                    </span>
                                </div>

                                {vehicle.comparablesList?.length > 0 ? (
                                    <div className="space-y-2">
                                        {vehicle.comparablesList.map((comp, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-crm-border bg-crm-surface">
                                                <div>
                                                    <p className="font-bold text-white">{comp.title}</p>
                                                    <p className="text-[10px] text-crm-fg-muted">
                                                        Fuente: {comp.source} • Región: {comp.market} • Estado: {comp.verification}
                                                    </p>
                                                </div>
                                                <div className="text-right font-mono">
                                                    <strong className="text-white block">{formatMoney(comp.price, comp.currency)}</strong>
                                                    <span className="text-[10px] text-crm-fg-subtle">Verificado</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-crm-surface rounded-xl border border-crm-border text-center text-crm-fg-muted space-y-1">
                                        <p>No se encontraron publicaciones externas automáticas coincidentes.</p>
                                        <p className="text-[11px] text-crm-fg-subtle">Podés vincular una referencia manualmente abajo.</p>
                                    </div>
                                )}

                                {/* Formulario para agregar comparable manual */}
                                <form onSubmit={handleSaveComparable} className="pt-2 border-t border-crm-border flex flex-wrap items-end gap-2">
                                    <div className="flex-1 min-w-[200px] space-y-1">
                                        <label className="text-[10px] font-bold text-crm-fg-muted">Enlace HTTPS o Fuente:</label>
                                        <input
                                            type="text"
                                            placeholder="https://auto.mercadolibre.com.ar/MLA-..."
                                            value={compUrl}
                                            onChange={(e) => setCompUrl(e.target.value)}
                                            className="w-full h-8 rounded-lg border border-crm-border bg-crm-surface px-2.5 text-xs text-white"
                                        />
                                    </div>
                                    <div className="w-32 space-y-1">
                                        <label className="text-[10px] font-bold text-crm-fg-muted">Precio ({cur}):</label>
                                        <input
                                            type="number"
                                            placeholder="Precio"
                                            value={compPrice}
                                            onChange={(e) => setCompPrice(e.target.value)}
                                            className="w-full h-8 rounded-lg border border-crm-border bg-crm-surface px-2.5 text-xs text-white font-mono"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={savingComp}
                                        className="h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                                    >
                                        {savingComp ? 'Guardando...' : 'Vincular Referencia'}
                                    </button>
                                </form>
                            </div>

                        </div>
                    )}

                    {/* TAB 2: SIMULADOR DE PRECIOS & UMBRALES */}
                    {activeTab === 'simulador' && (
                        <div className="space-y-5">
                            
                            {/* Umbrales Clave (Break-even, Margen Objetivo, Liquidación) */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                                <div className="rounded-2xl border border-crm-border bg-crm-bg p-3.5 space-y-1">
                                    <span className="text-[10px] font-sans font-bold uppercase text-crm-fg-muted block">
                                        1. Punto de Equilibrio (Break-even):
                                    </span>
                                    <p className="text-base font-bold text-white">
                                        {formatMoney(thresholds.breakEvenPrice, cur)}
                                    </p>
                                    <p className="text-[10px] font-sans text-crm-fg-subtle">
                                        Cubre 100% de costos directos y comisiones (Margen = $0).
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-cyan-500/30 bg-crm-bg p-3.5 space-y-1">
                                    <span className="text-[10px] font-sans font-bold uppercase text-cyan-400 block">
                                        2. Precio Mínimo c/ Margen Objetivo:
                                    </span>
                                    <p className="text-base font-bold text-cyan-300">
                                        {formatMoney(thresholds.targetMinPrice, cur)}
                                    </p>
                                    <p className="text-[10px] font-sans text-crm-fg-subtle">
                                        Garantiza el 10% mínimo de margen comercial sobre costo.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-3.5 space-y-1">
                                    <span className="text-[10px] font-sans font-bold uppercase text-red-400 block flex items-center gap-1">
                                        <AlertTriangle size={11} /> 3. Precio de Liquidación:
                                    </span>
                                    <p className="text-base font-bold text-red-400">
                                        {formatMoney(thresholds.liquidationPrice, cur)}
                                    </p>
                                    <p className="text-[10px] font-sans text-red-300/80">
                                        Escenario extraordinario. Requiere autorización explícita. Nunca se aplica automáticamente.
                                    </p>
                                </div>
                            </div>

                            {/* Controles de Simulación */}
                            <div className="flex flex-wrap items-center gap-3 p-3 bg-crm-bg rounded-xl border border-crm-border">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">Descuento personalizado (%):</span>
                                    <input
                                        type="number"
                                        placeholder="Ej: 6"
                                        value={customDiscount}
                                        onChange={(e) => {
                                            setCustomDiscount(e.target.value);
                                            setCustomPriceInput('');
                                        }}
                                        className="h-8 w-20 rounded-lg border border-crm-border bg-crm-surface px-2.5 text-xs text-white font-mono"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">O precio exacto ({cur}):</span>
                                    <input
                                        type="number"
                                        placeholder="Ej: 18500000"
                                        value={customPriceInput}
                                        onChange={(e) => {
                                            setCustomPriceInput(e.target.value);
                                            setCustomDiscount('');
                                        }}
                                        className="h-8 w-32 rounded-lg border border-crm-border bg-crm-surface px-2.5 text-xs text-white font-mono"
                                    />
                                </div>
                            </div>

                            {/* Tabla de Escenarios Simulados */}
                            <div className="overflow-x-auto rounded-2xl border border-crm-border bg-crm-bg">
                                <table className="w-full text-left font-mono">
                                    <thead className="bg-crm-surface text-[10px] font-black uppercase text-crm-fg-muted border-b border-crm-border">
                                        <tr>
                                            <th className="p-3 font-sans">Escenario</th>
                                            <th className="p-3 text-right">Precio Final</th>
                                            <th className="p-3 text-right">Comisión</th>
                                            <th className="p-3 text-right">Resultado Neto</th>
                                            <th className="p-3 text-center">Margen %</th>
                                            <th className="p-3 text-right">Dinero Recuperable</th>
                                            <th className="p-3 text-right">Diferencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-crm-border/60">
                                        {scenarios.map((sc, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02]">
                                                <td className="p-3 font-sans font-bold text-white">
                                                    {sc.scenarioName}
                                                </td>
                                                <td className="p-3 text-right text-white">
                                                    {formatMoney(sc.finalPrice, cur)}
                                                </td>
                                                <td className="p-3 text-right text-crm-fg-muted">
                                                    {formatMoney(sc.commissionAmount, cur)}
                                                </td>
                                                <td className={`p-3 text-right font-bold ${sc.isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {formatMoney(sc.netProfit, cur)}
                                                </td>
                                                <td className="p-3 text-center text-cyan-400">
                                                    {sc.marginOnCostPct}%
                                                </td>
                                                <td className="p-3 text-right text-emerald-300 font-bold">
                                                    {formatMoney(sc.recoverableCash, cur)}
                                                </td>
                                                <td className={`p-3 text-right ${sc.differenceVsOriginal < 0 ? 'text-amber-400' : 'text-white'}`}>
                                                    {sc.differenceVsOriginal === 0 ? 'Base' : formatMoney(sc.differenceVsOriginal, cur)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <p className="text-[11px] text-crm-fg-subtle italic">
                                * Nota: La simulación es de carácter orientativo. Una reducción de precio no garantiza la venta en un plazo determinado.
                            </p>

                        </div>
                    )}

                    {/* TAB 3: COSTO DE OPORTUNIDAD */}
                    {activeTab === 'oportunidad' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-purple-500/10 border border-purple-500/25 rounded-2xl text-xs space-y-1.5">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Flame size={15} className="text-red-400" />
                                    ¿Cuánto cuesta sostener este vehículo inmovilizado?
                                </h3>
                                <p className="text-crm-fg-muted">
                                    Defender un precio alto esperando un comprador puede generar pérdidas silenciosas por costos de conservación, seguro y costo del capital propio inmovilizado.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono">
                                {(vehicle.opportunityCosts || []).map((opp, idx) => (
                                    <div key={idx} className="rounded-2xl border border-crm-border bg-crm-bg p-3.5 space-y-2">
                                        <div className="flex items-center justify-between border-b border-crm-border pb-1.5 font-sans">
                                            <span className="font-bold text-white">+{opp.days} días</span>
                                            <span className="text-[10px] text-crm-fg-muted">Proyección</span>
                                        </div>
                                        <div className="space-y-1 text-[11px]">
                                            <div className="flex justify-between">
                                                <span className="text-crm-fg-muted font-sans">Costo Capital:</span>
                                                <span className="text-red-400">{formatMoney(opp.capitalCost, cur)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-crm-fg-muted font-sans">Mantenimiento:</span>
                                                <span className="text-amber-300">{formatMoney(opp.carryingCost, cur)}</span>
                                            </div>
                                            <div className="flex justify-between border-t border-crm-border pt-1">
                                                <strong className="text-white font-sans font-bold">Costo Total:</strong>
                                                <strong className="text-red-400">{formatMoney(opp.totalEstimatedHoldingCost, cur)}</strong>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-crm-bg rounded-2xl border border-crm-border space-y-2 text-xs">
                                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                                    Comparativa Estratégica:
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-crm-fg-muted">
                                    <div className="p-3 bg-crm-surface rounded-xl border border-crm-border space-y-1">
                                        <strong className="text-white block">Escenario A: Sostener precio actual</strong>
                                        <p className="text-[11px]">
                                            Si la unidad permanece otros 60 días en salón, absorberá aprox. <strong>{formatMoney(vehicle.opportunityCosts?.[2]?.totalEstimatedHoldingCost, cur)}</strong> en costos acumulados, erosionando la rentabilidad neta real.
                                        </p>
                                    </div>
                                    <div className="p-3 bg-crm-surface rounded-xl border border-crm-border space-y-1">
                                        <strong className="text-emerald-400 block">Escenario B: Ajustar precio y rotar</strong>
                                        <p className="text-[11px]">
                                            Ajustar el precio al rango competitivo permite recuperar <strong>{formatMoney(vehicle.capitalOwnInvested, cur)}</strong> en efectivo para reinvertir en una nueva oportunidad de compra con alta rotación.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: DECISIONES & HISTORIAL */}
                    {activeTab === 'decisiones' && (
                        <div className="space-y-5">
                            
                            {/* Formulario para asentar decisión */}
                            <form onSubmit={handleSaveDecision} className="rounded-2xl border border-crm-border bg-crm-bg p-4 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                                    <Save size={14} className="text-purple-400" />
                                    Registrar Decisión Comercial Autorizada
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-crm-fg-muted uppercase">Tipo de Decisión:</label>
                                        <select
                                            value={decisionType}
                                            onChange={(e) => setDecisionType(e.target.value)}
                                            className="w-full h-9 rounded-xl border border-crm-border bg-crm-surface px-3 text-xs text-white font-bold"
                                        >
                                            <option value="ajuste_precio">Ajustar Precio de Venta</option>
                                            <option value="mantener_precio">Mantener Precio Actual</option>
                                            <option value="priorizar_difusion">Priorizar Difusión / Publicación</option>
                                            <option value="autorizacion_oferta">Autorizar Negociación a Vendedores</option>
                                            <option value="evaluar_liquidacion">Evaluar Liquidación Extraordinaria</option>
                                        </select>
                                    </div>

                                    {decisionType === 'ajuste_precio' && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-crm-fg-muted uppercase">Nuevo Precio Autorizado ({cur}):</label>
                                            <input
                                                type="number"
                                                value={newPrice}
                                                onChange={(e) => setNewPrice(e.target.value)}
                                                className="w-full h-9 rounded-xl border border-crm-border bg-crm-surface px-3 text-xs text-white font-mono"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-crm-fg-muted uppercase">Motivo y Justificación Comercial:</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Ej: Se ajusta a la mediana de mercado tras 65 días inmovilizado para acelerar liquidez."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-surface p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingDecision}
                                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {savingDecision ? 'Guardando...' : 'Asentar Decisión Autorizada'}
                                </button>
                            </form>

                            {/* Historial Cronológico de Decisiones */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-crm-fg-muted">
                                    Historial de Decisiones Tomadas ({decisions.length})
                                </h4>

                                {decisionsLoading ? (
                                    <p className="text-crm-fg-muted">Cargando historial...</p>
                                ) : decisions.length === 0 ? (
                                    <p className="text-crm-fg-muted italic">Aún no se registraron decisiones estratégicas sobre este vehículo.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {decisions.map((d) => (
                                            <div key={d._id} className="p-3 rounded-xl border border-crm-border bg-crm-bg space-y-1 font-mono text-xs">
                                                <div className="flex items-center justify-between font-sans">
                                                    <span className="font-bold text-white capitalize">{d.decisionType.replace('_', ' ')}</span>
                                                    <span className="text-[10px] text-crm-fg-muted">{new Date(d.date).toLocaleDateString('es-AR')}</span>
                                                </div>
                                                <p className="text-crm-fg-muted font-sans text-[11px]">{d.reason}</p>
                                                {d.newAuthorizedPrice && (
                                                    <p className="text-[10px] text-cyan-300">
                                                        Precio ajustado: {formatMoney(d.previousPrice, d.currency)} ➔ {formatMoney(d.newAuthorizedPrice, d.currency)}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                </div>

            </div>
        </div>
    );
}
