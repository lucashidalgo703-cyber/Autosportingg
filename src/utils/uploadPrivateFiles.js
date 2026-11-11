export const PRIVATE_UPLOAD_CHUNK_BYTES = 1024 * 1024;
const hex = bytes => Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
const hash = async bytes => hex(await crypto.subtle.digest('SHA-256', bytes));
function base64(bytes) {
    let value = ''; for (let index = 0; index < bytes.length; index += 8192) value += String.fromCharCode(...bytes.subarray(index, index + 8192));
    return btoa(value);
}
export async function uploadPrivateFiles({ basePath, files, token, signal, uploadId = crypto.randomUUID(), onProgress, metadata }) {
    if (typeof basePath !== 'string' || !basePath.startsWith('/api/admin/') && !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/api\/admin\//.test(basePath) || /[?#]/.test(basePath)) throw new Error('La ruta de carga privada no es válida.');
    if (!Array.isArray(files) || !files.length || files.length > 5 || !token) throw new Error('Seleccioná los archivos e iniciá sesión antes de subirlos.');
    if (typeof uploadId !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(uploadId)) throw new Error('La identificación de carga no es válida.');
    uploadId = uploadId.toLowerCase();
    const request = async (path, body) => {
        if (signal?.aborted || localStorage.getItem('token') !== token) throw new DOMException('La sesión cambió o se canceló la carga.', 'AbortError');
        const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal, cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (signal?.aborted || localStorage.getItem('token') !== token) throw new DOMException('La sesión cambió o se canceló la carga.', 'AbortError');
        if (!response.ok) throw Object.assign(new Error(data.message || 'No se pudo guardar el archivo privado.'), { code: data.code, status: response.status });
        return data;
    };
    const manifest = [];
    const totalBytes = files.reduce((total, file) => total + file.size, 0); let uploadedBytes = 0;
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        if (!file.size || file.size > 15 * 1024 * 1024) throw new Error('Cada archivo debe tener contenido y respetar el límite del módulo.');
        const buffer = new Uint8Array(await file.arrayBuffer());
        manifest.push({ fileIndex, fileCount: files.length, fileName: file.name, mimeType: file.type || 'application/octet-stream', fileSize: buffer.length, fileSha256: await hash(buffer), partCount: Math.ceil(buffer.length / PRIVATE_UPLOAD_CHUNK_BYTES) });
    }
    const commitBody = { ...(metadata === undefined ? {} : { metadata }), manifest };
    // A retry can recover committed metadata even after temporary parts were cleaned.
    try { const result = await request(`${basePath}/${uploadId}/commit`, commitBody); onProgress?.({ uploadedBytes: totalBytes, totalBytes, percent: 100, fileIndex: files.length - 1, fileCount: files.length }); return result; }
    catch (error) { if (error.code !== 'PRIVATE_UPLOAD_INCOMPLETE') throw error; }
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = manifest[fileIndex];
        for (let partIndex = 0; partIndex < file.partCount; partIndex++) {
            const chunk = new Uint8Array(await files[fileIndex].slice(partIndex * PRIVATE_UPLOAD_CHUNK_BYTES, Math.min((partIndex + 1) * PRIVATE_UPLOAD_CHUNK_BYTES, file.fileSize)).arrayBuffer());
            await request(`${basePath}/${uploadId}/chunks`, { ...file, partIndex, chunkSha256: await hash(chunk), data: base64(chunk),...(metadata===undefined?{}:{metadata}) });
            uploadedBytes += chunk.length; onProgress?.({ uploadedBytes, totalBytes, percent: totalBytes ? Math.round(uploadedBytes / totalBytes * 100) : 100, fileIndex, fileCount: files.length });
        }
    }
    return request(`${basePath}/${uploadId}/commit`, commitBody);
}
