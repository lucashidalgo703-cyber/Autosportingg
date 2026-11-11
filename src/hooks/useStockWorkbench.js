"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function useStockWorkbench(path, query = '') {
    const { token } = useAuth();
    const [state, setState] = useState({ key: '', data: null, loading: true, error: '' });
    const request = useRef(null), generation = useRef(0);
    const key = `${token}:${path}:${query}`;
    const refresh = useCallback(async () => {
        request.current?.abort(); const version = ++generation.current;
        if (!token || !path) return;
        const controller = new AbortController(); request.current = controller;
        setState(previous => ({ key, data: previous.key === key ? previous.data : null, loading: true, error: '' }));
        try {
            if (navigator.onLine === false) throw new Error('Esta vista requiere conexión para consultar pendientes y demanda actuales.');
            const base = process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const response = await fetch(`${base}${path}${query ? `?${query}` : ''}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' });
            const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || 'No se pudo cargar esta vista de Stock.');
            if (!controller.signal.aborted && version === generation.current) setState({ key, data, loading: false, error: '' });
        } catch (failure) { if (!controller.signal.aborted && version === generation.current) setState({ key, data: null, loading: false, error: failure.message }); }
    }, [token, path, query, key]);
    useEffect(() => { refresh(); const update = () => refresh(); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { ++generation.current; request.current?.abort(); window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, [refresh]);
    return { ...(state.key === key ? state : { data: null, loading: true, error: '' }), refresh };
}
