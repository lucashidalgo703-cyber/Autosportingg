"use client";
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileUp, Loader2, Search } from 'lucide-react';
import CrmModal from '../ui/CrmModal';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import { createInvoice, invoiceDate, invoiceId, invoiceMoney, invoiceRequest, unwrapInvoice, uploadInvoiceFile, vehicleName } from './invoiceClient';

const selectClass = 'h-10 w-full rounded-lg border border-crm-border bg-crm-bg px-3 text-base text-crm-fg outline-none focus:ring-2 focus:ring-crm-red/30 md:text-sm';
export function InvoiceField({ id, label, children }) {
    return <div className="min-w-0 space-y-1.5"><label htmlFor={id} className="block text-xs font-bold text-crm-fg-muted">{label}</label>{children}</div>;
}
export function InvoiceFileField({ onChange, disabled, file }) {
    return <div className="space-y-2 rounded-xl border border-dashed border-crm-border bg-crm-bg p-3">
        <InvoiceField id="invoice-file" label="Archivo de la factura"><input id="invoice-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={disabled} onChange={onChange} className="block w-full text-sm text-crm-fg file:mr-2 file:rounded-lg file:border file:border-crm-border file:bg-crm-surface file:px-3 file:py-2 file:text-xs file:font-semibold file:text-crm-fg"/></InvoiceField>
        <p className="text-xs text-crm-fg-muted">PDF o imagen JPG, PNG o WebP. Máximo 3 MB.</p>
        {file && <p className="break-all text-xs text-crm-fg"><FileUp size={14} className="mr-1 inline"/>{file.name} · {(file.size / 1024).toLocaleString('es-AR', { maximumFractionDigits: 0 })} KB</p>}
    </div>;
}
export function readInvoiceFile(event) {
    const file = event.target.files?.[0];
    if (!file) return null;
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { event.target.value = ''; throw new Error('Elegí un PDF o una imagen JPG, PNG o WebP.'); }
    if (file.size <= 0 || file.size > 3 * 1024 * 1024) { event.target.value = ''; throw new Error('El archivo debe pesar hasta 3 MB y no estar vacío.'); }
    return file;
}
export function UploadProgress({ progress }) {
    return <div role="status" className="space-y-2"><p className="text-sm text-crm-fg-muted">{progress < 95 ? `Subiendo archivo: ${progress}%` : 'Confirmando recepción…'}</p><progress max="100" value={progress} aria-label="Progreso de carga" className="h-2 w-full accent-red-600"/></div>;
}
function initialValues(entry) {
    return { invoiceType: entry?.invoiceType || 'A', pointOfSale: entry?.pointOfSale || '', invoiceNumber: entry?.invoiceNumber || '',
        invoiceDate: String(entry?.invoiceDate || '').slice(0, 10), totalAmount: entry?.totalAmount ?? '', currency: entry?.currency || 'ARS',
        partyName: entry?.partyName || '', partyTaxId: entry?.partyTaxId || '', authorizationCode: entry?.authorizationCode || '',
        authorizationDueDate: String(entry?.authorizationDueDate || '').slice(0, 10), notes: entry?.notes || '' };
}

export default function InvoiceFormModal({ entry, direction, onClose, onSaved, onRegistered }) {
    const editing = Boolean(entry), [form, setForm] = useState(() => initialValues(entry));
    const [operation, setOperation] = useState(null), [search, setSearch] = useState(''), [operations, setOperations] = useState([]);
    const [opLoading, setOpLoading] = useState(!editing), [opError, setOpError] = useState(''), [opPage, setOpPage] = useState(1), [opPages, setOpPages] = useState(1), [opGeneration, setOpGeneration] = useState(0);
    const [file, setFile] = useState(null), [saving, setSaving] = useState(false), [error, setError] = useState(''), [progress, setProgress] = useState(0), [created, setCreated] = useState(null);
    const busy = useRef(false), key = useRef(null), fileKey = useRef(null);
    const close = () => { if (!busy.current) onClose(); };
    useEffect(() => {
        if (editing) return;
        const controller = new AbortController(); let active = true;
        const timeout = setTimeout(async () => {
            setOpLoading(true); setOpError('');
            try {
                const query = new URLSearchParams({ direction, search, page: String(opPage), limit: '10' });
                const result = await invoiceRequest('/operations?' + query, { signal: controller.signal });
                if (active) { setOperations(result.items || []); setOpPages(result.pages || 1); }
            } catch (cause) { if (active && cause.name !== 'AbortError') setOpError(cause.message); }
            finally { if (active) setOpLoading(false); }
        }, 250);
        return () => { active = false; clearTimeout(timeout); controller.abort(); };
    }, [direction, editing, search, opPage, opGeneration]);
    const selectOperation = value => {
        key.current = null; setOperation(value); setError('');
        setForm(previous => ({ ...previous, partyName: value.party?.name || '', partyTaxId: value.party?.taxId || value.party?.cuit || '',
            totalAmount: value.amount ?? '', currency: value.currency || 'ARS' }));
    };
    const change = event => { key.current = null; setError(''); setForm(previous => ({ ...previous, [event.target.name]: event.target.value })); };
    const chooseFile = event => { try { setFile(readInvoiceFile(event)); fileKey.current = null; setError(''); } catch (cause) { setError(cause.message); } };
    const save = async event => {
        event.preventDefault(); if (busy.current) return;
        if (!editing && !created && !operation) { setError('Seleccioná la compra o venta que corresponde a esta factura.'); return; }
        busy.current = true; setSaving(true); setError(''); setProgress(0);
        try {
            let record = created;
            if (!record) {
                const body = { ...form, totalAmount: Number(form.totalAmount) };
                if (editing) {
                    key.current ||= crypto.randomUUID();
                    record = unwrapInvoice(await invoiceRequest('/' + encodeURIComponent(invoiceId(entry)), { method: 'PATCH', body: { ...body, revision: entry.revision }, key: key.current }));
                }
                else {
                    key.current ||= crypto.randomUUID();
                    record = await createInvoice({ ...body, direction, carId: operation.carId, ...(direction === 'sale' ? { saleId: operation.saleId } : {}) }, key.current);
                    if (!invoiceId(record)) throw new Error('No pudimos confirmar el registro. Reintentá el mismo envío.');
                    setCreated(record); onRegistered?.(record);
                }
            }
            if (file) {
                fileKey.current ||= crypto.randomUUID();
                record = await uploadInvoiceFile(record, file, fileKey.current, setProgress);
            }
            onSaved(record);
        } catch (cause) { setError(cause.message || 'No se pudo guardar la factura. Reintentá.'); }
        finally { busy.current = false; setSaving(false); }
    };
    const selected = editing ? entry : operation;
    return <CrmModal isOpen onClose={close} hideCloseButton={saving} title={editing ? 'Editar factura' : 'Registrar factura'} maxWidth="max-w-3xl" footer={<div className="flex flex-wrap justify-end gap-2">
        <CrmButton type="button" variant="ghost" onClick={close} disabled={saving}>{created ? 'Cerrar y adjuntar después' : 'Cancelar'}</CrmButton>
        <CrmButton type="submit" form="vehicle-invoice-form" disabled={saving || (!editing && !created && !operation)}>{saving ? <><Loader2 size={15} className="animate-spin"/>Guardando…</> : created ? 'Reintentar adjunto' : 'Guardar factura'}</CrmButton>
    </div>}>
        <form id="vehicle-invoice-form" onSubmit={save} className="space-y-5 p-4 sm:p-5">
            {created && <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-crm-fg" role="status"><CheckCircle2 size={17} className="mr-1 inline text-emerald-400"/>Factura registrada. El archivo sigue pendiente; podés reintentar la carga en este mismo registro.</div>}
            {!editing && !created && <section className="space-y-3" aria-label="Seleccionar operación">
                <h3 className="text-sm font-bold text-crm-fg">{direction === 'sale' ? 'Venta del vehículo' : 'Compra del vehículo'}</h3>
                <InvoiceField id="invoice-operation-search" label="Buscar operación"><div className="relative"><Search size={17} className="absolute left-3 top-3 text-crm-fg-muted"/><CrmInput id="invoice-operation-search" type="search" value={search} onChange={event => { setSearch(event.target.value); setOpPage(1); }} placeholder="Marca, modelo, dominio o cliente" className="pl-9" disabled={saving}/></div></InvoiceField>
                {opLoading ? <p className="text-sm text-crm-fg-muted" role="status">Buscando operaciones…</p> : opError ? <div role="alert" className="space-y-2 text-sm text-red-300"><p>{opError}</p><CrmButton type="button" variant="secondary" onClick={() => setOpGeneration(value => value + 1)}>Reintentar operaciones</CrmButton></div> : <>
                    {!operations.length && <p className="rounded-lg border border-crm-border p-3 text-sm text-crm-fg-muted">No encontramos {direction === 'sale' ? 'ventas' : 'compras'} para esa búsqueda.</p>}
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg" aria-label="Operaciones disponibles">{operations.map(value => {
                        const selected = operation?.carId === value.carId && operation?.saleId === value.saleId;
                        return <button type="button" disabled={saving} key={value.saleId || value.carId} onClick={() => selectOperation(value)} aria-pressed={selected} className={`block w-full rounded-xl border p-3 text-left transition-colors ${selected ? 'border-crm-red bg-crm-red/10' : 'border-crm-border bg-crm-bg hover:border-crm-red/40'}`}>
                            <span className="block break-words text-sm font-bold text-crm-fg">{vehicleName(value.vehicle)} · {value.vehicle?.plate || 'Sin dominio'}</span>
                            <span className="mt-1 block break-words text-xs text-crm-fg-muted">{value.party?.name || 'Sin contraparte registrada'} · {invoiceDate(value.operationDate)} · {invoiceMoney(value.amount, value.currency)}</span>
                        </button>;
                    })}</div>
                    {opPages > 1 && <div className="flex items-center justify-between gap-2"><CrmButton type="button" variant="secondary" size="sm" disabled={opPage <= 1 || saving} onClick={() => setOpPage(value => value - 1)}>Anterior</CrmButton><span className="text-xs text-crm-fg-muted">{opPage} / {opPages}</span><CrmButton type="button" variant="secondary" size="sm" disabled={opPage >= opPages || saving} onClick={() => setOpPage(value => value + 1)}>Siguiente</CrmButton></div>}
                </>}
            </section>}
            {selected && <div className="rounded-xl border border-crm-red/25 bg-crm-red/5 p-3" data-invoice-selected-operation><p className="text-[11px] font-bold uppercase tracking-wide text-crm-fg-muted">{direction === 'sale' ? 'Factura de venta' : 'Factura de compra'}</p><p className="mt-1 break-words text-sm font-bold text-crm-fg">{vehicleName(selected.vehicle)}</p><p className="mt-1 text-sm text-crm-fg-muted">Dominio: {selected.vehicle?.plate || 'Sin informar'}</p></div>}
            <fieldset disabled={saving || Boolean(created)} className="grid grid-cols-1 gap-4 sm:grid-cols-2 disabled:opacity-70">
                <InvoiceField id="invoice-type" label="Tipo de factura"><select id="invoice-type" name="invoiceType" value={form.invoiceType} onChange={change} className={selectClass}>{['A', 'B', 'C', 'M', 'E', 'otro'].map(value => <option key={value} value={value}>{value === 'otro' ? 'Otro comprobante' : 'Factura ' + value}</option>)}</select></InvoiceField>
                <InvoiceField id="invoice-date" label="Fecha de factura"><CrmInput id="invoice-date" name="invoiceDate" type="date" value={form.invoiceDate} onChange={change} required/></InvoiceField>
                <InvoiceField id="invoice-point" label="Punto de venta"><CrmInput id="invoice-point" name="pointOfSale" inputMode="numeric" pattern="[0-9]{1,5}" maxLength={5} value={form.pointOfSale} onChange={change} placeholder="00001" required/></InvoiceField>
                <InvoiceField id="invoice-number" label="Número de factura"><CrmInput id="invoice-number" name="invoiceNumber" inputMode="numeric" pattern="[0-9]{1,8}" maxLength={8} value={form.invoiceNumber} onChange={change} placeholder="00000001" required/></InvoiceField>
                <InvoiceField id="invoice-total" label="Importe total"><CrmInput id="invoice-total" name="totalAmount" type="number" min="0.01" step="0.01" inputMode="decimal" value={form.totalAmount} onChange={change} required/></InvoiceField>
                <InvoiceField id="invoice-currency" label="Moneda"><select id="invoice-currency" name="currency" value={form.currency} onChange={change} className={selectClass}><option value="ARS">ARS · Pesos</option><option value="USD">USD · Dólares</option></select></InvoiceField>
                <InvoiceField id="invoice-party-name" label="Nombre / razón social"><CrmInput id="invoice-party-name" name="partyName" value={form.partyName} onChange={change} maxLength={250} required/></InvoiceField>
                <InvoiceField id="invoice-party-tax" label="CUIT / identificación fiscal"><CrmInput id="invoice-party-tax" name="partyTaxId" value={form.partyTaxId} onChange={change} maxLength={30}/>{direction === 'purchase' && <p className="text-[11px] font-normal text-crm-fg-muted">Completá el CUIT para identificar al emisor.</p>}</InvoiceField>
                <InvoiceField id="invoice-authorization" label="CAE / autorización (opcional)"><CrmInput id="invoice-authorization" name="authorizationCode" value={form.authorizationCode} onChange={change} maxLength={40}/></InvoiceField>
                <InvoiceField id="invoice-authorization-date" label="Vencimiento de autorización (opcional)"><CrmInput id="invoice-authorization-date" name="authorizationDueDate" type="date" value={form.authorizationDueDate} onChange={change}/></InvoiceField>
                <div className="sm:col-span-2"><InvoiceField id="invoice-notes" label="Observaciones"><textarea id="invoice-notes" name="notes" rows={3} value={form.notes} onChange={change} maxLength={4000} className={`${selectClass} h-auto py-2`}/></InvoiceField></div>
            </fieldset>
            {!editing && <InvoiceFileField onChange={chooseFile} disabled={saving} file={file}/>}
            {saving && file && <UploadProgress progress={progress}/>}
            {error && <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-300">{error}</div>}
        </form>
    </CrmModal>;
}

export function InvoiceAttachmentModal({ entry, onClose, onSaved }) {
    const [file, setFile] = useState(null), [saving, setSaving] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState('');
    const busy = useRef(false), key = useRef(null);
    const close = () => { if (!busy.current) onClose(); };
    const choose = event => { try { setFile(readInvoiceFile(event)); key.current = null; setError(''); } catch (cause) { setError(cause.message); } };
    const upload = async event => {
        event.preventDefault(); if (!file || busy.current) return;
        busy.current = true; setSaving(true); setError(''); setProgress(0); key.current ||= crypto.randomUUID();
        try { onSaved(await uploadInvoiceFile(entry, file, key.current, setProgress)); }
        catch (cause) { setError(cause.message || 'No se pudo subir la factura. Volvé a intentar.'); }
        finally { busy.current = false; setSaving(false); }
    };
    return <CrmModal isOpen onClose={close} hideCloseButton={saving} title={entry.file ? 'Reemplazar archivo' : 'Adjuntar factura'} footer={<div className="flex flex-wrap justify-end gap-2"><CrmButton type="button" variant="ghost" onClick={close} disabled={saving}>Cancelar</CrmButton><CrmButton type="submit" form="invoice-attachment-form" disabled={saving || !file}>{saving ? 'Subiendo…' : 'Subir archivo'}</CrmButton></div>}>
        <form id="invoice-attachment-form" onSubmit={upload} className="space-y-4 p-4 sm:p-5"><p className="break-words text-sm font-bold text-crm-fg">{vehicleName(entry.vehicle)} · {entry.vehicle?.plate || 'Sin dominio'}</p>{entry.file && <p className="text-sm text-crm-fg-muted">El nuevo archivo será el disponible al abrir esta factura.</p>}<InvoiceFileField onChange={choose} disabled={saving} file={file}/>{saving && <UploadProgress progress={progress}/>} {error && <p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}</form>
    </CrmModal>;
}
