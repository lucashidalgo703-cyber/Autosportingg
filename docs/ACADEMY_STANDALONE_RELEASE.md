# Academy Financiera — candidata independiente

Fecha: 25/10/2026 (America/Buenos_Aires). Dictamen: **NO-GO para publicación por autenticación heredada**. Preparación local terminada; no se habilitó ninguna ruta en producción.

## Rama, base y procedencia

- Rama: `release/academy-standalone`.
- Commit de código: `5d2b187c836d173b1793d5118b00c3ca69c64a8e`.
- Base: `73efd4b65ff0966aad2306c368f3fe2fb93f6ab4`.
- `git ls-remote origin refs/heads/main` confirmó esa base al inicio y al cierre; `main` y `origin/main` locales coinciden. Esto verifica Git remoto, no acredita qué deployment está sirviendo Vercel.
- Árbol inicial limpio en `integration/capital-academy-candidate` (`98aa429`). Las ramas originales conservan sus hashes.
- Academy se copió exclusivamente de `feature/academy-financiera` (`7fdfff15`), sin fusionar sus ancestros.
- De `98aa429` se recuperaron solamente los dos cambios de layout del shell educativo, el enlace «Volver al CRM» y su prueba de aislamiento. No se fusionó la candidata combinada.

## Contenido y archivos

Se conservan los ocho cursos, 24 lecciones, 16 simuladores, 40 preguntas, seis escenarios, progreso local, entrenador y tutor estructurado. No se reescribieron contenido, cálculos, estilos ni diseño de Academy. El progreso sigue siendo local por usuario, sin sincronización entre dispositivos ni certificación.

Los 40 archivos de código/configuración/pruebas están enumerados en [files.txt](academy-standalone-evidence/files.txt):

- Tres rutas/layouts en `src/app/admin/academy/`.
- Once componentes en `src/components/crm/academy/`.
- Once módulos en `src/lib/academy/`.
- Diez archivos de pruebas de Academy, incluido el nuevo `tests/academyRelease.spec.js`.
- `playwright.academy.config.js`.
- `package.json` y `package-lock.json`: scripts y dependencia de desarrollo Playwright; dependencias productivas intactas.
- `CrmSidebar.jsx`: entrada Academy; reglas de permisos intactas.
- `AdminLayoutClient.jsx` y `CrmShell.jsx`: excluir tour y chrome operativo únicamente en `/admin/academy` y descendientes, dentro del mismo `ProtectedRoute` publicado.

Se entregan además `docs/ACADEMY.md`, este informe y la carpeta de evidencia. `git diff --name-status 73efd4b HEAD` muestra el inventario completo, incluida documentación.

Verificación del diff: sin cambios en `server.js`, `api/`, modelos, servicios, contexto de autenticación, `ProtectedRoute`, permisos, dashboard general, configuración Next ni `vercel.json`. Sin Capital y Reinversión, nueva Seguridad, passkeys, Web Push, dispositivos confiables ni Experience. No hay migraciones, endpoints nuevos, secretos ni variables productivas nuevas. No se accedió al repositorio de Antigravity.

## Pruebas y evidencia

Node 24.20.0, npm 11.19.0, Chrome local; servidor Next compilado en `127.0.0.1:3100`. Escritorio 1280×720 y móvil emulado iPhone 13. APIs del navegador interceptadas con datos ficticios y tráfico externo bloqueado. Las integraciones usan MongoDB efímero en `127.0.0.1`, con URI y clave JWT temporales generadas por el harness; nunca Atlas. No se arrancó el backend con configuración productiva.

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| `npm run test:academy` | 24 aprobadas | [unit.txt](academy-standalone-evidence/unit.txt) |
| Ganancias, comercial y ayuda (`node --test`) | Tres archivos aprobados; ganancias incluye 22 aserciones | [crm-unit.txt](academy-standalone-evidence/crm-unit.txt) |
| `npm run check` | Aprobado, cero errores, 18 advertencias en archivos intactos de la base | [check.txt](academy-standalone-evidence/check.txt) |
| `npm run build` | Aprobado; sitemap con fallback estático y API fijada a loopback sin servidor | [build.txt](academy-standalone-evidence/build.txt) |
| Navegación, contenido, progreso, concurrencia, simuladores, tutor y aislamiento | 20 aprobadas, diez por dispositivo | [browser.txt](academy-standalone-evidence/browser.txt) |
| Sin token, token malformado, vencido y respuesta 401 | Ocho aprobadas; siete rutas por caso y dispositivo | Mismo log |
| Sesión validada: dashboard, stock, ventas, tesorería y regreso desde Academy | Dos aprobadas | Mismo log |
| Firma inválida rechazada con 403, servicio 503, sin conexión | **Seis fallos reales**, tres por dispositivo | Mismo log |
| Integraciones CRM | 14 archivos aprobados | [crm-integration.txt](academy-standalone-evidence/crm-integration.txt) |
| `tests/treasuryDistribution.test.js` | Falla en línea 553: 300.000 frente a 500.000 esperados | Mismo log |

Resultado final de navegador: **30 aprobadas y seis fallidas**, sin `skip`, `test.fail` ni cambios de expectativas para aprobar. La primera corrida del nuevo smoke incluyó por error `/admin/caja`, que no existe en la base: se corrigió la ruta a `/admin/tesoreria`, manteniendo las mismas aserciones. La corrida final corresponde al código entregado.

La prueba de aislamiento recorre todas las secciones y exige que la única solicitud administrativa sea `/api/admin/auth/me`. La inspección de los módulos educativos no encontró `fetch`, axios ni referencias a APIs operativas. No se montan encabezado, sidebar, navegación inferior ni tour del CRM en Academy. La autenticación conserva la consulta de sesión publicada.

El fallo de reversión de gasto pertenece al código productivo intacto: test, servidor, modelos y servicios involucrados no tienen diferencias con `73efd4b`. También estaba registrado antes de esta candidata en la evidencia histórica de Academy. No se modificaron Tesorería ni sus expectativas. Las pruebas UI del CRM aquí comprueban shell/navegación con fixtures; no certifican todos sus flujos operativos con datos reales.

Reproducción desde la raíz, sin iniciar un backend real:

```powershell
npm run test:academy
node --test tests/dashboardGains.test.js tests/saleCommercial.test.js tests/helpRegistry.test.js
npm run check
$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:9'
Remove-Item Env:VERCEL_URL -ErrorAction SilentlyContinue
Remove-Item Env:VERCEL_PROJECT_PRODUCTION_URL -ErrorAction SilentlyContinue
npm run build
npm run test:academy:ui
```

Para integraciones se requiere `mongodb-memory-server` instalado fuera de las dependencias productivas y un binario MongoDB temporal. En este entorno ya estaba disponible por una junction ignorada en node_modules. Se usó `MONGOMS_DOWNLOAD_DIR=$env:TEMP/autosporting-academy-mongodb` y `MONGOMS_RUNTIME_DOWNLOAD=false`, ejecutando `node --test tests/integration/*.test.js tests/treasuryDistribution.test.js`. No se cambió el manifiesto para instalar herramientas de base de datos.

## Bloqueo de autenticación

`src/context/AuthContext.jsx`, idéntico a `main`, solo invalida la restauración si `/api/admin/auth/me` devuelve **401**. Ante **403**, **503** o error de red continúa con `setIsAuthenticated(true)` usando el payload local. El backend publicado usa `jwt.verify` y devuelve **403** ante una firma inválida (`server.js`, middleware `authenticateToken`). `ProtectedRoute` se apoya en ese estado y en una validación local del token.

Reproducción local: crear un token de prueba con payload decodificable, identidad/rol y vencimiento futuro, sin firma válida; interceptar `/api/admin/auth/me` con 403; abrir `/admin/academy`. La expectativa de redirección a `/login` falla y se ve Academy. También ocurre con 503 o la solicitud abortada. Los tests adversos se detienen en esa primera ruta al fallar; no se afirma que hayan completado los siete destinos en esos casos.

Esto impide certificar «sin acceso anónimo», aunque los casos sin token o con 401 sí estén bloqueados. No se añadió un login ni se cambió Seguridad. Hace falta autorización específica para resolver la incompatibilidad con la autenticación administrativa vigente y repetir la suite. Hasta entonces, no publicar esta rama. No se requiere incorporar Seguridad de Antigravity para describir ni reproducir el hallazgo.

## Capturas

Se preservaron las capturas finales, revisadas visualmente, con el diseño original:

- [Panel escritorio](academy-standalone-evidence/desktop-academy-dashboard.png) y [panel móvil](academy-standalone-evidence/mobile-academy-dashboard.png).
- [Simulador escritorio](academy-standalone-evidence/desktop-academy-cuotas.png) y [simulador móvil](academy-standalone-evidence/mobile-academy-cuotas.png).
- [Curso escritorio](academy-standalone-evidence/desktop-academy-course.png) y [curso móvil](academy-standalone-evidence/mobile-academy-course.png).
- Evidencia del acceso indebido con 403: [escritorio](academy-standalone-evidence/desktop-auth-403-failure.png), [móvil](academy-standalone-evidence/mobile-auth-403-failure.png).

Los PNG no contienen información operativa real. Las trazas completas de fallos permanecen en `%TEMP%/autosporting-academy-playwright`; Playwright renueva esa carpeta al repetir la suite.

## Compatibilidad y riesgos pendientes

La compilación usa la versión Next y la configuración Vercel actuales del repositorio, sin modificar rewrites, funciones, cron, runtime ni dependencias productivas. Academy no necesita infraestructura adicional. No se consultó ni modificó el panel de Vercel: deployment activo, integración Git, rama productiva configurada y versión Node del proyecto deben verificarse antes de publicar; el build local no los acredita.

Bloqueantes: autenticación descrita arriba y autorización pendiente. El fallo preexistente de reversión de Tesorería se informa para la decisión de publicación, sin incluir su arreglo en esta rama. La evidencia visual usa fuentes de fallback porque el tráfico externo estaba bloqueado; móvil es emulado, no un dispositivo físico.

## Publicación — condicionada a GO y autorización posterior

No ejecutar mientras exista el bloqueo de autenticación. No se ha realizado ningún paso remoto de publicación.

1. Resolver el bloqueo bajo autorización y repetir `npm run test:academy`, `npm run check`, `npm run build` y `npm run test:academy:ui`. Las seis comprobaciones adversas deben aprobar sin debilitar sus expectativas. Revisar y aceptar explícitamente el fallo productivo de Tesorería o resolverlo por su circuito independiente.
2. Con autorización, ejecutar `git fetch origin main` y `git rev-parse origin/main`. Si no coincide con `73efd4b65ff0966aad2306c368f3fe2fb93f6ab4`, detener la publicación y volver a integrar/validar sobre la nueva base. No sobrescribir main ni usar force push.
3. Revisar `git diff --name-status origin/main release/academy-standalone` y confirmar nuevamente la ausencia de Capital, Seguridad y cambios financieros. Registrar el SHA final autorizado.
4. Verificar en el proyecto Vercel existente cuál deployment sirve producción y su SHA, que la rama productiva sea `main`, el runtime Node compatible y la integración Git habilitada. Registrar ID/URL del deployment vigente como punto de reversión. Si alguno no coincide con lo esperado, detenerse sin cambiar configuración.
5. Solo con autorización para push: `git push -u origin release/academy-standalone`. Abrir PR desde esa rama hacia `main`; no incluir otras candidatas. Si existe preview automático, comprobar sesión administrativa de prueba, denegación sin sesión y aislamiento de red allí, sin usar Atlas productivo para las pruebas.
6. Tras revisión y autorización explícita para merge/publicación, integrar únicamente ese PR a `main`. Con la integración Git verificada, Vercel iniciará el despliegue existente. Verificar estado Ready y que su SHA sea el autorizado; no cambiar variables, credenciales, Atlas o configuración Vercel.
7. Comprobar de forma no destructiva en producción el acceso con sesión y su rechazo sin sesión, el enlace Academy, retorno al CRM y ausencia de solicitudes operativas dentro de Academy. Ante incumplimiento, revertir por el procedimiento siguiente.

Los pasos dependientes de Vercel quedan sujetos a verificar el proyecto real: no se inventa un ID ni se afirma que el despliegue automático esté configurado.

## Reversión no destructiva — solo con autorización

Opción inmediata: desde Deployments del proyecto Vercel existente, volver a promover el deployment anterior cuyo ID se registró antes de publicar. Verificar dominio y SHA. No borrar deployments ni datos.

Restaurar también el código por PR de reversión: crear una rama desde el `origin/main` publicado y usar `git revert` sobre el commit squash de Academy o `git revert -m 1 <commit-de-merge-Academy>` si el PR se integró con merge. Revisar el diff inverso antes de publicar ese PR. Si se usaron commits lineales, revertir solamente los commits introducidos por esta entrega, del último al primero. No usar `reset --hard`, force push ni revertir otros cambios de main.

No hay migraciones ni datos remotos de Academy que revertir. El progreso local puede permanecer en el navegador sin uso y recuperarse al restaurar Academy; no borrar localStorage masivamente ni tocar datos del CRM.

Estado final: candidata local preparada y publicación detenida en **NO-GO**, a la espera de autorización.
