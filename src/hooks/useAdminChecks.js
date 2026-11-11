import { useState, useCallback } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';


export function useAdminChecks() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    const fetchChecks = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.month) queryParams.append('month', filters.month);
            if (filters.direction) queryParams.append('direction', filters.direction);
            if (filters.search) queryParams.append('search', filters.search);

            const res = await fetch(`/api/admin/checks?${queryParams.toString()}`, {
                headers: getAuthHeaders()
            });

            const data = await parseResponseSafe(res);
            if (!res.ok) {
                throw new Error(data?.message || 'Error fetching checks');
            }
            return data;
        } catch (err) {
            console.error('fetchChecks Error:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const createCheck = async (checkData) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/checks', {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(checkData)
            });

            const data = await parseResponseSafe(res);
            if (!res.ok) {
                throw new Error(data?.message || 'Error creating check');
            }
            return data;
        } catch (err) {
            console.error('createCheck Error:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateCheck = async (id, updateData) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/checks/${id}`, {
                method: 'PATCH',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            const data = await parseResponseSafe(res);
            if (!res.ok) {
                throw new Error(data?.message || 'Error updating check');
            }
            return data;
        } catch (err) {
            console.error('updateCheck Error:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const annulCheck = async (id) => {
        return updateCheck(id, { status: 'anulado' });
    };

    return {
        fetchChecks,
        createCheck,
        updateCheck,
        annulCheck,
        loading,
        error
    };
}
