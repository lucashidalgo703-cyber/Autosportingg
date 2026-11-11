"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
export function useContactPermissions(entity, inputIds = []) {
    const { token } = useAuth();
    const ids = [...new Set(inputIds.map(String).filter(id => /^[a-f\d]{24}$/i.test(id)))].sort().join(',');
    const [state, setState] = useState({ token: null, ids: '', entity: '', items: {}, loading: false, error: '' });
    useEffect(() => {
        if (!token || !ids) return;
        const controller = new AbortController();
        setState({ token, ids, entity, items: {}, loading: true, error: '' });
        const values = ids.split(','), batches = [];
        for (let i = 0; i < values.length; i += 50) batches.push(values.slice(i, i + 50));
        Promise.all(batches.map(async batch => {
            const response = await fetch('/api/admin/contact-permissions?' + new URLSearchParams({ entity, ids: batch.join(',') }), { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', signal: controller.signal });
            const data = await response.json(); if (!response.ok) throw new Error(data.message || 'No se pudo verificar la preferencia de contacto.'); return data.items;
        })).then(items => { if (!controller.signal.aborted) setState({ token, ids, entity, items: Object.assign({}, ...items), loading: false, error: '' }); }).catch(error => { if (!controller.signal.aborted) setState({ token, ids, entity, items: {}, loading: false, error: error.message }); });
        return () => controller.abort();
    }, [entity, ids, token]);
    const current = state.token === token && state.ids === ids && state.entity === entity;
    return { canContact: id => current && state.items[String(id)]?.canContact === true, loading: Boolean(ids && (!current || state.loading)), error: current ? state.error : '' };
}
