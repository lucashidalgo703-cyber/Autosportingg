export default function CrmBadge({ children, variant = 'info', className = '' }) {
    const variants = {
        success: 'bg-crm-success/20 text-crm-success border border-crm-success/30',
        warning: 'bg-crm-warning/20 text-crm-warning border border-crm-warning/30',
        danger: 'bg-crm-red/20 text-crm-red border border-crm-red/30',
        info: 'bg-crm-info/20 text-crm-info border border-crm-info/30',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]} ${className}`.trim()}>
            {children}
        </span>
    );
}
