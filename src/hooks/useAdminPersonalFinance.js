import { useState, useCallback } from 'react';

export function useAdminPersonalFinance() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No estás autenticado');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/personal-transactions', {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                throw new Error('Error al obtener los movimientos personales');
            }
            return await response.json();
        } catch (err) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createTransaction = async (data) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/personal-transactions', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const resData = await response.json();
                throw new Error(resData.message || 'Error al crear el movimiento personal');
            }
            return await response.json();
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateTransaction = async (id, data) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/personal-transactions/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const resData = await response.json();
                throw new Error(resData.message || 'Error al actualizar el movimiento personal');
            }
            return await response.json();
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteTransaction = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/personal-transactions/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                const resData = await response.json();
                throw new Error(resData.message || 'Error al eliminar el movimiento personal');
            }
            return true;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        fetchTransactions,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        loading,
        error
    };
}
