import crypto from 'node:crypto';
import PrivateUploadChunk from '../models/PrivateUploadChunk.js';

export const PRIVATE_UPLOAD_CHUNK_BYTES = 1024 * 1024;
export const PRIVATE_UPLOAD_TTL_MS = 2 * 3600000;
export class PrivateUploadError extends Error {
    constructor(message, code = 'PRIVATE_UPLOAD_VALIDATION', statusCode = 400) { super(message); Object.assign(this, { code, statusCode }); }
}
const fail = (message, code, status) => { throw new PrivateUploadError(message, code, status); };
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
let storageReady;
const ensureStorage = () => storageReady || (storageReady = PrivateUploadChunk.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(error => { storageReady = null; throw error; }));
const partKey = (scope, suffix) => sha(`${scope.actorOwner}\0${scope.entityId}\0${scope.uploadId}\0${suffix}`);
function scopeFor({ actorId, entityId, uploadId }) {
    if (typeof actorId !== 'string' || !actorId.trim() || actorId.length > 100 || typeof entityId !== 'string' || !entityId.trim() || entityId.length > 150 || /[\u0000-\u001f\u007f]/.test(actorId + entityId)) fail('No se pudo identificar la sesión o el registro de la carga.', 'PRIVATE_UPLOAD_SCOPE');
    if (typeof uploadId !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(uploadId)) fail('La identificación de carga debe ser un UUID válido.');
    return { actorOwner: actorId, entityId, uploadId: uploadId.toLowerCase() };
}
function limits(config) {
    if (!config || !Number.isSafeInteger(config.maxFiles) || config.maxFiles < 1 || config.maxFiles > 5 || !Number.isSafeInteger(config.maxBytes) || config.maxBytes < 1 || config.maxBytes > 15 * 1024 * 1024) fail('La configuración de carga privada no es válida.');
    return config;
}
function descriptor(payload, config) {
    limits(config);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('Los datos de la parte no son válidos.');
    const { fileIndex, fileCount, fileSize, partCount } = payload;
    if (!Number.isSafeInteger(fileCount) || fileCount < 1 || fileCount > config.maxFiles || !Number.isSafeInteger(fileIndex) || fileIndex < 0 || fileIndex >= fileCount) fail(`Seleccioná entre 1 y ${config.maxFiles} archivos y revisá su orden.`);
    if (!Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > config.maxBytes || !Number.isSafeInteger(partCount) || partCount !== Math.ceil(fileSize / PRIVATE_UPLOAD_CHUNK_BYTES)) fail('El tamaño del archivo o la cantidad de partes no es válido.');
    if (typeof payload.fileName !== 'string' || !payload.fileName.trim() || payload.fileName.length > 255 || /[\u0000-\u001f\u007f/\\]/.test(payload.fileName)) fail('El nombre del archivo no es válido.');
    if (typeof payload.mimeType !== 'string' || !payload.mimeType || payload.mimeType.length > 150 || /[\r\n]/.test(payload.mimeType)) fail('El tipo de archivo no es válido.');
    if (typeof payload.fileSha256 !== 'string' || !/^[a-f\d]{64}$/i.test(payload.fileSha256)) fail('La huella del archivo no es válida.');
    return { fileIndex, fileCount, fileSize, partCount, fileName: payload.fileName, mimeType: payload.mimeType, fileSha256: payload.fileSha256.toLowerCase() };
}
export function privateUploadManifestHash(manifest, config) {
    limits(config);
    if (!Array.isArray(manifest) || !manifest.length || manifest.length > config.maxFiles) fail('El manifiesto de archivos no es válido.');
    const canonical = manifest.map((entry, index) => { const normalized = descriptor(entry, config); if (normalized.fileIndex !== index || normalized.fileCount !== manifest.length) fail('El orden o la cantidad de archivos del manifiesto no coincide.'); return normalized; });
    return sha(JSON.stringify(canonical));
}
async function immutable(scope, suffix, fields, extra = {}) {
    const _id = partKey(scope, suffix);
    let stored;
    try { stored = await PrivateUploadChunk.findOneAndUpdate({ _id }, { $setOnInsert: { ...scope, ...fields, ...extra, expiresAt: extra.expiresAt || new Date(Date.now() + PRIVATE_UPLOAD_TTL_MS) } }, { upsert: true, new: true, runValidators: true }).lean(); }
    catch (error) { if (error.code !== 11000) throw error; stored = await PrivateUploadChunk.findById(_id).lean(); }
    if (!stored || Date.parse(stored.expiresAt) <= Date.now()) fail('La carga temporal venció. Seleccioná los archivos nuevamente.', 'PRIVATE_UPLOAD_EXPIRED', 410);
    for (const [key,value] of Object.entries(scope)) if (stored[key] !== value) fail('La parte no pertenece a esta sesión o registro.', 'PRIVATE_UPLOAD_SCOPE', 409);
    for (const [key, value] of Object.entries(fields)) if (stored[key] !== value) fail('Esta identificación de carga ya corresponde a otros archivos o partes.', 'PRIVATE_UPLOAD_CONFLICT', 409);
    return stored;
}
export async function stagePrivateUpload({ actorId, entityId, uploadId, payload, config }) {
    const scope = scopeFor({ actorId, entityId, uploadId }), file = descriptor(payload, config);
    const { partIndex, chunkSha256, data } = payload;
    if (!Number.isSafeInteger(partIndex) || partIndex < 0 || partIndex >= file.partCount || typeof chunkSha256 !== 'string' || !/^[a-f\d]{64}$/i.test(chunkSha256)) fail('El índice o la huella de la parte no es válido.');
    const expectedSize = partIndex === file.partCount - 1 ? file.fileSize - partIndex * PRIVATE_UPLOAD_CHUNK_BYTES : PRIVATE_UPLOAD_CHUNK_BYTES;
    const expectedBase64 = Math.ceil(expectedSize / 3) * 4;
    if (typeof data !== 'string' || data.length !== expectedBase64 || !/^[A-Za-z\d+/]*={0,2}$/.test(data)) fail('La parte excede el tamaño permitido o no usa base64 válido.');
    const buffer = Buffer.from(data, 'base64');
    if (buffer.length !== expectedSize || buffer.toString('base64') !== data || sha(buffer) !== chunkSha256.toLowerCase()) fail('La parte llegó incompleta o su huella no coincide.', 'PRIVATE_UPLOAD_INTEGRITY');
    await ensureStorage();
    const root = await immutable(scope, 'upload', { kind: 'upload', fileCount: file.fileCount });
    await immutable(scope, `file:${file.fileIndex}`, { kind: 'file', ...file }, { expiresAt: root.expiresAt });
    const key = partKey(scope, `part:${file.fileIndex}:${partIndex}`);
    const existed = await PrivateUploadChunk.exists({ _id: key });
    await immutable(scope, `part:${file.fileIndex}:${partIndex}`, { kind: 'part', fileCount: file.fileCount, fileIndex: file.fileIndex, partIndex, chunkSha256: chunkSha256.toLowerCase() }, { data: buffer, expiresAt: root.expiresAt });
    return { received: true, fileIndex: file.fileIndex, partIndex, replayed: Boolean(existed) };
}
function bytes(value) {
    if (Buffer.isBuffer(value)) return value;
    if (value && typeof value.value === 'function') return Buffer.from(value.value());
    return value?.buffer ? Buffer.from(value.buffer) : Buffer.from(value || []);
}
export async function assemblePrivateUpload({ actorId, entityId, uploadId, config }) {
    const scope = scopeFor({ actorId, entityId, uploadId }); limits(config);
    const root = await PrivateUploadChunk.findOne({ _id: partKey(scope, 'upload'), ...scope }).lean();
    if (!root) fail('Faltan partes de la carga. Volvé a enviar los archivos con la misma identificación.', 'PRIVATE_UPLOAD_INCOMPLETE', 409);
    if (Date.parse(root.expiresAt) <= Date.now()) fail('La carga temporal venció. Seleccioná los archivos nuevamente.', 'PRIVATE_UPLOAD_EXPIRED', 410);
    const headers = await PrivateUploadChunk.find({ ...scope, kind: 'file' }).sort({ fileIndex: 1 }).lean();
    if (headers.length !== root.fileCount) fail('Faltan archivos de esta carga.', 'PRIVATE_UPLOAD_INCOMPLETE', 409);
    const files = [], manifest = [];
    for (let fileIndex = 0; fileIndex < root.fileCount; fileIndex++) {
        const header = descriptor(headers[fileIndex], config);
        if (header.fileIndex !== fileIndex || header.fileCount !== root.fileCount || Date.parse(headers[fileIndex].expiresAt) <= Date.now()) fail('El orden o la vigencia de los archivos no coincide.', 'PRIVATE_UPLOAD_INCOMPLETE', 409);
        const parts = await PrivateUploadChunk.find({ ...scope, kind: 'part', fileIndex }).select('+data').sort({ partIndex: 1 }).lean();
        if (parts.length !== header.partCount) fail('Faltan partes del archivo. Reintentá la carga.', 'PRIVATE_UPLOAD_INCOMPLETE', 409);
        const buffers = parts.map((part, partIndex) => {
            const buffer = bytes(part.data), expectedSize = partIndex === header.partCount - 1 ? header.fileSize - partIndex * PRIVATE_UPLOAD_CHUNK_BYTES : PRIVATE_UPLOAD_CHUNK_BYTES;
            if (part.partIndex !== partIndex || part.fileCount !== root.fileCount || Date.parse(part.expiresAt) <= Date.now() || buffer.length !== expectedSize || sha(buffer) !== part.chunkSha256) fail('Una parte del archivo no pasó la verificación.', 'PRIVATE_UPLOAD_INTEGRITY', 409);
            return buffer;
        });
        const buffer = Buffer.concat(buffers, header.fileSize);
        if (buffer.length !== header.fileSize || sha(buffer) !== header.fileSha256) fail('La huella final del archivo no coincide.', 'PRIVATE_UPLOAD_INTEGRITY', 409);
        manifest.push(header); files.push({ originalname: header.fileName, mimetype: header.mimeType, size: header.fileSize, buffer });
    }
    return { files, manifest, manifestHash: privateUploadManifestHash(manifest, config) };
}
export async function cleanupPrivateUpload({ actorId, entityId, uploadId }) {
    return PrivateUploadChunk.deleteMany(scopeFor({ actorId, entityId, uploadId }));
}
