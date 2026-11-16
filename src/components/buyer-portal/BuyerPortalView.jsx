"use client";
import { useRef, useState } from 'react';
import { Camera, CheckCircle2, FileUp, RefreshCw } from 'lucide-react';
import PrivateAttachment from './PrivateAttachment';
import BuyerPortalBrand from './BuyerPortalBrand';
import { documentRequirements, documentStatus, portalDate, prepareBuyerFile, vehicleLabel } from './portalClient';

const input = 'min-h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-red-400 focus:outline-none';
const operationLabels = { borrador: 'Preparando la operación', señado: 'Seña registrada', confirmada: 'Operación confirmada', pendiente_entrega: 'Pendiente de entrega', entregada: 'Vehículo entregado', cancelada: 'Operación cancelada' };
const procedureLabels = { pendiente: 'Pendiente', en_proceso: 'En proceso', observado: 'Con observaciones', listo: 'Listo', transferido: 'Transferido', finalizado: 'Finalizado', entregado: 'Entregado', cancelado: 'Cancelado' };

function UploadForm({ tradeIn, requirement, onUpload, preview }) {
    const requirementKey = requirement.key;
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [description, setDescription] = useState('');
    const [side, setSide] = useState('front');
    const [number, setNumber] = useState('1');
    const [issuedAt, setIssuedAt] = useState('');
    const [replacesId, setReplacesId] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [requestId, setRequestId] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const fileRef = useRef(null);
    const cameraRef = useRef(null);
    const entries = (tradeIn.groups || []).find(group => group.key === requirementKey)?.entries || [];
    const replaced = entries.find(entry => entry.id === replacesId);
    const card = requirementKey === 'registration_cards';
    const generatedDescription = selectedFile?.type === 'application/pdf' ? `${requirement?.label} · PDF completo` : card ? `Cédula ${number} · ${side === 'back' ? 'Dorso' : 'Frente'}` : `${requirement?.label} · Página ${number}`;
    const chooseFile = file => {
        setSelectedFile(file || null);
        setRequestId(file ? crypto.randomUUID() : '');
        if (file) setOptionsOpen(true);
        setMessage('');
        setError('');
    };
    const save = async event => {
        event.preventDefault();
        if (!selectedFile || !onUpload || preview || saving) return;
        setSaving(true); setError(''); setMessage('');
        try {
            const file = await prepareBuyerFile(selectedFile);
            const form = new FormData();
            form.set('file', file);
            form.set('tradeInId', tradeIn.id);
            form.set('requirementKey', requirementKey);
            form.set('description', description.trim() || generatedDescription);
            form.set('side', replaced?.side || (file.type === 'application/pdf' ? 'other' : card ? side : 'page'));
            form.set('slot', replaced?.slot || (file.type === 'application/pdf' ? (card ? `cedula-${number}-complete` : `${requirementKey}-pdf-${number}`) : card ? `cedula-${number}-${side}` : `${requirementKey}-page-${number}`));
            form.set('requestId', requestId);
            if (issuedAt) form.set('issuedAt', issuedAt);
            if (replacesId) form.set('replacesId', replacesId);
            await onUpload(form);
            setMessage(`Carga guardada: ${description.trim() || generatedDescription}.`);
            setSelectedFile(null); setRequestId(''); setDescription(''); setReplacesId('');
            if (fileRef.current) fileRef.current.value = '';
            if (cameraRef.current) cameraRef.current.value = '';
            if (card && side === 'front') setSide('back');
            else { setNumber(String(Number(number) + 1)); if (card) setSide('front'); }
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    };
    return <form onSubmit={save} className="min-w-0 space-y-3 border-t border-neutral-800 pt-3" aria-label={`Cargar ${requirement.label} de ${tradeIn.plate || vehicleLabel(tradeIn)}`} data-upload-requirement={requirementKey}>
        {requirementKey === 'title' && Number(tradeIn.year) < 2016 && <p className="text-sm font-semibold text-amber-200">Por el año de esta unidad, presentá también el título de propiedad original.</p>}
        <fieldset disabled={saving || preview} className="min-w-0 space-y-3 border-0 p-0 disabled:opacity-70">
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => cameraRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-solid border-neutral-600 bg-neutral-800 px-3 text-sm font-semibold text-white hover:bg-neutral-700"><Camera size={17}/>Sacar foto</button>
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-solid border-neutral-600 bg-neutral-800 px-3 text-sm font-semibold text-white hover:bg-neutral-700"><FileUp size={17}/>Galería o PDF</button>
                <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Foto con la cámara" className="sr-only" onChange={event => chooseFile(event.target.files?.[0])} />
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" aria-label="Elegir foto o PDF" className="sr-only" onChange={event => chooseFile(event.target.files?.[0])} />
            </div>
            <p className="break-all text-xs text-neutral-400">{selectedFile ? `Seleccionado: ${selectedFile.name}` : 'Podés cargar fotos o un PDF. Guardá cada archivo por separado; tu avance se conserva.'}</p>
            {!optionsOpen && <button type="button" onClick={() => setOptionsOpen(true)} className="min-h-10 text-left text-xs font-semibold text-neutral-300 underline underline-offset-4">Opciones de carga{entries.some(entry => entry.isCurrent !== false) ? ' o reemplazo' : ''}</button>}
            {optionsOpen && <div className="min-w-0 space-y-3 rounded-xl bg-neutral-900 p-3">
                {entries.some(entry => entry.isCurrent !== false) && <label className="block space-y-1 text-sm text-neutral-300">Nueva foto o reemplazo<select aria-label="Nueva foto o reemplazo" className={input} value={replacesId} onChange={event => { const entry = entries.find(item => item.id === event.target.value); setReplacesId(event.target.value); setDescription(entry?.description || ''); setIssuedAt(entry?.issuedAt?.slice(0, 10) || ''); }}><option value="">Agregar otro archivo</option>{entries.filter(entry => entry.isCurrent !== false).map(entry => <option key={entry.id} value={entry.id}>Reemplazar: {entry.description} ({documentStatus(entry.status)})</option>)}</select></label>}
                {!replacesId && <div className="grid grid-cols-2 gap-3"><label className="block space-y-1 text-sm text-neutral-300">{card ? 'Número de cédula' : 'Número de página o PDF'}<input className={input} type="number" inputMode="numeric" min="1" max="99" required value={number} onChange={event => setNumber(event.target.value)} /></label>{card && <label className="block space-y-1 text-sm text-neutral-300">Lado<select aria-label="Lado" className={input} value={side} onChange={event => setSide(event.target.value)}><option value="front">Frente</option><option value="back">Dorso</option></select></label>}</div>}
                <label className="block space-y-1 text-sm text-neutral-300">Descripción de esta foto o PDF<input className={input} maxLength={180} value={description} placeholder={generatedDescription} onChange={event => setDescription(event.target.value)} /></label>
                {requirement.requiresIssuedAt && <label className="block space-y-1 text-sm text-neutral-300">Fecha de emisión<input className={input} type="date" value={issuedAt} onChange={event => setIssuedAt(event.target.value)} max={new Date().toLocaleDateString('en-CA')} required /></label>}
                <p className="text-xs text-neutral-400">Fotos JPG, PNG o WebP y PDF; máximo 3 MiB luego de preparar la foto.</p>
                <button type="submit" disabled={!selectedFile || saving || preview} className="min-h-11 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Guardando archivo…' : 'Guardar este archivo'}</button>
            </div>}
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    </form>;
}

function RequirementGroup({ tradeIn, requirement, group, requestAccess, onUpload, preview }) {
    const entries = group?.entries || [];
    const current = entries.filter(entry => entry.isCurrent !== false);
    const historical = entries.filter(entry => entry.isCurrent === false);
    const renderEntry = entry => <article key={entry.id} data-document-entry={entry.id} data-document-current={entry.isCurrent !== false} className="min-w-0 space-y-2 rounded-xl border border-neutral-700 bg-neutral-950 p-3">
        <PrivateAttachment entry={entry} requestAccess={requestAccess}/>
        <p className="text-sm font-semibold text-white">{entry.description || entry.fileName}</p>
        <p className="text-xs text-neutral-400">{portalDate(entry.createdAt)} · {entry.origin === 'buyer' ? 'Portal del comprador' : entry.origin} · Versión {entry.version || 1}</p>
        <p className={`text-xs font-semibold ${entry.status === 'correction_requested' ? 'text-amber-200' : entry.status === 'reviewed' ? 'text-emerald-300' : 'text-neutral-300'}`}>{entry.isCurrent === false ? 'Versión anterior' : documentStatus(entry.status)}</p>
        {entry.issuedAt && <p className="text-xs text-neutral-400">Emitido: {new Date(entry.issuedAt).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</p>}
        {entry.correctionReason && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-200">Corregir esta imagen: {entry.correctionReason}</p>}
    </article>;
    return <section className="space-y-3 rounded-2xl border border-neutral-700 p-4" data-requirement={requirement.key}>
        <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="font-bold text-white">{requirement.label}</h4><span className="text-xs text-neutral-300">{group?.complete ? 'Copia digital completa' : current.length ? 'Copia digital recibida' : 'Sin archivos'} · {current.length} {current.length === 1 ? 'archivo' : 'archivos'}</span></div>
        <p className="text-sm text-neutral-400">{requirement.guidance}</p>
        {group?.originalReceived && <p className="text-xs font-semibold text-emerald-300">Original recibido por AutoSporting</p>}
        {current.length > 0 && <div className="grid min-w-0 gap-3 sm:grid-cols-2">{current.map(renderEntry)}</div>}
        <UploadForm tradeIn={tradeIn} requirement={requirement} onUpload={onUpload} preview={preview}/>
        {historical.length > 0 && <details><summary className="cursor-pointer text-sm text-neutral-400">Ver {historical.length} versiones anteriores</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{historical.map(renderEntry)}</div></details>}
    </section>;
}

export default function BuyerPortalView({ data, onUpload, onRefresh, requestAccess, preview = false }) {
    const requirements = data?.requirements?.length ? data.requirements : documentRequirements;
    if (!data) return null;
    return <div className="min-w-0 space-y-5 rounded-2xl bg-neutral-950 p-4 text-white sm:p-6" data-buyer-portal-view>
        <header className="space-y-2 border-b border-neutral-800 pb-5"><BuyerPortalBrand/><h1 className="text-2xl font-extrabold text-white">Tu compra, paso a paso</h1><p className="text-sm text-neutral-400">Consultá el avance de tu operación{data.mode === 'with_trade_in' ? ' y adelantá la documentación del vehículo que entregás' : ''}.</p></header>
        <section className="space-y-4 rounded-2xl border border-neutral-700 bg-neutral-900 p-4" aria-label="Seguimiento de mi compra">
            <div><h2 className="text-lg font-bold text-white">Mi próximo vehículo</h2><p className="mt-2 text-base font-semibold text-white">{vehicleLabel(data.purchasedVehicle)}</p><p className="text-sm text-neutral-400">Patente: {data.purchasedVehicle?.plate || 'Por confirmar'}</p></div>
            <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-xs text-neutral-400">Estado de la operación</dt><dd className="mt-1 text-sm font-semibold text-white">{operationLabels[data.operationStatus] || data.operationStatus || 'Por confirmar'}</dd></div><div><dt className="text-xs text-neutral-400">Estado del trámite</dt><dd className="mt-1 text-sm font-semibold text-white">{procedureLabels[data.procedureStatus] || data.procedureStatus || 'Por confirmar'}</dd></div></dl>
            <div className="space-y-3 border-t border-neutral-700 pt-4"><div><h3 className="text-sm font-semibold text-white">Última novedad</h3><p className="mt-1 whitespace-pre-wrap text-sm text-neutral-300">{data.latestUpdate || 'Todavía no hay una novedad para mostrar.'}</p></div><div><h3 className="text-sm font-semibold text-white">Próximo paso</h3><p className="mt-1 whitespace-pre-wrap text-sm text-neutral-300">{data.nextStep || 'AutoSporting te informará el próximo paso.'}</p></div><p className={`rounded-xl p-3 text-sm ${data.actionRequired ? 'border border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border border-emerald-500/20 bg-emerald-500/5 text-emerald-300'}`}>{data.actionRequired ? 'Tenés una acción pendiente. Revisá el próximo paso indicado arriba.' : 'Por ahora no tenés que realizar ninguna acción adicional.'}</p></div>
            {data.updatedAt && <p className="text-xs text-neutral-500">Actualizado: {portalDate(data.updatedAt)}</p>}
        </section>
        {data.mode === 'with_trade_in' && <section className="space-y-4" aria-label="El vehículo que entrego"><h2 className="text-xl font-bold text-white">El vehículo que entrego</h2>{(data.tradeIns || []).map(tradeIn => <section key={tradeIn.id} className="min-w-0 space-y-4 rounded-2xl border border-neutral-700 p-3 sm:p-4" data-trade-in={tradeIn.id}>
            <header className="space-y-1"><h3 className="text-lg font-bold text-white">{vehicleLabel(tradeIn)}</h3><p className="font-mono text-sm text-neutral-300">Patente: {tradeIn.plate || 'Por confirmar'}</p><p className="text-sm text-neutral-400">{(tradeIn.groups || []).filter(group => group.complete).length} de 6 requisitos con copia digital completa</p></header>
            {preview && <p className="rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-sm text-neutral-300">Vista previa: el comprador podrá cargar fotos y PDF en cada requisito después de verificar su identidad.</p>}
            <div className="space-y-3">{requirements.map(requirement => <RequirementGroup key={requirement.key} tradeIn={tradeIn} onUpload={onUpload} preview={preview} requirement={requirement} group={(tradeIn.groups || []).find(group => group.key === requirement.key)} requestAccess={requestAccess}/>)}</div>
        </section>)}{!data.tradeIns?.length && <p className="rounded-xl border border-amber-500/30 p-4 text-sm text-amber-200">AutoSporting está completando la identificación del vehículo que entregás.</p>}</section>}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-4 text-xs text-neutral-400"><span className="inline-flex items-center gap-2"><CheckCircle2 size={15}/>Tu información se conserva de forma privada.</span>{onRefresh && <button type="button" onClick={onRefresh} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-700 px-3 text-sm text-neutral-300"><RefreshCw size={14}/>Actualizar avance</button>}</footer>
    </div>;
}
