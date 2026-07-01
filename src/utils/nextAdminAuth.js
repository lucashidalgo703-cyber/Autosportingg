import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '../config/db';
import AdminUser from '../models/AdminUser';
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

            const userId = decoded.id || decoded.userId;

            // Connect to DB to verify the user is still active
            await connectDB();
            const user = await AdminUser.findById(userId).lean();

            if (!user || !user.active) {
                return NextResponse.json({ error: 'User is inactive or deleted' }, { status: 401 });
            }

            // Normalizar usuario para los permisos
            const authUser = {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
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

            return handler(request, context);
        } catch (error) {
            console.error('Auth Middleware Error:', error);
            return NextResponse.json({ error: 'Internal Server Error during authentication' }, { status: 500 });
        }
    };
}
