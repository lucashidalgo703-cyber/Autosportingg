import { useState, useCallback } from 'react';

export function useAdminTransactions() {
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

    const fetchTransactions = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    queryParams.append(key, value);
                }
            });
            
            const response = await fetch(`/api/admin/transactions?${queryParams.toString()}`, {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                const message = await parseErrorResponse(response);
                throw new Error(message);
            }
            
            return await response.json();
        } catch (err) {
            setError(err.message);
            console.error('Error in fetchTransactions:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTransactionById = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/transactions/${id}`, {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                const message = await parseErrorResponse(response);
                throw new Error(message);
            }
            
            return await response.json();
        } catch (err) {
            setError(err.message);
            console.error('Error in fetchTransactionById:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const createTransaction = async (data) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/transactions', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const message = await parseErrorResponse(response);
                throw new Error(message);
            }
            
            return await response.json();
        } catch (err) {
            setError(err.message);
            console.error('Error in createTransaction:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateTransaction = async (id, data) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/transactions/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const message = await parseErrorResponse(response);
                throw new Error(message);
            }
            
            return await response.json();
        } catch (err) {
            setError(err.message);
            console.error('Error in updateTransaction:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        fetchTransactions,
        fetchTransactionById,
        createTransaction,
        updateTransaction,
        loading,
        error
    };
}
