"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GitBranch, Link2, Unlink, ArrowRight, AlertTriangle, CheckCircle2, Clock, DollarSign, Info, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { parseArgentineMoney } from '../../../utils/saleCommercial';

const formatCurrency = (amount, currency = 'ARS') => {
    const num = Number(amount) || 0;
    const prefix = currency === 'USD' ? 'USD ' : '$ ';
    return `${prefix}${num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const renderCurrencyBag = (bag, emptyText = '—') => {
    const entries = Object.entries(bag || {}).filter(([, val]) => Number(val) !== 0);
    if (entries.length === 0) return <span className="text-neutral-500">{emptyText}</span>;
    return (
        <div className="flex flex-wrap gap-2">
            {entries.map(([cur, val]) => (
                <span key={cur} className="font-bold text-white">
                    {formatCurrency(val, cur)}
                </span>
            ))}
        </div>
    );
};

export default function TradeInChainPanel({ carId, saleId, onUpdated }) {
    const [chain, setChain] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exchangeRateInput, setExchangeRateInput] = useState('');
    const [appliedExchangeRate, setAppliedExchangeRate] = useState('');

    // Modal state for manual link / unlink of historical vehicles
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [availableSales, setAvailableSales] = useState([]);
    const [loadingSales, setLoadingSales] = useState(false);
    const [linkForm, setLinkForm] = useState({
        saleId: '',
        tradeInId: '',
        value: '',
        currency: 'ARS',
        confirm: false
    });
    const [isSubmittingLink, setIsSubmittingLink] = useState(false);
    const [linkError, setLinkError] = useState(null);

    const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
    const [unlinkReason, setUnlinkReason] = useState('');
    const [isSubmittingUnlink, setIsSubmittingUnlink] = useState(false);

    const getBaseUrl = () => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL;
        return process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
    };

    const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

    const fetchChain = useCallback(async (rateToUse = appliedExchangeRate) => {
        if (!carId && !saleId) return;
        setLoading(true);
        setError(null);
        try {
            const baseUrl = getBaseUrl();
            const token = getToken();
            const qs = rateToUse && Number(rateToUse) > 0 ? `?exchangeRate=${encodeURIComponent(rateToUse)}` : '';
            const endpoint = carId
                ? `${baseUrl}/api/admin/cars/${carId}/trade-in-chain${qs}`
                : `${baseUrl}/api/admin/sales/${saleId}/trade-in-chain${qs}`;

            const res = await fetch(endpoint, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || 'No se pudo cargar el historial de permutas.');
            }
            setChain(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [carId, saleId, appliedExchangeRate]);

    useEffect(() => {
        fetchChain();
        const handleVehicleUpdated = () => {
            fetchChain();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('vehicle-updated', handleVehicleUpdated);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('vehicle-updated', handleVehicleUpdated);
            }
        };
    }, [fetchChain]);

    const openLinkModal = async () => {
        setLinkError(null);
        setLinkForm({ saleId: '', tradeInId: '', value: '', currency: 'ARS', confirm: false });
        setIsLinkModalOpen(true);
        setLoadingSales(true);
        try {
            const baseUrl = getBaseUrl();
            const token = getToken();
            const res = await fetch(`${baseUrl}/api/admin/sales`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = await res.json().catch(() => []);
            const list = Array.isArray(data) ? data : (data.sales || []);
            const targetCarId = carId || chain?.requestedCarId;
            setAvailableSales(
                list.filter(s => s.status !== 'cancelada' && s.vehicleId && String(s.vehicleId?._id || s.vehicleId) !== String(targetCarId))
            );
        } catch (_) {
            setAvailableSales([]);
        } finally {
            setLoadingSales(false);
        }
    };

    const handleSelectOriginSale = (selectedSaleId) => {
        const sale = availableSales.find(s => String(s._id) === String(selectedSaleId));
        const unlinked = (sale?.tradeIns || []).filter(t => !t.linkedStockCarId);
        if (unlinked.length === 1) {
            const item = unlinked[0];
            setLinkForm(prev => ({
                ...prev,
                saleId: selectedSaleId,
                tradeInId: item._id || '',
                value: item.estimatedValue ?? prev.value,
                currency: item.currency === 'USD' ? 'USD' : 'ARS'
            }));
        } else {
            setLinkForm(prev => ({
                ...prev,
                saleId: selectedSaleId,
                tradeInId: '',
                currency: sale?.saleCurrency === 'USD' ? 'USD' : 'ARS'
            }));
        }
    };

    const handleSubmitLink = async (e) => {
        e.preventDefault();
        setLinkError(null);
        const targetCarId = carId || chain?.requestedCarId;
        if (!targetCarId) return;

        if (!linkForm.saleId) {
            setLinkError('Seleccioná la venta de origen.');
            return;
        }
        const parsedVal = parseArgentineMoney(linkForm.value);
        if (Number.isNaN(parsedVal) || parsedVal < 0) {
            setLinkError('Ingresá un valor de toma válido (número positivo).');
            return;
        }
        if (!linkForm.confirm) {
            setLinkError('Confirmá la vinculación antes de guardar.');
            return;
        }

        setIsSubmittingLink(true);
        try {
            const baseUrl = getBaseUrl();
            const token = getToken();
            const res = await fetch(`${baseUrl}/api/admin/cars/${targetCarId}/link-trade-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    saleId: linkForm.saleId,
                    tradeInId: linkForm.tradeInId || undefined,
                    value: parsedVal,
                    currency: linkForm.currency,
                    confirm: true
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || 'No se pudo vincular el vehículo.');
            }
            toast.success('Vehículo vinculado a la venta de origen');
            setIsLinkModalOpen(false);
            await fetchChain();
            if (onUpdated) onUpdated();
        } catch (err) {
            setLinkError(err.message);
        } finally {
            setIsSubmittingLink(false);
        }
    };

    const handleSubmitUnlink = async (e) => {
        e.preventDefault();
        const targetCarId = carId || chain?.requestedCarId;
        if (!targetCarId) return;
        if (!unlinkReason || unlinkReason.trim().length < 5) {
            toast.error('Indicá el motivo de desvinculación (mínimo 5 caracteres).');
            return;
        }

        setIsSubmittingUnlink(true);
        try {
            const baseUrl = getBaseUrl();
            const token = getToken();
            const res = await fetch(`${baseUrl}/api/admin/cars/${targetCarId}/unlink-trade-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    confirm: true,
                    reason: unlinkReason.trim()
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || 'No se pudo desvincular el vehículo.');
            }
            toast.success('Vínculo de permuta eliminado');
            setIsUnlinkModalOpen(false);
            setUnlinkReason('');
            await fetchChain();
            if (onUpdated) onUpdated();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsSubmittingUnlink(false);
        }
    };

    const nodes = chain?.nodes || [];
    const totals = chain?.totals || {};
    const targetCarId = carId || chain?.requestedCarId;
    const currentNode = nodes.find(n => String(n.carId) === String(targetCarId));
    const hasOriginLink = Boolean(currentNode?.originSaleId);
    const hasReceivables = Object.values(totals.receivableByCurrency || {}).some(v => Number(v) > 0);
    const unsoldNodes = nodes.filter(n => n.inStock);

    return (
        <div className="bg-crm-surface border border-crm-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-crm-border flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <GitBranch size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                            Historial de permutas y rentabilidad
                        </h3>
                        <p className="text-[11px] text-neutral-400">
                            Trazabilidad desde el vehículo de origen, ventas concretadas, cobros reales y unidades en stock
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {targetCarId && !hasOriginLink && (
                        <button
                            type="button"
                            onClick={openLinkModal}
                            className="text-xs bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                        >
                            <Link2 size={13} />
                            Vincular a venta de origen
                        </button>
                    )}
                    {targetCarId && hasOriginLink && (
                        <button
                            type="button"
                            onClick={() => setIsUnlinkModalOpen(true)}
                            className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                        >
                            <Unlink size={13} />
                            Desvincular origen
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => fetchChain()}
                        className="p-1.5 text-neutral-400 hover:text-white rounded-lg border border-crm-border hover:bg-crm-surface-raised transition-colors"
                        title="Actualizar cadena"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="p-5 space-y-5">
                {loading && !chain ? (
                    <div className="text-xs text-neutral-400 py-6 text-center">Calculando trazabilidad de permutas...</div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
                        <AlertTriangle size={14} />
                        <span>{error}</span>
                    </div>
                ) : nodes.length === 0 ? (
                    <div className="text-xs text-neutral-400 py-4">Sin vehículos vinculados para analizar.</div>
                ) : (
                    <>
                        {/* Resumen acumulado de la cadena */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            <div className="bg-black/30 border border-crm-border rounded-xl p-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                                    Ganancia acumulada (ventas concretadas)
                                </span>
                                {renderCurrencyBag(totals.netProfitByCurrency, '$ 0')}
                                {Object.entries(totals.agencyNetProfitByCurrency || {}).some(([c, v]) => v !== (totals.netProfitByCurrency?.[c] || 0)) && (
                                    <p className="text-[10px] text-neutral-400 mt-1">
                                        Agencia: {Object.entries(totals.agencyNetProfitByCurrency || {}).map(([c, v]) => formatCurrency(v, c)).join(' · ')}
                                    </p>
                                )}
                            </div>

                            <div className="bg-black/30 border border-crm-border rounded-xl p-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-1">
                                    Dinero efectivamente cobrado
                                </span>
                                {renderCurrencyBag(totals.cashCollectedByCurrency, '$ 0')}
                                <p className="text-[10px] text-neutral-500 mt-1">No incluye valores de permutas recibidas</p>
                            </div>

                            <div className="bg-black/30 border border-crm-border rounded-xl p-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                                    Saldos por cobrar (cuotas)
                                </span>
                                {renderCurrencyBag(totals.receivableByCurrency, '$ 0')}
                                {hasReceivables && (
                                    <p className="text-[10px] text-amber-300 mt-1">
                                        Hay cuotas pendientes: la ganancia devengada no equivale a caja cobrada.
                                    </p>
                                )}
                            </div>

                            <div className="bg-black/30 border border-crm-border rounded-xl p-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                                    Vehículos aún en stock (costo)
                                </span>
                                {renderCurrencyBag(totals.stockCostByCurrency, 'Sin unidades en stock')}
                                <p className="text-[10px] text-neutral-400 mt-1">
                                    {unsoldNodes.length} {unsoldNodes.length === 1 ? 'unidad en stock' : 'unidades en stock'}
                                </p>
                            </div>

                            <div className="bg-black/30 border border-crm-border rounded-xl p-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                                    Margen estimado (sin vender)
                                </span>
                                {renderCurrencyBag(totals.estimatedMarginByCurrency, '—')}
                                <p className="text-[10px] text-neutral-500 mt-1">Separado de las ventas concretadas</p>
                            </div>
                        </div>

                        {/* Cotización referencial opcional cuando hay múltiples monedas */}
                        <div className="bg-black/20 border border-crm-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="text-[11px] text-neutral-300 flex items-center gap-2">
                                <Info size={14} className="text-purple-400 shrink-0" />
                                <span>{chain?.notes?.currencyCriterion}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="Cotización USD/ARS (opcional)"
                                    value={exchangeRateInput}
                                    onChange={(e) => setExchangeRateInput(e.target.value)}
                                    className="bg-crm-bg border border-crm-border rounded-lg px-2.5 py-1 text-xs text-white w-48 focus:outline-none focus:border-purple-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAppliedExchangeRate(exchangeRateInput);
                                        fetchChain(exchangeRateInput);
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-crm-surface-raised hover:bg-neutral-700 text-white border border-crm-border"
                                >
                                    Aplicar cotización
                                </button>
                            </div>
                        </div>

                        {totals.referenceConverted && (
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-xs text-purple-200 flex flex-wrap items-center justify-between gap-2">
                                <span>{totals.referenceConverted.criterion}</span>
                                <span className="font-bold">
                                    Equivalente ref.: {formatCurrency(totals.referenceConverted.equivalentInARS, 'ARS')} / {formatCurrency(totals.referenceConverted.equivalentInUSD, 'USD')}
                                </span>
                            </div>
                        )}

                        {/* Lista paso a paso de eslabones de la cadena */}
                        <div className="space-y-3">
                            {nodes.map((node, index) => {
                                const isCurrent = String(node.carId) === String(targetCarId);
                                const carExpEntries = Object.entries(node.carExpenses || {});
                                const saleExpEntries = Object.entries(node.sale?.saleExpenses || {});

                                return (
                                    <div
                                        key={node.carId}
                                        className={`rounded-xl border p-4 transition-colors ${
                                            isCurrent
                                                ? 'border-purple-500/50 bg-purple-500/5'
                                                : 'border-crm-border bg-black/25'
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                    node.role === 'origin'
                                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                }`}>
                                                    {node.role === 'origin' ? 'Vehículo de origen' : `Permuta recibida #${index}`}
                                                </span>
                                                <Link
                                                    href={`/admin/stock/${node.carId}`}
                                                    className="text-sm font-bold text-white hover:text-purple-300 transition-colors"
                                                >
                                                    {node.label}
                                                </Link>
                                                {node.plate && (
                                                    <span className="text-xs text-neutral-400 font-mono bg-neutral-800 px-2 py-0.5 rounded">
                                                        {node.plate}
                                                    </span>
                                                )}
                                                {node.investorPercentage > 0 && (
                                                    <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                                        Compartido: Agencia {node.agencySharePercentage}% / Socio {node.investorPercentage}%
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {node.sale ? (
                                                    <Link
                                                        href={`/admin/ventas/${node.sale.saleId}`}
                                                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                                                    >
                                                        <CheckCircle2 size={13} />
                                                        Venta {node.sale.status} ({node.sale.date ? new Date(node.sale.date).toLocaleDateString('es-AR') : 'S/F'})
                                                        <ArrowRight size={12} />
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs text-amber-300 flex items-center gap-1 font-medium">
                                                        <Clock size={13} />
                                                        En stock (sin vender)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                                            <div>
                                                <span className="text-[10px] text-neutral-400 uppercase block">
                                                    {node.cost.source === 'valor_de_toma' ? 'Valor de toma acordado' : 'Valor de compra'}
                                                </span>
                                                {node.cost.restricted ? (
                                                    <span className="font-bold text-neutral-500">Restringido</span>
                                                ) : node.cost.hasCost !== false && node.cost.amount !== null && node.cost.amount > 0 ? (
                                                    <span className="font-bold text-white">
                                                        {formatCurrency(node.cost.amount, node.cost.currency)}
                                                    </span>
                                                ) : (
                                                    <span className="font-bold text-amber-300">
                                                        Falta costo de compra/toma
                                                    </span>
                                                )}
                                                {node.cost.mismatch && (
                                                    <span className="text-[10px] text-amber-400 block">
                                                        (Difiere de precio compra cargado)
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                <span className="text-[10px] text-neutral-400 uppercase block">
                                                    Gastos y comisión
                                                </span>
                                                <span className="text-neutral-200 font-medium block">
                                                    {carExpEntries.length === 0 && saleExpEntries.length === 0 && !(node.sale?.commission?.amount > 0)
                                                        ? '$ 0'
                                                        : [
                                                            ...carExpEntries.map(([c, v]) => `Veh: ${formatCurrency(v, c)}`),
                                                            ...saleExpEntries.map(([c, v]) => `Op: ${formatCurrency(v, c)}`),
                                                            ...(node.sale?.commission?.amount > 0
                                                                ? [`Com: ${formatCurrency(node.sale.commission.amount, node.sale.commission.currency)}`]
                                                                : [])
                                                        ].join(' + ')}
                                                </span>
                                            </div>

                                            {node.sale ? (
                                                <>
                                                    <div>
                                                        <span className="text-[10px] text-neutral-400 uppercase block">Precio de venta</span>
                                                        <span className="font-bold text-white">
                                                            {formatCurrency(node.sale.price, node.sale.currency)}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <span className="text-[10px] text-neutral-400 uppercase block">Permutas recibidas</span>
                                                        {renderCurrencyBag(node.sale.tradeInValueReceived, 'Ninguna')}
                                                    </div>

                                                    <div>
                                                        <span className="text-[10px] text-neutral-400 uppercase block">Cobrado / Por cobrar</span>
                                                        <div className="text-blue-300 font-medium">
                                                            Cobrado: {Object.entries(node.sale.cashCollected || {}).length
                                                                ? Object.entries(node.sale.cashCollected).map(([c, v]) => formatCurrency(v, c)).join(' · ')
                                                                : '$ 0'}
                                                        </div>
                                                        {Object.entries(node.sale.receivable || {}).some(([, v]) => v > 0) && (
                                                            <div className="text-amber-300 text-[11px]">
                                                                Pendiente: {Object.entries(node.sale.receivable).map(([c, v]) => formatCurrency(v, c)).join(' · ')}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <span className="text-[10px] text-neutral-400 uppercase block">Ganancia neta individual</span>
                                                        {node.cost.restricted ? (
                                                            <span className="text-[11px] text-neutral-500">Restringido</span>
                                                        ) : node.netProfit !== null ? (
                                                            <div>
                                                                <span className={`font-bold ${node.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                    {formatCurrency(node.netProfit, node.sale.currency)}
                                                                </span>
                                                                {node.investorPercentage > 0 && (
                                                                    <span className="block text-[10px] text-neutral-400">
                                                                        Agencia ({node.agencySharePercentage}%): {formatCurrency(node.agencyNetProfit, node.sale.currency)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : node.convertedWithRate ? (
                                                            <div>
                                                                <span className="font-bold text-purple-300">
                                                                    {formatCurrency(node.convertedWithRate.netProfit, node.convertedWithRate.currency)}
                                                                </span>
                                                                <span className="block text-[10px] text-neutral-400">
                                                                    {node.convertedWithRate.criterion}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-bold text-amber-300">
                                                                    {node.concretized ? 'Ganancia no calculable' : 'Venta en borrador'}
                                                                </span>
                                                                {node.concretized && Array.isArray(node.missingReasons) && node.missingReasons.length > 0 && (
                                                                    <span className="text-[10px] text-amber-200/80 leading-tight mt-0.5">
                                                                        {node.missingReasons.join(' ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div>
                                                        <span className="text-[10px] text-neutral-400 uppercase block">Precio publicado</span>
                                                        <span className="font-bold text-neutral-200">
                                                            {formatCurrency(node.inStock?.askingPrice || 0, node.inStock?.askingCurrency || 'ARS')}
                                                        </span>
                                                    </div>
                                                    <div className="lg:col-span-3">
                                                        <span className="text-[10px] text-neutral-400 uppercase block">Margen estimado (no concretado)</span>
                                                        <span className="font-bold text-amber-300">
                                                            {node.inStock?.restricted
                                                                ? 'Restringido'
                                                                : node.inStock?.costMissing
                                                                    ? 'Ganancia no calculable (falta costo de compra/toma)'
                                                                    : node.inStock?.estimatedMargin !== null
                                                                        ? formatCurrency(node.inStock.estimatedMargin, node.inStock.costCurrency)
                                                                        : 'Moneda de costo y publicación distintas'}
                                                        </span>
                                                        <span className="block text-[10px] text-neutral-500">
                                                            No se suma a la ganancia acumulada hasta concretar su venta.
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Modal para vincular vehículo histórico a una venta de origen */}
            {isLinkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl">
                        <h4 className="text-base font-bold text-white mb-1">Vincular vehículo recibido en parte de pago</h4>
                        <p className="text-xs text-neutral-400 mb-4">
                            Seleccioná la venta en la que ingresó este vehículo y confirmá su valor de toma acordado.
                        </p>

                        {linkError && (
                            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
                                <AlertTriangle size={14} />
                                <span>{linkError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmitLink} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-neutral-300 uppercase mb-1">
                                    Venta de origen *
                                </label>
                                <select
                                    value={linkForm.saleId}
                                    onChange={(e) => handleSelectOriginSale(e.target.value)}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                    required
                                >
                                    <option value="">{loadingSales ? 'Cargando ventas...' : '— Seleccionar venta —'}</option>
                                    {availableSales.map(s => {
                                        const veh = s.vehicleId ? `${s.vehicleId.brand || ''} ${s.vehicleId.name || ''}`.trim() : 'Sin vehículo';
                                        const cli = s.clientId?.fullName || s.buyerName || 'Sin cliente';
                                        const dt = s.saleDate ? new Date(s.saleDate).toLocaleDateString('es-AR') : '';
                                        return (
                                            <option key={s._id} value={s._id}>
                                                {veh} — {cli} ({dt}) [{formatCurrency(s.salePrice, s.saleCurrency)}]
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {(() => {
                                const selSale = availableSales.find(s => String(s._id) === String(linkForm.saleId));
                                const unlinked = (selSale?.tradeIns || []).filter(t => !t.linkedStockCarId);
                                if (unlinked.length === 0) return null;
                                return (
                                    <div>
                                        <label className="block text-[11px] font-bold text-neutral-300 uppercase mb-1">
                                            Permuta declarada en esa venta (opcional)
                                        </label>
                                        <select
                                            value={linkForm.tradeInId}
                                            onChange={(e) => {
                                                const itemId = e.target.value;
                                                const item = unlinked.find(u => String(u._id) === String(itemId));
                                                setLinkForm(prev => ({
                                                    ...prev,
                                                    tradeInId: itemId,
                                                    value: item ? item.estimatedValue : prev.value,
                                                    currency: item ? (item.currency === 'USD' ? 'USD' : 'ARS') : prev.currency
                                                }));
                                            }}
                                            className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                        >
                                            <option value="">— Vincular sin ítem específico —</option>
                                            {unlinked.map(item => (
                                                <option key={item._id} value={item._id}>
                                                    {item.brand} {item.model} ({item.year}) — {formatCurrency(item.estimatedValue, item.currency)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            })()}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-neutral-300 uppercase mb-1">
                                        Valor de toma acordado *
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={linkForm.value}
                                        onChange={(e) => setLinkForm(prev => ({ ...prev, value: e.target.value }))}
                                        placeholder="0"
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-neutral-300 uppercase mb-1">
                                        Moneda *
                                    </label>
                                    <select
                                        value={linkForm.currency}
                                        onChange={(e) => setLinkForm(prev => ({ ...prev, currency: e.target.value }))}
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                    >
                                        <option value="ARS">ARS</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                            </div>

                            <label className="flex items-start gap-2.5 cursor-pointer bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                                <input
                                    type="checkbox"
                                    checked={linkForm.confirm}
                                    onChange={(e) => setLinkForm(prev => ({ ...prev, confirm: e.target.checked }))}
                                    className="mt-0.5"
                                />
                                <span className="text-xs text-purple-200">
                                    Confirmo que este vehículo ingresó como parte de pago de la venta seleccionada por el valor de toma indicado.
                                </span>
                            </label>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsLinkModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-xs font-bold text-neutral-300 bg-neutral-800 hover:bg-neutral-700"
                                    disabled={isSubmittingLink}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingLink}
                                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
                                >
                                    {isSubmittingLink ? 'Vinculando...' : 'Confirmar vínculo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para desvincular */}
            {isUnlinkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl">
                        <h4 className="text-base font-bold text-white mb-1">Desvincular venta de origen</h4>
                        <p className="text-xs text-neutral-400 mb-4">
                            Se quitará el vínculo de permuta de este vehículo quedando registro en la auditoría.
                        </p>
                        <form onSubmit={handleSubmitUnlink} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-neutral-300 uppercase mb-1">
                                    Motivo de desvinculación *
                                </label>
                                <textarea
                                    value={unlinkReason}
                                    onChange={(e) => setUnlinkReason(e.target.value)}
                                    placeholder="Indicá el motivo (mínimo 5 caracteres)..."
                                    className="w-full min-h-[80px] bg-crm-bg border border-crm-border rounded-lg p-3 text-xs text-white focus:border-crm-red focus:outline-none"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsUnlinkModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-xs font-bold text-neutral-300 bg-neutral-800 hover:bg-neutral-700"
                                    disabled={isSubmittingUnlink}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingUnlink}
                                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-crm-red hover:bg-crm-red-hover disabled:opacity-50"
                                >
                                    {isSubmittingUnlink ? 'Desvinculando...' : 'Confirmar desvinculación'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
