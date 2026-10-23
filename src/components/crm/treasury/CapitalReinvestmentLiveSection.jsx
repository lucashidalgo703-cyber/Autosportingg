"use client";

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react';
import CapitalReinvestmentPanel from './CapitalReinvestmentPanel.jsx';

const formatMoney = (value, currency) => value === null || value === undefined || !Number.isFinite(Number(value))
    ? 'Pendiente de conciliación'
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value));

export default function CapitalReinvestmentLiveSection({ token, treasuryToken }) {
    const [projection, setProjection] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const loadProjection = useCallback(async () => {
        if (!token || !treasuryToken) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/admin/capital-reinversion/projection', {
                headers: { Authorization: `Bearer ${token}`, 'x-treasury-token': treasuryToken },
                cache: 'no-store'
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo obtener la proyección.');
            setProjection(payload.projection);
        } catch (loadError) {
            setError(loadError.message || 'Error al leer la proyección financiera.');
        } finally {
            setLoading(false);
        }
    }, [token, treasuryToken]);

    useEffect(() => { loadProjection(); }, [loadProjection]);

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-crm-border bg-crm-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-bold text-crm-fg">Capital y Reinversión</h2>
                    <p className="mt-1 text-xs text-crm-fg-muted">Lectura analítica de operaciones existentes; no registra ni modifica movimientos.</p>
                </div>
                <button type="button" onClick={loadProjection} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-crm-border px-3 py-2 text-sm text-crm-fg hover:bg-crm-surface-raised disabled:opacity-60">
                    {loading ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                    Actualizar lectura
                </button>
            </div>
            {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" />{error}</div>}
            {!projection && loading && <div className="rounded-2xl border border-crm-border bg-crm-surface p-8 text-center text-sm text-crm-fg-muted">Leyendo datos y validando conciliación…</div>}
            {projection?.sourceReconciliation && (
                <details className="rounded-xl border border-crm-border bg-crm-surface p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-crm-fg">Evidencia de conciliación de fuentes · no es una medida de disponibilidad</summary>
                    <p className="mt-2 text-xs text-crm-fg-muted">Corte confirmado: {projection.sourceReconciliation.lastCutoff ? new Date(projection.sourceReconciliation.lastCutoff).toLocaleString('es-AR') : 'no disponible'} · Movimientos de cuenta explicados: {projection.sourceReconciliation.accountMovementEvidence ? 'sí' : 'no'} · Configuración completada: {projection.sourceReconciliation.setupCompleted ? 'sí' : 'no'}.</p>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        {['ARS', 'USD'].map((currency) => {
                            const source = projection.sourceReconciliation.byCurrency[currency];
                            return <p key={currency} className="text-crm-fg-muted">{currency}: cuentas {formatMoney(source.accountBalance, currency)} · cajas {formatMoney(source.assignedToBoxes, currency)} · terceros {formatMoney(source.thirdPartyFunds, currency)} · no asignado {formatMoney(source.ownUnassigned, currency)} · diferencia {formatMoney(source.equationDifference, currency)}</p>;
                        })}
                    </div>
                </details>
            )}
            {projection && <CapitalReinvestmentPanel projection={projection} />}
        </section>
    );
}
