# Comparación y gap analysis

## 1. Regla de lectura

Este documento fue actualizado tras la auditoría técnica de solo lectura sobre el repositorio AutoSporting. Las aseveraciones se basan en archivos reales, middlewares, modelos de Mongoose y componentes de React existentes.

## 2. Matriz ejecutiva actualizada

| Módulo | Referencia | AutoSporting comprobado | Estado | Gap funcional | Gap visual/UX | Archivos reales | Modelos/endpoints | Prioridad | Riesgo |
|---|---|---|---|---|---|---|---|---:|---:|
| Layout/Nav | Sidebar, Header | Sidebar, Header | Confirmado | No identificado mediante inspección estática; requiere prueba de ejecución | La implementación equivalente fue encontrada en layout.jsx, pendiente de validación visual | `layout.jsx`, `CrmSidebar.jsx` | N/A | P2 | Bajo |
| Dashboard | Cockpit, KPIs | KPIs, Gráficos | Parcial | Definición de rentabilidad | Falta cockpit | `admin/page.jsx` | `Sale`, `Car` | P1 | Alto |
| Stock | Tabla, mobile cards | Tabla (`CrmTable`) | Confirmado | Faltan exportaciones XLSX en UI | La implementación equivalente fue encontrada en CrmTable.jsx, pendiente de validación visual | `stock/page.jsx`, `CrmTable.jsx` | `Car.js` | P2 | Bajo |
| Ficha vehículo | Resumen, fotos | Panel de acciones | Confirmado | Integración ML pendiente | Modales largos | `VehicleActionsPanel.jsx` | `Car.js` | P1 | Medio |
| Alta/edición | Identidad, precios | Formularios | Confirmado | Validaciones de duplicados (requiere prueba) | La implementación equivalente fue encontrada en VehicleFormModal.jsx, pendiente de validación visual | `VehicleFormModal.jsx` | `Car.js` | P1 | Medio |
| Clientes/Leads | Pipeline, round-robin | Pipeline separado | Confirmado | Separación estricta de Leads y Clientes | La implementación equivalente fue encontrada, pendiente de validación visual | `clientes/page.jsx`, `leads/page.jsx` | `Client.js`, `Lead.js` | P1 | Medio |
| Reservas | Estado en Venta | Entidad propia | Confirmado | Sincronización con Ventas | No aplica al alcance visual inspeccionado | `Reservation.js` | `Reservation.js` | P1 | Medio |
| Ventas | Workflow integral | Lista, Tarjetas | Parcial | Máquina de estados requiere prueba | La implementación equivalente fue encontrada, pendiente de validación visual | `ventas/page.jsx` | `Sale.js` | P1 | Alto |
| Cobranzas/cuotas| Planes, pagos parciales | Planes automáticos | Parcial | Idempotencia en generación masiva | La implementación equivalente fue encontrada, pendiente de validación visual | `CuotasFinancieras.jsx` | `Installment.js` / `/installments` | P1 | Alto |
| Finanzas | Cuentas, movimientos | 19 pestañas | Parcial | Separar UI de reglas contables | Sobrecarga cognitiva | `finanzas/page.jsx` | `Transaction.js` / `/transactions` | P1 | Alto |
| Mensajes internos| Chat y adjuntos | No encontrado | No encontrado | Falta módulo entero de mensajes internos | N/A | No existen archivos | N/A | P1 | Alto |
| WhatsApp/Email | Webhooks y plantillas | Placeholder UI | Placeholder | No hay conexión real con Meta API o SMTP | N/A | `CommunicationLog.js` | N/A | P1 | Alto |
| Configuración | Parámetros por empresa| Config. central | Confirmado | No identificado mediante inspección estática; requiere prueba de ejecución | La implementación equivalente fue encontrada, pendiente de validación visual | `general/page.jsx` | `CrmSettings.js` | P2 | Bajo |
| Usuarios/Admin | Roles, 2FA, backups | RBAC robusto | Parcial | Ausencia de 2FA para roles sensibles | La implementación equivalente fue encontrada, pendiente de validación visual | `usuarios/page.jsx` | `AdminUser.js` / `/users` | P1 | Alto |
| Plantillas | Variables | Textos dinámicos | Confirmado | Variables inyectadas sin validación estricta | La implementación equivalente fue encontrada, pendiente de validación visual | `plantillas/page.jsx` | `MessageTemplate.js` | P2 | Medio |
| Responsive | Bottom nav y cards | Cards móviles | Confirmado | Requiere prueba en pantallas <360px | La implementación equivalente fue encontrada con MobileCards, pendiente de validación visual | `ClientMobileCards`, `LeadMobileCards`| N/A | P2 | Bajo |

## 3. Gap por módulo - Detalles verificados

### 3.1 Dashboard y Layout
**AutoSporting comprobado:** Componentes integrados en `src/app/admin/layout.jsx` (`CrmSidebar`). Dashboard extrae KPIs de Mongoose.
**Riesgos (P1):** Consolidación de métricas de rentabilidad sin mezclar USD/ARS de forma inconsistente.

### 3.2 Stock, Vehículos y Reservas
**AutoSporting comprobado:** Modelos de datos presentes (`Car.js`, `Reservation.js`). `Reservation` es una entidad paralela a `Sale`.
**Riesgos (P1):** Potencial colisión de estados entre un vehículo reservado y vendido si la lógica transaccional falla.

### 3.3 Clientes y Leads
**AutoSporting comprobado:** Se gestionan como dos colecciones distintas (`Client.js` y `Lead.js`). Se usa `phoneNormalized` y `emailNormalized` para indexación.
**Riesgos (P1):** Si entra un lead web que ya es cliente, el cruce manual vs automático puede ser inconsistente.

### 3.4 Ventas, Cobranzas y Finanzas
**AutoSporting comprobado:** `finanzas/page.jsx` consolida transacciones, cuotas, rentabilidad e impuestos en un archivo con 19 tabs visuales. Endpoints como `/api/admin/transactions` y `/api/admin/sales/:saleId/installments/generate` operativos vía fetch hooks.
**Riesgos (P1):** La sobrecarga cognitiva en la interfaz. Necesidad de probar la idempotencia al generar planes de cuotas.

### 3.5 Mensajería y WhatsApp
**AutoSporting comprobado:** No existen integraciones de Twilio, Sendgrid ni APIs oficiales de WhatsApp en `package.json`. Existe `CommunicationLog.js` que registra eventos manuales.
**Riesgos (P1):** Falsa expectativa de automatización por parte del negocio.

### 3.6 Configuración y Usuarios
**AutoSporting comprobado:** RBAC implementado vía middleware `requirePermission` y constante `DEFAULT_ROLE_PERMISSIONS`. `passwordHash` se protege vía exclusión en `.toJSON()`.
**Riesgos (P1):** Falta de 2FA. Modificación manual de JWT local puede requerir recarga o generar crash si no hay Error Boundary antes de llegar al backend.

## 4. Deuda técnica y de arquitectura (Priorizada)

1. **(P1) Módulo de Mensajería:** Construir desde cero o integrar con proveedor oficial.
2. **(P1) 2FA / Seguridad Adicional:** Incorporar doble factor para accesos Owner y Finanzas.
3. **(P1) Consolidación de Reservas:** Unificar la lógica o crear triggers estrictos entre `Reservation` y `Sale`.
4. **(P2) Desacople de `server.js`:** Monolito de más de 6000 líneas.
5. **(P2) Fragmentación de Finanzas:** Dividir la vista principal en sub-rutas independientes.
