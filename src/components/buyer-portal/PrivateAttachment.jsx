"use client";
import { useEffect, useState } from 'react';

export default function PrivateAttachment({ entry, requestAccess }) {
    const [access, setAccess] = useState(null);
    const [error, setError] = useState('');
    const [generation, setGeneration] = useState(0);
    useEffect(() => {
        if (!requestAccess) return;
        let active = true;
        setAccess(null);
        setError('');
        requestAccess(entry.id).then(result => { if (active) setAccess(result); }).catch(err => { if (active) setError(err.message); });
        return () => { active = false; };
    }, [entry.id, requestAccess, generation]);
    const pdf = entry.mimeType === 'application/pdf';
    return <div className="min-w-0 space-y-2">
        {access?.url ? <>
            {pdf ? <iframe title={`Vista previa de ${entry.description || entry.fileName}`} src={access.url} referrerPolicy="no-referrer" className="h-60 w-full rounded-lg border border-neutral-700 bg-white" /> :
                // Private previews use short-lived server-authorized URLs only.
                <a href={access.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="block"><img src={access.url} alt={entry.description || entry.fileName || 'Documento recibido'} referrerPolicy="no-referrer" className="h-40 w-full rounded-lg border border-neutral-700 bg-neutral-950 object-contain" onError={() => setError('La vista previa venció. Renovala para ver el archivo.')} /></a>}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><a href={access.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="text-red-300 underline">Abrir {pdf ? 'PDF completo' : 'imagen'}</a><button type="button" onClick={() => setGeneration(value => value + 1)} className="min-h-9 rounded border border-neutral-700 px-2 text-neutral-300">Renovar acceso</button></div>
        </> : !error && <p className="rounded-lg bg-neutral-950 p-3 text-xs text-neutral-400">Cargando vista privada…</p>}
        {error && <div role="alert" className="text-xs text-amber-300"><p>{error}</p><button type="button" onClick={() => setGeneration(value => value + 1)} className="mt-1 min-h-9 rounded border border-amber-400/30 px-2">Reintentar vista previa</button></div>}
    </div>;
}
