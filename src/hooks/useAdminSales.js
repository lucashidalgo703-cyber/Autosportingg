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

export function useAdminSales() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchSales = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (filters?.vehicleId) queryParams.append('vehicleId', filters.vehicleId);
            if (filters?.clientId) queryParams.append('clientId', filters.clientId);
            if (filters?.leadId) queryParams.append('leadId', filters.leadId);
            if (filters?.status) queryParams.append('status', filters.status);

            const res = await fetch(`${getBaseUrl()}/api/admin/sales?${queryParams.toString()}`, {
                headers: getAuthHeader()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al obtener ventas');
            }

            const data = await res.json();
            setSales(data);
            return data;
        } catch (err) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSaleById = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/sales/${id}`, {
                headers: getAuthHeader()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al obtener detalle de venta');
            }

            return await res.json();
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSale = async (id, payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/sales/${id}`, {
                method: 'PATCH',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al actualizar la venta');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    return {
        sales,
        loading,
        error,
        fetchSales,
        fetchSaleById,
        updateSale
    };
}
