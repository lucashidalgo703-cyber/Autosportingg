import React from 'react';

export default function CrmPageHeader({ 
    title, 
    subtitle, 
    actions 
}) {
    return (
        <div className="flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-start lg:justify-between mb-5">
            <div>
                <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">{title}</h1>
                {subtitle && (
                    <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                        {subtitle}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {actions}
                </div>
            )}
        </div>
    );
}
