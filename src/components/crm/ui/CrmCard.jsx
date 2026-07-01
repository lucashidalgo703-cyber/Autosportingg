export default function CrmCard({ children, className = '' }) {
    return (
        <div className={`rounded-xl border border-crm-border bg-crm-surface p-4 shadow-sm sm:p-5 ${className}`}>
            {children}
        </div>
    );
}
