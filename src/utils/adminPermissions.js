// src/utils/adminPermissions.js

export const ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    VENTAS: 'ventas',
    ADMINISTRATIVO: 'administrativo',
    SOLO_LECTURA: 'solo_lectura'
};

export const PERMISSIONS = {
    STOCK_READ: 'stock.read',
    STOCK_WRITE: 'stock.write',
    CLIENTES_READ: 'clientes.read',
    CLIENTES_WRITE: 'clientes.write',
    LEADS_READ: 'leads.read',
    LEADS_WRITE: 'leads.write',
    AGENDA_READ: 'agenda.read',
    AGENDA_WRITE: 'agenda.write',
    RESERVAS_READ: 'reservas.read',
    RESERVAS_WRITE: 'reservas.write',
    VENTAS_READ: 'ventas.read',
    VENTAS_WRITE: 'ventas.write',
    FINANZAS_READ: 'finanzas.read',
    FINANZAS_WRITE: 'finanzas.write',
    CUOTAS_READ: 'cuotas.read',
    CUOTAS_WRITE: 'cuotas.write',
    COBRANZAS_READ: 'cobranzas.read',
    COBRANZAS_WRITE: 'cobranzas.write',
    DOCUMENTACION_READ: 'documentacion.read',
    DOCUMENTACION_WRITE: 'documentacion.write',
    POSTVENTA_READ: 'postventa.read',
    POSTVENTA_WRITE: 'postventa.write',
    REPORTES_READ: 'reportes.read',
    REPORTES_EXPORT: 'reportes.export',
    USUARIOS_READ: 'usuarios.read',
    USUARIOS_WRITE: 'usuarios.write',
    AUDITORIA_READ: 'auditoria.read',
    EQUIPO_READ: 'equipo.read',
    ASIGNACIONES_WRITE: 'asignaciones.write',
    PRODUCTIVIDAD_READ: 'productividad.read',
    METAS_READ: 'metas.read',
    METAS_WRITE: 'metas.write',
    COMMUNICATIONLOGS_READ: 'communicationLogs.read',
    COMMUNICATIONLOGS_WRITE: 'communicationLogs.write',
    COMMUNICATIONLOGS_DELETE: 'communicationLogs.delete'
};

// Mapa de permisos por defecto según el rol
export const DEFAULT_ROLE_PERMISSIONS = {
    [ROLES.OWNER]: Object.values(PERMISSIONS), // Acceso total
    [ROLES.ADMIN]: Object.values(PERMISSIONS), // Acceso casi total (protección a nivel endpoint para usuarios)
    [ROLES.VENTAS]: [
        PERMISSIONS.STOCK_READ,
        PERMISSIONS.CLIENTES_READ, PERMISSIONS.CLIENTES_WRITE,
        PERMISSIONS.LEADS_READ, PERMISSIONS.LEADS_WRITE,
        PERMISSIONS.AGENDA_READ, PERMISSIONS.AGENDA_WRITE,
        PERMISSIONS.RESERVAS_READ, PERMISSIONS.RESERVAS_WRITE,
        PERMISSIONS.VENTAS_READ, PERMISSIONS.VENTAS_WRITE,
        PERMISSIONS.POSTVENTA_READ, PERMISSIONS.POSTVENTA_WRITE,
        PERMISSIONS.COMMUNICATIONLOGS_READ, PERMISSIONS.COMMUNICATIONLOGS_WRITE
    ],
    [ROLES.ADMINISTRATIVO]: [
        PERMISSIONS.VENTAS_READ,
        PERMISSIONS.CUOTAS_READ, PERMISSIONS.CUOTAS_WRITE,
        PERMISSIONS.COBRANZAS_READ, PERMISSIONS.COBRANZAS_WRITE,
        PERMISSIONS.CAJA_READ, PERMISSIONS.CAJA_WRITE,
        PERMISSIONS.DOCUMENTACION_READ, PERMISSIONS.DOCUMENTACION_WRITE,
        PERMISSIONS.AGENDA_READ, PERMISSIONS.AGENDA_WRITE,
        PERMISSIONS.COMMUNICATIONLOGS_READ, PERMISSIONS.COMMUNICATIONLOGS_WRITE
    ],
    [ROLES.SOLO_LECTURA]: [
        PERMISSIONS.STOCK_READ,
        PERMISSIONS.CLIENTES_READ,
        PERMISSIONS.LEADS_READ,
        PERMISSIONS.AGENDA_READ,
        PERMISSIONS.RESERVAS_READ,
        PERMISSIONS.VENTAS_READ,
        PERMISSIONS.DOCUMENTACION_READ,
        PERMISSIONS.POSTVENTA_READ,
        PERMISSIONS.COMMUNICATIONLOGS_READ
    ]
};

// Helper para verificar en frontend/backend
export const hasPermission = (user, permission) => {
    if (!user) return false;
    // Si viene del login legacy, asumimos owner
    if (!user.role && !user.permissions) return true;
    
    if (user.role === ROLES.OWNER) return true;
    
    // Si tiene un array de permisos explícito, lo usamos.
    // Sino, caemos a los permisos por defecto de su rol.
    const userPermissions = user.permissions?.length > 0 
        ? user.permissions 
        : (DEFAULT_ROLE_PERMISSIONS[user.role] || []);

    return userPermissions.includes(permission);
};
