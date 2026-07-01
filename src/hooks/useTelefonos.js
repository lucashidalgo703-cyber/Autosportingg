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

export function useTelefonos() {
    const [telefonos, setTelefonos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchTelefonos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/telefonos`, {
                headers: getAuthHeader()
            });

            if (!res.ok) {
                throw new Error('Error al cargar la lista de teléfonos');
            }

            const data = await res.json();
            setTelefonos(data);
            return data;
        } catch (err) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createTelefono = async (payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/telefonos`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al crear contacto');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    const updateTelefono = async (id, payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/telefonos/${id}`, {
                method: 'PUT',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al actualizar contacto');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    const deleteTelefono = async (id) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/telefonos/${id}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al eliminar contacto');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    return {
        telefonos,
        loading,
        error,
        fetchTelefonos,
        createTelefono,
        updateTelefono,
        deleteTelefono
    };
}
