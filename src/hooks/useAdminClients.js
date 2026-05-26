import { useState, useCallback } from 'react';

export function useAdminClients() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const fetchClients = useCallback(async (filters = {}) => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No authentication token found');

            const queryParams = new URLSearchParams();
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.type) queryParams.append('type', filters.type);
            if (filters.source) queryParams.append('source', filters.source);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.page) queryParams.append('page', filters.page);
            if (filters.limit) queryParams.append('limit', filters.limit);

            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : API_URL;

            const res = await fetch(`${baseUrl}/api/admin/clients?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401) throw new Error('No autorizado');
                throw new Error('Error al cargar clientes');
            }

            const data = await res.json();
            setClients(data.clients);
            setTotal(data.total);
            setTotalPages(data.pages);
        } catch (err) {
            console.error('fetchClients Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchClientById = useCallback(async (id) => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No authentication token found');

            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : API_URL;

            const res = await fetch(`${baseUrl}/api/admin/clients/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401) throw new Error('No autorizado');
                throw new Error('Error al cargar cliente');
            }

            return await res.json();
        } catch (err) {
            console.error('fetchClientById Error:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const createClient = async (clientData) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : API_URL;

            const res = await fetch(`${baseUrl}/api/admin/clients`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(clientData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al crear cliente');
            }

            return await res.json();
        } catch (err) {
            console.error('createClient Error:', err);
            throw err;
        }
    };

    const updateClient = async (id, clientData) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : API_URL;

            const res = await fetch(`${baseUrl}/api/admin/clients/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(clientData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al actualizar cliente');
            }

            return await res.json();
        } catch (err) {
            console.error('updateClient Error:', err);
            throw err;
        }
    };

    return {
        clients,
        loading,
        error,
        total,
        totalPages,
        fetchClients,
        fetchClientById,
        createClient,
        updateClient
    };
}
