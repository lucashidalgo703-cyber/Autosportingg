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
import { capitalChange, capitalComponents, capitalMoment, capitalMoney, capitalPeriodLabel, capitalQuality, capitalRows, capitalStatusLabel, capitalValue, currentCapitalPeriod, shiftCapitalPeriod } from '../../../utils/capitalHistoryView';

const inputClass = 'h-10 rounded-lg border border-crm-border bg-crm-bg px-3 text-base text-crm-fg outline-none focus:ring-2 focus:ring-crm-red/30 md:text-sm';
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
function QualityBadge({ row, basis }) {
    if (row.status === 'missing') return null;
    const quality = capitalQuality(row, basis);
    return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${quality.partial ? 'border-amber-400/25 bg-amber-400/10 text-amber-300' : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'}`}>{quality.label}</span>;
}
function Difference({ value, currency }) {
    if (value.status !== 'available') return <span className="text-xs text-crm-fg-muted">{value.status === 'partial' ? 'Comparación pendiente · datos parciales' : value.status === 'incompatible' ? 'Criterio de cálculo diferente' : 'Sin registro del mes anterior'}</span>;
    const positive = value.amount > 0, negative = value.amount < 0;
    return <div className={negative ? 'text-red-300' : positive ? 'text-emerald-300' : 'text-crm-fg-muted'}><p className="flex items-center gap-1 text-sm font-bold">{positive ? <TrendingUp size={14}/> : negative ? <TrendingDown size={14}/> : null}{positive ? '+' : ''}{capitalMoney(value.amount, currency)}</p><p className="mt-1 text-xs">{value.percent === null ? 'Sin porcentaje · base anterior no positiva' : `${value.percent > 0 ? '+' : ''}${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value.percent)}%`}</p></div>;
}
function Components({ row, currency, basis }) {
    const components = capitalComponents(row, currency, basis), quality = capitalQuality(row, basis);
    return <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold">{capitalPeriodLabel(row.period)}</p><QualityBadge row={row} basis={basis}/></div>
        {components.length ? <dl className="divide-y divide-crm-border rounded-xl border border-crm-border bg-crm-bg px-3">{components.map(component => <div key={component.key} className="flex items-start justify-between gap-4 py-3"><div className="min-w-0"><dt className="text-sm text-crm-fg">{component.sign} {component.label}</dt>{component.description && <p className="mt-1 text-xs text-crm-fg-muted">{component.description}</p>}</div><dd className="shrink-0 text-sm font-bold">{capitalMoney(component.value, currency)}</dd></div>)}</dl> : <p className="text-sm text-crm-fg-muted">Este registro no tiene una composición detallada disponible.</p>}
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
    const [currency, setCurrency] = useState('ARS'), [basis, setBasis] = useState('cost');
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
    const current = data?.current, currentQuality = current ? capitalQuality(current, basis) : null;
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
        <CrmPageHeader title="Capital mensual" subtitle="Evolución del capital de AutoSporting, mes a mes." actions={<>
            <CrmButton type="button" variant="secondary" disabled={loading || capturing} onClick={() => setGeneration(value => value + 1)}><RefreshCw size={16} className={loading ? 'animate-spin' : undefined}/>Actualizar</CrmButton>
            {canWrite && <CrmButton type="button" disabled={!captureAllowed || loading || capturing} onClick={() => { setCaptureError(''); setCaptureOpen(true); }}><Save size={16}/>Guardar registro actual</CrmButton>}
        </>}/>
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-label="Capital actual por moneda">{['ARS', 'USD'].map(value => <article key={value} className="rounded-2xl border border-crm-border bg-crm-surface p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-crm-fg-muted">Capital actual · {value}</p><h2 className="mt-3 break-words text-2xl font-black text-crm-fg">{current ? capitalMoney(capitalValue(current, value, basis), value) : 'Consultando…'}</h2></div><span className="rounded-xl bg-crm-red/10 p-2.5 text-crm-red"><Landmark size={21}/></span></div><div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-300">Mes en curso</span>{current && <QualityBadge row={current} basis={basis}/>}</div><p className="mt-2 text-xs text-crm-fg-muted">{basis === 'cost' ? 'Capital propio a costo' : 'Estimación a precio publicado'}{currentQuality?.partial ? ' · Subtotal conocido' : ''}</p>{current && <p className="mt-2 text-xs text-crm-fg-muted">Consultado: {capitalMoment(current.asOf || current.capturedAt)}</p>}</article>)}</section>
        <section className="flex flex-col gap-4 rounded-xl border border-crm-border bg-crm-surface p-4 lg:flex-row lg:items-end" aria-label="Filtros del capital mensual">
            <label className="space-y-1.5 text-xs font-bold text-crm-fg-muted"><span className="block">Desde</span><input type="month" aria-label="Desde" value={from} max={to || period} onChange={event => setFrom(event.target.value)} className={inputClass}/></label>
            <label className="space-y-1.5 text-xs font-bold text-crm-fg-muted"><span className="block">Hasta</span><input type="month" aria-label="Hasta" value={to} min={from} max={period} onChange={event => setTo(event.target.value)} className={inputClass}/></label>
            <div><label htmlFor="capital-currency" className="mb-1.5 block text-xs font-bold text-crm-fg-muted">Moneda del gráfico y del historial</label><select id="capital-currency" value={currency} onChange={event => setCurrency(event.target.value)} className={inputClass}><option value="ARS">ARS · Pesos</option><option value="USD">USD · Dólares</option></select></div>
            <div className="min-w-0 flex-1"><label htmlFor="capital-basis" className="mb-1.5 block text-xs font-bold text-crm-fg-muted">Criterio de valuación</label><select id="capital-basis" value={basis} onChange={event => setBasis(event.target.value)} className={`${inputClass} w-full`}><option value="cost">Capital propio a costo · recomendado</option><option value="published">Precio publicado · escenario comercial</option></select></div>
            {data?.firstRecordedPeriod && <CrmButton type="button" variant="ghost" disabled={loading} onClick={() => { setFrom(data.firstRecordedPeriod < shiftCapitalPeriod(period, -59) ? shiftCapitalPeriod(period, -59) : data.firstRecordedPeriod); setTo(period); }}>{data.firstRecordedPeriod < shiftCapitalPeriod(period, -59) ? 'Últimos 60 meses' : 'Desde el primer registro'}</CrmButton>}
        </section>
        <p className="rounded-xl border border-crm-border bg-crm-surface p-4 text-sm text-crm-fg-muted"><strong className="text-crm-fg">Para seguir el capital registrado mes a mes, usá costo.</strong> Conservá el mismo criterio en todos los períodos. El precio publicado incluye margen esperado que todavía puede negociarse; cambiar el precio de un vehículo no significa haber ganado ese dinero. La variación patrimonial puede incluir aportes o retiros del dueño y, en pesos, cambios nominales por inflación: no equivale por sí sola a rentabilidad.</p>
        {current && <CapitalStockComparison current={current} currency={currency} basis={basis}/>}
        {!validRange && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-300">Elegí un período de hasta 60 meses que termine como máximo en el mes actual.</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-crm-fg">{notice}</p>}
        {error && <div role="alert" className="space-y-2 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-300"><p>{error}</p><CrmButton type="button" variant="secondary" onClick={() => setGeneration(value => value + 1)}>Reintentar consulta</CrmButton></div>}
        {loading && <p role="status" className="flex items-center gap-2 text-sm text-crm-fg-muted"><Loader2 size={16} className="animate-spin"/>Consultando capital e historial…</p>}
        {data && validRange && <>
            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5" aria-label="Gráfico de capital mensual"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-bold text-crm-fg"><CalendarRange size={18} className="text-crm-red"/>Evolución del capital · {currency}</h2><p className="mt-1 text-xs text-crm-fg-muted">{basis === 'cost' ? 'Stock propio a costo + caja y bancos + cartera propia − obligaciones.' : 'Escenario comercial con el stock a precio publicado.'}</p></div><span className="text-xs text-crm-fg-muted">{available.length} meses con registros guardados</span></div><CapitalHistoryChart rows={rows} current={current} currency={currency} basis={basis}/></section>
            <p className="rounded-xl border border-crm-border bg-crm-surface p-4 text-sm text-crm-fg-muted">{data.firstRecordedPeriod ? `El historial tiene registros desde ${capitalPeriodLabel(data.firstRecordedPeriod).toLowerCase()}.` : 'Todavía no hay registros de capital guardados.'} Cada mes conserva su último registro observado; la fecha de captura indica a qué momento corresponde.{data.schedule?.description ? ' ' + data.schedule.description : ''}</p>
            {data.historyAssessment?.message && <p className="rounded-xl border border-crm-border bg-crm-surface p-4 text-sm text-crm-fg-muted">{data.historyAssessment.message}</p>}
            <section aria-label="Historial mensual de capital" className={loading ? 'space-y-3 opacity-60' : 'space-y-3'}>
                <div className="hidden grid-cols-[1fr_1.3fr_1.4fr_1.2fr_1fr] gap-4 px-4 text-[10px] font-bold uppercase tracking-wide text-crm-fg-muted xl:grid"><span>Mes / estado</span><span>Capital · {currency}</span><span>Variación vs. mes anterior</span><span>Fecha / calidad</span><span>Composición</span></div>
                {[...rows].reverse().map(row => { const missing = row.status === 'missing', quality = capitalQuality(row, basis), amount = capitalValue(row, currency, basis); return <article key={row.period} data-capital-period={row.period} className="grid grid-cols-1 gap-4 rounded-xl border border-crm-border bg-crm-surface p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1.3fr_1.4fr_1.2fr_1fr] xl:items-center">
                    <div><h3 className="text-sm font-bold text-crm-fg">{capitalPeriodLabel(row.period)}</h3><p className={`mt-1 text-xs ${missing ? 'text-crm-fg-muted' : row.status === 'current' ? 'text-amber-300' : 'text-crm-fg-muted'}`}>{capitalStatusLabel(row)}</p></div>
                    <div><p className="text-[10px] font-bold uppercase text-crm-fg-muted xl:hidden">Capital · {currency}</p><p className="mt-1 text-base font-bold text-crm-fg">{missing ? '—' : capitalMoney(amount, currency)}</p>{!missing && quality.partial && <p className="mt-1 text-xs text-amber-300">Subtotal conocido</p>}</div>
                    <div><p className="mb-1 text-[10px] font-bold uppercase text-crm-fg-muted xl:hidden">Variación vs. mes anterior</p>{missing ? <span className="text-xs text-crm-fg-muted">Sin comparación</span> : <Difference value={capitalChange(row, rowsByPeriod.get(shiftCapitalPeriod(row.period, -1)), currency, basis)} currency={currency}/>}</div>
                    <div>{missing ? <p className="text-xs text-crm-fg-muted">No hay un registro guardado.</p> : <><p className="mb-2 text-xs text-crm-fg-muted">{capitalMoment(row.asOf || row.capturedAt)}</p><QualityBadge row={row} basis={basis}/></>}</div>
                    <div>{!missing && <CrmButton type="button" variant="secondary" size="sm" onClick={() => setDetail(row)} disabled={loading}>Ver composición<ChevronDown size={14}/></CrmButton>}</div>
                </article>; })}
            </section>
            <details className="rounded-xl border border-crm-border bg-crm-surface p-4"><summary className="cursor-pointer text-sm font-bold text-crm-fg">Qué incluye el capital</summary><div className="mt-3 space-y-2 text-xs leading-relaxed text-crm-fg-muted"><p>Se utiliza el cálculo patrimonial existente del CRM: participación propia del stock disponible, caja y bancos, cartera propia pendiente, créditos verificados y obligaciones registradas. Los pagos registrados sin cuenta asignada se descuentan hasta su conciliación.</p><p>ARS y USD permanecen separados. Cada mes conserva el último registro observado con su fecha real de captura; no se presenta como un cierre exacto de fin de mes. La consulta actual se muestra por separado.</p><p>Las diferencias sólo comparan meses consecutivos con registros completos y el mismo criterio de cálculo. El porcentaje se calcula cuando el capital anterior es positivo; con base cero o negativa se conserva la diferencia en importe.</p></div></details>
        </>}
        {captureOpen && current && <CrmModal isOpen onClose={closeCapture} hideCloseButton={capturing} title="Guardar capital actual" footer={<div className="flex flex-wrap justify-end gap-2"><CrmButton type="button" variant="ghost" disabled={capturing} onClick={closeCapture}>Volver</CrmButton><CrmButton type="submit" form="capture-capital" disabled={capturing}>{capturing ? 'Guardando…' : 'Confirmar registro'}</CrmButton></div>}><form id="capture-capital" onSubmit={capture} className="space-y-4 p-4 sm:p-5"><p className="text-sm font-bold">{capitalPeriodLabel(current.period)} · Capital propio a costo</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{['ARS', 'USD'].map(value => <div key={value} className="rounded-xl border border-crm-border bg-crm-bg p-4"><p className="text-xs text-crm-fg-muted">{value}</p><p className="mt-2 text-lg font-bold">{capitalMoney(capitalValue(current, value, 'cost'), value)}</p></div>)}</div><p className="text-xs text-crm-fg-muted">Consultado: {capitalMoment(current.asOf || current.capturedAt)} · Hora argentina.</p>{capitalQuality(current, 'cost').partial && <p className="flex gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-200"><AlertCircle size={16} className="shrink-0"/>El registro conservará la advertencia de datos parciales y los subtotales conocidos.</p>}<p className="text-sm text-crm-fg-muted">Se guardarán los importes calculados por el CRM y su composición. Los registros de otros meses conservan sus valores.</p>{captureError && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-300">{captureError}</p>}</form></CrmModal>}
        {detail && <CrmModal isOpen onClose={closeDetail} title="Composición del capital" maxWidth="max-w-2xl"><div className="p-4 sm:p-5"><Components row={detail} currency={currency} basis={basis}/></div></CrmModal>}
    </div>;
}
