"use client";
import { useImperativeHandle, useRef, useState } from 'react';
import { Camera, CarFront, FileUp, RefreshCw, Replace, Trash2 } from 'lucide-react';
import PrivateAttachment from './PrivateAttachment';
import BuyerPortalBrand from './BuyerPortalBrand';
import BuyerProcedureTimeline from './BuyerProcedureTimeline';
import styles from './BuyerPortalView.module.css';
import { documentRequirements, documentStatus, portalDate, prepareBuyerFile, vehicleLabel } from './portalClient';

const input = `${styles.uploadInput} min-h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-red-400 focus:outline-none`;
const operationLabels = { borrador: 'Preparando la operación', señado: 'Seña registrada', confirmada: 'Operación confirmada', pendiente_entrega: 'Pendiente de entrega', entregada: 'Vehículo entregado', cancelada: 'Operación cancelada' };
const procedureLabels = { pendiente: 'Pendiente', en_proceso: 'En proceso', observado: 'Con observaciones', listo: 'Listo', transferido: 'Transferido', finalizado: 'Finalizado', entregado: 'Entregado', cancelado: 'Cancelado' };

function VehiclePhoto({ vehicle }) {
    const [failedSource, setFailedSource] = useState('');
    const source = vehicle?.image;
    return <div className={`${styles.vehiclePhoto} flex min-h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-950`} data-portal-vehicle-photo>
        {source && source !== failedSource ? <img src={source} alt={`Foto de ${vehicleLabel(vehicle)}`} referrerPolicy="no-referrer" className="block h-auto max-h-[26rem] w-full object-contain" onError={() => setFailedSource(source)} /> : <div className="flex flex-col items-center gap-2 p-4 text-center text-neutral-500"><CarFront size={36} aria-hidden="true"/><p className="text-xs">Foto del vehículo no disponible</p></div>}
    </div>;
}

function nextUploadPosition(entries, key) {
    const current = entries.filter(entry => entry.isCurrent !== false);
    for (let number = 1; number <= 99; number++) {
        if (key === 'registration_cards') {
            if (current.some(entry => entry.slot === `cedula-${number}-complete`)) continue;
            if (!current.some(entry => entry.slot === `cedula-${number}-front`)) return { number: String(number), side: 'front' };
            if (!current.some(entry => entry.slot === `cedula-${number}-back`)) return { number: String(number), side: 'back' };
        } else if (!current.some(entry => entry.slot === `${key}-page-${number}` || entry.slot === `${key}-pdf-${number}`)) return { number: String(number), side: 'front' };
    }
    return { number: '99', side: 'front' };
}

function UploadForm({ tradeIn, requirement, onUpload, preview, controlsRef, busy, onBusyChange }) {
    const requirementKey = requirement.key;
    const entries = (tradeIn.groups || []).find(group => group.key === requirementKey)?.entries || [];
    const next = nextUploadPosition(entries, requirementKey);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [side, setSide] = useState(next.side);
    const [number, setNumber] = useState(next.number);
    const [replacesId, setReplacesId] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [requestId, setRequestId] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const fileRef = useRef(null);
    const cameraRef = useRef(null);
    const replaced = entries.find(entry => entry.id === replacesId);
    const card = requirementKey === 'registration_cards';
    const convertsCardPdf = card && replaced?.mimeType === 'application/pdf' && replaced?.side === 'other' && selectedFile && selectedFile.type !== 'application/pdf';
    const targetNumber = replaced?.slot?.match(/^cedula-(\d+)-/)?.[1] || number;
    const targetSide = convertsCardPdf ? side : replaced?.side || (selectedFile?.type === 'application/pdf' ? 'other' : card ? side : 'page');
    const generatedDescription = selectedFile?.type === 'application/pdf' ? `${requirement.label} · PDF completo` : card ? `Cédula ${targetNumber} · ${targetSide === 'back' ? 'Dorso' : 'Frente'}` : `${requirement.label} · Página ${replaced?.slot?.match(/-(\d+)$/)?.[1] || number}`;
    const chooseFile = file => {
        setSelectedFile(file || null);
        setRequestId(file ? crypto.randomUUID() : '');
        if (file) setOptionsOpen(true);
        setMessage('');
        setError('');
    };
    useImperativeHandle(controlsRef, () => ({ replace(entry) {
        if (saving || busy || preview) return;
        setReplacesId(entry.id); setSide(['front', 'back'].includes(entry.side) ? entry.side : 'front');
        setOptionsOpen(true); chooseFile(null);
        if (fileRef.current) { fileRef.current.value = ''; fileRef.current.click(); }
    }, clearReplacement(id) {
        if (replacesId !== id) return;
        setReplacesId(''); chooseFile(null); setNumber(next.number); setSide(next.side);
    } }));
    const save = async event => {
        event.preventDefault();
        if (!selectedFile || !onUpload || preview || saving || busy) return;
        setSaving(true); onBusyChange?.(true); setError(''); setMessage('');
        try {
            const file = await prepareBuyerFile(selectedFile);
            const form = new FormData();
            form.set('file', file);
            form.set('tradeInId', tradeIn.id);
            form.set('requirementKey', requirementKey);
            form.set('description', generatedDescription);
            form.set('side', targetSide);
            form.set('slot', convertsCardPdf ? `cedula-${targetNumber}-${side}` : replaced?.slot || (file.type === 'application/pdf' ? (card ? `cedula-${number}-complete` : `${requirementKey}-pdf-${number}`) : card ? `cedula-${number}-${side}` : `${requirementKey}-page-${number}`));
            form.set('requestId', requestId);
            if (replacesId) form.set('replacesId', replacesId);
            await onUpload(form);
            setMessage('Carga guardada: archivo recibido.');
            setSelectedFile(null); setRequestId(''); setReplacesId('');
            if (fileRef.current) fileRef.current.value = '';
            if (cameraRef.current) cameraRef.current.value = '';
            const following = nextUploadPosition([...entries.filter(entry => entry.id !== replacesId), { slot: form.get('slot'), isCurrent: true }], requirementKey);
            setNumber(following.number); setSide(following.side);
        } catch (err) { setError(err.message); }
        finally { setSaving(false); onBusyChange?.(false); }
    };
    return <form onSubmit={save} className={`${styles.uploadForm} min-w-0 space-y-3 border-t border-neutral-800 pt-3`} aria-label={`Cargar ${requirement.label} de ${tradeIn.plate || vehicleLabel(tradeIn)}`} data-upload-requirement={requirementKey}>
        <fieldset disabled={saving || busy || preview} className="min-w-0 space-y-3 border-0 p-0 disabled:opacity-70">
            {replaced && <p className={styles.editNotice} role="status">Reemplazando: {attachmentLabel(replaced, requirementKey, entries.indexOf(replaced))}. Elegí la nueva foto o PDF; el archivo actual se conserva hasta guardar el reemplazo.</p>}
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => cameraRef.current?.click()} className={`${styles.uploadButton} inline-flex min-h-11 items-center gap-2 rounded-xl border border-solid border-neutral-600 bg-neutral-800 px-3 text-sm font-semibold text-white hover:bg-neutral-700`}><Camera size={17}/>Sacar foto</button>
                <button type="button" onClick={() => fileRef.current?.click()} className={`${styles.uploadButton} inline-flex min-h-11 items-center gap-2 rounded-xl border border-solid border-neutral-600 bg-neutral-800 px-3 text-sm font-semibold text-white hover:bg-neutral-700`}><FileUp size={17}/>Galería o PDF</button>
                <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Foto con la cámara" className="sr-only" onChange={event => chooseFile(event.target.files?.[0])} />
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" aria-label="Elegir foto o PDF" className="sr-only" onChange={event => chooseFile(event.target.files?.[0])} />
            </div>
            <p className="break-all text-xs text-neutral-400">{selectedFile ? `Seleccionado: ${selectedFile.name}` : 'Podés cargar fotos o un PDF. Guardá cada archivo por separado; tu avance se conserva.'}</p>
            {!optionsOpen && <button type="button" onClick={() => setOptionsOpen(true)} className="min-h-10 text-left text-xs font-semibold text-neutral-300 underline underline-offset-4">Opciones de carga{entries.some(entry => entry.isCurrent !== false) ? ' o reemplazo' : ''}</button>}
            {optionsOpen && <div className={`${styles.uploadOptions} min-w-0 space-y-3 rounded-xl bg-neutral-900 p-3`}>
                {entries.some(entry => entry.isCurrent !== false) && <label className="block space-y-1 text-sm text-neutral-300">Nueva foto o reemplazo<select aria-label="Nueva foto o reemplazo" className={input} value={replacesId} onChange={event => { setReplacesId(event.target.value); setRequestId(selectedFile ? crypto.randomUUID() : ''); if (!event.target.value) { setNumber(next.number); setSide(next.side); } }}><option value="">Agregar otro archivo</option>{entries.filter(entry => entry.isCurrent !== false).map((entry, index) => <option key={entry.id} value={entry.id}>Reemplazar: {attachmentLabel(entry, requirementKey, index)} ({documentStatus(entry.status)})</option>)}</select></label>}
                {convertsCardPdf && <label className="block space-y-1 text-sm text-neutral-300">Lado de la nueva foto<select aria-label="Lado de la nueva foto" className={input} value={side} onChange={event => { setSide(event.target.value); setRequestId(crypto.randomUUID()); }}><option value="front">Frente</option><option value="back">Dorso</option></select></label>}
                {!replacesId && <div className={`${styles.slotFields} ${card ? 'grid grid-cols-2 gap-3' : 'grid gap-3'}`}><label className="block space-y-1 text-sm text-neutral-300">{card ? 'Número de cédula' : 'Número de página o PDF'}<input className={input} type="number" inputMode="numeric" min="1" max="99" required value={number} onChange={event => setNumber(event.target.value)} /></label>{card && <label className="block space-y-1 text-sm text-neutral-300">Lado<select aria-label="Lado" className={input} value={side} onChange={event => setSide(event.target.value)}><option value="front">Frente</option><option value="back">Dorso</option></select></label>}</div>}
                <p className="text-xs text-neutral-400">Fotos JPG, PNG o WebP y PDF; máximo 3 MiB luego de preparar la foto.</p>
                <div className="flex flex-wrap gap-2"><button type="submit" disabled={!selectedFile || saving || preview} className={`${styles.saveButton} min-h-11 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50`}>{saving ? 'Guardando archivo…' : replacesId ? 'Guardar reemplazo' : 'Guardar este archivo'}</button>{replacesId && <button type="button" className={styles.documentAction} onClick={() => { setReplacesId(''); chooseFile(null); setNumber(next.number); setSide(next.side); if (fileRef.current) fileRef.current.value = ''; if (cameraRef.current) cameraRef.current.value = ''; }}>Cancelar reemplazo</button>}</div>
            </div>}
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    </form>;
}

function attachmentLabel(entry, requirementKey, index) {
    const card = String(entry.slot || '').match(/^cedula-(\d+)-(front|back|complete)$/);
    if (requirementKey === 'registration_cards' && card) return `Cédula ${card[1]} · ${card[2] === 'back' ? 'Dorso' : card[2] === 'front' ? 'Frente' : 'PDF completo'}`;
    const number = String(entry.slot || '').match(/-(?:page|pdf)-(\d+)$/)?.[1] || index + 1;
    return entry.mimeType === 'application/pdf' ? `PDF ${number}` : `Página ${number}`;
}

function DocumentActions({ entry, label, busy, preview, onReplace, onRemove }) {
    const [confirming, setConfirming] = useState(false);
    return <div className="space-y-2" data-buyer-document-actions>
        <div className="flex flex-wrap gap-2"><button type="button" className={styles.documentAction} disabled={busy || preview} onClick={onReplace}><Replace size={15}/>Reemplazar archivo</button><button type="button" className={`${styles.documentAction} ${styles.removeAction}`} disabled={busy || preview} onClick={() => setConfirming(true)}><Trash2 size={15}/>Quitar archivo</button></div>
        {confirming && <div className={styles.removeConfirmation} role="group" aria-label={`Confirmar eliminación de ${label}`}>
            <p className="text-sm">¿Querés quitar {label}? Dejará de estar disponible en el portal y podrás cargar otro archivo.</p>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={`${styles.documentAction} ${styles.removeAction}`} disabled={busy} onClick={() => { void onRemove(entry).catch(() => {}); }}>{busy ? 'Quitando archivo…' : 'Confirmar eliminación'}</button><button type="button" className={styles.documentAction} disabled={busy} onClick={() => setConfirming(false)}>Cancelar</button></div>
        </div>}
    </div>;
}

function RequirementGroup({ tradeIn, requirement, group, requestAccess, onUpload, onRemove, preview, step }) {
    const controlsRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [removeError, setRemoveError] = useState('');
    const remove = async entry => {
        if (busy || preview || !onRemove) return;
        setBusy(true); setNotice(''); setRemoveError('');
        try {
            await onRemove(entry.id);
            controlsRef.current?.clearReplacement(entry.id);
            setNotice('Archivo quitado. Podés cargar el correcto cuando quieras.');
        } catch (error) { setRemoveError(error.message || 'No se pudo quitar el archivo. Reintentá.'); throw error; }
        finally { setBusy(false); }
    };
    const entries = group?.entries || [];
    const current = entries.filter(entry => entry.isCurrent !== false);
    const historical = entries.filter(entry => entry.isCurrent === false);
    const renderEntry = (entry, index) => <article key={entry.id} data-document-entry={entry.id} data-document-current={entry.isCurrent !== false} className={`${styles.attachment} min-w-0 space-y-2 rounded-xl border border-neutral-700 bg-neutral-950 p-3`}>
        <PrivateAttachment entry={{ ...entry, description: attachmentLabel(entry, requirement.key, index) }} requestAccess={requestAccess}/>
        <p className="text-sm font-semibold text-white">{attachmentLabel(entry, requirement.key, index)}</p>
        <p className="text-xs text-neutral-400">{portalDate(entry.createdAt)} · {entry.origin === 'buyer' ? 'Portal del comprador' : entry.origin} · Versión {entry.version || 1}</p>
        <p className={`text-xs font-semibold ${entry.status === 'correction_requested' ? 'text-amber-200' : entry.status === 'reviewed' ? 'text-emerald-300' : 'text-neutral-300'}`}>{entry.isCurrent === false ? 'Versión anterior' : documentStatus(entry.status)}</p>
        {entry.correctionReason && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-200">Corregir esta imagen: {entry.correctionReason}</p>}
        {entry.isCurrent !== false && entry.origin === 'buyer' && (preview || onUpload && onRemove) && <DocumentActions entry={entry} label={attachmentLabel(entry, requirement.key, index)} busy={busy} preview={preview} onReplace={() => controlsRef.current?.replace(entry)} onRemove={remove}/>}
    </article>;
    return <section className={`${styles.requirement} space-y-3 rounded-2xl border border-neutral-700 p-4`} data-requirement={requirement.key} data-portal-step={step}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div className={styles.requirementHeading}><span className={styles.stepNumber} aria-hidden="true">{String(step).padStart(2, '0')}</span><h4 className="font-bold text-white">{requirement.label}</h4></div><span className={`${styles.requirementStatus} text-xs text-neutral-300`}>{group?.complete ? 'Copia digital completa' : current.length ? 'Copia digital recibida' : 'Sin archivos'} · {current.length} {current.length === 1 ? 'archivo' : 'archivos'}</span></div>
        {group?.originalReceived && <p className="text-xs font-semibold text-emerald-300">Original recibido por AutoSporting</p>}
        {current.length > 0 && <div className="grid min-w-0 gap-3 sm:grid-cols-2">{current.map(renderEntry)}</div>}
        {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
        {removeError && <p role="alert" className="text-sm text-red-300">{removeError}</p>}
        <UploadForm tradeIn={tradeIn} requirement={requirement} onUpload={onUpload} preview={preview} controlsRef={controlsRef} busy={busy} onBusyChange={setBusy}/>
        {historical.length > 0 && <details><summary className="cursor-pointer text-sm text-neutral-400">Ver {historical.length} versiones anteriores</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{historical.map(renderEntry)}</div></details>}
    </section>;
}

export default function BuyerPortalView({ data, onUpload, onRemove, onRefresh, requestAccess, preview = false, children }) {
    const requirements = data?.requirements?.length ? data.requirements : documentRequirements;
    if (!data) return null;
    const procedures = data.procedures?.length ? data.procedures : [{ id: 'commercial', type: 'Trámite de tu vehículo', status: data.procedureStatus }];
    const firstName = typeof data.buyerFirstName === 'string' ? data.buyerFirstName.trim() : '';
    const purchasedName = [data.purchasedVehicle?.brand, data.purchasedVehicle?.model || data.purchasedVehicle?.name].filter(Boolean).join(' ') || 'vehículo';
    const hasDocuments = (data.tradeIns || []).some(vehicle => (vehicle.groups || []).some(group => (group.entries || []).some(entry => entry.isCurrent !== false)));
    return <div className={`${styles.view} min-w-0 space-y-5 rounded-2xl p-4 text-white uppercase sm:p-6 [&_button]:uppercase [&_select]:uppercase`} data-buyer-portal-view data-portal-theme="autosporting-graphite">
        <header className={`${styles.intro} space-y-2 border-b border-neutral-800 pb-5`} data-portal-intro data-portal-welcome>
            <BuyerPortalBrand/>
            <h1 className={`${styles.greeting} text-2xl font-extrabold text-white`}>{firstName ? `¡Hola, ${firstName}!` : '¡Hola!'}</h1>
            <p className={`${styles.welcomeCopy} text-sm text-neutral-400`}>Gracias por elegir AutoSporting. Acá podés seguir la compra de tu <strong className="font-semibold text-white">{purchasedName}</strong> y ver cuál es el próximo paso para la entrega.</p>
            {data.mode === 'with_trade_in' && <a href="#documentacion-vehiculo-entregado" className={styles.documentationLink} data-portal-documentation-link>{hasDocuments ? 'Ver documentación cargada' : 'Cargá la documentación del vehículo que entregás'}</a>}
        </header>
        <section className={`${styles.purchase} space-y-4 rounded-2xl border border-neutral-700 bg-neutral-900 p-4`} aria-label="Seguimiento de mi compra" data-portal-purchase>
            <VehiclePhoto vehicle={data.purchasedVehicle}/>
            <div><h2 className="text-lg font-bold text-white">Mi próximo vehículo</h2><p className="mt-2 text-base font-semibold text-white">{vehicleLabel(data.purchasedVehicle)}</p><p className="text-sm text-neutral-400">Patente: {data.purchasedVehicle?.plate || 'Por confirmar'}</p></div>
            <dl className="grid gap-4 sm:grid-cols-2"><div className={styles.statusTile}><dt className="text-xs text-neutral-400">Estado de la operación</dt><dd className="mt-1 text-sm font-semibold text-white">{operationLabels[data.operationStatus] || data.operationStatus || 'Por confirmar'}</dd></div><div className={styles.statusTile}><dt className="text-xs text-neutral-400">Estado del trámite</dt><dd className="mt-1 text-sm font-semibold text-white">{procedureLabels[data.procedureStatus] || data.procedureStatus || 'Por confirmar'}</dd></div></dl>
            <div className="min-w-0 space-y-3">{procedures.map((procedure, index) => <BuyerProcedureTimeline key={procedure.id || index} procedure={procedure}/>)}</div>
            <div className={`${styles.updates} space-y-3 border-t border-neutral-700 pt-4`}><div className={styles.updateItem}><h3 className="text-sm font-semibold text-white">Última novedad</h3><p className="mt-1 whitespace-pre-wrap text-sm text-neutral-300">{data.latestUpdate || 'Todavía no hay una novedad para mostrar.'}</p></div><div className={styles.updateItem}><h3 className="text-sm font-semibold text-white">Próximo paso</h3><p className="mt-1 whitespace-pre-wrap text-sm text-neutral-300">{data.nextStep || 'AutoSporting te informará el próximo paso.'}</p></div><p className={`rounded-xl p-3 text-sm ${data.actionRequired ? 'border border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border border-emerald-500/20 bg-emerald-500/5 text-emerald-300'}`}>{data.actionRequired ? 'Tenés una acción pendiente. Revisá el próximo paso indicado arriba.' : 'Por ahora no tenés que realizar ninguna acción adicional.'}</p></div>
            {data.updatedAt && <p className="text-xs text-neutral-500">Actualizado: {portalDate(data.updatedAt)}</p>}
        </section>
        {children}
        {data.mode === 'with_trade_in' && <section id="documentacion-vehiculo-entregado" tabIndex={-1} className={`${styles.documents} space-y-4`} aria-label="El vehículo que entrego"><h2 className="text-xl font-bold text-white">El vehículo que entrego</h2>{(data.tradeIns || []).map(tradeIn => <section key={tradeIn.id} className={`${styles.tradeIn} min-w-0 space-y-4 rounded-2xl border border-neutral-700 p-3 sm:p-4`} data-trade-in={tradeIn.id}>
            <header className="space-y-1"><h3 className="text-lg font-bold text-white">{vehicleLabel(tradeIn)}</h3><p className="font-mono text-sm text-neutral-300">Patente: {tradeIn.plate || 'Por confirmar'}</p><p className="text-sm text-neutral-400">{(tradeIn.groups || []).filter(group => group.complete).length} de 6 requisitos con copia digital completa</p></header>
            {preview && <p className="rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-sm text-neutral-300">Vista previa: el comprador podrá cargar fotos y PDF en cada requisito después de verificar su identidad.</p>}
            <div className="space-y-3">{requirements.map((requirement, index) => <RequirementGroup key={requirement.key} step={index + 1} tradeIn={tradeIn} onUpload={onUpload} onRemove={onRemove} preview={preview} requirement={requirement} group={(tradeIn.groups || []).find(group => group.key === requirement.key)} requestAccess={requestAccess}/>)}</div>
        </section>)}{!data.tradeIns?.length && <p className="rounded-xl border border-amber-500/30 p-4 text-sm text-amber-200">AutoSporting está completando la identificación del vehículo que entregás.</p>}</section>}
        {onRefresh && <footer className={`${styles.footer} flex flex-wrap items-center gap-3 border-t border-neutral-800 pt-4 text-xs text-neutral-400`}><button type="button" onClick={onRefresh} className={`${styles.refreshButton} inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-700 px-3 text-sm text-neutral-300`}><RefreshCw size={14}/>Actualizar avance</button></footer>}
    </div>;
}
