# Implementación inicial de Ventas, Caja y navegación

Fecha: 2026-11-10. Alcance: primera entrega del plan autorizado para AutoSporting, con borradores recuperables, activación transaccional, liquidez registrada y reorganización de Finanzas y Stock. La entrega está implementada y validada en un checkout aislado; no fue publicada. Este documento registra su comportamiento y sus límites; no certifica paridad completa de todo el CRM.

## Ventas: borrador recuperable y activación

- Una venta nueva puede guardarse como borrador sin vehículo, cliente ni precio. El precio omitido se conserva como cero y la moneda predeterminada es USD.
- Guardar borrador realiza una persistencia real. Desde el listado o la ficha, **Continuar borrador** abre la misma operación y guarda sus cambios mediante PATCH.
- El formulario conserva referencias, fechas, precio, moneda, vendedor, datos de comisión, señas declaradas, propietario, elementos de entrega y notas. Un snapshot estricto guarda los datos manuales del comprador, kilometraje e indicación de permuta; no guarda archivos ni objetos arbitrarios.
- Mientras está en borrador no modifica stock ni caja, no convierte leads y no genera cuotas. La ficha de borrador evita mostrar las acciones financieras y operativas de una venta activa. Los endpoints operativos también rechazan borradores.
- El estado inicial es Borrador; elegir una unidad propone Activa mientras no haya una elección manual del estado. El botón **Guardar borrador** fuerza Borrador. Un borrador reabierto mantiene el estado guardado hasta que el usuario lo cambie.
- Para activar una operación normal se requiere una unidad disponible. La API verifica otra venta activa y reclama la unidad mediante una transacción junto con la venta y el lead. Un conflicto conserva el borrador. Una conexión sin soporte de transacciones responde con un error explícito y no publica una activación parcial.
- Activar no acredita dinero en caja ni crea un plan de cuotas. Los cobros y la financiación siguen sus circuitos existentes. La carga histórica nace Entregada y se mantiene separada de la automatización de stock, caja y lead.
- El formulario bloquea envíos simultáneos durante el guardado. La API controla cambios concurrentes del borrador y conflictos de disponibilidad. Esto no constituye una clave general de idempotencia para cualquier repetición de solicitudes HTTP.
- La carga de venta y el borrador no adjuntan documentos. Se retiraron los selectores que no enviaban los archivos y se muestra esta limitación en el formulario.
- Tabla y móvil muestran **Sin activar** para cobranza, documentación y logística de un borrador, aun si su precio cero produjera un indicador financiero calculado. Las nuevas cargas de consulta se identifican como **Histórica**. Los filtros operativos no tratan estos registros como cobros o documentación pendientes.
- La fecha de venta se trata como fecha calendario en formulario, listado, móvil, detalle, exportación y filtros. Guardar `2026-11-10` como ISO de medianoche UTC no debe cambiar su presentación a 9/11. Solo se interpreta `createdAt` como instante de Argentina cuando falta la fecha de venta.

### Cargas históricas nuevas y operaciones existentes

Las cargas históricas creadas por este flujo se marcan con `historicalOnly: true`. La marca las mantiene disponibles en Ventas e historia comercial, y las excluye de las colas de Expedientes, el selector de ventas de Gestoría, los expedientes de Tesorería, la búsqueda de nuevos cobros y las provisiones operativas de garantía. Tampoco se usan para vincular automáticamente un ingreso a una venta por vehículo. El servicio de cobro rechaza nuevos cobros sobre una operación marcada.

Esta decisión es aditiva: `isManualImport` identifica también operaciones antiguas que pueden tener cuotas y cobranzas vigentes. No se utiliza como exclusión global. La ausencia de `historicalOnly` o su valor `false` conserva ese comportamiento existente, y no se ejecuta una migración masiva para reclasificar operaciones previas.

## Caja: escenario de liquidez registrado

El panel de liquidez es de lectura. Parte de cuentas activas y combina cuotas abiertas con movimientos pendientes registrados, evitando volver a sumar un movimiento vinculado a una cuota ya incluida. Mantiene ARS y USD separados.

Los horizontes de 7, 15 y 30 días se presentan junto con vencidos y partidas sin fecha en secciones separadas. Los vencidos no se suponen recuperados y los registros sin fecha no se asignan a un plazo. Datos monetarios o referencias inválidas generan advertencias; no deben presentarse como un cero fiable.

El resumen de estado de cobro de cuotas aplica las mismas reglas: saldo neto pendiente, fecha efectiva de reprogramación y venta elegible. No cuenta cuotas pagadas, borradores, ventas canceladas ni cargas marcadas solo para historia. Las cuotas sin fecha válida quedan advertidas fuera de los tres grupos temporales.

La proyección no incluye ventas futuras, margen, cuotas pagadas, recurrencias sin movimiento ni obligaciones a propietarios o comisiones sin movimiento registrado. Los saldos registrados pueden contener fondos comprometidos con terceros. Ni el saldo ni el cierre proyectado equivalen a dinero libre para retirar.

El panel está disponible según permisos de Finanzas y Caja. No cambia los saldos ni crea movimientos al consultar o actualizar la vista.

## Navegación y capacidades conservadas

Finanzas agrupa las pestañas existentes en **Resumen**, **Caja y bancos**, **Cobros**, **Pagos**, **Control y cierres**, y **Análisis y planificación**. Se conservan los identificadores de los enlaces `?tab=` y los módulos propios, incluidos pagos de empresas, sueldos, taller, gastos personales, comisiones, retiros y préstamos. Agrupar la navegación no implica haber auditado o completado cada función interna de esas pestañas.

Stock abre en **Inventario**, con filtros y listado visibles. **Capital e inversores** conserva el resumen patrimonial, participaciones, desglose y herramientas de inversión. No se reemplazan las fórmulas de capital por las de caja ni se convierten los indicadores patrimoniales en saldo disponible.

La ayuda contextual se actualiza en los capítulos existentes `gestion-ventas`, `gestion-stock` y `finanzas-cajas`, con fecha y revisor. No se crean IDs nuevos ni se altera el resto del manual.

## Validación y alcance pendiente

- Las seis suites nuevas reúnen **64 pruebas**: 25 de caja, 7 del formulario, 5 de aislamiento de Tesorería, 1 del resumen de cuotas, 7 de fechas de venta y 19 de integración con MongoDB real descartable.
- `node --test tests/cashProjection.test.js`: 25 pruebas de saldos por moneda, cuotas netas y reprogramadas, horizontes, vencidos, partidas sin fecha, deduplicación y calidad de los datos, con conservación de las cobranzas legacy.
- `node --test tests/saleDraftForm.test.js`: 7 pruebas del contrato del formulario, guardado mínimo, recuperación, limpieza de referencias, activación y exclusión de archivos.
- `node --test tests/saleCalendarDate.test.js`: 7 pruebas de preservación de fecha calendario, ida y vuelta por ISO, cambio de huso horario, respaldo de creación e invalidación de fechas inexistentes.
- `node --test tests/treasuryHistoricalIsolation.test.js`: 5 pruebas sin conexión a base de datos sobre rechazo de cobro histórico, exclusión de búsqueda explícita de históricos y borradores, y preservación de importaciones legacy sin la marca o con valor `false`.
- `node --test tests/installmentCollectionStats.test.js`: 1 regresión del resumen de cuotas con vencidas, parciales y reprogramadas; exclusión de cuotas cerradas o sin saldo y ventas no operativas; conservación de importaciones legacy y fechas sin asignar.
- `node --test tests/saleCalendarDate.test.js`: 7 pruebas de fechas comerciales de venta, con conservación del día elegido y formatos de presentación consistentes.
- `node --test tests/integration/saleDraft.integration.test.js`: 19 pruebas sobre la API Express y un replica set MongoDB local descartable. Verifican persistencia sin efectos del borrador, activación única y concurrente, rollback real, cargas históricas, permisos, bloqueo de acciones operativas, correspondencia entre venta y cuota, ausencia de escrituras ante rechazos y saldos/fechas efectivos en los endpoints de caja y vencimientos.
- `npm run test:crm-parity` reúne las 45 pruebas puras; `npm run test:crm-parity:integration` ejecuta las 19 integraciones.
- `node tests/helpRegistry.test.js`: certificación de IDs únicos, rutas internas, estructura y búsqueda del manual.
- `npm run check`: aprobado; incluye sintaxis del servidor, ESLint y validación de la estructura del código.
- `npx next build --webpack`: aprobado, con 79 páginas generadas. Esta compilación valida el código de la entrega; no realiza una publicación.

Las pruebas de integración sobrescriben la URI antes de importar la aplicación, usan datos anónimos y enlazan el servidor y MongoDB a `127.0.0.1`. No operan sobre la base de producción. La ayuda de Ventas, Stock y Finanzas conserva los IDs existentes y describe los flujos y límites de esta entrega.

La compilación y las pruebas automatizadas no certifican todos los recorridos de usuario de todos los módulos. Quedan pendientes la paridad completa del CRM y la validación del despliegue en su entorno final. Esta entrega no incorpora una gestión nueva de adjuntos, una contabilidad general nueva ni la habilitación funcional de opciones que ya estaban desactivadas o incompletas. No se publicó ni se modificaron datos reales.
