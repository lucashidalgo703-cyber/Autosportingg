"use client";
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import CrmModal from '../ui/CrmModal';
import CrmButton from '../ui/CrmButton';

const labels = { available: 'Disponible / Reanudar', paused: 'Pausar recepción de leads', vacation: 'De vacaciones', sick: 'Enfermo' };
export default function ClientAvailabilityModal({ isOpen, onClose }) {
    const { token, user } = useAuth();
    const session = useRef(token); session.current = token;
    const [users, setUsers] = useState([]), [selected, setSelected] = useState(''), [status, setStatus] = useState('available');
    const [error, setError] = useState(''), [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!isOpen || !token) return;
        const controller = new AbortController();
        setUsers([]); setError(''); setBusy(false);
        fetch('/api/admin/team-availability', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' })
            .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data; })
            .then(data => { if (controller.signal.aborted) return; setUsers(data.users || []); const current = data.users?.find(item => String(item._id) === String(user?.id || user?._id)) || data.users?.find(item => item.canEdit); setSelected(current?._id || ''); setStatus(current?.status || 'available'); })
            .catch(err => { if (!controller.signal.aborted) setError(err.message || 'No se pudo cargar el equipo.'); });
        return () => controller.abort();
    }, [isOpen, token, user?.id, user?._id]);
    const current = users.find(item => item._id === selected);
    const save = async event => {
        event.preventDefault(); if (busy || !current?.canEdit) return;
        setBusy(true); setError('');
        try {
            const response = await fetch(`/api/admin/team-availability/${selected}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
            const data = await response.json(); if (session.current !== token) return;
            if (!response.ok) throw new Error(data.message || 'No se pudo guardar.');
            onClose();
        } catch (err) { if (session.current === token) setError(err.message); }
        finally { if (session.current === token) setBusy(false); }
    };
    return <CrmModal isOpen={isOpen} onClose={() => !busy && onClose()} title="Disponibilidad y pausa de leads" maxWidth="max-w-lg" footer={<div className="flex justify-end gap-2"><CrmButton size="sm" variant="secondary" disabled={busy} onClick={onClose}>Cancelar</CrmButton><CrmButton size="sm" type="submit" form="client-availability" disabled={busy || !current?.canEdit}>{busy ? 'Guardando…' : 'Guardar'}</CrmButton></div>}>
        <form id="client-availability" onSubmit={save} className="space-y-4 p-5 text-sm">
            {error && <p role="alert" className="rounded-lg border border-crm-red/40 bg-crm-red/10 p-3">{error}</p>}
            <label className="block text-xs text-crm-fg-muted">Vendedor<select value={selected} onChange={event => { setSelected(event.target.value); setStatus(users.find(item => item._id === event.target.value)?.status || 'available'); }} className="mt-1 h-9 w-full rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg"><option value="">Elegí un integrante</option>{users.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
            <label className="block text-xs text-crm-fg-muted">Estado<select value={status} disabled={!current?.canEdit || busy} onChange={event => setStatus(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <p className="text-xs text-crm-fg-muted">La pausa excluye al integrante de las nuevas asignaciones automáticas. Su cartera actual se conserva.</p>
            {current?.history && <details><summary className="cursor-pointer text-xs">Historial de disponibilidad</summary><ul className="space-y-2 pl-4 text-xs text-crm-fg-muted">{current.history.length ? current.history.map((entry, index) => <li key={index}>{new Date(entry.date).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })} · {labels[entry.status]} · {entry.user}</li>) : <li>Sin cambios registrados.</li>}</ul></details>}
        </form>
    </CrmModal>;
}
