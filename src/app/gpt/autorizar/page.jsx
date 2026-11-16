"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

const apiBase = () => process.env.NODE_ENV === 'production' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

export default function GptExpenseConsent() {
    const { token, user, isAuthenticated } = useAuth();
    const [parameters, setParameters] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const params = Object.fromEntries(new URLSearchParams(window.location.search));
        if (!params.client_id || !params.redirect_uri || !params.state || params.response_type !== 'code' || params.scope !== 'expenses.write') {
            setError('El enlace de conexión no está completo. Volvé a iniciar la conexión desde ChatGPT.');
            return;
        }
        setParameters(params);
        if (!isAuthenticated) {
            const next = '/gpt/autorizar' + window.location.search;
            window.location.replace('/login?next=' + encodeURIComponent(next));
        }
    }, [isAuthenticated]);
    const authorize = async () => {
        if (busy || !parameters) return;
        setBusy(true);
        setError('');
        try {
            const response = await fetch(apiBase() + '/api/gpt/oauth/authorize', {
                method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify(parameters)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'No se pudo conectar tu cuenta.');
            // The server only returns a callback registered for this OAuth client.
            window.location.assign(data.redirectUrl);
        } catch (err) { setError(err.message); setBusy(false); }
    };
    return <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-5">
        <section className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-7 space-y-5">
            <p className="text-sm text-red-400 font-semibold">AutoSporting</p>
            <h1 className="text-2xl font-bold">Conectar Gastos AutoSporting</h1>
            <p>Vas a conectar la cuenta <strong>{user?.username || user?.email || 'del CRM'}</strong> con tu GPT privado.</p>
            <ul className="list-disc pl-5 text-sm text-zinc-300 space-y-2">
                <li>Consultar las cuentas, categorías y unidades permitidas.</li>
                <li>Preparar gastos y registrarlos después de tu confirmación.</li>
                <li>Usar tus permisos actuales. La conexión vence con esta sesión y se revoca al cerrar sesión.</li>
            </ul>
            {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
            <button type="button" onClick={authorize} disabled={busy || !parameters || !isAuthenticated}
                className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold disabled:opacity-40">
                {busy ? 'Conectando…' : 'Autorizar gastos'}
            </button>
            <a href="/admin" className="block text-center text-sm text-zinc-400 underline">Cancelar y volver al CRM</a>
        </section>
    </main>;
}
