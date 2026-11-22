'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { createLocalProgressRepository, emptyProgress, normalizeProgress } from '../../../lib/academy/progress';

const ProgressContext = createContext(null);

function LearnerProgress({ learnerId, children }) {
    const [progress, setProgress] = useState(emptyProgress);
    const current = useRef(emptyProgress());
    const repository = useRef(null);
    const generation = useRef(null);
    const [ready, setReady] = useState(false);
    const [storageError, setStorageError] = useState('');

    useEffect(() => {
        const refresh = () => {
            try {
                const state = repository.current.snapshot();
                generation.current = state.generation;
                current.current = state.progress;
                setProgress(state.progress);
            } catch (error) { setStorageError(error.message); }
        };
        try {
            if (!learnerId) throw new Error('No se identificó un usuario estable: el avance solo se conservará en esta sesión.');
            repository.current = createLocalProgressRepository(window.localStorage, learnerId, navigator.locks);
            refresh();
        } catch (error) { setStorageError(error.message || 'Almacenamiento local no disponible. El avance será temporal.'); }
        setReady(true);
        const onStorage = event => { if (event.key === repository.current?.key || event.key === null) refresh(); };
        const onVisibility = () => { if (!document.hidden && repository.current) refresh(); };
        window.addEventListener('storage', onStorage);
        document.addEventListener('visibilitychange', onVisibility);

        // Sincronización transparente con backend MongoDB (persistencia multidispositivo)
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token && learnerId) {
            fetch('/api/admin/academy/progress', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.ok ? res.json() : null)
            .then(backendProgress => {
                if (backendProgress) {
                    update(prev => {
                        // 1. Unión de lecciones y módulos completados entre dispositivos
                        const backendLessonIds = new Set((backendProgress.completedLessons || []).map(l => l.lessonId));
                        const backendModuleIds = new Set((backendProgress.completedRoleModules || []).map(m => m.moduleId));

                        const mergedLessons = Array.from(new Set([
                            ...(prev.completed || []),
                            ...backendLessonIds
                        ]));
                        const mergedRoleModules = Array.from(new Set([
                            ...(prev.roleModulesCompleted || []),
                            ...backendModuleIds
                        ]));

                        // 2. Reconciliación de simulaciones priorizando el mejor resultado
                        const simMap = new Map();
                        for (const s of (prev.roleSimulations || [])) {
                            if (s.simulationId) simMap.set(s.simulationId, s);
                        }
                        for (const bs of (backendProgress.simulationAttempts || [])) {
                            if (!bs.simulationId) continue;
                            const existing = simMap.get(bs.simulationId);
                            if (!existing || (typeof bs.score === 'number' && bs.score > (existing.score || 0))) {
                                simMap.set(bs.simulationId, {
                                    simulationId: bs.simulationId,
                                    score: bs.score,
                                    selectedOption: bs.decisions?.[0] || bs.selectedOption,
                                    at: bs.completedAt ? new Date(bs.completedAt).toISOString() : new Date().toISOString()
                                });
                            }
                        }
                        const mergedSimulations = Array.from(simMap.values());

                        // 3. Sincronización de reflexiones privadas (conservar versiones con mayor contenido)
                        const localReflections = prev.errorReflections || [];
                        const backendReflections = (backendProgress.errorReflections || []).map(r => ({
                            id: String(r._id || r.id),
                            titulo: r.situation?.slice(0, 80) || 'Reflexión guardada',
                            quePaso: r.situation,
                            categoria: 'ventas',
                            informacion: r.difficultyEncountered,
                            otraManera: r.alternativeApproach,
                            criterio: 'Procedimiento institucional',
                            planMejora: r.alternativeApproach,
                            linkedModuleId: r.reinforcementModuleId,
                            compartidoConSupervisor: Boolean(r.sharedWithSupervisor),
                            fechaCompartido: r.sharedAt,
                            status: 'en_progreso'
                        }));

                        const refMap = new Map();
                        for (const r of localReflections) {
                            refMap.set(String(r.id || r._id), r);
                        }
                        for (const br of backendReflections) {
                            const existing = refMap.get(br.id);
                            if (!existing) {
                                refMap.set(br.id, br);
                            } else {
                                // REGLA ESTRICTA: Conservar ambas versiones para revisión; no seleccionar automáticamente la más larga
                                const localText = `${existing.quePaso || ''} ${existing.informacion || ''} ${existing.otraManera || ''}`.trim();
                                const backendText = `${br.quePaso || ''} ${br.informacion || ''} ${br.otraManera || ''}`.trim();
                                if (localText !== backendText && localText.length > 0 && backendText.length > 0) {
                                    refMap.set(br.id + '-sync', {
                                        ...br,
                                        id: br.id + '-sync',
                                        titulo: `${br.titulo || 'Reflexión'} [Revisión sincronizada]`
                                    });
                                }
                            }
                        }
                        const mergedReflections = Array.from(refMap.values());

                        // 4. Si hay avances locales no registrados en el servidor, enviarlos en segundo plano
                        const unsyncedLessons = (prev.completed || []).filter(id => !backendLessonIds.has(id));
                        const unsyncedModules = (prev.roleModulesCompleted || []).filter(id => !backendModuleIds.has(id));
                        if (unsyncedLessons.length > 0 || unsyncedModules.length > 0) {
                            fetch('/api/admin/academy/progress/sync', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({
                                    completedLessons: unsyncedLessons,
                                    completedRoleModules: unsyncedModules
                                })
                            }).catch(() => {});
                        }

                        return {
                            ...prev,
                            completed: mergedLessons,
                            roleModulesCompleted: mergedRoleModules,
                            roleSimulations: mergedSimulations,
                            errorReflections: mergedReflections,
                            sharedErrorReflections: mergedReflections.filter(r => r.compartidoConSupervisor),
                            // Autoridad del servidor sobre asignaciones del supervisor
                            assignedTrack: backendProgress.assignedTrack || prev.assignedTrack,
                            recommendedActivities: backendProgress.recommendedActivities?.length
                                ? backendProgress.recommendedActivities
                                : prev.recommendedActivities
                        };
                    });
                }
            })
            .catch(err => console.warn('[Academy Backend Sync] Offline o local mode:', err.message));
        }

        return () => {
            window.removeEventListener('storage', onStorage);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [learnerId]);

    const accept = state => {
        generation.current = state.generation;
        current.current = state.progress;
        setProgress(state.progress);
    };

    const update = async reducer => {
        try {
            if (repository.current) {
                await repository.current.update(reducer, generation.current);
                accept(repository.current.snapshot());
                setStorageError('');
            } else {
                current.current = normalizeProgress(reducer(current.current));
                setProgress(current.current);
            }
        } catch (error) {
            try { if (repository.current) accept(repository.current.snapshot()); } catch { /* conservar aviso de lectura */ }
            setStorageError(`No se guardó esta acción. ${error.message}`);
        }
    };

    const value = {
        progress,
        storageError,
        // Legacy financial courses methods (100% compatibles)
        completeLesson: id => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (token) {
                fetch('/api/admin/academy/lesson/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ lessonId: id })
                }).catch(() => {});
            }
            return update(previous => ({ ...previous, completed: [...previous.completed, id], lastLesson: id }));
        },
        recordAttempt: attempt => update(previous => ({ ...previous, attempts: [...previous.attempts, { ...attempt, at: new Date().toISOString() }] })),
        recordDecision: decision => update(previous => ({ ...previous, decisions: [...previous.decisions, { ...decision, at: new Date().toISOString() }] })),

        // Role-based training methods
        completeRoleModule: moduleId => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (token) {
                fetch('/api/admin/academy/module/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ moduleId })
                }).catch(() => {});
            }
            return update(previous => ({
                ...previous,
                roleModulesCompleted: [...new Set([...(previous.roleModulesCompleted || []), moduleId])]
            }));
        },
        recordRoleSimulation: simAttempt => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (token) {
                fetch('/api/admin/academy/simulation/record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(simAttempt)
                }).catch(() => {});
            }
            return update(previous => ({
                ...previous,
                roleSimulations: [
                    ...(previous.roleSimulations || []).filter(s => s.simulationId !== simAttempt.simulationId || s.score < simAttempt.score),
                    { ...simAttempt, at: new Date().toISOString() }
                ]
            }));
        },
        recordRoleQuestion: (questionId, isCorrect, optionIndex) => update(previous => ({
            ...previous,
            roleQuestionsAnswered: {
                ...(previous.roleQuestionsAnswered || {}),
                [questionId]: { isCorrect, optionIndex, at: new Date().toISOString() }
            }
        })),
        addErrorReflection: reflection => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (token) {
                fetch('/api/admin/academy/reflection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        situation: reflection.quePaso || reflection.titulo,
                        actionTaken: reflection.quePaso || '',
                        difficultyEncountered: reflection.informacion || '',
                        alternativeApproach: reflection.otraManera || '',
                        reinforcementModuleId: reflection.linkedModuleId || '',
                        sharedWithSupervisor: Boolean(reflection.compartidoConSupervisor)
                    })
                }).catch(() => {});
            }
            return update(previous => {
                const errs = [...(previous.errorReflections || []), reflection];
                const shared = reflection.compartidoConSupervisor
                    ? [...(previous.sharedErrorReflections || []), reflection]
                    : (previous.sharedErrorReflections || []);
                return {
                    ...previous,
                    errorReflections: errs,
                    sharedErrorReflections: shared
                };
            });
        },
        updateErrorReflection: (id, updates) => update(previous => {
            const errs = (previous.errorReflections || []).map(r => r.id === id ? { ...r, ...updates } : r);
            const target = errs.find(r => r.id === id);
            let shared = previous.sharedErrorReflections || [];
            if (target?.compartidoConSupervisor) {
                shared = [...shared.filter(r => r.id !== id), target];
            } else {
                shared = shared.filter(r => r.id !== id);
            }
            return {
                ...previous,
                errorReflections: errs,
                sharedErrorReflections: shared
            };
        }),
        setAssignedTrack: trackId => update(previous => ({ ...previous, assignedTrack: trackId })),
        recommendActivity: activity => update(previous => ({
            ...previous,
            recommendedActivities: [...(previous.recommendedActivities || []), { ...activity, at: new Date().toISOString() }]
        })),

        reset: async () => {
            try {
                if (repository.current) {
                    await repository.current.reset(generation.current);
                    accept(repository.current.snapshot());
                    setStorageError('');
                } else {
                    current.current = emptyProgress();
                    setProgress(current.current);
                }
            } catch (error) { setStorageError(`No se pudo restablecer. ${error.message}`); }
        },
    };

    return (
        <ProgressContext.Provider value={value}>
            {storageError && <p role="alert" className="m-4 rounded-lg border border-crm-border p-3 text-sm text-amber-400 bg-amber-950/20">{storageError}</p>}
            {ready ? children : <p role="status" className="p-6 text-sm text-crm-fg-muted font-mono">Cargando avance educativo local…</p>}
        </ProgressContext.Provider>
    );
}

export default function AcademyProgressProvider({ children }) {
    const { user } = useAuth();
    const learnerId = user?.id || user?._id || user?.email || user?.username || null;
    return <LearnerProgress key={learnerId || 'temporal'} learnerId={learnerId}>{children}</LearnerProgress>;
}

export function useAcademyProgress() { return useContext(ProgressContext); }
