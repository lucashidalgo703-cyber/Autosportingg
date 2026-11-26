"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Bug, CheckCircle2, Loader2, Paperclip, Plus, RefreshCw, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import CrmButton from '../../../components/crm/ui/CrmButton';
import CrmCard from '../../../components/crm/ui/CrmCard';
import CrmInput from '../../../components/crm/ui/CrmInput';
import CrmModal from '../../../components/crm/ui/CrmModal';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';
import CrmSelect from '../../../components/crm/ui/CrmSelect';
import CrmTextarea from '../../../components/crm/ui/CrmTextarea';
import EmptyState from '../../../components/crm/ui/EmptyState';
import ErrorState from '../../../components/crm/ui/ErrorState';

const API = '/api/admin/issue-reports';
const PAGE_SIZE = 20;
const STATUSES = { new: 'Pendiente', in_review: 'En revisión', resolved: 'Resuelto', closed: 'Cerrado' };
const CATEGORIES = { bug: 'Bug / error', falla: 'Falla de funcionamiento', otro: 'Otro problema' };
const PRIORITIES = { low: 'Baja', medium: 'Media', high: 'Alta' };
const STATUS_STYLES = {
    new: 'bg-blue-500/10 text-blue-500', in_review: 'bg-amber-500/10 text-amber-500',
    resolved: 'bg-emerald-500/10 text-emerald-500', closed: 'bg-crm-surface-raised text-crm-fg-muted'
};
const EMPTY_FORM = { title: '', description: '', category: 'bug', priority: 'medium', module: '', steps: '', expectedBehavior: '', actualBehavior: '', pageUrl: '' };
const formatDate = (value) => value ? new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '';
const authorName = (author) => author?.name || author?.email || 'Usuario del CRM';

async function readResponse(response) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'No se pudo completar la operación. Intentá nuevamente.');
    return body;
}

function StatusBadge({ status }) {
    return <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.new}`}>{STATUSES[status] || status}</span>;
}

function Field({ id, label, children, hint }) {
    return <div className="space-y-1.5"><label htmlFor={id} className="block text-sm font-medium text-crm-fg">{label}</label>{children}{hint && <p className="m-0 text-xs leading-5 text-crm-fg-muted">{hint}</p>}</div>;
}

function AttachmentPreview({ attachment, token }) {
    const [preview, setPreview] = useState('');
    const [error, setError] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        let objectUrl;
        setError(false);
        setPreview('');
        if (!token || !attachment.url) return;
        fetch(attachment.url, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
            .then(async (response) => {
                if (!response.ok) throw new Error('No se pudo cargar la captura');
                const blob = await response.blob();
                if (controller.signal.aborted) return;
                objectUrl = URL.createObjectURL(blob);
                setPreview(objectUrl);
            }).catch((err) => { if (err.name !== 'AbortError') setError(true); });
        return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [attachment.url, token]);
    return <div className="overflow-hidden rounded-lg border border-crm-border bg-crm-bg">
        {preview ? <a href={preview} target="_blank" rel="noopener noreferrer" className="block"><img src={preview} alt={attachment.name || 'Captura del problema'} className="h-36 w-full object-contain" /></a>
            : <div className="flex h-36 items-center justify-center p-3 text-center text-sm text-crm-fg-muted">{error ? 'No se pudo cargar la captura.' : 'Cargando captura…'}</div>}
        <p className="m-0 truncate border-t border-crm-border px-3 py-2 text-xs text-crm-fg-muted" title={attachment.name}>{attachment.name || 'Captura'}</p>
    </div>;
}

export default function ReportarProblemaPage() {
    const { token } = useAuth();
    const [reports, setReports] = useState([]);
    const [total, setTotal] = useState(0);
    const [canManage, setCanManage] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [reload, setReload] = useState(0);
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [success, setSuccess] = useState('');
    const [selected, setSelected] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [statusUpdate, setStatusUpdate] = useState('new');
    const [commentText, setCommentText] = useState('');
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);
    const detailRequestRef = useRef(0);

    useEffect(() => {
        const timer = setTimeout(() => { setSearchQuery(search.trim()); setPage(1); }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();
        setLoading(true);
        setError('');
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (status) params.set('status', status);
        if (searchQuery) params.set('search', searchQuery);
        fetch(`${API}?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
            .then(readResponse)
            .then((data) => {
                if (controller.signal.aborted) return;
                setReports(Array.isArray(data.reports) ? data.reports : []);
                setTotal(data.total || 0);
                setCanManage(data.canManage === true);
                const lastPage = Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE));
                if (page > lastPage) setPage(lastPage);
            })
            .catch((err) => { if (err.name !== 'AbortError') setError(err.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [token, page, status, searchQuery, reload]);

    const setField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
    const openCreate = () => {
        const sourcePath = new URLSearchParams(window.location.search).get('from')?.split(/[?#]/)[0];
        if (sourcePath && /^\/admin(?:\/|$)/.test(sourcePath) && !sourcePath.includes('\\')) {
            setForm((current) => ({ ...current, pageUrl: current.pageUrl || sourcePath }));
        }
        setSubmitError(''); setCreateOpen(true);
    };
    const closeDetail = useCallback(() => { if (!saving) { detailRequestRef.current += 1; setSelected(null); } }, [saving]);

    const handleFiles = (event) => {
        const incoming = Array.from(event.target.files || []);
        event.target.value = '';
        const nextFiles = [...files, ...incoming];
        if (nextFiles.length > 3) { setSubmitError('Podés adjuntar hasta 3 capturas.'); return; }
        if (incoming.some((file) => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) {
            setSubmitError('Las capturas deben ser imágenes PNG, JPG o WebP.'); return;
        }
        if (incoming.some((file) => file.size > 3 * 1024 * 1024)) { setSubmitError('Cada captura puede pesar hasta 3 MB.'); return; }
        if (nextFiles.reduce((size, file) => size + file.size, 0) > 3 * 1024 * 1024) { setSubmitError('Las capturas pueden pesar hasta 3 MB en total.'); return; }
        setSubmitError('');
        setFiles(nextFiles);
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        if (submitting || !token) return;
        if (!form.title.trim() || !form.description.trim()) { setSubmitError('Completá el título y la descripción del problema.'); return; }
        setSubmitting(true);
        setSubmitError('');
        try {
            const body = new FormData();
            Object.entries(form).forEach(([key, value]) => body.append(key, value.trim()));
            files.forEach((file) => body.append('attachments', file));
            const report = await fetch(API, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body }).then(readResponse);
            setSuccess(`Reporte enviado correctamente${report._id ? ` · #${report._id.slice(-6).toUpperCase()}` : ''}. Podés consultar su estado en este listado.`);
            setCreateOpen(false);
            setForm({ ...EMPTY_FORM });
            setFiles([]);
            setStatus(''); setSearch(''); setSearchQuery(''); setPage(1);
            setReload((value) => value + 1);
            toast.success('Problema reportado correctamente');
        } catch (err) { setSubmitError(err.message); }
        finally { setSubmitting(false); }
    };

    const openDetail = async (report) => {
        const requestId = ++detailRequestRef.current;
        setSelected(report); setStatusUpdate(report.status); setCommentText(''); setDetailError(''); setDetailLoading(true);
        try {
            const current = await fetch(`${API}/${report._id}`, { headers: { Authorization: `Bearer ${token}` } }).then(readResponse);
            if (requestId !== detailRequestRef.current) return;
            setSelected(current); setStatusUpdate(current.status);
        } catch (err) { if (requestId === detailRequestRef.current) setDetailError(err.message); }
        finally { if (requestId === detailRequestRef.current) setDetailLoading(false); }
    };

    const handleUpdate = async (event) => {
        event.preventDefault();
        if (!selected || saving || detailLoading || detailError) return;
        setSaving(true); setDetailError('');
        try {
            const updated = await fetch(`${API}/${selected._id}`, {
                method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: statusUpdate, ...(commentText.trim() ? { commentText: commentText.trim() } : {}) })
            }).then(readResponse);
            setSelected(updated); setStatusUpdate(updated.status); setCommentText(''); setReload((value) => value + 1);
            toast.success('Reporte actualizado');
        } catch (err) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    return <div className="min-w-0 space-y-5 p-4 pb-24 md:p-6">
        <CrmPageHeader title="Reportar problema" subtitle="Avisá sobre fallas, bugs o problemas que encuentres en el CRM." actions={<CrmButton type="button" onClick={openCreate}><Plus size={17} /> Nuevo reporte</CrmButton>} />
        {success && <div role="status" className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-crm-fg"><CheckCircle2 size={20} className="shrink-0 text-emerald-500" /><span className="flex-1">{success}</span><button type="button" onClick={() => setSuccess('')} aria-label="Cerrar confirmación" className="text-crm-fg-muted"><X size={18} /></button></div>}
        <CrmCard>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="m-0 text-base font-bold text-crm-fg">{canManage ? 'Reportes del equipo' : 'Mis reportes'}</h2><p className="m-0 mt-1 text-sm text-crm-fg-muted">{canManage ? 'Revisá los problemas y dejá una respuesta para quien los reportó.' : 'Consultá el avance y las respuestas a los problemas que enviaste.'}</p></div>
                <CrmButton type="button" variant="secondary" onClick={() => setReload((value) => value + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar</CrmButton>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
                <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-crm-fg-muted" /><CrmInput type="search" aria-label="Buscar reportes" placeholder="Buscar por título o descripción" className="pl-9" value={search} maxLength={120} onChange={(event) => setSearch(event.target.value)} /></div>
                <CrmSelect aria-label="Filtrar por estado" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Todos los estados</option>{Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</CrmSelect>
            </div>
            {loading ? <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm text-crm-fg-muted"><Loader2 size={20} className="animate-spin" /> Cargando reportes…</div>
                : error ? <ErrorState title="No se pudieron cargar los reportes" message={error} onRetry={() => setReload((value) => value + 1)} />
                    : reports.length === 0 ? <EmptyState icon={Bug} title={status || searchQuery ? 'No hay reportes con estos filtros' : 'Todavía no hay reportes'} description={status || searchQuery ? 'Probá con otro estado o una búsqueda diferente.' : 'Si encontrás un problema, registralo para que podamos revisarlo.'} action={<CrmButton type="button" variant="secondary" onClick={openCreate}>Crear reporte</CrmButton>} />
                        : <div className="divide-y divide-crm-border">
                            {reports.map((report) => <button key={report._id} type="button" onClick={() => openDetail(report)} className="block w-full rounded-lg px-2 py-4 text-left transition-colors hover:bg-crm-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red">
                                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-crm-fg-muted">#{report._id.slice(-6).toUpperCase()} · {formatDate(report.createdAt)}</span><StatusBadge status={report.status} /></div>
                                <h3 className="mb-1 mt-2 break-words text-sm font-semibold text-crm-fg">{report.title}</h3>
                                <p className="m-0 line-clamp-2 break-words text-sm text-crm-fg-muted">{report.description}</p>
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-crm-fg-muted"><span>{CATEGORIES[report.category] || report.category}</span><span className={report.priority === 'high' ? 'font-semibold text-crm-red' : ''}>Prioridad {PRIORITIES[report.priority] || report.priority}</span>{report.module && <span>{report.module}</span>}{canManage && <span>{authorName(report.author)}</span>}{report.attachments?.length > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={13} />{report.attachments.length}</span>}<span className="ml-auto font-medium text-crm-red">Ver detalle</span></div>
                            </button>)}
                        </div>}
            {!loading && !error && total > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-crm-border pt-4 text-sm text-crm-fg-muted"><span>{total} {total === 1 ? 'reporte' : 'reportes'} · Página {page} de {pageCount}</span><div className="flex gap-2"><CrmButton type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</CrmButton><CrmButton type="button" variant="secondary" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Siguiente</CrmButton></div></div>}
        </CrmCard>

        <CrmModal isOpen={createOpen} onClose={() => { if (!submitting) setCreateOpen(false); }} title="Nuevo reporte de problema" maxWidth="max-w-2xl">
            <form onSubmit={handleCreate} className="space-y-4 p-4 sm:p-5">
                <p className="m-0 text-sm leading-6 text-crm-fg-muted">Contanos qué pasó y en qué sección. Los campos con * son obligatorios.</p>
                <fieldset disabled={submitting} className="m-0 min-w-0 space-y-4 border-0 p-0 disabled:opacity-70">
                    <Field id="issue-title" label="Título *"><CrmInput id="issue-title" required maxLength={160} value={form.title} onChange={setField('title')} placeholder="Ej.: No puedo guardar una foto en Stock" /></Field>
                    <Field id="issue-description" label="Descripción del problema *"><CrmTextarea id="issue-description" required rows={4} maxLength={10000} value={form.description} onChange={setField('description')} placeholder="Explicá qué estabas haciendo y qué problema encontraste." /></Field>
                    <div className="grid gap-4 sm:grid-cols-2"><Field id="issue-category" label="Tipo de problema"><CrmSelect id="issue-category" value={form.category} onChange={setField('category')}>{Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</CrmSelect></Field><Field id="issue-priority" label="Prioridad"><CrmSelect id="issue-priority" value={form.priority} onChange={setField('priority')}>{Object.entries(PRIORITIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</CrmSelect></Field></div>
                    <Field id="issue-module" label="Sección del CRM"><CrmInput id="issue-module" maxLength={100} value={form.module} onChange={setField('module')} placeholder="Ej.: Stock, Ventas, Academy" /></Field>
                    <details className="rounded-lg border border-crm-border p-3"><summary className="cursor-pointer text-sm font-medium text-crm-fg">Agregar más detalles (opcional)</summary><div className="mt-4 space-y-4">
                        <Field id="issue-steps" label="Pasos para reproducirlo"><CrmTextarea id="issue-steps" rows={3} maxLength={5000} value={form.steps} onChange={setField('steps')} placeholder="1. Entré a… 2. Presioné… 3. Apareció…" /></Field>
                        <Field id="issue-expected" label="¿Qué esperabas que pasara?"><CrmTextarea id="issue-expected" maxLength={3000} value={form.expectedBehavior} onChange={setField('expectedBehavior')} /></Field>
                        <Field id="issue-actual" label="¿Qué pasó realmente?"><CrmTextarea id="issue-actual" maxLength={3000} value={form.actualBehavior} onChange={setField('actualBehavior')} /></Field>
                        <Field id="issue-url" label="Enlace o ruta de la pantalla"><CrmInput id="issue-url" maxLength={500} value={form.pageUrl} onChange={setField('pageUrl')} placeholder="Ej.: /admin/stock" /></Field>
                    </div></details>
                    <div className="space-y-2"><label htmlFor="issue-attachments" className="block text-sm font-medium text-crm-fg">Capturas de pantalla (opcional)</label><input ref={fileInputRef} id="issue-attachments" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleFiles} className="block w-full text-sm text-crm-fg-muted file:mr-3 file:rounded-lg file:border file:border-crm-border file:bg-crm-surface-raised file:px-3 file:py-2 file:text-sm file:text-crm-fg" /><p className="m-0 text-xs text-crm-fg-muted">Hasta 3 imágenes PNG, JPG o WebP, con un máximo de 3 MB en total.</p>
                        {files.map((file, index) => <div key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-2 rounded-lg bg-crm-bg p-2 text-sm text-crm-fg"><Paperclip size={15} className="shrink-0" /><span className="truncate">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="ml-auto rounded p-1 text-crm-fg-muted hover:text-crm-red" aria-label={`Quitar ${file.name}`}><X size={17} /></button></div>)}
                    </div>
                </fieldset>
                {submitError && <p role="alert" className="flex gap-2 rounded-lg bg-crm-red/10 p-3 text-sm text-crm-red"><AlertCircle size={18} className="shrink-0" />{submitError}</p>}
                <div className="flex justify-end gap-2 border-t border-crm-border pt-4"><CrmButton type="button" variant="secondary" disabled={submitting} onClick={() => setCreateOpen(false)}>Cancelar</CrmButton><CrmButton type="submit" disabled={submitting || !token}>{submitting ? <Loader2 size={16} className="animate-spin" /> : <Bug size={16} />}{submitting ? 'Enviando…' : 'Enviar reporte'}</CrmButton></div>
            </form>
        </CrmModal>

        <CrmModal isOpen={Boolean(selected)} onClose={closeDetail} title={selected ? `Reporte #${selected._id.slice(-6).toUpperCase()}` : 'Detalle del reporte'} maxWidth="max-w-2xl">
            {selected && <div className="space-y-5 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status={selected.status} /><span className="text-xs text-crm-fg-muted">{formatDate(selected.createdAt)}</span></div>
                <div><h3 className="m-0 break-words text-lg font-bold text-crm-fg">{selected.title}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-crm-fg">{selected.description}</p><div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-crm-fg-muted"><span>{CATEGORIES[selected.category]}</span><span>Prioridad {PRIORITIES[selected.priority]}</span>{selected.module && <span>Sección: {selected.module}</span>}{canManage && <span>Por {authorName(selected.author)}</span>}</div></div>
                {detailLoading && <p role="status" className="flex gap-2 text-sm text-crm-fg-muted"><Loader2 size={16} className="animate-spin" />Actualizando detalle…</p>}
                {detailError && <div role="alert" className="rounded-lg bg-crm-red/10 p-3 text-sm text-crm-red">{detailError}<button type="button" onClick={() => openDetail(selected)} className="ml-2 underline">Reintentar</button></div>}
                {[['Pasos para reproducirlo', selected.steps], ['Resultado esperado', selected.expectedBehavior], ['Resultado observado', selected.actualBehavior], ['Pantalla del problema', selected.pageUrl]].filter(([, value]) => value).map(([label, value]) => <div key={label}><h4 className="mb-1 text-sm font-semibold text-crm-fg">{label}</h4><p className="m-0 whitespace-pre-wrap break-words text-sm leading-6 text-crm-fg-muted">{value}</p></div>)}
                {selected.attachments?.length > 0 && <div><h4 className="mb-2 text-sm font-semibold text-crm-fg">Capturas adjuntas</h4><div className="grid gap-3 sm:grid-cols-2">{selected.attachments.map((attachment) => <AttachmentPreview key={attachment._id} attachment={attachment} token={token} />)}</div></div>}
                <div className="space-y-3 border-t border-crm-border pt-4"><h4 className="m-0 text-sm font-semibold text-crm-fg">Respuestas y seguimiento</h4>{selected.comments?.length ? selected.comments.map((comment, index) => <div key={comment._id || index} className="rounded-lg border border-crm-border bg-crm-bg p-3"><div className="flex flex-wrap justify-between gap-2 text-xs text-crm-fg-muted"><span className="font-semibold">{authorName(comment.author)}</span><span>{formatDate(comment.createdAt)}</span></div><p className="mb-0 mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-crm-fg">{comment.text}</p></div>) : <p className="m-0 text-sm text-crm-fg-muted">Todavía no hay respuestas. El estado se actualizará cuando revisemos el problema.</p>}</div>
                {canManage && <form onSubmit={handleUpdate} className="space-y-4 border-t border-crm-border pt-4"><Field id="issue-status-update" label="Estado del reporte"><CrmSelect id="issue-status-update" disabled={saving || detailLoading || Boolean(detailError)} value={statusUpdate} onChange={(event) => setStatusUpdate(event.target.value)}>{Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</CrmSelect></Field><Field id="issue-comment" label="Respuesta para el usuario"><CrmTextarea id="issue-comment" maxLength={2000} disabled={saving || detailLoading || Boolean(detailError)} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Contá qué se revisó o pedí más información." /></Field><div className="flex justify-end"><CrmButton type="submit" disabled={saving || detailLoading || Boolean(detailError) || (statusUpdate === selected.status && !commentText.trim())}>{saving && <Loader2 size={16} className="animate-spin" />}{saving ? 'Guardando…' : 'Guardar actualización'}</CrmButton></div></form>}
            </div>}
        </CrmModal>
    </div>;
}
