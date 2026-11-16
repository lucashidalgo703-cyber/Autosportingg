"use client";
import { useEffect, useState } from 'react';
import { Eye, MapPin, MonitorSmartphone, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../utils/adminPermissions';
import { portalDate, portalRequest } from './portalClient';

function approximateLocation(location) {
    if (!location) return 'Ubicación no disponible';
    let country = location.country || '';
    if (/^[A-Z]{2}$/.test(country)) {
        try { country = new Intl.DisplayNames(['es'], { type: 'region' }).of(country) || country; } catch {}
    }
    const label = [...new Set([location.city, location.region, country].filter(Boolean))].join(', ');
    return label ? `${label} · Aproximada` : 'Ubicación no disponible';
}

export default function BuyerPortalAccessPanel({ saleId }) {
    const { token, user, loading: authLoading } = useAuth();
    const canRead = hasPermission(user, PERMISSIONS.GESTORIA_READ);
    const [snapshot, setSnapshot] = useState(null);
    const [refresh, setRefresh] = useState(0);
    const [showAll, setShowAll] = useState(false);
    useEffect(() => {
        if (!saleId || !token || !canRead) return;
        let active = true;
        const load = async () => {
            try {
                const data = await portalRequest('/api/admin/buyer-portal/sales/' + encodeURIComponent(saleId) + '/access', { token });
                if (active) setSnapshot({ saleId, refresh, token, data });
            } catch (error) {
                if (active) setSnapshot({ saleId, refresh, token, error: error.message });
            }
        };
        void load();
        return () => { active = false; };
    }, [saleId, token, canRead, refresh]);
    const current = snapshot?.saleId === saleId && snapshot?.refresh === refresh && snapshot?.token === token ? snapshot : null;
    const data = current?.data;
    const sessions = data?.browserSessions || [];
    const visibleSessions = showAll ? sessions : sessions.slice(0, 3);
    const loading = Boolean(saleId && (authLoading || canRead && !current));
    if (!authLoading && !canRead) return null;
    return <section className="min-w-0 space-y-3 rounded-xl border border-solid border-crm-border bg-crm-bg p-4" aria-label="Acceso del cliente al portal" data-buyer-access-panel>
        <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="inline-flex items-center gap-2 text-sm font-bold text-crm-fg"><Eye size={17} className="shrink-0 text-crm-red"/>Acceso del cliente al portal</h3>
            {saleId && canRead && <button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-solid border-crm-border px-3 text-xs font-semibold text-crm-fg disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin motion-reduce:animate-none' : ''}/>Actualizar accesos</button>}
        </div>
        {!saleId ? <p className="text-sm text-crm-fg-muted">Seleccioná la venta en «Vincular Expediente (Venta)» para consultar si su comprador ya ingresó al portal.</p> : loading ? <p role="status" className="text-sm text-crm-fg-muted">Consultando accesos verificados…</p> : current?.error ? <p role="alert" className="text-sm text-amber-300">{current.error} Podés volver a intentar con «Actualizar accesos».</p> : data && <>
            <p className={`text-sm font-semibold ${data.hasViewed ? 'text-emerald-400' : 'text-crm-fg-muted'}`}>{data.hasViewed ? 'El cliente ya ingresó al portal' : 'Todavía no registramos un ingreso del cliente'}</p>
            {data.hasViewed ? <>
                <dl className="grid min-w-0 gap-3 sm:grid-cols-3">
                    <div className="min-w-0"><dt className="text-xs text-crm-fg-muted">Primer acceso registrado</dt><dd className="mt-1 text-sm font-medium text-crm-fg">{portalDate(data.firstViewedAt)}</dd></div>
                    <div className="min-w-0"><dt className="text-xs text-crm-fg-muted">Última consulta</dt><dd className="mt-1 text-sm font-medium text-crm-fg">{portalDate(data.lastViewedAt)}</dd></div>
                    <div className="min-w-0"><dt className="text-xs text-crm-fg-muted">Consultas registradas</dt><dd className="mt-1 text-sm font-medium text-crm-fg">{Number(data.totalViews) || 0}</dd></div>
                </dl>
                {sessions.length > 0 && <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-crm-fg">Navegadores recientes</h4>
                    <ul className="space-y-2">{visibleSessions.map((session, index) => <li key={index} className="min-w-0 space-y-2 rounded-lg border border-solid border-crm-border bg-crm-surface p-3" data-buyer-browser-session>
                        <p className="flex items-start gap-2 text-sm font-semibold text-crm-fg"><MonitorSmartphone size={16} className="mt-0.5 shrink-0"/><span className="min-w-0 [overflow-wrap:anywhere]">{session.deviceType || 'Dispositivo no identificado'} · {session.browser || 'Navegador no identificado'}{session.os && <> · {session.os}</>}</span></p>
                        <p className="flex items-start gap-2 text-xs text-crm-fg-muted"><MapPin size={14} className="shrink-0"/><span className="min-w-0 [overflow-wrap:anywhere]">{approximateLocation(session.location)}</span></p>
                        <p className="text-xs text-crm-fg-muted">Última consulta: {portalDate(session.lastViewedAt)} · {Number(session.viewCount) || 0} consultas</p>
                    </li>)}</ul>
                    {sessions.length > 3 && <button type="button" onClick={() => setShowAll(value => !value)} className="min-h-11 text-left text-xs font-semibold text-crm-fg underline underline-offset-4">{showAll ? 'Mostrar los 3 más recientes' : `Ver las ${sessions.length} sesiones recientes`}</button>}
                </div>}
                <p className="text-xs leading-relaxed text-crm-fg-muted">Cada fila corresponde a una sesión de navegador guardada; un mismo dispositivo puede aparecer más de una vez. Las consultas incluyen aperturas y actualizaciones, y no confirman que el cliente haya leído cada etapa.</p>
            </> : <p className="text-xs leading-relaxed text-crm-fg-muted">Solo se registra cuando el comprador verifica su acceso y abre su portal. La vista previa de la agencia no cuenta como un ingreso.</p>}
            <p className="text-xs leading-relaxed text-crm-fg-muted">Historial del acceso actual, conservado como máximo {data.retentionDays || 30} días. El navegador y el dispositivo son orientativos; la ubicación es aproximada cuando está disponible. No se usa GPS.</p>
        </>}
    </section>;
}
