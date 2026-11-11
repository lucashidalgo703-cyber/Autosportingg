import { useState, useCallback } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';

export function useFinanceLoans() {
    const [loading, setLoading] = useState(false);

    const fetchLoans = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/finance/loans', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    const createLoan = async (payload) => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/finance/loans', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        return await parseResponseSafe(res);
    };

    const updateLoanStatus = async (id, payload) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/finance/loans/${id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        return await parseResponseSafe(res);
    };

    return { fetchLoans, createLoan, updateLoanStatus, loading };
}
