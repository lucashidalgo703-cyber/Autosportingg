import { useState, useCallback } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';

export function useFinanceWithdrawals() {
    const [loading, setLoading] = useState(false);

    const fetchWithdrawals = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/finance/withdrawals', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    const createWithdrawal = async (payload) => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/finance/withdrawals', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        return await parseResponseSafe(res);
    };

    return { fetchWithdrawals, createWithdrawal, loading };
}
