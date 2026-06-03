export default function CrmTextarea({ className = '', ...props }) {
    return (
        <textarea 
            className={`flex min-h-[80px] w-full rounded-lg border bg-crm-surface px-3 py-2 text-base md:text-sm text-crm-fg placeholder:text-crm-fg-subtle border-crm-border focus-visible:outline-none focus-visible:border-crm-red focus-visible:ring-2 focus-visible:ring-crm-red/30 disabled:cursor-not-allowed disabled:bg-crm-surface-raised transition-colors ${className}`}
            {...props}
        />
    );
}
