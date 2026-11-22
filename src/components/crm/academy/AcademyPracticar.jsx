'use client';
import { useState } from 'react';
import { useAcademyProgress } from './AcademyProgressProvider';
import { ALL_ROLE_SIMULATIONS } from '../../../lib/academy/roleSimulations';

export default function AcademyPracticar() {
    const [selectedCaseId, setSelectedCaseId] = useState(ALL_ROLE_SIMULATIONS[0].id);
    const [selectedDecisionId, setSelectedDecisionId] = useState(null);
    const [hasExecuted, setHasExecuted] = useState(false);
    const [roleFilter, setRoleFilter] = useState('todos');

    const { progress, recordRoleSimulation } = useAcademyProgress();

    const currentCase = ALL_ROLE_SIMULATIONS.find(s => s.id === selectedCaseId) || ALL_ROLE_SIMULATIONS[0];
    const userAttempts = (progress?.roleSimulations || []).filter(s => s.simulationId === currentCase.id);
    const bestScore = userAttempts.length > 0 ? Math.max(...userAttempts.map(a => a.score)) : null;

    const filteredCases = ALL_ROLE_SIMULATIONS.filter(c => {
        if (roleFilter === 'todos') return true;
        return c.role === roleFilter;
    });

    const handleSelectCase = (id) => {
        setSelectedCaseId(id);
        setSelectedDecisionId(null);
        setHasExecuted(false);
    };

    const handleExecuteDecision = () => {
        if (!selectedDecisionId) return;
        const decision = currentCase.decisions.find(d => d.id === selectedDecisionId);
        if (!decision) return;

        setHasExecuted(true);
        recordRoleSimulation({
            simulationId: currentCase.id,
            selectedOption: selectedDecisionId,
            score: decision.score,
            rubricBreakdown: decision.rubricBreakdown
        });
    };

    const handleResetCase = () => {
        setSelectedDecisionId(null);
        setHasExecuted(false);
    };

    const currentDecision = currentCase.decisions.find(d => d.id === selectedDecisionId);

    return (
        <div className="space-y-6">
            {/* Aviso de entorno simulado */}
            <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        🛡️
                    </span>
                    <span>
                        <strong className="text-white">Entorno de Simulación Aislado:</strong> Las decisiones tomadas en estos casos prácticos no modifican inventario real, no registran cobros ni envían mensajes externos.
                    </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-zinc-500 font-mono">
                    <span>Casos completados:</span>
                    <span className="text-white font-bold">
                        {(progress?.roleSimulations || []).filter(s => s.score >= 70).length} / {ROLE_SIMULATIONS.length}
                    </span>
                </div>
            </div>

            {/* Selector de casos y filtros */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Filtrar por rol:
                    </span>
                    {['todos', 'ventas', 'gestoria', 'administracion'].map(r => (
                        <button
                            key={r}
                            type="button"
                            onClick={() => setRoleFilter(r)}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-all cursor-pointer ${
                                roleFilter === r
                                    ? 'bg-zinc-200 text-black shadow-sm'
                                    : 'border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Lista de Casos (4 columnas) */}
                <div className="lg:col-span-4 space-y-2">
                    {filteredCases.map((sim, index) => {
                        const isSelected = sim.id === currentCase.id;
                        const attempts = (progress?.roleSimulations || []).filter(s => s.simulationId === sim.id);
                        const topScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : null;

                        return (
                            <button
                                key={sim.id}
                                type="button"
                                onClick={() => handleSelectCase(sim.id)}
                                className={`w-full text-left rounded-xl p-4 border transition-all cursor-pointer flex flex-col gap-1.5 ${
                                    isSelected
                                        ? 'border-red-500/60 bg-red-950/20 text-white shadow-md'
                                        : 'border-zinc-800 bg-[#0e0e12] text-zinc-300 hover:border-zinc-700'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-crm-red">
                                        Caso {index + 1} · {sim.roleLabel}
                                    </span>
                                    {topScore !== null && (
                                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                                            topScore >= 70
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                        }`}>
                                            Mejor: {topScore} pts
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-xs sm:text-sm font-bold line-clamp-2">
                                    {sim.title}
                                </h4>
                                <span className="text-[11px] text-zinc-500 font-medium">
                                    ~{sim.estimatedMinutes} min · {sim.decisions.length} alternativas
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Simulador Interactivo (8 columnas) */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-xl space-y-6">
                        {/* Cabecera del caso */}
                        <div className="border-b border-zinc-800/80 pb-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-crm-red">
                                    {currentCase.roleLabel} · Simulación de Negocio
                                </span>
                                {bestScore !== null && (
                                    <span className="text-xs font-mono text-zinc-400">
                                        Tu récord previo: <strong className="text-white">{bestScore} / 100</strong>
                                    </span>
                                )}
                            </div>
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                {currentCase.title}
                            </h2>
                        </div>

                        {/* Contexto y situación planteada */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                                Contexto en AutoSporting (Comodoro Rivadavia)
                            </span>
                            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line font-medium">
                                {currentCase.context}
                            </p>
                        </div>

                        {/* Objetivo del caso */}
                        <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-3.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-1">
                                Objetivo a demostrar
                            </span>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                {currentCase.objective}
                            </p>
                        </div>

                        {/* Información disponible / Documentos */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                                Información y datos disponibles
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {currentCase.availableInfo.map((info, idx) => (
                                    <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs space-y-1">
                                        <span className="font-bold text-zinc-300 block">{info.label}</span>
                                        <p className="text-zinc-400 leading-relaxed text-[11px]">{info.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Decisiones a tomar */}
                        {!hasExecuted ? (
                            <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                                    ¿Qué decisión tomás ante esta situación?
                                </h4>

                                <div className="space-y-2.5">
                                    {currentCase.decisions.map((decision) => {
                                        const isSelected = selectedDecisionId === decision.id;

                                        return (
                                            <button
                                                key={decision.id}
                                                type="button"
                                                onClick={() => setSelectedDecisionId(decision.id)}
                                                className={`w-full text-left rounded-xl p-4 border transition-all text-xs cursor-pointer flex flex-col gap-1.5 ${
                                                    isSelected
                                                        ? 'border-red-500 bg-red-950/20 text-white shadow-md'
                                                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/40'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-white text-xs sm:text-sm">
                                                        {decision.title}
                                                    </span>
                                                    <span className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                        isSelected ? 'border-red-500 bg-red-600' : 'border-zinc-600'
                                                    }`}>
                                                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                                    </span>
                                                </div>
                                                <p className="text-zinc-400 leading-relaxed text-[11px] font-mono">
                                                    {decision.action}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="button"
                                        disabled={!selectedDecisionId}
                                        onClick={handleExecuteDecision}
                                        className={`rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                            selectedDecisionId
                                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
                                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        }`}
                                    >
                                        Ejecutar Decisión y Ver Consecuencias
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Resultado, consecuencias y rúbrica explícita */
                            <div className="pt-4 border-t border-zinc-800/80 space-y-6">
                                {/* Consecuencias operativas inmediatas */}
                                <div className={`rounded-xl border p-5 space-y-2 ${
                                    currentDecision.score >= 70
                                        ? 'border-emerald-500/40 bg-emerald-950/20'
                                        : 'border-red-500/40 bg-red-950/20'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${
                                            currentDecision.score >= 70 ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                            {currentDecision.score >= 70 ? '✓ Resolución Favorable' : '⚠️ Consecuencias de Riesgo'}
                                        </span>
                                        <span className="text-base sm:text-lg font-mono font-bold text-white">
                                            Puntaje: {currentDecision.score} / 100
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">
                                        {currentDecision.outcome}
                                    </p>
                                </div>

                                {/* Devolución estructurada */}
                                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-1.5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                        Devolución formativa
                                    </h4>
                                    <p className="text-xs text-zinc-300 leading-relaxed">
                                        {currentDecision.feedback}
                                    </p>
                                </div>

                                {/* Desglose de Rúbrica */}
                                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                        Desglose de la Rúbrica de Evaluación
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        {Object.entries(currentDecision.rubricBreakdown || {}).map(([key, val]) => (
                                            <div key={key} className="rounded-lg bg-zinc-950/60 border border-zinc-800 p-2.5 text-center">
                                                <span className="text-[10px] text-zinc-400 capitalize block mb-1">
                                                    {key.replace(/([A-Z])/g, ' $1')}
                                                </span>
                                                <span className={`font-mono text-sm font-bold ${
                                                    val >= 70 ? 'text-emerald-400' : val >= 50 ? 'text-amber-400' : 'text-red-400'
                                                }`}>
                                                    {val}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Botón para reintentar o probar otra variante */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleResetCase}
                                        className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-500 transition-all cursor-pointer"
                                    >
                                        🔄 Intentar otra alternativa de este caso
                                    </button>

                                    <Link
                                        href="/admin/academy/aprender-del-error"
                                        className="rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-black shadow-md transition-all text-center"
                                    >
                                        Reflexionar en "Aprender del error" →
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Pequeño componente Link auxiliar para navegación interna
function Link({ href, className, children }) {
    return <a href={href} className={className}>{children}</a>;
}
