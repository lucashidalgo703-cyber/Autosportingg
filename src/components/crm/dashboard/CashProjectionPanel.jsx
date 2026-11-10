"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Landmark, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { parseResponseSafe } from '../../../utils/apiHelper';

const formatAmount = (value, currency, hideAmounts) => {
    if (hideAmounts) return `${currency} ***`;
    if (value === null || value === undefined || !Number.isFinite(value)) return `${currency} —`;
    return `${currency} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)}`;
};
const formatDate = (key) => key ? key.split('-').reverse().join('/') : 'Sin fecha';

function Amounts({ values, hideAmounts, className = '' }) {
    return <div className={className}>
        <span className="block">{formatAmount(values?.USD, 'USD', hideAmounts)}</span>
        <span className="block">{formatAmount(values?.ARS, 'ARS', hideAmounts)}</span>
    </div>;
}

export default function CashProjectionPanel({ hideAmounts = false }) {
    const { user, token } = useAuth();
    const canRead = hasPermission(user, PERMISSIONS.FINANZAS_READ) && hasPermission(user, PERMISSIONS.CAJA_READ);
    const [state, setState] = useState({ data: null, loading: true, error: null, sessionKey: null });
    const [refreshIndex, setRefreshIndex] = useState(0);
    const sessionKey = user?.id || user?._id || user?.username;

    useEffect(() => {
        if (!canRead) return;
        let disposed = false;
        let controller;
        const load = async () => {
            controller?.abort();
            controller = new AbortController();
            const currentController = controller;
            setState(previous => ({ data: previous.sessionKey === sessionKey ? previous.data : null, loading: true, error: null, sessionKey }));
            try {
                const sessionToken = token || localStorage.getItem('token');
                if (!sessionToken) throw new Error('La sesión no está disponible.');
                const response = await fetch('/api/admin/finance/cash-projection', {
                    headers: { Authorization: `Bearer ${sessionToken}` },
                    cache: 'no-store', signal: currentController.signal
                });
                const data = await parseResponseSafe(response);
                if (!Array.isArray(data?.periods) || data.periods.length !== 3 || !data.openingBalances || !data.quality || !Array.isArray(data.calendar)) {
                    throw new Error('La respuesta de caja está incompleta.');
                }
                if (!disposed && !currentController.signal.aborted) setState({ data, loading: false, error: null, sessionKey });
            } catch (error) {
                if (!disposed && !currentController.signal.aborted) {
                    setState({ data: null, loading: false, error: error.message || 'No se pudo consultar la previsión.', sessionKey });
                }
            }
        };
        load();
        const interval = setInterval(load, 60000);
        window.addEventListener('focus', load);
        return () => { disposed = true; controller?.abort(); clearInterval(interval); window.removeEventListener('focus', load); };
    }, [canRead, sessionKey, token, refreshIndex]);

    if (!canRead) return null;
    const { data, loading, error } = state.sessionKey === sessionKey ? state : { data: null, loading: true, error: null };
    const partial = data && !data.quality.complete;

    return <section aria-label="Liquidez prevista" className="rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-crm-fg"><Landmark size={17} /> Liquidez · próximos 7, 15 y 30 días</h3>
                <p className="mt-1 text-xs text-crm-fg-muted">Cuotas y movimientos pendientes registrados</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
                <Link href="/admin/finanzas?tab=cobrar-pagar" className="font-medium text-purple-400 hover:underline">Ver deudas y cobros →</Link>
                <button type="button" aria-label="Actualizar previsión de caja" onClick={() => setRefreshIndex((value) => value + 1)} disabled={loading} className="rounded-lg border border-crm-border p-2 text-crm-fg-muted hover:text-crm-fg disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
            </div>
        </div>
        {loading && !data && <p role="status" className="py-8 text-sm text-crm-fg-muted">Consultando saldos y vencimientos…</p>}
        {error && <div role="alert" className="mt-4 rounded-xl border border-red-500/30 p-4 text-sm text-red-400"><p>No se pudo consultar la previsión de caja.</p><p className="mt-1 text-xs">{error}</p><button type="button" onClick={() => setRefreshIndex((value) => value + 1)} className="mt-3 font-semibold underline">Reintentar</button></div>}
        {data && <>
            <p className="mt-4 text-xs text-crm-fg-muted">Lectura del servidor: {new Date(data.asOf).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })} · actualización automática</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-crm-fg-muted"><span>Saldo registrado en cuentas:</span><Amounts values={data.openingBalances} hideAmounts={hideAmounts} className="font-semibold text-crm-fg" /></div>
            {partial && <p role="alert" className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">Hay {data.quality.issues.length} registros para revisar. Los importes que no pueden calcularse se muestran con —; los vencimientos inválidos se separan sin fecha.</p>}
            <div className="mt-4 grid gap-3 md:grid-cols-3">
                {data.periods.map((period) => <div key={period.days} className="rounded-xl border border-crm-border p-4">
                    <h4 className="text-sm font-semibold text-crm-fg">{period.days} días</h4>
                    <p className="mt-1 text-xs text-crm-fg-muted">Hasta {formatDate(period.toDate)}, incluido hoy</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-crm-fg-muted">
                        <div>Entradas<Amounts values={period.incoming} hideAmounts={hideAmounts} className="mt-1 text-crm-fg" /></div>
                        <div>Salidas<Amounts values={period.outgoing} hideAmounts={hideAmounts} className="mt-1 text-crm-fg" /></div>
                    </div>
                    <div className="mt-4 border-t border-crm-border pt-3 text-xs text-crm-fg-muted">Saldo final previsto<Amounts values={period.closingBalances} hideAmounts={hideAmounts} className={`mt-1 text-base font-bold ${period.closingBalances.ARS < 0 || period.closingBalances.USD < 0 ? 'text-red-400' : 'text-crm-fg'}`} /></div>
                </div>)}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[['Vencidos · requieren gestión', data.overdue], ['Sin fecha de cobro o pago', data.undated]].map(([label, totals]) => <div key={label} className="rounded-xl border border-crm-border p-3">
                    <h4 className="text-xs font-semibold text-crm-fg">{label}</h4>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-crm-fg-muted"><div>A cobrar<Amounts values={totals.incoming} hideAmounts={hideAmounts} className="mt-1" /></div><div>A pagar<Amounts values={totals.outgoing} hideAmounts={hideAmounts} className="mt-1" /></div></div>
                </div>)}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-crm-fg-muted">Escenario según vencimientos registrados: no presume nuevos negocios ni recupero de vencidos. Los saldos sin fecha quedan fuera de los plazos. El saldo registrado puede incluir fondos comprometidos con terceros; no equivale a dinero libre para retirar.</p>
            <details className="mt-3 border-t border-crm-border pt-3">
                <summary className="cursor-pointer text-xs font-semibold text-crm-fg-muted">Ver calendario de importes ({data.calendar.length})</summary>
                <p className="mt-2 text-xs text-crm-fg-muted">{data.coverage.excluded}</p>
                <div className="mt-3 max-h-80 overflow-auto">
                    <table className="w-full text-left text-xs text-crm-fg-muted"><thead><tr className="border-b border-crm-border"><th scope="col" className="p-2">Vencimiento</th><th scope="col" className="p-2">Concepto</th><th scope="col" className="p-2">Importe</th></tr></thead><tbody>
                        {data.calendar.slice(0, 100).map((item, index) => <tr key={`${item.source}:${item.id || index}`} className="border-b border-crm-border/50"><td className="whitespace-nowrap p-2">{formatDate(item.dueDate)}</td><td className="p-2">{item.direction === 'incoming' ? 'A cobrar' : 'A pagar'} · {item.label}</td><td className="whitespace-nowrap p-2">{formatAmount(item.amount, item.currency, hideAmounts)}</td></tr>)}
                    </tbody></table>
                    {data.calendar.length === 0 && <p className="p-3">No hay cuotas ni movimientos pendientes registrados.</p>}
                </div>
                {data.calendar.length > 100 && <p className="mt-2 text-xs text-crm-fg-muted">Se muestran los primeros 100 registros. Los totales incluyen todos los registros válidos.</p>}
            </details>
        </>}
    </section>;
}
