'use client';

import {useState} from 'react';

export default function GeneralAgencyChat({token,api,ready,setupAvailable}) {
    const [message,setMessage] = useState('');
    const [turns,setTurns] = useState([]);
    const [sending,setSending] = useState(false);
    const [error,setError] = useState('');

    async function send(event) {
        event.preventDefault();
        const text = message.trim();
        if (sending || !ready || !text) return;
        setSending(true);
        setError('');
        try {
            const history = turns.slice(-2).map(turn=>({message:turn.message,reply:turn.reply.slice(0,1200)}));
            const {reply} = await api(token,'/general-chat',undefined,{message:text,history});
            setTurns(previous=>[...previous,{message:text,reply}].slice(-12));
            setMessage('');
        } catch (failure) { setError(failure.message); }
        finally { setSending(false); }
    }

    return <section className="rounded-xl border border-crm-border bg-crm-surface p-4 text-crm-fg md:p-5" aria-labelledby="agency-chat-title">
        <h2 id="agency-chat-title" className="text-lg font-semibold">Chat general de la agencia</h2>
        <p className="mt-1 text-crm-fg-muted">Redactá borradores, resumí texto o hacé una consulta. El texto que escribís se envía a OpenAI. Usá únicamente datos ficticios en el piloto.</p>
        {!ready && <p className="mt-2 text-crm-fg-muted">Conexión de prueba pendiente.{setupAvailable && <> <a className="underline" href="#trade-workbook-title">Configurar conexión</a></>}</p>}
        <ol className="mt-3 grid gap-2" aria-label="Conversación" role="log">
            {turns.map((turn,index)=><li className="space-y-2" key={index}>
                <div className="rounded-lg border border-crm-border p-3"><strong>Vos</strong><p className="whitespace-pre-wrap break-words">{turn.message}</p></div>
                <div className="rounded-lg bg-crm-bg p-3"><strong>AutoSporting AI</strong><p className="whitespace-pre-wrap break-words">{turn.reply}</p></div>
            </li>)}
        </ol>
        <form onSubmit={send} className="mt-3 grid gap-2">
            <label className="grid gap-1">Tu mensaje<textarea className="min-h-24 w-full rounded-lg border border-crm-border bg-crm-bg p-3 text-crm-fg" required
                maxLength={1500} value={message} onChange={event=>setMessage(event.target.value)} readOnly={sending} /></label>
            <div className="flex flex-wrap gap-2">
                <button className="min-h-10 rounded-lg border border-crm-border px-3 font-semibold disabled:opacity-50" type="submit" disabled={!ready || sending || !message.trim()}>{sending ? 'Consultando OpenAI…' : 'Enviar consulta'}</button>
                <button className="min-h-10 rounded-lg border border-crm-border px-3 disabled:opacity-50" type="button" disabled={sending || !turns.length}
                    onClick={()=>{setTurns([]);setMessage('');setError('');}}>Nueva conversación</button>
            </div>
        </form>
        {error && <p role="alert" className="mt-2 text-red-500">{error}</p>}
    </section>;
}
