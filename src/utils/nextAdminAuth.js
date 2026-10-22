import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '../config/db';
import AdminUser from '../models/AdminUser';
import { validateSessionAndDevice } from '../services/deviceSecurityBackend';
import { hasPermission, ROLES } from './adminPermissions';

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
                if (requiredPermission === 'ADMIN_OR_OWNER') {
                    if (authUser.role !== ROLES.OWNER && authUser.role !== ROLES.ADMIN) {
                        return NextResponse.json({ error: 'No tienes permisos suficientes (Requiere Admin/Owner)' }, { status: 403 });
                    }
                } else {
                    if (!hasPermission(authUser, requiredPermission)) {
                        return NextResponse.json({ error: `No tienes permisos suficientes (${requiredPermission})` }, { status: 403 });
                    }
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

export default withAdminAuth;
