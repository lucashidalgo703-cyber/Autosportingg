"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { capitalMoney, capitalPeriodLabel, capitalQuality, capitalStatusLabel, capitalValue } from '../../../utils/capitalHistoryView';

function HistoryTooltip({ active, payload, currency, basis }) {
    const point = payload?.find(item => item.payload?.row)?.payload;
    const row = point?.row;
    if (!active || !row) return null;
    return <div className="max-w-[260px] rounded-xl border border-crm-border bg-crm-surface p-3 text-xs text-crm-fg shadow-xl">
        <p className="font-bold">{capitalPeriodLabel(row.period)}</p>
        <p className="mt-1 text-crm-fg-muted">{capitalStatusLabel(row)}</p>
        {row.status !== 'missing' && <p className="mt-2 text-sm font-bold">Guardado: {capitalMoney(capitalValue(row, currency, basis), currency)}</p>}
        {row.status !== 'missing' && capitalQuality(row, basis).partial && <p className="mt-1 text-amber-300">Subtotal conocido · Datos parciales</p>}
        {point.current && <p className="mt-2 text-sm font-bold text-amber-300">Consulta actual: {capitalMoney(capitalValue(point.current, currency, basis), currency)}</p>}
        {point.current && capitalQuality(point.current, basis).partial && <p className="mt-1 text-amber-300">Consulta parcial · Subtotal conocido</p>}
    </div>;
}
export default function CapitalHistoryChart({ rows, current, currency, basis }) {
    const data = rows.map(row => {
        const storedValue = row.status === 'missing' ? null : capitalValue(row, currency, basis);
        const partial = capitalQuality(row, basis).partial;
        return { period: row.period, row, value: partial ? null : storedValue,
            partialValue: partial ? storedValue : null,
            current: row.period === current?.period ? current : null,
            currentValue: row.period === current?.period ? capitalValue(current, currency, basis) : null };
    });
    const hasValues = data.some(row => row.value !== null || row.partialValue !== null || row.currentValue !== null);
    if (!hasValues) return <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-crm-border p-5 text-center text-sm text-crm-fg-muted">No hay registros de capital en este período. Los meses sin datos se conservarán como «Sin registro».</div>;
    return <div aria-label={`Evolución del capital mensual en ${currency}`} className="min-w-0">
        <div className="h-72 min-w-0 w-full" data-capital-history-chart>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={data} margin={{ top: 16, right: 18, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke="var(--crm-border)" strokeDasharray="4 4" vertical={false}/>
                    <XAxis dataKey="period" tickFormatter={period => capitalPeriodLabel(period, true)} tick={{ fill: 'var(--crm-fg-muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={22}/>
                    <YAxis width={64} tickFormatter={value => new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} tick={{ fill: 'var(--crm-fg-muted)', fontSize: 11 }} tickLine={false} axisLine={false}/>
                    <Tooltip content={<HistoryTooltip currency={currency} basis={basis}/>} cursor={{ stroke: 'var(--crm-border)' }}/>
                    <Line type="linear" dataKey="value" name="Registro mensual" stroke="#ed2626" strokeWidth={3} connectNulls={false} dot={{ r: 4, fill: '#ed2626', stroke: '#ed2626' }} activeDot={{ r: 6 }} isAnimationActive={false}/>
                    <Line type="linear" dataKey="partialValue" name="Registro parcial · Subtotal conocido" stroke="#60a5fa" strokeWidth={0} connectNulls={false} dot={{ r: 6, fill: 'var(--crm-surface)', stroke: '#60a5fa', strokeWidth: 2 }} activeDot={{ r: 7, fill: 'var(--crm-surface)', stroke: '#60a5fa', strokeWidth: 2 }} isAnimationActive={false}/>
                    <Line type="linear" dataKey="currentValue" name="Mes en curso" stroke="#fbbf24" strokeWidth={0} connectNulls={false} dot={{ r: 6, fill: '#fbbf24', stroke: '#fbbf24' }} activeDot={{ r: 7 }} isAnimationActive={false}/>
                </LineChart>
            </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-crm-fg-muted"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-crm-red"/>Registros completos</span><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-blue-400"/>Registro parcial · Subtotal conocido</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400"/>Consulta actual · Mes en curso</span></div>
        <p className="mt-2 text-xs text-crm-fg-muted">Los meses sin registro y los registros parciales interrumpen la línea de evolución. ARS y USD se muestran por separado.</p>
    </div>;
}
