import { useCallback, useState } from 'react';
import { parseResponseSafe } from '../utils/apiHelper';

export function useFinanceDailyCloses() {
    const [loading, setLoading] = useState(false);

    const fetchDailyCloses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/finance/daily-closes', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    const createDailyClose = useCallback(async (payload) => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/finance/daily-closes', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok && res.status === 409) {
                const errorData = await res.json();
                throw { status: 409, message: errorData.message, latestClose: errorData.latestClose };
            }
            
            return await parseResponseSafe(res);
        } finally {
            setLoading(false);
        }
    }, []);

    const exportDailyCloses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/finance/daily-closes/export', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!res.ok) throw new Error('Error al generar CSV');
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cierres-caja.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } finally {
            setLoading(false);
        }
    }, []);

    return { fetchDailyCloses, createDailyClose, exportDailyCloses, loading };
}
