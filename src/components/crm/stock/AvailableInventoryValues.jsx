"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

const currencies = ['ARS', 'USD'];
const modes = [['propio', 'Propio de AutoSporting'], ['compartido', 'Inversión compartida'], ['inversor', '100% del inversor'], ['consignacion', 'Terceros en consignación'], ['tercero', 'Otros terceros'], ['sin_definir', 'Titularidad pendiente']];
const money = (value, currency) => value === null || value === undefined || !Number.isFinite(Number(value)) ? 'Dato pendiente' : `${currency} ${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const titles = { cost: 'Capital invertido a costo', asking: 'Valor de venta publicado' };

function ValueBreakdown({ scope, metrics, currency, ownershipType, onClose }) {
    const closeRef = useRef(null);
    useEffect(() => {
        const previous = document.activeElement;
        closeRef.current?.focus();
        const onKey = event => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
    }, [onClose]);
    const rows = (metrics.breakdown?.[scope] || []).filter(row => (!ownershipType || row.ownershipType === ownershipType) && (!currency || row.currency === currency || !row.currency));
    const selected = ownershipType ? metrics.ownershipMetrics?.[ownershipType] || metrics : metrics;
    const knownTotal = scope === 'cost' ? selected.cost : selected.asking;
    const ownTotal = scope === 'cost' ? selected.ownCost : selected.ownAsking;
    const investorTotal = scope === 'cost' ? selected.investorCost : selected.investorAsking;
    const unallocatedTotal = scope === 'cost' ? selected.unallocatedCost : selected.unallocatedAsking;
    const subtotalKnown = selected.completeness?.[scope] === false || selected.completeness?.ownership === false;
    const totalRows = code => Number.isFinite(knownTotal?.[code]) && Number.isFinite(selected.thirdPartyCost?.[code]) ? knownTotal[code] + selected.thirdPartyCost[code] : null;
    return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-3" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
        <section role="dialog" aria-modal="true" aria-label={`Desglose: ${titles[scope]}`} className="flex max-h-[90dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-crm-border bg-crm-surface text-crm-fg">
            <div className="flex items-start justify-between gap-3 border-b border-crm-border p-4">
                <div><h2 className="text-lg font-bold">{titles[scope]} · Ver desglose</h2><p className="mt-1 text-xs text-crm-fg-muted">{selected.count} unidades disponibles · {currency || 'ARS y USD separados'}{ownershipType ? ` · ${modes.find(([key]) => key === ownershipType)?.[1]}` : ''} · importes del conjunto completo, antes de paginar.</p></div>
                <button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar desglose" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-crm-border text-crm-fg"><X size={18} /></button>
            </div>
            <div className="overflow-auto p-4">
                <div className="mb-4 flex flex-wrap gap-4 text-sm font-semibold">{currencies.filter(code => !currency || code === currency).map(code => <div key={code}><p>{scope === 'cost' ? 'Capital incluido' : 'Valor publicado'}{subtotalKnown ? ' · subtotal conocido' : ''}: {money(knownTotal?.[code], code)}</p><p className="mt-1 text-xs text-crm-fg">AutoSporting{subtotalKnown ? ' · subtotal conocido' : ''}: {money(ownTotal?.[code], code)} · Inversor{subtotalKnown ? ' · subtotal conocido' : ''}: {money(investorTotal?.[code], code)}</p><p className="mt-1 text-xs font-normal text-crm-fg-muted">Sin distribuir: {money(unallocatedTotal?.[code], code)}</p>{scope === 'cost' ? <p className="mt-1 text-xs font-normal text-amber-300">Costos de terceros excluidos: {money(selected.thirdPartyCost?.[code], code)}</p> : <p className="mt-1 text-xs font-normal text-crm-fg-muted">Terceros en consignación / otros: {money(selected.thirdPartyAsking?.[code], code)}</p>}</div>)}</div>
                <p className="mb-3 text-xs text-crm-fg-muted">Una fila por unidad y moneda: una unidad con costos en ARS y USD tiene dos filas y se cuenta una sola vez. La columna «Sin distribuir» identifica importes conocidos cuya participación falta verificar. Los datos pendientes no se reemplazan por cero. {scope === 'cost' && 'Las consignaciones y otros terceros se identifican aparte y quedan fuera del capital invertido.'}</p>
                <div className="overflow-x-auto rounded-xl border border-crm-border"><table className="w-full min-w-[1050px] text-left text-xs"><thead className="bg-crm-bg text-crm-fg-muted"><tr>{['Unidad / patente', 'Modalidad', 'Moneda', 'Importe total', 'AutoSporting', 'Inversor', 'Terceros', 'Sin distribuir', 'Datos pendientes'].map(label => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-crm-border">{rows.map(row => <tr key={row.key || `${row.vehicleId}-${row.currency || 'pending'}`} className="align-top">
                    <td className="px-3 py-3"><Link href={`/admin/stock/${row.vehicleId}`} className="font-semibold text-blue-400 underline">{row.title || row.model || 'Unidad'}</Link><p className="mt-1 font-mono text-crm-fg-muted">{row.plate || 'Sin patente'}</p></td>
                    <td className="px-3 py-3">{row.ownershipLabel}{row.excludedFromCapital && <p className="mt-1 text-amber-300">Fuera del capital invertido</p>}</td>
                    <td className="px-3 py-3">{row.currency || 'Moneda pendiente'}</td>
                    {['total', 'own', 'investor', 'thirdParty', 'unallocated'].map(key => <td key={key} className="whitespace-nowrap px-3 py-3 font-mono">{row.currency ? money(row[key], row.currency) : 'Dato pendiente'}</td>)}
                    <td className="max-w-60 px-3 py-3 text-amber-300">{row.allocationComplete === false && <p>Participaciones: subtotales conocidos</p>}{row.missingFields?.length ? row.missingFields.join(' · ') : <span className="text-crm-fg-muted">Completo</span>}</td>
                </tr>)}</tbody><tfoot className="border-t border-crm-border bg-crm-bg"><tr><td colSpan={9} className="px-3 py-3">{currencies.filter(code => !currency || code === currency).map(code => <div className="mb-2 mr-5 inline-block" key={code}><p className="font-semibold">{scope === 'cost' ? 'Subtotal de capital incluido' : 'Valor publicado total'} {subtotalKnown ? '· conocido ' : ''}{money(knownTotal?.[code], code)}</p><p className="mt-1">AutoSporting{subtotalKnown ? ' · subtotal conocido' : ''}: {money(ownTotal?.[code], code)} · Inversor{subtotalKnown ? ' · subtotal conocido' : ''}: {money(investorTotal?.[code], code)} · Sin distribuir: {money(unallocatedTotal?.[code], code)}</p>{scope === 'cost' ? <p className="mt-1 text-amber-300">Subtotal de terceros excluidos: {money(selected.thirdPartyCost?.[code], code)} · Total de las filas conocidas: {money(totalRows(code), code)}</p> : <p className="mt-1">Terceros en consignación / otros: {money(selected.thirdPartyAsking?.[code], code)}</p>}</div>)}</td></tr></tfoot></table></div>
                {!rows.length && <p className="py-4 text-sm text-crm-fg-muted">No hay importes registrados en esta moneda.</p>}
            </div>
        </section>
    </div>;
}

function MetricCard({ scope, metrics, onBreakdown, subtotal = false }) {
    const total = scope === 'cost' ? metrics.cost : metrics.asking;
    const own = scope === 'cost' ? metrics.ownCost : metrics.ownAsking;
    const investor = scope === 'cost' ? metrics.investorCost : metrics.investorAsking;
    const thirdParty = scope === 'cost' ? metrics.thirdPartyCost : metrics.thirdPartyAsking;
    const unallocated = scope === 'cost' ? metrics.unallocatedCost : metrics.unallocatedAsking;
    const incomplete = metrics.completeness?.[scope] === false || metrics.completeness?.ownership === false;
    const pending = (metrics.pending || []).filter(item => item.scope === scope || item.scope === 'ownership');
    const entries = [['Total', total], ['Mi parte · AutoSporting', own], ['Parte del inversor', investor], [scope === 'cost' ? 'Terceros · fuera del capital' : 'Terceros en consignación / otros', thirdParty], ['Participación por verificar', unallocated]];
    return <section aria-label={`${subtotal ? 'Subtotal del filtro: ' : ''}${titles[scope]}`} data-inventory-metric={scope} className="min-w-0 space-y-4 rounded-xl border border-crm-border bg-crm-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold text-crm-fg">{titles[scope]}</h2><p className="mt-1 text-xs text-crm-fg-muted">{subtotal ? 'Subtotal del filtro' : 'Inventario disponible'} · {metrics.count || 0} unidades{incomplete ? ' · Subtotal conocido' : ''}</p></div><button type="button" onClick={() => onBreakdown(scope)} aria-label={`Ver desglose de ${titles[scope].toLowerCase()}`} className="min-h-10 rounded-lg border border-crm-border px-3 text-xs font-semibold text-blue-400">Ver desglose</button></div>
        <div className="space-y-2">{entries.map(([label, values], index) => <div key={label} className={`grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] ${index === 0 ? 'rounded-lg bg-crm-bg p-3' : 'px-3 py-1'}`}><span className={`${index === 0 ? 'font-semibold text-crm-fg' : 'text-xs text-crm-fg-muted'}`}>{label}{index === 0 && scope === 'cost' && <span className="block text-[11px] font-normal text-crm-fg-muted">AutoSporting + inversores</span>}</span><span className="flex flex-wrap gap-x-3 sm:flex-col sm:items-end">{currencies.map(code => <button type="button" key={code} onClick={() => onBreakdown(scope, code)} aria-label={`Ver desglose de ${label.toLowerCase()} en ${code}: ${titles[scope].toLowerCase()}`} className={`min-h-8 text-left font-mono underline decoration-crm-border underline-offset-4 ${index === 0 ? 'text-sm font-bold text-crm-fg' : 'text-xs text-crm-fg'}`}>{money(values?.[code], code)}</button>)}</span></div>)}</div>
        <div className="border-t border-crm-border pt-3"><p className="mb-2 text-xs font-semibold text-crm-fg">Unidades por modalidad · cada vehículo se cuenta una vez</p><div className="space-y-2 text-xs text-crm-fg-muted">{modes.map(([key, label]) => {
            const group = metrics.ownershipMetrics?.[key];
            const count = metrics.countsByOwnership?.[key] ?? group?.count;
            return <details key={key} className="rounded-lg border border-crm-border px-3 py-2"><summary className="flex cursor-pointer items-center justify-between gap-2"><span>{label}</span><strong className="text-crm-fg">{count ?? 'Sin verificar'}</strong></summary><div className="mt-3 space-y-3">{currencies.map(code => <div key={code} className="space-y-1"><strong className="text-crm-fg">{code}{group?.completeness?.[scope] === false ? ' · subtotal conocido' : ''}</strong><p>Total: {money((scope === 'cost' ? group?.cost : group?.asking)?.[code], code)}</p><p>AutoSporting: {money((scope === 'cost' ? group?.ownCost : group?.ownAsking)?.[code], code)} · Inversor: {money((scope === 'cost' ? group?.investorCost : group?.investorAsking)?.[code], code)}</p>{['consignacion', 'tercero'].includes(key) && <p>Terceros {scope === 'cost' ? '(fuera del capital)' : ''}: {money((scope === 'cost' ? group?.thirdPartyCost : group?.thirdPartyAsking)?.[code], code)}</p>}</div>)}<button type="button" onClick={() => onBreakdown(scope, undefined, key)} className="min-h-10 text-blue-400 underline">Ver desglose de {label.toLowerCase()}</button></div></details>;
        })}</div></div>
        {pending.length > 0 && <details className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs"><summary className="cursor-pointer font-semibold text-amber-300">Ver unidades con datos pendientes ({new Set(pending.map(item => item.vehicleId)).size})</summary><ul className="mt-3 space-y-2">{pending.map((item, index) => <li key={`${item.vehicleId}-${item.field}-${index}`}><Link href={`/admin/stock/${item.vehicleId}`} className="text-blue-400 underline">{item.title || 'Unidad'} · {item.plate || 'Sin patente'}</Link><span className="block text-crm-fg-muted">{item.message}</span></li>)}</ul></details>}
    </section>;
}

export default function AvailableInventoryValues({ metrics, filteredMetrics, hasFilter = false }) {
    const [detail, setDetail] = useState(null);
    if (!metrics) return null;
    const show = (scope, currency, ownershipType, filtered = false) => setDetail({ scope, currency, ownershipType, filtered });
    return <div className="space-y-4">
        <p className="m-0 text-xs text-crm-fg-muted">Ambos bloques corresponden a las mismas {metrics.count} unidades con estado operativo Disponible. La publicación en la web no define su disponibilidad. ARS y USD se conservan separados.</p>
        <div className="grid gap-4 xl:grid-cols-2">{['cost', 'asking'].map(scope => <MetricCard key={scope} scope={scope} metrics={metrics} onBreakdown={show} />)}</div>
        {hasFilter && filteredMetrics && <details className="rounded-xl border border-crm-border bg-crm-bg p-4"><summary className="cursor-pointer text-sm font-semibold text-crm-fg">Subtotal del filtro · {filteredMetrics.count} de {metrics.count} disponibles</summary><div className="mt-4 grid gap-4 xl:grid-cols-2">{['cost', 'asking'].map(scope => <MetricCard key={scope} scope={scope} metrics={filteredMetrics} subtotal onBreakdown={(kind, currency, ownershipType) => show(kind, currency, ownershipType, true)} />)}</div></details>}
        {detail && <ValueBreakdown scope={detail.scope} currency={detail.currency} ownershipType={detail.ownershipType} metrics={detail.filtered ? filteredMetrics : metrics} onClose={() => setDetail(null)} />}
    </div>;
}
