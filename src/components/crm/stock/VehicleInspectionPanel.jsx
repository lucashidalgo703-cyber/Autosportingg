"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import CrmModal from '../ui/CrmModal';
import toast from 'react-hot-toast';

const sections = [['mechanic', 'Mecánica'], ['frontSuspension', 'Tren delantero'], ['brakes', 'Frenos'], ['bodyPaint', 'Chapa y pintura'], ['interior', 'Interior']];
const flags = [['singleOwner', 'Único dueño'], ['verifiedKm', 'Kilometraje verificado'], ['titleInHand', 'Título disponible'], ['vtvValid', 'VTV vigente'], ['noDebts', 'Sin deudas'], ['transferReady', 'Listo para transferir']];
const statusLabels = { ok: 'Bien', observacion: 'Con observaciones', revisar: 'A revisar', sin_evaluar: 'Sin evaluar' };
const empty = () => ({ ...Object.fromEntries(sections.map(([key]) => [key, { status: 'sin_evaluar', note: '' }])), tiresPercent: null, service: '', keyCount: null, ...Object.fromEntries(flags.map(([key]) => [key, null])), documentationNotes: '', generalNotes: '' });
const editableInspection = inspection => Object.fromEntries(Object.entries(empty()).map(([key, fallback]) => [key, inspection?.[key] ?? fallback]));
const inputClass = 'mt-1 h-9 w-full min-w-0 rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg focus:outline-none focus:ring-2 focus:ring-crm-red';

export default function VehicleInspectionPanel({ vehicleId, canEdit = false, autoEdit = false, onUpdated }) {
    const { token } = useAuth();
    const [inspection, setInspection] = useState(null);
    const [form, setForm] = useState(empty);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const request = useRef(null);
    const autoEditUsed = useRef(null);
    const load = useCallback(async () => {
        request.current?.abort();
        const controller = new AbortController(); request.current = controller;
        setLoading(true); setError('');
        try {
            const response = await fetch(`/api/admin/cars/${vehicleId}/inspection`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.message || 'No se pudo cargar el peritaje.');
            if (controller.signal.aborted) return;
            setInspection(result.inspection || null);
        } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
        finally { if (!controller.signal.aborted) setLoading(false); }
    }, [vehicleId, token]);
    useEffect(() => { load(); return () => request.current?.abort(); }, [load]);
    useEffect(() => { if (autoEdit && autoEditUsed.current !== autoEdit && canEdit && !loading && !error) { autoEditUsed.current = autoEdit; setForm(editableInspection(inspection)); setEditing(true); } }, [autoEdit, canEdit, loading, error, inspection]);
    const save = async event => {
        event.preventDefault(); if (!canEdit || saving || !token || localStorage.getItem('token') !== token) return;
        const controller = new AbortController(); request.current = controller;
        setSaving(true); setError('');
        try {
            const response = await fetch(`/api/admin/cars/${vehicleId}/inspection`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(editableInspection(form)), signal: controller.signal });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.message || 'No se pudo guardar el peritaje.');
            if (controller.signal.aborted || localStorage.getItem('token') !== token) return;
            setInspection(result.inspection || form); setEditing(false); toast.success('Peritaje guardado'); onUpdated?.();
        } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
        finally { if (!controller.signal.aborted) setSaving(false); }
    };
    return <section className="rounded-xl border border-crm-border bg-crm-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-sm font-semibold text-crm-fg">Peritaje de la unidad</h3>{canEdit && <button type="button" disabled={loading} onClick={() => { setForm(editableInspection(inspection)); setEditing(true); }} className="min-h-8 rounded-lg border border-crm-border px-3 text-xs text-crm-fg">{inspection ? 'Editar peritaje' : 'Cargar peritaje'}</button>}</div>
        {loading ? <p role="status" className="text-xs text-crm-fg-muted">Cargando peritaje…</p> : error && !editing ? <p role="alert" className="text-xs text-red-400">{error}<button type="button" onClick={load} className="ml-2 underline">Reintentar</button></p> : !inspection ? <p className="text-xs text-crm-fg-muted">Todavía no hay un peritaje registrado. No se presume el estado mecánico ni documental.</p> : <><dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">{sections.map(([key, label]) => <div key={key}><dt className="text-crm-fg-muted">{label}</dt><dd className="m-0 mt-1 text-crm-fg">{statusLabels[inspection[key]?.status] || 'Sin evaluar'}{inspection[key]?.note && <span className="mt-1 block break-words text-crm-fg-muted">{inspection[key].note}</span>}</dd></div>)}<div><dt className="text-crm-fg-muted">Neumáticos</dt><dd className="m-0 mt-1 text-crm-fg">{inspection.tiresPercent == null ? 'Sin evaluar' : `${inspection.tiresPercent}%`}</dd></div><div><dt className="text-crm-fg-muted">Service</dt><dd className="m-0 mt-1 text-crm-fg">{inspection.service || 'No informado'}</dd></div><div><dt className="text-crm-fg-muted">Llaves</dt><dd className="m-0 mt-1 text-crm-fg">{inspection.keyCount ?? 'No informado'}</dd></div>{flags.map(([key, label]) => <div key={key}><dt className="text-crm-fg-muted">{label}</dt><dd className="m-0 mt-1 text-crm-fg">{inspection[key] === true ? 'Sí' : inspection[key] === false ? 'No' : 'Sin verificar'}</dd></div>)}</dl>{inspection.documentationNotes && <p className="whitespace-pre-wrap text-xs text-crm-fg-muted">Documentación: {inspection.documentationNotes}</p>}{inspection.generalNotes && <p className="whitespace-pre-wrap text-xs text-crm-fg-muted">{inspection.generalNotes}</p>}</>}
        <CrmModal isOpen={editing} onClose={() => { if (!saving) setEditing(false); }} title="Peritaje de la unidad" maxWidth="max-w-2xl"><form onSubmit={save} className="space-y-4 p-4">{error && <p role="alert" className="text-xs text-red-400">{error}</p>}{sections.map(([key, label]) => <div key={key} className="grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="text-xs text-crm-fg-muted">{label}<select value={form[key]?.status || 'sin_evaluar'} onChange={event => setForm({ ...form, [key]: { ...form[key], status: event.target.value } })} className={inputClass}>{Object.entries(statusLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><label className="text-xs text-crm-fg-muted">Observaciones de {label.toLowerCase()}<input value={form[key]?.note || ''} onChange={event => setForm({ ...form, [key]: { ...form[key], note: event.target.value } })} className={inputClass} /></label></div>)}<div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><label className="text-xs text-crm-fg-muted">Neumáticos (%)<input type="number" min="0" max="100" value={form.tiresPercent ?? ''} onChange={event => setForm({ ...form, tiresPercent: event.target.value === '' ? null : Number(event.target.value) })} className={inputClass} /></label><label className="text-xs text-crm-fg-muted">Service<input value={form.service || ''} onChange={event => setForm({ ...form, service: event.target.value })} className={inputClass} /></label><label className="text-xs text-crm-fg-muted">Cantidad de llaves<input type="number" min="0" step="1" value={form.keyCount ?? ''} onChange={event => setForm({ ...form, keyCount: event.target.value === '' ? null : Number(event.target.value) })} className={inputClass} /></label></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{flags.map(([key, label]) => <label key={key} className="text-xs text-crm-fg-muted">{label}<select value={form[key] == null ? '' : String(form[key])} onChange={event => setForm({ ...form, [key]: event.target.value === '' ? null : event.target.value === 'true' })} className={inputClass}><option value="">Sin verificar</option><option value="true">Sí</option><option value="false">No</option></select></label>)}</div><label className="block text-xs text-crm-fg-muted">Observaciones documentales<textarea value={form.documentationNotes || ''} onChange={event => setForm({ ...form, documentationNotes: event.target.value })} className={`${inputClass} !h-20 py-2`} /></label><label className="block text-xs text-crm-fg-muted">Observaciones generales<textarea value={form.generalNotes || ''} onChange={event => setForm({ ...form, generalNotes: event.target.value })} className={`${inputClass} !h-20 py-2`} /></label><div className="flex justify-end gap-2 border-t border-crm-border pt-3"><button type="button" disabled={saving} onClick={() => setEditing(false)} className="min-h-9 rounded-lg border border-crm-border px-3 text-xs text-crm-fg">Cancelar</button><button type="submit" disabled={saving} className="min-h-9 rounded-lg bg-crm-red px-3 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar peritaje'}</button></div></form></CrmModal>
    </section>;
}
