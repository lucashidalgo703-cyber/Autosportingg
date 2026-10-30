import CrmSettings from '../models/CrmSettings.js';
import Car from '../models/Car.js';

// Cache en memoria para la sesión activa de Nexo InfoAuto
let nexoSessionCache = {
    cookies: null,
    expiresAt: 0,
    username: null
};

/**
 * Iniciar sesión en la plataforma Nexo InfoAuto (NextAuth) y obtener cookies de sesión
 */
export async function loginNexoInfoAuto(username, password) {
    if (!username || !password) {
        return { ok: false, message: 'Usuario y contraseña requeridos' };
    }

    // Si ya tenemos una sesión vigente para el mismo usuario, reutilizarla
    const now = Date.now();
    if (nexoSessionCache.cookies && nexoSessionCache.username === username && nexoSessionCache.expiresAt > now) {
        return { ok: true, cookies: nexoSessionCache.cookies };
    }

    try {
        // 1. Obtener token CSRF
        const csrfRes = await fetch('https://nexo.infoauto.com.ar/api/auth/csrf');
        const setCookieHeaders = csrfRes.headers.getSetCookie 
            ? csrfRes.headers.getSetCookie() 
            : [csrfRes.headers.get('set-cookie')].filter(Boolean);
        const csrfData = await csrfRes.json().catch(() => null);
        const csrfToken = csrfData?.csrfToken;

        if (!csrfToken) {
            return { ok: false, message: 'No se pudo conectar con el portal de Nexo InfoAuto (CSRF token ausente).' };
        }

        const cookieHeader = setCookieHeaders.map(c => c.split(';')[0]).join('; ');

        // 2. Ejecutar login en NextAuth de Nexo
        const params = new URLSearchParams();
        params.append('csrfToken', csrfToken);
        params.append('username', username.trim());
        params.append('password', password.trim());
        params.append('redirect', 'false');
        params.append('callbackUrl', 'https://nexo.infoauto.com.ar/prices');
        params.append('json', 'true');

        const authRes = await fetch('https://nexo.infoauto.com.ar/api/auth/callback/credentials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookieHeader,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://nexo.infoauto.com.ar/login?callbackUrl=https%3A%2F%2Fnexo.infoauto.com.ar%2Fprices'
            },
            body: params.toString()
        });

        const authCookies = authRes.headers.getSetCookie 
            ? authRes.headers.getSetCookie() 
            : [authRes.headers.get('set-cookie')].filter(Boolean);
        const authBody = await authRes.text();

        let authJson = null;
        try { authJson = JSON.parse(authBody); } catch (_) {}

        if (authRes.status === 401 || (authJson && authJson.url && authJson.url.includes('error='))) {
            const errorParam = authJson?.url?.match(/error=([^&]+)/)?.[1] || '';
            let msg = 'Usuario o contraseña incorrectos en Nexo InfoAuto.';
            if (errorParam === 'USER_NOT_FOUND') {
                msg = 'Usuario no encontrado en Nexo InfoAuto. Verifica el correo o usuario ingresado.';
            } else if (errorParam === 'CredentialsSignin') {
                msg = 'Contraseña o credenciales inválidas en Nexo InfoAuto.';
            }
            return { ok: false, message: msg };
        }

        // Combinar todas las cookies de la sesión
        const allCookies = [...setCookieHeaders, ...authCookies].map(c => c.split(';')[0]).join('; ');

        // Guardar en cache por 12 horas
        nexoSessionCache = {
            cookies: allCookies,
            expiresAt: now + (12 * 60 * 60 * 1000),
            username
        };

        return {
            ok: true,
            cookies: allCookies,
            message: 'Sesión iniciada con éxito en Nexo InfoAuto.'
        };
    } catch (err) {
        console.error('Error loginNexoInfoAuto:', err);
        return { ok: false, message: 'Fallo al autenticar contra Nexo InfoAuto: ' + err.message };
    }
}

/**
 * Obtener la configuración actual de InfoAuto desde CrmSettings
 */
export async function getInfoAutoConfig() {
    const settings = await CrmSettings.findOne().lean();
    return settings?.infoAutoConfig || {
        enabled: true,
        apiUrl: 'https://nexo.infoauto.com.ar',
        username: '',
        password: '',
        apiKey: '',
        autoSyncMonthly: true,
        lastSyncAt: null,
        status: 'sin_configurar'
    };
}

/**
 * Guardar la configuración de InfoAuto en CrmSettings
 */
export async function saveInfoAutoConfig(config = {}, userId = null) {
    let settings = await CrmSettings.findOne();
    if (!settings) {
        settings = new CrmSettings();
    }

    const currentConfig = settings.infoAutoConfig || {};

    // Si la contraseña viene enmascarada y ya teníamos una, conservamos la guardada
    let effectivePassword = config.password !== undefined ? String(config.password).trim() : (currentConfig.password || '');
    if (effectivePassword === '••••••••' || effectivePassword === '********') {
        effectivePassword = currentConfig.password || '';
    }

    settings.infoAutoConfig = {
        enabled: config.enabled !== undefined ? Boolean(config.enabled) : (currentConfig.enabled ?? true),
        apiUrl: config.apiUrl ? String(config.apiUrl).trim() : (currentConfig.apiUrl || 'https://nexo.infoauto.com.ar'),
        username: config.username !== undefined ? String(config.username).trim() : (currentConfig.username || ''),
        password: effectivePassword,
        apiKey: config.apiKey !== undefined ? String(config.apiKey).trim() : (currentConfig.apiKey || ''),
        autoSyncMonthly: config.autoSyncMonthly !== undefined ? Boolean(config.autoSyncMonthly) : (currentConfig.autoSyncMonthly ?? true),
        lastSyncAt: config.lastSyncAt || currentConfig.lastSyncAt,
        status: config.status || (config.username ? 'conectado' : 'sin_configurar')
    };

    if (userId) {
        settings.updatedBy = userId;
    }

    await settings.save();

    // Invalidar cache de sesión para forzar nuevo login con las nuevas credenciales
    nexoSessionCache = { cookies: null, expiresAt: 0, username: null };

    return settings.infoAutoConfig;
}

/**
 * Probar conexión con el servicio de InfoAuto / Nexo
 */
export async function testInfoAutoConnection(config = {}) {
    const username = config.username || '';
    const password = config.password || '';

    if (!username || !password) {
        return {
            ok: false,
            message: 'Debes ingresar tu Usuario/Email y Contraseña de Nexo InfoAuto para probar la conexión.'
        };
    }

    const start = Date.now();
    const loginResult = await loginNexoInfoAuto(username, password);
    const latencyMs = Date.now() - start;

    if (!loginResult.ok) {
        return {
            ok: false,
            latencyMs,
            message: loginResult.message || 'No se pudo conectar con Nexo InfoAuto.'
        };
    }

    return {
        ok: true,
        latencyMs,
        status: 'conectado',
        message: 'Conexión y sesión verificadas exitosamente con Nexo InfoAuto.'
    };
}

/**
 * Consultar cotización oficial de InfoAuto para un vehículo
 */
export async function fetchInfoAutoPrice({ codia, brand, model, year }) {
    const config = await getInfoAutoConfig();

    const now = new Date();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const currentEdicion = `${meses[now.getMonth()]} ${now.getFullYear()}`;

    if (!config.username || !config.password) {
        return {
            ok: false,
            message: 'Nexo InfoAuto no tiene credenciales configuradas en el CRM.',
            edicion: currentEdicion
        };
    }

    try {
        // Autenticar sesión en Nexo
        const session = await loginNexoInfoAuto(config.username, config.password);
        if (!session.ok) {
            return {
                ok: false,
                message: session.message || 'Error de sesión con Nexo InfoAuto',
                edicion: currentEdicion
            };
        }

        // Si tenemos código CODIA, intentamos lookup directo
        if (codia) {
            // Consulta tRPC o endpoint de precios con sesión autenticada
            const trpcUrl = `https://nexo.infoauto.com.ar/api/trpc/prices.getByCodia?input=${encodeURIComponent(JSON.stringify({ codia: String(codia), year: Number(year) || null }))}`;
            const res = await fetch(trpcUrl, {
                headers: {
                    'Cookie': session.cookies,
                    'x-trpc-source': 'nextjs-react',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }).catch(() => null);

            if (res && res.ok) {
                const data = await res.json().catch(() => null);
                const resultData = data?.result?.data?.json || data?.result?.data || data;
                if (resultData && (resultData.price || resultData.valor)) {
                    return {
                        ok: true,
                        valor: Number(resultData.price || resultData.valor),
                        currency: resultData.currency || 'ARS',
                        edicion: resultData.edition || currentEdicion,
                        codia: String(codia),
                        lastSyncAt: new Date()
                    };
                }
            }
        }
    } catch (err) {
        console.warn('Error fetching InfoAuto price:', err.message);
    }

    return {
        ok: false,
        message: 'No se obtuvo cotización automática. Podés verificar el CODIA o ingresar el valor manualmente.',
        edicion: currentEdicion
    };
}

/**
 * Sincronizar InfoAuto de un vehículo específico
 */
export async function syncCarInfoAuto(carId, forcedData = {}) {
    const car = await Car.findById(carId);
    if (!car) throw new Error('Vehículo no encontrado');

    const codia = forcedData.codia || car.infoAuto?.codia;
    const brand = forcedData.brand || car.brand;
    const model = forcedData.model || car.name;
    const year = forcedData.year || car.year;

    const result = await fetchInfoAutoPrice({ codia, brand, model, year });

    const updatedInfoAuto = {
        ...(car.infoAuto || {}),
        codia: codia || car.infoAuto?.codia || '',
        autoSync: forcedData.autoSync !== undefined ? Boolean(forcedData.autoSync) : (car.infoAuto?.autoSync ?? true)
    };

    if (result.ok && result.valor) {
        updatedInfoAuto.valor = result.valor;
        updatedInfoAuto.currency = result.currency || 'ARS';
        updatedInfoAuto.edicion = result.edicion;
        updatedInfoAuto.lastSyncAt = new Date();
    } else if (forcedData.valor) {
        updatedInfoAuto.valor = Number(forcedData.valor);
        updatedInfoAuto.currency = forcedData.currency || 'ARS';
        if (forcedData.edicion) updatedInfoAuto.edicion = forcedData.edicion;
        updatedInfoAuto.lastSyncAt = new Date();
    }

    car.infoAuto = updatedInfoAuto;
    await car.save();

    return {
        ok: true,
        carId: car._id,
        infoAuto: car.infoAuto,
        message: result.ok ? 'Cotización InfoAuto sincronizada con éxito' : 'Vehículo actualizado con datos ingresados'
    };
}

/**
 * Sincronizar todos los vehículos del stock con código CODIA asignado
 */
export async function syncAllStockInfoAuto() {
    const cars = await Car.find({
        status: { $in: ['disponible', 'reservado'] },
        'infoAuto.codia': { $exists: true, $ne: '' },
        'infoAuto.autoSync': { $ne: false }
    });

    let updated = 0;
    let failed = 0;

    for (const car of cars) {
        try {
            const res = await syncCarInfoAuto(car._id);
            if (res.ok && res.infoAuto?.valor) {
                updated++;
            } else {
                failed++;
            }
        } catch (err) {
            console.error(`Error sincronizando auto ${car._id}:`, err.message);
            failed++;
        }
    }

    const settings = await CrmSettings.findOne();
    if (settings) {
        if (!settings.infoAutoConfig) settings.infoAutoConfig = {};
        settings.infoAutoConfig.lastSyncAt = new Date();
        await settings.save();
    }

    return {
        ok: true,
        totalEligible: cars.length,
        updated,
        failed,
        message: `Sincronización finalizada: ${updated} actualizados de ${cars.length} con CODIA activo.`
    };
}
