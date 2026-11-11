import { useCallback, useState } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';

export function useFinanceReconciliation() {
    const [loading, setLoading] = useState(false);

    const uploadReconciliation = useCallback(async ({ accountId, file, fileName }) => {
        setLoading(true);
        try {
            const base64Csv = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = error => reject(error);
            });

            const res = await fetch('/api/admin/finance/reconciliation/upload', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ accountId, base64Csv, fileName })
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchReconciliation = useCallback(async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/finance/reconciliation/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    const confirmReconciliation = useCallback(async (id, decisions) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/finance/reconciliation/${id}/confirm`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ decisions })
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    return { uploadReconciliation, fetchReconciliation, confirmReconciliation, loading };
}
