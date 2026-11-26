// Preserve only the protected report destination through CRM sign-in.
export function issueReportTarget(value) {
    if (typeof value !== 'string' || !value.startsWith('/admin/reportar-problema?')
        || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
    try {
        const url = new URL(value, 'https://autosporting.local');
        if (url.origin !== 'https://autosporting.local' || url.pathname !== '/admin/reportar-problema'
            || url.username || url.password || url.hash || [...url.searchParams.keys()].length !== 1
            || url.searchParams.getAll('reportId').length !== 1) return null;
        const id = url.searchParams.get('reportId');
        return /^[a-f\d]{24}$/i.test(id || '') ? '/admin/reportar-problema?reportId=' + id.toLowerCase() : null;
    } catch { return null; }
}
