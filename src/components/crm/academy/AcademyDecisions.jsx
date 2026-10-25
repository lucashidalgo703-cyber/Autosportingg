'use client';
import { useState } from 'react';
import Link from 'next/link';
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';
import { scenarios, evaluateDecision } from '../../../lib/academy/decisions';
import { useAcademyProgress } from './AcademyProgressProvider';

const format = value => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value);

function Scenario({ scenario }) {
    const [option, setOption] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const { recordDecision } = useAcademyProgress();
    return <div className="space-y-4"><CrmCard><h2 className="text-xl font-bold">{scenario.title}</h2><p className="mt-3 text-sm leading-7">{scenario.context}</p><p className="mt-3 text-sm text-crm-fg-muted">Objetivo: {scenario.objective}</p><fieldset className="mt-4 space-y-2" disabled={submitted}><legend className="mb-2 font-semibold">¿Qué alternativa elegirías?</legend>{scenario.options.map((item, index) => <label className="flex min-h-11 items-center gap-3 rounded-lg border border-crm-border p-3 text-sm" key={item.title}><input type="radio" name={scenario.id} checked={option === index} onChange={() => setOption(index)} />{item.title}</label>)}</fieldset><CrmButton className="mt-4" disabled={option === null || submitted} onClick={() => { setSubmitted(true); recordDecision({ scenarioId: scenario.id, option }); }}>Analizar mi decisión</CrmButton></CrmCard>
        {submitted && <><p role="status" className="text-sm font-semibold">Resultados hipotéticos bajo los supuestos del caso. No son predicciones ni órdenes operativas.</p><div className="grid gap-4 xl:grid-cols-2">{scenario.options.map((_, index) => {
            const result = evaluateDecision(scenario.id, index);
            return <CrmCard key={result.title}><h3 className="font-bold">{result.title} {option === index ? '· Tu elección' : '· Alternativa'}</h3><dl className="mt-4 space-y-3">{result.metrics.map(item => <div key={item.label}><dt className="text-xs text-crm-fg-muted">{item.label}</dt><dd className="font-semibold">{format(item.value)} {item.unit}</dd></div>)}</dl><p className="mt-4 text-xs text-crm-fg-muted">{result.formula}</p><div className="mt-4 space-y-3 text-sm"><p><strong>Ventaja:</strong> {result.advantage}</p><p><strong>Riesgo:</strong> {result.risk}</p><p><strong>Costo de oportunidad:</strong> {result.opportunity}</p></div></CrmCard>;
        })}</div><div className="flex flex-wrap gap-3"><CrmButton variant="secondary" onClick={() => { setOption(null); setSubmitted(false); }}>Probar otra decisión</CrmButton><Link className="py-2 text-sm text-crm-red" href={`/admin/academy/cursos?curso=${scenario.courseId}`}>Repasar conceptos →</Link></div></>}
    </div>;
}

export default function AcademyDecisions() {
    const [id, setId] = useState(scenarios[0].id);
    return <div className="space-y-5"><h1 className="text-[26px] font-bold">Entrenador de decisiones</h1><p className="text-sm text-crm-fg-muted">Seis casos ficticios para comparar liquidez, retorno, riesgo y alternativas. La elección no genera operaciones.</p><label className="block text-sm">Escenario<select className="mt-2 min-h-11 w-full rounded-lg border border-crm-border bg-crm-surface px-3" value={id} onChange={event => setId(event.target.value)}>{scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.title}</option>)}</select></label><Scenario key={id} scenario={scenarios.find(item => item.id === id)} /></div>;
}
