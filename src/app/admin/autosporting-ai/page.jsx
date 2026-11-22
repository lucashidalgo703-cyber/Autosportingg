"use client";

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { canReadFinancialPilot } from '../../../utils/adminPermissions';
import FinancialDirectionChat from './FinancialDirectionChat';
import FinancialAnalysisPanel from './FinancialAnalysisPanel';
import GeneralAgencyChat from './GeneralAgencyChat';
import CrmQuoteProposal from './CrmQuoteProposal';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';

const endpoint = '/api/admin/autosporting-ai';
const panel = 'rounded-xl border border-crm-border bg-crm-surface p-4 md:p-5';
const field = 'min-h-10 w-full rounded-lg border border-crm-border bg-crm-bg px-3 text-crm-fg';
const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-crm-border px-3 text-sm font-semibold text-crm-fg hover:bg-crm-bg disabled:opacity-50';
const labels = {
    registered: 'Efectivo registrado', reconciled: 'Efectivo conciliado', restricted: 'Fondos restringidos', usable: 'Caja utilizable',
    inventory: 'Inventario económico', receivables: 'Créditos', liabilities: 'Pasivos', partnerPayable: 'Saldo con socios',
    assets: 'Activos', equity: 'Patrimonio', result: 'Resultado'
};
const alertLabels = {
    duplicate_obligation: 'Obligación duplicada', missing_fx: 'Cotización necesaria', material_data_missing: 'Dato material faltante',
    cash_below_floor: 'Caja bajo el piso', unknown_participation: 'Participación desconocida'
};
const qualityLabels = { verified: 'Verificado en la muestra', partial: 'Datos parciales', unknown: 'Desconocido',
    stale: 'Desactualizado', not_calculable: 'No calculable' };
const number = new Intl.NumberFormat('es-AR');
const money = (amount, currency = 'ARS') => amount == null ? 'Datos insuficientes' : currency + ' ' + number.format(amount);
const displayDate = value => value?.slice(0, 10).split('-').reverse().join('/') ?? '—';

async function request(token, path, signal, body) {
    const response = await fetch(endpoint + path, {
        method: body ? 'POST' : 'GET', signal, cache: 'no-store',
        headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401) window.dispatchEvent(new Event('autosporting-auth-expired'));
        throw new Error(payload.message || 'No se pudo consultar el piloto.');
    }
    return payload;
}

function TradeWorkbookPanel({token,openAiReady,setupAvailable,onConnect}) {
    const [file,setFile] = useState(null);
    const [result,setResult] = useState(null);
    const [error,setError] = useState('');
    const [testing,setTesting] = useState(null);
    const [connecting,setConnecting] = useState(false);

    async function configureOpenAi(event) {
        event.preventDefault();
        if (connecting) return;
        const form = event.currentTarget;
        const key = new FormData(form).get('key');
        form.reset();
        setError('');
        setConnecting(true);
        try {
            await request(token,'/trade-workbook/connect',undefined,{key});
            onConnect();
        } catch (failure) { setError(failure.message); }
        finally { setConnecting(false); }
    }

    async function testWorkbook(event) {
        event.preventDefault();
        if (!file || testing) return;
        const mode = event.nativeEvent.submitter?.value === 'openai' ? 'openai' : 'local';
        if (mode==='openai' && !openAiReady) return;
        setError('');
        setResult(null);
        if (!/\.xlsx$/i.test(file.name) || !file.size || file.size>2_000_000) {
            setError('Seleccioná un archivo .xlsx de hasta 2 MB.');
            return;
        }
        setTesting(mode);
        try {
            const response = await fetch(endpoint+'/trade-workbook'+(mode==='openai' ? '/openai' : ''),{
                method:'POST',cache:'no-store',body:file,
                headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream'}
            });
            const data = await response.json().catch(()=>({}));
            if (response.status===401) window.dispatchEvent(new Event('autosporting-auth-expired'));
            if (!response.ok) throw new Error(data.message || 'No se pudo probar el Excel.');
            setResult(data);
        } catch (failure) { setError(failure.message); }
        finally { setTesting(null); }
    }

    return <section className={panel} aria-labelledby="trade-workbook-title">
        <h2 className="font-semibold" id="trade-workbook-title">Probar permuta desde Excel</h2>
        <p className="mt-1 text-sm text-crm-fg-muted">El Excel y los cálculos quedan en el piloto local. La prueba con OpenAI solo envía dos instrucciones genéricas para clasificar la carga y el cobro.</p>
        <form onSubmit={testWorkbook} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">Archivo de permuta (.xlsx)
                <input className={field} type="file" accept=".xlsx" disabled={Boolean(testing)} onChange={event=>{
                    setFile(event.target.files?.[0] ?? null); setError(''); setResult(null);
                }} />
            </label>
            <button className={button} disabled={!file || Boolean(testing)} type="submit" value="local">{testing==='local' ? 'Probando…' : 'Probar Excel'}</button>
            <button className={button} disabled={!file || Boolean(testing) || !openAiReady} type="submit" value="openai">{testing==='openai' ? 'Consultando OpenAI…' : 'Probar con OpenAI'}</button>
        </form>
        {!openAiReady && <p className="mt-2 text-sm text-crm-fg-muted">Conexión de prueba con OpenAI pendiente. Podés usar la prueba local.</p>}
        {!openAiReady && setupAvailable && <form onSubmit={configureOpenAi} className="mt-3 flex flex-wrap items-end gap-3" autoComplete="off">
            <label className="grid gap-1 text-sm">Clave de prueba de OpenAI
                <input className={field} type="password" name="key" autoComplete="off" maxLength={515} required disabled={connecting} />
            </label>
            <button className={button} type="submit" disabled={connecting}>{connecting ? 'Configurando…' : 'Configurar conexión de prueba'}</button>
            <p className="basis-full text-sm text-crm-fg-muted">La clave queda en memoria del piloto hasta que se cierre el servidor.</p>
        </form>}
        {error && <p className="mt-3 whitespace-pre-line text-sm text-red-500" role="alert">{error}</p>}
        {result && <div className="mt-4 overflow-x-auto" aria-live="polite">
            <p className="mb-2 text-sm font-semibold">Los resultados coinciden con los controles del Excel.</p>
            {result.model && <p className="mb-2 text-sm">OpenAI verificó las intenciones con {result.model}. El Excel se procesó localmente.</p>}
            <table className="w-full text-sm">
                <thead><tr className="text-left"><th scope="col">Indicador</th><th scope="col">Antes del cobro</th><th scope="col">Después del cobro</th></tr></thead>
                <tbody>{[['Saldo por cobrar','creditRemaining'],['Caja mínima bajo estrés','cashMinimum'],['Resultado para la agencia','agencyResult']].map(([label,key])=><tr key={key} className="border-t border-crm-border">
                    <th className="py-2 pr-3 text-left font-medium" scope="row">{label}</th>
                    {[['before',result.before],['after',result.after]].map(([stage,values])=><td className="py-2 pr-3" key={stage}>
                        {money(values[key],result.currency)}{key==='cashMinimum' && <span className="block text-crm-fg-muted">{displayDate(values.minimumDate)}</span>}
                    </td>)}
                </tr>)}</tbody>
            </table>
        </div>}
    </section>;
}

function Projection({ projection }) {
    if (!projection.minimum) return <p>{qualityLabels[projection.quality]}</p>;
    const { series, floor, currency, minimum, gap } = projection;
    const low = Math.min(floor, minimum.free), high = Math.max(floor, ...series.map(point => point.free));
    const height = value => 112 - 94 * (value - low) / (high - low || 1);
    const chart = series.map(({ free }, index) => (index * 580 / Math.max(1, series.length - 1) + 10) + ',' + height(free)).join(' ');
    return <>
        <dl className="grid gap-3 sm:grid-cols-3">
            <div><dt className="text-crm-fg-muted">Mínimo de caja</dt><dd className="text-lg font-bold">{money(minimum.free, currency)}</dd><dd>{displayDate(minimum.date)}</dd></div>
            <div><dt className="text-crm-fg-muted">Piso de liquidez</dt><dd className="text-lg font-bold">{money(floor, currency)}</dd></div>
            <div><dt className="text-crm-fg-muted">Faltante frente al piso</dt><dd className="text-lg font-bold">{money(gap, currency)}</dd></div>
        </dl>
        <svg viewBox="0 0 600 130" className="my-3 w-full max-h-44" role="img" aria-label="Serie diaria de caja libre y piso">
            <line x1="10" x2="590" y1={height(floor)} y2={height(floor)} stroke="#f59e0b" strokeDasharray="5 4" />
            <polyline points={chart} stroke="#38bdf8" strokeWidth="3" fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="flex justify-between text-xs text-crm-fg-muted"><span>{displayDate(series[0].date)}</span><span>{displayDate(series.at(-1).date)} · {projection.horizon} días</span></div>
        <details className="mt-4"><summary className="cursor-pointer font-semibold">Flujos por fecha</summary>
            <ul className="mt-2 space-y-1">{projection.scheduled.map((flow, index) => <li key={flow.id + index}>
                {displayDate(flow.date)} · {flow.id} · {money(flow.amount, flow.currency)}
                {flow.restrictedAccount ? ' · cuenta restringida' : ''}{flow.day > projection.horizon ? ' · fuera del horizonte' : ''}
            </li>)}</ul>
        </details>
    </>;
}

function Report({ report }) {
    return <>
        <div className="text-sm text-crm-fg-muted">Corte {displayDate(report.cutoff)} · {qualityLabels[report.quality]} · Política sintética {report.policyVersion}</div>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">{Object.entries(labels).map(([key, label]) => <div className={panel} key={key}>
            <dt className="text-xs font-semibold text-crm-fg-muted">{label}</dt>
            <dd className="mt-2 text-lg font-bold" data-indicator={key}>{money(report.indicators[key].amount, report.currency)}</dd>
        </div>)}</dl>
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <section className={panel}><h2 className="mb-3 text-lg font-semibold">Proyección de caja</h2><Projection projection={report.projection} /></section>
            <section className={panel}><h2 className="text-lg font-semibold">Capacidad de reinversión</h2>
                <p className="my-2 text-3xl font-black" data-capacity>{money(report.projection.capacity, report.currency)}</p>
                <p className="text-sm text-crm-fg-muted">Holgura entre el mínimo de caja proyectada y el piso. Incluyendo ambos escenarios: {money(report.robustCapacity, report.currency)}.</p>
                <h3 className="mb-2 mt-4 font-semibold">Alertas determinísticas</h3>
                {report.alerts.length ? <ul className="space-y-2 text-sm">{report.alerts.map((alert, index) =>
                    <li key={index} className="rounded-lg border border-amber-500/30 p-2">{alertLabels[alert.code]} {alert.amount != null ? '· ' + money(alert.amount, report.currency) : ''}{alert.sample ? ' · ' + alert.sample : ''}</li>
                )}</ul> : <p className="text-sm text-crm-fg-muted">Sin alertas para esta selección.</p>}
            </section>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
            <section className={panel}><h2 className="mb-3 text-lg font-semibold">Comparación con octubre v1</h2>
                <table className="w-full text-left text-sm"><thead><tr><th>Indicador</th><th>Original</th><th>Selección</th></tr></thead>
                    <tbody>{['registered','liabilities','equity','result'].map(key => <tr key={key} className="border-t border-crm-border">
                        <th scope="row" className="py-2 font-medium">{labels[key]}</th><td>{money(report.comparison.original[key], report.currency)}</td><td>{money(report.comparison.selected[key], report.currency)}</td>
                    </tr>)}</tbody>
                </table>
                {report.evidence.adjustments.map(entry => <p className="text-sm" key={entry.id}>Ajuste {entry.origin} · económico {displayDate(entry.date)} · registro {displayDate(entry.recorded)}</p>)}
            </section>
            <section className={panel}><h2 className="mb-3 text-lg font-semibold">Evidencia y conciliación</h2>
                <p className="text-sm">{report.closing.reconciliations.length ? 'Revisión pendiente: ' + report.closing.reconciliations.map(item => item.id).join(', ') : 'Sin diferencias pendientes en esta muestra.'}</p>
                <p className="mt-2 text-sm">Puente de caja: {money(report.closing.cashBridge.operating)} de operación y {money(report.closing.cashBridge.financing)} de financiación y socios.</p>
                <details className="mt-3"><summary className="cursor-pointer font-semibold">Origen de cuentas, movimientos e inventario</summary>
                    <ul className="mt-2 space-y-1 text-sm">{report.closing.accounts.map(account => <li key={account.account}>{account.source} · {money(account.registered)} · {qualityLabels[account.quality]}</li>)}
                        {report.evidence.entries.map(entry => <li key={entry.id}>{entry.origin} · {displayDate(entry.date)}</li>)}
                        {report.closing.inventoryPosition.purchases.map(item => <li key={item.id}>Unidad {item.id} · costo {money(item.cost)} · pagado {money(item.paid)} · pendiente {money(item.pending)}</li>)}
                    </ul>
                </details>
                <details className="mt-3"><summary className="cursor-pointer font-semibold">Resultado por operación y saldos</summary>
                    <ul className="mt-2 space-y-1 text-sm">
                        {report.closing.operations.map(operation => <li key={operation.operationId}>Operación {operation.operationId} · margen {money(operation.margin)} · contribución {money(operation.contribution)}</li>)}
                        {Object.values(report.closing.balances).flat().filter(item => item.amount).map(item => <li key={item.id}>{item.id} · {money(item.amount)}</li>)}
                    </ul>
                </details>
                <details className="mt-3"><summary className="cursor-pointer font-semibold">Casos sintéticos separados del cierre</summary>
                    <ul className="mt-2 space-y-1 text-sm">
                        <li>Cartera nominal {money(report.attribution.nominal)} · pendiente de atribuir {money(report.attribution.unattributed)}</li>
                        <li>Financiación · principal pendiente {money(report.isolatedCases.financing.principal)} · interés contractual {money(report.isolatedCases.financing.contractualInterest)} · interés reconocido {money(report.isolatedCases.financing.recognizedInterest)}</li>
                        <li>Permuta · contribución por tramo {report.isolatedCases.tradeChain.map(item => money(item.contribution)).join(' y ')}</li>
                    </ul>
                </details>
            </section>
        </div>
    </>;
}

function Pilot({ token }) {
    const [catalog, setCatalog] = useState(null);
    const [sampleId, setSampleId] = useState('');
    const [variant, setVariant] = useState('original');
    const [scenario, setScenario] = useState('base');
    const [generation, setGeneration] = useState(0);
    const [report, setReport] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [simulation, setSimulation] = useState(null);
    const [simulationError, setSimulationError] = useState('');
    const [simulating, setSimulating] = useState(false);
    const [inputs, setInputs] = useState([{ amount: '', date: '', currency: 'ARS' }]);
    const selection = report && report.sampleId === sampleId && report.variant === variant && report.scenario === scenario ? report : null;

    useEffect(() => {
        const controller = new AbortController();
        request(token, '', controller.signal).then(data => {
            setCatalog(data);
            if (data.official) setLoading(false);
            else setSampleId(data.samples[0].id);
        })
            .catch(cause => { if (!controller.signal.aborted) { setError(cause.message); setLoading(false); } });
        return () => controller.abort();
    }, [token]);

    useEffect(() => {
        if (!sampleId) return;
        const controller = new AbortController();
        setLoading(true);
        setError('');
        setSimulation(null);
        setSimulationError('');
        request(token, '/calculate', controller.signal, { sampleId, variant, scenario }).then(setReport)
            .catch(cause => { if (!controller.signal.aborted) setError(cause.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [token, sampleId, variant, scenario, generation]);

    const updateFlow = (index, fieldName, value) => setInputs(rows => rows.map((row, i) => i === index ? { ...row, [fieldName]: value } : row));
    const runSimulation = useCallback(async event => {
        event.preventDefault();
        setSimulating(true);
        setSimulation(null);
        setSimulationError('');
        try {
            const data = await request(token, '/calculate', undefined, { sampleId, variant, scenario,
                purchase: inputs.map(row => ({ ...row, amount: Number(row.amount), date: row.date || selection.cutoff.slice(0,10) })) });
            setSimulation(data);
        } catch (cause) { setSimulationError(cause.message); }
        finally { setSimulating(false); }
    }, [token, sampleId, variant, scenario, inputs, selection]);
    const visibleSimulation = simulation && simulation.variant === variant && simulation.scenario === scenario && simulation.sampleId === sampleId;

    return <main className="space-y-4 p-4 text-sm text-crm-fg md:p-6">
        <CrmPageHeader title="AutoSporting AI" subtitle="PILOTO — DATOS SINTÉTICOS" />
        {catalog?.generalChatAvailable && <GeneralAgencyChat token={token} api={request} ready={catalog.workbookOpenAiReady}
            setupAvailable={catalog.workbookSetupAvailable} />}
        {catalog?.crmProposalsAvailable && <CrmQuoteProposal token={token} api={request} />}
        {catalog && !catalog.official && <div className={panel + ' grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:items-end'}>
            <label>Muestra<select className={field} value={sampleId} onChange={e => setSampleId(e.target.value)} disabled={loading || simulating}>{catalog.samples.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label>Cierre<select aria-label="Cierre" className={field} value={variant} onChange={e => setVariant(e.target.value)} disabled={loading || simulating}>{catalog.variants.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label>Escenario<select aria-label="Escenario" className={field} value={scenario} onChange={e => setScenario(e.target.value)} disabled={loading || simulating}>{catalog.scenarios.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <button type="button" className={button} disabled={loading || simulating} onClick={() => setGeneration(value => value + 1)}><RefreshCw size={16} />Recalcular</button>
        </div>}
        {loading && <p role="status">Calculando la muestra…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && selection && <>
            <Report report={selection} />
            <section className={panel}><h2 className="mb-3 text-lg font-semibold">Simular una compra</h2>
                <p className="mb-3 text-crm-fg-muted">Ingresá los desembolsos con signo negativo y los cobros con signo positivo. Los flujos se calculan como un escenario separado.</p>
                <form onSubmit={runSimulation} className="space-y-3">
                    {inputs.map((row, index) => <div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]" key={index}>
                        <label>Importe entero<input aria-label="Importe entero" className={field} required type="number" step="1" value={row.amount} onChange={e => updateFlow(index,'amount',e.target.value)} /></label>
                        <label>Moneda<select className={field} value={row.currency} onChange={e => updateFlow(index,'currency',e.target.value)}><option>ARS</option><option>USD</option></select></label>
                        <label>Fecha<input className={field} required type="date" value={row.date || selection.cutoff.slice(0,10)} onChange={e => updateFlow(index,'date',e.target.value)} /></label>
                        <button type="button" aria-label={'Quitar flujo ' + (index+1)} className={button} disabled={inputs.length === 1} onClick={() => setInputs(rows => rows.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
                    </div>)}
                    <div className="flex gap-2"><button type="button" className={button} disabled={inputs.length >= 12 || simulating} onClick={() => setInputs(rows => [...rows,{ amount:'',currency:'ARS',date:'' }])}><Plus size={16} />Agregar flujo</button>
                        <button className={button + ' !bg-crm-red !text-white'} disabled={simulating}>{simulating ? 'Simulando…' : 'Simular compra'}</button></div>
                </form>
                {simulationError && <p className="mt-3" role="alert">{simulationError}</p>}
                {visibleSimulation && <div className="mt-4 space-y-3 border-t border-crm-border pt-4">
                    <h3 className="font-semibold">Resultado de la simulación</h3>
                    <Projection projection={simulation.simulation} />
                    {simulation.simulation.alerts.map((alert, index) => <p key={index} role="status">{alertLabels[alert.code]} {alert.currency ?? ''}</p>)}
                    <ul>{simulation.simulation.scheduled.filter(flow => flow.id.startsWith('simulation-')).map(flow =>
                        <li key={flow.id}>{displayDate(flow.date)} · {money(flow.amount, flow.currency)}</li>)}</ul>
                </div>}
            </section>
        </>}
        {catalog && !catalog.official && <TradeWorkbookPanel token={token} openAiReady={catalog.workbookOpenAiReady} setupAvailable={catalog.workbookSetupAvailable}
            onConnect={()=>setCatalog(current=>({...current,workbookOpenAiReady:true}))} />}
        {catalog && !catalog.official && <FinancialAnalysisPanel report={selection} simulation={visibleSimulation ? simulation : null}
            request={request} token={token} mode={catalog.analysisMode} />}
        {catalog?.chatMode && catalog.chatMode !== 'disabled' && <FinancialDirectionChat api={request} token={token}
            mode={catalog.chatMode} report={selection} simulation={visibleSimulation ? simulation : null} />}
    </main>;
}

export default function FinancialPilotPage() {
    const { user, token, loading } = useAuth();
    if (loading) return <p role="status" className="p-4">Verificando acceso…</p>;
    const official = process.env.NEXT_PUBLIC_AUTOSPORTING_AI_OFFICIAL === '1';
    const enabled = official ? user?.role==='owner' : process.env.NEXT_PUBLIC_AUTOSPORTING_FINANCIAL_PILOT==='1' && canReadFinancialPilot(user);
    if (!enabled || !token)
        return <p className="p-4">El piloto financiero no está disponible.</p>;
    return <Pilot token={token} />;
}
