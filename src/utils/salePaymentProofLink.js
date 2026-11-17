// Only this protected review destination may resume after CRM sign-in. The URL
// identifies an operation and proof; it never carries a session or file access.
export function salePaymentProofTarget(value) {
    if (typeof value !== 'string' || !value.startsWith('/admin/ventas/') || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
    try {
        const url = new URL(value, 'https://autosporting.local');
        const path = url.pathname.match(/^\/admin\/ventas\/([a-f0-9]{24})$/i);
        if (url.origin !== 'https://autosporting.local' || url.username || url.password || url.hash || !path) return null;
        const fields = [...url.searchParams.keys()];
        if (fields.length !== 2 || url.searchParams.getAll('section').length !== 1 || url.searchParams.getAll('comprobante').length !== 1) return null;
        const proofId = url.searchParams.get('comprobante');
        if (url.searchParams.get('section') !== 'collections' || !/^[a-f0-9]{24}$/i.test(proofId || '')) return null;
        return '/admin/ventas/' + path[1].toLowerCase() + '?section=collections&comprobante=' + proofId.toLowerCase();
    } catch { return null; }
}
