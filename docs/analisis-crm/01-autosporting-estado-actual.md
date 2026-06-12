# CRM AutoSporting - Estado actual

## 1. Alcance y estado de evidencia

Fecha de la auditoría estática: 12 de junio de 2026.

Se realizó una auditoría de lectura exhaustiva sobre el código fuente de AutoSporting. La aplicación fue validada estáticamente.

**Stack tecnológico y versiones identificadas:**
- Framework: Next.js (App Router) + React 19
- Backend: Express integrado (`server.js` como monolito)
- Base de datos: MongoDB (Mongoose)
- Seguridad: JWT nativo (crypto.scryptSync) y Firebase (declarado en package.json)
- Estilos: Tailwind CSS + Lucide Icons + Framer Motion

## 2. Mapa de Rutas Principales (Confirmadas)

| Ruta | Archivo Real | Componente / Layout | Permiso Asociado |
|---|---|---|---|
| Dashboard | `src/app/admin/page.jsx` | KPIs, Gráficos | `ADMIN` / Solo Lectura |
| Stock | `src/app/admin/stock/page.jsx` | `CrmTable`, `MobileCards` | `STOCK_READ`, `STOCK_WRITE` |
| Ventas | `src/app/admin/ventas/page.jsx` | `SalesTable`, `SaleMobileCards` | `VENTAS_READ`, `VENTAS_CANCEL` |
| Clientes | `src/app/admin/clientes/page.jsx` | `ClientsTable`, `ClientMobileCards` | `CLIENTES_READ`, `CLIENTES_WRITE` |
| Leads | `src/app/admin/leads/page.jsx` | `LeadsTable`, `LeadKanbanBoard` | `LEADS_READ`, `LEADS_WRITE` |
| Finanzas | `src/app/admin/finanzas/page.jsx` | `TransactionModal`, `CuotasFinancieras`| `FINANZAS_READ`, `FINANZAS_WRITE` |
| Configuración | `src/app/admin/configuracion/general/page.jsx` | `CrmSettings` | `SETTINGS_READ`, `SETTINGS_WRITE` |
| Usuarios | `src/app/admin/configuracion/usuarios/page.jsx` | Gestión de Accesos | `USUARIOS_READ`, `USUARIOS_WRITE` |
| Plantillas | `src/app/admin/configuracion/plantillas/page.jsx` | `MessageTemplateManager` | `MESSAGETEMPLATES_READ`, `WRITE` |

*Layout global*: Se utiliza `src/app/admin/layout.jsx` que incluye `CrmSidebar` y `CrmHeader`.

## 3. Estado comprobado por módulo

### 3.1 Modelos de Datos y Relaciones
- **Stock y Ventas**: `Car.js`, `Sale.js`, `Reservation.js`. 
- **Clientes**: `Client.js`, `Lead.js`. Existen de manera separada y se pueden vincular.
- **Finanzas**: `Transaction.js`, `Installment.js`, `Account.js`.
- **Configuración y Seguridad**: `AdminUser.js`, `CrmSettings.js`, `MessageTemplate.js`, `CommunicationLog.js`.

### 3.2 Endpoints (Ubicados en `server.js`)
- **Clientes/Leads**: `GET/POST/PATCH /api/admin/clients` y `/api/admin/leads`.
- **Finanzas**: `GET/POST/PATCH /api/admin/transactions` e `/installments`.
- **Configuración**: `GET/PATCH /api/admin/settings`.
- **Usuarios**: `GET/POST/PATCH /api/admin/users`.
- **Plantillas**: `GET/POST/PATCH/DELETE /api/admin/message-templates`.

### 3.3 Autenticación y RBAC
- **Autenticación**: Vía JWT. El payload del token se decodifica en `AuthContext.jsx`.
- **Middlewares Backend**: Uso de `requirePermission` y `requireAnyPermission` en `server.js` para autorizar endpoints en base al rol y los tokens.
- **Seguridad**: `AdminUser.js` excluye el hash de contraseña al responder mediante `.toJSON()`. El hash se genera con `crypto.scryptSync`.

## 4. Problemas Confirmados y Deuda Técnica

| Hallazgo | Prioridad | Severidad |
|---|---:|---:|
| Entidad separada de Reserva (`Reservation.js` vs `Sale.js`) | P1 | Media |
| Monolito en backend (`server.js` con >260KB) | P2 | Media |
| Exceso de pestañas en `/admin/finanzas/page.jsx` (19 tabs) | P2 | Media |
| Ausencia de módulo de Chat interno / Inbox real | P1 | Media |
| Falta de 2FA nativo para roles sensibles | P1 | Media |

## 5. Aspectos que requieren prueba de ejecución

- **Idempotencia de cuotas**: Confirmar si la generación masiva de cuotas evita duplicaciones.
- **Cruce de Leads vs Clientes**: Probar el comportamiento de deduplicación manual vs automático.
- **Pestañas Avanzadas de Finanzas**: Validar que "Conciliación" o "AFIP/IVA" no sean simples placeholders visuales.
- **Falsificación de JWT**: Verificar si alterar el JWT en `localStorage` rompe la UI antes de ser rechazado por el backend por falta de validación inicial.

## 6. Criterio para completar el desarrollo
Este documento sirve como Baseline Técnico consolidado y verificado estáticamente.
