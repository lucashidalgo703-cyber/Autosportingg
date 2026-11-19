"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minus, Plus, RefreshCw, X } from 'lucide-react';
import styles from './PrivateDocumentViewer.module.css';

export default function PrivateDocumentViewer({ entry, requestAccess, onClose, opener, fileBasePath = '/api/buyer-portal/files/' }) {
    const [access, setAccess] = useState(null);
    const [error, setError] = useState('');
    const [generation, setGeneration] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [natural, setNatural] = useState({ width: 0, height: 0 });
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [viewport, setViewport] = useState(null);
    const stageRef = useRef(null);
    const closeRef = useRef(null);
    const lastCheck = useRef(0);
    const pdf = entry.mimeType === 'application/pdf';
    const renew = useCallback(() => setGeneration(value => value + 1), []);
    useEffect(() => {
        let active = true;
        setAccess(null); setError('');
        requestAccess(entry.id).then(result => {
            const url = new URL(result.url, window.location.origin);
            if (!['/api/buyer-portal/files/', '/api/vehicle-invoice-files/'].includes(fileBasePath)
                || url.origin !== window.location.origin || url.username || url.password || url.pathname !== fileBasePath + entry.id) throw new Error('Archivo no disponible.');
            if (active) { lastCheck.current = Date.now(); setAccess({ url: url.href, expiresAt: result.expiresAt }); }
        }).catch(err => { if (active) setError(err.message || 'No se pudo abrir el documento. Reintentá.'); });
        return () => { active = false; };
    }, [entry.id, requestAccess, generation, fileBasePath]);
    useEffect(() => {
        if (!access) return;
        const expiry = Date.parse(access.expiresAt);
        const timer = setTimeout(renew, Math.max(1000, Number.isFinite(expiry) ? expiry - Date.now() : 120000));
        return () => clearTimeout(timer);
    }, [access, renew]);
    useEffect(() => {
        const visible = window.visualViewport;
        const resize = () => setViewport({ width: visible?.width || innerWidth, height: visible?.height || innerHeight,
            left: visible?.offsetLeft || 0, top: visible?.offsetTop || 0 });
        const recheck = () => { if (!document.hidden && Date.now() - lastCheck.current >= 30000) renew(); };
        resize();
        visible?.addEventListener('resize', resize); visible?.addEventListener('scroll', resize);
        window.addEventListener('resize', resize); window.addEventListener('focus', recheck);
        document.addEventListener('visibilitychange', recheck);
        return () => {
            visible?.removeEventListener('resize', resize); visible?.removeEventListener('scroll', resize);
            window.removeEventListener('resize', resize); window.removeEventListener('focus', recheck);
            document.removeEventListener('visibilitychange', recheck);
        };
    }, [renew]);
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const resize = () => setSize({ width: stage.clientWidth, height: stage.clientHeight });
        resize();
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', resize);
            return () => window.removeEventListener('resize', resize);
        }
        const observer = new ResizeObserver(resize); observer.observe(stage);
        return () => observer.disconnect();
    }, []);
    useLayoutEffect(() => {
        const previousFocus = opener || document.activeElement;
        const parentDialog = previousFocus?.closest?.('[role="dialog"]');
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden'; closeRef.current?.focus();
        const key = event => {
            if (event.key === 'Escape') {
                event.preventDefault(); event.stopImmediatePropagation(); onClose(); return;
            }
            if (event.key !== 'Tab') return;
            const controls = [...document.querySelectorAll('[data-private-document-viewer] button:not([disabled])')];
            const first = controls[0], last = controls.at(-1);
            if (!document.activeElement?.closest?.('[data-private-document-viewer]')) { event.preventDefault(); first?.focus(); }
            else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            event.stopImmediatePropagation();
        };
        document.addEventListener('keydown', key, true);
        return () => {
            document.removeEventListener('keydown', key, true);
            if (!parentDialog || parentDialog.isConnected) document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus?.();
        };
    }, [onClose, opener]);
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const stage = stageRef.current;
            if (stage) stage.scrollTo({ left: Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2), top: Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2) });
        });
        return () => cancelAnimationFrame(frame);
    }, [zoom, size.width, size.height, natural.width, natural.height]);
    const fit = natural.width && natural.height && size.width && size.height ? Math.min(size.width / natural.width, size.height / natural.height) : 0;
    const width = natural.width * fit * zoom, height = natural.height * fit * zoom;
    return createPortal(<section className={styles.viewer} role="dialog" aria-modal="true" aria-label="Visor de documento" data-private-document-viewer
        style={viewport ? { width: viewport.width, height: viewport.height, left: viewport.left, top: viewport.top } : undefined}>
        <header className={styles.header}>
            <div className={styles.heading}><h2 className={styles.title}>{entry.description || entry.fileName || 'Documento del cliente'}</h2><button ref={closeRef} type="button" onClick={onClose} className={styles.button} aria-label="Cerrar documento"><X size={20}/></button></div>
            <div className={styles.controls}>{!pdf && <>
                <button type="button" className={styles.button} aria-label="Reducir" disabled={zoom <= 1 || !access} onClick={() => setZoom(value => Math.max(1, value - .5))}><Minus size={18}/></button>
                <span className={styles.percent}>{Math.round(zoom * 100)}%</span>
                <button type="button" className={styles.button} aria-label="Ampliar" disabled={zoom >= 4 || !access} onClick={() => setZoom(value => Math.min(4, value + .5))}><Plus size={18}/></button>
                <button type="button" className={styles.button} onClick={() => setZoom(1)}><Maximize2 size={16}/>Ajustar a pantalla</button>
            </>}<button type="button" className={styles.button} onClick={renew}><RefreshCw size={16}/>Renovar acceso</button></div>
        </header>
        <div ref={stageRef} className={styles.stage} data-private-document-stage>
            {error ? <div className={styles.message} role="alert"><p>{error}</p><button type="button" className={styles.button} onClick={renew}>Reintentar documento</button></div> : !access ? <p className={styles.message} role="status">Abriendo documento…</p>
                : pdf ? <iframe title={`Documento completo: ${entry.description || entry.fileName}`} src={access.url + '#view=FitH'} referrerPolicy="no-referrer" className={styles.pdf} data-private-document-pdf/>
                    : <div className={styles.canvas} style={{ width: Math.max(size.width, width), height: Math.max(size.height, height) }}>
                        <img src={access.url} alt={entry.description || entry.fileName || 'Documento del cliente'} referrerPolicy="no-referrer" className={styles.image} data-private-document-image
                            style={{ width: width || '100%', height: height || '100%' }} onLoad={event => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                            onError={() => { setAccess(null); setError('No se pudo mostrar la imagen. Renová el acceso para volver a abrirla.'); }}/>
                    </div>}
        </div>
    </section>, document.body);
}
