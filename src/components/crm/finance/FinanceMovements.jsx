import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Download, Layers, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { summarizeFinanceTransactions } from '../../../utils/financePresentation';

const money = (amount, currency) => `${currency || 'ARS'} ${Number(amount || 0).toLocaleString('es-AR')}`;
const inputClass = 'h-10 w-full min-w-0 rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg outline-none focus:border-crm-red';
const buttonClass = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-crm-border bg-crm-surface-raised px-3 py-2 text-xs font-semibold text-crm-fg transition hover:border-crm-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red';

export default function FinanceMovements({ filteredTransactions, totalCount, filters, movementMode, onChangeFilters, onClearFilters, onEdit, onDelete, onAssignQuota, onExport, onMonthlyClose, onTransfer, onBulkAnnul, onNew, onQuickRange, setMovementMode }) {
    const { user } = useAuth();
    const canOpenSale = hasPermission(user, PERMISSIONS.VENTAS_READ);
    const summary = summarizeFinanceTransactions(filteredTransactions);
    const advancedCount = Number(filters.paymentMethod !== 'todas') + Number(filters.status !== 'todos') + Number(filters.linkedTo !== 'todas');
    const change = (key, value) => onChangeFilters({ ...filters, [key]: value });
    const actions = tx => {
        const income = String(tx.type).toLowerCase() === 'ingreso';
        const isVoid = tx.status === 'anulado';
        return <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => onEdit(tx)} className={buttonClass} aria-label={`Editar ${tx.concept || tx.description || 'movimiento'}`}>Editar</button>
            {!isVoid && <button type="button" onClick={() => onDelete(tx)} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-crm-fg-muted hover:text-crm-red">Anular</button>}
            {!income && !isVoid && <button type="button" onClick={() => onAssignQuota?.(tx)} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-[11px] font-semibold text-purple-300" title="Asignar cuotas para cubrir este pago"><Layers size={12}/>Asignar cuota</button>}
        </div>;
    };
    const description = tx => <div className="min-w-0">
        <p className={'m-0 break-words text-sm font-semibold ' + (tx.status === 'anulado' ? 'text-crm-fg-muted line-through' : 'text-crm-fg')}>{tx.concept || tx.description || 'Sin descripción'}</p>
        {tx.notes && <p className="mb-0 mt-1 break-words text-xs leading-5 text-crm-fg-muted">{tx.notes}</p>}
        {canOpenSale && (tx.saleId?._id || typeof tx.saleId === 'string') && <Link href={'/admin/ventas/' + (tx.saleId?._id || tx.saleId)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-crm-info no-underline hover:underline">Ver operación<ArrowUpRight size={12}/></Link>}
    </div>;
    const typeBadge = tx => <div className="flex flex-wrap gap-1">
        <span className={'rounded-md border border-crm-border bg-crm-surface-raised px-2 py-1 text-[10px] font-semibold ' + (String(tx.type).toLowerCase() === 'ingreso' ? 'text-crm-success' : 'text-crm-red')}>{String(tx.type).toLowerCase() === 'ingreso' ? 'Ingreso' : 'Egreso'}</span>
        {['anulado', 'pendiente'].includes(tx.status) && <span className={'rounded-md border border-crm-border px-2 py-1 text-[10px] font-semibold ' + (tx.status === 'anulado' ? 'text-crm-fg-muted' : 'text-crm-warning')}>{tx.status === 'anulado' ? 'Anulado' : 'Pendiente'}</span>}
    </div>;
    const amount = tx => <span className={'break-words font-semibold ' + (tx.status === 'anulado' ? 'text-crm-fg-muted line-through' : String(tx.type).toLowerCase() === 'ingreso' ? 'text-crm-success' : 'text-crm-red')}>{String(tx.type).toLowerCase() === 'ingreso' ? '+' : '−'} {money(tx.amount, tx.currency)}</span>;

    return <div className="min-w-0 space-y-4">
        <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="m-0 text-base font-bold text-crm-fg">Movimientos</h2><p className="mb-0 mt-1 text-xs text-crm-fg-muted">{filteredTransactions.length} de {totalCount} registros</p></div>
                <div className="relative flex max-w-full flex-wrap gap-2">
                    <button type="button" onClick={onTransfer} className={buttonClass}>Transferencia</button>
                    <button type="button" onClick={onMonthlyClose} className={buttonClass}>Cierres mensuales</button>
                    <button type="button" onClick={onExport} className={buttonClass} title="Exportar todos los movimientos en CSV"><Download size={14}/>Exportar todo (CSV)</button>
                    <button type="button" onClick={onNew} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-crm-red px-4 py-2 text-xs font-bold text-white hover:bg-crm-red-hover"><Plus size={15}/>Registrar movimiento</button>
                    <details className="static">
                        <summary className={buttonClass + ' cursor-pointer list-none'}>Más acciones</summary>
                        <div className="absolute right-0 top-full z-20 mt-2 w-64 max-w-[calc(100vw-3rem)] rounded-xl border border-crm-border bg-crm-surface-raised p-3 shadow-xl">
                            <p className="mb-2 text-xs leading-5 text-crm-fg-muted">La anulación se aplica a los resultados visibles y requiere confirmación.</p>
                            <button type="button" onClick={onBulkAnnul} disabled={!filteredTransactions.length} className="min-h-9 w-full rounded-lg border border-crm-red px-3 py-2 text-xs font-semibold text-crm-red disabled:opacity-50">Anular resultados ({filteredTransactions.length})</button>
                        </div>
                    </details>
                </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-crm-border pt-4" aria-label="Tipo de movimiento">
                {[['todos', 'Todos'], ['ingreso', 'Ingresos'], ['egreso', 'Egresos'], ['transferencias', 'Transferencias']].map(([id, label]) => <button key={id} type="button" aria-pressed={movementMode === id} onClick={() => setMovementMode(id)} className={'inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red ' + (movementMode === id ? 'border-crm-red bg-crm-surface-raised text-crm-fg' : 'border-crm-border text-crm-fg-muted hover:bg-crm-surface-raised')}>{label}</button>)}
            </div>
            <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <label className="min-w-0 text-xs font-medium text-crm-fg-muted"><span className="mb-1.5 block">Buscar movimiento</span><span className="relative block"><Search className="absolute left-3 top-3" size={16}/><input value={filters.search} onChange={event => change('search', event.target.value)} placeholder="Concepto, descripción, categoría o notas" className={inputClass + ' pl-9'}/></span></label>
                <label className="min-w-0 text-xs font-medium text-crm-fg-muted"><span className="mb-1.5 block">Moneda</span><select value={filters.currency} onChange={event => change('currency', event.target.value)} className={inputClass}><option value="todas">ARS y USD</option><option value="ARS">Pesos (ARS)</option><option value="USD">Dólares (USD)</option></select></label>
                <label className="min-w-0 text-xs font-medium text-crm-fg-muted"><span className="mb-1.5 block">Desde</span><input type="date" value={filters.startDate} onChange={event => change('startDate', event.target.value)} className={inputClass}/></label>
                <label className="min-w-0 text-xs font-medium text-crm-fg-muted"><span className="mb-1.5 block">Hasta</span><input type="date" value={filters.endDate} onChange={event => change('endDate', event.target.value)} className={inputClass}/></label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs text-crm-fg-muted">Período:</span>
                {[['hoy', 'Hoy'], ['semana', 'Esta semana'], ['mes', 'Este mes'], ['trimestre', 'Este trimestre'], ['anio', 'Este año']].map(([id, label]) => <button key={id} type="button" onClick={() => onQuickRange(id)} className="min-h-8 rounded-lg bg-crm-surface-raised px-3 py-1 text-xs text-crm-fg-muted hover:text-crm-fg">{label}</button>)}
                <button type="button" onClick={onClearFilters} className="min-h-8 rounded-lg px-2 text-xs font-semibold text-crm-info hover:underline">Limpiar filtros</button>
            </div>
            <details className="mt-3 border-t border-crm-border pt-3" defaultOpen={advancedCount > 0}>
                <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 text-xs font-semibold text-crm-fg-muted"><SlidersHorizontal size={14}/>Más filtros{advancedCount > 0 ? ` (${advancedCount} activos)` : ''}</summary>
                <div className="mt-2 grid min-w-0 gap-3 sm:grid-cols-3">
                    <label className="min-w-0 text-xs text-crm-fg-muted"><span className="mb-1.5 block">Estado del movimiento</span><select className={inputClass} value={filters.status} onChange={event => change('status', event.target.value)}><option value="todos">Todos los estados</option><option value="activo">Activo</option><option value="pendiente">Pendiente</option><option value="anulado">Anulado</option></select></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted"><span className="mb-1.5 block">Método de pago</span><select className={inputClass} value={filters.paymentMethod} onChange={event => change('paymentMethod', event.target.value)}><option value="todas">Todos los métodos</option>{[['efectivo','Efectivo'],['transferencia','Transferencia'],['transferencia BANCO GALICIA','Transferencia Galicia'],['transferencia BANCO SANTANDER','Transferencia Santander'],['transferencia BANCO NACION','Transferencia Nación'],['tarjeta','Tarjeta'],['cheque','Cheque'],['deposito','Depósito'],['dolares','Dólares'],['mixto','Mixto'],['otro','Otro']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted"><span className="mb-1.5 block">Vinculado a</span><select className={inputClass} value={filters.linkedTo} onChange={event => change('linkedTo', event.target.value)}>{[['todas','Todos los vínculos'],['unlinked','Sin vínculo'],['sale','Venta'],['reservation','Reserva'],['client','Cliente'],['vehicle','Vehículo'],['installment','Cuota']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
                </div>
            </details>
        </section>



        {!filteredTransactions.length ? <section className="rounded-2xl border border-dashed border-crm-border bg-crm-surface p-6 text-center"><h3 className="text-sm font-bold text-crm-fg">Sin movimientos para estos filtros</h3><p className="my-2 text-xs text-crm-fg-muted">Cambiá la búsqueda o el período para ver otros registros.</p><button type="button" className={buttonClass} onClick={onClearFilters}>Limpiar filtros</button></section> : <>
            <section className="hidden min-w-0 overflow-hidden rounded-2xl border border-crm-border bg-crm-surface md:block">
                <div className="max-h-[65vh] overflow-auto custom-scrollbar"><table className="w-full min-w-[850px] table-fixed border-collapse text-left text-xs"><colgroup>{[10,25,13,7,12,15,18].map((width,index)=><col key={index} style={{width:width+'%'}}/>)}</colgroup>
                    <thead className="sticky top-0 z-10 bg-crm-surface-raised text-[10px] uppercase tracking-wider text-crm-fg-muted"><tr>{['Fecha','Descripción','Categoría','Moneda','Tipo / estado','Monto','Acciones'].map(label=><th scope="col" key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
                    <tbody className="divide-y divide-crm-border">{filteredTransactions.map(tx=><tr key={tx._id} className="align-top hover:bg-crm-surface-raised"><td className="px-3 py-3 text-crm-fg-muted">{new Date(tx.date||tx.createdAt).toLocaleDateString('es-AR')}</td><td className="px-3 py-3">{description(tx)}</td><td className="break-words px-3 py-3 text-crm-fg-muted">{tx.category || 'Sin categoría'}</td><td className="px-3 py-3 text-crm-fg-muted">{tx.currency||'ARS'}</td><td className="px-3 py-3">{typeBadge(tx)}</td><td className="px-3 py-3 text-right">{amount(tx)}</td><td className="px-3 py-3">{actions(tx)}</td></tr>)}</tbody>
                </table></div>
            </section>
            <section className="space-y-3 md:hidden" aria-label="Lista de movimientos">{filteredTransactions.map(tx=><article key={tx._id} className="min-w-0 space-y-3 rounded-2xl border border-crm-border bg-crm-surface p-4"><div className="flex flex-wrap items-center justify-between gap-2">{typeBadge(tx)}<time className="text-xs text-crm-fg-muted">{new Date(tx.date||tx.createdAt).toLocaleDateString('es-AR')}</time></div>{description(tx)}<div className="flex flex-wrap items-center justify-between gap-2"><span className="break-words text-xs text-crm-fg-muted">{tx.category||'Sin categoría'}</span>{amount(tx)}</div><div className="border-t border-crm-border pt-3">{actions(tx)}</div></article>)}</section>
        </>}
        <section className="rounded-2xl border border-crm-border bg-crm-surface p-4" aria-label="Totales de movimientos filtrados">
            <div className="grid gap-3 sm:grid-cols-2">
                {['ARS','USD'].map(currency=><div key={currency} className="min-w-0 rounded-xl border border-crm-border bg-crm-surface-raised p-3"><h3 className="m-0 text-xs font-bold text-crm-fg">{currency === 'ARS' ? 'Pesos (ARS)' : 'Dólares (USD)'}</h3><dl className="mb-0 mt-3 grid grid-cols-1 gap-2 text-xs xl:grid-cols-3">{[['Ingresos',summary[currency].income,'text-crm-success'],['Egresos',summary[currency].expense,'text-crm-red'],['Neto',summary[currency].income-summary[currency].expense,'text-crm-fg']].map(([label,value,tone])=><div key={label}><dt className="text-crm-fg-muted">{label}</dt><dd className={'m-0 mt-1 break-words font-semibold '+tone}>{money(value,currency)}</dd></div>)}</dl></div>)}
            </div>
            <p className="mb-0 mt-3 text-xs leading-5 text-crm-fg-muted">Totales de los movimientos activos filtrados. Pendientes y anulados se muestran en la lista y no se suman aquí.</p>
        </section>
    </div>;
}
