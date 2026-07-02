import { 
    LayoutDashboard, CarFront, Users, UserPlus, CalendarClock, 
    Receipt, Landmark, FileText, Star, Flag, BarChart3, 
    Settings, Download, Activity, FileCheck, ShieldAlert,
    LogIn, Compass, Smartphone, Calendar, Bell, User
} from 'lucide-react';

export const helpRegistry = [
    // --- PRIMEROS PASOS ---
    {
        id: 'acceso',
        category: 'primeros-pasos',
        order: 1,
        title: 'Ingresar al CRM',
        icon: 'LogIn',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura', 'Gestoría', 'Recepción', 'Taller'],
        summary: 'Instrucciones para iniciar sesión, recuperar tu contraseña y proteger tu cuenta.',
        steps: [
            {
                title: 'Acceso a la plataforma',
                body: 'Ingresa a la URL oficial de AutoSporting provista por tu administrador. Necesitarás tu correo electrónico y contraseña asignada.',
                actionLabel: 'Ir al Login',
                actionRoute: '/login'
            },
            {
                title: 'Recuperación de contraseña',
                body: 'Si olvidaste tu clave, utiliza el botón "Olvidé mi contraseña" en la pantalla inicial para recibir un enlace de reseteo en tu correo.'
            },
            {
                title: 'Autenticación de dos factores (2FA)',
                body: 'Para mayor seguridad, te recomendamos activar el 2FA. Se te pedirá un código temporal generado en tu celular cada vez que ingreses.',
                actionLabel: 'Configurar 2FA',
                actionRoute: '/admin/configuracion/2fa'
            },
            {
                title: 'Cerrar sesión de forma segura',
                body: 'Siempre cierra tu sesión desde el menú superior derecho si compartes la computadora con otros vendedores para evitar accesos indebidos.'
            },
            {
                title: 'Forzar recarga',
                body: 'Si notas que la plataforma no carga información reciente, presiona Ctrl+F5 (o Cmd+Shift+R en Mac) para forzar una actualización profunda.'
            }
        ],
        tips: [
            'Nunca compartas tu contraseña con compañeros. Cada acción en el CRM queda registrada bajo tu nombre.',
            'Si detectas actividad sospechosa, notifica a un Administrador inmediatamente para revocar accesos.',
            'Configura el 2FA en tu primer día de trabajo para asegurar tu cuenta.'
        ],
        keywords: ['login', 'entrar', 'clave', 'contraseña', '2fa', 'seguridad', 'salir'],
        route: null,
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'navegacion',
        category: 'primeros-pasos',
        order: 2,
        title: 'Cómo moverse por el sistema',
        icon: 'Compass',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura', 'Gestoría', 'Recepción', 'Taller'],
        summary: 'Aprende a navegar por los menús, buscar información y personalizar tu pantalla.',
        steps: [
            {
                title: 'La barra lateral (Sidebar)',
                body: 'El menú principal se encuentra a la izquierda. Desde allí puedes acceder a todos los módulos permitidos para tu rol (Stock, Ventas, Clientes, etc.).'
            },
            {
                title: 'Buscador Global',
                body: 'En la parte superior encontrarás una barra de búsqueda para localizar rápidamente clientes por nombre, DNI o vehículos por patente.'
            },
            {
                title: 'Indicadores Superiores',
                body: 'El header superior muestra notificaciones urgentes, mensajes sin leer y accesos directos a tu perfil.'
            },
            {
                title: 'Tema Oscuro/Claro',
                body: 'AutoSporting soporta modo oscuro nativo para cuidar tu vista. Actívalo desde tu menú de perfil arriba a la derecha.'
            }
        ],
        tips: [
            'Usa el buscador global siempre que necesites encontrar un expediente rápido. Es más ágil que navegar por las listas.',
            'Mantén tu menú lateral colapsado si necesitas más espacio horizontal para ver tablas complejas.'
        ],
        keywords: ['menu', 'sidebar', 'buscar', 'tema', 'oscuro', 'claro', 'cabecera'],
        route: null,
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'seguridad',
        category: 'primeros-pasos',
        order: 3,
        title: 'Roles y permisos',
        icon: 'ShieldAlert',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura', 'Gestoría', 'Recepción', 'Taller'],
        summary: 'Niveles de acceso y permisos dentro de AutoSporting.',
        steps: [
            {
                title: 'Owner/Administrador',
                body: 'Control total. Ve la caja, estadísticas de todos los vendedores, configura comisiones y audita todas las acciones.',
                actionLabel: 'Ver configuración',
                actionRoute: '/admin/configuracion/usuarios'
            },
            {
                title: 'Ventas',
                body: 'Gestiona prospectos y ventas. Solo ve las operaciones asignadas a sí mismo o las liberadas. La ganancia real (costos ocultos) no es visible.'
            },
            {
                title: 'Finanzas y Administrativo',
                body: 'Maneja cobros, cuotas y documentación. No modifica la fuerza comercial pero asiste en la caja y expedientes.'
            },
            {
                title: 'Gestoría y Taller',
                body: 'Roles especializados que solo ven módulos operativos (Gestoría para trámites F08 y Taller para revisiones de vehículos).'
            },
            {
                title: 'Lectura vs Edición',
                body: 'Un rol de solo lectura puede consultar expedientes pero no tiene botones de guardar, editar ni borrar.'
            }
        ],
        tips: [
            'Si crees que te falta un permiso vital para tu trabajo, no intentes forzar el sistema: solicita al administrador una revisión de rol.',
            'Los vendedores tienen oculta la ganancia y costos de base de los vehículos para proteger los márgenes reales de la agencia.'
        ],
        keywords: ['permisos', 'accesos', 'restricciones', 'vendedor', 'admin', 'gestor', 'taller'],
        route: '/admin/configuracion',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'mobile',
        category: 'primeros-pasos',
        order: 4,
        title: 'Uso en el celular',
        icon: 'Smartphone',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura', 'Gestoría', 'Recepción', 'Taller'],
        summary: 'Cómo utilizar el CRM eficientemente desde dispositivos móviles.',
        steps: [
            {
                title: 'Acceso desde el navegador',
                body: 'Abre el navegador de tu celular (Chrome o Safari) e ingresa a la misma URL de siempre. El diseño se adaptará automáticamente.'
            },
            {
                title: 'El Menú Mobile',
                body: 'En pantallas pequeñas, la barra lateral se oculta. Usa el ícono de las tres líneas (hamburguesa) arriba a la izquierda para navegar.'
            },
            {
                title: 'Tablas de datos',
                body: 'Para ver tablas anchas (como las de ventas o caja), puedes deslizar el dedo horizontalmente sobre la tabla.'
            }
        ],
        tips: [
            'Para agilizar la toma de fotos en el patio, puedes usar el CRM desde el celular directamente en el módulo de Stock.',
            'Cierra las pestañas antiguas del CRM en tu navegador móvil para no consumir recursos innecesarios de tu dispositivo.'
        ],
        keywords: ['celular', 'telefono', 'movil', 'responsive', 'iphone', 'android'],
        route: null,
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },

    // --- DÍA A DÍA ---
    {
        id: 'dashboard',
        category: 'dia-a-dia',
        order: 1,
        title: 'Dashboard',
        icon: 'LayoutDashboard',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
        summary: 'El panel principal que resume las estadísticas vitales de la jornada.',
        steps: [
            {
                title: 'Cockpit CEO / Vista General',
                body: 'Si eres administrador, verás el Cockpit principal con el volumen de ventas, ganancias puras y el estado de la caja general.',
                actionLabel: 'Ir al Dashboard',
                actionRoute: '/admin'
            },
            {
                title: 'Control de Objetivos',
                body: 'Revisa tu barra de progreso respecto a las metas del mes para saber cuántas operaciones faltan cerrar.'
            },
            {
                title: 'Pendientes y Vencimientos',
                body: 'Un resumen inmediato de tareas atrasadas o cuotas que vencen hoy, crucial para priorizar tus primeras horas.'
            },
            {
                title: 'Widgets interactivos',
                body: 'Cada métrica es navegable. Si haces clic en "5 Ventas", el sistema te llevará a la tabla filtrando esas operaciones exactas.'
            }
        ],
        tips: [
            'Inicia tu día revisando los pendientes críticos antes de comenzar a enviar mensajes nuevos.',
            'Recuerda que como vendedor, los widgets de ganancia y caja total no estarán visibles en tu panel.'
        ],
        keywords: ['estadisticas', 'inicio', 'panel', 'pendientes', 'caja', 'ganancia', 'metas'],
        route: '/admin',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'calendario',
        category: 'dia-a-dia',
        order: 2,
        title: 'Calendario (Agenda)',
        icon: 'Calendar',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
        summary: 'Tu organizador diario para el seguimiento de tareas, entregas y citas.',
        steps: [
            {
                title: 'Vistas disponibles',
                body: 'Puedes alternar entre la visión mensual, semanal o del día para ajustar tu perspectiva de carga de trabajo.',
                actionLabel: 'Ir a Agenda',
                actionRoute: '/admin/agenda'
            },
            {
                title: 'Nuevo evento',
                body: 'Agrega manualmente citas con clientes, recordatorios para llamar o fechas de entrega programadas.'
            },
            {
                title: 'Eventos Automáticos',
                body: 'El sistema inyecta automáticamente en tu calendario los vencimientos de cuotas, reservas y tareas de seguimiento de leads.'
            },
            {
                title: 'Filtros rápidos',
                body: 'Filtra el calendario para ver solo eventos urgentes o solo entregas de vehículos.'
            }
        ],
        tips: [
            'Una agenda sin tareas vencidas refleja un operador altamente productivo y evita la pérdida de clientes.',
            'No confíes en tu memoria: si prometiste llamar a un cliente el jueves, agéndalo en el acto.'
        ],
        keywords: ['agenda', 'eventos', 'citas', 'vencimientos', 'recordatorios'],
        route: '/admin/agenda',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'alertas',
        category: 'dia-a-dia',
        order: 3,
        title: 'Alertas y Notificaciones',
        icon: 'Bell',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
        summary: 'El centro de control para avisos urgentes y novedades del sistema.',
        steps: [
            {
                title: 'La Campana',
                body: 'El ícono de campana en la esquina superior derecha acumula tus notificaciones. El punto rojo indica que hay novedades.',
                actionLabel: 'Ver Alertas',
                actionRoute: '/admin/alertas'
            },
            {
                title: 'Prioridades',
                body: 'Las alertas pueden ser normales (asignación de un lead) o críticas (una reserva a punto de caducar que requiere acción).'
            },
            {
                title: 'Acciones relacionadas',
                body: 'Hacer clic sobre una notificación te llevará directamente al expediente, lead o vehículo en cuestión.'
            },
            {
                title: 'Gestión de lectura',
                body: 'Marca las notificaciones como leídas una vez que te hayas dado por enterado para mantener tu bandeja limpia.'
            }
        ],
        tips: [
            'No dejes que se acumulen docenas de alertas. Procesa tus notificaciones al menos dos veces por día.',
            'Si recibes una alerta crítica de "Reserva Vencida", actúa de inmediato liberando el stock o contactando al cliente.'
        ],
        keywords: ['notificaciones', 'campana', 'avisos', 'urgente'],
        route: '/admin/alertas',
        featureFlag: null,
        implementationStatus: 'partial',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'mi-espacio',
        category: 'dia-a-dia',
        order: 4,
        title: 'Mi Espacio',
        icon: 'User',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Gestoría'],
        summary: 'Tu rincón personal con un consolidado de todo lo que te pertenece.',
        steps: [
            {
                title: 'Resumen de Mi Día',
                body: 'Una vista ultra-enfocada con lo que tienes que hacer exclusivamente hoy, sin ruido visual del resto de la agencia.',
                actionLabel: 'Ir a Mi Espacio',
                actionRoute: '/admin/mi-espacio'
            },
            {
                title: 'Mis Ventas y Urgencias',
                body: 'Acceso directo a las operaciones que tú lideras y a los cuellos de botella urgentes que bloquean tus entregas.'
            },
            {
                title: 'Mis Cuotas y Pendientes',
                body: 'Listado rápido de los pagos que debes reclamar a tus clientes directos.'
            }
        ],
        tips: [
            'Mi Espacio está diseñado para que los vendedores puedan operar el 80% de su día sin salir de esta pantalla.',
            'Revisa la pestaña de Urgencias frecuentemente; ahí se asientan los problemas graves de documentación o cobros.'
        ],
        keywords: ['personal', 'mis ventas', 'mi dia', 'urgencias', 'perfil'],
        route: '/admin/mi-espacio',
        featureFlag: null,
        implementationStatus: 'partial',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },

    // --- COMERCIAL (Retained existing) ---
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

    // --- OPERACIÓN (Retained existing) ---
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

    // --- FINANZAS (Retained existing) ---
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

    // --- COMUNICACION (Retained existing) ---
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

    // --- ADMINISTRACION (Retained existing) ---
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
    }
];
