'use client';
import { useState } from 'react';
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';
import { courses, checkNumericAnswer } from '../../../lib/academy/curriculum';

function Lesson({ lesson }) {
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState(null);
    return <div className="space-y-5">
        <h3 className="text-xl font-bold">{lesson.title}</h3>
        <p className="text-sm leading-7 text-crm-fg-muted">{lesson.body}</p>
        <div className="rounded-lg border border-crm-border bg-crm-bg p-4"><h4 className="font-semibold">Ejemplo ficticio</h4><p className="mt-2 text-sm leading-6">{lesson.example}</p></div>
        <form onSubmit={event => { event.preventDefault(); setFeedback(checkNumericAnswer(answer, lesson.exercise.answer)); }} className="space-y-3">
            <label className="block text-sm font-semibold" htmlFor={`answer-${lesson.id}`}>{lesson.exercise.question} ({lesson.exercise.unit})</label>
            <p className="text-xs text-crm-fg-muted">Ingresá el número sin separadores de miles; para decimales podés usar coma o punto.</p>
            <input id={`answer-${lesson.id}`} required inputMode="decimal" value={answer} onChange={event => { setAnswer(event.target.value); setFeedback(null); }} className="min-h-11 w-full rounded-lg border border-crm-border bg-crm-bg px-3 sm:max-w-xs" />
            <div><CrmButton type="submit">Comprobar respuesta</CrmButton></div>
            {feedback !== null && <div role="status" className="rounded-lg border border-crm-border p-4 text-sm"><strong>{feedback ? 'Correcto.' : 'Revisá el cálculo.'}</strong><p className="mt-2">{lesson.exercise.explanation}</p></div>}
        </form>
    </div>;
}

export default function AcademyCourses() {
    const [courseId, setCourseId] = useState(courses[0].id);
    const [lessonIndex, setLessonIndex] = useState(0);
    const course = courses.find(item => item.id === courseId);
    const lesson = course.lessons[lessonIndex];
    return <div className="space-y-5">
        <h1 className="text-[26px] font-bold">Cursos financieros</h1>
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-2" aria-label="Elegir curso">{courses.map((item, index) => <button key={item.id} aria-pressed={item.id === courseId} onClick={() => { setCourseId(item.id); setLessonIndex(0); }} className={`w-full rounded-lg border p-3 text-left text-sm ${item.id === courseId ? 'border-crm-red bg-crm-red/10' : 'border-crm-border bg-crm-surface'}`}><span className="text-xs text-crm-fg-muted">{index + 1}. {item.level}</span><span className="mt-1 block font-semibold">{item.title}</span></button>)}</aside>
            <div className="min-w-0 space-y-4">
                <CrmCard><h2 className="text-lg font-bold">{course.title}</h2><p className="mt-2 text-sm text-crm-fg-muted">{course.description}</p><div className="mt-4 flex flex-wrap gap-2">{course.lessons.map((item, index) => <CrmButton key={item.id} variant={index === lessonIndex ? 'primary' : 'secondary'} onClick={() => setLessonIndex(index)} aria-pressed={index === lessonIndex}>Lección {index + 1}</CrmButton>)}</div></CrmCard>
                <CrmCard><Lesson key={lesson.id} lesson={lesson} /><div className="mt-5 flex flex-wrap justify-between gap-3"><CrmButton variant="secondary" disabled={lessonIndex === 0} onClick={() => setLessonIndex(index => index - 1)}>Anterior</CrmButton><CrmButton variant="secondary" disabled={lessonIndex === course.lessons.length - 1} onClick={() => setLessonIndex(index => index + 1)}>Siguiente lección</CrmButton></div></CrmCard>
                <CrmCard><h3 className="font-bold">Glosario del curso</h3><dl className="mt-3 space-y-3">{Object.entries(course.glossary).map(([term, definition]) => <div key={term}><dt className="text-sm font-semibold">{term}</dt><dd className="text-sm text-crm-fg-muted">{definition}</dd></div>)}</dl></CrmCard>
            </div>
        </div>
    </div>;
}
