'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useAcademyProgress } from './AcademyProgressProvider';
import { ERROR_CATEGORIES, IMPROVEMENT_STATUS, createErrorReflection, validateErrorReflection } from '../../../lib/academy/aprenderDelError';
import { ROLE_MODULES } from '../../../lib/academy/roleModules';
import { ROLE_SIMULATIONS } from '../../../lib/academy/roleSimulations';

export default function AcademyAprenderDelError() {
    const { user } = useAuth();
    const { progress, addErrorReflection, updateErrorReflection } = useAcademyProgress();

    const [isCreating, setIsCreating] = useState(false);
    const [selectedReflection, setSelectedReflection] = useState(null);
    const [formErrors, setFormErrors] = useState([]);
    const [statusFilter, setStatusFilter] = useState('todos');

    // Estado del formulario guiado de 5 preguntas
    const [formData, setFormData] = useState({
        titulo: '',
        categoria: 'ventas',
        linkedModuleId: '',
        linkedSimulationId: '',
        quePaso: '',
        informacion: '',
        otraManera: '',
        criterio: '',
        planMejora: '',
        fechaCompromiso: '',
        compartidoConSupervisor: false
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const draftRaw = sessionStorage.getItem('academy_reflection_draft');
            if (draftRaw) {
                try {
                    const draft = JSON.parse(draftRaw);
                    sessionStorage.removeItem('academy_reflection_draft');
                    setFormData(prev => ({
                        ...prev,
                        titulo: draft.situation?.slice(0, 80) || 'Reflexión sobre práctica de negociación',
                        categoria: 'ventas',
                        quePaso: draft.situation || '',
                        informacion: draft.difficultyEncountered || '',
                        otraManera: draft.alternativeApproach || '',
                        criterio: 'Aplicar procedimiento de defensa de valor, consulta previa y anclaje técnico.',
                        planMejora: `Repasar módulo formativo y volver a ejercitar en el simulador de negociación.`,
                        linkedModuleId: draft.reinforcementModuleId || '',
                        fechaCompromiso: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                        compartidoConSupervisor: false
                    }));
                    setIsCreating(true);
                } catch {
                    // Ignorar error de parsing
                }
            }
        }
    }, []);

    const reflections = progress?.errorReflections || [];

    const filteredReflections = reflections.filter(r => {
        if (statusFilter === 'todos') return true;
        return r.status === statusFilter;
    });

    const handleOpenCreate = (prefill = {}) => {
        setFormData({
            titulo: prefill.titulo || '',
            categoria: prefill.categoria || 'ventas',
            linkedModuleId: prefill.linkedModuleId || '',
            linkedSimulationId: prefill.linkedSimulationId || '',
            quePaso: '',
            informacion: '',
            otraManera: '',
            criterio: '',
            planMejora: '',
            fechaCompromiso: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            compartidoConSupervisor: false
        });
        setFormErrors([]);
        setIsCreating(true);
        setSelectedReflection(null);
    };

    const handleSaveReflection = (e) => {
        e.preventDefault();
        const reflection = createErrorReflection({
            ...formData,
            learnerId: user?.id || user?._id || user?.email || 'alumno',
            learnerRole: user?.role || 'ventas',
            fechaCompartido: formData.compartidoConSupervisor ? new Date().toISOString() : null
        });

        const validation = validateErrorReflection(reflection);
        if (!validation.isValid) {
            setFormErrors(validation.errors);
            return;
        }

        addErrorReflection(reflection);
        setIsCreating(false);
        setFormErrors([]);
        setSelectedReflection(reflection);
    };

    const handleToggleShare = (reflection) => {
        const nextVal = !reflection.compartidoConSupervisor;
        updateErrorReflection(reflection.id, {
            compartidoConSupervisor: nextVal,
            fechaCompartido: nextVal ? new Date().toISOString() : null
        });
        if (selectedReflection?.id === reflection.id) {
            setSelectedReflection(prev => ({
                ...prev,
                compartidoConSupervisor: nextVal,
                fechaCompartido: nextVal ? new Date().toISOString() : null
            }));
        }
    };

    const handleUpdateStatus = (reflection, newStatus) => {
        updateErrorReflection(reflection.id, { status: newStatus });
        if (selectedReflection?.id === reflection.id) {
            setSelectedReflection(prev => ({ ...prev, status: newStatus }));
        }
    };

    return (
        <div className="space-y-6">
            {/* Cabecera y filosofía pedagógica */}
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-[#0e0e12] to-zinc-950 p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-sm">
                                💡
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                Aprender del Error · AutoSporting
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            Espacio de Reflexión Práctica y Mejora Continua
                        </h2>
                        <p className="mt-1 text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
                            Los mejores profesionales no son quienes nunca se equivocan, sino quienes analizan qué pasó, qué información faltaba y cómo actuar la próxima vez. Tus notas son personales y privadas.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => handleOpenCreate()}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-400 px-5 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
                        >
                            + Nueva Reflexión
                        </button>
                    </div>
                </div>

                {/* Garantía de Privacidad */}
                <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-xs text-zinc-400">
                    <span className="text-amber-400">🔒</span>
                    <span>
                        <strong className="text-zinc-200">Privacidad garantizada:</strong> Tus reflexiones se almacenan únicamente en tu sesión. Tu supervisor NO puede leer tus notas privadas salvo que vos elijas voluntariamente compartir una ficha específica.
                    </span>
                </div>
            </div>

            {/* Modal o Panel de Creación / Formulario de las 5 preguntas */}
            {isCreating && (
                <div className="rounded-2xl border border-zinc-700 bg-[#0e0e12] p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                        <div>
                            <h3 className="text-base font-bold text-white">
                                Registro de Reflexión y Plan de Mejora
                            </h3>
                            <p className="text-xs text-zinc-400">
                                Respondé las 5 preguntas estructuradas para transformar una experiencia en aprendizaje real.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>

                    {formErrors.length > 0 && (
                        <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-4 text-xs text-red-300 space-y-1">
                            <strong className="block mb-1">Por favor completá los siguientes campos:</strong>
                            {formErrors.map((err, i) => (
                                <p key={i}>• {err}</p>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSaveReflection} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                                    Título de la experiencia o práctica *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Duda con el valor de toma de un usado o retraso en entrega"
                                    value={formData.titulo}
                                    onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                                    Categoría
                                </label>
                                <select
                                    value={formData.categoria}
                                    onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none cursor-pointer"
                                >
                                    {ERROR_CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Pregunta 1 */}
                        <div>
                            <label className="block text-xs font-bold text-amber-400 mb-1">
                                1. ¿Qué pasó y qué intentabas lograr? *
                            </label>
                            <textarea
                                rows={3}
                                required
                                placeholder="Describí la situación concreta: qué le dijiste al cliente o cómo procediste con el trámite..."
                                value={formData.quePaso}
                                onChange={e => setFormData({ ...formData, quePaso: e.target.value })}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-white focus:border-amber-500 focus:outline-none leading-relaxed"
                            />
                        </div>

                        {/* Pregunta 2 */}
                        <div>
                            <label className="block text-xs font-bold text-amber-400 mb-1">
                                2. ¿Qué información tenías y qué faltaba? *
                            </label>
                            <textarea
                                rows={2}
                                required
                                placeholder="Ej: Tenía el precio de lista pero no sabía si el cliente tenía deuda de patente municipal..."
                                value={formData.informacion}
                                onChange={e => setFormData({ ...formData, informacion: e.target.value })}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-white focus:border-amber-500 focus:outline-none leading-relaxed"
                            />
                        </div>

                        {/* Pregunta 3 */}
                        <div>
                            <label className="block text-xs font-bold text-amber-400 mb-1">
                                3. ¿Qué podrías haber hecho de otra manera? *
                            </label>
                            <textarea
                                rows={2}
                                required
                                placeholder="Ej: Preguntar antes de conceder, pedir el informe de dominio o consultar a administración..."
                                value={formData.otraManera}
                                onChange={e => setFormData({ ...formData, otraManera: e.target.value })}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-white focus:border-amber-500 focus:outline-none leading-relaxed"
                            />
                        </div>

                        {/* Pregunta 4: Vinculación con procedimiento */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-amber-400 mb-1">
                                    4. ¿Qué criterio o procedimiento te puede ayudar? *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Procedimiento de toma de permutas PROC-VTA-03 o regla de fondos acreditados"
                                    value={formData.criterio}
                                    onChange={e => setFormData({ ...formData, criterio: e.target.value })}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-400 mb-1">
                                    Módulo de Academy vinculado
                                </label>
                                <select
                                    value={formData.linkedModuleId}
                                    onChange={e => setFormData({ ...formData, linkedModuleId: e.target.value })}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none cursor-pointer"
                                >
                                    <option value="">Seleccionar módulo de referencia (opcional)</option>
                                    {ROLE_MODULES.map(m => (
                                        <option key={m.id} value={m.id}>{m.code} - {m.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Pregunta 5: Plan de mejora */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-amber-400 mb-1">
                                    5. ¿Qué vas a practicar y cómo comprobarás la mejora? *
                                </label>
                                <textarea
                                    rows={2}
                                    required
                                    placeholder="Ej: Practicaré el guion de objeciones en el simulador y verificaré hacer 3 preguntas antes de hablar de precios..."
                                    value={formData.planMejora}
                                    onChange={e => setFormData({ ...formData, planMejora: e.target.value })}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-white focus:border-amber-500 focus:outline-none leading-relaxed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-400 mb-1">
                                    Fecha límite para revisar mejora
                                </label>
                                <input
                                    type="date"
                                    value={formData.fechaCompromiso}
                                    onChange={e => setFormData({ ...formData, fechaCompromiso: e.target.value })}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Consentimiento expreso para compartir */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 flex items-start gap-3">
                            <input
                                id="check-share"
                                type="checkbox"
                                checked={formData.compartidoConSupervisor}
                                onChange={e => setFormData({ ...formData, compartidoConSupervisor: e.target.checked })}
                                className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                            />
                            <label htmlFor="check-share" className="text-xs text-zinc-300 leading-relaxed cursor-pointer">
                                <strong className="text-white">Compartir voluntariamente con mi responsable:</strong> Autorizo a que el Propietario / Dirección pueda leer esta reflexión específica para recibir orientación formativa. Mis demás reflexiones seguirán siendo privadas.
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-2 text-xs font-bold uppercase tracking-wider text-black shadow-md cursor-pointer"
                            >
                                Guardar Reflexión
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Listado de reflexiones del usuario y visor de detalle */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Lista lateral de reflexiones (5 columnas) */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                                Mis Reflexiones ({reflections.length})
                            </h3>
                            <div className="flex gap-1 text-[10px]">
                                {[
                                    ['todos', 'Todas'],
                                    ['en_practica', 'En práctica'],
                                    ['completado', 'Completadas']
                                ].map(([st, lbl]) => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => setStatusFilter(st)}
                                        className={`rounded px-2 py-0.5 font-semibold transition-all cursor-pointer ${
                                            statusFilter === st
                                                ? 'bg-zinc-200 text-black'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        {lbl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {filteredReflections.length === 0 ? (
                            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-6 text-center text-xs text-zinc-500">
                                No tenés reflexiones registradas en este estado.
                                <br />
                                Hacé click en <strong>"+ Nueva Reflexión"</strong> para comenzar.
                            </div>
                        ) : (
                            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                                {filteredReflections.map((ref) => {
                                    const isSelected = selectedReflection?.id === ref.id;

                                    return (
                                        <button
                                            key={ref.id}
                                            type="button"
                                            onClick={() => { setSelectedReflection(ref); setIsCreating(false); }}
                                            className={`w-full text-left rounded-xl p-3.5 border transition-all cursor-pointer flex flex-col gap-1.5 ${
                                                isSelected
                                                    ? 'border-amber-500/60 bg-amber-950/20 text-white shadow-md'
                                                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-mono text-zinc-500">
                                                    {new Date(ref.createdAt).toLocaleDateString('es-AR')}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    {ref.compartidoConSupervisor && (
                                                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded">
                                                            Compartido
                                                        </span>
                                                    )}
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        ref.status === IMPROVEMENT_STATUS.COMPLETADO
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                                    }`}>
                                                        {ref.status === IMPROVEMENT_STATUS.COMPLETADO ? '✓ Mejorado' : 'En práctica'}
                                                    </span>
                                                </div>
                                            </div>
                                            <h4 className="text-xs font-bold line-clamp-1">
                                                {ref.titulo}
                                            </h4>
                                            <p className="text-[11px] text-zinc-400 line-clamp-2">
                                                {ref.planMejora}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Visor de detalle de la reflexión seleccionada (7 columnas) */}
                <div className="lg:col-span-7">
                    {selectedReflection ? (
                        <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-xl space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800 pb-4">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                        Ficha de Reflexión Individual
                                    </span>
                                    <h3 className="text-lg font-bold text-white mt-0.5">
                                        {selectedReflection.titulo}
                                    </h3>
                                    <span className="text-xs text-zinc-500">
                                        Registrada el {new Date(selectedReflection.createdAt).toLocaleDateString('es-AR')} · Categoría: {selectedReflection.categoria}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(
                                            selectedReflection,
                                            selectedReflection.status === IMPROVEMENT_STATUS.COMPLETADO ? IMPROVEMENT_STATUS.EN_PRACTICA : IMPROVEMENT_STATUS.COMPLETADO
                                        )}
                                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                            selectedReflection.status === IMPROVEMENT_STATUS.COMPLETADO
                                                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                        }`}
                                    >
                                        {selectedReflection.status === IMPROVEMENT_STATUS.COMPLETADO ? 'Marcar En Práctica' : '✓ Marcar como Completado'}
                                    </button>
                                </div>
                            </div>

                            {/* Detalle de las 5 preguntas */}
                            <div className="space-y-4 text-xs">
                                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 space-y-1">
                                    <strong className="text-amber-400 block font-bold">1. ¿Qué pasó y qué intentabas lograr?</strong>
                                    <p className="text-zinc-300 leading-relaxed whitespace-pre-line">{selectedReflection.quePaso}</p>
                                </div>

                                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 space-y-1">
                                    <strong className="text-amber-400 block font-bold">2. ¿Qué información tenías y qué faltaba?</strong>
                                    <p className="text-zinc-300 leading-relaxed whitespace-pre-line">{selectedReflection.informacion}</p>
                                </div>

                                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 space-y-1">
                                    <strong className="text-amber-400 block font-bold">3. ¿Qué podrías haber hecho de otra manera?</strong>
                                    <p className="text-zinc-300 leading-relaxed whitespace-pre-line">{selectedReflection.otraManera}</p>
                                </div>

                                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 space-y-1">
                                    <strong className="text-amber-400 block font-bold">4. Criterio o procedimiento de ayuda</strong>
                                    <p className="text-zinc-300 leading-relaxed">{selectedReflection.criterio}</p>
                                    {selectedReflection.linkedModuleId && (
                                        <div className="mt-1 pt-1 text-[11px] text-zinc-400">
                                            Módulo: <span className="font-mono text-zinc-300">{selectedReflection.linkedModuleId}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-3.5 space-y-1">
                                    <strong className="text-emerald-400 block font-bold">5. Plan de mejora y verificación</strong>
                                    <p className="text-zinc-200 leading-relaxed whitespace-pre-line font-medium">{selectedReflection.planMejora}</p>
                                    {selectedReflection.fechaCompromiso && (
                                        <div className="text-[11px] text-zinc-400 mt-1">
                                            Fecha objetivo de revisión: <strong className="text-white">{selectedReflection.fechaCompromiso}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Compartir voluntariamente con supervisor */}
                            <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-base">{selectedReflection.compartidoConSupervisor ? '📤' : '🔒'}</span>
                                    <span className="text-zinc-400">
                                        Estado: <strong className="text-white">{selectedReflection.compartidoConSupervisor ? 'Compartido con Dirección' : 'Privado (Solo visible para vos)'}</strong>
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleToggleShare(selectedReflection)}
                                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                                        selectedReflection.compartidoConSupervisor
                                            ? 'border border-red-500/40 text-red-400 hover:bg-red-950/20'
                                            : 'border border-blue-500/40 bg-blue-950/20 text-blue-300 hover:bg-blue-900/30'
                                    }`}
                                >
                                    {selectedReflection.compartidoConSupervisor ? 'Dejar de compartir' : 'Compartir con mi supervisor'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-12 text-center text-zinc-500 text-xs">
                            Seleccioná una reflexión de la lista para ver su detalle, plan de mejora y opciones de privacidad.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
