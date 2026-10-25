'use client';
import { useState } from 'react';
import Link from 'next/link';
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';
import { useAcademyProgress } from './AcademyProgressProvider';
import { learningLink, summarizeProgress } from '../../../lib/academy/progress';

export default function AcademyProgress() {
    const { progress, reset } = useAcademyProgress();
    const [confirmReset, setConfirmReset] = useState(false);
    const summary = summarizeProgress(progress);
    return <div className="space-y-5"><h1 className="text-[26px] font-bold">Mi progreso educativo</h1><p className="text-sm text-crm-fg-muted">Guardado local por identificador de usuario en este navegador. No se sincroniza con otros dispositivos; borrar sus datos elimina el avance. No es un registro académico certificado.</p>
        <div className="grid gap-4 sm:grid-cols-3">{[[`${summary.percent}%`, 'Avance de lecciones'], [`${summary.completed} / ${summary.total}`, 'Lecciones completadas'], [progress.attempts.length, 'Intentos de evaluación guardados']].map(([value, title]) => <CrmCard key={title}><h2 className="text-sm text-crm-fg-muted">{title}</h2><p className="mt-2 text-2xl font-bold">{value}</p></CrmCard>)}</div>
        <div className="grid gap-4 md:grid-cols-2">{summary.courses.map(course => <CrmCard key={course.id}><h2 className="font-bold">{course.title}</h2><progress aria-label={`Avance de ${course.title}`} className="mt-3 h-3 w-full accent-red-600" value={course.completed} max={course.total} /><p className="mt-2 text-xs text-crm-fg-muted">{course.completed} de {course.total} lecciones completadas</p><Link className="mt-3 inline-block text-sm text-crm-red" href={learningLink(course.lessons.find(l => !progress.completed.includes(l.id))?.id || course.lessons[0].id)}>Continuar el curso →</Link></CrmCard>)}</div>
        <CrmCard><h2 className="font-bold">Historial de evaluaciones</h2>{progress.attempts.length === 0 ? <p className="mt-3 text-sm text-crm-fg-muted">Todavía no hay evaluaciones registradas. Completá una para ver tu resultado.</p> : <ul className="mt-3 space-y-3">{[...progress.attempts].reverse().map((attempt, index) => <li key={`${attempt.at}-${index}`} className="border-t border-crm-border pt-3 text-sm"><strong>{summary.courses.find(c => c.id === attempt.courseId)?.title}: {attempt.score}%</strong><p className="text-crm-fg-muted">{attempt.level} · {attempt.total} preguntas · {new Date(attempt.at).toLocaleString('es-AR')}</p></li>)}</ul>}</CrmCard>
        <CrmCard><h2 className="font-bold">Práctica de decisiones</h2><p className="mt-2 text-sm">{progress.decisions.length} decisiones simuladas registradas localmente. No representan operaciones reales.</p></CrmCard>
        <CrmCard><h2 className="font-bold">Restablecer aprendizaje local</h2><p className="my-3 text-sm text-crm-fg-muted">Elimina lecciones completadas, intentos y decisiones de Academy para este usuario en este navegador.</p>{confirmReset ? <div className="flex flex-wrap gap-3"><CrmButton onClick={() => { reset(); setConfirmReset(false); }}>Confirmar restablecimiento</CrmButton><CrmButton variant="secondary" onClick={() => setConfirmReset(false)}>Cancelar</CrmButton></div> : <CrmButton variant="secondary" onClick={() => setConfirmReset(true)}>Restablecer progreso</CrmButton>}</CrmCard>
    </div>;
}
