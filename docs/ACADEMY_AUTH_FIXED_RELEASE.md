# Academy + autenticación corregida — entrega local final

Fecha de revisión: 25/10/2026, America/Buenos_Aires.

**Dictamen: GO técnico condicionado para publicar exclusivamente Academy y la corrección mínima de autenticación.** El bloqueo de acceso detectado en la entrega anterior está resuelto en los escenarios probados. La publicación requiere autorización explícita, aceptación del fallo financiero preexistente descrito abajo y verificación del proyecto/deployment Vercel real. La suite global no está completamente verde. No se realizó push, merge a main ni deploy.

## Rama, commits y paquete

- Rama final: `release/academy-auth-fixed`.
- Origen exacto: `release/academy-standalone` en `a90fa3bc478cc6104b3d02d83686678a622a8042`.
- Base común: `73efd4b65ff0966aad2306c368f3fe2fb93f6ab4`. `origin/main` fue consultado por lectura y sigue en esa referencia; no se presupone que sea el deployment activo.
- Corrección fuente: `70d1a377820b0c14bb975dcb5b8d3a933738d3b0`, con esa base como padre directo.
- Commit integrado: `48f601e` mediante `git cherry-pick -x`, conservando la atribución y referencia fuente. **Sin conflictos; sin ediciones del código recibido.**
- Commit de pruebas de integración: `b0986e2`. El commit posterior de documentación/evidencia completa la entrega; consultar `git rev-parse release/academy-auth-fixed` para su SHA final.
- Contrato previo preservado en la rama `release/academy-auth-candidate`, commit `0625c09`; no se modificó esa rama ni ninguna original.

Bundle autorizado: `C:\Proyectos\auth-me-fail-closed.bundle`.

```text
Tamaño: 7521 bytes
SHA-256: F632BDDC9EEDC0F7D118040066865AEE14AD89B05497B14CBC31C32D71AFA915
Referencia: refs/heads/fix/auth-me-fail-closed
Commit: 70d1a377820b0c14bb975dcb5b8d3a933738d3b0
Prerequisito: 73efd4b65ff0966aad2306c368f3fe2fb93f6ab4
```

Se verificaron existencia, tamaño y SHA-256 antes de importar; `git bundle verify` aprobó y `list-heads` anunció únicamente la referencia esperada. Se importó por Git a `refs/remotes/academy-auth-import/fix-auth-me-fail-closed`, se comprobaron padre y diff, y solo entonces se aplicó a la candidata. El diff respecto de la base contiene exactamente los tres archivos autorizados. No se accedió a repositorios de Antigravity ni se copiaron fuentes manualmente. El bundle original no se modificó.

## Archivos incorporados y alcance

Desde el bundle, con contenido idéntico al commit fuente:

1. `src/context/AuthContext.jsx`: restauración de sesión cerrada por defecto ante 401/403, fallos del servicio y errores de red; preserva el token ante fallos temporales y ofrece reintento.
2. `src/components/ProtectedRoute.jsx`: bloquea el contenido durante validación y ante fallo; muestra recuperación sin cerrar sesión innecesariamente cuando falla la infraestructura.
3. `tests/authFailClosed.test.js`: 14 pruebas de emulación del cliente/middleware y auditoría estática. Se complementaron con pruebas que ejecutan la aplicación y el servidor reales; la emulación sola no certifica la implementación React.

Pruebas locales adicionales:

- `tests/academy.spec.js`: fixture de `/auth/me` actualizada al contrato publicado `{ ok, user, hasValidObjectId }`, usando la identidad del Authorization de cada pestaña para mantener la comprobación de aislamiento entre alumnos.
- `tests/academyRelease.spec.js`: mismo contrato de sesión; mantiene los 18 casos por dispositivo y refuerza la ausencia de shell/APIs operativas, el borrado de tokens inválidos y la conservación de token ante fallos temporales.
- `tests/authFailClosed.browser.spec.js` y `playwright.auth.config.js`: cuatro pruebas adicionales de bloqueo y recuperación con componentes reales, controlando exactamente una validación inicial y una por reintento, sin llamadas operativas ni errores de página.
- `tests/integration/authFailClosed.integration.test.js`: cuatro casos contra el endpoint Express real con firmas JWT y MongoDB temporal local.
- Documentación y nueva evidencia en `docs/academy-auth-fixed-evidence/`. El inventario respecto de Academy está en [files-since-academy.txt](academy-auth-fixed-evidence/files-since-academy.txt).

Los archivos productivos de Academy, sus once componentes, once módulos educativos, rutas y shell son idénticos a `a90fa3b`. Siguen presentes ocho cursos, 24 lecciones, 16 simuladores, 40 preguntas, seis escenarios, progreso local, entrenador y tutor estructurado. Sin cambios al dashboard general, modelos, servidor, servicios financieros, permisos, Capital, Experience, configuración Vercel ni dependencias productivas. Sin nuevos login, endpoints, passkeys, Web Push, dispositivos confiables, credenciales ni variables secretas productivas.

## Resultados y cobertura

Entorno: Node 24.20.0, npm 11.19.0, Next compilado en loopback, Chrome local. Escritorio 1280×720 y emulación iPhone 13. Las APIs de navegador son fixtures interceptadas y se bloquea tráfico externo. Las integraciones usan el harness existente con MongoDB efímero en `127.0.0.1`, URI local y clave JWT de prueba generada por el harness. No se usó Atlas, ni se arrancó un backend con configuración productiva. El build fijó el sitemap a una API loopback sin servicio, por lo que usó su fallback estático.

| Validación | Resultado | Evidencia |
| --- | --- | --- |
| `node tests/authFailClosed.test.js` | 14/14 aprobadas | [auth-unit.txt](academy-auth-fixed-evidence/auth-unit.txt) |
| `npm run test:academy:ui` | **36/36 aprobadas**, 18 escritorio y 18 móvil | [academy-browser.txt](academy-auth-fixed-evidence/academy-browser.txt) |
| `npx playwright test --config playwright.auth.config.js` | 4/4 aprobadas, recuperación tras 503/red en ambos tamaños | [auth-browser.txt](academy-auth-fixed-evidence/auth-browser.txt) |
| `npm run test:academy` | 24/24 aprobadas | [academy-unit.txt](academy-auth-fixed-evidence/academy-unit.txt) |
| Ganancias, comercial y ayuda | Tres archivos aprobados; ganancias contiene 22 comprobaciones internas | [crm-unit.txt](academy-auth-fixed-evidence/crm-unit.txt) |
| Integraciones administrativas | 15 archivos aprobados, incluidos los cuatro casos nuevos de autenticación real | [crm-integration.txt](academy-auth-fixed-evidence/crm-integration.txt) |
| `tests/treasuryDistribution.test.js` | **Fallo preexistente**, línea 553: esperado 500.000, obtenido 300.000 | Mismo log |
| `npm run check` | Aprobado, cero errores, 18 advertencias en archivos intactos | [check.txt](academy-auth-fixed-evidence/check.txt) |
| `npm run build` | Aprobado | [build.txt](academy-auth-fixed-evidence/build.txt) |

La ejecución combinada de integraciones y Tesorería termina con exit code 1 por ese único archivo fallido: 15 aprobados y uno fallido. No se omitió el fallo ni se alteraron sus expectativas. Los archivos del test y de la lógica financiera involucrada son idénticos a la base; el mismo fallo ya estaba documentado en la candidata anterior. No se corrigió un módulo financiero fuera de alcance.

### Acceso, recuperación y aislamiento

- Token fabricado: firma rechazada con 403 por el servidor real; el navegador rechaza la respuesta 403, elimina el token y no monta contenido administrativo.
- Token expirado, malformado o ausente: acceso denegado. 401 y 403: redirección al login existente y token eliminado.
- 503 y error de red: acceso denegado con pantalla de indisponibilidad, sin montar Academy ni shell CRM; token preservado, sin redirección destructiva. El reintento tras recuperación concede acceso y permite navegar sin bucles.
- Sesión legítima: el endpoint real confirma firma e identidad; las pruebas UI con el contrato publicado permiten navegar por Academy, dashboard, stock, ventas, tesorería y volver al CRM.
- Las pruebas negativas recorren los siete destinos Academy y comprueban ausencia de llamadas administrativas operativas. El recorrido educativo válido sigue exigiendo como única solicitud administrativa `/api/admin/auth/me`.
- Las seis comprobaciones antes fallidas ahora pasan. En 503/red se reemplazó la antigua expectativa específica de redirigir a `/login` por bloqueo visible, URL protegida estable, token conservado y ausencia de contenido. Esto responde al requisito nuevo de preservar sesión ante indisponibilidad; **no se relajó la expectativa de acceso denegado**. Para 401/403 sigue siendo obligatorio ir al login.
- No se usaron `skip`, `test.fail`, aumento de timeouts ni expectativas que acepten acceso ante un rechazo.

Los escenarios de red se prueban con interceptación, no provocando una caída real de Vercel. Las pruebas del bundle usan emuladores; la evidencia adicional ejecuta el código React compilado y el backend Express real por separado. No se afirma una certificación exhaustiva de todos los flujos del CRM ni una auditoría completa del ciclo de vida de autenticación.

## Capturas actuales

- Panel: [escritorio](academy-auth-fixed-evidence/desktop-academy-dashboard.png), [móvil](academy-auth-fixed-evidence/mobile-academy-dashboard.png).
- Curso: [escritorio](academy-auth-fixed-evidence/desktop-academy-course.png), [móvil](academy-auth-fixed-evidence/mobile-academy-course.png).
- Simulador: [escritorio](academy-auth-fixed-evidence/desktop-academy-cuotas.png), [móvil](academy-auth-fixed-evidence/mobile-academy-cuotas.png).
- Token rechazado con 403: [escritorio](academy-auth-fixed-evidence/desktop-auth-403-denied.png), [móvil](academy-auth-fixed-evidence/mobile-auth-403-denied.png).
- Bloqueo ante 503: [escritorio](academy-auth-fixed-evidence/desktop-auth-503-blocked.png), [móvil](academy-auth-fixed-evidence/mobile-auth-503-blocked.png).

Se revisaron los tamaños de escritorio y móvil, manteniendo el diseño educativo anterior. El cronograma conserva desplazamiento horizontal interno en móvil. Las fuentes externas están bloqueadas en las pruebas; se ve el fallback local. Móvil emulado, no un dispositivo físico. Los resultados históricos anteriores se conservaron en su carpeta original.

## Riesgos y condiciones antes de producción

1. Aceptar explícitamente el riesgo preexistente de reversión de gastos de Tesorería o resolverlo mediante un circuito independiente. Esta entrega no declara verde la suite financiera global ni incorpora su arreglo.
2. Verificar cuál deployment sirve realmente producción, su SHA, rama productiva, runtime y estado de integración Git en Vercel. No se consultó ni cambió el panel; el build local acredita compatibilidad con el código/configuración del repositorio, no con un estado remoto desconocido.
3. Si main avanza, volver a evaluar la candidata contra la nueva base antes de publicar. No reemplazar archivos de autenticación que otra entrega pudiera haber incorporado.
4. La política cambia el comportamiento ante una caída: se deniega el acceso administrativo hasta recuperar la verificación. Es la conducta requerida; el token se conserva para reintentar.
5. Progreso de Academy sigue siendo local por usuario/navegador y no constituye una certificación ni sincroniza entre dispositivos.

## Publicación mínima — no ejecutada

Solo tras aceptar las condiciones anteriores y autorizar push, revisión y publicación:

1. En la candidata con árbol limpio, ejecutar `git fetch origin main` y comparar `git rev-parse origin/main` con `73efd4b65ff0966aad2306c368f3fe2fb93f6ab4`. Si cambió, detener publicación y revalidar contra esa nueva base. Registrar `git rev-parse release/academy-auth-fixed` como SHA aprobado.
2. Revisar `git diff --name-status origin/main release/academy-auth-fixed` y guardar el SHA/ID/URL del deployment productivo vigente como punto de rollback. Confirmar que la integración Git y rama productiva del proyecto Vercel existente coinciden con el flujo previsto, sin cambiar configuración.
3. Con autorización: `git push -u origin release/academy-auth-fixed`. Abrir PR de esa rama a `main` con este informe. No publicar la rama original `release/academy-standalone`, que conserva el defecto heredado. No incluir otras candidatas.
4. Si hay preview automático, validar con fixtures o entorno de prueba sin Atlas productivo. Tras aprobación y autorización de merge/deploy, integrar solamente el PR de esta candidata. En el flujo Git verificado, comprobar que el deployment Ready corresponde al SHA autorizado; si no hay despliegue automático verificado, detenerse y acordar el paso explícito, sin inventar configuración.
5. Después de publicar, comprobar de forma no destructiva sesión válida/rechazo sin sesión, entrada Academy, retorno al CRM, carga de secciones y ausencia de solicitudes financieras dentro de Academy. Ante incumplimiento, aplicar rollback. No realizar pruebas de escritura financiera en producción.

## Rollback no destructivo — no ejecutado

- Para recuperar servicio inmediatamente, volver a promover el deployment anterior registrado desde el proyecto Vercel existente, con autorización. Verificar SHA y dominio; no borrar deployments ni datos. Si ese deployment es `73efd4b`, **también recupera el defecto de autenticación heredado**: requiere aceptación explícita de ese riesgo, no es un rollback que conserve el arreglo.
- Si solo debe retirarse Academy y conservar el arreglo de autenticación, preparar un PR nuevo desde el main vigente que revierta únicamente los cambios de Academy y mantenga los dos archivos corregidos de autenticación. Revisar el diff y validar antes de publicar; no revertir ciegamente toda la entrega.
- Si se decide revertir toda la candidata: usar `git revert <sha-squash-del-PR>` o `git revert -m 1 <sha-merge-del-PR>` según la estrategia real, por una rama y PR nuevos. Si hubo commits lineales, revertir exclusivamente los de esta entrega en orden inverso. No usar reset destructivo ni force push. Preservar cambios ajenos posteriores y cualquier corrección de autenticación incorporada por otra vía.
- No hay migraciones ni datos remotos de Academy que deshacer. El progreso local puede permanecer sin uso; no borrar localStorage masivamente ni modificar Atlas.

Estado de entrega: preparación y validación local completas. Publicación pendiente de autorización y de las condiciones explícitas anteriores.
