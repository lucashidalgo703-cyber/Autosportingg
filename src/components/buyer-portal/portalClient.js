let privacyPolicyReady;
async function ensurePrivatePortalWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (privacyPolicyReady) return privacyPolicyReady;
    privacyPolicyReady = (async () => {
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (!registration) return;
        try { await registration.update(); } catch {}
        const waiting = registration.installing || registration.waiting;
        if (waiting && waiting.state !== 'activated') await new Promise(resolve => {
            const timeout = setTimeout(resolve, 5000);
            waiting.addEventListener('statechange', () => {
                if (waiting.state === 'activated' || waiting.state === 'redundant') { clearTimeout(timeout); resolve(); }
            });
        });
        const verify = () => new Promise(resolve => {
            const worker = navigator.serviceWorker.controller;
            if (!worker) { resolve(true); return; }
            const channel = new MessageChannel();
            const timeout = setTimeout(() => { channel.port1.close(); resolve(false); }, 1200);
            channel.port1.onmessage = event => { clearTimeout(timeout); channel.port1.close(); resolve(event.data?.version >= 3); };
            worker.postMessage({ type: 'BUYER_PORTAL_PRIVACY_POLICY' }, [channel.port2]);
        });
        if (!await verify() && !await verify()) throw new Error('Actualizá esta página para activar la protección de documentos privados antes de continuar.');
    })().catch(error => { privacyPolicyReady = null; throw error; });
    return privacyPolicyReady;
}

export async function portalRequest(url, { token, body, method = 'GET' } = {}) {
    // Fail closed if an older CRM worker could persist a verified session or file.
    await ensurePrivatePortalWorker();
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const response = await fetch(url, {
        method,
        cache: 'no-store',
        credentials: 'same-origin',
        referrerPolicy: 'no-referrer',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: isForm ? body : JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.message || 'No se pudo completar la solicitud. Volvé a intentarlo.');
        error.status = response.status;
        error.code = data.error || data.code;
        throw error;
    }
    return data;
}

function privatePortalUrl(value, fileOnly = false) {
    const url = new URL(value, window.location.origin);
    const path = fileOnly ? /^\/api\/buyer-portal\/files\/[a-f0-9]{24}$/i : /^\/api\/(?:admin\/)?buyer-portal\//;
    if (url.origin !== window.location.origin || url.username || url.password || !path.test(url.pathname)) throw new Error('Archivo no disponible. Volvé a abrirlo desde el portal.');
    return url.href;
}

export async function uploadPortalFile(url, form, { token, onProgress, signal } = {}) {
    await ensurePrivatePortalWorker();
    url = privatePortalUrl(url);
    if (!(form instanceof FormData)) throw new Error('Elegí el archivo que querés cargar.');
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const error = (message, status = 0) => Object.assign(new Error(message), { status });
        const stop = () => xhr.abort();
        const cleanup = () => signal?.removeEventListener('abort', stop);
        xhr.open('POST', url); xhr.withCredentials = true; xhr.timeout = 120000;
        if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.setRequestHeader('Cache-Control', 'no-store');
        xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.min(100, Math.round(event.loaded * 100 / event.total))); };
        xhr.onload = () => {
            cleanup();
            let data; try { data = JSON.parse(xhr.responseText); } catch { data = {}; }
            if (xhr.status >= 200 && xhr.status < 300) { onProgress?.(100); resolve(data); }
            else reject(error(data.message || 'No se pudo guardar el archivo. Reintentá.', xhr.status));
        };
        xhr.onerror = xhr.ontimeout = () => { cleanup(); reject(error('Se perdió la conexión. Reintentá para confirmar la misma carga.')); };
        xhr.onabort = () => { cleanup(); reject(error('La carga se interrumpió. Podés reintentar sin duplicarla.')); };
        if (signal?.aborted) { reject(error('La carga se interrumpió.')); return; }
        signal?.addEventListener('abort', stop, { once: true });
        onProgress?.(0); xhr.send(form);
    });
}

export async function downloadPortalFile(access, { fileName = 'documento' } = {}) {
    await ensurePrivatePortalWorker();
    const url = privatePortalUrl(access?.url, true);
    const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', referrerPolicy: 'no-referrer' });
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw Object.assign(new Error(body.message || 'No se pudo descargar el archivo. Volvé a intentarlo.'), { status: response.status });
    }
    const blob = await response.blob();
    if (!/^(?:application\/pdf|image\/(?:jpeg|png|webp|heic|heif))$/i.test(blob.type)) throw new Error('No se pudo descargar este archivo. Volvé a abrirlo.');
    const disposition = response.headers.get('Content-Disposition') || '';
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    if (encoded) { try { fileName = decodeURIComponent(encoded); } catch {} }
    fileName = String(fileName).replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(0, 180) || 'documento';
    const objectUrl = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = objectUrl; link.download = fileName; link.referrerPolicy = 'no-referrer';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}

export const documentRequirements = [
    { key: 'title', label: 'CAT o título del automotor', guidance: 'Adelantá una foto o el PDF del título. Para modelos anteriores a 2016, la guía de AutoSporting pide presentar el título de propiedad original.' },
    { key: 'domain_report', label: 'Informe de estado de dominio', guidance: 'Subí el informe completo. Gestoría revisa su vigencia.' },
    { key: 'traffic_report', label: 'SUATS – Informe de infracciones de tránsito', guidance: 'Subí una foto o el PDF completo, actualizado al momento de la operación.' },
    { key: 'police_check', label: 'Formulario 12 – Verificación policial', guidance: 'Subí la verificación de chasis y motor. Gestoría revisa su vigencia.' },
    { key: 'registration_cards', label: 'Cédulas del automotor', guidance: 'Podés entregar varias cédulas del propietario o autorizadas. Identificá el frente y el dorso de cada una.' },
    { key: 'municipal_clearance', label: 'Libre deuda municipal y de infracciones', guidance: 'La guía de AutoSporting pide gestionarlo dentro de las 24 horas previas a la entrega. Los demás documentos se pueden adelantar.' }
];

export const portalDate = value => value ? new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23'
}).format(new Date(value)) : 'Sin fecha';
export const vehicleLabel = vehicle => [vehicle?.brand, vehicle?.model || vehicle?.name, vehicle?.year].filter(Boolean).join(' ') || 'Vehículo por confirmar';
export const documentStatus = status => ({
    received: 'Copia digital recibida', reviewed: 'Revisada', correction_requested: 'Corrección solicitada', superseded: 'Versión anterior'
})[status] || 'Copia digital recibida';

export async function prepareBuyerFile(file) {
    const limit = 3 * 1024 * 1024;
    if (file.type === 'application/pdf') {
        if (file.size > limit) throw new Error('El PDF supera los 3 MiB. Elegí una versión de menor tamaño.');
        return file;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type)) throw new Error('Elegí una foto JPG, PNG o WebP, o un PDF.');
    // Mobile camera photos are resized locally before the individual upload.
    const source = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = source;
        try { await image.decode(); }
        catch { throw new Error('Este navegador no puede preparar esa foto. Guardala como JPG y volvé a elegirla.'); }
        const ratio = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No se pudo preparar la imagen. Elegí otro archivo.');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
        if (!blob || blob.size > limit) throw new Error('La imagen sigue superando los 3 MiB. Elegí una foto de menor tamaño.');
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } finally { URL.revokeObjectURL(source); }
}
