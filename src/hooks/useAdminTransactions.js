import { useState, useCallback } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';

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
            
            return await parseResponseSafe(response);
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
            
            return await parseResponseSafe(response);
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
            
            return await parseResponseSafe(response);
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
            
            return await parseResponseSafe(response);
        } catch (err) {
            setError(err.message);
            console.error('Error in updateTransaction:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const annulTransaction = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/transactions/${id}`, {
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
            console.error('Error in annulTransaction:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const bulkAnnulTransactions = async (ids, confirmText) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/transactions/bulk-annul', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ids, confirmText })
            });
            if (!response.ok) {
                const message = await parseErrorResponse(response);
                throw new Error(message);
            }
            return await parseResponseSafe(response);
        } catch (err) {
            setError(err.message);
            console.error('Error in bulkAnnulTransactions:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const transferFunds = async (data) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/tesoreria/transfer', {
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
            console.error('Error in transferFunds:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const exportTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/transactions/export', {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                const message = await parseErrorResponse(response);
                throw new Error(message);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'movimientos.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message);
            console.error('Error in exportTransactions:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyClose = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/transactions/monthly-close', {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                const message = await parseErrorResponse(response);
                throw new Error(message);
            }
            return await parseResponseSafe(response);
        } catch (err) {
            setError(err.message);
            console.error('Error in fetchMonthlyClose:', err);
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
        annulTransaction,
        bulkAnnulTransactions,
        transferFunds,
        exportTransactions,
        fetchMonthlyClose,
        loading,
        error
    };
}
