'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NEGOTIATION_SCENARIOS, COMPETENCY_DEFINITIONS } from '../../../lib/academy/negotiationScenarios';

export default function AcademyNegociacion() {
    const router = useRouter();
    const [selectedScenario, setSelectedScenario] = useState(NEGOTIATION_SCENARIOS[0]);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationReport, setEvaluationReport] = useState(null);
    const [aiStatus, setAiStatus] = useState({ provider: 'simulated', isRealAiConnected: false });
    const [filterLevel, setFilterLevel] = useState('todos');
    const messagesEndRef = useRef(null);

    // Inicializar chat cuando cambia el escenario
    useEffect(() => {
        resetNegotiation(selectedScenario);
    }, [selectedScenario]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const resetNegotiation = (scenario) => {
        setEvaluationReport(null);
        setMessages([
            {
                id: 'welcome',
                sender: 'buyer',
                text: getInitialGreeting(scenario),
                timestamp: new Date()
            }
        ]);
    };

    function getInitialGreeting(scenario) {
        if (scenario.id === 'desc-01') {
            return `Hola, buenas tardes. Vengo a ver el Corolla 2022. Me gusta el auto, pero $28.500.000 me parece un disparate. Si te transfiero hoy mismo en efectivo, ¿en cuánto me lo dejás cerrado ya?`;
        }
        if (scenario.id === 'toma-02') {
            return `Hola. Estoy buscando cambiar mi camioneta por la Amarok V6 que tienen acá. Tengo una EcoSport 2018 impecable; en MercadoLibre no baja de 16 millones. ¿Cuánto me la toman?`;
        }
        if (scenario.id === 'inde-03') {
            return `Buenas tardes. Estuve mirando el Cruze que tienen afuera. Está lindo pero no sé... tengo que hacer números con mi señora. ¿Qué me podés decir del auto?`;
        }
        if (scenario.id === 'comp-04') {
            return `Qué tal. Vengo de ver una Renegade idéntica a esta en otra agencia de la Ruta 3 y me piden 22 millones y medio. ¿Ustedes por qué están pidiendo 24 millones? A ver si me convencés.`;
        }
        if (scenario.id === 'fina-05') {
            return `Hola, qué tal. Me encanta la Kangoo Stepway para mi negocio. Tengo 7 millones en mano y necesito financiar el saldo ya mismo en cuotas fijas a sola firma con DNI. ¿Sale la aprobación hoy?`;
        }
        if (scenario.id === 'difi-06') {
            return `Buenas. Vengo a ver la Hilux 2020. Espero que no tenga kilómetros bajados ni haya estado en el petróleo como hacen casi todas las agencias de Comodoro. ¿Quién me garantiza los papeles?`;
        }
        if (scenario.id === 'sena-07') {
            return `¡Hola! Me volví loca con el 208 Feline, me lo quiero llevar sí o sí. Te paso 300 mil pesos a tu Mercado Pago personal para que me lo reserves hasta el lunes que viene, ¿dale?`;
        }
        if (scenario.id === 'inte-08') {
            return `Buenas tardes. Me interesa la Ranger XLT. Hagamos un paquete rápido: te entrego mi Gol Trend 2017 en 10.5 millones, 20 millones contados, el resto en cuotas blandas y me llevo la chata hoy mismo. ¿Cerramos?`;
        }
        return `Hola, buenas tardes. Vengo a consultar por el vehículo publicado. ¿Qué condiciones tienen hoy?`;
    }

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if (!inputMessage.trim() || isSending || isEvaluating || evaluationReport) return;

        const userText = inputMessage.trim();
        setInputMessage('');

        const newSellerMsg = {
            id: `seller-${Date.now()}`,
            sender: 'seller',
            text: userText,
            timestamp: new Date()
        };

        const updatedHistory = [...messages, newSellerMsg];
        setMessages(updatedHistory);
        setIsSending(true);

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch('/api/admin/academy/negotiation/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    scenarioId: selectedScenario.id,
                    conversationHistory: updatedHistory,
                    sellerMessage: userText,
                    level: selectedScenario.level
                })
            });

            if (!res.ok) {
                throw new Error(`Error ${res.status} en la simulación.`);
            }

            const data = await res.json();
            setAiStatus({
                provider: data.provider || 'simulated',
                isRealAiConnected: Boolean(data.isRealAiConnected)
            });

            setMessages(prev => [
                ...prev,
                {
                    id: `buyer-${Date.now()}`,
                    sender: 'buyer',
                    text: data.text || 'Entiendo lo que me decís.',
                    timestamp: new Date()
                }
            ]);
        } catch (err) {
            console.error('[Negotiation Send Error]', err);
            // Mensaje de respaldo en caso de desconexión
            setMessages(prev => [
                ...prev,
                {
                    id: `buyer-${Date.now()}`,
                    sender: 'buyer',
                    text: `Entiendo su postura. Sigamos analizando las condiciones para ver si llegamos a un acuerdo favorable.`,
                    timestamp: new Date()
                }
            ]);
        } finally {
            setIsSending(false);
        }
    };

    const handleFinishAndEvaluate = async () => {
        const sellerCount = messages.filter(m => m.sender === 'seller').length;
        if (sellerCount === 0) {
            alert('Debes interactuar al menos una vez con el cliente antes de solicitar la evaluación.');
            return;
        }

        setIsEvaluating(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch('/api/admin/academy/negotiation/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    scenarioId: selectedScenario.id,
                    conversationHistory: messages,
                    level: selectedScenario.level
                })
            });

            if (!res.ok) throw new Error('No se pudo generar la evaluación.');
            const data = await res.json();
            setEvaluationReport(data);
        } catch (err) {
            console.error('[Evaluation Error]', err);
            alert('Ocurrió un inconveniente al evaluar la práctica. Reintentá en unos segundos.');
        } finally {
            setIsEvaluating(false);
        }
    };

    const handleTransferToReflection = () => {
        if (!evaluationReport) return;
        const reflectionDraft = {
            situation: `Negociación en simulador IA: ${selectedScenario.title} (${selectedScenario.vehicleOfInterest.brand} ${selectedScenario.vehicleOfInterest.model}). Resultado: ${evaluationReport.outcomeStatus}.`,
            actionTaken: evaluationReport.keyMoments?.[0]?.sellerQuote || 'Argumentación inicial con el cliente.',
            difficultyEncountered: evaluationReport.improvements?.[0] || 'Dificultad para defender el margen o resolver la objeción sin ceder precipitadamente.',
            alternativeApproach: evaluationReport.keyMoments?.[0]?.suggestedAlternative || 'Aplicar técnica de anclaje de valor y solicitar autorización antes de ofrecer concesiones.',
            reinforcementModuleId: evaluationReport.nextPracticeSuggested === 'desc-01' ? 'ventas-negociacion-objeciones' : 'ventas-permutas-financiacion-autorizaciones'
        };

        if (typeof window !== 'undefined') {
            sessionStorage.setItem('academy_reflection_draft', JSON.stringify(reflectionDraft));
            router.push('/admin/academy/aprender-del-error');
        }
    };

    const filteredScenarios = filterLevel === 'todos'
        ? NEGOTIATION_SCENARIOS
        : NEGOTIATION_SCENARIOS.filter(s => s.level === filterLevel);

    const sellerTurnsCount = messages.filter(m => m.sender === 'seller').length;

    return (
        <div className="space-y-6">
            {/* Header del Simulador */}
            <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950/40 p-6 rounded-2xl border border-zinc-800 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                IA Conversacional
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                aiStatus.isRealAiConnected
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                                {aiStatus.isRealAiConnected ? 'OpenAI Conectado' : 'Motor Pedagógico Simulado Activo'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Entrenamiento de Negociación con IA
                        </h1>
                        <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
                            Conversá libremente con clientes simulados en situaciones comerciales reales de AutoSporting. El evaluador independiente analizará tus respuestas sobre 6 competencias comerciales clave.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => resetNegotiation(selectedScenario)}
                            className="px-3.5 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700"
                        >
                            Reiniciar práctica
                        </button>
                        {sellerTurnsCount > 0 && !evaluationReport && (
                            <button
                                onClick={handleFinishAndEvaluate}
                                disabled={isEvaluating}
                                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isEvaluating ? (
                                    <>
                                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                        </svg>
                                        Evaluando...
                                    </>
                                ) : (
                                    'Finalizar y Evaluar'
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Layout principal: Lista de Escenarios a la izquierda, Conversación a la derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Selector de Escenarios (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-white">Escenarios de Práctica (8)</h2>
                            <div className="flex gap-1 text-[11px]">
                                {['todos', 'principiante', 'intermedio', 'avanzado'].map(lvl => (
                                    <button
                                        key={lvl}
                                        onClick={() => setFilterLevel(lvl)}
                                        className={`px-2 py-0.5 rounded capitalize transition-colors ${
                                            filterLevel === lvl
                                                ? 'bg-zinc-700 text-white font-medium'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        {lvl === 'todos' ? 'Todos' : lvl.slice(0, 3)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                            {filteredScenarios.map(sc => {
                                const isSelected = sc.id === selectedScenario.id;
                                const levelColor = sc.level === 'principiante'
                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                    : sc.level === 'intermedio'
                                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                    : 'text-rose-400 bg-rose-500/10 border-rose-500/20';

                                return (
                                    <div
                                        key={sc.id}
                                        onClick={() => {
                                            if (selectedScenario.id !== sc.id) {
                                                setSelectedScenario(sc);
                                            }
                                        }}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-indigo-950/30 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/20'
                                                : 'bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800/70 hover:border-zinc-700'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${levelColor}`}>
                                                {sc.level}
                                            </span>
                                            <span className="text-[11px] text-zinc-400">
                                                {sc.vehicleOfInterest.brand} {sc.vehicleOfInterest.model.split(' ')[0]}
                                            </span>
                                        </div>
                                        <h3 className={`text-xs font-semibold line-clamp-1 ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                                            {sc.title}
                                        </h3>
                                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                                            {sc.subtitle}
                                        </p>
                                        <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
                                            <span>Cliente: {sc.clientProfile.name.split(' ')[0]}</span>
                                            <span>${(sc.vehicleOfInterest.listPrice / 1000000).toFixed(1)}M</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Ficha técnica del escenario activo */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                        <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                            Información Conocida de la Unidad
                        </div>
                        <div className="text-xs space-y-1.5 text-zinc-400">
                            <div><strong className="text-zinc-200">Vehículo:</strong> {selectedScenario.vehicleOfInterest.brand} {selectedScenario.vehicleOfInterest.model} ({selectedScenario.vehicleOfInterest.year})</div>
                            <div><strong className="text-zinc-200">Kilometraje:</strong> {selectedScenario.vehicleOfInterest.km.toLocaleString('es-AR')} km</div>
                            <div><strong className="text-zinc-200">Precio de lista:</strong> ${selectedScenario.vehicleOfInterest.listPrice.toLocaleString('es-AR')}</div>
                            <div><strong className="text-zinc-200">Estado:</strong> {selectedScenario.vehicleOfInterest.condition}</div>
                        </div>

                        {selectedScenario.tradeInVehicle && (
                            <div className="pt-2 border-t border-zinc-800/80 text-xs space-y-1.5 text-zinc-400">
                                <div className="text-indigo-300 font-medium">Permuta propuesta por el cliente:</div>
                                <div><strong className="text-zinc-200">Auto:</strong> {selectedScenario.tradeInVehicle.brand} {selectedScenario.tradeInVehicle.model} ({selectedScenario.tradeInVehicle.year})</div>
                                <div><strong className="text-zinc-200">Cotización de taller para toma:</strong> ${selectedScenario.tradeInVehicle.cotizacionTaller.toLocaleString('es-AR')}</div>
                            </div>
                        )}

                        <div className="pt-2 border-t border-zinc-800/80">
                            <span className="text-[11px] font-semibold text-zinc-300">Regla clave de la agencia:</span>
                            <p className="text-[11px] text-zinc-400 mt-1 italic">
                                {selectedScenario.knownInfo[selectedScenario.knownInfo.length - 1]}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Área de Conversación o Reporte de Evaluación (8 cols) */}
                <div className="lg:col-span-8 space-y-4">
                    {evaluationReport ? (
                        /* REPORTE DE EVALUACIÓN INDEPENDIENTE */
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                            Reporte Pedagógico de Negociación
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            evaluationReport.outcomeStatus === 'acuerdo_cerrado'
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                : evaluationReport.outcomeStatus === 'seguimiento_agendado'
                                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                : evaluationReport.outcomeStatus === 'desistido_con_criterio'
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        }`}>
                                            {evaluationReport.outcomeStatus === 'acuerdo_cerrado' && 'Acuerdo Cerrado'}
                                            {evaluationReport.outcomeStatus === 'seguimiento_agendado' && 'Seguimiento Agendado'}
                                            {evaluationReport.outcomeStatus === 'desistido_con_criterio' && 'Venta Desistida con Criterio'}
                                            {evaluationReport.outcomeStatus === 'sin_acuerdo_error_grave' && 'Sin Acuerdo / Error de Procedimiento'}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-bold text-white mt-1">
                                        {selectedScenario.title}
                                    </h2>
                                </div>

                                <div className="text-right">
                                    <div className="text-3xl font-extrabold text-white">
                                        {evaluationReport.score}<span className="text-sm font-normal text-zinc-400">/100</span>
                                    </div>
                                    <div className="text-xs text-zinc-400">Puntaje ponderado</div>
                                </div>
                            </div>

                            {/* Desglose de las 6 Competencias Ponderadas */}
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-200 mb-3">
                                    Desglose por Competencias Comerciales (Ponderadas)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {COMPETENCY_DEFINITIONS.map(comp => {
                                        const result = evaluationReport.competencies?.[comp.key] || { score: 70, feedback: '', quote: '' };
                                        const scoreColor = result.score >= 80 ? 'text-emerald-400' : result.score >= 60 ? 'text-amber-400' : 'text-rose-400';

                                        return (
                                            <div key={comp.key} className="bg-zinc-800/40 border border-zinc-800 rounded-lg p-3 space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-medium text-zinc-200">{comp.title}</span>
                                                    <span className={`font-bold ${scoreColor}`}>
                                                        {result.score}/100 <span className="text-[10px] text-zinc-500 font-normal">({(comp.weight * 100)}%)</span>
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-zinc-400 leading-relaxed">
                                                    {result.feedback}
                                                </p>
                                                {result.quote && (
                                                    <div className="text-[10px] bg-zinc-900/60 p-1.5 rounded border border-zinc-800/60 text-zinc-400 italic">
                                                        "{result.quote}"
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Fortalezas y Áreas de Mejora */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-4 space-y-2">
                                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                                        <span>✔</span> Fortalezas Demostradas
                                    </div>
                                    <ul className="text-xs text-zinc-300 space-y-1 list-disc pl-4">
                                        {(evaluationReport.strengths || []).map((s, idx) => (
                                            <li key={idx}>{s}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-4 space-y-2">
                                    <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                                        <span>▲</span> Oportunidades de Mejora
                                    </div>
                                    <ul className="text-xs text-zinc-300 space-y-1 list-disc pl-4">
                                        {(evaluationReport.improvements || []).map((imp, idx) => (
                                            <li key={idx}>{imp}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Momentos Clave con Respuestas Alternativas Sugeridas */}
                            {evaluationReport.keyMoments && evaluationReport.keyMoments.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-zinc-200">
                                        Momentos Clave de la Conversación y Frases Sugeridas
                                    </h3>
                                    <div className="space-y-3">
                                        {evaluationReport.keyMoments.map((moment, idx) => (
                                            <div key={idx} className="bg-zinc-800/50 border border-zinc-700/60 rounded-lg p-3 text-xs space-y-1.5">
                                                <div className="text-zinc-400">
                                                    <span className="font-semibold text-zinc-300">Tu intervención:</span> "{moment.sellerQuote}"
                                                </div>
                                                <div className="text-zinc-300">
                                                    <span className="font-semibold text-indigo-400">Análisis:</span> {moment.critique}
                                                </div>
                                                <div className="bg-indigo-950/40 p-2 rounded border border-indigo-800/40 text-indigo-200">
                                                    <span className="font-semibold">Frase alternativa recomendada:</span> {moment.suggestedAlternative}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Botones de Acción Posterior y Puente con Aprender del Error */}
                            <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <button
                                    onClick={handleTransferToReflection}
                                    className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-700/50 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <span>✎</span> Reflexionar sobre esta negociación en Aprender del error
                                </button>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <button
                                        onClick={() => resetNegotiation(selectedScenario)}
                                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                                    >
                                        Repetir Escenario
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* CHAT DE CONVERSACIÓN ABIERTA */
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col h-[650px] overflow-hidden shadow-lg">
                            {/* Barra superior de la conversación */}
                            <div className="p-3.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-xs font-bold text-white shadow">
                                        {selectedScenario.clientProfile.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                            <span>{selectedScenario.clientProfile.name}</span>
                                            <span className="text-[10px] text-zinc-400 font-normal">({selectedScenario.clientProfile.occupation})</span>
                                        </div>
                                        <div className="text-[10px] text-zinc-400">
                                            Actitud: {selectedScenario.clientProfile.initialTone.slice(0, 45)}...
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-zinc-400">
                                    <span className="bg-zinc-800 px-2 py-0.5 rounded text-[11px]">
                                        Turnos: <strong className="text-zinc-200">{sellerTurnsCount}</strong>/15
                                    </span>
                                </div>
                            </div>

                            {/* Feed de Mensajes */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/40">
                                {messages.map((m) => {
                                    const isSeller = m.sender === 'seller';
                                    return (
                                        <div
                                            key={m.id}
                                            className={`flex ${isSeller ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm ${
                                                    isSeller
                                                        ? 'bg-indigo-600 text-white rounded-br-sm'
                                                        : 'bg-zinc-800 text-zinc-200 border border-zinc-700/60 rounded-bl-sm'
                                                }`}
                                            >
                                                <div className="text-[10px] font-medium opacity-75 mb-1">
                                                    {isSeller ? 'Vendedor (Tú)' : selectedScenario.clientProfile.name}
                                                </div>
                                                <div className="whitespace-pre-wrap">{m.text}</div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {isSending && (
                                    <div className="flex justify-start">
                                        <div className="bg-zinc-800 border border-zinc-700/60 rounded-2xl rounded-bl-sm p-3 text-xs text-zinc-400 flex items-center gap-2">
                                            <span className="animate-pulse">●</span>
                                            <span className="animate-pulse delay-100">●</span>
                                            <span className="animate-pulse delay-200">●</span>
                                            <span className="text-[11px] text-zinc-400">El cliente está respondiendo...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Barra de entrada de texto libre */}
                            <form
                                onSubmit={handleSendMessage}
                                className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2"
                            >
                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    placeholder="Escribí tu respuesta comercial o propuesta aquí..."
                                    disabled={isSending || isEvaluating}
                                    className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputMessage.trim() || isSending || isEvaluating}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-colors shadow-sm"
                                >
                                    Enviar
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
