# Matriz de Auditoría CRM AutoSporting

## Rutas, Componentes, Servicios y Permisos

| Ruta | Componente Principal | Servicios / Hooks | Permisos Requeridos | Tests |
|------|----------------------|-------------------|---------------------|-------|
| `/admin` | `Dashboard.jsx` (App Router) | `useAdminCars`, `useAdminCash`, `useAdminReservations` | N/A (Admin Base) | `admin-smoke.spec.js` |
| `/admin/stock` | `AdminStockPage` (`page.jsx`) | `useAdminCars` (`GET /api/admin/cars`) | `STOCK_READ`, `STOCK_WRITE` | `admin-smoke.spec.js` |
| `/admin/stock/[id]` | `VehicleDetailPage` (`[id]/page.jsx`) | `fetchCar` (`GET /api/admin/cars/:id`) | `STOCK_READ`, `STOCK_WRITE` | Pendiente |
| `/admin/consignaciones` | `MandatesPage` (`page.jsx`) | `useAdminMandates` (`GET /api/mandates`) | `MANDATES_READ` | `admin-smoke.spec.js` |
| `/admin/estadisticas` | `StatisticsPage` (`page.jsx`) | `useAdminStats` (`GET /api/admin/stats`) | `STATS_READ` | `admin-smoke.spec.js` |
| `/admin/reservas` | `ReservationsPage` (`page.jsx`) | `useAdminReservations` (`GET /api/reservations`) | `RESERVATIONS_READ` | `admin-smoke.spec.js` |
| `/admin/caja` | `CashPage` (`page.jsx`) | `useAdminCash` (`GET /api/cash`) | `CASH_READ`, `CASH_WRITE` | `admin-smoke.spec.js` |

## Fuentes de Verdad

1. **Stock (Vehículos):**
   - **Colección:** `cars`
   - **Campos Clave:** `status`, `agencyOwned`, `consignedBy`, `investor.percentage`.
   - **Lógica Central:** `vehicleAdapter.js` mapea la base de datos a estados del frontend (`propio`, `compartido`, `tercero`, `consignación`).

2. **Caja (Movimientos Financieros):**
   - **Colección:** `cashmovements` (Asumido por estructura estándar)
   - **Lógica:** Entradas y salidas globales del concesionario.

3. **Ventas y Cuotas:**
   - **Colección:** `sales` y `quotas`
   - **Campos Clave:** `carId`, `clientId`, `amount`, `status` (pagada/pendiente).

4. **Consignaciones (Mandatos):**
   - **Colección:** `mandates`
   - **Campos Clave:** `vehicleId`, `ownerName`, `agreedPrice`, `status` (activo, completado).

## Fixtures & Mocking Strategy

Para los tests, Playwright está interceptando `/api/admin/**`. 
El código de mocking actual se encuentra en `tests/admin-smoke.spec.js`.
Se planea crear una carpeta `tests/fixtures/` con:
- `loading.json`: Respuestas con delay simulado.
- `error.json`: `{"message": "Error 500"}`
- `empty.json`: Arrays vacíos `[]`.
- `data.json`: Respuestas completas de la base de datos simulando registros reales.
