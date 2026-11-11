"use client";
import toast from 'react-hot-toast';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Plus, ShieldAlert } from 'lucide-react';
import { useAdminSales } from '../../../hooks/useAdminSales';
import SalesFilters from '../../../components/crm/sales/SalesFilters';
import SalesTable from '../../../components/crm/sales/SalesTable';
import SaleMobileCards from '../../../components/crm/sales/SaleMobileCards';
import SaleDetailDrawer from '../../../components/crm/sales/SaleDetailDrawer';
import SaleCreateModal from '../../../components/crm/sales/SaleCreateModal';
import FinanceDocumentModal from '../../../components/crm/finance/FinanceDocumentModal';
import CrmButton from '../../../components/crm/ui/CrmButton';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { formatSaleDate } from '../../../utils/saleCalendarDate';
import { getSaleBuyer } from '../../../utils/salePresentation';
import { SALE_FILTER_DEFAULTS, SALE_PAYMENT_LABELS, readSalesFilters, writeSalesFilters, salesWorkbenchQuery, salePdfValues } from '../../../utils/salesWorkbench';
const empty = { sales: [], total: 0, page: 1, pages: 1, sellerCounts: [], statusCounts: {}, summary: { opCount: 0, computableCount: 0, totals: { ARS: 0, USD: 0 } }, header: { total: 0, active: 0, closed: 0 } };
export default function VentasPage() {
    const { fetchSalesWorkspace, deleteSale, salesRequest } = useAdminSales();
    const { token, user } = useAuth(); const session = useRef(token); session.current = token;
    const revision = useRef(0), pending = useRef(null);
    const [selected, setSelected] = useState(null), [editing, setEditing] = useState(undefined), [confirm, setConfirm] = useState(null), [pdf, setPdf] = useState(null);
    const [documentLoading, setDocumentLoading] = useState(false), [exporting, setExporting] = useState(false), [ready, setReady] = useState(false), [page, setPage] = useState(1);
    const [filters, setFilterState] = useState({ ...SALE_FILTER_DEFAULTS });
    const [state, setState] = useState({ token, query: '', data: empty, loading: true, loaded: false, error: '' });
    const setFilters = useCallback(next => { setPage(1); setFilterState(previous => typeof next === 'function' ? next(previous) : next); }, []);
    const query = salesWorkbenchQuery(filters, { page }).toString();
    const current = state.token === token && state.query === query;
    const data = current ? state.data : empty, loading = !current || state.loading, countsReady = current && state.loaded, error = current ? state.error : '';
    const canWrite = hasPermission(user, PERMISSIONS.VENTAS_WRITE), canExport = hasPermission(user, PERMISSIONS.REPORTES_EXPORT) || hasPermission(user, PERMISSIONS.EXPORTS_READ);
    const load = useCallback(async () => {
        if (!token || !ready) return null;
        const version = ++revision.current, controller = new AbortController(); pending.current?.abort(); pending.current = controller;
        const key = salesWorkbenchQuery(filters, { page }).toString();
        setState(previous => ({ token, query: key, data: previous.token === token && previous.query === key ? previous.data : empty, loading: true, loaded: previous.token === token && previous.query === key && previous.loaded, error: '' }));
        try {
            const result = await fetchSalesWorkspace(filters, { page, signal: controller.signal });
            if (session.current === token && version === revision.current) setState({ token, query: key, data: result, loading: false, loaded: true, error: '' });
            return result;
        } catch (err) {
            if (session.current === token && version === revision.current && err.name !== 'AbortError') setState({ token, query: key, data: empty, loading: false, loaded: false, error: err.message });
            return null;
        }
    }, [token, ready, filters, page, fetchSalesWorkspace]);
    useEffect(() => { setSelected(null); setEditing(undefined); setConfirm(null); setPdf(null); setExporting(false); }, [token]);
    useEffect(() => { const read = () => { setFilters(readSalesFilters(window.location.search)); setReady(true); }; read(); window.addEventListener('popstate', read); return () => window.removeEventListener('popstate', read); }, [setFilters]);
    useEffect(() => { if (ready) window.history.replaceState(null, '', writeSalesFilters(filters)); }, [filters, ready]);
    useEffect(() => { const timer = setTimeout(load, 150); return () => { clearTimeout(timer); revision.current++; pending.current?.abort(); }; }, [load]);
    const view = sale => { if (sale.status === 'borrador' && canWrite) setEditing(sale); else setSelected(sale); };
    const edit = sale => { setSelected(null); setEditing(sale); };
    const remove = async () => { if (!confirm) return; try { await deleteSale(confirm._id); setConfirm(null); setSelected(null); await load(); } catch (err) { if (err.name !== 'AbortError') toast.error(err.message); } };
    const openDocument = async (sale, kind) => { if (documentLoading) return; const captured = token; setDocumentLoading(true); try { const fresh = await salesRequest(`/api/admin/sales/${sale._id}`); if (session.current === captured) setPdf({ sale: fresh, kind }); } catch (err) { if (err.name !== 'AbortError' && session.current === captured) toast.error(err.message); } finally { if (session.current === captured) setDocumentLoading(false); } };
    const exportRows = async () => {
        if (exporting) return; const captured = token; setExporting(true);
        try {
            const result = await fetchSalesWorkspace(filters, { exportAll: true, limit: 100 }); if (session.current !== captured) return;
            const headers = ['Fecha', 'Vehículo', 'Patente', 'Comprador', 'DNI', 'Teléfono', 'Vendedor', 'Precio', 'Moneda', 'Método', 'Estado', 'Comisión %', 'Liquidada'];
            const rows = result.sales.map(sale => { const buyer = getSaleBuyer(sale); return [formatSaleDate(sale), `${sale.vehicleId?.brand || ''} ${sale.vehicleId?.name || ''}`.trim(), sale.vehicleId?.plateOrVin || '', buyer.name, buyer.dni, buyer.phone, sale.salesperson || '', sale.salePrice, sale.saleCurrency, SALE_PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod, sale.cancellationKind === 'caida' ? 'caida' : sale.status, sale.commissionSettings?.sellerPct ?? 1, sale.commissionSettlement?.settled ? 'Sí' : 'No']; });
            const escape = value => { const text = String(value ?? ''); return '"' + (/^[=+\-@\t\r]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"'; };
            const url = URL.createObjectURL(new Blob(['\uFEFF' + [headers, ...rows].map(row => row.map(escape).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
            const link = document.createElement('a'); link.href = url; link.download = 'AutoSporting-ventas.csv'; link.click(); URL.revokeObjectURL(url);
        } catch (err) { if (session.current === captured && err.name !== 'AbortError') toast.error(err.message); }
        finally { if (session.current === captured) setExporting(false); }
    };
    const sort = field => setFilters(previous => ({ ...previous, sort: field, direction: previous.sort === field && previous.direction === 'asc' ? 'desc' : 'asc' }));
    return <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 p-4 pb-24 md:pb-4">
        <CrmPageHeader title="Ventas" subtitle={countsReady ? `${data.header.total} operaciones · ${data.header.active} en curso · ${data.header.closed} cerradas` : 'Consultando operaciones…'} actions={<>{canExport && <CrmButton variant="secondary" size="sm" onClick={exportRows} disabled={!countsReady || !data.total || exporting}><Download size={14} />{exporting ? 'Exportando…' : 'Exportar'}</CrmButton>}{canWrite && <CrmButton size="sm" onClick={() => setEditing(null)}><Plus size={14} />Nueva venta</CrmButton>}</>} />
        {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200"><ShieldAlert size={16} />{error}</div>}
        <SalesFilters filters={filters} setFilters={setFilters} onRefresh={load} loading={loading} sellers={data.sellerCounts} statusCounts={data.statusCounts} countsReady={countsReady} />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-crm-border bg-crm-surface px-4 py-3 text-sm"><span className="text-crm-fg-muted">Precios computables <strong className="text-crm-fg">{countsReady ? `${data.summary.computableCount}/${data.summary.opCount}` : '…'}</strong> operaciones</span>{['ARS', 'USD'].map(currency => <span key={currency} className="font-semibold">{currency} {countsReady ? data.summary.totals[currency].toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '—'}</span>)}</div>
        <p className="-mt-3 mb-0 text-[11px] leading-5 text-crm-fg-muted">Precios pactados válidos de las operaciones filtradas antes de paginar; no son cobros ni saldo de Caja. Borradores y canceladas se cuentan como operaciones y sus precios no se suman. El orden por precio agrupa ARS y USD sin convertir monedas.</p>
        {loading && <p role="status" className="m-0 text-xs text-crm-fg-muted">Actualizando ventas y conteos…</p>}
        {!(loading && !countsReady) && <><div className="hidden lg:block"><SalesTable sales={data.sales} onViewDetail={view} onDeleteSale={setConfirm} onDocument={openDocument} sort={filters.sort} direction={filters.direction} onSort={sort} /></div><div className="lg:hidden"><label className="mb-3 block text-xs text-crm-fg-muted">Ordenar<select className="ml-2 h-9 rounded-lg border border-crm-border bg-crm-bg px-2" value={filters.sort} onChange={event => sort(event.target.value)}>{[['date', 'Fecha'], ['vehicle', 'Vehículo'], ['buyer', 'Comprador'], ['seller', 'Vendedor'], ['price', 'Precio por moneda'], ['status', 'Status']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" className="ml-2 underline" onClick={() => setFilters(previous => ({ ...previous, direction: previous.direction === 'asc' ? 'desc' : 'asc' }))}>{filters.direction === 'asc' ? 'Ascendente' : 'Descendente'}</button></label><SaleMobileCards sales={data.sales} onViewDetail={view} onDeleteSale={setConfirm} /></div><div className="flex items-center justify-between text-xs text-crm-fg-muted"><span>{data.total} operaciones con estos filtros</span><div className="flex items-center gap-3"><CrmButton size="sm" variant="secondary" disabled={loading || data.page <= 1} onClick={() => setPage(data.page - 1)}>Anterior</CrmButton>{data.page} / {data.pages}<CrmButton size="sm" variant="secondary" disabled={loading || data.page >= data.pages} onClick={() => setPage(data.page + 1)}>Siguiente</CrmButton></div></div></>}
        {editing !== undefined && <SaleCreateModal isOpen initialSale={editing} onClose={() => setEditing(undefined)} onSuccess={load} />}
        {selected && <SaleDetailDrawer isOpen sale={selected} onClose={() => setSelected(null)} onEdit={edit} onDelete={setConfirm} onUpdated={load} />}
        {pdf && <FinanceDocumentModal isOpen documentKind={pdf.kind} initialValues={salePdfValues(pdf.sale)} onClose={() => setPdf(null)} />}
        <ConfirmModal isOpen={Boolean(confirm)} onClose={() => setConfirm(null)} onConfirm={remove} title="Eliminar venta cancelada" message="Se eliminará la venta cancelada. Conservá las operaciones vinculadas y su trazabilidad antes de continuar." confirmText="Eliminar" isDestructive />
    </div>;
}
