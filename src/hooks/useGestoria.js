import { useState, useCallback } from 'react';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
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

export function useGestoria() {
    const [tramites, setTramites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchTramites = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/gestoria`, {
                headers: getAuthHeader()
            });

            if (!res.ok) {
                throw new Error('Error al cargar la lista de trámites de gestoría');
            }

            const data = await res.json();
            setTramites(data);
            return data;
        } catch (err) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createTramite = async (payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/gestoria`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al crear trámite');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    const updateTramite = async (id, payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/gestoria/${id}`, {
                method: 'PUT',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al actualizar trámite');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    const deleteTramite = async (id) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/gestoria/${id}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al eliminar trámite');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    return {
        tramites,
        loading,
        error,
        fetchTramites,
        createTramite,
        updateTramite,
        deleteTramite
    };
}
