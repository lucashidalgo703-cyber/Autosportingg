"use client";
import { useEffect, useRef, useState } from 'react';
import { ListOrdered, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import CrmButton from '../ui/CrmButton';

const endpoint = () => (process.env.NODE_ENV === 'production' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')) + '/api/admin/stock/publication/order';
const titleOf = car => [car.brand, car.name || car.model, car.year].filter(Boolean).join(' ') || 'Vehículo';

export default function CatalogOrderPanel({ onClose, onSaved }) {
    const { token } = useAuth();
    const [snapshot, setSnapshot] = useState(null), [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState(''), [saveError, setSaveError] = useState('');
    const [conflict, setConflict] = useState(false), [version, setVersion] = useState(0);
    const saveLock = useRef(false), generation = useRef(0);
    useEffect(() => {
        const current = ++generation.current;
        const controller = new AbortController();
        setLoading(true); setLoadError(''); setSaveError(''); setConflict(false);
        if (!token) return () => { controller.abort(); generation.current++; };
        fetch(endpoint(), { signal: controller.signal, cache: 'no-store', headers: { Authorization: 'Bearer ' + token } })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data.message || 'No se pudo cargar el orden del catálogo.');
                if (current === generation.current) { setSnapshot({ ...data, token }); setItems(data.items || []); }
            })
            .catch(cause => { if (current === generation.current && !controller.signal.aborted) setLoadError(cause instanceof TypeError ? 'No se pudo cargar el catálogo. Revisá la conexión y volvé a intentar.' : cause.message); })
            .finally(() => { if (current === generation.current) setLoading(false); });
        return () => { controller.abort(); generation.current++; };
    }, [token, version]);
    const data = snapshot?.token === token ? snapshot : null;
    const disabled = loading || saving || conflict || !data || data.canReorder === false;
    const dirty = Boolean(data) && items.map(car => car.id).join(',') !== (data.items || []).map(car => car.id).join(',');
    const move = (from, to) => {
        if (disabled || from === to || !Number.isInteger(to) || to < 0 || to >= items.length) return;
        setItems(previous => { const next = [...previous]; const [car] = next.splice(from, 1); next.splice(to, 0, car); return next; });
        setSaveError('');
    };
    const save = async () => {
        if (disabled || !dirty || saveLock.current) return;
        const current = generation.current;
        saveLock.current = true; setSaving(true); setSaveError('');
        try {
            const response = await fetch(endpoint(), {
                method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ vehicleIds: items.map(car => car.id), expectedRevision: data.revision })
            });
            const result = await response.json().catch(() => ({}));
            if (current !== generation.current) return;
            if (!response.ok) {
                if (response.status === 409) setConflict(true);
                throw new Error(result.message || 'No se pudo guardar el orden del catálogo.');
            }
            setSnapshot({ ...result, token }); setItems(result.items || []);
            toast.success('Orden guardado. La web puede tardar unos segundos en actualizarse.');
            onSaved?.();
        } catch (cause) {
            if (current === generation.current) setSaveError(cause instanceof TypeError ? 'No se pudo confirmar el guardado. Actualizá la lista para comprobar el orden.' : (cause.message || 'No se pudo guardar el orden.'));
        } finally {
            saveLock.current = false;
            if (current === generation.current) setSaving(false);
        }
    };
    return <section className="flex min-w-0 flex-col gap-5" aria-label="Ordenar catálogo" data-catalog-order>
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><ListOrdered size={20}/> Ordenar catálogo</h2><p className="mt-1 text-sm text-crm-fg-muted">Elegí cuál aparece primero, segundo y después. Al guardar, este será el orden inicial del catálogo web.</p></div>
            <CrmButton type="button" variant="secondary" onClick={onClose} disabled={saving}>Volver a fotos y catálogo</CrmButton>
        </div>
        <p className="text-sm text-crm-fg-muted">Se muestran todas las unidades publicadas. Los visitantes también pueden ordenar por precio, año o kilometraje.</p>
        {loading ? <p className="text-sm text-crm-fg-muted" role="status">Cargando el orden del catálogo…</p>
            : loadError ? <div role="alert"><p className="text-red-400">{loadError}</p><CrmButton type="button" variant="secondary" onClick={() => setVersion(value => value + 1)}>Reintentar</CrmButton></div>
            : <>
                {saveError && <div role="alert" className="flex flex-wrap items-center gap-3"><p className="text-red-400">{saveError}</p><CrmButton type="button" variant="secondary" onClick={() => setVersion(value => value + 1)} disabled={saving}>Actualizar lista</CrmButton></div>}
                {!items.length ? <p className="text-sm text-crm-fg-muted">Todavía no hay vehículos publicados para ordenar.</p>
                    : <ol className="flex min-w-0 flex-col gap-3" aria-label="Posiciones del catálogo">{items.map((car, index) => <li key={car.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-crm-border bg-crm-surface p-3" data-catalog-order-vehicle={car.id}>
                        <span className="w-9 shrink-0 text-center text-lg font-bold text-white" aria-label={'Posición ' + (index + 1)}>{index + 1}°</span>
                        {(car.coverImage || car.images?.[0]) && <img src={car.coverImage || car.images[0]} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" style={{ objectPosition: car.imagePosition || '50% 75%' }} loading="lazy"/>}
                        <div className="min-w-0 flex-1 basis-36"><h3 className="break-words text-sm font-semibold text-white">{titleOf(car)}</h3><p className="text-sm text-crm-fg-muted">{car.plateOrVin || 'Sin dominio'}</p></div>
                        <div className="flex flex-wrap items-center gap-2">
                            <CrmButton type="button" variant="secondary" size="sm" onClick={() => move(index, 0)} disabled={disabled || index === 0} aria-label={'Poner primero: ' + titleOf(car)}>Poner primero</CrmButton>
                            <CrmButton type="button" variant="secondary" size="sm" onClick={() => move(index, index - 1)} disabled={disabled || index === 0} aria-label={'Subir: ' + titleOf(car)}>Subir</CrmButton>
                            <CrmButton type="button" variant="secondary" size="sm" onClick={() => move(index, index + 1)} disabled={disabled || index === items.length - 1} aria-label={'Bajar: ' + titleOf(car)}>Bajar</CrmButton>
                        </div>
                        <form key={index} className="flex items-center gap-2" onSubmit={event => { event.preventDefault(); const target = Number(new FormData(event.currentTarget).get('position')) - 1; move(index, target); }}>
                            <label className="flex items-center gap-2 text-sm text-crm-fg-muted">Posición<input type="number" name="position" min={1} max={items.length} step={1} defaultValue={index + 1} required disabled={disabled} aria-label={'Posición de ' + titleOf(car)} className="w-16 rounded-lg border border-crm-border bg-crm-bg px-2 py-1.5 text-white"/></label>
                            <CrmButton type="submit" variant="secondary" size="sm" disabled={disabled}>Mover</CrmButton>
                        </form>
                    </li>)}</ol>}
                <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-crm-border bg-crm-surface p-4">
                    <p className="text-sm text-crm-fg-muted" role="status">{saving ? 'Guardando orden…' : conflict ? 'Actualizá la lista para volver a ordenar.' : dirty ? 'Hay cambios de orden sin guardar.' : 'Orden del catálogo actualizado.'}</p>
                    <CrmButton type="button" onClick={save} disabled={disabled || !dirty}><Save size={16}/>{saving ? 'Guardando…' : 'Guardar orden'}</CrmButton>
                </div>
            </>}
    </section>;
}
