import { NextResponse } from 'next/server.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import connectDB from '../config/db.js';
import AdminUser from '../models/AdminUser.js';
import { validateSessionAndDevice } from '../services/deviceSecurityBackend.js';
import { checkMaintenanceState } from '../services/maintenanceDrainService.js';
import { hasPermission, ROLES } from './adminPermissions.js';

export function withAdminAuth(requiredPermission, handler) {
    return async (request, context) => {
        try {
            const authHeader = request.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
            }

            const token = authHeader.split(' ')[1];
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET?.trim());
            } catch (error) {
                return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
            }

            if (!decoded || (!decoded.id && !decoded.userId)) {
                return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
            }

            // Conectar a BD
            await connectDB();

            // PESTILLO DE MANTENIMIENTO: Bloqueo de escrituras concurrentes
            const method = (request.method || 'GET').toUpperCase();
            if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
                const lock = await checkMaintenanceState();
                if (lock && lock.active) {
                    const bypassHeader = request.headers.get('x-maintenance-bypass');
                    let allowed = false;
                    if (bypassHeader && lock.bypassTokenHash) {
                        const headerHash = crypto.createHash('sha256').update(String(bypassHeader)).digest('hex');
                        if (headerHash === lock.bypassTokenHash) {
                            allowed = true;
                        }
                    }
                    if (!allowed) {
                        return NextResponse.json({
                            error: 'SYSTEM_MAINTENANCE',
                            message: 'El sistema se encuentra en mantenimiento y drenaje de operaciones. Intente nuevamente en unos instantes.',
                            mode: lock.mode || 'MAINTENANCE',
                            retryAfter: 30
                        }, {
                            status: 503,
                            headers: { 'Retry-After': '30' }
                        });
                    }
                }
            }

            // FASE 1: Validación unificada de sesión revocable y dispositivo
            const validation = await validateSessionAndDevice({
                sessionId: decoded.sessionId,
                user: decoded,
                deviceId: request.headers.get('x-device-id') || decoded.deviceId
            });

            if (!validation.valid) {
                return NextResponse.json({ 
                    code: validation.code, 
                    error: validation.message 
                }, { status: validation.status });
            }

            const session = validation.session;
            const userId = decoded.id || decoded.userId;

            // Validar que el usuario continúe activo
            const user = await AdminUser.findById(userId).lean();
            if (!user || !user.active) {
                return NextResponse.json({ error: 'User is inactive or deleted' }, { status: 401 });
            }

            if (user.forcePasswordReset) {
                return NextResponse.json({
                    code: 'PASSWORD_RESET_REQUIRED',
                    error: 'Debe reestablecer su contraseña tras la recuperación de emergencia.'
                }, { status: 403 });
            }

            if (decoded.tokenVersion !== undefined && user.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
                return NextResponse.json({
                    code: 'TOKEN_REVOKED',
                    error: 'Sesión invalidada por cambio de credenciales o recuperación de emergencia.'
                }, { status: 401 });
            }

            // BARRERA DE PROPIETARIO ÚNICO: Verificación estricta contra base de datos (no confiar en el JWT)
            if (user.role !== ROLES.OWNER) {
                return NextResponse.json({
                    code: 'ONLY_OWNER_ALLOWED',
                    error: 'Acceso denegado: El CRM está restringido exclusivamente al propietario autorizado.'
                }, { status: 403 });
            }

            // Normalizar usuario para permisos
            const authUser = {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: user.permissions || [],
                sessionId: session.sessionId,
                deviceId: session.deviceId,
                deviceName: session.deviceName,
                deviceStatus: session.deviceStatus
            };

            // Comprobar permisos
            if (requiredPermission) {
                if (!hasPermission(authUser, requiredPermission)) {
                    return NextResponse.json({ error: `No tienes permisos suficientes (${requiredPermission})` }, { status: 403 });
                }
            }

            // Inyectar datos de sesión y dispositivo en la petición
            request.user = authUser;
            request.sessionId = session.sessionId;
            request.deviceId = session.deviceId;
            request.deviceName = session.deviceName;
            request.deviceStatus = session.deviceStatus;

            return handler(request, context);
        } catch (error) {
            console.error('Auth Middleware Error in Next.js route:', error);
            return NextResponse.json({ error: 'Internal Server Error during authentication' }, { status: 500 });
        }
    };
}

/**
 * Wrapper de conveniencia para rutas de App Router de acceso exclusivo del Propietario
 */
export function withOwnerAuth(handler) {
    return withAdminAuth(null, handler);
}

export default withAdminAuth;
