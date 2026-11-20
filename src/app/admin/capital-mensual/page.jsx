"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CalendarRange, ChevronDown, Landmark, Loader2, RefreshCw, Save, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { canReadCapitalHistory, canWriteCapitalHistory } from '../../../utils/adminPermissions';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';
import CrmButton from '../../../components/crm/ui/CrmButton';
import CrmModal from '../../../components/crm/ui/CrmModal';
import CapitalHistoryChart from '../../../components/crm/capital/CapitalHistoryChart';
import CapitalStockComparison from '../../../components/crm/capital/CapitalStockComparison';
import { capitalChange, capitalComponents, capitalMetricLabel, capitalMoment, capitalMoney, capitalPeriodLabel, capitalQuality, capitalRows, capitalStatusLabel, capitalStockBreakdown, capitalValue, currentCapitalPeriod, shiftCapitalPeriod } from '../../../utils/capitalHistoryView';

const inputClass = 'h-10 rounded-lg border border-crm-border bg-crm-bg px-3 text-base text-crm-fg outline-none focus:ring-2 focus:ring-crm-red/30 md:text-sm';
const stockMetrics = ['stockTotal', 'stockOwn', 'stockInvestors', 'stockUnallocated'];
const graphMetrics = ['stockTotal', 'stockOwn', 'stockInvestors', 'net'];
async function request(path = '', { method = 'GET', body, signal, key } = {}) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Iniciá sesión para consultar el capital mensual.');
    const response = await fetch('/api/admin/capital-history' + path, { method, signal, cache: 'no-store', credentials: 'same-origin',
        headers: { Authorization: 'Bearer ' + token, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401) window.dispatchEvent(new Event('autosporting-auth-expired'));
        throw Object.assign(new Error(data.message || 'No se pudo consultar el capital. Reintentá.'), { status: response.status });
    }
    return data;
}
function QualityBadge({ row, basis, metric = 'net' }) {
    if (row.status === 'missing') return null;
    const quality = capitalQuality(row, basis, metric);
    return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${quality.partial ? 'border-amber-400/25 bg-amber-400/10 text-amber-300' : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'}`}>{quality.label}</span>;
}
function Difference({ value, currency }) {
    if (value.status !== 'available') return <span className="text-xs text-crm-fg-muted">{value.status === 'partial' ? 'Comparación pendiente · datos parciales' : value.status === 'incompatible' ? 'Criterio de cálculo diferente' : 'Sin registros comparables del mes anterior'}</span>;
    const positive = value.amount > 0, negative = value.amount < 0;
    return <div className={negative ? 'text-red-300' : positive ? 'text-emerald-300' : 'text-crm-fg-muted'}><p className="flex items-center gap-1 text-sm font-bold">{positive ? <TrendingUp size={14}/> : negative ? <TrendingDown size={14}/> : null}{positive ? '+' : ''}{capitalMoney(value.amount, currency)}</p><p className="mt-1 text-xs">{value.percent === null ? 'Sin porcentaje · base anterior no positiva' : `${value.percent > 0 ? '+' : ''}${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value.percent)}%`}</p></div>;
}
function StockAmounts({ row, currency, basis, cards = false }) {
    const amounts = capitalStockBreakdown(row, currency, basis);
    if (!amounts) return <p className="rounded-xl border border-dashed border-crm-border p-4 text-sm text-crm-fg-muted" data-capital-stock-breakdown>Sin desglose guardado. Este registro conserva el capital propio neto; el reparto de Stock no se reconstruye con valores de hoy.</p>;
    return <div data-capital-stock-breakdown className="space-y-3">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{stockMetrics.map(metric => <div key={metric} data-capital-stock-card={cards ? metric : undefined} className={`min-w-0 rounded-xl border p-4 ${cards && metric === 'stockTotal' ? 'border-crm-red/40 bg-crm-red/10' : 'border-crm-border bg-crm-bg'}`}>
            <dt className="text-xs font-bold text-crm-fg-muted">{capitalMetricLabel(metric)}</dt>
            <dd data-capital-stock-value={metric} className={`mt-2 break-words font-black text-crm-fg ${cards ? 'text-xl sm:text-2xl' : 'text-base'}`}>{capitalMoney(capitalValue(row, currency, basis, metric), currency)}</dd>
        </div>)}</dl>
        <p className="text-xs text-crm-fg-muted">{basis === 'published' ? `Terceros en consignación / otros incluidos en el total publicado: ${capitalMoney(amounts.thirdParty, currency)}.` : `Costos de terceros excluidos del total: ${capitalMoney(amounts.thirdPartyExcluded, currency)}.`} {basis === 'published' ? 'Total = AutoSporting + inversionistas + terceros + participación por verificar.' : 'Total = AutoSporting + inversionistas + participación por verificar.'}</p>
    </div>;
}
function Components({ row, currency, basis }) {
    const components = capitalComponents(row, currency, basis), quality = capitalQuality(row, basis);
    return <div className="space-y-4">
        <p className="text-sm font-bold">{capitalPeriodLabel(row.period)} · {currency}</p>
        <h3 className="text-sm font-bold">Capital en Stock</h3><StockAmounts row={row} currency={currency} basis={basis}/>
        <h3 className="text-sm font-bold">Composición del capital propio neto</h3>
        {components.length ? <dl className="divide-y divide-crm-border rounded-xl border border-crm-border bg-crm-bg px-3">{components.map(component => <div key={component.key} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0 flex-1"><dt className="text-sm text-crm-fg">{component.sign} {component.label}</dt>{component.description && <p className="mt-1 text-xs text-crm-fg-muted">{component.description}</p>}</div><dd className="text-sm font-bold">{capitalMoney(component.value, currency)}</dd></div>)}<div className="flex flex-wrap justify-between gap-3 py-3 font-bold"><dt>Capital propio neto</dt><dd>{capitalMoney(capitalValue(row, currency, basis), currency)}</dd></div></dl> : <p className="text-sm text-crm-fg-muted">Este registro no tiene una composición detallada disponible.</p>}
        {quality.message && <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-crm-fg-muted">{quality.message}</p>}
        <p className="text-xs text-crm-fg-muted">{row.status === 'current' ? 'Consultado' : 'Registrado'}: {capitalMoment(row.asOf || row.capturedAt)} · Hora argentina.</p>
        {row.sourceLabel && <p className="text-xs text-crm-fg-muted">Origen: {row.sourceLabel}</p>}
    </div>;
}

export default function CapitalMensualPage() {
    const { user, loading } = useAuth();
    if (loading) return <p role="status" className="p-4 text-sm text-crm-fg-muted">Verificando acceso…</p>;
    if (!canReadCapitalHistory(user)) return <div className="p-4 md:p-6"><h1 className="text-2xl font-bold text-crm-fg">Capital mensual</h1><p className="mt-2 text-sm text-crm-fg-muted">No tenés permiso para consultar el capital de la agencia.</p></div>;
    return <CapitalHistory canWrite={canWriteCapitalHistory(user)}/>;
}
function CapitalHistory({ canWrite }) {
    const [period] = useState(currentCapitalPeriod), [from, setFrom] = useState(() => shiftCapitalPeriod(currentCapitalPeriod(), -11)), [to, setTo] = useState(currentCapitalPeriod);
    const [currency, setCurrency] = useState('ARS'), [basis, setBasis] = useState('cost'), [metric, setMetric] = useState('stockTotal');
    const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [generation, setGeneration] = useState(0);
    const [captureOpen, setCaptureOpen] = useState(false), [capturing, setCapturing] = useState(false), [captureError, setCaptureError] = useState(''), [detail, setDetail] = useState(null);
    const busy = useRef(false), captureKey = useRef(null);
    const validRange = /^\d{4}-(0[1-9]|1[0-2])$/.test(from) && /^\d{4}-(0[1-9]|1[0-2])$/.test(to) && from <= to && to <= period && from >= shiftCapitalPeriod(to, -59);
    useEffect(() => {
        if (!validRange) { setLoading(false); return; }
        const controller = new AbortController(); let active = true;
        setLoading(true); setError('');
        request('?' + new URLSearchParams({ from, to }), { signal: controller.signal }).then(result => { if (active) setData(result); })
            .catch(cause => { if (active && cause.name !== 'AbortError') setError(cause.message); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; controller.abort(); };
    }, [from, to, generation, validRange]);
    const rows = useMemo(() => validRange ? capitalRows(data, from, to) : [], [data, from, to, validRange]);
    const rowsByPeriod = useMemo(() => new Map(rows.map(row => [row.period, row])), [rows]);
    const available = rows.filter(row => row.status !== 'missing');
    const current = data?.current, stockQuality = current ? capitalQuality(current, basis, 'stockTotal') : null;
    const captureAllowed = canWrite && data?.canCapture !== false && Boolean(current);
    const closeCapture = () => { if (!busy.current) setCaptureOpen(false); };
    const capture = async event => {
        event.preventDefault(); if (busy.current || !captureAllowed) return;
        busy.current = true; setCapturing(true); setCaptureError(''); captureKey.current ||= crypto.randomUUID();
        try {
            const result = await request('/capture', { method: 'POST', body: {}, key: captureKey.current });
            setNotice(result.message || 'Registro de capital actual guardado.'); setCaptureOpen(false); captureKey.current = null; setGeneration(value => value + 1);
        } catch (cause) { setCaptureError(cause.message || 'No se pudo guardar el registro. Reintentá.'); }
        finally { busy.current = false; setCapturing(false); }
    };
    const closeDetail = useCallback(() => setDetail(null), []);
    return <div className="min-w-0 space-y-5 p-4 md:p-6" data-capital-history>
        <CrmPageHeader title="Capital mensual" subtitle="Tu capital en Stock y el de los inversionistas, mes a mes." actions={<>
            <CrmButton type="button" variant="secondary" disabled={loading || capturing} onClick={() => setGeneration(value => value + 1)}><RefreshCw size={16} className={loading ? 'animate-spin' : undefined}/>Actualizar</CrmButton>
            {canWrite && <CrmButton type="button" disabled={!captureAllowed || loading || capturing} onClick={() => { setCaptureError(''); setCaptureOpen(true); }}><Save size={16}/>Guardar registro actual</CrmButton>}
        </>}/>
        <section className="flex flex-col gap-4 rounded-xl border border-crm-border bg-crm-surface p-4 lg:flex-row lg:items-end" aria-label="Filtros del capital mensual">
            <label className="space-y-1.5 text-xs font-bold text-crm-fg-muted"><span className="block">Desde</span><input type="month" aria-label="Desde" value={from} max={to || period} onChange={event => setFrom(event.target.value)} className={inputClass}/></label>
            <label className="space-y-1.5 text-xs font-bold text-crm-fg-muted"><span className="block">Hasta</span><input type="month" aria-label="Hasta" value={to} min={from} max={period} onChange={event => setTo(event.target.value)} className={inputClass}/></label>
            <div><label htmlFor="capital-currency" className="mb-1.5 block text-xs font-bold text-crm-fg-muted">Moneda del gráfico y del historial</label><select id="capital-currency" value={currency} onChange={event => setCurrency(event.target.value)} className={`${inputClass} w-full`}><option value="ARS">ARS · Pesos</option><option value="USD">USD · Dólares</option></select></div>
            <div className="min-w-0 flex-1"><label htmlFor="capital-basis" className="mb-1.5 block text-xs font-bold text-crm-fg-muted">Criterio de valuación</label><select id="capital-basis" value={basis} onChange={event => setBasis(event.target.value)} className={`${inputClass} w-full`}><option value="cost">A costo · recomendado</option><option value="published">Precio publicado · escenario comercial</option></select></div>
        </section>
        {!validRange && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-300">Elegí un período de hasta 60 meses que termine como máximo en el mes actual.</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-crm-fg">{notice}</p>}
        {error && <div role="alert" className="space-y-2 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-300"><p>{error}</p><CrmButton type="button" variant="secondary" onClick={() => setGeneration(value => value + 1)}>Reintentar consulta</CrmButton></div>}
        {loading && <p role="status" className="flex items-center gap-2 text-sm text-crm-fg-muted"><Loader2 size={16} className="animate-spin"/>Consultando capital e historial…</p>}
        <section aria-label="Capital en Stock" className="space-y-4 rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold text-crm-fg"><Landmark size={20} className="text-crm-red"/>Capital en Stock · {currency}</h2><p className="mt-1 text-xs text-crm-fg-muted">{current?.stockCapital?.count ?? '…'} unidades Disponibles · Inventario completo, sin filtros · {basis === 'cost' ? 'Costo de compra o toma y gastos imputados' : 'Precio publicado'}</p></div>{current && <QualityBadge row={current} basis={basis} metric="stockTotal"/>}</div>
            {current ? <StockAmounts row={current} currency={currency} basis={basis} cards/> : <p className="text-sm text-crm-fg-muted">Consultando…</p>}
            {stockQuality?.partial && !stockQuality.missingBreakdown && <p className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-xs text-amber-200">{stockQuality.message} La participación por verificar no se adjudica a AutoSporting ni a inversionistas.</p>}
            {current && <p className="text-xs text-crm-fg-muted">Consulta actual: {capitalMoment(current.asOf)} · Hora argentina. Estas cifras usan el mismo inventario y criterio que Stock.</p>}
        </section>
        {current && <section aria-label="Capital propio neto" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-crm-border bg-crm-surface p-4 sm:p-5"><div className="min-w-0"><h2 className="text-base font-bold text-crm-fg">Capital propio neto · {currency}</h2><p className="mt-1 text-xs text-crm-fg-muted">Mi capital en Stock + caja y bancos + cartera propia − obligaciones y pagos sin cuenta. Es distinto del total invertido entre todos.</p><div className="mt-2"><QualityBadge row={current} basis={basis}/></div></div><div className="flex flex-wrap items-center gap-4"><p className="text-xl font-black text-crm-fg">{capitalMoney(capitalValue(current, currency, basis), currency)}</p><CrmButton type="button" size="sm" variant="secondary" onClick={() => setDetail(current)}>Ver composición<ChevronDown size={14}/></CrmButton></div></section>}
        <p className="rounded-xl border border-crm-border bg-crm-surface p-4 text-sm text-crm-fg-muted"><strong className="text-crm-fg">Para seguir la inversión registrada mes a mes, usá costo.</strong> Conservá el mismo criterio entre períodos. El precio publicado incluye margen esperado que todavía puede negociarse. La variación también puede incluir compras, ventas, cambios de estado, aportes o retiros y cambios nominales por inflación; no equivale por sí sola a rentabilidad.</p>
        {current && <details className="rounded-xl border border-crm-border bg-crm-surface p-4"><summary className="cursor-pointer text-sm font-bold text-crm-fg">Ver conciliación con Stock y composición</summary><div className="mt-4"><CapitalStockComparison current={current} currency={currency} basis={basis}/></div></details>}
        {data && validRange && <>
            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5" aria-label="Gráfico de capital mensual"><div className="mb-4 flex flex-wrap items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-base font-bold text-crm-fg"><CalendarRange size={18} className="text-crm-red"/>Evolución del capital · {currency}</h2><p className="mt-1 text-xs text-crm-fg-muted">{capitalMetricLabel(metric)} · {basis === 'cost' ? 'A costo' : 'A precio publicado'} · {available.length} meses con registros guardados</p></div><div><label htmlFor="capital-indicator" className="mb-1.5 block text-xs font-bold text-crm-fg-muted">Indicador del gráfico</label><select id="capital-indicator" value={metric} onChange={event => setMetric(event.target.value)} className={`${inputClass} max-w-full`}>{graphMetrics.map(value => <option key={value} value={value}>{capitalMetricLabel(value)}</option>)}</select></div></div><CapitalHistoryChart rows={rows} current={current} currency={currency} basis={basis} metric={metric}/></section>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-crm-border bg-crm-surface p-4"><p className="flex-1 text-sm text-crm-fg-muted">{data.firstRecordedPeriod ? `El historial tiene registros desde ${capitalPeriodLabel(data.firstRecordedPeriod).toLowerCase()}.` : 'Todavía no hay registros de capital guardados.'} Cada mes conserva su último registro observado, con la fecha real de captura. Los registros antiguos sin reparto de Stock muestran «Sin desglose guardado».</p>{data.firstRecordedPeriod && <CrmButton type="button" variant="ghost" disabled={loading} onClick={() => { setFrom(data.firstRecordedPeriod < shiftCapitalPeriod(period, -59) ? shiftCapitalPeriod(period, -59) : data.firstRecordedPeriod); setTo(period); }}>{data.firstRecordedPeriod < shiftCapitalPeriod(period, -59) ? 'Últimos 60 meses' : 'Desde el primer registro'}</CrmButton>}</div>
            <section aria-label="Historial mensual de capital" className={loading ? 'space-y-4 opacity-60' : 'space-y-4'}>
                {[...rows].reverse().map(row => <article key={row.period} data-capital-period={row.period} className="space-y-4 rounded-xl border border-crm-border bg-crm-surface p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold text-crm-fg">{capitalPeriodLabel(row.period)}</h3><p className="mt-1 text-xs text-crm-fg-muted">{capitalStatusLabel(row)}</p></div>{row.status !== 'missing' && <div className="space-y-1 text-right"><p className="text-xs text-crm-fg-muted">{capitalMoment(row.capturedAt)}</p><QualityBadge row={row} basis={basis} metric={metric}/></div>}</div>
                    {row.status === 'missing' ? <p className="text-sm text-crm-fg-muted">No hay un registro guardado.</p> : <>
                        <StockAmounts row={row} currency={currency} basis={basis}/>
                        <div className="flex flex-wrap items-start justify-between gap-4 border-t border-crm-border pt-4"><div><p className="text-xs font-bold text-crm-fg-muted">Capital propio neto · {currency}</p><p className="mt-1 text-base font-bold text-crm-fg">{capitalMoney(capitalValue(row, currency, basis), currency)}</p></div><div><p className="mb-1 text-xs font-bold text-crm-fg-muted">Variación de {capitalMetricLabel(metric).toLowerCase()} vs. mes anterior</p><Difference value={capitalChange(row, rowsByPeriod.get(shiftCapitalPeriod(row.period, -1)), currency, basis, metric)} currency={currency}/></div><CrmButton type="button" variant="secondary" size="sm" onClick={() => setDetail(row)} disabled={loading}>Ver composición<ChevronDown size={14}/></CrmButton></div>
                    </>}
                </article>)}
            </section>
        </>}
        {captureOpen && current && <CrmModal isOpen onClose={closeCapture} hideCloseButton={capturing} title="Guardar capital actual" maxWidth="max-w-3xl" footer={<div className="flex flex-wrap justify-end gap-2"><CrmButton type="button" variant="ghost" disabled={capturing} onClick={closeCapture}>Volver</CrmButton><CrmButton type="submit" form="capture-capital" disabled={capturing}>{capturing ? 'Guardando…' : 'Confirmar registro'}</CrmButton></div>}><form id="capture-capital" onSubmit={capture} className="space-y-4 p-4 sm:p-5"><p className="text-sm font-bold">{capitalPeriodLabel(current.period)} · Capital en Stock · {currency}</p><StockAmounts row={current} currency={currency} basis={basis}/><p className="text-sm text-crm-fg-muted">El registro guarda por separado el total de Stock, tu parte, la de los inversionistas y la participación por verificar, a costo y a precio publicado, en ARS y USD. También conserva el capital propio neto y su composición.</p><p className="text-xs text-crm-fg-muted">Consultado: {capitalMoment(current.asOf)} · Hora argentina. Se calcula nuevamente en el servidor al confirmar.</p>{stockQuality.partial && <p className="flex gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-200"><AlertCircle size={16} className="shrink-0"/>El registro conservará la advertencia de datos parciales y los subtotales conocidos.</p>}{captureError && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-300">{captureError}</p>}</form></CrmModal>}
        {detail && <CrmModal isOpen onClose={closeDetail} title="Composición del capital" maxWidth="max-w-3xl"><div className="p-4 sm:p-5"><Components row={detail} currency={currency} basis={basis}/></div></CrmModal>}
    </div>;
}
