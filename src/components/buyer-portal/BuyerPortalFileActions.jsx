"use client";
import { useCallback, useRef, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import PrivateDocumentViewer from './PrivateDocumentViewer';
import styles from './BuyerPortalFileActions.module.css';

export default function BuyerPortalFileActions({ entry, requestAccess, requestDownload, disabled = false }) {
    const [viewing, setViewing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const opener = useRef(null);
    const closeViewer = useCallback(() => setViewing(false), []);
    const access = useCallback(() => requestAccess(entry), [entry, requestAccess]);
    const view = event => { opener.current = event.currentTarget; setError(''); setViewing(true); };
    const download = async () => {
        if (downloading || disabled || !requestDownload) return;
        setDownloading(true); setError('');
        try { await requestDownload(entry); }
        catch (err) { setError(err.message || 'No se pudo descargar el archivo. Volvé a intentar.'); }
        finally { setDownloading(false); }
    };
    const file = { ...entry, id: entry.fileId || entry.id, description: entry.label || entry.description || entry.fileName || 'Documento' };
    return <div className={styles.root} data-portal-file-actions>
        <div className={styles.buttons}>
            <button type="button" className={styles.button} onClick={view} disabled={disabled || !requestAccess}><Eye size={17} aria-hidden="true"/>Ver documento</button>
            <button type="button" className={styles.button} onClick={() => { void download(); }} disabled={disabled || downloading || !requestDownload}><Download size={17} aria-hidden="true"/>{downloading ? 'Descargando…' : 'Descargar'}</button>
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {viewing && <PrivateDocumentViewer entry={file} requestAccess={access} opener={opener.current} onClose={closeViewer}/>}
    </div>;
}
