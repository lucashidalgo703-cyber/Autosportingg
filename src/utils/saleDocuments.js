import { uploadPrivateFiles } from './uploadPrivateFiles.js';
const retries = new WeakMap();
const apiBase = () => process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const SALE_DOCUMENT_SLOT_LABELS = { buyer_id_front: 'DNI del comprador · frente', buyer_id_back: 'DNI del comprador · dorso', vehicle_card_front: 'Cédula del vehículo · frente', vehicle_card_back: 'Cédula del vehículo · dorso', deposit_receipt: 'Recibo de seña', trade_in_card_front: 'Cédula de permuta · frente', trade_in_card_back: 'Cédula de permuta · dorso' };
export async function uploadSaleDocument({ saleId, file, slot, depositId, tradeInId, token, signal, uploadId, onProgress }) {
    if (!/^[a-f\d]{24}$/i.test(String(saleId)) || !file || typeof file.arrayBuffer !== 'function' || !Object.hasOwn(SALE_DOCUMENT_SLOT_LABELS, slot)) throw new Error('Guardá primero la venta y seleccioná un documento válido.');
    const metadata = { slot, ...(depositId ? { depositId } : {}), ...(tradeInId ? { tradeInId } : {}) };
    const key = JSON.stringify([token, saleId, metadata]); let attempts = retries.get(file); if (!attempts) { attempts = new Map(); retries.set(file, attempts); }
    if (!uploadId) { uploadId = attempts.get(key) || crypto.randomUUID(); attempts.set(key, uploadId); }
    const result = await uploadPrivateFiles({ basePath: apiBase() + '/api/admin/sales/' + saleId + '/document-uploads', files: [file], token, signal, uploadId, onProgress, metadata });
    return result.document || result.documents?.[0];
}
