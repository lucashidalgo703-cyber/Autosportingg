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

export function usePedidos() {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPedidos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/pedidos`, {
                headers: getAuthHeader()
            });

            if (!res.ok) {
                throw new Error('Error al cargar la lista de pedidos');
            }

            const data = await res.json();
            setPedidos(data);
            return data;
        } catch (err) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createPedido = async (payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/pedidos`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al crear pedido');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    const updatePedido = async (id, payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/pedidos/${id}`, {
                method: 'PUT',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al actualizar pedido');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    const deletePedido = async (id) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/pedidos/${id}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al eliminar pedido');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    return {
        pedidos,
        loading,
        error,
        fetchPedidos,
        createPedido,
        updatePedido,
        deletePedido
    };
}
