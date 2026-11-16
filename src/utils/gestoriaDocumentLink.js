// Only the documentation destination is carried through CRM sign-in.
export function gestoriaDocumentTarget(value) {
    if (typeof value !== 'string' || !value.startsWith('/admin/gestoria?')) return null;
    try {
        const url = new URL(value, 'https://autosporting.local');
        if (url.origin !== 'https://autosporting.local' || url.pathname !== '/admin/gestoria' || url.hash) return null;
        const saleId = url.searchParams.get('documentos');
        return /^[a-f0-9]{24}$/i.test(saleId || '') ? '/admin/gestoria?documentos=' + saleId.toLowerCase() : null;
    } catch { return null; }
}
