export function registryRefundPathAllowed(path, method = 'GET') {
    if (typeof path !== 'string') return false;
    if (path === '/api/admin/accounts') return method === 'GET';
    return /^\/api\/admin\/finance\/registry-refunds(?:\/[a-f\d]{24})?(?:\?[^#]*)?$/i.test(path) || /^\/api\/admin\/gestoria\/[a-f\d]{24}\/registry-refunds(?:\?[^#]*)?$/i.test(path);
}
export async function requestRegistryRefundJson({ path, method = 'GET', payload, token, signal, isCurrent = () => true }) {
    if (!registryRefundPathAllowed(path, method)) throw Error('La ruta del reintegro no es válida.');
    const check = () => { if (!token || signal?.aborted || !isCurrent() || localStorage.getItem('token') !== token) throw new DOMException('La sesión cambió o se canceló la consulta.', 'AbortError'); };
    check(); const base = process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    let response;
    try { response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }), signal, cache: 'no-store' }); }
    catch (error) { check(); if (error.name === 'AbortError') throw error; throw Error(method === 'GET' ? 'No se pudo consultar el reintegro. Reintentá la consulta.' : 'No se pudo confirmar la respuesta. Actualizá la lista; reintentar esta misma solicitud conserva su identificador y no duplica el ingreso.'); }
    const data = await response.json().catch(() => null); check();
    if (!response.ok) throw Object.assign(Error(data?.message || data?.error || 'No se pudo completar la gestión del reintegro.'), { status: response.status, errors: data?.errors });
    if (!data || !response.headers.get('content-type')?.includes('application/json')) throw Error('Respuesta inesperada. Actualizá la vista antes de continuar.');
    return data;
}
