import { useState, useCallback } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';

export function useAdminAccounts() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Sesión vencida. Volvé a iniciar sesión.');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const parseErrorResponse = async (response) => {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const data = await response.json().catch(() => ({}));
            return data.message || data.error || `Error ${response.status}`;
        }
        const text = await response.text().catch(() => "");
        return text || `Error ${response.status}`;
    };

    const fetchAccounts = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    queryParams.append(key, value);
                }
            });

            const response = await fetch(`/api/admin/accounts?${queryParams.toString()}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const message = await parseErrorResponse(response);
                throw new Error(message);
            }

            return await parseResponseSafe(response);
        } catch (err) {
            setError(err.message);
            console.error('Error in fetchAccounts:', err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createAccount = async (data) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/accounts', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const message = await parseErrorResponse(response);
                throw new Error(message);
            }

            return await parseResponseSafe(response);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateAccount = async (id, data) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/accounts/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const message = await parseErrorResponse(response);
                throw new Error(message);
            }

            return await parseResponseSafe(response);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteAccount = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/accounts/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const message = await parseErrorResponse(response);
                throw new Error(message);
            }

            return await parseResponseSafe(response);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const recalculateBalances = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/accounts/recalculate', {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const message = await parseErrorResponse(response);
                throw new Error(message);
            }

            return await parseResponseSafe(response);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        fetchAccounts,
        createAccount,
        updateAccount,
        deleteAccount,
        recalculateBalances,
        loading,
        error
    };
}
