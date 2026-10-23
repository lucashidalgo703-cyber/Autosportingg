# Capital y Reinversión — integración de solo lectura

## Arquitectura implementada

`capitalReinvestmentReadAdapter.js` lee `Car`, `Sale`, `Transaction`, `Installment`, `TreasuryBox`, `TreasuryConfig`, `Account` y `TreasuryReconciliation` usando proyecciones explícitas, `.lean()` y un límite detectable de 10.000 registros por fuente. Convierte esos documentos a un snapshot plano y llama al motor determinístico `projectCapitalReinvestment`. El motor no importa Mongoose ni ejecuta I/O.

El endpoint `GET /api/admin/capital-reinversion/projection` aplica el JWT administrativo, rol de propietario/administrador y token PIN de Tesorería de 15 minutos. Devuelve un DTO proyectado, sin documentos Mongoose, datos de contacto, notas o IDs de transacciones. Se excluye `recoveryState` del contrato de respuesta. No usa el servicio estratégico de lectura porque su endpoint de dashboard llama primero a rutinas de inicialización.

La nueva pestaña “8. Capital y Reinversión” en Tesorería Estratégica consume ese endpoint y reutiliza el panel aprobado. No ofrece acciones de escritura. Cada fuente se vuelve a leer al abrir/actualizar; no hay caché persistente ni efectos laterales en el endpoint.

## Criterios de conciliación

- Las cuentas son una medición del efectivo total. Las cajas son asignaciones de ese mismo efectivo: nunca se suman entre sí para obtener liquidez.
- La proyección requiere corte confirmado, configuración completada, saldo de cada cuenta explicado por el corte más movimientos activos posteriores, ecuación por moneda balanceada y fuentes sin truncamiento.
- La disponibilidad se mantiene como pendiente cuando falta un registro del corte, hay movimiento sin explicar, los importes no cierran, se excede el límite de lectura o aparece un egreso anulado con débito de caja. La corrección incluida evita nuevos créditos duplicados, pero un asiento histórico de reversa no basta para probar por sí solo el saldo actual.
- ARS y USD nunca se convierten implícitamente.
- Un cobro confirmado es un ingreso activo vinculado a la venta. Importe de venta, seña sin movimiento y cuotas futuras no son caja.
- Una compra se considera desembolsada solo con transacción de egreso activa coincidente. Para contarla como capital reinvertido, su registro de pago también debe marcar origen Stock.
- El detalle de “Conciliación contra distribuciones de Tesorería” compara los campos de waterfall persistidos con los acumulados que devuelve el cálculo puro. No reescribe ni recalcula asientos heredados.

## Pruebas y demostración

El adaptador se probó mediante Express real y MongoDB en memoria con datos ficticios. Se verificó denegación sin PIN y a un rol no privilegiado, respuesta del endpoint con el dueño ficticio, ausencia de datos privados en el DTO, conteos documentales iguales antes/después de la consulta y bloqueo de liquidez ante un gasto ficticio de `$200.000` con una reversa registrada.

La captura de escritorio y móvil se generó desde una sesión local real en `artifacts/`. El auxiliar `scripts/start-capital-reinvestment-integration-demo-local.js` crea una copia temporal de este árbol, excluye `.env*`, `.git`, `.next` y módulos, usa MongoDB en memoria, genera una contraseña descartable y enlaza únicamente a loopback. Muestra una venta y reinversión de ejemplo; no carga datos reales. Para iniciarlo: `node scripts/start-capital-reinvestment-integration-demo-local.js`. El usuario y clave se imprimen solo al iniciar. Ctrl+C cierra Next, Express y MongoDB temporal.

## Diferencias y limitaciones conocidas

- `Car.expenses` y `Sale.saleExpenses` no tienen actualmente referencia a transacción pagada. Esos gastos quedan sin verificar; la integración no crea vínculos ni suma como pagados los gastos solo por su estado comercial.
- Los cobros de reservas históricas que no tengan `saleId` no se reasignan a ventas por aproximación; requieren vínculo verificable o siguen sin incluirse en el capital recuperado.
- `Settlement` y `FinanceRecurringRule` se identificaron, pero no son fuentes operativas del snapshot. Los compromisos visibles en esta primera versión vienen de `TreasuryBox.pendingCommitments*`; un desglose adicional requiere mapear y conciliar sus transacciones asociadas.
- La retención de fondos de terceros sigue el criterio del CRM (ingresos activos posteriores al corte menos egresos de liquidación en las mismas categorías). Si el legado no registra con claridad titularidad, salida o vínculo, la ecuación/conciliación debe quedar pendiente.
- La verificación del movimiento de cada cuenta toma el saldo `realBalance` del corte confirmado y movimientos activos por `accountId` desde entonces. Los casos históricos sin enlace de cuenta requieren conciliación operativa; no se infiere una cuenta.
- La regresión de `tests/treasuryDistribution.test.js:553` queda corregida en la rama candidata sin cambiar su expectativa. La anulación exige un débito original único, con importe y moneda coincidentes, y escribe una sola restitución atómica. Los gastos históricos anulados siguen bloqueando saldos consolidados de liquidez aunque tengan reversa, porque esos datos requieren conciliación externa.
- No hubo conexión a MongoDB Atlas ni se integró información de producción. La ruta actual hereda los guards de Tesorería, que admiten propietario y administrador general, mientras que la política aprobada para AutoSporting Intelligence reserva el acceso operativo al propietario. No se cambió el permiso ni se tocó Seguridad; la compatibilidad debe resolverse con Antigravity antes de integrar la ruta.

## Próxima etapa propuesta

Antes de integrar la ruta, acordar con Seguridad el guard de propietario único y probar la autenticación resultante. Antes de cualquier lectura productiva, conciliar anulaciones históricas, gastos sin vínculo, cobros históricos por reservas y compromisos de liquidaciones; verificar la proyección operación por operación contra el waterfall y medir el costo de lectura. No se habilita distribución, modificación de saldos ni disponibilidad basada en inferencias.
