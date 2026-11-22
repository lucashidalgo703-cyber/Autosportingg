'use client';
import Link from 'next/link';
import CrmCard from '../ui/CrmCard';
import { academyCourses, academySections } from '../../../lib/academy/catalog';
import { useAcademyProgress } from './AcademyProgressProvider';
import { courses } from '../../../lib/academy/curriculum';
import { learningLink, summarizeProgress } from '../../../lib/academy/progress';

export default function AcademyDashboard() {
    const { progress } = useAcademyProgress();
    const summary = summarizeProgress(progress);
    const nextLesson = courses.flatMap(course => course.lessons).find(lesson => !progress.completed.includes(lesson.id));
    return <div className="space-y-5">
        <div><h1 className="text-[26px] font-bold">Aprendé a decidir con números</h1><p className="mt-2 text-crm-fg-muted">De los fundamentos a la dirección financiera de una agencia.</p></div>
        <div className="grid gap-4 sm:grid-cols-3">
            {[['8', 'Cursos disponibles'], [`${summary.percent}%`, `${summary.completed} de ${summary.total} lecciones completadas`], [progress.attempts.length, 'Evaluaciones realizadas · local']].map(([value, label]) => <CrmCard key={label}><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-crm-fg-muted">{label}</p></CrmCard>)}
        </div>
        <CrmCard><h2 className="text-lg font-bold">Continuar aprendiendo</h2><p className="my-3 text-sm text-crm-fg-muted">{nextLesson ? nextLesson.title : 'Completaste todas las lecciones. Repasá y practicá en el laboratorio.'}</p><progress aria-label="Avance educativo total" value={summary.completed} max={summary.total} className="mb-3 h-3 w-full accent-red-600" /><Link className="font-semibold text-crm-red" href={learningLink(nextLesson?.id)}>Continuar recorrido →</Link></CrmCard>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{academySections.map(([id, title, description]) => <CrmCard key={id}><h2 className="font-bold"><Link className="hover:text-crm-red" href={`/admin/academy/${id}`}>{title} →</Link></h2><p className="mt-2 text-sm text-crm-fg-muted">{description}</p></CrmCard>)}</div>
        <h2 className="text-xl font-bold">Cursos disponibles</h2>
        <div className="grid gap-4 md:grid-cols-2">{academyCourses.map(course => <CrmCard key={course.id}><p className="text-xs text-crm-red">{course.level}</p><h3 className="mt-2 font-bold">{course.title}</h3><p className="mt-2 text-sm text-crm-fg-muted">{course.description}</p><Link className="mt-4 inline-block text-sm text-crm-red" href={`/admin/academy/cursos?curso=${course.id}`}>Ver recorrido →</Link></CrmCard>)}</div>
    </div>;
}
