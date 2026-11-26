// src/utils/adminPermissions.js

export const ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    VENTAS: 'ventas',
    GESTORIA_CONTABILIDAD: 'gestoria_contabilidad',
    ADMINISTRATIVO: 'administrativo',
    SOLO_LECTURA: 'solo_lectura'
};

export const PERMISSIONS = {
    STOCK_READ: 'stock.read',
    STOCK_WRITE: 'stock.write',
    STOCK_MEDIA_WRITE: 'stock.media.write',
    STOCK_PUBLISH: 'stock.publish',
    STOCK_SUBMIT: 'stock.submit',
    STOCK_NEGOTIATION_READ: 'stock.negotiation.read',
    CLIENTES_READ: 'clientes.read',
    CLIENTES_WRITE: 'clientes.write',
    CLIENTES_SUBMIT: 'clientes.submit',
    OPORTUNIDADES_READ: 'oportunidades.read',
    OPORTUNIDADES_WRITE: 'oportunidades.write',
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
    RENTABILIDAD_READ: 'rentabilidad.read',
    FACTURACION_READ: 'facturacion.read',
    FACTURACION_WRITE: 'facturacion.write',
    FINANCIAL_PILOT_READ: 'financialPilot.read',
    CAPITAL_HISTORY_READ: 'capitalHistory.read',
    CAPITAL_HISTORY_WRITE: 'capitalHistory.write',
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
    [ROLES.ADMIN]: Object.values(PERMISSIONS).filter(p => ![PERMISSIONS.TRASH_DELETE, PERMISSIONS.FACTURACION_READ, PERMISSIONS.FACTURACION_WRITE,
        PERMISSIONS.CAPITAL_HISTORY_READ, PERMISSIONS.CAPITAL_HISTORY_WRITE].includes(p)),
    [ROLES.VENTAS]: [
        PERMISSIONS.STOCK_NEGOTIATION_READ,
        PERMISSIONS.STOCK_MEDIA_WRITE, PERMISSIONS.STOCK_PUBLISH,
        PERMISSIONS.STOCK_SUBMIT, PERMISSIONS.CLIENTES_SUBMIT,
        PERMISSIONS.CLIENTES_READ, PERMISSIONS.CLIENTES_WRITE,
        PERMISSIONS.GESTORIA_READ, PERMISSIONS.GESTORIA_WRITE,
        PERMISSIONS.DOCUMENTACION_READ, PERMISSIONS.DOCUMENTACION_WRITE,
        PERMISSIONS.REPORTES_READ,
        PERMISSIONS.OPORTUNIDADES_READ, PERMISSIONS.OPORTUNIDADES_WRITE,
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
    [ROLES.GESTORIA_CONTABILIDAD]: [
        PERMISSIONS.FACTURACION_READ, PERMISSIONS.FACTURACION_WRITE,
        PERMISSIONS.STOCK_NEGOTIATION_READ,
        PERMISSIONS.CLIENTES_READ, PERMISSIONS.CLIENTES_WRITE,
        PERMISSIONS.GESTORIA_READ, PERMISSIONS.GESTORIA_WRITE,
        PERMISSIONS.DOCUMENTACION_READ, PERMISSIONS.DOCUMENTACION_WRITE,
        PERMISSIONS.VENTAS_READ, PERMISSIONS.VENTAS_WRITE,
        PERMISSIONS.RESERVAS_READ, PERMISSIONS.RESERVAS_WRITE,
        PERMISSIONS.COMISIONES_READ,
        PERMISSIONS.OPORTUNIDADES_READ, PERMISSIONS.OPORTUNIDADES_WRITE,
        PERMISSIONS.AGENDA_READ, PERMISSIONS.AGENDA_WRITE,
        PERMISSIONS.REPORTES_READ,
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
    // Monthly agency capital is reserved to the owner, including historical
    // amounts. Custom legacy permission arrays cannot broaden this boundary.
    if ([PERMISSIONS.CAPITAL_HISTORY_READ, PERMISSIONS.CAPITAL_HISTORY_WRITE].includes(permission)) return false;
    // Invoice records are shared only with the owner's accounting profile.
    // Old broad custom grants cannot disclose them to other staff roles.
    if ([PERMISSIONS.FACTURACION_READ, PERMISSIONS.FACTURACION_WRITE].includes(permission)
        && user.role !== ROLES.GESTORIA_CONTABILIDAD) return false;
    // Restricted staff cannot reopen global administration or finance through
    // historical broad custom grants. Personal commissions remain available.
    if (isSalesRole(user) && [PERMISSIONS.STOCK_READ, PERMISSIONS.STOCK_WRITE, PERMISSIONS.ASIGNACIONES_WRITE,
        PERMISSIONS.FINANZAS_READ, PERMISSIONS.FINANZAS_WRITE, PERMISSIONS.CAJA_READ, PERMISSIONS.CAJA_WRITE,
        PERMISSIONS.LIQUIDACIONES_READ, PERMISSIONS.LIQUIDACIONES_WRITE, PERMISSIONS.SETTINGS_READ,
        PERMISSIONS.SETTINGS_WRITE, PERMISSIONS.USUARIOS_READ, PERMISSIONS.USUARIOS_WRITE].includes(permission)) return false;

    // Seller photo/catalogue access also applies to accounts with saved legacy grants.
    if (user.role === ROLES.VENTAS && [PERMISSIONS.STOCK_MEDIA_WRITE, PERMISSIONS.STOCK_PUBLISH].includes(permission)) return true;

    // Si tiene un array de permisos explícito, lo usamos.
    // Sino, caemos a los permisos por defecto de su rol.
    const userPermissions = user.permissions?.length > 0
        ? user.permissions
        : (DEFAULT_ROLE_PERMISSIONS[user.role] || []);

    return userPermissions.includes(permission);
};

// Both staff profiles work in their assigned operations and negotiation view.
// Keep a single role predicate shared by route, API and module restrictions.
export const isSalesRole = user => [ROLES.VENTAS, ROLES.GESTORIA_CONTABILIDAD].includes(user?.role);
export const crmHomeFor = user => isSalesRole(user) ? '/admin/mis-ventas' : '/admin';

// Shared by navigation and the route gate, including legacy dashboard paths.
// Other modules retain their current permission checks.
export const canAccessCrmPath = (user, rawPath) => {
    if (!user || typeof rawPath !== 'string' || !rawPath.startsWith('/') || rawPath.startsWith('//') || /[\\\u0000-\u001f]/.test(rawPath)) return false;
    let path;
    try { path = decodeURIComponent(rawPath.split(/[?#]/)[0]).replace(/\/+$/, '') || '/'; }
    catch { return false; }
    if (path.split('/').some(segment => segment === '.' || segment === '..') || /[\\\u0000-\u001f]/.test(path)) return false;
    if (/^\/admin\/facturacion(?:\/|$)/i.test(path)) return canReadVehicleInvoices(user);
    if (/^\/admin\/capital-mensual(?:\/|$)/i.test(path)) return canReadCapitalHistory(user);
    if (/^\/admin\/autosporting-ai(?:\/|$)/i.test(path)) return canReadFinancialPilot(user);
    if (/^\/admin\/rentabilidad(?:\/|$)/i.test(path)) return canReadRentabilidad(user);
    if (!isSalesRole(user)) return true;
    return !/^\/admin(?:$|\/(?:ventas|legacy|analitica)(?:\/|$)|\/stock\/)/i.test(path);
};

// Negotiation is independent of inventory access for sellers. Honor an old
// explicit stock-read grant as negotiation-only access without a DB migration.
export const canReadStockNegotiation = user => isSalesRole(user)
    ? hasPermission(user, PERMISSIONS.STOCK_NEGOTIATION_READ) || Boolean(user?.permissions?.includes(PERMISSIONS.STOCK_READ))
    : hasPermission(user, PERMISSIONS.STOCK_READ)
        && (['owner', 'admin'].includes(user?.role) || hasPermission(user, PERMISSIONS.STOCK_NEGOTIATION_READ));
export const canConfigureStockNegotiation = user => canReadStockNegotiation(user) && ['owner', 'admin'].includes(user?.role);
export const canCompleteStockPlate = user => canReadStockNegotiation(user) && (user?.role === ROLES.OWNER || isSalesRole(user));
// Photo and catalogue management never grants inventory or financial editing.
export const canManageStockMedia = user => [ROLES.OWNER, ROLES.ADMIN].includes(user?.role) || hasPermission(user, PERMISSIONS.STOCK_MEDIA_WRITE) || hasPermission(user, PERMISSIONS.STOCK_WRITE);
export const canPublishStock = user => [ROLES.OWNER, ROLES.ADMIN].includes(user?.role) || hasPermission(user, PERMISSIONS.STOCK_PUBLISH) || hasPermission(user, PERMISSIONS.STOCK_WRITE);
export const canReadVehicleInvoices = user => hasPermission(user, PERMISSIONS.FACTURACION_READ);
export const canWriteVehicleInvoices = user => hasPermission(user, PERMISSIONS.FACTURACION_WRITE);
export const canReadFinancialPilot = user => user?.role === ROLES.OWNER ||
    (user?.role === ROLES.ADMIN && Array.isArray(user.permissions) && user.permissions.includes(PERMISSIONS.FINANCIAL_PILOT_READ));
export const canReadCapitalHistory = user => user?.role === ROLES.OWNER && hasPermission(user, PERMISSIONS.CAPITAL_HISTORY_READ);
export const canWriteCapitalHistory = user => user?.role === ROLES.OWNER && hasPermission(user, PERMISSIONS.CAPITAL_HISTORY_WRITE);
export const canReadStrategicRotation = (user) => canReadRentabilidad(user);

export const canReadRentabilidad = (user) => {
    if (!user) return false;
    if (user.role === ROLES.OWNER) return true;
    if (isSalesRole(user)) return false;
    return Boolean(
        user.permissions?.includes(PERMISSIONS.RENTABILIDAD_READ) ||
        user.permissions?.includes(PERMISSIONS.FINANZAS_READ) ||
        (user.role === ROLES.ADMIN && hasPermission(user, PERMISSIONS.FINANZAS_READ))
    );
};


// Labels and descriptions are shared by user assignment and the role catalog.
// Existing database role values remain valid; no account is changed by selecting
// or displaying a profile until administration explicitly saves that account.
export const ROLE_DEFINITIONS = {
    [ROLES.OWNER]: {
        label: 'Propietario',
        description: 'Control total del CRM. Aprueba o rechaza las altas de vehículos y clientes enviadas por vendedores.',
        limits: []
    },
    [ROLES.ADMIN]: {
        label: 'Administrador',
        description: 'Administración general, gestión de usuarios y operación del CRM.',
        limits: ['Las nuevas altas enviadas para autorización las resuelve el propietario.', 'Facturación / ARCA queda reservada al propietario y Gestoría / Contabilidad.', 'No elimina registros de forma permanente ni desactiva al propietario.']
    },
    [ROLES.VENTAS]: {
        label: 'Vendedor · altas con autorización',
        description: 'Consulta Negociación y trabaja sobre sus ventas y comisiones. Envía las altas de vehículos y clientes para autorización.',
        limits: ['Los vehículos y clientes nuevos quedan pendientes hasta que los apruebe el propietario.', 'Sin Dashboard, Ventas generales, inventario completo, Caja ni Finanzas generales.']
    },
    [ROLES.GESTORIA_CONTABILIDAD]: {
        label: 'Gestoría / Contabilidad',
        description: 'Gestiona trámites, expedientes, clientes y Facturación / ARCA, con consulta comercial de sus operaciones.',
        limits: ['Sin Dashboard, Ventas generales, inventario completo, Caja ni Finanzas generales.', 'No configura precios mínimos, administra usuarios ni aprueba altas del vendedor.']
    },
    [ROLES.ADMINISTRATIVO]: {
        label: 'Administrativo · perfil anterior',
        description: 'Conserva los permisos administrativos existentes, incluidos Caja, Cuotas y Cobranzas.',
        limits: ['No equivale al perfil Gestoría / Contabilidad. Revisá sus accesos antes de asignarlo.']
    },
    [ROLES.SOLO_LECTURA]: {
        label: 'Solo lectura',
        description: 'Consulta de los módulos habilitados, sin acciones de edición por defecto.',
        limits: ['No puede cargar, editar ni autorizar información operativa por defecto. Puede reportar problemas del CRM.']
    }
};

export const roleLabel = role => ROLE_DEFINITIONS[role]?.label || role || 'Sin rol';

export const roleAccessSummary = user => {
    if (!user) return [];
    const entries = [];
    const add = (condition, label, detail) => { if (condition) entries.push({ label, detail }); };
    const permission = p => hasPermission(user, p);
    const writeDetail = p => permission(p) ? 'Consulta y gestión' : 'Solo consulta';
    add(['owner', 'admin'].includes(user.role), 'Dashboard y administración general', 'Según los permisos del perfil');
    add(permission(PERMISSIONS.GESTORIA_READ), 'Gestoría', writeDetail(PERMISSIONS.GESTORIA_WRITE));
    add(canReadVehicleInvoices(user), 'Facturación / ARCA', canWriteVehicleInvoices(user) ? 'Registro y revisión de facturas de vehículos comprados y vendidos' : 'Consulta de facturas registradas');
    add(canReadCapitalHistory(user), 'Capital mensual', 'Evolución del capital propio por mes y moneda; registro reservado al propietario');
    add(canReadRentabilidad(user), 'Rentabilidad', 'Rentabilidad real por vehículo, análisis de márgenes, rotación y eficiencia de capital');
    add(permission(PERMISSIONS.CLIENTES_READ), 'Clientes', user.role === ROLES.VENTAS
        ? 'Consulta y edición; altas con autorización del propietario' : writeDetail(PERMISSIONS.CLIENTES_WRITE));
    add(true, 'Equipamiento', 'Control y carga de equipamiento de vehículos en stock');
    add(true, 'Reportar problema', permission(PERMISSIONS.SUGGESTIONS_MANAGE) ? 'Reporta problemas y gestiona los reportes del equipo' : 'Carga fallas y consulta el estado de sus propios reportes');
    add(canReadStockNegotiation(user), 'Negociación', canConfigureStockNegotiation(user) ? 'Consulta, simulación y configuración de mínimos' : canCompleteStockPlate(user) ? 'Consulta, simulación y carga del dominio cuando falta' : 'Consulta y simulación de ofertas');
    add(canManageStockMedia(user) || canPublishStock(user), 'Fotos y catálogo', 'Fotos, encuadre y visibilidad en el catálogo; sin modificar el estado operativo ni los costos');
    add(permission(PERMISSIONS.STOCK_READ), 'Inventario de Stock', writeDetail(PERMISSIONS.STOCK_WRITE));
    add(permission(PERMISSIONS.STOCK_SUBMIT) && user.role === ROLES.VENTAS, 'Solicitar alta de vehículo', 'No ingresa al Stock hasta la aprobación del propietario');
    add(permission(PERMISSIONS.VENTAS_READ), isSalesRole(user) ? 'Mis ventas' : 'Ventas', isSalesRole(user) ? 'Únicamente operaciones asignadas a su cuenta' : writeDetail(PERMISSIONS.VENTAS_WRITE));
    add(permission(PERMISSIONS.DOCUMENTACION_READ), 'Expedientes', writeDetail(PERMISSIONS.DOCUMENTACION_WRITE));
    add(permission(PERMISSIONS.COMISIONES_READ), 'Mis comisiones', 'Comisiones de su cuenta');
    add(permission(PERMISSIONS.OPORTUNIDADES_READ), 'Oportunidades', writeDetail(PERMISSIONS.OPORTUNIDADES_WRITE));
    add(permission(PERMISSIONS.AGENDA_READ), 'Calendario', writeDetail(PERMISSIONS.AGENDA_WRITE));
    add(true, 'Alertas', 'Avisos de los módulos habilitados');
    add(permission(PERMISSIONS.REPORTES_READ), 'Reportes', isSalesRole(user) ? 'Actividad y operaciones permitidas; sin información financiera general' : 'Según los permisos de los módulos incluidos');
    add(true, 'Mi espacio', 'Resumen, pendientes, autos personales y patrimonio de su cuenta');
    add(permission(PERMISSIONS.LEADS_READ), 'Leads', writeDetail(PERMISSIONS.LEADS_WRITE));
    add(permission(PERMISSIONS.COTIZACIONES_READ), 'Cotizaciones', writeDetail(PERMISSIONS.COTIZACIONES_WRITE));
    add(permission(PERMISSIONS.RESERVAS_READ), 'Reservas', isSalesRole(user) ? 'Únicamente reservas asignadas a su cuenta' : writeDetail(PERMISSIONS.RESERVAS_WRITE));
    add(permission(PERMISSIONS.POSTVENTA_READ), 'Postventa', writeDetail(PERMISSIONS.POSTVENTA_WRITE));
    add(permission(PERMISSIONS.CAJA_READ), 'Caja', writeDetail(PERMISSIONS.CAJA_WRITE));
    add(!isSalesRole(user) && permission(PERMISSIONS.FINANZAS_READ), 'Finanzas', writeDetail(PERMISSIONS.FINANZAS_WRITE));
    add(permission(PERMISSIONS.CUOTAS_READ), 'Cuotas', writeDetail(PERMISSIONS.CUOTAS_WRITE));
    add(permission(PERMISSIONS.COBRANZAS_READ), 'Cobranzas', writeDetail(PERMISSIONS.COBRANZAS_WRITE));
    add(permission(PERMISSIONS.TALLER_READ), 'Taller', writeDetail(PERMISSIONS.TALLER_WRITE));
    add(permission(PERMISSIONS.COMMUNICATIONLOGS_READ), 'Historial de comunicaciones', writeDetail(PERMISSIONS.COMMUNICATIONLOGS_WRITE));
    add(permission(PERMISSIONS.MESSAGETEMPLATES_READ), 'Plantillas de mensajes', writeDetail(PERMISSIONS.MESSAGETEMPLATES_WRITE));
    add(permission(PERMISSIONS.MENSAJES_READ), 'Mensajes', writeDetail(PERMISSIONS.MENSAJES_WRITE));
    add(permission(PERMISSIONS.WHATSAPP_READ), 'WhatsApp', writeDetail(PERMISSIONS.WHATSAPP_WRITE));
    add(permission(PERMISSIONS.CORREOS_READ), 'Correos', writeDetail(PERMISSIONS.CORREOS_WRITE));
    add(permission(PERMISSIONS.NPS_READ), 'Encuestas de satisfacción', writeDetail(PERMISSIONS.NPS_WRITE));
    add(permission(PERMISSIONS.DORMANT_READ), 'Clientes inactivos', writeDetail(PERMISSIONS.DORMANT_WRITE));
    add(permission(PERMISSIONS.RECLAMOS_READ), 'Reclamos', writeDetail(PERMISSIONS.RECLAMOS_WRITE));
    add(permission(PERMISSIONS.PEDIDOS_READ), 'Pedidos', writeDetail(PERMISSIONS.PEDIDOS_WRITE));
    add(permission(PERMISSIONS.TELEFONOS_READ), 'Teléfonos', writeDetail(PERMISSIONS.TELEFONOS_WRITE));
    add(permission(PERMISSIONS.INFRACCIONES_READ), 'Infracciones', writeDetail(PERMISSIONS.INFRACCIONES_WRITE));
    add(permission(PERMISSIONS.LIQUIDACIONES_READ), 'Liquidaciones', writeDetail(PERMISSIONS.LIQUIDACIONES_WRITE));
    add(permission(PERMISSIONS.AUDITORIA_READ), 'Auditoría', 'Consulta de registros de actividad');
    add(permission(PERMISSIONS.EQUIPO_READ), 'Equipo', 'Consulta del equipo');
    add(permission(PERMISSIONS.PRODUCTIVIDAD_READ), 'Productividad', 'Consulta');
    add(permission(PERMISSIONS.METAS_READ), 'Metas', writeDetail(PERMISSIONS.METAS_WRITE));
    add(permission(PERMISSIONS.DATAQUALITY_READ), 'Calidad de datos', 'Consulta');
    add(permission(PERMISSIONS.SYSTEMHEALTH_READ), 'Estado del sistema', 'Consulta');
    add(permission(PERMISSIONS.EXPORTS_READ), 'Exportaciones', 'Según los módulos autorizados');
    add(permission(PERMISSIONS.TRASH_READ), 'Papelera', permission(PERMISSIONS.TRASH_DELETE) ? 'Consulta, restauración y eliminación definitiva' : permission(PERMISSIONS.TRASH_RESTORE) ? 'Consulta y restauración' : 'Solo consulta');
    add(permission(PERMISSIONS.SETTINGS_READ), 'Configuración general', writeDetail(PERMISSIONS.SETTINGS_WRITE));
    add(permission(PERMISSIONS.USUARIOS_READ), 'Configuración de usuarios', writeDetail(PERMISSIONS.USUARIOS_WRITE));
    add(permission(PERMISSIONS.APPROVALS_READ), 'Autorizaciones', user.role === ROLES.OWNER ? 'Aprueba altas y administra solicitudes' : 'Solicitudes habilitadas para su cuenta');
    add(permission(PERMISSIONS.HELP_READ), 'Ayuda', 'Consulta');
    return entries;
};
