# Inventario disponible y portal del comprador

Implementación validada en local y autorizada para producción por el titular el 16 de noviembre de 2026. Se parte del árbol de la versión `fd8c498630792c47e6955d0dacd0f0fedf3e5ce5`, que ya contiene Stock unificado y la carga de gastos sin cuenta asignada. El estado efectivo de publicación y las correcciones de datos quedan registrados en el recibo de despliegue de la entrega.

## Dónde revisar

| Cambio | Dónde | Comprobación |
| --- | --- | --- |
| Inventario disponible | Stock → Inventario | Contador, filas y tarjetas incluyen solo Disponible. Historial conserva otros estados. |
| Capital a costo | Stock → Capital invertido a costo | El mismo conjunto, importes ARS/USD separados, gastos por parte y pendientes explícitos. |
| Valor publicado | Stock → Valor de venta publicado | Usa los precios publicados de esas mismas unidades, con su propia moneda. |
| Titularidad | Ver desglose de cualquiera de los bloques | Propio, compartido, inversor 100%, consignaciones y mandatos identificados. Las filas explican capital incluido y terceros excluidos. |
| Portal sin toma | Venta → Portal del cliente | Vista previa idéntica al comprador, copiar enlace o abrir WhatsApp; solo seguimiento después de verificar correo. |
| Portal con toma | Venta → Portal del cliente | Mi próximo vehículo y El vehículo que entrego, con modelo y patente diferenciados. |
| Legajo por fotografía | Venta → Operación → toma; luego ficha de Stock | Documentación entregada por el cliente: revisión/corrección individual, versiones y original físico separado. |

El cambio de estado operativo se refleja en contador y ambos bloques. El filtro muestra «X de N disponibles» y «Subtotal del filtro». Los totales se calculan antes de paginar. Las unidades sin costo, precio, moneda o participación siguen contando cuando su estado es Disponible y se identifican en «Ver unidades con datos pendientes». Las sumas afectadas se presentan como subtotales conocidos.

El caso histórico antes mostrado como «compartido 100» se presenta como «100% del inversor», con participación AutoSporting de 0%. No se inventa un 50/50. Acuerdos explícitos y gastos asignados a una parte se conservan; contradicciones se señalan para revisar.

## Abrir la prueba local

```powershell
npm run dev:review-preview
```

Escucha únicamente en `http://127.0.0.1:3200/login`. Crea MongoDB desechable, usuarios ficticios, una venta con toma y otra sin toma. No carga `.env` ni configuración de Vercel y no envía correos externos.

Administrador ficticio: `admin@example.test`, contraseña de prueba `Ficticia-Local-2026!`. El código se captura en `http://127.0.0.1:3200/__test-mail.json`. Los compradores ficticios verifican sus propios correos desde ese mismo buzón. La metadata de fixtures se expone solo en este runner local. Nunca desplegar el runner ni su buzón.

Los tests de navegador preparan vehículos `NumericaQA` para el ejemplo de capital y `PaginasQA` para paginación. Si se ejecutaron, buscarlos en Stock. Las fotos son archivos ficticios; las pruebas usan vista de celular en Chrome, no una cámara física.

## Privacidad y documentos

- Un enlace aleatorio por operación, con vencimiento entre 1 y 90 días (30 por defecto). Revocar invalida sesiones y enlaces documentales del comprador; renovar después de revocar genera otro enlace.
- El comprador verifica el correo ya registrado en Clientes. El portal no permite cambiar el destinatario. Sin correo registrado, completar primero la ficha del comprador.
- Código de 6 dígitos, 5 minutos y un solo uso, hasta 5 intentos, reenvío cada 60 segundos y límites por correo, día e IP. Su sesión permite solo su operación y dura hasta 30 minutos.
- Cada archivo se guarda individualmente en MongoDB cifrado con AES-256-GCM. No se usa la carpeta pública ni el almacenamiento público de imágenes del catálogo.
- Acceso a cada archivo mediante autorización y enlace firmado de 2 minutos, comprobado nuevamente en el servidor. Revocación, vencimiento, bloqueo del comprador y cambio del correo registrado impiden acceder.
- Los códigos y firmas del portal usan una clave derivada de su secreto propio, separada de las sesiones del CRM. La configuración de `JWT_SECRET` existente se conserva.
- El portal y sus API/archivos se excluyen del Service Worker y de Analytics; no se conservan en CacheStorage. Los archivos llevan `no-store`, `nosniff` y el PDF se sirve con sandbox.
- Cada carga admite hasta 3 MiB. Las fotos se preparan en el teléfono antes de subir; el PDF se conserva como un archivo completo con vista previa. Para HEIC se requiere que el navegador pueda prepararlo; si no, la pantalla pide elegir JPG.
- El legajo se vincula a `Sale + tradeInId`. Al ingresar a Stock se consulta el mismo legajo mediante la vinculación de la unidad. Subir documentación nunca crea una unidad disponible.

Hay seis requisitos: CAT/título, dominio, SUATS, Formulario 12, cédulas y libre deuda. El Formulario 08 pertenece a escribanía y queda fuera del portal y su contador. Las indicaciones de antigüedad y vigencia se muestran como referencias de la guía de la agencia; Gestoría revisa los documentos. La copia digital, la revisión y la recepción física de originales son estados distintos.

El estado comercial se lee de Venta y el trámite de Gestoría. La última novedad pública, el próximo paso y la acción requerida se editan una vez en la venta, dentro de Portal del cliente. Las notas internas, costos, DNI, importes de toma y datos de otros compradores no se incluyen en la respuesta pública.

## Configuración para activar fuera de local

En el proyecto de staging verificado como separado: Settings → Environment Variables de Vercel, solo el entorno correspondiente. Conservar `MONGODB_URI`, `JWT_SECRET` y el proveedor SMTP existentes. Agregar **`BUYER_PORTAL_DOCUMENT_KEY`**, secreto aleatorio estable de al menos 32 caracteres, exclusivamente de servidor y distinto por entorno. No lleva `NEXT_PUBLIC_`. Debe conservarse junto con las copias de seguridad: cambiarlo sin migrar el cifrado impide leer documentos anteriores.

Ejemplo para generar un valor localmente, sin pegarlo en el chat:

```powershell
node --input-type=module -e "import crypto from 'node:crypto'; console.log(crypto.randomBytes(48).toString('base64url'))"
```

Preparar índices en la base aislada, con sus variables cargadas:

```powershell
npm run portal:setup -- --isolated-db autosporting_staging
```

El comando exige que el nombre coincida exactamente con `MONGODB_URI` y rechaza producción. Crea índices de enlace, códigos, límites, idempotencia y versión vigente por foto; no crea operaciones. La preparación de producción autorizada se realiza por separado: índices equivalentes, clave estable y corrección de moneda revisada, con respaldo, transacción y auditoría. La prueba automática no crea ventas ni documentos ficticios en producción.

## Verificación reproducible

```powershell
node tests/availableInventoryValuation.test.js
node tests/carPurchasePayment.test.js
node tests/vehicleFormIntegrity.test.js
node tests/integration/availableInventory.integration.test.js
node tests/integration/stockMissingMetadata.integration.test.js
node tests/integration/buyerPortal.integration.test.js
node tests/integration/buyerPortalRaces.integration.test.js
```

Con el runner local abierto y Playwright instalado:

```powershell
node tests/browser/availableInventory.browser.mjs
node tests/browser/vehicleForms.browser.mjs
node tests/browser/buyerPortal.browser.mjs
node tests/browser/buyerPortalPdf.browser.mjs
```

El segundo test del portal debe ejecutarse después del primero y respetar el reenvío de 60 segundos si abre una sesión nueva del mismo comprador. También se verificaron las regresiones de Stock unificado, indicadores y pagos de compra.

La prueba numérica obligatoria reproduce 3 vehículos y ARS 45.000.000 / 20.000.000 propios / 25.000.000 inversor; un vendido no altera nada. Al reservar el compartido: 2 y ARS 25.000.000 / 10.000.000 / 15.000.000. Incluye precios de venta distintos, USD, costos y precios en monedas distintas, faltantes, regreso a Disponible y paginación/móvil.
