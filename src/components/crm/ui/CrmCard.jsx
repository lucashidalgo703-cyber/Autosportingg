export default function CrmCard({ children, className = '' }) {
    return (
        <div className={`bg-[#1E1E24] rounded-2xl border border-[#33333A] p-5 shadow-sm ${className}`}>
            {children}
        </div>
    );
}
