/**
 * Escapes regex characters to prevent ReDoS or injection in MongoDB queries
 * Converts the query to a string and limits its length.
 */
export const escapeRegex = (string) => {
    const rawString = typeof string === 'string' ? string : String(string || '');
    // Limit search query length to 100 characters to prevent ReDoS
    const limitedString = rawString.slice(0, 100);
    return limitedString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Normalizes MongoDB errors into generic HTTP errors
 */
export const handleMongoError = (error, res) => {
    if (error.code === 11000) {
        // Map E11000 for activeVehicleId index to HTTP 409
        const errorMsg = JSON.stringify(error.keyValue || error.message || '');
        if (errorMsg.includes('activeVehicleId')) {
            return res.status(409).json({ message: 'El vehículo ya posee una orden de taller activa.' });
        }
        return res.status(409).json({ message: 'El registro ya existe (duplicado).' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(400).json({ message: 'Datos inválidos o mal formateados.' });
    }
    console.error('[Workshop] Unexpected DB Error:', error.message);
    return res.status(500).json({ message: 'Error interno del servidor.' });
};
