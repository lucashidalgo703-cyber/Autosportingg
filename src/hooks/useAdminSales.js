import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { mergeSaleResponse } from '../utils/salePresentation';
import { salesWorkbenchQuery } from '../utils/salesWorkbench';

const base = () => typeof window !== 'undefined' ? window.location.origin : '';
const empty = { sales: [], loading: false, error: null };

export function useAdminSales() {
    const { token } = useAuth();
    const session = useRef(token); session.current = token;
    const revision = useRef(0);
    const cache = useRef({ token, records: new Map() });
    if (cache.current.token !== token) cache.current = { token, records: new Map() };
    const [state, setState] = useState({ ...empty, token });
    useEffect(() => { revision.current++; setState({ ...empty, token }); }, [token]);

    const request = useCallback(async (path, options = {}) => {
        if (!token) throw new Error('Tu sesión ya no está disponible.');
        const response = await fetch(`${base()}${path}`, { ...options, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers } });
        const json = (response.headers.get('content-type') || '').includes('application/json');
        const data = json ? await response.json().catch(() => ({})) : {};
        if (session.current !== token || localStorage.getItem('token') !== token) throw new DOMException('La sesión cambió.', 'AbortError');
        if (!response.ok) {
            const error = new Error(data?.message || data?.error || 'No se pudo completar la operación de ventas.');
            error.code = data?.code; error.errors = data?.errors; error.data = data; error.status = response.status;
            throw error;
        }
        if (!json) throw new Error('El servidor no devolvió datos de la venta. Actualizá la vista y reintentá.');
        return data;
    }, [token]);

    const read = useCallback(async (path, fallback) => {
        const readRevision = ++revision.current;
        setState(previous => ({ ...(previous.token === token ? previous : empty), token, loading: true, error: null }));
        try {
            const data = await request(path);
            if (session.current !== token || readRevision !== revision.current) return fallback;
            const records = Array.isArray(data) ? data : data?._id ? [data] : [];
            for (const record of records) cache.current.records.set(record._id, record);
            setState(previous => ({ ...(previous.token === token ? previous : empty), token, ...(Array.isArray(data) ? { sales: data } : {}), loading: false, error: null }));
            return data;
        } catch (error) {
            if (session.current === token && readRevision === revision.current) setState(previous => ({ ...(previous.token === token ? previous : empty), token, loading: false, error: error.name === 'AbortError' ? null : error.message }));
            return fallback;
        }
    }, [request, token]);

    const fetchSales = useCallback((filters = {}) => {
        const query = new URLSearchParams();
        for (const key of ['vehicleId', 'clientId', 'leadId', 'status']) if (filters[key]) query.set(key, filters[key]);
        return read(`/api/admin/sales?${query}`, []);
    }, [read]);
    const fetchSaleById = useCallback(id => read(`/api/admin/sales/${encodeURIComponent(id)}`, null), [read]);
    const fetchSalesWorkspace = useCallback((filters, { page = 1, limit = 20, exportAll = false, signal } = {}) => request(`/api/admin/sales?${salesWorkbenchQuery(filters, { page, limit, exportAll })}`, { signal }), [request]);
    const updateSale = useCallback(async (id, payload) => {
        const data = await request(`/api/admin/sales/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
        const merged = mergeSaleResponse(cache.current.records.get(id), data);
        cache.current.records.set(id, merged);
        setState(previous => previous.token === token ? { ...previous, sales: previous.sales.map(sale => sale._id === id ? merged : sale) } : previous);
        return merged;
    }, [request, token]);
    const createSale = useCallback(payload => request('/api/admin/sales', { method: 'POST', body: JSON.stringify(payload) }), [request]);
    const deleteSale = useCallback(id => request(`/api/admin/sales/${encodeURIComponent(id)}`, { method: 'DELETE' }), [request]);
    const previewInstallmentPlanCancel = useCallback(id => request(`/api/admin/sales/${encodeURIComponent(id)}/installment-plan/cancel-preview`), [request]);
    const cancelInstallmentPlan = useCallback((id, { reason, installmentIds }) => request(`/api/admin/sales/${encodeURIComponent(id)}/installment-plan/cancel`, { method: 'POST', body: JSON.stringify({ reason, installmentIds, confirm: true }) }), [request]);
    const visible = state.token === token ? state : { ...empty, loading: Boolean(token) };
    return { ...visible, salesRequest: request, fetchSalesWorkspace, fetchSales, fetchSaleById, updateSale, createSale, deleteSale, previewInstallmentPlanCancel, cancelInstallmentPlan };
}
