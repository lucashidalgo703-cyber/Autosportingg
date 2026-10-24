# Capital y Reinversión — preparación de publicación

## Estado del candidato

La rama candidata local parte de `main` en `73efd4b` e incluye la demostración, la integración analítica de solo lectura, la corrección idempotente de reversión de gastos y sus pruebas. Esta preparación no publica ni integra la rama. No se ejecutaron consultas a Atlas, migraciones ni cambios de datos.

## Dependencias de ejecución y Seguridad

- En esta rama no existen `requireOwner` ni `withOwnerAuth`. La ruta `GET /api/admin/capital-reinversion/projection` ahora falla cerrada con HTTP 503 y no calcula ni devuelve el DTO. Su punto de integración queda antes de `verifyTreasuryStrategicAuth`; debe reemplazarse solo por el guard oficial Owner-Only de Antigravity. El PIN de Tesorería de 15 minutos se conserva después como segundo requisito obligatorio.
- No se probó ni simula revocación de sesión/dispositivo. La ruta no se debe reactivar hasta disponer del middleware oficial y verificar sesión activa, dispositivo activo y PIN ligado al propietario autenticado. No se copió ni implementó un segundo mecanismo de autenticación.
- No se agregan variables de entorno específicas de Capital. La ejecución normal depende de la configuración existente del CRM, en particular `MONGODB_URI` y `JWT_SECRET` del servidor y del puerto `PORT`. El componente usa la ruta relativa existente `/api`. El auxiliar de demostración crea un `MONGODB_URI` de MongoMemoryServer, un `JWT_SECRET` aleatorio y puertos loopback temporales; no debe usarse como configuración de publicación.
- `scripts/start-capital-reinversion-demo-local.js` está anclado intencionalmente al snapshot anterior `66d4297` y sirve para la demo inicial, no para verificar la integración candidata actual. `scripts/start-capital-reinvestment-integration-demo-local.js` materializa el checkout actual en un directorio temporal y es el auxiliar correspondiente a esa integración.

## Datos, índices y carga

- No se agregan modelos, campos persistidos, índices ni migraciones. La corrección de reversión usa los campos existentes de historial, `sourceExpenseId`, saldo y marca de sincronización.
- El adaptador consulta `Car`, `Sale`, `Transaction`, `Installment`, `TreasuryBox`, `TreasuryConfig`, `Account` y `TreasuryReconciliation` mediante proyecciones explícitas y límite de 10.000 filas por fuente. Hoy las consultas principales recorren las colecciones; el límite hace que el resultado quede no conciliado si se supera, pero no equivale a paginación incremental.
- Antes de publicar con volumen real se deben medir tiempos y memoria en un entorno representativo y revisar `explain()` de las colecciones. Si la carga lo requiere, proponer índices compuestos como cambio separado, con validación de cardinalidad/orden de campos y plan de creación; no crear índices en Atlas desde esta tarea.
- Historiales y datos operativos heredados con vínculos ausentes, contradicciones, anulaciones anteriores o moneda/importe incompatibles permanecen sin reparar. La proyección bloquea la liquidez cuando detecta anulaciones con débitos previos, aun si existe una reversa histórica, hasta conciliación externa.

## Validaciones de publicación pendientes

1. Resolver con Antigravity la política de propietario único y validar JWT/PIN, caducidad, revocación y respuesta ante sesiones concurrentes en Preview.
2. Ejecutar una prueba de lectura sobre un clon anonimizado o fixtures de escala representativa; no usar datos reales ni credenciales de producción.
3. Conciliar anulaciones históricas, gastos sin `transactionId`, cobros históricos sin vínculo de venta y fondos de terceros antes de usar las cifras para decisiones operativas.
4. Revisar costes de consulta y confirmar que `MONGODB_URI`, `JWT_SECRET`, host/API y reglas de Preview son los valores esperados, sin exponer secretos.
5. Obtener aprobación independiente para integrar y después para desplegar. Este documento no concede esas autorizaciones.

## Validación local de esta candidata

Pasaron 17 suites financieras/comerciales relevantes en entorno aislado: distribución, motor y adaptador de Capital, ownership, cálculo comercial, ganancias, Tesorería (integración, auditoría, distribución, sincronización y reversión), ventas, pagos de vehículos, permutas, cambio de vehículo, cuotas y métricas de stock. Todas las suites con persistencia usaron MongoDB en memoria y datos ficticios. `npm run check` y `npm run build` también pasaron; el check reportó 18 advertencias ESLint heredadas por directivas `eslint-disable` sin uso, con cero errores.

En la adaptación Owner-Only, la prueba de compatibilidad confirma que peticiones de propietario con PIN/sin PIN, administrador con PIN, vendedor, token inválido y acceso directo reciben `503 OWNER_ONLY_SECURITY_CONTRACT_PENDING` y nunca datos de proyección. Esto verifica el cierre preventivo, no el comportamiento del middleware oficial. La revocación real de sesión y dispositivo, el éxito del propietario con PIN y el borrado de estado en navegador requieren verificación al integrar Seguridad.

## Plan de reversión no destructivo

Antes de una futura publicación, registrar el SHA del despliegue vigente y conservarlo como artefacto de retorno. Si aparece un problema, detener el acceso a la vista mediante la reversión del commit o volver al artefacto anterior; no tocar cuentas, cajas, movimientos, historial ni saldos. No ejecutar migraciones inversas porque este cambio no introduce esquema. Verificar después el acceso de Tesorería existente y conservar logs para diagnóstico. La reversión de código no revierte movimientos de negocio ni concilia registros históricos.

## Dictamen provisional

- **Integración a `main`: NO-GO** hasta resolver el desajuste owner/admin con Seguridad y completar la revisión de carga. La corrección financiera pasa las pruebas aisladas, pero no valida el tratamiento de historia heredada.
- **Producción: NO-GO** hasta completar los controles anteriores, conciliar los registros históricos relevantes y obtener autorización de publicación. No se ha probado con datos productivos ni se ha desplegado esta rama.
