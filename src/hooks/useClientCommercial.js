import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const empty = { clients: [], total: 0, totalPages: 1, summary: null, priorityCounts: null, pipelineCounts: {}, contactCounts: null, contactMonths: [] };
const getBase = () => process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const queryFor = filters => {
    const query = new URLSearchParams();
    for (const key of ['search', 'type', 'source', 'status', 'segment', 'attention', 'assignedTo', 'gender', 'tier', 'sort', 'createdFrom', 'createdTo', 'followups', 'page', 'limit']) {
        if (filters[key] !== undefined && filters[key] !== '') query.set(key, filters[key]);
    }
    return query.toString();
};

export function useClientCommercial() {
    const { token } = useAuth();
    const session = useRef(token);
    session.current = token;
    const controller = useRef(null);
    const [state, setState] = useState({ ...empty, session: token, loading: false, error: null });
    useEffect(() => {
        controller.current?.abort();
        setState({ ...empty, session: token, loading: false, error: null });
        return () => controller.current?.abort();
    }, [token]);

    const request = useCallback(async (path, options = {}) => {
        if (!token) throw new Error('No autorizado');
        const response = await fetch(`${getBase()}${path}`, {
            ...options, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        const data = await response.json().catch(() => ({}));
        if (session.current !== token) throw new DOMException('La sesión cambió.', 'AbortError');
        if (!response.ok) {
            const error = new Error(data.message || data.error || (response.status === 401 ? 'No autorizado' : 'No se pudo completar la operación de clientes.'));
            error.data = data; error.errors = data.errors; error.status = response.status;
            throw error;
        }
        return data;
    }, [token]);

    const fetchClients = useCallback(async (filters = {}) => {
        controller.current?.abort();
        const pending = new AbortController();
        controller.current = pending;
        setState(previous => ({ ...(previous.session === token ? previous : empty), session: token, loading: true, error: null }));
        try {
            const data = await request(`/api/admin/clients?${queryFor(filters)}`, { signal: pending.signal });
            if (!pending.signal.aborted && session.current === token) setState({
                clients: data.clients || [], total: data.total || 0, totalPages: data.pages || 1,
                summary: data.summary, priorityCounts: data.priorityCounts, pipelineCounts: data.pipelineCounts || {},
                contactCounts: data.contactCounts || null, contactMonths: data.contactMonths || [],
                session: token, loading: false, error: null
            });
        } catch (error) {
            if (error.name !== 'AbortError' && session.current === token) setState({ ...empty, session: token, loading: false, error: error.message });
        }
    }, [request, token]);

    const fetchClientById = useCallback(async id => {
        controller.current?.abort();
        const pending = new AbortController();
        controller.current = pending;
        setState(previous => ({ ...previous, session: token, loading: true, error: null }));
        try { return await request(`/api/admin/clients/${id}`, { signal: pending.signal }); }
        catch (error) {
            if (error.name !== 'AbortError' && session.current === token) setState(previous => ({ ...previous, error: error.message }));
            throw error;
        } finally {
            if (session.current === token && !pending.signal.aborted) setState(previous => ({ ...previous, loading: false }));
        }
    }, [request, token]);

    const createClient = async data => request('/api/admin/clients', { method: 'POST', body: JSON.stringify(data) });
    const updateClient = async (id, data) => request(`/api/admin/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    const fetchClientsForExport = useCallback(async (filters, signal) => {
        const first = await request(`/api/admin/clients?${queryFor({ ...filters, page: 1, limit: 100 })}`, { signal });
        const rows = [...first.clients];
        for (let page = 2; page <= first.pages; page++) {
            const data = await request(`/api/admin/clients?${queryFor({ ...filters, page, limit: 100 })}`, { signal });
            rows.push(...data.clients);
        }
        return rows;
    }, [request]);

    const visible = state.session === token ? state : { ...empty, loading: Boolean(token), error: null };
    return { ...visible, fetchClients, fetchClientById, createClient, updateClient, fetchClientsForExport };
}
