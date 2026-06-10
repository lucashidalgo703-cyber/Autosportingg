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

export function useInfracciones() {
    const [infracciones, setInfracciones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchInfracciones = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/infracciones`, {
                headers: getAuthHeader()
            });

            if (!res.ok) {
                throw new Error('Error al cargar la lista de infracciones');
            }

            const data = await res.json();
            setInfracciones(data);
            return data;
        } catch (err) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createInfraccion = async (payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/infracciones`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al cargar infracción');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    const updateInfraccion = async (id, payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/infracciones/${id}`, {
                method: 'PUT',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al actualizar infracción');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    const deleteInfraccion = async (id) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/infracciones/${id}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al eliminar infracción');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    return {
        infracciones,
        loading,
        error,
        fetchInfracciones,
        createInfraccion,
        updateInfraccion,
        deleteInfraccion
    };
}
