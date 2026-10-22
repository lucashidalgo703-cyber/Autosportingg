'use client';
import { useState } from 'react';
import Link from 'next/link';
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';
import { courses } from '../../../lib/academy/curriculum';
import { questions, gradeAssessment } from '../../../lib/academy/assessments';

function Assessment({ items, course }) {
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const submit = event => {
        event.preventDefault();
        try { setResult(gradeAssessment(items, answers)); setError(''); } catch (e) { setError(e.message); }
    };
    return <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-crm-fg-muted">Evaluación formativa local, sin certificación ni efectos sobre permisos. Cada pregunta vale lo mismo.</p>
        {items.map((item, index) => <CrmCard key={item.id}><fieldset disabled={Boolean(result)}><legend className="text-sm font-semibold">{index + 1}. {item.prompt}</legend><p className="my-2 text-xs text-crm-fg-muted">{item.level}</p>{item.type === 'choice' ? <div className="space-y-2">{item.options.map((option, i) => <label key={option} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-crm-border p-3 text-sm"><input className="mt-1" type="radio" name={item.id} value={i} checked={String(answers[item.id]) === String(i)} onChange={() => setAnswers(current => ({ ...current, [item.id]: i }))} />{option}</label>)}</div> : <label className="block text-sm">Respuesta numérica sin separadores de miles<input aria-label={`Respuesta ${index + 1}`} className="mt-2 min-h-11 w-full rounded-lg border border-crm-border bg-crm-bg px-3" inputMode="decimal" value={answers[item.id] ?? ''} onChange={event => setAnswers(current => ({ ...current, [item.id]: event.target.value }))} /></label>}</fieldset>
            {result && <div className="mt-3 rounded-lg bg-crm-bg p-3 text-sm"><strong>{result.results[index].correct ? 'Correcto' : 'Para repasar'}</strong><p className="mt-2">{item.explanation}</p></div>}
        </CrmCard>)}
        {error && <p role="alert" className="text-sm text-crm-red">{error}</p>}
        {!result ? <CrmButton type="submit">Corregir evaluación</CrmButton> : <CrmCard><div role="status"><h2 className="text-xl font-bold">Puntaje: {result.score}%</h2><p className="mt-2 text-sm">{result.correctCount} de {result.total} respuestas correctas.</p><p className="mt-2 text-sm text-crm-fg-muted">{result.review.length ? `Te recomendamos repasar ${course.title} y revisar las explicaciones de las respuestas.` : 'Buen resultado. Continuá con otro nivel o practicá en el laboratorio.'}</p></div><div className="mt-4 flex flex-wrap gap-3"><CrmButton type="button" variant="secondary" onClick={() => { setAnswers({}); setResult(null); }}>Volver a intentar</CrmButton><Link className="py-2 text-sm text-crm-red" href={`/admin/academy/cursos?curso=${course.id}`}>Repasar el curso →</Link></div></CrmCard>}
    </form>;
}

export default function AcademyAssessments() {
    const [courseId, setCourseId] = useState(courses[0].id);
    const [level, setLevel] = useState('Todos');
    const course = courses.find(item => item.id === courseId);
    const items = questions.filter(item => item.courseId === courseId && (level === 'Todos' || item.level === level));
    return <div className="space-y-5"><h1 className="text-[26px] font-bold">Evaluaciones</h1><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Curso<select className="mt-2 min-h-11 w-full rounded-lg border border-crm-border bg-crm-surface px-3" value={courseId} onChange={event => setCourseId(event.target.value)}>{courses.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-sm">Nivel<select className="mt-2 min-h-11 w-full rounded-lg border border-crm-border bg-crm-surface px-3" value={level} onChange={event => setLevel(event.target.value)}>{['Todos', 'Inicial', 'Intermedio', 'Avanzado'].map(item => <option key={item}>{item}</option>)}</select></label></div><Assessment key={`${courseId}-${level}`} items={items} course={course} /></div>;
}
