# Matriz de Funcionalidades del Manual - AutoSporting

| Categoría | Capítulo | Ruta | Componente principal | Servicios/API | Roles permitidos | Estado | Feature flag | Acciones visibles | Formularios relacionados | Diferencias frente a la referencia | Decisión documental |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OTROS | Agenda | /admin/agenda | AdminAgendaPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| DÍA A DÍA | Alertas | /admin/alertas | AdminAlertasPage | - | Todos | partial | - | Ver, Editar | - | - | Documentar |
| ADMINISTRACIÓN | Auditoria | /admin/auditoria | AuditPage | /api/admin/audit-logs | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| FINANZAS | Autorizaciones | /admin/autorizaciones | AutorizacionesPage | /api/admin/approvals`, {
                headers: { , /api/admin/approvals/ | Todos | partial | - | Ver, Editar | - | - | Documentar |
| SISTEMA | Ayuda | /admin/ayuda | AyudaPage | - | Todos | partial | - | Ver, Editar | - | - | Documentar |
| OTROS | Calidad datos | /admin/calidad-datos | DataQualityPage | /api/admin/data-quality | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMERCIAL | Clientes | /admin/clientes | AdminClientesPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMERCIAL | Clientes | /admin/clientes/[id] | AdminClientDetailPage | /api/admin/communication-logs | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| ADMINISTRACIÓN | Configuracion | /admin/configuracion/2fa | TwoFactorConfigPage | /api/admin/2fa/status, /api/admin/2fa/generate, /api/admin/2fa/verify, /api/admin/2fa/disable | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| ADMINISTRACIÓN | Configuracion | /admin/configuracion/asistente | AsistenteConfigPage | /api/admin/settings | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| ADMINISTRACIÓN | Configuracion | /admin/configuracion/backups | BackupsConfigPage | /api/admin/backups/export | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| ADMINISTRACIÓN | Configuracion | /admin/configuracion/funciones | FuncionesConfigPage | /api/admin/settings, /api/admin/settings/features | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| ADMINISTRACIÓN | Configuracion | /admin/configuracion/general | GeneralSettingsPage | /api/admin/settings | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| ADMINISTRACIÓN | Configuracion | /admin/configuracion | ConfiguracionRedirect | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| ADMINISTRACIÓN | Configuracion | /admin/configuracion/plantillas | PlantillasPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| ADMINISTRACIÓN | Configuracion | /admin/configuracion/resumen-diario | ResumenDiarioConfigPage | /api/admin/settings, /api/admin/settings/daily-summary | Todos | partial | - | Ver, Editar | - | - | Documentar |
| ADMINISTRACIÓN | Configuracion | /admin/configuracion/usuarios | UsuariosConfigPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| OPERACIÓN | Consignaciones | /admin/consignaciones | ConsignacionesPage | /api/admin/cars/, /api/cars | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMUNICACIÓN | Correos | /admin/correos | CorreosPage | /api/admin/email/oauth-config, /api/admin/clients, /api/admin/emails/send | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMERCIAL | Cotizaciones | /admin/cotizaciones | AdminCotizacionesPage | /api/admin/quotes, /api/admin/users/active, /api/admin/quotes/migrate-drafts | Todos | partial | - | Ver, Editar | - | - | Documentar |
| COMERCIAL | Cotizaciones | /admin/cotizaciones/[id] | QuoteDetailPage | /api/admin/clients, /api/admin/cars, /api/admin/users, /api/admin/quotes/, /api/admin/quotes | Todos | partial | - | Ver, Editar | - | - | Documentar |
| FINANZAS | Cuotas | /admin/cuotas | CuotasRedirectPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| OTROS | Documentacion | /admin/documentacion | DocumentacionPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMERCIAL | Dormidos | /admin/dormidos | DormidosPage | /api/admin/dormidos, /api/admin/crm-tasks, /api/admin/users/active | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| ADMINISTRACIÓN | Equipo | /admin/equipo | TeamDashboardPage | /api/admin/team-dashboard | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| ADMINISTRACIÓN | Equipo | /admin/equipo/[userId] | UserDetailDashboardPage | /api/admin/team-dashboard/ | Todos | partial | - | Ver, Editar | - | - | Documentar |
| OPERACIÓN | Expedientes | /admin/expedientes | ExpedientesPage | - | Todos | partial | - | Ver, Editar | - | - | Documentar |
| OTROS | Exportaciones | /admin/exportaciones | ExportacionesPage | /api/admin/exports, /api/admin/exports/ | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| FINANZAS | Finanzas | /admin/finanzas |  | /api/admin/finance/deposits | Todos | partial | - | Ver, Editar | - | - | Documentar |
| OPERACIÓN | Gestoria | /admin/gestoria | GestoriaPage | /api/admin/clients | Todos | partial | - | Ver, Editar | - | - | Documentar |
| OPERACIÓN | Infracciones | /admin/infracciones | InfraccionesPage | - | Todos | partial | - | Ver, Editar | - | - | Documentar |
| COMUNICACIÓN | Leads | /admin/leads | AdminLeadsPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMUNICACIÓN | Leads | /admin/leads/[id] | AdminLeadDetailPage | /api/admin/communication-logs | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| FINANZAS | Liquidaciones | /admin/liquidaciones | LiquidacionesPage | /api/admin/settlements, /api/admin/settlements/sync-gestoria, /api/admin/settlements/, /api/admin/settlements/clean-duplicates/preview, /api/admin/settlements/clean-duplicates/confirm, /api/admin/tesoreria/dashboard | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMUNICACIÓN | Mensajes | /admin/mensajes | MensajesPage | /api/admin/messages/conversations, /api/admin/messages/conversations/, /api/admin/usuarios | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| OTROS | Metas | /admin/metas | GoalsDashboardPage | /api/admin/team-goals/progress`, {
                headers: {  | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| DÍA A DÍA | Mi espacio | /admin/mi-espacio | MiEspacioPage | - | Todos | partial | - | Ver, Editar | - | - | Documentar |
| FINANZAS | Mis comisiones | /admin/mis-comisiones | MisComisionesPage | /api/admin/my-commissions, /api/admin/settlements/pending-sales/, /api/admin/finance/seller-commissions/manual | Todos | partial | - | Ver, Editar | - | - | Documentar |
| OTROS | Mis pendientes | /admin/mis-pendientes | MisPendientesPage | /api/admin/crm-tasks, /api/leads, /api/admin/sales, /api/admin/reservations, /api/admin/team-goals/progress | Todos | partial | - | Ver, Editar | - | - | Documentar |
| COMERCIAL | Mis ventas | /admin/mis-ventas | MisVentasPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| OTROS | Notificaciones | /admin/notificaciones | NotificationsPage | /api/admin/notifications, /api/admin/notifications/, /api/admin/notifications/read-all`, {
                method:  | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMUNICACIÓN | Nps | /admin/nps | NpsDashboardPage | /api/admin/nps/dashboard, /api/admin/users, /api/admin/nps/follow-up/, /api/admin/clients, /api/admin/nps/generate, /api/admin/nps/manual | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMERCIAL | Oportunidades | /admin/oportunidades | OportunidadesPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| OTROS | Dashboard | /admin | AdminDashboardPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| ADMINISTRACIÓN | Papelera | /admin/papelera | PapeleraPage | /api/admin/trash`, {
                headers: { , /api/admin/trash/restore/, /api/admin/trash/ | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMERCIAL | Pedidos | /admin/pedidos | PedidosPage | - | Todos | partial | - | Ver, Editar | - | - | Documentar |
| COMERCIAL | Postventa | /admin/postventa | PostventaPage | /api/admin/users | Todos | partial | - | Ver, Editar | - | - | Documentar |
| OTROS | Productividad | /admin/productividad | ProductivityDashboardPage | /api/admin/team-productivity | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| OPERACIÓN | Reclamos | /admin/reclamos | ReclamosPage | /api/admin/reclamos`, {
                headers: { , /api/admin/users, /api/admin/clients, /api/admin/reclamos`, {
                method: , /api/admin/reclamos/ | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| FINANZAS | Reportes | /admin/reportes/imprimir | PrintableReportPage | /api/admin/audit-logs/client-event | Todos | partial | - | Ver, Editar | - | - | Documentar |
| FINANZAS | Reportes | /admin/reportes | ReportesPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| OTROS | Reservas | /admin/reservas | ReservasPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| OTROS | Sistema | /admin/sistema | SystemHealthPage | /api/admin/system-health | Todos | partial | - | Ver, Editar | - | - | Documentar |
| COMERCIAL | Stock | /admin/stock | AdminStockPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMERCIAL | Stock | /admin/stock/[id] | VehicleDetailPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMUNICACIÓN | Sugerencias | /admin/sugerencias | SugerenciasPage | /api/admin/suggestions`, {
                headers: { , /api/admin/suggestions`, {
                method: , /api/admin/suggestions/ | Todos | partial | - | Ver, Editar | - | - | Documentar |
| OPERACIÓN | Taller | /admin/taller | WorkshopPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMUNICACIÓN | Telefonos | /admin/telefonos | TelefonosPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| OTROS | Telefonos utiles | /admin/telefonos-utiles | TelefonosUtilesAlias | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| FINANZAS | Tesoreria | /admin/tesoreria | TesoreriaPage | /api/admin/tesoreria/dashboard, /api/admin/tesoreria/transfer, /api/admin/tesoreria/arqueo | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMERCIAL | Ventas | /admin/ventas | VentasPage | - | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMERCIAL | Ventas | /admin/ventas/[id] | SaleDetailPage | /api/admin/communication-logs, /api/admin/sales/ | Todos | implemented | - | Ver, Editar | - | - | Documentar |
| COMUNICACIÓN | Whatsapp | /admin/whatsapp | WhatsAppPage | /api/admin/clients, /api/admin/leads, /api/admin/whatsapp/config, /api/admin/whatsapp/templates, /api/admin/arturito/status, /api/admin/whatsapp/inbox, /api/admin/whatsapp/send, /api/admin/arturito/suggest-reply, /api/admin/whatsapp/associate | Todos | implemented | - | Ver, Editar | - | - | Documentar |


### Funciones Exclusivas de Sote (A verificar/No documentar)
- WATI (AutoSporting tiene su propia integracion de WhatsApp)
- Red multiagencia (AutoSporting es mono-agencia actualmente)
- Porcentajes de comision estaticos (AutoSporting usa Liquidaciones/SLA)
- Arturito (AutoSporting tiene endpoints de sugerencias de IA, pero la interfaz puede diferir)

