import { parseResponseSafe } from '../utils/apiHelper';
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
                console.error("Fetch sales error:", errData);
                throw new Error('No se pudieron cargar las ventas. Reintentá en unos segundos o verificá la conexión.');
            }

            const data = await parseResponseSafe(res);
            setSales(data);
            return data;
        } catch (err) {
            console.error("Sales hook catch:", err);
            setError(err.message === 'Failed to fetch' ? 'No se pudieron cargar las ventas. Reintentá en unos segundos o verificá la conexión.' : err.message);
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
                console.error("Fetch sale details error:", errData);
                throw new Error('No se pudo cargar la venta. Reintentá en unos segundos o verificá la conexión.');
            }

            return await parseResponseSafe(res);
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

            const updatedSale = await parseResponseSafe(res);
            setSales(prev => prev.map(s => {
                if (s._id !== id) return s;
                const merged = { ...s, ...updatedSale };
                // Keep populated objects if the update returned plain string IDs
                if (updatedSale.clientId && typeof updatedSale.clientId === 'string' && s.clientId && typeof s.clientId === 'object') {
                    merged.clientId = s.clientId;
                }
                if (updatedSale.vehicleId && typeof updatedSale.vehicleId === 'string' && s.vehicleId && typeof s.vehicleId === 'object') {
                    merged.vehicleId = s.vehicleId;
                }
                if (updatedSale.leadId && typeof updatedSale.leadId === 'string' && s.leadId && typeof s.leadId === 'object') {
                    merged.leadId = s.leadId;
                }
                if (updatedSale.reservationId && typeof updatedSale.reservationId === 'string' && s.reservationId && typeof s.reservationId === 'object') {
                    merged.reservationId = s.reservationId;
                }
                return merged;
            }));
            return updatedSale;
        } catch (err) {
            throw err;
        }
    };

    const createSale = async (payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/sales`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al crear la venta');
            }

            return await parseResponseSafe(res);
        } catch (err) {
            throw err;
        }
    };

    const deleteSale = async (id) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/sales/${id}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al eliminar la venta');
            }

            return await parseResponseSafe(res);
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
        updateSale,
        createSale,
        deleteSale
    };
}
