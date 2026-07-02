import { 
    LayoutDashboard, CarFront, Users, UserPlus, CalendarClock, 
    Receipt, Landmark, FileText, Star, Flag, BarChart3, 
    Settings, Download, Activity, FileCheck, ShieldAlert 
} from 'lucide-react';

// The centralized registry for all Help Manual chapters
export const helpRegistry = [
    {
        id: 'dashboard',
        category: 'dia-a-dia',
        order: 1,
        title: 'Dashboard',
        icon: 'LayoutDashboard', // Using string identifier to be decoupled from React components directly if needed, or import icon directly
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
        summary: 'El panel principal que resume las estadísticas vitales de la jornada.',
        steps: [
            {
                title: 'Revisión inicial',
                body: 'Qué mirar al entrar: El panel principal resume las estadísticas vitales de la jornada.',
                actionLabel: 'Ir al Dashboard',
                actionRoute: '/admin'
            },
            {
                title: 'Mis Pendientes',
                body: 'Cómo interpretar pendientes: Revisa siempre "Mis Pendientes" o tareas atrasadas para ponerte al día.',
                actionLabel: 'Ver pendientes',
                actionRoute: '/admin/mis-pendientes'
            }
        ],
        tips: ['Inicia tu día siempre revisando el Dashboard para orientar tu estrategia diaria.'],
        keywords: ['estadisticas', 'inicio', 'panel', 'pendientes'],
        route: '/admin',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'stock',
        category: 'comercial',
        order: 1,
        title: 'Stock',
        icon: 'CarFront',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
        summary: 'Gestión de inventario de vehículos, estados y publicación web.',
        steps: [
            {
                title: 'Cargar un vehículo',
                body: 'Ingresa la patente, marca, modelo, versión y fotos de alta calidad.',
                actionLabel: 'Ir a Stock',
                actionRoute: '/admin/stock'
            },
            {
                title: 'Actualizar estado',
                body: 'Cambiar el estado a Reservado o Vendido automáticamente detiene las campañas de venta activa.'
            },
            {
                title: 'Visibilidad en Web',
                body: 'Si el switch está encendido, el vehículo aparece en el catálogo público y plataformas.'
            }
        ],
        tips: ['Regla vital: NUNCA publiques vehículos que ya estén señados, vendidos o en proceso de reserva final para evitar malos entendidos con nuevos prospectos.'],
        keywords: ['vehiculos', 'inventario', 'autos', 'catalogo', 'publicar'],
        route: '/admin/stock',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'clientes',
        category: 'comercial',
        order: 2,
        title: 'Clientes',
        icon: 'Users',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
        summary: 'Gestión de la base de datos de clientes y su historial.',
        steps: [
            {
                title: 'Carga de clientes',
                body: 'Todo cliente nuevo debe tener DNI, teléfono válido y correo.',
                actionLabel: 'Ir a Clientes',
                actionRoute: '/admin/clientes'
            },
            {
                title: 'Historial',
                body: 'Utiliza el perfil del cliente para ver todo su recorrido (comunicaciones, ventas pasadas).'
            },
            {
                title: 'Prevención de duplicados',
                body: 'Antes de crear, busca por DNI o teléfono.'
            }
        ],
        tips: ['Mantén siempre actualizados los datos de contacto de tus clientes frecuentes.'],
        keywords: ['compradores', 'contactos', 'agenda', 'personas'],
        route: '/admin/clientes',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'leads',
        category: 'comunicacion',
        order: 1,
        title: 'Leads',
        icon: 'UserPlus',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
        summary: 'Administración de prospectos y oportunidades de venta.',
        steps: [
            {
                title: 'Atención prioritaria',
                body: 'Atiende los leads en orden de prioridad. Las respuestas rápidas (menos de 5 min) incrementan la conversión un 300%.',
                actionLabel: 'Ir a Leads',
                actionRoute: '/admin/leads'
            },
            {
                title: 'Asignación',
                body: 'Si un lead entra huérfano, asígnalo rápidamente a ti o a otro vendedor.'
            },
            {
                title: 'Tareas de Seguimiento',
                body: 'Siempre debes dejar programada la "próxima acción" tras cada contacto.'
            }
        ],
        tips: [
            'Estados de Leads: Frío (interesa pero a futuro), Caliente (listo para reservar en 72hs), Perdido (dejó de responder), Convertido (venta/reserva confirmada).'
        ],
        keywords: ['prospectos', 'interesados', 'embudo', 'oportunidades'],
        route: '/admin/leads',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'agenda',
        category: 'dia-a-dia',
        order: 2,
        title: 'Agenda / Pendientes',
        icon: 'CalendarClock',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
        summary: 'Tu organizador diario para el seguimiento de tareas.',
        steps: [
            {
                title: 'Revisión Diaria',
                body: 'Tu agenda te muestra lo que debes hacer hoy.',
                actionLabel: 'Ver Agenda',
                actionRoute: '/admin/agenda'
            },
            {
                title: 'Control de Vencimientos',
                body: 'Jamás debes tener tareas en rojo (vencidas).'
            }
        ],
        tips: ['Una agenda sin tareas vencidas refleja un vendedor altamente productivo.'],
        keywords: ['tareas', 'calendario', 'vencimientos', 'recordatorios'],
        route: '/admin/agenda',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'reservas',
        category: 'operacion',
        order: 3,
        title: 'Reservas',
        icon: 'CalendarClock',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
        summary: 'Señas y reservas de vehículos por parte de los clientes.',
        steps: [
            {
                title: 'Creación',
                body: 'Bloquea el stock de un vehículo al instante. Requiere vincular un Lead/Cliente.',
                actionLabel: 'Ir a Reservas',
                actionRoute: '/admin/reservas'
            },
            {
                title: 'Conversión',
                body: 'Una vez aprobada, se pasa a Venta y genera el expediente formal.'
            },
            {
                title: 'Cancelación',
                body: 'Libera el stock inmediatamente.'
            }
        ],
        tips: ['Al recibir una reserva, valida rápidamente el comprobante de pago para oficializarla.'],
        keywords: ['señas', 'apartado', 'bloqueo'],
        route: '/admin/reservas',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'ventas',
        category: 'comercial',
        order: 4,
        title: 'Ventas',
        icon: 'Receipt',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
        summary: 'Gestión de operaciones cerradas, expedientes y finanzas asociadas.',
        steps: [
            {
                title: 'Expediente',
                body: 'Centraliza cliente, vehículo, cuotas, transferencias y firmas.',
                actionLabel: 'Ir a Ventas',
                actionRoute: '/admin/ventas'
            },
            {
                title: 'Comunicaciones',
                body: 'Registra todo contacto relevante al expediente.'
            }
        ],
        tips: ['Importante: El vendedor no debe modificar aspectos financieros de la venta una vez aprobada sin permiso de administración.'],
        keywords: ['operaciones', 'cierres', 'facturacion', 'entregas'],
        route: '/admin/ventas',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'documentacion',
        category: 'operacion',
        order: 1,
        title: 'Documentación',
        icon: 'FileCheck',
        roles: ['Owner/Admin', 'Administrativo', 'Solo lectura'],
        summary: 'Seguimiento de trámites y papeles de cada vehículo.',
        steps: [
            {
                title: 'Checklist',
                body: 'Marca el avance de DNI, informes de dominio, Verificación Policial, F08 y más.',
                actionLabel: 'Ir a Documentación',
                actionRoute: '/admin/documentacion'
            }
        ],
        tips: ['Mantén la documentación al día para no retrasar la entrega final del vehículo.'],
        keywords: ['papeles', 'tramites', 'gestoria', 'f08', 'dominio'],
        route: '/admin/documentacion',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'postventa',
        category: 'comercial',
        order: 8,
        title: 'Postventa',
        icon: 'Star',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
        summary: 'Fidelización y seguimiento post-entrega.',
        steps: [
            {
                title: 'Seguimiento 24hs',
                body: 'Consulta cómo sintió el vehículo en su primer día.',
                actionLabel: 'Ir a Postventa',
                actionRoute: '/admin/postventa'
            },
            {
                title: 'Seguimiento 7 días',
                body: 'Momento ideal para pedir reseña en Google.'
            }
        ],
        tips: ['Un buen proceso de postventa asegura referencias y recompra en el futuro.'],
        keywords: ['fidelizacion', 'encuestas', 'satisfaccion', 'reseñas'],
        route: '/admin/postventa',
        featureFlag: null,
        implementationStatus: 'partial',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'metas',
        category: 'administracion',
        order: 3,
        title: 'Metas',
        icon: 'Flag',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
        summary: 'Objetivos comerciales y seguimiento de cumplimiento.',
        steps: [
            {
                title: 'Actualización',
                body: 'Las metas se actualizan automáticamente según las ventas cerradas.',
                actionLabel: 'Ver Metas',
                actionRoute: '/admin/metas'
            }
        ],
        tips: ['Privacidad: Los vendedores solo pueden ver sus propias metas asignadas.'],
        keywords: ['objetivos', 'kpi', 'resultados'],
        route: '/admin/metas',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'productividad',
        category: 'administracion',
        order: 4,
        title: 'Equipo / Productividad',
        icon: 'BarChart3',
        roles: ['Owner/Admin'],
        summary: 'Métricas de rendimiento general del equipo comercial.',
        steps: [
            {
                title: 'KPIs',
                body: 'Control de tasas de cierre y velocidad de respuesta de todo el equipo.',
                actionLabel: 'Ver Productividad',
                actionRoute: '/admin/productividad'
            }
        ],
        tips: ['Privacidad: Los vendedores no deben ver las estadísticas comparativas de otros vendedores.'],
        keywords: ['rendimiento', 'equipo', 'vendedores', 'metricas'],
        route: '/admin/productividad',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'cuotas',
        category: 'finanzas',
        order: 4,
        title: 'Cuotas / Cobranzas',
        icon: 'Landmark',
        roles: ['Owner/Admin', 'Administrativo'],
        summary: 'Gestión de cobros pendientes y moras.',
        steps: [
            {
                title: 'Control de mora',
                body: 'Gestión de fechas de vencimiento, moras e intereses.',
                actionLabel: 'Ir a Cuotas',
                actionRoute: '/admin/cuotas'
            }
        ],
        tips: ['Prohibido: Nunca modificar montos sin autorización formal de gerencia.'],
        keywords: ['pagos', 'cobros', 'vencimientos', 'intereses'],
        route: '/admin/cuotas',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'calidad',
        category: 'administracion',
        order: 2,
        title: 'Calidad de Datos',
        icon: 'ShieldAlert',
        roles: ['Owner/Admin', 'Administrativo'],
        summary: 'Auditoría automática para mantener la base de datos limpia.',
        steps: [
            {
                title: 'Detección',
                body: 'El panel detecta problemas como leads huérfanos o ventas sin cerrar.',
                actionLabel: 'Ir a Calidad de Datos',
                actionRoute: '/admin/calidad-datos'
            },
            {
                title: 'Resolución',
                body: 'La corrección siempre es manual haciendo clic en el enlace, el sistema nunca borra ni fusiona datos por su cuenta para preservar auditoría.'
            }
        ],
        tips: ['Revisa la calidad de datos semanalmente para evitar basura en el sistema.'],
        keywords: ['inconsistencias', 'errores', 'limpieza', 'huerfanos'],
        route: '/admin/calidad-datos',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'configuracion',
        category: 'administracion',
        order: 1,
        title: 'Configuración',
        icon: 'Settings',
        roles: ['Owner/Admin'],
        summary: 'Configuraciones generales, roles y plantillas del sistema.',
        steps: [
            {
                title: 'Accesos',
                body: 'Usuarios y Permisos: Gestión estricta de quién accede a qué.',
                actionLabel: 'Ir a Configuración',
                actionRoute: '/admin/configuracion'
            },
            {
                title: 'Plantillas',
                body: 'Textos predefinidos para uso operativo del equipo (solo admins pueden editarlas globalmente).'
            },
            {
                title: 'Reglas Operativas',
                body: 'Config General: Ajustes como la tolerancia en días para "Leads Fríos".'
            }
        ],
        tips: ['Un cambio en la configuración general impacta a toda la agencia al instante.'],
        keywords: ['ajustes', 'parametros', 'usuarios', 'roles'],
        route: '/admin/configuracion',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'exportaciones',
        category: 'administracion',
        order: 6,
        title: 'Exportaciones',
        icon: 'Download',
        roles: ['Owner/Admin', 'Administrativo'],
        summary: 'Generación de respaldos CSV y extracción de datos masivos.',
        steps: [
            {
                title: 'Generar CSV',
                body: 'Generar respaldos CSV de módulos clave para análisis externo o contaduría.',
                actionLabel: 'Ir a Exportaciones',
                actionRoute: '/admin/exportaciones'
            }
        ],
        tips: ['Seguridad: No se exportan contraseñas, tokens, caja ni datos financieros ocultos para proteger la información comercial y privada.'],
        keywords: ['csv', 'excel', 'descargas', 'backups'],
        route: '/admin/exportaciones',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'sistema',
        category: 'administracion',
        order: 7,
        title: 'Salud del Sistema',
        icon: 'Activity',
        roles: ['Owner/Admin'],
        summary: 'Monitoreo de estado de servidores y bases de datos.',
        steps: [
            {
                title: 'Monitoreo',
                body: 'Verifica latencia de base de datos y alertas de desconexión.',
                actionLabel: 'Ir a Salud del Sistema',
                actionRoute: '/admin/sistema'
            }
        ],
        tips: ['Alertas críticas: Si MongoDB figura Offline, contactar a soporte técnico inmediatamente.'],
        keywords: ['servidores', 'online', 'caidas', 'latencia', 'base de datos'],
        route: '/admin/sistema',
        featureFlag: null,
        implementationStatus: 'partial',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'auditoria',
        category: 'administracion',
        order: 5,
        title: 'Auditoría',
        icon: 'FileText',
        roles: ['Owner/Admin'],
        summary: 'Registro inmutable de todas las acciones del sistema.',
        steps: [
            {
                title: 'Trazabilidad',
                body: 'Toda creación, edición y borrado queda grabada con fecha y autor.',
                actionLabel: 'Ir a Auditoría',
                actionRoute: '/admin/auditoria'
            }
        ],
        tips: ['Objetivo: Trazabilidad absoluta de la operatoria para detectar posibles fraudes o errores humanos.'],
        keywords: ['logs', 'registros', 'historial', 'trazabilidad', 'seguridad'],
        route: '/admin/auditoria',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'seguridad',
        category: 'primeros-pasos',
        order: 1,
        title: 'Seguridad y Roles',
        icon: 'ShieldAlert',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
        summary: 'Niveles de acceso y permisos dentro de AutoSporting.',
        steps: [
            {
                title: 'Owner/Admin',
                body: 'Control total, visión irrestricta de márgenes y auditoría.',
                actionLabel: 'Ver configuración de usuarios',
                actionRoute: '/admin/configuracion/usuarios'
            },
            {
                title: 'Administrativo',
                body: 'Acceso a operatoria y documentación, sin acceso a márgenes (salvo permiso expreso).'
            },
            {
                title: 'Ventas',
                body: 'Solo ve operaciones asignadas a sí mismo. No ve auditoría, configuración ni finanzas.'
            },
            {
                title: 'Solo lectura',
                body: 'No puede crear, editar ni borrar absolutamente nada.'
            }
        ],
        tips: ['Comprender los roles es fundamental para evitar filtración de información sensible.'],
        keywords: ['permisos', 'accesos', 'restricciones', 'vendedor', 'admin'],
        route: '/admin/configuracion',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    }
];
