'use client';
import { useState } from 'react';
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';
import { checkNumericAnswer } from '../../../lib/academy/curriculum';

export default function AcademyCourseCase({ courseCase }) {
    const [answers, setAnswers] = useState({});
    const [checked, setChecked] = useState(false);
    return <CrmCard><h3 className="text-lg font-bold">Caso integrado · {courseCase.title}</h3><p className="mt-3 text-sm leading-7">{courseCase.context}</p>
        <details className="mt-4 rounded-lg border border-crm-border p-3"><summary className="cursor-pointer font-semibold">Trabajar el caso y contrastar la resolución</summary>
            <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); setChecked(true); }}>
                {courseCase.exercises.map((item, index) => <label key={item.question} className="block text-sm">{index + 1}. {item.question} ({item.unit})<input required className="mt-2 min-h-11 w-full rounded-lg border border-crm-border bg-crm-bg px-3" inputMode="decimal" value={answers[index] || ''} onChange={event => { setAnswers(current => ({ ...current, [index]: event.target.value })); setChecked(false); }} /></label>)}
                <p className="text-xs text-crm-fg-muted">Decimal sin separadores de miles. Tolerancia de respuesta: 0,01 de la unidad indicada.</p><CrmButton type="submit">Corregir caso integrado</CrmButton>
            </form>
            {checked && <div role="status" className="mt-4 space-y-3 text-sm">{courseCase.exercises.map((item, index) => <p key={item.question}><strong>{checkNumericAnswer(answers[index], item.answer) ? 'Correcto' : 'Para revisar'} {index + 1}:</strong> {item.explanation}</p>)}</div>}
            <h4 className="mt-5 font-semibold">Resolución razonada</h4><ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-7">{courseCase.steps.map(step => <li key={step}>{step}</li>)}</ol>
        </details>
        <div className="mt-4 space-y-3 text-sm leading-7"><p><strong>Alternativas:</strong> {courseCase.alternatives}</p><p><strong>Riesgos y límites:</strong> {courseCase.risk}</p><p><strong>Justificá tu decisión:</strong> {courseCase.reflection}</p></div>
    </CrmCard>;
}
