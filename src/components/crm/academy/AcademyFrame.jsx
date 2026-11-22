'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { roleTrainingSections } from '../../../lib/academy/catalog';
import { roleLabel } from '../../../utils/adminPermissions';

export default function AcademyFrame({ children }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';

    // Secciones visibles según rol
    const visibleSections = roleTrainingSections.filter(([id]) => {
        if (id === 'gestion') return isOwnerOrAdmin;
        return true;
    });

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 md:p-8">
            <header className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-5 sm:p-6 shadow-xl backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/10 border border-red-600/30 text-base">
                                🎓
                            </span>
                            <Link href="/admin/academy" className="text-xs font-bold uppercase tracking-wider text-crm-red">
                                AutoSporting Academy
                            </Link>
                            <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                                {roleLabel(user?.role) || 'Capacitación'}
                            </span>
                        </div>
                        <h1 className="mt-2 text-lg sm:text-xl font-bold text-white tracking-tight">
                            Capacitación Práctica por Rol y Escuela de Negocios
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                            AutoSporting · Comodoro Rivadavia, Chubut · Entorno de aprendizaje y práctica operativa con datos simulados
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/admin"
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800 hover:text-white transition-all cursor-pointer"
                        >
                            ← Volver al CRM
                        </Link>
                    </div>
                </div>

                {/* Barra de navegación de espacios de formación */}
                <nav aria-label="Espacios de capacitación" className="mt-6 flex gap-1.5 overflow-x-auto pb-1 text-xs font-medium no-scrollbar border-t border-zinc-800/80 pt-4">
                    {visibleSections.map(([id, title]) => {
                        const href = id === 'mi-capacitacion' ? '/admin/academy' : `/admin/academy/${id}`;
                        const isActive = id === 'mi-capacitacion'
                            ? (pathname === '/admin/academy' || pathname === '/admin/academy/mi-capacitacion')
                            : pathname === `/admin/academy/${id}`;

                        return (
                            <Link
                                key={id}
                                href={href}
                                className={`whitespace-nowrap rounded-xl px-3.5 py-2 transition-all font-semibold ${
                                    isActive
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                                        : 'border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-200'
                                }`}
                            >
                                {title}
                            </Link>
                        );
                    })}

                    <div className="ml-auto pl-2 flex items-center">
                        <Link
                            href="/admin/academy/cursos"
                            className={`whitespace-nowrap rounded-xl border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                                pathname.startsWith('/admin/academy/cursos') || pathname.startsWith('/admin/academy/simuladores')
                                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                                    : 'border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                            }`}
                        >
                            Catálogo Financiero
                        </Link>
                    </div>
                </nav>
            </header>

            <main className="min-h-[500px]">
                {children}
            </main>
        </div>
    );
}
