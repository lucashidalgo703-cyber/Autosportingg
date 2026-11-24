"use client";
import { useState, useMemo } from 'react';
import CrmButton from '../ui/CrmButton';
import styles from './StockNegotiationPanel.module.css';

const formatCurrency = (val, currency = 'ARS') => {
    if (!Number.isFinite(val)) return '—';
    const formatted = Math.round(val).toLocaleString('es-AR');
    return `${currency === 'ARS' ? '$' : currency + ' '} ${formatted}`;
};

export default function StockNegotiationRuleEditor({ row, rule, inheritedRule, vehicleTitle, onSave, onRemove, onCancel }) {
    const initial = rule || inheritedRule;
    const [mode, setMode] = useState(initial?.mode || 'amount');
    const [value, setValue] = useState(initial?.value === null || initial?.value === undefined ? '' : String(initial.value));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const totalCost = Number(row?.totalCost) || 0;
    const currency = row?.currency || 'ARS';
    const commissionPercent = Number(row?.commission?.effectivePercent) || 0;
    const commissionFixed = Number(row?.commission?.fixedAmount) || 0;
    const hasCost = totalCost > 0;

    // Cálculo en vivo de la proyección
    const projection = useMemo(() => {
        if (!hasCost) return null;

        const cleanVal = String(value).trim().replace(/\./g, '').replace(',', '.');
        const numericVal = Number(cleanVal);
        if (!Number.isFinite(numericVal) || numericVal <= 0) return null;

        // 1. Ganancia neta deseada
        const targetProfit = mode === 'percent'
            ? Math.round(totalCost * (numericVal / 100))
            : Math.round(numericVal);

        if (targetProfit <= 0) return null;

        // 2. Factor de comisión: si comisión es 1.5%, factor = 1 - 0.015 = 0.985
        const commissionFactor = 1 - (commissionPercent / 100);
        if (commissionFactor <= 0) return null;

        // 3. Precio piso resultante que cubre costo + comisión + ganancia neta deseada
        // Precio = (Costo + ComisionFija + GananciaDeseada) / (1 - ComisionPct)
        const estimatedPrice = Math.ceil((totalCost + commissionFixed + targetProfit) / commissionFactor);

        // 4. Comisión que se descontará de ese precio
        const estimatedCommission = Math.round((estimatedPrice * (commissionPercent / 100)) + commissionFixed);

        // 5. Ganancia neta resultante que le queda a la operación
        const netProfit = estimatedPrice - totalCost - estimatedCommission;

        // 6. Participación AutoSporting si es compartido
        const isShared = Boolean(row?.ownership?.shared);
        const agencyPercent = Number(row?.ownership?.agencyPercent) || 100;
        const agencyProfit = isShared ? Math.round(netProfit * (agencyPercent / 100)) : netProfit;

        return {
            targetProfit,
            estimatedPrice,
            estimatedCommission,
            netProfit,
            isShared,
            agencyPercent,
            agencyProfit
        };
    }, [hasCost, totalCost, commissionPercent, commissionFixed, value, mode, row?.ownership]);

    const save = async event => {
        event.preventDefault();
        if (busy) return;
        const cleanVal = String(value).trim().replace(/\./g, '').replace(',', '.');
        const numeric = Number(cleanVal);
        if (value.trim() === '' || !Number.isFinite(numeric) || numeric < 0) {
            setError('Ingresá un mínimo válido, mayor o igual a cero.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            await onSave({ mode, value: numeric });
        } catch (err) {
            setError(err.message || 'No se pudo guardar el mínimo. Volvé a intentar.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (busy || !onRemove) return;
        setBusy(true);
        setError('');
        try {
            await onRemove();
        } catch (err) {
            setError(err.message || 'No se pudo restablecer el mínimo general.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <form
            className={styles.ruleForm}
            onSubmit={save}
            aria-label={vehicleTitle ? `Mínimo de ${vehicleTitle}` : 'Ganancia mínima general'}
            data-negotiation-rule-editor
        >
            <h3>{vehicleTitle ? 'Excepción de esta unidad' : 'Ganancia mínima general'}</h3>
            {vehicleTitle && <p className={styles.muted}>{vehicleTitle}. Esta regla tiene prioridad sobre el mínimo general.</p>}
            <p className={styles.muted}>
                Ganancia mínima de la operación después de descontar costo total y comisión. Al cargar tu ganancia neta deseada, el sistema calcula automáticamente el precio piso necesario ya con la comisión descontada.
            </p>

            <fieldset className={styles.ruleFields} disabled={busy}>
                <label>
                    Tipo de mínimo
                    <select
                        aria-label="Tipo de mínimo"
                        value={mode}
                        onChange={event => setMode(event.target.value)}
                        className={styles.input}
                    >
                        <option value="amount">Importe fijo en pesos argentinos</option>
                        <option value="percent">Porcentaje sobre el costo total invertido</option>
                    </select>
                </label>
                <label>
                    {mode === 'percent' ? 'Porcentaje mínimo deseado (%)' : 'Ganancia mínima deseada (ARS)'}
                    <input
                        aria-label={mode === 'percent' ? 'Porcentaje mínimo deseado (%)' : 'Ganancia mínima deseada (ARS)'}
                        className={styles.input}
                        type="text"
                        inputMode="decimal"
                        value={value}
                        onChange={event => setValue(event.target.value)}
                        placeholder={mode === 'percent' ? 'Ej. 10' : 'Ej. 1850000'}
                        required
                    />
                </label>
            </fieldset>

            {/* Proyección en vivo del precio y ganancia neta con comisión descontada */}
            {projection && (
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-white space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-emerald-500/20">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                            Precio de venta resultante (Piso a cobrar)
                        </span>
                        <span className="text-xl font-black text-emerald-300">
                            {formatCurrency(projection.estimatedPrice, currency)}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-[11px] text-crm-fg-muted block">Costo total cubierto:</span>
                            <span className="font-semibold text-white">{formatCurrency(totalCost, currency)}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-[11px] text-amber-300/90 block">Comisión a descontar:</span>
                            <span className="font-semibold text-amber-300">
                                {formatCurrency(projection.estimatedCommission, currency)}
                                {commissionPercent > 0 ? ` (${commissionPercent}%)` : ' (0%)'}
                            </span>
                        </div>
                        <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-[11px] text-emerald-400 block">Tu ganancia neta limpia:</span>
                            <span className="font-bold text-emerald-400">
                                {formatCurrency(projection.netProfit, currency)}
                            </span>
                        </div>
                    </div>

                    {projection.isShared && (
                        <div className="text-[11px] text-emerald-300/80 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                            Acuerdo compartido: AutoSporting participa con el {projection.agencyPercent}% ({formatCurrency(projection.agencyProfit, currency)}).
                        </div>
                    )}
                </div>
            )}

            {error && <p className={styles.error} role="alert">{error}</p>}

            <div className={styles.actions}>
                <CrmButton type="submit" disabled={busy}>
                    {busy ? 'Guardando…' : vehicleTitle ? 'Guardar excepción' : 'Guardar mínimo general'}
                </CrmButton>
                {onRemove && rule && (
                    <CrmButton type="button" variant="secondary" disabled={busy} onClick={() => { void remove(); }}>
                        Usar mínimo general
                    </CrmButton>
                )}
                <CrmButton type="button" variant="ghost" disabled={busy} onClick={onCancel}>
                    Cancelar
                </CrmButton>
            </div>
        </form>
    );
}
