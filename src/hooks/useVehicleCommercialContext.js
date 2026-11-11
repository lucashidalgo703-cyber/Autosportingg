"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function useVehicleCommercialContext(vehicleId) {
    const { token } = useAuth();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const request = useRef({ generation: 0, controller: null });
    const key = `${token || ''}:${vehicleId || ''}`;
    const refresh = useCallback(async () => {
        request.current.controller?.abort();
        const generation = ++request.current.generation;
        if (!token || !vehicleId) return null;
        const controller = new AbortController();
        request.current.controller = controller;
        setLoading(true); setError('');
        try {
            const response = await fetch(`/api/admin/cars/${encodeURIComponent(vehicleId)}/commercial-context`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || 'No se pudo cargar la actividad de la unidad.');
            if (generation !== request.current.generation || controller.signal.aborted) return null;
            setResult({ key, data }); return data;
        } catch (failure) {
            if (!controller.signal.aborted && generation === request.current.generation) setError(failure.message);
            return null;
        } finally {
            if (!controller.signal.aborted && generation === request.current.generation) setLoading(false);
        }
    }, [token, vehicleId, key]);
    useEffect(() => {
        setResult(null); refresh();
        return () => { ++request.current.generation; request.current.controller?.abort(); };
    }, [refresh]);
    return { context: result?.key === key ? result.data : null, loading, error, refresh };
}
