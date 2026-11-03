import { useState, useCallback } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';

export function useExpenseQuotaAssignments() {
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

    const fetchExpenseAssignments = useCallback(async (expenseId) => {
        if (!expenseId) return null;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/expenses/${expenseId}/quota-assignments`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error(await parseErrorResponse(res));
            return await parseResponseSafe(res);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const assignQuota = useCallback(async (expenseId, { installmentId, assignedAmount, notes }) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/expenses/${expenseId}/quota-assignments`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ installmentId, assignedAmount, notes })
            });
            if (!res.ok) throw new Error(await parseErrorResponse(res));
            return await parseResponseSafe(res);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const releaseAssignment = useCallback(async (assignmentId, reason = '') => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/quota-assignments/${assignmentId}?reason=${encodeURIComponent(reason)}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error(await parseErrorResponse(res));
            return await parseResponseSafe(res);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateAssignmentAmount = useCallback(async (assignmentId, assignedAmount, notes = '') => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/quota-assignments/${assignmentId}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ assignedAmount, notes })
            });
            if (!res.ok) throw new Error(await parseErrorResponse(res));
            return await parseResponseSafe(res);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const searchQuotas = useCallback(async ({ currency, search = '', expenseId = '', limit = 50 }) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (currency) params.append('currency', currency);
            if (search) params.append('search', search);
            if (expenseId) params.append('expenseId', expenseId);
            if (limit) params.append('limit', String(limit));

            const res = await fetch(`/api/admin/installments/search-for-expense?${params.toString()}`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error(await parseErrorResponse(res));
            const data = await parseResponseSafe(res);
            return data.installments || [];
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const createManualQuotaAndAssign = useCallback(async (payload) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/installments/manual-and-assign', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(await parseErrorResponse(res));
            return await parseResponseSafe(res);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchQuotaCoveredExpenses = useCallback(async (installmentId) => {
        if (!installmentId) return null;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/installments/${installmentId}/expense-assignments`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error(await parseErrorResponse(res));
            return await parseResponseSafe(res);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        fetchExpenseAssignments,
        assignQuota,
        releaseAssignment,
        updateAssignmentAmount,
        searchQuotas,
        createManualQuotaAndAssign,
        fetchQuotaCoveredExpenses
    };
}
