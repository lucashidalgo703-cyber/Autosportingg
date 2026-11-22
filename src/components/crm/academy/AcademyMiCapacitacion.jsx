'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useAcademyProgress } from './AcademyProgressProvider';
import { ROLE_TRACKS, getTrackByRole } from '../../../lib/academy/catalog';
import { ROLE_MODULES } from '../../../lib/academy/roleModules';
import { ROLE_SIMULATIONS } from '../../../lib/academy/roleSimulations';
import { summarizeRoleProgress } from '../../../lib/academy/progress';

export default function AcademyMiCapacitacion() {
    const { user } = useAuth();
    const { progress } = useAcademyProgress();

    // Determinar recorrido por defecto según rol
    const initialTrackId = progress?.assignedTrack || (
        user?.role === 'ventas' ? 'ventas' :
        user?.role === 'gestoria_contabilidad' ? 'gestoria' :
        user?.role === 'administrativo' ? 'administracion' : 'ventas'
    );

    const [selectedTrackId, setSelectedTrackId] = useState(initialTrackId);
    const activeTrack = ROLE_TRACKS[selectedTrackId] || ROLE_TRACKS.ventas;

    const summary = summarizeRoleProgress(progress, activeTrack);

    // Módulos del recorrido activo
    const trackModules = ROLE_MODULES.filter(m => activeTrack.moduleIds.includes(m.id));
    const completedSet = new Set(progress?.roleModulesCompleted || []);

    // Primer módulo no completado para el próximo paso
    const nextModule = trackModules.find(m => !completedSet.has(m.id)) || trackModules[0];
    const isTrackCompleted = trackModules.length > 0 && trackModules.every(m => completedSet.has(m.id));

    return (
        <div className="space-y-6">
            {/* Cabecera del recorrido activo y selector de rol */}
            <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-crm-red">
                                Tu Recorrido Formativo
                            </span>
                            <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-300">
                                {activeTrack.title}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            {activeTrack.title} · AutoSporting
                        </h2>
                        <p className="mt-1 text-sm text-zinc-400 max-w-2xl">
                            {activeTrack.description}
                        </p>
                    </div>

                    {/* Selector de recorrido para entrenamiento transversal o supervisión */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-zinc-500 font-medium mr-1">Cambiar recorrido:</span>
                        {Object.values(ROLE_TRACKS).map(track => (
                            <button
                                key={track.id}
                                type="button"
                                onClick={() => setSelectedTrackId(track.id)}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                                    selectedTrackId === track.id
                                        ? 'bg-zinc-200 text-black shadow-md'
                                        : 'border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-white'
                                }`}
                            >
                                {track.id === 'ventas' ? 'Ventas' : track.id === 'gestoria' ? 'Gestoría' : track.id === 'administracion' ? 'Administración' : 'Común'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Barra de progreso global del recorrido */}
                <div className="mt-6 pt-6 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
                        <span className="text-zinc-400">Progreso de la capacitación</span>
                        <span className="text-white font-mono text-sm">{summary.modulesPercent}% ({summary.modulesCompleted}/{summary.modulesTotal} módulos)</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                        <div
                            className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-500"
                            style={{ width: `${summary.modulesPercent}%` }}
                        />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            {summary.simulationsPassed} simulaciones aprobadas
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-400" />
                            {summary.questionAccuracy}% precisión en casos evaluados
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-purple-400" />
                            {summary.errorReflectionsCount} reflexiones en "Aprender del error"
                        </span>
                    </div>
                </div>
            </div>

            {/* Tarjeta de Próximo Paso Recomendado (CTA Principal) */}
            <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/20 via-[#0e0e12] to-zinc-950 p-6 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
                    <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-400 mb-2">
                            ⚡ Próximo paso recomendado
                        </span>
                        <h3 className="text-lg font-bold text-white">
                            {isTrackCompleted ? '¡Completaste todos los módulos del recorrido!' : nextModule.title}
                        </h3>
                        <p className="mt-1 text-xs sm:text-sm text-zinc-400 max-w-2xl">
                            {isTrackCompleted
                                ? 'Podés reforzar tu práctica con las simulaciones interactivas o reflexionar en "Aprender del error".'
                                : nextModule.objective}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href={isTrackCompleted ? '/admin/academy/practicar' : `/admin/academy/aprender?modulo=${nextModule.id}`}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 hover:bg-red-500 px-6 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/30 transition-all cursor-pointer whitespace-nowrap"
                        >
                            {isTrackCompleted ? 'Ir a Practicar Casos →' : 'Continuar Módulo →'}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Módulos que componen el recorrido */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">
                        Módulos de tu recorrido ({trackModules.length})
                    </h3>
                    <Link href="/admin/academy/aprender" className="text-xs font-bold text-red-400 hover:text-red-300">
                        Ver todos los módulos del CRM →
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trackModules.map((module, index) => {
                        const isCompleted = completedSet.has(module.id);
                        return (
                            <div
                                key={module.id}
                                className={`rounded-xl border p-5 transition-all flex flex-col justify-between ${
                                    isCompleted
                                        ? 'border-emerald-500/30 bg-emerald-950/10'
                                        : 'border-zinc-800 bg-[#0e0e12] hover:border-zinc-700'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-[11px] font-bold text-zinc-500">
                                            {module.code} · ~{module.durationMinutes} min
                                        </span>
                                        {isCompleted ? (
                                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                                ✓ Completado
                                            </span>
                                        ) : (
                                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                                Pendiente
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-base font-bold text-white mb-1.5">
                                        {index + 1}. {module.title}
                                    </h4>
                                    <p className="text-xs text-zinc-400 line-clamp-2 mb-4">
                                        {module.objective}
                                    </p>
                                </div>

                                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                                    <span className="text-[11px] text-zinc-500 font-medium">
                                        3 preguntas situacionales + checklist
                                    </span>
                                    <Link
                                        href={`/admin/academy/aprender?modulo=${module.id}`}
                                        className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        {isCompleted ? 'Repasar módulo →' : 'Iniciar módulo →'}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Accesos rápidos a práctica, negociación con IA y tutor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-zinc-800/80">
                <Link
                    href="/admin/academy/negociacion"
                    className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 to-zinc-900/60 p-5 hover:border-indigo-500/60 transition-all group shadow-md"
                >
                    <div className="text-2xl mb-2">💬</div>
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">Nuevo</span>
                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                            Negociación con IA
                        </h4>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                        8 escenarios reales con clientes simulados y evaluación independiente de 6 competencias.
                    </p>
                </Link>

                <Link
                    href="/admin/academy/practicar"
                    className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-5 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all group"
                >
                    <div className="text-2xl mb-2">🎯</div>
                    <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                        Simulaciones y Casos
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">
                        Casos prácticos de negocio con consecuencias inmediatas y rúbricas explícitas.
                    </p>
                </Link>

                <Link
                    href="/admin/academy/aprender-del-error"
                    className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-5 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all group"
                >
                    <div className="text-2xl mb-2">💡</div>
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        Aprender del Error
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">
                        Reflexión guiada en 5 pasos, plan de mejora individual y privacidad asegurada.
                    </p>
                </Link>

                <Link
                    href="/admin/academy/tutor"
                    className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-5 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all group"
                >
                    <div className="text-2xl mb-2">🧭</div>
                    <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                        Tutor de Procedimientos
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">
                        Respuestas a dudas operativas con cita oficial de fuentes y versiones vigentes.
                    </p>
                </Link>
            </div>

            {/* Aviso de privacidad y límites operativos */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs text-zinc-500 leading-relaxed">
                <span className="font-bold text-zinc-400">Aviso sobre permisos y privacidad: </span>
                El avance registrado en Academy acredita tu formación y práctica profesional. No modifica automáticamente tus permisos operativos del CRM ni abre secciones restringidas a otros roles. Tu supervisor puede verificar tu progreso porcentual y competencias demostradas; tus notas en "Aprender del error" son de carácter privado salvo que elijas compartirlas expresamente.
            </div>
        </div>
    );
}
