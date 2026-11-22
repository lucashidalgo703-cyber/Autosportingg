'use client';
import { useState } from 'react';
import Link from 'next/link';
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';
import { useAuth } from '../../../context/AuthContext';
import { useAcademyProgress } from './AcademyProgressProvider';
import { summarizeProgress, summarizeRoleProgress } from '../../../lib/academy/progress';
import { ROLE_TRACKS, getTrackByRole, getRoleTrack } from '../../../lib/academy/catalog';
import { MOTIVATIONAL_QUOTES } from '../../../lib/academy/aprenderDelError';
import { ROLE_MODULES } from '../../../lib/academy/roleModules';
import { ROLE_SIMULATIONS } from '../../../lib/academy/roleSimulations';

export default function AcademyProgress() {
    const { user } = useAuth();
    const { progress, reset } = useAcademyProgress();
    const [confirmReset, setConfirmReset] = useState(false);
    const [activeView, setActiveView] = useState('rol'); // 'rol' | 'financiero'

    const userTrack = getRoleTrack(progress?.assignedTrack, user?.role);
    const roleSummary = summarizeRoleProgress(progress, userTrack);
    const financialSummary = summarizeProgress(progress);

    return (
        <div className="space-y-6">
            {/* Cabecera de progreso */}
            <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm">
                                📊
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                                Mi Progreso Educativo
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            Avance Formativo y Competencias Demostradas
                        </h2>
                        <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                            Registro de actividades, prácticas operativas y reflexiones de mejora continua.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
                        <button
                            type="button"
                            onClick={() => setActiveView('rol')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                activeView === 'rol'
                                    ? 'bg-zinc-200 text-black shadow-md'
                                    : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            Capacitación por Rol
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveView('financiero')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                activeView === 'financiero'
                                    ? 'bg-amber-600 text-white shadow-md'
                                    : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            Catálogo Financiero
                        </button>
                    </div>
                </div>

                {/* Explicación de Privacidad al Alumno */}
                <div className="mt-5 pt-4 border-t border-zinc-800/80 rounded-xl bg-zinc-950/60 p-3.5 border border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-zinc-400">
                    <div className="flex items-center gap-2 text-zinc-300 font-semibold shrink-0">
                        <span>🛡️</span>
                        <span>Transparencia de Datos:</span>
                    </div>
                    <div className="leading-relaxed">
                        <strong className="text-white">Lo que ve tu supervisor:</strong> Avance porcentual, módulos completados y puntajes de casos prácticos. <strong className="text-white">Lo que permanece estrictamente privado:</strong> Tus relatos y notas en "Aprender del error", salvo que elijas compartirlas expresamente.
                    </div>
                </div>
            </div>

            {activeView === 'rol' ? (
                <div className="space-y-6">
                    {/* Triple Métrica Requerida por Encargo */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* 1. Contenido Recorrido */}
                        <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-5 shadow-lg space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                    Contenido Recorrido
                                </span>
                                <span className="text-base">📖</span>
                            </div>
                            <div className="text-2xl font-bold font-mono text-white">
                                {roleSummary.modulesPercent}%
                            </div>
                            <p className="text-xs text-zinc-400">
                                {roleSummary.modulesCompleted} de {roleSummary.modulesTotal} módulos leídos en {userTrack?.title || 'Recorrido Formativo'}
                            </p>
                        </div>

                        {/* 2. Práctica Realizada */}
                        <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-5 shadow-lg space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                    Prácticas Realizadas
                                </span>
                                <span className="text-base">🎯</span>
                            </div>
                            <div className="text-2xl font-bold font-mono text-white">
                                {roleSummary.simulationsAttempted}
                            </div>
                            <p className="text-xs text-zinc-400">
                                Intentos en las 6 simulaciones de negocio con consecuencias
                            </p>
                        </div>

                        {/* 3. Competencia Demostrada */}
                        <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-5 shadow-lg space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                    Competencia Demostrada
                                </span>
                                <span className="text-base">🏆</span>
                            </div>
                            <div className="text-2xl font-bold font-mono text-emerald-400">
                                {roleSummary.questionAccuracy}%
                            </div>
                            <p className="text-xs text-zinc-400">
                                {roleSummary.correctQuestions} aciertos sobre {roleSummary.totalQuestionsAnswered} preguntas evaluadas
                            </p>
                        </div>
                    </div>

                    {/* Módulos para Reforzar */}
                    {roleSummary.weakModules.length > 0 && (
                        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-5 shadow-lg space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-base">⚡</span>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                    Módulos Pendientes o para Reforzar ({roleSummary.weakModules.length})
                                </h3>
                            </div>
                            <p className="text-xs text-zinc-300">
                                Te sugerimos completar estos módulos de tu recorrido para afianzar tus procedimientos:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                {roleSummary.weakModules.map(wm => (
                                    <Link
                                        key={wm.id}
                                        href={`/admin/academy/aprender?modulo=${wm.id}`}
                                        className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 hover:border-amber-500/50 hover:bg-zinc-800/60 transition-all flex items-center justify-between group"
                                    >
                                        <div>
                                            <span className="font-mono text-[10px] font-bold text-amber-400 block">{wm.code}</span>
                                            <span className="text-xs font-bold text-zinc-200 group-hover:text-white">{wm.title}</span>
                                        </div>
                                        <span className="text-xs text-amber-400 font-bold ml-2">Iniciar →</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Historial de Simulaciones Intentadas */}
                    <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                                Historial de Simulaciones y Rúbricas
                            </h3>
                            <Link href="/admin/academy/practicar" className="text-xs font-bold text-red-400 hover:text-red-300">
                                Ir al simulador →
                            </Link>
                        </div>

                        {(progress?.roleSimulations || []).length === 0 ? (
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-center text-xs text-zinc-500">
                                Todavía no realizaste simulaciones de negocio. Poné a prueba tus habilidades en la sección "Practicar".
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[...(progress?.roleSimulations || [])].reverse().map((sim, index) => {
                                    const caseData = ROLE_SIMULATIONS.find(s => s.id === sim.simulationId);

                                    return (
                                        <div key={index} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-white">
                                                        {caseData?.title || sim.simulationId}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500">
                                                        {new Date(sim.at).toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-[10px] text-zinc-400">
                                                    {Object.entries(sim.rubricBreakdown || {}).map(([crit, val]) => (
                                                        <span key={crit} className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                                            {crit}: <strong className="text-zinc-200">{val}%</strong>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="shrink-0 text-right">
                                                <span className={`inline-block font-mono text-sm font-bold px-3 py-1 rounded-full ${
                                                    sim.score >= 70
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                                }`}>
                                                    {sim.score} / 100 pts
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* VISTA FINANCIERA LEGACY */
                <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-3">
                        {[[`${financialSummary.percent}%`, 'Avance de lecciones'], [`${financialSummary.completed} / ${financialSummary.total}`, 'Lecciones completadas'], [progress?.attempts?.length || 0, 'Intentos de evaluación guardados']].map(([value, title]) => (
                            <CrmCard key={title}>
                                <h2 className="text-sm text-crm-fg-muted">{title}</h2>
                                <p className="mt-2 text-2xl font-bold">{value}</p>
                            </CrmCard>
                        ))}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {financialSummary.courses.map(course => (
                            <CrmCard key={course.id}>
                                <h2 className="font-bold">{course.title}</h2>
                                <progress aria-label={`Avance de ${course.title}`} className="mt-3 h-3 w-full accent-red-600" value={course.completed} max={course.total} />
                                <p className="mt-2 text-xs text-crm-fg-muted">{course.completed} de {course.total} lecciones completadas</p>
                                <Link className="mt-3 inline-block text-sm text-crm-red" href={`/admin/academy/cursos?curso=${course.id}`}>
                                    Continuar el curso →
                                </Link>
                            </CrmCard>
                        ))}
                    </div>
                </div>
            )}

            {/* Resumen de Reflexiones en Aprender del Error */}
            <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-base">💡</span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                            Aprender del Error · Registro de Aprendizaje y Superación
                        </h3>
                    </div>
                    <Link href="/admin/academy/aprender-del-error" className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors">
                        Ir a reflexiones →
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                            Reflexiones Registradas
                        </span>
                        <div className="text-xl font-bold font-mono text-white">
                            {roleSummary.errorReflectionsCount}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">
                            Notas personales de situaciones reales y prácticas
                        </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                            Planes en Práctica
                        </span>
                        <div className="text-xl font-bold font-mono text-amber-400">
                            {(progress?.errorReflections || []).filter(r => r.status !== 'completado').length}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">
                            Objetivos de mejora en aplicación activa
                        </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                            Planes Consolidados
                        </span>
                        <div className="text-xl font-bold font-mono text-emerald-400">
                            {(progress?.errorReflections || []).filter(r => r.status === 'completado').length}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">
                            Habilidades afianzadas tras reflexión guiada
                        </p>
                    </div>
                </div>

                {/* Frase motivadora en Mi Progreso */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-zinc-300">
                        <span className="text-amber-400 text-sm">✨</span>
                        <span className="italic text-amber-100/90">
                            "{MOTIVATIONAL_QUOTES[0].quote}"
                        </span>
                    </div>
                    <Link href="/admin/academy/aprender-del-error" className="shrink-0 font-bold text-amber-400 hover:text-amber-300 text-[11px] self-end sm:self-center">
                        Ver más frases en Aprender del error →
                    </Link>
                </div>
            </div>

            {/* Restablecimiento con confirmación */}
            <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-5 shadow-lg">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Restablecer aprendizaje local
                </h3>
                <p className="text-xs text-zinc-500 mb-4">
                    Elimina lecciones completadas, intentos de evaluación y simulaciones de Academy para este usuario en este navegador.
                </p>

                {confirmReset ? (
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => { reset(); setConfirmReset(false); }}
                            className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer"
                        >
                            Confirmar restablecimiento
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmReset(false)}
                            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
                        >
                            Cancelar
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setConfirmReset(true)}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs font-bold text-zinc-400 hover:border-zinc-700 hover:text-white transition-all cursor-pointer"
                    >
                        Restablecer progreso
                    </button>
                )}
            </div>
        </div>
    );
}
