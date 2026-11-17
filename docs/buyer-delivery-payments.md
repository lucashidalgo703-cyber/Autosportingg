# Documentación y comprobantes del portal

- Gestoría → Transferencia egreso → **Documentación para el comprador**. También se encuentra en la venta → **Documentación y entrega**.
- Subir título, cédula frente/dorso, constancia u otros documentos (descripción obligatoria en Otros). Cada archivo comienza **En preparación**. Revisar comprador, vehículo vendido y patente, confirmar el destinatario y publicar. Reemplazar retira la versión anterior y deja la nueva en preparación. Retirar bloquea incluso las URLs temporales ya emitidas.
- Venta → **Cobros y cuotas** → **Comprobantes enviados por el cliente**. Requiere permisos financieros. Verificar el archivo; confirmar con cuenta activa de la misma moneda, vincular a un movimiento compatible, o solicitar una corrección con comentario.
- El enlace personalizado conserva su acceso verificado. Muestra **Documentación de tu vehículo** (sólo publicaciones para su comprador y unidad vendida) y **Mis pagos**, con o sin toma. La documentación del usado entregado mantiene su circuito separado.
- En Gestoría, **Monto a cobrar al comprador** es el total acordado. **Monto cobrado al cliente** es lo recibido. El pendiente es su diferencia. No se copian importes históricos ni se infiere deuda del costo/arancel. Una acreditación de gestoría incrementa lo cobrado sin reducir el saldo del vehículo. Anularla resta su imputación una sola vez.
- Una seña registrada es dinero recibido; no se presenta como deuda nueva. Se puede adjuntar su comprobante para vincularlo al cobro. Si falta registrar su ingreso, Finanzas puede acreditar sólo su parte sin movimiento registrado. Las cuotas ya pagadas también permiten adjuntar su comprobante, para vincularlo al movimiento existente.

## Persistencia y acceso

No requiere nuevas variables. Reutiliza `BUYER_PORTAL_DOCUMENT_KEY` y las sesiones existentes. Mantener la clave estable. Los archivos se cifran en el almacenamiento privado existente; máximo 3 MB por archivo, con compresión de imágenes en el navegador. Las colecciones nuevas contienen índices de idempotencia y se preparan antes de admitir cargas.

Las descargas usan URLs privadas de 120 segundos con disposición firmada. Cada lectura revalida sesión, operación, comprador, vehículo, publicación y revisión. No se guardan archivos ni URLs firmadas en localStorage, caché del service worker o analíticas. La carga de un comprobante no crea movimientos ni cambia saldos. Confirmación, movimiento, cuenta y cuota/gestoría se escriben en una transacción. Vincular no acredita nuevamente. La distribución continúa por Tesorería; un resultado incierto se deja para revisión y no se repite automáticamente.

## Prueba aislada

Los runners rechazan archivos `.env` y usan MongoDB en memoria, compradores ficticios, correos locales y archivos inventados. No usar cuentas de empleados ni conectar estos runners a producción.

```sh
npm run test:portal:delivery
npm run test:portal:payments
npm run dev:review-preview
# En otra terminal, con el preview listo en 127.0.0.1:3200:
npm run test:portal:delivery-payments:browser
```

El navegador genera capturas de ambas variantes, administración y visor. Comprueba publicación, descarga, reemplazo, retirada, aislamiento entre operaciones, pérdida de respuesta de una carga, confirmación idempotente, vinculación y comentario de corrección. Las suites de servidor agregan moneda original, cuotas parciales, pagos de gestoría, anulación, edición desactualizada y carreras concurrentes.
