"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { HelpCircle } from 'lucide-react';

const ROUTE_HELP_MAP = {
    '/admin': 'dashboard',
    '/admin/agenda': 'calendario',
    '/admin/alertas': 'alertas',
    '/admin/reportes': 'reportes',
    '/admin/mi-espacio': 'mi-espacio',
    '/admin/stock': 'stock',
    '/admin/clientes': 'clientes',
    '/admin/cotizaciones': 'cotizaciones',
    '/admin/ventas': 'ventas',
    '/admin/mis-ventas': 'mis-ventas',
    '/admin/pedidos': 'pedidos',
    '/admin/postventa': 'postventa',
    '/admin/expedientes': 'expedientes',
    '/admin/reclamos': 'reclamos',
    '/admin/gestoria': 'gestoria',
    '/admin/consignaciones': 'consignaciones',
    '/admin/infracciones': 'infracciones',
    '/admin/taller': 'taller',
    '/admin/telefonos-utiles': 'telefonos-utiles',
    '/admin/telefonos': 'telefonos-utiles',
    '/admin/finanzas': 'finanzas',
    '/admin/tesoreria': 'tesoreria',
    '/admin/liquidaciones': 'liquidaciones',
    '/admin/mis-comisiones': 'mis-comisiones',
    '/admin/mensajes': 'mensajes',
    '/admin/whatsapp': 'whatsapp',
    '/admin/correo': 'correo',
    '/admin/nps': 'nps',
    '/admin/autorizaciones': 'autorizaciones',
    '/admin/dormidos': 'dormidos',
    '/admin/sugerencias': 'sugerencias',
    '/admin/papelera': 'papelera',
    '/admin/oportunidades': 'oportunidades'
};

export default function CrmPageHeader({ 
    title, 
    subtitle, 
    actions 
}) {
    const pathname = usePathname();
    const router = useRouter();

    // Determine help topic ID based on current route
    let helpId = null;
    if (pathname) {
        if (pathname.startsWith('/admin/configuracion')) {
            helpId = 'configuracion';
        } else {
            // Check exact map or remove trailing slash
            helpId = ROUTE_HELP_MAP[pathname] || ROUTE_HELP_MAP[pathname.replace(/\/$/, '')];
            
            // Try to match dynamic routes like /admin/clientes/123
            if (!helpId) {
                const parts = pathname.split('/');
                if (parts.length > 2) {
                    const baseRoute = `/${parts[1]}/${parts[2]}`;
                    helpId = ROUTE_HELP_MAP[baseRoute];
                }
            }
        }
    }

    const openHelp = () => {
        if (helpId) {
            router.push(`/admin/ayuda?tema=${helpId}`);
        } else {
            router.push('/admin/ayuda');
        }
    };

    return (
        <div className="flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-start lg:justify-between mb-5">
            <div className="flex items-center gap-3">
                <div>
                    <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">{title}</h1>
                    {subtitle && (
                        <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                            {subtitle}
                        </p>
                    )}
                </div>
                {/* Contextual Help Button */}
                <button 
                    onClick={openHelp}
                    className="p-2 text-crm-fg-muted hover:text-crm-red hover:bg-crm-surface/50 rounded-full transition-colors flex-shrink-0"
                    title={helpId ? "Ver ayuda sobre esta sección" : "Ir al manual de ayuda"}
                >
                    <HelpCircle size={24} />
                </button>
            </div>

            {actions && (
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {actions}
                </div>
            )}
        </div>
    );
}
