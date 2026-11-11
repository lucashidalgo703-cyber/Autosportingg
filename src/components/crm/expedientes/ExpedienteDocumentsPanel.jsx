"use client";

import { useAuth } from '../../../context/AuthContext';
import { Files, RefreshCw } from 'lucide-react';
import { DOC_STATUS_OPTIONS } from '../../../utils/expedienteWorkspace';
import { expedienteFileMatches } from '../../../utils/expedienteDocuments';
import { SALE_DOCUMENT_SLOT_LABELS } from '../../../utils/saleDocuments';
import ExpedienteDocumentFiles, { ExpedienteFilesList, useExpedienteFiles } from './ExpedienteDocumentFiles';

const saleSlots = ['buyer_id_front', 'buyer_id_back', 'vehicle_card_front', 'vehicle_card_back'];
const action = 'inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-crm-border px-3 py-2 text-xs text-crm-fg hover:bg-crm-surface-raised disabled:opacity-40';
const saleIdFrom = detail => String(detail?.id || detail?._id || detail?.saleId || '');
const isFinancial = key => key === 'registration_deposit' || key === 'owner_transfer' || /^(registration_account_|expense_seller_|expense_buyer_)/.test(key || '');

export function ExpedienteAttachmentPanel({ detail, party = 'procedure', documentKey, label, onChanged, readOnly = false, onDirtyChange, onBusyChange }) {
    const { token } = useAuth();
    const saleId = saleIdFrom(detail), source = detail?.capabilities || {}, financial = isFinancial(documentKey);
    const capabilities = {
        canReadDocuments: Boolean(source.canReadDocuments && (!financial || source.canReadFinance)),
        canWriteDocuments: Boolean(!readOnly && source.canWriteDocuments && (!financial || source.canReadFinance && source.canWriteFinance))
    };
    const heading = label || detail?.documents?.[party]?.find(row => row.key === documentKey)?.label || 'Documento del expediente';
    return <ExpedienteDocumentFiles key={'exp-attachment:' + (token || 'sin-sesion') + ':' + saleId + ':' + party + ':' + documentKey} saleId={saleId} party={party} documentKey={documentKey} label={heading} capabilities={capabilities} onChanged={onChanged} onDirtyChange={onDirtyChange} onBusyChange={onBusyChange}/>;
}

export default function ExpedienteDocumentsPanel({ detail, saleId, checklists, capabilities, onChanged }) {
    const { token } = useAuth();
    const id = String(saleId || saleIdFrom(detail));
    return <ConsolidatedDocuments key={'exp-consolidated:' + (token || 'sin-sesion') + ':' + id} saleId={id} checklists={checklists || detail?.documents || {}} capabilities={capabilities || detail?.capabilities || {}} onChanged={onChanged}/>;
}

function ConsolidatedDocuments({ saleId, checklists, capabilities, onChanged }) {
    const canRead = Boolean(capabilities.canReadDocuments), store = useExpedienteFiles(saleId, canRead);
    const financeRead = Boolean(capabilities.canReadFinance);
    const safeFiles = store.documents.filter(file => file.slot !== 'expediente_document' || !isFinancial(file.documentKey) || financeRead);
    if (!canRead) return <p className="rounded-xl border border-crm-border p-4 text-sm text-crm-fg-muted">No tenés acceso a los adjuntos del expediente.</p>;
    const reload = async () => { await store.reload(); await onChanged?.(); };
    if (store.loading) return <p role="status" className="m-0 rounded-xl border border-crm-border p-4 text-sm text-crm-fg-muted">Consultando los documentos privados del expediente…</p>;
    if (store.error) return <div role="alert" className="space-y-3 rounded-xl border border-red-500/30 p-4"><p className="m-0 text-sm text-red-300">{store.error}</p><button type="button" className={action} onClick={reload}><RefreshCw size={13}/>Reintentar consulta</button></div>;
    const fileList = (label, files, scope, empty = 'Sin archivo adjunto.') => files.length ? <ExpedienteFilesList saleId={saleId} party={scope?.party || 'sale'} documentKey={scope?.documentKey || label} label={label} documents={files} canRead canWrite={false}/> : <p className="m-0 text-xs text-crm-fg-muted">{empty}</p>;
    const legacyFiles = safeFiles.filter(file => file.slot !== 'expediente_document');
    const legacySections = [
        { title: 'Venta', subtitle: 'Documentos cargados al registrar la venta', groups: saleSlots.map(slot => ({ key: slot, label: SALE_DOCUMENT_SLOT_LABELS[slot], files: legacyFiles.filter(file => file.slot === slot) })) },
        { title: 'Señas', subtitle: 'Comprobantes declarados en el acuerdo comercial', groups: [{ key: 'deposit_receipt', label: 'Comprobantes de seña', files: legacyFiles.filter(file => file.slot === 'deposit_receipt') }] },
        { title: 'Permutas', subtitle: 'Documentación de las unidades recibidas en parte de pago', groups: [
            { key: 'trade_in_card_front', label: 'Cédulas de permuta · frente', files: legacyFiles.filter(file => file.slot === 'trade_in_card_front') },
            { key: 'trade_in_card_back', label: 'Cédulas de permuta · dorso', files: legacyFiles.filter(file => file.slot === 'trade_in_card_back') }
        ] }
    ];
    return <section className="space-y-5" aria-label="Documentación consolidada del expediente">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-crm-border p-4"><div><h3 className="m-0 flex items-center gap-2 text-sm font-semibold"><Files size={16}/>Documentos del expediente</h3><p className="mb-0 mt-2 max-w-2xl text-xs leading-5 text-crm-fg-muted">Vista consolidada de los adjuntos de la venta, las partes y Gestoría. Un estado Recibido puede representar papeles físicos; los archivos disponibles se muestran por separado.</p></div><button type="button" onClick={reload} className={action}><RefreshCw size={13}/>Actualizar</button></div>
        {legacySections.map(section => <section key={section.title} className="rounded-xl border border-crm-border p-4"><header className="mb-4"><h4 className="m-0 text-xs font-semibold uppercase tracking-wide text-crm-fg">{section.title}</h4><p className="mb-0 mt-1 text-xs text-crm-fg-muted">{section.subtitle}</p></header><div className="grid gap-3 sm:grid-cols-2">{section.groups.map(group => <article key={group.key} className="space-y-2 rounded-lg border border-crm-border p-3"><h5 className="m-0 text-xs font-semibold">{group.label}</h5>{fileList(group.label, group.files, { documentKey: group.key })}</article>)}</div></section>)}
        {[{ party: 'seller', label: 'Vendedor', subtitle: 'Documentación de la parte vendedora' }, { party: 'buyer', label: 'Comprador', subtitle: 'Documentación de la parte compradora' }, { party: 'procedure', label: 'Gestoría y registro', subtitle: 'Documentos del trámite y sus comprobantes' }].map(group => {
            const rows = (checklists[group.party] || []).filter(row => !isFinancial(row.key) || financeRead);
            const attachedKeys = new Set(rows.map(row => row.key));
            const additional = safeFiles.filter(file => file.slot === 'expediente_document' && file.party === group.party && !attachedKeys.has(file.documentKey));
            const extraGroups = [...new Set(additional.map(file => file.documentKey))];
            return <section key={group.party} className="rounded-xl border border-crm-border p-4"><header className="mb-4"><h4 className="m-0 text-xs font-semibold uppercase tracking-wide">{group.label}</h4><p className="mb-0 mt-1 text-xs text-crm-fg-muted">{group.subtitle}</p></header><div className="space-y-3">{rows.map(row => <article key={row.key} className="space-y-2 rounded-lg border border-crm-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h5 className="m-0 text-xs font-semibold">{row.label}</h5><span className="rounded-full border border-crm-border px-2 py-1 text-[10px] text-crm-fg-muted">{DOC_STATUS_OPTIONS.find(option => option.value === row.status)?.label || 'Pendiente'}</span></div>{fileList(row.label, safeFiles.filter(file => expedienteFileMatches(file, group.party, row.key)), { party: group.party, documentKey: row.key }, 'Sin archivo guardado para este documento.')}</article>)}{extraGroups.map(key => { const label = key.startsWith('expense_') ? 'Comprobantes de gastos' : key.startsWith('registration_account_') ? 'Datos bancarios del registro' : key === 'owner_transfer' ? 'Comprobantes de transferencia al propietario' : 'Otros documentos del expediente'; return <article key={'extra:' + key} className="space-y-2 rounded-lg border border-crm-border p-3"><h5 className="m-0 text-xs font-semibold">{label}</h5>{fileList(label, additional.filter(file => file.documentKey === key), { party: group.party, documentKey: key })}</article>; })}{!rows.length && !extraGroups.length && <p className="m-0 text-xs text-crm-fg-muted">Sin documentos definidos en esta sección.</p>}</div></section>;
        })}
    </section>;
}
