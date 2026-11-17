"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { downloadPortalFile, portalRequest, uploadPortalFile } from './portalClient';

export default function useBuyerPortalResources({ base, enabled, onExpired }) {
    const [payments, setPayments] = useState(null), [delivery, setDelivery] = useState(null);
    const generation = useRef(0);
    const load = useCallback(async kind => {
        if (!enabled) return null;
        const stamp = generation.current, setter = kind === 'payments' ? setPayments : setDelivery;
        setter(previous => ({ key: base, data: previous?.key === base ? previous.data : null, loading: true, error: '' }));
        try {
            const data = await portalRequest(base + (kind === 'payments' ? '/payments' : '/delivery-documents'));
            if (stamp === generation.current) setter({ key: base, data, loading: false, error: '' });
            return data;
        } catch (error) {
            if (stamp === generation.current) {
                setter(previous => ({ key: base, data: previous?.key === base ? previous.data : null, loading: false, error: error.message }));
                if ([401, 403, 410].includes(error.status)) onExpired(error);
            }
            throw error;
        }
    }, [base, enabled, onExpired]);
    useEffect(() => {
        generation.current++; setPayments(null); setDelivery(null);
        if (enabled) { void load('payments').catch(() => {}); void load('delivery').catch(() => {}); }
        return () => { generation.current++; };
    }, [enabled, load]);
    const refreshPayments = useCallback(() => load('payments').catch(() => null), [load]);
    const refreshDelivery = useCallback(() => load('delivery').catch(() => null), [load]);
    const uploadPayment = useCallback(async (form, onProgress) => {
        try { const result = await uploadPortalFile(base + '/payments', form, { onProgress }); await load('payments'); return result; }
        catch (error) { if ([401, 403, 410].includes(error.status)) onExpired(error); throw error; }
    }, [base, load, onExpired]);
    const file = useCallback(async (kind, entry, download = false) => {
        const id = kind === 'payments' ? entry.proofId || entry.id || entry.fileId : entry.id || entry.fileId;
        try {
            const access = await portalRequest(`${base}/${kind === 'payments' ? 'payments' : 'delivery-documents'}/${encodeURIComponent(id)}/access`, { method: 'POST', body: { download } });
            if (download) await downloadPortalFile(access, { fileName: entry.fileName });
            return access;
        } catch (error) {
            if ([401, 403, 410].includes(error.status)) onExpired(error);
            else if (error.status === 404) void load(kind).catch(() => {});
            throw error;
        }
    }, [base, load, onExpired]);
    const accessPayment = useCallback(entry => file('payments', entry), [file]);
    const downloadPayment = useCallback(entry => file('payments', entry, true), [file]);
    const accessDelivery = useCallback(entry => file('delivery', entry), [file]);
    const downloadDelivery = useCallback(entry => file('delivery', entry, true), [file]);
    const refreshAll = useCallback(() => Promise.all([load('payments'), load('delivery')]), [load]);
    return { payments: payments?.key === base ? payments : null, delivery: delivery?.key === base ? delivery : null,
        refreshPayments, refreshDelivery, uploadPayment, accessPayment, downloadPayment, accessDelivery, downloadDelivery, refreshAll };
}
