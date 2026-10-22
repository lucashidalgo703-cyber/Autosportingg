'use client';
import { useState } from 'react';
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';
import { courses, checkNumericAnswer } from '../../../lib/academy/curriculum';
import { useAcademyProgress } from './AcademyProgressProvider';
import AcademyCourseCase from './AcademyCourseCase';

function Lesson({ lesson }) {
    const { progress, completeLesson } = useAcademyProgress();
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState(null);
    return <div className="space-y-5">
        <h3 className="text-xl font-bold">{lesson.title}</h3>
        <p className="text-sm leading-7 text-crm-fg-muted">{lesson.body}</p>
        <section className="space-y-3"><h4 className="font-semibold">{lesson.reading.title}</h4>{lesson.reading.paragraphs.map(paragraph => <p key={paragraph} className="text-sm leading-7 text-crm-fg-muted">{paragraph}</p>)}</section>
        <div className="rounded-lg border border-crm-border bg-crm-bg p-4"><h4 className="font-semibold">Ejemplo ficticio</h4><p className="mt-2 text-sm leading-6">{lesson.example}</p></div>
        <form onSubmit={event => { event.preventDefault(); setFeedback(checkNumericAnswer(answer, lesson.exercise.answer)); }} className="space-y-3">
            <label className="block text-sm font-semibold" htmlFor={`answer-${lesson.id}`}>{lesson.exercise.question} ({lesson.exercise.unit})</label>
            <p className="text-xs text-crm-fg-muted">Ingresá el número sin separadores de miles; para decimales podés usar coma o punto.</p>
            <input id={`answer-${lesson.id}`} required inputMode="decimal" value={answer} onChange={event => { setAnswer(event.target.value); setFeedback(null); }} className="min-h-11 w-full rounded-lg border border-crm-border bg-crm-bg px-3 sm:max-w-xs" />
            <div><CrmButton type="submit">Comprobar respuesta</CrmButton></div>
            {feedback !== null && <div role="status" className="rounded-lg border border-crm-border p-4 text-sm"><strong>{feedback ? 'Correcto.' : 'Revisá el cálculo.'}</strong><p className="mt-2">{lesson.exercise.explanation}</p></div>}
        </form>
        <p className="text-xs text-crm-fg-muted">Resolvé correctamente el ejercicio para registrar esta lección.</p>
        <CrmButton variant="secondary" disabled={!feedback || progress.completed.includes(lesson.id)} onClick={() => completeLesson(lesson.id)}>{progress.completed.includes(lesson.id) ? 'Lección completada' : 'Completar lección'}</CrmButton>
    </div>;
}

export default function AcademyCourses({ initialCourse, initialLesson }) {
    const selected = courses.find(course => course.id === initialCourse) || courses[0];
    const [courseId, setCourseId] = useState(selected.id);
    const [lessonIndex, setLessonIndex] = useState(Math.max(0, selected.lessons.findIndex(lesson => lesson.id === initialLesson)));
    const course = courses.find(item => item.id === courseId);
    const lesson = course.lessons[lessonIndex];
    return <div className="space-y-5">
        <h1 className="text-[26px] font-bold">Cursos financieros</h1>
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-2" aria-label="Elegir curso">{courses.map((item, index) => <button key={item.id} aria-pressed={item.id === courseId} onClick={() => { setCourseId(item.id); setLessonIndex(0); }} className={`w-full rounded-lg border p-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red ${item.id === courseId ? 'border-crm-red bg-crm-red/10 text-crm-red ring-1 ring-crm-red' : 'border-crm-border bg-crm-surface text-crm-fg'}`}><span className="text-xs text-crm-fg-muted">{index + 1}. {item.level}</span><span className="mt-1 block font-semibold">{item.title}</span></button>)}</aside>
            <div className="min-w-0 space-y-4">
                <CrmCard><h2 className="text-lg font-bold">{course.title}</h2><p className="mt-2 text-sm text-crm-fg-muted">{course.description}</p><div className="mt-4 flex flex-wrap gap-2">{course.lessons.map((item, index) => <CrmButton key={item.id} variant={index === lessonIndex ? 'primary' : 'secondary'} onClick={() => setLessonIndex(index)} aria-pressed={index === lessonIndex}>Lección {index + 1}</CrmButton>)}</div></CrmCard>
                <CrmCard><Lesson key={lesson.id} lesson={lesson} /><div className="mt-5 flex flex-wrap justify-between gap-3"><CrmButton variant="secondary" disabled={lessonIndex === 0} onClick={() => setLessonIndex(index => index - 1)}>Anterior</CrmButton><CrmButton variant="secondary" disabled={lessonIndex === course.lessons.length - 1} onClick={() => setLessonIndex(index => index + 1)}>Siguiente lección</CrmButton></div></CrmCard>
                <CrmCard><h3 className="font-bold">Glosario del curso</h3><dl className="mt-3 space-y-3">{Object.entries(course.glossary).map(([term, definition]) => <div key={term}><dt className="text-sm font-semibold">{term}</dt><dd className="text-sm text-crm-fg-muted">{definition}</dd></div>)}</dl></CrmCard>
                <AcademyCourseCase key={course.id} courseCase={course.courseCase} />
            </div>
        </div>
    </div>;
}
