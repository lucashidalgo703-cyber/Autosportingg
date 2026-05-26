# PROMPT TECNICO FINAL PARA ANTIGRAVITY - CRM AUTOSPORTING

```text
Actua como arquitecto senior full-stack, disenador UX/UI y desarrollador de producto dentro de mi proyecto existente de AutoSporting. Tu tarea es construir un CRM privado, original y operativo para mi agencia de autos en Argentina, integrado en mi pagina web actual.

CONTEXTO Y LIMITES

- Agencia: AutoSporting.
- Mercado: Argentina.
- El CRM debe operar stock, capital, clientes/leads, cotizaciones, ventas, senas, reservas, permutas, consignaciones, financiacion interna, cuotas, gastos, comisiones, documentacion, tareas, entregas, postventa, reportes, usuarios y auditoria.
- Existe un CRM de referencia que fue auditado visual y funcionalmente. Usa solamente patrones de experiencia descritos en este prompt; no copies codigo, marca, textos, logos, datos, assets ni integraciones privadas del sistema de referencia.
- La marca, contenidos, logo, colores finales y lenguaje del producto deben ser AutoSporting.
- No ingreses datos personales reales para desarrollar. Usa datos demo anonimos.
- No implementes contrasenas en texto plano bajo ninguna circunstancia, ni siquiera durante migraciones.

MODO DE TRABAJO OBLIGATORIO

1. Antes de escribir codigo, inspecciona el proyecto existente y determina:
   - framework/frontend actual;
   - router y estructura de paginas;
   - sistema de estilos y componentes ya existentes;
   - autenticacion/backend/base de datos actuales;
   - estructura de navegacion publica y branding AutoSporting disponible.
2. Conserva la web publica actual funcionando. El CRM debe integrarse como area privada bajo `/crm`.
3. Reutiliza componentes, router, estilos, librerias y backend ya existentes cuando sean adecuados.
4. Si el proyecto no tiene backend transaccional, autenticacion ni storage aptos para un CRM, implementa Supabase con PostgreSQL, Auth, Storage privado y Row Level Security (RLS).
5. Si ya existe un backend equivalente, mapea estas entidades a la tecnologia actual sin duplicar autenticacion ni crear dos fuentes de verdad.
6. Antes de cada etapa, informa los archivos concretos que modificaras segun la estructura real encontrada.
7. Construye por etapas funcionales verificables. No intentes resolver todo con pantallas estaticas ni datos hardcodeados.

OBJETIVO DE RESULTADO

Entregar un CRM de AutoSporting visualmente coherente, responsive y listo para evolucionar a produccion, con:

- area autenticada `/crm`;
- panel ejecutivo con capital y alertas;
- flujo comercial completo desde lead hasta entrega/postventa;
- finanzas conciliables en ARS y USD;
- permisos, documentos privados y auditoria;
- componentes reutilizables integrados al sitio actual.

============================================================
1. ARCHIVOS A CREAR O MODIFICAR
============================================================

Primero detecta la estructura real del repositorio. Usa los paths equivalentes del framework encontrado. No reemplaces archivos publicos existentes innecesariamente.

SI EL PROYECTO USA REACT/VITE O ESTRUCTURA `src/`, CREA:

- `src/features/crm/index.ts`
- `src/features/crm/routes.tsx`
- `src/features/crm/types.ts`
- `src/features/crm/constants.ts`
- `src/features/crm/lib/currency.ts`
- `src/features/crm/lib/dates.ts`
- `src/features/crm/lib/permissions.ts`
- `src/features/crm/lib/businessRules.ts`
- `src/features/crm/lib/validators.ts`
- `src/features/crm/services/crmRepository.ts`
- `src/features/crm/services/storageService.ts`
- `src/features/crm/services/auditService.ts`
- `src/features/crm/hooks/usePermissions.ts`
- `src/features/crm/hooks/useCrmFilters.ts`
- `src/features/crm/styles/crm-tokens.css`
- `src/features/crm/styles/crm-layout.css`

- `src/features/crm/components/layout/CrmShell.tsx`
- `src/features/crm/components/layout/CrmSidebar.tsx`
- `src/features/crm/components/layout/CrmTopbar.tsx`
- `src/features/crm/components/layout/CrmMobileNav.tsx`
- `src/features/crm/components/layout/QuickActionsButton.tsx`
- `src/features/crm/components/layout/AmountPrivacyToggle.tsx`

- `src/features/crm/components/ui/KpiCard.tsx`
- `src/features/crm/components/ui/StatusBadge.tsx`
- `src/features/crm/components/ui/FilterBar.tsx`
- `src/features/crm/components/ui/DataTable.tsx`
- `src/features/crm/components/ui/EmptyState.tsx`
- `src/features/crm/components/ui/ModalForm.tsx`
- `src/features/crm/components/ui/MoneyField.tsx`
- `src/features/crm/components/ui/DateField.tsx`
- `src/features/crm/components/ui/DocumentUploader.tsx`
- `src/features/crm/components/ui/Timeline.tsx`
- `src/features/crm/components/ui/Checklist.tsx`
- `src/features/crm/components/ui/AlertPanel.tsx`
- `src/features/crm/components/ui/ConfirmDialog.tsx`

- `src/features/crm/pages/auth/CrmLoginPage.tsx`
- `src/features/crm/pages/auth/CrmRecoverPasswordPage.tsx`
- `src/features/crm/pages/DashboardPage.tsx`
- `src/features/crm/pages/StockPage.tsx`
- `src/features/crm/pages/VehicleDetailPage.tsx`
- `src/features/crm/pages/CustomersPage.tsx`
- `src/features/crm/pages/CustomerDetailPage.tsx`
- `src/features/crm/pages/QuotesPage.tsx`
- `src/features/crm/pages/SalesPage.tsx`
- `src/features/crm/pages/SaleDetailPage.tsx`
- `src/features/crm/pages/RequestsPage.tsx`
- `src/features/crm/pages/ConsignmentsPage.tsx`
- `src/features/crm/pages/DocumentationPage.tsx`
- `src/features/crm/pages/DeliveriesPage.tsx`
- `src/features/crm/pages/CalendarPage.tsx`
- `src/features/crm/pages/AlertsPage.tsx`
- `src/features/crm/pages/FinancePage.tsx`
- `src/features/crm/pages/ReportsPage.tsx`
- `src/features/crm/pages/PostSalePage.tsx`
- `src/features/crm/pages/AdminPage.tsx`
- `src/features/crm/pages/AuditPage.tsx`

SI EL PROYECTO USA NEXT.JS APP ROUTER:

- Usa `app/crm/.../page.tsx` para las rutas listadas abajo.
- Coloca componentes y dominio en `components/crm/` y `lib/crm/`, o respeta la convencion ya existente.
- Protege el segmento `/crm` mediante middleware y verificacion server-side de sesion.

SI HAY SUPABASE O SE DEBE INCORPORAR:

- `supabase/migrations/001_crm_autosporting_schema.sql`
- `supabase/migrations/002_crm_autosporting_rls.sql`
- `supabase/migrations/003_crm_autosporting_views_triggers.sql`
- `supabase/seed/crm_demo_seed.sql`
- Un bucket privado `crm-documents`.
- Un bucket privado `crm-vehicle-media`, con acceso firmado para archivos no publicos.

ARCHIVOS EXISTENTES A MODIFICAR SOLO SI EXISTEN:

- Router principal: registrar `/crm/*`.
- Layout/navegacion publica: agregar acceso a CRM solo donde corresponda, sin exponerlo como funcionalidad publica si no se solicita.
- Sistema global de tema/tokens: incorporar tokens AutoSporting CRM sin romper paginas publicas.
- Cliente de autenticacion/backend: reutilizar sesion actual.
- `.env.example`: declarar variables necesarias sin valores secretos.
- `README.md` o documentacion tecnica existente: documentar setup, migraciones, roles y rutas.

REGLAS PARA LOS ARCHIVOS:

- No dupliques componentes existentes si ya resuelven botones, inputs, modales o tablas con calidad equivalente.
- No borres ni redisenes la pagina publica de AutoSporting para implementar el CRM.
- No incluyas secretos, tokens, credenciales, claves API ni datos reales en frontend, seeds o repositorio.

============================================================
2. STACK Y ARQUITECTURA RECOMENDADA
============================================================

Usa el stack existente si soporta estas capacidades. Si debes elegir:

- Frontend: React + TypeScript, router del proyecto, componentes accesibles.
- Backend/datos: Supabase/PostgreSQL.
- Auth: Supabase Auth o proveedor ya existente, con recuperacion de clave y sesiones seguras.
- Autorizacion: RBAC mas RLS/control server-side.
- Storage: privado para DNI, cedulas, comprobantes y documentacion; URLs firmadas temporales.
- Formularios: validacion tipada con la libreria ya usada; si no existe, Zod + React Hook Form.
- Consultas: capa repository/services; no dispersar queries financieras en componentes.
- Graficos: reutilizar libreria existente; no agregar una nueva si no es necesario.

ARQUITECTURA POR DOMINIO:

- `auth`: acceso, recuperacion, session guard y permisos.
- `inventory`: vehiculos, fotos, propiedad, gastos, precios, aging y publicacion.
- `crm`: clientes, leads, pipeline, tareas y canales.
- `sales`: cotizaciones, reservas, senas, ventas, permutas, consignaciones y entregas.
- `finance`: cuentas, movimientos, financiaciones, cuotas, pagos, gastos, comisiones y cierres.
- `operations`: documentos, expedientes, calendario, alertas y postventa.
- `analytics`: dashboard y reportes.
- `admin`: usuarios, roles, configuracion y auditoria.

============================================================
3. RUTAS Y PAGINAS A IMPLEMENTAR
============================================================

RUTAS PUBLICAS DE AUTH:

- `/login`: login AutoSporting.
- `/recuperar-clave`: solicitud de recuperacion.
- `/restablecer-clave`: cambio de clave con token, si el proveedor lo requiere.

RUTAS PROTEGIDAS:

- `/admin`: Dashboard (tabs `Cockpit` y `General`).
- `/admin/legacy`: Panel de administracion antiguo conservado temporalmente.
- `/crm`: redirecciona a `/admin`.
- `/admin/calendario`: calendario, tareas y eventos.
- `/admin/alertas`: centro de alertas.
- `/admin/reportes`: reportes gerenciales.

- `/admin/stock`: inventario.
- `/admin/stock/nuevo`: alta de unidad o modal equivalente accesible desde listado.
- `/admin/stock/:vehicleId`: ficha completa.
- `/admin/stock/:vehicleId/editar`: edicion controlada.
- `/admin/consignaciones`: captacion y seguimiento de unidades consignadas.
- `/admin/pedidos`: pedidos de unidades que no estan en stock.

- `/admin/clientes`: lista y pipeline.
- `/admin/clientes/:customerId`: ficha de cliente/lead.
- `/admin/cotizaciones`: cotizaciones.
- `/admin/cotizaciones/:quoteId`: detalle/versiones/aprobacion.
- `/admin/reservas`: reservas y senas.
- `/admin/ventas`: listado de ventas.
- `/admin/ventas/:saleId`: expediente completo de venta.
- `/admin/permutas`: valuaciones de vehiculos recibidos.

- `/admin/finanzas`: centro financiero con tabs.
- `/admin/finanzas/movimientos`: si el router requiere subruta.
- `/admin/finanzas/senas`.
- `/admin/finanzas/cuotas`.
- `/admin/finanzas/cuentas`.
- `/admin/finanzas/cobrar-pagar`.
- `/admin/finanzas/gastos`.
- `/admin/finanzas/comisiones`.
- `/admin/finanzas/cierres`.

- `/admin/documentacion`: pendientes documentales y expedientes.
- `/admin/entregas`: checklist y entregas.
- `/admin/postventa`: seguimiento y resenas.

- `/admin/usuarios`: usuarios y roles.
- `/admin/configuracion`: parametros.
- `/admin/auditoria`: historial auditable.

No es obligatorio que cada tab use URL separada si el proyecto tiene otro patron, pero cada modulo debe ser navegable, enlazable y conservar filtros importantes.

============================================================
4. NAVEGACION Y COMPONENTES FRONTEND
============================================================

APP SHELL DESKTOP:

- Sidebar fija de aproximadamente `256px`.
- Header superior de aproximadamente `56px`.
- Contenido principal scrollable.
- Sidebar con logo y nombre AutoSporting, no marca del referente.
- Header con busqueda global, indicador resumido de caja/stock si el rol puede verlo, modo visual opcional, notificaciones y perfil.
- Boton para ocultar/mostrar montos sensibles en dashboard y finanzas.
- Boton flotante de acciones rapidas solo si aporta utilidad y no oculta contenido.

MENU RECOMENDADO AUTOSPORTING:

- Principal: Dashboard, Calendario, Alertas, Reportes.
- Comercial: Stock, Clientes/Leads, Cotizaciones, Reservas, Ventas.
- Operacion: Pedidos, Consignaciones, Documentacion, Entregas, Postventa.
- Finanzas: Finanzas, Cobranzas, Gastos, Comisiones.
- Administracion: Usuarios, Configuracion, Auditoria.

APP SHELL MOBILE:

- Header compacto con hamburger, busqueda o acceso a busqueda, notificaciones y avatar.
- Bottom navigation fija con `Dashboard`, `Stock`, `Clientes`, `Ventas`, `Calendario`.
- Resto de modulos dentro del drawer.
- No dupliques prefijos de rutas; todos los links deben construirse desde un unico helper de rutas `/admin`.

COMPONENTES BASE:

- `CrmShell`, `CrmSidebar`, `CrmTopbar`, `CrmMobileNav`.
- `PageHeader` con titulo, subtitulo, acciones y breadcrumbs.
- `KpiCard` con valor, moneda, descripcion, estado, loading y enlace.
- `StatusBadge`: disponible, preparacion, reservado/senado, vendido, vencido, pendiente, aprobado, cancelado.
- `FilterBar`: busqueda, selects, fechas, chips aplicados y limpiar filtros.
- `DataTable`: orden, paginado, loading, empty, acciones protegidas por permiso.
- `ModalForm` o drawer responsivo para altas y ediciones.
- `MoneyField` que siempre muestre moneda.
- `Timeline` para historial de vehiculo, cliente y venta.
- `DocumentUploader` con estado pendiente/cargado/validado/observado.
- `Checklist` para entrega.
- `AlertPanel`, `ConfirmDialog`, `Toast`.

COMPONENTES DE DOMINIO:

- `DashboardCockpit`, `DashboardGeneral`, `CashProjectionPanel`, `StockAgingPanel`.
- `VehicleList`, `VehicleCard`, `VehicleForm`, `VehicleOwnershipCard`, `VehicleCostSummary`, `PriceHistory`.
- `CustomerList`, `LeadKanban`, `CustomerForm`, `CustomerTimeline`.
- `QuoteForm`, `QuoteStatusActions`.
- `ReservationForm`, `DepositForm`.
- `SaleForm`, `TradeInForm`, `SaleSettlement`, `DeliveryChecklist`.
- `FinanceTabs`, `AccountBalanceCards`, `TransactionTable`, `InstallmentPlanForm`, `CollectionsBoard`, `ExpenseForm`, `CommissionTable`, `CashClosePanel`.
- `CalendarBoard`, `AlertCenter`, `DocumentQueue`, `PostSaleSurvey`.
- `UserRolesTable`, `AuditLogTable`.

============================================================
5. DISENO VISUAL AUTOSPORTING
============================================================

Construye una identidad original AutoSporting con lenguaje dark deportivo, tomando como patron comprobado una UI oscura compacta con acento rojo, sin copiar marca ni logos ajenos.

TOKENS INICIALES:

- `--crm-bg: #0B0B0D`
- `--crm-sidebar: #161619`
- `--crm-surface: #1E1E24`
- `--crm-surface-raised: #24242B`
- `--crm-border: #33333A`
- `--crm-text: #FAFAFA`
- `--crm-muted: #A1A1AA`
- `--crm-primary: #E63027` (ajustar al rojo final AutoSporting si ya existe en el branding)
- `--crm-primary-deep: #C42620`
- `--crm-success: #22C55E`
- `--crm-warning: #F59E0B`
- `--crm-danger: #EF3329`
- `--crm-info: #3B82F6`

TIPOGRAFIA:

- Usar la fuente corporativa existente de AutoSporting.
- Si no existe una tipografia definida, usar `Inter, system-ui, sans-serif`.
- H1 de pagina: aproximadamente `24px`, peso `700`.
- Labels y texto auxiliar: `12-14px`.
- Botones: `14px`, semibold.

GEOMETRIA:

- Auth card: max-width `384px`, padding `32px`, radio `16px`.
- Inputs y botones: alto minimo `40px`, radio `8px`.
- Cards de dashboard: radio `16px`, padding `20px`, borde sutil.
- Modal de formulario largo: panel oscuro, header y acciones persistentes, scroll interno.
- Tabla: header legible, filas compactas y estados con badges.

ESTADOS:

- Accion primaria: gradiente rojo AutoSporting y halo moderado.
- Foco: outline/ring visible y accesible.
- Exito: verde con icono y texto.
- Advertencia: ambar para vencimiento o stock envejecido.
- Critico/error: rojo, mensaje explicativo y accion sugerida.
- Empty state: icono discreto, mensaje y CTA contextual.
- Loading: skeleton coherente, no saltos bruscos.

RESPONSIVE:

- Desktop: sidebar fija, grillas KPI de 4 a 6 tarjetas.
- Tablet: sidebar colapsable, grillas de 2 a 3 tarjetas.
- Mobile: drawer, bottom navigation, KPIs en 2 columnas, listados como cards y formularios en una columna.

NO REPLICAR:

- No mezclar modales claros dentro de la interfaz oscura.
- No mostrar nombres de otras agencias ni textos del CRM de referencia.
- No utilizar emojis como unica iconografia final; usar el set de iconos consistente del sitio actual.

============================================================
6. MODELO DE DATOS Y BASE DE DATOS
============================================================

Usa PostgreSQL/Supabase salvo que el backend existente proporcione integridad transaccional equivalente. Usa UUID, `created_at`, `updated_at`, `created_by`, `updated_by` y soft delete donde corresponda. Montos deben ser `numeric`, nunca float. Toda cifra debe incluir `currency` (`ARS` o `USD`).

TABLAS PRINCIPALES:

IDENTIDAD Y ACCESO:

- `profiles`: usuario autenticado, nombre, rol, sucursal, activo.
- `roles`: administrador, gerencia, ventas, finanzas, operaciones, solo_lectura.
- `permissions`: recurso y accion.
- `role_permissions`: relacion rol-permiso.

STOCK:

- `vehicles`
  - `id`, `internal_code`, `plate`, `vin`, `engine_number`, `chassis_number`
  - `brand`, `model`, `version`, `year`, `vehicle_type`, `color`, `fuel`, `transmission`, `kilometers`
  - `condition`, `location`, `status`
  - `origin` (`purchase`, `consignment`, `trade_in`, `third_party`)
  - `entry_date`, `available_date`, `sold_date`, `delivered_date`
  - `sale_currency`, `sale_price`, `minimum_acceptable_price`
  - `purchase_currency`, `purchase_price`
  - `published_marketplace`, `marketplace_url`, `published_by`
  - `rotation_strategy`, `rotation_owner_id`, `next_rotation_review`
- `vehicle_ownerships`: propio, tercero, consignacion, mixto; propietario; porcentaje; condiciones.
- `vehicle_media`: fotos/videos y orden.
- `vehicle_price_history`: precio anterior/nuevo, moneda, tipo, motivo, usuario y fecha.
- `vehicle_expenses`: gastos vinculados; categoria; capitalizable; comprobante.
- `vehicle_documents`: cedula, titulo, manuales, llaves, servicios y estados.

CRM COMERCIAL:

- `customers`: persona/empresa, nombre, DNI/CUIT protegido, telefono, email, domicilio, tipo, consentimiento.
- `leads`: cliente opcional, canal, etapa, vendedor, vehiculo de interes, texto buscado, proximo contacto, perdida.
- `lead_interactions`: llamadas, mensajes, visitas, notas y tareas.
- `vehicle_requests`: pedido de marca/modelo/anos/presupuesto para stock no disponible.
- `quotes`: cliente, vehiculo o descripcion, vendedor, precio, moneda, vigencia, condiciones y estado.
- `quote_trade_ins`: permuta propuesta en la cotizacion.
- `reservations`: vehiculo, cliente, vendedor, fecha, vencimiento, estado y condiciones.
- `deposits`: sena recibida/aplicada/devuelta, importe, moneda, caja, comprobante.
- `sales`: venta, vehiculo, comprador, vendedor, estado, precio snapshot, costos snapshot, entrega.
- `trade_ins`: vehiculo tomado, valuacion, aceptacion y conversion a stock.
- `consignments`: cliente, vehiculo ofrecido, vendedor, estado, ultimo contacto y notas.

FINANZAS:

- `financial_accounts`: cajas/bancos, moneda, saldo inicial, estado.
- `financial_transactions`: ingreso, egreso o transferencia; caja; moneda; importe; entidad origen; categoria; comprobante.
- `financings`: venta/cliente, capital, moneda, acreedor, terminos y estado.
- `installments`: numero, vencimiento, importe, saldo y estado.
- `payments`: pago aplicado a venta/cuota/sena, caja, comprobante y estado.
- `owner_payouts`: pagos pendientes/disponibles/cobrados al propietario.
- `expenses`: egreso general o relacionado con unidad/venta.
- `commissions`: beneficiario, venta, regla, porcentaje, extra, estado y pago.
- `loans`: prestamos desde caja, beneficiario, devolucion esperada y estado.
- `recurring_transactions`: plantillas mensuales.
- `cash_counts`: arqueos.
- `cash_closures`: snapshots de cierre diario.

OPERACION:

- `documents`: archivos privados, entidad vinculada, tipo, estado, sensibilidad y vencimiento.
- `sale_files`: expediente documental.
- `delivery_checklist_items`: item, obligatorio, completado y evidencia.
- `calendar_events`: tipo, fecha/hora, sector, cliente, vehiculo, responsable, color y notas.
- `alerts`: tipo, prioridad, entidad, vencimiento, estado y asignado.
- `post_sale_followups`: contacto, resultado, satisfaccion y resena solicitada.
- `nps_surveys`: contexto, vendedor, envio, respuesta y score.

GOBIERNO:

- `audit_logs`: append-only, actor, accion, entidad, entidad_id, antes/despues, motivo, timestamp.
- `notifications`: usuario, evento, estado y lectura.
- `app_settings`: configuraciones no secretas.

VISTAS/CONSULTAS:

- `vw_stock_capital_by_currency`
- `vw_stock_aging`
- `vw_vehicle_margin_estimated`
- `vw_sales_margin_realized`
- `vw_collections_due`
- `vw_documents_pending`
- `vw_pipeline_conversion`
- `vw_dashboard_kpis`

DATOS SENSIBLES:

- DNI/CUIT, domicilio, documentos, comprobantes y archivos no son publicos.
- Secrets de WhatsApp, Google, OpenAI o proveedores solo en variables seguras del servidor.

============================================================
7. PERMISOS Y SEGURIDAD
============================================================

ROLES MINIMOS:

- `administrator`: configuracion completa, usuarios, auditoria.
- `management`: KPIs, capital, precios minimos, autorizaciones y reportes.
- `sales`: clientes, leads, cotizaciones, reservas y ventas asignadas; no ve secretos ni ajustes sensibles.
- `finance`: cajas, cobros, cuotas, gastos, pagos, comisiones y reportes financieros.
- `operations`: stock operativo, documentos, expedientes, entregas y calendario.
- `read_only`: consulta aprobada sin mutaciones.

PERMISOS CRITICOS:

- Solo management/administrator ve y modifica `minimum_acceptable_price`.
- Solo finance/management/administrator registra o revierte pagos.
- Solo usuarios autorizados visualizan archivos personales o documentos.
- Cambios de precio, venta por debajo de minimo, anulaciones, devolucion/retencion de senas, reversos, pagos de comision y cambios de permisos deben auditarse.

RLS / BACKEND:

- No confies en ocultar botones frontend.
- Aplica politicas por rol y propietario/asignacion en el backend.
- `audit_logs` no debe permitir update ni delete normal.
- Pagos y movimientos no se borran: se revierten mediante movimiento contrario con motivo.

============================================================
8. MODULOS Y PANTALLAS FUNCIONALES
============================================================

DASHBOARD:

- Tab `Cockpit`: avance mensual, objetivos, ventas, margen realizado, capital, unidades envejecidas, cobranza y entregas.
- Tab `General`: cards de stock, leads, ventas, reservas, documentos, cuotas, gastos, comisiones, alertas y agenda.
- Agregar indicadores AutoSporting:
  - capital total de stock;
  - capital propio;
  - capital de terceros/consignacion;
  - unidades `>60 dias` y `>90 dias`;
  - margen estimado y costo inmovilizado;
  - cuotas vencidas y por vencer.

STOCK:

- Tabs: `Stock general`, `Consignaciones`, `Mandatos` si el negocio los aprueba.
- Estados: `En preparacion`, `Disponible`, `Reservado`, `Senado`, `Vendido pendiente entrega`, `Entregado`, `Retirado`.
- Filtros: marca, modelo, patente, estado, origen, propietario, ubicacion, moneda, rango precio, documentacion, dias en stock.
- Alta de vehiculo:
  - identidad completa;
  - compra/venta y monedas;
  - precio minimo;
  - propiedad propio/tercero/consignacion/mixto;
  - documentos y fotos;
  - gastos iniciales;
  - publicacion;
  - estrategia de rotacion.
- La captura OCR de cedula es opcional de fase posterior; no la actives sin consentimiento, proveedor configurado y revision manual obligatoria.

CLIENTES Y LEADS:

- Lista con busqueda/importacion controlada/exportacion segun permiso.
- Pipeline kanban: Nuevo, Contactado, Cita, Mostrando, Negociacion, Propuesta, Reservado, Ganado, Perdido.
- Alta: origen presencial/digital/referido/web, vendedor, interes, permuta potencial, proxima accion.
- Routing configurable para distribuir leads y conservar motivo/asignacion.

COTIZACIONES:

- Asociar cliente y vehiculo o cargar descripcion libre.
- Incluir permuta propuesta, precio, moneda, vigencia, condiciones y version.
- Estados: borrador, pendiente, enviada, revision, aprobada, modificada, rechazada, vencida.

RESERVAS Y SENAS:

- Una reserva activa como maximo por vehiculo.
- Sena con importe, moneda, caja, medio, comprobante, condicion y vencimiento.
- Estados de sena: recibida, aplicada, devuelta, retenida.
- Recibida suma a caja; devuelta genera egreso; aplicada concilia contra la venta sin duplicar caja.

VENTAS:

- Venta desde lead, cotizacion o reserva, o venta directa autorizada.
- Precio final, snapshots de costos, comprador, vendedor, sena, forma de pago, financiacion, permuta, consignacion y gestor.
- Checklist de entrega: llave duplicada, manuales, cedula, documentacion, preparacion y obsequio.
- Documentos privados del expediente.
- Estado: borrador, activa/reservada, confirmada, pendiente entrega, entregada, caida, cancelada.

PERMUTAS:

- Valuacion separada antes de aceptar.
- Al aceptarse, vincularla a venta y permitir crear unidad de stock con origen `trade_in`.
- Guardar fotos, documentos, revision, valor ofrecido y valor final.

FINANZAS:

- Resumen por caja/moneda.
- Movimientos con filtros y exportacion.
- Senas.
- Cuotas y plan automatico:
  - deudor, vehiculo, acreedor, monto, moneda, cantidad, frecuencia y primer vencimiento;
  - opcion de pagares PDF solo cuando se definan plantillas legales propias.
- Cobros y pagos a propietario.
- Gastos por unidad y gastos generales.
- Comisiones.
- Cuentas por cobrar/pagar.
- Arqueos y cierre diario.
- Conciliacion y fiscalidad solo como modulo claramente marcado en desarrollo hasta validar con contador.

DOCUMENTACION Y ENTREGA:

- Cola de pendientes por vehiculo y venta.
- Estados pendiente, cargado, validado, observado, vencido.
- Checklist completo antes de cerrar entrega.

POSTVENTA:

- Crear tarea posterior a entrega.
- Registrar satisfaccion y NPS.
- Registrar envio de solicitud de resena Google solamente tras consentimiento o politica comercial aprobada.

ADMINISTRACION:

- Usuarios, roles y permisos.
- Branding y parametros de negocio.
- Reglas de comision, alertas, monedas, ubicaciones y categorias.
- Auditoria consultable.
- Configuracion de integraciones solo server-side.

============================================================
9. REGLAS DE NEGOCIO Y VALIDACIONES
============================================================

VALIDACIONES DE VEHICULOS:

- Patente normalizada unica para unidad activa, cuando corresponda.
- VIN/chasis unico si fue informado.
- Ano valido y kilometros no negativos.
- Precio, gasto y porcentajes no negativos.
- Ownership vigente debe totalizar 100%.
- Precio minimo solo con permiso.
- Si `sale_price < minimum_acceptable_price`, exigir aprobacion gerencial y motivo.

CALCULOS:

- `total_cost = purchase_price + capitalizable_vehicle_expenses`.
- `estimated_margin = sale_price - total_cost - estimated_commissions`.
- `minimum_margin = minimum_acceptable_price - total_cost - estimated_commissions`.
- `own_capital = total_cost * own_percentage`.
- `third_party_capital = total_cost * third_party_percentage`.
- No sumar ARS con USD sin conversion guardada: `exchange_rate`, `exchange_rate_date`, `exchange_rate_source`.

AGING/ROTACION:

- Calcular dias desde `entry_date` hasta salida/entrega.
- `61-90 dias`: alerta warning y estrategia requerida.
- `>90 dias`: alerta critica y revision gerencial.
- Reservar no resetea dias en stock.

LEADS:

- No perder origen ni historial de contacto al cambiar etapa.
- Perdido requiere motivo.
- Lead sin contacto dentro del SLA debe generar alerta.

RESERVAS/SENAS:

- No permitir dos reservas activas para la misma unidad.
- No reservar unidad vendida/retirada/entregada.
- Devolucion, retencion o cancelacion requiere motivo y usuario.
- Todo movimiento monetario debe identificar caja y moneda.

VENTAS:

- Una unidad no puede tener mas de una venta activa o entregada.
- Venta confirmada congela precio, costo, gastos y reglas de comision relevantes.
- Venta con saldo pendiente no puede marcar entrega final sin autorizacion.
- Venta cancelada debe liberar reserva/unidad mediante flujo controlado y revisar comisiones/movimientos.

PERMUTA:

- La valuacion no modifica stock o capital hasta aceptacion.
- Al incorporar al stock, el valor final tomado pasa a costo inicial.

FINANCIACION/CUOTAS:

- El total de contado + sena aplicada + permuta + financiacion debe conciliar con precio de venta.
- Pago parcial actualiza saldo sin borrar la cuota.
- Mora y recargos deben configurarse y aprobarse conforme a politica real.
- Reversos financieros deben ser auditablemente trazables.

DOCUMENTOS/SEGURIDAD:

- Restringir documentos sensibles por rol.
- No servir archivos privados con URL publica permanente.
- Auditar descargas o cambios criticos cuando sea viable.

============================================================
10. INTEGRACION CON MI WEB EXISTENTE
============================================================

- Conserva header, footer, rutas publicas, SEO y formularios actuales de AutoSporting sin regresiones.
- Monta el CRM como sub-aplicacion protegida en `/crm`; no mezcles pantallas administrativas con el catalogo publico.
- Reutiliza logo, paleta y tipografia AutoSporting ya existentes; adapta los tokens dark CRM a esa identidad.
- Si el sitio publico ya muestra vehiculos, define una sincronizacion controlada:
  - solo vehiculos marcados `published = true` y `status = available` aparecen publicamente;
  - nunca exponer costo, precio minimo, propietario, documentos, margen o notas internas;
  - al reservar/vender, actualizar disponibilidad publica.
- Si la web ya recibe consultas, convertir el formulario publico en leads del CRM mediante endpoint seguro, consentimiento y anti-spam.
- No implementar WhatsApp, Google Calendar, Google Reviews, MercadoLibre, correo o IA hasta tener credenciales propias, consentimiento y una etapa aprobada.

============================================================
11. ORDEN DE DESARROLLO OBLIGATORIO
============================================================

FASE 0 - AUDITORIA DEL PROYECTO:

- Detectar stack, archivos equivalentes, auth/backend existente y branding.
- Entregar mapa de archivos reales a crear/modificar.

FASE 1 - FUNDACIONES:

- Tokens visuales y AppShell.
- Auth, rutas protegidas, perfiles, roles, permisos, RLS y auditoria.
- Esquema SQL/migraciones y datos demo anonimos.

FASE 2 - STOCK Y CAPITAL:

- Vehiculos, ownership, gastos, documentos y precios.
- Listado/filtros/ficha.
- Capital propio vs terceros, margen y alertas de dias en stock.
- Dashboard inicial.

FASE 3 - COMERCIAL:

- Clientes, leads, pipeline y tareas.
- Cotizaciones, reservas y senas.
- Ventas y permutas.

FASE 4 - OPERACION Y FINANZAS:

- Expedientes, documentos, checklist y entregas.
- Cuentas, movimientos, cobranzas, financiacion/cuotas, gastos y comisiones.
- Cierres y reportes.

FASE 5 - POSTVENTA, ADMIN Y CALIDAD:

- Postventa/NPS/resena Google.
- Configuracion y auditoria avanzada.
- Responsive, accesibilidad, pruebas, performance, backups e integraciones aprobadas.

No empieces por integraciones externas ni pantallas accesorias antes de que stock, ventas, movimientos y permisos sean correctos.

============================================================
12. PRUEBAS Y CRITERIOS DE ACEPTACION
============================================================

Implementa pruebas o verificaciones equivalentes para:

- Rutas publicas y privadas; redireccion sin sesion.
- Permisos de precio minimo, documentos y movimientos financieros.
- Alta/editado de vehiculo y deteccion de duplicados.
- Calculo de costo, margen, capital por propiedad y monedas.
- Alertas de 60/90 dias.
- Pipeline y conversion a cotizacion/reserva/venta.
- Bloqueo de doble reserva y doble venta.
- Sena recibida/aplicada/devuelta y su efecto correcto en caja.
- Plan de cuotas, pago parcial, vencimiento y saldo.
- Cancelacion o reversion con auditoria.
- Documentos privados.
- Navegacion mobile sin rutas duplicadas.
- Tema consistente en todos los modales.
- Publicacion web sin exponer campos internos.

DEFINICION DE TERMINADO PARA CADA FASE:

- UI funcional y responsive, no solo maqueta.
- Persistencia real o mock explicitamente transitorio.
- Validaciones de negocio activas.
- Estados loading, empty, error y success.
- Permisos aplicados backend/RLS cuando existe backend.
- Datos demo anonimos.
- Lista de archivos modificados y forma de probar.

============================================================
13. ENTREGABLES QUE DEBES PRODUCIR
============================================================

Al comenzar:

1. Informe corto del stack encontrado.
2. Mapeo exacto de archivos que crearas o modificaras.
3. Plan por fases ajustado al proyecto existente.

Durante implementacion:

1. Migraciones/schema y politicas de seguridad.
2. Componentes y rutas funcionando.
3. Seeds demo.
4. Pruebas o checklist verificable.

Al finalizar cada fase:

1. Lista de funcionalidades terminadas.
2. Archivos creados/modificados.
3. Pasos para verificar visual y funcionalmente.
4. Pendientes conscientes, sin simular integraciones no implementadas.

Comienza ahora con la FASE 0: inspecciona el proyecto existente, identifica el stack y presenta el mapa exacto de archivos para integrar `/crm` manteniendo el branding AutoSporting y la web publica intacta. Luego implementa la FASE 1 una vez validada la estructura.
```
