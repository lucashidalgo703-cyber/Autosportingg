# CRM de referencia - Análisis funcional, visual y técnico

## 1. Resumen ejecutivo

El CRM de referencia es una aplicación de gestión integral para una agencia automotriz. Integra operación comercial, inventario, clientes, cotizaciones, ventas, gestoría, finanzas, colaboración y administración.

La arquitectura de información es amplia y orientada a roles. La interfaz usa tema oscuro, navegación lateral agrupada, header operativo, cards, tablas densas, tabs, badges de estado y formularios modales.

## 2. Evidencia y límites

- Confirmado por navegación autenticada: pantallas, controles, flujos y estados visibles.
- Confirmado por assets: aplicación Next.js con rutas bajo `/v2/`.
- Confirmado por clases: sistema utility-first compatible con Tailwind y tokens `sote-*`.
- Inferido: React y componentes de diálogo tipo Radix por estructura y warning de accesibilidad.
- Confirmado por textos funcionales: Firebase Storage para fotos, Gmail OAuth, integración de WhatsApp mediante webhooks, importación/exportación XLSX y enlace con MercadoLibre.
- No se inspeccionaron datos privados, credenciales, requests con payload ni código fuente.

## 3. Mapa de navegación

### Principal

- Dashboard
- Calendario
- Alertas
- Reportes
- Mi Espacio

### Comercial

- Stock
- Clientes
- Cotizaciones
- Ventas
- Mis ventas

### Operación

- Pedidos
- Postventa
- Expedientes
- Gestoría
- Consignaciones
- Infracciones
- Teléfonos útiles

### Finanzas

- Finanzas
- Tesorería
- Liquidaciones
- Mis Comisiones

### Colaboración

- Mensajes
- WhatsApp
- Correos
- NPS

### Administración

- Autorizaciones
- Dormidos
- Sugerencias
- Papelera
- Configuración

## 4. Layout global

### Desktop

- Sidebar fija de aproximadamente 256 px.
- Agrupación de módulos con subtítulos en mayúsculas.
- Sidebar con scroll propio y bloque de sesión al pie.
- Header sticky de 56 px.
- Búsqueda global.
- Indicadores resumidos de caja, ventas y stock.
- Acceso a suscripción, tema, notificaciones y perfil.
- Botón flotante de acciones rápidas.
- Acceso flotante a mensajes.

### Mobile

- Sidebar reemplazada por menú hamburguesa.
- Header compacto con búsqueda, tema, notificaciones y avatar.
- Bottom navigation fija con Dashboard, Stock, Clientes, Ventas y Calendario.
- Tablas principales transformadas en cards.
- Se mantiene el botón flotante de acción.

## 5. Sistema visual

| Token visible | Valor aproximado |
|---|---|
| Fondo principal | `rgb(11, 11, 13)` |
| Superficie/header/sidebar | `rgb(22, 22, 25)` |
| Superficie de cards/inputs | `rgb(30, 30, 36)` |
| Borde | `rgb(51, 51, 58)` |
| Texto principal | `rgb(250, 250, 250)` |
| Texto secundario | gris zinc |
| Acción primaria | gradiente rojo `#e63027` a `#c42620` |
| Éxito | verde esmeralda |
| Advertencia | ámbar |
| Error/peligro | rojo |
| Radio de inputs/botones | 8 px |
| Radio de cards | 12 px |
| Fuente | Inter con fallbacks de sistema |

Patrones:

- H1 de 24 px y peso 700.
- Botones compactos de 32 px en vistas densas.
- Cards con borde fino y sin sombra, salvo acciones primarias.
- CTA rojo con glow visible.
- Estados con badges tipo pill.
- Inputs oscuros con foco rojo.
- Tabs con borde inferior activo.
- Mezcla de iconos Lucide y emoji.

## 6. Dashboard

### Estructura

- Saludo personalizado y fecha.
- Acción para ocultar montos.
- Subvistas: Cockpit CEO y Dashboard general.
- Bloque de pendientes.
- Hero con avance del mes.
- Navegación por período.
- Indicador de actualización en vivo.

### Métricas

- Autos vendidos contra objetivo.
- Ganancia del mes, objetivo y proyección.
- Ganancia por auto e históricos.
- Operación personal del usuario.
- Comparación interanual.
- Ganancia por infracciones.
- Gestoría y transferencias.
- Calificaciones de ventas.
- Proyección de caja.
- Entradas y salidas previstas.
- Gráfico de 12 meses.
- Resumen anual.

### UX

- Buen nivel de jerarquía y lectura ejecutiva.
- Cards enlazan a módulos de detalle.
- El volumen de información exige scroll considerable.
- La versión móvil conserva jerarquía, pero el botón flotante puede cubrir contenido.

## 7. Stock

### Funciones

- Indicador de unidades disponibles y valor activo.
- Catálogo público.
- Exportación e importación XLSX.
- Alta de vehículo.
- Alta conjunta de mandato y stock.
- Tabs: stock general, consignaciones y mandatos.
- Filtros por estado: disponible, señado, vendido sin confirmar y vendido.
- Búsqueda amplia.
- Filtro por marca.
- Ordenamiento por columnas.
- Integración de publicación en MercadoLibre.
- Acciones por fila: editar, señar y eliminar.

### Tabla desktop

- Vehículo, año, patente/VIN, kilometraje, precio, consignación, estado, ubicación, ingreso, MercadoLibre y acciones.
- Incluye antigüedad en stock y progreso contra plazo objetivo.

### Mobile

- Las filas se convierten en cards compactas.
- Tabs y chips usan scroll horizontal.
- Se observó truncamiento de texto y múltiples barras horizontales.

## 8. Ficha individual de vehículo

La fila abre un modal de detalle con:

- Estado y condición.
- Precio de venta y compra.
- Margen.
- Antigüedad en stock.
- Patente/VIN, kilómetros, color y ubicación.
- Propietario y consignador.
- Datos técnicos.
- Documentación.
- Publicación.
- Acciones Mandato, Señar y Editar.

La elección de modal acelera la consulta, pero puede resultar limitada con mucha información, fotos o historial.

## 9. Alta y edición de vehículo

Formulario organizado por secciones:

- Identidad.
- Tipo, marca, modelo, año, patente/VIN, condición y color.
- Precio de venta y compra.
- Monedas y tipo de cambio congelado.
- Kilometraje, ubicación y estado.
- Propiedad de agencia o tercero.
- Datos técnicos.
- MercadoLibre.
- Notas y fotos.

Reglas visibles:

- Patente/VIN participa en detección de duplicados.
- El estado puede ser sobreescrito por una venta vinculada.
- Las fotos se comprimen y suben a Firebase Storage.
- El costo se congela en USD mediante tipo de cambio.

## 10. Clientes

### Lista y pipeline

- Vista Lista y vista Pipeline.
- Filtros: mis clientes, sin contactar, contactados, compraron, vendieron y todos.
- Búsqueda global.
- Importación/exportación XLSX.
- Selección masiva.

### Alta

- Diferencia entre walk-in y lead digital.
- Round-robin independiente por canal.
- Opción de escaneo de DNI.
- Nombre, tipo, documento, teléfono y email.
- Origen y etapa del pipeline.
- Vehículo de interés.
- Preferencias de búsqueda.
- Presupuesto, moneda y rango de años.
- Vendedor asignado.
- Dirección, notas y adjuntos.

La asignación automática vinculada a canal y vehículo es una fortaleza funcional.

## 11. Cotizaciones

- Estados: pendiente, enviada, en revisión, aprobada, modificada y rechazada.
- Agrupación rápida por pendientes, aprobadas y rechazadas.
- Búsqueda, vendedor y rango de fechas.
- Cliente del CRM o nombre libre.
- Vehículo de stock o descripción libre.
- Datos de permuta y acceso a tasación.
- Precio sugerido, moneda, emisión, vencimiento, condiciones y notas.

## 12. Reservas y señas

No existe un módulo aislado de reservas en la navegación principal.

- Reserva es un estado de venta.
- Seña aparece como acción del vehículo y como colección de pagos dentro de la venta.
- Cada seña admite monto, moneda, fecha y comprobante.
- La seña alimenta liquidación, Tesorería y Gestoría.

Esta unificación evita duplicar operaciones, pero requiere una máquina de estados consistente.

## 13. Ventas

### Lista

- Estados: borrador, activa, reserva, cerrada, caída y cancelada.
- Filtros por texto, vendedor, medio de pago, fechas, mes y permuta.
- Exportación.

### Alta

- Modo normal y carga manual histórica.
- Vehículo de stock o venta libre.
- Estado inicial derivado del vehículo.
- Precio, moneda, vendedor y fecha.
- Comprador vinculado o libre.
- Propietario del vehículo.
- Múltiples señas.
- Método de pago y cuotas.
- Permuta.
- Responsable de consignación y gestor.
- Comisiones automáticas o manuales.
- Venta compartida.
- Checklist de elementos entregados.
- Documentos del expediente.
- Fecha de entrega y notas.

### Integraciones internas

- Una venta puede crear expediente.
- Notifica o alimenta Gestoría y Tesorería.
- Impacta stock, comisiones, caja y reportes.
- La carga histórica evita efectos operativos.

## 14. Cobranzas, cuotas y finanzas

### Resumen

- Saldos por cuenta y moneda.
- Ingresos, egresos y balance.
- Estado de cuotas.
- Flujo de caja.
- Egresos por categoría.

### Pestañas

- Resumen
- Movimientos
- Señas
- Cuotas
- Pagos disponibles
- Tarjeta
- Retiros
- Comisiones
- Rentabilidad
- Cuentas
- Por cobrar/pagar
- Cheques
- Préstamos
- Presupuesto
- Recurrencias
- Arqueos
- Cierre de caja
- Conciliación
- AFIP/IVA

### Cuotas

- KPIs en USD y ARS.
- Pendientes, vencidas y próximas.
- Lista global y detalle por cliente.
- Alta individual.
- Generación de plan automático.
- Pagos parciales gestionados desde el listado.
- Cliente vinculado o cuota suelta.

### Por cobrar/pagar

Por cobrar:

- Valor de vehículos.
- Cuotas.
- Gastos del comprador.

Por pagar:

- Propietarios.
- Transferencias.
- Comisiones.

### Tesorería

- Expedientes activos, procesados y operaciones caídas.
- Búsqueda transversal.
- Enfoque orientado a workflow, no solo a movimientos contables.

## 15. Mensajes, WhatsApp y correo

### Mensajes internos

- Canal general.
- Mensajes directos y grupos.
- Búsqueda, adjuntos y emoji.
- Borrado de historial.

### WhatsApp

- Bandeja de conversaciones.
- Leads con estados y vendedor asignado.
- Sync periódico.
- Alta automática por webhook.
- Round-robin.
- Respuesta libre dentro de ventana de 24 horas.
- Plantillas aprobadas para casos restringidos.
- El envío proactivo a números nuevos todavía no está expuesto en el CRM.

### Correo

- Integración Gmail mediante OAuth.
- Gestión de Client ID visible.
- Sin bandeja hasta conectar cuenta.

## 16. Configuración, usuarios y administración

### Configuración

- Usuarios.
- Empresa.
- Asistente/integración.
- Flags de migración.
- Backups.
- 2FA admin.
- Sistema.

### Empresa

- Suscripción.
- Parámetros de comisiones.
- Stock, tasador y objetivos.
- Gestoría, expedientes e infracciones.
- Fiscal y SLAs.
- Finanzas, recepción y fraude.
- WhatsApp, leaderboard, lead routing y branding.

### Usuarios

- Usuario, email, rol y estado de 2FA.
- Alta, edición, reset de clave y eliminación.
- La UI indica coexistencia temporal de hash bcrypt y contraseña legacy en texto plano.

## 17. Hallazgos UX, técnicos y de seguridad

| Hallazgo | Prioridad | Riesgo |
|---|---:|---:|
| Contraseña legacy en texto plano durante migración | P0 | Alto |
| Rutas visibles duplicadas `/v2/v2/...` | P0 | Medio |
| Warning de diálogo sin descripción accesible | P1 | Medio |
| Tabs y filtros con overflow móvil poco elegante | P1 | Medio |
| Botón flotante puede cubrir cards en móvil | P1 | Medio |
| Finanzas concentra demasiadas tabs en una sola fila | P1 | Medio |
| Modales de venta/vehículo muy extensos | P1 | Medio |
| Carga inicial muestra ceros antes de hidratar datos | P2 | Medio |
| Mezcla de emoji e iconografía vectorial | P2 | Bajo |
| Pluralización incorrecta en algunos contadores | P2 | Bajo |
| Sidebar muy extensa y con doble zona de scroll | P2 | Bajo |

## 18. Fortalezas a conservar

- Integración entre módulos, no pantallas aisladas.
- Estados operativos claros.
- Trazabilidad desde venta a expediente, tesorería y finanzas.
- Filtros y búsquedas adecuados para operación diaria.
- Soporte multimoneda.
- Empty states útiles.
- Acciones rápidas.
- Responsive con navegación dedicada.
- Configuración por empresa.
