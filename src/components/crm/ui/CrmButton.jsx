export default function CrmButton({ children, onClick, variant = 'primary', className = '' }) {
    const base = "inline-flex justify-center items-center px-4 py-2 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0B0D]";
    const variants = {
        primary: "bg-gradient-to-r from-[#E63027] to-[#C42620] text-white hover:from-[#EF3329] hover:to-[#E63027] focus:ring-[#EF3329] shadow-[0_0_15px_rgba(239,51,41,0.3)]",
        secondary: "bg-[#24242B] text-white hover:bg-[#33333A] focus:ring-[#515158] border border-[#33333A]",
    };
    
    return (
        <button className={`${base} ${variants[variant]} ${className}`} onClick={onClick}>
            {children}
        </button>
    );
}
