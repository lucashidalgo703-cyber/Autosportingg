"use client";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Camera, FileUp, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { downloadPortalFile, portalDate, portalRequest, prepareBuyerFile, uploadPortalFile } from './portalClient';
import BuyerPortalFileActions from './BuyerPortalFileActions';
import styles from './BuyerDeliveryDocumentsPanel.module.css';

const types = { title: 'Título del automotor a nombre del comprador', registration_front: 'Cédula del comprador · Frente', registration_back: 'Cédula del comprador · Dorso', transfer_certificate: 'Constancia de transferencia', other: 'Otros documentos' };
const states = { draft: 'En preparación', published: 'Disponible para descargar', withdrawn: 'Retirado del portal' };

export default function BuyerDeliveryDocumentsPanel({ saleId }) {
    const { token } = useAuth();
    return <DeliveryDocumentsPanel key={`${saleId}:${token}`} saleId={saleId} token={token}/>;
}

function DeliveryDocumentsPanel({ saleId, token }) {
    const headingId = useId(), gallery = useRef(null), camera = useRef(null);
    const [snapshot, setSnapshot] = useState(null), [loading, setLoading] = useState(false), [busy, setBusy] = useState('');
    const [error, setError] = useState(''), [notice, setNotice] = useState('');
    const [type, setType] = useState('title'), [description, setDescription] = useState('');
    const [selected, setSelected] = useState(null), [requestId, setRequestId] = useState(''), [replacement, setReplacement] = useState(null);
    const [uploadIntent, setUploadIntent] = useState(null), [progress, setProgress] = useState(0);
    const [publishIntent, setPublishIntent] = useState(null), [recipientChecked, setRecipientChecked] = useState(false);
    const base = '/api/admin/buyer-portal/sales/' + encodeURIComponent(saleId || '') + '/delivery-documents';
    const data = snapshot?.saleId === saleId && snapshot?.token === token ? snapshot.data : null;
    const load = useCallback(async () => {
        if (!saleId || !token) return;
        setLoading(true);
        try { const result = await portalRequest(base, { token }); setSnapshot({ saleId, token, data: result }); return result; }
        finally { setLoading(false); }
    }, [base, saleId, token]);
    useEffect(() => { let active = true; void load().catch(err => { if (active) setError(err.message); }); return () => { active = false; }; }, [load]);
    const access = useCallback(entry => portalRequest('/api/admin/buyer-portal/delivery-documents/' + entry.id + '/access', { token, method: 'POST', body: {} }), [token]);
    const download = useCallback(async entry => {
        const result = await portalRequest('/api/admin/buyer-portal/delivery-documents/' + entry.id + '/access', { token, method: 'POST', body: { download: true } });
        await downloadPortalFile(result, { fileName: entry.fileName });
    }, [token]);
    const choose = file => { if (uploadIntent || busy) return; setSelected(file || null); setRequestId(file ? crypto.randomUUID() : ''); setError(''); setNotice(''); };
    const resetUpload = () => { setSelected(null); setRequestId(''); setReplacement(null); setDescription(''); setUploadIntent(null); if (gallery.current) gallery.current.value = ''; if (camera.current) camera.current.value = ''; };
    const upload = async event => {
        event.preventDefault(); if (busy || !data?.canWrite || !selected && !uploadIntent) return;
        setBusy('upload'); setError(''); setNotice('');
        try {
            let intent = uploadIntent;
            if (!intent) { intent = { file: await prepareBuyerFile(selected), type, description, requestId, replacesId: replacement?.id || '' }; setUploadIntent(intent); }
            const form = new FormData(); form.set('file', intent.file); form.set('requestId', intent.requestId); form.set('type', intent.type); form.set('description', intent.description);
            if (intent.replacesId) form.set('replacesId', intent.replacesId);
            await uploadPortalFile(base, form, { token, onProgress: setProgress });
            await load(); resetUpload(); setNotice('Archivo guardado en preparación. Revisá el destinatario y publicalo cuando esté listo.');
        } catch (err) { if (err.status >= 400 && err.status < 500) setUploadIntent(null); setError(err.message); }
        finally { setBusy(''); }
    };
    const mutate = async (doc, action, body) => {
        if (busy) return;
        setBusy(doc.id); setError(''); setNotice('');
        try {
            await portalRequest('/api/admin/buyer-portal/delivery-documents/' + doc.id + (action === 'edit' ? '' : '/' + action), { token, method: action === 'edit' ? 'PATCH' : 'POST', body });
            await load(); setPublishIntent(null); setRecipientChecked(false);
            setNotice(action === 'publish' ? 'Documento publicado en el portal del cliente.' : action === 'withdraw' ? 'Documento retirado del portal. Sus enlaces anteriores dejaron de estar disponibles.' : 'Descripción actualizada.');
        } catch (err) { setError(err.message); if (err.status === 409) { setPublishIntent(null); setRecipientChecked(false); await load().catch(() => {}); } }
        finally { setBusy(''); }
    };
    const replace = doc => { if (busy || uploadIntent) return; setReplacement(doc); setType(doc.type); setDescription(doc.description || ''); setSelected(null); setRequestId(''); setNotice(''); gallery.current.value = ''; gallery.current.click(); };
    return <section className={styles.panel} aria-labelledby={headingId} data-buyer-delivery-admin>
        <header className={styles.header}><div><h2 id={headingId}>Documentación para el comprador</h2><p className={styles.muted}>Documentos del vehículo vendido. Se muestran al cliente después de publicarlos.</p></div><button type="button" className={styles.button} disabled={loading || Boolean(busy)} onClick={() => { setError(''); void load().catch(err => setError(err.message)); }}><RefreshCw size={16}/>Actualizar</button></header>
        {error && <p role="alert" className={styles.error}>{error}</p>}{notice && <p role="status" className={styles.success}>{notice}</p>}
        {loading && !data && <p role="status" className={styles.muted}>Cargando documentos privados…</p>}
        {data && <>
            <div className={styles.recipient} data-delivery-recipient><strong>Destinatario de la documentación</strong><p>Comprador: {data.recipient.name}</p><p>Vehículo: {data.recipient.vehicle}</p><p>Patente: {data.recipient.plate}</p></div>
            {data.canWrite && <form className={styles.form} onSubmit={upload} aria-label="Cargar documentación para el comprador">
                {replacement && <p className={styles.muted}>Reemplazando {types[replacement.type]}. La versión anterior se retira al guardar; la nueva queda en preparación hasta que la publiques.</p>}
                <label>Tipo de documento<select className={styles.field} disabled={Boolean(busy) || Boolean(uploadIntent)} value={type} onChange={event => { setType(event.target.value); if (selected) setRequestId(crypto.randomUUID()); }}>{Object.entries(types).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                <label>Descripción{type === 'other' ? ' (obligatoria)' : ' (opcional)'}<textarea className={styles.field} value={description} maxLength={500} minLength={type === 'other' ? 3 : undefined} required={type === 'other'} disabled={Boolean(busy) || Boolean(uploadIntent)} onChange={event => { setDescription(event.target.value); if (selected) setRequestId(crypto.randomUUID()); }}/></label>
                <div className={styles.actions}><button type="button" className={styles.button} disabled={Boolean(busy) || Boolean(uploadIntent)} onClick={() => camera.current.click()}><Camera size={17}/>Sacar foto</button><button type="button" className={styles.button} disabled={Boolean(busy) || Boolean(uploadIntent)} onClick={() => gallery.current.click()}><FileUp size={17}/>Galería o PDF</button></div>
                <input ref={camera} type="file" className={styles.hidden} accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Foto de documentación para comprador" onChange={event => choose(event.target.files?.[0])}/>
                <input ref={gallery} type="file" className={styles.hidden} accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" aria-label="Archivo de documentación para comprador" onChange={event => choose(event.target.files?.[0])}/>
                <p className={styles.muted}>{selected?.name || 'Elegí una imagen o un PDF. Se guarda en forma privada.'}</p>
                {busy === 'upload' && <div role="status"><progress className={styles.progress} value={progress} max={100}/><p className={styles.muted}>{progress < 100 ? `Subiendo archivo: ${progress}%` : 'Guardando archivo…'}</p></div>}
                <div className={styles.actions}><button type="submit" className={`${styles.button} ${styles.primary}`} disabled={Boolean(busy) || !selected && !uploadIntent}>{uploadIntent && !busy ? 'Reintentar la misma carga' : 'Guardar en preparación'}</button>{replacement && !uploadIntent && <button type="button" className={styles.button} disabled={Boolean(busy)} onClick={resetUpload}>Cancelar reemplazo</button>}</div>
            </form>}
            {!data.documents.length && <p className={styles.muted}>Todavía no hay documentos cargados para este comprador.</p>}
            <div className={styles.list}>{data.documents.map(doc => <article className={styles.card} key={doc.id} data-delivery-document={doc.id}>
                <div className={styles.heading}><h3>{types[doc.type] || doc.label}</h3><span className={styles.badge}>{states[doc.state] || 'En preparación'}</span></div>
                <p className={styles.muted}>Cargado: {portalDate(doc.createdAt)} · Versión {doc.version}</p>{doc.description && <p>{doc.description}</p>}
                {doc.recipientMismatch && <p className={styles.error}>El comprador o el vehículo de esta operación cambió. Cargá el documento para el destinatario actual antes de publicarlo.</p>}
                <BuyerPortalFileActions key={`${doc.id}:${doc.revision}`} entry={doc} requestAccess={access} requestDownload={download} disabled={Boolean(busy)}/>
                {data.canWrite && <><div className={styles.actions}><button type="button" className={styles.button} disabled={Boolean(busy) || Boolean(uploadIntent)} onClick={() => replace(doc)}>Reemplazar archivo</button>{doc.state === 'published' ? <button type="button" className={styles.button} disabled={Boolean(busy)} onClick={() => { void mutate(doc, 'withdraw', { revision: doc.revision }); }}>Retirar del portal</button> : <button type="button" className={`${styles.button} ${styles.primary}`} disabled={Boolean(busy) || doc.recipientMismatch} onClick={() => { setPublishIntent({ doc, recipient: data.recipient }); setRecipientChecked(false); }}>Publicar en el portal del cliente</button>}</div>
                    <details className={styles.details}><summary>Editar descripción</summary><form onSubmit={event => { event.preventDefault(); void mutate(doc, 'edit', { description: new FormData(event.currentTarget).get('description') }); }}><textarea key={doc.description} name="description" className={styles.field} defaultValue={doc.description} maxLength={500} minLength={doc.type === 'other' ? 3 : undefined} required={doc.type === 'other'}/><button type="submit" className={styles.button} disabled={Boolean(busy)}>Guardar descripción</button></form></details>
                </>}
                {publishIntent?.doc.id === doc.id && <div className={styles.confirmation} role="group" aria-label="Confirmar destinatario de documentación"><strong>Verificá a quién se entrega este documento</strong><p>Comprador: {publishIntent.recipient.name}</p><p>Vehículo: {publishIntent.recipient.vehicle}</p><p>Patente: {publishIntent.recipient.plate}</p><label><input type="checkbox" checked={recipientChecked} disabled={Boolean(busy)} onChange={event => setRecipientChecked(event.target.checked)}/>Confirmo que el documento corresponde a este comprador y a este vehículo.</label><div className={styles.actions}><button type="button" className={`${styles.button} ${styles.primary}`} disabled={Boolean(busy) || !recipientChecked} onClick={() => { void mutate(publishIntent.doc, 'publish', { revision: publishIntent.doc.revision, confirmationKey: publishIntent.recipient.confirmationKey }); }}>Publicar en el portal del cliente</button><button type="button" className={styles.button} disabled={Boolean(busy)} onClick={() => setPublishIntent(null)}>Cancelar</button></div></div>}
            </article>)}</div>
        </>}
    </section>;
}
