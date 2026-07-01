import { useCallback, useState } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';

export function useFinanceCashCounts() {
    const [loading, setLoading] = useState(false);

    const fetchCashCounts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/finance/cash-counts', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    const createCashCount = useCallback(async (payload) => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/finance/cash-counts', {
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

    return { fetchCashCounts, createCashCount, loading };
}
