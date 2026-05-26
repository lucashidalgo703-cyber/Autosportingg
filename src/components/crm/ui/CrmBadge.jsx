export default function CrmBadge({ children, variant = 'info' }) {
    const variants = {
        success: 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30',
        warning: 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30',
        danger: 'bg-[#EF3329]/20 text-[#EF3329] border border-[#EF3329]/30',
        info: 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]}`}>
            {children}
        </span>
    );
}
