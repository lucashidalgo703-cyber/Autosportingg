import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions';
import { requestFinanceJson } from '../utils/financeRequest';
export function useFinanceResource() {
    const { token, user } = useAuth(), [pendingCount, setPendingCount] = useState(0);
    const session = useRef(token), generation = useRef(0), controllers = useRef(new Set()), writing = useRef(false); session.current = token;
    const canRead = hasPermission(user, PERMISSIONS.FINANZAS_READ), canWrite = hasPermission(user, PERMISSIONS.FINANZAS_WRITE);
    useEffect(() => { generation.current++; writing.current = false; setPendingCount(0); return () => { generation.current++; for (const controller of controllers.current) controller.abort(); controllers.current.clear(); }; }, [token]);
    const request = useCallback(async (path, method = 'GET', payload) => {
        if (!canRead || method !== 'GET' && !canWrite) throw Error('No tenés permiso para realizar esta operación financiera.');
        if (method !== 'GET' && writing.current) throw Error('Esperá a que termine la operación actual.');
        const captured = token, version = generation.current, controller = new AbortController(); controllers.current.add(controller); if (method !== 'GET') writing.current = true;
        const isCurrent = () => generation.current === version && session.current === captured;
        setPendingCount(count => count + 1);
        try { return await requestFinanceJson({ path, method, payload, token: captured, signal: controller.signal, isCurrent }); }
        finally { controllers.current.delete(controller); if (isCurrent()) { setPendingCount(count => Math.max(0, count - 1)); if (method !== 'GET') writing.current = false; } }
    }, [token, canRead, canWrite]);
    return { request, loading: pendingCount > 0, token, canRead, canWrite };
}
