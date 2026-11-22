"use client";

import { useState } from 'react';

const options = {
    close:'Analizar este cierre', compare:'Comparar con el cierre original', projection:'Interpretar la proyección',
    simulation:'Explicar esta simulación', liquidity_demo:'Pregunta de ejemplo sobre liquidez'
};
const sectionLabels = { conclusion:'Conclusión ejecutiva', evidence:'Evidencia financiera', risks:'Riesgos y prioridad',
    alternatives:'Alternativas', limitations:'Supuestos y límites', nextStep:'Próximo paso' };
const demo = '¿Por qué una compra de ARS 30 compromete la liquidez si el efectivo utilizable actual es ARS 475?';
const modes = { simulated:'Prueba simulada · sin llamada a OpenAI', configured:'Conexión configurada · ejecución manual',
    pending:'IA pendiente de conexión', disabled:'Análisis con IA deshabilitado' };
const number = new Intl.NumberFormat('es-AR');

export default function FinancialAnalysisPanel({ report, simulation, request, token, mode }) {
    const [intent,setIntent] = useState('close');
    const [result,setResult] = useState(null);
    const [busy,setBusy] = useState(false);
    const [error,setError] = useState('');
    const available = mode === 'simulated' || mode === 'configured';
    const stale = result && (!report || result.context.variant !== report.variant || result.context.scenario !== report.scenario);
    const run = async event => {
        event.preventDefault();
        if (busy || !report) return;
        setBusy(true);
        setError('');
        setResult(null);
        const { sampleId, variant, scenario } = report;
        try {
            const body = { sampleId, variant, scenario, intent };
            if (intent === 'liquidity_demo') Object.assign(body,{variant:'revised',scenario:'stress'});
            if (intent === 'simulation') body.purchase = simulation.simulation.scheduled.filter(flow => flow.id.startsWith('simulation-'))
                .map(({amount,date,currency}) => ({amount,date,currency}));
            setResult(await request(token,'/analysis',undefined,body));
        } catch (cause) { setError(cause.message); }
        finally { setBusy(false); }
    };

    return <section className="rounded-xl border border-crm-border bg-crm-surface p-4 md:p-5" aria-labelledby="financial-analysis-title">
        <h2 id="financial-analysis-title" className="text-lg font-semibold">Análisis financiero</h2>
        <p className="mt-1 text-sm text-crm-fg-muted" role="status">{modes[mode]}</p>
        {available && <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={run}>
            <label className="grid gap-1">Pregunta o análisis
                <select aria-label="Pregunta o análisis" className="min-h-10 rounded-lg border border-crm-border bg-crm-bg px-2 text-crm-fg"
                    value={intent} onChange={event => setIntent(event.target.value)} disabled={busy}>
                    {Object.entries(options).map(([id,label]) => <option key={id} value={id}>{label}</option>)}
                </select>
            </label>
            <button className="min-h-10 rounded-lg bg-crm-red px-3 font-semibold text-white disabled:opacity-50"
                disabled={!report || busy || (intent === 'simulation' && !simulation)}>{busy ? 'Analizando…' : 'Ejecutar análisis'}</button>
            {intent === 'liquidity_demo' && <p className="w-full">{demo} <span className="text-crm-fg-muted">Octubre v2 · estrés.</span></p>}
        </form>}
        {error && <p className="mt-3" role="alert">{error}</p>}
        {result && <article className="mt-4 space-y-4" aria-label="Informe financiero">
            <header className="text-sm text-crm-fg-muted">
                {result.mode === 'simulated' ? 'Resultado de prueba simulada' : 'Llamada real verificada'} · {result.context.variant} · v{result.context.closeVersion} · {result.context.scenario} · {result.context.cutoff.slice(0,10)}
                {stale && <p>Este informe corresponde a un contexto distinto del cierre seleccionado.</p>}
            </header>
            {Object.entries(result.sections).map(([section,item]) => <div key={section}>
                <h3 className="font-semibold">{sectionLabels[section]}</h3>
                <p>{item.text}</p>
                <details className="mt-1"><summary className="cursor-pointer">Ver referencias</summary>
                    <ul className="mt-1 space-y-1 text-sm">{item.evidence.map(ref => <li key={ref.id}>
                        {ref.label} · {ref.value == null ? 'Datos insuficientes' : ref.currency + ' ' + number.format(ref.value)}
                        {ref.date ? ' · ' + ref.date : ''} · {ref.scenario} · {ref.sources.join(', ')}
                    </li>)}</ul>
                </details>
            </div>)}
        </article>}
    </section>;
}
