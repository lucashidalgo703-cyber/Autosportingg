import CrmCard from './CrmCard';

export default function CrmStatCard({ title, value, prefix = '', suffix = '', trend, trendValue }) {
    return (
        <div className="bg-crm-surface rounded-xl border border-crm-border p-5 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl flex flex-col gap-2">
            <h3 className="text-crm-fg-muted text-sm font-medium m-0 p-0 leading-none">{title}</h3>
            <div className="flex items-end gap-2">
                <span className="text-white text-3xl font-bold m-0 p-0 leading-none tracking-tight">
                    {prefix}{value}{suffix}
                </span>
            </div>
            {trend && (
                <div className="flex items-center gap-1 mt-1">
                    <span className={`text-xs font-medium ${trend === 'up' ? 'text-crm-success' : trend === 'down' ? 'text-crm-red' : 'text-crm-fg-muted'}`}>
                        {trendValue}
                    </span>
                    <span className="text-crm-fg-muted text-xs">vs mes anterior</span>
                </div>
            )}
        </div>
    );
}
