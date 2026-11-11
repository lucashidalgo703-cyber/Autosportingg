export const PRIVATE_DOWNLOAD_CHUNK_BYTES = 1024 * 1024;
export async function downloadPrivateFile({ url, token, signal, filename = 'archivo', onProgress, save = true, maxBytes = 15 * 1024 * 1024 }) {
    if (typeof url !== 'string' || !url.startsWith('/api/admin/') && !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/api\/admin\//.test(url) || !token) throw new Error('La ruta de descarga privada no es válida.');
    const parts = []; let start = 0, total = null, contentType = 'application/octet-stream';
    do {
        if (signal?.aborted || localStorage.getItem('token') !== token) throw new DOMException('La sesión cambió o se canceló la descarga.', 'AbortError');
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Range: `bytes=${start}-${start + PRIVATE_DOWNLOAD_CHUNK_BYTES - 1}` }, signal, cache: 'no-store' });
        if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.message || 'No se pudo descargar el archivo privado.'); }
        const buffer = new Uint8Array(await response.arrayBuffer());
        if (signal?.aborted || localStorage.getItem('token') !== token) throw new DOMException('La sesión cambió o se canceló la descarga.', 'AbortError');
        if (response.status === 206) {
            const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('Content-Range') || '');
            if (!range || Number(range[1]) !== start || Number(range[2]) - start + 1 !== buffer.length || buffer.length > PRIVATE_DOWNLOAD_CHUNK_BYTES || total !== null && Number(range[3]) !== total) throw new Error('La descarga privada llegó incompleta. Reintentá desde el archivo.');
            total = Number(range[3]);
        } else if (start === 0 && buffer.length <= PRIVATE_DOWNLOAD_CHUNK_BYTES) total = buffer.length;
        else throw new Error('El servidor necesita admitir descargas privadas por partes para este tamaño.');
        if (!Number.isSafeInteger(total) || total < 1 || total > maxBytes || !buffer.length || start + buffer.length > total) throw new Error('El tamaño del archivo privado no coincide con lo esperado.');
        contentType = response.headers.get('Content-Type') || contentType; parts.push(buffer); start += buffer.length;
        onProgress?.({ downloadedBytes: start, totalBytes: total, percent: Math.round(start / total * 100) });
    } while (start < total);
    const blob = new Blob(parts, { type: contentType });
    if (save) {
        const href = URL.createObjectURL(blob), link = document.createElement('a'); link.href = href; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(href), 1000);
    }
    return blob;
}
