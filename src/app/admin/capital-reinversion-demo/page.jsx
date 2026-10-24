import { ArrowLeft, ChartNoAxesCombined } from 'lucide-react';
import Link from 'next/link';
import CapitalReinvestmentPanel from '../../../components/crm/treasury/CapitalReinvestmentPanel.jsx';
import { projectCapitalReinvestment } from '../../../services/capitalReinvestmentEngine.js';
import { capitalReinvestmentDemoSnapshot } from '../../../services/capitalReinvestmentDemoFixtures.js';

export const metadata = {
    title: 'Capital y Reinversión · AutoSporting',
    description: 'Demostración local de capital recuperado y reinversión con datos ficticios.'
};

export default function CapitalReinvestmentDemoPage() {
    const projection = projectCapitalReinvestment(capitalReinvestmentDemoSnapshot);

    return (
        <main className="mx-auto w-full max-w-[1500px] space-y-7 px-4 py-6 text-crm-fg sm:px-6 lg:px-8 lg:py-8">
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-crm-fg-muted transition hover:text-crm-fg">
                <ArrowLeft size={16} aria-hidden="true" /> Volver al panel
            </Link>
            <header className="rounded-3xl border border-cyan-400/15 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-500/15 via-[#101820] to-[#101820] p-5 sm:p-7">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200">
                        <ChartNoAxesCombined size={22} aria-hidden="true" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Tesorería estratégica · Demostración</p>
                        <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Capital y Reinversión</h1>
                    </div>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-crm-fg-muted sm:text-base">
                    Una vista de consulta para separar lo recuperado, lo asignado a Stock, los pagos de nuevas compras y la liquidez conciliada, sin realizar movimientos de dinero.
                </p>
            </header>
            <CapitalReinvestmentPanel projection={projection} />
        </main>
    );
}
