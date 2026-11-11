"use client";
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export function useAdminMandates() {
    const { token } = useAuth();
    const [state, setState] = useState({ session: token, mandates: [], loading: false, error: null });
    const session = useRef(token); session.current = token;
    const jobs = useRef(new Set()), readJob = useRef(null);
    useEffect(() => { setState({ session: token, mandates: [], loading: false, error: null }); const active = jobs.current; return () => { readJob.current?.abort(); active.forEach(controller => controller.abort()); active.clear(); }; }, [token]);
    const request = useCallback(async (path, options = {}, signal) => {
        if (!token || session.current !== token || localStorage.getItem('token') !== token) throw new DOMException('La sesión cambió.', 'AbortError');
        const base = process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${base}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, signal, cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (signal?.aborted || session.current !== token) throw new DOMException('La sesión cambió.', 'AbortError');
        if (!response.ok) throw new Error(data.message || data.error || 'No se pudo completar la operación de mandatos.');
        return data;
    }, [token]);
    const fetchMandates = useCallback(async () => {
        if (!token) return [];
        readJob.current?.abort(); const controller = new AbortController(); readJob.current = controller;
        setState(previous => ({ session: token, mandates: previous.session === token ? previous.mandates : [], loading: true, error: null }));
        try {
            const data = await request('/api/admin/mandates', {}, controller.signal);
            const mandates = Array.isArray(data) ? data : data.mandates || [];
            setState({ session: token, mandates, loading: false, error: null }); return mandates;
        } catch (error) { if (!controller.signal.aborted && session.current === token) setState({ session: token, mandates: [], loading: false, error: error.message }); return []; }
    }, [token, request]);
    const mutate = useCallback(async (id, payload, method) => {
        const controller = new AbortController(); jobs.current.add(controller);
        try {
            const data = await request(`/api/admin/mandates${id ? `/${id}` : ''}`, { method, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) }, controller.signal);
            setState(previous => ({ ...previous, session: token, mandates: method === 'DELETE' ? previous.mandates.filter(item => item._id !== id) : method === 'POST' ? [data, ...previous.mandates] : previous.mandates.map(item => item._id === id ? { ...item, ...data } : item) }));
            return method === 'DELETE' ? true : data;
        } finally { jobs.current.delete(controller); }
    }, [token, request]);
    const visible = state.session === token ? state : { mandates: [], loading: Boolean(token), error: null };
    return { mandates: visible.mandates, loading: visible.loading, error: visible.error, fetchMandates, createMandate: payload => mutate(null, payload, 'POST'), updateMandate: (id, payload) => mutate(id, payload, 'PATCH'), deleteMandate: id => mutate(id, undefined, 'DELETE') };
}
