/**
 * Helper client to perform fetch operations to the workshop API endpoints
 */
export function workshopFetch(path, { token, headers = {}, ...options } = {}) {
    const isDev = process.env.NODE_ENV !== 'production';
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const cleanBaseUrl = isDev ? API_URL.replace(/\/+$/, '') : '';

    const cleanPath = path.replace(/^\/+/, '');
    const fullUrl = cleanBaseUrl ? `${cleanBaseUrl}/${cleanPath}` : `/${cleanPath}`;

    // Combine headers safely
    const reqHeaders = { ...headers };

    if (token) {
        reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Do NOT set Content-Type if the body is FormData (let browser calculate boundaries)
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (options.body && !isFormData && !reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json';
    }

    return fetch(fullUrl, {
        ...options,
        headers: reqHeaders
    });
}
