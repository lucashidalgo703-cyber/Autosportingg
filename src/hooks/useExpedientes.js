"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { expedienteQuery } from '../utils/expedienteNavigation';

export function useExpedienteRequest() {
    const { token } = useAuth(), active = useRef(token), controllers = useRef(new Set()), mounted = useRef(true);
    active.current = token;
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; for (const controller of controllers.current) controller.abort(); controllers.current.clear(); }; }, [token]);
    return useCallback(async (path, options = {}) => {
        if (!token) throw Error('Tu sesión ya no está disponible.');
        if (typeof path !== 'string' || !path.startsWith('/api/admin/')) throw Error('La ruta solicitada no es válida.');
        const controller = new AbortController(), abort = () => controller.abort();
        if (options.signal?.aborted) controller.abort(); else options.signal?.addEventListener('abort', abort, { once: true });
        controllers.current.add(controller);
        const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
        const body = options.body && typeof options.body === 'object' && !isForm ? JSON.stringify(options.body) : options.body;
        try {
            const response = await fetch(path, { ...options, body, cache: 'no-store', signal: controller.signal, headers: { ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...options.headers, Authorization: 'Bearer ' + token } });
            const json = (response.headers.get('content-type') || '').includes('application/json');
            const data = json ? await response.json().catch(() => ({})) : {};
            if (!mounted.current || active.current !== token || controller.signal.aborted || localStorage.getItem('token') !== token) throw new DOMException('La sesión cambió.', 'AbortError');
            if (!response.ok || !json) { const error = Error(data.message || data.error || 'No se pudo completar la consulta del expediente.'); error.status = response.status; error.code = data.code; error.errors = data.errors; throw error; }
            return data;
        } finally { controllers.current.delete(controller); options.signal?.removeEventListener('abort', abort); }
    }, [token]);
}

export function useExpedientesList(filters, page, enabled = true) {
    const { token } = useAuth(), request = useExpedienteRequest(), revision = useRef(0), [refresh, setRefresh] = useState(0);
    const [state, setState] = useState({ token, data: null, loading: true, error: '' });
    const query = expedienteQuery(filters, { page });
    useEffect(() => {
        const generation = ++revision.current, controller = new AbortController();
        setState(previous => ({ token, data: enabled && previous.token === token ? previous.data : null, loading: enabled && Boolean(token), error: '' }));
        if (!enabled || !token) return () => controller.abort();
        request('/api/admin/expedientes?' + query, { signal: controller.signal }).then(data => { if (revision.current === generation) setState({ token, data, loading: false, error: '' }); }).catch(error => { if (revision.current === generation && error.name !== 'AbortError') setState({ token, data: null, loading: false, error: error.message }); });
        return () => controller.abort();
    }, [query, enabled, token, refresh, request]);
    const reload = useCallback(() => setRefresh(value => value + 1), []);
    return { ...(state.token === token ? state : { data: null, loading: Boolean(token), error: '' }), request, reload };
}
