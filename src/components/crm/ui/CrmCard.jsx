export default function CrmCard({ children, className = '' }) {
    return (
        <div className={`bg-crm-surface rounded-2xl border border-crm-border p-5 shadow-sm ${className}`}>
            {children}
        </div>
    );
}
