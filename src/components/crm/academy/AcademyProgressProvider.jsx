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
        progress, storageError,
        completeLesson: id => update(previous => ({ ...previous, completed: [...previous.completed, id], lastLesson: id })),
        recordAttempt: attempt => update(previous => ({ ...previous, attempts: [...previous.attempts, { ...attempt, at: new Date().toISOString() }] })),
        recordDecision: decision => update(previous => ({ ...previous, decisions: [...previous.decisions, { ...decision, at: new Date().toISOString() }] })),
        reset: async () => {
            try {
                if (repository.current) {
                    await repository.current.reset(generation.current);
                    accept(repository.current.snapshot()); setStorageError('');
                } else { current.current = emptyProgress(); setProgress(current.current); }
            } catch (error) { setStorageError(`No se pudo restablecer. ${error.message}`); }
        },
    };
    return <ProgressContext.Provider value={value}>{storageError && <p role="alert" className="m-4 rounded-lg border border-crm-border p-3 text-sm">{storageError}</p>}{ready ? children : <p role="status" className="p-6 text-sm">Cargando avance educativo local…</p>}</ProgressContext.Provider>;
}

export default function AcademyProgressProvider({ children }) {
    const { user } = useAuth();
    const learnerId = user?.id || user?._id || user?.username || null;
    return <LearnerProgress key={learnerId || 'temporal'} learnerId={learnerId}>{children}</LearnerProgress>;
}

export function useAcademyProgress() { return useContext(ProgressContext); }
