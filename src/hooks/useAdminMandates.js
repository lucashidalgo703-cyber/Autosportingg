import { useState, useCallback } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';

const getAuthHeader = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return '';
};

export function useAdminMandates() {
    const [mandates, setMandates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMandates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/mandates`, {
                headers: getAuthHeader()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al cargar los mandatos');
            }

            const data = await parseResponseSafe(res);
            setMandates(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createMandate = async (payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/mandates`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al crear el mandato');
            }

            const data = await parseResponseSafe(res);
            setMandates(prev => [data, ...prev]);
            return data;
        } catch (err) {
            throw err;
        }
    };

    const updateMandate = async (id, payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/mandates/${id}`, {
                method: 'PATCH',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al actualizar el mandato');
            }

            const data = await parseResponseSafe(res);
            setMandates(prev => prev.map(m => m._id === id ? { ...m, ...data } : m));
            return data;
        } catch (err) {
            throw err;
        }
    };

    const deleteMandate = async (id) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/mandates/${id}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al eliminar el mandato');
            }

            setMandates(prev => prev.filter(m => m._id !== id));
            return true;
        } catch (err) {
            throw err;
        }
    };

    return {
        mandates,
        loading,
        error,
        fetchMandates,
        createMandate,
        updateMandate,
        deleteMandate
    };
}
