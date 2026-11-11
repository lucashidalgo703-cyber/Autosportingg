"use client";
import { usePathname } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';
export default function SiteAnalytics() {
    const pathname = usePathname();
    // Bearer links and authenticated CRM views are never analytics events.
    if (!pathname || ['/admin', '/crm', '/propietario', '/nps', '/encuesta'].some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))) return null;
    return <Analytics />;
}
