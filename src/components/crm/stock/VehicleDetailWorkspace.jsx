"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, WifiOff, Lock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { VEHICLE_DETAIL_SECTIONS, getVehicleDetailSection, getVehicleReservationInitialData, canReserveVehicle, getVehicleStatusLabel } from '../../../utils/vehicleDetail';
import { safeStockReturnTo } from '../../../utils/stockNavigation';
import { mapRealCarToCRM } from './vehicleAdapter';
import VehicleDetailHeader from './VehicleDetailHeader';
import VehicleFinancialSummary from './VehicleFinancialSummary';
import VehicleInfoPanel from './VehicleInfoPanel';
import VehicleHistoryTimeline from './VehicleHistoryTimeline';
import VehicleDocumentsPanel from './VehicleDocumentsPanel';
import VehicleImagesPanel from './VehicleImagesPanel';
import VehicleWebStatusPanel from './VehicleWebStatusPanel';
import VehicleEditModal from './VehicleEditModal';
import VehicleDeleteModal from './VehicleDeleteModal';
import ExpenseAddModal from './ExpenseAddModal';
import ReservationModal from '../reservations/ReservationModal';
import ReservationCancelModal from '../reservations/ReservationCancelModal';
import InputModal from '../ui/InputModal';
import VehicleFlyerPdf from './VehicleFlyerPdf';
import TradeInChainPanel from './TradeInChainPanel';
import { getActiveOfflineSnapshot } from '../../../services/offlineSyncService';
import { useVehicleCommercialContext } from '../../../hooks/useVehicleCommercialContext';
import VehicleActivityPanel from './VehicleActivityPanel';
import VehicleInspectionPanel from './VehicleInspectionPanel';
import MandateStockModal from './MandateStockModal';
import VehicleGallery from './VehicleGallery';
import VehicleOwnerPortalPanel from './VehicleOwnerPortalPanel';

function VehicleLoading() {
    return <div role="status" className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-crm-fg-muted"><RefreshCw size={18} className="animate-spin" />Cargando ficha del vehículo…</div>;
}

export default function VehicleDetailWorkspace({ vehicleId, embedded = false, onClose, section, onSectionChange, onVehicleChanged, onVehicleLoaded, initialAction, activityTab, onDirtyChange }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, token } = useAuth();
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isOffline, setIsOffline] = useState(false);
    const [reservationError, setReservationError] = useState('');
    const [activeReservation, setActiveReservation] = useState(null);
    const [modal, setModal] = useState(null);
    const [selectedVehicleForPrint, setSelectedVehicleForPrint] = useState(null);
    const [editingPhotos, setEditingPhotos] = useState(false), [photosDirty, setPhotosDirty] = useState(false), [photosBusy, setPhotosBusy] = useState(false), [discardPhotos, setDiscardPhotos] = useState(false);
    const requestRef = useRef(null);
    const mutationControllers = useRef(new Set());
    const generationRef = useRef(0);
    const sessionRef = useRef(null);
    const initialActionUsed = useRef(false);
    const [inspectionRequest, setInspectionRequest] = useState(initialAction === 'inspection' ? 1 : 0);
    const id = String(vehicleId || '');
    const canReadReservations = hasPermission(user, PERMISSIONS.RESERVAS_READ);
    const canWriteStock = hasPermission(user, PERMISSIONS.STOCK_WRITE);
    const canWriteReservations = hasPermission(user, PERMISSIONS.RESERVAS_WRITE);
    const canReadSales = hasPermission(user, PERMISSIONS.VENTAS_READ);
    const canEdit = canWriteStock && !isOffline;
    const activeSection = getVehicleDetailSection(section || searchParams.get('tab'));
    const returnPath = safeStockReturnTo(searchParams.get('returnTo'));
    const reservationInitialData = useMemo(() => getVehicleReservationInitialData(vehicle), [vehicle]);
    const baseUrl = process.env.NODE_ENV === 'production' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
    const commercial = useVehicleCommercialContext(isOffline ? null : id);
    const onPhotoDirty = useCallback(value => { setPhotosDirty(value); onDirtyChange?.(value); }, [onDirtyChange]);

    const fetchCar = useCallback(async () => {
        if (!id || !token) return;
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        const generation = ++generationRef.current;
        const isCurrent = () => generation === generationRef.current && !controller.signal.aborted;
        const useOfflineCopy = () => {
            const snapshot = getActiveOfflineSnapshot();
            const found = snapshot?.data?.vehicles?.find(item => String(item._id || item.id) === id);
            if (!found || !isCurrent()) return false;
            setVehicle(mapRealCarToCRM(found));
            setIsOffline(true);
            setActiveReservation(null);
            setReservationError('');
            setError(null);
            return true;
        };
        setLoading(true);
        setError(null);
        try {
            if (navigator.onLine === false) {
                if (useOfflineCopy()) return;
                throw new Error('No hay una copia de este vehículo disponible para tu sesión. Reconectate e intentá de nuevo.');
            }
            const response = await fetch(`${baseUrl}/api/admin/cars/${id}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' });
            if (!isCurrent()) return;
            if (response.status === 404) { setVehicle(null); setIsOffline(false); return; }
            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                const failure = new Error(response.status === 401 ? 'Tu sesión expiró. Iniciá sesión nuevamente.' : response.status === 403 ? 'No tenés permiso para consultar este vehículo.' : result.message || 'No se pudo cargar la ficha.');
                failure.allowOffline = response.status >= 500;
                throw failure;
            }
            const result = await response.json();
            if (!isCurrent()) return;
            const responsibleId = typeof result.consignmentSeller === 'string' ? result.consignmentSeller : result.consignmentSeller?._id;
            if (responsibleId && !result.consignmentSeller?.name) {
                try {
                    const usersResponse = await fetch(`${baseUrl}/api/admin/users/active`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' });
                    if (usersResponse.ok) {
                        const users = await usersResponse.json();
                        const responsible = (Array.isArray(users) ? users : users.users || []).find(person => String(person._id) === String(responsibleId));
                        if (responsible?.name) result.consignmentSeller = { _id: responsibleId, name: responsible.name };
                    }
                } catch { /* Keep the assigned ID without guessing a name if the directory is unavailable. */ }
                if (!isCurrent()) return;
            }
            setVehicle(mapRealCarToCRM(result));
            setIsOffline(false);
            setActiveReservation(null);
            setReservationError('');
            if (canReadReservations) {
                try {
                    const reservations = await fetch(`${baseUrl}/api/admin/reservations?${new URLSearchParams({ vehicleId: id, status: 'activa' })}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' });
                    if (!reservations.ok) throw new Error('No se pudo comprobar la reserva vigente.');
                    const list = await reservations.json();
                    if (isCurrent()) setActiveReservation(Array.isArray(list) ? list[0] || null : null);
                } catch (failure) {
                    if (isCurrent()) setReservationError(failure.message);
                }
            }
        } catch (failure) {
            if (!isCurrent()) return;
            if ((failure.allowOffline || failure instanceof TypeError) && useOfflineCopy()) return;
            setError(failure.message || 'No se pudo cargar la ficha.');
        } finally {
            if (isCurrent()) setLoading(false);
        }
    }, [id, token, canReadReservations, baseUrl]);

    useEffect(() => {
        const identity = `${token}:${id}`;
        if (sessionRef.current !== identity) {
            sessionRef.current = identity;
            setVehicle(null);
            setActiveReservation(null);
            setModal(null);
        }
        fetchCar();
        return () => { ++generationRef.current; requestRef.current?.abort(); };
    }, [fetchCar, token, id]);

    useEffect(() => () => { mutationControllers.current.forEach(controller => controller.abort()); mutationControllers.current.clear(); }, [token, id]);
    useEffect(() => { if (vehicle) onVehicleLoaded?.(vehicle); }, [vehicle, onVehicleLoaded]);

    useEffect(() => {
        const updateConnection = () => fetchCar();
        window.addEventListener('online', updateConnection);
        window.addEventListener('offline', updateConnection);
        return () => { window.removeEventListener('online', updateConnection); window.removeEventListener('offline', updateConnection); };
    }, [fetchCar]);

    useEffect(() => {
        if (searchParams.get('editar') === '1' && canEdit && vehicle) setModal('edit');
    }, [searchParams, canEdit, vehicle]);

    useEffect(() => {
        if (initialAction && canEdit && vehicle && !initialActionUsed.current) {
            initialActionUsed.current = true;
            if (['edit', 'pause', 'delete', 'mandate'].includes(initialAction)) setModal(initialAction);
        }
    }, [initialAction, canEdit, vehicle]);

    const closeModal = () => {
        setModal(null);
        if (!embedded && searchParams.has('editar')) {
            const query = new URLSearchParams(searchParams.toString());
            query.delete('editar');
            router.replace(`/admin/stock/${id}${query.size ? `?${query}` : ''}`, { scroll: false });
        }
    };

    useEffect(() => {
        const refreshAfterVehicleEdit = event => {
            if (event.detail?.source !== 'vehicle-detail' && (!event.detail?.carId || String(event.detail.carId) === id)) fetchCar();
        };
        window.addEventListener('vehicle-updated', refreshAfterVehicleEdit);
        return () => window.removeEventListener('vehicle-updated', refreshAfterVehicleEdit);
    }, [fetchCar, id]);

    const handleSaveVehicle = async (payload, files) => {
        if (!canEdit || !token) throw new Error('Necesitás permiso de edición y conexión para guardar.');
        if (localStorage.getItem('token') !== token) throw new Error('La sesión cambió. Actualizá la ficha antes de guardar.');
        const controller = new AbortController();
        mutationControllers.current.add(controller);
        try {
        let body = JSON.stringify(payload);
        const headers = { Authorization: `Bearer ${token}` };
        if (Array.isArray(files)) {
            body = new FormData();
            Object.entries(payload).forEach(([key, value]) => {
                if (value === undefined || ['_id', '__v', 'images', 'coverImage', '_original', 'auditLog', 'createdAt', 'updatedAt', 'purchasePaymentState', 'tradeInOrigin'].includes(key)) return;
                if (['investor', 'infoAuto', 'documentation', 'imagePositions'].includes(key)) body.append(key, JSON.stringify(value));
                else if (value === null) body.append(key, '');
                else if (typeof value !== 'object') body.append(key, String(value));
            });
            let newIndex = 0;
            const imageOrder = files.map(file => {
                if (file.isExisting) return file.url;
                body.append('images', file.file || file);
                return `__new__${newIndex++}`;
            });
            body.append('imageOrder', JSON.stringify(imageOrder));
        } else headers['Content-Type'] = 'application/json';
        const response = await fetch(`${baseUrl}/api/admin/cars/${id}`, { method: 'PATCH', headers, body, signal: controller.signal });
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            const failure = new Error(result.message || 'No se pudo guardar el vehículo.');
            failure.errors = result.errors;
            failure.code = result.code;
            failure.status = response.status;
            throw failure;
        }
        const savedVehicle = await response.json();
        if (controller.signal.aborted || localStorage.getItem('token') !== token) throw new Error('La sesión cambió. Actualizá la ficha antes de continuar.');
        await fetchCar();
        if (controller.signal.aborted || localStorage.getItem('token') !== token) throw new Error('La sesión cambió. Actualizá la ficha antes de continuar.');
        window.dispatchEvent(new CustomEvent('vehicle-updated', { detail: { carId: id, source: 'vehicle-detail' } }));
        onVehicleChanged?.();
        return savedVehicle;
        } finally { mutationControllers.current.delete(controller); }
    };

    const handleAddNote = async (note) => {
        const cleanNote = String(note || '').trim();
        if (!cleanNote || !canEdit) return;
        const response = await fetch(`${baseUrl}/api/admin/cars/${id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ note: cleanNote }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'No se pudo guardar la observación.');
        toast.success('Observación guardada');
        await fetchCar();
    };

    const handleAvailability = async reason => {
        if (!canEdit || !token || localStorage.getItem('token') !== token) throw new Error('Necesitás permiso de edición y conexión para cambiar la disponibilidad.');
        if (!String(reason || '').trim()) throw new Error('Ingresá un motivo.');
        const controller = new AbortController(); mutationControllers.current.add(controller);
        try {
            const response = await fetch(`${baseUrl}/api/admin/cars/${id}/availability`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: vehicle.estado === 'retirado' ? 'relist' : 'withdraw', reason: String(reason).trim() }), signal: controller.signal });
            const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || 'No se pudo cambiar la disponibilidad.');
            if (controller.signal.aborted || localStorage.getItem('token') !== token) return;
            setModal(null); await fetchCar(); commercial.refresh(); onVehicleChanged?.(); window.dispatchEvent(new CustomEvent('vehicle-updated', { detail: { carId: id, source: 'vehicle-detail' } }));
            toast.success(result.status === 'Retirado' ? 'Unidad fuera de venta' : 'Unidad disponible nuevamente');
        } finally { mutationControllers.current.delete(controller); }
    };

    const handlePrint = (car) => {
        setSelectedVehicleForPrint(car);
        setTimeout(() => { window.print(); setSelectedVehicleForPrint(null); }, 150);
    };

    const refreshAll = () => { fetchCar(); commercial.refresh(); onVehicleChanged?.(); };
    const chooseSection = value => {
        if (embedded) onSectionChange?.(value);
        else {
            const query = new URLSearchParams(searchParams.toString()); query.set('tab', value);
            router.replace(`/admin/stock/${id}?${query}`, { scroll: false });
        }
    };
    const saveMandate = async data => {
        const response = await fetch('/api/admin/mandates', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...data, createCar: false, linkedCarId: id }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || result.error || 'No se pudo guardar el mandato.');
        toast.success('Mandato vinculado a la unidad'); setModal(null); onVehicleChanged?.();
    };

    if (loading && !vehicle) return <VehicleLoading />;
    if (error) return <div role="alert" className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center gap-4 text-center"><h1 className="text-xl font-semibold text-crm-fg">No se pudo abrir la ficha</h1><p className="text-sm text-crm-fg-muted">{error}</p><button type="button" onClick={fetchCar} className="inline-flex items-center gap-2 rounded-lg bg-crm-red px-4 py-2 text-sm text-white"><RefreshCw size={16} />Reintentar</button><Link href={returnPath} className="text-sm text-crm-fg-muted underline">Volver al Stock</Link></div>;
    if (!vehicle) return <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center"><h1 className="text-xl font-semibold text-crm-fg">Vehículo no encontrado</h1><p className="text-sm text-crm-fg-muted">La unidad no existe o ya no está disponible en Stock.</p><Link href={returnPath} className="inline-flex items-center gap-2 rounded-lg bg-crm-red px-4 py-2 text-sm text-white"><ArrowLeft size={16} />Volver al Stock</Link></div>;

    const source = vehicle._original || {};
    const responsibleLabel = source.consignmentSeller?.name || (source.consignmentSeller ? 'Responsable asignado (nombre no disponible)' : source.consignedBy || 'Sin responsable');
    const docValues = Object.values({ tituloAutomotor: 'pendiente', cedulaVerde: 'pendiente', verificacionPolicial: 'pendiente', informeDominio: 'pendiente', formulario08: 'pendiente', libreDeudaPatentes: 'pendiente', ...vehicle.documentation });
    const sourceSale = commercial.context?.status?.sale;
    const sourceReservation = commercial.context?.status?.reservation || activeReservation;
    const actionClass = 'inline-flex min-h-9 items-center justify-center rounded-lg border border-crm-border bg-crm-surface px-3 text-xs font-medium text-crm-fg hover:bg-crm-surface-raised disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red';
    const copyLink = async publicLink => {
        try { await navigator.clipboard.writeText(`${window.location.origin}${publicLink ? `/auto/${id}` : `/admin/stock/${id}`}`); toast.success('Enlace copiado'); }
        catch { toast.error('No se pudo copiar el enlace.'); }
    };
    return <>
        <div className={`crm-no-print flex w-full min-w-0 flex-col ${embedded ? 'h-full min-h-0' : 'gap-4'}`}>
            {!embedded && <VehicleDetailHeader vehicle={vehicle} activeReservation={activeReservation} returnPath={returnPath} />}
            <section aria-label="Resumen comercial de la unidad" className={`shrink-0 border-b border-crm-border bg-crm-surface ${embedded ? 'px-4 py-3' : 'rounded-xl border p-4'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-2xl font-semibold text-crm-fg">{Number(vehicle.precioPublicado) > 0 ? `${vehicle.moneda} ${Number(vehicle.precioPublicado).toLocaleString('es-AR')}` : 'Sin precio registrado'}</strong><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-crm-border bg-crm-bg px-2 py-1 text-xs capitalize text-crm-fg">{getVehicleStatusLabel(vehicle)}</span><span className="text-xs text-crm-fg-muted">{vehicle.condicion}</span><button type="button" onClick={refreshAll} disabled={loading} aria-label="Actualizar ficha del vehículo" className="rounded-lg p-2 text-crm-fg-muted disabled:opacity-40"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button></div></div>
                <p className="mb-0 mt-1 text-xs text-crm-fg-muted">{Number(vehicle.kilometraje || 0).toLocaleString('es-AR')} km · {vehicle.transmission || 'Transmisión no informada'} · {source.location || 'Sin ubicación'} · {responsibleLabel}</p>
                {isOffline && <p role="status" className="mb-0 mt-2 flex items-center gap-2 text-xs text-amber-500"><WifiOff size={13} />Copia sin conexión. Las acciones requieren datos actualizados.</p>}
            </section>
            <nav aria-label="Secciones de la ficha del vehículo" className={`flex shrink-0 flex-wrap gap-1 border-b border-crm-border ${embedded ? 'px-4 py-2' : 'pb-2'}`}>
                {VEHICLE_DETAIL_SECTIONS.map(item => <button key={item.id} type="button" id={`vehicle-section-${item.id}`} aria-pressed={activeSection === item.id} onClick={() => chooseSection(item.id)} className={`min-h-9 rounded-lg border px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red ${activeSection === item.id ? 'border-crm-red/30 bg-crm-red/10 text-crm-red' : 'border-crm-border bg-crm-surface text-crm-fg-muted hover:text-crm-fg'}`}>{item.label}</button>)}
            </nav>
            <div className={embedded ? 'min-h-0 flex-1 overflow-y-auto p-4' : 'min-w-0'}>
                {reservationError && <p role="status" className="mt-0 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">{reservationError}</p>}
                <section hidden={activeSection !== 'resumen'} aria-labelledby="vehicle-section-resumen" className="space-y-4">
                    <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2"><div className="min-w-0 space-y-4"><VehicleGallery vehicle={vehicle} canEdit={canEdit} onEdit={() => setEditingPhotos(true)} />{editingPhotos && canEdit && <section className="space-y-2 rounded-xl border border-crm-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-xs font-semibold text-crm-fg">Editar fotos, orden y encuadre</h3><button type="button" disabled={photosBusy} onClick={() => { if (photosDirty) setDiscardPhotos(true); else { setEditingPhotos(false); onPhotoDirty(false); } }} className="min-h-8 rounded-lg border border-crm-border px-2 text-xs text-crm-fg disabled:opacity-40">Volver a galería</button></div>{discardPhotos && <div role="alert" className="rounded-lg border border-amber-500/30 p-3 text-xs"><p className="mt-0">Hay fotos con cambios sin guardar.</p><div className="flex gap-2"><button type="button" onClick={() => setDiscardPhotos(false)} className="min-h-8 text-crm-fg">Seguir editando</button><button type="button" onClick={() => { setEditingPhotos(false); setDiscardPhotos(false); onPhotoDirty(false); }} className="min-h-8 text-crm-red">Descartar y volver</button></div></div>}<VehicleImagesPanel key={`${id}:${token}`} vehicle={vehicle} onSaveComplete={refreshAll} canEdit={canEdit} onDirtyChange={onPhotoDirty} onBusyChange={setPhotosBusy} /></section>}<section className="rounded-xl border border-crm-border p-3"><h3 className="m-0 text-xs font-semibold text-crm-fg">Propietario y gestión</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-xs">{[["Origen", vehicle.origen], ["Propietario", source.ownerName], ["Responsable", responsibleLabel], ["Consignador", source.consignedBy], ["Participación", vehicle.investor?.name ? `${vehicle.investor.name} · ${vehicle.investor.percentage ?? 0}%` : null]].map(([label, value]) => <div key={label}><dt className="text-crm-fg-muted">{label}</dt><dd className="m-0 mt-1 break-words capitalize text-crm-fg">{value || "No informado"}</dd></div>)}</dl><button type="button" onClick={() => chooseSection("portal")} className="min-h-8 text-xs text-crm-red">Portal y solicitudes del propietario</button></section></div>
                        <div className="min-w-0 space-y-4"><section className="rounded-xl border border-crm-border bg-crm-bg/40 p-3"><h3 className="m-0 text-xs font-semibold text-crm-fg">Estado de la operación y preparación</h3>{sourceSale?._id ? <Link href={`/admin/ventas/${sourceSale._id}`} className="mt-2 block text-xs text-crm-red">Ver venta y expediente · {sourceSale.status}</Link> : commercial.context?.permissions?.salesAllowed ? <p className="text-xs text-crm-fg-muted">Sin venta operativa vinculada.</p> : <p className="text-xs text-crm-fg-muted">Consulta de operaciones según permisos de Ventas.</p>}{sourceReservation?._id && <p className="text-xs text-crm-fg-muted">Reserva {sourceReservation.status || 'activa'}</p>}<div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => chooseSection('documentacion')} className={actionClass}>Ver documentación y peritaje</button><button type="button" onClick={() => chooseSection('actividad')} className={actionClass}>Atención comercial</button></div></section>
                            <section className="rounded-xl border border-crm-border p-3"><h3 className="m-0 text-xs font-semibold text-crm-fg">Enlaces de la unidad</h3><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => copyLink(false)} className={actionClass}>Copiar enlace interno</button>{vehicle.visibleEnWeb && vehicle.estado === 'disponible' && <button type="button" onClick={() => copyLink(true)} className={actionClass}>Copiar enlace de catálogo</button>}</div><p className="mb-0 text-[11px] text-crm-fg-muted">El enlace interno requiere una sesión de la agencia. El enlace del catálogo contiene solo la ficha pública.</p></section>
                            <section className="rounded-xl border border-crm-border p-3"><h3 className="m-0 text-xs font-semibold text-crm-fg">Costo y margen</h3><p className="text-xs text-crm-fg-muted">{vehicle.financialDisplay?.purchase?.hasCost ? `${vehicle.financialDisplay.purchase.currency || 'Moneda no informada'} ${Number(vehicle.financialDisplay.purchase.amount).toLocaleString('es-AR')}` : 'Costo no registrado'}</p><p className="mb-0 text-xs text-crm-fg-muted">{vehicle.financialDisplay?.margin?.calculable ? `Margen antes de comisiones: ${vehicle.financialDisplay.margin.currency} ${Number(vehicle.financialDisplay.margin.amount).toLocaleString('es-AR')}` : vehicle.financialDisplay?.margin?.reason || 'Margen no calculable'}</p><button type="button" onClick={() => chooseSection('gastos')} className="mt-2 text-xs text-crm-red">Ver gastos y capital</button></section>
                        </div>
                    </div>
                    <details className="rounded-xl border border-crm-border"><summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-crm-fg">Ficha técnica, propiedad y observaciones completas</summary><VehicleInfoPanel vehicle={vehicle} onEdit={canEdit ? () => setModal('edit') : undefined} /></details>
                </section>
                <section hidden={activeSection !== 'actividad'} aria-labelledby="vehicle-section-actividad">{isOffline ? <p className="text-xs text-crm-fg-muted">La actividad comercial requiere conexión.</p> : <VehicleActivityPanel vehicleId={id} context={commercial.context} loading={commercial.loading} error={commercial.error} onRefresh={commercial.refresh} initialTab={activityTab || 'consultas'} />}</section>
                <section hidden={activeSection !== 'publicaciones'} aria-labelledby="vehicle-section-publicaciones" className="space-y-4"><VehicleWebStatusPanel vehicle={vehicle} onSaveComplete={refreshAll} canEdit={canEdit} onEditPhotos={() => { chooseSection("resumen"); setEditingPhotos(true); }} /><div className="rounded-xl border border-crm-border p-4"><h3 className="m-0 text-sm font-semibold text-crm-fg">Canales de publicación</h3><div className="mt-3 grid gap-2 sm:grid-cols-3">{[["Mercado Libre", "Registro manual de estado y enlace"], ["Instagram", "Sin conexión API disponible"], ["Facebook", "Sin conexión API disponible"]].map(([name, status]) => <div key={name} className="rounded-lg border border-crm-border p-3 text-xs"><strong className="text-crm-fg">{name}</strong><p className="mb-0 mt-1 text-crm-fg-muted">{status}</p></div>)}</div><p className="text-xs text-crm-fg-muted">Los datos de Mercado Libre reflejan lo registrado por la agencia; no se verifican ni publican automáticamente en el proveedor. Este módulo no tiene una conexión operativa para publicar en redes.</p>{source.youtubeUrl && /^https:\/\//i.test(source.youtubeUrl) && <a href={source.youtubeUrl} target="_blank" rel="noopener noreferrer" className="min-h-8 text-xs text-crm-red underline">Abrir video de YouTube registrado</a>}{canEdit && <button type="button" onClick={() => setModal('edit')} className={actionClass}>Editar datos de publicación</button>}</div></section>
                <section hidden={activeSection !== 'documentacion'} aria-labelledby="vehicle-section-documentacion" className="space-y-4"><div className="flex flex-wrap gap-2">{[['recibido', 'Recibidos'], ['pendiente', 'Pendientes'], ['no aplica', 'No aplica']].map(([value, label]) => <span key={value} className="rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-crm-fg-muted">{label}: <strong className="text-crm-fg">{docValues.filter(status => status === value).length}</strong></span>)}</div><p className="text-xs text-crm-fg-muted">Propietario: {source.ownerName || 'No informado'} · Gestión: {source.consignedBy || 'No informada'}</p><VehicleDocumentsPanel vehicle={vehicle} onSaveComplete={refreshAll} canEdit={canEdit} />{!isOffline && <VehicleInspectionPanel vehicleId={id} canEdit={canEdit} autoEdit={inspectionRequest} onUpdated={refreshAll} />}{canEdit && <button type="button" onClick={() => setModal('edit')} className={actionClass}>Editar archivos y datos documentales</button>}</section>
                <section hidden={activeSection !== 'gastos'} aria-labelledby="vehicle-section-gastos" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-sm font-semibold text-crm-fg">Gastos de la unidad</h3>{canEdit && <button type="button" onClick={() => setModal('expense')} className={actionClass}>Agregar gasto</button>}</div>{vehicle.expensesList?.length ? <div className="divide-y divide-crm-border rounded-xl border border-crm-border">{vehicle.expensesList.map((expense, index) => <div key={expense._id || index} className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs"><span className="text-crm-fg">{expense.concept || 'Gasto registrado'}</span><span className="text-crm-fg-muted">{expense.currency || 'Moneda no informada'} {Number(expense.amount || 0).toLocaleString('es-AR')}</span></div>)}</div> : <p className="text-xs text-crm-fg-muted">No hay gastos registrados para esta unidad.</p>}<VehicleFinancialSummary vehicle={vehicle} onEdit={canEdit ? () => setModal('edit') : undefined} onPaymentSaved={refreshAll} canEdit={canEdit} isOffline={isOffline} />{!isOffline && canReadSales && <TradeInChainPanel key={`${id}:${token}`} carId={vehicle.id} onUpdated={refreshAll} />}</section>
                <section hidden={activeSection !== 'precios'} aria-labelledby="vehicle-section-precios" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-sm font-semibold text-crm-fg">Precios e historial de la unidad</h3>{canEdit && <button type="button" onClick={() => setModal('edit')} className={actionClass}>Editar precio</button>}</div><VehicleHistoryTimeline vehicle={vehicle} /></section>
                <section hidden={activeSection !== 'portal'} aria-labelledby="vehicle-section-portal"><VehicleOwnerPortalPanel key={`${id}:${token}`} vehicleId={id} canEdit={canEdit} isOffline={isOffline} onUpdated={refreshAll} /></section>
            </div>
            <footer className={`flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-crm-border bg-crm-surface ${embedded ? 'px-4 py-3' : 'pt-3'}`}>
                {canEdit && <button type="button" onClick={() => setModal('mandate')} className={actionClass}>Mandato</button>}
                <button type="button" onClick={() => { chooseSection('documentacion'); setInspectionRequest(value => value + 1); }} className={actionClass}>{canEdit ? 'Peritaje' : 'Ver peritaje'}</button>
                {canWriteReservations && !isOffline && <button type="button" disabled={loading || Boolean(reservationError) || !canReserveVehicle(vehicle, activeReservation)} onClick={() => setModal('reserve')} className={actionClass}>Señar</button>}
                {canWriteReservations && !isOffline && activeReservation?._id && <button type="button" onClick={() => setModal('cancel-reserve')} className={actionClass}>Liberar reserva</button>}
                {canEdit && <><button type="button" onClick={() => setModal('pause')} disabled={loading || !['disponible', 'retirado'].includes(vehicle.estado)} className={actionClass}>{vehicle.estado === 'retirado' ? 'Volver a poner en venta' : 'Sacar de venta'}</button><button type="button" onClick={() => setModal('delete')} className={`${actionClass} !text-crm-red`}>Borrar</button><button type="button" onClick={() => setModal('note')} className={actionClass}>Observación</button></>}
                <button type="button" onClick={() => handlePrint(vehicle)} className={actionClass}>Imprimir</button>
                {onClose ? <button type="button" onClick={onClose} className={actionClass}>Cerrar</button> : <Link href={returnPath} className={actionClass}>Volver al Stock</Link>}
                {canEdit && <button type="button" onClick={() => setModal('edit')} className={`${actionClass} !border-crm-red !bg-crm-red !text-white`}>Editar</button>}
            </footer>
        </div>
        {canEdit && <>
            <VehicleEditModal isOpen={modal === 'edit'} onClose={closeModal} onSave={handleSaveVehicle} vehicleData={vehicle} />
            <ExpenseAddModal isOpen={modal === 'expense'} onClose={() => setModal(null)} onSave={expense => handleSaveVehicle({ expenses: [...(vehicle.expensesList || []), expense] })} vehicleCurrency={vehicle.monedaCompra || 'USD'} />
            <InputModal isOpen={modal === 'note'} onClose={() => setModal(null)} title="Agregar observación" message="La nota se guardará en el historial interno del vehículo." label="Observación" placeholder="Escribí la observación…" confirmText="Guardar" onConfirm={handleAddNote} />
            <InputModal isOpen={modal === 'pause'} onClose={() => setModal(null)} title={vehicle.estado === 'retirado' ? 'Volver a poner en venta' : 'Sacar la unidad de venta'} message={vehicle.estado === 'retirado' ? "La unidad volverá a estar disponible para la venta. Se respetará su preferencia actual de visibilidad en el catálogo." : "La unidad quedará fuera de la oferta y del catálogo. Las ventas y reservas vigentes deben resolverse antes de cambiar su disponibilidad."} label="Motivo" placeholder="Indicá el motivo del cambio…" confirmText="Guardar disponibilidad" onConfirm={handleAvailability} />
            <VehicleDeleteModal isOpen={modal === 'delete'} onClose={() => setModal(null)} vehicle={vehicle} onSuccess={() => { setModal(null); onVehicleChanged?.(); if (onClose) onClose(); else router.push(returnPath); }} />
            <MandateStockModal isOpen={modal === 'mandate'} onClose={() => setModal(null)} initialVehicle={vehicle} onSave={saveMandate} />
        </>}
        {canWriteReservations && !isOffline && <>
            <ReservationModal isOpen={modal === 'reserve' && canReserveVehicle(vehicle, activeReservation)} onClose={() => setModal(null)} initialData={reservationInitialData} onSuccess={() => { setModal(null); refreshAll(); }} />
            {activeReservation?._id && <ReservationCancelModal isOpen={modal === 'cancel-reserve'} onClose={() => setModal(null)} reservation={activeReservation} onSuccess={() => { setModal(null); refreshAll(); }} />}
        </>}
        <VehicleFlyerPdf vehicle={selectedVehicleForPrint} />
    </>;
}
