"use client";
import { useEffect, useState } from 'react';
import { Camera, Globe, Search } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { canManageStockMedia, canPublishStock } from '../../../utils/adminPermissions';
import CrmButton from '../ui/CrmButton';
import CrmCard from '../ui/CrmCard';
import CrmPagination from '../ui/CrmPagination';
import VehicleImagesPanel from './VehicleImagesPanel';
import VehicleWebStatusPanel from './VehicleWebStatusPanel';

const endpoint = () => (process.env.NODE_ENV === 'production' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')) + '/api/admin/stock/publication';
const vehicleTitle = car => [car.brand, car.name || car.model, car.year].filter(Boolean).join(' ') || 'Vehículo';
async function readPublication(url, token, signal) {
    const response = await fetch(url, { signal, cache: 'no-store', headers: { Authorization: 'Bearer ' + token } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo cargar la publicación.');
    return data;
}
const isPublished = car => car.visibleEnWeb !== false && !car.sold && !['vendido', 'reservado', 'pausado', 'cancelado', 'anulado', 'eliminado'].includes(String(car.status || '').toLowerCase());

export default function StockPublicationPanel() {
    const { user, token } = useAuth();
    const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [page, setPage] = useState(1);
    const [selectedId, setSelectedId] = useState(null), [revision, setRevision] = useState(0);
    const [snapshot, setSnapshot] = useState(null), [detail, setDetail] = useState(null);
    const [error, setError] = useState(''), [detailError, setDetailError] = useState('');
    const canImages = canManageStockMedia(user), canPublish = canPublishStock(user);
    const listKey = JSON.stringify([token, query, page, revision]);
    const detailKey = JSON.stringify([token, selectedId, revision]);
    const data = snapshot?.key === listKey ? snapshot.data : null;
    const vehicle = detail?.key === detailKey ? detail.data : null;
    useEffect(() => {
        if (!token || (!canImages && !canPublish)) return;
        const controller = new AbortController();
        setError('');
        readPublication(endpoint() + '?' + new URLSearchParams({ search: query, page: String(page), limit: '20' }), token, controller.signal)
            .then(result => { if (!controller.signal.aborted) setSnapshot({ key: listKey, data: result }); })
            .catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
        return () => controller.abort();
    }, [token, canImages, canPublish, query, page, revision, listKey]);
    useEffect(() => {
        if (!token || !selectedId || (!canImages && !canPublish)) return;
        const controller = new AbortController();
        setDetailError('');
        readPublication(endpoint() + '/' + encodeURIComponent(selectedId), token, controller.signal)
            .then(result => { if (!controller.signal.aborted) setDetail({ key: detailKey, data: result }); })
            .catch(cause => { if (!controller.signal.aborted) setDetailError(cause.message); });
        return () => controller.abort();
    }, [token, selectedId, revision, canImages, canPublish, detailKey]);
    const refresh = () => {
        setRevision(value => value + 1);
        window.dispatchEvent(new CustomEvent('crm:stock-changed', { detail: { vehicleId: selectedId } }));
    };
    if (!canImages && !canPublish) return null;
    if (selectedId) return <section className="flex min-w-0 flex-col gap-5" aria-label="Fotos y catálogo del vehículo" data-stock-publication-detail>
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">{vehicle ? vehicleTitle(vehicle) : 'Fotos y catálogo'}</h2>
            <CrmButton type="button" variant="secondary" onClick={() => setSelectedId(null)}>Volver al listado</CrmButton>
        </div>
        {detailError ? <div role="alert"><p className="text-red-400">{detailError}</p><CrmButton type="button" variant="secondary" onClick={refresh}>Reintentar</CrmButton></div>
            : !vehicle ? <p className="text-sm text-crm-fg-muted" role="status">Cargando fotos y publicación…</p>
            : <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">
                {canImages && vehicle.canManageImages !== false && <div className="min-w-0 xl:col-span-2"><VehicleImagesPanel key={detailKey} vehicle={vehicle} onSaveComplete={refresh}/></div>}
                {canPublish && vehicle.canPublish !== false && <div className="min-w-0"><VehicleWebStatusPanel key={detailKey} vehicle={vehicle} publicationOnly onSaveComplete={refresh}/></div>}
            </div>}
    </section>;
    return <section className="flex min-w-0 flex-col gap-5" aria-label="Fotos y catálogo" data-stock-publication>
        <div><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Camera size={20}/> Fotos y catálogo</h2><p className="mt-1 text-sm text-crm-fg-muted">Agregá fotos, elegí la portada y administrá la publicación de cada unidad.</p></div>
        <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search.trim()); }}>
            <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm text-crm-fg-muted">Buscar vehículo<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Marca, modelo o dominio" className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-white"/></label>
            <CrmButton type="submit" variant="secondary"><Search size={16}/> Buscar</CrmButton>
        </form>
        {error ? <div role="alert"><p className="text-red-400">{error}</p><CrmButton type="button" variant="secondary" onClick={refresh}>Reintentar</CrmButton></div>
            : !data ? <p className="text-sm text-crm-fg-muted" role="status">Cargando vehículos…</p>
            : <><div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{(data.items || []).map(car => <CrmCard key={car.id}>
                <div className="flex h-full flex-col gap-3" data-publication-vehicle={car.id}>
                    {(car.coverImage || car.images?.[0]) && <img src={car.coverImage || car.images[0]} alt={vehicleTitle(car)} className="aspect-video w-full rounded-lg object-cover" style={{ objectPosition: car.imagePosition || '50% 75%' }} loading="lazy"/>}
                    <div><h3 className="font-semibold text-white">{vehicleTitle(car)}</h3><p className="text-sm text-crm-fg-muted">{car.plateOrVin || 'Sin dominio'} · {car.status || 'Disponible'}</p></div>
                    <p className="flex items-center gap-2 text-sm text-crm-fg-muted"><Camera size={15}/> {(car.images || []).length} fotos <Globe size={15}/>{isPublished(car) ? 'Publicado en catálogo' : 'Oculto del catálogo'}</p>
                    <CrmButton type="button" variant="secondary" onClick={() => setSelectedId(car.id)}>Fotos y publicación</CrmButton>
                </div>
            </CrmCard>)}</div>
                {!data.items?.length && <p className="text-sm text-crm-fg-muted">{query ? 'No encontramos vehículos para esa búsqueda.' : 'No hay vehículos de stock para publicar.'}</p>}
                <CrmPagination currentPage={data.page || page} totalPages={data.pages || 1} totalItems={data.total || 0} limit={data.limit || 20} onPageChange={setPage}/>
            </>}
    </section>;
}
