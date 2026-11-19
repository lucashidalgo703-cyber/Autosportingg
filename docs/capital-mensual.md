# Capital mensual

Disponible en **Capital mensual** (`/admin/capital-mensual`) únicamente para el propietario. El gráfico y la tabla muestran el último registro observado de cada mes, con su fecha real, separado de la consulta actual en vivo. Los períodos sin una observación de capital conservan **Sin registro**, nunca un cero o una reconstrucción desde los saldos actuales.

Se reutiliza `getCapitalSummary`: stock propio disponible a costo + caja y bancos reales + cartera propia pendiente − egresos pendientes − pagos registrados sin cuenta y sin débito aplicado. ARS y USD se conservan separados. La opción a precio publicado sustituye sólo la valuación del stock; es una estimación comercial distinta del capital a costo. No se duplican cajas virtuales ni se incluyen como propios los vehículos de terceros o las participaciones de socios.

Las observaciones guardan agregados, versión de fórmula, origen, calidad y fecha argentina; no copian fichas de clientes, vehículos, cuentas o cuotas. Una transacción lee los componentes sobre una misma vista de MongoDB y guarda una observación inmutable. El mes conserva una referencia a su observación más reciente. Los meses anteriores no se recalculan por cambios posteriores en compras, precios, gastos, saldos o cobros.

Si cambia el criterio de valuación o la ecuación de capital, debe incrementarse `CAPITAL_HISTORY_FORMULA`; el historial conserva sus valores y evita comparar versiones incompatibles.

**Guardar registro actual** permite registrar una lectura adicional del mes en curso. Los reintentos usan una clave idempotente. No acepta fechas históricas, totales ni componentes enviados por el navegador. Si faltan costos o participaciones, los importes se identifican como subtotales conocidos. La variación exige meses consecutivos completos y la misma versión de fórmula; el porcentaje requiere una base anterior positiva.

## Registro automático

`vercel.json` agrega `/api/internal/jobs/capital-history` con `0 2 * * *`, una invocación diaria programada para la franja de las 23 horas de Argentina. Reutiliza la autorización `Bearer CRON_SECRET`. Debe existir una variable de servidor `CRON_SECRET` en Production; no se publica ni se modifica un secreto existente.

La fecha del registro es la de la observación efectiva, no una promesa de cierre exacto a medianoche. Si una ejecución se demora, falla o no ocurre, no se fabrican importes: se conserva el último registro real. El servicio identifica el día argentino para que los reintentos del cron no dupliquen la lectura. Se preserva el cron de SLA existente. Las condiciones de precisión y ejecución se documentan en [Vercel Cron Jobs](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing).

## Evidencia histórica revisada

Antes de activar el historial se revisaron las colecciones de producción en modo lectura. Había movimientos, operaciones y dos conciliaciones de caja de octubre de 2026, pero no observaciones completas de capital patrimonial mensual; los cierres diarios estaban vacíos. Las conciliaciones de efectivo y los ingresos/egresos agrupados no fijan por sí solos el stock, la cartera y las deudas de esos meses. No se importaron como si fueran capital total.

El inicio del historial se registra con una lectura real del mes actual. La comprobación de activación no registra ventas, gastos, cobros o pagos ni modifica saldos o unidades.
