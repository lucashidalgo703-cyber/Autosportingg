"use client";
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../../utils/adminPermissions';
import PermissionGuard from '../../../../components/crm/layout/PermissionGuard';
import BuyerDocumentsPanel from '../../../../components/buyer-portal/BuyerDocumentsPanel';
import BuyerDeliveryDocumentsPanel from '../../../../components/buyer-portal/BuyerDeliveryDocumentsPanel';
import BuyerPortalAccessPanel from '../../../../components/buyer-portal/BuyerPortalAccessPanel';

const statuses = ['pendiente', 'en_proceso', 'observado', 'listo', 'transferido', 'finalizado', 'entregado', 'cancelado'];
export default function OperationalExpedientePage() {
    const { id } = useParams();
    const search = useSearchParams();
    const { token, user } = useAuth();
    const [sale, setSale] = useState(null);
    const [form, setForm] = useState({});
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const canWrite = hasPermission(user, PERMISSIONS.GESTORIA_WRITE);
    const canWriteDocs = hasPermission(user, PERMISSIONS.DOCUMENTACION_WRITE);
    const back = search.get('returnTo') === '/admin/gestoria' ? '/admin/gestoria' : '/admin/expedientes';
    useEffect(() => {
        if (!token || !hasPermission(user, PERMISSIONS.GESTORIA_READ)) return;
        let active = true;
        fetch('/api/admin/gestoria/sales/' + encodeURIComponent(id), { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' })
            .then(async response => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'No se pudo consultar el expediente.');
                if (active) {
                    setSale(data);
                    setForm({ expedienteStatus: data.expedienteStatus || 'en_proceso', documentationStatus: data.documentationStatus || 'pendiente', expedienteDueDate: data.expedienteDueDate ? new Date(data.expedienteDueDate).toISOString().slice(0, 10) : '' });
                }
            }).catch(error => { if (active) setError(error.message); });
        return () => { active = false; };
    }, [id, token, user]);
    async function save(event) {
        event.preventDefault(); setSaving(true); setError(''); setSaved(false);
        try {
            const { documentationStatus, ...other } = form;
            const response = await fetch('/api/admin/gestoria/sales/' + encodeURIComponent(id), {
                method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...other, ...(canWriteDocs ? { documentationStatus } : {}) })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'No se pudo guardar el expediente.');
            setSale(data); setSaved(true);
        } catch (error) { setError(error.message); } finally { setSaving(false); }
    }
    const inputClass = 'mt-2 min-h-11 w-full rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg disabled:opacity-60';
    return <PermissionGuard permission={PERMISSIONS.GESTORIA_READ}><main className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-24 text-crm-fg">
        <Link href={back} className="inline-flex min-h-11 items-center gap-2 text-sm text-crm-fg-muted"><ArrowLeft size={17}/>Volver a {back.endsWith('gestoria') ? 'Gestoría' : 'Expedientes'}</Link>
        <h1 className="text-2xl font-bold">Expediente y documentación</h1>
        {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</p>}
        {!sale && !error && <p role="status">Cargando expediente…</p>}
        {sale && <>
            <section className="space-y-2 rounded-xl border border-crm-border bg-crm-surface p-4">
                <p className="font-bold">{sale.clientId?.fullName || [sale.clientId?.firstName, sale.clientId?.lastName].filter(Boolean).join(' ') || 'Sin comprador vinculado'}</p>
                <p>{[sale.vehicleId?.brand, sale.vehicleId?.name || sale.vehicleId?.model, sale.vehicleId?.year].filter(Boolean).join(' ')} · {sale.vehicleId?.plateOrVin || 'Sin patente'}</p>
                <p className="text-xs text-crm-fg-muted">Expediente #{String(sale._id).slice(-6).toUpperCase()}</p>
            </section>
            <form onSubmit={save} className="space-y-4 rounded-xl border border-crm-border bg-crm-surface p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                    <label className="text-sm font-semibold">Estado del expediente<select className={inputClass} disabled={!canWrite} value={form.expedienteStatus} onChange={event => { setSaved(false); setForm({ ...form, expedienteStatus: event.target.value }); }}>{statuses.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
                    <label className="text-sm font-semibold">Documentación<select className={inputClass} disabled={!canWrite || !canWriteDocs} value={form.documentationStatus} onChange={event => { setSaved(false); setForm({ ...form, documentationStatus: event.target.value }); }}>{['pendiente', 'parcial', 'completo'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
                    <label className="text-sm font-semibold">Vencimiento del expediente<input type="date" className={inputClass} disabled={!canWrite} value={form.expedienteDueDate} onChange={event => { setSaved(false); setForm({ ...form, expedienteDueDate: event.target.value }); }}/></label>
                </div>
                {canWrite && <button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-crm-red px-4 font-bold text-white disabled:opacity-60"><Save size={16}/>{saving ? 'Guardando…' : 'Guardar expediente'}</button>}
                {saved && <p role="status" className="text-sm text-emerald-300">Expediente actualizado.</p>}
                <p className="text-xs text-crm-fg-muted">El estado del trámite y su aviso al comprador se actualizan desde Gestoría. La documentación se publica con su acción correspondiente.</p>
            </form>
            <BuyerPortalAccessPanel saleId={sale._id}/>
            <BuyerDocumentsPanel saleId={sale._id} initiallyOpen readOnly title="Archivos del vehículo recibido"/>
            <BuyerDeliveryDocumentsPanel saleId={sale._id}/>
        </>}
    </main></PermissionGuard>;
}
