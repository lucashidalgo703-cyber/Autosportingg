// Test suite: Verificación de política fail-closed de autenticación y protección de rutas administrativas
// Ejecutar con: `node tests/authFailClosed.test.js`
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-autosporting-2026-very-secure';

// Simulador de MockLocalStorage
class MockLocalStorage {
    constructor() {
        this.store = new Map();
    }
    getItem(key) {
        return this.store.get(key) || null;
    }
    setItem(key, value) {
        this.store.set(key, String(value));
    }
    removeItem(key) {
        this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
}

// Emulador fiel del cliente AuthContext (con la política fail-closed implementada)
function createAuthClient(initialToken = null) {
    const localStorage = new MockLocalStorage();
    if (initialToken) {
        localStorage.setItem('token', initialToken);
    }

    let state = {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: true,
        connectionError: false
    };

    const decodeToken = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    };

    const isTokenValid = (token) => {
        if (!token || typeof token !== 'string') return false;
        const decoded = decodeToken(token);
        if (!decoded) return false;
        if (decoded.exp && decoded.exp * 1000 <= Date.now()) return false;
        return true;
    };

    const clearSession = () => {
        localStorage.removeItem('token');
        state.token = null;
        state.isAuthenticated = false;
        state.user = null;
    };

    const restoreSession = async (fetchMock) => {
        const storedToken = localStorage.getItem('token');

        if (!storedToken || !isTokenValid(storedToken)) {
            if (storedToken) localStorage.removeItem('token');
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
            state.connectionError = false;
            state.loading = false;
            return;
        }

        try {
            const response = await fetchMock('/api/admin/auth/me', {
                headers: { Authorization: `Bearer ${storedToken}` }
            });

            // 1. Verificación positiva del servidor
            if (response.ok) {
                const data = await response.json().catch(() => null);
                if (data && (data.ok || data.user)) {
                    state.token = storedToken;
                    state.isAuthenticated = true;
                    state.user = data.user || decodeToken(storedToken);
                    state.connectionError = false;
                    state.loading = false;
                    return;
                }
            }

            // 2. Errores de autenticación/autorización: 401 o 403
            if (response.status === 401 || response.status === 403) {
                clearSession();
                state.connectionError = false;
                state.loading = false;
                return;
            }

            // 3. Errores temporales de conectividad / servidor (>= 500)
            if (response.status >= 500) {
                state.isAuthenticated = false;
                state.user = null;
                state.token = storedToken;
                state.connectionError = true;
                state.loading = false;
                return;
            }

            // 4. Fallback fail-closed
            clearSession();
            state.connectionError = false;
            state.loading = false;
        } catch (error) {
            // Error de red / offline / fetch fallido
            state.isAuthenticated = false;
            state.user = null;
            state.token = storedToken;
            state.connectionError = true;
            state.loading = false;
        }
    };

    const validateSession = () => {
        const storedToken = localStorage.getItem('token');
        const validToken = storedToken && isTokenValid(storedToken) ? storedToken : null;
        if (!validToken || !state.isAuthenticated) {
            return false;
        }
        return true;
    };

    return {
        localStorage,
        getState: () => ({ ...state }),
        restoreSession,
        validateSession,
        clearSession
    };
}

// Emulador del middleware backend authenticateToken
function mockServerAuthenticate(req, jwtSecret = JWT_SECRET) {
    if (!jwtSecret) {
        return { status: 503, body: { message: 'Servicio de autenticacion no disponible.' } };
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return { status: 401, body: { message: 'Unauthorized' } };
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        if (decoded.type === '2fa_challenge') {
            return { status: 403, body: { message: 'Token de desafío inválido para esta operación' } };
        }
        return {
            status: 200,
            ok: true,
            user: {
                id: decoded.id || decoded.userId,
                email: decoded.email,
                role: decoded.role || 'user',
                permissions: decoded.permissions || []
            }
        };
    } catch (err) {
        // En Express: jwt.verify err devuelve 403
        return { status: 403, body: { message: 'Forbidden' } };
    }
}

async function runAllTests() {
    console.log('=== PRUEBAS DE AUTENTICACIÓN FAIL-CLOSED & PROTECCIÓN DE RUTAS ===\n');
    let passed = 0;
    let total = 0;

    const test = async (name, fn) => {
        total++;
        try {
            await fn();
            passed++;
            console.log(`  ok  - ${name}`);
        } catch (e) {
            console.error(`  FAIL - ${name}\n`, e);
            process.exitCode = 1;
        }
    };

    // 1. Verificación en Servidor: Tokens fabricados, expirados, revocados y válidos
    await test('Servidor: Token fabricado con clave arbitraria devuelve 403 Forbidden', async () => {
        const fakeToken = jwt.sign({ id: 'attacker1', role: 'owner' }, 'fake-key-attacker');
        const result = mockServerAuthenticate({ headers: { authorization: `Bearer ${fakeToken}` } });
        assert.equal(result.status, 403, 'Debe devolver status 403');
        assert.equal(result.ok, undefined);
    });

    await test('Servidor: Token expirado devuelve 403 Forbidden', async () => {
        const expiredToken = jwt.sign({ id: 'user1', role: 'admin' }, JWT_SECRET, { expiresIn: -10 });
        const result = mockServerAuthenticate({ headers: { authorization: `Bearer ${expiredToken}` } });
        assert.equal(result.status, 403, 'Debe devolver status 403 en expiración');
    });

    await test('Servidor: Sin header Authorization devuelve 401 Unauthorized', async () => {
        const result = mockServerAuthenticate({ headers: {} });
        assert.equal(result.status, 401, 'Debe devolver status 401 sin token');
    });

    await test('Servidor: Falta de JWT_SECRET en entorno devuelve 503 Service Unavailable', async () => {
        const validToken = jwt.sign({ id: 'user1' }, JWT_SECRET);
        const result = mockServerAuthenticate({ headers: { authorization: `Bearer ${validToken}` } }, null);
        assert.equal(result.status, 503, 'Debe devolver 503 si el servicio no está disponible');
    });

    await test('Servidor: Token legítimo y firmado con clave correcta devuelve 200 OK y datos', async () => {
        const validToken = jwt.sign({ id: 'owner1', email: 'owner@autosporting.com', role: 'owner' }, JWT_SECRET, { expiresIn: 3600 });
        const result = mockServerAuthenticate({ headers: { authorization: `Bearer ${validToken}` } });
        assert.equal(result.status, 200);
        assert.equal(result.ok, true);
        assert.equal(result.user.email, 'owner@autosporting.com');
    });

    await test('Servidor: Token tipo 2fa_challenge no se autoriza como sesión regular (403)', async () => {
        const challengeToken = jwt.sign({ id: 'user1', type: '2fa_challenge' }, JWT_SECRET);
        const result = mockServerAuthenticate({ headers: { authorization: `Bearer ${challengeToken}` } });
        assert.equal(result.status, 403);
    });

    // 2. Verificación en Cliente: Política Fail-Closed y eliminación del bypass con token fabricado
    await test('Cliente [FAIL-CLOSED]: Token fabricado cuando /auth/me devuelve 403 NO concede acceso', async () => {
        const fakeToken = jwt.sign({ id: 'hacker', role: 'owner', exp: Math.floor(Date.now() / 1000) + 3600 }, 'fake-key');
        const client = createAuthClient(fakeToken);

        await client.restoreSession(async () => ({
            status: 403,
            ok: false,
            json: async () => ({ message: 'Forbidden' })
        }));

        const state = client.getState();
        assert.equal(state.isAuthenticated, false, 'FAIL-CLOSED: isAuthenticated debe ser false');
        assert.equal(state.user, null, 'User debe ser null');
        assert.equal(client.localStorage.getItem('token'), null, 'El token falso debe haber sido purgado de localStorage');
        assert.equal(client.validateSession(), false, 'validateSession debe devolver false');
    });

    await test('Cliente [FAIL-CLOSED]: Token cuando /auth/me devuelve 503 NO concede acceso', async () => {
        const storedToken = jwt.sign({ id: 'valid_user', exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
        const client = createAuthClient(storedToken);

        await client.restoreSession(async () => ({
            status: 503,
            ok: false,
            json: async () => ({ message: 'Service Unavailable' })
        }));

        const state = client.getState();
        assert.equal(state.isAuthenticated, false, 'FAIL-CLOSED: isAuthenticated debe ser false bajo 503');
        assert.equal(state.connectionError, true, 'connectionError debe estar activo');
        assert.equal(client.validateSession(), false, 'validateSession debe devolver false');
        assert.equal(client.localStorage.getItem('token'), storedToken, 'No debe purgar el token válido ante error temporal 503');
    });

    await test('Cliente [FAIL-CLOSED]: Fallo de red / excepción de conexión NO concede acceso', async () => {
        const storedToken = jwt.sign({ id: 'valid_user', exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
        const client = createAuthClient(storedToken);

        await client.restoreSession(async () => {
            throw new TypeError('Failed to fetch: Network disconnected');
        });

        const state = client.getState();
        assert.equal(state.isAuthenticated, false, 'FAIL-CLOSED: isAuthenticated debe ser false ante fallo de red');
        assert.equal(state.connectionError, true, 'connectionError debe estar activo');
        assert.equal(client.validateSession(), false, 'validateSession debe devolver false');
        assert.equal(client.localStorage.getItem('token'), storedToken, 'Preserva sesión para reintento');
    });

    await test('Cliente [FAIL-CLOSED]: Respuesta 401 (sesión revocada / caducada) purga sesión y deniega acceso', async () => {
        const storedToken = jwt.sign({ id: 'user_revoked', exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
        const client = createAuthClient(storedToken);

        await client.restoreSession(async () => ({
            status: 401,
            ok: false,
            json: async () => ({ code: 'SESSION_REVOKED', message: 'Sesión revocada' })
        }));

        const state = client.getState();
        assert.equal(state.isAuthenticated, false);
        assert.equal(client.localStorage.getItem('token'), null, 'Sesión revocada debe eliminarse de localStorage');
        assert.equal(client.validateSession(), false);
    });

    await test('Cliente: Token localmente expirado es rechazado sin llamar al servidor', async () => {
        const expiredToken = jwt.sign({ id: 'user_exp', exp: Math.floor(Date.now() / 1000) - 60 }, JWT_SECRET);
        const client = createAuthClient(expiredToken);

        let serverCalled = false;
        await client.restoreSession(async () => {
            serverCalled = true;
            return { ok: true, status: 200 };
        });

        assert.equal(serverCalled, false, 'No debe consultar al servidor si el token ya expiró localmente');
        const state = client.getState();
        assert.equal(state.isAuthenticated, false);
        assert.equal(client.localStorage.getItem('token'), null);
    });

    await test('Cliente: Validación positiva (200 OK + ok:true) concede acceso y adopta usuario del servidor', async () => {
        const token = jwt.sign({ id: 'legit_owner', exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
        const client = createAuthClient(token);

        await client.restoreSession(async () => ({
            status: 200,
            ok: true,
            json: async () => ({
                ok: true,
                user: { id: 'legit_owner', email: 'owner@autosporting.com', role: 'owner' }
            })
        }));

        const state = client.getState();
        assert.equal(state.isAuthenticated, true, 'Acceso concedido tras validación positiva');
        assert.equal(state.user.role, 'owner');
        assert.equal(state.user.email, 'owner@autosporting.com');
        assert.equal(state.connectionError, false);
        assert.equal(client.validateSession(), true, 'validateSession confirma sesión activa');
    });

    // 3. Verificación de Prevención de Bucles de Redirección y Preservación de Sesión
    await test('Resiliencia: Transición de error de conexión a recuperación exitosa (sin bucle ni pérdida de token)', async () => {
        const validToken = jwt.sign({ id: 'recovered_user', exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
        const client = createAuthClient(validToken);

        // Paso 1: Intento inicial falla por 503
        await client.restoreSession(async () => ({
            status: 503,
            ok: false,
            json: async () => ({ message: 'Database connecting...' })
        }));

        assert.equal(client.getState().isAuthenticated, false);
        assert.equal(client.getState().connectionError, true);
        assert.equal(client.localStorage.getItem('token'), validToken, 'Token preservado durante 503');

        // Paso 2: Reintento cuando el servidor vuelve a estar disponible (200 OK)
        await client.restoreSession(async () => ({
            status: 200,
            ok: true,
            json: async () => ({
                ok: true,
                user: { id: 'recovered_user', email: 'user@autosporting.com', role: 'admin' }
            })
        }));

        assert.equal(client.getState().isAuthenticated, true);
        assert.equal(client.getState().connectionError, false);
        assert.equal(client.getState().user.id, 'recovered_user');
        assert.equal(client.validateSession(), true);
    });

    // 4. Verificación de Cobertura en server.js de Rutas Administrativas
    await test('Auditoría estática: Todos los endpoints /api/admin/* en server.js exigen authenticateToken o auth explícita', async () => {
        const fs = await import('fs');
        const content = fs.readFileSync('server.js', 'utf8');
        const lines = content.split('\n');
        const unprotected = [];

        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            const isAdminRoute = /app\.(get|post|patch|delete|put)\(\s*['"]\/api\/admin\//.test(trimmed);
            if (isAdminRoute) {
                // Ruta especial cron con validación interna dual
                if (trimmed.includes('/api/admin/jobs/daily-summary')) {
                    return;
                }
                if (!trimmed.includes('authenticateToken')) {
                    unprotected.push(`Línea ${idx + 1}: ${trimmed}`);
                }
            }
        });

        assert.equal(
            unprotected.length,
            0,
            `Se encontraron rutas /api/admin/ sin authenticateToken:\n${unprotected.join('\n')}`
        );
    });

    console.log(`\nResultado: ${passed}/${total} pruebas pasaron satisfactoriamente.`);
    if (passed === total) {
        console.log('✅ Todas las pruebas de fail-closed y seguridad de autenticación superadas exitosamente.');
    }
}

runAllTests().catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
});
