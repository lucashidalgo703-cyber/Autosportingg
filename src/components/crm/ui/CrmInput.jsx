export default function CrmInput({ className = '', ...props }) {
    return (
        <input 
            className={`flex h-9 w-full rounded-lg border bg-crm-surface px-3 py-2 text-base md:text-sm text-crm-fg placeholder:text-crm-fg-subtle border-crm-border focus-visible:outline-none focus-visible:border-crm-red focus-visible:ring-2 focus-visible:ring-crm-red/30 disabled:cursor-not-allowed disabled:bg-crm-surface-raised disabled:text-crm-fg-subtle transition-colors ${className}`}
            {...props}
        />
    );
}
