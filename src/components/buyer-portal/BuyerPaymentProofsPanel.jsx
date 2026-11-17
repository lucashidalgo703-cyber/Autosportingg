"use client";
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Link2, MessageSquareWarning, Receipt, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../utils/adminPermissions';
import { downloadPortalFile, portalDate, portalRequest } from './portalClient';
import BuyerPortalFileActions from './BuyerPortalFileActions';
import styles from './BuyerPaymentProofsPanel.module.css';

const amountLabel = (value, currency) => `${currency} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number(value) || 0)}`;
const dateLabel = value => /^\d{4}-\d{2}-\d{2}/.test(String(value || '')) ? String(value).slice(0, 10).split('-').reverse().join('/') : 'Sin fecha';
const labels = { pending: 'Pendiente de verificación', correction_requested: 'Corrección solicitada', confirmed: 'Acreditado · Cobro registrado', linked: 'Vinculado a un cobro existente', superseded: 'Versión anterior' };
const destinationLabel = proof => proof.targetLabel || ({ purchase: 'Saldo de compra', deposit: 'Seña', installment: 'Cuota', gestoria: 'Gestoría' })[proof.targetType] || 'Destino registrado';
function compatibleTransaction(proof, transaction) {
    if (!Number.isFinite(Number(transaction.amount)) || !Number.isFinite(Number(proof.amount)) || transaction.currency !== proof.currency || Math.abs(Number(transaction.amount) - Number(proof.amount)) >= .005) return false;
    if (proof.targetType === 'gestoria' && transaction.canLinkGestoria) return true;
    if ((transaction.paymentDestination || 'purchase') !== proof.targetType) return false;
    return !['installment', 'gestoria'].includes(proof.targetType) || String(transaction.targetId || '') === String(proof.targetId || '');
}

function PaymentReviewCard({ proof, accounts, transactions, canWrite, token, refreshing, onReview }) {
    const [mode, setMode] = useState('');
    const [accountId, setAccountId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('transferencia');
    const [transactionId, setTransactionId] = useState('');
    const [comment, setComment] = useState('');
    const [busy, setBusy] = useState(false);
    const [intent, setIntent] = useState(null);
    const [error, setError] = useState('');
    const unresolved = ['pending', 'correction_requested'].includes(proof.status);
    const currentAccounts = accounts.filter(account => account.currency === proof.currency);
    const eligible = transactions.filter(transaction => compatibleTransaction(proof, transaction));
    const access = useCallback(() => portalRequest('/api/admin/buyer-portal/payment-proofs/' + encodeURIComponent(proof.id) + '/access', { token, method: 'POST', body: {} }), [proof.id, token]);
    const download = useCallback(async entry => {
        const result = await portalRequest('/api/admin/buyer-portal/payment-proofs/' + encodeURIComponent(proof.id) + '/access', { token, method: 'POST', body: { download: true } });
        await downloadPortalFile(result, { fileName: entry.fileName || 'comprobante' });
    }, [proof.id, token]);
    const selectMode = value => {
        if (busy || intent) return;
        setMode(value); setError(''); setAccountId(''); setTransactionId(''); setComment('');
    };
    const submit = async event => {
        event.preventDefault();
        if (busy || !canWrite || !unresolved) return;
        const body = intent || { action: mode, requestId: crypto.randomUUID(), ...(mode === 'confirm' ? { accountId, paymentMethod } : mode === 'link' ? { transactionId } : { comment: comment.trim() }) };
        if (mode === 'confirm' && !body.accountId || mode === 'link' && !body.transactionId || mode === 'correction' && body.comment.length < 3) return;
        setBusy(true); setIntent(body); setError('');
        try {
            await onReview(proof.id, body);
            setMode(''); setIntent(null); setAccountId(''); setTransactionId(''); setComment('');
        } catch (err) {
            if ([400, 403, 404, 409, 422].includes(err.status)) setIntent(null);
            setError(err.message || 'No se pudo confirmar el resultado. Reintentá la misma acción.');
        } finally { setBusy(false); }
    };
    const file = proof.entry || (proof.fileId ? { ...proof, id: proof.fileId } : null);
    return <article className={styles.proof} data-admin-payment-proof={proof.id} data-proof-status={proof.status}>
        <header className={styles.proofHeader}><div><h4>{proof.concept || 'Comprobante de pago'}</h4><p>{destinationLabel(proof)}</p></div><strong>{amountLabel(proof.amount, proof.currency)}</strong></header>
        <p className={`${styles.status} ${['confirmed', 'linked'].includes(proof.status) && proof.transactionStatus !== 'anulado' ? styles.confirmed : proof.status === 'correction_requested' ? styles.correction : ''}`}>{proof.transactionStatus === 'anulado' ? 'Cobro vinculado anulado · Requiere revisión' : labels[proof.status] || 'En revisión'}</p>
        <dl className={styles.meta}><div><dt>Fecha informada</dt><dd>{dateLabel(proof.paymentDate)}</dd></div><div><dt>Recibido</dt><dd>{portalDate(proof.createdAt)}</dd></div>{proof.transactionId && <div><dt>Cobro vinculado</dt><dd>{String(proof.transactionId)}</dd></div>}</dl>
        {proof.comment && <p className={styles.comment}>Comentario para el cliente: {proof.comment}</p>}
        {file && <BuyerPortalFileActions entry={{ ...file, proofId: proof.id, label: proof.concept || file.description || 'Comprobante de pago' }} requestAccess={access} requestDownload={download} disabled={busy}/>}
        {unresolved && canWrite && <div className={styles.review}>
            {!mode ? <div className={styles.actions}><button type="button" className={styles.primary} disabled={refreshing} onClick={() => selectMode('confirm')}><CheckCircle2 size={16} aria-hidden="true"/>Confirmar acreditación</button><button type="button" className={styles.button} disabled={refreshing} onClick={() => selectMode('link')}><Link2 size={16} aria-hidden="true"/>Vincular a cobro existente</button><button type="button" className={styles.button} disabled={refreshing} onClick={() => selectMode('correction')}><MessageSquareWarning size={16} aria-hidden="true"/>Solicitar corrección</button></div> : <form onSubmit={submit} className={styles.reviewForm} aria-label={`Revisar comprobante: ${proof.concept || 'Pago'}`}>
                <h5>{mode === 'confirm' ? 'Confirmar acreditación y registrar cobro' : mode === 'link' ? 'Vincular sin crear otro cobro' : 'Solicitar corrección al cliente'}</h5>
                <p className={styles.summary}>{amountLabel(proof.amount, proof.currency)} · {destinationLabel(proof)}</p>
                <fieldset disabled={busy || Boolean(intent) || refreshing} className={styles.fields}>
                    {mode === 'confirm' && <><label>Cuenta de ingreso<select aria-label="Cuenta para acreditar el comprobante" className={styles.input} value={accountId} onChange={event => setAccountId(event.target.value)} required><option value="">Seleccioná una cuenta en {proof.currency}</option>{currentAccounts.map(account => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select></label>{currentAccounts.length === 0 && <p className={styles.warning}>No hay cuentas activas en {proof.currency}. Activá una cuenta compatible antes de confirmar.</p>}<label>Medio del pago<select aria-label="Medio del pago acreditado" className={styles.input} value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="deposito">Depósito</option><option value="tarjeta">Tarjeta</option><option value="cheque">Cheque</option><option value="otro">Otro</option></select></label><p className={styles.help}>Confirmá sólo cuando hayas comprobado la acreditación. Esta acción registra el cobro y actualiza los saldos según su destino.</p></>}
                    {mode === 'link' && <><label>Cobro ya registrado<select aria-label="Cobro existente para vincular" className={styles.input} value={transactionId} onChange={event => setTransactionId(event.target.value)} required><option value="">Seleccioná el cobro compatible</option>{eligible.map(transaction => <option key={transaction.id} value={transaction.id}>{dateLabel(transaction.date)} · {transaction.concept || 'Cobro'} · {amountLabel(transaction.amount, transaction.currency)}</option>)}</select></label>{eligible.length === 0 && <p className={styles.warning}>No hay un cobro compatible con el importe, la moneda y el destino de este comprobante.</p>}<p className={styles.help}>Se reutiliza el movimiento elegido. No se registra un segundo ingreso.</p></>}
                    {mode === 'correction' && <label>Comentario visible para el cliente<textarea aria-label="Corrección solicitada al cliente" className={styles.input} value={comment} onChange={event => setComment(event.target.value)} minLength={3} maxLength={500} required rows={3} placeholder="Indicá qué debe corregir del comprobante."/></label>}
                </fieldset>
                {error && <p className={styles.error} role="alert">{error}{intent && ' Reintentá para confirmar el resultado de la misma acción.'}</p>}
                <div className={styles.actions}><button type="submit" className={styles.primary} disabled={busy || refreshing || !intent && (mode === 'confirm' && !accountId || mode === 'link' && !transactionId || mode === 'correction' && comment.trim().length < 3)}>{busy ? 'Guardando…' : intent ? 'Reintentar la misma acción' : mode === 'confirm' ? 'Confirmar acreditación y registrar cobro' : mode === 'link' ? 'Vincular comprobante a este cobro' : 'Enviar pedido de corrección'}</button>{!intent && <button type="button" className={styles.button} disabled={busy} onClick={() => setMode('')}>Cancelar</button>}</div>
            </form>}
        </div>}
    </article>;
}

export default function BuyerPaymentProofsPanel({ saleId, onChanged }) {
    const { token, user, loading: authLoading } = useAuth();
    const canRead = user?.role !== 'ventas' && hasPermission(user, PERMISSIONS.FINANZAS_READ);
    const canWrite = canRead && hasPermission(user, PERMISSIONS.FINANZAS_WRITE);
    const [snapshot, setSnapshot] = useState(null);
    const [generation, setGeneration] = useState(0);
    const [notice, setNotice] = useState('');
    useEffect(() => {
        if (!saleId || !token || !canRead) return;
        let active = true;
        portalRequest('/api/admin/buyer-portal/sales/' + encodeURIComponent(saleId) + '/payment-proofs', { token })
            .then(data => { if (active) setSnapshot({ saleId, token, generation, data }); })
            .catch(error => { if (active) setSnapshot({ saleId, token, generation, error: error.message }); });
        return () => { active = false; };
    }, [saleId, token, canRead, generation]);
    const current = snapshot?.saleId === saleId && snapshot?.token === token && snapshot?.generation === generation ? snapshot : null;
    const loading = Boolean(saleId && (authLoading || canRead && !current));
    const refresh = () => setGeneration(value => value + 1);
    const review = async (id, body) => {
        setNotice('');
        try {
            const result = await portalRequest('/api/admin/buyer-portal/payment-proofs/' + encodeURIComponent(id) + '/review', { token, method: 'POST', body });
            setNotice(body.action === 'confirm' ? 'Acreditación confirmada. El cobro quedó registrado.' : body.action === 'link' ? 'Comprobante vinculado al cobro existente.' : 'Corrección solicitada. El comentario ya está disponible para el cliente.');
            refresh();
            try { await onChanged?.(result); } catch {}
            return result;
        } catch (error) { refresh(); throw error; }
    };
    if (!authLoading && !canRead) return null;
    // Keep cards mounted during refresh so an uncertain review keeps the same
    // immutable intent until the server confirms its result.
    const data = current?.data || (snapshot?.saleId === saleId && snapshot?.token === token ? snapshot.data : null);
    return <section className={styles.panel} aria-labelledby="buyer-payment-proofs-title" data-admin-payment-proofs>
        <header className={styles.header}><div><h3 id="buyer-payment-proofs-title"><Receipt size={20} aria-hidden="true"/>Comprobantes enviados por el cliente</h3><p>La recepción de un comprobante queda pendiente hasta verificar la acreditación.</p></div><button type="button" className={styles.button} onClick={refresh} disabled={loading} aria-label="Actualizar comprobantes del cliente"><RefreshCw size={16} aria-hidden="true"/></button></header>
        {notice && <p role="status" className={styles.notice}>{notice}</p>}
        {!saleId && <p className={styles.help}>Seleccioná la operación para consultar sus comprobantes.</p>}
        {loading && <p role="status" className={styles.help}>Consultando comprobantes…</p>}
        {current?.error && <div role="alert" className={styles.error}>{current.error}<button type="button" className={styles.button} onClick={refresh}>Reintentar</button></div>}
        {data && (data.proofs?.length ? <div className={styles.list}>{data.proofs.map(proof => <PaymentReviewCard key={proof.id} proof={proof} accounts={data.accounts || []} transactions={data.eligibleTransactions || []} token={token} canWrite={canWrite} refreshing={loading || Boolean(current?.error)} onReview={review}/>)}</div> : !loading && <p className={styles.help}>El cliente todavía no envió comprobantes para esta operación.</p>)}
    </section>;
}
