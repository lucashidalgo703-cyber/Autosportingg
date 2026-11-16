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
            const res = await fetch(`${getBaseUrl()}/api-gestoria?t=${Date.now()}`, {
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
            const res = await fetch(`${getBaseUrl()}/api-gestoria`, {
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
            const res = await fetch(`${getBaseUrl()}/api-gestoria/${id}`, {
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
            const res = await fetch(`${getBaseUrl()}/api-gestoria/${id}`, {
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

    const retryStatusEmail = async (tramiteId, notificationId) => {
        const res = await fetch(`${getBaseUrl()}/api-gestoria/${encodeURIComponent(tramiteId)}/notifications/${encodeURIComponent(notificationId)}/retry`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({})
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo reintentar el aviso. El estado del trámite sigue guardado.');
        return data.emailNotification || data;
    };

    const fetchStatusEmail = useCallback(async (tramiteId) => {
        const res = await fetch(`${getBaseUrl()}/api-gestoria/${encodeURIComponent(tramiteId)}/notifications`, {
            headers: getAuthHeader(), cache: 'no-store'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo consultar el estado del aviso por correo.');
        return data.emailNotification || null;
    }, []);

    return {
        tramites,
        loading,
        error,
        fetchTramites,
        createTramite,
        updateTramite,
        deleteTramite,
        retryStatusEmail,
        fetchStatusEmail
    };
}
