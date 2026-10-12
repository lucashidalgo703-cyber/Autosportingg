import CrmSettings from '../models/CrmSettings.js';

// URL oficial y recurso público de Ámbito Financiero para el Dólar Blue
const AMBITO_URL_PRIMARY = 'https://mercados.ambito.com//dolar/informal/variacion';
const AMBITO_URL_FALLBACK = 'https://mercados.ambito.com/dolar/informal/variacion';
const AMBITO_SOURCE_PAGE = 'https://www.ambito.com/contenidos/dolar.html';

// Vigencia de la cotización en caché: 30 minutos (en milisegundos)
const CACHE_TTL_MS = 30 * 60 * 1000;

// Caché en memoria del servidor
let memoryCache = {
    rate: null,          // Cotización vendedora numérica (ej. 1540)
    compra: null,        // Cotización compradora numérica (ej. 1520)
    publishedAt: null,   // Fecha y hora provista por Ámbito (ej. "09/10/2026 - 18:55")
    lastFetchedAt: null, // Timestamp ISO de la última consulta exitosa
    lastFetchedDisplay: null, // Formateado en hora de Argentina
    source: 'Ámbito Financiero',
    sourceUrl: AMBITO_SOURCE_PAGE,
    isManual: false,
    status: 'unavailable', // 'ok' | 'outdated' | 'manual' | 'unavailable'
    warning: null
};

/**
 * Formatea una fecha en zona horaria America/Argentina/Buenos_Aires
 */
export function formatArgentinaDateTime(date = new Date()) {
    try {
        return new Intl.DateTimeFormat('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(date);
    } catch {
        return date.toISOString();
    }
}

/**
 * Parsea un string de precio argentino (ej. "1540,00" o "1.540,50") a número float
 */
function parsePrice(value) {
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (!value) return 0;
    const clean = String(value).trim().replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

/**
 * Consulta la cotización en tiempo real desde la API pública de Ámbito Financiero
 */
async function fetchFromAmbito() {
    const urls = [AMBITO_URL_PRIMARY, AMBITO_URL_FALLBACK];
    let lastError = null;

    for (const url of urls) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6500);

        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*'
                },
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!res.ok) {
                throw new Error(`Ámbito HTTP error ${res.status}`);
            }

            const data = await res.json();
            if (!data || !data.venta) {
                throw new Error('Respuesta de Ámbito no contiene campo venta');
            }

            const ventaNum = parsePrice(data.venta);
            const compraNum = parsePrice(data.compra);

            if (ventaNum <= 0) {
                throw new Error(`Valor de venta inválido de Ámbito: ${data.venta}`);
            }

            const now = new Date();
            return {
                rate: ventaNum,
                compra: compraNum,
                publishedAt: data.fecha || 'Reciente',
                lastFetchedAt: now.toISOString(),
                lastFetchedDisplay: formatArgentinaDateTime(now),
                source: 'Ámbito Financiero',
                sourceUrl: AMBITO_SOURCE_PAGE,
                isManual: false,
                status: 'ok',
                warning: null
            };
        } catch (err) {
            clearTimeout(timeout);
            lastError = err;
        }
    }

    throw lastError || new Error('No se pudo conectar con Ámbito Financiero');
}

/**
 * Obtiene la cotización del dólar blue (desde caché, BD o Ámbito)
 * @param {boolean} forceRefresh - Si es true, ignora el TTL y consulta a Ámbito
 */
export async function getDolarBlueRate(forceRefresh = false) {
    const now = Date.now();
    const hasValidCache = memoryCache.rate && memoryCache.rate > 0;
    const isCacheFresh = hasValidCache && memoryCache.lastFetchedAt && 
        (now - new Date(memoryCache.lastFetchedAt).getTime() < CACHE_TTL_MS);

    // Si no se pide forzar y la caché en memoria sigue fresca, retornarla directamente
    if (!forceRefresh && isCacheFresh && !memoryCache.isManual) {
        return memoryCache;
    }

    // Intentar consultar a Ámbito Financiero
    try {
        const freshData = await fetchFromAmbito();
        memoryCache = { ...freshData };

        // Persistir en MongoDB (CrmSettings) de forma asíncrona sin bloquear
        try {
            if (CrmSettings) {
                await CrmSettings.findOneAndUpdate(
                    {},
                    {
                        $set: {
                            'dolarBlueConfig': {
                                rate: freshData.rate,
                                compra: freshData.compra,
                                publishedAt: freshData.publishedAt,
                                lastFetchedAt: new Date(freshData.lastFetchedAt),
                                source: freshData.source,
                                sourceUrl: freshData.sourceUrl,
                                isManual: false,
                                status: 'ok'
                            }
                        }
                    },
                    { new: true, upsert: true }
                ).catch(() => {});
            }
        } catch (dbErr) {
            console.error('Error guardando dolarBlueConfig en CrmSettings:', dbErr);
        }

        return memoryCache;
    } catch (fetchErr) {
        console.warn('Advertencia al consultar Ámbito Financiero:', fetchErr?.message || fetchErr);

        // Si falló el fetch directo, intentar recuperar la última cotización guardada en BD
        if (!hasValidCache) {
            try {
                if (CrmSettings) {
                    const settings = await CrmSettings.findOne().lean();
                    const saved = settings?.dolarBlueConfig;
                    if (saved && saved.rate > 0) {
                        memoryCache = {
                            rate: saved.rate,
                            compra: saved.compra || 0,
                            publishedAt: saved.publishedAt || 'Fecha no registrada',
                            lastFetchedAt: saved.lastFetchedAt ? new Date(saved.lastFetchedAt).toISOString() : new Date().toISOString(),
                            lastFetchedDisplay: saved.lastFetchedAt ? formatArgentinaDateTime(new Date(saved.lastFetchedAt)) : formatArgentinaDateTime(),
                            source: saved.source || 'Ámbito Financiero',
                            sourceUrl: saved.sourceUrl || AMBITO_SOURCE_PAGE,
                            isManual: Boolean(saved.isManual),
                            status: saved.isManual ? 'manual' : 'outdated',
                            warning: saved.isManual ? null : 'Cotización guardada previamente (no se pudo conectar con Ámbito ahora)'
                        };
                        return memoryCache;
                    }
                }
            } catch (dbErr) {
                console.error('Error leyendo dolarBlueConfig de CrmSettings:', dbErr);
            }
        }

        // Si ya teníamos una cotización previa en memoria, la mantenemos pero avisamos que está desactualizada
        if (hasValidCache) {
            memoryCache = {
                ...memoryCache,
                status: memoryCache.isManual ? 'manual' : 'outdated',
                warning: memoryCache.isManual 
                    ? null 
                    : 'Cotización desactualizada - no se pudo actualizar con Ámbito Financiero'
            };
            return memoryCache;
        }

        // Si no hay ninguna cotización previa en memoria ni en BD
        return {
            rate: null,
            compra: null,
            publishedAt: null,
            lastFetchedAt: null,
            lastFetchedDisplay: null,
            source: 'Ámbito Financiero',
            sourceUrl: AMBITO_SOURCE_PAGE,
            isManual: false,
            status: 'unavailable',
            warning: 'Cotización no disponible (no se pudo conectar con Ámbito Financiero)'
        };
    }
}

/**
 * Permite a un administrador establecer manualmente una cotización de respaldo
 */
export async function setManualDolarBlueRate(rate) {
    const num = parsePrice(rate);
    if (num <= 0) {
        throw new Error('La cotización debe ser un número mayor a cero');
    }

    const now = new Date();
    const manualConfig = {
        rate: num,
        compra: num,
        publishedAt: formatArgentinaDateTime(now),
        lastFetchedAt: now.toISOString(),
        lastFetchedDisplay: formatArgentinaDateTime(now),
        source: 'Cotización manual',
        sourceUrl: AMBITO_SOURCE_PAGE,
        isManual: true,
        status: 'manual',
        warning: null
    };

    memoryCache = { ...manualConfig };

    try {
        if (CrmSettings) {
            await CrmSettings.findOneAndUpdate(
                {},
                {
                    $set: {
                        'dolarBlueConfig': {
                            rate: num,
                            compra: num,
                            publishedAt: manualConfig.publishedAt,
                            lastFetchedAt: now,
                            source: manualConfig.source,
                            sourceUrl: manualConfig.sourceUrl,
                            isManual: true,
                            status: 'manual'
                        }
                    }
                },
                { new: true, upsert: true }
            );
        }
    } catch (err) {
        console.error('Error guardando cotización manual en CrmSettings:', err);
    }

    return memoryCache;
}
