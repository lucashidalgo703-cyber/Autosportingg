"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
    DollarSign, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, 
    Table, HelpCircle, Layers, CheckCircle2, ChevronRight, Eye
} from 'lucide-react';
import CrmButton from '../ui/CrmButton';
import CapitalBreakdownModal from './CapitalBreakdownModal';
import StockAuditTableModal from './StockAuditTableModal';
import ContrastCasesModal from './ContrastCasesModal';

function formatARS(val) {
    if (val === undefined || val === null || isNaN(val)) return '$0';
    return '$' + Math.round(val).toLocaleString('es-AR');
}

export default function CapitalSummarySection({ initialSummary = null }) {
    const [summary, setSummary] = useState(initialSummary);
    const [loading, setLoading] = useState(!initialSummary);
    const [error, setError] = useState(null);
    const [valuationScenario, setValuationScenario] = useState('costo'); // 'costo' | 'publicado'

    // Modales
    const [selectedComponentKey, setSelectedComponentKey] = useState(null);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [isContrastModalOpen, setIsContrastModalOpen] = useState(false);

    const fetchSummary = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch('/api/admin/stock/capital-summary', {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                cache: 'no-store'
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json.ok) {
                throw new Error(json.message || 'No se pudo obtener el resumen de capital.');
            }
            setSummary(json.data);
        } catch (err) {
            console.error('Error cargando resumen de capital:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!initialSummary) {
            fetchSummary();
        }
    }, [initialSummary, fetchSummary]);

    if (loading && !summary) {
        return (
            <div className="rounded-2xl border border-crm-border bg-crm-surface p-6 text-center text-xs text-crm-fg-muted animate-pulse flex items-center justify-center gap-2">
                <RefreshCw size={15} className="animate-spin text-blue-400" />
                <span>Calculando Resumen Patrimonial de Capital (Stock + Caja + Cartera − Deudas)...</span>
            </div>
        );
    }

    if (error && !summary) {
        return (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-xs text-rose-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-400 shrink-0" />
                    <span>Error al cargar el resumen de capital: {error}</span>
                </div>
                <CrmButton variant="secondary" size="sm" onClick={fetchSummary}>
                    Reintentar
                </CrmButton>
            </div>
        );
    }

    if (!summary) return null;

    const { componentes, totales, auditoriaIndicadores } = summary;

    // Calcular valores según el escenario de valuación activo
    const stockMonto = valuationScenario === 'costo' 
        ? componentes.stockPropioCosto.monto 
        : totales.stockPropioPublicado;

    const capitalTotalCalculado = valuationScenario === 'costo'
        ? totales.capitalPropioCosto
        : totales.capitalPropioPublicado;

    return (
        <section className="space-y-4 pt-2">
            {/* Encabezado de la Sección */}
            <div className="rounded-2xl border border-crm-border bg-gradient-to-r from-crm-surface via-crm-surface/90 to-crm-bg p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-xs">
                                ⚖️
                            </span>
                            <h2 className="text-base md:text-lg font-extrabold text-white tracking-tight">
                                Resumen de mi capital: stock + caja + cartera − deudas
                            </h2>
                            <span className="hidden sm:inline-block rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                                Conciliación Patrimonial
                            </span>
                        </div>
                        <p className="text-xs text-crm-fg-muted leading-relaxed max-w-3xl">
                            Ecuación patrimonial completa sin duplicación de registros. Permite contrastar la valuación a costo real de adquisición frente a la estimación comercial a precios publicados.
                        </p>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <CrmButton 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => setIsAuditModalOpen(true)}
                            className="gap-1.5 text-xs border-crm-border hover:bg-crm-surface/80"
                        >
                            <Table size={13} className="text-blue-400" />
                            Auditoría de Vehículos ({auditoriaIndicadores?.totalStockActivo || 34})
                        </CrmButton>

                        <CrmButton 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => setIsContrastModalOpen(true)}
                            className="gap-1.5 text-xs border-crm-border hover:bg-crm-surface/80"
                        >
                            <Layers size={13} className="text-purple-400" />
                            Casos de Contraste y Permutas
                        </CrmButton>

                        <button 
                            onClick={fetchSummary}
                            className="p-2 rounded-lg border border-crm-border bg-crm-bg text-crm-fg-subtle hover:text-white hover:bg-crm-surface transition-colors"
                            title="Recalcular resumen patrimonial"
                        >
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Selector de Escenarios de Valuación */}
                <div className="mt-4 pt-4 border-t border-crm-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-subtle">
                            Base de Valuación:
                        </span>
                        <div className="inline-flex rounded-lg border border-crm-border bg-crm-bg p-0.5">
                            <button
                                onClick={() => setValuationScenario('costo')}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                    valuationScenario === 'costo'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-crm-fg-subtle hover:text-white'
                                }`}
                            >
                                Stock a Costo (Conservadora)
                            </button>
                            <button
                                onClick={() => setValuationScenario('publicado')}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                    valuationScenario === 'publicado'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-crm-fg-subtle hover:text-white'
                                }`}
                            >
                                Precios Publicados (Comercial)
                            </button>
                        </div>
                    </div>

                    {/* Efectivo Disponible Aparte (Regla de Oro: no confundir efectivo con capital total) */}
                    <div className="flex items-center gap-3 bg-crm-bg/80 px-3 py-1.5 rounded-lg border border-crm-border text-[11px]">
                        <span className="text-crm-fg-subtle">Efectivo en mano disponible:</span>
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                            {formatARS(totales.efectivoDisponible)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Aviso de Conciliación de Datos Faltantes */}
            {summary.conciliacionStatus === 'parcial_datos_pendientes' && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start justify-between gap-3 text-xs text-amber-200">
                    <div className="flex items-start gap-2">
                        <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <strong>Estado de conciliación:</strong> {summary.conciliacionMessage}
                            <span className="block text-[11px] text-amber-300/80 mt-0.5">
                                Las unidades sin costo cargado se computan con costo de adquisición pendiente de registración ($0 en libros) para no sobredimensionar el capital conservador.
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSelectedComponentKey('stockPropioCosto')}
                        className="text-[11px] font-semibold text-amber-300 hover:text-white underline shrink-0"
                    >
                        Ver las 9 unidades
                    </button>
                </div>
            )}

            {/* Ecuación Visual de Tarjetas con Signos Claros */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {/* 1. STOCK PROPIO */}
                <div 
                    onClick={() => setSelectedComponentKey('stockPropioCosto')}
                    className="cursor-pointer group rounded-xl border border-crm-border bg-crm-surface p-4 flex flex-col justify-between hover:border-blue-500/50 hover:bg-crm-surface/80 transition-all shadow-sm"
                >
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-blue-500/15 text-blue-400 font-bold text-xs">
                                +
                            </span>
                            <span className="text-[10px] text-crm-fg-subtle group-hover:text-blue-400 flex items-center gap-0.5">
                                Ver registros <ChevronRight size={11} />
                            </span>
                        </div>
                        <div className="text-[11px] font-bold text-crm-fg-subtle uppercase tracking-wider">
                            {valuationScenario === 'costo' ? 'Stock propio a costo' : 'Stock propio publicado'}
                        </div>
                        <div className="text-lg md:text-xl font-extrabold text-white tracking-tight">
                            {formatARS(stockMonto)}
                        </div>
                        <p className="text-[11px] text-crm-fg-muted line-clamp-2">
                            {valuationScenario === 'costo' 
                                ? 'Costo de compra + gastos directos propios.' 
                                : 'Precio de vidriera comercial esperado.'}
                        </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-crm-border/60 text-[10px] text-crm-fg-subtle flex justify-between">
                        <span>{componentes.stockPropioCosto.unidadesTotal} unidades</span>
                        <span className="text-blue-400 font-semibold">
                            {valuationScenario === 'costo' ? 'Base Costo' : 'Precio Venta'}
                        </span>
                    </div>
                </div>

                {/* 2. + EFECTIVO PROPIO CONCILIADO */}
                <div 
                    onClick={() => setSelectedComponentKey('efectivoPropio')}
                    className="cursor-pointer group rounded-xl border border-crm-border bg-crm-surface p-4 flex flex-col justify-between hover:border-emerald-500/50 hover:bg-crm-surface/80 transition-all shadow-sm"
                >
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold text-xs">
                                +
                            </span>
                            <span className="text-[10px] text-crm-fg-subtle group-hover:text-emerald-400 flex items-center gap-0.5">
                                Ver cuentas <ChevronRight size={11} />
                            </span>
                        </div>
                        <div className="text-[11px] font-bold text-crm-fg-subtle uppercase tracking-wider">
                            Efectivo conciliado
                        </div>
                        <div className="text-lg md:text-xl font-extrabold text-emerald-400 tracking-tight">
                            {formatARS(componentes.efectivoPropio.monto)}
                        </div>
                        <p className="text-[11px] text-crm-fg-muted line-clamp-2">
                            Caja y bancos reales. Excluye asignaciones internas duplicadas.
                        </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-crm-border/60 text-[10px] text-crm-fg-subtle flex justify-between">
                        <span>{componentes.efectivoPropio.cuentasCount} cuenta(s)</span>
                        <span className="text-emerald-400 font-semibold">Disponible</span>
                    </div>
                </div>

                {/* 3. + CARTERA PROPIA PENDIENTE */}
                <div 
                    onClick={() => setSelectedComponentKey('carteraPropia')}
                    className="cursor-pointer group rounded-xl border border-crm-border bg-crm-surface p-4 flex flex-col justify-between hover:border-blue-500/50 hover:bg-crm-surface/80 transition-all shadow-sm"
                >
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-blue-500/15 text-blue-400 font-bold text-xs">
                                +
                            </span>
                            <span className="text-[10px] text-crm-fg-subtle group-hover:text-blue-400 flex items-center gap-0.5">
                                Ver cuotas <ChevronRight size={11} />
                            </span>
                        </div>
                        <div className="text-[11px] font-bold text-crm-fg-subtle uppercase tracking-wider">
                            Cartera propia
                        </div>
                        <div className="text-lg md:text-xl font-extrabold text-white tracking-tight">
                            {formatARS(componentes.carteraPropia.monto)}
                        </div>
                        <p className="text-[11px] text-crm-fg-muted line-clamp-2">
                            Cuotas por cobrar netas de la cuota de inversionistas.
                        </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-crm-border/60 text-[10px] text-crm-fg-subtle flex justify-between">
                        <span>{componentes.carteraPropia.cuotasCount} cuotas</span>
                        <span className="text-crm-fg-subtle font-mono">Nom: {formatARS(componentes.carteraPropia.montoTotalNominal)}</span>
                    </div>
                </div>

                {/* 4. + OTROS CRÉDITOS PROPIOS */}
                <div 
                    onClick={() => setSelectedComponentKey('otrosCreditos')}
                    className="cursor-pointer group rounded-xl border border-crm-border bg-crm-surface p-4 flex flex-col justify-between hover:border-crm-border/80 transition-all shadow-sm"
                >
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-zinc-500/15 text-zinc-400 font-bold text-xs">
                                +
                            </span>
                            <span className="text-[10px] text-crm-fg-subtle group-hover:text-crm-fg flex items-center gap-0.5">
                                Detalle <ChevronRight size={11} />
                            </span>
                        </div>
                        <div className="text-[11px] font-bold text-crm-fg-subtle uppercase tracking-wider">
                            Otros créditos
                        </div>
                        <div className="text-lg md:text-xl font-extrabold text-crm-fg-muted tracking-tight">
                            {formatARS(componentes.otrosCreditos.monto)}
                        </div>
                        <p className="text-[11px] text-crm-fg-muted line-clamp-2">
                            Anticipos a socios verificados pendientes de reintegro.
                        </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-crm-border/60 text-[10px] text-crm-fg-subtle flex justify-between">
                        <span>Sin saldos activos</span>
                        <span className="text-zinc-400 font-semibold">$0</span>
                    </div>
                </div>

                {/* 5. − DEUDAS Y OBLIGACIONES */}
                <div 
                    onClick={() => setSelectedComponentKey('deudasPropia')}
                    className="cursor-pointer group rounded-xl border border-crm-border bg-crm-surface p-4 flex flex-col justify-between hover:border-rose-500/50 hover:bg-crm-surface/80 transition-all shadow-sm"
                >
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-rose-500/15 text-rose-400 font-bold text-xs">
                                −
                            </span>
                            <span className="text-[10px] text-crm-fg-subtle group-hover:text-rose-400 flex items-center gap-0.5">
                                Ver deudas <ChevronRight size={11} />
                            </span>
                        </div>
                        <div className="text-[11px] font-bold text-crm-fg-subtle uppercase tracking-wider">
                            Deudas y obligaciones
                        </div>
                        <div className="text-lg md:text-xl font-extrabold text-rose-300 tracking-tight">
                            {formatARS(componentes.deudasPropia.monto)}
                        </div>
                        <p className="text-[11px] text-crm-fg-muted line-clamp-2">
                            Obligaciones pendientes documentadas. Descontadas 1 sola vez.
                        </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-crm-border/60 text-[10px] text-crm-fg-subtle flex justify-between">
                        <span>{componentes.deudasPropia.deudasCount} pendientes</span>
                        <span className="text-emerald-400 font-semibold">Al día</span>
                    </div>
                </div>

                {/* 6. = CAPITAL PROPIO ESTIMADO */}
                <div className={`rounded-xl border p-4 flex flex-col justify-between shadow-md transition-all ${
                    valuationScenario === 'costo'
                        ? 'border-blue-500/40 bg-gradient-to-b from-blue-950/40 to-crm-surface'
                        : 'border-purple-500/40 bg-gradient-to-b from-purple-950/40 to-crm-surface'
                }`}>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center justify-center h-5 w-5 rounded-md font-bold text-xs ${
                                valuationScenario === 'costo' 
                                    ? 'bg-blue-500/20 text-blue-300' 
                                    : 'bg-purple-500/20 text-purple-300'
                            }`}>
                                =
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-white/10 text-white">
                                {valuationScenario === 'costo' ? 'Base Costo' : 'Comercial'}
                            </span>
                        </div>
                        <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                            Capital propio estimado
                        </div>
                        <div className="text-xl md:text-2xl font-black text-white tracking-tight">
                            {formatARS(capitalTotalCalculado)}
                        </div>
                        <p className="text-[11px] text-crm-fg-muted line-clamp-2">
                            {valuationScenario === 'costo'
                                ? 'Patrimonio neto propio basado en costo estricto.'
                                : 'Valor comercial si se realiza todo a precio publicado.'}
                        </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-crm-border/60 text-[10px] text-crm-fg-subtle flex justify-between">
                        <span>Corte: {new Date(summary.cutoffDate).toLocaleDateString('es-AR')}</span>
                        <span className="text-emerald-400 font-semibold">Conciliado</span>
                    </div>
                </div>
            </div>

            {/* Comparativa Explícita de Escenarios */}
            <div className="rounded-xl border border-crm-border bg-crm-surface/60 p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                <div className="space-y-1 flex-1">
                    <span className="font-bold text-white text-[11px] uppercase tracking-wider">
                        Separación metodológica de valuaciones:
                    </span>
                    <p className="text-crm-fg-muted leading-relaxed">
                        • <strong>Capital propio a costo ({formatARS(totales.capitalPropioCosto)}):</strong> Valuación conservadora obligatoria. No anticipa ganancias no realizadas.
                        <br />
                        • <strong>Escenario a precios publicados ({formatARS(totales.capitalPropioPublicado)}):</strong> Estimación comercial de vidriera. La diferencia de <strong>+{formatARS(totales.margenComercialPotencial)}</strong> representa margen potencial sujeto a negociación y costos de venta; <em>no constituye ganancia cobrada ni dinero en caja</em>.
                    </p>
                </div>
            </div>

            {/* Modales Interactivos */}
            {selectedComponentKey && (
                <CapitalBreakdownModal
                    isOpen={Boolean(selectedComponentKey)}
                    onClose={() => setSelectedComponentKey(null)}
                    componentKey={selectedComponentKey}
                    componentData={componentes[selectedComponentKey]}
                    totals={totales}
                />
            )}

            {isAuditModalOpen && (
                <StockAuditTableModal
                    isOpen={isAuditModalOpen}
                    onClose={() => setIsAuditModalOpen(false)}
                    capitalSummary={summary}
                />
            )}

            {isContrastModalOpen && (
                <ContrastCasesModal
                    isOpen={isContrastModalOpen}
                    onClose={() => setIsContrastModalOpen(false)}
                />
            )}
        </section>
    );
}
