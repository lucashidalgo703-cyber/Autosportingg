export async function requestFinanceJson({ path, method = 'GET', payload, token, signal, isCurrent = () => true }) {
    const check = () => { if (!token || signal?.aborted || !isCurrent() || localStorage.getItem('token') !== token) throw new DOMException('La sesión cambió o se canceló la consulta.', 'AbortError'); };
    check();
    if (!path.startsWith('/api/admin/finance/')) throw Error('La ruta financiera no es válida.');
    const base = process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    let response;
    try { response = await fetch(base + path, { method, headers: { Authorization: 'Bearer ' + token, ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }), signal, cache: 'no-store' }); }
    catch (error) { check(); if (error.name === 'AbortError') throw error; throw Error(method === 'GET' ? 'No se pudo consultar la información. Revisá la conexión y reintentá la consulta.' : 'No se pudo confirmar la respuesta. La operación podría haberse guardado: actualizá el listado antes de volver a confirmar un movimiento de caja.'); }
    let data; try { data = await response.json(); } catch { check(); throw Error('El servidor devolvió una respuesta inesperada. Actualizá el listado antes de volver a guardar.'); } check();
    if (!response.ok) throw Object.assign(Error(data.message || data.error || 'No se pudo completar la operación financiera.'), { status: response.status, errors: data.errors });
    if (!response.headers.get('content-type')?.includes('application/json')) throw Error('El servidor devolvió una respuesta inesperada. Actualizá el listado antes de volver a guardar.');
    return data;
}
