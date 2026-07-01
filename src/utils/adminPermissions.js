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
    COTIZACIONES_READ: 'cotizaciones.read',
    COTIZACIONES_WRITE: 'cotizaciones.write',
    COTIZACIONES_DELETE: 'cotizaciones.delete',
    AGENDA_READ: 'agenda.read',
    AGENDA_WRITE: 'agenda.write',
    RESERVAS_READ: 'reservas.read',
    RESERVAS_WRITE: 'reservas.write',
    VENTAS_READ: 'ventas.read',
    VENTAS_WRITE: 'ventas.write',
    VENTAS_CANCEL: 'ventas.cancel',
    FINANZAS_READ: 'finanzas.read',
    FINANZAS_WRITE: 'finanzas.write',
    CAJA_READ: 'caja.read',
    CAJA_WRITE: 'caja.write',
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
    COMMUNICATIONLOGS_DELETE: 'communicationLogs.delete',
    MESSAGETEMPLATES_READ: 'messageTemplates.read',
    MESSAGETEMPLATES_WRITE: 'messageTemplates.write',
    MESSAGETEMPLATES_DELETE: 'messageTemplates.delete',
    DATAQUALITY_READ: 'dataQuality.read',
    SETTINGS_READ: 'settings.read',
    SETTINGS_WRITE: 'settings.write',
    SYSTEMHEALTH_READ: 'systemHealth.read',
    EXPORTS_READ: 'exports.read',
    EXPORTS_AUDIT: 'exports.audit',
    HELP_READ: 'help.read',
    LIQUIDACIONES_READ: 'liquidaciones.read',
    LIQUIDACIONES_WRITE: 'liquidaciones.write',
    COMISIONES_READ: 'comisiones.read',
    MENSAJES_READ: 'mensajes.read',
    MENSAJES_WRITE: 'mensajes.write',
    WHATSAPP_READ: 'whatsapp.read',
    WHATSAPP_WRITE: 'whatsapp.write',
    CORREOS_READ: 'correos.read',
    CORREOS_WRITE: 'correos.write',
    NPS_READ: 'nps.read',
    NPS_WRITE: 'nps.write',
    APPROVALS_READ: 'approvals.read',
    APPROVALS_WRITE: 'approvals.write',
    DORMANT_READ: 'dormant.read',
    DORMANT_WRITE: 'dormant.write',
    SUGGESTIONS_MANAGE: 'suggestions.manage',
    TRASH_READ: 'trash.read',
    TRASH_RESTORE: 'trash.restore',
    TRASH_DELETE: 'trash.delete',
    RECLAMOS_READ: 'reclamos.read',
    RECLAMOS_WRITE: 'reclamos.write',
    PEDIDOS_READ: 'pedidos.read',
    PEDIDOS_WRITE: 'pedidos.write',
    TELEFONOS_READ: 'telefonos.read',
    TELEFONOS_WRITE: 'telefonos.write',
    INFRACCIONES_READ: 'infracciones.read',
    INFRACCIONES_WRITE: 'infracciones.write',
    GESTORIA_READ: 'gestoria.read',
    GESTORIA_WRITE: 'gestoria.write',
    TALLER_READ: 'taller.read',
    TALLER_WRITE: 'taller.write',
    TALLER_COSTS_READ: 'taller.costs.read',
    TALLER_SCHEDULE_WRITE: 'taller.schedule.write',
    TALLER_PAYMENTS_WRITE: 'taller.payments.write',
    TALLER_ADMIN: 'taller.admin'
};

// Mapa de permisos por defecto según el rol
export const DEFAULT_ROLE_PERMISSIONS = {
    [ROLES.OWNER]: Object.values(PERMISSIONS), // Acceso total
    [ROLES.ADMIN]: Object.values(PERMISSIONS).filter(p => p !== PERMISSIONS.TRASH_DELETE), // Acceso casi total, pero no puede eliminar permanentemente
    [ROLES.VENTAS]: [
        PERMISSIONS.STOCK_READ,
        PERMISSIONS.CLIENTES_READ, PERMISSIONS.CLIENTES_WRITE,
        PERMISSIONS.LEADS_READ, PERMISSIONS.LEADS_WRITE,
        PERMISSIONS.COTIZACIONES_READ, PERMISSIONS.COTIZACIONES_WRITE,
        PERMISSIONS.AGENDA_READ, PERMISSIONS.AGENDA_WRITE,
        PERMISSIONS.RESERVAS_READ, PERMISSIONS.RESERVAS_WRITE,
        PERMISSIONS.VENTAS_READ, PERMISSIONS.VENTAS_WRITE,
        PERMISSIONS.POSTVENTA_READ, PERMISSIONS.POSTVENTA_WRITE,
        PERMISSIONS.COMMUNICATIONLOGS_READ, PERMISSIONS.COMMUNICATIONLOGS_WRITE,
        PERMISSIONS.MESSAGETEMPLATES_READ,
        PERMISSIONS.COMISIONES_READ,
        PERMISSIONS.MENSAJES_READ, PERMISSIONS.MENSAJES_WRITE,
        PERMISSIONS.WHATSAPP_READ, PERMISSIONS.WHATSAPP_WRITE,
        PERMISSIONS.CORREOS_READ, PERMISSIONS.CORREOS_WRITE,
        PERMISSIONS.NPS_READ,
        PERMISSIONS.APPROVALS_READ,
        PERMISSIONS.DORMANT_READ, PERMISSIONS.DORMANT_WRITE,
        PERMISSIONS.RECLAMOS_READ, PERMISSIONS.RECLAMOS_WRITE,
        PERMISSIONS.PEDIDOS_READ, PERMISSIONS.PEDIDOS_WRITE,
        PERMISSIONS.TELEFONOS_READ, PERMISSIONS.TELEFONOS_WRITE,

        PERMISSIONS.TALLER_READ, PERMISSIONS.TALLER_WRITE,

        PERMISSIONS.TRASH_READ,
        PERMISSIONS.HELP_READ
    ],
    [ROLES.ADMINISTRATIVO]: [
        PERMISSIONS.VENTAS_READ,
        PERMISSIONS.CUOTAS_READ, PERMISSIONS.CUOTAS_WRITE,
        PERMISSIONS.COBRANZAS_READ, PERMISSIONS.COBRANZAS_WRITE,
        PERMISSIONS.CAJA_READ, PERMISSIONS.CAJA_WRITE,
        PERMISSIONS.DOCUMENTACION_READ, PERMISSIONS.DOCUMENTACION_WRITE,
        PERMISSIONS.AGENDA_READ, PERMISSIONS.AGENDA_WRITE,
        PERMISSIONS.COMMUNICATIONLOGS_READ, PERMISSIONS.COMMUNICATIONLOGS_WRITE,
        PERMISSIONS.MENSAJES_READ, PERMISSIONS.MENSAJES_WRITE,
        PERMISSIONS.WHATSAPP_READ, PERMISSIONS.WHATSAPP_WRITE,
        PERMISSIONS.CORREOS_READ, PERMISSIONS.CORREOS_WRITE,
        PERMISSIONS.NPS_READ, PERMISSIONS.NPS_WRITE,
        PERMISSIONS.APPROVALS_READ,
        PERMISSIONS.DORMANT_READ, PERMISSIONS.DORMANT_WRITE,
        PERMISSIONS.RECLAMOS_READ, PERMISSIONS.RECLAMOS_WRITE,
        PERMISSIONS.INFRACCIONES_READ, PERMISSIONS.INFRACCIONES_WRITE,
        PERMISSIONS.GESTORIA_READ, PERMISSIONS.GESTORIA_WRITE,
        PERMISSIONS.TELEFONOS_READ, PERMISSIONS.TELEFONOS_WRITE,
        PERMISSIONS.PEDIDOS_READ,

        PERMISSIONS.TALLER_READ, PERMISSIONS.TALLER_WRITE,
        PERMISSIONS.TALLER_COSTS_READ, PERMISSIONS.TALLER_SCHEDULE_WRITE,
        PERMISSIONS.TALLER_PAYMENTS_WRITE,

        PERMISSIONS.TRASH_READ,
        PERMISSIONS.EXPORTS_READ,
        PERMISSIONS.HELP_READ
    ],
    [ROLES.SOLO_LECTURA]: [
        PERMISSIONS.STOCK_READ,
        PERMISSIONS.CLIENTES_READ,
        PERMISSIONS.LEADS_READ,
        PERMISSIONS.COTIZACIONES_READ,
        PERMISSIONS.AGENDA_READ,
        PERMISSIONS.RESERVAS_READ,
        PERMISSIONS.VENTAS_READ,
        PERMISSIONS.DOCUMENTACION_READ,
        PERMISSIONS.POSTVENTA_READ,
        PERMISSIONS.COMMUNICATIONLOGS_READ,
        PERMISSIONS.MESSAGETEMPLATES_READ,
        PERMISSIONS.MENSAJES_READ,
        PERMISSIONS.NPS_READ,
        PERMISSIONS.APPROVALS_READ, // Ventas puede pedir autorizaciones (lectura + create, que depende del endpoint)
        PERMISSIONS.DORMANT_READ, // Ventas puede ver inactivos (solo los suyos, controlado en endpoint)
        PERMISSIONS.RECLAMOS_READ,
        PERMISSIONS.PEDIDOS_READ,
        PERMISSIONS.TELEFONOS_READ,
        PERMISSIONS.INFRACCIONES_READ,
        PERMISSIONS.GESTORIA_READ,

        PERMISSIONS.TALLER_READ,

        PERMISSIONS.HELP_READ
    ]
};

// Helper para verificar en frontend/backend
export const hasPermission = (user, permission) => {
    if (!user || !permission) return false;

    if (user.role === ROLES.OWNER) return true;

    // Si tiene un array de permisos explícito, lo usamos.
    // Sino, caemos a los permisos por defecto de su rol.
    const userPermissions = user.permissions?.length > 0
        ? user.permissions
        : (DEFAULT_ROLE_PERMISSIONS[user.role] || []);

    return userPermissions.includes(permission);
};
