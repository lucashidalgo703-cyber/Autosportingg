export const PRIVATE_DOWNLOAD_CHUNK_BYTES = 1024 * 1024;
export function sendPrivateDocument(res, file, rangeHeader, disposition) {
    const data = file.data, total = data.length;
    res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Content-Type, Content-Disposition, Accept-Ranges');
    res.setHeader('Content-Type', file.metadata.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', disposition || `attachment; filename*=UTF-8''${encodeURIComponent(String(file.metadata.filename || 'archivo').replace(/[\r\n]/g, ''))}`);
    if (!rangeHeader) { res.setHeader('Content-Length', total); return res.send(data); }
    const match = /^bytes=(\d+)-(\d+)$/.exec(String(rangeHeader));
    const start = match ? Number(match[1]) : NaN, requestedEnd = match ? Number(match[2]) : NaN, end = Math.min(requestedEnd, total - 1);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || start >= total || requestedEnd < start || requestedEnd - start + 1 > PRIVATE_DOWNLOAD_CHUNK_BYTES) {
        res.setHeader('Content-Range', `bytes */${total}`); return res.status(416).json({ message: 'El rango de descarga no es válido. Solicitá partes de hasta 1 MiB.' });
    }
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`); res.setHeader('Content-Length', end - start + 1);
    return res.status(206).send(data.subarray(start, end + 1));
}
