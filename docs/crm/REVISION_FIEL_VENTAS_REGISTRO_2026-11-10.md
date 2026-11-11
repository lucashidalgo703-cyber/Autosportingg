# Revisión fiel de Ventas y reintegros del Registro — 10/11/2026

Rama de trabajo: `codex/crm-revision-fiel-secciones`. Este registro describe implementación local y comprobaciones técnicas. No confirma despliegue ni paridad visual final; la compilación y la revisión visual final se registran por separado.

## Evidencia y alcance

Se tomaron los recorridos observados en la referencia `/v2/ventas/` y `/v2/finanzas/`, comunicados por el agente que controla el navegador, junto con `IMPLEMENTACION_VENTAS_CAJA_2026_11_10.md`, `PARIDAD_SOTE_BASELINE_ACTUAL.md` y `ANALISIS_COMPARATIVO_SOTE_AUTOSPORTING.md`. No se copió código de la referencia ni se guardaron operaciones allí.

La revisión anterior no representaba todas las funciones de Ventas: seña escalar en lugar de lista, permuta indicada sólo con un interruptor, detalle lateral y datos manuales del comprador que desaparecían al activar. Se corrigieron esas diferencias manteniendo los circuitos propios de AutoSporting.

## Ventas

- Listado con vendedor, siete estados, búsqueda, medio de pago, fechas, sólo permutas y períodos rápidos. General, vendedores y pestañas muestran conteos del conjunto filtrado, previos a paginar; cada faceta excluye sólo su propia selección y conserva las demás. Los usuarios activos sin operaciones también figuran con cero. Los filtros y el orden permanecen en la URL; se conservan filtros propios de documentación, entrega y cobranza. Activas incluye las pendientes de entrega. Caídas se identifica explícitamente mediante `cancellationKind`; ninguna cancelación legacy se reclasifica automáticamente.
- Resumen de precios computables sobre operaciones filtradas y sumas ARS/USD separadas. Se excluyen del importe los borradores, canceladas y precios/monedas inválidos; el denominador conserva todas las operaciones filtradas. No es un resumen de caja. Fecha, Vehículo, Comprador, Vendedor, Precio y Status tienen ordenamiento en servidor antes de paginar; Comisión no se ordena. Precio agrupa por moneda y sólo compara importes dentro de cada grupo, sin FX.
- Columnas Fecha, Vehículo, Comprador, Vendedor, Precio, Comisión, Status y Acciones. Exportación sujeta a permisos. Boleto y recibo abren formularios de PDF independientes; descargar no registra caja.
- Detalle centrado de 672 px y alta/edición de 896 px, con cabecera/pie fijos y pantalla completa móvil. La ficha muestra vehículo, comprador, composición financiera, comisión e historial de estados. La ficha CRM conserva cuotas, cobros, cambios de vehículo, inversores, expedientes, postventa y auditoría.
- Editar cierra el detalle y abre el formulario. Cancelar o guardar vuelve al listado. El estado de una operación ya activa es informativo en el editor; el cambio de estado tiene su propio circuito auditado. Alta y continuación de borrador permiten elegir Borrador, Activa, Reserva, Cerrada o Cancelada: Reserva exige unidad disponible y la reserva sin acreditar caja; Cancelada exige permiso de cancelación y motivo y no afecta stock/caja. El cierre operativo inicial se rechaza con explicación para usar la entrega desde la ficha; Carga manual histórica sigue siendo una opción explícita sin efectos operativos. Guardar borrador prevalece sobre el estado inicial elegido.
- Snapshot del comprador editable, visible en ventas activas y PDF, sin crear ni cambiar silenciosamente el cliente vinculado. DNI/CUIT usa el campo real `dniCuit` con compatibilidad legacy. Crear y vincular un comprador desde la ficha requiere Ventas y Clientes de escritura; se realiza atómicamente y repetir el vínculo devuelve el cliente existente.
- Señas múltiples (`depositRecords`) con importe, moneda, fecha, cuenta declarada opcional y comprobante privado. Nacen pendientes y no acreditan caja ni sustituyen la seña aplicada legacy.
- Conciliación explícita contra un ingreso **ya existente**, activo, de esa venta, por igual importe/moneda y cuenta declarada. Requiere Ventas, Finanzas y Caja de escritura. La transacción reclama `Transaction.saleDepositRecordId`, confirma la seña y, si procede de Caja manual, marca `FinanceManualEntry` como Aplicada. No crea otro ingreso; reintentar la misma vinculación es idempotente y un ingreso no sirve para dos señas.
- Permutas múltiples con valor de toma y publicación, moneda, datos técnicos, dueño anterior, consignación y documentos. Alta automática marcada por defecto en nuevas filas; sólo se ejecuta al activar una venta operativa. Desmarcar conserva metadatos sin crear un vehículo. Borradores e históricos no generan stock.
- Venta, reserva de la unidad y autoalta de sus permutas usan una transacción. Las unidades nuevas ingresan pausadas y sin publicar, con origen de toma y propiedad explícitos. La consignada no se convierte en propia por llevar origen de permuta. Seleccionar stock existente conserva sus costos y requiere coincidencia del valor/moneda de toma. No se inventan combustible ni condición.
- La identidad del vehículo que se vende no puede reutilizarse como su propia permuta. Se comprueban identidades activas existentes y las altas de la misma transacción. No se afirma exclusión global por patente frente a altas simultáneas independientes: no se añadió un índice único ni una migración sobre duplicados legacy.
- Monedas separadas. Las tomas de otra moneda sólo se convierten con la cotización ARS por USD explícitamente guardada en la operación. Ninguna seña en otra moneda se resta nominalmente del saldo.
- Bitácora append de Gestoría/Finanzas con autor y fecha, recordatorios por tipo/fecha/nota y reseña solicitada manual con fecha. Los recordatorios automáticos de postentrega son propuestas editables; no envían mensajes.
- Liquidar comisión es una declaración auditada con motivo. No crea un egreso. Google Reviews sólo abre el enlace configurado; no envía mensajes.

### Contratos principales

`GET /api/admin/sales?workspace=1` conserva el endpoint legacy de array sin cambios cuando no se solicita ese modo. El modo de listado devuelve ventas paginadas, `sellerCounts`, `statusCounts`, `summary` y cabecera. Valida una allowlist de orden, dirección y tamaño de página. Una respuesta incluye sus conteos y totales sobre el conjunto completo autorizado, no sólo sus 20 filas. La exportación explícita utiliza ese mismo filtro/orden y requiere permiso de exportación; devuelve el conjunto filtrado completo. Se preserva el recorte de costos y rentabilidad según permisos.

`PATCH /api/admin/sales/:id/workspace` edita los datos comerciales y conserva el estado. Cambiar precio/moneda con cuotas o cobros obliga a utilizar la ficha financiera existente para conciliar obligaciones. `PATCH /workspace-status` registra motivo y conserva la autoridad operativa sobre Stock. Cancelar no revierte cuotas/caja ni libera stock automáticamente.

`PATCH /commission-settlement` declara la comisión liquidada. `PATCH /deposit-records/:depositId/confirm` concilia un ingreso existente. Los documentos privados y sus cargas en bloques utilizan las rutas de documentos de la venta; el formulario conserva los archivos pendientes y reintenta sólo su subida después de guardar, sin volver a crear la venta.

`computeSaleCollection` es una lectura: distingue cobros del comprador de pagos al propietario y gastos, evita duplicar la seña legacy cuando existe su ingreso, y no aplica una seña de Caja manual hasta su conciliación explícita. El waterfall de Tesorería respeta esa exclusión y los flags de consignación. Estas lecturas no modifican saldos.

### Cobro externo y regularización del pendiente

El modal reutilizable de 896 px de Cobros ofrece Caja de la agencia o Pago externo. Caja continúa al circuito de Tesorería existente, conservando sus permisos, PIN, destino y distribución. La ficha financiera también permite abrir esta selección.

`POST /api/admin/sales/:id/buyer-payments` requiere Ventas y Finanzas de escritura. Los modos `external`, `historical` y `settled` son declaraciones sin ledger: pago externo con importe/fecha/medio/constancia; pendiente ya contabilizado históricamente; o pendiente dado por saldado con motivo. Los dos últimos toman exclusivamente el saldo pendiente calculado en servidor. No cambian el estado comercial, `historicalOnly`, la importación legacy ni las cuotas, y nunca acreditan cuentas o cajas.

Las declaraciones se agregan a `externalBuyerPayments` o `buyerBalanceAdjustments`, con autor, fecha e idempotencia. Se validan la moneda exacta de la venta, saldo esperado, importe positivo y límite del pendiente; no hay conversión implícita. Un saldo que cambió produce conflicto y exige actualizar. Las escrituras usan transacción y control de versión entre estas declaraciones; repetir una solicitud no agrega otra declaración. Una venta con cuotas vigentes devuelve `409` y la UI enlaza al módulo real de Cuotas para evitar saldar la venta dejando vencimientos exigibles.

Las lecturas separan cobros registrados/seña aplicada, pagos externos, constancias históricas y saldo dado por saldado. Sólo los créditos declarados reducen el pendiente; `netoCobrado`, efectivo cobrado y margen distribuible no suben por una declaración sin caja. El waterfall conserva su base de capital y muestra estos créditos aparte. Las constancias no se presentan como un ingreso ni como una prueba bancaria. Precio y moneda quedan protegidos mientras existan estos créditos auditados para que un editor genérico no los reinterprete.

Este control no convierte el circuito legacy de Tesorería en una transacción global compartida con todas las declaraciones: no se afirma exclusión total frente a un cobro de Tesorería concurrente que no utiliza el mismo control de versión. Los nuevos modos no alteran ese circuito ni sus asientos.

### Límites que permanecen

La conversión completa Reserva→Venta pertenece a la etapa de reservas pausada; no se reescribió aquí. Los recordatorios embebidos de venta no se publican en Agenda automáticamente. Los datos obligatorios de cada permuta deben completarse para persistirla incluso dentro de un borrador. Los nuevos campos no se rellenan por inferencia ni se migran registros legacy. No se afirma idempotencia general del POST histórico/borrador ante una respuesta de red perdida; debe revisarse el listado antes de repetir una alta cuyo resultado se desconoce.

## Reintegros del Registro

La referencia muestra Por confirmar, Acreditadas y Devueltas al cliente, con búsqueda por patente/cliente/gestor. No tiene alta desde Finanzas: Gestoría informa el reintegro de arancel al finalizar la transferencia.

La fuente nueva `RegistryRefund` se vincula al trámite real `Gestoria`, y conserva snapshot de sus vínculos exactos con venta, cliente y vehículo. Se permite informar desde Transferencia Ingreso/Egreso con estado Transferido o Finalizado; no se deduce un reintegro de diferencias entre costo y cobro del trámite.

- Alta explícita por Gestoría, con importe, moneda, fecha y notas. Requiere lectura/escritura de Gestoría. Nace Por confirmar sin afectar caja. Los reintentos comparten una clave estable; la actualización transaccional del trámite y el índice de idempotencia evitan duplicar la misma solicitud.
- Confirmar acreditación exige Finanzas y Caja de escritura y una cuenta activa de la misma moneda. Una transacción crea un ingreso, incrementa la cuenta y resuelve el reintegro; reintentar no vuelve a acreditar.
- Devuelta al cliente es una declaración con constancia, autor y fecha, sin ingreso ni egreso de la agencia. Es una gestión registrada, no una prueba bancaria generada por el sistema.
- Un reintegro resuelto no se reabre ni cambia de destino desde este circuito. Las correcciones financieras deben mantener la trazabilidad del movimiento existente.
- `Transaction.registryRefundId` enlaza el ingreso con el reintegro. No se agregan `saleId`/`vehicleId` al ingreso para que una devolución de arancel no pase a ser un cobro del comprador o una recuperación de capital de esa venta.
- Listado paginado desde servidor, totales globales por estado y ARS/USD separados, sin FX. No se cargaron reintegros reales ni se consultaron proveedores registrales.

Rutas: `GET/POST /api/admin/gestoria/:id/registry-refunds`; `GET /api/admin/finance/registry-refunds`; `PATCH /api/admin/finance/registry-refunds/:id` para resolver. Los errores incluyen mensaje y campos; la UI conserva el formulario para corregir y reintentar.

## Comprobaciones técnicas

Ventas: suite completa de borradores/ventas/caja con **25/25** casos de API verdes, más **2/2** focales de conciliación y **1/1** de rechazo de la propia identidad como permuta. El cierre de Cobros añadió **4/4 casos focales** verdes de pagos externos, histórico y saldado: reintento y permisos de otra sesión, importes inválidos/exceso/moneda, cuotas vigentes, legado sin reescritura, concurrencia y rollback de auditoría. Se repitió el caso de pago externo tras agregar la protección de precio/moneda, también verde. **26 pruebas puras de Ventas** verdes, incluyendo cuatro de conteos, facetas, resumen, orden y exportación sobre más de una página, además de la proyección de créditos sin duplicar efectivo ni margen. Las **2/2 comprobaciones de API** del cierre de QA también fueron verdes: 28 operaciones con orden/conteos entre páginas y estados iniciales con guardas. ESLint de las fuentes de Ventas: cero errores; permanece una directiva de supresión sin uso en el panel de cuotas preexistente. `node --check server.js` correcto.

Reintegros: **6/6 casos de API** verdes: RBAC y origen válido, alta y reintento concurrente, confirmación con cuenta activa/moneda exacta, crédito único sin alterar el saldo del comprador, devolución directa sin caja, rollback posterior al ingreso y lectura paginada con resumen por moneda. **2/2 pruebas del transporte cliente** verdes, incluyendo la ruta de origen Gestoría, la lectura de cuentas y el descarte de otra sesión. ESLint de las fuentes de reintegros y `node --check server.js`: correctos. El primer intento de esta suite requirió corregir el fixture para mantener el mismo usuario entre reintentos y admitir la respuesta no JSON de una ruta inexistente; no fue un fallo de persistencia.

Los tests usan un replica set MongoDB descartable en loopback, claves falsas y bloqueo de llamadas externas. No utilizan la base de producción. Build y QA visual se registran por separado tras completarlos.
