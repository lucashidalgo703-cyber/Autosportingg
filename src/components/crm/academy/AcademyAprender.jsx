'use client';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAcademyProgress } from './AcademyProgressProvider';
import { ROLE_MODULES } from '../../../lib/academy/roleModules';

export default function AcademyAprender() {
    const searchParams = useSearchParams();
    const initialModuleId = searchParams.get('modulo') || ROLE_MODULES[0].id;

    const [selectedModuleId, setSelectedModuleId] = useState(initialModuleId);
    const [roleFilter, setRoleFilter] = useState('todos');
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [submittedQuestions, setSubmittedQuestions] = useState({});

    const { progress, completeRoleModule, recordRoleQuestion } = useAcademyProgress();

    const currentModule = useMemo(() => {
        return ROLE_MODULES.find(m => m.id === selectedModuleId) || ROLE_MODULES[0];
    }, [selectedModuleId]);

    const filteredModules = useMemo(() => {
        if (roleFilter === 'todos') return ROLE_MODULES;
        return ROLE_MODULES.filter(m => m.role === roleFilter || m.role === 'comun');
    }, [roleFilter]);

    const isModuleCompleted = (progress?.roleModulesCompleted || []).includes(currentModule.id);

    const handleSelectOption = (questionId, optionIndex) => {
        setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };

    const handleAnswerSubmit = (questionId, question) => {
        const selectedIdx = selectedAnswers[questionId];
        if (selectedIdx === undefined) return;

        const isCorrect = question.options[selectedIdx].isCorrect;
        setSubmittedQuestions(prev => ({ ...prev, [questionId]: true }));
        recordRoleQuestion(questionId, isCorrect, selectedIdx);

        // Si se respondieron todas las preguntas del módulo, marcar el módulo como completado
        const allAnswered = currentModule.situationalQuestions.every(q =>
            q.id === questionId || submittedQuestions[q.id] || progress?.roleQuestionsAnswered?.[q.id]
        );
        if (allAnswered) {
            completeRoleModule(currentModule.id);
        }
    };

    const currentIndex = filteredModules.findIndex(m => m.id === currentModule.id);
    const prevModule = currentIndex > 0 ? filteredModules[currentIndex - 1] : null;
    const nextModule = currentIndex < filteredModules.length - 1 ? filteredModules[currentIndex + 1] : null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Barra lateral de selección de módulos (4 columnas) */}
            <div className="lg:col-span-4 space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4 shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                            Módulos de Formación
                        </h3>
                        <span className="text-[11px] font-mono text-zinc-500 font-bold">
                            {filteredModules.length} disponibles
                        </span>
                    </div>

                    {/* Filtros por rol */}
                    <div className="grid grid-cols-2 gap-1.5 mb-4 text-[11px]">
                        {[
                            ['todos', 'Todos'],
                            ['comun', 'Común'],
                            ['ventas', 'Ventas'],
                            ['gestoria', 'Gestoría'],
                            ['administracion', 'Administración']
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setRoleFilter(key)}
                                className={`rounded-lg py-1.5 px-2 font-semibold text-center transition-all cursor-pointer ${
                                    roleFilter === key
                                        ? 'bg-zinc-200 text-black shadow-sm'
                                        : 'bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Lista scrolleable de módulos */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                        {filteredModules.map((mod) => {
                            const isSelected = mod.id === currentModule.id;
                            const isDone = (progress?.roleModulesCompleted || []).includes(mod.id);

                            return (
                                <button
                                    key={mod.id}
                                    type="button"
                                    onClick={() => setSelectedModuleId(mod.id)}
                                    className={`w-full text-left rounded-xl p-3 border transition-all cursor-pointer flex flex-col gap-1 ${
                                        isSelected
                                            ? 'border-red-500/60 bg-red-950/20 text-white shadow-md'
                                            : isDone
                                            ? 'border-emerald-500/20 bg-emerald-950/5 text-zinc-300 hover:border-zinc-700'
                                            : 'border-zinc-800/80 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-mono font-bold text-zinc-500">
                                            {mod.code}
                                        </span>
                                        {isDone && (
                                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                ✓ Listo
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold line-clamp-1">
                                        {mod.title}
                                    </span>
                                    <span className="text-[10px] text-zinc-500">
                                        {mod.roleLabel} · ~{mod.durationMinutes} min
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Contenido detallado del módulo seleccionado (8 columnas) */}
            <div className="lg:col-span-8 space-y-6">
                <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-xl">
                    {/* Encabezado del módulo */}
                    <div className="border-b border-zinc-800/80 pb-5">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-300">
                                {currentModule.code} v{currentModule.version}
                            </span>
                            <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] font-bold text-zinc-400 uppercase">
                                {currentModule.roleLabel}
                            </span>
                            <span className="text-xs text-zinc-500">
                                Duración estimada: ~{currentModule.durationMinutes} min
                            </span>
                            {isModuleCompleted ? (
                                <span className="ml-auto rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-0.5 text-[11px] font-bold uppercase text-emerald-400">
                                    ✓ Módulo Completado
                                </span>
                            ) : (
                                <span className="ml-auto rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-[11px] font-bold uppercase text-amber-400">
                                    En curso
                                </span>
                            )}
                        </div>

                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            {currentModule.title}
                        </h2>

                        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block mb-1">
                                Objetivo del módulo
                            </span>
                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
                                {currentModule.objective}
                            </p>
                        </div>
                    </div>

                    {/* Explicación y relevancia en el negocio */}
                    <div className="mt-6 space-y-4">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                ¿Por qué es fundamental en AutoSporting?
                            </h3>
                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/80">
                                {currentModule.importance}
                            </p>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                Procedimiento y conceptos clave
                            </h3>
                            <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line bg-zinc-900/20 p-4 rounded-xl border border-zinc-800/80 font-sans">
                                {currentModule.explanation}
                            </div>
                        </div>

                        {/* Ejemplo de AutoSporting con datos ficticios situados en Comodoro */}
                        <div className="rounded-xl border border-blue-500/30 bg-blue-950/10 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-base">📍</span>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                                    Ejemplo en AutoSporting (Comodoro Rivadavia)
                                </h4>
                            </div>
                            <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                                {currentModule.example}
                            </div>
                        </div>

                        {/* Checklist operativo */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
                                <span>📋</span> Checklist para aplicar lo aprendido
                            </h4>
                            <ul className="space-y-2">
                                {currentModule.checklist.map((step, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-800 font-mono text-[10px] font-bold text-zinc-400">
                                            {idx + 1}
                                        </span>
                                        <span className="pt-0.5">{step}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Errores frecuentes y cómo corregirlos */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-2">
                                <span>⚠️</span> Errores frecuentes y cómo corregirlos
                            </h4>
                            <div className="space-y-3">
                                {currentModule.frequentErrors.map((err, idx) => (
                                    <div key={idx} className="rounded-lg border border-red-500/20 bg-red-950/10 p-3 text-xs space-y-1">
                                        <p className="text-red-300 font-semibold">❌ Error: {err.error}</p>
                                        <p className="text-emerald-300 font-medium">✓ Corrección: {err.correction}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actividad práctica */}
                        <div className="rounded-xl border border-purple-500/30 bg-purple-950/10 p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1.5 flex items-center gap-2">
                                <span>✍️</span> Actividad práctica individual
                            </h4>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                {currentModule.practicalActivity}
                            </p>
                        </div>

                        {/* 3 Preguntas situacionales con devolución */}
                        <div className="pt-4 border-t border-zinc-800/80">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                                        Preguntas Situacionales con Devolución ({currentModule.situationalQuestions.length})
                                    </h3>
                                    <p className="text-xs text-zinc-400">
                                        Elegí tu respuesta y recibí la justificación técnica de cada opción.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {currentModule.situationalQuestions.map((q, qIndex) => {
                                    const selectedOptionIdx = selectedAnswers[q.id];
                                    const isSubmitted = submittedQuestions[q.id] || progress?.roleQuestionsAnswered?.[q.id];
                                    const savedAnswer = progress?.roleQuestionsAnswered?.[q.id];
                                    const effectiveSelectedIdx = isSubmitted && savedAnswer ? savedAnswer.optionIndex : selectedOptionIdx;

                                    return (
                                        <div key={q.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5 space-y-3">
                                            <div className="flex items-start gap-2">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-600/20 border border-red-500/30 font-bold text-xs text-red-400">
                                                    {qIndex + 1}
                                                </span>
                                                <h4 className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                                                    {q.question}
                                                </h4>
                                            </div>

                                            <div className="space-y-2 mt-3">
                                                {q.options.map((option, optIdx) => {
                                                    const isSelected = effectiveSelectedIdx === optIdx;
                                                    const showFeedback = isSubmitted;

                                                    let optionStyle = 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/40';
                                                    if (isSelected) {
                                                        optionStyle = 'border-red-500/80 bg-red-950/20 text-white';
                                                    }
                                                    if (showFeedback) {
                                                        if (option.isCorrect) {
                                                            optionStyle = 'border-emerald-500 bg-emerald-950/30 text-emerald-200';
                                                        } else if (isSelected && !option.isCorrect) {
                                                            optionStyle = 'border-red-500 bg-red-950/30 text-red-200';
                                                        }
                                                    }

                                                    return (
                                                        <div key={optIdx} className="space-y-1">
                                                            <button
                                                                type="button"
                                                                disabled={isSubmitted}
                                                                onClick={() => handleSelectOption(q.id, optIdx)}
                                                                className={`w-full text-left rounded-xl p-3 border transition-all text-xs cursor-pointer flex items-start gap-2.5 ${optionStyle}`}
                                                            >
                                                                <span className="font-mono font-bold text-zinc-500 shrink-0">
                                                                    {String.fromCharCode(65 + optIdx)})
                                                                </span>
                                                                <span className="leading-relaxed">{option.text}</span>
                                                            </button>

                                                            {/* Devolución explicativa para cada opción */}
                                                            {showFeedback && (isSelected || option.isCorrect) && (
                                                                <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                                                                    option.isCorrect
                                                                        ? 'bg-emerald-950/20 border border-emerald-500/30 text-emerald-300'
                                                                        : 'bg-red-950/20 border border-red-500/30 text-red-300'
                                                                }`}>
                                                                    <span className="font-bold block mb-0.5">
                                                                        {option.isCorrect ? '✓ Respuesta Correcta:' : '✗ Respuesta Incorrecta:'}
                                                                    </span>
                                                                    {option.feedback}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {!isSubmitted && (
                                                <div className="pt-2 flex justify-end">
                                                    <button
                                                        type="button"
                                                        disabled={selectedOptionIdx === undefined}
                                                        onClick={() => handleAnswerSubmit(q.id, q)}
                                                        className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                                            selectedOptionIdx !== undefined
                                                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                                                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        Comprobar Respuesta
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Criterios de evaluación y refuerzo */}
                        <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                                    Criterios de evaluación observables
                                </span>
                                <ul className="space-y-1.5 text-xs text-zinc-300">
                                    {currentModule.evaluationCriteria.map((crit, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-red-400 font-bold">•</span>
                                            <span>{crit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 flex flex-col justify-between">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                                        Material sugerido para reforzar
                                    </span>
                                    <p className="text-xs text-zinc-300">
                                        {currentModule.reinforcement}
                                    </p>
                                </div>
                                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                                    <span>Fuentes: {currentModule.sources.join(', ')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Navegación anterior / siguiente */}
                        <div className="pt-6 border-t border-zinc-800/80 flex items-center justify-between">
                            {prevModule ? (
                                <button
                                    type="button"
                                    onClick={() => setSelectedModuleId(prevModule.id)}
                                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
                                >
                                    ← Anterior: {prevModule.code}
                                </button>
                            ) : <div />}

                            {nextModule ? (
                                <button
                                    type="button"
                                    onClick={() => setSelectedModuleId(nextModule.id)}
                                    className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                                >
                                    Siguiente: {nextModule.code} →
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => completeRoleModule(currentModule.id)}
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                                >
                                    ✓ Finalizar Módulo
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
