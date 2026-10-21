import CrmSettings from '../models/CrmSettings.js';

// URL oficial y recurso público de Ámbito Financiero para el Dólar Blue
const AMBITO_URL_PRIMARY = 'https://mercados.ambito.com//dolar/informal/variacion';
const AMBITO_URL_FALLBACK = 'https://mercados.ambito.com/dolar/informal/variacion';
const AMBITO_URL_HISTORICO = 'https://mercados.ambito.com//dolar/informal/grafico/anual';
const AMBITO_SOURCE_PAGE = 'https://www.ambito.com/contenidos/dolar.html';

// Vigencia de la cotización en caché: 30 minutos (en milisegundos)
const CACHE_TTL_MS = 30 * 60 * 1000;
const HISTORY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de vigencia para serie histórica diaria

// Caché en memoria de la serie histórica anual
let historyCache = {
    series: null, // { 'YYYY-MM-DD': number }
    lastFetchedAt: null,
    source: 'Ámbito Financiero',
    sourceUrl: AMBITO_SOURCE_PAGE,
    count: 0
};

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


/**
 * Formatea una fecha o timestamp a formato ISO YYYY-MM-DD en hora de Argentina
 */
export function formatArgentinaDateOnly(date) {
    if (!date) return null;
    try {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return null;
        const parts = new Intl.DateTimeFormat('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(d);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        if (!year || !month || !day) return null;
        return `${year}-${month}-${day}`;
    } catch {
        return null;
    }
}

/**
 * Resuelve la cotización histórica aplicable para una fecha dada.
 * Si la fecha exacta no tiene cotización (fin de semana o feriado), busca el día hábil previo más cercano.
 * Si la fecha está fuera de la serie histórica, devuelve null (no inventa valores).
 */
export function resolveHistoricalRate(date, series, rateType = 'venta') {
    if (!series || typeof series !== 'object') {
        return {
            rate: null,
            rateDate: null,
            isExactDate: false,
            isSubstituted: false,
            substitutedFromDate: null,
            rateType: `Dólar blue (${rateType})`,
            source: 'Ámbito Financiero — dólar blue',
            note: 'Serie histórica no provista o no disponible'
        };
    }
    const iso = formatArgentinaDateOnly(date);
    if (!iso) {
        return {
            rate: null,
            rateDate: null,
            isExactDate: false,
            isSubstituted: false,
            substitutedFromDate: null,
            rateType: `Dólar blue (${rateType})`,
            source: 'Ámbito Financiero — dólar blue',
            note: 'Fecha no válida'
        };
    }
    // 1. Coincidencia exacta
    if (series[iso] && Number(series[iso]) > 0) {
        return {
            rate: Number(series[iso]),
            rateDate: iso,
            isExactDate: true,
            isSubstituted: false,
            substitutedFromDate: null,
            rateType: `Dólar blue (${rateType})`,
            source: 'Ámbito Financiero — dólar blue',
            note: `Cotización exacta del día de la venta (${iso})`
        };
    }
    // 2. Buscar hacia atrás el último día hábil anterior disponible (hasta 10 días hacia atrás)
    const baseDate = new Date(`${iso}T12:00:00Z`);
    if (!isNaN(baseDate.getTime())) {
        for (let offset = 1; offset <= 10; offset++) {
            const prev = new Date(baseDate.getTime() - offset * 24 * 60 * 60 * 1000);
            const prevIso = prev.toISOString().slice(0, 10);
            if (series[prevIso] && Number(series[prevIso]) > 0) {
                return {
                    rate: Number(series[prevIso]),
                    rateDate: prevIso,
                    isExactDate: false,
                    isSubstituted: true,
                    substitutedFromDate: prevIso,
                    rateType: `Dólar blue (${rateType})`,
                    source: 'Ámbito Financiero — dólar blue',
                    note: `Sustitución por último día hábil anterior disponible (${prevIso}) para operación del ${iso}`
                };
            }
        }
    }
    // 3. Fuera de serie
    return {
        rate: null,
        rateDate: null,
        isExactDate: false,
        isSubstituted: false,
        substitutedFromDate: null,
        rateType: `Dólar blue (${rateType})`,
        source: 'Ámbito Financiero — dólar blue',
        note: `Sin cotización histórica anterior disponible en Ámbito para ${iso}`
    };
}

/**
 * Obtiene la serie histórica anual de Dólar Blue provista por Ámbito Financiero
 * con caché en memoria y tolerancia a fallos.
 */
export async function getDolarBlueHistoricalSeries(forceRefresh = false) {
    const now = Date.now();
    const hasValidCache = historyCache.series && Object.keys(historyCache.series).length > 0;
    const isCacheFresh = hasValidCache && historyCache.lastFetchedAt &&
        (now - new Date(historyCache.lastFetchedAt).getTime() < HISTORY_CACHE_TTL_MS);

    if (!forceRefresh && isCacheFresh) {
        return historyCache;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7500);
        const res = await fetch(AMBITO_URL_HISTORICO, {
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
        if (Array.isArray(data) && data.length > 1) {
            const series = {};
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (Array.isArray(row) && row.length >= 2) {
                    const [dateStr, val] = row;
                    if (typeof dateStr === 'string' && dateStr.includes('/')) {
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                            const [d, m, y] = parts;
                            const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                            const num = typeof val === 'number' ? val : parseFloat(val);
                            if (num > 0) {
                                series[iso] = num;
                            }
                        }
                    }
                }
            }

            const count = Object.keys(series).length;
            if (count > 0) {
                historyCache = {
                    series,
                    lastFetchedAt: new Date().toISOString(),
                    source: 'Ámbito Financiero',
                    sourceUrl: AMBITO_SOURCE_PAGE,
                    count
                };
                return historyCache;
            }
        }
        throw new Error('Respuesta de serie histórica de Ámbito vacía o inválida');
    } catch (err) {
        console.warn('Advertencia obteniendo serie histórica de Ámbito:', err?.message || err);
        if (hasValidCache) {
            return historyCache;
        }
        return {
            series: {},
            lastFetchedAt: null,
            source: 'Ámbito Financiero',
            sourceUrl: AMBITO_SOURCE_PAGE,
            count: 0
        };
    }
}
