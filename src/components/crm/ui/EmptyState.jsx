import React from 'react';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';

export default function EmptyState({ icon: Icon, title = 'Sin resultados', description, action, helpTopic }) {
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
            
            {helpTopic && (
                <div className="mt-6 border-t border-crm-border/50 pt-4">
                    <Link href={`/admin/ayuda?tema=${helpTopic}`} className="inline-flex items-center gap-1.5 text-xs text-crm-fg-muted hover:text-crm-red transition-colors">
                        <HelpCircle size={14} />
                        ¿Necesitas ayuda con esta sección?
                    </Link>
                </div>
            )}
        </div>
    );
}
