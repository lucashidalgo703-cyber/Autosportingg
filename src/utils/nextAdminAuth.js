import { NextResponse } from 'next/server';
import { validateLoginSession } from '../services/authSessionService.js';
import { hasPermission, ROLES } from './adminPermissions';

export function withAdminAuth(requiredPermission, handler) {
    return async (request, context) => {
        try {
            const authHeader = request.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
            }

            const token = authHeader.split(' ')[1];
            const user = await validateLoginSession(token);
            if (!user) return NextResponse.json({ error: 'Invalid or pending session' }, { status: 401 });

            // Normalizar usuario para los permisos
            const authUser = {
                id: user.id,
                email: user.email,
                name: user.username,
                role: user.role,
                permissions: user.permissions || []
            };

            // Check permissions
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

            // Inject the user into the request object (we create a custom request wrapper or just attach it)
            // NextRequest doesn't let us mutate it easily, but we can pass it as an extra argument or attach it.
            // A common pattern is to attach it as request.user = authUser;
            request.user = authUser;

            const response = await handler(request, context);
            response.headers.set('Cache-Control', 'private, no-store');
            response.headers.append('Vary', 'Authorization');
            return response;
        } catch (error) {
            console.error('Auth Middleware Error:', error);
            return NextResponse.json({ error: 'Internal Server Error during authentication' }, { status: 500 });
        }
    };
}
