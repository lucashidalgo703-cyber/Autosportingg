# Fase 0 - Baseline, seguridad y reglas de trabajo

Fecha: 11 de junio de 2026

Estado: **completada con bloqueos**

Actualizacion: la Fase 0.1 recupero el build y la Fase 0.2 retiro los fallbacks de autenticacion el 11 de junio de 2026. El despliegue de Fase 0.2 requiere configurar `JWT_SECRET` en Vercel. Los bloqueos de autorizacion continúan vigentes.

Esta fase fue exclusivamente de auditoria. No se modifico codigo de producto, backend, datos, endpoints ni dependencias.

## 1. Baseline del repositorio

- Rama: `main`
- Commit base: `8fbfa4e2d0e8afc97a852d93a3870c362ba25643`
- Ultimo commit: `fix(sales): incluir costo de compra en los datos enviados al frontend para arreglar el calculo de ganancias`
- Remoto: `origin`
- Repositorio: `lucashidalgo703-cyber/Autosportingg`

### Archivos no rastreados preexistentes

Antes de esta fase ya existian:

- `src/app/api/test-sales/`
- `test-sales.js`

No se modificaron ni eliminaron.

El informe comparativo creado en la etapa anterior tambien se encuentra sin seguimiento:

- `docs/crm/ANALISIS_COMPARATIVO_SOTE_AUTOSPORTING.md`

## 2. Inventario de rutas admin

Se detectaron 39 rutas de pagina bajo `src/app/admin`.

Principales grupos:

- Dashboard.
- Calendario y alertas.
- Stock y detalle.
- Clientes y detalle.
- Cotizaciones y detalle.
- Ventas, detalle y reservas.
- Mi Espacio y Mis ventas.
- Finanzas, cuotas y cobranzas.
- Operacion: pedidos, postventa, expedientes, gestoria, consignaciones, infracciones y telefonos.
- Colaboracion: notificaciones, equipo, productividad y metas.
- Administracion: configuracion, usuarios, plantillas, sistema, exportaciones, calidad de datos y ayuda.

## 3. Validaciones tecnicas

### `node --check server.js`

Resultado: **OK**

No se detectaron errores de sintaxis en `server.js`.

### `git diff --check`

Resultado: **OK**

No se detectaron errores de whitespace en cambios rastreados.

### `npm.cmd run build`

Resultado: **FALLA**

El build se detiene por dos imports inexistentes en un archivo no rastreado:

- `src/app/api/test-sales/route.js`
- import `../../../../config/db`
- import `../../../../models/Sale`

El archivo tambien importa `connectDB` pero luego usa una conexion directa de Mongoose.

Este problema no fue introducido por la Fase 0.

### Clasificacion

- Prioridad: **P0**
- Riesgo: **Alto**
- Efecto: impide validar cualquier fase futura mediante build.

### Accion recomendada

Antes de implementar:

1. Confirmar si `src/app/api/test-sales/` y `test-sales.js` son pruebas temporales.
2. Si son temporales, retirarlos del arbol de producto.
3. Si deben conservarse, corregir sus imports y proteger el endpoint.
4. Repetir `npm.cmd run build`.

No se recomienda desplegar un endpoint de prueba que devuelve todas las ventas.

## 4. Auditoria de autenticacion

### Hallazgo SEC-01 - Secretos fallback en codigo

`server.js` contiene valores fallback literales para:

- `JWT_SECRET`
- `ADMIN_PASSWORD`

No se incluyen los valores en este documento.

Archivos:

- `server.js:34`
- `server.js:35`

Prioridad: **P0 critica**

Riesgos:

- una instalacion sin variables de entorno utiliza secretos conocidos por el codigo;
- acceso owner mediante contraseña legacy;
- tokens firmados con una clave fallback;
- exposicion historica si el repositorio fue compartido.

Accion recomendada:

- exigir variables de entorno;
- eliminar los fallbacks literales;
- rotar los secretos en produccion;
- invalidar sesiones previas despues de rotar `JWT_SECRET`;
- comprobar que Vercel y el backend tengan secretos configurados.

### Hallazgo SEC-02 - Login legacy de owner

El login permite autenticar sin email mediante una contraseña maestra y crea/recupera un owner.

Referencia:

- `server.js`, bloque `Fallback to Legacy Master Password`.
- La pantalla publica muestra el email como opcional.

Prioridad: **P0 critica**

Accion recomendada:

- retirar el fallback despues de verificar un owner funcional;
- exigir usuario individual;
- conservar un procedimiento de recuperacion fuera del login normal;
- registrar y alertar intentos fallidos.

### Hallazgo SEC-03 - Sin rate limit visible

No se encontro middleware de rate limiting para `/api/login`.

Prioridad: **P0**

Accion recomendada:

- limite por IP y por identidad;
- backoff temporal;
- auditoria sin registrar contraseñas;
- respuesta generica para evitar enumeracion.

### Hallazgo SEC-04 - JWT en `localStorage`

El token se guarda y lee desde `localStorage` en `AuthContext` y numerosos hooks/componentes.

Prioridad: **P1**

Riesgo:

- una vulnerabilidad XSS puede leer el token.

Accion recomendada:

- evaluar cookie `HttpOnly`, `Secure` y `SameSite`;
- si se mantiene el esquema actual, reforzar CSP y evitar HTML no confiable;
- centralizar las llamadas autenticadas.

### Hallazgo SEC-05 - CORS abierto

El servidor usa `app.use(cors())` sin una allowlist visible.

Prioridad: **P1**

Accion recomendada:

- restringir origenes por entorno;
- permitir solo dominios publicos y administrativos requeridos.

## 5. Auditoria de autorizacion

### Resultado general

- Declaraciones `/api/admin/*`: **87**
- Declaraciones con `authenticateToken`: **87**
- Endpoints admin sin autenticacion en la declaracion: **0**

La autenticacion base esta aplicada correctamente.

### Hallazgo AUTHZ-01 - Permisos backend incompletos

Aunque todos los endpoints admin exigen token, la mayoria no usa un middleware uniforme por permiso.

Solo se encontraron controles puntuales por rol en usuarios, auditoria y algunas operaciones financieras.

Prioridad: **P0**

Riesgo:

- un usuario autenticado puede intentar llamar directamente a endpoints que la UI oculta;
- los permisos frontend no constituyen una barrera de seguridad;
- las reglas varian segun el endpoint.

Accion recomendada:

- crear un middleware `requirePermission(permission)`;
- aplicarlo endpoint por endpoint;
- comenzar por usuarios, finanzas, cuotas, ventas, exportaciones y sistema;
- mantener la validacion frontend solo como UX.

### Hallazgo AUTHZ-02 - Bypass legacy en frontend

`hasPermission()` permite acceso total cuando el usuario no contiene rol ni permisos:

- `src/utils/adminPermissions.js:105`

Prioridad: **P0**

Accion recomendada:

- retirar el bypass cuando se elimine el login legacy;
- denegar por defecto ante un token incompleto.

### Hallazgo AUTHZ-03 - Permisos usados pero no definidos

Se detectaron simbolos ausentes del objeto `PERMISSIONS`:

- `CAJA_READ`
- `CAJA_WRITE`
- `VENTAS_CANCEL`

Referencias:

- `src/utils/adminPermissions.js:79`
- `src/app/admin/ventas/[id]/page.jsx:178`

Prioridad: **P0**

Efecto:

- reglas por rol incompletas;
- la cancelacion depende de owner/admin en la practica;
- resultados inesperados al comprobar permisos.

### Hallazgo AUTHZ-04 - Contrato incorrecto de `PermissionGuard`

`PermissionGuard` acepta la prop `permission`.

La pagina de plantillas envia:

- `allowedRoles`
- `requiredPermission`

Referencias:

- `src/components/crm/layout/PermissionGuard.jsx`
- `src/app/admin/configuracion/plantillas/page.jsx:11`

Prioridad: **P1**

Efecto probable:

- usuarios que no son owner pueden recibir acceso denegado aunque tengan permiso para plantillas.

## 6. Separacion de datos publicos y administrativos

### Auditoria estatica

Los endpoints:

- `/api/public/cars`
- `/api/public/cars/:id`

excluyen explicitamente:

- precio y moneda de compra;
- propietario y datos de contacto;
- cliente vinculado y consignador;
- notas internas;
- motor y chasis;
- ubicacion;
- patente/VIN;
- gastos;
- propietarios anteriores;
- auditoria;
- informacion interna de publicacion.

### Auditoria en produccion

Consulta realizada en modo lectura:

- Vehiculos publicos recibidos: **24**
- Campos sensibles detectados en la muestra publica: **0**
- `/api/admin/cars` sin token: **401**

Resultado: **OK**

Esta frontera debe conservarse con pruebas automatizadas antes de modificar los formularios de vehiculos.

## 7. Verificacion de navegador

### AutoSporting

- `https://autosportingg.com/admin` redirige a `/login` sin sesion.
- La proteccion de ruta funciona en la verificacion anonima.
- En viewport mobile `390x844`, la pagina de login no presenta overflow horizontal:
  - `scrollWidth`: 380
  - `clientWidth`: 380

### Sote

- La sesion actual redirige a `/v2/login/`.
- En viewport mobile `390x844` no presenta overflow horizontal en login.

### Pendiente

No se pudo completar QA autenticado por rol porque no habia sesiones activas.

Quedan pendientes:

- owner/admin;
- ventas;
- administrativo;
- solo lectura;
- capturas desktop y mobile de las rutas criticas;
- acciones bloqueadas y permitidas por rol.

No se ingresaron ni almacenaron credenciales.

## 8. Veredicto de Fase 0

Estado: **NO-GO condicional para cambios funcionales amplios**

Se puede continuar con trabajo visual aislado, pero no se recomienda iniciar formularios, ventas o finanzas antes de resolver:

1. Build roto por `src/app/api/test-sales/route.js`.
2. Secretos fallback en `server.js`.
3. Login legacy con contraseña maestra.
4. Falta de autorizacion backend uniforme.
5. Permisos no definidos.

## 9. Orden de correccion recomendado

### Fase 0.1 - Higiene del build

- decidir destino de los archivos `test-sales`;
- recuperar build verde.

### Fase 0.2 - Secretos y login

- configurar variables en todos los entornos;
- rotar secretos;
- retirar fallbacks;
- eliminar email opcional/master login.

### Fase 0.3 - Permisos

- definir permisos faltantes;
- corregir `PermissionGuard`;
- implementar `requirePermission` gradualmente.

### Fase 0.4 - QA autenticado

- probar roles;
- registrar capturas anonimizadas;
- verificar desktop/mobile.

## 10. Criterio de aceptacion para cerrar bloqueos

- [x] Baseline Git registrado.
- [x] Rutas inventariadas.
- [x] `node --check server.js`.
- [x] `git diff --check`.
- [x] `npm.cmd run build` despues de desactivar la ruta temporal `test-sales`.
- [x] Endpoint admin rechaza acceso anonimo.
- [x] Endpoint publico no expone campos privados en la muestra.
- [x] Secretos sin fallback literal en codigo.
- [x] Login legacy retirado del codigo.
- [ ] Permisos faltantes definidos.
- [ ] Autorizacion backend por permiso.
- [ ] QA autenticado por rol.
- [ ] Capturas baseline autenticadas.

## 11. Confirmaciones

- No se modifico codigo de producto.
- No se modifico `server.js`.
- No se modificaron endpoints.
- No se modificaron modelos.
- No se tocaron datos reales.
- No se instalaron dependencias.
- No se hizo `git add`, commit ni push.
- Solo se creo este documento de auditoria.
