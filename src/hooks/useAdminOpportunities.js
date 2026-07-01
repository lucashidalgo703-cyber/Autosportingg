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

export function useAdminOpportunities() {
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchOpportunities = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/opportunities`, {
                headers: getAuthHeader()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al cargar las oportunidades');
            }

            const data = await parseResponseSafe(res);
            setOpportunities(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createOpportunity = async (payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/opportunities`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al crear la oportunidad');
            }

            const data = await parseResponseSafe(res);
            setOpportunities(prev => [data, ...prev]);
            return data;
        } catch (err) {
            throw err;
        }
    };

    const updateOpportunity = async (id, payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/opportunities/${id}`, {
                method: 'PATCH',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al actualizar la oportunidad');
            }

            const data = await parseResponseSafe(res);
            setOpportunities(prev => prev.map(o => o._id === id ? { ...o, ...data } : o));
            return data;
        } catch (err) {
            throw err;
        }
    };

    const deleteOpportunity = async (id) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/opportunities/${id}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al eliminar la oportunidad');
            }

            setOpportunities(prev => prev.filter(o => o._id !== id));
            return true;
        } catch (err) {
            throw err;
        }
    };

    return {
        opportunities,
        loading,
        error,
        fetchOpportunities,
        createOpportunity,
        updateOpportunity,
        deleteOpportunity
    };
}
