# Analisis comparativo: CRM Sote vs CRM AutoSporting

Fecha del analisis: 11 de junio de 2026

## 1. Resumen ejecutivo

AutoSporting ya adopto una parte importante del lenguaje visual y de la arquitectura de navegacion observada en Sote: shell oscuro, sidebar agrupada, header fijo, dashboard con dos modos, stock denso, calendario, alertas, ventas con reservas integradas, tablas responsive y un conjunto amplio de modulos operativos.

La similitud global estimada actual es de **79%**.

Esta estimacion combina:

- similitud visual;
- estructura de navegacion y pantallas;
- densidad de informacion;
- estados y componentes;
- funcionalidad realmente conectada a datos;
- consistencia desktop/mobile.

El porcentaje no es mayor porque todavia existen diferencias estructurales, no solo de color:

1. El alta de vehiculos usa un componente llamado `VehicleFormDemo` y no completa el flujo real de Sote.
2. Gran parte de las subpestanas de Finanzas son vistas visuales genericas sin dominio funcional especifico.
3. Mi Espacio conserva paneles vacios o representativos en Patrimonio y Mis autos.
4. El header global no replica la informacion operativa compacta de Sote y la busqueda no esta conectada.
5. El sistema compartido de UI no incluye aun tabla, modal, drawer, page header, toolbar, empty state y skeleton estandarizados.
6. Muchas pantallas siguen usando estilos locales, colores hardcodeados y escalas distintas.
7. Algunos modulos nuevos tienen cobertura funcional basica, pero no la profundidad ni los flujos cruzados de Sote.
8. `server.js` concentra una cantidad muy alta de responsabilidades, aumentando el riesgo de cambios funcionales.

### Nivel de confianza

**Medio-alto para AutoSporting**: se revisaron el proyecto, rutas, componentes, modelos y endpoints actuales.

**Medio para Sote**: el inventario visual y funcional se apoya en las sesiones autenticadas y comparaciones realizadas previamente durante este trabajo. En la revision actual no fue posible reabrir todas las pantallas autenticadas de Sote ni AutoSporting porque ambas sesiones del navegador estaban cerradas. Los puntos que requieren revalidacion visual se indican como tales.

No se copiaron codigo, logos, marca, datos, credenciales, textos privados ni assets de Sote.

## 2. Similitud estimada por area

| Area | Similitud | Estado |
|---|---:|---|
| Shell, fondo y contenedor general | 88% | Muy cercano |
| Sidebar y mapa de navegacion | 84% | Cercano; iconografia y detalle visual pendientes |
| Header superior | 66% | Incompleto frente a Sote |
| Dashboard general | 92% | Muy cercano |
| Cockpit CEO | 90% | Muy cercano |
| Stock listado | 87% | Cercano |
| Detalle de vehiculo | 76% | Parcialmente alineado |
| Alta/edicion de vehiculo | 48% | Gap funcional critico |
| Calendario | 91% | Muy cercano |
| Alertas | 88% | Cercano |
| Clientes | 84% | Cercano |
| Cotizaciones/leads | 79% | Estructura util, jerarquia distinta |
| Ventas | 87% | Cercano |
| Reservas integradas en Ventas | 83% | Bien encaminado |
| Mi Espacio | 68% | Visualmente amplio, funcionalidad desigual |
| Finanzas | 58% | Muchas subpestanas no especializadas |
| Cuotas y cobranzas | 73% | Funcional, falta integracion visual/dominio |
| Reportes | 74% | Funcional, sistema visual fragmentado |
| Operacion secundaria | 69% | Cobertura amplia, profundidad desigual |
| Configuracion, usuarios y plantillas | 77% | Funcional, falta unificacion |
| Responsive global | 80% | Mejorado; falta QA por flujo |

Promedio ponderado estimado: **79%**.

## 3. Inventario visual y funcional de Sote

### 3.1 Layout general

- Fondo principal casi negro, con superficies gris grafito.
- Sidebar fija de aproximadamente 240-256 px.
- Header superior compacto y fijo.
- Contenido central con ancho maximo aproximado de 1240-1280 px.
- Paginas densas, con poco espacio decorativo y alta prioridad a lectura y operacion.
- Bordes finos, sombras discretas y radios contenidos.
- Desktop basado en tablas y paneles; mobile basado en drawer, cards y controles apilados.

### 3.2 Sidebar

- Marca y version en la cabecera.
- Grupos con rotulos uppercase: Principal, Comercial, Operacion, Finanzas y administracion.
- Iconos pequenos y consistentes.
- Item activo con rojo, fondo rojo translucido y borde/indicador.
- Footer con usuario, rol, cerrar sesion y acciones de soporte/recarga.
- Scroll independiente.

### 3.3 Header

- Busqueda global con placeholder orientado a clientes, vehiculos y ventas.
- Pills compactas con informacion contextual: periodo, caja, ventas, stock y plan.
- Controles de tema, notificaciones y usuario.
- Avatar, nombre y rol visibles.
- Jerarquia horizontal densa, sin grandes espacios vacios.

### 3.4 Dashboard

- Dos modos: Cockpit CEO y Dashboard general.
- Dashboard general con grilla amplia de KPIs compactos.
- Proyeccion de caja, actividad, stock, ventas y pendientes.
- Cockpit CEO orientado a avance mensual, objetivos, ganancia, rendimiento y alertas.
- Filtros temporales y enlace desde metricas hacia vistas operativas.

### 3.5 Stock y vehiculos

- Header compacto con acciones de exportacion y alta.
- Tabs/filtros por estado, tipo, marca y busqueda.
- Tabla densa en desktop; cards operativas en mobile.
- Estados claros: disponible, reservado, vendido, pausado y otros.
- Detalle con datos comerciales, tecnicos, propietario/consignacion, costos, gastos, documentos, imagenes, publicacion y auditoria.
- Alta/edicion dividida por bloques logicos y con validaciones visibles.

### 3.6 Ventas y reservas

- Reservas integradas como estado/pestana dentro del modulo Ventas.
- Tabs: Todas, Borradores, Activas, Reservas, Cerradas, Caidas y Canceladas.
- Filtros por comprador, vehiculo, vendedor, metodo, fechas y permuta.
- Alta de venta con comprador, vehiculo, precio, seña, forma de pago, permuta, vendedor y comisiones.
- Detalle comercial con entidades vinculadas, condiciones, documentacion, entrega, notas y auditoria.

### 3.7 Clientes y cotizaciones

- Listados compactos, busqueda y filtros combinados.
- Detalle con datos principales, historial, ventas, cotizaciones, tareas y comunicaciones.
- Conversión y vinculacion entre cotizacion, cliente, reserva y venta.

### 3.8 Calendario y alertas

- Calendario mensual con panel de proximos eventos.
- Alta de evento en modal con detalle, fecha, hora, tipo, sector, color, cliente, vehiculo y notas.
- Alertas agrupables por prioridad/estado.
- Estados vacios claros y acciones visibles.

### 3.9 Finanzas

- Centro financiero unificado con gran cantidad de subpestanas.
- Resumen, movimientos, señas, cuotas, pagos, tarjeta, retiros, comisiones, rentabilidad, cuentas, cobrar/pagar, prestamos, presupuesto, recurrencias, arqueos, cierre de caja, conciliacion y AFIP/IVA.
- Saldos por cuenta y moneda.
- Relacion con ventas, reservas, clientes y vehiculos.
- Acciones especializadas por cada dominio, no una vista generica reutilizada.

### 3.10 Componentes recurrentes

- Page header.
- Toolbar de filtros.
- Button primary, secondary, ghost, danger e icon button.
- Card y KPI card.
- Table y mobile cards.
- Badge por estado.
- Input, select, textarea, checkbox, switch y date picker.
- Tabs.
- Modal y drawer.
- Empty state y skeleton.
- Timeline/auditoria.
- Dropdown y user menu.

## 4. Inventario tecnico de AutoSporting

### 4.1 Stack

- Next.js 16.2.2.
- React 19.
- Tailwind CSS 3.4.
- Express 5.2.1.
- Mongoose 9.1.5.
- JWT.
- Lucide React.
- Framer Motion.
- React Hot Toast.
- Cloudinary y Multer para imagenes.

### 4.2 Estructura principal

- Rutas frontend: `src/app/admin/**`.
- Componentes CRM: `src/components/crm/**`.
- Hooks: `src/hooks/**`.
- Contexto de autenticacion: `src/context/AuthContext`.
- Modelos: `src/models/**`.
- API principal monolitica: `server.js`.
- Tokens: `tailwind.config.js`.

### 4.3 Tokens existentes

| Token | Valor |
|---|---|
| `crm-bg` | `#0B0B0D` |
| `crm-topbar` | `#161619` |
| `crm-sidebar` | `#161619` |
| `crm-surface` | `#1E1E24` |
| `crm-surface-raised` | `#28282E` |
| `crm-border` | `#33333A` |
| `crm-border-strong` | `#4A4A52` |
| `crm-fg` | `#FAFAFA` |
| `crm-fg-muted` | `#A1A1AA` |
| `crm-fg-subtle` | `#71717A` |
| `crm-red` | `#EF3329` |
| `crm-red-brand` | `#E63027` |
| `crm-red-hover` | `#C42620` |
| `crm-success` | `#10B981` |
| `crm-warning` | `#F59E0B` |
| `crm-info` | `#3B82F6` |
| `crm-purple` | `#8B5CF6` |

Los valores base son adecuados. El problema no esta en la paleta, sino en la adopcion inconsistente.

### 4.4 Componentes compartidos actuales

- `CrmButton`.
- `CrmCard`.
- `CrmBadge`.
- `CrmInput`.
- `CrmSelect`.
- `CrmTextarea`.
- `CrmTabs`.
- `CrmStatCard`.

Faltan como primitivas compartidas:

- `CrmTable`.
- `CrmModal`.
- `CrmDrawer`.
- `CrmPageHeader`.
- `CrmToolbar`.
- `CrmEmptyState`.
- `CrmSkeleton`.
- `CrmKpiCard`.
- `CrmFilterChip`.
- `CrmTimeline`.
- `CrmDateField`.

### 4.5 Rutas y modulos existentes

AutoSporting ya dispone de:

- Dashboard y cockpit.
- Stock y detalle.
- Clientes y detalle.
- Cotizaciones/leads y detalle.
- Calendario.
- Alertas.
- Ventas, detalle y reservas integradas.
- Mis ventas.
- Mi Espacio.
- Finanzas.
- Cuotas.
- Cobranzas.
- Pedidos.
- Postventa.
- Expedientes.
- Gestoria.
- Consignaciones.
- Infracciones.
- Telefonos utiles.
- Documentacion.
- Auditoria.
- Reportes.
- Notificaciones.
- Equipo, productividad y metas.
- Configuracion, usuarios, plantillas, general, exportaciones, sistema, calidad de datos y ayuda.

### 4.6 Modelos relevantes

- `Car`: datos publicos, tecnicos, comerciales, propietario, costos, gastos, imagenes y auditoria.
- `Client`: identidad, contacto, origen, estado, etiquetas, notas y asignacion.
- `Lead`: pipeline, prioridad, fuente, cliente, vehiculo, tareas y auditoria.
- `Reservation`: seña, vencimiento, estado y vinculaciones.
- `Sale`: cliente, vehiculo, reserva, precio, seña, pago, permutas, documentos, entrega, comisiones, cuotas y postventa.
- `Transaction` y `Account`: movimientos y cuentas.
- `Installment`: cuotas y pagos.
- `CrmTask`: tareas, eventos y alertas.
- `AdminUser`: roles y permisos.
- `CrmSettings`.
- `MessageTemplate`.
- Modelos operativos para pedidos, gestoria, infracciones y telefonos.

### 4.7 API y separacion publica/admin

La separacion principal esta bien planteada:

- `/api/public/cars` y `/api/public/cars/:id` devuelven vehiculos visibles y excluyen campos internos.
- `/api/admin/cars` y `/api/admin/cars/:id` requieren autenticacion y entregan datos administrativos.
- Clientes, leads, reservas, ventas, transacciones, cuotas, usuarios y plantillas usan endpoints administrativos autenticados.

La proyeccion publica excluye actualmente precio de compra, propietario, contacto, cliente vinculado, consignador, notas, numeros de motor/chasis, ubicacion, gastos, patente/VIN, auditoria y otros campos internos.

Esta separacion debe mantenerse y cubrirse con pruebas de regresion antes de tocar formularios o modelos.

## 5. Mapa de modulos Sote vs AutoSporting

| Sote | AutoSporting | Estado |
|---|---|---|
| Dashboard | `/admin` | Implementado y cercano |
| Calendario | `/admin/agenda` | Implementado y cercano |
| Alertas | `/admin/alertas` | Implementado y cercano |
| Reportes | `/admin/reportes` | Implementado |
| Mi Espacio | `/admin/mi-espacio` | Implementado parcialmente |
| Stock | `/admin/stock` | Implementado |
| Detalle vehiculo | `/admin/stock/[id]` | Implementado parcialmente |
| Clientes | `/admin/clientes` | Implementado |
| Cotizaciones | `/admin/leads` | Implementado con nombre adaptado |
| Ventas | `/admin/ventas` | Implementado |
| Reservas | Pestana dentro de `/admin/ventas` | Implementado; ruta antigua aun existe |
| Mis ventas | `/admin/mis-ventas` | Implementado |
| Pedidos | `/admin/pedidos` | Implementado |
| Postventa | `/admin/postventa` | Implementado |
| Expedientes | `/admin/expedientes` | Implementado |
| Gestoria | `/admin/gestoria` | Implementado |
| Consignaciones | `/admin/consignaciones` | Implementado |
| Infracciones | `/admin/infracciones` | Implementado |
| Telefonos utiles | `/admin/telefonos` | Implementado |
| Finanzas | `/admin/finanzas` | Implementado parcialmente |
| Cuotas/cobranzas | `/admin/cuotas`, `/admin/cobranzas` | Implementado, arquitectura distinta |
| Usuarios/configuracion | `/admin/configuracion/**` | Implementado |
| Plantillas | `/admin/configuracion/plantillas` | Implementado |

## 6. Comparacion detallada por modulo

### 6.1 Shell, sidebar, header y responsive

**Sote**

- Sidebar compacta con iconos consistentes.
- Header con busqueda global, pills operativas, avatar y usuario.
- Navegacion mobile con drawer y acciones accesibles.

**AutoSporting**

- `CrmShell`, `CrmSidebar`, `CrmHeader` y `CrmBottomNav`.
- Drawer mobile funcional y sidebar con permisos.
- Footer de usuario y cierre de sesion.
- El header carga notificaciones.

**Gaps**

- La busqueda del header no ejecuta busqueda ni navegación.
- Faltan pills de caja, ventas, stock, periodo y plan.
- Falta user menu completo.
- Sidebar usa emojis de texto; no tiene la consistencia optica de un set de iconos.
- La bottom nav solo representa una muestra de modulos y debe validarse por rol.

**Reutilizar**

- Shell, permisos, drawer, notificaciones y breakpoints actuales.

**Modificar**

- `src/components/crm/layout/CrmHeader.jsx`
- `src/components/crm/layout/CrmSidebar.jsx`
- `src/components/crm/layout/CrmBottomNav.jsx`
- `src/components/crm/layout/CrmShell.jsx`

**Prioridad:** P0  
**Riesgo:** Medio  
**Dependencias sensibles:** autenticacion, permisos, navegación, scroll mobile.

### 6.2 Dashboard

**Sote**

- Cockpit CEO y Dashboard general.
- KPIs densos, proyeccion de caja, objetivos y accesos contextuales.

**AutoSporting**

- `CockpitCeoSote.jsx` y `GeneralDashboardSote.jsx`.
- Tabs funcionales y datos reales conectados.
- Enlaces mensuales hacia ventas.

**Gaps**

- Componentes secundarios todavia contienen estilos hardcodeados.
- Debe validarse el comportamiento con datos vacios, monedas mixtas y permisos parciales.
- Algunos nombres y metricas deben adaptarse a reglas de AutoSporting, no copiarse semanticamente.

**Reutilizar**

- Casi toda la implementacion actual.

**Modificar**

- `src/app/admin/page.jsx`
- `src/components/crm/dashboard/**`

**Prioridad:** P2  
**Riesgo:** Bajo-Medio  
**Dependencias sensibles:** calculos de ventas, stock y finanzas.

### 6.3 Stock listado

**Sote**

- Header de acciones, resumen de stock, tabs, filtros densos, tabla desktop y cards mobile.

**AutoSporting**

- Listado real conectado por `useAdminCars`.
- Filtros, tabs, resumen de activos, tabla y cards mobile.

**Gaps**

- Los botones Vista previa, Exportar y Nuevo mandato requieren validacion funcional end-to-end.
- El alta abre `VehicleFormDemo`.
- Faltan estados de carga tipo skeleton y paginacion/virtualizacion para volumen alto.

**Reutilizar**

- `StockFilters`, `StockTable`, `StockMobileCards`, `vehicleAdapter`, endpoint admin.

**Modificar**

- `src/app/admin/stock/page.jsx`
- `src/components/crm/stock/StockFilters.jsx`
- `src/components/crm/stock/StockTable.jsx`
- `src/components/crm/stock/StockMobileCards.jsx`

**Prioridad:** P0  
**Riesgo:** Medio  
**Dependencias sensibles:** campos de `Car`, estados y visibilidad publica.

### 6.4 Detalle de vehiculo

**Sote**

- Vista integral con datos tecnicos, compra, propietario, consignacion, gastos, documentos, imagenes, publicacion e historial.

**AutoSporting**

- Tiene paneles para detalle, finanzas, gastos, historial, documentos, imagenes, acciones y estado web.

**Gaps**

- El componente `VehicleDocumentsDemo` indica cobertura no definitiva.
- El mensaje de vehiculo inexistente aun habla de base de demostracion.
- Falta verificar que todas las ediciones se persistan y que cada panel tenga permisos propios.
- La densidad y el orden de bloques no son completamente uniformes.

**Reutilizar**

- Componentes actuales de `src/components/crm/stock/**` y endpoints admin.

**Modificar**

- `src/app/admin/stock/[id]/page.jsx`
- `src/components/crm/stock/VehicleDetail*.jsx`
- `src/components/crm/stock/VehicleDocumentsDemo.jsx`
- `src/components/crm/stock/VehicleFinancialPanel.jsx`
- `src/components/crm/stock/VehicleImagesPanel.jsx`

**Prioridad:** P0  
**Riesgo:** Alto  
**Dependencias sensibles:** imagenes, auditoria, gastos, venta, reserva y datos privados.

### 6.5 Alta y edicion de vehiculo

**Sote**

- Formulario completo por secciones, validaciones, datos de origen/propietario, compra, venta, documentacion, imagenes y publicacion.

**AutoSporting**

- El modelo y los endpoints soportan gran parte de esos campos.
- La pantalla de stock abre `VehicleFormDemo`.

**Gaps**

- El formulario demo no representa el contrato completo de `Car`.
- No existe una unica fuente de verdad de validacion frontend/backend.
- Riesgo de perder campos existentes al editar parcialmente.
- Debe preservar la separacion entre datos publicos e internos.

**Reutilizar**

- Modelo `Car`, endpoints de alta/edicion, uploader e infraestructura Cloudinary.

**Modificar**

- `src/components/crm/stock/VehicleFormDemo.jsx`
- `src/app/admin/stock/page.jsx`
- `src/app/admin/stock/[id]/page.jsx`
- hooks de autos y, solo si es necesario, rutas de vehiculos en `server.js`.

**Prioridad:** P0 critico  
**Riesgo:** Alto  
**Dependencias sensibles:** imagenes, campos numericos, estados, visibilidad, auditoria y catalogo publico.

### 6.6 Clientes

**Sote**

- Listado compacto y detalle rico con actividad, vinculaciones y comunicaciones.

**AutoSporting**

- Listado, filtros, resumen, modal de alta, detalle, actividad, ventas y leads relacionados.
- Endpoint con allowlist de campos al crear.

**Gaps**

- La cabecera de AutoSporting incorpora KPIs que pueden diferir de la referencia.
- Falta paginacion visible aunque el endpoint ya devuelve paginas.
- Deben unificarse modal, tabla, badges y estados vacios.

**Reutilizar**

- Hooks, endpoints, modelos y componentes actuales.

**Modificar**

- `src/app/admin/clientes/**`
- `src/components/crm/clients/**`

**Prioridad:** P1  
**Riesgo:** Medio  
**Dependencias sensibles:** normalizacion de telefono/email y vinculaciones.

### 6.7 Cotizaciones/leads

**Sote**

- Cotizaciones como flujo comercial, con lista, filtros, detalle y conversion.

**AutoSporting**

- `/admin/leads` se presenta como Cotizaciones.
- Lista y Kanban, prioridades, fuentes, vinculacion a cliente y tareas.

**Gaps**

- El resumen superior de cinco KPIs agrega una estructura no equivalente.
- Debe definirse con precision que es cotizacion, consulta web y lead para evitar estados duplicados.
- Falta comprobar conversion completa cotizacion -> cliente -> reserva/venta.

**Reutilizar**

- Modelo Lead, hooks, tabla, Kanban, detalle y modales.

**Modificar**

- `src/app/admin/leads/**`
- `src/components/crm/leads/**`

**Prioridad:** P1  
**Riesgo:** Medio-Alto  
**Dependencias sensibles:** pipeline, cliente, vehiculo, tareas y ventas.

### 6.8 Calendario y alertas

**Sote**

- Calendario mensual, proximos eventos, filtros y modal detallado.
- Alertas agrupadas y plegables por prioridad.

**AutoSporting**

- Implementacion amplia y visualmente cercana.
- Modal de tareas/eventos, agrupacion y endpoints de tareas.

**Gaps**

- `agenda/page.jsx` tiene 733 lineas y `alertas/page.jsx` 468; alto acoplamiento visual/funcional.
- El modal conserva estilos locales y no usa un `CrmModal` compartido.
- Requiere pruebas de creacion, edicion, autorizacion, cierre, scroll y mobile.

**Reutilizar**

- Logica de fechas, endpoints, `CrmTaskModal` y agrupaciones actuales.

**Modificar**

- `src/app/admin/agenda/page.jsx`
- `src/app/admin/alertas/page.jsx`
- `src/components/crm/agenda/**`

**Prioridad:** P1  
**Riesgo:** Medio  
**Dependencias sensibles:** zona horaria, JWT, permisos y tareas.

### 6.9 Ventas y reservas

**Sote**

- Reservas integradas en Ventas.
- Alta, filtros, detalle, documentos, entrega, permuta, seña, cuotas y auditoria.

**AutoSporting**

- Ventas y reservas ya estan integradas por pestana.
- Filtros muy similares.
- Alta de venta, drawer, detalle dedicado, conversion de reserva, anulacion y permutas.
- Endpoints extensos para vinculacion y conversion.

**Gaps**

- La ruta `/admin/reservas` aun existe y puede crear una arquitectura duplicada.
- Debe definirse si queda como redirect, vista interna o ruta legacy.
- El detalle usa varios paneles con estilos propios.
- Validar consistencia entre seña, precio, permuta, saldo, cuotas y finanzas.

**Reutilizar**

- Casi toda la logica de dominio actual.

**Modificar**

- `src/app/admin/ventas/**`
- `src/app/admin/reservas/page.jsx`
- `src/components/crm/sales/**`
- `src/components/crm/reservations/**`

**Prioridad:** P0-P1  
**Riesgo:** Alto  
**Dependencias sensibles:** stock, cliente, reserva, transacciones, cuotas, comisiones y auditoria.

### 6.10 Mi Espacio

**Sote**

- Espacio personal con ventas, urgencias, pagos, deudas, gastos, cuotas, saldo agencia, autos, patrimonio, calendario y contactos.
- Cada pestaña tiene acciones y datos especializados.

**AutoSporting**

- Tiene 14 tabs y acciones para crear movimientos o tareas.
- Usa ventas, transacciones, cuotas, tareas y autos.

**Gaps**

- `page.jsx` tiene 1263 lineas.
- `PlaceholderPanels` se usa en Mis autos y Patrimonio.
- Varias metricas del saldo agencia estan fijadas a cero.
- El dominio personal se modela parcialmente con marcadores de texto en notas, lo que es fragil.
- Falta separar datos personales de datos comerciales con contratos explicitos.

**Reutilizar**

- Hooks actuales y `PersonalTransaction`.

**Modificar**

- `src/app/admin/mi-espacio/page.jsx`
- `src/components/crm/finance/Personal*.jsx`
- modelos/endpoints personales solo cuando el contrato funcional este aprobado.

**Prioridad:** P0 funcional  
**Riesgo:** Alto  
**Dependencias sensibles:** privacidad por usuario, finanzas y permisos.

### 6.11 Finanzas

**Sote**

- Dieciocho submodulos especializados y conectados.

**AutoSporting**

- Replica las tabs y posee resumen, movimientos, señas y gastos personales reales.
- Carga transacciones y depositos.

**Gaps**

- La mayoria de las tabs cae en `FinanceTabPlaceholder`.
- El placeholder dice que la vista esta preparada pero sin registros especificos.
- Esto produce similitud visual superficial, no equivalencia funcional.
- `page.jsx` tiene 995 lineas.
- `TransactionModal` y tablas usan una gran cantidad de estilos neutral/hardcodeados.

**Reutilizar**

- Transacciones, cuentas, señas, ventas, cuotas y componentes financieros existentes.

**Modificar**

- `src/app/admin/finanzas/page.jsx`
- `src/components/crm/finance/**`
- `src/models/Account.js`
- `src/models/Transaction.js`
- endpoints financieros de `server.js`, solo por subfase aprobada.

**Prioridad:** P0 critico  
**Riesgo:** Muy alto  
**Dependencias sensibles:** saldos, anulaciones, monedas, caja, ventas, reservas y auditoria.

### 6.12 Cuotas y cobranzas

**Sote**

- Cuotas y cobrar/pagar integrados al centro financiero y al detalle de venta.

**AutoSporting**

- Rutas dedicadas, filtros, modales, generacion, pagos y estados.
- Endpoints CRUD y generacion desde ventas.

**Gaps**

- Arquitectura distinta: paginas separadas mas tabs financieras.
- Riesgo de mostrar dos fuentes de verdad.
- Falta una matriz clara de estados: pendiente, parcial, pagada, vencida, anulada.
- Falta asegurar idempotencia al registrar pagos.

**Reutilizar**

- Modelo Installment, hooks, filtros, tablas y modales.

**Modificar**

- `src/app/admin/cuotas/page.jsx`
- `src/app/admin/cobranzas/page.jsx`
- `src/components/crm/installments/**`
- `src/components/crm/collections/**`
- panel de cuotas del detalle de venta.

**Prioridad:** P0-P1  
**Riesgo:** Alto  
**Dependencias sensibles:** saldo de venta, pagos, monedas, fechas y finanzas.

### 6.13 Reportes

**Sote**

- Paneles densos, filtros y exportacion/impresion.

**AutoSporting**

- Resumen, stock, ventas, tareas, operaciones, filtros, exportacion e impresion.

**Gaps**

- Muchos componentes usan colores hardcodeados y estilos neutral.
- Falta definir una fuente de calculo unica para cada KPI.
- La vista de impresion debe mantenerse clara y separada del dark mode.

**Reutilizar**

- Componentes y ruta de impresion actuales.

**Modificar**

- `src/app/admin/reportes/page.jsx`
- `src/components/crm/reports/**`
- no aplicar dark tokens a `src/app/admin/reportes/imprimir/page.jsx`.

**Prioridad:** P2  
**Riesgo:** Medio  
**Dependencias sensibles:** calculos y filtros por fecha/moneda.

### 6.14 Configuracion, usuarios y plantillas

**Sote**

- Administracion compacta, permisos, usuarios, configuracion y plantillas consistentes.

**AutoSporting**

- Usuarios con roles/permisos, configuracion general y plantillas CRUD.
- Guards por permiso.

**Gaps**

- Usuarios conserva headers y modales con estilos propios.
- Cambio de contraseña usa `prompt()` nativo.
- Plantillas conserva colores hex hardcodeados.
- Falta un patron compartido de tabla, modal y confirmacion.

**Reutilizar**

- Endpoints, guards, modelos y managers actuales.

**Modificar**

- `src/app/admin/configuracion/**`
- `src/components/crm/settings/**`
- `src/components/crm/templates/**`

**Prioridad:** P1-P2  
**Riesgo:** Medio-Alto  
**Dependencias sensibles:** permisos, contraseñas y plantillas de comunicacion.

### 6.15 Operacion secundaria

Incluye pedidos, postventa, expedientes, gestoria, consignaciones, infracciones, telefonos, documentacion, equipo y productividad.

**Estado**

- AutoSporting tiene una cobertura de rutas superior a la version inicial.
- La mayoria usa datos y formularios reales.
- El diseño es razonablemente coherente, pero cada modulo define sus propios controles.

**Gaps**

- Profundidad funcional no revalidada en Sote durante esta sesion.
- Falta estandarizar tablas, modales, filtros, empty states y mobile.
- Deben verificarse transiciones entre modulos y permisos.

**Prioridad:** P1-P3 segun modulo  
**Riesgo:** Medio  
**Dependencias sensibles:** ventas, vehiculos, clientes, tareas y usuarios.

## 7. Gaps funcionales

1. Alta de vehiculo todavia implementada como demo.
2. Documentacion del vehiculo contiene un componente demo.
3. Multiples subpestanas financieras son placeholders.
4. Mi Espacio usa placeholders visuales en partes de Patrimonio y Mis autos.
5. Metricas de saldo agencia no calculadas en todos los casos.
6. Busqueda global del header no tiene comportamiento.
7. Acciones de Vista previa, exportacion y mandato de Stock requieren validacion funcional.
8. Duplicidad potencial entre reservas integradas y `/admin/reservas`.
9. Duplicidad conceptual entre Finanzas, Cuotas y Cobranzas.
10. Cambios de contraseña mediante `prompt()` nativo.
11. Falta paginacion visible en listados cuyo backend ya la soporta.
12. Falta verificar permisos granulares en acciones, no solo en paginas.
13. Falta cobertura automatizada para conversion reserva-venta, permutas, cuotas y saldos.
14. Falta un contrato formal de estados compartidos entre modelos y UI.
15. Falta asegurar idempotencia y auditoria en acciones financieras.

## 8. Gaps visuales

El escaneo encontro una adopcion incompleta de tokens:

- 254 usos de `border-neutral*` en 35 archivos.
- 127 usos de `bg-neutral*` en 41 archivos.
- 416 usos de `text-neutral*` en 47 archivos.
- 285 fondos hex hardcodeados en 65 archivos.
- 208 textos hex hardcodeados en 39 archivos.
- 248 bordes hex hardcodeados en 47 archivos.

Tambien existen algunos usos de fondos claros, concentrados en rutas o componentes especificos. La vista de impresion es una excepcion valida y no debe oscurecerse.

Principales inconsistencias:

1. Radios entre 8, 12 y 16 px sin una regla de dominio.
2. Cards con padding, altura y jerarquia diferentes.
3. Tablas con headers y hover no unificados.
4. Modales con overlays, tamaños y footers distintos.
5. Inputs con altura y focus diferentes.
6. Badges sin una matriz unica de estados.
7. Botones que mezclan gradiente, color plano y estilos nativos.
8. Iconografia mezclada entre Lucide y emojis.
9. Empty states con diferentes tamaños, iconos y mensajes.
10. Componentes de dashboard, reportes, postventa, finanzas y equipo con colores hardcodeados.

## 9. Gaps de UX

1. La busqueda global parece interactiva pero no hace nada.
2. Acciones visibles sin confirmacion de funcionalidad generan falsas expectativas.
3. Flujos financieros se ven disponibles aunque varias tabs sean placeholders.
4. Formularios largos no comparten stepper, secciones colapsables ni validacion uniforme.
5. Uso de `alert()`, `confirm()` y `prompt()` nativos.
6. Falta feedback consistente de guardado, error, reintento y carga.
7. Falta preservar filtros y tab activa al volver desde un detalle.
8. Falta estrategia uniforme para tablas anchas en mobile.
9. Bottom nav y sidebar no siempre representan el mismo mapa por rol.
10. La arquitectura de rutas no siempre refleja la arquitectura visual, especialmente reservas y finanzas.

## 10. Riesgos tecnicos

### Riesgo alto: `server.js` monolitico

Los endpoints administrativos, autenticacion, auditoria y dominios operativos conviven en un archivo de miles de lineas. No debe refactorizarse de forma amplia durante la migracion visual. Cualquier cambio backend debe ser pequeño, testeable y por dominio.

### Riesgo alto: finanzas

Cambiar vistas o estados sin una fuente de verdad puede alterar saldos, cuotas, señas o resultados.

### Riesgo alto: vehiculos publicos vs privados

El formulario completo de vehiculo puede introducir campos internos. Nunca deben exponerse en `/api/public/cars`.

### Riesgo alto: ventas y reservas

La conversion afecta cliente, stock, seña, venta, auditoria y posiblemente transacciones.

### Riesgo medio: permisos

Ocultar una pagina no reemplaza validar cada endpoint y accion.

### Riesgo medio: componentes monoliticos

- Mi Espacio: 1263 lineas.
- Finanzas: 995 lineas.
- Calendario: 733 lineas.
- Alertas: 468 lineas.
- Ventas: 394 lineas.
- Cobranzas: 390 lineas.

Extraer componentes debe hacerse sin reescribir logica ni cambiar contratos.

### Riesgo medio: datos historicos

Hay campos opcionales y estados heredados. Los adaptadores deben soportar registros antiguos.

### Riesgo medio: responsive

Los fixes de scroll y drawer ya tuvieron regresiones. Deben probarse en navegador real, no solo por clases CSS.

### Riesgo bajo-medio: trabajo no versionado

Al momento del analisis ya existian archivos no rastreados ajenos a este documento:

- `src/app/api/test-sales/`
- `test-sales.js`

No se tocaron. Deben revisarse antes de cualquier commit futuro.

## 11. Sistema visual recomendado

Mantener los tokens actuales como base y agregar tokens semanticos:

### Radios

- Control: 8 px.
- Card: 8 px.
- Modal/drawer: 10-12 px.
- Pill/badge: 999 px solo para estados compactos.

### Alturas

- Input/select: 40 px desktop, 44 px mobile.
- Button small: 32 px.
- Button normal: 36-40 px.
- Icon button: 36 px desktop, 44 px mobile.
- Header: 56 px.

### Tipografia

- Page title: 24-26 px, peso 700.
- Section title: 14-16 px, peso 700.
- Body: 14 px.
- Table: 12-13 px.
- Label uppercase: 10-11 px.
- Caption: 11-12 px.

### Spacing

- Page: 16 px mobile, 24 px desktop.
- Secciones: 20-24 px.
- Card: 16 px.
- Grid gap: 12-16 px.
- Toolbar gap: 8-12 px.

### Sombras

- Surface normal: sin sombra o sombra minima.
- Modal/dropdown: sombra fuerte neutra.
- Accion primaria: glow rojo solo en CTA principal, no en todos los botones.

### Estados

- Disponible/ok: verde.
- Reservado/advertencia: amarillo.
- Vendido/cerrado: azul o neutro segun contexto.
- Cancelado/error: rojo.
- Pendiente: gris/ambar.
- Informativo: azul.

## 12. Componentes base a consolidar

1. `CrmPageHeader`
2. `CrmSectionHeader`
3. `CrmButton`
4. `CrmIconButton`
5. `CrmCard`
6. `CrmKpiCard`
7. `CrmInput`
8. `CrmSelect`
9. `CrmTextarea`
10. `CrmDateField`
11. `CrmCheckbox`
12. `CrmSwitch`
13. `CrmBadge`
14. `CrmTabs`
15. `CrmToolbar`
16. `CrmFilterChip`
17. `CrmTable`
18. `CrmMobileList`
19. `CrmModal`
20. `CrmDrawer`
21. `CrmEmptyState`
22. `CrmSkeleton`
23. `CrmTimeline`
24. `CrmConfirmDialog`

No se recomienda crear todos de una vez. Deben extraerse al migrar un flujo real y solo cuando eliminen duplicacion comprobada.

## 13. Plan de implementacion por fases

### Fase 0 - Seguridad, baseline y evidencia

**Objetivo:** congelar comportamiento y establecer una referencia verificable.

**Resultado esperado:** capturas desktop/mobile, mapa de rutas, estado Git y checklist de datos sensibles.

**Archivos:** ninguno de producto; solo documentacion y pruebas.

**Validaciones:**

- `node --check server.js`
- `npm.cmd run build`
- login por rol;
- endpoints publicos sin campos privados;
- capturas de Sote y AutoSporting con datos anonimizados.

**No tocar:** modelos, datos, endpoints y autenticacion.

**Aceptacion:** baseline reproducible y aprobado.

**Riesgo:** Bajo.

### Fase 1 - Shell y header

**Objetivo:** completar navegación y header operativo.

**Archivos:**

- `src/components/crm/layout/CrmHeader.jsx`
- `CrmSidebar.jsx`
- `CrmBottomNav.jsx`
- `CrmShell.jsx`

**Cambios:**

- busqueda global funcional;
- pills operativas con datos reales;
- user menu;
- iconografia consistente;
- accesibilidad y permisos.

**No tocar:** JWT y login.

**Aceptacion:** paridad visual desktop/mobile y navegación completa por rol.

**Riesgo:** Medio.

### Fase 2 - Sistema UI compartido

**Objetivo:** consolidar componentes al migrar pantallas reales.

**Archivos:**

- `src/components/crm/ui/**`
- `tailwind.config.js`
- estilos globales relacionados.

**Cambios:**

- modal, drawer, table, toolbar, page header, empty state, skeleton y confirm dialog.

**No tocar:** logica de dominio.

**Aceptacion:** una pagina piloto usa las primitivas sin diferencias visuales.

**Riesgo:** Medio.

### Fase 3 - Stock listado

**Objetivo:** cerrar acciones y paridad del listado.

**Archivos:**

- `src/app/admin/stock/page.jsx`
- `src/components/crm/stock/StockFilters.jsx`
- `StockTable.jsx`
- `StockMobileCards.jsx`

**Validaciones:** filtros, tabs, exportacion, preview, paginacion, estados vacios y mobile.

**No tocar:** proyeccion publica.

**Aceptacion:** mismas zonas, densidad y acciones que la referencia, con datos AutoSporting.

**Riesgo:** Medio.

### Fase 4 - Detalle de vehiculo

**Objetivo:** eliminar restos demo y completar paneles.

**Archivos:**

- `src/app/admin/stock/[id]/page.jsx`
- `src/components/crm/stock/Vehicle*.jsx`

**Validaciones:** datos viejos, gastos, documentos, imagenes, auditoria y permisos.

**No tocar:** ventas o finanzas salvo lectura.

**Aceptacion:** todos los paneles muestran datos reales y las acciones persisten.

**Riesgo:** Alto.

### Fase 5 - Alta/edicion de vehiculo

**Objetivo:** reemplazar `VehicleFormDemo` por formulario real completo.

**Archivos:**

- `src/components/crm/stock/VehicleFormDemo.jsx` o reemplazo definitivo.
- hooks de autos.
- endpoints de autos solo si el contrato actual no alcanza.

**Validaciones:**

- alta y edicion;
- imagenes;
- propietario/consignacion;
- compra y precio;
- estado y visibilidad;
- registro historico;
- API publica sin datos internos.

**No tocar:** datos existentes mediante migracion destructiva.

**Aceptacion:** crear, editar y volver a abrir conserva todos los campos.

**Riesgo:** Alto.

### Fase 6 - Reservas dentro de Ventas

**Objetivo:** definir una unica arquitectura de reservas.

**Archivos:**

- `src/app/admin/ventas/page.jsx`
- `src/app/admin/reservas/page.jsx`
- `src/components/crm/reservations/**`

**Validaciones:** crear, cancelar, vencer, devolver, retener y convertir.

**No tocar:** calculos financieros no aprobados.

**Aceptacion:** no hay dos fuentes de verdad ni navegación duplicada.

**Riesgo:** Alto.

### Fase 7 - Ventas

**Objetivo:** cerrar alta, listado y expediente comercial.

**Archivos:**

- `src/app/admin/ventas/**`
- `src/components/crm/sales/**`

**Validaciones:** cliente manual/existente, vehiculo, seña, permuta, comision, documentos, entrega, cancelacion y auditoria.

**No tocar:** historicos mediante scripts no revisados.

**Aceptacion:** flujo end-to-end sin inconsistencias de saldo o stock.

**Riesgo:** Alto.

### Fase 8 - Cuotas y cobranzas

**Objetivo:** unificar estados y fuente de verdad.

**Archivos:**

- `src/app/admin/cuotas/page.jsx`
- `src/app/admin/cobranzas/page.jsx`
- `src/components/crm/installments/**`
- `src/components/crm/collections/**`

**Validaciones:** generacion, vencimiento, pago parcial/total, anulacion e idempotencia.

**No tocar:** saldos manualmente.

**Aceptacion:** saldo de venta, cuotas y cobranzas coinciden.

**Riesgo:** Alto.

### Fase 9 - Finanzas

**Objetivo:** reemplazar cada placeholder por una subvista real.

**Estrategia:** una subpestana por subfase, empezando por Cuentas, Cobrar/Pagar, Comisiones y Rentabilidad.

**Archivos:**

- `src/app/admin/finanzas/page.jsx`
- `src/components/crm/finance/**`
- modelos/endpoints solo cuando sean necesarios.

**Validaciones:** doble moneda, anulaciones, saldos, trazabilidad y permisos.

**No tocar:** varias subpestanas en una sola entrega.

**Aceptacion:** ninguna tab visible es placeholder ni simula disponibilidad.

**Riesgo:** Muy alto.

### Fase 10 - Clientes y cotizaciones

**Objetivo:** consolidar ciclo comercial.

**Archivos:**

- `src/app/admin/clientes/**`
- `src/app/admin/leads/**`
- `src/components/crm/clients/**`
- `src/components/crm/leads/**`

**Validaciones:** duplicados, normalizacion, vinculaciones, historial y conversion.

**No tocar:** registros mediante merge automatico sin confirmacion.

**Aceptacion:** trazabilidad completa desde consulta hasta venta.

**Riesgo:** Medio-Alto.

### Fase 11 - Configuracion, usuarios y plantillas

**Objetivo:** unificar administracion y eliminar controles nativos.

**Archivos:**

- `src/app/admin/configuracion/**`
- `src/components/crm/settings/**`
- `src/components/crm/templates/**`

**Validaciones:** roles, permisos, alta/edicion, contraseña, plantillas y variables.

**No tocar:** hashes, secretos ni permisos backend sin pruebas.

**Aceptacion:** UI consistente y acciones protegidas.

**Riesgo:** Medio-Alto.

### Fase 12 - Responsive, QA y limpieza

**Objetivo:** validar el sistema completo y retirar duplicacion comprobada.

**Validaciones:**

- 360x800, 390x844, 768x1024, 1366x768 y 1920x1080;
- drawer, sidebar y bottom nav;
- tablas, modales y scroll;
- loading, empty, error y permisos;
- comparacion visual lado a lado;
- `node --check server.js`;
- `npm.cmd run build`.

**No tocar:** rutas legacy o datos sin inventario previo.

**Aceptacion:** cero desbordes bloqueantes, cero botones falsos y cero campos privados publicos.

**Riesgo:** Medio.

## 14. Orden recomendado de ejecucion

1. Fase 0.
2. Fase 5: alta/edicion de vehiculo, porque hoy es el gap critico mas evidente.
3. Fase 4: detalle de vehiculo.
4. Fase 3: cierre de Stock.
5. Fase 6: reservas.
6. Fase 7: ventas.
7. Fase 8: cuotas/cobranzas.
8. Fase 9 por subpestanas.
9. Fase 10.
10. Fase 11.
11. Fases 1 y 2 aplicadas incrementalmente durante los modulos.
12. Fase 12.

Aunque el shell se enumera primero conceptualmente, no conviene rehacerlo antes de resolver los componentes demo y placeholders funcionales. La extraccion del sistema UI debe acompañar casos reales para evitar una biblioteca teorica que luego no encaje.

## 15. Checklist final

### Visual

- [ ] Sidebar, header y contenido mantienen proporciones equivalentes.
- [ ] Todos los controles usan tokens semanticos.
- [ ] No quedan cards blancas, inputs claros o modales incongruentes.
- [ ] Radios, alturas, paddings y tipografia son consistentes.
- [ ] Iconos pertenecen a un unico sistema.
- [ ] Tablas desktop y cards mobile expresan la misma informacion.
- [ ] Estados vacios, loading y error siguen un patron comun.

### Funcional

- [ ] Busqueda global navega a resultados reales.
- [ ] Alta y edicion de vehiculo persisten todos los campos.
- [ ] Detalle de vehiculo no contiene componentes demo.
- [ ] Reserva puede crearse, cancelarse y convertirse.
- [ ] Venta actualiza stock y conserva trazabilidad.
- [ ] Seña, permuta, saldo y cuotas coinciden.
- [ ] Ninguna tab financiera visible es placeholder.
- [ ] Acciones de Mi Espacio persisten por usuario.
- [ ] Usuarios y permisos se validan en frontend y backend.
- [ ] Plantillas resuelven variables sin exponer datos.

### Seguridad

- [ ] Ningun endpoint publico expone compra, gastos, margen, propietario, notas, patente/VIN o auditoria.
- [ ] No hay credenciales en codigo, logs o documentacion.
- [ ] Todos los endpoints administrativos requieren autenticacion.
- [ ] Acciones sensibles validan permisos en servidor.
- [ ] No se registran tokens o contraseñas en consola.

### QA

- [ ] `node --check server.js` exitoso.
- [ ] `npm.cmd run build` exitoso.
- [ ] Flujos criticos probados con datos de prueba.
- [ ] Mobile probado en dispositivo real.
- [ ] Capturas comparativas aprobadas.
- [ ] Git diff revisado sin archivos ajenos.

## 16. Recomendaciones para implementar sin romper

1. Trabajar una pantalla o subflujo por entrega.
2. Crear una captura baseline antes de cada cambio.
3. No modificar visual y backend simultaneamente salvo necesidad demostrada.
4. Mantener adaptadores para datos historicos.
5. Agregar pruebas de contrato antes de cambiar payloads.
6. No tocar endpoints publicos al estilizar el admin.
7. Validar permisos en servidor aunque el boton este oculto.
8. Sustituir `alert`, `confirm` y `prompt` por componentes compartidos gradualmente.
9. Migrar estilos hardcodeados al tocar cada componente, no mediante reemplazo masivo.
10. Evitar una refactorizacion general de `server.js` durante la paridad visual.
11. Separar cada subpestana financiera como tarea independiente.
12. Revisar los archivos no rastreados antes de preparar commits.

## 17. Preguntas abiertas

1. ¿Que subpestanas financieras de Sote son realmente necesarias para AutoSporting?
2. ¿La ruta `/admin/reservas` debe redirigir a Ventas > Reservas o conservarse para compatibilidad?
3. ¿Mi Espacio debe ser privado por usuario o visible para owner/admin?
4. ¿Que campos del alta de vehiculo son obligatorios para AutoSporting?
5. ¿Como se calcula oficialmente margen, ganancia, comisiones y saldo pendiente?
6. ¿Hay multiples cuentas/cajas reales o solo una caja ARS y una USD?
7. ¿La busqueda global debe abrir resultados agrupados o navegar directamente?
8. ¿Que roles pueden ver costos, margenes y finanzas?
9. ¿Cuales son las reglas exactas de reserva vencida, retenida y devuelta?
10. ¿Se conservaran todas las rutas operativas nuevas aunque Sote cambie su mapa?
11. ¿Se dispone de capturas anonimizadas de Sote para stock detalle, alta/edicion, finanzas y mobile?
12. ¿Los archivos `src/app/api/test-sales/` y `test-sales.js` son pruebas temporales o deben formar parte del producto?

## 18. Evidencia faltante para cerrar una paridad verificable

Para afirmar una equivalencia superior al 95% se necesitan capturas actuales, anonimizadas y con el mismo viewport de:

- Sote y AutoSporting: detalle de vehiculo.
- Sote y AutoSporting: alta/edicion de vehiculo completa.
- Sote y AutoSporting: una venta con datos.
- Sote y AutoSporting: reserva activa y conversion.
- Sote y AutoSporting: cliente/cotizacion con historial.
- Sote y AutoSporting: cada subpestana financiera prioritaria.
- Sote y AutoSporting: usuarios y plantillas.
- Mobile: sidebar, tabla/card, modal largo y formulario.

Sin esta evidencia se puede lograr una cercania alta, pero no certificar una igualdad visual del 100%.

## 19. Confirmacion de alcance de esta etapa

- No se modifico codigo de producto.
- No se modifico `server.js`.
- No se modificaron endpoints.
- No se modificaron modelos ni datos.
- No se instalaron dependencias.
- No se ejecutaron migraciones.
- No se agregaron credenciales.
- No se hizo `git add`, commit ni push.
- El unico archivo creado es este informe.
