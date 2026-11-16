"use client";
import { usePathname } from 'next/navigation';

export default function PublicChromeGate({ children }) {
    const pathname = usePathname();
    const isProtected = pathname?.startsWith('/crm') || pathname?.startsWith('/admin') || pathname?.startsWith('/gpt/') || pathname?.startsWith('/portal');
    
    if (isProtected) {
        return null;
    }
    
    return <>{children}</>;
}
