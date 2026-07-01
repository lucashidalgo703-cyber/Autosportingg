import React from 'react';

export default function MetricCard({ title, value, prefix = '', suffix = '', trend, trendValue, icon: Icon, className = '' }) {
    return (
        <div className={`rounded-[var(--crm-radius)] border border-crm-border bg-crm-surface p-4 shadow-[var(--crm-shadow-card)] transition-all hover:border-crm-border-strong ${className}`.trim()}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">{title}</span>
                {Icon && <Icon size={16} className="text-crm-fg-subtle shrink-0" />}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">
                    {prefix}{value}{suffix}
                </span>
                {trendValue && (
                    <span className={`text-xs font-semibold ${trend === 'up' ? 'text-crm-success' : trend === 'down' ? 'text-crm-red' : 'text-crm-fg-muted'}`}>
                        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {trendValue}
                    </span>
                )}
            </div>
        </div>
    );
}
