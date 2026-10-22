'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { createLocalProgressRepository, emptyProgress, normalizeProgress } from '../../../lib/academy/progress';

const ProgressContext = createContext(null);

function LearnerProgress({ learnerId, children }) {
    const [progress, setProgress] = useState(emptyProgress);
    const current = useRef(emptyProgress());
    const repository = useRef(null);
    const [ready, setReady] = useState(false);
    const [storageError, setStorageError] = useState('');
    useEffect(() => {
        try {
            if (!learnerId) throw new Error('No se identificó un usuario estable: el avance solo se conservará en esta sesión.');
            repository.current = createLocalProgressRepository(window.localStorage, learnerId);
            const loaded = repository.current.load();
            current.current = loaded;
            setProgress(loaded);
        } catch (error) { setStorageError(error.message || 'Almacenamiento local no disponible. El avance será temporal.'); }
        setReady(true);
    }, [learnerId]);

    const update = reducer => {
        const next = normalizeProgress(reducer(current.current));
        current.current = next;
        setProgress(next);
        try {
            if (repository.current) { repository.current.save(next); setStorageError(''); }
        } catch { setStorageError('No se pudo guardar el avance en este navegador. El cambio se conserva solo durante esta sesión.'); }
    };
    const value = {
        progress, storageError,
        completeLesson: id => update(previous => ({ ...previous, completed: [...previous.completed, id], lastLesson: id })),
        recordAttempt: attempt => update(previous => ({ ...previous, attempts: [...previous.attempts, { ...attempt, at: new Date().toISOString() }] })),
        recordDecision: decision => update(previous => ({ ...previous, decisions: [...previous.decisions, { ...decision, at: new Date().toISOString() }] })),
        reset: () => {
            try {
                repository.current?.clear();
                current.current = emptyProgress(); setProgress(current.current); setStorageError('');
            } catch { setStorageError('No se pudo borrar el progreso guardado. Revisá el almacenamiento del navegador.'); }
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
