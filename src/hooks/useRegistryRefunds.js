import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestRegistryRefundJson } from '../utils/registryRefundRequest';
export function useRegistryRequest() {
    const { token } = useAuth(); const active = useRef(token); active.current = token;
    const controllers = useRef(new Set());
    useEffect(() => () => { for (const controller of controllers.current) controller.abort(); controllers.current.clear(); }, [token]);
    const request = useCallback(async (path, method = 'GET', payload) => {
        const controller = new AbortController(); controllers.current.add(controller);
        try { return await requestRegistryRefundJson({ path, method, payload, token, signal: controller.signal, isCurrent: () => active.current === token && localStorage.getItem('token') === token }); }
        finally { controllers.current.delete(controller); }
    }, [token]);
    return { request, token };
}
