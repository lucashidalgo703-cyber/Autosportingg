# Implementación de Expedientes — 11/11/2026

Registro de la fase de Expedientes relevada en el CRM de referencia y adaptada a AutoSporting. Describe el alcance implementado y las decisiones que preservan los circuitos propios de la agencia. Las pruebas, la compilación de producción y el recorrido visual de esta fase están validados. El alcance corresponde a Expedientes; no certifica identidad visual absoluta del CRM completo.

Leer junto con [la guía del CRM](crm/README.md), [el contexto de trabajo](crm/AGENT_CONTEXT.md) y [la revisión de Finanzas y Caja](crm/REVISION_FIEL_FINANZAS_2026-11-10.md).

## Alcance y navegación

La pantalla `/admin/expedientes` toma las operaciones de Ventas como fuente. No crea una segunda venta ni ofrece un alta manual paralela. Excluye borradores y operaciones históricas del trabajo corriente; conserva el acceso a la ficha CRM y a la edición canónica de la venta.

El listado incluye vistas por responsable, Sin asignar y Finalizados; filtros de estado, búsqueda, gestor y controles propios de AutoSporting para prioridad, vencimiento y archivo. Los filtros y el expediente abierto se conservan en la URL. Los recuentos, el orden y la paginación se calculan en el servidor antes de presentar la página.

La ficha compacta organiza las doce secciones en tres grupos. Todos los accesos permanecen visibles al mismo tiempo:

| Grupo | Secciones |
| --- | --- |
| Operación | Resumen; Parte Vendedora; Parte Compradora; Permuta; Consignación |
| Documentación | Documentos; Gestoría |
| Administración | Gastos; Cuentas Registro; Liquidación; Comprobantes; Historial |

La cabecera muestra el vehículo, el responsable, el avance y los pendientes disponibles. El pie mantiene los accesos a atención, edición de la venta, boletos, reseñas configuradas y guardado. Las reseñas abren el enlace de la agencia y no envían mensajes. La ficha conserva estados diferenciados de carga, error, falta de permisos y ausencia de datos.

## Estado documental y circuitos independientes

El avance administrativo usa **En proceso → Documentación completa → Transferido → Entregado**. Transferido sigue siendo un expediente activo. Entregado significa entrega de papeles: no modifica por sí mismo el estado comercial de la venta, la entrega física del vehículo ni el cierre de Tesorería.

El servidor exige los documentos, las confirmaciones y los comprobantes correspondientes antes de avanzar. Una excepción autorizada de confirmación requiere un motivo explícito; no fabrica una confirmación del comprador o consignador ni permite eludir los controles financieros. Las confirmaciones manuales registran actor y fecha. Las correcciones de avance conservan el motivo y la auditoría.

Los estados anteriores se normalizan únicamente para su presentación. Leer un expediente no migra ni reescribe ventas existentes. La fuente sigue siendo `Sale`, con datos administrativos propios del expediente y vínculos a Stock, Clientes y Gestoría.

## Formularios, concurrencia y trazabilidad

El resumen, las partes, los documentos y las secciones administrativas tienen guardados explícitos. Un error conserva lo introducido. Se avisa antes de abandonar cambios pendientes y se bloquea el cierre durante operaciones en curso. Las notas y los comentarios destinados a Gestoría o Finanzas se agregan al historial, sin sobrescribir anotaciones anteriores.

Las mutaciones usan la versión que tenía el formulario al comenzar la edición. Una actualización concurrente produce un conflicto que exige revisar o descartar el borrador; no sobrescribe silenciosamente la versión nueva. Las operaciones que lo requieren incorporan claves de idempotencia y auditoría transaccional para evitar duplicaciones por reintentos.

## Documentos privados y OCR

La lectura básica exige acceso a Ventas. Los archivos y su información privada requieren además el permiso de Documentos; su modificación exige los permisos de escritura de Ventas y Documentos. Los datos y las acciones financieras respetan sus permisos específicos. No se amplían los roles para mostrar controles.

Los adjuntos reutilizan el almacenamiento privado y las cargas por partes existentes: hasta 15 MiB por archivo, con fragmentos de 1 MiB. Cada archivo queda vinculado a venta, parte y documento; las descargas autorizadas, el archivo y la restauración mantienen ese alcance. No se generan enlaces públicos permanentes ni se reemplazan los adjuntos originales de Ventas.

El OCR reutiliza el reconocimiento local de documentos. Propone campos que el usuario revisa, corrige y selecciona antes de aplicarlos; no guarda automáticamente los datos reconocidos ni los envía a un proveedor externo. Los vencimientos documentales usan la fecha de emisión registrada y las reglas conocidas del catálogo, sin inventar fechas.

## Gastos, registro y liquidación

Los gastos se separan por parte vendedora o compradora y por moneda. Declarar un gasto pendiente o retenido, cargar una cuenta de registro o adjuntar un comprobante no mueve dinero ni acredita un pago real. ARS y USD permanecen separados: no hay conversión implícita ni importes desconocidos presentados como cero.

El pago de un gasto utiliza el servicio financiero canónico. La cuenta activa debe coincidir con la moneda; el asiento, el saldo de la cuenta, la vinculación del gasto y la auditoría se confirman de forma atómica e idempotente. También puede vincularse un pago real ya registrado de la misma venta, importe y moneda, sin crear un segundo egreso. Un pago no puede asignarse a dos gastos. La anulación del movimiento se refleja al consultar el expediente; corregir un gasto pagado exige respetar el circuito financiero original.

Las cuentas y los depósitos declarados de registro, sus comprobantes y los hitos administrativos se distinguen del cobro de la venta y del reintegro real. La liquidación utiliza los importes canónicos disponibles; los datos ausentes se identifican como desconocidos. Una imagen adjunta no certifica por sí sola un movimiento bancario.

## Funciones propias preservadas

Stock conserva la ficha del vehículo, su adquisición, sus costos y la participación de propietarios o inversores. Las modificaciones correspondientes abren su formulario canónico; no mantienen una copia editable independiente dentro del expediente. Tesorería conserva sus permisos, PIN y circuito de liquidación. Los cobros, las cuotas, la entrega física y las obligaciones existentes siguen sus fuentes originales.

Archivar un expediente es una acción administrativa reversible, autorizada y con motivo. Lo aparta del trabajo activo y conserva su historial; restaurarlo también queda auditado. No equivale a cancelar la venta, borrar la operación, saldar obligaciones ni retirar movimientos de caja.

## Evidencia y validación

La implementación incorpora las pruebas puras `expedienteWorkspace`, `expedienteNavigation`, `expedienteDocuments` y `expedienteAdministration`, y la suite de integración `expedientes.integration.test.js`. Quedan incluidas una vez en `test:crm-parity` y `test:crm-parity:integration`, respectivamente.

La cobertura contempla filtros y normalización, enlaces y fechas, documentos privados, cálculos administrativos, permisos, versiones concurrentes, reglas de avance, aislamiento de venta y caja, archivo reversible y pago atómico con reintentos. Resultados: 255 pruebas unitarias aprobadas (242 previas y 13 nuevas), 183 integraciones aprobadas (175 previas y 8 nuevas), comprobación de 691 archivos y 86 permisos, y build de producción correcto. Se recorrieron los doce apartados en escritorio y 390 px; se verificaron guardado de partes, descarte de borradores, edición canónica de Stock, descarga privada, varias cuentas del registro, pago ficticio del gasto y bloqueo del avance con documentación pendiente. Los boletos de compra y venta financiada se generaron, renderizaron e inspeccionaron en cuatro páginas. Las verificaciones usaron una réplica local con datos ficticios y proveedores externos deshabilitados.

El saldo del encabezado se actualiza al confirmar un pago mediante el evento de cuentas existente y descarta respuestas anteriores. Las acciones del historial se presentan con nombres en español; conservan su detalle, autor y fecha.
