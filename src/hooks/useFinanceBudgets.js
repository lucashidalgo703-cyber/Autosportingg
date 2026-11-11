import { useCallback, useState } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';

export function useFinanceBudgets() {
    const [loading, setLoading] = useState(false);

    const fetchBudgets = useCallback(async (period) => {
        setLoading(true);
        try {
            const url = period ? `/api/admin/finance/budgets?period=${period}` : '/api/admin/finance/budgets';
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    const createBudget = useCallback(async (payload) => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/finance/budgets', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateBudget = useCallback(async (id, payload) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/finance/budgets/${id}`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteBudget = useCallback(async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/finance/budgets/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    return { fetchBudgets, createBudget, updateBudget, deleteBudget, loading };
}
