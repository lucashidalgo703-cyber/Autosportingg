'use client';
import { useState } from 'react';
import Link from 'next/link';
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';
import { courses } from '../../../lib/academy/curriculum';
import { structuredTutor, tutorPrompts } from '../../../lib/academy/tutor';

export default function AcademyTutor({ service = structuredTutor }) {
    const [courseId, setCourseId] = useState(courses[0].id);
    const [lessonIndex, setLessonIndex] = useState(0);
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const course = courses.find(item => item.id === courseId);
    const ask = async prompt => {
        if (busy) return;
        setBusy(true); setError('');
        try {
            const reply = await service.respond({ courseId, lessonId: course.lessons[lessonIndex].id, promptId: prompt.id });
            setMessages(previous => [...previous, { question: prompt.title, ...reply }].slice(-20));
        } catch { setError('No se pudo recuperar la explicación. Volvé a intentarlo.'); }
        finally { setBusy(false); }
    };
    return <div className="space-y-5"><h1 className="text-[26px] font-bold">Tutor financiero</h1><CrmCard><p className="font-semibold text-crm-red">Guía estructurada · No hay IA conectada</p><p className="mt-2 text-sm leading-6 text-crm-fg-muted">Elegí un tema y una pregunta. Las respuestas provienen de las lecciones de Academy; no se envía información a proveedores ni se generan recomendaciones sobre operaciones reales.</p></CrmCard>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Curso<select value={courseId} onChange={event => { setCourseId(event.target.value); setLessonIndex(0); }} className="mt-2 min-h-11 w-full rounded-lg border border-crm-border bg-crm-surface px-3">{courses.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-sm">Lección<select value={lessonIndex} onChange={event => setLessonIndex(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-lg border border-crm-border bg-crm-surface px-3">{course.lessons.map((lesson, index) => <option value={index} key={lesson.id}>{lesson.title}</option>)}</select></label></div>
        <div className="flex flex-wrap gap-2">{tutorPrompts.map(prompt => <CrmButton key={prompt.id} variant="secondary" disabled={busy} onClick={() => ask(prompt)}>{prompt.title}</CrmButton>)}</div>
        {error && <p role="alert" className="text-sm text-crm-red">{error}</p>}
        <div role="log" aria-label="Conversación con guía estructurada" aria-live="polite" className="space-y-4">{messages.length === 0 ? <CrmCard><p className="text-sm text-crm-fg-muted">Todavía no hay consultas. Probá «Mostrame un ejemplo numérico».</p></CrmCard> : messages.map((message, index) => <CrmCard key={index}><h2 className="font-semibold">{message.question}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7">{message.text}</p><p className="mt-4 text-xs text-crm-fg-muted">Fuente: {message.source}</p><Link className="mt-2 inline-block text-sm text-crm-red" href={message.href}>Abrir lección →</Link></CrmCard>)}</div>
        {messages.length > 0 && <CrmButton variant="ghost" onClick={() => setMessages([])}>Limpiar conversación de esta sesión</CrmButton>}
    </div>;
}
