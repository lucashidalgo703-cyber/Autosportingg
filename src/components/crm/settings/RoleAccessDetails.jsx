import { ShieldCheck } from 'lucide-react';
import { ROLE_DEFINITIONS, roleAccessSummary } from '../../../utils/adminPermissions';

export default function RoleAccessDetails({ user, compact = false }) {
    const definition = ROLE_DEFINITIONS[user?.role];
    if (!definition) return null;
    const access = roleAccessSummary(user);
    return (
        <section className="rounded-xl border border-crm-border bg-crm-bg p-4" aria-label={`Accesos de ${definition.label}`}>
            <div className="flex items-start gap-2">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-crm-red" />
                <div>
                    <h3 className="text-sm font-bold text-crm-fg">{definition.label}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-crm-fg-muted">{definition.description}</p>
                </div>
            </div>
            {user.permissions?.length > 0 && <p className="mt-3 text-xs text-amber-300">Esta cuenta conserva permisos personalizados. Cambiar el rol aplica los permisos del perfil seleccionado.</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
                {access.map(item => <span key={item.label} title={item.detail} className="rounded-md border border-crm-border bg-crm-surface px-2 py-1 text-[11px] font-medium text-crm-fg">{item.label}</span>)}
            </div>
            <details className="mt-3 text-xs text-crm-fg-muted" open={!compact}>
                <summary className="cursor-pointer font-semibold text-crm-fg">Ver alcance de cada sección</summary>
                <ul className="mt-2 space-y-1.5">
                    {access.map(item => <li key={item.label}><strong className="text-crm-fg">{item.label}:</strong> {item.detail}.</li>)}
                </ul>
            </details>
            {definition.limits.length > 0 && <ul className="mt-3 space-y-1 border-t border-crm-border pt-3 text-xs leading-relaxed text-crm-fg-muted">
                {definition.limits.map(limit => <li key={limit}>{limit}</li>)}
            </ul>}
        </section>
    );
}

export function RolesCatalog() {
    return (
        <details className="rounded-2xl border border-crm-border bg-crm-surface p-4">
            <summary className="cursor-pointer text-sm font-bold text-crm-fg">Roles disponibles y sus accesos</summary>
            <p className="mt-2 text-xs text-crm-fg-muted">Asigná el perfil al crear o editar un usuario. Las cuentas existentes conservan su rol hasta que guardes un cambio.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                {Object.keys(ROLE_DEFINITIONS).map(role => <RoleAccessDetails key={role} user={{ role }} compact />)}
            </div>
        </details>
    );
}
