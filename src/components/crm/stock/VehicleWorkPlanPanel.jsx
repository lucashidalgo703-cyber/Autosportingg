"use client";
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import CrmModal from '../ui/CrmModal';
import toast from 'react-hot-toast';
import { clientCalendarKey, clientTodayKey } from '../../../utils/clientCommercial';

const inputClass = 'mt-1 h-9 w-full min-w-0 rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg focus:outline-none focus:ring-2 focus:ring-crm-red';
export default function VehicleWorkPlanPanel({ vehicleId, context, onUpdated, autoEdit = false, compact = false }) {
    const { token } = useAuth();
    const [editing, setEditing] = useState(false);
    const [completion, setCompletion] = useState(null);
    const [resolution, setResolution] = useState('');
    const [users, setUsers] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ title: '', assignedTo: '', responsibleText: '', dueDate: clientTodayKey() });
    const request = useRef(null);
    useEffect(() => () => request.current?.abort(), [token, vehicleId]);
    const permissions = context?.permissions || {};
    const pending = context?.workPlan?.pendingActions || [];
    const next = context?.workPlan?.nextTask;
    useEffect(() => { if (autoEdit && permissions.canWriteFollowUp) setEditing(true); }, [autoEdit, permissions.canWriteFollowUp]);
    useEffect(() => {
        if (!editing || !token) return;
        const controller = new AbortController();
        fetch('/api/admin/users/active', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' }).then(response => response.ok ? response.json() : []).then(data => { if (!controller.signal.aborted) setUsers(Array.isArray(data) ? data : []); }).catch(() => {});
        return () => controller.abort();
    }, [editing, token]);
    const save = async event => {
        event.preventDefault();
        if (!permissions.canWriteFollowUp || saving || !token || localStorage.getItem('token') !== token) return;
        const controller = new AbortController(); request.current = controller;
        const current = () => !controller.signal.aborted && localStorage.getItem('token') === token;
        setSaving(true); setError('');
        try {
            const response = await fetch(`/api/admin/cars/${vehicleId}/follow-ups${completion ? `/${completion._id}` : ''}`, { method: completion ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(completion ? { status: 'completada', resolutionNote: resolution } : { ...form, status: 'pendiente' }), signal: controller.signal });
            const data = await response.json().catch(() => ({}));
            if (!current()) return;
            if (!response.ok) throw new Error(data.message || 'No se pudo guardar el seguimiento.');
            setEditing(false); setCompletion(null); setResolution(''); setForm({ title: '', assignedTo: '', responsibleText: '', dueDate: clientTodayKey() });
            toast.success(completion ? 'Seguimiento completado' : 'Seguimiento agendado');
            await onUpdated?.();
        } catch (failure) { if (current()) setError(failure.message); }
        finally { if (current()) setSaving(false); }
    };
    return <section className="rounded-xl border border-crm-border bg-crm-bg/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-xs font-semibold text-crm-fg">Plan de trabajo</h3>{permissions.canWriteFollowUp && <button type="button" onClick={() => { setError(''); setEditing(true); }} className="min-h-8 text-xs font-medium text-crm-red">Agendar seguimiento</button>}</div>
        {!permissions.agendaAllowed ? <p className="my-2 text-xs text-crm-fg-muted">La agenda de la unidad requiere permiso de Calendario.</p> : next ? <div className="mt-2 space-y-1 text-xs"><p className="m-0 font-medium text-crm-fg">{next.title}</p><p className="m-0 text-crm-fg-muted">{next.assignedTo?.name || next.responsibleText || 'Sin responsable'} · {clientCalendarKey(next.dueDate) || 'Sin fecha'}</p></div> : <p className="my-2 text-xs text-crm-fg-muted">No hay un próximo seguimiento registrado.</p>}
        {!compact && permissions.agendaAllowed && pending.map(task => <div key={task._id} className="mt-2 flex flex-wrap items-start justify-between gap-2 border-t border-crm-border pt-2 text-xs"><div className="min-w-0"><p className="m-0 break-words text-crm-fg">{task.title}</p><span className="text-crm-fg-muted">{task.assignedTo?.name || task.responsibleText || 'Sin responsable'} · {clientCalendarKey(task.dueDate)}</span></div>{permissions.canWriteFollowUp && <button type="button" onClick={() => { setError(''); setCompletion(task); }} className="text-crm-red">Completar</button>}</div>)}
        <CrmModal isOpen={editing || Boolean(completion)} onClose={() => { if (!saving) { setEditing(false); setCompletion(null); } }} title={completion ? 'Completar seguimiento' : 'Agendar seguimiento'} maxWidth="max-w-lg"><form onSubmit={save} className="space-y-3 p-4">{error && <p role="alert" className="text-xs text-red-400">{error}</p>}{completion ? <label className="block text-xs text-crm-fg-muted">Resultado o resolución<textarea required value={resolution} onChange={event => setResolution(event.target.value)} className={`${inputClass} !h-24 py-2`} /></label> : <><label className="block text-xs text-crm-fg-muted">Próxima acción<input required value={form.title} maxLength={500} onChange={event => setForm({ ...form, title: event.target.value })} className={inputClass} /></label><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs text-crm-fg-muted">Responsable<select value={form.assignedTo} onChange={event => setForm({ ...form, assignedTo: event.target.value })} className={inputClass}><option value="">Sin asignar</option>{users.map(user => <option key={user._id} value={user._id}>{user.name || user.email}</option>)}</select></label><label className="text-xs text-crm-fg-muted">Fecha<input type="date" required value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} className={inputClass} /></label></div></>}<div className="flex justify-end gap-2 border-t border-crm-border pt-3"><button type="button" disabled={saving} onClick={() => { setEditing(false); setCompletion(null); }} className="min-h-9 rounded-lg border border-crm-border px-3 text-xs text-crm-fg">Cancelar</button><button type="submit" disabled={saving} className="min-h-9 rounded-lg bg-crm-red px-3 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Guardando…' : completion ? 'Guardar resolución' : 'Agendar seguimiento'}</button></div></form></CrmModal>
    </section>;
}
