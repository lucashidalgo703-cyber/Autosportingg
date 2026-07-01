import { useState, useCallback } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';

export function useFinanceCardExpenses() {
    const [loading, setLoading] = useState(false);

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/finance/card-expenses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    const createExpense = async (payload) => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/finance/card-expenses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        return await parseResponseSafe(res);
    };

    return { fetchExpenses, createExpense, loading };
}
