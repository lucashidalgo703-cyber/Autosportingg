'use client';

import { useEffect, useState } from 'react';
import { currencies, markets, priceTypes, verificationStates, listingIdentity } from '../../../services/purchaseAnalyzer';

const vehicleFields = [
    ['brand', 'Marca'], ['model', 'Modelo'], ['version', 'Versión exacta'], ['year', 'Año', 'number'],
    ['km', 'Kilometraje', 'number'], ['engine', 'Motorización'], ['transmission', 'Transmisión'],
    ['traction', 'Tracción'], ['condition', 'Estado general'], ['location', 'Ubicación'],
    ['market', 'Mercado', markets]
];
const moneyFields = [
    ['asking', 'Precio del vendedor', 'number'], ['offer', 'Precio propuesto', 'number'],
    ['cashNow', 'Efectivo al comprar', 'number'], ['tradeVehicle', 'Vehículo entregado en permuta'],
    ['tradeValue', 'Valor asignado a la permuta', 'number'], ['repairsCost', 'Reparación y preparación', 'number'],
    ['commercialCost', 'Gastos comerciales', 'number'], ['share', 'Participación propia (%)', 'number'],
    ['targetProfit', 'Ganancia neta objetivo de la operación', 'number'], ['paymentNotes', 'Condiciones de pago']
];
const expenseOptions = [['agency', 'AutoSporting'], ['shared', 'Proporcional'], ['partner', 'Socio']];
const inputClass = 'w-full rounded-lg border border-crm-border bg-crm-surface px-3 py-2 text-sm text-crm-fg';
const buttonClass = 'rounded-lg border border-crm-border px-3 py-2 text-crm-fg hover:bg-crm-surface disabled:opacity-50';
const grid = 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3';
const formatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

function Fields({ definitions, value, update }) {
    return definitions.map(([name, label, type]) => (
        <label key={name} className="grid content-start gap-1 text-sm">
            {label}
            {Array.isArray(type) ? <select className={inputClass} value={value[name] ?? ''} onChange={event => update(name, event.target.value)}>
                <option value="">Seleccionar</option>
                {type.map(option => {
                    const [id, description] = Array.isArray(option) ? option : [option, option];
                    return <option value={id} key={id}>{description}</option>;
                })}
            </select> : <input className={inputClass} type={type || 'text'} min={type === 'number' ? 0 : undefined}
                step={type === 'number' ? 'any' : undefined} value={value[name] ?? ''}
                onChange={event => update(name, type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)} />}
        </label>
    ));
}

function Report({ record, markUnavailable, busy }) {
    const { market, finance, liquidity, listings, terms } = record.snapshot;
    const money = value => value == null ? 'Sin estimación' : terms.currency + ' ' + formatter.format(value);
    const metrics = [
        ['Avisos revisados / aceptados', market.found + ' / ' + market.accepted],
        ['Mínimo observado', money(market.min)], ['Máximo observado', money(market.max)],
        ['Mediana observada', money(market.median)], ['Dispersión (máximo menos mínimo)', money(market.dispersion)],
        ['Confianza', market.confidence], ['Ajustes aplicados', 'Ninguno'],
        ['Publicación sugerida (mediana)', money(market.publish)], ['Cierre probable', 'Sin evidencia de cierres comparables'],
        ['Venta rápida (referencia P25 de avisos)', money(market.fast)], ['Máximo de compra (P25 menos gastos y ganancia objetivo)', money(finance.maxBuy)],
        ['Costo económico de adquisición', money(finance.acquisition)], ['Valor de permuta', money(terms.tradeValue)],
        ['Reparación y preparación', money(terms.repairsCost)], ['Gastos comerciales', money(terms.commercialCost)],
        ['Costo total estimado', money(finance.cost)],
        ['Riesgo de rotación', 'Sin evidencia de días de venta']
    ];
    return <div className="space-y-4">
        <h3 className="text-lg font-bold">{record.snapshot.vehicle.brand} {record.snapshot.vehicle.model} {record.snapshot.vehicle.version}</h3>
        <p className="text-sm">{new Date(record.createdAt).toLocaleString('es-AR')} · {record.author}</p>
        {!market.sufficient && <p className="font-semibold">Evidencia insuficiente para recomendar un precio confiable</p>}
        <dl className={grid}>{metrics.map(([label, value]) => <div key={label}><dt className="text-sm text-crm-fg-muted">{label}</dt><dd>{value}</dd></div>)}</dl>
        {finance.scenarios.length > 0 && <div className={grid}>{finance.scenarios.map(scenario => <div key={scenario.name} className="rounded-lg border border-crm-border p-3">
            <h4 className="font-bold">{scenario.name}</h4>
            <p>Confianza {market.confidence} · P{scenario.percentile * 100} de precios publicados</p>
            <p>Venta simulada {money(scenario.sale)}</p>
            <p>Bruta {money(scenario.gross)} · Neta {money(scenario.net)}</p>
            <p>Resultado propio {money(scenario.ownNet)}</p>
            <p>Margen sobre costo {scenario.marginCost}% · sobre venta {scenario.marginSale}%</p>
        </div>)}</div>}
        {record.snapshot.quoteNumber && <p className="text-sm">Cotización de origen #{record.snapshot.quoteNumber}</p>}
        <h4 className="font-bold">Liquidez</h4>
        <p>{liquidity.status}</p>
        {liquidity.ownCash !== undefined && <>
            <p className="text-sm">Efectivo y pagos de compra se reparten según la participación. Los gastos se asignan al pagador indicado.</p>
            <p className="text-sm">Proyección conservadora. Todos los gastos se asignan al inicio y los compromisos se descuentan íntegramente. Los cobros futuros quedan fuera del saldo.</p>
            <dl className={grid}>{[
                ['Efectivo físico', 'physical'], ['Liquidez propia en cuentas', 'ownCash'], ['Disponible para compras ajustado por faltantes', 'budget'],
                ['Desembolso propio inmediato', 'immediate'], ['Pagos futuros propios', 'future'], ['Compromisos existentes', 'commitments'],
                ['Reserva mínima', 'reserve'], ['Caja proyectada', 'projected'], ['Punto mínimo', 'minimum'], ['Fondos adicionales necesarios', 'futureFundingGap']
            ].map(([label, field]) => <div key={field}><dt className="text-sm text-crm-fg-muted">{label}</dt><dd>{money(liquidity[field])}</dd></div>)}</dl>
        </>}
        {terms.payments.length > 0 && <ul className="space-y-1 text-sm" aria-label="Cronograma de pagos">
            {terms.payments.map((payment, index) => <li key={index}>{payment.date} · {money(payment.amount)} total · {money(payment.amount * terms.share / 100)} propio</li>)}
        </ul>}
        {record.outcomes && <div><h4 className="font-bold">Resultado registrado en el CRM</h4>
            {record.outcomes[0]?.purchasePrice != null && <p>Compra registrada {record.outcomes[0].purchaseCurrency} {formatter.format(record.outcomes[0].purchasePrice)}</p>}
            {record.outcomes[1].map(sale => <p key={sale._id}>Venta entregada {sale.saleCurrency} {formatter.format(sale.salePrice)} · {new Date(sale.saleDate).toLocaleDateString('es-AR')}
                {sale.saleCurrency === terms.currency && market.publish !== null && ' · Diferencia vs. escenario base ' + money(sale.salePrice - market.publish)}
            </p>)}
        </div>}
        <h4 className="font-bold">Publicaciones utilizadas para la valuación</h4>
        {listings.map((row, index) => {
            const unavailable = record.unavailableListings?.find(item => item.source === row.source && item.listingId === row.id);
            return <article key={index} className="space-y-1 rounded-lg border border-crm-border p-3">
            <p className="font-semibold">{row.title} · {row.source} · {row.id}</p>
            <p>{row.brand} {row.model} {row.version} · {row.year} · {formatter.format(row.km)} km · {row.location} · {row.market}</p>
            <p>{row.currency} {formatter.format(row.price)} · {row.priceType} · {row.seller || 'Vendedor sin identificar'}</p>
            <p>{new Date(row.checkedAt).toLocaleString('es-AR')} · {row.verification} · similitud {row.similarity}</p>
            <p>{row.exclusions.join(' · ') || 'Utilizada en el cálculo'}</p>
            <a className="block break-all text-purple-300 underline" href={row.url} target="_blank" rel="noopener noreferrer">Ver publicación original <span className="text-xs">({row.url})</span></a>
            {unavailable ? <p>Aviso ya no verificable · {new Date(unavailable.reportedAt).toLocaleString('es-AR')}</p> :
                row.verification !== 'ya no disponible' && <button className={buttonClass} disabled={busy} onClick={() => markUnavailable(row)}>
                    Marcar aviso como no disponible
                </button>}
            </article>;
        })}
    </div>;
}

export default function PurchaseAnalyzer({ token, treasuryToken }) {
    const [step, setStep] = useState(0);
    const [vehicle, setVehicle] = useState({});
    const [terms, setTerms] = useState({ currency: 'ARS', expensePayer: 'agency', tradeValue: 0, cashNow: 0, repairsCost: 0, commercialCost: 0, targetProfit: 0, share: 100, payments: [] });
    const [vehicleRecord, setVehicleRecord] = useState('');
    const [quote, setQuote] = useState({ number: '', imported: undefined });
    const [listings, setListings] = useState([]);
    const [history, setHistory] = useState([]);
    const [offset, setOffset] = useState(0);
    const [record, setRecord] = useState(null);
    const [allowed, setAllowed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const headers = { Authorization: 'Bearer ' + token, 'x-treasury-token': treasuryToken, 'Content-Type': 'application/json' };
    const base = '/api/admin/tesoreria-estrategica/purchase-evaluations';
    useEffect(() => {
        const controller = new AbortController();
        fetch('/api/admin/tesoreria-estrategica/purchase-analyzer-access', {
            headers: { Authorization: 'Bearer ' + token, 'x-treasury-token': treasuryToken }, signal: controller.signal
        }).then(result => result.ok ? result.json() : null)
            .then(result => setAllowed(result?.allowed === true)).catch(() => {});
        return () => controller.abort();
    }, [token, treasuryToken]);

    async function request(path, options) {
        const result = await fetch(base + path, { headers, ...options });
        const data = await result.json();
        if (!result.ok) throw new Error(data.message || 'No se pudo completar la solicitud.');
        return data;
    }
    async function run(action) {
        setBusy(true);
        setError('');
        try { await action(); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
    }
    const editVehicle = (key, value) => setVehicle(previous => ({ ...previous, [key]: value }));
    const editTerms = (key, value) => setTerms(previous => ({ ...previous, [key]: value }));
    const editListing = (index, key, value) => setListings(previous => previous.map((row, i) => i === index ? { ...row, [key]: value } : row));
    const loadHistory = async nextOffset => {
        setHistory(await request('?offset=' + nextOffset));
        setOffset(nextOffset);
    };
    const openRecord = async id => setRecord(await request('/' + id));
    if (!allowed) return null;

    return <section className="space-y-5 rounded-2xl border border-crm-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Analizador de Compra Inteligente</h2>
            <button className={buttonClass} disabled={busy} onClick={() => run(() => loadHistory(0))}>Cargar historial</button>
        </div>
        {history.length > 0 && <div className="flex flex-wrap gap-2">
            {history.map(item => <button key={item._id} className={buttonClass} disabled={busy}
                onClick={() => run(async () => { await openRecord(item._id); setStep(2); })}>
                {item.snapshot.vehicle.brand} {item.snapshot.vehicle.model} · {new Date(item.createdAt).toLocaleDateString('es-AR')}
            </button>)}
            {offset > 0 && <button className={buttonClass} disabled={busy} onClick={() => run(() => loadHistory(offset - 30))}>Anterior</button>}
            {history.length === 30 && <button className={buttonClass} disabled={busy} onClick={() => run(() => loadHistory(offset + 30))}>Siguiente</button>}
        </div>}
        <nav className="flex flex-wrap gap-2" aria-label="Pasos del analizador">
            {['Cargar vehículo', 'Analizar mercado', 'Evaluar compra'].map((label, i) => <button key={label} className={buttonClass + (step === i ? ' bg-purple-600 !text-white' : '')}
                aria-current={step === i ? 'step' : undefined} disabled={busy} onClick={() => setStep(i)}>{i + 1}. {label}</button>)}
        </nav>
        {error && <p role="alert" className="text-red-300">{error}</p>}
        {step === 0 && <>
            <div className="flex flex-wrap items-end gap-2">
                <Fields definitions={[[ 'id', 'ID de vehículo en el CRM' ]]} value={{ id: vehicleRecord }} update={(_, id) => setVehicleRecord(id)} />
                <button className={buttonClass} disabled={busy || !vehicleRecord} onClick={() => run(async () => {
                    const car = await request('/vehicle/' + encodeURIComponent(vehicleRecord));
                    setQuote(previous => ({ ...previous, imported: undefined }));
                    setVehicle(previous => ({ ...previous, brand: car.brand, model: car.name, year: car.year, km: car.km,
                        condition: car.condition, location: car.location }));
                    setTerms(previous => ({ ...previous, offer: car.purchasePrice ?? previous.offer,
                        currency: ['USD', 'U$S'].includes(car.purchaseCurrency || car.currency) ? 'USD' : 'ARS',
                        share: car.jointOwnership?.hasPartner ? car.jointOwnership.agencyPercentage ?? previous.share : 100 }));
                })}>Importar del CRM</button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
                <Fields definitions={[[ 'number', 'N.º de cotización CRM', 'number' ]]} value={quote}
                    update={(_, number) => setQuote({ number, imported: undefined })} />
                <button className={buttonClass} disabled={busy || !quote.number} onClick={() => run(async () => {
                    const data = await request('/quote/' + encodeURIComponent(quote.number));
                    const { brand, model, year, mileage, condition } = data.tradeIn;
                    setVehicle({ brand, model, year, km: mileage, condition });
                    setQuote({ number: data.quoteNumber, imported: data.quoteNumber });
                    setVehicleRecord('');
                })}>Importar vehículo recibido en permuta</button>
            </div>
            <div className={grid}><Fields definitions={[...vehicleFields, ['repairs', 'Reparaciones necesarias']]} value={vehicle} update={editVehicle} /></div>
            <div className={grid}><Fields definitions={[[ 'currency', 'Moneda de la operación', currencies ], ...moneyFields,
                ['expensePayer', 'Quién paga los gastos', expenseOptions]]} value={terms} update={editTerms} /></div>
            <label className="flex gap-2"><input type="checkbox" checked={terms.targetConfirmed ?? false}
                onChange={event => editTerms('targetConfirmed', event.target.checked)} /> Aplicar la ganancia objetivo al máximo de compra</label>
            {terms.payments.map((payment, index) => <div className={grid} key={index}>
                <Fields definitions={[[ 'date', 'Fecha de pago', 'date' ], ['amount', 'Importe futuro', 'number']]} value={payment}
                    update={(key, value) => editTerms('payments', terms.payments.map((row, i) => i === index ? { ...row, [key]: value } : row))} />
                <button className={buttonClass} onClick={() => editTerms('payments', terms.payments.filter((_, i) => i !== index))}>Quitar pago</button>
            </div>)}
            <button className={buttonClass} disabled={terms.payments.length >= 24}
                onClick={() => editTerms('payments', [...terms.payments, {}])}>Agregar pago futuro</button>
        </>}
        {step === 1 && <>
            <h3 className="font-bold">Publicaciones utilizadas para la valuación</h3>
            <p className="text-sm text-crm-fg-muted">Pegá un enlace individual de Mercado Libre Autos, Kavak (con ID de stock), Autocosmos o SmartCar. Abrí el aviso original y cargá el precio y las condiciones que pudiste confirmar. La valuación requiere tres coincidencias exactas en la misma moneda y mercado, con precio de contado cotejado en los últimos 30 días.</p>
            {listings.map((row, index) => <article key={index} className="grid gap-2 rounded-lg border border-crm-border p-3">
                <div className={grid}><Fields definitions={[
                    ['url', 'Enlace original HTTPS', 'url'], ['title', 'Título'], ...vehicleFields, ['price', 'Precio publicado', 'number'],
                    ['currency', 'Moneda', currencies], ['priceType', 'Condición del precio', priceTypes], ['seller', 'Tipo de vendedor'],
                    ['checkedAt', 'Fecha y hora de consulta', 'datetime-local'], ['verification', 'Estado de verificación', verificationStates]
                ]} value={row} update={(key, value) => editListing(index, key, value)} /></div>
                {listingIdentity(row.url) && <a className="break-all text-purple-300 underline" href={listingIdentity(row.url).url} target="_blank"
                    rel="noopener noreferrer">Ver publicación original</a>}
                <button className={buttonClass} onClick={() => setListings(previous => previous.filter((_, i) => i !== index))}>Quitar aviso</button>
            </article>)}
            <button className={buttonClass} disabled={listings.length >= 60} onClick={() => setListings(previous => [...previous, {
                currency: terms.currency, verification: 'sin verificar'
            }])}>Agregar aviso manualmente</button>
        </>}
        {step === 2 && <>
            <button className={buttonClass} disabled={busy} onClick={() => run(async () => {
                const data = await request('', { method: 'POST', body: JSON.stringify({ vehicle, terms, vehicleRecord, quoteNumber: quote.imported,
                    listings: listings.map(row => ({ ...row, checkedAt: row.checkedAt ? new Date(row.checkedAt).toISOString() : '' })) }) });
                setRecord(data);
            })}>{busy ? 'Procesando…' : 'Calcular y guardar evaluación'}</button>
            {record && <Report record={record} busy={busy} markUnavailable={row => run(async () => {
                const updated = await request('/' + record._id + '/unavailable-listings', {
                    method: 'POST', body: JSON.stringify({ source: row.source, listingId: row.id })
                });
                setRecord(previous => ({ ...previous, unavailableListings: updated.unavailableListings }));
            })} />}
            {record && !record.vehicleRecord && <div className="flex flex-wrap items-end gap-2">
                <Fields definitions={[[ 'id', 'ID del vehículo comprado en el CRM' ]]} value={{ id: vehicleRecord }} update={(_, id) => setVehicleRecord(id)} />
                <button className={buttonClass} disabled={busy || !vehicleRecord} onClick={() => run(async () => {
                    await request('/' + record._id + '/vehicle', { method: 'PUT', body: JSON.stringify({ vehicleRecord }) });
                    await openRecord(record._id);
                })}>Vincular con la operación real</button>
            </div>}
        </>}
    </section>;
}
