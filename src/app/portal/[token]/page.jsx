"use client";
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import BuyerPortalView from '../../../components/buyer-portal/BuyerPortalView';
import BuyerPortalBrand from '../../../components/buyer-portal/BuyerPortalBrand';
import { portalRequest } from '../../../components/buyer-portal/portalClient';
import styles from '../../../components/buyer-portal/BuyerPortalView.module.css';

export default function BuyerPortalPage() {
    const { token: linkToken } = useParams();
    const base = '/api/buyer-portal/' + encodeURIComponent(linkToken || '');
    const storageKey = 'autosporting:buyer-portal:' + linkToken;
    const [info, setInfo] = useState(null);
    const [data, setData] = useState(null);
    const [sessionExpiresAt, setSessionExpiresAt] = useState('');
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
        setLoading(true); setData(null); setInfo(null); setSessionExpiresAt(''); setChallenge(null); setCode(''); setError(''); setFatal(false);
        // Remove the old tab-only credential. The server now remembers this
        // browser with a private cookie that JavaScript cannot read.
        try { sessionStorage.removeItem(storageKey); } catch {}
        let active = true;
        const initialize = async () => {
            try {
                const details = await portalRequest(base + '/info');
                if (!active) return;
                setInfo(details);
                try {
                    const result = await portalRequest(base + '/session');
                    if (active) { setSessionExpiresAt(result.sessionExpiresAt); setData(result); }
                } catch (err) { if (err.status !== 401) throw err; }
            } catch (err) { if (active) { setError(err.message); setFatal(true); } }
            finally { if (active) setLoading(false); }
        };
        initialize();
        return () => { active = false; };
    }, [linkToken, base, storageKey]);
    const expireSession = useCallback(() => {
        setSessionExpiresAt(''); setData(null); setChallenge(null); setCode('');
    }, []);
    useEffect(() => {
        if (!sessionExpiresAt) return;
        const expires = Date.parse(sessionExpiresAt);
        let timer;
        const check = () => {
            const remaining = expires - Date.now();
            if (!Number.isFinite(remaining) || remaining <= 0) {
                expireSession();
                setError('Tu acceso guardado venció. Volvé a verificar tu correo.');
            } else {
                // Browsers cap a single timeout below 30 days.
                timer = setTimeout(check, Math.min(remaining, 2147483647));
            }
        };
        check();
        return () => clearTimeout(timer);
    }, [sessionExpiresAt, expireSession]);
    const refresh = useCallback(async () => {
        try {
            const result = await portalRequest(base + '/session');
            setData(result); setSessionExpiresAt(result.sessionExpiresAt); setError('');
            return result;
        } catch (err) {
            if ([401, 403, 404, 410].includes(err.status)) expireSession();
            setError(err.message);
            throw err;
        }
    }, [base, expireSession]);
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
            const result = await portalRequest(base + '/session');
            setSessionExpiresAt(result.sessionExpiresAt || verified.expiresAt); setData(result); setCode(''); setChallenge(null);
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };
    const upload = async form => {
        try {
            await portalRequest(base + '/documents', { method: 'POST', body: form });
            await refresh();
        } catch (err) {
            if ([401, 403, 404, 410].includes(err.status)) expireSession();
            else if (err.status === 409) await refresh().catch(() => {});
            throw err;
        }
    };
    const requestAccess = useCallback(async id => {
        try { return await portalRequest(base + `/documents/${encodeURIComponent(id)}/access`, { method: 'POST', body: {} }); }
        catch (err) { if ([401, 403, 410].includes(err.status)) { expireSession(); setError(err.message); } throw err; }
    }, [base, expireSession]);
    const removeDocument = async id => {
        try {
            await portalRequest(base + `/documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
            await refresh();
        } catch (err) {
            if ([401, 403, 410].includes(err.status)) expireSession();
            else if ([404, 409].includes(err.status)) await refresh().catch(() => {});
            throw err;
        }
    };
    const logout = async () => {
        setBusy(true); setError('');
        try {
            await portalRequest(base + '/logout', { method: 'POST', body: {} });
            expireSession();
        } catch (err) {
            setError(err.message);
        } finally { setBusy(false); }
    };
    const remaining = Math.max(0, Math.ceil((resendAt - clock) / 1000));
    return <main id="main-content" className={`${styles.page} min-h-screen px-3 py-8 uppercase text-white sm:px-5 [&_button]:uppercase [&_select]:uppercase [&_input]:uppercase [&_textarea]:uppercase`}>
        <div className="mx-auto w-full max-w-3xl">
            {loading ? <p role="status" className="py-12 text-center text-neutral-400">Abriendo tu portal privado…</p> : data ? <>
                {error && <p role="alert" className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
                <BuyerPortalView data={data} onUpload={upload} onRemove={removeDocument} requestAccess={requestAccess} onRefresh={() => { void refresh().catch(() => {}); }}/>
                <button type="button" onClick={logout} disabled={busy} className={`${styles.logoutButton} mt-3 min-h-11 rounded-lg border border-solid border-neutral-700 px-3 text-sm text-neutral-300 disabled:opacity-50`}>{busy ? 'Cerrando acceso…' : 'Salir y olvidar este dispositivo'}</button>
            </> : <section className={`${styles.gate} mx-auto max-w-md space-y-5 rounded-2xl border border-neutral-700 bg-neutral-900 p-5 sm:p-7`}>
                <BuyerPortalBrand/>
                <LockKeyhole size={30} className="text-red-400"/>
                <h1 className="text-2xl font-extrabold text-white">{fatal ? 'Este enlace no está disponible' : 'Verificá tu acceso'}</h1>
                {!fatal && <><p className="text-sm text-neutral-300">Para consultar tu operación, enviaremos un código a la casilla que tenés registrada en AutoSporting.</p><p className="break-all text-sm font-semibold text-white">{info?.maskedDestination || 'Correo registrado del comprador'}</p>
                    <p className="text-sm text-neutral-400">Después de verificar el código, este navegador recordará tu acceso hasta por 30 días, mientras el enlace siga vigente.</p>
                    {challenge ? <form onSubmit={verify} className="space-y-4"><label className="block space-y-2 text-sm text-neutral-300">Código de 6 dígitos<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="min-h-12 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-center font-mono text-2xl tracking-[0.3em] text-white" required disabled={busy}/></label><button type="submit" disabled={busy || code.length !== 6} className="min-h-11 w-full rounded-xl bg-red-600 px-4 font-bold text-white disabled:opacity-50">{busy ? 'Verificando…' : 'Verificar y abrir mi portal'}</button><button type="button" onClick={sendCode} disabled={busy || remaining > 0} className="min-h-11 w-full rounded-xl border border-neutral-700 px-3 text-sm text-neutral-300 disabled:opacity-50">{remaining ? `Reenviar código en ${remaining} s` : 'Reenviar código'}</button></form> : <button type="button" onClick={sendCode} disabled={busy} className="min-h-11 w-full rounded-xl bg-red-600 px-4 font-bold text-white disabled:opacity-50">{busy ? 'Enviando código…' : 'Enviar código a mi correo'}</button>}
                    <p className="text-xs leading-relaxed text-neutral-400">Si esa casilla ya no te corresponde, pedile a AutoSporting que revise tus datos antes de continuar.</p>
                </>}
                {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            </section>}
        </div>
    </main>;
}
