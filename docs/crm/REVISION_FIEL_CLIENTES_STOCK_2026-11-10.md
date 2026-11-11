# Revisión fiel de Clientes y Stock — 10/11/2026

## Estado del registro

Rama de trabajo: `codex/crm-revision-fiel-secciones`, iniciada sobre la base publicada anteriormente `c1f836f`. Este documento distingue el **cierre histórico inicial** de la **ampliación local actual**. Describe implementación y evidencia verificable; no acredita un commit, despliegue en Vercel ni paridad completa del CRM.

Los límites iniciales sobre OCR, importación, documentos privados, NPS contextual, retiro de venta, portal del propietario y operaciones abiertas en Ranking **fueron superados por implementaciones posteriores descritas aquí**. No deben reutilizarse como descripción del estado actual. La etapa 4 independiente de reservas permanece pausada; no se retoma mediante este registro. Los contratos de Ventas y Registro se documentan además en [su revisión específica](REVISION_FIEL_VENTAS_REGISTRO_2026-11-10.md).

La referencia se observó mediante su interfaz renderizada, sin copiar código, marca ni datos privados. Se conservan identidad y funciones de AutoSporting. El relevamiento no certificó envíos efectivos ni todas las transiciones de la referencia.

## Evidencia visual y alcance de la interfaz

- Clientes conserva siete vistas: Clientes, Tabla detallada, Pipeline, Seguimientos, Ingresos, Demanda y Ranking; panel rápido y ficha completa con Resumen, Conversación, Historial, Operaciones y Documentación.
- La ficha completa utiliza 672 px en escritorio, altura automática con máximo de pantalla menos 64 px y radio de 16 px. Alta y edición utilizan el marco de 896 px. No se fuerza una altura de 936 px ni se aplica el ancho de alta a la ficha.
- En la revisión local más reciente, raíz verificó ficha de 672 px, alta de 896 px y controles con superficie coincidente con el diálogo. El formulario de Cliente dispone sus campos principales en dos columnas; solamente Qué busca usa tres. Captación y borrador se muestran sólo al crear. OCR, relación comercial y seguimiento propios se conservan.
- El selector de Stock utiliza una entrada con resultados y navegación de teclado. Sólo vincula un ID elegido del catálogo; escribir un nombre parcial no selecciona una unidad. Limpiar el vínculo conserva los criterios estructurados de búsqueda.
- Se verificó localmente con archivos ficticios la carga de dos documentos de Cliente, eliminación lógica y restauración. Esta evidencia no sustituye una matriz completa de navegadores, roles, tamaños o despliegue.
- Se conservan foco, Escape, restauración de foco/scroll, encabezados y pies fuera del desplazamiento, errores recuperables y aislamiento de consultas/modales por sesión. Las reglas de superficie y bordes se limitan al CRM; no son una modificación de la web pública.

## Clientes: datos y comportamiento actual

| Información | Fuente y contrato |
| --- | --- |
| Directorio y métricas | Totales del conjunto filtrado en servidor antes de paginar; no se extrapolan los 20 registros visibles. Filtros, selección/exportación y regreso seguro mediante `returnTo` se conservan. |
| Contactado / nuevo | `contactConfirmed` es una confirmación independiente de la etapa. La compatibilidad con fecha, interacciones y etapas legacy no invalida un `false` explícito. Volver a Nuevos no borra el historial ni reabre una operación. |
| Períodos | Calendario de Argentina. Hoy, ayer, 7/30 días, mes, mes anterior y todos; `byDay30` mantiene su cobertura de 30 días propia. La agrupación mensual de contactos conserva su fuente específica. |
| Demanda | Marca/modelo/años/presupuesto estructurados y vínculo exacto `interestedVehicleId → Car`. No se deduce un interés por similitud de nombres ni se convierte moneda automáticamente. |
| Ranking cerrado | Ventas entregadas, fecha calendario de venta y cliente vinculado; recuperación de historia por DNI exacto sólo si identifica un único cliente. No modifica ni religa ventas en Mongo. Históricas válidas se identifican. |
| Operaciones abiertas en Ranking | Se muestran separadas mediante opción explícita. Señadas, confirmadas y pendientes de entrega no incrementan compras cerradas ni facturación entregada. Monedas y datos ambiguos/inválidos se informan aparte. Requiere `ventas.read`. |
| Asignación | La rotación se solicita expresamente en el alta. Se considera disponibilidad del vendedor de la unidad y después la cola correspondiente a Puerta/Digital. Una asignación manual prevalece; editar no ejecuta rotación automática. |
| Gestión / agenda | Una respuesta efectiva puede confirmar contacto y avanzar sólo etapas iniciales. Nota interna, envío, intento sin respuesta, cita o próxima acción no certifican respuesta ni rebajan una etapa avanzada. |
| Pedido vinculado | Activación/sincronización/cierre transaccionales, sin duplicar Cliente ni sustituir Pedidos manuales. No envía avisos automáticamente. |

Alta y edición conservan segmento Regular/VIP separado de relación comprador/vendedor/potencial, documento, nacimiento, ocupación, interés por unidad, forma/plazo de compra, anticipo/moneda y permuta. Los borradores locales se aíslan por usuario y vencen a los siete días; excluyen DNI/CUIT, archivos, audio y autorización de asignación automática. Preparar campos desde texto propone datos para revisar y no guarda por sí solo.

### Importación y exportación reales

`ClientImportModal`, `clientSpreadsheet.js` y `clientSpreadsheetService.js` implementan lectura de planillas, vista previa, validación y confirmación. Los endpoints `POST /api/admin/clients/validate-import` y `POST /api/admin/clients/bulk` exigen lectura y escritura de Clientes.

La política de duplicados es explícita: omitir o actualizar; las celdas vacías se conservan o limpian según la opción elegida. Se comparan ID, teléfono normalizado, email y documento; identidades ambiguas o repetidas en el archivo se reportan, sin fusionarlas por nombre. Se vuelve a validar al confirmar, con control del preview, transacción e idempotencia. El límite del servicio es 1.000 filas por carga, con recomendación de lotes menores de 500. La exportación conserva los campos soportados, el alcance elegido y las monedas; no convierte una declaración importada en una comunicación, cobro o venta nueva.

### OCR local, sin servicio externo de documentos

`ClientOcrControl` permite PDF, PNG, JPEG y WebP de hasta 5 MiB; PDF hasta tres páginas. Combina texto del PDF y OCR cuando corresponde, con progreso, cancelación y errores recuperables. Nombre, documento, nacimiento, género y dirección son propuestas revisables; sólo se aplican los campos seleccionados. El escaneo no adjunta el archivo ni envía la ficha automáticamente.

`scripts/prepare-ocr-assets.mjs`, ejecutado mediante `predev` y `prebuild`, copia a `public/ocr` el worker, WASM, recursos de PDF.js y modelos spa/eng de las dependencias instaladas, con sus licencias y manifiesto de versiones. El navegador los obtiene del origen de AutoSporting; el documento no se envía a Google Vision ni a otro proveedor OCR. La prueba local utiliza una imagen ficticia y modelos locales. El dictado del navegador es una capacidad separada: puede usar el servicio de voz del navegador y lo informa antes de utilizarlo; no equivale al OCR local.

### Documentación privada y transporte por partes

Los documentos de Cliente se almacenan como binarios privados, con metadatos separados de los bytes, auditoría y permisos de servidor. Se admiten hasta cinco archivos activos de 5 MiB por cliente. Eliminar es lógico; restaurar conserva el archivo y respeta el límite de activos. No existen URLs públicas de documentos.

| Recurso | Permisos y límite |
| --- | --- |
| Cliente: listar/descargar | `clientes.read` + `documentacion.read`. Mutar agrega `clientes.write` + `documentacion.write`. Hasta 5 × 5 MiB activos. |
| Venta: documentos por slot | `ventas.read` + `documentacion.read`; carga/eliminación/restauración también ambas escrituras. Hasta 15 MiB por archivo. DNI/cédulas y documentos de seña/permuta usan IDs estables, validados contra la venta. |
| Movimiento financiero | Lectura de Finanzas; escritura adicional para mutaciones. Hasta 5 × 15 MiB activos. Conserva su contrato independiente de los permisos de documentos de Cliente/Venta. |

`PrivateUploadChunk` y `privateUploadService` comparten staging autenticado con partes de hasta 1 MiB binario en JSON/base64, tamaño/cantidad/índice y SHA-256 verificados, actor + tipo/ID de entidad + UUID. Repetir una parte idéntica es idempotente; cambiar su contenido bajo la misma identidad produce conflicto. Sólo el staging temporal vence a las dos horas mediante TTL; los documentos permanentes no tienen ese TTL.

La confirmación de un lote utiliza el finalizador transaccional de su recurso. El reintento consulta primero metadatos permanentes del lote, de modo que recupera una carga ya confirmada aun después de limpiar el staging. Las descargas del cliente actual usan rangos autenticados de hasta 1 MiB y reconstruyen un Blob local; la ruta GET tradicional se conserva por compatibilidad. Se aplican `private, no-store`, descarga como adjunto y `nosniff`. Se preserva el contenido original sin confundir un MIME declarado con una autorización de ejecución.

## NPS contextual y No contactar

La corrección inicial de Mongoose 9 y DTO mínimos se amplió a un circuito contextual completo. `ClientNpsPanel` está integrado en Operaciones de la ficha; `NpsDashboardWorkspace` conserva el módulo general con períodos, contexto, vendedor, promedio, NPS y seguimiento reales.

- Escala entera de 0 a 10, incluyendo cero; 0–6 detractores, 7–8 pasivos y 9–10 promotores. Registro manual con comentario/fecha, cliente precargado, vendedor seleccionable y cinco contextos: postventa, postvisita, postentrega, postcotización y atención de lead.
- El vendedor evaluado es distinto del autor `generatedBy`. El historial del cliente y los filtros del dashboard utilizan los registros reales y cortes de Argentina; una muestra vacía no inventa un promedio.
- Lectura requiere `nps.read`; registrar/preparar encuesta requiere `nps.write`. Enviar/reintentar/verificar WhatsApp requiere además `whatsapp.write`. La ficha mantiene sus propios permisos de Cliente. Se conserva la política de roles existente; las restricciones se prueban con usuarios sin el bypass de administrador.
- Generación y envío usan identidad idempotente por actor/solicitud y auditoría. WhatsApp requiere consentimiento explícito y configuración real; sin proveedor o plantilla adecuada devuelve un motivo útil y no afirma que envió.
- Se requiere ventana de atención de 24 horas o plantilla NPS aprobada. La respuesta del proveedor debe incluir confirmación real. Un resultado incierto no se reenvía automáticamente; la verificación/reintento respeta su estado para evitar mensajes duplicados.
- Las encuestas preparadas conservan vencimiento de siete días. Las respuestas públicas validan token, vigencia y respuesta única sin publicar datos del cliente, vendedor, venta, credenciales o configuración privada.
- Sin `ventas.read` no se consultan operaciones financieras de Sale para NPS; con acceso sólo se entrega la identificación/estado mínimos requeridos.

Configuración de servidor: `NEXT_PUBLIC_BASE_URL` o `APP_BASE_URL` para el enlace; integración existente `WHATSAPP_API_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`; fuera de la ventana de atención, `NPS_WHATSAPP_TEMPLATE_NAME`, plantilla aprobada declarada en `WHATSAPP_TEMPLATES_JSON`, `NPS_WHATSAPP_TEMPLATE_COMPONENTS_JSON` con el enlace/token y, opcionalmente, `NPS_WHATSAPP_TEMPLATE_LANGUAGE`. Estos nombres documentan requisitos, no valores. No se actualizaron credenciales ni se realizaron envíos reales durante la implementación/QA.

`clientContactPreferenceService` aplica No contactar antes de los envíos reales centralizados de `whatsappAdapter` y `emailAdapter`, por vínculos de Cliente/Lead y destinatarios normalizados. Se auditaron los consumidores de envío existentes; la consulta de permisos de contacto resuelve IDs de entidades autorizadas, sin exponer un oráculo de teléfonos arbitrarios. Los enlaces de contacto de las superficies cubiertas respetan esa consulta. Registrar manualmente una respuesta NPS o una interacción recibida sigue permitido; no se considera envío saliente.

No existe en este alcance un emisor nuevo de cumpleaños o automatizaciones ficticias. La guardia cubre los adaptadores y consumidores implementados; no puede impedir una acción manual fuera del CRM ni prometer cumplimiento de futuras integraciones que no utilicen ese servicio.

## Stock: listado, operación y preservación

Stock mantiene Lista comercial, tarjetas, tabla detallada, panel rápido, ficha completa y comparación con valores reales. La navegación de referencia incluye Stock general, Para resolver hoy, Consignaciones, 0 km, Mandatos y Demanda; AutoSporting conserva Compartidos y Capital e inversores. Filtros por año, ubicación, responsable y origen, paginación, retorno y búsquedas guardadas personales se persisten sin confundirlos con los filtros propios de Hoy/Demanda.

La galería de Resumen es de consulta; la edición de fotos es explícita. Se preservan portada, orden y encuadre por archivo, incluidas modificaciones de encuadre sin cambiar URLs. Reordenar archivos existentes no depende de tener Cloudinary configurado. Las subidas reales conservan sus requisitos de proveedor y errores recuperables.

Peritaje persiste mecánica, suspensión, frenos, pintura/carrocería e interior con estado/nota; neumáticos, service, llaves, dueño único, km verificado, título, VTV, libre deuda, transferencia y notas. Ausente no equivale a aprobado, cero o falso. La actividad comercial reutiliza `CommunicationLog`; seguimientos reutilizan `CrmTask`, con creación/edición/resolución, nota y auditoría en el endpoint dedicado.

Se conservan compra propia, compromisos y pagos de adquisición, inversores, consignación, permutas/valores de toma/cadena, gastos, documentación, reservas/cancelación, notas, impresión, InfoAuto y estado web. La autoridad de una venta/reserva vinculada no se reemplaza desde un campo genérico del vehículo.

### Disponibilidad, Hoy y Demanda

`POST /api/admin/cars/:id/availability` implementa `withdraw/relist` con motivo y auditoría. Retirar exige Disponible; reingresar exige Retirado. Se comprueban ventas y reservas vigentes y se impide evitar esa validación mediante la edición genérica. **Retirado/Fuera de venta es distinto de Pausado** y no registra dinero automáticamente.

`GET /api/admin/stock/attention` reúne seguimientos de hoy/vencidos, preparación y mandatos a revisar de la agencia, con filtro por tipo/responsable y permisos de cada fuente. No equivale a filtrar la página actual del inventario. El resumen de disponibilidad utiliza la colección correspondiente completa, no sólo las filas paginadas.

`GET /api/admin/stock/demand` considera Pedidos abiertos independientemente de su antigüedad y Leads/consultas/cotizaciones dentro de 30/60/90/180 días; el valor por defecto es 90. Deduplica por identidades verificables y marca/modelo exactos, con restricciones estructuradas compatibles de año/presupuesto y moneda. Incluye el control de importados sin validar, modelos sin demanda y stock sin demanda a 14/90 días. **Sólo Pedidos validados sin cobertura generan sugerencias de búsqueda**; los importados sin validar no justifican esas sugerencias. La falta de permiso de una fuente no se presenta como ausencia universal de demanda.

### Portal externo del propietario

Existe un portal público de alcance limitado en `/propietario/:token`. Su creación requiere escritura de Stock y confirmación expresa de la exposición de datos. El acceso dura 30 días, guarda la huella del token y permite rotación/revocación; no se devuelve el secreto en la consulta administrativa posterior.

El portal usa una proyección pública fija de la unidad: identidad/técnica pública, estado, precio/moneda, imágenes válidas, equipamiento, mantenimiento y condiciones públicas. No entrega nombres/contactos de clientes o propietarios, costos, inversores ni auditoría interna. Las solicitudes del enlace se gestionan en la agencia; un precio propuesto **no cambia automáticamente el precio de venta**. El público sólo recibe su mensaje/propuesta/estado, no la resolución interna de la agencia.

La publicación efectiva en Mercado Libre/Meta u otros proveedores continúa sujeta a una integración configurada. Mostrar estado o enlace existente no simula un envío a un proveedor.

## Capital por moneda y propiedad

`GET /api/admin/stock/capital-summary` requiere **Stock.read y Finanzas.read**. `capitalSummaryService` utiliza el builder puro `buildCapitalSummary`, con `byCurrency.ARS` y `byCurrency.USD`: componentes, totales, fuentes e indicadores separados. La interfaz, los escenarios a costo/publicado, detalles y CSV utilizan el grupo seleccionado; no reclasifican un precio USD como ARS por su magnitud. Se conservan las monedas originales de compra y publicación.

La propiedad actual de una unidad no se revierte por una fotografía histórica de su origen: si figura propia y su origen fue consignado, se utiliza la propiedad actual y se emite advertencia para revisar el conflicto. Se mantiene compatibilidad con permutas propias legacy, participaciones reales de inversores y exclusión de consignaciones/terceros. La presencia del nombre de un propietario anterior no elimina por sí sola una participación de inversor acreditada.

El costo incorpora adquisición/toma y gastos registrados en cada moneda. La cartera aplica pagos/participaciones y excluye borradores o cargas históricas no operativas. Los préstamos pendientes son créditos; los pagos manuales/cuotas por pagar y obligaciones documentadas son deudas, evitando volver a sumar sus movimientos de origen. Los compromisos de compra pendientes/parciales se leen de **todos los vehículos**, incluso vendidos: `purchasePaymentState.pendingDebt` ya representa la parte debida por la agencia y no se descuenta otra vez el porcentaje del inversor.

El resultado se denomina estimación basada en registros. No acredita conciliación bancaria, propiedad exclusiva de todos los saldos ni ganancia cobrada. La diferencia de escenarios por moneda no es un margen unitario cuando compra y venta usan monedas diferentes. Los datos desconocidos se informan como incidencias; no se inventa FX ni un precio mínimo. Véase [el contrato monetario de Capital](CAPITAL_LIMITES_MONEDA_2026-11-10.md).

La calculadora comercial de disponibles utiliza el mismo criterio de propiedad y un selector ARS/USD. Consulta todas las páginas de hasta 1.000 registros y rechaza páginas incompletas, superpuestas o con totales cambiantes antes de presentar importes. La simulación es hipotética, local y por unidad/moneda: apagarla vuelve a los precios registrados; restablecer elimina sus borradores. Se conservan búsqueda, filtros de propiedad y desglose. La ayuda usa reglas y ejemplos ficticios, sin capturas ni importes históricos presentados como estado actual.

## API, permisos y modelos relevantes

| Superficie | Contrato adicional |
| --- | --- |
| Contexto comercial de Stock | `GET /cars/:id/commercial-context` y `GET /stock/commercial-summary?ids=...` respetan clientes, pedidos, comunicaciones, agenda, ventas y reservas por separado. Lote de hasta 50 IDs; una fuente sin permiso puede devolver métricas nulas. |
| Actividad y seguimiento | Escritura de Stock + Comunicaciones para actividad; Stock + Agenda para seguimiento. Los IDs y fechas se validan en servidor. |
| Peritaje / disponibilidad / portal | Endpoints dedicados; la edición genérica no puede saltar los contratos de autoridad. |
| Contacto | `GET /api/admin/contact-permissions?entity=...&ids=...` admite hasta 50 IDs y exige lectura de la entidad correspondiente; devuelve booleanos, no teléfonos privados. |
| Documentos privados | Metadatos/GET/PATCH del documento; `document-uploads/:uploadId/chunks` y `/commit` para Cliente, Venta o Movimiento, con sus permisos específicos. |
| NPS | Configuración, registro manual, generación, envío, reintento/verificación, historial por cliente y dashboard; tokens públicos únicamente para responder su encuesta. |
| Importación | Preview y commit separados, comprobación de concurrencia y reintentos; sin creación de comunicaciones ni asignación automática implícita. |

Los modelos aditivos incluyen perfiles comerciales, disponibilidad del equipo, búsquedas guardadas, peritaje, portal/solicitudes, importaciones idempotentes, documentos privados, staging temporal y contexto/envío de NPS. No se ejecutaron migraciones masivas destructivas ni se sustituyó la autoridad financiera por campos de interfaz. La caja sigue requiriendo una acción financiera explícita: una visita, Pedido, encuesta, peritaje, propuesta de precio o seguimiento no acredita ingresos ni registra devoluciones por sí mismo.

## Pruebas y QA: distinguir los cortes

| Corte verificado | Resultado y alcance |
| --- | --- |
| Histórico inicial, anterior a esta ampliación | Se registraron 155/155 puras y una compilación de 79 páginas, con pruebas focales de Clientes/NPS de aquel momento. Son antecedentes; no certifican las fuentes actuales. El informe HTML de ese corte conserva sus límites históricos. |
| Último global comunicado antes de los cambios finales | 233/233 pruebas puras y 133/133 de integración aprobadas. Corresponden a ese árbol de código, previo al cierre de las modificaciones finales. No se suman a las corridas focales como si fueran pruebas diferentes. |
| Capital/Stock posteriores | Builder monetario: 7/7 puras. Corrida focal de Stock/API Capital: 23/23. Incluye propiedad, monedas explícitas, fuentes y deudas de adquisición conservadas. |
| Corrección final del formulario de Cliente | ESLint y diff focal aprobados; 14/14 existentes de borradores/payload/OCR local con imagen ficticia. No se modificó el contrato de guardado para la corrección de distribución visual. |
| Presentación de Capital | 3/3 puras de selección estricta de moneda, filtros y CSV UTF-8 con escape de fórmulas; ESLint focal aprobado. |
| Calculadora comercial de disponibles | 5/5 puras: monedas/propiedad, simulación aislada, filtros, consulta de 2.001 unidades en tres páginas y rechazo de resultados incompletos/sesión cambiada. No certifican un snapshot transaccional de una colección que cambia durante lecturas. |
| QA local comunicado por raíz | Ficha 672 px, alta 896 px, superficie de controles y carga/eliminación lógica/restauración de dos archivos ficticios de Cliente. No implica verificación exhaustiva de todos los proveedores o roles. |
| Cierre global del árbol final | **Pendiente**: repetir las verificaciones globales necesarias y registrar compilación/QA final. No se declara despliegue ni publicación mediante este documento. |

Las suites de integración utilizan Mongo descartable y datos ficticios; los proveedores se simulan y se impide tráfico externo no autorizado en las pruebas pertinentes. No se cargó el entorno real de producción para ensayarlas, no se enviaron mensajes a personas reales y no se usaron documentos o datos de clientes de la referencia. No se reejecutaron pruebas durante esta actualización documental.

## Límites y trabajo pendiente reales

1. **Demanda entre agencias:** la demanda y el stock son de las fuentes autorizadas de AutoSporting. No existe una red global de proveedores/agencias ni se inventa una coincidencia por nombre parecido.
2. **Integraciones externas:** OCR local y documentos privados están implementados; publicación en proveedores y WhatsApp real necesitan su configuración/consentimiento. La prueba con un proveedor falso no certifica una conexión productiva.
3. **No contactar fuera del circuito cubierto:** no se garantiza una acción manual fuera del CRM, ni futuras integraciones que eviten los adaptadores. No se implementó un emisor ficticio de cumpleaños/recontacto.
4. **SLA:** un seguimiento vencido o la antigüedad de alta no certifican un SLA medido. Los mecanismos de Leads existentes conservan su contrato.
5. **Resolución universal de Agenda:** el endpoint dedicado de seguimiento de vehículo exige nota; el editor genérico de Agenda aún conserva sus reglas previas. No se afirma un endurecimiento de todas las vías.
6. **Reinicio/archivo financiero global:** quedó en diseño y con semántica pendiente de respuesta del usuario. No hay borrado irreversible ni reinicio implantado por este trabajo; debe resolver bloqueo transversal, copia privada verificable, idempotencia y preservación de obligaciones antes de activarse.
7. **Cierre y publicación:** falta el cierre final del árbol actual. Ninguna implementación, enlace o prueba focal equivale por sí sola a paridad completa de diseño/uso o a un despliegue.

La siguiente planificación debe partir de estos límites actuales, no de las ausencias del corte histórico inicial.
