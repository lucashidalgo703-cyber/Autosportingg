"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, CheckCircle2, FilePlus2, Save, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import ClientOcrControl from '../clients/ClientOcrControl';
import { addExpedienteDays, DOC_STATUS_OPTIONS, expedienteToday } from '../../../utils/expedienteWorkspace';
import { expedienteFileMatches } from '../../../utils/expedienteDocuments';
import { ExpedienteFilesList, useExpedienteFiles } from './ExpedienteDocumentFiles';

const control = 'mt-1 h-9 w-full min-w-0 rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg outline-none focus:border-crm-red disabled:opacity-60';
const button = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-crm-border px-3 py-2 text-xs text-crm-fg hover:bg-crm-surface-raised disabled:cursor-not-allowed disabled:opacity-40';
const fields = ['fullName', 'dniCuit', 'phone', 'email', 'birthDate', 'occupation'];
const labels = { fullName: 'Nombre completo', dniCuit: 'DNI', phone: 'Teléfono', email: 'Email', birthDate: 'Fecha de nacimiento', occupation: 'Ocupación / profesión' };
const normalizeParty = value => Object.fromEntries(fields.map(name => [name, name === 'birthDate' ? String(value?.[name] || '').slice(0, 10) : String(value?.[name] || '')]));
const normalizeDocument = value => ({ status: value?.status || 'pendiente', issueDate: String(value?.issueDate || '').slice(0, 10), notes: String(value?.notes || '') });
const signature = value => JSON.stringify(value);
const dateLabel = day => day ? day.split('-').reverse().join('/') : 'Sin fecha';
const errorMessage = error => error?.message || 'No se pudo guardar el cambio. Tus datos siguen en el formulario.';

function DocumentRow({ saleId, party, document, version, capabilities, store, onSave, onChanged, onDirtyChange, onBusyChange }) {
    const [values, setValues] = useState(() => normalizeDocument(document));
    const [baseline, setBaseline] = useState(() => signature(normalizeDocument(document)));
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [fileDirty, setFileDirty] = useState(false), [fileBusy, setFileBusy] = useState(false);
    const incoming = signature(normalizeDocument(document));
    const seen = useRef(incoming), dirtyRef = useRef(false), editVersion = useRef(version), mounted = useRef(true), callbacks = useRef({ onDirtyChange, onBusyChange });
    callbacks.current = { onDirtyChange, onBusyChange };
    const dirty = signature(values) !== baseline; dirtyRef.current = dirty;
    const canWrite = Boolean(capabilities.canWriteDocuments && onSave);
    useEffect(() => {
        if (seen.current === incoming) return;
        seen.current = incoming;
        if (!dirtyRef.current) { const next = normalizeDocument(document); setValues(next); setBaseline(signature(next)); editVersion.current = version; }
    }, [incoming, document, version]);
    useEffect(() => { callbacks.current.onDirtyChange?.(dirty || fileDirty || busy); callbacks.current.onBusyChange?.(busy || fileBusy); }, [dirty, fileDirty, busy, fileBusy]);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; callbacks.current.onDirtyChange?.(false); callbacks.current.onBusyChange?.(false); }; }, []);
    const change = (name, value) => {
        if (!dirtyRef.current) editVersion.current = version;
        setValues(previous => ({ ...previous, [name]: value })); setError(''); setMessage('');
    };
    const discard = () => { const next = normalizeDocument(document); setValues(next); setBaseline(signature(next)); editVersion.current = version; setError(''); setMessage(''); };
    const save = async event => {
        event.preventDefault(); if (busy || !canWrite || !dirty) return;
        const submitted = { ...values }; setBusy(true); setError(''); setMessage('');
        try {
            const saved = await onSave(document.key, { ...submitted, issueDate: submitted.issueDate || null, expectedVersion: editVersion.current });
            if (!mounted.current) return;
            const updated = saved?.documents?.[party]?.find(item => item.key === document.key);
            const next = updated ? normalizeDocument(updated) : submitted;
            setValues(next); setBaseline(signature(next)); editVersion.current = saved?.version ?? version; setMessage('Estado documental guardado.');
        } catch (failure) { if (mounted.current) setError(errorMessage(failure)); }
        finally { if (mounted.current) setBusy(false); }
    };
    const dueDate = values.issueDate && document.validityDays ? addExpedienteDays(values.issueDate, document.validityDays) : null;
    const expired = Boolean(values.status === 'recibido' && dueDate && dueDate < expedienteToday());
    const statusLabel = DOC_STATUS_OPTIONS.find(option => option.value === values.status)?.label || values.status;
    const tone = expired ? 'border-red-500/35 bg-red-500/5 text-red-300' : values.status === 'recibido' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : values.status === 'no_aplica' ? 'border-blue-500/30 bg-blue-500/5 text-blue-300' : values.status === 'agencia' ? 'border-amber-500/30 bg-amber-500/5 text-amber-200' : 'border-crm-border text-crm-fg-muted';
    const id = 'exp-doc-' + saleId + '-' + party + '-' + document.key;
    return <article className="space-y-3 rounded-xl border border-crm-border p-3 sm:p-4" aria-label={document.label}>
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h4 className="m-0 text-sm font-semibold">{document.label}{document.required === false && <span className="ml-2 text-[10px] font-normal text-crm-fg-muted">Opcional</span>}</h4>{document.validityDays > 0 && <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-crm-fg-muted"><CalendarDays size={11}/>Seguimiento interno · {document.validityDays} días</span>}</div><span className={'rounded-full border px-2 py-1 text-[10px] ' + tone}>{expired ? 'Seguimiento vencido' : statusLabel}</span></div>
        <form onSubmit={save} className="space-y-3">
            <div className="grid items-start gap-3 sm:grid-cols-2"><label htmlFor={id + '-status'} className="block text-xs text-crm-fg-muted">Estado<select id={id + '-status'} className={control} value={values.status} disabled={!canWrite || busy} onChange={event => change('status', event.target.value)}>{DOC_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{(document.validityDays > 0 || values.issueDate) && <label htmlFor={id + '-issue'} className="block text-xs text-crm-fg-muted">Fecha de emisión<input id={id + '-issue'} type="date" className={control} value={values.issueDate} disabled={!canWrite || busy} onChange={event => change('issueDate', event.target.value)}/>{dueDate && <span className={'mt-1 block text-[10px] ' + (expired ? 'text-red-300' : 'text-crm-fg-muted')}>Revisar actualización: {dateLabel(dueDate)}</span>}</label>}</div>
            <details className="rounded-lg border border-crm-border px-3 py-2"><summary className="cursor-pointer text-xs text-crm-fg-muted">Observaciones del documento</summary>{!document.validityDays && <label htmlFor={id + '-optional-issue'} className="mt-3 block text-xs text-crm-fg-muted">Fecha de emisión (opcional)<input id={id + '-optional-issue'} type="date" className={control} value={values.issueDate} disabled={!canWrite || busy} onChange={event => change('issueDate', event.target.value)}/></label>}<label htmlFor={id + '-notes'} className="mt-3 block text-xs text-crm-fg-muted">Notas<textarea id={id + '-notes'} rows={2} maxLength={5000} className={control + ' h-auto py-2'} value={values.notes} disabled={!canWrite || busy} onChange={event => change('notes', event.target.value)}/></label></details>
            {error && <p role="alert" className="m-0 text-xs text-red-300">{error}</p>}{message && <p role="status" className="m-0 text-xs text-emerald-300">{message}</p>}
            {dirty && canWrite && <div className="flex flex-wrap gap-2"><button type="submit" className={button + ' !border-crm-red !bg-crm-red !text-white'} disabled={busy}><Save size={13}/>{busy ? 'Guardando…' : 'Guardar documento'}</button><button type="button" className={button} onClick={discard} disabled={busy}>Descartar cambios</button></div>}
        </form>
        <ExpedienteFilesList saleId={saleId} party={party} documentKey={document.key} label={document.label} documents={store.documents.filter(file => expedienteFileMatches(file, party, document.key))} loading={store.loading} error={store.error} canRead={Boolean(capabilities.canReadDocuments)} canWrite={Boolean(capabilities.canWriteDocuments)} onReload={store.reload} onChanged={onChanged} onDirtyChange={setFileDirty} onBusyChange={setFileBusy}/>
    </article>;
}

export default function ExpedientePartyPanel(props) {
    const { token } = useAuth();
    return <PartySession key={'expediente-party:' + (token || 'sin-sesion') + ':' + props.saleId + ':' + props.party} {...props}/>;
}

function PartySession({ saleId, party, snapshot = {}, checklist = [], version, capabilities = {}, onSaveParty, onSaveDocument, onAddDocument, onChanged, onDirtyChange, onBusyChange }) {
    const [values, setValues] = useState(() => normalizeParty(snapshot));
    const [baseline, setBaseline] = useState(() => signature(normalizeParty(snapshot)));
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [childDirty, setChildDirty] = useState({}), [childBusy, setChildBusy] = useState({});
    const [adding, setAdding] = useState(false), [newLabel, setNewLabel] = useState(''), [newRequired, setNewRequired] = useState(true), [addingBusy, setAddingBusy] = useState(false), [addingError, setAddingError] = useState('');
    const incoming = signature(normalizeParty(snapshot)), seen = useRef(incoming), editVersion = useRef(version), addVersion = useRef(version), mounted = useRef(true), dirtyRef = useRef(false), callbacks = useRef({ onDirtyChange, onBusyChange });
    callbacks.current = { onDirtyChange, onBusyChange };
    const dirty = signature(values) !== baseline; dirtyRef.current = dirty;
    const anyDirty = dirty || Object.values(childDirty).some(Boolean) || Boolean(newLabel.trim()) || busy || addingBusy;
    const canWrite = Boolean(capabilities.canWrite && onSaveParty), canAdd = Boolean(capabilities.canWriteDocuments && onAddDocument);
    const seller = party === 'seller', partyName = seller ? 'vendedora' : 'compradora';
    const sourceKey = 'party:' + saleId + ':' + party;
    const store = useExpedienteFiles(saleId, Boolean(capabilities.canReadDocuments));
    useEffect(() => {
        if (seen.current === incoming) return;
        seen.current = incoming;
        if (!dirtyRef.current) { const next = normalizeParty(snapshot); setValues(next); setBaseline(signature(next)); editVersion.current = version; }
    }, [incoming, snapshot, version]);
    const anyBusy = busy || addingBusy || Object.values(childBusy).some(Boolean);
    useEffect(() => { callbacks.current.onDirtyChange?.(anyDirty, sourceKey); callbacks.current.onBusyChange?.(anyBusy, sourceKey); }, [anyDirty, anyBusy, sourceKey]);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; callbacks.current.onDirtyChange?.(false, sourceKey); callbacks.current.onBusyChange?.(false, sourceKey); }; }, [sourceKey]);
    const change = (name, value) => { if (!dirtyRef.current) editVersion.current = version; setValues(previous => ({ ...previous, [name]: value })); setError(''); setMessage(''); };
    const applyOcr = patch => { if (!canWrite || busy) return; if (!dirtyRef.current) editVersion.current = version; setValues(previous => ({ ...previous, ...Object.fromEntries(fields.filter(name => Object.hasOwn(patch, name)).map(name => [name, patch[name] || ''])) })); setMessage('Campos revisados aplicados. Guardá esta parte para conservarlos.'); };
    const discard = () => { const next = normalizeParty(snapshot); setValues(next); setBaseline(signature(next)); editVersion.current = version; setError(''); setMessage(''); };
    const save = async event => {
        event.preventDefault(); if (!canWrite || busy || !dirty) return;
        const submitted = { ...values }; setBusy(true); setError(''); setMessage('');
        try {
            const saved = await onSaveParty({ ...submitted, birthDate: submitted.birthDate || null, expectedVersion: editVersion.current });
            if (!mounted.current) return;
            const next = normalizeParty(saved?.parties?.[party] || submitted); setValues(next); setBaseline(signature(next)); editVersion.current = saved?.version ?? version;
            setMessage('Datos de la parte ' + partyName + ' guardados en el expediente.');
        } catch (failure) { if (mounted.current) setError(errorMessage(failure)); }
        finally { if (mounted.current) setBusy(false); }
    };
    const addDocument = async event => {
        event.preventDefault(); if (!canAdd || addingBusy || !newLabel.trim()) return;
        setAddingBusy(true); setAddingError('');
        try { await onAddDocument(newLabel.trim(), { expectedVersion: addVersion.current, required: newRequired }); if (!mounted.current) return; setNewLabel(''); setNewRequired(true); setAdding(false); }
        catch (failure) { if (mounted.current) setAddingError(errorMessage(failure)); }
        finally { if (mounted.current) setAddingBusy(false); }
    };
    const setDocumentDirty = (key, value) => setChildDirty(previous => previous[key] === value ? previous : { ...previous, [key]: value });
    const setDocumentBusy = (key, value) => setChildBusy(previous => previous[key] === value ? previous : { ...previous, [key]: value });
    const today = expedienteToday(), required = checklist.filter(row => row.required !== false), completed = required.filter(row => row.status === 'no_aplica' || row.status === 'recibido' && !(row.dueDate && row.dueDate < today)).length;
    return <section className="space-y-5" aria-label={'Parte ' + partyName}>
        <div className="rounded-xl border border-crm-border p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2.5"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-crm-surface-raised text-sm font-bold">{seller ? 'V' : 'C'}</span><h3 className="m-0 text-sm font-semibold">Datos de la Parte {seller ? 'Vendedora' : 'Compradora'}</h3></div>{snapshot.clientId && capabilities.canReadClients && <Link className="inline-flex items-center gap-1 text-xs text-blue-300 hover:underline" href={'/admin/clientes/' + encodeURIComponent(String(snapshot.clientId))} target="_blank" rel="noopener noreferrer">Ver ficha del cliente<ArrowUpRight size={13}/></Link>}</div>
            <p className="mb-4 mt-0 text-xs leading-5 text-crm-fg-muted">Los datos se guardan en este expediente. La ficha vinculada del CRM conserva sus propios datos.</p>
            {canWrite && <div className="mb-4"><ClientOcrControl recordKey={'expediente:' + saleId + ':' + party} disabled={busy} compactButton allowedFields={fields} summaryLabel={'Escanear DNI del ' + (seller ? 'vendedor' : 'comprador') + ' (autocompletar)'} onApply={applyOcr}/></div>}
            <form onSubmit={save} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">{fields.map(name => { const id = 'exp-party-' + saleId + '-' + party + '-' + name; return <label key={name} htmlFor={id} className="block min-w-0 text-xs text-crm-fg-muted">{labels[name]}<input id={id} className={control} type={name === 'birthDate' ? 'date' : name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text'} value={values[name]} onChange={event => change(name, event.target.value)} disabled={!canWrite || busy} autoComplete="off" maxLength={name === 'email' ? 320 : name === 'fullName' ? 300 : name === 'occupation' ? 300 : 100}/></label>; })}</div>
                {error && <p role="alert" className="m-0 rounded-lg border border-red-500/30 p-3 text-xs text-red-300">{error}</p>}{message && <p role="status" className="m-0 text-xs text-crm-fg-muted">{message}</p>}
                {dirty && Number.isInteger(editVersion.current) && editVersion.current !== version && <p className="m-0 text-xs text-amber-200">El expediente tiene una actualización más reciente. Tus cambios siguen en el formulario; podés descartarlos para cargar los datos actuales.</p>}
                {canWrite && <div className="flex flex-wrap items-center gap-2"><button type="submit" disabled={busy || !dirty} className={button + ' !border-crm-red !bg-crm-red !text-white'}><Save size={14}/>{busy ? 'Guardando…' : 'Guardar parte ' + partyName}</button>{dirty && <button type="button" onClick={discard} disabled={busy} className={button}>Descartar cambios de esta parte</button>}<span className="text-[10px] text-crm-fg-muted">{dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes'}</span></div>}
            </form>
        </div>
        <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-sm font-semibold">Documentación requerida</h3><span className="inline-flex items-center gap-1 text-xs text-crm-fg-muted"><CheckCircle2 size={13}/>{completed}/{required.length}</span></div><progress aria-label={'Documentación de la parte ' + partyName} className="h-1.5 w-full accent-crm-red" max={required.length || 1} value={completed}/><p className="m-0 text-xs leading-5 text-crm-fg-muted">Recibido y No aplica completan el control. Lo saca la agencia sigue pendiente. Las fechas sirven para el seguimiento interno de los papeles.</p>
            {checklist.map(document => <DocumentRow key={'doc:' + party + ':' + document.key} saleId={saleId} party={party} document={document} version={version} capabilities={capabilities} store={store} onSave={onSaveDocument} onChanged={onChanged} onDirtyChange={value => setDocumentDirty(document.key, value)} onBusyChange={value => setDocumentBusy(document.key, value)}/>)}
            {!checklist.length && <p className="m-0 rounded-lg border border-dashed border-crm-border p-4 text-xs text-crm-fg-muted">No hay documentos definidos para esta parte.</p>}
            {canAdd && !adding && <button type="button" className={button} onClick={() => { addVersion.current = version; setNewRequired(true); setAdding(true); setAddingError(''); }}><FilePlus2 size={14}/>Agregar documento</button>}
            {canAdd && adding && <form onSubmit={addDocument} className="space-y-3 rounded-xl border border-crm-border p-4"><label className="block text-xs text-crm-fg-muted" htmlFor={'exp-new-document-' + party}>Nombre del documento<input id={'exp-new-document-' + party} className={control} maxLength={180} value={newLabel} disabled={addingBusy} onChange={event => { if (!newLabel.trim()) addVersion.current = version; setNewLabel(event.target.value); }}/></label><label className="flex items-center gap-2 text-xs text-crm-fg-muted"><input type="checkbox" checked={newRequired} disabled={addingBusy} onChange={event => setNewRequired(event.target.checked)} className="accent-crm-red"/>Requerido para completar documentación</label>{addingError && <p role="alert" className="m-0 text-xs text-red-300">{addingError}</p>}<div className="flex flex-wrap gap-2"><button type="submit" className={button + ' !border-crm-red !bg-crm-red !text-white'} disabled={addingBusy || !newLabel.trim()}><FilePlus2 size={13}/>{addingBusy ? 'Agregando…' : 'Agregar documento'}</button><button type="button" className={button} disabled={addingBusy} onClick={() => { setAdding(false); setNewLabel(''); setNewRequired(true); setAddingError(''); }}><X size={13}/>Cancelar</button></div></form>}
        </section>
    </section>;
}
