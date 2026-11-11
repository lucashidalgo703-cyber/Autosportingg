"use client";
import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Mail, MessageCircle, Pencil, Phone, Trash2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { CLIENT_PIPELINE_STAGES, clientContactCalendarKey, effectiveClientContacted, getClientPipelineStage } from '../../../utils/clientCommercial';
import { normalizePhoneToWhatsApp } from '../../../utils/phoneNormalizer';

const sourceLabels = { web: 'Web', whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', referido: 'Referido', local: 'Local', mercadolibre: 'Mercado Libre', otro: 'Otro' };
const relationLabels = { comprador: 'Comprador', vendedor: 'Vendedor', ambos: 'Comprador y vendedor', potencial: 'Potencial' };
const buttonClass = 'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red';
const formatContactDate = value => { const key = clientContactCalendarKey(value); return key ? key.split('-').reverse().join('/') : 'Sin registrar'; };
const monthKey = client => clientContactCalendarKey(client.lastContactDate).slice(0, 7) || 'sin_fecha';
const monthLabel = key => key === 'sin_fecha' ? 'Sin fecha de contacto' : new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}-15T12:00:00Z`));
const clientName = client => client.fullName || [client.firstName, client.lastName].filter(Boolean).join(' ') || 'Cliente sin nombre';

function SortHeading({ label, field, sort, onSort }) {
    const active = sort === field || sort === `${field}_desc`;
    const descending = sort === `${field}_desc`;
    const Icon = active ? descending ? ArrowDown : ArrowUp : ArrowUpDown;
    return <th scope="col" aria-sort={active ? descending ? 'descending' : 'ascending' : 'none'} className="px-3 py-2 font-medium"><button type="button" disabled={!onSort} onClick={() => onSort?.(active && !descending ? `${field}_desc` : field)} className="inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap text-xs text-crm-fg-muted hover:text-crm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red disabled:opacity-70">{label}<Icon size={12} aria-hidden="true" /></button></th>;
}

function Contact({ client }) {
    const phone = typeof client.phone === 'string' ? client.phone : '';
    const whatsapp = phone && /\d/.test(phone) ? normalizePhoneToWhatsApp(phone).replace(/\D/g, '') : '';
    return <div className="space-y-1.5 text-xs text-crm-fg-muted">
        {client.email && (client.doNotContact ? <span className="flex max-w-52 items-center gap-1.5"><Mail size={12} className="shrink-0" /><span className="truncate">{client.email}</span></span> : <a href={`mailto:${encodeURIComponent(client.email)}`} className="flex max-w-52 items-center gap-1.5 text-inherit no-underline hover:text-crm-fg"><Mail size={12} className="shrink-0" /><span className="truncate">{client.email}</span></a>)}
        {phone && <div className="flex flex-wrap items-center gap-2">{client.doNotContact ? <span className="inline-flex items-center gap-1.5"><Phone size={12} />{phone}</span> : <><a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 text-inherit no-underline hover:text-crm-fg"><Phone size={12} />{phone}</a>{whatsapp.length >= 7 && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp de ${clientName(client)}`} className="inline-flex min-h-7 items-center gap-1 text-emerald-400 no-underline hover:text-emerald-300"><MessageCircle size={13} />WA</a>}</>}</div>}
        {!client.email && !phone && <span>Sin datos de contacto</span>}
        {client.doNotContact && <span className="block text-[10px] font-medium text-crm-red">No contactar</span>}
    </div>;
}

function Interest({ client, canReadStock }) {
    const vehicle = client.interestedVehicleId;
    const vehicleId = typeof vehicle === 'object' ? vehicle?._id : vehicle;
    const text = [vehicle?.brand, vehicle?.name, vehicle?.year].filter(Boolean).join(' ') || client.vehicleOfInterest || client.description || [client.brand, client.model].filter(Boolean).join(' ') || (vehicleId ? 'Vehículo vinculado' : 'Interés por definir');
    return vehicleId && canReadStock ? <Link href={`/admin/stock/${encodeURIComponent(String(vehicleId))}`} className="line-clamp-2 text-xs text-crm-fg no-underline hover:text-crm-red">{text}</Link> : <span className="line-clamp-2 text-xs text-crm-fg-muted">{text}</span>;
}

function Actions({ client, canWrite, onMarkContact, onResetContact, onEdit, onDelete }) {
    if (!canWrite) return <span className="text-xs text-crm-fg-muted">Solo lectura</span>;
    return <div className="flex flex-wrap items-center gap-1">
        {effectiveClientContacted(client) && onResetContact ? <button type="button" onClick={() => onResetContact(client)} className={buttonClass}>A nuevos</button> : onMarkContact && <button type="button" onClick={() => onMarkContact(client)} className={buttonClass}><Check size={13} />Contactado</button>}
        {onEdit && <button type="button" onClick={() => onEdit(client)} className={buttonClass}><Pencil size={13} />Editar</button>}
        {onDelete && <button type="button" onClick={() => onDelete(client)} className={`${buttonClass} !text-crm-red`}><Trash2 size={13} />Eliminar</button>}
    </div>;
}

export default function ClientDetailedTable({ clients = [], onOpen, onEdit, onMarkContact, onResetContact, onDelete, canWrite = false, sort, onSort, selectedIds = [], onSelectionChange, groupByMonth = false, monthCounts = [] }) {
    const { user } = useAuth();
    const canReadStock = hasPermission(user, PERMISSIONS.STOCK_READ);
    if (!clients.length) return <div className="rounded-xl border border-dashed border-crm-border bg-crm-surface px-5 py-14 text-center"><h3 className="m-0 text-sm font-semibold text-crm-fg">Sin resultados</h3><p className="mb-0 mt-2 text-xs text-crm-fg-muted">No hay clientes para los filtros seleccionados.</p></div>;
    const nameButton = client => <button type="button" onClick={() => onOpen?.(client)} className="block max-w-full break-words text-left text-sm font-semibold leading-5 text-crm-fg hover:text-crm-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red">{clientName(client)}</button>;
    const stage = client => CLIENT_PIPELINE_STAGES.find(item => item.id === getClientPipelineStage(client))?.label || 'Etapa a revisar';
    const type = client => <div className="space-y-1"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${client.segment === 'vip' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-crm-border text-crm-fg-muted'}`}>{client.segment === 'vip' ? 'VIP' : 'Regular'}</span><span className="block text-[10px] text-crm-fg-muted">{relationLabels[client.type] || 'Relación sin informar'}</span></div>;
    const operations = client => Number.isSafeInteger(client.operationsCount) && client.operationsCount >= 0 ? client.operationsCount : '—';
    const selectionEnabled = typeof onSelectionChange === 'function';
    const groups = new Map();
    for (const client of clients) { const key = monthKey(client); groups.set(key, [...(groups.get(key) || []), client]); }
    const orderedClients = groupByMonth ? [...groups.keys()].sort((a, b) => a === 'sin_fecha' ? 1 : b === 'sin_fecha' ? -1 : b.localeCompare(a)).flatMap(key => groups.get(key)) : clients;
    const monthHeader = (client, index) => groupByMonth && (index === 0 || monthKey(orderedClients[index - 1]) !== monthKey(client));
    const monthTotal = client => monthCounts.find(item => item.key === monthKey(client))?.count ?? groups.get(monthKey(client))?.length;
    const allVisibleSelected = clients.every(client => selectedIds.includes(client._id));
    const someVisibleSelected = clients.some(client => selectedIds.includes(client._id));
    const toggleRow = (id, checked) => onSelectionChange?.(checked ? Array.from(new Set([...selectedIds, id])) : selectedIds.filter(selected => selected !== id));
    const toggleVisible = checked => {
        const visibleIds = clients.map(client => client._id);
        onSelectionChange?.(checked ? Array.from(new Set([...selectedIds, ...visibleIds])) : selectedIds.filter(id => !visibleIds.includes(id)));
    };
    const selectAll = <input type="checkbox" aria-label="Seleccionar todos los clientes visibles" aria-checked={someVisibleSelected && !allVisibleSelected ? 'mixed' : allVisibleSelected} checked={allVisibleSelected} ref={element => { if (element) element.indeterminate = someVisibleSelected && !allVisibleSelected; }} onChange={event => toggleVisible(event.target.checked)} className="h-4 w-4 shrink-0 cursor-pointer accent-crm-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red" />;
    const rowCheckbox = client => <input type="checkbox" aria-label={`Seleccionar cliente ${clientName(client)}`} checked={selectedIds.includes(client._id)} onChange={event => toggleRow(client._id, event.target.checked)} className="h-4 w-4 shrink-0 cursor-pointer accent-crm-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red" />;
    return <>
        <div className="hidden overflow-x-auto rounded-xl border border-crm-border bg-crm-surface md:block">
            <table className="w-full min-w-[1180px] border-collapse text-left">
                <thead className="border-b border-crm-border bg-crm-bg/40"><tr>
                    {selectionEnabled && <th scope="col" className="w-10 px-3 py-2 text-center">{selectAll}</th>}
                    <SortHeading label="Cliente" field="name" sort={sort} onSort={onSort} />
                    <th scope="col" className="px-3 py-2 text-xs font-medium text-crm-fg-muted">Contacto</th>
                    <SortHeading label="Tipo" field="segment" sort={sort} onSort={onSort} />
                    <SortHeading label="Origen" field="source" sort={sort} onSort={onSort} />
                    <th scope="col" className="px-3 py-2 text-xs font-medium text-crm-fg-muted">Interés</th>
                    <SortHeading label="Vendedor" field="assigned" sort={sort} onSort={onSort} />
                    <SortHeading label="Último contacto" field="lastContact" sort={sort} onSort={onSort} />
                    <th scope="col" className="px-3 py-2 text-xs font-medium text-crm-fg-muted" title="Operaciones registradas en la fuente del listado">Ops</th>
                    <th scope="col" className="px-3 py-2 text-xs font-medium text-crm-fg-muted">Acciones</th>
                </tr></thead>
                <tbody className="divide-y divide-crm-border">{orderedClients.flatMap((client,index) => [monthHeader(client,index) ? <tr key={`month-${monthKey(client)}`} className="bg-crm-bg/60"><th colSpan={selectionEnabled ? 11 : 10} className="px-3 py-2.5 text-xs font-semibold capitalize text-crm-fg">{monthLabel(monthKey(client))}<span className="ml-2 font-normal normal-case text-crm-fg-muted">{monthTotal(client)} clientes · {groups.get(monthKey(client)).length} visibles</span></th></tr> : null, <tr key={client._id} className="hover:bg-crm-surface-raised/50">
                    {selectionEnabled && <td className="px-3 py-3 text-center align-top">{rowCheckbox(client)}</td>}
                    <td className="min-w-40 max-w-64 px-3 py-3 align-top">{nameButton(client)}<span className="mt-1 block text-[10px] text-crm-fg-muted">{stage(client)}<span className={`ml-1.5 rounded px-1.5 py-0.5 ${effectiveClientContacted(client) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{effectiveClientContacted(client) ? 'Contactado' : 'Sin contactar'}</span></span></td>
                    <td className="min-w-44 px-3 py-3 align-top"><Contact client={client} /></td>
                    <td className="px-3 py-3 align-top">{type(client)}</td>
                    <td className="px-3 py-3 align-top text-xs text-crm-fg-muted">{sourceLabels[client.source] || client.source || 'Sin origen'}</td>
                    <td className="max-w-56 px-3 py-3 align-top"><Interest client={client} canReadStock={canReadStock} /></td>
                    <td className="max-w-40 px-3 py-3 align-top text-xs text-crm-fg-muted">{client.assignedTo?.name || client.assignedTo?.email || 'Sin vendedor'}</td>
                    <td className="whitespace-nowrap px-3 py-3 align-top text-xs text-crm-fg-muted">{formatContactDate(client.lastContactDate)}</td>
                    <td className="px-3 py-3 align-top text-xs text-crm-fg-muted">{operations(client)}</td>
                    <td className="min-w-52 px-3 py-3 align-top"><Actions {...{ client, canWrite, onMarkContact, onResetContact, onEdit, onDelete }} /></td>
                </tr>])}</tbody>
            </table>
        </div>
        <div className="space-y-2 md:hidden">
            {selectionEnabled && <label className="flex min-h-9 items-center gap-2 px-1 text-xs text-crm-fg-muted">{selectAll}Seleccionar clientes visibles</label>}
            {onSort && <label className="flex items-center gap-2 text-xs text-crm-fg-muted">Ordenar<select value={sort || ''} onChange={event => onSort(event.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-crm-border bg-crm-surface px-3 text-xs text-crm-fg"><option value="">Orden actual</option>{[['name', 'Cliente'], ['segment', 'Tipo'], ['source', 'Origen'], ['assigned', 'Vendedor'], ['lastContact', 'Último contacto']].flatMap(([field, label]) => [<option key={field} value={field}>{label} · ascendente</option>, <option key={`${field}_desc`} value={`${field}_desc`}>{label} · descendente</option>])}</select></label>}
            {orderedClients.map((client,index) => <article key={client._id} className="space-y-3 rounded-xl border border-crm-border bg-crm-surface p-3">
                {monthHeader(client,index) && <p className="mb-2 mt-0 border-b border-crm-border pb-2 text-xs font-semibold capitalize text-crm-fg">{monthLabel(monthKey(client))} · {monthTotal(client)}</p>}<div className="flex items-start justify-between gap-3">{selectionEnabled && <span className="flex min-h-8 items-center">{rowCheckbox(client)}</span>}<div className="min-w-0 flex-1">{nameButton(client)}<span className="mt-1 block text-[10px] text-crm-fg-muted">{stage(client)}</span></div>{type(client)}</div>
                <Contact client={client} />
                <Interest client={client} canReadStock={canReadStock} />
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-crm-fg-muted"><div><dt>Origen</dt><dd className="m-0 mt-0.5 text-crm-fg">{sourceLabels[client.source] || client.source || 'Sin origen'}</dd></div><div><dt>Vendedor</dt><dd className="m-0 mt-0.5 text-crm-fg">{client.assignedTo?.name || 'Sin vendedor'}</dd></div><div><dt>Último contacto</dt><dd className="m-0 mt-0.5 text-crm-fg">{formatContactDate(client.lastContactDate)}</dd></div><div><dt>Operaciones</dt><dd className="m-0 mt-0.5 text-crm-fg">{operations(client)}</dd></div></dl>
                <div className="border-t border-crm-border pt-2"><Actions {...{ client, canWrite, onMarkContact, onResetContact, onEdit, onDelete }} /></div>
            </article>)}
        </div>
    </>;
}
