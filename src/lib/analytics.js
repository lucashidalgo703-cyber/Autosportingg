const getSessionId = () => {
    if (typeof window === 'undefined') return 'server';
    let sessionId = sessionStorage.getItem('as_session_id');
    if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('as_session_id', sessionId);
    }
    return sessionId;
};

const getUTMs = () => {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    return {
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
    };
};

export const trackEvent = async (eventName, metadata = {}, vehicleId = null) => {
    try {
        if (typeof window === 'undefined') return; // Do not run on SSR

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const utms = getUTMs();
        
        const payload = {
            sessionId: getSessionId(),
            event: eventName,
            path: window.location.pathname,
            metadata,
            vehicleId,
            ...utms
        };

        // Use keepalive to ensure the request is sent even if the user navigates away
        fetch(`${API_URL}/api/public/analytics/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true 
        }).catch(err => console.debug('Analytics failed', err)); // Fail silently
        
    } catch (error) {
        console.debug('Analytics Error:', error);
    }
};
