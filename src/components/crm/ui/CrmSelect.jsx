export default function CrmSelect({ className = '', children, ...props }) {
    return (
        <select 
            className={`flex h-9 w-full rounded-lg border bg-crm-surface px-3 py-1.5 text-base md:text-sm text-crm-fg border-crm-border focus-visible:outline-none focus-visible:border-crm-red focus-visible:ring-2 focus-visible:ring-crm-red/30 disabled:cursor-not-allowed disabled:bg-crm-surface-raised transition-colors ${className}`}
            {...props}
        >
            {children}
        </select>
    );
}
