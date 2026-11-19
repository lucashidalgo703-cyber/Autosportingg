"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Shield, Check, X, PlayCircle, RefreshCw, Eye, Loader2 } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import CrmButton from '../../../components/crm/ui/CrmButton';
import CrmModal from '../../../components/crm/ui/CrmModal';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';
import { PERMISSIONS, hasPermission } from '../../../utils/adminPermissions';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

const isIntake = request => ['CREATE_STOCK_VEHICLE', 'CREATE_CLIENT'].includes(request?.actionType);
const idOf = value => String(value?._id || value?.id || value?.userId || value || '');
const date = value => value ? new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' }) : 'Sin fecha';
const money = (value, currency) => value === undefined || value === null || value === '' ? 'Sin informar' : `${currency || 'Moneda pendiente'} ${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
const person = value => value?.name || value?.email || 'Usuario';

function StatusBadge({ request }) {
    const styles = { pending: 'border-amber-400/20 bg-amber-400/10 text-amber-300', approved: 'border-green-500/20 bg-green-500/10 text-green-400',
        rejected: 'border-red-500/20 bg-red-500/10 text-red-300', cancelled: 'border-crm-border bg-crm-bg text-crm-fg-muted', executed: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' };
    const labels = { pending: 'Pendiente de autorización', approved: 'Aprobada', rejected: 'Rechazada', cancelled: 'Cancelada', executed: isIntake(request) ? 'Alta aprobada' : 'Ejecutada' };
    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles[request.status] || styles.pending}`}>{labels[request.status] || request.status}</span>;
}

function Value({ label, children }) {
    return <div className="min-w-0"><dt className="text-[11px] font-semibold text-crm-fg-muted">{label}</dt><dd className="mt-0.5 break-words text-sm font-medium text-crm-fg">{children || 'Sin informar'}</dd></div>;
}

function ProposalDetails({ request, compact = false }) {
    const data = request.intakePayload;
    if (!isIntake(request) || !data) return <p className="whitespace-pre-wrap break-words text-sm text-crm-fg-muted">{request.reason || 'Sin motivo registrado.'}</p>;
    const vehicle = request.actionType === 'CREATE_STOCK_VEHICLE';
    const images = (Array.isArray(data.images) ? data.images : []).map(image => typeof image === 'string' ? image : image?.url).filter(image => {
        try { return new URL(image).protocol === 'https:'; } catch { return false; }
    });
    return <div className="space-y-4">
        <dl className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
            {vehicle ? <>
                <Value label="Vehículo">{[data.brand, data.name, data.year].filter(Boolean).join(' ')}</Value>
                <Value label="Patente / VIN">{data.plateOrVin || 'Sin informar'}</Value>
                <Value label="Precio publicado">{money(data.price, data.currency)}</Value>
                <Value label="Costo de compra">{money(data.purchasePrice, data.purchaseCurrency)}</Value>
                {!compact && <>
                    <Value label="Kilometraje">{`${Number(data.km || 0).toLocaleString('es-AR')} km`}</Value>
                    <Value label="Combustible">{data.fuel}</Value>
                    <Value label="Condición">{data.condition}</Value>
                    <Value label="Color">{data.color}</Value>
                    <Value label="Tipo de vehículo">{data.vehicleType}</Value>
                    <Value label="Propiedad">{data.agencyOwned ? 'Unidad propia de la agencia' : 'Unidad de un tercero'}</Value>
                </>}
            </> : <>
                <Value label="Cliente">{[data.firstName, data.lastName].filter(Boolean).join(' ') || data.fullName}</Value>
                <Value label="Teléfono">{data.phone}</Value>
                <Value label="Email">{data.email}</Value>
                <Value label="Tipo de cliente">{data.type}</Value>
                {!compact && <>
                    <Value label="DNI / CUIT">{data.dniCuit}</Value>
                    <Value label="Localidad / provincia">{[data.locality, data.province].filter(Boolean).join(' · ')}</Value>
                    <Value label="Dirección">{data.address}</Value>
                    <Value label="Origen">{data.source}</Value>
                </>}
            </>}
        </dl>
        {!compact && <>
            {(data.notes || data.description) && <div className="rounded-lg border border-crm-border bg-crm-bg p-3"><h4 className="text-xs font-bold text-crm-fg">Observaciones</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm text-crm-fg-muted">{[data.description, data.notes].filter(Boolean).join('\n')}</p></div>}
            {request.reason && <p className="whitespace-pre-wrap break-words text-xs text-crm-fg-muted"><strong>Motivo:</strong> {request.reason}</p>}
            {images.length > 0 && <section className="space-y-2" aria-label="Fotos propuestas"><h4 className="text-xs font-bold text-crm-fg">Fotos propuestas · {images.length}</h4><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{images.map((image, index) => <div key={`${image}-${index}`} className="rounded-lg border border-crm-border bg-crm-bg p-2">
                <img src={image} alt={`Foto propuesta ${index + 1}`} loading="lazy" className="max-h-64 w-full object-contain"/>
            </div>)}</div></section>}
        </>}
    </div>;
}

export default function AutorizacionesPage() {
    const { user, logout } = useAuth();
    const canRead = hasPermission(user, PERMISSIONS.APPROVALS_READ);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [filter, setFilter] = useState('pending');
    const [selection, setSelection] = useState(null);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [actionError, setActionError] = useState('');
    const busyRef = useRef(false);

    const canApprove = request => isIntake(request) ? user?.role === 'owner' : hasPermission(user, PERMISSIONS.APPROVALS_WRITE);
    const canCancel = request => isIntake(request)
        ? user?.role === 'owner' || idOf(request.requester) === idOf(user)
        : hasPermission(user, PERMISSIONS.APPROVALS_WRITE);

    const fetchRequests = useCallback(async () => {
        if (!canRead) { setRequests([]); setLoading(false); return; }
        setLoading(true);
        setLoadError('');
        try {
            const response = await fetch('/api/admin/approvals', { cache: 'no-store', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (response.status === 401) logout();
                throw new Error(data.message || 'No se pudieron cargar las autorizaciones.');
            }
            setRequests(Array.isArray(data) ? data : []);
        } catch (error) { setLoadError(error.message || 'No se pudieron cargar las autorizaciones.'); }
        finally { setLoading(false); }
    }, [canRead, logout]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const open = (request, action) => {
        if (busyRef.current) return;
        setSelection({ request, action });
        setNotes('');
        setActionError('');
    };
    const close = () => { if (!busyRef.current) { setSelection(null); setNotes(''); setActionError(''); } };

    const submitAction = async event => {
        event.preventDefault();
        if (busyRef.current || !selection || selection.action === 'view') return;
        const { request, action } = selection;
        if (['approve', 'reject'].includes(action) && !canApprove(request)) return;
        if (action === 'cancel' && !canCancel(request)) return;
        if (action === 'reject' && !notes.trim()) { setActionError('Indicá el motivo del rechazo.'); return; }
        const status = { approve: 'approved', reject: 'rejected', cancel: 'cancelled', execute: 'executed' }[action];
        if (!status || isIntake(request) && status === 'executed') return;
        busyRef.current = true;
        setSaving(true);
        setActionError('');
        try {
            const response = await fetch(`/api/admin/approvals/${request._id}`, { method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ status, resolutionNotes: notes.trim() }) });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (response.status === 401) logout();
                throw new Error(data.message || 'No se pudo actualizar la solicitud. Reintentá.');
            }
            toast.success(isIntake(request) && action === 'approve' ? 'Alta aprobada y registrada' : 'Solicitud actualizada');
            setSelection(null);
            setNotes('');
            await fetchRequests();
        } catch (error) { setActionError(error.message || 'No se pudo actualizar la solicitud. Reintentá.'); }
        finally { busyRef.current = false; setSaving(false); }
    };

    const filtered = requests.filter(request => filter === 'pending' ? ['pending', 'approved'].includes(request.status) : ['executed', 'rejected', 'cancelled'].includes(request.status));
    const selectedRequest = selection?.request;
    const modalTitle = selection?.action === 'view' ? 'Detalle de la solicitud' : selection?.action === 'approve' ? isIntake(selectedRequest) ? 'Aprobar alta' : 'Aprobar solicitud' : selection?.action === 'reject' ? 'Rechazar solicitud' : selection?.action === 'cancel' ? 'Cancelar solicitud' : 'Marcar solicitud ejecutada';
    const confirmationText = { approve: 'Confirmar aprobación', reject: 'Confirmar rechazo', cancel: 'Confirmar cancelación', execute: 'Confirmar ejecución' }[selection?.action];

    return <PermissionGuard permission={PERMISSIONS.APPROVALS_READ}>
        <div className="mx-auto w-full max-w-6xl space-y-5 p-3 pb-20 sm:p-5">
            <CrmPageHeader title="Autorizaciones" subtitle="Revisá las solicitudes y sus datos antes de resolverlas. Las altas de vendedores las autoriza el propietario." actions={<CrmButton type="button" variant="secondary" disabled={loading || saving} onClick={fetchRequests}><RefreshCw size={15}/> Actualizar</CrmButton>}/>
            <div className="flex flex-wrap gap-2" aria-label="Filtrar autorizaciones">
                <CrmButton type="button" variant={filter === 'pending' ? 'primary' : 'secondary'} onClick={() => setFilter('pending')}>Pendientes</CrmButton>
                <CrmButton type="button" variant={filter === 'history' ? 'primary' : 'secondary'} onClick={() => setFilter('history')}>Histórico</CrmButton>
            </div>
            {loadError && <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">{loadError} <button type="button" onClick={fetchRequests} className="ml-2 font-bold underline">Reintentar</button></div>}
            {loading ? <p className="p-6 text-center text-sm text-crm-fg-muted">Cargando autorizaciones…</p> : filtered.length === 0 ? <div className="flex flex-col items-center gap-3 rounded-2xl border border-crm-border bg-crm-surface p-10 text-center"><Shield size={35} className="text-crm-fg-muted"/><p className="text-sm font-bold text-crm-fg">No hay autorizaciones en esta vista.</p></div> : <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
                {filtered.map(request => <article key={request._id} data-approval-id={request._id} className="min-w-0 space-y-4 rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge request={request}/><span className="text-[11px] text-crm-fg-muted">{date(request.createdAt)}</span></div>
                    <div><h2 className="break-words text-base font-bold text-crm-fg">{request.summary}</h2><p className="mt-1 break-words text-xs text-crm-fg-muted">Solicitado por {person(request.requester)}</p></div>
                    <ProposalDetails request={request} compact/>
                    {request.resolutionNotes || request.approver || ['executed', 'rejected', 'cancelled'].includes(request.status) ? <div className="rounded-lg border border-crm-border bg-crm-bg p-3 text-xs text-crm-fg-muted"><strong className="text-crm-fg">Resolución{request.approver ? ` de ${person(request.approver)}` : ''}:</strong><p className="mt-1 whitespace-pre-wrap break-words">{request.resolutionNotes || 'Sin comentarios.'}</p><p className="mt-1 text-[10px]">{date(request.updatedAt)}</p></div> : null}
                    <div className="flex flex-wrap gap-2 border-t border-crm-border pt-3">
                        <CrmButton type="button" size="sm" variant="secondary" disabled={saving} onClick={() => open(request, 'view')}><Eye size={14}/> Ver detalle</CrmButton>
                        {request.status === 'pending' && canApprove(request) && <>
                            <CrmButton type="button" size="sm" disabled={saving} onClick={() => open(request, 'approve')}><Check size={14}/>{isIntake(request) ? 'Aprobar alta' : 'Aprobar'}</CrmButton>
                            <CrmButton type="button" size="sm" variant="secondary" disabled={saving} onClick={() => open(request, 'reject')}><X size={14}/> Rechazar</CrmButton>
                        </>}
                        {request.status === 'pending' && canCancel(request) && <CrmButton type="button" size="sm" variant="ghost" disabled={saving} onClick={() => open(request, 'cancel')}>Cancelar solicitud</CrmButton>}
                        {!isIntake(request) && request.status === 'approved' && hasPermission(user, PERMISSIONS.APPROVALS_WRITE) && <CrmButton type="button" size="sm" variant="secondary" disabled={saving} onClick={() => open(request, 'execute')}><PlayCircle size={14}/> Marcar Ejecutada</CrmButton>}
                        {isIntake(request) && request.status === 'pending' && !canApprove(request) && <p className="w-full text-xs text-crm-fg-muted">Pendiente de autorización del propietario.</p>}
                    </div>
                </article>)}
            </div>}
        </div>
        {selectedRequest && <CrmModal isOpen onClose={close} hideCloseButton={saving} title={modalTitle} maxWidth="max-w-2xl" footer={<div className="flex flex-wrap justify-end gap-2">
            <CrmButton type="button" variant="ghost" disabled={saving} onClick={close}>{selection.action === 'view' ? 'Cerrar' : 'Volver'}</CrmButton>
            {selection.action !== 'view' && <CrmButton type="submit" form="approval-resolution-form" disabled={saving} variant={['reject', 'cancel'].includes(selection.action) ? 'danger' : 'primary'}>{saving ? <><Loader2 size={15} className="animate-spin"/> Guardando…</> : confirmationText}</CrmButton>}
        </div>}>
            <form id="approval-resolution-form" onSubmit={submitAction} className="space-y-5 p-4 sm:p-5">
                <div><StatusBadge request={selectedRequest}/><h3 className="mt-3 break-words text-lg font-bold text-crm-fg">{selectedRequest.summary}</h3><p className="mt-1 text-xs text-crm-fg-muted">Solicitado por {person(selectedRequest.requester)} · {date(selectedRequest.createdAt)}</p></div>
                <ProposalDetails request={selectedRequest}/>
                {selection.action === 'approve' && isIntake(selectedRequest) && <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-crm-fg-muted">Al confirmar se dará de alta {selectedRequest.actionType === 'CREATE_CLIENT' ? 'este cliente' : 'este vehículo en el inventario privado'}. Revisá los datos propuestos. No se registran pagos ni movimientos de caja.</p>}
                {selection.action === 'cancel' && <p className="text-sm text-crm-fg-muted">La solicitud se cancelará y dejará de estar pendiente de autorización.</p>}
                {['approve', 'reject'].includes(selection.action) && <label className="block space-y-2 text-xs font-bold text-crm-fg-muted"><span>{selection.action === 'reject' ? 'Motivo del rechazo' : 'Comentario de la aprobación (opcional)'}</span><textarea rows={3} maxLength={4000} value={notes} onChange={event => setNotes(event.target.value)} required={selection.action === 'reject'} disabled={saving} className="w-full rounded-xl border border-crm-border bg-crm-bg p-3 text-base font-normal text-crm-fg outline-none focus:border-crm-red md:text-sm"/></label>}
                {selection.action === 'view' && selectedRequest.resolutionNotes && <p className="whitespace-pre-wrap break-words rounded-xl border border-crm-border bg-crm-bg p-3 text-sm text-crm-fg-muted">Resolución: {selectedRequest.resolutionNotes}</p>}
                {actionError && <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">{actionError}</div>}
            </form>
        </CrmModal>}
    </PermissionGuard>;
}
