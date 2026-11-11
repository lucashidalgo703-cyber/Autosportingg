"use client";
import { useEffect, useRef, useState } from 'react';
import { FileText, Download, Trash2, RotateCcw, Upload } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { uploadSaleDocument, SALE_DOCUMENT_SLOT_LABELS } from '../../../utils/saleDocuments';
import { downloadPrivateFile } from '../../../utils/downloadPrivateFile';
const base = () => process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-crm-border px-3 py-2 text-xs text-crm-fg disabled:opacity-40';
const topSlots = ['buyer_id_front', 'buyer_id_back', 'vehicle_card_front', 'vehicle_card_back'];
const size = bytes => bytes < 1024 * 1024 ? Math.ceil(bytes / 1024) + ' KB' : (bytes / 1024 / 1024).toFixed(1) + ' MB';
export default function SaleDocumentsPanel({ saleId, scope, onUploaded, readOnly = false }) {
    const { token, user } = useAuth();
    const canRead = hasPermission(user, PERMISSIONS.VENTAS_READ) && hasPermission(user, PERMISSIONS.DOCUMENTACION_READ);
    const canWrite = canRead && !readOnly && hasPermission(user, PERMISSIONS.VENTAS_WRITE) && hasPermission(user, PERMISSIONS.DOCUMENTACION_WRITE);
    const [state, setState] = useState({ owner: '', documents: [], loading: true, error: '' });
    const [file, setFile] = useState(null), [slot, setSlot] = useState(topSlots[0]), [busy, setBusy] = useState(''), [message, setMessage] = useState(''), [progress, setProgress] = useState(0), [showDeleted, setShowDeleted] = useState(false);
    const pending = useRef(null), generation = useRef(0), input = useRef(null), active = useRef(null);
    const scopeKey = JSON.stringify([scope?.slot || '', scope?.depositId || '', scope?.tradeInId || '']);
    const owner = token + ':' + saleId + ':' + scopeKey; active.current = owner;
    const endpoint = base() + '/api/admin/sales/' + encodeURIComponent(saleId || '') + '/documents';
    const current = (captured, revision) => active.current === captured && generation.current === revision && localStorage.getItem('token') === token;
    const load = async () => {
        const captured = owner, revision = generation.current, controller = new AbortController(); pending.current?.abort(); pending.current = controller;
        setState(previous => ({ ...previous, owner: captured, loading: true, error: '' }));
        try {
            const response = await fetch(endpoint, { headers: { Authorization: 'Bearer ' + token }, signal: controller.signal, cache: 'no-store' });
            const data = await response.json(); if (!response.ok) throw Error(data.message || 'No se pudieron consultar los documentos.');
            if (current(captured, revision)) setState({ owner: captured, documents: data.documents || [], loading: false, error: '' });
        } catch (error) { if (current(captured, revision) && error.name !== 'AbortError') setState(previous => ({ ...previous, owner: captured, loading: false, error: error.message })); }
    };
    useEffect(() => {
        generation.current++; setFile(null); setBusy(''); setMessage(''); setProgress(0); setShowDeleted(false); setSlot(topSlots[0]); setState({ owner, documents: [], loading: true, error: '' });
        if (canRead && token && saleId) void load();
        return () => { generation.current++; pending.current?.abort(); };
    }, [token, saleId, scopeKey, canRead]);
    useEffect(() => {
        if (!file && !busy) return;
        const warn = event => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
    }, [file, busy]);
    const visible = state.owner === owner ? state : { documents: [], loading: true, error: '' };
    const documents = visible.documents.filter(document => !scope || document.slot === scope.slot && String(document.depositId || '') === String(scope.depositId || '') && String(document.tradeInId || '') === String(scope.tradeInId || ''));
    const choose = event => {
        const selected = event.target.files?.[0]; event.target.value = ''; if (!selected) return;
        if (!selected.size || selected.size > 15 * 1024 * 1024) { setMessage('Seleccioná un archivo con contenido de hasta 15 MB.'); return; }
        setFile(selected); setMessage('');
    };
    const run = async (action, document) => {
        if (busy || !canRead || action !== 'download' && !canWrite || action === 'upload' && !file) return;
        const captured = owner, revision = generation.current, controller = new AbortController(); pending.current?.abort(); pending.current = controller; setBusy(action); setMessage(''); setProgress(0);
        try {
            if (action === 'download') await downloadPrivateFile({ url: endpoint + '/' + document._id, filename: document.filename, token, signal: controller.signal });
            else if (action === 'upload') {
                const saved = await uploadSaleDocument({ saleId, file, ...(scope || { slot }), token, signal: controller.signal, onProgress: status => { if (current(captured, revision)) setProgress(status.percent); } });
                if (!current(captured, revision)) return; setFile(null); setMessage('Documento guardado. La venta conserva sus datos.'); onUploaded?.(saved); await load();
            } else {
                const response = await fetch(endpoint + '/' + document._id, { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ deleted: action === 'delete' }), signal: controller.signal });
                const data = await response.json(); if (!response.ok) throw Error(data.message || 'No se pudo guardar el cambio.'); if (!current(captured, revision)) return;
                setMessage(action === 'delete' ? 'Documento eliminado. Podés restaurarlo.' : 'Documento restaurado.'); await load();
            }
        } catch (error) { if (current(captured, revision) && error.name !== 'AbortError') setMessage(error.message + (action === 'upload' ? ' La venta ya está guardada; podés reintentar este archivo.' : '')); }
        finally { if (current(captured, revision)) setBusy(''); }
    };
    if (!canRead) return <p className="rounded-lg border border-crm-border p-3 text-xs text-crm-fg-muted">Necesitás permisos de consulta de Ventas y Documentación para acceder a los adjuntos.</p>;
    if (!saleId) return <p className="text-xs text-crm-fg-muted">Guardá primero la venta para adjuntar documentos privados.</p>;
    return <section className="space-y-3 rounded-xl border border-crm-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-sm font-semibold text-crm-fg">{scope ? SALE_DOCUMENT_SLOT_LABELS[scope.slot] || 'Documento de la venta' : 'Documentos de la venta'}</h3><span className="text-xs text-crm-fg-muted">Privados · hasta 15 MB por archivo</span></div>
        <p className="m-0 text-xs leading-5 text-crm-fg-muted">DNI, cédulas y comprobantes se descargan con permisos. Reemplazar conserva la versión anterior como eliminada; no modifica la venta ni acredita caja.</p>
        {canWrite && <div className="space-y-2"><input hidden type="file" ref={input} onChange={choose}/><div className="flex flex-wrap gap-2">{!scope && <select aria-label="Tipo de documento a adjuntar" value={slot} onChange={event => { setSlot(event.target.value); setFile(null); setMessage(''); }} disabled={Boolean(busy)} className="max-w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-crm-fg">{topSlots.map(value => <option key={value} value={value}>{SALE_DOCUMENT_SLOT_LABELS[value]}</option>)}</select>}<button type="button" className={button} onClick={() => input.current?.click()} disabled={Boolean(busy) || visible.loading}><Upload size={14}/>Seleccionar archivo</button>{file && <><button type="button" className={button + ' !border-crm-red !bg-crm-red !text-white'} onClick={() => run('upload')} disabled={Boolean(busy)}>{busy === 'upload' ? 'Subiendo ' + progress + '%…' : 'Guardar adjunto'}</button><button type="button" className={button} onClick={() => setFile(null)} disabled={Boolean(busy)}>Quitar selección</button></>}</div>{file && <p className="m-0 break-all text-xs text-crm-fg-muted">{file.name} · {size(file.size)} · pendiente de guardar</p>}</div>}
        {message && <p role="status" className="m-0 rounded-lg border border-crm-border p-3 text-xs text-crm-fg-muted">{message}</p>}
        {visible.error && <p role="alert" className="m-0 text-xs text-red-300">{visible.error} <button type="button" className="underline" disabled={Boolean(busy)} onClick={load}>Reintentar consulta</button></p>}
        {visible.loading && <p role="status" className="m-0 text-xs text-crm-fg-muted">Consultando documentos…</p>}
        {!visible.loading && !visible.error && !documents.some(document => !document.deletedAt) && <p className="m-0 text-xs text-crm-fg-muted">Sin documentos activos en esta sección.</p>}
        {documents.some(document => document.deletedAt) && <label className="flex items-center gap-2 text-xs text-crm-fg-muted"><input type="checkbox" checked={showDeleted} onChange={event => setShowDeleted(event.target.checked)} className="accent-crm-red"/>Mostrar eliminados</label>}
        <ul className="m-0 space-y-2 p-0">{documents.filter(document => !document.deletedAt || showDeleted).map(document => <li key={document._id} className="flex list-none flex-wrap items-center justify-between gap-3 rounded-lg border border-crm-border p-3"><div className="min-w-0 flex-1"><p className="m-0 flex items-start gap-2 break-all text-xs text-crm-fg"><FileText size={14} className="shrink-0"/>{document.filename}</p><p className="mb-0 mt-1 text-[10px] text-crm-fg-muted">{SALE_DOCUMENT_SLOT_LABELS[document.slot]} · {size(document.size)} · {document.deletedAt ? 'Eliminado · recuperable' : 'Guardado'}</p></div><div className="flex gap-2">{!document.deletedAt && <button type="button" className={button} onClick={() => run('download', document)} disabled={Boolean(busy)} aria-label={'Descargar ' + document.filename}><Download size={14}/></button>}{canWrite && <button type="button" className={button} onClick={() => run(document.deletedAt ? 'restore' : 'delete', document)} disabled={Boolean(busy)} aria-label={(document.deletedAt ? 'Restaurar ' : 'Eliminar ') + document.filename}>{document.deletedAt ? <RotateCcw size={14}/> : <Trash2 size={14}/>}</button>}</div></li>)}</ul>
    </section>;
}
