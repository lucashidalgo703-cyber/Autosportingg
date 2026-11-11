# Capital: corrección de propiedad y límites monetarios

El listado de Stock y su resumen global/filtrado usan la misma clasificación de propiedad que la ficha. Las permutas propias legacy se incluyen; las consignadas explícitas y los terceros sin participación se excluyen del capital propio. Las participaciones de inversores se conservan. El costo de adquisición del listado se separa según la moneda real de compra/toma, independientemente de la moneda publicada.

La siguiente adaptación resuelve los dos problemas monetarios identificados durante esa corrección:

- `stockStatisticsCurrency` respeta la moneda explícita del registro, sin reclasificar USD como ARS por superar un umbral de precio. No se modifica el importe guardado ni se aplica un tipo de cambio implícito.
- `capitalSummaryService` delega en `buildCapitalSummary`, que entrega `byCurrency.ARS` y `byCurrency.USD` con componentes, totales y auditoría independientes. La interfaz, los detalles y el CSV usan el grupo seleccionado y conservan las monedas originales de adquisición y publicación. Los datos de otra moneda no se suman ni se presentan como una conversión.

El resumen exige lectura de Stock y Finanzas. La interfaz aísla las consultas y los modales por sesión, permite alternar costo/precio publicado y conserva el desglose auditable de consignaciones y terceros excluidos. Los ejemplos estáticos de la ayuda se identifican como ficticios; no presentan operaciones ni saldos reales.

El resultado se denomina **estimación basada en registros**, sin certificar conciliación bancaria ni propiedad exclusiva de todos los saldos de cuenta. Los registros con moneda, costo o gastos pendientes se informan para revisión. Una diferencia entre escenarios de una moneda no acredita ganancia cobrada ni permite calcular por sí sola el margen de un vehículo comprado y vendido en monedas distintas.

Las pruebas utilizan importes ficticios y verifican propiedad, participaciones, grupos monetarios y permisos. Las pruebas de presentación verifican la ausencia de fallback entre monedas, filtros de auditoría, CSV con UTF-8 y escape de fórmulas. La validación visual final y la publicación corresponden al cierre general de la etapa.
