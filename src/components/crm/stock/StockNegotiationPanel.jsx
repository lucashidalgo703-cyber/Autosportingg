"use client";
import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Calculator, PencilLine, RefreshCw, Search, Settings2, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import CrmButton from '../ui/CrmButton';
import CrmPagination from '../ui/CrmPagination';
import StockNegotiationRuleEditor from './StockNegotiationRuleEditor';
import { normalizeVehiclePlate } from '../../../utils/vehiclePlate';
import styles from './StockNegotiationPanel.module.css';

const endpoint = '/api/admin/stock/negotiation';
const columns = [['published', 'Publicado'], ['first_discount', 'Primera rebaja'], ['suggested_close', 'Cierre sugerido'], ['floor', 'Piso autorizado']];
const finite = value => value !== null && value !== undefined && Number.isFinite(Number(value));
const money = (value, currency) => !finite(value) ? 'Dato pendiente' : !['ARS', 'USD'].includes(currency) ? 'Moneda pendiente' : `${currency === 'ARS' ? '$' : currency} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number(value))}`;
const ruleLabel = rule => !rule ? 'Sin configurar' : rule.mode === 'percent' ? `${Number(rule.value).toLocaleString('es-AR')}% sobre el costo total invertido` : `${money(rule.value, 'ARS')} de ganancia mínima`;
const commissionText = (commission, currency) => {
    const rate = finite(commission?.effectivePercent) ? `${Number(commission.effectivePercent).toLocaleString('es-AR')}% sobre el precio` : 'Porcentaje pendiente';
    const extra = finite(commission?.fixedAmount) && commission.fixedAmount > 0 ? ` + ${money(commission.fixedAmount, currency)} fijos` : commission?.rawFixedAmount > 0 && !finite(commission.fixedAmount) ? ' + adicional pendiente de convertir' : '';
    return `Comisión: ${rate}${extra}${commission?.sourceLabel || commission?.label ? ' · ' + (commission.sourceLabel || commission.label) : ''}`;
};
const rateDate = value => {
    const date = value ? new Date(value) : null;
    return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' }).format(date) : '';
};
const titleOf = row => row.title || [row.brand, row.model, row.year].filter(Boolean).join(' ') || 'Unidad';
const issuesOf = value => Array.isArray(value) ? value.map(issue => typeof issue === 'string' ? issue : issue?.message).filter(Boolean) : [];
const desktopQuery = '(min-width: 1100px)';
const subscribeViewport = callback => { const media = window.matchMedia(desktopQuery); media.addEventListener('change', callback); return () => media.removeEventListener('change', callback); };
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverSnapshot = () => false;

async function request(url, token, { method = 'GET', body, signal } = {}) {
    const response = await fetch(url, { method, signal, cache: 'no-store', credentials: 'same-origin', referrerPolicy: 'no-referrer',
        headers: { Authorization: 'Bearer ' + token, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(result.message || result.error || 'No se pudo consultar la negociación. Volvé a intentar.'), { status: response.status });
    return result;
}

function PendingFields({ values }) {
    const issues = issuesOf(values);
    return issues.length ? <ul className={styles.pendingList}>{issues.map((message, index) => <li key={message + index}>{message}</li>)}</ul> : null;
}
function PriceValue({ step, currency, shared, missing = false }) {
    if (!step) return <span className={styles.muted}>{missing ? 'Dato pendiente' : '—'}</span>;
    return <><strong className={styles.price}>{money(step.price, currency)}</strong><span className={styles.profit}>{shared ? 'Ganancia total' : 'Ganancia'}: {money(step.profit, currency)}</span>{shared && <span className={styles.agency}>AutoSporting: {money(step.agencyProfit, currency)}</span>}</>;
}
function VehicleInfo({ row }) {
    const issues = issuesOf(row.missingFields);
    return <><strong className={styles.vehicleTitle}>{titleOf(row)}</strong><p className={styles.vehicleMeta}><span className={styles.plate}>Dominio: {row.plate || 'Sin dominio'}</span>{row.ownership?.label ? ' · ' + row.ownership.label : ''}</p>
        {row.status === 'below_floor' && <span className={styles.badge}><ShieldAlert size={14} aria-hidden="true"/>Revisar precio publicado</span>}
        {issues.length > 0 && <PendingFields values={row.missingFields}/>}
        <p className={styles.vehicleMeta}>{row.ruleSource === 'vehicle' ? 'Mínimo particular' : row.ruleSource === 'general' ? 'Mínimo general' : 'Mínimo pendiente'}{row.effectiveRule ? ': ' + ruleLabel(row.effectiveRule) : ''}</p>
    </>;
}
function PlateEditor({ row, onSave, onClose }) {
    const [value, setValue] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const submit = async event => {
        event.preventDefault();
        if (busyRef.current) return;
        const plate = normalizeVehiclePlate(value);
        if (!plate) { setError('Ingresá un dominio completo, por ejemplo ABC123 o AA123BB.'); return; }
        busyRef.current = true; setBusy(true); setError('');
        try { await onSave(plate); }
        catch (cause) { setError(cause.message || 'No se pudo confirmar el dominio. Reintentá el mismo envío.'); }
        finally { busyRef.current = false; setBusy(false); }
    };
    return <section className={styles.offer} aria-label={`Completar dominio de ${titleOf(row)}`} data-negotiation-plate={row.id}>
        <h3>Completar dominio · {titleOf(row)}</h3>
        <p className={styles.muted}>Verificá la patente antes de guardar. Las correcciones de un dominio ya cargado se realizan desde Stock.</p>
        <form className={styles.offerForm} onSubmit={submit}>
            <label>Dominio<input className={styles.input} name="plateOrVin" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12} placeholder="ABC123 o AA123BB" value={value} onChange={event => { setValue(event.target.value.toUpperCase()); setError(''); }} disabled={busy} required/></label>
            <div className={styles.actions}><CrmButton type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar dominio'}</CrmButton><CrmButton type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancelar</CrmButton></div>
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
    </section>;
}
function OfferSimulator({ row, token, onClose }) {
    const [amount, setAmount] = useState(''), [result, setResult] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const current = useRef(0), inputRef = useRef(null);
    useEffect(() => { inputRef.current?.focus(); return () => { current.current++; }; }, []);
    const simulate = async event => {
        event.preventDefault(); if (busy) return;
        const numeric = Number(amount.replace(',', '.'));
        if (amount.trim() === '' || !Number.isFinite(numeric) || numeric <= 0) { setError('Ingresá una oferta de contado mayor a cero.'); return; }
        const generation = ++current.current;
        setBusy(true); setError(''); setResult(null);
        try { const response = await request(endpoint + '/' + encodeURIComponent(row.id) + '/simulate', token, { method: 'POST', body: { amount: numeric } }); if (generation === current.current) setResult(response); }
        catch (err) { if (generation === current.current) setError(err.message); }
        finally { if (generation === current.current) setBusy(false); }
    };
    const shared = Boolean(row.ownership?.shared);
    const currency = result?.currency || row.currency;
    return <section className={styles.offer} aria-label={`Probar oferta de ${titleOf(row)}`} data-negotiation-offer={row.id}>
        <h3>Probar oferta · {titleOf(row)}</h3><p className={styles.muted}>Consulta de contado. El precio publicado y los datos de la unidad se conservan.</p>
        <form className={styles.offerForm} onSubmit={simulate}>
            <label>Oferta de contado ({row.currency || 'moneda pendiente'})<input ref={inputRef} className={styles.input} type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" placeholder="Importe sin separadores de miles" value={amount} onChange={event => { setAmount(event.target.value); setResult(null); setError(''); }} disabled={busy || !row.currency} required /></label>
            <div className={styles.actions}><CrmButton type="submit" disabled={busy || !row.currency}>{busy ? 'Calculando…' : 'Calcular oferta'}</CrmButton><CrmButton type="button" variant="ghost" disabled={busy} onClick={onClose}>Cerrar</CrmButton></div>
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {result && <div className={styles.offerResult} data-result={result.status} role="status" data-negotiation-offer-result>
            <strong>{result.message || 'La oferta requiere revisar los datos pendientes.'}</strong>
            <div className={styles.gainGrid}><div><span>Oferta de contado</span><b>{money(result.amount, currency)}</b></div><div><span>{shared ? 'Ganancia total estimada' : 'Ganancia estimada'}</span><b>{money(result.profit, currency)}</b></div>{shared && <div><span>Parte de AutoSporting</span><b>{money(result.agencyProfit, currency)}</b></div>}{finite(result.floor) && <div><span>Piso autorizado</span><b>{money(result.floor, currency)}</b></div>}</div>
            <PendingFields values={result.missingFields || (result.status === 'pending' ? row.missingFields : [])}/>
        </div>}
    </section>;
}

export default function StockNegotiationPanel() {
    const { token, loading: authLoading } = useAuth();
    const desktop = useSyncExternalStore(subscribeViewport, desktopSnapshot, serverSnapshot);
    const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [page, setPage] = useState(1), [version, setVersion] = useState(0);
    const [snapshot, setSnapshot] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
    const [expanded, setExpanded] = useState(null), [globalEditor, setGlobalEditor] = useState(false);
    const [ruleNotice, setRuleNotice] = useState('');
    useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
    const key = JSON.stringify([token, query, page]);
    const data = snapshot?.key === key ? snapshot.data : null;
    const refresh = useCallback(() => setVersion(value => value + 1), []);
    useEffect(() => {
        if (!token) { setSnapshot(null); setLoading(Boolean(authLoading)); return; }
        const controller = new AbortController(); let active = true;
        setLoading(true); setError('');
        request(endpoint + '?' + new URLSearchParams({ page: String(page), limit: '20', search: query }), token, { signal: controller.signal })
            .then(result => { if (active) setSnapshot({ key, data: result }); })
            .catch(err => { if (active && err.name !== 'AbortError') { setSnapshot(null); setError(err.message); } })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; controller.abort(); };
    }, [token, authLoading, query, page, version, key]);
    const items = data?.items || [], canConfigure = Boolean(data?.canConfigure);
    const actionsLoading = loading || search.trim() !== query;
    const updateRule = async (row, rule, remove = false) => {
        setRuleNotice('');
        try {
            await request(row ? endpoint + '/' + encodeURIComponent(row.id) + '/rule' : endpoint + '/rule', token, { method: remove ? 'DELETE' : 'PUT',
                body: { ...(remove ? {} : { rule }), expectedRevision: row ? row.ruleRevision : data?.ruleRevision } });
            setGlobalEditor(false); setExpanded(null); setRuleNotice(remove ? 'La unidad vuelve a usar el mínimo general.' : row ? 'Mínimo particular actualizado.' : 'Mínimo general actualizado.'); refresh();
        } catch (err) { if (err.status === 409) { setRuleNotice(err.message); refresh(); } throw err; }
    };
    const expand = (row, mode) => setExpanded(previous => previous?.id === row.id && previous.mode === mode ? null : { id: row.id, mode });
    const completePlate = async (row, plate) => {
        setRuleNotice('');
        try {
            const saved = await request(endpoint + '/' + encodeURIComponent(row.id) + '/plate', token, { method: 'PATCH', body: { plateOrVin: plate } });
            setExpanded(null); setRuleNotice(`Dominio ${saved.plate} guardado.`); refresh();
            window.dispatchEvent(new CustomEvent('crm:stock-changed', { detail: { vehicleId: row.id } }));
            try { localStorage.setItem('crm:stock-changed', `${Date.now()}:${row.id}`); } catch {}
        } catch (cause) {
            if (cause.status === 409) { setExpanded(null); setRuleNotice(cause.message); refresh(); }
            throw cause;
        }
    };
    const rowActions = row => <div className={styles.rowActions}><CrmButton type="button" variant="secondary" onClick={() => expand(row, 'offer')} disabled={actionsLoading}><Calculator size={15} aria-hidden="true"/>Probar oferta</CrmButton>{row.canCompletePlate && <CrmButton type="button" variant="secondary" onClick={() => expand(row, 'plate')} disabled={actionsLoading}><PencilLine size={14} aria-hidden="true"/>Completar dominio</CrmButton>}{canConfigure && <CrmButton type="button" variant="ghost" onClick={() => expand(row, 'rule')} disabled={actionsLoading}><Settings2 size={14} aria-hidden="true"/>Mínimo de la unidad</CrmButton>}</div>;
    const rowExpanded = row => {
        if (expanded?.id !== row.id) return null;
        if (expanded.mode === 'plate') return row.canCompletePlate ? <PlateEditor row={row} onSave={plate => completePlate(row, plate)} onClose={() => setExpanded(null)}/> : null;
        const economicKey = JSON.stringify([row.id, row.ruleRevision, row.globalRuleRevision, row.floor, row.totalCost, row.publishedPrice, row.commission]);
        return expanded.mode === 'offer' ? <OfferSimulator key={economicKey} row={row} token={token} onClose={() => setExpanded(null)}/>
            : canConfigure ? <StockNegotiationRuleEditor key={economicKey} row={row} rule={row.overrideRule} inheritedRule={data?.rule} vehicleTitle={titleOf(row)} onSave={rule => updateRule(row, rule)} onRemove={() => updateRule(row, null, true)} onCancel={() => setExpanded(null)}/> : null;
    };
    return <section className={styles.panel} aria-label="Negociación de stock" data-stock-negotiation>
        <div className={styles.intro}><div className={styles.introHeader}><h2><SlidersHorizontal size={21} aria-hidden="true"/>Negociación</h2><span className={styles.currency}>Contado · Consulta interna</span></div><p className={styles.muted}>Precios de referencia para unidades disponibles. La ganancia proyectada descuenta el costo total registrado y la comisión aplicable a cada precio.</p></div>
        <div className={styles.controls}><label className={styles.search}>Buscar unidad disponible<div className={styles.searchBox}><Search size={17} aria-hidden="true"/><input className={styles.input} value={search} onChange={event => setSearch(event.target.value)} type="search" placeholder="Marca, modelo o dominio" autoComplete="off"/></div></label><CrmButton type="button" variant="secondary" disabled={loading} onClick={refresh}><RefreshCw size={16} aria-hidden="true"/>Actualizar</CrmButton></div>
        {data && <div className={styles.ruleSummary}><div><strong>Mínimo general: {ruleLabel(data.rule)}</strong><p className={styles.muted}>Las excepciones por vehículo tienen prioridad.{data.exchangeRate?.rate ? ` · Tipo de cambio guardado en el CRM: $ ${Number(data.exchangeRate.rate).toLocaleString('es-AR')} por USD${rateDate(data.exchangeRate.lastFetchedAt || data.exchangeRate.publishedAt) ? ' · ' + rateDate(data.exchangeRate.lastFetchedAt || data.exchangeRate.publishedAt) : ''}.` : ''}</p></div>{canConfigure && <CrmButton type="button" variant="secondary" disabled={loading} onClick={() => setGlobalEditor(value => !value)}><Settings2 size={15} aria-hidden="true"/>{globalEditor ? 'Cerrar configuración' : 'Configurar mínimo general'}</CrmButton>}</div>}
        {globalEditor && canConfigure && <StockNegotiationRuleEditor key={'general:' + data?.ruleRevision} rule={data?.rule} onSave={rule => updateRule(null, rule)} onCancel={() => setGlobalEditor(false)}/>}
        {ruleNotice && <p className={styles.ruleSummary} role="status">{ruleNotice}</p>}
        {error && <div className={styles.error} role="alert"><p>{error}</p><CrmButton type="button" variant="secondary" onClick={refresh}>Reintentar consulta</CrmButton></div>}
        {loading && <p className={styles.loading} role="status">Consultando precios y ganancias…</p>}
        {!loading && data && !items.length && <p className={styles.empty}>{query ? 'No encontramos unidades disponibles para esa búsqueda.' : 'No hay unidades disponibles para negociar.'}</p>}
        {items.length > 0 && <>{desktop ? <div className={`${styles.tableWrap} ${loading ? styles.loadingOverlay : ''}`}><table className={styles.table}><thead><tr><th scope="col">Unidad disponible</th>{columns.map(([name, label]) => <th scope="col" key={name}>{label}</th>)}<th scope="col">Probar / configurar</th></tr></thead><tbody>{items.map(row => <Fragment key={row.id}><tr data-negotiation-row={row.id}><td><VehicleInfo row={row}/><div className={styles.context}><span>Costo total: {money(row.totalCost, row.currency)}</span>{row.commission && <span>{commissionText(row.commission, row.currency)}</span>}</div></td>{columns.map(([name]) => <td key={name} className={name === 'floor' ? styles.floor : undefined}><PriceValue step={row.steps?.find(step => step.key === name)} currency={row.currency} shared={Boolean(row.ownership?.shared)} missing={row.status === 'pending' && ['published', 'floor'].includes(name)}/></td>)}<td>{rowActions(row)}</td></tr>{expanded?.id === row.id && <tr className={styles.expanded}><td colSpan={6}><div className={styles.expandedContent}>{rowExpanded(row)}</div></td></tr>}</Fragment>)}</tbody></table></div>
            : <div className={`${styles.mobileList} ${loading ? styles.loadingOverlay : ''}`}>{items.map(row => <article className={styles.card} key={row.id} data-negotiation-card={row.id}><header className={styles.cardHead}><div><VehicleInfo row={row}/></div><span className={styles.currency}>{row.currency || 'Moneda pendiente'}</span></header><div className={styles.context}><span>Costo total: {money(row.totalCost, row.currency)}</span>{row.commission && <span>{commissionText(row.commission, row.currency)}</span>}</div><div className={styles.priceGrid}>{columns.filter(([name]) => row.steps?.some(step => step.key === name) || ['published', 'floor'].includes(name) && row.status === 'pending').map(([name, label]) => <div key={name} className={`${styles.priceTile} ${name === 'floor' ? styles.floor : ''}`}><span className={styles.priceLabel}>{label}</span><PriceValue step={row.steps?.find(step => step.key === name)} currency={row.currency} shared={Boolean(row.ownership?.shared)} missing={row.status === 'pending'}/></div>)}</div>{rowActions(row)}{expanded?.id === row.id && <div className="mt-4">{rowExpanded(row)}</div>}</article>)}</div>}
            <CrmPagination currentPage={data.page || page} totalPages={data.pages || 1} totalItems={data.total || 0} limit={data.limit || 20} onPageChange={next => { setExpanded(null); setPage(next); }} disabled={loading}/></>}
    </section>;
}
