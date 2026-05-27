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

export function useAdminReservations() {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchReservations = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (filters?.vehicleId) queryParams.append('vehicleId', filters.vehicleId);
            if (filters?.leadId) queryParams.append('leadId', filters.leadId);
            if (filters?.clientId) queryParams.append('clientId', filters.clientId);
            if (filters?.status) queryParams.append('status', filters.status);

            const res = await fetch(`${getBaseUrl()}/api/admin/reservations?${queryParams.toString()}`, {
                headers: getAuthHeader()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al obtener reservas');
            }

            const data = await res.json();
            setReservations(data);
            return data;
        } catch (err) {
            setError(err.message);
            // No hacemos throw err; para que no crashee en useEffects
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchReservationById = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/reservations/${id}`, {
                headers: getAuthHeader()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al obtener detalle de reserva');
            }

            return await res.json();
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const createReservation = async (payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/reservations`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al crear la reserva');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    const updateReservation = async (id, payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/reservations/${id}`, {
                method: 'PATCH',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al actualizar la reserva');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    const convertReservationToSale = async (id, payload) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/reservations/${id}/convert-to-sale`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al convertir la reserva a venta');
            }

            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    return {
        reservations,
        loading,
        error,
        fetchReservations,
        fetchReservationById,
        createReservation,
        updateReservation,
        convertReservationToSale
    };
}
