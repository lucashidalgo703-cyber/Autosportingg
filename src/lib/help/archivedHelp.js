export const archivedHelp = [
    {
        id: 'leads',
        category: 'comercial',
        title: 'Leads',
        icon: 'UserPlus',
        roles: ['Owner/Admin', 'Ventas'],
        summary: 'Administración de prospectos que todavía no son clientes.',
        steps: [
            { title: 'Atención rápida', body: 'Revisá la bandeja de leads entrantes. Contestá rápido para no perder al interesado.' },
            { title: 'Asignación manual', body: 'Si un lead no tiene vendedor, el Admin puede asignártelo desde la grilla.' },
            { title: 'Conversión', body: 'Si el lead avanza en la negociación, usá el botón para convertirlo en Cliente oficial del CRM.' }
        ],
        tips: [
            'Los leads "fríos" que no contestan pueden ser archivados para limpiar tu pantalla.'
        ],
        keywords: ['prospectos', 'interesados', 'embudo'],
        route: '/admin/leads'
    },
    {
        id: 'calidad-datos',
        category: 'administracion',
        title: 'Calidad de Datos',
        icon: 'FileCheck',
        roles: ['Owner/Admin'],
        summary: 'Módulo para buscar errores y clientes duplicados en la base de datos.',
        steps: [
            { title: 'Escaneo', body: 'El sistema busca teléfonos idénticos o DNIs repetidos entre diferentes clientes.' },
            { title: 'Fusión', body: 'Al encontrar un duplicado, podés fusionarlos para no perder el historial de ninguno.' },
            { title: 'Limpieza', body: 'Buscá contactos sin nombre ni medio de contacto y eliminalos en lote.' }
        ],
        tips: [
            'Realizá una limpieza mensual para que los vendedores no se pisen entre ellos llamando a la misma persona.'
        ],
        keywords: ['duplicados', 'limpieza', 'base de datos'],
        route: '/admin/calidad-datos'
    },
    {
        id: 'metas',
        category: 'administracion',
        title: 'Metas',
        icon: 'Target',
        roles: ['Owner/Admin', 'Ventas'],
        summary: 'Fijá y controlá los objetivos mensuales de la agencia.',
        steps: [
            { title: 'Crear meta', body: 'Asignale a un vendedor cuántos autos tiene que vender o cuántos leads debe contactar este mes.' },
            { title: 'Seguimiento automático', body: 'A medida que el vendedor cierra operaciones en el sistema, la barra de progreso se llena sola.' }
        ],
        tips: [
            'Fijar un objetivo alto pero alcanzable (ej. 5 autos) motiva más que un número imposible.'
        ],
        keywords: ['objetivos', 'kpi', 'resultados'],
        route: '/admin/metas'
    },
    {
        id: 'productividad',
        category: 'administracion',
        title: 'Productividad',
        icon: 'Activity',
        roles: ['Owner/Admin'],
        summary: 'Métricas de rendimiento comparativo del equipo comercial.',
        steps: [
            { title: 'Tasas de cierre', body: 'Revisá qué porcentaje de los leads que recibe cada vendedor terminan en ventas reales.' },
            { title: 'Tiempos de respuesta', body: 'Controlá quién tarda menos en contestar el primer mensaje de WhatsApp.' }
        ],
        tips: [
            'Usá estos datos para decidir a qué vendedor le asignás los mejores clientes (los que entran por la web principal).'
        ],
        keywords: ['rendimiento', 'equipo', 'vendedores', 'metricas'],
        route: '/admin/productividad'
    },
    {
        id: 'reservas',
        category: 'comercial',
        title: 'Reservas',
        icon: 'Bookmark',
        roles: ['Owner/Admin', 'Ventas'],
        summary: 'Panel histórico y actual de señas y reservas de vehículos.',
        steps: [
            { title: 'Lista de reservas', body: 'Ve todos los autos que están señados y a punto de vencerse.' },
            { title: 'Vencimientos', body: 'Si la fecha límite se cumple y el cliente no pagó el resto, podés liberar el auto haciendo clic en el botón.' }
        ],
        tips: [
            'Nunca devuelvas una seña sin la aprobación directa del dueño de la agencia.'
        ],
        keywords: ['señas', 'apartados', 'vehiculos bloqueados'],
        route: '/admin/reservas'
    },
    {
        id: 'equipo',
        category: 'administracion',
        title: 'Equipo',
        icon: 'Users',
        roles: ['Owner/Admin'],
        summary: 'Directorio ampliado y perfiles del personal de la agencia.',
        steps: [
            { title: 'Ficha del empleado', body: 'Revisá los datos personales, la fecha de ingreso y el legajo de cada miembro.' },
            { title: 'Organigrama', body: 'Definí quién reporta a quién (ej. Vendedores al Gerente de Ventas).' }
        ],
        tips: [
            'Tené a mano el CBU de todos acá para acelerar el pago de las comisiones.'
        ],
        keywords: ['rrhh', 'recursos humanos', 'personal'],
        route: '/admin/equipo'
    },
    {
        id: 'notificaciones-admin',
        category: 'administracion',
        title: 'Gestor de Notificaciones',
        icon: 'BellRing',
        roles: ['Owner/Admin'],
        summary: 'Configurá qué alertas automáticas le llegan a cada rol.',
        steps: [
            { title: 'Reglas de envío', body: 'Decidí si el vendedor recibe un email cada vez que se le asigna un lead.' },
            { title: 'Alertas de cobranza', body: 'Activá el aviso de "Cuota por vencer" para que la administración lo vea 3 días antes.' }
        ],
        tips: [
            'No actives demasiadas alertas por mail, o el equipo va a empezar a ignorarlas.'
        ],
        keywords: ['alertas', 'avisos del sistema', 'reglas'],
        route: '/admin/notificaciones'
    }
];
