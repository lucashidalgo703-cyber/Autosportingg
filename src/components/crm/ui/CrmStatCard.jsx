import CrmCard from './CrmCard';

export default function CrmStatCard({ title, value, prefix = '', suffix = '', trend, trendValue }) {
    return (
        <CrmCard className="flex flex-col gap-2">
            <h3 className="text-[#A1A1AA] text-sm font-medium m-0 p-0 leading-none">{title}</h3>
            <div className="flex items-end gap-2">
                <span className="text-white text-3xl font-bold m-0 p-0 leading-none tracking-tight">
                    {prefix}{value}{suffix}
                </span>
            </div>
            {trend && (
                <div className="flex items-center gap-1 mt-1">
                    <span className={`text-xs font-medium ${trend === 'up' ? 'text-[#22C55E]' : trend === 'down' ? 'text-[#EF3329]' : 'text-[#A1A1AA]'}`}>
                        {trendValue}
                    </span>
                    <span className="text-[#A1A1AA] text-xs">vs mes anterior</span>
                </div>
            )}
        </CrmCard>
    );
}
