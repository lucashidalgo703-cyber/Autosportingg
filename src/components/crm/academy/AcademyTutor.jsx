'use client';
import { useState } from 'react';
import Link from 'next/link';
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';
import { courses } from '../../../lib/academy/curriculum';
import { structuredTutor, tutorPrompts } from '../../../lib/academy/tutor';
import { TUTOR_PROCEDURES, searchTutorKnowledge } from '../../../lib/academy/roleTutorKnowledge';

export default function AcademyTutor({ service = structuredTutor }) {
    const [activeTab, setActiveTab] = useState('procedimientos'); // 'procedimientos' | 'financiero'

    // Estado del Tutor de Procedimientos Operativos
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState('todos');
    const [roleMessages, setRoleMessages] = useState([]);

    // Estado del Tutor Financiero Original
    const [courseId, setCourseId] = useState(courses[0].id);
    const [lessonIndex, setLessonIndex] = useState(0);
    const [financialMessages, setFinancialMessages] = useState([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const course = courses.find(item => item.id === courseId);

    // Consultas predefinidas requeridas por el encargo
    const quickQueries = [
        {
            title: 'El cliente me pide bajar el precio. ¿Qué preguntas puedo hacer antes de responder?',
            category: 'ventas'
        },
        {
            title: 'Quiero practicar una objeción por el valor de la toma.',
            category: 'ventas'
        },
        {
            title: '¿Qué tengo que revisar antes de derivar este expediente?',
            category: 'gestoria'
        },
        {
            title: 'Recibí un comprobante, pero el pago todavía no está validado. ¿Qué procedimiento debo consultar?',
            category: 'administracion'
        }
    ];

    const handleAskProcedure = (queryText) => {
        const results = searchTutorKnowledge(queryText, selectedRole);
        if (results.length > 0) {
            const best = results[0];
            setRoleMessages(prev => [
                ...prev,
                {
                    question: queryText,
                    answer: best.summary,
                    source: `${best.procedureCode} ${best.version} — ${best.procedureTitle} (${best.status})`,
                    isOfficial: best.isOfficialProcedure,
                    at: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                }
            ].slice(-25));
        } else {
            setRoleMessages(prev => [
                ...prev,
                {
                    question: queryText,
                    answer: 'No se encontró un procedimiento oficial aprobado para esa consulta específica. Se recomienda consultar al responsable de área o Propietario antes de avanzar, para evitar compromisos no autorizados.',
                    source: 'Protocolo de Derivación Interna AutoSporting',
                    isOfficial: false,
                    at: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                }
            ].slice(-25));
        }
        setSearchQuery('');
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        handleAskProcedure(searchQuery.trim());
    };

    const askFinancial = async prompt => {
        if (busy) return;
        setBusy(true); setError('');
        try {
            const reply = await service.respond({ courseId, lessonId: course.lessons[lessonIndex].id, promptId: prompt.id });
            setFinancialMessages(previous => [...previous, { question: prompt.title, ...reply }].slice(-20));
        } catch { setError('No se pudo recuperar la explicación. Volvé a intentarlo.'); }
        finally { setBusy(false); }
    };

    return (
        <div className="space-y-6">
            {/* Cabecera y conmutador de modos */}
            <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-sm">
                                🧭
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                                Tutor de Capacitación · AutoSporting Academy
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            Orientación en Procedimientos y Dudas Operativas
                        </h2>
                        <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                            Respuestas basadas exclusivamente en normas aprobadas de AutoSporting. No accede a márgenes, costos reales ni cajas.
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
                        <button
                            type="button"
                            onClick={() => setActiveTab('procedimientos')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                activeTab === 'procedimientos'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            Procedimientos por Rol
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('financiero')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                activeTab === 'financiero'
                                    ? 'bg-amber-600 text-white shadow-md'
                                    : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            Conceptos Financieros
                        </button>
                    </div>
                </div>
            </div>

            {/* MODO 1: PROCEDIMIENTOS OPERATIVOS POR ROL */}
            {activeTab === 'procedimientos' ? (
                <div className="space-y-6">
                    {/* Consultas Rápidas Frecuentes */}
                    <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                                Consultas Frecuentes en el Negocio
                            </h3>
                            <div className="flex gap-1.5 text-[11px]">
                                {['todos', 'ventas', 'gestoria', 'administracion'].map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setSelectedRole(r)}
                                        className={`rounded-lg px-2.5 py-1 font-semibold capitalize cursor-pointer ${
                                            selectedRole === r
                                                ? 'bg-zinc-200 text-black'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {quickQueries
                                .filter(q => selectedRole === 'todos' || q.category === selectedRole)
                                .map((q, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleAskProcedure(q.title)}
                                        className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 text-left text-xs font-semibold text-zinc-300 hover:border-blue-500/50 hover:bg-zinc-800/60 hover:text-white transition-all cursor-pointer flex items-center justify-between group"
                                    >
                                        <span className="line-clamp-2">💬 {q.title}</span>
                                        <span className="text-zinc-500 group-hover:text-blue-400 shrink-0 ml-2">→</span>
                                    </button>
                                ))}
                        </div>

                        {/* Buscador de procedimientos */}
                        <form onSubmit={handleSearchSubmit} className="pt-3 border-t border-zinc-800/80 flex gap-2">
                            <input
                                type="text"
                                placeholder="Escribí una duda: ej. cómo responder objeción de toma, qué verificar en un 08, etc."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                            />
                            <button
                                type="submit"
                                className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all cursor-pointer shrink-0"
                            >
                                Consultar
                            </button>
                        </form>
                    </div>

                    {/* Historial de respuestas del Tutor de Procedimientos */}
                    <div className="space-y-4">
                        {roleMessages.length === 0 ? (
                            <div className="rounded-2xl border border-zinc-800/80 bg-[#0e0e12]/60 p-8 text-center text-xs text-zinc-500">
                                Todavía no realizaste consultas en esta sesión.
                                <br />
                                Seleccioná una de las preguntas frecuentes arriba o escribí tu duda en el buscador.
                            </div>
                        ) : (
                            roleMessages.map((msg, idx) => (
                                <div key={idx} className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-5 shadow-lg space-y-3">
                                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                                        <span className="text-xs font-bold text-white flex items-center gap-2">
                                            <span>❓</span> {msg.question}
                                        </span>
                                        <span className="text-[10px] font-mono text-zinc-500">{msg.at}</span>
                                    </div>

                                    <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
                                        {msg.answer}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                                        <span className="text-zinc-400 font-mono">
                                            Fuente: <strong className="text-zinc-300">{msg.source}</strong>
                                        </span>
                                        {msg.isOfficial && (
                                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                                ✓ Procedimiento Vigente
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {roleMessages.length > 0 && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setRoleMessages([])}
                                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                                >
                                    Limpiar consultas de esta sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* MODO 2: TUTOR FINANCIERO ESTRUCTURADO ORIGINAL */
                <div className="space-y-5">
                    <CrmCard>
                        <p className="font-semibold text-amber-400">Tutor Financiero Estructurado · Motor Determinístico</p>
                        <p className="mt-2 text-sm leading-6 text-crm-fg-muted">
                            Elegí un curso y una lección financiera para repasar conceptos, fórmulas y glosario. Las respuestas provienen estrictamente de las lecciones de Academy sin conexiones a servicios externos.
                        </p>
                    </CrmCard>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm text-zinc-300 font-medium">
                            Curso Financiero
                            <select
                                value={courseId}
                                onChange={event => { setCourseId(event.target.value); setLessonIndex(0); }}
                                className="mt-2 min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-white focus:outline-none"
                            >
                                {courses.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                            </select>
                        </label>

                        <label className="text-sm text-zinc-300 font-medium">
                            Lección
                            <select
                                value={lessonIndex}
                                onChange={event => setLessonIndex(Number(event.target.value))}
                                className="mt-2 min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-white focus:outline-none"
                            >
                                {course.lessons.map((lesson, index) => <option value={index} key={lesson.id}>{lesson.title}</option>)}
                            </select>
                        </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {tutorPrompts.map(prompt => (
                            <CrmButton key={prompt.id} variant="secondary" disabled={busy} onClick={() => askFinancial(prompt)}>
                                {prompt.title}
                            </CrmButton>
                        ))}
                    </div>

                    {error && <p role="alert" className="text-sm text-crm-red">{error}</p>}

                    <div role="log" aria-label="Conversación con guía estructurada" aria-live="polite" className="space-y-4">
                        {financialMessages.length === 0 ? (
                            <CrmCard>
                                <p className="text-sm text-crm-fg-muted">Todavía no hay consultas. Probá «Mostrame un ejemplo numérico».</p>
                            </CrmCard>
                        ) : (
                            financialMessages.map((message, index) => (
                                <CrmCard key={index}>
                                    <h2 className="font-semibold text-white">{message.question}</h2>
                                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">{message.text}</p>
                                    <p className="mt-4 text-xs text-crm-fg-muted">Fuente: {message.source}</p>
                                    <Link className="mt-2 inline-block text-sm text-amber-400 font-semibold" href={message.href}>
                                        Abrir lección en cursos →
                                    </Link>
                                </CrmCard>
                            ))
                        )}
                    </div>

                    {financialMessages.length > 0 && (
                        <CrmButton variant="ghost" onClick={() => setFinancialMessages([])}>
                            Limpiar conversación de esta sesión
                        </CrmButton>
                    )}
                </div>
            )}
        </div>
    );
}
