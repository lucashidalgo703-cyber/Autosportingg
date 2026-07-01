# Prompts listos para Antigravity

## Prompt 0 - Auditoría de AutoSporting

### Contexto

Necesitamos comparar AutoSporting con un baseline de CRM automotriz, pero antes hay que identificar la arquitectura real del repositorio.

### Objetivo

Hacer una auditoría de solo lectura y crear un mapa verificable de rutas, componentes, modelos, APIs, permisos y estado por módulo.

### Archivos probables

Localizá, sin asumir nombres:

- Manifest y configuración del framework.
- Router y layouts.
- Directorios `pages`, `app`, `routes`, `views` o equivalentes.
- Componentes UI.
- Servicios/API clients.
- Schemas, migrations, types y stores.
- Middleware/auth/permissions.

### Cambios requeridos

- No modificar producto.
- Crear un informe con paths reales.
- Marcar cada módulo como completo, parcial, mock, roto o inexistente.
- Identificar comandos rápidos de lint, typecheck y test.

### Restricciones

- No ejecutar builds largos.
- No mostrar secretos.
- No modificar `.env`.
- No inferir funcionalidades sin evidencia.

### Criterios de aceptación

- Tabla ruta -> archivo -> rol -> datos.
- Tabla entidad -> schema -> servicio -> consumidores.
- Lista de componentes reutilizables.
- Lista de riesgos P0/P1/P2.

### No tocar

- Código de negocio.
- Base de datos.
- Dependencias.

### Validación

- Cada afirmación debe incluir path o evidencia navegable.

---

## Prompt 1 - Sistema visual global

### Contexto

El baseline usa un tema oscuro con fondo casi negro, superficies diferenciadas, bordes finos, Inter, radios de 8/12 px, badges semánticos y CTA rojo con gradiente.

### Objetivo

Adaptar el design system de AutoSporting para lograr equivalencia visual sin copiar marca, textos ni assets.

### Archivos probables

- Tokens/theme.
- CSS global.
- Configuración Tailwind o equivalente.
- Button, Input, Select, Card, Badge, Tabs, Table y Dialog.

### Cambios requeridos

- Crear tokens semánticos, no colores hardcodeados por pantalla.
- Normalizar estados hover, focus, disabled, loading y error.
- Mantener contraste AA.
- Unificar iconografía con la librería existente.

### Restricciones

- Reusar la librería actual.
- No introducir otra UI library.
- No cambiar lógica.
- No copiar nombres ni identidad del CRM de referencia.

### Criterios de aceptación

- Componentes consistentes en desktop/mobile.
- Focus visible.
- Sin regresiones de tema.
- Ningún color funcional depende solo del color.

### No tocar

- Modelos, APIs y reglas de negocio.

### Validación

- Revisar estados de cada primitive en una página de demo o módulo existente.

---

## Prompt 2 - Sidebar, header y navegación responsive

### Contexto

El baseline agrupa navegación por Principal, Comercial, Operación, Finanzas, Colaboración y Administración. Desktop usa sidebar y mobile usa menú más bottom nav.

### Objetivo

Implementar un layout equivalente usando las rutas y permisos reales de AutoSporting.

### Archivos probables

- Layout principal.
- Configuración de navegación.
- Sidebar.
- Header.
- Mobile navigation.
- Middleware/RBAC.

### Cambios requeridos

- Definir una fuente única de rutas.
- Filtrar módulos por rol.
- Agregar active state y navegación por teclado.
- Evitar concatenación que duplique prefijos.
- Reservar padding inferior para bottom nav.

### Restricciones

- No renombrar rutas públicas sin plan de redirect.
- No exponer módulos no autorizados.
- No duplicar arrays de navegación.

### Criterios de aceptación

- Refresh y deep links funcionan.
- No existe ningún `/v2/v2/` o prefijo duplicado.
- Sidebar colapsable.
- Bottom nav no cubre contenido.
- Menú usable a 360 px.

### No tocar

- Contenido interno de los módulos.

### Validación

- Probar cada ruta con al menos dos roles y en 360, 768 y 1280 px.

---

## Prompt 3 - Dashboard

### Contexto

El baseline ofrece cockpit ejecutivo y dashboard general con ventas, ganancia, stock, caja, proyección e históricos.

### Objetivo

Crear o reorganizar el dashboard de AutoSporting con métricas derivadas de fuentes existentes y enlaces a detalle.

### Archivos probables

- Página dashboard.
- KPI cards.
- Charts.
- Servicios/hook de agregación.
- Utilidades monetarias.

### Cambios requeridos

- Documentar fórmula de cada KPI.
- Separar loading de valor cero.
- Soportar ARS/USD sin sumar monedas incompatibles.
- Enlazar cards a vistas filtradas.
- Agregar empty/error states.

### Restricciones

- No duplicar cálculos en frontend si existe fuente backend.
- No inventar datos.
- No ocultar errores como cero.

### Criterios de aceptación

- KPIs reconcilian con módulos fuente.
- Loading no muestra ceros falsos.
- Mobile mantiene jerarquía.
- Montos sensibles respetan permisos.

### No tocar

- Reglas de cierre de venta y movimientos financieros.

### Validación

- Comparar cada KPI con una consulta o fixture controlado.

---

## Prompt 4 - Stock, ficha y formulario de vehículo

### Contexto

El baseline combina lista filtrable, estados operativos, detalle rápido, alta/edición por secciones, fotos y acciones comerciales.

### Objetivo

Llevar Stock de AutoSporting a equivalencia funcional y responsive usando el schema existente.

### Archivos probables

- Rutas de stock y vehículo.
- Tabla/card.
- Detail dialog/page.
- Vehicle form y schema.
- Upload service.
- Filtros.

### Cambios requeridos

- Normalizar estados.
- Definir cuándo el estado es manual o derivado.
- Detectar duplicados por patente/VIN normalizados.
- Implementar tabla desktop y card mobile.
- Separar detalle de edición.
- Organizar form en Identidad, Precio, Propiedad, Técnicos, Publicación y Fotos.

### Restricciones

- No permitir que una edición contradiga una venta activa.
- No borrar archivos al reemplazar UI.
- No cambiar schema sin migration.

### Criterios de aceptación

- Filtros combinables.
- Acciones según estado y rol.
- Monedas explícitas.
- Fotos con progreso/error.
- Mobile sin scroll horizontal obligatorio.

### No tocar

- Ventas o finanzas salvo adaptadores estrictamente necesarios.

### Validación

- Casos: propio, consignado, reservado, vendido, sin fotos y datos incompletos.

---

## Prompt 5 - Clientes y pipeline

### Contexto

El baseline maneja lista, pipeline, lead source, vehículo de interés, preferencias, ownership y round-robin.

### Objetivo

Mejorar Clientes sin crear duplicados ni romper integraciones.

### Archivos probables

- Clientes/leads.
- Pipeline.
- Client form.
- Deduplicación.
- Assignment service.

### Cambios requeridos

- Auditar si Client y Lead son entidades separadas.
- Normalizar teléfono, DNI y email.
- Incorporar etapas y filtros.
- Mostrar historial y vendedor asignado.
- Hacer reasignaciones auditables.

### Restricciones

- No exponer PII en logs.
- No fusionar registros automáticamente sin preview.
- No cambiar ownership sin permiso.

### Criterios de aceptación

- Deduplicación reproducible.
- Pipeline usable con teclado y mobile.
- Filtros persistentes.
- Empty states accionables.

### No tocar

- Proveedor de mensajería, salvo contrato de lectura.

### Validación

- Crear fixtures con duplicados, datos parciales y múltiples orígenes.

---

## Prompt 6 - Cotizaciones, reservas y ventas

### Contexto

El baseline usa cotizaciones con estados propios y reserva como estado de venta. Señas, permuta, consignación, comisiones y expediente están conectados.

### Objetivo

Implementar un workflow consistente y transaccional.

### Archivos probables

- Quotes.
- Sales.
- Reservations/deposits.
- State machine.
- Commands/use cases.
- Stock integration.
- Commissions.

### Cambios requeridos

- Dibujar estados y transiciones antes de editar.
- Decidir si Reserva es entidad o estado según el modelo real.
- Centralizar efectos de transición.
- Implementar reversión al cancelar o caer.
- Diferenciar carga histórica de operación real.
- Registrar señas múltiples y comprobantes.

### Restricciones

- No actualizar stock, venta y finanzas con llamadas independientes sin estrategia atómica.
- No recalcular comisiones históricas.
- No crear doble seña por retry.

### Criterios de aceptación

- Cada transición tiene precondiciones, permisos y auditoría.
- Cancelar libera stock cuando corresponde.
- Venta histórica no dispara workflows.
- Tests cubren happy path y reversión.

### No tocar

- Branding y navegación global.

### Validación

- Matriz completa de transiciones con fixtures y pruebas de retry.

---

## Prompt 7 - Cobranzas, cuotas y finanzas

### Contexto

El baseline incluye cuotas individuales, planes automáticos, pagos parciales, cuentas, movimientos y por cobrar/pagar.

### Objetivo

Implementar equivalencia financiera con precisión e idempotencia.

### Archivos probables

- Money/value objects.
- Installments.
- Payments.
- Accounts/ledger.
- Receivables/payables.
- Reports.

### Cambios requeridos

- Usar decimal o minor units, nunca float.
- Separar obligación, pago y movimiento.
- Agregar idempotency key.
- Derivar saldos del ledger o reconciliarlos.
- Soportar ARS/USD sin conversión implícita.
- Incorporar mora, próximos vencimientos y pagos parciales.

### Restricciones

- No editar saldos directamente.
- No mezclar monedas.
- No permitir cierre sin permiso.
- No borrar movimientos contabilizados.

### Criterios de aceptación

- Suma de movimientos reconcilia con cuentas.
- Retry no duplica pagos.
- Cuotas parciales conservan saldo.
- Fechas usan timezone definido.

### No tocar

- UI de otros módulos salvo enlaces de lectura.

### Validación

- Tests con redondeo, vencimientos, reversos, pagos parciales y dos monedas.

---

## Prompt 8 - Mensajes, WhatsApp, correo y plantillas

### Contexto

El baseline separa chat interno, WhatsApp y Gmail. Las plantillas de WhatsApp dependen de reglas del proveedor.

### Objetivo

Unificar la experiencia sin mezclar contratos ni secretos.

### Archivos probables

- Messaging UI.
- Webhook handlers.
- Provider adapters.
- Template models.
- OAuth callbacks.
- Lead ingestion.

### Cambios requeridos

- Crear adapter por proveedor.
- Persistir estados de entrega.
- Validar firma de webhooks.
- Hacer ingesta idempotente.
- Versionar plantillas.
- Respetar ventana de mensajería y consentimiento.

### Restricciones

- Tokens solo server-side.
- No enviar mensajes reales en tests.
- No registrar contenido sensible.
- No exponer envío proactivo sin plantilla válida.

### Criterios de aceptación

- Reintentos seguros.
- Conversación vinculada a cliente/lead.
- Fallback visible ante proveedor caído.
- Plantillas con preview y variables validadas.

### No tocar

- Lógica de ventas.

### Validación

- Webhooks simulados, sandbox del proveedor y tests de opt-out.

---

## Prompt 9 - Configuración, usuarios y seguridad

### Contexto

El baseline centraliza parámetros por empresa, roles, 2FA, backups y flags.

### Objetivo

Crear una configuración tipada y una administración segura.

### Archivos probables

- Settings.
- Tenant/company config.
- Users/roles.
- Auth.
- 2FA.
- Audit log.

### Cambios requeridos

- Validar RBAC en backend y frontend.
- Tipar configuración por dominio.
- Auditar cambios.
- Agregar 2FA para roles sensibles.
- Revisar backups y restore.
- Eliminar cualquier contraseña legacy en texto plano.

### Restricciones

- Nunca almacenar, mostrar ni migrar contraseñas en texto plano.
- No incluir secretos en responses de configuración.
- No confiar solo en ocultar botones.

### Criterios de aceptación

- Permisos probados server-side.
- Secrets redactados.
- Cambios auditados.
- Reset de clave revoca sesiones según política.

### No tocar

- Datos productivos durante validación.

### Validación

- Tests de autorización negativa y revisión de payloads.

---

## Prompt 10 - QA responsive, accesibilidad y cierre

### Contexto

La referencia tiene una buena base responsive, pero presenta overflow horizontal, solapamientos y un warning accesible en diálogos.

### Objetivo

Cerrar inconsistencias sin refactors no relacionados.

### Archivos probables

- Layout.
- Tablas/cards.
- Dialogs.
- Formularios.
- Tests E2E/visual.

### Cambios requeridos

- Revisar 360, 390, 768, 1024, 1280 y 1440 px.
- Evitar controles cubiertos por FAB/bottom nav.
- Garantizar nombres y descripciones accesibles.
- Probar zoom 200%.
- Diferenciar loading, empty y error.
- Resolver textos largos, overflow y truncamiento.

### Restricciones

- No cambiar reglas de negocio.
- No ocultar columnas críticas sin alternativa mobile.

### Criterios de aceptación

- Sin scroll horizontal de página.
- Diálogos con título y descripción.
- Navegación completa por teclado.
- Contraste AA.
- Flujos críticos pasan E2E.

### No tocar

- Schemas y APIs salvo bug confirmado.

### Validación

- Capturas comparativas y checklist de `06-checklist-qa-final.md`.
