"use client";
import { usePathname } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';

export default function AnalyticsGate() {
    const pathname = usePathname();
    // Private invitation tokens must not enter analytics page paths.
    return pathname?.startsWith('/portal') ? null : <Analytics beforeSend={event => {
        try { return new URL(event.url).pathname.startsWith('/portal') ? null : event; }
        catch { return null; }
    }}/>;
}
