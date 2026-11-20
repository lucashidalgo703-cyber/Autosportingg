# Capital mensual

Disponible en **Capital mensual** (`/admin/capital-mensual`) únicamente para el propietario. El gráfico y la tabla muestran el último registro observado de cada mes, con su fecha real, separado de la consulta actual en vivo. Los períodos sin una observación de capital conservan **Sin registro**, nunca un cero o una reconstrucción desde los saldos actuales.

La sección principal **Capital en Stock** muestra cuatro importes separados: total de Stock, parte de AutoSporting, parte de los inversionistas y participación por verificar. Son los mismos agregados de `summarizeStock` utilizados por Stock, sobre todas las unidades Disponibles, sin filtros ni paginación. A costo, el total incluye AutoSporting + inversionistas + participación sin distribuir; los costos de consignaciones y otros terceros quedan fuera y se muestran aparte. A precio publicado, el total también incluye los terceros identificados en su propio renglón. Una participación pendiente no se adjudica automáticamente a nadie. ARS y USD se conservan separados.

**Capital propio neto** se muestra en un bloque secundario: stock propio disponible + caja y bancos reales + cartera propia pendiente − egresos pendientes − pagos registrados sin cuenta y sin débito aplicado. Se reutiliza `getCapitalSummary` sin cambiar su ecuación ni sumar como propios los inversores o los terceros. Este importe y el total de Stock representan conceptos distintos. La opción a precio publicado sustituye sólo la valuación del stock y se identifica como escenario comercial.

**Ver conciliación con Stock y composición** permite abrir el detalle de la misma lectura y seguir el paso de Stock total a la parte propia y al neto. El gráfico permite elegir **Capital total en Stock**, **Mi capital · AutoSporting**, **Capital de inversionistas** o **Capital propio neto**. Cada fila mensual muestra simultáneamente el reparto de Stock y, separado, el neto. La variación compara únicamente la misma métrica, moneda, criterio y versión entre meses consecutivos completos.

El criterio predeterminado y recomendado para seguir el capital registrado es costo; el publicado se identifica como escenario comercial. Se aclara que la variación patrimonial puede incluir aportes/retiros y cambios nominales por inflación, y no representa por sí sola la rentabilidad del negocio.

Las nuevas observaciones guardan el agregado `stockCapital` con versión `available-stock-v1`, scope `available-global`, cantidades, calidad y desglose por moneda a costo y a precio publicado. Conservan también el neto, su versión de fórmula, origen y fecha argentina; no copian fichas de clientes, vehículos, cuentas o cuotas. Una transacción lee todos los componentes sobre una misma vista de MongoDB y guarda una observación inmutable. El mes conserva una referencia a su observación más reciente. Los meses anteriores no se recalculan por cambios posteriores en compras, precios, gastos, saldos o cobros.

Las observaciones anteriores sin `stockCapital` siguen mostrando su neto registrado, pero el reparto de Stock queda como **Sin desglose guardado**. La UI conserva valores nulos y huecos en la gráfica para esas métricas; no utiliza cifras actuales para completar el costo histórico de inversionistas ni inventa ceros.

Si cambia la ecuación del neto, debe incrementarse `CAPITAL_HISTORY_FORMULA`. Si cambia el criterio del agregado de Stock, debe incrementarse su versión independiente. El historial conserva sus valores y evita comparar versiones incompatibles.

**Guardar registro actual** permite registrar una lectura adicional del mes en curso. Su confirmación muestra el reparto de Stock y explica que guardará ambos criterios, ambas monedas y el neto en un mismo registro calculado en el servidor. Los reintentos usan una clave idempotente. No acepta fechas históricas, totales ni componentes enviados por el navegador. Si faltan costos o participaciones, los importes se identifican como subtotales conocidos. El porcentaje de variación requiere una base anterior positiva.

## Registro automático

`vercel.json` agrega `/api/internal/jobs/capital-history` con `0 2 * * *`, una invocación diaria programada para la franja de las 23 horas de Argentina. Reutiliza la autorización `Bearer CRON_SECRET`. Debe existir una variable de servidor `CRON_SECRET` en Production; no se publica ni se modifica un secreto existente.

La fecha del registro es la de la observación efectiva, no una promesa de cierre exacto a medianoche. Si una ejecución se demora, falla o no ocurre, no se fabrican importes: se conserva el último registro real. El servicio identifica el día argentino para que los reintentos del cron no dupliquen la lectura. Se preserva el cron de SLA existente. Las condiciones de precisión y ejecución se documentan en [Vercel Cron Jobs](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing).

## Evidencia histórica revisada

Antes de activar el historial se revisaron las colecciones de producción en modo lectura. Había movimientos, operaciones y dos conciliaciones de caja de octubre de 2026, pero no observaciones completas de capital patrimonial mensual; los cierres diarios estaban vacíos. Las conciliaciones de efectivo y los ingresos/egresos agrupados no fijan por sí solos el stock, la cartera y las deudas de esos meses. No se importaron como si fueran capital total.

El inicio del historial se registra con una lectura real del mes actual. La comprobación de activación no registra ventas, gastos, cobros o pagos ni modifica saldos o unidades.
