"use client";
import { useEffect, useState } from 'react';
import { Globe, AlertTriangle, CheckCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import CrmCard from '../ui/CrmCard';
import { getVehicleOperationalStatus } from '../../../utils/vehicleDetail';

export default function VehicleWebStatusPanel({ vehicle, onSaveComplete, canEdit = false }) {
    const [visibleEnWeb, setVisibleEnWeb] = useState(vehicle?.visibleEnWeb !== false);
    const [isSaving, setIsSaving] = useState(false);
    const status = getVehicleOperationalStatus(vehicle);
    const isPublishableStatus = status === 'disponible' && !vehicle?._original?.sold;
    const wasPublished = vehicle?.visibleEnWeb !== false && isPublishableStatus;
    const changed = visibleEnWeb !== (vehicle?.visibleEnWeb !== false);
    const source = vehicle?._original || {};
    const imageCount = vehicle?.fotos?.length || vehicle?.images?.length || 0;
    useEffect(() => { setVisibleEnWeb(vehicle?.visibleEnWeb !== false); }, [vehicle?.id, vehicle?.visibleEnWeb]);

    const handleSave = async () => {
        if (!canEdit || !changed || isSaving) return;
        try {
            setIsSaving(true);
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
            const token = localStorage.getItem('token');
            const response = await fetch(`${baseUrl}/api/admin/cars/${vehicle.id || vehicle._id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                // La preferencia del catálogo no cambia el estado comercial de la unidad.
                body: JSON.stringify({ visibleEnWeb })
            });
            if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.message || 'No se pudo actualizar la publicación.'); }
            toast.success('Visibilidad actualizada');
            await onSaveComplete?.();
        } catch (failure) { toast.error(failure.message); }
        finally { setIsSaving(false); }
    };

    return <CrmCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-crm-border pb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-crm-fg"><Globe size={16} className="text-crm-fg-muted" />Publicación del vehículo</h2>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${wasPublished ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' : 'border-crm-border bg-crm-surface-raised text-crm-fg-muted'}`}>{wasPublished && <CheckCircle size={11} />}{wasPublished ? 'Visible en catálogo' : 'Fuera del catálogo'}</span>
        </div>
        <dl className="mb-4 grid grid-cols-2 gap-4 text-xs"><div><dt className="mb-1 text-crm-fg-muted">Estado operativo</dt><dd className="m-0 capitalize text-crm-fg">{status || 'No informado'}</dd></div><div><dt className="mb-1 text-crm-fg-muted">Mercado Libre</dt><dd className="m-0 text-crm-fg">{source.publishedOnML || 'No informado'}</dd></div><div><dt className="mb-1 text-crm-fg-muted">Publicado por</dt><dd className="m-0 break-words text-crm-fg">{source.publishedBy || 'No informado'}</dd></div><div><dt className="mb-1 text-crm-fg-muted">Fotos disponibles</dt><dd className="m-0 text-crm-fg">{imageCount}</dd></div></dl>
        {source.mlLink && /^https?:\/\//i.test(source.mlLink) && <a href={source.mlLink} target="_blank" rel="noreferrer" className="mb-4 inline-flex min-h-8 items-center text-xs text-crm-red underline">Abrir publicación de Mercado Libre</a>}
        <label className="flex items-center justify-between gap-3 rounded-lg border border-crm-border bg-crm-bg p-3">
            <span><span className="block text-sm font-medium text-crm-fg">Mostrar en sitio web</span><span className="block text-[11px] text-crm-fg-muted">Preferencia de visibilidad en el catálogo público</span></span>
            <input type="checkbox" checked={visibleEnWeb} disabled={!canEdit || isSaving} onChange={event => setVisibleEnWeb(event.target.checked)} className="h-5 w-5 shrink-0 accent-crm-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red disabled:opacity-50" />
        </label>
        {!isPublishableStatus && <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500"><AlertTriangle size={15} className="shrink-0" />El estado {status || 'actual'} mantiene la unidad fuera del catálogo, aunque actives esta preferencia. La disponibilidad se gestiona desde Stock y las operaciones vinculadas.</p>}
        {imageCount === 0 && <p className="mt-3 text-xs text-crm-fg-muted">Agregá fotos desde la sección Fotos para completar la publicación.</p>}
        {canEdit && <div className="mt-4 flex flex-wrap items-center justify-end gap-3">{changed && <span role="status" className="text-xs text-amber-500">Cambios sin guardar</span>}<button type="button" onClick={handleSave} disabled={isSaving || !changed} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-crm-red px-3 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red disabled:opacity-50"><Save size={14} />{isSaving ? 'Guardando…' : 'Guardar visibilidad'}</button></div>}
    </CrmCard>;
}
