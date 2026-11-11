"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileText, Paperclip, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { downloadPrivateFile } from '../../../utils/downloadPrivateFile';
import { EXPEDIENTE_DOCUMENT_MAX_BYTES, expedienteFileMatches, uploadExpedienteDocument } from '../../../utils/expedienteDocuments';

const base = () => process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const button = 'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-crm-border px-2.5 py-1.5 text-xs text-crm-fg transition hover:bg-crm-surface-raised disabled:cursor-not-allowed disabled:opacity-40';
const size = bytes => bytes < 1024 * 1024 ? Math.ceil(bytes / 1024) + ' KB' : (bytes / 1024 / 1024).toFixed(1) + ' MB';

export function useExpedienteFiles(saleId, canRead) {
    const { token } = useAuth();
    const owner = token + ':' + saleId;
    const [state, setState] = useState({ owner, documents: [], loading: true, error: '' });
    const active = useRef(owner), pending = useRef(null), generation = useRef(0);
    active.current = owner;
    const reload = useCallback(async () => {
        if (!canRead || !token || !saleId) return null;
        const captured = owner, revision = generation.current, controller = new AbortController();
        pending.current?.abort(); pending.current = controller;
        const current = () => active.current === captured && generation.current === revision && !controller.signal.aborted && localStorage.getItem('token') === token;
        setState(previous => ({ ...previous, owner: captured, loading: true, error: '' }));
        try {
            const response = await fetch(base() + '/api/admin/sales/' + encodeURIComponent(saleId) + '/documents', { headers: { Authorization: 'Bearer ' + token }, signal: controller.signal, cache: 'no-store' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || 'No se pudieron consultar los archivos del expediente.');
            if (!Array.isArray(data.documents)) throw new Error('La respuesta de documentos está incompleta.');
            if (current()) setState({ owner: captured, documents: data.documents, loading: false, error: '' });
            return current() ? data.documents : null;
        } catch (error) {
            if (current() && error.name !== 'AbortError') setState({ owner: captured, documents: [], loading: false, error: error.message });
            return null;
        }
    }, [canRead, owner, saleId, token]);
    useEffect(() => {
        generation.current++; pending.current?.abort();
        setState({ owner, documents: [], loading: Boolean(canRead), error: '' });
        if (canRead) void reload();
        return () => { generation.current++; pending.current?.abort(); };
    }, [canRead, owner, reload]);
    return { ...(state.owner === owner && canRead ? state : { owner, documents: [], loading: Boolean(canRead), error: '' }), reload };
}

export function ExpedienteFilesList({ saleId, party, documentKey, label = 'Documento', documents = [], loading = false, error = '', canRead = false, canWrite = false, onReload, onChanged, onDirtyChange, onBusyChange }) {
    const { token } = useAuth();
    const owner = token + ':' + saleId + ':' + party + ':' + documentKey;
    const sourceKey = 'attachment:' + saleId + ':' + party + ':' + documentKey;
    const [selected, setSelected] = useState([]), [busy, setBusy] = useState(''), [message, setMessage] = useState(''), [progress, setProgress] = useState(''), [showDeleted, setShowDeleted] = useState(false);
    const input = useRef(null), active = useRef(owner), generation = useRef(0), pending = useRef(null), callbacks = useRef({ onDirtyChange, onBusyChange });
    active.current = owner; callbacks.current = { onDirtyChange, onBusyChange };
    useEffect(() => {
        generation.current++; pending.current?.abort(); setSelected([]); setBusy(''); setMessage(''); setProgress(''); setShowDeleted(false);
        return () => { generation.current++; pending.current?.abort(); callbacks.current.onDirtyChange?.(false, sourceKey); callbacks.current.onBusyChange?.(false, sourceKey); };
    }, [owner, canRead, canWrite, sourceKey]);
    useEffect(() => { callbacks.current.onDirtyChange?.(selected.length > 0 || Boolean(busy), sourceKey); callbacks.current.onBusyChange?.(Boolean(busy), sourceKey); }, [selected.length, busy, sourceKey]);
    useEffect(() => {
        if (!selected.length && !busy) return;
        const warn = event => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [selected.length, busy]);
    const current = (captured, revision) => active.current === captured && generation.current === revision && localStorage.getItem('token') === token;
    const choose = event => {
        const files = Array.from(event.target.files || []); event.target.value = '';
        if (!files.length) return;
        if (files.length > 5) { setMessage('Elegí hasta 5 archivos por selección. Podés añadir más después.'); return; }
        if (files.some(file => !file.size || file.size > EXPEDIENTE_DOCUMENT_MAX_BYTES)) { setMessage('Cada archivo debe tener contenido y pesar hasta 15 MB.'); return; }
        setSelected(files); setMessage('');
    };
    const refresh = async () => { await onReload?.(); await onChanged?.(); };
    const run = async (action, document) => {
        if (busy || !canRead || (action !== 'download' && !canWrite) || (action === 'upload' && !selected.length)) return;
        const captured = owner, revision = generation.current, controller = new AbortController();
        pending.current?.abort(); pending.current = controller; setBusy(action); setMessage(''); setProgress('');
        let saved = 0;
        try {
            if (action === 'download') {
                await downloadPrivateFile({ url: base() + '/api/admin/sales/' + encodeURIComponent(saleId) + '/documents/' + encodeURIComponent(document._id), filename: document.filename, token, signal: controller.signal });
            } else if (action === 'upload') {
                for (const file of selected) {
                    await uploadExpedienteDocument({ saleId, party, documentKey, file, token, signal: controller.signal, onProgress: status => { if (current(captured, revision)) setProgress(file.name + ' · ' + status.percent + '%'); } });
                    saved++;
                }
                if (!current(captured, revision)) return;
                setSelected([]); setMessage(saved === 1 ? 'Archivo guardado.' : saved + ' archivos guardados.'); await refresh();
            } else {
                const response = await fetch(base() + '/api/admin/sales/' + encodeURIComponent(saleId) + '/documents/' + encodeURIComponent(document._id), {
                    method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ deleted: action === 'delete' }), signal: controller.signal
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data.message || 'No se pudo actualizar el archivo.');
                if (!current(captured, revision)) return;
                setMessage(action === 'delete' ? 'Archivo eliminado. Podés restaurarlo.' : 'Archivo restaurado.'); await refresh();
            }
        } catch (failure) {
            if (current(captured, revision) && failure.name !== 'AbortError') {
                setMessage((saved ? 'Se guardaron ' + saved + ' archivos. ' : '') + failure.message + (action === 'upload' ? ' Podés reintentar sin duplicar los archivos ya guardados.' : ''));
                if (saved) await refresh().catch(() => {});
            }
        } finally { if (current(captured, revision)) { setBusy(''); setProgress(''); } }
    };
    if (!canRead) return <p className="m-0 text-xs text-crm-fg-muted">No tenés acceso a los adjuntos de esta sección.</p>;
    const activeFiles = documents.filter(file => !file.deletedAt), displayed = documents.filter(file => !file.deletedAt || showDeleted);
    return <div className="space-y-2" aria-label={'Archivos de ' + label}>
        {canWrite && <div className="flex flex-wrap items-center gap-2"><input ref={input} type="file" multiple hidden accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" onChange={choose}/><button type="button" onClick={() => input.current?.click()} disabled={Boolean(busy) || loading} className={button} aria-label={'Adjuntar a ' + label}><Paperclip size={13}/>Adjuntar</button><span className="text-[10px] text-crm-fg-muted">PDF / imagen · hasta 15 MB por archivo</span></div>}
        {selected.length > 0 && <div className="space-y-2 rounded-lg border border-crm-border p-3"><ul className="m-0 space-y-1 p-0">{selected.map((file, index) => <li key={index + ':' + file.name} className="flex list-none items-center justify-between gap-2 text-xs"><span className="min-w-0 break-all">{file.name} · {size(file.size)}</span><button type="button" disabled={Boolean(busy)} className={button} onClick={() => setSelected(previous => previous.filter((_, position) => position !== index))} aria-label={'Quitar selección de ' + file.name}><X size={12}/></button></li>)}</ul><button type="button" onClick={() => run('upload')} disabled={Boolean(busy)} className={button + ' !border-crm-red !bg-crm-red !text-white'}><Upload size={13}/>{busy === 'upload' ? 'Guardando archivos…' : 'Guardar adjuntos'}</button></div>}
        {progress && <p role="status" className="m-0 break-all text-xs text-crm-fg-muted">{progress}</p>}
        {message && <p role="status" className="m-0 rounded-lg border border-crm-border p-2 text-xs text-crm-fg-muted">{message}</p>}
        {error && <p role="alert" className="m-0 text-xs text-red-300">{error} <button type="button" className="underline" onClick={onReload} disabled={Boolean(busy)}>Reintentar consulta</button></p>}
        {loading && <p role="status" className="m-0 text-xs text-crm-fg-muted">Consultando archivos…</p>}
        {!loading && !error && !activeFiles.length && <p className="m-0 text-xs text-crm-fg-muted">Sin archivo adjunto.</p>}
        {documents.some(file => file.deletedAt) && <label className="flex items-center gap-2 text-xs text-crm-fg-muted"><input type="checkbox" checked={showDeleted} onChange={event => setShowDeleted(event.target.checked)} className="accent-crm-red"/>Mostrar eliminados</label>}
        <ul className="m-0 space-y-2 p-0">{displayed.map(file => <li key={file._id} className="flex list-none flex-wrap items-center justify-between gap-2 rounded-lg border border-crm-border bg-crm-bg p-2.5"><div className="min-w-0 flex-1"><p className="m-0 flex items-start gap-1.5 break-all text-xs"><FileText size={13} className="mt-0.5 shrink-0"/>{file.filename}</p><p className="mb-0 mt-1 text-[10px] text-crm-fg-muted">{size(file.size)} · {file.deletedAt ? 'Eliminado · recuperable' : 'Guardado'}</p></div><div className="flex gap-1.5">{!file.deletedAt && <button type="button" className={button} disabled={Boolean(busy)} onClick={() => run('download', file)} aria-label={'Descargar ' + label + ': ' + file.filename}><Download size={13}/></button>}{canWrite && <button type="button" className={button} disabled={Boolean(busy)} onClick={() => run(file.deletedAt ? 'restore' : 'delete', file)} aria-label={(file.deletedAt ? 'Restaurar ' : 'Eliminar ') + label + ': ' + file.filename}>{file.deletedAt ? <RotateCcw size={13}/> : <Trash2 size={13}/>}</button>}</div></li>)}</ul>
    </div>;
}

export default function ExpedienteDocumentFiles({ saleId, party, documentKey, label, capabilities = {}, onChanged, onDirtyChange, onBusyChange }) {
    const store = useExpedienteFiles(saleId, Boolean(capabilities.canReadDocuments));
    return <ExpedienteFilesList saleId={saleId} party={party} documentKey={documentKey} label={label} documents={store.documents.filter(file => expedienteFileMatches(file, party, documentKey))} loading={store.loading} error={store.error} canRead={Boolean(capabilities.canReadDocuments)} canWrite={Boolean(capabilities.canWriteDocuments)} onReload={store.reload} onChanged={onChanged} onDirtyChange={onDirtyChange} onBusyChange={onBusyChange}/>;
}
