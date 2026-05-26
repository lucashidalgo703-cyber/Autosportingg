import { useState, useCallback } from 'react';

export const useAdminLeads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);

    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const getBaseUrl = () => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        return process.env.NODE_ENV === 'production' ? '' : API_URL;
    };

    const fetchLeads = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });

            const res = await fetch(`${getBaseUrl()}/api/admin/leads?${queryParams.toString()}`, {
                headers: getAuthHeader()
            });

            if (!res.ok) {
                if (res.status === 401) throw new Error('No autorizado');
                throw new Error('Error al cargar leads');
            }

            const data = await res.json();
            setLeads(data.leads);
            setTotal(data.total);
        } catch (err) {
            setError(err.message);
            setLeads([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const linkClientToLead = async (leadId, clientId) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/leads/${leadId}/link-client`, {
                method: 'PATCH',
                headers: getAuthHeader(),
                body: JSON.stringify({ clientId })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al vincular el cliente');
            }
            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    const fetchLeadById = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/leads/${id}`, {
                headers: getAuthHeader()
            });
            if (!res.ok) throw new Error('Error al cargar la oportunidad');
            const data = await res.json();
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateLead = async (id, leadData) => {
        try {
            const res = await fetch(`${getBaseUrl()}/api/admin/leads/${id}`, {
                method: 'PATCH',
                headers: getAuthHeader(),
                body: JSON.stringify(leadData)
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al actualizar');
            }
            return await res.json();
        } catch (err) {
            throw err;
        }
    };

    return {
        leads,
        loading,
        error,
        total,
        fetchLeads,
        fetchLeadById,
        updateLead,
        linkClientToLead
    };
};
