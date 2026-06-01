export default function CrmButton({ children, onClick, variant = 'primary', className = '' }) {
    const base = "inline-flex justify-center items-center text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0B0D]";
    
    // Size adjustments based on variant
    const isIcon = variant === 'icon';
    const sizeClasses = isIcon ? "h-8 w-8 rounded-lg" : "px-4 py-2 rounded-lg";
    
    const variants = {
        primary: "bg-[#E63027] text-white hover:bg-[#C42620] focus:ring-[#EF3329]",
        secondary: "bg-[#1E1E24] text-white hover:bg-[#28282E] focus:ring-[#33333A] border border-[#33333A]",
        ghost: "bg-transparent text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#28282E]",
        danger: "bg-[#7f1d1d] text-white hover:bg-[#991b1b] focus:ring-red-500",
        icon: "bg-[#1E1E24] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#28282E] border border-[#33333A]",
    };
    
    return (
        <button className={`${base} ${sizeClasses} ${variants[variant]} ${className}`} onClick={onClick}>
            {children}
        </button>
    );
}
