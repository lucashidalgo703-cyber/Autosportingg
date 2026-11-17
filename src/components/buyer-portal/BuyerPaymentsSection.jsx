"use client";
import { useRef, useState } from 'react';
import { Camera, CheckCircle2, CircleDollarSign, FileUp, RefreshCw } from 'lucide-react';
import BuyerPortalFileActions from './BuyerPortalFileActions';
import { portalDate, prepareBuyerFile } from './portalClient';
import styles from './BuyerPaymentsSection.module.css';

const targetValue = target => [target.type, target.id || '', target.currency || ''].join(':');
const money = (amount, currency) => `${currency || 'ARS'} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number(amount) || 0)}`;
const day = value => {
    if (!value) return 'Sin fecha';
    const plain = String(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(plain) ? plain.split('-').reverse().join('/') : 'Sin fecha';
};
const today = () => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const get = type => parts.find(part => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
};
const statusLabel = status => ({ pending: 'Comprobante recibido · Pendiente de verificación', correction_requested: 'Corrección solicitada', confirmed: 'Pago acreditado', linked: 'Pago acreditado', superseded: 'Versión anterior' })[status] || 'Comprobante en revisión';

function PaymentProof({ proof, busy, onCorrect, requestAccess, requestDownload }) {
    const file = proof.entry || (proof.fileId ? { ...proof, id: proof.fileId } : null);
    const confirmed = ['confirmed', 'linked'].includes(proof.status) && proof.transactionStatus !== 'anulado';
    return <article className={styles.proof} data-buyer-payment-proof={proof.id} data-payment-proof-status={proof.status}>
        <div className={styles.proofHeading}><h3>{proof.concept || 'Comprobante de pago'}</h3><strong className={styles.amount}>{money(proof.amount, proof.currency)}</strong></div>
        <p className={`${styles.status} ${confirmed ? styles.confirmed : proof.status === 'correction_requested' ? styles.correction : ''}`}>{confirmed && <CheckCircle2 size={16} aria-hidden="true"/>}{proof.transactionStatus === 'anulado' ? 'Cobro anulado · Consultá con la agencia' : statusLabel(proof.status)}</p>
        <dl className={styles.proofDetails}><div><dt>Fecha del pago</dt><dd>{day(proof.paymentDate)}</dd></div><div><dt>Enviado</dt><dd>{portalDate(proof.createdAt)}</dd></div>{proof.targetLabel && <div><dt>Destino</dt><dd>{proof.targetLabel}</dd></div>}</dl>
        {proof.status === 'correction_requested' && <div className={styles.correctionMessage}><h4>Qué necesitás corregir</h4><p>{proof.comment || 'Revisá el comprobante y enviá una copia corregida.'}</p><button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => onCorrect(proof)}>Enviar comprobante corregido</button></div>}
        {file && <BuyerPortalFileActions entry={{ ...file, proofId: proof.id, label: proof.concept || file.description || 'Comprobante de pago' }} requestAccess={requestAccess} requestDownload={requestDownload} disabled={busy}/>}
    </article>;
}

export default function BuyerPaymentsSection({ data, loading = false, error = '', onRefresh, onUpload, requestAccess, requestDownload }) {
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('ARS');
    const [paymentDate, setPaymentDate] = useState(today);
    const [concept, setConcept] = useState('');
    const [selectedTarget, setSelectedTarget] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [requestId, setRequestId] = useState('');
    const [replacesId, setReplacesId] = useState('');
    const [intent, setIntent] = useState(null);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [submitError, setSubmitError] = useState('');
    const [notice, setNotice] = useState('');
    const fileRef = useRef(null), cameraRef = useRef(null), formRef = useRef(null);
    const targets = data?.pendingTargets || [];
    const choices = targets.filter(target => target.currency === currency);
    const proofs = data?.proofs || [];
    const correcting = proofs.find(proof => proof.id === replacesId);
    const originalTarget = correcting ? { type: correcting.targetType || 'purchase', id: correcting.targetId, currency: correcting.currency, label: correcting.targetLabel || 'Destino del comprobante original' } : null;
    const preservedTarget = originalTarget && targetValue(originalTarget) === selectedTarget && originalTarget.currency === currency ? originalTarget : null;
    const target = choices.find(item => targetValue(item) === selectedTarget) || preservedTarget;
    const current = proofs.filter(proof => proof.status !== 'superseded');
    const previous = proofs.filter(proof => proof.status === 'superseded');
    const locked = busy || Boolean(intent);
    const chooseFile = file => {
        if (locked) return;
        setSelectedFile(file || null); setRequestId(file ? crypto.randomUUID() : '');
        setSubmitError(''); setNotice('');
    };
    const correct = proof => {
        if (locked) return;
        setReplacesId(proof.id); setAmount(String(proof.amount)); setCurrency(proof.currency || 'ARS');
        setPaymentDate(String(proof.paymentDate || today()).slice(0, 10)); setConcept(proof.concept || '');
        setSelectedTarget(targetValue({ type: proof.targetType || 'purchase', id: proof.targetId, currency: proof.currency || 'ARS' }));
        setSelectedFile(null); setRequestId(''); setSubmitError(''); setNotice('');
        formRef.current?.scrollIntoView({ block: 'start' });
        if (fileRef.current) { fileRef.current.value = ''; fileRef.current.click(); }
    };
    const clearFile = () => {
        setSelectedFile(null); setRequestId(''); setIntent(null); setReplacesId('');
        if (fileRef.current) fileRef.current.value = '';
        if (cameraRef.current) cameraRef.current.value = '';
    };
    const submit = async event => {
        event.preventDefault();
        if (busy || loading || error || !onUpload || !selectedFile && !intent) return;
        setBusy(true); setProgress(0); setSubmitError(''); setNotice('');
        try {
            let attempt = intent;
            if (!attempt) {
                const numericAmount = Number(String(amount).replace(',', '.'));
                if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error('Ingresá un importe mayor a cero, sin separadores de miles.');
                if (!concept.trim()) throw new Error('Contanos a qué corresponde el pago.');
                const file = await prepareBuyerFile(selectedFile);
                attempt = { file, requestId: requestId || crypto.randomUUID(), amount: String(numericAmount), currency, paymentDate,
                    concept: concept.trim(), targetType: target?.type || 'purchase', targetId: target?.id || '', replacesId };
                setIntent(attempt);
            }
            const form = new FormData();
            form.set('file', attempt.file);
            for (const field of ['requestId', 'amount', 'currency', 'paymentDate', 'concept', 'targetType']) form.set(field, attempt[field]);
            if (attempt.targetId) form.set('targetId', attempt.targetId);
            if (attempt.replacesId) form.set('replacesId', attempt.replacesId);
            await onUpload(form, value => setProgress(Math.max(0, Math.min(100, Math.round(typeof value === 'number' ? value : value?.percent || 0)))));
            setNotice('Comprobante recibido · Pendiente de verificación');
            clearFile(); setAmount(''); setConcept(''); setSelectedTarget(''); setProgress(100);
        } catch (err) {
            if ([400, 409, 413, 422].includes(err.status)) { setIntent(null); setRequestId(crypto.randomUUID()); }
            setSubmitError(err.message || 'No pudimos confirmar la recepción. Reintentá el envío.');
        } finally { setBusy(false); }
    };
    const proofProps = { busy: locked, onCorrect: correct, requestAccess, requestDownload };
    return <section className={styles.section} aria-labelledby="buyer-payments-title" data-buyer-payments>
        <header className={styles.header}><div><p className={styles.eyebrow}>Tu operación</p><h2 id="buyer-payments-title" className={styles.title}><CircleDollarSign size={22} aria-hidden="true"/>Mis pagos</h2></div>{onRefresh && <button type="button" className={styles.refresh} onClick={onRefresh} disabled={loading || busy} aria-label="Actualizar mis pagos"><RefreshCw size={17} aria-hidden="true"/></button>}</header>
        <p className={styles.introduction}>Enviá tu comprobante para que AutoSporting pueda verificar el pago. Lo vas a ver acreditado acá cuando la agencia lo confirme.</p>
        {loading && <p role="status" className={styles.muted}>Consultando tus pagos…</p>}
        {error && <div role="alert" className={styles.error}><p>{error}</p>{onRefresh && <button type="button" className={styles.secondaryButton} onClick={onRefresh}>Reintentar consulta</button>}</div>}
        <form ref={formRef} className={styles.form} onSubmit={submit} aria-label="Enviar comprobante de pago" data-buyer-payment-upload>
            <h3>{replacesId ? 'Comprobante corregido' : 'Enviar comprobante'}</h3>
            {replacesId && <p className={styles.editNotice}>La nueva copia se enviará para revisar la corrección solicitada.</p>}
            <fieldset disabled={locked || loading || Boolean(error) || !onUpload} className={styles.fields}>
                <div className={styles.twoColumns}><label>Importe<input type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Ej. 150000 o 150000,50" required className={styles.input}/></label><label>Moneda<select value={currency} onChange={event => { setCurrency(event.target.value); setSelectedTarget(''); }} className={styles.input}><option value="ARS">ARS · Pesos argentinos</option><option value="USD">USD · Dólares</option></select></label></div>
                <label>Fecha del pago<input type="date" value={paymentDate} max={today()} onChange={event => setPaymentDate(event.target.value)} required className={styles.input}/></label>
                <label>Concepto<input type="text" value={concept} onChange={event => setConcept(event.target.value)} required maxLength={300} placeholder="Ej. cuota, seña o saldo de compra" className={styles.input}/></label>
                <label>¿A qué corresponde?<select aria-label="Destino del comprobante" value={selectedTarget} onChange={event => setSelectedTarget(event.target.value)} className={styles.input}><option value="">Saldo de compra · {currency}</option>{preservedTarget && !choices.some(item => targetValue(item) === selectedTarget) && <option value={selectedTarget}>{preservedTarget.label}</option>}{choices.map(item => <option key={targetValue(item)} value={targetValue(item)}>{item.label}{item.recorded ? ' · Ya registrado' : Number.isFinite(Number(item.pendingAmount)) ? ` · Pendiente ${money(item.pendingAmount, item.currency)}` : ''}{item.dueDate ? ` · Vence ${day(item.dueDate)}` : ''}</option>)}</select></label>
                <div className={styles.fileButtons}><button type="button" className={styles.secondaryButton} onClick={() => cameraRef.current?.click()}><Camera size={17} aria-hidden="true"/>Sacar foto</button><button type="button" className={styles.secondaryButton} onClick={() => fileRef.current?.click()}><FileUp size={17} aria-hidden="true"/>Galería o PDF</button></div>
                <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Foto del comprobante con la cámara" className={styles.hiddenFile} onChange={event => chooseFile(event.target.files?.[0])}/>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" aria-label="Elegir comprobante en foto o PDF" className={styles.hiddenFile} onChange={event => chooseFile(event.target.files?.[0])}/>
                <p className={styles.fileName}>{selectedFile ? selectedFile.name : 'Podés enviar una foto o un PDF del comprobante.'}</p>
            </fieldset>
            {busy && <div className={styles.progressBlock} role="status"><label htmlFor="buyer-payment-progress">{progress >= 100 ? 'Archivo enviado. Confirmando recepción…' : `Enviando comprobante… ${progress}%`}</label><progress id="buyer-payment-progress" max="100" value={progress}/></div>}
            {submitError && <div role="alert" className={styles.error}><p>{submitError}</p>{intent && <p>Reintentá para confirmar la recepción del mismo comprobante.</p>}</div>}
            {notice && <p role="status" className={styles.success}>{notice}</p>}
            <div className={styles.submitActions}><button type="submit" className={styles.primaryButton} disabled={busy || loading || Boolean(error) || !onUpload || !selectedFile && !intent}>{busy ? 'Enviando…' : intent ? 'Reintentar envío' : 'Enviar comprobante'}</button>{replacesId && !intent && !busy && <button type="button" className={styles.secondaryButton} onClick={() => { clearFile(); setSubmitError(''); }}>Cancelar corrección</button>}</div>
        </form>
        {!loading && !error && <div className={styles.history}><h3>Comprobantes enviados</h3>{current.length === 0 ? <p className={styles.muted}>Todavía no enviaste comprobantes para esta operación.</p> : <div className={styles.proofList}>{current.map(proof => <PaymentProof key={proof.id} proof={proof} {...proofProps}/>)}</div>}{previous.length > 0 && <details className={styles.previous}><summary>Ver {previous.length} comprobantes anteriores</summary><div className={styles.proofList}>{previous.map(proof => <PaymentProof key={proof.id} proof={proof} {...proofProps}/>)}</div></details>}</div>}
    </section>;
}
