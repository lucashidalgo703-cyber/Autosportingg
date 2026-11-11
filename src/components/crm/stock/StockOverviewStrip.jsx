"use client";
import { useEffect } from 'react';
import { useStockWorkbench } from '../../../hooks/useStockWorkbench';

export default function StockOverviewStrip() {
    const { data, error, loading, refresh } = useStockWorkbench('/api/admin/stock/overview');
    useEffect(() => { const update = () => refresh(); window.addEventListener('vehicle-updated', update); return () => window.removeEventListener('vehicle-updated', update); }, [refresh]);
    if (error) return <p role="status" className="m-0 text-xs text-crm-fg-muted">{error}<button type="button" onClick={refresh} className="ml-2 underline">Reintentar resumen</button></p>;
    return <section aria-label="Resumen global de unidades disponibles" className="rounded-xl border border-crm-border bg-crm-surface px-4 py-3"><dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-3 text-xs lg:grid-cols-5">{[['Disponibles', data?.available], ['Promedio de días', data?.averageDays == null ? '—' : Number(data.averageDays).toLocaleString('es-AR', { maximumFractionDigits: 1 })], ['Publicados en ML', data?.publishedPercent == null ? '—' : `${Number(data.publishedPercent).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`], ['A revisar', data?.reviewCount], ['Valor publicado', data ? ['ARS', 'USD'].map(currency => `${currency} ${Number(data.value?.[currency] || 0).toLocaleString('es-AR')}`).join(' · ') : '—']].map(([label, value]) => <div key={label}><dt className="text-[11px] text-crm-fg-muted">{label}</dt><dd className="m-0 mt-1 font-semibold text-crm-fg">{loading && !data ? '…' : value ?? '—'}</dd></div>)}</dl><p className="mb-0 mt-2 text-[10px] text-crm-fg-muted">Stock disponible global, incluidas consignaciones y participaciones. Valores separados por moneda.{data?.unknownCurrencyCount > 0 ? ` ${data.unknownCurrencyCount} unidades con moneda a revisar no se suman a ARS/USD.` : ''}</p></section>;
}
