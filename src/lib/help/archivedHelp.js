import { 
    Users, BarChart3, Target, Activity, Download, FileCheck, ShieldAlert, FileText, LayoutDashboard, Settings
} from 'lucide-react';

export const archivedHelp = [
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
];
