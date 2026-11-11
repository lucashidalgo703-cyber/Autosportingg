import { uploadPrivateFiles } from './uploadPrivateFiles.js';

export const EXPEDIENTE_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024;
const retries = new WeakMap();
const parties = ['seller', 'buyer', 'procedure'];
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const apiBase = () => process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function expedienteFileMatches(file, party, documentKey) {
    return file?.slot === 'expediente_document' && file.party === party && file.documentKey === documentKey;
}

export async function uploadExpedienteDocument({ saleId, file, party, documentKey, token, signal, onProgress, uploadId, attachmentId }) {
    if (!/^[a-f\d]{24}$/i.test(String(saleId || '')) || !parties.includes(party) || typeof documentKey !== 'string' || !/^[a-z\d_-]{1,100}$/i.test(documentKey)) {
        throw new Error('El expediente o el documento seleccionado no es válido.');
    }
    if (!file || typeof file.arrayBuffer !== 'function' || !file.size || file.size > EXPEDIENTE_DOCUMENT_MAX_BYTES || !token) {
        throw new Error('Seleccioná un archivo con contenido de hasta 15 MB e iniciá sesión.');
    }
    const key = JSON.stringify([token, saleId, party, documentKey]);
    let attempts = retries.get(file);
    if (!attempts) { attempts = new Map(); retries.set(file, attempts); }
    let identity = attempts.get(key);
    if (!identity) { identity = { uploadId: crypto.randomUUID(), attachmentId: crypto.randomUUID() }; attempts.set(key, identity); }
    identity = { uploadId: uploadId || identity.uploadId, attachmentId: attachmentId || identity.attachmentId };
    if (!uuid.test(identity.uploadId) || !uuid.test(identity.attachmentId)) throw new Error('La identificación de carga no es válida.');
    attempts.set(key, identity);
    const result = await uploadPrivateFiles({
        basePath: apiBase() + '/api/admin/sales/' + encodeURIComponent(saleId) + '/document-uploads',
        files: [file], token, signal, onProgress, uploadId: identity.uploadId,
        metadata: { slot: 'expediente_document', party, documentKey, attachmentId: identity.attachmentId }
    });
    return result.document || result.documents?.[0];
}
