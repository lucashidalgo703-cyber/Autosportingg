import { hasPermission, PERMISSIONS } from './adminPermissions.js';

export const MOBILE_NAVIGATION = [
    { name: 'Dashboard', path: '/admin', icon: '📊' },
    { name: 'Stock', path: '/admin/stock', icon: '🚗', permission: PERMISSIONS.STOCK_READ },
    { name: 'Clientes', path: '/admin/clientes', icon: '👥', permission: PERMISSIONS.CLIENTES_READ },
    { name: 'Finanzas', path: '/admin/finanzas', icon: '💰', permission: PERMISSIONS.FINANZAS_READ },
    { name: 'Mi Espacio', path: '/admin/mi-espacio', icon: '📂' }
];

// Navigation visibility complements the API's permission checks; it never grants access.
export function getMobileNavigation(user) {
    if (!user) return [];
    return MOBILE_NAVIGATION.filter(item => !item.permission || hasPermission(user, item.permission));
}

export function isNavigationActive(pathname, path) {
    if (path === '/admin') return pathname === '/admin';
    if (path === '/admin/ventas' && (pathname === '/admin/reservas' || pathname.startsWith('/admin/reservas/'))) return true;
    return pathname === path || pathname.startsWith(`${path}/`);
}

export function getCrmRoleLabel(role) {
    const labels = { owner: 'Propietario', admin: 'Administrador', ventas: 'Ventas', administrativo: 'Administrativo', solo_lectura: 'Solo lectura' };
    return labels[role] || (role ? role.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : 'Usuario');
}
