export const invoiceEndpoint = '/api/admin/vehicle-invoices';
export const invoiceId = entry => String(entry?.id || entry?._id || '');
export const vehicleName = entry => [entry?.brand, entry?.name || entry?.model, entry?.year].filter(Boolean).join(' ') || 'Vehículo';
export const invoiceDate = value => {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : 'Sin fecha';
};
export const invoiceMoney = (amount, currency) => `${currency || 'Moneda pendiente'} ${Number(amount || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
export const invoiceMoment = value => {
    const date = value ? new Date(value) : null;
    return date && Number.isFinite(date.getTime()) ? date.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' }) : '';
};
export const invoiceNumber = entry => `${entry.invoiceType || 'Factura'} ${entry.pointOfSale || ''}-${entry.invoiceNumber || ''}`;
export const unwrapInvoice = data => data?.invoice || data;
const invoiceFileExtensions = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export function validateInvoiceFileSelection(file) {
    if (!file) return null;
    const type = String(file.type || '').toLowerCase();
    const unspecifiedType = !type || type === 'application/octet-stream';
    // Mobile file providers sometimes omit MIME. An allowed extension lets the
    // selection proceed; the server still identifies the actual uploaded bytes.
    if (!Object.hasOwn(invoiceFileExtensions, type) && !(unspecifiedType && /\.(?:pdf|jpe?g|png|webp)$/i.test(file.name || ''))) {
        throw new Error('Elegí un PDF o una imagen JPG, PNG o WebP.');
    }
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > 3 * 1024 * 1024) throw new Error('El archivo debe pesar hasta 3 MB y no estar vacío.');
    return file;
}
export function invoiceDownloadFileName(file, fallback = 'factura') {
    const extension = invoiceFileExtensions[file?.mimeType];
    const base = String(file?.fileName || fallback).replace(/[\x00-\x1f\x7f/\\"']/g, '_').replace(/\.[^.]{1,12}$/, '').slice(0, 140) || 'factura';
    return extension ? base + '.' + extension : base;
}
const expire = status => { if (status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event('autosporting-auth-expired')); };

export async function invoiceRequest(path = '', { method = 'GET', body, signal, key } = {}) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('La sesión venció. Iniciá sesión nuevamente.');
    const response = await fetch(invoiceEndpoint + path, { method, signal, cache: 'no-store', credentials: 'same-origin', referrerPolicy: 'no-referrer',
        headers: { Authorization: 'Bearer ' + token, ...(key ? { 'Idempotency-Key': key } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { expire(response.status); throw Object.assign(new Error(data.message || data.error || 'No se pudo completar la consulta. Volvé a intentar.'), { status: response.status }); }
    return data;
}

export async function createInvoice(body, key) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('La sesión venció. Iniciá sesión nuevamente.');
    const response = await fetch(invoiceEndpoint, { method: 'POST', cache: 'no-store', credentials: 'same-origin', referrerPolicy: 'no-referrer',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { expire(response.status); throw Object.assign(new Error(data.message || data.error || 'No se pudo registrar la factura. Volvé a intentar.'), { status: response.status }); }
    return unwrapInvoice(data);
}

export function uploadInvoiceFile(entry, file, key, onProgress) {
    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('token');
        if (!token) { reject(new Error('La sesión venció. Iniciá sesión nuevamente.')); return; }
        const body = new FormData(); body.append('file', file); body.append('revision', String(entry.revision));
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${invoiceEndpoint}/${encodeURIComponent(invoiceId(entry))}/file`);
        xhr.setRequestHeader('Authorization', 'Bearer ' + token); xhr.setRequestHeader('Idempotency-Key', key); xhr.timeout = 120000;
        xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.min(95, Math.round(event.loaded / event.total * 95))); };
        xhr.onerror = () => reject(new Error('Se interrumpió la conexión. Reintentá el mismo archivo para recuperar el envío.'));
        xhr.ontimeout = () => reject(new Error('La carga está demorando más de lo esperado. Reintentá el mismo envío.'));
        xhr.onload = () => {
            let result; try { result = JSON.parse(xhr.responseText); } catch { result = {}; }
            if (xhr.status < 200 || xhr.status >= 300) {
                expire(xhr.status);
                reject(Object.assign(new Error(result.message || result.error || (xhr.status === 413 ? 'El archivo supera el tamaño permitido. Elegí una copia más liviana.' : 'No se pudo subir el archivo. Reintentá.')), { status: xhr.status })); return;
            }
            onProgress?.(100); resolve(unwrapInvoice(result));
        };
        xhr.send(body);
    });
}

export async function invoiceFileAccess(entry, download = false) {
    const result = await invoiceRequest(`/${encodeURIComponent(invoiceId(entry))}/file/access`, { method: 'POST', body: { download } });
    const url = new URL(result.url, window.location.origin);
    if (url.origin !== window.location.origin || url.username || url.password || url.pathname !== '/api/vehicle-invoice-files/' + entry.file.id) throw new Error('Archivo no disponible.');
    return { ...result, url: url.href };
}

export async function downloadInvoiceFile(entry) {
    const access = await invoiceFileAccess(entry, true);
    const response = await fetch(access.url, { cache: 'no-store', credentials: 'same-origin', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('No se pudo descargar la factura. Volvé a abrir el registro para renovar su acceso.');
    const blob = await response.blob(), url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = invoiceDownloadFileName(entry.file, `Factura-${entry.invoiceNumber}`);
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
