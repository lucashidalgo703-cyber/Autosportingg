"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Eye, FileText, Loader2, Pencil, Plus, RefreshCw, Search, Upload, XCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { canReadVehicleInvoices, canWriteVehicleInvoices } from '../../../utils/adminPermissions';
import CrmButton from '../../../components/crm/ui/CrmButton';
import CrmInput from '../../../components/crm/ui/CrmInput';
import CrmModal from '../../../components/crm/ui/CrmModal';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';
import CrmPagination from '../../../components/crm/ui/CrmPagination';
import PrivateDocumentViewer from '../../../components/buyer-portal/PrivateDocumentViewer';
import InvoiceFormModal, { InvoiceAttachmentModal, InvoiceField } from '../../../components/crm/invoices/InvoiceFormModal';
import { downloadInvoiceFile, invoiceDate, invoiceFileAccess, invoiceId, invoiceMoney, invoiceMoment, invoiceNumber, invoiceRequest, unwrapInvoice, vehicleName } from '../../../components/crm/invoices/invoiceClient';

const listClass = 'xl:grid-cols-[1.1fr_1.2fr_.65fr_.8fr_.8fr_1.5fr]';
function Status({ entry }) {
    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${entry.status === 'annulled' ? 'border-crm-border bg-crm-bg text-crm-fg-muted' : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'}`}>{entry.status === 'annulled' ? 'Registro anulado' : 'Registrada'}</span>;
}
function Detail({ label, children }) { return <div className="min-w-0"><p className="mb-1 text-[10px] font-bold uppercase text-crm-fg-muted xl:hidden">{label}</p>{children}</div>; }

function InvoiceFileViewer({ entry, opener, onClose }) {
    const requestAccess = useCallback(() => invoiceFileAccess(entry), [entry]);
    return <PrivateDocumentViewer entry={{ id: entry.file.id, mimeType: entry.file.mimeType, fileName: entry.file.fileName, description: invoiceNumber(entry) }} requestAccess={requestAccess} onClose={onClose} opener={opener} fileBasePath="/api/vehicle-invoice-files/"/>;
}

function AnnulInvoiceModal({ entry, onClose, onSaved }) {
    const [reason, setReason] = useState(''), [saving, setSaving] = useState(false), [error, setError] = useState('');
    const busy = useRef(false), key = useRef(null);
    const close = () => { if (!busy.current) onClose(); };
    const submit = async event => {
        event.preventDefault(); if (busy.current || !reason.trim()) return;
        busy.current = true; setSaving(true); setError('');
        key.current ||= crypto.randomUUID();
        try { onSaved(unwrapInvoice(await invoiceRequest('/' + encodeURIComponent(invoiceId(entry)), { method: 'PATCH', body: { revision: entry.revision, status: 'annulled', reason: reason.trim() }, key: key.current }))); }
        catch (cause) { setError(cause.message || 'No se pudo anular el registro. Actualizá y reintentá.'); }
        finally { busy.current = false; setSaving(false); }
    };
    return <CrmModal isOpen onClose={close} hideCloseButton={saving} title="Anular registro" footer={<div className="flex flex-wrap justify-end gap-2"><CrmButton type="button" variant="ghost" onClick={close} disabled={saving}>Volver</CrmButton><CrmButton type="submit" form="annul-invoice-form" disabled={saving || !reason.trim()}>{saving ? 'Guardando…' : 'Confirmar anulación'}</CrmButton></div>}>
        <form id="annul-invoice-form" onSubmit={submit} className="space-y-4 p-4 sm:p-5"><div className="rounded-xl border border-crm-border bg-crm-bg p-3"><p className="text-sm font-bold text-crm-fg">{invoiceNumber(entry)}</p><p className="mt-1 break-words text-sm text-crm-fg-muted">{vehicleName(entry.vehicle)} · {entry.vehicle?.plate || 'Sin dominio'}</p><p className="mt-1 text-sm text-crm-fg-muted">{entry.partyName} · {invoiceMoney(entry.totalAmount, entry.currency)}</p></div><p className="text-sm text-crm-fg-muted">El registro quedará identificado como anulado y conservará su historial en el CRM.</p><InvoiceField id="invoice-annul-reason" label="Motivo de anulación del registro"><textarea id="invoice-annul-reason" value={reason} onChange={event => { key.current = null; setReason(event.target.value); }} disabled={saving} required maxLength={2000} rows={3} className="w-full rounded-lg border border-crm-border bg-crm-bg p-3 text-base text-crm-fg outline-none focus:ring-2 focus:ring-crm-red/30 md:text-sm"/></InvoiceField>{error && <p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}</form>
    </CrmModal>;
}

export default function FacturacionPage() {
    const { user, loading } = useAuth();
    if (loading) return <p role="status" className="text-sm text-crm-fg-muted">Verificando acceso…</p>;
    if (!canReadVehicleInvoices(user)) return <div className="rounded-xl border border-crm-border bg-crm-surface p-5 text-sm text-crm-fg"><h1 className="text-xl font-bold">Facturación / ARCA</h1><p className="mt-2 text-crm-fg-muted">No tenés permiso para acceder a esta sección.</p></div>;
    return <InvoiceRegister canWrite={canWriteVehicleInvoices(user)}/>;
}

function InvoiceRegister({ canWrite }) {
    const [direction, setDirection] = useState('sale'), [search, setSearch] = useState(''), [query, setQuery] = useState(''), [status, setStatus] = useState('active'), [page, setPage] = useState(1);
    const [result, setResult] = useState({ items: [], total: 0, pages: 1 }), [loading, setLoading] = useState(true), [error, setError] = useState(''), [generation, setGeneration] = useState(0);
    const [modal, setModal] = useState(null), [viewing, setViewing] = useState(null), [notice, setNotice] = useState(''), [downloadId, setDownloadId] = useState('');
    const downloadBusy = useRef(false), opener = useRef(null);
    useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350); return () => clearTimeout(timer); }, [search]);
    useEffect(() => {
        const controller = new AbortController(); let active = true;
        setLoading(true); setError('');
        const params = new URLSearchParams({ direction, search: query, status, page: String(page), limit: '20' });
        invoiceRequest('?' + params, { signal: controller.signal }).then(value => { if (active) setResult(value); })
            .catch(cause => { if (active && cause.name !== 'AbortError') setError(cause.message); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; controller.abort(); };
    }, [direction, query, status, page, generation]);
    const refresh = () => setGeneration(value => value + 1);
    const saved = entry => { setModal(null); setNotice(entry.status === 'annulled' ? 'Registro anulado. Podés consultarlo en el filtro de registros anulados.' : entry.file ? 'Factura y archivo guardados.' : 'Factura registrada. Podés adjuntar el archivo desde su registro.'); refresh(); };
    const registered = () => { setNotice('La factura quedó registrada. Se está completando la carga del archivo.'); refresh(); };
    const download = async entry => {
        if (downloadBusy.current) return; downloadBusy.current = true; setDownloadId(invoiceId(entry)); setError('');
        try { await downloadInvoiceFile(entry); }
        catch (cause) { setError(cause.message); }
        finally { downloadBusy.current = false; setDownloadId(''); }
    };
    const view = (entry, event) => { opener.current = event.currentTarget; setViewing(entry); };
    const closeViewer = useCallback(() => setViewing(null), []);
    const items = Array.isArray(result.items) ? result.items : [];
    return <div className="min-w-0 space-y-5 p-4 md:p-6">
        <CrmPageHeader title="Facturación / ARCA" subtitle="Registro de facturas emitidas y recibidas." actions={canWrite ? <CrmButton type="button" onClick={() => setModal({ type: 'create' })}><Plus size={17}/>Registrar factura</CrmButton> : undefined}/>
        <div className="flex flex-wrap gap-2" aria-label="Tipo de operación">{[['sale', 'Emitidas · Ventas'], ['purchase', 'Recibidas · Compras']].map(([value, label]) => <CrmButton type="button" key={value} variant={direction === value ? 'primary' : 'secondary'} aria-pressed={direction === value} onClick={() => { setDirection(value); setPage(1); }}>{label}</CrmButton>)}</div>
        <section className="flex flex-col gap-3 rounded-xl border border-crm-border bg-crm-surface p-4 md:flex-row md:items-end" aria-label="Filtros de facturas">
            <div className="min-w-0 flex-1"><label htmlFor="invoice-search" className="mb-1.5 block text-xs font-bold text-crm-fg-muted">Buscar factura o vehículo</label><div className="relative"><Search size={17} className="absolute left-3 top-2.5 text-crm-fg-muted"/><CrmInput id="invoice-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Factura, marca, modelo, dominio o contraparte" className="pl-9"/></div></div>
            <div><label htmlFor="invoice-status-filter" className="mb-1.5 block text-xs font-bold text-crm-fg-muted">Estado del registro</label><select id="invoice-status-filter" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="h-9 w-full rounded-lg border border-crm-border bg-crm-bg px-3 text-base text-crm-fg md:w-48 md:text-sm"><option value="active">Registradas</option><option value="annulled">Registros anulados</option></select></div>
            <CrmButton type="button" variant="secondary" disabled={loading} onClick={refresh}><RefreshCw size={16} className={loading ? 'animate-spin' : undefined}/>Actualizar</CrmButton>
        </section>
        <p className="text-xs text-crm-fg-muted">Cada comprobante queda vinculado a la operación y al vehículo seleccionado, con su importe y moneda originales.</p>
        {notice && <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-crm-fg" role="status">{notice}</div>}
        {error && <div className="space-y-2 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-300" role="alert"><p>{error}</p><CrmButton type="button" variant="secondary" onClick={refresh}>Reintentar consulta</CrmButton></div>}
        {loading && <p role="status" className="flex items-center gap-2 text-sm text-crm-fg-muted"><Loader2 size={17} className="animate-spin"/>Cargando facturas…</p>}
        {!loading && !error && !items.length && <div className="rounded-xl border border-crm-border bg-crm-surface p-8 text-center"><FileText size={30} className="mx-auto mb-3 text-crm-fg-muted"/><p className="text-sm font-bold text-crm-fg">No hay facturas para esta vista.</p><p className="mt-1 text-xs text-crm-fg-muted">{search ? 'Probá con otra búsqueda.' : 'Podés registrar un comprobante y adjuntar su PDF o imagen.'}</p></div>}
        {items.length > 0 && <section className={loading ? 'space-y-3 opacity-60' : 'space-y-3'} aria-label="Facturas registradas">
            <div className={`hidden gap-4 px-4 text-[10px] font-bold uppercase tracking-wide text-crm-fg-muted xl:grid ${listClass}`}><span>Factura / contraparte</span><span>Vehículo / dominio</span><span>Fecha</span><span>Importe</span><span>Estado / archivo</span><span>Acciones</span></div>
            {items.map(entry => <article key={invoiceId(entry)} data-invoice-id={invoiceId(entry)} className={`grid grid-cols-1 gap-4 rounded-xl border border-crm-border bg-crm-surface p-4 sm:grid-cols-2 xl:items-center ${listClass}`}>
                <Detail label="Factura / contraparte"><h2 className="break-words text-sm font-bold text-crm-fg">{invoiceNumber(entry)}</h2><p className="mt-1 break-words text-xs text-crm-fg-muted">{entry.partyName || 'Sin contraparte'}</p>{entry.partyTaxId && <p className="mt-1 break-words text-xs text-crm-fg-muted">CUIT / ID: {entry.partyTaxId}</p>}</Detail>
                <Detail label="Vehículo / dominio"><p className="break-words text-sm font-semibold text-crm-fg">{vehicleName(entry.vehicle)}</p><p className="mt-1 text-xs font-bold uppercase text-crm-fg-muted">{entry.vehicle?.plate || 'Sin dominio'}</p></Detail>
                <Detail label="Fecha"><p className="text-sm text-crm-fg">{invoiceDate(entry.invoiceDate)}</p></Detail>
                <Detail label="Importe"><p className="break-words text-sm font-bold text-crm-fg">{invoiceMoney(entry.totalAmount, entry.currency)}</p></Detail>
                <Detail label="Estado / archivo"><Status entry={entry}/><p className="mt-2 break-words text-xs text-crm-fg-muted">{entry.file ? entry.file.mimeType === 'application/pdf' ? 'PDF adjunto' : 'Imagen adjunta' : 'Archivo pendiente'}</p>{entry.file && <><p className="mt-1 truncate text-[11px] text-crm-fg-muted" title={entry.file.fileName}>{entry.file.fileName}</p><p className="mt-1 text-[11px] text-crm-fg-muted">Cargado: {invoiceMoment(entry.file.uploadedAt)}</p></>}{entry.status === 'annulled' && entry.annulmentReason && <p className="mt-1 break-words text-xs text-crm-fg-muted">{entry.annulmentReason}</p>}</Detail>
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-1">
                    {entry.file && entry.status === 'active' && <><CrmButton type="button" variant="secondary" size="sm" onClick={event => view(entry, event)}><Eye size={15}/>Ver factura</CrmButton><CrmButton type="button" variant="secondary" size="sm" onClick={() => { void download(entry); }} disabled={Boolean(downloadId)}><Download size={15}/>{downloadId === invoiceId(entry) ? 'Descargando…' : 'Descargar'}</CrmButton></>}
                    {canWrite && entry.status === 'active' && <><CrmButton type="button" variant="secondary" size="sm" onClick={() => setModal({ type: 'file', entry })}><Upload size={15}/>{entry.file ? 'Reemplazar archivo' : 'Adjuntar factura'}</CrmButton><CrmButton type="button" variant="ghost" size="sm" onClick={() => setModal({ type: 'edit', entry })}><Pencil size={14}/>Editar factura</CrmButton><CrmButton type="button" variant="ghost" size="sm" onClick={() => setModal({ type: 'annul', entry })}><XCircle size={14}/>Anular registro</CrmButton></>}
                </div>
                {(entry.authorizationCode || entry.notes) && <p className="whitespace-pre-wrap break-words border-t border-crm-border pt-2 text-xs text-crm-fg-muted sm:col-span-2 xl:col-span-6">{entry.authorizationCode && <span>CAE / autorización: {entry.authorizationCode}{entry.authorizationDueDate ? ' · Vence: ' + invoiceDate(entry.authorizationDueDate) : ''}{entry.notes ? ' · ' : ''}</span>}{entry.notes}</p>}
            </article>)}
        </section>}
        <CrmPagination currentPage={result.page || page} totalPages={result.pages || 1} totalItems={result.total || 0} onPageChange={setPage} limit={20} disabled={loading}/>
        {modal?.type === 'create' && <InvoiceFormModal direction={direction} onClose={() => setModal(null)} onSaved={saved} onRegistered={registered}/>}
        {modal?.type === 'edit' && <InvoiceFormModal entry={modal.entry} direction={modal.entry.direction} onClose={() => setModal(null)} onSaved={saved}/>}
        {modal?.type === 'file' && <InvoiceAttachmentModal entry={modal.entry} onClose={() => setModal(null)} onSaved={saved}/>}
        {modal?.type === 'annul' && <AnnulInvoiceModal entry={modal.entry} onClose={() => setModal(null)} onSaved={saved}/>}
        {viewing && <InvoiceFileViewer entry={viewing} onClose={closeViewer} opener={opener.current}/>}
    </div>;
}
