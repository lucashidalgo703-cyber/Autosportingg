# Analizador de Compra Inteligente

Rama local `integration/analizador-crm-oficial`, desde `3aacab6` del CRM oficial. Abrir Tesorería Estratégica, desbloquear con el PIN y entrar en Decisiones. El propietario tiene acceso. Para habilitar un administrador, configurar `PURCHASE_ANALYZER_ADMIN_IDS` con los identificadores de usuarios del CRM separados por comas. Usar una base aislada para las pruebas.

## Fuentes y acceso

| Fuente | Estado |
| --- | --- |
| Mercado Libre Autos Argentina | Captura manual por URL específica. La API oficial documenta OAuth, recursos de búsqueda e ítems y límites por aplicación y endpoint. Queda pendiente autorizar una app, verificar qué búsquedas puede ejecutar su cuenta y confirmar los permisos de uso y almacenamiento para la muestra. [Ítems y búsquedas](https://developers.mercadolibre.com.ar/es_ar/introduccion-vehiculos/items-y-busquedas) · [OAuth](https://developers.mercadolibre.com.ar/es_ar/sobre-nuestra-api/autenticacion-y-autorizacion) · [Límites y 429](https://developers.mercadolibre.com.ar/productos-recibe-notificaciones/rate-limit-error-429) |
| Kavak Argentina | Captura manual cuando el enlace incluye el ID de stock y la ficha muestra la unidad esperada. Pendiente confirmar un acceso automatizado autorizado, su autenticación y sus cuotas. [Términos de Kavak Crédito](https://www.kavak.com/ar/terminos-y-condiciones) |
| Autocosmos Argentina | Captura manual por URL con identificador de aviso. Quedan pendientes disponibilidad y autorización de API, autenticación y límites. [Términos](https://www.autocosmos.com.ar/institucional/terminoscondiciones) |
| SmartCar Córdoba | Captura manual por enlace individual de inventario. |
| InfoAuto | Acceso a guía por registro o suscripción. Quedan pendientes licencia para automatizar la consulta, autenticación y límites. Una referencia de guía carece del enlace específico a un aviso que exige el cálculo. [Guía InfoAuto](https://www.infoauto.com.ar/noticias/articulo/abril%202025%3A%20la%20gu%C3%ADa%20online%20de%20precios%20ya%20est%C3%A1%20disponible_2869531) |
| CRM AutoSporting | Se reutilizan vehículos por ID y datos del vehículo recibido en permuta por número de cotización. La evaluación puede vincularse a un vehículo y mostrar compras y ventas entregadas vinculadas. Falta una serie validada de cierres y días de publicación para estimar cierre y rotación. |

El analizador no envía solicitudes a proveedores externos. Los enlaces los abre el usuario. El cotejo y la clasificación del precio dependen de esa revisión manual. Un aviso que deja de estar disponible se marca por separado, con usuario y fecha, y se conserva la evaluación original.

## Método

- Tres comparables exactos como mínimo para proponer precios. Coinciden marca, modelo, versión, año, motorización, transmisión, tracción, estado general registrado y mercado. Para kilometraje se admite una diferencia de hasta el mayor entre 10.000 km y el 20 % del evaluado. Los años próximos y otras versiones se muestran como coincidencias parciales.
- Solo se usan precios de contado en la moneda evaluada y con cotejo registrado en los últimos 30 días. Comodoro Rivadavia, Patagonia y Nacional se registran por separado. No hay conversiones ni ajustes hedónicos. Se deduplica por plataforma e ID o por coincidencia de título normalizado, año, km, ubicación, moneda y precio.
- Se usa P50 como precio de publicación y P25 como referencia para venta rápida. Los escenarios simulan ingresos en P25, P50 y P75. Los percentiles se interpolan linealmente. Son referencias de precios publicados. El cierre y el riesgo de rotación requieren otra evidencia.
- La confianza es baja con una muestra suficiente y media con al menos cinco comparables y una amplitud que no supera el 20 % de la mediana. Son reglas de revisión local, sin calibración estadística con datos de AutoSporting.
- El máximo de compra usa P25 menos gastos menos la ganancia objetivo confirmada. El costo económico de adquisición suma efectivo inmediato, efectivo futuro y valor asignado a la permuta. La venta menos costo de adquisición da la ganancia bruta. Se descuentan gastos para la neta. El resultado propio aplica la participación a la ganancia bruta y descuenta los gastos que asume AutoSporting.
- La liquidez consume efectivo y cuotas en proporción a la participación y coloca los gastos al inicio. Resta compromisos y desembolsos de la liquidez propia en la moneda elegida. Usa el mínimo de reserva configurado y el disponible de compra, ajustado por faltantes. Excluye cobros futuros. El mínimo mostrado es conservador y agrega todos los compromisos vigentes. Una conciliación sin confirmar, inconsistencia de efectivo o un descuadre bloquean la capacidad de compra.

## Demostraciones y pruebas

`outputs/analizador-compra` contiene capturas y los dos resultados en JSON. Los avisos reales se observaron en resultados indexados y el acceso directo no pudo confirmarse en esta sesión. Los cuatro se registraron como sin verificar. Resultado de mercado: 0 aceptados, evidencia insuficiente. La liquidez de esa demostración también usa un escenario sintético.

En el caso completamente sintético, la oferta de USD 18.000 se compone de USD 12.000 al inicio, USD 2.000 futuros y USD 4.000 en permuta. Los USD 1.000 de gastos corren por cuenta de AutoSporting, con una participación del 50 %. Tres precios ficticios de USD 20.000, 22.000 y 24.000 dan P25 de USD 21.000, P50 de USD 22.000 y P75 de USD 23.000. Con una ganancia objetivo de USD 1.500, el máximo de compra simulado es USD 18.500. La ganancia neta base de toda la operación es USD 3.000 y la propia USD 1.000. La caja mínima proyectada es USD 12.500, frente a USD 5.000 de reserva, con USD 7.000 inmediatos y USD 1.000 futuros a cargo de AutoSporting.

- `node --test tests/purchaseAnalyzer.test.js`
- `node --test tests/integration/purchaseAnalyzer.integration.test.js` (MongoDB temporal, guardas de prueba)
- `node tests/carPurchasePayment.test.js` y `node tests/integration/vehiclePurchasePayment.integration.test.js`
- `node tests/treasuryDistribution.test.js` falla también en la base, al revertir un gasto de Operativa. `node tests/integration/treasury.integration.test.js` falla también en la base por duplicación de `adminusers._id` al preparar la prueba.
- Capturas con Next.js y Edge, usando el componente real y respuestas de API simuladas. Sin uso de credenciales ni base de producción.

**GO para revisión local de la carga manual y los cálculos. NO-GO para recomendación con evidencia real hasta completar una muestra vigente, confirmar el acceso autorizado y resolver los fallos de Tesorería.**
