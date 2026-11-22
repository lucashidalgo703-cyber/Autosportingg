'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';

const CATEGORY_LABELS = {
    precio: { label: 'Precios', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    kilometraje: { label: 'Kilometraje', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    version_equipamiento: { label: 'Versión y Equipamiento', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    reconocimiento: { label: 'Reconocimiento', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    procedimiento: { label: 'Procedimientos', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    negociacion: { label: 'Negociación', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' }
};

export default function AcademyDesafioDiario() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [challengeData, setChallengeData] = useState(null);
    const [dailyStatus, setDailyStatus] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [numericInputs, setNumericInputs] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [isPracticeMode, setIsPracticeMode] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        loadTodayChallenge();
    }, []);

    // Cronómetro de examen
    useEffect(() => {
        if (!startTime || result) return;
        const interval = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime, result]);

    const loadTodayChallenge = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/academy/daily-challenge/today', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('No se pudo cargar el desafío diario.');
            const data = await res.json();
            setChallengeData(data.challenge);
            setDailyStatus(data.status);
        } catch (err) {
            setErrorMsg(err.message || 'Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    const startQuiz = (practice = false) => {
        setIsPracticeMode(practice);
        setCurrentIndex(0);
        setSelectedAnswers({});
        setNumericInputs({});
        setResult(null);
        setStartTime(Date.now());
        setElapsedSeconds(0);
    };

    const handleSelectOption = (questionId, optIdx) => {
        setSelectedAnswers(prev => ({ ...prev, [questionId]: optIdx }));
    };

    const handleNumericChange = (questionId, val) => {
        setNumericInputs(prev => ({ ...prev, [questionId]: val }));
    };

    const handleSubmitQuiz = async () => {
        if (!challengeData || !challengeData.questions) return;
        setSubmitting(true);
        setErrorMsg('');
        try {
            const token = localStorage.getItem('token');
            const answersPayload = challengeData.questions.map(q => ({
                questionId: q.questionId,
                category: q.category,
                carId: q.carId,
                selectedOptionIndex: selectedAnswers[q.questionId] ?? -1,
                numericResponse: numericInputs[q.questionId] ? parseFloat(String(numericInputs[q.questionId]).replace(/[^\d.,]/g, '').replace(',', '.')) : null
            }));

            const res = await fetch('/api/admin/academy/daily-challenge/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    challengeId: challengeData._id,
                    answers: answersPayload,
                    durationSeconds: elapsedSeconds,
                    attemptType: isPracticeMode ? 'practice_review' : 'official_daily'
                })
            });

            if (!res.ok) throw new Error('Error al enviar el desafío diario.');
            const resData = await res.json();
            setResult(resData);
            if (!isPracticeMode) {
                setDailyStatus(prev => ({ ...prev, status: 'completado', officialScore: resData.score }));
            }
        } catch (err) {
            setErrorMsg(err.message || 'Error al calificar el examen.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-zinc-800 bg-[#0e0e12] p-8 text-zinc-400">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    <span className="text-sm font-medium">Cargando desafío diario...</span>
                </div>
            </div>
        );
    }

    if (errorMsg && !challengeData) {
        return (
            <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-center text-red-200">
                <p className="font-semibold">{errorMsg}</p>
                <button
                    onClick={loadTodayChallenge}
                    className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    const questions = challengeData?.questions || [];
    const currentQ = questions[currentIndex];

    // =========================================================================
    // VISTA DE INTRODUCCIÓN / ESTADO DEL DÍA
    // =========================================================================
    if (!startTime && !result) {
        const isCompleted = dailyStatus?.status === 'completado';
        return (
            <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 sm:p-8 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600/10 border border-red-600/30 text-sm">
                                    ⚡
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider text-crm-red">
                                    Desafío Diario de Ventas
                                </span>
                                <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-[11px] text-zinc-400 font-mono">
                                    {challengeData?.challengeDate}
                                </span>
                            </div>
                            <h2 className="mt-2 text-xl sm:text-2xl font-bold text-white tracking-tight">
                                {challengeData?.title || 'Desafío Diario AutoSporting'}
                            </h2>
                            <p className="mt-1 text-xs sm:text-sm text-zinc-400 max-w-2xl">
                                8 preguntas rápidas sobre vehículos disponibles, precios vigentes, kilometrajes y procedimientos comerciales para memorizar el stock del salón.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {isCompleted ? (
                                <div className="text-right">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                                        ✓ Completado Hoy
                                    </span>
                                    <div className="mt-1 text-xs text-zinc-400">
                                        Calificación oficial: <strong className="text-white text-sm">{dailyStatus.officialScore}/100</strong>
                                    </div>
                                </div>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                                    ⏳ Evaluación Pendiente
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Preguntas</span>
                            <p className="text-base font-bold text-white mt-0.5">8 en total</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Duración sugerida</span>
                            <p className="text-base font-bold text-white mt-0.5">5 a 10 min</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Puntaje máximo</span>
                            <p className="text-base font-bold text-white mt-0.5">100 puntos</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Supervisión</span>
                            <p className="text-base font-bold text-white mt-0.5">Notifica a Dirección</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        {!isCompleted ? (
                            <button
                                onClick={() => startQuiz(false)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all cursor-pointer"
                            >
                                Iniciar Desafío Oficial del Día →
                            </button>
                        ) : (
                            <button
                                onClick={() => startQuiz(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-zinc-800 transition-all cursor-pointer"
                            >
                                🔄 Realizar Repaso de Práctica Adicional
                            </button>
                        )}
                        <Link
                            href="/admin/academy/aprender"
                            className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
                        >
                            Repasar Módulos de Rol
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // VISTA DE RESULTADO FINAL Y DEVOLUCIÓN
    // =========================================================================
    if (result) {
        return (
            <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 sm:p-8 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-crm-red">
                                {isPracticeMode ? 'Repaso de Práctica Finalizado' : 'Desafío Oficial Completado'}
                            </span>
                            <h2 className="mt-1 text-2xl font-bold text-white tracking-tight">
                                Resultado: {result.score} / 100
                            </h2>
                            <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                                Respuestas correctas: <strong className="text-white">{result.correctCount}</strong> de {result.totalQuestions} · Tiempo empleado: {elapsedSeconds} segundos.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => startQuiz(true)}
                                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
                            >
                                🔄 Repetir Examen de Práctica
                            </button>
                            <button
                                onClick={() => { setResult(null); setStartTime(null); }}
                                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
                            >
                                Finalizar
                            </button>
                        </div>
                    </div>

                    <div className="my-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Devolución y Recomendación:</span>
                        <p className="mt-1 text-sm text-zinc-200 font-medium">{result.recommendedReview}</p>
                    </div>

                    {/* Revisión pregunta por pregunta */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                            Desglose de Preguntas y Respuestas:
                        </h3>

                        {result.answers.map((ans, idx) => {
                            const qDef = questions.find(q => q.questionId === ans.questionId);
                            const catStyle = CATEGORY_LABELS[ans.category] || CATEGORY_LABELS.precio;
                            return (
                                <div
                                    key={ans.questionId}
                                    className={`rounded-xl border p-4 transition-all ${
                                        ans.isCorrect
                                            ? 'border-emerald-500/30 bg-emerald-950/10'
                                            : 'border-red-500/30 bg-red-950/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold text-zinc-400">#{idx + 1}</span>
                                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${catStyle.color}`}>
                                                {catStyle.label}
                                            </span>
                                        </div>
                                        <span className={`text-xs font-bold ${ans.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {ans.isCorrect ? '✓ Correcto (+12.5 pts)' : '✗ Incorrecto (0 pts)'}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-sm font-semibold text-white">
                                        {qDef?.questionText}
                                    </p>

                                    <div className="mt-3 rounded-lg bg-black/40 p-3 text-xs space-y-1">
                                        {qDef?.options && ans.selectedOptionIndex >= 0 && (
                                            <div className="text-zinc-300">
                                                <span className="text-zinc-500">Tu respuesta:</span>{' '}
                                                <span className={ans.isCorrect ? 'text-emerald-300 font-semibold' : 'text-red-300 line-through'}>
                                                    {qDef.options[ans.selectedOptionIndex]}
                                                </span>
                                            </div>
                                        )}
                                        {!ans.isCorrect && qDef?.options && (
                                            <div className="text-zinc-300">
                                                <span className="text-zinc-500">Respuesta correcta:</span>{' '}
                                                <span className="text-emerald-400 font-semibold">
                                                    {qDef.options[qDef.correctOptionIndex]}
                                                </span>
                                            </div>
                                        )}
                                        <div className="text-zinc-400 pt-1 border-t border-zinc-800/80">
                                            <span className="text-zinc-500">Fundamento:</span> {ans.feedback}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // VISTA DEL RUNNER INTERACTIVO DE PREGUNTAS (1 A 8)
    // =========================================================================
    const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
    const catStyle = CATEGORY_LABELS[currentQ?.category] || CATEGORY_LABELS.precio;
    const isAnswered = currentQ?.questionFormat === 'numeric_input'
        ? (numericInputs[currentQ?.questionId] !== undefined && String(numericInputs[currentQ?.questionId]).trim() !== '')
        : (selectedAnswers[currentQ?.questionId] !== undefined);

    const isLast = currentIndex === questions.length - 1;

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-5 sm:p-7 shadow-xl">
                {/* Cabecera del runner */}
                <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-2.5">
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${catStyle.color}`}>
                            {catStyle.label}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                            Pregunta {currentIndex + 1} de {questions.length}
                        </span>
                        {isPracticeMode && (
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                Modo Práctica
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                        <span>⏱️</span>
                        <span>{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}</span>
                    </div>
                </div>

                {/* Barra de progreso */}
                <div className="mt-4 h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                    <div
                        className="h-full bg-red-600 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Pregunta actual */}
                <div className="mt-6 space-y-4">
                    {/* Fotografía comercial si corresponde */}
                    {currentQ?.imageUrl && (
                        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 max-w-md mx-auto aspect-video flex items-center justify-center">
                            <img
                                src={currentQ.imageUrl}
                                alt="Vehículo a reconocer"
                                className="h-full w-full object-cover"
                            />
                        </div>
                    )}

                    {/* Ficha técnica compacta del vehículo de contexto si existe */}
                    {currentQ?.carSnapshot && currentQ.category !== 'reconocimiento' && (
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-300">
                            <span className="font-bold text-white">🚗 Unidad: {currentQ.carSnapshot.brand} {currentQ.carSnapshot.name}</span>
                            <span>Año: <strong className="text-zinc-200">{currentQ.carSnapshot.year}</strong></span>
                            <span>Tipo: <strong className="text-zinc-200">{currentQ.carSnapshot.vehicleType}</strong></span>
                            <span>Combustible: <strong className="text-zinc-200">{currentQ.carSnapshot.fuel}</strong></span>
                        </div>
                    )}

                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                        {currentQ?.questionText}
                    </h3>

                    {/* Opciones Multiple Choice */}
                    {currentQ?.options && currentQ.options.length > 0 && (
                        <div className="grid grid-cols-1 gap-2.5 pt-2">
                            {currentQ.options.map((optionText, optIdx) => {
                                const isSelected = selectedAnswers[currentQ.questionId] === optIdx;
                                return (
                                    <button
                                        key={optIdx}
                                        type="button"
                                        onClick={() => handleSelectOption(currentQ.questionId, optIdx)}
                                        className={`flex items-start gap-3 rounded-xl border p-3.5 text-left text-xs sm:text-sm transition-all cursor-pointer ${
                                            isSelected
                                                ? 'border-red-600 bg-red-600/10 text-white font-semibold ring-1 ring-red-600'
                                                : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50'
                                        }`}
                                    >
                                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                                            isSelected ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-700 text-zinc-500'
                                        }`}>
                                            {String.fromCharCode(65 + optIdx)}
                                        </span>
                                        <span className="leading-snug">{optionText}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Entrada numérica tolerante */}
                    {currentQ?.questionFormat === 'numeric_input' && (
                        <div className="space-y-2 pt-2">
                            <label className="text-xs text-zinc-400">Ingresá el valor numérico (admite formato con puntos o sin separadores):</label>
                            <input
                                type="text"
                                value={numericInputs[currentQ.questionId] || ''}
                                onChange={(e) => handleNumericChange(currentQ.questionId, e.target.value)}
                                placeholder="Ej: 36.500.000 o 36500000"
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-mono text-white focus:border-red-600 focus:outline-none"
                            />
                        </div>
                    )}
                </div>

                {errorMsg && (
                    <p className="mt-4 text-xs font-semibold text-red-400">{errorMsg}</p>
                )}

                {/* Botones de navegación */}
                <div className="mt-8 flex items-center justify-between border-t border-zinc-800 pt-4">
                    <button
                        type="button"
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                            currentIndex === 0
                                ? 'opacity-30 cursor-not-allowed text-zinc-600'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                    >
                        ← Anterior
                    </button>

                    {!isLast ? (
                        <button
                            type="button"
                            disabled={!isAnswered}
                            onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                            className={`rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                                !isAnswered
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : 'bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-700 cursor-pointer'
                            }`}
                        >
                            Siguiente →
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={!isAnswered || submitting}
                            onClick={handleSubmitQuiz}
                            className={`rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                                !isAnswered || submitting
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 cursor-pointer'
                            }`}
                        >
                            {submitting ? 'Calificando...' : 'Finalizar y Calificar ✓'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
