"use client";
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';
import CrmModal from '../ui/CrmModal';

export default function VehicleGallery({ vehicle, canEdit, onEdit }) {
    const photos = vehicle.fotos || [];
    const [index, setIndex] = useState(0), [full, setFull] = useState(false);
    const source = vehicle._original || {};
    const selectedIndex = Math.min(index, Math.max(0, photos.length - 1));
    const selected = photos[selectedIndex];
    useEffect(() => { setIndex(0); setFull(false); }, [vehicle.id]);
    const position = source.imagePositions?.[selectedIndex] || (selectedIndex === 0 ? source.imagePosition : null) || '50% 75%';
    const move = offset => setIndex(current => (current + offset + photos.length) % photos.length);
    return <section className="overflow-hidden rounded-xl border border-crm-border bg-crm-surface" aria-label="Galería de la unidad">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-crm-border px-3 py-2"><h3 className="m-0 flex items-center gap-1.5 text-xs font-semibold text-crm-fg"><Images size={14} />Fotos · {photos.length}</h3>{canEdit && <button type="button" onClick={onEdit} className="min-h-8 rounded-lg border border-crm-border px-2.5 text-xs text-crm-fg">{photos.length ? 'Editar fotos' : 'Agregar fotos'}</button>}</div>
        {selected ? <><button type="button" onClick={() => setFull(true)} aria-label={`Ampliar foto ${selectedIndex + 1} de ${vehicle.marca} ${vehicle.modelo}`} className="block aspect-[4/3] w-full overflow-hidden bg-crm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-crm-red"><img src={selected} alt={`${vehicle.marca} ${vehicle.modelo} · Foto ${selectedIndex + 1}`} className="h-full w-full object-cover" style={{ objectPosition: position }} /></button>{photos.length > 1 && <div className="flex items-center gap-2 border-t border-crm-border p-2"><button type="button" onClick={() => move(-1)} aria-label="Foto anterior" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-crm-border text-crm-fg"><ChevronLeft size={15} /></button><div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">{photos.map((url, photoIndex) => <button key={`${url}:${photoIndex}`} type="button" aria-label={`Ver foto ${photoIndex + 1}`} aria-pressed={selectedIndex === photoIndex} onClick={() => setIndex(photoIndex)} className={`h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 ${selectedIndex === photoIndex ? 'border-crm-red' : 'border-transparent'}`}><img src={url} alt="" className="h-full w-full object-cover" style={{ objectPosition: source.imagePositions?.[photoIndex] || '50% 75%' }} /></button>)}</div><button type="button" onClick={() => move(1)} aria-label="Foto siguiente" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-crm-border text-crm-fg"><ChevronRight size={15} /></button></div>}</> : <div className="flex aspect-[4/3] items-center justify-center bg-crm-bg text-xs text-crm-fg-muted">Sin fotos registradas</div>}
        <CrmModal isOpen={full && Boolean(selected)} onClose={() => setFull(false)} title={`${vehicle.marca} ${vehicle.modelo} · Foto ${selectedIndex + 1} de ${photos.length}`} maxWidth="max-w-5xl" footer={photos.length > 1 && <div className="flex items-center justify-between gap-3"><button type="button" onClick={() => move(-1)} className="min-h-8 rounded-lg border border-crm-border px-3 text-xs text-crm-fg">Anterior</button><span className="text-xs text-crm-fg-muted">{selectedIndex + 1} / {photos.length}</span><button type="button" onClick={() => move(1)} className="min-h-8 rounded-lg border border-crm-border px-3 text-xs text-crm-fg">Siguiente</button></div>}><img src={selected} alt={`${vehicle.marca} ${vehicle.modelo} · Foto ${selectedIndex + 1}`} className="max-h-[70dvh] w-full object-contain" /></CrmModal>
    </section>;
}
