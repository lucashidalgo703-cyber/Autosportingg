"use client";
import { usePathname } from 'next/navigation';

export default function PublicChromeGate({ children }) {
    const pathname = usePathname();
    const isCrm = pathname?.startsWith('/crm');
    
    if (isCrm) {
        return null;
    }
    
    return <>{children}</>;
}
