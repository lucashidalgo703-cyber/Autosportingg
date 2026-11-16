"use client";
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import BuyerPortalView from '../../../components/buyer-portal/BuyerPortalView';
import { portalRequest } from '../../../components/buyer-portal/portalClient';

export default function BuyerPortalPage() {
    const { token: linkToken } = useParams();
    const base = '/api/buyer-portal/' + encodeURIComponent(linkToken || '');
    const storageKey = 'autosporting:buyer-portal:' + linkToken;
    const [info, setInfo] = useState(null);
    const [data, setData] = useState(null);
    const [sessionToken, setSessionToken] = useState('');
    const [challenge, setChallenge] = useState(null);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [fatal, setFatal] = useState(false);
    const [clock, setClock] = useState(0);
    const [resendAt, setResendAt] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setClock(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        if (!linkToken) return;
        setLoading(true); setData(null); setInfo(null); setSessionToken(''); setChallenge(null); setCode(''); setError(''); setFatal(false);
        let active = true;
        const initialize = async () => {
            try {
                const details = await portalRequest(base + '/info');
                if (!active) return;
                setInfo(details);
                const saved = sessionStorage.getItem(storageKey);
                if (saved) {
                    try {
                        const result = await portalRequest(base + '/session', { token: saved });
                        if (active) { setSessionToken(saved); setData(result); }
                    } catch { sessionStorage.removeItem(storageKey); }
                }
            } catch (err) { if (active) { setError(err.message); setFatal(true); } }
            finally { if (active) setLoading(false); }
        };
        initialize();
        return () => { active = false; };
    }, [linkToken, base, storageKey]);
    const expireSession = useCallback(() => {
        sessionStorage.removeItem(storageKey);
        setSessionToken(''); setData(null); setChallenge(null); setCode('');
    }, [storageKey]);
    useEffect(() => {
        if (!sessionToken) return;
        let expires;
        try { expires = JSON.parse(atob(sessionToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; }
        catch { expires = 0; }
        const timer = setTimeout(() => {
            expireSession();
            setError('La verificación venció. Volvé a verificar tu correo.');
        }, Math.max(0, Number.isFinite(expires) ? expires - Date.now() : 0));
        return () => clearTimeout(timer);
    }, [sessionToken, expireSession]);
    const refresh = useCallback(async () => {
        try {
            const result = await portalRequest(base + '/session', { token: sessionToken });
            setData(result); setError('');
            return result;
        } catch (err) {
            if ([401, 403, 404, 410].includes(err.status)) expireSession();
            setError(err.message);
            throw err;
        }
    }, [base, sessionToken, expireSession]);
    const sendCode = async () => {
        setBusy(true); setError('');
        try {
            const result = await portalRequest(base + '/challenge', { method: 'POST', body: {} });
            setChallenge(result); setCode('');
            const value = result.resendAfter;
            const parsed = typeof value === 'number' ? Date.now() + value * 1000 : Date.parse(value);
            setResendAt(Number.isFinite(parsed) ? parsed : Date.now() + 60000);
            setClock(Date.now());
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };
    const verify = async event => {
        event.preventDefault(); setBusy(true); setError('');
        try {
            const verified = await portalRequest(base + '/verify', { method: 'POST', body: { challengeId: challenge.challengeId, code } });
            const result = await portalRequest(base + '/session', { token: verified.sessionToken });
            sessionStorage.setItem(storageKey, verified.sessionToken);
            setSessionToken(verified.sessionToken); setData(result); setCode(''); setChallenge(null);
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };
    const upload = async form => {
        try {
            await portalRequest(base + '/documents', { method: 'POST', body: form, token: sessionToken });
            await refresh();
        } catch (err) {
            if ([401, 403, 404, 410].includes(err.status)) expireSession();
            throw err;
        }
    };
    const requestAccess = useCallback(async id => {
        try { return await portalRequest(base + `/documents/${encodeURIComponent(id)}/access`, { method: 'POST', body: {}, token: sessionToken }); }
        catch (err) { if ([401, 403, 404, 410].includes(err.status)) { expireSession(); setError(err.message); } throw err; }
    }, [base, sessionToken, expireSession]);
    const remaining = Math.max(0, Math.ceil((resendAt - clock) / 1000));
    return <main id="main-content" className="min-h-screen bg-neutral-950 px-3 py-8 text-white sm:px-5">
        <div className="mx-auto w-full max-w-3xl">
            {loading ? <p role="status" className="py-12 text-center text-neutral-400">Abriendo tu portal privado…</p> : data ? <>
                {error && <p role="alert" className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
                <BuyerPortalView data={data} onUpload={upload} requestAccess={requestAccess} onRefresh={() => { void refresh().catch(() => {}); }}/>
                <button type="button" onClick={expireSession} className="mt-4 min-h-10 rounded-lg border border-neutral-700 px-3 text-sm text-neutral-400">Cerrar acceso a este portal</button>
            </> : <section className="mx-auto max-w-md space-y-5 rounded-2xl border border-neutral-700 bg-neutral-900 p-5 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">AutoSporting · Portal del cliente</p>
                <LockKeyhole size={30} className="text-red-400"/>
                <h1 className="text-2xl font-extrabold text-white">{fatal ? 'Este enlace no está disponible' : 'Verificá tu acceso'}</h1>
                {!fatal && <><p className="text-sm text-neutral-300">Para consultar tu operación, enviaremos un código a la casilla que tenés registrada en AutoSporting.</p><p className="break-all text-sm font-semibold text-white">{info?.maskedDestination || 'Correo registrado del comprador'}</p>
                    {challenge ? <form onSubmit={verify} className="space-y-4"><label className="block space-y-2 text-sm text-neutral-300">Código de 6 dígitos<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="min-h-12 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-center font-mono text-2xl tracking-[0.3em] text-white" required disabled={busy}/></label><button type="submit" disabled={busy || code.length !== 6} className="min-h-11 w-full rounded-xl bg-red-600 px-4 font-bold text-white disabled:opacity-50">{busy ? 'Verificando…' : 'Verificar y abrir mi portal'}</button><button type="button" onClick={sendCode} disabled={busy || remaining > 0} className="min-h-11 w-full rounded-xl border border-neutral-700 px-3 text-sm text-neutral-300 disabled:opacity-50">{remaining ? `Reenviar código en ${remaining} s` : 'Reenviar código'}</button></form> : <button type="button" onClick={sendCode} disabled={busy} className="min-h-11 w-full rounded-xl bg-red-600 px-4 font-bold text-white disabled:opacity-50">{busy ? 'Enviando código…' : 'Enviar código a mi correo'}</button>}
                    <p className="text-xs leading-relaxed text-neutral-400">Si esa casilla ya no te corresponde, pedile a AutoSporting que revise tus datos antes de continuar.</p>
                </>}
                {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            </section>}
        </div>
    </main>;
}
