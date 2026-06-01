'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { HelpCircle, Search, ShieldAlert, LayoutDashboard, CarFront, Users, UserPlus, CalendarClock, Receipt, Landmark, FileText, Star, Flag, BarChart3, Settings, Download, Activity, FileCheck } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';

export default function AyudaPage() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedModule, setExpandedModule] = useState(null);

    const helpModules = [
        {
            id: 'dashboard',
            title: 'Dashboard',
            icon: LayoutDashboard,
            roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Qué mirar al entrar:</strong> El panel principal resume las estadísticas vitales de la jornada.</p>
                    <p><strong>Cómo interpretar pendientes:</strong> Revisa siempre "Mis Pendientes" o tareas atrasadas para ponerte al día.</p>
                </div>
            )
        },
        {
            id: 'stock',
            title: 'Stock',
            icon: CarFront,
            roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Cómo cargar un vehículo:</strong> Ingresa la patente, marca, modelo, versión y fotos de alta calidad.</p>
                    <p><strong>Actualizar estado:</strong> Cambiar el estado a Reservado o Vendido automáticamente detiene las campañas de venta activa.</p>
                    <p><strong>Visible en Web:</strong> Si el switch está encendido, el vehículo aparece en el catálogo público y MercadoLibre.</p>
                    <p><strong>Regla vital:</strong> NUNCA publiques vehículos que ya estén señados, vendidos o en proceso de reserva final para evitar malos entendidos con nuevos prospectos.</p>
                </div>
            )
        },
        {
            id: 'clientes',
            title: 'Clientes',
            icon: Users,
            roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Cómo cargar:</strong> Todo cliente nuevo debe tener DNI, teléfono válido y correo.</p>
                    <p><strong>Historial:</strong> Utiliza el perfil del cliente para ver todo su recorrido (comunicaciones, ventas pasadas).</p>
                    <p><strong>Duplicados:</strong> Antes de crear, busca por DNI o teléfono.</p>
                </div>
            )
        },
        {
            id: 'leads',
            title: 'Leads',
            icon: UserPlus,
            roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Gestión:</strong> Atiende los leads en orden de prioridad. Las respuestas rápidas (menos de 5 min) incrementan la conversión un 300%.</p>
                    <p><strong>Asignar Responsable:</strong> Si un lead entra huérfano, asígnalo rápidamente a ti o a otro vendedor.</p>
                    <p><strong>Tareas de Seguimiento:</strong> Siempre debes dejar programada la "próxima acción" tras cada contacto.</p>
                    <p><strong>Estados:</strong>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-neutral-400">
                            <li><strong>Frío:</strong> Le interesa pero a futuro.</li>
                            <li><strong>Caliente:</strong> Listo para reservar en las próximas 72hs.</li>
                            <li><strong>Perdido:</strong> Dejó de responder o compró en otro lado.</li>
                            <li><strong>Convertido:</strong> Abonó reserva o venta confirmada.</li>
                        </ul>
                    </p>
                </div>
            )
        },
        {
            id: 'agenda',
            title: 'Agenda / Pendientes',
            icon: CalendarClock,
            roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Revisar Tareas:</strong> Tu agenda te muestra lo que debes hacer hoy.</p>
                    <p><strong>Vencidas:</strong> Jamás debes tener tareas en rojo (vencidas).</p>
                </div>
            )
        },
        {
            id: 'reservas',
            title: 'Reservas',
            icon: CalendarClock,
            roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Crear Reserva:</strong> Bloquea el stock de un vehículo al instante. Requiere vincular un Lead/Cliente.</p>
                    <p><strong>Convertir:</strong> Una vez aprobada, se pasa a Venta y genera el expediente formal.</p>
                    <p><strong>Cancelar:</strong> Libera el stock inmediatamente.</p>
                </div>
            )
        },
        {
            id: 'ventas',
            title: 'Ventas',
            icon: Receipt,
            roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Revisar Venta:</strong> Centraliza cliente, vehículo, cuotas, transferencias y firmas.</p>
                    <p><strong>Comunicaciones:</strong> Registra todo contacto relevante al expediente.</p>
                    <p className="text-red-400"><strong>Importante:</strong> El vendedor no debe modificar aspectos financieros de la venta una vez aprobada.</p>
                </div>
            )
        },
        {
            id: 'documentacion',
            title: 'Documentación',
            icon: FileCheck,
            roles: ['Owner/Admin', 'Administrativo', 'Solo lectura'],
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Checklist:</strong> Marca el avance de DNI, informes de dominio, Verificación Policial, F08 y más.</p>
                </div>
            )
        },
        {
            id: 'postventa',
            title: 'Postventa',
            icon: Star,
            roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Seguimiento 24hs:</strong> Consulta cómo sintió el vehículo en su primer día.</p>
                    <p><strong>Seguimiento 7 días:</strong> Momento ideal para pedir reseña en Google.</p>
                </div>
            )
        },
        {
            id: 'metas',
            title: 'Metas',
            icon: Flag,
            roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Cumplimiento:</strong> Se actualizan automáticamente según ventas cerradas.</p>
                    <p><strong>Privacidad:</strong> Los vendedores solo pueden ver sus propias metas asignadas.</p>
                </div>
            )
        },
        {
            id: 'productividad',
            title: 'Equipo / Productividad',
            icon: BarChart3,
            roles: ['Owner/Admin'],
            sensitive: true,
            permissionCheck: hasPermission(user, PERMISSIONS.PRODUCTIVIDAD_READ),
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>KPIs:</strong> Control de tasas de cierre y velocidad de respuesta de todo el equipo.</p>
                    <p className="text-red-400"><strong>Privacidad:</strong> Los vendedores no deben ver las estadísticas comparativas de otros vendedores.</p>
                </div>
            )
        },
        {
            id: 'cuotas',
            title: 'Cuotas / Cobranzas',
            icon: Landmark,
            roles: ['Owner/Admin', 'Administrativo'],
            sensitive: true,
            permissionCheck: hasPermission(user, PERMISSIONS.CUOTAS_READ),
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Gestión:</strong> Control de fechas de vencimiento, moras e intereses.</p>
                    <p className="text-red-400"><strong>Prohibido:</strong> Nunca modificar montos sin autorización formal de gerencia.</p>
                </div>
            )
        },
        {
            id: 'calidad',
            title: 'Calidad de Datos',
            icon: ShieldAlert,
            roles: ['Owner/Admin', 'Administrativo'],
            sensitive: true,
            permissionCheck: hasPermission(user, PERMISSIONS.DATAQUALITY_READ),
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Inconsistencias:</strong> El panel detecta problemas como leads huérfanos o ventas sin cerrar.</p>
                    <p><strong>Resolución:</strong> La corrección siempre es manual haciendo clic en el enlace, el sistema nunca borra ni fusiona datos por su cuenta para preservar auditoría.</p>
                </div>
            )
        },
        {
            id: 'configuracion',
            title: 'Configuración',
            icon: Settings,
            roles: ['Owner/Admin'],
            sensitive: true,
            permissionCheck: hasPermission(user, PERMISSIONS.SETTINGS_READ),
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Usuarios y Permisos:</strong> Gestión estricta de quién accede a qué.</p>
                    <p><strong>Plantillas:</strong> Textos predefinidos para uso operativo del equipo (solo admins pueden editarlas globalmente).</p>
                    <p><strong>Config General:</strong> Reglas operativas como la tolerancia en días para "Leads Fríos".</p>
                </div>
            )
        },
        {
            id: 'exportaciones',
            title: 'Exportaciones',
            icon: Download,
            roles: ['Owner/Admin', 'Administrativo'],
            sensitive: true,
            permissionCheck: hasPermission(user, PERMISSIONS.EXPORTS_READ),
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Función:</strong> Generar respaldos CSV de módulos clave.</p>
                    <p className="text-red-400"><strong>Seguridad:</strong> No se exportan contraseñas, tokens, caja ni datos financieros ocultos para proteger la información comercial y privada.</p>
                </div>
            )
        },
        {
            id: 'sistema',
            title: 'Salud del Sistema',
            icon: Activity,
            roles: ['Owner/Admin'],
            sensitive: true,
            permissionCheck: hasPermission(user, PERMISSIONS.SYSTEMHEALTH_READ),
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Monitoreo:</strong> Verifica latencia de base de datos y alertas de desconexión.</p>
                    <p><strong>Alertas críticas:</strong> Si MongoDB figura Offline, contactar a soporte técnico inmediatamente.</p>
                </div>
            )
        },
        {
            id: 'auditoria',
            title: 'Auditoría',
            icon: FileText,
            roles: ['Owner/Admin'],
            sensitive: true,
            permissionCheck: hasPermission(user, PERMISSIONS.AUDITORIA_READ),
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Registro:</strong> Toda creación, edición y borrado queda grabada con fecha y autor.</p>
                    <p><strong>Objetivo:</strong> Trazabilidad absoluta de la operatoria para detectar posibles fraudes o errores humanos.</p>
                </div>
            )
        },
        {
            id: 'seguridad',
            title: 'Seguridad y Roles',
            icon: ShieldAlert,
            roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Solo lectura'],
            content: (
                <div className="space-y-4 text-sm text-neutral-300">
                    <p><strong>Owner/Admin:</strong> Control total, visión irrestricta de márgenes y auditoría.</p>
                    <p><strong>Administrativo:</strong> Acceso a operatoria y documentación, sin acceso a márgenes (salvo permiso expreso).</p>
                    <p><strong>Ventas:</strong> Solo ve operaciones asignadas a sí mismo. No ve auditoría, configuración ni finanzas.</p>
                    <p><strong>Solo lectura:</strong> No puede crear, editar ni borrar absolutamente nada.</p>
                </div>
            )
        }
    ];

    const filteredModules = useMemo(() => {
        return helpModules.filter(mod => {
            // Check permissions for sensitive modules
            if (mod.sensitive && !mod.permissionCheck) return false;
            
            // Search text
            if (searchTerm) {
                const lower = searchTerm.toLowerCase();
                return mod.title.toLowerCase().includes(lower) || 
                       mod.roles.join(',').toLowerCase().includes(lower);
            }
            return true;
        });
    }, [searchTerm, helpModules]);

    return (
        <PermissionGuard permission={PERMISSIONS.HELP_READ}>
            <div className="max-w-4xl mx-auto p-6 pb-20 text-white">
                <div className="mb-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
                        <HelpCircle size={32} className="text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Centro de Ayuda del CRM</h1>
                        <p className="text-neutral-400 mt-2">
                            Manual operativo y buenas prácticas para el equipo de AutoSporting.
                        </p>
                    </div>
                </div>

                <div className="relative mb-10 max-w-xl mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por módulo o tema..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#1E1E24] border border-[#33333A] rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder-[#A1A1AA] focus:outline-none focus:border-[#EF3329] transition-colors"
                    />
                </div>

                <div className="space-y-4">
                    {filteredModules.map((mod) => {
                        const Icon = mod.icon;
                        const isExpanded = expandedModule === mod.id;

                        return (
                            <div key={mod.id} className="bg-[#1E1E24] border border-[#33333A] rounded-2xl overflow-hidden transition-all duration-200">
                                <button 
                                    onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                                    className="w-full flex items-center justify-between p-5 hover:bg-[#28282E] transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-[#161619] flex items-center justify-center text-[#A1A1AA] border border-[#33333A]">
                                            <Icon size={20} />
                                        </div>
                                        <div className="text-left">
                                            <h2 className="text-lg font-bold text-white">{mod.title}</h2>
                                            <div className="flex gap-2 mt-1 flex-wrap">
                                                {mod.roles.map(role => (
                                                    <span key={role} className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#161619] text-[#A1A1AA] border border-[#33333A]">
                                                        {role}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-neutral-500">
                                        <svg className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </button>
                                
                                {isExpanded && (
                                    <div className="px-5 pb-5 pt-2 border-t border-[#33333A]">
                                        <div className="pl-14">
                                            {mod.content}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filteredModules.length === 0 && (
                        <div className="text-center py-12 text-neutral-500">
                            <HelpCircle size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No se encontraron temas de ayuda que coincidan con tu búsqueda.</p>
                        </div>
                    )}
                </div>
            </div>
        </PermissionGuard>
    );
}
