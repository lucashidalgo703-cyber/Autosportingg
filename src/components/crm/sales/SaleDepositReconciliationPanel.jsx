import React, { useEffect, useRef, useState } from 'react';
import CrmSelect from '../ui/CrmSelect';
import CrmButton from '../ui/CrmButton';
import { useAuth } from '../../../context/AuthContext';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { PERMISSIONS, hasPermission } from '../../../utils/adminPermissions';
import SaleDocumentsPanel from './SaleDocumentsPanel';
export default function SaleDepositReconciliationPanel({ sale, onUpdated }) {
    const { user, token } = useAuth(); const { salesRequest } = useAdminSales();
    const session = useRef(token); session.current = token;
    const [state, setState] = useState({ token, saleId: sale._id, transactions: [], error: '', selected: {}, busy: '' });
    const visible = state.token === token && state.saleId === sale._id ? state : { transactions: [], error: '', selected: {}, busy: '' };
    const allowed = hasPermission(user, PERMISSIONS.VENTAS_WRITE) && hasPermission(user, PERMISSIONS.CAJA_WRITE) && hasPermission(user, PERMISSIONS.FINANZAS_WRITE);
    const canRead = hasPermission(user, PERMISSIONS.FINANZAS_READ);
    useEffect(() => {
        setState({ token, saleId: sale._id, transactions: [], error: '', selected: {}, busy: '' });
        if (!canRead) return;
        let cancelled = false; const controller = new AbortController();
        salesRequest(`/api/admin/transactions?saleId=${sale._id}`, { signal: controller.signal }).then(rows => { if (!cancelled) setState(previous => ({ ...previous, transactions: Array.isArray(rows) ? rows : rows.transactions || [] })); }).catch(error => { if (!cancelled && error.name !== 'AbortError') setState(previous => ({ ...previous, error: error.message })); });
        return () => { cancelled = true; controller.abort(); };
    }, [token, sale._id, canRead, salesRequest]);
    const confirm = async row => {
        const captured = token; setState(previous => ({ ...previous, busy: row._id, error: '' }));
        try {
            const updated = await salesRequest(`/api/admin/sales/${sale._id}/deposit-records/${row._id}/confirm`, { method: 'PATCH', body: JSON.stringify({ transactionId: visible.selected[row._id] }) });
            if (session.current === captured) onUpdated?.(updated);
        } catch (error) { if (error.name !== 'AbortError' && session.current === captured) setState(previous => ({ ...previous, error: error.message })); }
        finally { if (session.current === captured) setState(previous => ({ ...previous, busy: '' })); }
    };
    if (!sale.depositRecords?.length) return null;
    return <section className="space-y-3"><h3 className="m-0 text-[11px] font-semibold uppercase tracking-wider text-crm-fg-muted">Señas · conciliación de cobros</h3><p className="m-0 text-xs leading-5 text-crm-fg-muted">Conciliar vincula un ingreso ya registrado; no vuelve a cobrar. El importe, moneda y caja deben coincidir. Las señas declaradas pendientes no cuentan como cobros.</p>{visible.error && <p role="alert" className="text-xs text-red-300">{visible.error}</p>}
        {sale.depositRecords.map(row => {
            const matches = visible.transactions.filter(tx => tx.type === 'Ingreso' && tx.status === 'activo' && tx.currency === row.currency && Number(tx.amount) === Number(row.amount) && (!tx.saleDepositRecordId || String(tx.saleDepositRecordId) === row._id) && (!row.accountId || String(tx.accountId?._id || tx.accountId) === String(row.accountId?._id || row.accountId)));
            return <div key={row._id} className="space-y-3 rounded-[10px] border border-crm-border p-3"><div className="flex justify-between gap-3 text-xs"><strong>{row.currency} {Number(row.amount).toLocaleString('es-AR')}</strong><span className={row.status === 'confirmada' ? 'text-emerald-300' : 'text-amber-300'}>{row.status}</span></div>
                {row.status === 'pendiente' && allowed && canRead && <div className="space-y-2"><CrmSelect aria-label={`Ingreso para conciliar seña ${row.currency} ${row.amount}`} value={visible.selected[row._id] || ''} onChange={event => { const value = event.target.value; setState(previous => ({ ...previous, selected: { ...previous.selected, [row._id]: value } })); }}><option value="">Seleccionar ingreso registrado</option>{matches.map(tx => <option value={tx._id} key={tx._id}>{tx.description || tx.concept || 'Ingreso'} · {tx.currency} {tx.amount} · {new Date(tx.date).toLocaleDateString('es-AR')}</option>)}</CrmSelect><CrmButton size="sm" variant="secondary" disabled={Boolean(visible.busy) || !visible.selected[row._id]} onClick={() => confirm(row)}>{visible.busy === row._id ? 'Conciliando…' : 'Conciliar ingreso existente'}</CrmButton>{!matches.length && <p className="m-0 text-xs text-crm-fg-muted">Sin ingresos coincidentes. Registrá el cobro por Tesorería o Caja y actualizá la ficha.</p>}</div>}
                <details><summary className="cursor-pointer text-xs text-crm-fg-muted">Comprobante</summary><SaleDocumentsPanel saleId={sale._id} scope={{ slot: 'deposit_receipt', depositId: row._id }} /></details>
            </div>;
        })}</section>;
}
