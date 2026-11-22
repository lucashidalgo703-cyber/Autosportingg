'use client';
import { useState } from 'react';
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';
import { simulators, defaultInputs, calculateSimulator } from '../../../lib/academy/simulators';

const format = value => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value);

function Simulator({ simulator }) {
    const [values, setValues] = useState(() => defaultInputs(simulator));
    let result, error;
    try { result = calculateSimulator(simulator.id, values); } catch (e) { error = e.message; }
    return <div className="space-y-4">
        <CrmCard><h2 className="text-xl font-bold">{simulator.title}</h2><p className="mt-3 text-sm leading-6 text-crm-fg-muted">{simulator.assumption}</p><div className="mt-4 rounded-lg border border-crm-border bg-crm-bg p-4 text-sm"><strong>Fórmula</strong><p className="mt-2 break-words">{simulator.formula}</p></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">{simulator.fields.map(field => <label key={field.id} className="block text-sm"><span>{field.label} ({field.unit})</span><input className="mt-2 min-h-11 w-full rounded-lg border border-crm-border bg-crm-bg px-3" inputMode="decimal" value={values[field.id]} onChange={event => setValues(current => ({ ...current, [field.id]: event.target.value }))} /></label>)}</div>
            <p className="mt-3 text-xs text-crm-fg-muted">Números sin separadores de miles. Decimales con coma o punto. Los resultados se actualizan al editar.</p>
            <CrmButton className="mt-4" variant="secondary" onClick={() => setValues(defaultInputs(simulator))}>Restablecer ejemplo ficticio</CrmButton>
        </CrmCard>
        {error ? <p role="alert" className="rounded-lg border border-crm-red p-4 text-sm">{error}</p> : <><div aria-live="polite" className="grid gap-3 sm:grid-cols-2">{result.metrics.map(item => <CrmCard key={item.label}><p className="text-sm text-crm-fg-muted">{item.label}</p><p className="mt-2 break-words text-2xl font-bold">{item.value === null ? (item.state === 'impossible' ? 'No se recupera' : 'No definido') : format(item.value)} <span className="text-sm font-normal">{item.unit}</span></p>{item.explanation && <p className="mt-2 text-sm text-crm-fg-muted">{item.explanation}</p>}</CrmCard>)}</div>
            {result.rows.length > 0 && <CrmCard><h3 className="font-bold">Cronograma teórico de amortización</h3><div className="mt-3 overflow-x-auto"><table className="w-full text-right text-sm"><caption className="mb-3 text-left text-xs text-crm-fg-muted">Importes en pesos; se redondean solo para mostrar.</caption><thead><tr>{['Cuota', 'Pago', 'Interés', 'Capital', 'Saldo'].map(title => <th key={title} className="p-2">{title}</th>)}</tr></thead><tbody>{result.rows.map(row => <tr className="border-t border-crm-border" key={row.period}>{[row.period, row.payment, row.interest, row.capital, row.balance].map((value, index) => <td className="whitespace-nowrap p-2" key={index}>{format(value)}</td>)}</tr>)}</tbody></table></div></CrmCard>}
        </>}
    </div>;
}

export default function AcademyLab() {
    const [id, setId] = useState(simulators[0].id);
    const simulator = simulators.find(item => item.id === id);
    return <div className="space-y-5"><h1 className="text-[26px] font-bold">Laboratorio financiero</h1><p className="text-sm text-crm-fg-muted">Explorá 16 modelos educativos. Los supuestos no representan operaciones ni cotizaciones reales.</p><label className="block text-sm">Elegí un simulador<select className="mt-2 min-h-11 w-full rounded-lg border border-crm-border bg-crm-surface px-3" value={id} onChange={event => setId(event.target.value)}>{simulators.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label><Simulator key={id} simulator={simulator} /></div>;
}
