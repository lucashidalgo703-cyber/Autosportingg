const fs = require('fs');

const map = JSON.parse(fs.readFileSync('c:/Users/Tomas/.antigravity-ide/Autosportingg-main/scratch/chapters_map.json', 'utf8'));

// Expected exact 40 chapters
const newOrder = [
    // PRIMEROS PASOS
    { id: 'acceso', category: 'primeros-pasos', title: 'Ingresar al CRM', originalTitle: 'Ingresar al CRM' },
    { id: 'navegacion', category: 'primeros-pasos', title: 'Cómo moverte por el sistema', originalTitle: 'Cómo moverse por el sistema' },
    { id: 'seguridad', category: 'primeros-pasos', title: 'Roles y permisos', originalTitle: 'Roles y permisos' },
    { id: 'mobile', category: 'primeros-pasos', title: 'Usar el CRM en el celular', originalTitle: 'Uso en el celular' },

    // EL DÍA A DÍA
    { id: 'dashboard', category: 'dia-a-dia', title: 'Dashboard', originalTitle: 'Dashboard' },
    { id: 'calendario', category: 'dia-a-dia', title: 'Calendario', originalTitle: 'Calendario y Tareas' },
    { id: 'alertas', category: 'dia-a-dia', title: 'Alertas — Centro de notificaciones', originalTitle: 'Alertas' },
    { id: 'mi-espacio', category: 'dia-a-dia', title: 'Mi Espacio', originalTitle: 'Mi Espacio' },

    // COMERCIAL
    { id: 'stock', category: 'comercial', title: 'Stock — Vehículos', originalTitle: 'Stock de Vehículos' },
    { id: 'clientes', category: 'comercial', title: 'Clientes', originalTitle: 'Gestión de Clientes' },
    { id: 'cotizaciones', category: 'comercial', title: 'Cotizaciones', originalTitle: 'Cotizaciones' },
    { id: 'ventas', category: 'comercial', title: 'Ventas', originalTitle: 'Ventas' },
    { id: 'mis-ventas', category: 'comercial', title: 'Mis ventas', originalTitle: 'Mis Ventas' },
    { id: 'pedidos-busqueda', category: 'comercial', title: 'Pedidos (búsquedas de clientes)', originalTitle: 'Pedidos (Búsquedas)' }, // We need to duplicate or adapt 'pedidos' if missing
    { id: 'oportunidades', category: 'comercial', title: 'Oportunidades', originalTitle: 'Oportunidades' },
    { id: 'postventa', category: 'comercial', title: 'Postventa', originalTitle: 'Postventa' },
    { id: 'dormidos', category: 'comercial', title: 'Clientes Dormidos', originalTitle: 'Clientes Dormidos' },

    // OPERACIÓN Y TRÁMITES
    { id: 'pedidos', category: 'operacion', title: 'Pedidos', originalTitle: 'Pedidos' },
    { id: 'expedientes', category: 'operacion', title: 'Expedientes', originalTitle: 'Expedientes' },
    { id: 'gestoria', category: 'operacion', title: 'Gestoría — Trámites de transferencia', originalTitle: 'Gestoría' },
    { id: 'consignaciones', category: 'operacion', title: 'Consignaciones', originalTitle: 'Consignaciones' },
    { id: 'infracciones', category: 'operacion', title: 'Infracciones', originalTitle: 'Infracciones' },
    { id: 'taller', category: 'operacion', title: 'Taller', originalTitle: 'Taller' },
    { id: 'reclamos', category: 'operacion', title: 'Reclamos', originalTitle: 'Reclamos' },

    // FINANZAS Y COBROS
    { id: 'finanzas', category: 'finanzas', title: 'Finanzas — Administración financiera', originalTitle: 'Finanzas' },
    { id: 'tesoreria', category: 'finanzas', title: 'Tesorería', originalTitle: 'Tesorería' },
    { id: 'liquidaciones', category: 'finanzas', title: 'Liquidaciones', originalTitle: 'Liquidaciones' },
    { id: 'cuotas', category: 'finanzas', title: 'Cobros', originalTitle: 'Cobros y Cuotas' },
    { id: 'autorizaciones', category: 'finanzas', title: 'Autorizaciones', originalTitle: 'Autorizaciones' },
    { id: 'reportes', category: 'finanzas', title: 'Reportes', originalTitle: 'Reportes y Métricas' },
    { id: 'comisiones', category: 'finanzas', title: 'Mis Comisiones', originalTitle: 'Mis Comisiones' },

    // COMUNICACIÓN
    { id: 'mensajes', category: 'comunicacion', title: 'Mensajes', originalTitle: 'Mensajes Internos' },
    { id: 'whatsapp', category: 'comunicacion', title: 'WhatsApp y Conversaciones', originalTitle: 'WhatsApp y Conversaciones' },
    { id: 'nps', category: 'comunicacion', title: 'NPS — Satisfacción del cliente', originalTitle: 'NPS (Satisfacción)' },
    { id: 'sugerencias', category: 'comunicacion', title: 'Sugerencias', originalTitle: 'Sugerencias' },
    { id: 'correo', category: 'comunicacion', title: 'Mi Correo', originalTitle: 'Correo Integrado' },
    { id: 'conversaciones', category: 'comunicacion', title: 'Conversaciones', originalTitle: 'Conversaciones' }, // Need to duplicate or use if exists
    { id: 'telefonos', category: 'comunicacion', title: 'Teléfonos útiles', originalTitle: 'Teléfonos Útiles' },

    // ADMINISTRACIÓN
    { id: 'configuracion', category: 'administracion', title: 'Configuración', originalTitle: 'Configuración y Seguridad' },
    { id: 'papelera', category: 'administracion', title: 'Papelera', originalTitle: 'Papelera de Reciclaje' }
];

const archiveList = [
    'leads', 
    'calidad-datos', 
    'metas', 
    'equipo', 
    'auditoria', 
    'exportaciones', 
    'salud-sistema' // Or whatever id they used
];

let generatedRegistry = '';
let generatedArchive = '';

let i = 1;
for (const config of newOrder) {
    let original = null;
    
    // Find matching by id
    if (map[config.id]) {
        original = map[config.id].code;
    } else {
        // Fallbacks for id mismatches
        let matchedId = Object.keys(map).find(k => k === config.id || map[k].title.includes(config.originalTitle));
        if (matchedId) {
            original = map[matchedId].code;
        } else {
            console.log("NOT FOUND:", config.id);
            // We need to clone a base object if it doesn't exist
            original = map['pedidos'].code; // fallback clone
        }
    }

    // Now update id, category, order, title
    let updated = original.replace(/id:\s*['"`].*?['"`],/, `id: '${config.id}',`);
    updated = updated.replace(/category:\s*['"`].*?['"`],/, `category: '${config.category}',`);
    updated = updated.replace(/order:\s*\d+,/, `order: ${i},`);
    updated = updated.replace(/title:\s*['"`].*?['"`],/, `title: '${config.title}',`);
    
    generatedRegistry += `    ${updated},\n`;
    i++;
}

// Archive
for (const k of Object.keys(map)) {
    let title = map[k].title.toLowerCase();
    if (
        k === 'leads' ||
        k === 'calidad-datos' ||
        k === 'metas' ||
        k === 'equipo' || k === 'productividad' || 
        k === 'auditoria' ||
        k === 'exportaciones' ||
        k === 'sistema' || k.includes('salud')
    ) {
        generatedArchive += `    ${map[k].code},\n`;
    }
}

// Check how many we found
console.log("Registered items:", i - 1);

const registryHeader = `import { 
    LayoutDashboard, CarFront, Users, UserPlus, CalendarClock, 
    Receipt, Landmark, FileText, Star, Flag, BarChart3, 
    Settings, Download, Activity, FileCheck, ShieldAlert,
    LogIn, Compass, Smartphone, Calendar, Bell, User,
    Target, MessageCircle, Moon, FolderOpen, FileSignature, Handshake, AlertOctagon, Wrench, MessageSquareWarning,
    Wallet, Vault, Calculator, ShieldCheck, PieChart, DollarSign,
    MessageSquare, StarHalf, Lightbulb, Mail, Phone, Trash2
} from 'lucide-react';

export const helpRegistry = [
`;

const archiveHeader = `import { 
    Users, BarChart3, Target, Activity, Download, FileCheck, ShieldAlert, FileText, LayoutDashboard, Settings
} from 'lucide-react';

export const archivedHelp = [
`;

fs.writeFileSync('c:/Users/Tomas/.antigravity-ide/Autosportingg-main/src/lib/help/helpRegistry.js', registryHeader + generatedRegistry + '];\n');
fs.writeFileSync('c:/Users/Tomas/.antigravity-ide/Autosportingg-main/src/lib/help/archivedHelp.js', archiveHeader + generatedArchive + '];\n');
