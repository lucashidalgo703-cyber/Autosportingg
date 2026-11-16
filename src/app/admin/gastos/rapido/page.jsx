"use client";
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Mic, Pencil, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import PermissionGuard from '../../../../components/crm/layout/PermissionGuard';
import CrmButton from '../../../../components/crm/ui/CrmButton';
import { PERMISSIONS } from '../../../../utils/adminPermissions';

const prefix = '/api/admin/quick-expenses';
const inputClass = 'min-h-11 w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-base text-crm-fg focus:border-crm-red focus:outline-none disabled:opacity-50';
const kinds = { operational: 'Gasto operativo', workshop: 'Taller de una unidad', vehicle: 'Gasto de una unidad', card: 'Tarjeta' };
const methods = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', cheque: 'Cheque', deposito: 'Depósito', dolares: 'Dólares en efectivo', otro: 'Otro' };
const cardTimings = { paid: 'Ya pagada', deferred: 'Pendiente de pago' };
const valueOf = candidate => String(candidate.id || candidate._id || candidate.value || candidate.name || '');
const labelOf = candidate => candidate.label || candidate.name || candidate.model || candidate.value || '';
const textFieldNames = { amount: 'Importe', concept: 'Concepto', date: 'Fecha', dueDate: 'Vencimiento', currency: 'Moneda', category: 'Categoría', paymentMethod: 'Medio de pago', cardTiming: 'Pago de tarjeta', kind: 'Tipo de gasto' };
const uid = () => crypto.randomUUID();

function Field({ label, children }) {
    return <label className="block min-w-0 space-y-1.5"><span className="block text-sm font-semibold text-crm-fg">{label}</span>{children}</label>;
}

// Searches and pagination are server-side. A selected record may live outside
// the current page and is retained until the user explicitly changes it.
function ReferencePicker({ field, selected, onChange, request, currency, paymentMethod, disabled, initialCandidates = [], initialQuery = '', total, optional = false }) {
    const isVehicle = field === 'vehicleId';
    const [query, setQuery] = useState(initialQuery);
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ rows: initialCandidates, hasMore: Number(total || 0) > initialCandidates.length, total: total || initialCandidates.length });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        const timer = setTimeout(async () => {
            setLoading(true); setError('');
            try {
                const params = new URLSearchParams({ limit: '10', [isVehicle ? 'page' : 'accountPage']: String(page), [isVehicle ? 'vehicleQuery' : 'accountQuery']: query });
                if (currency) params.set('currency', currency);
                if (paymentMethod) params.set('paymentMethod', paymentMethod);
                const context = await request('/context?' + params);
                if (!active) return;
                const pagination = context[isVehicle ? 'vehiclePagination' : 'accountPagination'];
                setData({ rows: context[isVehicle ? 'vehicles' : 'accounts'] || [], hasMore: pagination?.hasMore === true, total: pagination?.total || 0 });
            } catch (err) { if (active) setError(err.message); }
            finally { if (active) setLoading(false); }
        }, 250);
        return () => { active = false; clearTimeout(timer); };
    }, [query, page, currency, paymentMethod, request, isVehicle]);
    return <div className="min-w-0 space-y-2" aria-busy={loading}>
        <label className="block"><span className="sr-only">{isVehicle ? 'Buscar unidad por modelo, año o patente' : 'Buscar cuenta de origen'}</span><input type="search" className={inputClass} placeholder={isVehicle ? 'Modelo, año o patente' : 'Nombre de cuenta o banco'} value={query} disabled={disabled} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
        {selected && !data.rows.some(row => valueOf(row) === selected) && <p className="text-xs text-crm-fg-muted">Se conserva la {isVehicle ? 'unidad' : 'cuenta'} del resumen hasta elegir otra.</p>}
        {optional && <button type="button" disabled={disabled} onClick={() => onChange('')} aria-pressed={!selected} className="min-h-10 rounded-lg border border-crm-border px-3 text-sm text-crm-fg">{isVehicle ? 'Sin unidad' : 'Asignar después'}</button>}
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-crm-border p-1">
            {data.rows.map(row => <button key={valueOf(row)} type="button" disabled={disabled || loading} aria-pressed={selected === valueOf(row)} onClick={() => onChange(valueOf(row))}
                className={`block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm disabled:opacity-50 ${selected === valueOf(row) ? 'bg-crm-red/15 text-crm-fg ring-1 ring-crm-red' : 'text-crm-fg hover:bg-crm-surface-raised'}`}>
                {labelOf(row)}{!isVehicle && row.currency ? ` · ${row.currency}` : ''}
            </button>)}
            {!data.rows.length && <p className="p-2 text-sm text-crm-fg-muted">{loading ? 'Buscando…' : 'Sin coincidencias. Probá otra búsqueda.'}</p>}
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center justify-between gap-2 text-xs text-crm-fg-muted"><span>{loading ? 'Buscando…' : `${data.total} coincidencias · página ${page}`}</span><div className="flex gap-2"><button type="button" disabled={disabled || loading || page <= 1} onClick={() => setPage(value => value - 1)} className="min-h-10 rounded-lg border border-crm-border px-2 disabled:opacity-30">Anterior</button><button type="button" disabled={disabled || loading || !data.hasMore} onClick={() => setPage(value => value + 1)} className="min-h-10 rounded-lg border border-crm-border px-2 disabled:opacity-30">Siguiente</button></div></div>
    </div>;
}

function MissingField({ question, draft, onSave, request, busy }) {
    const [value, setValue] = useState('');
    const field = question.field;
    const options = field === 'currency' ? { ARS: 'Pesos (ARS)', USD: 'Dólares (USD)' } : field === 'paymentMethod' ? methods : field === 'cardTiming' ? cardTimings : field === 'kind' ? kinds : null;
    return <section className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4" aria-label="Dato pendiente">
        <h2 className="text-base font-semibold text-crm-fg">{question.question}</h2>
        {['accountId', 'vehicleId'].includes(field) ? <ReferencePicker field={field} selected={draft.payload[field]} onChange={id => onSave({ [field]: id, ...(field === 'accountId' ? { accountUnassigned: false } : {}) })} request={request} currency={draft.payload.currency} paymentMethod={draft.payload.paymentMethod} disabled={busy} initialCandidates={question.candidates} initialQuery={draft.payload[field === 'vehicleId' ? 'vehicleQuery' : 'accountQuery'] || ''} total={question.total} /> :
            options ? <div className="flex flex-wrap gap-2">{Object.entries(options).map(([id, label]) => <CrmButton type="button" key={id} variant="secondary" disabled={busy} onClick={() => onSave({ [field]: id })} className="!h-auto min-h-11 whitespace-normal py-2">{label}</CrmButton>)}</div> :
            field === 'category' ? <div className="flex flex-wrap gap-2">{(question.candidates || []).map(candidate => <CrmButton type="button" key={candidate.name} variant="secondary" disabled={busy} onClick={() => onSave({ category: candidate.name })} className="!h-auto min-h-11 whitespace-normal py-2">{candidate.name}</CrmButton>)}</div> :
                <form className="space-y-3" onSubmit={event => { event.preventDefault(); onSave({ [field]: field === 'amount' ? Number(value) : value }); }}><Field label={textFieldNames[field] || 'Respuesta'}><input className={inputClass} value={value} onChange={event => setValue(event.target.value)} type={field === 'date' || field === 'dueDate' ? 'date' : field === 'amount' ? 'number' : 'text'} inputMode={field === 'amount' ? 'decimal' : 'text'} min={field === 'amount' ? '0.01' : undefined} step={field === 'amount' ? '0.01' : undefined} required disabled={busy} /></Field><CrmButton type="submit" disabled={busy || !value.trim()} className="min-h-11">Completar dato</CrmButton></form>}
        {field === 'accountId' && <CrmButton type="button" variant="secondary" disabled={busy} onClick={() => onSave({ accountUnassigned: true, accountId: null })} className="min-h-11">Cargar sin asignar cuenta</CrmButton>}
    </section>;
}

function CorrectionForm({ draft, context, request, busy, onSave, onCancel }) {
    const [values, setValues] = useState(() => ({ ...draft.payload, amount: String(draft.payload.amount || ''), accountId: draft.payload.accountId || '', vehicleId: draft.payload.vehicleId || '' }));
    const field = (key, value) => setValues(previous => ({ ...previous, [key]: value, ...(key === 'accountId' ? { accountUnassigned: !value } : {}), ...(['currency', 'paymentMethod'].includes(key) ? { accountId: '' } : {}) }));
    const save = event => {
        event.preventDefault();
        const expense = { ...values, amount: values.amount === '' ? null : Number(values.amount), accountId: values.accountId || null, vehicleId: values.vehicleId || null };
        if (!values.vehicleId) expense.vehicleQuery = null;
        onSave(expense);
    };
    return <form onSubmit={save} className="space-y-5 rounded-2xl border border-crm-border bg-crm-surface p-4" aria-label="Corregir el borrador">
        <h2 className="font-semibold text-crm-fg">Corregir datos</h2>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field label="Importe"><input className={inputClass} type="number" inputMode="decimal" step="0.01" min="0.01" required value={values.amount} disabled={busy} onChange={event => field('amount', event.target.value)} /></Field>
            <Field label="Moneda"><select className={inputClass} value={values.currency || ''} disabled={busy} required onChange={event => field('currency', event.target.value)}><option value="">Elegir moneda</option><option value="ARS">Pesos (ARS)</option><option value="USD">Dólares (USD)</option></select></Field>
            <Field label="Concepto"><input className={inputClass} value={values.concept || ''} disabled={busy} required onChange={event => field('concept', event.target.value)} maxLength={300} /></Field>
            <Field label="Fecha"><input className={inputClass} type="date" value={values.date || ''} disabled={busy} required onChange={event => field('date', event.target.value)} /></Field>
            <Field label="Tipo de gasto"><select className={inputClass} value={values.kind || 'operational'} disabled={busy} onChange={event => field('kind', event.target.value)}>{(context?.kinds || Object.keys(kinds)).map(kind => <option key={kind} value={kind}>{kinds[kind]}</option>)}</select></Field>
            <Field label="Categoría"><select className={inputClass} value={values.category || ''} disabled={busy} required onChange={event => field('category', event.target.value)}><option value="">Elegir categoría</option>{[...new Set([...(context?.categories || []), values.category].filter(Boolean))].map(category => <option key={category}>{category}</option>)}</select></Field>
            <Field label="Medio de pago"><select className={inputClass} value={values.paymentMethod || ''} disabled={busy} required onChange={event => field('paymentMethod', event.target.value)}><option value="">Elegir medio</option>{Object.entries(methods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            {values.paymentMethod === 'tarjeta' && <Field label="Pago de tarjeta"><select className={inputClass} value={values.cardTiming || ''} disabled={busy} required onChange={event => field('cardTiming', event.target.value)}><option value="">Elegir estado del pago</option>{Object.entries(cardTimings).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>}
        </div>
        <section className="space-y-2"><h3 className="text-sm font-semibold text-crm-fg">Cuenta de origen (opcional)</h3><ReferencePicker field="accountId" selected={values.accountId} onChange={id => field('accountId', id)} request={request} currency={values.currency} paymentMethod={values.paymentMethod} disabled={busy} optional /></section>
        <section className="space-y-2"><h3 className="text-sm font-semibold text-crm-fg">Unidad asociada</h3><ReferencePicker field="vehicleId" selected={values.vehicleId} onChange={id => field('vehicleId', id)} request={request} disabled={busy} optional={!['workshop', 'vehicle'].includes(values.kind)} /></section>
        <details className="space-y-3"><summary className="cursor-pointer text-sm text-crm-fg-muted">Notas y vencimiento</summary><Field label="Notas"><textarea className={inputClass} value={values.notes || ''} maxLength={1500} disabled={busy} onChange={event => field('notes', event.target.value)} /></Field>{values.paymentMethod === 'tarjeta' && values.cardTiming === 'deferred' && <Field label="Vencimiento"><input className={inputClass} type="date" value={values.dueDate || ''} disabled={busy} onChange={event => field('dueDate', event.target.value)} /></Field>}</details>
        <p className="text-xs text-crm-fg-muted">Guardar la corrección actualiza el resumen. Después confirmá esa nueva versión para registrar el gasto.</p>
        <div className="flex flex-wrap justify-end gap-2"><CrmButton type="button" variant="secondary" disabled={busy} onClick={onCancel} className="min-h-11">Cancelar corrección</CrmButton><CrmButton type="submit" disabled={busy} className="min-h-11">Guardar corrección</CrmButton></div>
    </form>;
}

function QuickExpense() {
    const { user, getToken } = useAuth();
    const userId = user?.id || user?.userId || user?._id;
    const storageKey = userId ? `autosporting:quick-expense:${userId}` : null;
    const [text, setText] = useState('');
    const [attempt, setAttempt] = useState(null);
    const [draft, setDraft] = useState(null);
    const [result, setResult] = useState(null);
    const [context, setContext] = useState(null);
    const [busy, setBusy] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [restoredKey, setRestoredKey] = useState(null);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');
    const [needsLogin, setNeedsLogin] = useState(false);
    const lock = useRef(false);
    const textarea = useRef(null);
    const request = useCallback(async (route, method = 'GET', body) => {
        const token = getToken();
        if (!token) { setNeedsLogin(true); throw new Error('Tu sesión venció. Volvé a ingresar para continuar con este borrador.'); }
        const base = process.env.NODE_ENV === 'production' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
        let response;
        try {
            response = await fetch(base + prefix + route, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(25000) });
        } catch { throw new Error('No se pudo confirmar la respuesta del servidor. Reintentá: se conserva la misma solicitud para evitar duplicados.'); }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 401) setNeedsLogin(true);
            const failure = new Error(data.message || 'No se pudo completar la solicitud. Volvé a intentar.');
            failure.code = data.error;
            failure.status = response.status;
            throw failure;
        }
        return data;
    }, [getToken]);
    const accept = useCallback(data => {
        if (data.movementId) { setResult(data); setDraft(null); }
        else { setDraft(data); setResult(null); }
    }, []);
    const remember = nextAttempt => {
        setAttempt(nextAttempt);
        if (storageKey) {
            try {
                if (nextAttempt) sessionStorage.setItem(storageKey, JSON.stringify(nextAttempt));
                else sessionStorage.removeItem(storageKey);
            } catch {}
        }
    };
    useEffect(() => {
        if (!storageKey) return;
        let active = true;
        setAttempt(null); setDraft(null); setResult(null); setText(''); setError(''); setEditing(false); setBusy(false);
        try {
            const stored = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
            if (stored?.requestId && typeof stored.text === 'string') {
                setAttempt(stored); setText(stored.text);
                if (stored.draftId) {
                    setBusy(true);
                    request('/drafts/' + stored.draftId).then(data => { if (active) accept(data); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setBusy(false); });
                }
            }
        } catch { sessionStorage.removeItem(storageKey); }
        setInitialized(true);
        setRestoredKey(storageKey);
        return () => { active = false; };
    }, [storageKey, request, accept]);
    useEffect(() => {
        if (!initialized || !storageKey || restoredKey !== storageKey) return;
        try {
            if (attempt) sessionStorage.setItem(storageKey, JSON.stringify(attempt));
            else sessionStorage.removeItem(storageKey);
        } catch {}
    }, [initialized, storageKey, restoredKey, attempt]);
    const operate = async action => {
        if (lock.current) return;
        lock.current = true; setBusy(true); setError('');
        try { await action(); }
        catch (err) {
            setError(err.message);
            if (err.code === 'DRAFT_EXPIRED') remember({ ...attempt, confirmPending: false });
            if (err.code === 'DRAFT_CHANGED' && attempt?.draftId) {
                try { accept(await request('/drafts/' + attempt.draftId)); setEditing(false); } catch {}
            }
        } finally { lock.current = false; setBusy(false); }
    };
    const prepare = () => operate(async () => {
        const current = attempt || { requestId: uid(), text: text.trim() };
        if (!current.text) return;
        remember(current);
        const data = current.draftId ? await request('/drafts/' + current.draftId) : await request('/interpret', 'POST', { text: current.text, requestId: current.requestId });
        accept(data);
        remember({ ...current, draftId: data.draftId });
    });
    const correct = expense => operate(async () => {
        const data = await request('/drafts/' + draft.draftId, 'PATCH', { version: draft.version, expense });
        accept(data); setEditing(false);
    });
    const openEditor = () => operate(async () => { setContext(await request('/context')); setEditing(true); });
    const confirm = () => operate(async () => {
        if (attempt?.confirmPending) {
            const current = await request('/drafts/' + draft.draftId);
            accept(current);
            if (current.movementId) { remember({ ...attempt, confirmPending: false }); return; }
            if (current.version !== draft.version) throw new Error('Cambió el resumen. Revisalo y confirmá la nueva versión.');
        }
        remember({ ...attempt, confirmPending: true });
        let data;
        try {
            data = await request('/drafts/' + draft.draftId + '/confirm', 'POST', { version: draft.version, confirmed: true });
        } catch (err) {
            // A server validation rejection completes without a financial write.
            // Network/5xx uncertainty keeps this attempt locked for safe recovery.
            if ([400, 409, 410, 422].includes(err.status)) remember({ ...attempt, confirmPending: false });
            throw err;
        }
        accept(data);
        remember({ ...attempt, confirmPending: false });
        window.dispatchEvent(new CustomEvent('crm:stock-changed'));
        localStorage.setItem('crm:stock-changed', `${Date.now()}:${data.movementId}`);
    });
    const startNew = () => { setDraft(null); setResult(null); remember(null); setText(''); setEditing(false); setError(''); textarea.current?.focus(); };
    return <div className="mx-auto w-full max-w-3xl min-w-0 space-y-5 p-3 pb-28 sm:p-6">
        <Link href="/admin/finanzas" className="inline-flex min-h-10 items-center gap-2 text-sm text-crm-fg-muted"><ArrowLeft size={16} />Volver a Finanzas</Link>
        <header><h1 className="text-2xl font-bold text-crm-fg">Dictar un gasto</h1><p className="mt-2 text-sm text-crm-fg-muted">Dictá o escribí qué pagaste. Revisá el resumen y confirmá para registrarlo.</p></header>
        {error && <div role="alert" className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"><p>{error}</p>{needsLogin && <Link href="/login?next=%2Fadmin%2Fgastos%2Frapido" className="inline-block underline">Volver a iniciar sesión</Link>}</div>}
        {!draft && !result && <section className="space-y-4 rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5" aria-busy={busy}>
            <Field label="Gasto escrito o dictado"><textarea ref={textarea} className={`${inputClass} min-h-32 resize-y`} rows={4} value={text} onChange={event => setText(event.target.value)} placeholder="Pagué 85 mil pesos en efectivo por la alineación de la Amarok Extreme" disabled={busy || Boolean(attempt)} maxLength={2000} autoCapitalize="sentences" /></Field>
            <p className="text-sm text-crm-fg-muted">Tocá el micrófono de tu teclado y dictá el gasto. También podés escribirlo.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><CrmButton type="button" variant="secondary" disabled={busy || Boolean(attempt)} onClick={() => textarea.current?.focus()} className="min-h-12"><Mic size={18} />Dictar con el teclado</CrmButton><CrmButton type="button" onClick={prepare} disabled={busy || !text.trim() || !initialized} className="min-h-12">{busy ? 'Preparando…' : attempt ? 'Reintentar misma solicitud' : 'Preparar gasto'}</CrmButton></div>
            {attempt && !attempt.confirmPending && <button type="button" className="min-h-10 text-sm text-crm-fg-muted underline" onClick={startNew} disabled={busy}>Descartar esta solicitud sin confirmar y cambiar el texto</button>}
        </section>}
        {draft && <div className="space-y-4" aria-busy={busy}>
            <section className="space-y-3 rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-crm-fg-muted">Revisá antes de confirmar</p>
                <p data-expense-summary className="break-words text-lg font-bold leading-relaxed text-crm-fg">{draft.summary}</p>
                {(draft.interpretationWarnings || []).map((warning, index) => <p key={index} className="text-sm text-amber-300">{typeof warning === 'string' ? warning : warning.message}</p>)}
                <p className="text-sm text-crm-fg-muted">{draft.readyToConfirm ? 'El gasto todavía no está registrado. Confirmalo cuando todos los datos sean correctos.' : 'Completá el dato pendiente para poder confirmar.'}</p>
                {!editing && <CrmButton type="button" variant="secondary" onClick={openEditor} disabled={busy || attempt?.confirmPending} className="min-h-11"><Pencil size={16} />Corregir datos</CrmButton>}
            </section>
            {editing ? <CorrectionForm key={`${draft.draftId}:${draft.version}`} draft={draft} context={context} request={request} busy={busy} onSave={correct} onCancel={() => setEditing(false)} /> : draft.nextQuestion && <MissingField key={`${draft.draftId}:${draft.version}:${draft.nextQuestion.field}`} question={draft.nextQuestion} draft={draft} request={request} busy={busy} onSave={correct} />}
            <CrmButton type="button" onClick={confirm} disabled={busy || editing || !draft.readyToConfirm} className="min-h-12 w-full">{busy ? 'Guardando…' : attempt?.confirmPending ? 'Recuperar resultado' : 'Confirmar gasto'}</CrmButton>
            {!attempt?.confirmPending && <button type="button" disabled={busy} onClick={startNew} className="min-h-10 text-sm text-crm-fg-muted underline">Descartar borrador y cargar otro gasto</button>}
            <details className="text-sm text-crm-fg-muted"><summary className="cursor-pointer">Ver texto original</summary><p className="mt-2 whitespace-pre-wrap">{attempt?.text}</p></details>
        </div>}
        {result && <section className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5" role="status">
            <CheckCircle2 className="text-emerald-400" size={32} /><h2 className="text-xl font-bold text-crm-fg">{result.movementStatus === 'anulado' ? 'Gasto anulado' : 'Gasto registrado'}</h2>
            <p className="break-all text-sm text-crm-fg">Movimiento #{result.movementNumber || result.movementId}</p><p className="break-words text-sm font-semibold text-crm-fg">{result.summary}</p>
            <p className="text-sm text-crm-fg-muted">{result.movementStatus === 'anulado' ? 'Este gasto fue anulado. No se volverá a registrar al recuperar esta solicitud.' : result.accountAssignmentPending ? (result.movementStatus === 'pendiente' ? 'Quedó pendiente de pago y de asignar cuenta de origen. Todavía no se debitó ninguna cuenta.' : 'Gasto registrado. Cuenta de origen sin asignar; no se descontó saldo de ninguna cuenta.') : result.accountDebited ? 'El egreso se registró y la cuenta se debitó una sola vez.' : 'Quedó pendiente de pago. Todavía no se debitó la cuenta.'}</p>
            <div className="flex flex-wrap gap-3"><Link href={result.url} className="inline-flex min-h-11 items-center rounded-xl bg-crm-red px-4 text-sm font-bold text-white">Ver movimiento</Link>{result.vehicleUrl && <Link href={result.vehicleUrl} className="inline-flex min-h-11 items-center rounded-xl border border-crm-border px-4 text-sm font-semibold text-crm-fg">Ver unidad</Link>}</div>
            <CrmButton type="button" variant="secondary" onClick={startNew} className="min-h-11"><RotateCcw size={16} />Cargar otro gasto</CrmButton>
        </section>}
    </div>;
}

export default function QuickExpensePage() {
    return <PermissionGuard permission={PERMISSIONS.FINANZAS_WRITE}><QuickExpense /></PermissionGuard>;
}
