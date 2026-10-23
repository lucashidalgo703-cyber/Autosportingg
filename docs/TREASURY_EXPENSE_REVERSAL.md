# Reversión de gastos de Tesorería Estratégica

## Corrección local

La sincronización de un gasto activo con Tesorería podía omitir su reversión al anularlo: `syncExpenseWithTreasury` retornaba al encontrar `isTreasuryExpenseSynced` antes de evaluar `statusChanged`. La corrección permite procesar ese cambio y exige un movimiento de débito original `egreso_finanzas` vinculado al mismo `sourceExpenseId`.

La restitución actualiza en una sola operación atómica el saldo monetario (redondeado a centavos) y el historial `reversion_egreso`. Exige un único débito original con importe absoluto y moneda coincidentes; varios débitos/reversiones, importe no positivo o una reversa contradictoria requieren conciliación manual. La operación solo se aplica si todavía no hay reversión registrada para ese gasto en la caja. Así, reintentos y llamadas concurrentes no duplican el crédito. El movimiento conserva moneda, fecha, usuario, motivo y referencia del gasto. Si el débito original no está, la operación falla explícitamente; no inventa una restitución.

Al cambiar un gasto activo a pendiente, además de restituir el saldo se restablece el compromiso pendiente en la moneda correspondiente. El cambio de la marca del documento de gasto se guarda después del asiento de caja; si ese guardado falla, el reintento detecta el asiento ya confirmado y no vuelve a acreditar.

## Conciliación de operaciones históricas

Esta corrección no modifica ni repara automáticamente registros históricos. Requieren revisión manual contra extractos, comprobantes y movimientos de caja:

- Gastos anulados con un débito `egreso_finanzas` sin reversión correspondiente.
- Gastos con reversión registrada cuyo saldo actual no se puede demostrar solo con el historial.
- Gastos marcados como sincronizados sin débito de origen, o con referencias de origen ausentes.
- Gastos cuyo débito y reversión aparecen en cajas distintas, duplicados o con moneda/importe incompatibles.
- Operaciones anteriores a la incorporación de `sourceExpenseId`, que no puedan vincularse inequívocamente.

No se debe ajustar saldo a partir de la marca `isTreasuryExpenseSynced` por sí sola. La conciliación debe documentar la evidencia externa y registrarse por el procedimiento operativo autorizado, fuera de este cambio.

## Verificación

La prueba de regresión conserva intacta la expectativa del caso de $200.000 y usa MongoDB en memoria. La nueva suite de integración usa únicamente fixtures ficticios y reloj/fechas explícitas para probar reintento, concurrencia, fallos antes y después de la escritura de caja, ARS/USD, cajas separadas, precisión de centavos, regreso a pendiente, falta de débito original y lectura conservadora de Capital y Reinversión.

La proyección de Capital continúa marcando la liquidez como pendiente cuando detecta gastos anulados con débitos previos. Un asiento de reversión y un saldo que coincide con su importe no son por sí solos conciliación bancaria ni autorización para declarar liquidez disponible.
