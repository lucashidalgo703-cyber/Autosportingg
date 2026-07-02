import { 
    LayoutDashboard, CarFront, Users, UserPlus, CalendarClock, 
    Receipt, Landmark, FileText, Star, Flag, BarChart3, 
    Settings, Download, Activity, FileCheck, ShieldAlert,
    LogIn, Compass, Smartphone, Calendar, Bell, User,
    Target, MessageCircle, Moon, FolderOpen, FileSignature, Handshake, AlertOctagon, Wrench, MessageSquareWarning
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

    // --- COMERCIAL ---
    {
        id: 'stock',
        category: 'comercial',
        order: 1,
        title: 'Stock',
        icon: 'CarFront',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
        summary: 'Gestión completa del inventario de vehículos propios, de terceros y en consignación.',
        steps: [
            {
                title: 'Buscar y Filtrar',
                body: 'Usa la barra superior para buscar por patente, modelo o año. Filtra por estado (Disponible, Reservado, Vendido).'
            },
            {
                title: 'Tipos de Stock',
                body: 'Agencia Propia (vehículos comprados al 100%), Tercero (solo intermediamos), Consignación (el cliente deja el auto en el local físico), Inversión Compartida (comprado a medias con otro inversor) y Mandatos (poder para vender).'
            },
            {
                title: 'Nuevo Vehículo / Mandato',
                body: 'Al ingresar un auto 0km o usado, completa todos los detalles físicos, carga fotos de alta resolución y define el origen comercial.',
                actionLabel: 'Ir a Stock',
                actionRoute: '/admin/stock'
            },
            {
                title: 'Catálogo Web y Mercado Libre',
                body: 'Activa el switch de visibilidad para publicar automáticamente el vehículo en tu sitio y en Mercado Libre (si está integrado).'
            },
            {
                title: 'Acciones Operativas',
                body: 'Desde el perfil del vehículo puedes Señarlo (bloqueo rápido), Editar la información técnica, Imprimir la ficha para el parabrisas, o Exportar/Importar masivamente mediante XLSX.'
            }
        ],
        tips: [
            'Nunca publiques un auto que no esté físicamente acondicionado para ser mostrado.',
            'Mantén las patentes limpias y las fotos nítidas. Las publicaciones con más de 10 fotos venden un 40% más rápido.',
            'Diferencia bien Consignación (está en tu agencia) de Terceros (lo tiene el dueño en su casa) para no prometer exhibiciones inmediatas.'
        ],
        keywords: ['vehiculos', 'inventario', 'autos', 'catalogo', 'publicar', 'mandatos', 'consignaciones', '0km', 'excel'],
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
        summary: 'Directorio centralizado de compradores, vendedores y prospectos de la agencia.',
        steps: [
            {
                title: 'Alta y Edición',
                body: 'Crea un cliente solicitando su nombre completo, DNI y teléfono. Si ya existe, puedes editar sus datos desde su perfil.',
                actionLabel: 'Ir a Clientes',
                actionRoute: '/admin/clientes'
            },
            {
                title: 'Tipos y Origen',
                body: 'Clasifica al cliente por tipo (Comprador, Vendedor, Ambos) e indica su Origen (Facebook, Instagram, Walk-in, etc.) para medir el ROI del marketing.'
            },
            {
                title: 'Pipeline y Estados',
                body: 'Sigue el estado del cliente en el embudo (Nuevo, Contactado, Negociando). Si hay interés, asigna el Vehículo de interés específico.'
            },
            {
                title: 'Vendedor Asignado y Visibilidad',
                body: 'El dueño del cliente es el único vendedor que puede ver su información financiera. Los administradores ven la cartera completa.'
            },
            {
                title: 'Actividades y WhatsApp',
                body: 'Registra llamadas, notas y sube archivos adjuntos. Si usas WhatsApp web, haz clic en el número para abrir el chat directamente.'
            }
        ],
        tips: [
            'Antes de crear un cliente, utiliza el buscador por DNI o Teléfono para evitar Duplicados molestos.',
            'Anota cada conversación en "Actividades". Si te enfermas, otro vendedor podrá retomar la venta leyendo el historial.'
        ],
        keywords: ['compradores', 'contactos', 'personas', 'whatsapp', 'agenda', 'duplicados'],
        route: '/admin/clientes',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'cotizaciones',
        category: 'comercial',
        order: 3,
        title: 'Cotizaciones',
        icon: 'FileText',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
        summary: 'Emisión de presupuestos formales para vehículos en venta o permuta.',
        steps: [
            {
                title: 'Nueva Cotización',
                body: 'Selecciona al cliente, el vehículo de interés y establece el precio final acordado junto con su moneda (ARS o USD).',
                actionLabel: 'Ir a Cotizaciones',
                actionRoute: '/admin/cotizaciones'
            },
            {
                title: 'Condiciones y Permuta',
                body: 'Usa la descripción libre para detallar bonificaciones. Si el cliente entrega un auto en parte de pago, registra la tasación de la permuta.'
            },
            {
                title: 'Estados y Borradores',
                body: 'Una cotización puede estar en Borrador, Enviada, Aprobada o Rechazada. Migrar borradores sirve para actualizarlos.'
            },
            {
                title: 'Auditoría',
                body: 'El administrador puede filtrar las cotizaciones y revisar si hubo descuentos excesivos antes de la conversión a venta.'
            }
        ],
        tips: [
            'Una cotización formal en PDF da mucha más confianza que un mensaje de WhatsApp informal.',
            'Nunca dejes un estado en "Aprobada" si realmente ya es una venta. Procede a la Conversión a Venta.'
        ],
        keywords: ['presupuesto', 'precios', 'permuta', 'borradores', 'tasacion'],
        route: '/admin/cotizaciones',
        featureFlag: null,
        implementationStatus: 'partial',
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
        summary: 'Gestión central de operaciones cerradas, cobros y armado de expedientes.',
        steps: [
            {
                title: 'Nueva Venta',
                body: 'Une al Comprador, el Propietario anterior y el Vehículo. Define el Precio total de cierre y la moneda de la operación.',
                actionLabel: 'Ir a Ventas',
                actionRoute: '/admin/ventas'
            },
            {
                title: 'Esquema de Pago',
                body: 'Registra la Seña inicial, pagos al contado, cantidad de Cuotas directas y si existe Financiación prendaria.'
            },
            {
                title: 'Permutas y Consignaciones',
                body: 'Agrega los vehículos entregados en permuta y asocia liquidaciones si el auto original era una consignación de un tercero.'
            },
            {
                title: 'Gestor y Comisiones',
                body: 'Asigna el Gestor responsable del F08 y los vendedores involucrados para el Split de comisiones.'
            },
            {
                title: 'Expediente',
                body: 'Controla el avance de la venta mediante los Estados (Señado, Cancelado, Entregado) y adjunta documentos físicos firmados.'
            }
        ],
        tips: [
            'Una venta no es una venta hasta que el cliente paga la seña y firma la reserva. No muevas estados prematuramente.',
            'Si interviene más de un vendedor, el Split de comisiones debe quedar claro desde el día 1 para evitar roces internos.'
        ],
        keywords: ['operaciones', 'cierres', 'facturacion', 'entregas', 'seña', 'permuta', 'expediente'],
        route: '/admin/ventas',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'mis-ventas',
        category: 'comercial',
        order: 5,
        title: 'Mis Ventas',
        icon: 'Star',
        roles: ['Ventas'],
        summary: 'Panel personal del vendedor con su rendimiento comercial y comisiones.',
        steps: [
            {
                title: 'Rendimiento y Objetivos',
                body: 'Revisa tu progreso del mes: cantidad de operaciones cerradas vs tu meta asignada.',
                actionLabel: 'Ver Mis Ventas',
                actionRoute: '/admin/mis-ventas'
            },
            {
                title: 'Facturación y Comisiones',
                body: 'Monitorea cuánto has facturado en total y cuál es tu comisión estimada.'
            },
            {
                title: 'Ventas y Consignaciones',
                body: 'Listado exclusivo de los expedientes donde figuras como vendedor principal, o vehículos que tomaste en consignación.'
            },
            {
                title: 'Ranking y Premios',
                body: 'Observa tu posición en la agencia. Alcanzar el primer lugar o metas extra desbloquea premios adicionales.'
            }
        ],
        tips: [
            'Si notas discrepancias en tus comisiones estimadas, revisa el Split de las ventas compartidas.',
            'No olvides subir los recibos y boletos de tus operaciones para que el área administrativa te libere el pago de comisión.'
        ],
        keywords: ['comisiones', 'ranking', 'premios', 'facturacion', 'vendedor'],
        route: '/admin/mis-ventas',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'pedidos',
        category: 'comercial',
        order: 6,
        title: 'Pedidos',
        icon: 'CalendarClock',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
        summary: 'Registro de solicitudes de vehículos que los clientes buscan y no tienes en stock.',
        steps: [
            {
                title: 'Nuevo Pedido',
                body: 'Registra al cliente, la Marca, el Modelo, Año mínimo/máximo y su Presupuesto disponible.',
                actionLabel: 'Ir a Pedidos',
                actionRoute: '/admin/pedidos'
            },
            {
                title: 'Match Inteligente',
                body: 'El sistema cruza diariamente los pedidos contra el Stock nuevo. Si hay coincidencias, el botón "Match" se ilumina.'
            },
            {
                title: 'Filtros y Seguimiento',
                body: 'Usa el botón "Solo míos" para ver los pedidos de tus clientes. Mantén los estados limpios (Activo, Cumplido o Cancelado).'
            },
            {
                title: 'Contacto',
                body: 'Al lograr un Match, haz clic en el cliente para llamarlo inmediatamente e informarle que ingresó el vehículo que busca.'
            }
        ],
        tips: [
            'Los pedidos son oro. Un cliente con pedido está altamente calificado para comprar ya mismo.',
            'Cancela los pedidos antiguos (más de 90 días) si el cliente compró en otro lado para no ensuciar el Match inteligente.'
        ],
        keywords: ['solicitud', 'busqueda', 'match', 'presupuesto', 'encargo'],
        route: '/admin/pedidos',
        featureFlag: null,
        implementationStatus: 'partial',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'oportunidades',
        category: 'comercial',
        order: 7,
        title: 'Oportunidades',
        icon: 'Target',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
        summary: 'Tablero de seguimiento avanzado para potenciales operaciones B2B o grandes lotes.',
        steps: [
            {
                title: 'Gestión del embudo',
                body: 'Mueve las oportunidades comerciales de alto nivel por sus distintas etapas hasta el cierre.',
                actionLabel: 'Ir a Oportunidades',
                actionRoute: '/admin/oportunidades'
            }
        ],
        tips: [
            'A diferencia de un Lead estándar, la Oportunidad está enfocada en operaciones más maduras y complejas.'
        ],
        keywords: ['embudo', 'b2b', 'negocios'],
        route: '/admin/oportunidades',
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
        icon: 'MessageCircle',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
        summary: 'Seguimiento de la satisfacción del cliente y manejo de quejas luego de la entrega.',
        steps: [
            {
                title: 'Gestión de Casos',
                body: 'Revisa el tablero para identificar entregas recientes con llamados Pendientes o Recontactos agendados.',
                actionLabel: 'Ir a Postventa',
                actionRoute: '/admin/postventa'
            },
            {
                title: 'Categorización',
                body: 'Clasifica la respuesta del cliente como Conforme (feliz) o si hay Incidencias (problemas mecánicos, quejas).'
            },
            {
                title: 'Resolución y Cierre',
                body: 'Añade Notas de lo conversado vía WhatsApp o teléfono. Al solucionar una queja, marca el caso como Cerrado.'
            }
        ],
        tips: [
            'Un cliente Conforme es el mejor momento para pedirle que te deje una reseña de 5 estrellas en Google.',
            'Trata las Incidencias como máxima prioridad; una reseña pública negativa te hará perder futuras ventas.'
        ],
        keywords: ['fidelizacion', 'encuestas', 'satisfaccion', 'quejas', 'incidencias'],
        route: '/admin/postventa',
        featureFlag: null,
        implementationStatus: 'partial',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'dormidos',
        category: 'comercial',
        order: 9,
        title: 'Dormidos',
        icon: 'Moon',
        roles: ['Owner/Admin', 'Ventas'],
        summary: 'Recuperación de prospectos y clientes inactivos que dejaron de responder.',
        steps: [
            {
                title: 'Criterio Temporal',
                body: 'El sistema cataloga automáticamente como Dormido a todo cliente o lead sin interacción por más de ciertos días.',
                actionLabel: 'Ir a Dormidos',
                actionRoute: '/admin/dormidos'
            },
            {
                title: 'Filtros y KPIs',
                body: 'Revisa el panel para ver cuántos leads perdiste recientemente. Usa los filtros para identificar Clientes VIP que valgan el esfuerzo de recontactar.'
            },
            {
                title: 'Recuperación',
                body: 'Contáctalos uno a uno por WhatsApp con una oferta o pregunta clave para reactivar su interés.'
            }
        ],
        tips: [
            'No escribas un "Hola, ¿seguís interesado?" genérico. Ofrécele una rebaja, un auto similar que ingresó, o un incentivo claro.',
            'Dedica una hora todos los viernes a despertar leads inactivos. Es una mina de oro ignorada.'
        ],
        keywords: ['inactivos', 'perdidos', 'rescate', 'recuperacion', 'kpi'],
        route: '/admin/dormidos',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },

    // --- OPERACIÓN ---
    {
        id: 'expedientes',
        category: 'operacion',
        order: 1,
        title: 'Expedientes',
        icon: 'FolderOpen',
        roles: ['Owner/Admin', 'Administrativo', 'Gestoría', 'Solo lectura'],
        summary: 'Centro neurálgico administrativo donde convergen los documentos y finanzas de una venta.',
        steps: [
            {
                title: 'Origen',
                body: 'Todo expediente nace de una venta cerrada. Puedes buscarlo por número de expediente, patente o cliente.',
                actionLabel: 'Ir a Expedientes',
                actionRoute: '/admin/expedientes'
            },
            {
                title: 'Partes Involucradas',
                body: 'El resumen muestra la Parte Compradora (el nuevo dueño) y la Parte Vendedora (el ex dueño o la agencia). El Gestor asignado es responsable del avance.'
            },
            {
                title: 'Documentación y Boletos',
                body: 'Controla el checklist de papeles entregados e imprime el Boleto de Compra-Venta.'
            },
            {
                title: 'Gastos y Liquidación',
                body: 'Solo perfiles con permisos financieros pueden asentar gastos de gestoría o reparaciones finales que impactan en la liquidación de la operación.'
            },
            {
                title: 'Estados y WhatsApp',
                body: 'Actualiza el estado (En proceso, Faltan firmas, Terminado) y notifica al cliente rápidamente vía WhatsApp integrado.'
            }
        ],
        tips: [
            'No marques un expediente como "Terminado" hasta que el vehículo esté físicamente transferido y la liquidación pagada.',
            'Usa la pestaña de Observaciones para dejar constancia de cualquier deuda de patente que el cliente prometió pagar luego.'
        ],
        keywords: ['carpetas', 'boletos', 'liquidaciones', 'gastos', 'tramites'],
        route: '/admin/expedientes',
        featureFlag: null,
        implementationStatus: 'partial',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'gestoria',
        category: 'operacion',
        order: 2,
        title: 'Gestoría',
        icon: 'FileSignature',
        roles: ['Owner/Admin', 'Gestoría', 'Administrativo'],
        summary: 'Seguimiento de trámites de transferencia, inscripciones y reportes de dominio.',
        steps: [
            {
                title: 'Tablero de Trámites',
                body: 'Visualiza en forma de tarjetas o listado todos los trámites activos.',
                actionLabel: 'Ir a Gestoría',
                actionRoute: '/admin/gestoria'
            },
            {
                title: 'Nuevo Trámite',
                body: 'Asigna el trámite a un Gestor, establece el nivel de Prioridad y una fecha de Vencimiento límite.'
            },
            {
                title: 'Hitos y Documentos Faltantes',
                body: 'A medida que el trámite avanza, marca los hitos cumplidos. Si el registro pide más papeles, anótalos en "Documentos faltantes".'
            },
            {
                title: 'Expediente Relacionado',
                body: 'Todo trámite debe estar vinculado a su expediente de origen para que el área de finanzas sepa por qué se están pagando aranceles.'
            }
        ],
        tips: [
            'Revisa diariamente los trámites con "Prioridad Alta" que estén cerca del vencimiento del boleto.',
            'Avisa al cliente por WhatsApp directamente desde el panel cuando las chapas o la cédula verde estén listas para retirar.'
        ],
        keywords: ['transferencias', 'f08', 'cedulas', 'registros', 'tramites'],
        route: '/admin/gestoria',
        featureFlag: null,
        implementationStatus: 'partial',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'consignaciones',
        category: 'operacion',
        order: 3,
        title: 'Consignaciones',
        icon: 'Handshake',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
        summary: 'Control del ciclo de vida de los vehículos que terceros dejan en la agencia para vender.',
        steps: [
            {
                title: 'El Kanban',
                body: 'Arrastra las consignaciones por sus etapas: Ingreso, Tasación, Documentación, Publicado, Reservado, Vendido y Cerrado.',
                actionLabel: 'Ir a Consignaciones',
                actionRoute: '/admin/consignaciones'
            },
            {
                title: 'Vista Lista y Datos Base',
                body: 'Alterna a la vista de Lista para ver en detalle el Propietario, el Vendedor a cargo, el Precio pretendido y la Comisión acordada.'
            },
            {
                title: 'Seguimientos',
                body: 'Anota cada contacto con el dueño. Un campo de "Último contacto" te avisará si llevas meses sin informarle sobre el estado de su auto.'
            },
            {
                title: 'Vehículo Relacionado',
                body: 'Una vez que la consignación llega a "Publicado", debe existir un vínculo directo al auto en el módulo de Stock.'
            }
        ],
        tips: [
            'Nunca pases una consignación a "Publicado" si no has completado la fase de "Documentación" (F08 firmado, libre deuda, etc.).',
            'Si el dueño retira el auto, arrastra la tarjeta a "Cancelado" para limpiar tu inventario y frenar la publicidad.'
        ],
        keywords: ['terceros', 'dueños', 'kanban', 'mandatos', 'comision'],
        route: '/admin/consignaciones',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'infracciones',
        category: 'operacion',
        order: 4,
        title: 'Infracciones',
        icon: 'AlertOctagon',
        roles: ['Owner/Admin', 'Administrativo', 'Gestoría'],
        summary: 'Gestión y cobro de multas de tránsito asociadas a los vehículos en stock.',
        steps: [
            {
                title: 'Alta de Infracción',
                body: 'Carga la patente, la jurisdicción (ej. CABA, PBA) y el motivo detallado de la multa.',
                actionLabel: 'Ir a Infracciones',
                actionRoute: '/admin/infracciones'
            },
            {
                title: 'Manejo de Montos',
                body: 'Registra el "Pago Real" (lo que le pagas al municipio) y el "Cobro al Cliente" (lo que le cobras al dueño o comprador). La diferencia es tu Ganancia.'
            },
            {
                title: 'Estados y Liquidación',
                body: 'Controla si la multa está Pendiente, Pagada o en proceso de Liquidación en el expediente correspondiente.'
            }
        ],
        tips: [
            'Es vital cruzar las infracciones impagas antes de liquidarle el dinero a un cliente que dejó su auto en consignación.'
        ],
        keywords: ['multas', 'fotomultas', 'deudas', 'patentes'],
        route: '/admin/infracciones',
        featureFlag: null,
        implementationStatus: 'partial',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'taller',
        category: 'operacion',
        order: 5,
        title: 'Taller',
        icon: 'Wrench',
        roles: ['Owner/Admin', 'Taller', 'Administrativo'],
        summary: 'Control de órdenes de trabajo, mantenimientos de stock y reparaciones a clientes.',
        steps: [
            {
                title: 'Nueva Orden de Trabajo (OT)',
                body: 'Indica si es para un Cliente Externo o para un Auto del Stock. Define si es ingreso inmediato o por turno.',
                actionLabel: 'Ir a Taller',
                actionRoute: '/admin/taller'
            },
            {
                title: 'Recepción y Fotos',
                body: 'Documenta el estado de recepción del vehículo (marcas, rayones, combustible) adjuntando fotos para evitar reclamos.'
            },
            {
                title: 'Presupuesto',
                body: 'Desglosa la Mano de Obra y los Repuestos. Asigna un Mecánico y un Proveedor. El sistema calculará el Costo interno y el Precio final.'
            },
            {
                title: 'Aprobación y Cobro',
                body: 'Envía el presupuesto por PDF o WhatsApp. Una vez aprobado por el cliente, procede a la reparación y posterior ingreso a la Caja Taller.'
            },
            {
                title: 'Tablero e Historial',
                body: 'La tabla principal te permite ver qué autos están en rampa. Al finalizar, agenda la fecha del Próximo Service.'
            }
        ],
        tips: [
            'Si el auto es del stock propio, imputa la OT para que el costo de reparación se sume al costo base del auto y reduzca la ganancia pura de forma realista.',
            'Un buen chequeo visual con fotos al recibir el auto te ahorrará discusiones sobre "rayones que antes no estaban".'
        ],
        keywords: ['mecanica', 'service', 'reparacion', 'ot', 'presupuesto', 'repuestos'],
        route: '/admin/taller',
        featureFlag: null,
        implementationStatus: 'implemented',
        version: '1.0',
        lastReviewed: '2026-07-02',
        reviewedBy: 'System'
    },
    {
        id: 'reclamos',
        category: 'operacion',
        order: 6,
        title: 'Reclamos',
        icon: 'MessageSquareWarning',
        roles: ['Owner/Admin', 'Administrativo', 'Recepción'],
        summary: 'Sistema de tickets para atención de garantías, quejas y consultas de clientes.',
        steps: [
            {
                title: 'Nuevo Reclamo y KPIs',
                body: 'Carga el ticket indicando el Tipo (Garantía, Documentación, etc.) y su Prioridad. Arriba verás los KPIs generales de la agencia.',
                actionLabel: 'Ir a Reclamos',
                actionRoute: '/admin/reclamos'
            },
            {
                title: 'Asignación',
                body: 'Un reclamo puede entrar sin dueño. Utiliza el botón "Tomar" para hacerte cargo o asígnalo a otro usuario responsable.'
            },
            {
                title: 'Seguimiento',
                body: 'Agrega comentarios internos, sube fotos/adjuntos y utiliza el botón "Pedir atención" si necesitas que un gerente intervenga.'
            },
            {
                title: 'Cierre y Reapertura',
                body: 'Cuando el problema se solucione, cambia el estado a Cierre. Si el cliente vuelve con la misma falla, usa la acción "Volver a abierto" (Reapertura).'
            }
        ],
        tips: [
            'Revisa diariamente si hay reclamos "estancados" (sin respuestas recientes) para evitar que una simple queja se transforme en una demanda.',
            'El contacto rápido calma las aguas. Usa el acceso directo de WhatsApp para informarle al cliente que ya estás evaluando su caso.'
        ],
        keywords: ['quejas', 'garantia', 'tickets', 'soporte', 'problemas'],
        route: '/admin/reclamos',
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
