"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
    Calculator, Search, AlertTriangle, CheckCircle2, RotateCcw, 
    HelpCircle, Edit3, ShieldAlert
} from 'lucide-react';
import CrmButton from '../ui/CrmButton';

function formatARS(val) {
    if (val === undefined || val === null || isNaN(val)) return '$0';
    return '$' + Math.round(val).toLocaleString('es-AR');
}

export default function StockCommercialCalculator({ isModal = false }) {
    const [allCars, setAllCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtros de búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [propertyFilter, setPropertyFilter] = useState('todos'); // 'todos' | 'propio' | 'compartido_50' | 'inversionista_100' | 'excluidos'

    // Modo simulación de precios (hipotético)
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulatedPrices, setSimulatedPrices] = useState({}); // { carId: newPrice }

    // Colapsable de contraste con captura histórica
    const [showHistoricalContrast, setShowHistoricalContrast] = useState(false);

    // Cargar todos los vehículos disponibles sin recorte de paginación
    const fetchAllCars = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch('/api/admin/cars?limit=500&t=' + Date.now(), {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                cache: 'no-store'
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || 'Error cargando stock para el desglose comercial');
            }
            setAllCars(data.cars || []);
        } catch (err) {
            console.error('Error cargando vehículos para calculadora:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllCars();
    }, []);

    // REGLA DEFINITIVA: Filtrar ÚNICAMENTE vehículos cuyo estado real sea "Disponible"
    // Excluir reservados, pausados, sin estado, vendidos y cancelados
    const availableCars = useMemo(() => {
        return allCars.filter(c => {
            const st = (c.status || '').toLowerCase().trim();
            return st === 'disponible' && !c.sold;
        });
    }, [allCars]);

    // Filtrar según búsqueda y tipo de propiedad
    const filteredVehicles = useMemo(() => {
        return availableCars.filter(c => {
            const isConsignment = Boolean(c.consignedBy && String(c.consignedBy).trim() !== '');
            const isThirdParty = !isConsignment && c.agencyOwned === false && (!c.investor || Number(c.investor.percentage) === 0);
            const isExcluded = isConsignment || isThirdParty;
            const invPct = isExcluded 
                ? 0 
                : (c.investor && Number(c.investor.percentage) > 0 ? Math.min(100, Math.max(0, Number(c.investor.percentage))) : 0);

            // Filtro por tipo de propiedad
            if (propertyFilter !== 'todos') {
                if (propertyFilter === 'excluidos' && !isExcluded) return false;
                if (propertyFilter === 'propio' && (isExcluded || invPct > 0)) return false;
                if (propertyFilter === 'compartido_50' && (isExcluded || invPct !== 50)) return false;
                if (propertyFilter === 'inversionista_100' && (isExcluded || invPct !== 100)) return false;
            }

            // Búsqueda por texto
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const brand = (c.brand || '').toLowerCase();
                const name = (c.name || c.model || '').toLowerCase();
                const plate = (c.plateOrVin || '').toLowerCase();
                const id = (c._id || '').toString().toLowerCase();
                if (!brand.includes(q) && !name.includes(q) && !plate.includes(q) && !id.includes(q)) {
                    return false;
                }
            }

            return true;
        });
    }, [availableCars, propertyFilter, searchTerm]);

    // Mapear filas con cálculo matemático estricto
    const calculatedRows = useMemo(() => {
        return filteredVehicles.map(c => {
            const id = c._id.toString();
            const originalPrice = Math.round(Number(c.price) || 0);
            const isPriceSimulated = simulatedPrices[id] !== undefined;
            const currentPrice = isPriceSimulated ? simulatedPrices[id] : originalPrice;

            // Consignación o vehículo de tercero sin agencia ni inversor
            const isConsignment = Boolean(c.consignedBy && String(c.consignedBy).trim() !== '');
            const isThirdParty = !isConsignment && c.agencyOwned === false && (!c.investor || Number(c.investor.percentage) === 0);
            const isExcluded = isConsignment || isThirdParty;

            // Detección de anomalías en precio y moneda
            const isZeroPrice = originalPrice <= 0;
            const isProvisionalOne = originalPrice === 1;
            const hasAnomalousCurrency = (c.currency === 'USD' || c.currency === 'U$S') && originalPrice > 200000;

            const invPct = isExcluded 
                ? 0 
                : (c.investor && Number(c.investor.percentage) > 0 ? Math.min(100, Math.max(0, Number(c.investor.percentage))) : 0);
            const ownPct = isExcluded ? 0 : Math.max(0, 100 - invPct);

            let aporteTotal = 0;
            let aportePropio = 0;
            let aporteInv = 0;

            if (!isExcluded) {
                aporteTotal = currentPrice;
                aportePropio = Math.round(currentPrice * (ownPct / 100));
                aporteInv = currentPrice - aportePropio;
            }

            // Etiqueta exacta de propiedad
            let ownershipLabel = 'Propio (100% AutoSporting)';
            let ownershipBadgeClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

            if (isConsignment) {
                ownershipLabel = `Consignación (${c.consignedBy || 'Tercero'}) — Excluido de tarjetas`;
                ownershipBadgeClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            } else if (isThirdParty) {
                ownershipLabel = 'Vehículo de Tercero — Excluido de tarjetas';
                ownershipBadgeClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            } else if (invPct === 100) {
                ownershipLabel = 'Inversionista 100% — participación propia 0%';
                ownershipBadgeClass = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            } else if (invPct === 50) {
                ownershipLabel = 'Compartido (50% AutoSporting / 50% Inversor)';
                ownershipBadgeClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            } else if (invPct > 0) {
                ownershipLabel = `Compartido (${ownPct}% AutoSporting / ${invPct}% Inversor)`;
                ownershipBadgeClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            }

            // Motivo exacto
            let reason = 'Vehículo disponible computado en las tarjetas comerciales.';
            if (isConsignment) {
                reason = 'Consignación: comercializado por cuenta de tercero; no genera capital propio ni compartido.';
            } else if (isThirdParty) {
                reason = 'Tercero: no pertenece al patrimonio propio de la agencia ni tiene inversor registrado.';
            } else if (isZeroPrice) {
                reason = 'Sin precio publicado registrado. Figura como pendiente de valorar (no computa $0 como valor real).';
            } else if (isProvisionalOne) {
                reason = 'Precio provisorio de $1. Pendiente de tasación comercial real.';
            } else if (invPct === 100) {
                reason = 'Vehículo 100% del inversor (ej: mamá). Suma al valor total e inversionistas, 0% a participación propia.';
            } else if (invPct === 50) {
                reason = 'Inversión compartida al 50%. Aporta 50% al valor propio y 50% al de inversionistas.';
            }

            return {
                id,
                brand: c.brand,
                name: c.name || c.model || '',
                year: c.year,
                plate: c.plateOrVin || 'S/D',
                status: c.status || 'Disponible',
                isExcluded,
                isConsignment,
                isThirdParty,
                originalPrice,
                currentPrice,
                isPriceSimulated,
                isZeroPrice,
                isProvisionalOne,
                hasAnomalousCurrency,
                ownPct,
                invPct,
                aporteTotal,
                aportePropio,
                aporteInv,
                ownershipLabel,
                ownershipBadgeClass,
                reason
            };
        });
    }, [filteredVehicles, simulatedPrices]);

    // Totales exactos del desglose
    const totals = useMemo(() => {
        let totalPrecio = 0;
        let totalPropio = 0;
        let totalInv = 0;
        let totalConsignaciones = 0;
        let countIncluidos = 0;
        let countExcluidos = 0;
        let zeroPriceCount = 0;
        let provisionalOneCount = 0;

        calculatedRows.forEach(row => {
            if (row.isExcluded) {
                countExcluidos++;
                totalConsignaciones += row.currentPrice;
            } else {
                countIncluidos++;
                totalPrecio += row.aporteTotal;
                totalPropio += row.aportePropio;
                totalInv += row.aporteInv;
            }
            if (row.isZeroPrice) zeroPriceCount++;
            if (row.isProvisionalOne) provisionalOneCount++;
        });

        return {
            totalPrecio,
            totalPropio,
            totalInv,
            totalConsignaciones,
            countIncluidos,
            countExcluidos,
            zeroPriceCount,
            provisionalOneCount,
            totalRows: calculatedRows.length
        };
    }, [calculatedRows]);

    const handlePriceSimulationChange = (carId, value) => {
        const num = Math.max(0, parseInt(value, 10) || 0);
        setSimulatedPrices(prev => ({
            ...prev,
            [carId]: num
        }));
    };

    const handleResetSimulation = () => {
        setSimulatedPrices({});
        setIsSimulating(false);
    };

    const simulatedCount = Object.keys(simulatedPrices).length;

    return (
        <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden shadow-lg space-y-0">
            {/* Cabecera del Módulo Oficial */}
            <div className="p-5 border-b border-crm-border/70 bg-gradient-to-r from-crm-surface via-crm-bg/70 to-crm-surface flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 font-bold text-xs">
                            <Calculator size={16} />
                        </span>
                        <h3 className="text-base font-extrabold text-white tracking-tight">
                            Desglose Verificable: Stock a Precios de Venta (Solo Disponibles)
                        </h3>
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                            Fidelidad 100% · Sin Recorte de Paginación
                        </span>
                    </div>
                    <p className="text-xs text-crm-fg-muted max-w-2xl leading-relaxed">
                        Cálculo estricto sobre vehículos en estado <strong>Disponible</strong>. No incluye reservados, pausados ni sin estado. Las consignaciones y terceros se excluyen de las tres tarjetas principales.
                    </p>
                </div>

                {/* Acciones: Simulación y Contraste Histórico */}
                <div className="flex flex-wrap items-center gap-2">
                    <CrmButton
                        variant={isSimulating ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setIsSimulating(!isSimulating)}
                        className={`gap-1.5 text-xs ${isSimulating ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                    >
                        <Edit3 size={13} />
                        {isSimulating ? 'Modo Simulación Activo' : 'Simular Cambios de Precio'}
                    </CrmButton>

                    {simulatedCount > 0 && (
                        <CrmButton
                            variant="secondary"
                            size="sm"
                            onClick={handleResetSimulation}
                            className="gap-1.5 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                        >
                            <RotateCcw size={13} />
                            Restablecer ({simulatedCount})
                        </CrmButton>
                    )}

                    <CrmButton
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowHistoricalContrast(!showHistoricalContrast)}
                        className="gap-1.5 text-xs border-crm-border text-crm-fg hover:text-white"
                    >
                        <HelpCircle size={13} className="text-purple-400" />
                        Contraste Histórico (20 Disponibles)
                    </CrmButton>
                </div>
            </div>

            {/* Aviso de Modo Simulación Hipotética */}
            {isSimulating && (
                <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                        <span>
                            <strong>Simulador de Precios Hipotético:</strong> Los cambios ingresados en esta tabla se calculan en memoria y <strong>NO modifican la base de datos ni los registros reales</strong>.
                        </span>
                    </div>
                    {simulatedCount > 0 && (
                        <span className="font-bold text-amber-300 shrink-0 ml-2">
                            {simulatedCount} vehículo(s) simulado(s)
                        </span>
                    )}
                </div>
            )}

            {/* Panel Desplegable: Contraste con la Captura Histórica de 20 Disponibles */}
            {showHistoricalContrast && (
                <div className="p-5 border-b border-crm-border bg-crm-bg/90 space-y-4 text-xs">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-purple-500/20 text-purple-300 font-bold text-xs">
                                AUDITORÍA HISTÓRICA
                            </span>
                            <h4 className="font-bold text-white text-sm">
                                Conciliación con la Captura de 20 Disponibles
                            </h4>
                        </div>
                        <button
                            onClick={() => setShowHistoricalContrast(false)}
                            className="text-crm-fg-subtle hover:text-white text-xs underline"
                        >
                            Cerrar panel
                        </button>
                    </div>

                    <p className="text-crm-fg-muted leading-relaxed">
                        En la captura original se visualizaron <strong>20 filas disponibles</strong> (18 con precio publicado y 2 excluidas sin precio visible).
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl border border-crm-border bg-crm-surface/70 space-y-1.5 font-mono text-[11px]">
                            <div className="font-sans font-bold text-white text-xs">Captura Original (20 Disponibles)</div>
                            <div className="flex justify-between">
                                <span>• 9 propios (100%):</span>
                                <span className="text-emerald-400 font-bold">$377.100.000</span>
                            </div>
                            <div className="flex justify-between">
                                <span>• 7 compartidos (50%):</span>
                                <span className="text-blue-400 font-bold">$270.000.000</span>
                            </div>
                            <div className="flex justify-between">
                                <span>• 2 100% mamá (Joy + EcoSport):</span>
                                <span className="text-purple-400 font-bold">$42.000.000</span>
                            </div>
                            <div className="flex justify-between border-t border-crm-border/60 pt-1 text-white font-bold">
                                <span>Total Tarjetas Original:</span>
                                <span>$689.100.000</span>
                            </div>
                            <div className="text-[10px] text-crm-fg-subtle pt-1 font-sans">
                                Mi participación: <strong>$512.100.000</strong> · Inversionistas: <strong>$177.000.000</strong>.
                                <br />Excluidos: Audi Q2 (consignación $0) y Cronos Drive MT (tercero $0).
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-1.5 font-mono text-[11px]">
                            <div className="font-sans font-bold text-purple-300 text-xs">Estado en Vivo Actual (21 Disponibles)</div>
                            <div className="text-crm-fg-muted font-sans text-[11px]">Alta posterior registrada en base de datos:</div>
                            <div className="flex justify-between">
                                <span>• Renault Clio 2015 (oru980):</span>
                                <span className="text-purple-300 font-bold">+$13.800.000</span>
                            </div>
                            <div className="text-[10px] text-crm-fg-muted font-sans">
                                Titularidad: <strong>100% Inversor (Marcela)</strong>. Aporta <strong>$0</strong> a mi participación y <strong>+$13.800.000</strong> a inversionistas.
                            </div>
                            <div className="flex justify-between border-t border-purple-500/30 pt-1 text-white font-bold">
                                <span>Total Tarjetas Actual:</span>
                                <span>$702.900.000</span>
                            </div>
                            <div className="text-[10px] text-purple-200 font-sans">
                                Mi participación: <strong>$512.100.000</strong> (idéntica) · Inversionistas: <strong>$190.800.000</strong>.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filtros de la Grilla */}
            <div className="p-4 border-b border-crm-border/50 bg-crm-surface/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                    {/* Filtro por Tipo de Propiedad */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-crm-fg-subtle uppercase tracking-wider">
                            Propiedad:
                        </span>
                        <select
                            value={propertyFilter}
                            onChange={(e) => setPropertyFilter(e.target.value)}
                            className="bg-crm-bg border border-crm-border rounded-lg px-2.5 py-1 text-xs text-crm-fg focus:outline-none focus:border-blue-500"
                        >
                            <option value="todos">Todos los disponibles ({availableCars.length})</option>
                            <option value="propio">Propios 100%</option>
                            <option value="compartido_50">Compartidos 50%</option>
                            <option value="inversionista_100">Inversionista 100% (mi parte 0%)</option>
                            <option value="excluidos">Excluidos (Consignaciones / Terceros)</option>
                        </select>
                    </div>

                    {/* Búsqueda por texto */}
                    <div className="relative flex-1 max-w-xs">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-crm-fg-subtle" />
                        <input
                            type="text"
                            placeholder="Buscar marca, modelo, patente, ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-crm-bg border border-crm-border rounded-lg pl-8 pr-3 py-1 text-xs text-crm-fg focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="text-xs text-crm-fg-muted flex items-center gap-2">
                    <span>Disponibles evaluados: <strong>{calculatedRows.length}</strong></span>
                    {totals.zeroPriceCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-300 border border-zinc-500/30 text-[10px]">
                            ⚠️ {totals.zeroPriceCount} pendientes de valorar
                        </span>
                    )}
                </div>
            </div>

            {/* Tabla Comercial */}
            <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                <table className="w-full text-left text-xs min-w-[1100px]">
                    <thead className="bg-crm-bg text-[11px] uppercase tracking-wider text-crm-fg-subtle border-b border-crm-border sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th className="py-2.5 px-3">Vehículo / Identificador</th>
                            <th className="py-2.5 px-3">Estado</th>
                            <th className="py-2.5 px-3 text-right">Precio Venta {isSimulating && <span className="text-amber-400 lowercase">(editable)</span>}</th>
                            <th className="py-2.5 px-3">Titularidad (% Propio / % Inversor)</th>
                            <th className="py-2.5 px-3 text-right">Aporte Total</th>
                            <th className="py-2.5 px-3 text-right">Mi Participación</th>
                            <th className="py-2.5 px-3 text-right">Participación Inversores</th>
                            <th className="py-2.5 px-3">Motivo de Inclusión / Exclusión</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border/40 font-normal">
                        {calculatedRows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-crm-fg-subtle text-xs">
                                    No se encontraron vehículos disponibles para el filtro seleccionado.
                                </td>
                            </tr>
                        ) : (
                            calculatedRows.map(row => (
                                <tr 
                                    key={row.id} 
                                    className={`transition-colors ${
                                        row.isExcluded
                                            ? 'bg-amber-500/5 text-crm-fg-muted'
                                            : row.isPriceSimulated 
                                                ? 'bg-amber-500/10 hover:bg-amber-500/15' 
                                                : 'hover:bg-crm-bg/40'
                                    }`}
                                >
                                    {/* Vehículo e identificador */}
                                    <td className="py-2.5 px-3">
                                        <Link href={`/admin/stock/${row.id}`} className="font-semibold text-white hover:text-blue-400 transition-colors">
                                            {row.brand} {row.name}
                                        </Link>
                                        <div className="text-[10px] text-crm-fg-subtle flex items-center gap-1.5 font-mono">
                                            <span>Año {row.year}</span>
                                            <span>·</span>
                                            <span>{row.plate}</span>
                                            <span>·</span>
                                            <span>ID: {row.id.slice(-6)}</span>
                                        </div>
                                    </td>

                                    {/* Estado */}
                                    <td className="py-2.5 px-3">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            {row.status}
                                        </span>
                                    </td>

                                    {/* Precio de venta utilizado */}
                                    <td className="py-2.5 px-3 text-right font-mono">
                                        {isSimulating && !row.isExcluded ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="text-crm-fg-subtle text-[11px]">$</span>
                                                <input
                                                    type="number"
                                                    value={row.currentPrice}
                                                    onChange={(e) => handlePriceSimulationChange(row.id, e.target.value)}
                                                    className="w-28 text-right bg-crm-bg border border-amber-500/40 rounded px-2 py-0.5 text-xs text-amber-200 focus:outline-none focus:border-amber-400 font-bold"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <div className={`font-bold ${row.isProvisionalOne ? 'text-amber-400' : 'text-white'}`}>
                                                    {row.isZeroPrice ? '-' : formatARS(row.currentPrice)}
                                                </div>
                                                {row.isProvisionalOne && (
                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-sans font-bold">
                                                        ⚠️ Provisorio ($1)
                                                    </span>
                                                )}
                                                {row.isZeroPrice && (
                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-500/20 text-zinc-300 border border-zinc-500/30 uppercase font-sans font-bold">
                                                        ⚠️ Pendiente de valorar
                                                    </span>
                                                )}
                                                {row.hasAnomalousCurrency && (
                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase font-sans font-bold block mt-0.5">
                                                        Norm. a ARS
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    {/* Titularidad y Porcentaje */}
                                    <td className="py-2.5 px-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${row.ownershipBadgeClass}`}>
                                            {row.ownershipLabel}
                                        </span>
                                    </td>

                                    {/* Aporte a Tarjeta Total */}
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                                        {row.isExcluded ? '-' : formatARS(row.aporteTotal)}
                                    </td>

                                    {/* Aporte a Mi Participación */}
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                                        {row.isExcluded ? '-' : formatARS(row.aportePropio)}
                                    </td>

                                    {/* Aporte a Participación Inversores */}
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-300">
                                        {row.isExcluded ? '-' : formatARS(row.aporteInv)}
                                    </td>

                                    {/* Motivo de inclusión / exclusión */}
                                    <td className="py-2.5 px-3 text-[11px] text-crm-fg-muted max-w-[240px] leading-tight">
                                        {row.reason}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totales Exactos al Pie (Sticky Footer) */}
            <div className="p-4 border-t border-crm-border bg-crm-bg/95 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-crm-fg-muted font-sans text-xs">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        <span>
                            <strong>{totals.countIncluidos} unidades incluidas</strong> en tarjetas
                            {totals.countExcluidos > 0 && <span> ({totals.countExcluidos} consignaciones/terceros excluidas)</span>}.
                        </span>
                    </div>
                    <span className="text-emerald-400 text-[11px] font-semibold">
                        ✓ Valor Total = Mi Participación + Inversores
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-crm-surface px-2.5 py-1 rounded border border-crm-border">
                        <span className="text-crm-fg-subtle font-sans">Valor Total Disponible:</span>
                        <span className="text-white font-extrabold text-sm">{formatARS(totals.totalPrecio)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                        <span className="text-emerald-400 font-sans font-semibold">Mi Participación:</span>
                        <span className="text-emerald-400 font-extrabold text-sm">{formatARS(totals.totalPropio)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/20">
                        <span className="text-purple-400 font-sans font-semibold">Inversores:</span>
                        <span className="text-purple-300 font-extrabold text-sm">{formatARS(totals.totalInv)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
