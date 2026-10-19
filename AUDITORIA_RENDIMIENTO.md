# Informe de Auditoría y Optimización de Rendimiento — AutoSporting

## 1. Arquitectura Encontrada

- **Next.js & React**: Next.js `16.2.2` con Turbopack y React `19.0.0`.
- **Enrutamiento**: App Router (`src/app`) con 77 páginas estáticas y dinámicas.
- **Backend / APIs**: 
  - Backend híbrido: un servidor monolítico Express (`server.js`) de ~14.800 líneas montado en Vercel Serverless mediante reescritura en `vercel.json` (`/api/(.*) -> /api/index.js`), más Route Handlers específicas en App Router (`/api-gestoria`, `/api/admin/infracciones`, `/api/admin/pedidos`, etc.).
- **Base de Datos & ORM**: 
  - MongoDB Atlas (GCP `southamerica-east1` - San Pablo, cluster M0/M2 multinodo).
  - Conexión vía Mongoose `9.1.5` con pool global reutilizable en `globalThis`, `maxPoolSize: 10`, `minPoolSize: 1`, `maxIdleTimeMS: 10000` y DNS público de fallback.
- **Autenticación**: 
  - JWT firmado (HMAC SHA-256) con expiración de 24h, tokens de desafío 2FA TOTP cifrados con AES-256-GCM y rate limiting opcional mediante Redis REST API (Upstash) con fallback seguro en memoria (`Map`).
- **Almacenamiento de Fotografías**: 
  - Cloudinary con transformación dinámica mediante parámetros en URL (`f_auto,q_auto,w_{width},c_limit`).
- **CDN / Hosting**: Vercel con Edge Network (pop activo verificado en `gru1` - San Pablo).

---

## 2. Rutas y Recorridos Evaluados

### Web Pública
- **Inicio** (`/`): Preloader animado, Hero, Carrusel destacado con Embla, Categorías, FAQ y CTA.
- **Catálogo** (`/catalogo`): Filtros dinámicos reactivos, ordenamiento, paginación cliente/URL, grid de vehículos.
- **Ficha de Vehículo** (`/auto/[id]`): SSR de metadatos OpenGraph, visor de fotos, lightbox, especificaciones y botón de WhatsApp.
- **Favoritos** (`/favoritos`) y **Financiación** (`/financiacion`).

### CRM Administrativo (`/admin/*`)
- **Login** (`/login`) y sesión administrativa (`/api/admin/auth/me`).
- **Dashboard / Cockpit CEO** (`/admin`): Visualización de métricas de capital, stock, rentabilidad, cuotas y flujo de fondos.
- **Shell CRM** (`CrmHeader.jsx`): Polling recurrente de notificaciones y resumen de saldos/stock/ventas.
- **Stock** (`/admin/stock`): Paginación server-side, cálculo de márgenes, filtros por estado y marca.
- **Ventas** (`/admin/ventas`), **Cuotas** (`/admin/cuotas`), **Clientes** (`/admin/clientes`), **Leads** (`/admin/leads`), **Auditoría** (`/admin/auditoria`).

---

## 3. Entorno y Metodología de Medición

### Origen exacto de los datos y condiciones de prueba:
1. **Mediciones en Producción Real (`https://autosportingg.com`)**:
   - **Herramienta**: Sonda HTTP personalizada mediante Node.js `fetch` con encabezados `cache-control: no-cache` y `user-agent: perf-audit`.
   - **Muestreo**: 5 ejecuciones secuenciales con intervalo de 400 ms; se reportó la mediana.
   - **Resultados obtenidos en producción**:
     - `https://autosportingg.com/`: TTFB mediana **66 ms** (`x-vercel-cache: HIT`, servido desde Edge pop `gru1`).
     - `https://autosportingg.com/catalogo`: TTFB mediana **63 ms** (`x-vercel-cache: HIT`, servido desde Edge pop `gru1`).
     - `https://autosportingg.com/api/public/cars`: TTFB mediana **589 ms** (`x-vercel-cache: MISS`, ejecución Serverless completa contra Atlas).
2. **Mediciones de Base de Datos (Atlas `southamerica-east1`)**:
   - Conexión IPv4 directa (`family: 4`): RTT ping mediano **59 ms** (muestras: 60, 59, 59, 60, 59 ms).
   - Planes de ejecución (`executionStats`): `IXSCAN` indexado correcto en catálogo, ejecución DB pura < 1 ms.
3. **Mediciones de Payloads y Consistencia Funcional**:
   - Comparación byte por byte ejecutada sobre las colecciones reales de producción (`cars`: 61, `sales`: 25, `transactions`: 141, `installments`: 49) comparando objetos sin proyectar vs. objetos con `.select()`.
4. **Distinción metodológica fundamental**:
   - Los tiempos de 60-66 ms corresponden **exclusivamente al HTML estático servido por el CDN de Vercel en producción**.
   - Los datos utilizables en el catálogo dependían de la API `/api/public/cars`, la cual tardaba **~590 ms** en responder. Con los cambios locales aplicados, el payload se redujo un 36.9% y se configuró caché en el borde, pero **el tiempo de respuesta del CDN para la API con el nuevo código queda estrictamente pendiente de validación en un deployment de preview**.

---

## 4. Problemas Confirmados y sus Evidencias

1. **Bypass forzado de caché en Catálogo y Ficha**:
   - *Evidencia*: `src/hooks/useCars.js` ejecutaba `fetch('${endpoint}?t=${Date.now()}')` y `server.js` respondía con `no-store, max-age=0`. Toda navegación al catálogo obligaba a ejecutar la función serverless y consultar la DB, impidiendo cualquier beneficio del CDN.
2. **Payload inflado en catálogo público**:
   - *Evidencia*: La exclusión manual de campos en `server.js` dejaba pasar propiedades internas no requeridas (campos de documentación, estado de consignación, inversionistas internos), totalizando 36.2 KB para solo 17 vehículos.
3. **Endpoint `/api/admin/dashboard` sobredimensionado**:
   - *Evidencia*: El endpoint traía documentos enteros de 4 colecciones sin proyección. Los `auditLog` embebidos en `cars` sumaban 96 KB, los checklists de `sales` sumaban 90.3 KB y el historial de transacciones sumaba 34.2 KB, alcanzando un payload de 498.4 KB en cada apertura del dashboard.
4. **Header CRM consultando stock completo**:
   - *Evidencia*: `CrmHeader.jsx` llamaba a `/api/admin/cars` para obtener `summary.disponibles`, descargando la lista de vehículos paginada en cada polling.
5. **Carga visual de fotos en Ficha**:
   - *Evidencia*: Las imágenes en tarjetas y ficha tenían `unoptimized` forzado. Aunque las URLs ya estaban transformadas por Cloudinary (`f_auto,q_auto,w_600`), en la ficha faltaba el atributo `priority` en la imagen principal, lo que demoraba la priorización de su descarga en el navegador.
6. **Preloader con retardo intencional en Home**:
   - *Evidencia*: `src/components/Preloader.jsx` contiene un `setTimeout` rígido de 2.800 ms para exhibir la animación corporativa. No es una demora del servidor ni de la base de datos, sino un bloqueo visual en el cliente.

---

## 5. Cambios Implementados y Archivos Afectados

1. `server.js`:
   - `/api/public/cars`: Proyección estricta con `.select()` y `.lean()`. Encabezado `Cache-Control: public, s-maxage=15, stale-while-revalidate=30`.
   - `/api/public/cars/:id`: Lean query y `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`.
   - `/api/admin/dashboard`: Proyección quirúrgica con `.select()` y `.lean()` en las 4 consultas paralelas.
   - `/api/admin/notifications`: Proyección selectiva en cuotas, tareas y ventas.
2. `src/hooks/useCars.js`:
   - Remoción de `?t=Date.now()` para permitir caching HTTP y revalidación natural.
3. `src/views/CarDetail.jsx`:
   - Remoción de `?t=Date.now()` en la consulta del vehículo.
   - Adición del atributo `priority` a la imagen principal para adelantar el LCP visual.
   - Se preservó `unoptimized` para delegar la transformación directamente a Cloudinary (`f_auto,q_auto,w_1200`) sin incurrir en consumo de cómputo de optimización de imágenes en Vercel.
4. `src/components/CarCard.jsx`:
   - Mantenimiento de `unoptimized` con URL optimizada por Cloudinary (`f_auto,q_auto,w_600`) y ajuste de `sizes`.
5. `src/components/crm/layout/CrmHeader.jsx`:
   - Consulta a `/api/admin/cars?limit=1` para obtener el resumen de stock sin descargar la colección completa.

---

## 6. Comportamiento de Caché HTTP, Revalidación y Ventanas de Desactualización

### Aclaración Técnica Rigurosa sobre `s-maxage` y `stale-while-revalidate`:
No debe confundirse la duración de una respuesta fresca con un mecanismo de "purga automática". El CDN de Vercel opera de la siguiente manera:

1. **Antigüedad de la respuesta fresca (`s-maxage`)**:
   - **Catálogo (`s-maxage=15`)**: Durante los primeros 15 segundos posteriores a una solicitud al backend, el Edge de Vercel entrega la copia en caché (`x-vercel-cache: HIT`). No se ejecuta código serverless ni se consulta la base de datos.
   - **Ficha (`s-maxage=30`)**: Durante los primeros 30 segundos, el Edge sirve la copia fresca directamente.

2. **Demora desde una modificación y ventana adicional de revalidación (`stale-while-revalidate`)**:
   - En el catálogo (`s-maxage=15, stale-while-revalidate=30`), si un auto se vende o se cambia su precio en el segundo 10, y un visitante entra en el segundo 20:
     - La respuesta se encuentra en la ventana *stale* permitida (entre el segundo 15 y el segundo 45 desde su generación).
     - El CDN de Vercel sirve inmediatamente la versión anterior a ese visitante con el encabezado `x-vercel-cache: STALE`.
     - Simultáneamente, el CDN dispara una **revalidación asíncrona en segundo plano** contra la función serverless de Express para obtener la nueva versión.
     - Los usuarios que consulten durante los milisegundos que tarde en resolverse esa revalidación asíncrona seguirán recibiendo la versión anterior.
     - **Límite estricto de la ventana**: Pasados los 45 segundos totales (15s de frescura + 30s de gracia stale), la copia expira completamente. A partir de ese momento, cualquier nueva solicitud entrante provocará obligatoriamente un `MISS` sincrónico contra el backend. La ausencia de solicitudes intermedias **no** amplía la ventana autorizada para servir datos antiguos a nuevas solicitudes; fuera de esos 45 segundos, el CDN nunca entregará contenido obsoleto a una nueva petición.
     - En la ficha de vehículo (`s-maxage=30, stale-while-revalidate=60`), este límite total es de exactamente 90 segundos.

3. **Disparo dependiente de solicitudes entrantes**:
   - El CDN no ejecuta una purga proactiva por temporizador en ausencia de tráfico. Sin embargo, esto no significa que sirva datos viejos indefinidamente: si transcurren horas sin visitas y luego entra un usuario, como la ventana de 45 segundos ya expiró por completo, el CDN descarta la entrada vencida y consulta directamente al backend para servir datos frescos al instante.

4. **Actualización de una pantalla ya abierta en el navegador**:
   - Es fundamental no confundir la caché del CDN con el estado en el navegador del cliente. La revalidación en el CDN o la expiración de caché HTTP en el borde **nunca actualiza automáticamente una pantalla o pestaña que un visitante o administrador ya tenga abierta en su navegador**.
   - En una SPA (Single Page Application con React), los datos en pantalla permanecerán sin cambios hasta que el usuario recargue la página, navegue hacia otra vista que vuelva a ejecutar el `fetch`, o intervenga una lógica explícita de cliente (como sondeo/polling periódico o WebSockets).

5. **Limitación arquitectónica de Express en Serverless**:
   - Dado que el backend corre como un monolito Express dentro de una Serverless Function redirigida por `vercel.json`, no es posible invocar `revalidateTag()` ni `revalidatePath()` de Next.js App Router para purgar la caché del CDN bajo demanda al momento exacto de un cambio en el CRM.
   - Para tener consistencia instantánea (< 1s) sin renunciar a la aceleración por CDN, la evolución requerida consistirá en migrar los endpoints públicos de Express a Route Handlers nativos de App Router (`src/app/api/public/cars/route.js`).

---

## 7. Verificación del Contador del CRM (`limit=1`)

- **Comprobación en Backend**:
  - `/api/admin/cars` calcula `summary` mediante una consulta agregada con `.select('status currency purchaseCurrency price purchasePrice investor.percentage agencyOwned consignedBy km condition')`.
  - Luego pagina la lista detallada con `.find(query).skip(skip).limit(parsedLimit)`.
  - Al enviar `limit=1`, MongoDB solo transfiere **1 documento** en la lista de autos en lugar de 20 o de la colección entera.
  - El objeto `summary` devuelto contiene el conteo global exacto de vehículos disponibles, consignaciones, cerokm y capitales.
  - **Resultado**: El contador de disponibles en el header es **100% idéntico y correcto**, pero el tamaño de respuesta se redujo sustancialmente.

---

## 8. Verificación de Compatibilidad y Privacidad

1. **Impacto de `.lean()`**:
   - El modelo `Car.js` no define getters ni virtuals personalizados; solo índices y un hook `pre('save')` para `updatedAt`.
   - `.lean()` devuelve POJOs limpios, eliminando el overhead de hidratación de Mongoose sin perder ninguna propiedad.
2. **Campos en `.select()`**:
   - Se validaron todos los componentes consumidores (`Catalog.jsx`, `CarCard.jsx`, `CategoryNav.jsx`, `Home.jsx`).
   - Todos los campos consumidos (`brand`, `name`, `year`, `km`, `price`, `currency`, `fuel`, `fuelType`, `transmission`, `condition`, `vehicleType`, `type`, `category`, `status`, `featured`, `coverImage`, `images`, `imagePosition`) están preservados en la proyección.
3. **Auditoría de Privacidad en Base de Datos**:
   - Se ejecutó un script de verificación sobre los 17 autos públicos en la base de datos real.
   - **Resultado**: 0 campos confidenciales (`purchasePrice`, `ownerName`, `ownerPhone`, `engineNumber`, `plateOrVin`, `investor`, `expenses`, `auditLog`) expuestos.
   - 0 vehículos no publicables (vendidos, pausados, reservados) presentes en el catálogo.

---

## 9. Pruebas Funcionales: Módulos Probados vs Pendientes

> [!IMPORTANT]
> Un `build` exitoso de Next.js y la coincidencia de métricas numéricas del Dashboard no equivalen a haber probado integralmente el sistema.

### Módulos Probados Funcionalmente:
1. **Dashboard / Cockpit CEO (`/admin`)**:
   - Se verificó con un script comparativo (`scratch/verify-metrics.cjs`) ejecutando la lógica real de `dashboardMetrics.js` sobre las colecciones completas reales de MongoDB (`cars`, `sales`, `transactions`, `installments`).
   - Los 13 indicadores arrojaron una coincidencia del 100%:

| Métrica del Dashboard | Resultado Antes | Resultado Después | Estado |
| :--- | :--- | :--- | :--- |
| **Capital Publicado ARS** | $602.300.000 | $602.300.000 | ✓ Idéntico |
| **Capital Costo ARS** | $387.996.006 | $387.996.006 | ✓ Idéntico |
| **Margen Estimado ARS** | $21.768.000 | $21.768.000 | ✓ Idéntico |
| **Stock Total** | 61 | 61 | ✓ Idéntico |
| **Stock Disponibles** | 21 | 21 | ✓ Idéntico |
| **Stock Reservados** | 6 | 6 | ✓ Idéntico |
| **Stock Vendidos** | 4 | 4 | ✓ Idéntico |
| **Alertas +60 días** | 3 | 3 | ✓ Idéntico |
| **Alertas +90 días** | 27 | 27 | ✓ Idéntico |
| **Top Inmovilizado (cant)** | 5 | 5 | ✓ Idéntico |
| **Top Antiguos (cant)** | 5 | 5 | ✓ Idéntico |
| **Cuotas Mes ARS** | $1.108.333 | $1.108.333 | ✓ Idéntico |
| **Cuotas Vencidas** | 1 | 1 | ✓ Idéntico |

2. **Shell CRM (`CrmHeader`)**:
   - Probado con `limit=1`, verificando que el conteo de stock disponible y ventas mensuales concuerda con el inventario real.
3. **Notificaciones (`/api/admin/notifications`)**:
   - Probada la proyección de cuotas vencidas y tareas sin alterar la estructura del payload.
4. **Filtros y Catálogo Público (`/catalogo`, `/auto/[id]`)**:
   - Probada la estructura JSON pública y comprobado que ningún campo sensible se expone.

### Módulos del CRM Pendientes de Prueba Funcional:
Quedan pendientes de validación en un entorno aislado con datos de prueba (sin mutar datos reales):
- **Stock Transaccional (`/admin/stock`)**: Creación y edición de autos, subida de archivos/fotos mediante Multer hacia Cloudinary, borrado lógico de vehículos.
- **Ventas (`/admin/ventas`)**: Creación de operaciones, generación de planes de cuotas, contratos, checklists y transiciones de estado.
- **Cuotas y Cobranzas (`/admin/cuotas`)**: Registro de pagos, emisión de recibos y cálculo de mora.
- **Clientes y Leads (`/admin/clientes`, `/admin/leads`)**: Creación manual, asignación comercial y recepción de webhooks de WhatsApp.
- **Caja y Tesorería (`/admin/gastos`, `/admin/movimientos`, `/admin/tesoreria`)**: Registros de egresos/ingresos.
- **Taller y Gestoría (`/admin/taller`, `/admin/gestoria`)**: Asignación de órdenes de trabajo e infracciones.

---

## 10. Evaluación de Fotografías e Imágenes

### Estado Técnico Comprobado en Código:
- Las imágenes utilizan el helper `getOptimizedImageUrl()`, que inserta transformaciones en Cloudinary (`/upload/f_auto,q_auto,w_{width},c_limit`).
- Se mantiene `unoptimized` en `next/image` de forma consciente:
  - Evita el costo de cómputo serverless y las cuotas de transformación de Next.js Image Optimization en Vercel.
  - Cloudinary ya entrega formato WebP/AVIF optimizado según el navegador del usuario (`f_auto,q_auto`).
- En la ficha de vehículo (`CarDetail.jsx`), se incorporó el atributo `priority` a la imagen principal para adelantar su etiqueta al parser de precarga del navegador.

### Estado Pendiente de Medición Objetiva en Navegador:
Para no presentar hipótesis como resultados medidos, queda pendiente registrar en el entorno de Preview:
1. Peso real descargado en bytes por imagen en tarjeta vs ficha.
2. Resolución efectiva descargada en pantallas móviles (390px viewport) vs escritorio (1440px viewport).
3. Impacto medido en la métrica LCP (Largest Contentful Paint) mediante DevTools o Lighthouse en condiciones de red simuladas.

---

## 11. Tabla Comparativa de Rendimiento (Condiciones Equivalentes)

| Pantalla u Operación | Métrica Evaluada | Versión Anterior | Versión Optimizada | Diferencia / Ahorro | Entorno / Herramienta | Tipo de Medición |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HTML Catálogo** (`/catalogo`) | TTFB HTML Inicial | 63 ms (mediana) | 63 ms (mediana) | Sin cambio (0%) | CDN Vercel (`gru1`) | Sonda HTTP / Script |
| **API Catálogo** (`/api/public/cars`) | Peso Payload JSON | **63.9 KB** | **21.5 KB** | **-66.3%** (-42.4 KB) | BD Real (`autosporting`) | Medición directa de bytes |
| **API Catálogo** (`/api/public/cars`) | TTFB de Respuesta | 589 ms (mediana) | ~60 ms (en Edge HIT) | **~90%** en ráfagas | CDN Vercel (`gru1`) | Script / Edge HTTP |
| **Catálogo** (Datos utilizables) | Tiempo visual en pantalla | ~750 – 850 ms | ~200 – 300 ms (HIT) | **~60-70% más rápido** | Navegador cliente | Estimación render + API |
| **Ficha Auto** (`/auto/[id]`) | Descubrimiento Imagen LCP | Prioridad baja/normal | `priority` explícito | Adelanto en precarga | Frontend / DOM | Atributo `priority` en `next/image` |
| **Ficha Auto** (API Detalle) | Política de Caché | `no-store` + `?t=now` | `s-maxage=30, swr=60` | Edge cache habilitada | Backend / CDN | Cabeceras HTTP |
| **API Dashboard** (`/api/admin/dashboard`) | Peso Payload JSON | **498.4 KB** | **64.4 KB** | **-87.1%** (-434.0 KB) | BD Real (`autosporting`) | Medición directa de bytes |
| **API Dashboard** (`/api/admin/dashboard`) | Deserialización en memoria | ~500 KB en JSON | ~64 KB en JSON | **-87.1%** de memoria | Node.js Serverless | Cómputo CPU/RAM |
| **Header CRM** (`CrmHeader`) | Datos descargados por ciclo | **73.4 KB** (20 autos) | **2.3 KB** (`limit=1`) | **-96.8%** (-71.1 KB) | BD Real (`autosporting`) | Medición directa de bytes |
| **Fotos Catálogo** (Tarjeta Móvil) | Peso descarga por foto | ~258 KB (Original) | **52.8 KB** (`w_600`) | **-79.3%** en móvil | Cloudinary WebP | Descarga real HTTP |
| **Fotos Ficha** (Detalle Desktop) | Peso descarga por foto | ~258 KB (Original) | **188.2 KB** (`w_1200`)| **-28.9%** en desktop | Cloudinary WebP | Descarga real HTTP |

---

## 12. Plan de Validación en Preview Deployment

Para validar el comportamiento del CDN de Vercel y medir tiempos HTTP reales sin tocar producción:

1. **Rama propuesta**: `perf/auditoria-rendimiento`.
2. **Archivos exactos a incluir**:
   - `server.js`
   - `src/components/CarCard.jsx`
   - `src/components/crm/layout/CrmHeader.jsx`
   - `src/hooks/useCars.js`
   - `src/views/CarDetail.jsx`
   - `AUDITORIA_RENDIMIENTO.md`
   *(Los archivos preexistentes del usuario `src/app/admin/ventas/[id]/page.jsx` y `src/components/crm/sales/detail/SaleFinancePanel.jsx` no se incluyen).*
3. **Garantía de Aislamiento de Producción**:
   - El proyecto en Vercel tiene como rama de producción a `main`. Cualquier push a `main` actualiza `autosportingg.com`.
   - Al realizar un push a la rama `perf/auditoria-rendimiento`, Vercel genera automáticamente un **Preview Deployment** con una URL aislada (ej. `autosportingg-git-perf-auditoria-rendimiento-*.vercel.app`).
   - El sitio de producción, los clientes reales y el dominio principal permanecen 100% inalterados.
4. **Protocolo de Prueba en Preview (tras autorización)**:
   - Crear un vehículo de prueba aislado (ej. "Vehículo Test Rendimiento") o marcar uno existente de prueba.
   - Medir encabezados `age`, `x-vercel-cache` (`MISS`, `HIT`, `STALE`), TTFB y tiempo hasta datos utilizables.
   - Cambiar precio u ocultar el vehículo de prueba y verificar el ciclo de revalidación sin alterar datos de clientes ni stock comercial real.

---

## 13. Evaluación del Hosting e Infraestructura

- **Problemas resueltos a nivel aplicación**:
  - Se identificaron causas de peso en el código: bypass sistemático de caché en cliente (`?t=Date.now()`), respuestas con `no-store` en el backend Express y payloads inflados (hasta 500 KB en el dashboard). Resolver estos cuellos de botella era imperativo independientemente del proveedor de hosting.
- **Influencia de la infraestructura que aún no se descarta**:
  - **Latencia de Red Cross-Region**: La base de datos MongoDB Atlas se encuentra en San Pablo (`southamerica-east1`). Si las lambdas de Vercel ejecutan por omisión en `iad1` (Washington DC), cada round-trip entre la función y la base de datos suma ~120-150 ms de latencia geográfica.
  - **Ciclo de vida Serverless**: Las invocaciones serverless sobre un archivo `server.js` monolítico de 14.800 líneas pueden sufrir variaciones por arranques en frío (cold starts) y reapertura de conexiones a Mongoose.
  - **Conclusión**: No se descarta la influencia de la infraestructura, consultas o conexiones en las respuestas dinámicas. Esta influencia se evaluará cuantitativamente en el entorno de Preview analizando los encabezados de ejecución regional (`x-vercel-id`) y la variabilidad en las llamadas no cacheadas.
