export default function CrmCard({ children, className = '' }) {
    return (
        <div className={`rounded-[var(--crm-radius)] border border-crm-border bg-crm-surface p-4 shadow-[var(--crm-shadow-card)] sm:p-5 ${className}`}>
            {children}
        </div>
    );
}
