"use client";
import { useEffect, useState } from 'react';
import { stockValuation, formatStockMoney } from '../../../utils/inventoryStock';

// A single vehicle detail. It deliberately performs no inventory fetch and owns no filters.
export default function StockCommercialCalculator({ vehicle, canSeeCosts = false }) {
    const car = vehicle?._original || vehicle;
    const [simulatedPrice, setSimulatedPrice] = useState('');
    useEffect(() => setSimulatedPrice(''), [car?._id, car?.price]);
    if (!car) return <p className="text-sm text-crm-fg-muted">Abrí el detalle comercial de una unidad desde la lista de Stock.</p>;
    const stored = stockValuation(car);
    const isSimulating = simulatedPrice !== '';
    const value = stockValuation(car, isSimulating ? Number(simulatedPrice) : undefined);
    const money = amount => amount === null || amount === undefined || !value.askingCurrency ? 'Dato pendiente' : `${value.askingCurrency} ${Number(amount).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
    const participationKnown = value.ownPct !== null && value.ownPct !== undefined;
    return (
        <div className="space-y-3 text-xs text-crm-fg" data-stock-calculator={String(car._id || car.id)}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div><span className="block text-crm-fg-muted">Precio de venta guardado</span><strong>{money(stored.asking)}</strong></div>
                {canSeeCosts && <>
                    <div><span className="block text-crm-fg-muted">Compra / toma</span><strong>{stored.hasCost ? `${stored.purchaseCurrency} ${stored.purchase.toLocaleString('es-AR')}` : 'Costo pendiente'}</strong></div>
                    <div><span className="block text-crm-fg-muted">Gastos registrados</span><strong>{formatStockMoney(stored.expenses)}</strong></div>
                    <div><span className="block text-crm-fg-muted">Costo acumulado · mi parte</span><strong>{formatStockMoney(stored.ownCost)}</strong><span className="block text-crm-fg-muted">Costo completo: {formatStockMoney(stored.cost)}</span></div>
                </>}
            </div>
            {canSeeCosts && <>
                <div className="flex flex-wrap items-end gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <label className="min-w-0"><span className="mb-1 block font-semibold">Simular precio ({stored.askingCurrency || 'moneda pendiente'})</span><input type="number" min="0" step="0.01" disabled={!stored.askingCurrency} inputMode="decimal" aria-label={`Simular precio de ${car.brand} ${car.name}`} placeholder={stored.asking === null || stored.asking === undefined ? '' : String(stored.asking)} value={simulatedPrice} onChange={event => setSimulatedPrice(event.target.value)} className="h-9 w-44 max-w-full rounded-lg border border-crm-border bg-crm-bg px-2 text-crm-fg disabled:opacity-50" /></label>
                    <button type="button" onClick={() => setSimulatedPrice('')} disabled={!isSimulating} className="rounded-lg border border-crm-border px-3 py-2 disabled:opacity-40">Restablecer</button>
                    <div className="flex-1"><strong className={isSimulating ? 'text-amber-300' : ''}>{isSimulating ? 'Simulación sin guardar' : 'Participación al precio guardado'}</strong><p className="m-0 mt-1">{participationKnown ? <>Mi parte ({value.ownPct}%): {money(value.ownAsking)} · {['consignacion', 'tercero'].includes(value.type) ? 'Tercero' : 'Inversor'} ({value.externalPct}%): {money(value.externalAsking)}</> : 'Participación pendiente de verificar; no se supone un reparto.'}</p></div>
                </div>
                <p className="m-0 text-crm-fg-muted">La simulación se calcula en esta pantalla y no cambia el precio guardado. Para guardar un precio, usá Editar en la ficha. Las monedas se mantienen separadas, sin conversión automática.</p>
            </>}
            <p className="m-0 text-crm-fg-muted">{['consignacion', 'tercero'].includes(stored.type) ? 'Unidad de terceros: participación propia 0%.' : participationKnown ? `Participación propia ${stored.ownPct}% · inversor ${stored.investorPct}%.` : 'Titularidad o porcentaje pendiente.'} {car.status === 'Disponible' && !car.sold ? 'Disponible para vender.' : 'No integra el indicador Disponible para vender.'}</p>
            {stored.missingFields?.length > 0 && <div className="rounded-lg border border-amber-500/30 p-3 text-amber-300"><strong>Subtotal conocido · datos pendientes</strong><ul className="mt-2 space-y-1">{stored.missingFields.map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.message}</li>)}</ul></div>}
            {car.price === 1 && <p className="m-0 text-amber-300">Precio provisorio de 1: revisá la tasación en la ficha.</p>}
            <div className="text-crm-fg-muted">Ubicación: {car.location || 'Sin informar'} · Ingreso: {car.createdAt ? new Date(car.createdAt).toLocaleDateString('es-AR') : 'Sin informar'}{car.consignedBy ? ` · Consignante: ${car.consignedBy}` : ''}{car.investor?.name ? ` · Inversor: ${car.investor.name}` : ''}</div>
            {car.tradeInOrigin?.saleId && <a href={`/admin/ventas/${car.tradeInOrigin.saleId}`} className="text-blue-400 underline">Ver venta de origen de la permuta</a>}
        </div>
    );
}
