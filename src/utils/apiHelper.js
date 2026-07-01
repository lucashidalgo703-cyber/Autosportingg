export const parseResponseSafe = async (res) => {
    const contentType = res.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.message || data.error || `Error HTTP ${res.status}`);
        }
        return data;
    }
    
    const text = await res.text();
    if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}: Respuesta inesperada del servidor.`);
    }
    
    throw new Error(`Error de formato (Status ${res.status}): El servidor retornó contenido no-JSON (posiblemente una redirección o página 404).`);
};
