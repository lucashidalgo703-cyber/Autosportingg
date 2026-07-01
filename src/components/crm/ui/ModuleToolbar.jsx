import React from 'react';

export default function ModuleToolbar({ title, description, actions, filters }) {
    return (
        <div className="flex flex-col gap-4 rounded-lg border border-crm-border bg-crm-surface p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
                <h1 className="text-base font-bold text-crm-fg tracking-tight">{title}</h1>
                {description && <p className="text-xs text-crm-fg-muted">{description}</p>}
            </div>
            {(filters || actions) && (
                <div className="flex flex-wrap items-center gap-2.5 md:justify-end">
                    {filters && <div className="flex flex-wrap items-center gap-1.5">{filters}</div>}
                    {actions && <div className="flex items-center gap-1.5">{actions}</div>}
                </div>
            )}
        </div>
    );
}
