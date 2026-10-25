import Link from 'next/link';
import { academySections } from '../../../lib/academy/catalog';

export default function AcademyFrame({ children }) {
    return <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
        <header className="border-b border-crm-border pb-5">
            <Link href="/admin/academy" className="text-xs font-bold uppercase tracking-wider text-crm-red">AutoSporting Academy</Link>
            <p className="mt-2 text-sm text-crm-fg-muted">Educación financiera empresarial · Entorno de aprendizaje con datos ficticios</p>
            <Link href="/admin" className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-crm-border px-3 text-sm font-semibold hover:bg-crm-surface">Volver al CRM</Link>
        </header>
        <nav aria-label="Secciones de Academy" className="flex flex-wrap gap-2">
            <Link className="rounded-lg border border-crm-border px-3 py-2 text-sm hover:bg-crm-surface" href="/admin/academy">Panel</Link>
            {academySections.map(([id, title]) => <Link key={id} className="rounded-lg border border-crm-border px-3 py-2 text-sm hover:bg-crm-surface" href={`/admin/academy/${id}`}>{title}</Link>)}
        </nav>
        {children}
    </div>;
}
