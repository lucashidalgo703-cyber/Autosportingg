# Revisión de Finanzas y Caja — 10/11/2026

Registro de la implementación local de las secciones relevadas del CRM de referencia y de su integración con AutoSporting. Describe el comportamiento disponible, sus fuentes y sus límites. La compilación final, la aceptación visual global y la publicación quedan a cargo de la integración principal y no se dan por aprobadas en este documento.

Leer junto con [la guía del CRM](README.md), [el análisis de Ventas y Caja](IMPLEMENTACION_VENTAS_CAJA_2026_11_10.md), [la revisión de Clientes y Stock](REVISION_FIEL_CLIENTES_STOCK_2026-11-10.md) y [la revisión de Ventas y Registro](REVISION_FIEL_VENTAS_REGISTRO_2026-11-10.md). Las decisiones posteriores de esta revisión prevalecen sobre las descripciones anteriores que asumían equivalencias todavía no verificadas.

## Alcance visible y navegación

La pantalla permanece en `/admin/finanzas`. Conserva los identificadores de consulta `?tab=` y organiza el trabajo en seis grupos:

| Grupo | Vistas principales |
| --- | --- |
| Resumen | Resumen; Por cobrar y pagar |
| Caja y bancos | Cuentas; Movimientos; Cheques |
| Cobros | Vehículos por cobrar; Cuotas; Señas |
| Pagos | Pagos disponibles; Cuotas a pagar; Comisiones; Devoluciones registro; Retiros; Tarjeta; Préstamos |
| Control y cierres | Conciliación; Arqueos; Cierre de caja; AFIP/IVA |
| Análisis y planificación | Rentabilidad; Presupuesto; Recurrencias |

También se preservan Pago Empresas, Sueldos, Taller/Mecánico, Gastos Personales y Resumen de Gastos. No se eliminan por no tener una correspondencia exacta en la referencia. Las funciones de asignación de cuotas a gastos, liquidaciones a propietarios, inversiones y Tesorería Estratégica mantienen su circuito propio.

Los formularios principales usan controles compactos, etiquetas asociadas, secciones legibles, cabecera y pie persistentes y diálogo a pantalla completa en móvil. Se conserva el contenido introducido frente a un error. Las acciones de guardado esperan la respuesta; los formularios nuevos incorporan protección de cambios sin guardar, control de foco y cierre por Escape cuando no hay una operación en curso. Las vistas y formularios auxiliares de Tarjeta, Retiros, Préstamos, Presupuesto y Recurrencias reutilizan la presentación y el acceso financiero compartidos.

## Qué significan los importes

### Saldo registrado, actividad y proyección

- **Saldo registrado de cuentas:** suma los saldos de las cuentas activas en su moneda. No certifica una conciliación bancaria ni que todos los fondos sean exclusivamente de la agencia.
- **Actividad externa:** ingresos menos egresos activos. Excluye pendientes, anulados y transferencias internas; no reemplaza el saldo de cuentas.
- **Gráficos:** usan movimientos y periodos reales. Los selectores ARS/USD cambian la serie consultada; no convierten importes. El desglose de egresos del resumen indica su mes.
- **Proyección de liquidez:** lectura de saldos registrados y obligaciones modeladas para 7/15/30 días, con vencidos, calendario y registros sin vencimiento separados. No presupone ventas futuras ni recuperación de mora.
- **Por cobrar y pagar:** muestra obligaciones programadas reales. No presenta como cero importes que el sistema no modela, ni suma de forma indiscriminada el saldo completo de una venta y las cuotas que representan esa misma deuda.

`useFinanceWorkspace` mantiene separadas las fuentes de cuentas, movimientos, cuotas y señas. Una consulta fallida se identifica y puede reintentarse; no se interpreta como una cuenta o cartera vacía. Se invalida la información de una sesión anterior.

ARS y USD se mantienen separados. No se aplica una cotización implícita, un umbral de precio para adivinar la moneda ni un precio mínimo inventado. Las fechas de calendario conservan su día; los instantes reales se presentan con el calendario de Argentina cuando corresponde.

### Compromisos de adquisición de Stock

`Car.purchasePaymentState.pendingDebt` representa el saldo pendiente de la agencia; ya contempla, cuando corresponde, la participación del socio. Los compromisos en estado pendiente/parcial se incluyen en la proyección con su moneda explícita y `expectedDate` como vencimiento, sin aplicar nuevamente un porcentaje. Sin fecha quedan sin vencimiento supuesto. La deuda persiste aunque la unidad se haya vendido. La proyección sólo publica los datos financieros mínimos necesarios y no devuelve los datos privados del propietario.

El resumen patrimonial de Stock usa sus fuentes propias y se documenta en la revisión de Stock. La suma de componentes modelados se presenta como una estimación por moneda, no como capital totalmente conciliado ni dinero libre para gastar.

## Operaciones y efecto en Caja

### Movimientos y cuentas

El formulario de movimiento conserva descripción, tipo, monto, moneda, categoría, fecha, medio, notas y vínculos con venta, reserva, cliente, vehículo y cuota. También conserva beneficiario, vencimiento de obligación, empresa, vendedor/usuario y la asignación de cuotas para cubrir un gasto.

La UI exige una cuenta activa compatible con la moneda para registrar manualmente un movimiento. `POST/PATCH /api/admin/transactions` valida una cuenta suministrada expresamente: no reemplaza una cuenta inválida, inactiva o de otra moneda por una caja automática. La ausencia del campo conserva el comportamiento heredado para integraciones existentes. Un pendiente no afecta el saldo registrado.

Movimientos permite filtrar por cuenta real, moneda, vínculo y fechas, incluyendo movimientos sin caja. La columna Caja identifica la cuenta; no confunde ARS/USD con una cuenta física. Anular conserva auditoría: no equivale a borrar permanentemente. Los movimientos que pagan una cuota a un acreedor protegen sus importes y vínculos para no desalinear el plan; su editor genérico permite notas y rechaza una anulación ajena al circuito de origen.

La edición de una cuenta conserva su moneda. El ajuste de saldo y la revisión/recalculado de diferencias siguen siendo acciones explícitas propias de AutoSporting; no se ejecutan por consultar un resumen ni por registrar un arqueo. El historial de cuenta y el resumen mensual excluyen pendientes y anulados. El resumen mensual es un cálculo de actividad; los snapshots versionados se consultan en Cierre de caja.

### Transferencias internas

`financeTransferService` registra las dos partidas y actualiza ambas cuentas dentro de una transacción MongoDB. Valida cuentas distintas y activas, importe finito positivo y moneda de origen. Si hay monedas diferentes exige cotización e importe de destino explícitos. La clave de idempotencia se vincula al actor y a los datos: el mismo reintento no vuelve a retirar dinero; reutilizar la clave con otros datos produce conflicto.

Una transferencia interna modifica cuentas individuales, pero no se presenta como ingreso o egreso externo en el resumen de actividad.

### Señas y pagos disponibles manuales

`FinanceManualEntry` distingue `deposit` de `payable`:

| Fuente | Estados | Efecto autorizado |
| --- | --- | --- |
| Seña manual | Recibida / Aplicada / Devuelta | Recibida con cuenta registra ingreso; Devuelta con cuenta registra egreso; Aplicada no genera otro movimiento |
| Pago disponible manual | Pendiente / Disponible / Pagado | Pendiente y Disponible no generan egreso; Pagado con cuenta registra egreso |

Sin cuenta, los estados monetarios son declaraciones auditadas y no modifican saldos. La UI lo indica antes de guardar. Tras contabilizar un movimiento, se protegen los términos económicos y se permite editar notas. Un movimiento anulado se identifica y deja de presentarse como efecto vigente en Caja.

Las fuentes de venta, reserva y movimiento existentes siguen disponibles. `Transaction.financeManualEntryId` identifica el asiento de una carga manual y evita contar además ese mismo asiento como otra seña independiente. Vincular un registro manual con una venta no aplica automáticamente su dinero al comprador: la conciliación de la seña con Ventas es una acción explícita del circuito de Ventas, documentada por separado.

### Cuotas a pagar y planes

La deuda a acreedores usa `FinancePayablePlan` y `FinancePayableInstallment`, separados del modelo `Installment` de cuotas a cobrar. El formulario permite acreedor, tipo de deuda, concepto, moneda, importe por cuota, cantidad, frecuencia mensual/quincenal/semanal, primer vencimiento, notas, vehículo opcional cuando corresponde y calendario personalizado por fecha/importe. La creación del plan no genera ledger.

Los pagos son explícitos, totales o parciales, con cuenta activa de la misma moneda, fecha, medio y notas. El servicio valida el saldo pendiente y guarda cuota, egreso, cuenta e historial dentro de la misma transacción. La clave de reintento impide duplicar un pago. `FinancePayableOperation` y `Transaction.financePayableInstallmentId` conservan la trazabilidad. La vista separa deuda y pagado por moneda, muestra vencidas/próximas, filtra acreedores y conserva el historial de pagos parciales.

**Regla de adquisición existente:** si se intenta crear un plan `auto_cuotas` con `carId` y esa unidad ya tiene `purchasePaymentState.pendingDebt > 0`, el servidor devuelve `409` y la UI dirige al compromiso de compra en Stock. También se rechaza convertirlo mediante `usePurchaseCommitment`. No se desplegó un enlace automático entre los dos circuitos ni un checkbox que prometa hacerlo. Un compromiso pendiente con saldo inválido requiere revisión en Stock.

La alternativa de enlazar plan y compromiso requeriría exclusión compartida y recuperación de operaciones entre todos los escritores de Stock y Finanzas. Hasta tener esa garantía, los abonos de una compra ya registrada se hacen desde su circuito propio de Stock. Los planes independientes sin ese compromiso previo siguen disponibles. No se deduplican obligaciones por parecido de descripción, importe o matrícula.

### Cobro de vehículos: Caja, externo, histórico y saldado

Vehículos por cobrar consume la lectura comercial de Ventas y abre `SaleBuyerCollectionModal`. La opción Caja conserva `TreasuryCollectAndDistributeModal`, sus cuentas, PIN y distribución de AutoSporting.

`saleBuyerCollectionService` añade declaraciones `external`, `historical` y `settled` a `Sale.externalBuyerPayments` o `Sale.buyerBalanceAdjustments`. Son créditos del comprador **sin asiento bancario**:

- Externo registra un importe recibido fuera de las cuentas de la agencia, con medio, fecha y constancia.
- Histórico declara el pendiente que ya fue contabilizado anteriormente; no convierte la venta en una importación histórica.
- Dar por saldado registra una regularización explícita con motivo; no la presenta como un cobro.

Se exige moneda exacta de la venta, saldo esperado, clave de reintento y constancia. Histórico/saldado toman el pendiente calculado en servidor. Un saldo cambiado devuelve conflicto. Una venta con cuotas vigentes devuelve `409` y dirige a Cuotas para conservar sus vencimientos y pagos. No se pagan cuotas, comisiones ni obligaciones de terceros por estas declaraciones; tampoco se cambia el estado comercial.

`computeSaleCollection` separa cobros del comprador, devoluciones identificadas al comprador, seña aplicada y créditos sin Caja. Un pago al propietario no se descuenta de la cobranza del comprador. Se conserva la restricción de una seña manual hasta su conciliación explícita. Las declaraciones sin Caja no aumentan efectivo ni margen distribuible del waterfall.

El control de versión de estas declaraciones no convierte el circuito legacy completo de Tesorería en una única transacción compartida. No se afirma exclusión global frente a cualquier escritor de cobros heredado. Ver el contrato y los límites completos en la [revisión de Ventas y Registro](REVISION_FIEL_VENTAS_REGISTRO_2026-11-10.md).

### Devoluciones del Registro

La referencia origina estos reintegros en Gestoría, no en una carga libre de Finanzas. La implementación respeta ese origen con `RegistryRefund`: sólo se declara desde una transferencia de ingreso/egreso en estado Transferido o Finalizado. Se conservan referencias y una descripción del trámite, cliente y unidad.

Finanzas consulta y resuelve Por confirmar / Acreditada / Devuelta al cliente, con búsqueda y resumen por moneda. Acreditar exige cuenta activa compatible y genera ingreso más saldo y auditoría en transacción. Devuelta al cliente declara un reintegro directo del Registro al cliente, sin paso por Caja de la agencia. Una resolución repetida compatible es idempotente; no se inventan reintegros a partir de una venta ni se confunden con cobros del comprador.

## Control, cierres y análisis

- **Conciliación CSV:** fecha, descripción y monto con signo, hasta 3 MB en el transporte actual. Las coincidencias por diferencia de importe menor a 1 y fecha de hasta ±3 días son propuestas. Cargar el archivo no ajusta saldos; la creación de movimientos exige decisiones y confirmación explícitas. Se conserva esa función propia de AutoSporting.
- **Arqueos:** fecha, responsable, cuenta/moneda, saldo físico, motivo y notas. Se calcula el saldo registrado a la fecha, conservando el saldo inicial y descontando el efecto posterior. Editar sin cambiar cuenta, moneda o fecha conserva el snapshot original. Guardar no ajusta cuentas ni crea movimientos.
- **Cierre de caja:** snapshot del día actual por cuenta y moneda. Volver a cerrar exige motivo y conserva una nueva versión. El contador de versiones y la auditoría se guardan con el cierre. Hay exportación XLSX real; no es el reinicio financiero de la empresa.
- **Rentabilidad del área:** multas, transferencias de gestoría, gestoría, honorarios, servicios, trámites y verificaciones. Mantiene monedas y periodos separados; excluye ventas de vehículos, deuda de adquisición y transferencias internas. Los reportes propios de margen por vehículo siguen en sus módulos. Las señas activas y las cuotas pendientes del periodo se muestran separadas, sin sumarlas como ingresos realizados.
- **Auxiliares:** Tarjeta, Retiros, Préstamos, Presupuesto y Recurrencias conservan sus endpoints y reglas propias. Los formularios esperan errores reales, filtran cuentas por moneda y se invalidan al cambiar de sesión. Generar recurrencias, devolver un préstamo o eliminar un registro continúa siendo una acción explícita.

## Documentos PDF y comprobantes privados

### Recibo y boleto

`FinanceDocumentModal` y `financeDocuments` preparan PDF locales independientes, reutilizables desde Finanzas y Ventas. Incluyen datos editables del emisor obtenidos mediante una proyección mínima de Configuración; no exponen secretos de configuración ni inventan un DNI/CUIT de la agencia.

El recibo incluye fecha, ciudad/número, persona de quien se recibe, importe/moneda, concepto, medio, observaciones y firma en blanco. El boleto incluye comprador, vehículo, importe, condición de pago, permutas repetibles, saldo, financiación, representante y agencia. Si permutas e importe tienen monedas diferentes no se calcula un saldo mediante una conversión supuesta.

Descargar estos PDF no crea venta, ingreso, egreso, recibo contable ni movimiento automático. Se revisa el documento antes de cualquier uso externo.

### Pagarés como borradores

Desde un plan creado, **Pagarés del plan** abre `PayablePromissoryDraftModal`. Permite elegir cuotas pendientes y revisar acreedor, deudor, DNI/CUIT, domicilios, fecha/lugar de creación, lugar de pago, importe y vencimiento. La propuesta inicial usa el saldo pendiente consultado; las cuotas pagadas quedan inhabilitadas. La moneda se conserva, sin FX.

Se preparan PDF individuales y un PDF conjunto para abrir/revisar o descargar. Llevan la marca visible **BORRADOR PARA REVISIÓN — SIN FIRMAR**, firma en blanco y enlace a la fuente oficial. Editar estos datos sólo cambia el documento propuesto: no acepta un contrato, no registra pagos y no duplica deuda. No se agregan cláusulas de intereses, jurisdicción, renuncias o aceleración de vencimientos.

Los datos permanecen en memoria de la ventana y en los archivos que el usuario decida abrir/descargar. No se suben al servidor ni se guardan en un borrador local persistente con DNI. Los enlaces temporales se revocan al editar, cerrar o cambiar de sesión. No se presenta la generación sin firma como validación jurídica del instrumento.

Bibliografía primaria consultada para los campos: [Decreto-ley 5965/1963, texto actualizado, artículos 101 y 102](https://www.argentina.gob.ar/normativa/nacional/decreto_ley-5965-1963-69687/actualizacion). Se utilizó para distinguir denominación y promesa, importe, beneficiario, vencimiento, lugares/fecha y firma; no se ofrece una conclusión jurídica sobre un caso particular.

### Comprobantes de movimientos

`FinanceDocument` guarda el binario separado de `Transaction`, con `data` y hash excluidos de la selección ordinaria. La lista devuelve metadatos; la descarga exige autenticación y entrega un adjunto con `nosniff`, `private/no-store`, sin URL pública. Se admiten hasta cinco archivos activos de hasta 15 MiB cada uno; el nombre y MIME se sanea y un tipo desconocido se descarga como `application/octet-stream`.

El transporte privado usa bloques JSON de 1 MiB para evitar los límites de cuerpo de las funciones de Vercel. Se verifica el manifiesto y los hashes; la finalización atómica conserva un registro permanente de la carga para que un reintento no duplique archivos aunque ya se hayan limpiado los bloques temporales. La descarga usa rangos de hasta 1 MiB y recompone el archivo en el navegador. La eliminación es recuperable y conserva auditoría y binario.

El alta de un movimiento y sus comprobantes son pasos distintos: primero se confirma el movimiento; luego se suben sus archivos. Si falla la segunda parte, el formulario conserva el identificador guardado y reintenta los adjuntos sin registrar otro movimiento. Cada paso usa la sesión capturada y se cancela/invalida ante cierre o cambio de sesión. La limpieza temporal no purga documentos permanentes.

## Servicios, modelos y contratos principales

| Área | Implementación principal | Modelos/fuentes |
| --- | --- | --- |
| Resumen y lecturas | `financeWorkbench`, `useFinanceWorkspace`, `FinanceOverview` | Account, Transaction, Installment y fuentes de señas |
| Liquidez | `cashProjectionService`, `cashProjection` | Cuentas, cuotas a cobrar/pagar, pendientes, pagos manuales y compromisos de compra de Car |
| Transferencias | `financeTransferService` | FinanceTransfer, Account, Transaction |
| Señas/pagos manuales | `financeManualService` | FinanceManualEntry, Account, Transaction |
| Deuda a acreedores | `financePayablePlanService`, `financePayablePlans` | FinancePayablePlan, FinancePayableInstallment, FinancePayableOperation |
| Arqueos/cierres | `financeCashCountService`, `financeDailyCloseService` | CashCount, DailyCashClose, FinanceCloseSequence, AuditLog |
| Cobranza del comprador | `saleBuyerCollectionService`, `saleCollection` | Sale, Transaction, Installment, AuditLog |
| Reintegros del Registro | `registryRefundService`, `registryRefundRoutes` | RegistryRefund, Gestoria, Account, Transaction, AuditLog |
| Comprobantes | `financeDocumentService`, `registerFinanceDocumentRoutes`, transporte privado compartido | FinanceDocument, PrivateUploadChunk, Transaction, AuditLog |
| PDF locales | `financeDocuments`, `payablePromissoryDraft` | Datos del formulario en memoria; proyección mínima de CrmSettings |
| Auxiliares | `FinanceAuxiliaryWorkspace`, `useFinanceResource`, `financeRequest`, `financeAuxiliary` | Endpoints propios de tarjeta, retiros, préstamos, presupuestos y recurrencias |

Los endpoints usan el prefijo `/api/admin`:

| Contrato | Uso |
| --- | --- |
| `GET /finance/cash-projection` | Proyección de lectura, sin ledger |
| `GET /accounts/:id/movements` y `GET /transactions/monthly-close` | Historial activo por cuenta y cálculo mensual |
| `POST /transactions`; `PATCH /transactions/:id` | Movimiento manual y edición con validación de cuenta explícita |
| `POST /tesoreria/transfer` | Transferencia interna atómica e idempotente |
| `GET/POST /finance/manual-deposits`; `PATCH /finance/manual-deposits/:id` | Señas manuales |
| `GET/POST /finance/manual-payables`; `PATCH /finance/manual-payables/:id` | Pagos disponibles manuales |
| `GET /finance/payable-installments` | Cuotas a pagar y sus planes |
| `POST /finance/payable-plans` | Crear calendario de deuda sin Caja |
| `POST /finance/payable-installments/:id/pay` | Registrar pago parcial/total de una cuota |
| `GET/POST /finance/cash-counts`; `GET /finance/cash-counts/book-balance`; `PATCH /finance/cash-counts/:id` | Consultar saldo histórico y guardar arqueos |
| `GET/POST /finance/daily-closes` | Consultar y guardar versiones de cierres |
| `GET/POST /finance/periods`; `GET /finance/periods/:id` | Consultar períodos e iniciar uno conservando saldos y obligaciones; leer un resumen archivado |
| `GET /finance/profitability` | Rentabilidad mensual de Finanzas/Gestoría |
| `GET /finance/document-issuer` | Nombre, domicilio y teléfono del emisor; DNI editable inicialmente vacío |
| `POST /sales/:id/buyer-payments` | Declaración externa, histórica o de saldo regularizado, sin Caja |
| `GET /finance/registry-refunds`, `PATCH /finance/registry-refunds/:id` | Consulta y resolución en Finanzas |
| `GET/POST /gestoria/:id/registry-refunds` | Origen del reintegro en Gestoría |
| `GET /transactions/:id/documents`, `GET/PATCH /transactions/:id/documents/:documentId` | Metadatos, descarga privada y baja/restauración |
| `POST /transactions/:id/document-uploads/:uploadId/chunks` y `/commit` | Transporte y finalización de comprobantes |

Los contratos de carga, cierre, transferencia y pagos que requieren atomicidad necesitan MongoDB con transacciones. No se reemplazan por escrituras parciales si el entorno no ofrece esa capacidad. Los PDF se generan con `jspdf` en el navegador; no requieren un servicio externo de documentos.

## Permisos y sesión

- La pantalla financiera exige `finanzas.read`; la proyección también exige `caja.read`. Las mutaciones financieras nuevas requieren los permisos de escritura indicados por sus rutas.
- Cuentas y transferencias conservan `caja.write`. El circuito privado de cobro/distribución conserva su restricción a owner/admin, permisos financieros/de Caja y PIN de Tesorería.
- La declaración del comprador sin Caja requiere `ventas.write` y `finanzas.write`. No hereda la autorización para contabilizar un ingreso.
- Crear un reintegro desde Gestoría exige `gestoria.read/write`; resolverlo exige `finanzas.read/write`, y acreditarlo en una cuenta exige además `caja.write`.
- Comprobantes de movimientos exigen `finanzas.read` para consultar/descargar y también `finanzas.write` para subir/eliminar/restaurar. Pagarés/PDF locales no conceden autorización para pagar, firmar o cambiar obligaciones.
- Se preservan las restricciones preexistentes del rol de ventas sobre operaciones financieras. Los permisos efectivos se verifican en backend; ocultar/deshabilitar un control no sustituye esa validación.

Las consultas y mutaciones nuevas capturan token/sesión, cancelan o ignoran respuestas obsoletas y reinician el estado al cambiar de registro o sesión. No se reutilizan archivos ni datos de un usuario anterior. Una respuesta de guardado incierta no se muestra como una confirmación de dinero; los reintentos usan su clave o exigen revisar la fuente cuando el circuito heredado no ofrece esa garantía.

## Validaciones registradas

Pruebas ejecutadas con datos ficticios y MongoDB local aislado, sin consultar proveedores externos ni ejecutar movimientos reales en producción:

| Suite | Casos aprobados | Evidencia principal |
| --- | ---: | --- |
| `tests/financeWorkbench.test.js` | 8 | Saldo vs actividad, fuentes ausentes, moneda/mes, FX explícito, saldo de permutas, PDF real, calendarios de deuda, alcance de rentabilidad y fechas |
| `tests/payablePromissoryDraft.test.js` | 3 | Saldo residual/moneda/fechas sin modificar deuda, datos incompletos/cuotas pagadas y PDF individuales/conjunto con firma en blanco |
| `tests/integration/financeIntegrity.integration.test.js` | 13 | Reintentos y rollback de transferencias; comprobantes de 15 MiB/auditoría/recuperación; arqueos históricos; cierres versionados; planes/pagos parciales; rechazo de duplicación con Stock; proyección y deuda de unidades vendidas |
| `tests/integration/financeCoreApi.integration.test.js` | 5 | RBAC y cuenta explícita; chunks/rangos privados y reintentos; proyección sin escrituras; lecturas mensuales/área/cuenta; una sola deuda de Stock en Capital y proyección |
| `tests/integration/financePeriods.integration.test.js` | 8 | RBAC; archivo sin modificar fuentes; reintentos/concurrencia y confirmación obsoleta; rollback de auditoría; inmutabilidad y alta retroactiva; confirmación explícita; fuentes desconocidas; HTTP privado |

Los casos base y los últimos casos añadidos se verificaron en ejecuciones completas y focalizadas de las suites afectadas; estos conteos no certifican una corrida global final de todo el repositorio. Las pruebas específicas de Ventas, Registro, Capital y los auxiliares se registran en sus revisiones y en la integración principal.

También se ejecutaron lint de los archivos financieros afectados, comprobación reforzada de referencias y bindings JSX y sintaxis de servidor. Una muestra ficticia de pagarés, de dos páginas A4, se generó con el código real, se renderizó con Poppler y se inspeccionó visualmente. Eso verifica el PDF de muestra; no sustituye la revisión de toda la UI ni de todos los documentos que un usuario pueda componer.

**Pendiente de la integración principal:** compilación final después del congelado de fuentes, revisión visual global en escritorio/móvil, comprobación de navegación integrada y, cuando corresponda, publicación y prueba del sitio desplegado. Este documento no afirma que los cambios estén en GitHub, Vercel o producción.

## Períodos de gestión conservando saldos y obligaciones

El usuario eligió **«Iniciar un período conservando saldos y obligaciones»**. Se implementó una frontera de informes en **Control y cierres → Períodos**. No se implementó como anulación masiva, borrado de historial, recálculo de saldos ni traslado de fondos.

El inicio requiere `finanzas.read/write`, escribir el nombre de la agencia configurada y un motivo. `FinancePeriodState` serializa los inicios mediante un singleton/CAS; se exige `expectedCurrentPeriodId` para rechazar una confirmación obsoleta. `FinancePeriodOperation` usa su `_id` único para el recibo por actor/clave y verifica el digest del contenido: reintentar la misma confirmación devuelve el resultado ya guardado, reutilizarla con otros datos devuelve conflicto. Archivo, frontera, recibo y auditoría se guardan en la misma transacción MongoDB con `readConcern:snapshot`; un fallo revierte todos esos registros.

`FinancePeriodArchive` conserva un resumen inmutable: cuentas y saldos por moneda, actividad externa de movimientos activos, conteos de pendientes/anulados/traspasos y rango de fechas, pendientes de las fuentes canónicas de proyección, lectura de créditos/deudas de Capital y observaciones de calidad. Las lecturas comparten sesión y se ejecutan secuencialmente. Capital y proyección se superponen y no se suman. Las monedas no se convierten y los pendientes de moneda no confiable permanecen desconocidos. Se incluyen los compromisos de compra de Stock aun si el vehículo se vendió, las cuotas parciales y los vencimientos reprogramados.

Los intervalos del resumen de movimientos utilizan `createdAt` (inicio inclusive, fin exclusive), separado de la fecha comercial. Una carga tardía con fecha comercial anterior se resume en el período en que fue registrada. El primer archivo incluye el histórico previo, incluso registros sin fecha de alta, que quedan contados explícitamente. Los saldos se capturan como valores registrados, no se deducen del neto del intervalo.

**Ningún saldo, movimiento, venta, cuota, seña, pago, compromiso de Stock, dato de Tesorería ni otra fuente se elimina o modifica.** Los listados operativos mantienen todo su historial. No hay un bloqueo global de escrituras ni un filtro que oculte operaciones previas. El archivo es un resumen de gestión, no un cierre fiscal, conciliación bancaria, exportación completa ni copia restaurable. Las anulaciones filtradas y los cierres de caja versionados conservan su significado propio.

La nueva suite `tests/integration/financePeriods.integration.test.js` verifica RBAC real, ausencia de escrituras por lectura, conservación de fuentes, concurrencia/reintentos, conflicto de claves/contenido y fronteras obsoletas, rollback por auditoría, inmutabilidad del archivo, cargas comerciales retroactivas, cuentas ausentes y monedas de pendientes desconocidas. La compilación y QA visual integradas de esta ampliación quedan a cargo de la integración principal.

## Límite de esta revisión

La implementación integra las funciones observadas con las fuentes reales de AutoSporting y conserva sus extensiones. No se certifica equivalencia total a partir de que existan las pestañas o de que una prueba pase. La referencia se recorrió sin ejecutar operaciones financieras finales; las reglas de escritura se verificaron en el entorno local aislado. Las diferencias o decisiones pendientes deben permanecer visibles en la revisión y no ocultarse con controles inertes, conversiones supuestas o confirmaciones de conciliación no realizadas.
