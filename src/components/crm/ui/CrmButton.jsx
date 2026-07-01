export default function CrmButton({ children, onClick, variant = 'primary', size = 'md', className = '', ...props }) {
    const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red focus-visible:ring-offset-2 focus-visible:ring-offset-crm-bg disabled:pointer-events-none disabled:opacity-50";
    
    // Exact Sote Classes
    const variants = {
        primary: "bg-crm-red-gradient text-white shadow-crm-red hover:opacity-90 active:opacity-80",
        secondary: "bg-crm-surface text-crm-fg border border-crm-border hover:bg-crm-surface-raised",
        ghost: "bg-transparent border border-transparent text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface",
        danger: "bg-crm-red-gradient text-white shadow-crm-red hover:opacity-90 active:opacity-80",
        icon: "text-crm-fg-muted hover:bg-crm-surface hover:text-crm-fg border border-transparent"
    };
    
    const sizes = {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        icon: "h-9 w-9 rounded-lg" // Icon size exact to Sote (36x36px)
    };

    const finalVariant = variants[variant] || variants.primary;
    const finalSize = variant === 'icon' ? sizes.icon : (sizes[size] || sizes.md);
    
    return (
        <button 
            className={`${base} ${finalVariant} ${finalSize} ${className}`} 
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
}

export function CrmIconButton({ children, onClick, className = '', ...props }) {
    return (
        <CrmButton variant="icon" onClick={onClick} className={className} {...props}>
            {children}
        </CrmButton>
    );
}
