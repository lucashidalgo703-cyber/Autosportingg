import { useState, useCallback } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';

export function useFinancePayables() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    const fetchPayables = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.search) queryParams.append('search', filters.search);

            const res = await fetch(`/api/admin/finance/payables?${queryParams.toString()}`, {
                headers: getAuthHeaders()
            });

            const data = await parseResponseSafe(res);
            if (!res.ok) {
                throw new Error(data?.message || 'Error fetching payables');
            }
            return data;
        } catch (err) {
            console.error('fetchPayables Error:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchReceivablesPayables = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/finance/receivables-payables', {
                headers: getAuthHeaders()
            });

            const data = await parseResponseSafe(res);
            if (!res.ok) {
                throw new Error(data?.message || 'Error fetching receivables and payables');
            }
            return data;
        } catch (err) {
            console.error('fetchReceivablesPayables Error:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const registerOwnerPayment = async (saleId, payload) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/finance/payables/${saleId}/pay`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await parseResponseSafe(res);
            if (!res.ok) {
                throw new Error(data?.message || 'Error registering owner payment');
            }
            return data;
        } catch (err) {
            console.error('registerOwnerPayment Error:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        fetchPayables,
        fetchReceivablesPayables,
        registerOwnerPayment,
        loading,
        error
    };
}
