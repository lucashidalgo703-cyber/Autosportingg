"use client";
import { useState } from 'react';
import CrmButton from '../ui/CrmButton';
import styles from './StockNegotiationPanel.module.css';

export default function StockNegotiationRuleEditor({ rule, inheritedRule, vehicleTitle, onSave, onRemove, onCancel }) {
    const initial = rule || inheritedRule;
    const [mode, setMode] = useState(initial?.mode || 'amount');
    const [value, setValue] = useState(initial?.value === null || initial?.value === undefined ? '' : String(initial.value));
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const save = async event => {
        event.preventDefault(); if (busy) return;
        const numeric = Number(value.replace(',', '.'));
        if (value.trim() === '' || !Number.isFinite(numeric) || numeric < 0) { setError('Ingresá un mínimo válido, mayor o igual a cero.'); return; }
        setBusy(true); setError('');
        try { await onSave({ mode, value: numeric }); }
        catch (err) { setError(err.message || 'No se pudo guardar el mínimo. Volvé a intentar.'); }
        finally { setBusy(false); }
    };
    const remove = async () => {
        if (busy || !onRemove) return;
        setBusy(true); setError('');
        try { await onRemove(); }
        catch (err) { setError(err.message || 'No se pudo restablecer el mínimo general.'); }
        finally { setBusy(false); }
    };
    return <form className={styles.ruleForm} onSubmit={save} aria-label={vehicleTitle ? `Mínimo de ${vehicleTitle}` : 'Ganancia mínima general'} data-negotiation-rule-editor>
        <h3>{vehicleTitle ? 'Excepción de esta unidad' : 'Ganancia mínima general'}</h3>
        {vehicleTitle && <p className={styles.muted}>{vehicleTitle}. Esta regla tiene prioridad sobre el mínimo general.</p>}
        <p className={styles.muted}>Ganancia mínima de la operación después de descontar costo total y comisión. La participación de AutoSporting se muestra por separado según el acuerdo registrado.</p>
        <fieldset className={styles.ruleFields} disabled={busy}>
            <label>Tipo de mínimo<select aria-label="Tipo de mínimo" value={mode} onChange={event => setMode(event.target.value)} className={styles.input}><option value="amount">Importe fijo en pesos argentinos</option><option value="percent">Porcentaje sobre el costo total invertido</option></select></label>
            <label>{mode === 'percent' ? 'Porcentaje mínimo (%)' : 'Ganancia mínima (ARS)'}<input aria-label={mode === 'percent' ? 'Porcentaje mínimo (%)' : 'Ganancia mínima (ARS)'} className={styles.input} type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" value={value} onChange={event => setValue(event.target.value)} placeholder={mode === 'percent' ? 'Ej. 10' : 'Ej. 1500000'} required /></label>
        </fieldset>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}><CrmButton type="submit" disabled={busy}>{busy ? 'Guardando…' : vehicleTitle ? 'Guardar excepción' : 'Guardar mínimo general'}</CrmButton>{onRemove && rule && <CrmButton type="button" variant="secondary" disabled={busy} onClick={() => { void remove(); }}>Usar mínimo general</CrmButton>}<CrmButton type="button" variant="ghost" disabled={busy} onClick={onCancel}>Cancelar</CrmButton></div>
    </form>;
}
