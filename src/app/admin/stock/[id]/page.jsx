"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, WifiOff, Lock } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../../utils/adminPermissions';
import { VEHICLE_DETAIL_SECTIONS, getVehicleDetailSection, getVehicleReservationInitialData, canReserveVehicle } from '../../../../utils/vehicleDetail';
import { safeStockReturnTo } from '../../../../utils/stockNavigation';
import { mapRealCarToCRM } from '../../../../components/crm/stock/vehicleAdapter';
import VehicleDetailHeader from '../../../../components/crm/stock/VehicleDetailHeader';
import VehicleFinancialSummary from '../../../../components/crm/stock/VehicleFinancialSummary';
import VehicleInfoPanel from '../../../../components/crm/stock/VehicleInfoPanel';
import VehicleHistoryTimeline from '../../../../components/crm/stock/VehicleHistoryTimeline';
import VehicleDocumentsPanel from '../../../../components/crm/stock/VehicleDocumentsPanel';
import VehicleActionsPanel from '../../../../components/crm/stock/VehicleActionsPanel';
import VehicleImagesPanel from '../../../../components/crm/stock/VehicleImagesPanel';
import VehicleWebStatusPanel from '../../../../components/crm/stock/VehicleWebStatusPanel';
import VehicleEditModal from '../../../../components/crm/stock/VehicleEditModal';
import VehicleDeleteModal from '../../../../components/crm/stock/VehicleDeleteModal';
import ExpenseAddModal from '../../../../components/crm/stock/ExpenseAddModal';
import ReservationModal from '../../../../components/crm/reservations/ReservationModal';
import ReservationCancelModal from '../../../../components/crm/reservations/ReservationCancelModal';
import InputModal from '../../../../components/crm/ui/InputModal';
import VehicleFlyerPdf from '../../../../components/crm/stock/VehicleFlyerPdf';
import TradeInChainPanel from '../../../../components/crm/stock/TradeInChainPanel';
import { getActiveOfflineSnapshot } from '../../../../services/offlineSyncService';

function VehicleLoading() {
    return <div role="status" className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-crm-fg-muted"><RefreshCw size={18} className="animate-spin" />Cargando ficha del vehículo…</div>;
}

function VehicleDetailContent() {
    const params = useParams();
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
    const requestRef = useRef(null);
    const generationRef = useRef(0);
    const sessionRef = useRef(null);
    const id = String(params?.id || '');
    const canReadReservations = hasPermission(user, PERMISSIONS.RESERVAS_READ);
    const canWriteStock = hasPermission(user, PERMISSIONS.STOCK_WRITE);
    const canWriteReservations = hasPermission(user, PERMISSIONS.RESERVAS_WRITE);
    const canReadSales = hasPermission(user, PERMISSIONS.VENTAS_READ);
    const canEdit = canWriteStock && !isOffline;
    const activeSection = getVehicleDetailSection(searchParams.get('tab'));
    const returnPath = safeStockReturnTo(searchParams.get('returnTo'));
    const reservationInitialData = useMemo(() => getVehicleReservationInitialData(vehicle), [vehicle]);
    const baseUrl = process.env.NODE_ENV === 'production' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

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

    useEffect(() => {
        const updateConnection = () => fetchCar();
        window.addEventListener('online', updateConnection);
        window.addEventListener('offline', updateConnection);
        return () => { window.removeEventListener('online', updateConnection); window.removeEventListener('offline', updateConnection); };
    }, [fetchCar]);

    useEffect(() => {
        if (searchParams.get('editar') === '1' && canEdit && vehicle) setModal('edit');
    }, [searchParams, canEdit, vehicle]);

    const closeModal = () => {
        setModal(null);
        if (searchParams.has('editar')) {
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

    const handleSaveVehicle = async (payload) => {
        if (!canEdit || !token) throw new Error('Necesitás permiso de edición y conexión para guardar.');
        const response = await fetch(`${baseUrl}/api/admin/cars/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            const failure = new Error(result.message || 'No se pudo guardar el vehículo.');
            failure.errors = result.errors;
            failure.code = result.code;
            failure.status = response.status;
            throw failure;
        }
        const savedVehicle = await response.json();
        await fetchCar();
        window.dispatchEvent(new CustomEvent('vehicle-updated', { detail: { carId: id, source: 'vehicle-detail' } }));
        return savedVehicle;
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

    const handlePrint = (car) => {
        setSelectedVehicleForPrint(car);
        setTimeout(() => { window.print(); setSelectedVehicleForPrint(null); }, 150);
    };

    if (loading && !vehicle) return <VehicleLoading />;
    if (error) return <div role="alert" className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center gap-4 text-center"><h1 className="text-xl font-semibold text-crm-fg">No se pudo abrir la ficha</h1><p className="text-sm text-crm-fg-muted">{error}</p><button type="button" onClick={fetchCar} className="inline-flex items-center gap-2 rounded-lg bg-crm-red px-4 py-2 text-sm text-white"><RefreshCw size={16} />Reintentar</button><Link href={returnPath} className="text-sm text-crm-fg-muted underline">Volver al Stock</Link></div>;
    if (!vehicle) return <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center"><h1 className="text-xl font-semibold text-crm-fg">Vehículo no encontrado</h1><p className="text-sm text-crm-fg-muted">La unidad no existe o ya no está disponible en Stock.</p><Link href={returnPath} className="inline-flex items-center gap-2 rounded-lg bg-crm-red px-4 py-2 text-sm text-white"><ArrowLeft size={16} />Volver al Stock</Link></div>;

    return <>
        <div className="crm-no-print flex min-w-0 flex-col gap-4">
            <VehicleDetailHeader vehicle={vehicle} activeReservation={activeReservation} returnPath={returnPath} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-crm-fg-muted">
                {isOffline ? <p role="status" className="flex items-center gap-2 text-amber-500"><WifiOff size={14} />Copia sin conexión. Las acciones y los pagos requieren datos actualizados del servidor.</p> : !canWriteStock ? <p className="flex items-center gap-2"><Lock size={13} />Consulta de Stock · las acciones disponibles dependen de tus permisos.</p> : <p>Ficha de la unidad · datos, documentos y operación comercial</p>}
                <button type="button" onClick={fetchCar} disabled={loading} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-crm-border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red disabled:opacity-50"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} />{loading ? 'Actualizando…' : 'Actualizar ficha'}</button>
            </div>
            {reservationError && <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">{reservationError} Actualizá la ficha antes de tomar otra reserva.</p>}
            <nav aria-label="Secciones de la ficha del vehículo" className="flex min-w-0 gap-1 overflow-x-auto border-b border-crm-border">
                {VEHICLE_DETAIL_SECTIONS.map(section => {
                    const query = new URLSearchParams(searchParams.toString()); query.set('tab', section.id);
                    return <Link key={section.id} id={`vehicle-section-${section.id}`} href={`/admin/stock/${id}?${query}`} scroll={false} aria-current={activeSection === section.id ? 'page' : undefined} className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red ${activeSection === section.id ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}>{section.label}</Link>;
                })}
            </nav>
            <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0">
                    <section hidden={activeSection !== 'general'} aria-labelledby="vehicle-section-general"><VehicleInfoPanel vehicle={vehicle} onEdit={canEdit ? () => setModal('edit') : undefined} /></section>
                    <section hidden={activeSection !== 'costos'} aria-labelledby="vehicle-section-costos"><VehicleFinancialSummary vehicle={vehicle} onEdit={canEdit ? () => setModal('edit') : undefined} onPaymentSaved={fetchCar} canEdit={canEdit} isOffline={isOffline} /></section>
                    <section hidden={activeSection !== 'fotos'} aria-labelledby="vehicle-section-fotos"><VehicleImagesPanel key={`${id}:${token}`} vehicle={vehicle} onSaveComplete={fetchCar} canEdit={canEdit} /></section>
                    <section hidden={activeSection !== 'documentos'} aria-labelledby="vehicle-section-documentos"><VehicleDocumentsPanel vehicle={vehicle} onSaveComplete={fetchCar} canEdit={canEdit} /></section>
                    <section hidden={activeSection !== 'publicacion'} aria-labelledby="vehicle-section-publicacion"><VehicleWebStatusPanel vehicle={vehicle} onSaveComplete={fetchCar} canEdit={canEdit} /></section>
                    <section hidden={activeSection !== 'permutas'} aria-labelledby="vehicle-section-permutas">{isOffline ? <p className="rounded-xl border border-crm-border bg-crm-surface p-4 text-sm text-crm-fg-muted">La trazabilidad de permutas necesita conexión con el servidor.</p> : canReadSales ? <TradeInChainPanel key={`${id}:${token}`} carId={vehicle.id} onUpdated={fetchCar} /> : <p className="rounded-xl border border-crm-border bg-crm-surface p-4 text-sm text-crm-fg-muted">Necesitás permiso de consulta de Ventas para ver la trazabilidad de permutas.</p>}</section>
                    <section hidden={activeSection !== 'historial'} aria-labelledby="vehicle-section-historial"><VehicleHistoryTimeline vehicle={vehicle} /></section>
                </div>
                <VehicleActionsPanel vehicle={vehicle} activeReservation={activeReservation} isOffline={isOffline} reservationUnavailable={loading || Boolean(reservationError) || !canReadReservations}
                    onEdit={() => setModal('edit')} onAddExpense={() => setModal('expense')} onReserve={() => setModal('reserve')} onCancelReserve={() => setModal('cancel-reserve')} onDelete={() => setModal('delete')} onAddNote={() => setModal('note')} onStartSale={() => router.push('/admin/ventas')} onPrintFlyer={handlePrint} />
            </div>
        </div>
        {canEdit && <>
            <VehicleEditModal isOpen={modal === 'edit'} onClose={closeModal} onSave={handleSaveVehicle} vehicleData={vehicle} />
            <ExpenseAddModal isOpen={modal === 'expense'} onClose={() => setModal(null)} onSave={expense => handleSaveVehicle({ expenses: [...(vehicle.expensesList || []), expense] })} vehicleCurrency={vehicle.monedaCompra || 'USD'} />
            <InputModal isOpen={modal === 'note'} onClose={() => setModal(null)} title="Agregar observación" message="La nota se guardará en el historial interno del vehículo." label="Observación" placeholder="Escribí la observación…" confirmText="Guardar" onConfirm={handleAddNote} />
            <VehicleDeleteModal isOpen={modal === 'delete'} onClose={() => setModal(null)} vehicle={vehicle} onSuccess={() => { setModal(null); router.push(returnPath); }} />
        </>}
        {canWriteReservations && !isOffline && <>
            <ReservationModal isOpen={modal === 'reserve' && canReserveVehicle(vehicle, activeReservation)} onClose={() => setModal(null)} initialData={reservationInitialData} onSuccess={() => { setModal(null); fetchCar(); }} />
            {activeReservation?._id && <ReservationCancelModal isOpen={modal === 'cancel-reserve'} onClose={() => setModal(null)} reservation={activeReservation} onSuccess={() => { setModal(null); fetchCar(); }} />}
        </>}
        <VehicleFlyerPdf vehicle={selectedVehicleForPrint} />
    </>;
}

export default function VehicleDetailPage() {
    const { token } = useAuth();
    const params = useParams();
    return <Suspense fallback={<VehicleLoading />}><VehicleDetailContent key={`${token}:${params?.id}`} /></Suspense>;
}
