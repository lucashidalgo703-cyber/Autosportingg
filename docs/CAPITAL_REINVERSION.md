# Capital y Reinversión

## Alcance de esta etapa

La demostración de `/admin/capital-reinversion-demo` usa exclusivamente fixtures estáticos ficticios. No consulta MongoDB, no lee datos del CRM, no registra cobros, no distribuye fondos y no altera saldos. La pestaña integrada de `/admin/tesoreria-estrategica` usa el adaptador de consulta de solo lectura y requiere sesión administrativa más la reautenticación PIN existente de Tesorería. El motor `projectCapitalReinvestment(snapshot)` es determinístico con los mismos snapshots y devuelve `pendiente_conciliacion`/`null` cuando la evidencia no alcanza.

La ruta de demostración no integra una fuente del CRM; la pestaña integrada sí consume el adaptador de solo lectura. La función pura `computeIncomeOwnership` vive en `src/services/treasuryIncomeOwnership.js` y se reexporta desde el servicio existente por compatibilidad. El motor la invoca con objetos en memoria y no llama a funciones de lectura o escritura de Tesorería.

## Fuentes y cálculos reutilizados

- `computeOperationRecoveryState` de `src/services/treasuryWaterfallHelpers.js` es la fuente de costo comparable, capital propio, permutas, recuperación por cobros, capital contabilizado en Stock, inversión extra configurada y margen del waterfall.
- `computeSchemeDistributionForCollection` genera una vista previa de los cobros activos todavía no distribuidos, con el esquema ya seleccionado en el snapshot. No se calcula ni persiste una asignación nueva.
- `computeSaleProfit` y `resolveVehicleAcquisitionCost` se usan indirectamente por el estado de recuperación para costos de compra, permutas, gastos, comisiones y conversiones.
- `computeIncomeOwnership` separa cobros propios de fondos de terceros usando el importe explícito existente y, si falta, la participación/consignación del vehículo.
- La cotización de `Sale.exchangeRate` es la única conversión usada por el cálculo por operación. Si falta para una conversión cruzada, el resultado queda pendiente.

El motor expone cada dimensión por separado:

| Métrica | Fuente / criterio |
| --- | --- |
| Costo de adquisición y costo atribuible | Resultado del cálculo existente por venta, en moneda de la operación. |
| Capital propio desembolsado | Pagos de adquisición con `transactionId` y egreso activo coincidente, más gastos directos con estado pagado y egreso activo vinculado. Pagos históricos sin movimiento verificable no se cuentan. |
| Deuda de adquisición | `purchasePaymentState.pendingDebt`, convertida solo con cotización identificada. |
| Objetivo de recuperación | `ownCashInvestmentToRecover` del helper existente, visible solo cuando pagos, deuda, gastos, cobros y participaciones están conciliados. El helper actual asume que el costo de adquisición está pagado, así que el motor bloquea el objetivo si existe deuda. |
| Capital recuperado | `totalCapitalRecoveredSoFar` del helper existente, con transacciones de ingreso activas o completadas. El adaptador elimina el fallback de `depositAppliedAmount`; una seña sin transacción no es efectivo confirmado. Las cuotas futuras no forman parte de transacciones cobradas. |
| Capital asignado a Stock | `alreadyRecoveredCapital` según desglose de Tesorería no revertido, verificado contra el historial de cajas por `sourceIncomeId`. Si ambos no coinciden, no se publica como cifra conciliada. Una asignación no se presenta como compra realizada. |
| Pendiente de recuperar | `max(0, objetivo de recuperación - capital recuperado)`. Se separa así el efectivo recuperado de su asignación posterior a Stock. |
| Capital recuperado pendiente de asignación | `max(0, capital recuperado - capital asignado a Stock)`. |
| Capital reinvertido | Egresos activos únicos vinculados a pagos de vehículos y marcados como debitados de caja `stock`. El modelo de pago y el movimiento bancario no se suman dos veces. |
| Liquidez para comprar | `max(0, saldo Stock - compromisos Stock) + fondos propios no asignados`, solo cuando la conciliación y la ecuación de saldos cierran. Cajas son asignaciones dentro del efectivo en cuentas, no efectivo adicional. |
| Margen devengado / cobrado | `reportedNetProfit` y `availableMarginCollectedTotal` del cálculo existente. “Cobrado” se rotula como salida del waterfall, no como sustituto de un criterio contable. |

ARS y USD nunca se suman entre sí. Saldos de terceros quedan visibles aparte y fuera del disponible para comprar. Se exponen fondos protegidos y compromisos según el snapshot normalizado de cajas.

## Conciliación y datos incompletos

El estado global requiere que el snapshot indique corte `conciliado`, balance correcto y que `cuentas = cajas asignadas + propios sin asignar + fondos de terceros` por moneda, con tolerancia de un centavo. También se bloquea la liquidez si hay una caja Stock o compromisos Stock ausentes, valores propios negativos, obligaciones sin cubrir, una reversa de gasto no identificada o un desglose de capital que no coincide con el historial de cajas.

Para cada operación, el motor deja importes de recuperación/margen pendientes si no puede confirmar el pago del costo de adquisición, si hay deuda pendiente, gastos directos sin estado de pago y movimiento vinculado, cotización faltante, propiedad contradictoria o seña aplicada sin ingreso acreditado. El costo devengado puede ser informativo aun cuando el importe desembolsado no sea verificable.

Una permuta queda como valor de adquisición no monetario. El estado de una cuota futura no agrega efectivo. Los pagos de terceros no se suman a desembolsos propios ni a cobros propios. Los movimientos repetidos por `transactionId` se cuentan una sola vez.

## Reversión de egresos

El snapshot incluye el historial de cajas y los egresos anulados. Si un gasto anulado tiene un débito estratégico previo, la liquidez consolidada queda pendiente aun cuando haya un asiento de reversa: el adaptador no puede verificar el saldo histórico únicamente con esos registros.

La rama candidata incluye una corrección en `syncExpenseWithTreasury`: la anulación solo repone una vez un débito asociado con el mismo importe y moneda, y registra atómicamente saldo e historial. La expectativa original de `tests/treasuryDistribution.test.js` se conserva. Los registros históricos no se corrigen automáticamente; Capital continúa bloqueando la liquidez consolidada para gastos anulados con débitos previos hasta una conciliación independiente.

## Limitaciones

- `Car.expenses` no garantiza un estado de pago ni un movimiento vinculado. El motor no los trata como desembolsos confirmados; el adaptador operativo futuro deberá conciliarlos antes de activar cifras exactas.
- Los pagos `ya_pagado_historico` sin transacciones no se consideran comprobados.
- `capital reinvertido` solo incluye pagos marcados como debitados de `stock`. Otros pagos de compra quedan fuera porque su fuente no está demostrada como capital asignado a esa caja.
- El vínculo temporal o causal entre un cobro específico y una compra posterior no existe en los modelos actuales. El panel informa pagos confirmados desde Stock, no atribución de cada peso a una venta concreta.
- El cálculo existente usa la base propia de costo de compra para el extra porcentual, mientras el comentario de `TreasuryConfig` lo describe como porcentaje sobre inversión real. Esta etapa conserva el resultado actual y no redefine el porcentaje.
- `computeIncomeOwnership` vive dentro de `treasuryStrategicService.js`, módulo que también importa modelos. Solo se llama la función pura exportada; una integración futura debería resolver la dependencia modular sin duplicar sus reglas y sin ejecutar las funciones con acceso a datos.
- La corrección local de reversión no demuestra por sí sola la integridad de saldos históricos ni autoriza uso productivo. La integración depende de conciliación operativa, compatibilidad con Seguridad y verificación en un entorno aislado representativo.

## Pruebas

`tests/capitalReinvestment.test.js` utiliza snapshots ficticios y cubre contado, financiado, cobro parcial, seña sin transacción, compra parcial, gastos pagados y sin estado, permuta, socios, terceros, reinversión parcial/total, reversa de cobro, reversa de gasto incompleta, historial de distribución inconsistente, inconsistencias de saldos, compromisos, monedas, datos incompletos, ausencia de cotización, doble contabilización y vista previa sin mutar el snapshot. Las suites `tests/integration/capitalReinvestmentReadAdapter.integration.test.js` y `tests/integration/treasuryExpenseReversal.integration.test.js` verifican la consulta aislada, los permisos heredados, la privacidad del DTO y la corrección de reversión con MongoDB en memoria.

Comando: `node --test tests/capitalReinvestment.test.js`.

La integración solo agrega consulta y recomendación; no se deben ejecutar movimientos al presentar una propuesta. Antes de publicar, deben resolverse la compatibilidad con Seguridad/propietario único, la conciliación de operaciones históricas y los límites operativos descritos en `CAPITAL_REINVESTMENT_INTEGRATION.md`.
