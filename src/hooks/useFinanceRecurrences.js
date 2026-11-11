import { useCallback, useState } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';

export function useFinanceRecurrences() {
    const [loading, setLoading] = useState(false);

    const fetchRecurrences = useCallback(async (includeInactive = false) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/finance/recurrences${includeInactive ? '?includeInactive=true' : ''}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    const createRecurrence = useCallback(async (payload) => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/finance/recurrences', {
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

    const updateRecurrence = useCallback(async (id, payload) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/finance/recurrences/${id}`, {
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

    const deleteRecurrence = useCallback(async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/finance/recurrences/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    const generateMonth = useCallback(async (period) => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/finance/recurrences/generate-month', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ period })
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    return { fetchRecurrences, createRecurrence, updateRecurrence, deleteRecurrence, generateMonth, loading };
}
