"use client";
import { FileCheck2, FileClock, RefreshCw } from 'lucide-react';
import BuyerPortalFileActions from './BuyerPortalFileActions';
import { portalDate } from './portalClient';
import styles from './BuyerDeliveredDocumentsSection.module.css';

export default function BuyerDeliveredDocumentsSection({ data, loading = false, error = '', onRefresh, requestAccess, requestDownload }) {
    const documents = data?.documents || [];
    return <section className={styles.section} aria-labelledby="buyer-delivered-documents-title" data-buyer-delivered-documents>
        <header className={styles.header}>
            <div><p className={styles.eyebrow}>Tu compra</p><h2 id="buyer-delivered-documents-title" className={styles.title}><FileCheck2 size={22} aria-hidden="true"/>Documentación de tu vehículo</h2></div>
            {onRefresh && <button type="button" className={styles.refresh} disabled={loading} onClick={onRefresh} aria-label="Actualizar documentación de tu vehículo"><RefreshCw size={17} aria-hidden="true"/></button>}
        </header>
        {loading ? <p role="status" className={styles.muted}>Consultando tu documentación…</p> : error ? <div className={styles.message} role="alert"><p>{error}</p>{onRefresh && <button type="button" className={styles.retry} onClick={onRefresh}>Reintentar</button>}</div> : documents.length === 0 ? <div className={styles.preparing} data-delivery-state="preparing"><FileClock size={26} aria-hidden="true"/><div><h3>En preparación</h3><p>AutoSporting está preparando la documentación del vehículo que compraste. Cuando esté publicada, vas a poder verla y descargarla acá.</p></div></div> : <>
            <p className={styles.available} data-delivery-state="available">Disponible para descargar</p>
            <div className={styles.list}>{documents.map(document => <article className={styles.document} key={document.id} data-delivered-document={document.id}>
                <div><h3>{document.label || document.description || document.fileName || 'Documento'}</h3>{document.description && document.description !== document.label && <p className={styles.description}>{document.description}</p>}</div>
                <p className={styles.date}>Publicado: {portalDate(document.publishedAt || document.updatedAt || document.createdAt)}</p>
                <BuyerPortalFileActions entry={document} requestAccess={requestAccess} requestDownload={requestDownload}/>
            </article>)}</div>
        </>}
    </section>;
}
