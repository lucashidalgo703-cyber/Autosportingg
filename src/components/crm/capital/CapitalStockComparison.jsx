import Link from 'next/link';
import { capitalComponents, capitalMoment, capitalMoney, capitalQuality, capitalValue } from '../../../utils/capitalHistoryView';

export default function CapitalStockComparison({ current, currency, basis }) {
    const stock = current?.stockComparison;
    if (!stock) return null;
    const published = basis === 'published';
    const fields = published
        ? [['Total de Stock · valor publicado', 'asking'], ['Parte de inversores incluida', 'investorAsking'], ['Parte de terceros incluida', 'thirdPartyAsking'], ['Participación sin distribuir incluida', 'unallocatedAsking']]
        : [['Total de Stock · capital invertido', 'cost'], ['Parte de inversores incluida', 'investorCost'], ['Participación sin distribuir incluida', 'unallocatedCost']];
    const components = capitalComponents(current, currency, basis);
    const own = components.find(component => component.key === 'stockPropioCosto');
    const quality = capitalQuality(current, basis);
    return <section aria-label="Comparación con Stock" data-capital-stock-comparison className="space-y-4 rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-base font-bold text-crm-fg">Cómo coincide con Stock</h2><p className="mt-1 text-xs text-crm-fg-muted">{stock.count} unidades disponibles · Inventario completo, sin filtros · {currency}</p></div><Link href="/admin/stock" className="inline-flex min-h-10 items-center rounded-lg border border-crm-border px-3 text-xs font-semibold text-blue-400">Ver Stock</Link></div>
        <p className="text-sm text-crm-fg-muted">Stock muestra el valor de los vehículos, incluyendo la parte de los inversores. El capital propio toma la parte de AutoSporting, suma caja y cartera y descuenta las obligaciones.</p>
        <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-crm-border bg-crm-bg p-3"><h3 className="mb-2 text-xs font-bold uppercase text-crm-fg-muted">Del total de Stock a tu parte</h3><dl className="divide-y divide-crm-border">{fields.map(([label, field], index) => <div key={field} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-2 text-xs"><dt className="text-crm-fg-muted">{index > 0 && <span>− </span>}<span>{label}</span></dt><dd className="break-words text-right font-semibold text-crm-fg">{capitalMoney(stock[field]?.[currency], currency)}</dd></div>)}<div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-3 text-sm"><dt className="font-bold text-crm-fg">Mi parte · AutoSporting</dt><dd className="text-right font-bold text-crm-fg">{capitalMoney(own?.value, currency)}</dd></div></dl>{!published && <p className="border-t border-crm-border pt-3 text-xs text-crm-fg-muted">Costo de terceros excluido del total: {capitalMoney(stock.thirdPartyCost?.[currency], currency)}. Las consignaciones y otros terceros no son capital propio.</p>}</div>
            <div className="rounded-xl border border-crm-border bg-crm-bg p-3"><h3 className="mb-2 text-xs font-bold uppercase text-crm-fg-muted">De tu stock al capital propio actual</h3><dl className="divide-y divide-crm-border">{components.map(component => <div key={component.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-2 text-xs"><dt className="text-crm-fg-muted">{component.sign} {component.label}</dt><dd className="text-right font-semibold text-crm-fg">{capitalMoney(component.value, currency)}</dd></div>)}<div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-3 text-sm"><dt className="font-bold text-crm-fg">Capital propio actual{quality.partial ? ' · parcial' : ''}</dt><dd className="text-right font-bold text-crm-fg">{capitalMoney(capitalValue(current, currency, basis), currency)}</dd></div></dl></div>
        </div>
        <p className="text-xs text-crm-fg-muted">Esta comparación usa una misma lectura actual: {capitalMoment(current.asOf)}. El historial conserva la fecha y los importes de cada captura; puede diferir de la consulta actual cuando hay movimientos posteriores.</p>
        {quality.partial && <p className="rounded-lg border border-amber-400/25 bg-amber-400/5 p-3 text-xs text-amber-200">Datos parciales: se muestran subtotales conocidos. {quality.message}</p>}
    </section>;
}
