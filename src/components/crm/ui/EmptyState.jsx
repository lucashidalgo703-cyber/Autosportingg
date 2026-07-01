import React from 'react';

export default function EmptyState({ icon: Icon, title = 'Sin resultados', description, action }) {
    return (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-crm-border bg-crm-surface p-8 text-center sm:p-12">
            {Icon && <Icon size={36} className="mb-3 text-crm-fg-subtle" />}
            <h3 className="m-0 text-sm font-semibold text-crm-fg">{title}</h3>
            {description && (
                <p className="m-0 mt-1.5 max-w-xs text-xs text-crm-fg-muted leading-relaxed sm:max-w-sm">
                    {description}
                </p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
