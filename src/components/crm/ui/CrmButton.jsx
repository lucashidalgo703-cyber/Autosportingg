export default function CrmButton({ children, onClick, variant = 'primary', className = '' }) {
    const base = "appearance-none inline-flex justify-center items-center text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0B0D]";
    
    // Size adjustments based on variant
    const isIcon = variant === 'icon';
    const sizeClasses = isIcon ? "h-8 w-8 rounded-lg" : "h-10 px-4 rounded-lg"; // h-10 is standard height
    
    const variants = {
        primary: "bg-[#E63027] border border-transparent text-white hover:bg-[#C42620] focus:ring-[#EF3329]",
        secondary: "bg-[#1E1E24] border border-[#33333A] text-[#FAFAFA] hover:bg-[#28282E] focus:ring-[#EF3329]",
        ghost: "bg-transparent border border-transparent text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#28282E] focus:ring-[#EF3329]",
        danger: "bg-[#E63027] border border-transparent text-white hover:bg-[#C42620] focus:ring-[#EF3329]",
        icon: "bg-[#1E1E24] border border-[#33333A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#28282E] focus:ring-[#EF3329]",
    };
    
    return (
        <button className={`${base} ${sizeClasses} ${variants[variant]} ${className}`} onClick={onClick}>
            {children}
        </button>
    );
}

export function CrmIconButton({ children, onClick, className = '' }) {
    return (
        <CrmButton variant="icon" onClick={onClick} className={className}>
            {children}
        </CrmButton>
    );
}
