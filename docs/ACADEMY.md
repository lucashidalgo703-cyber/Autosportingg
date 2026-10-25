# AutoSporting Academy

Origen: `feature/academy-financiera` (`7fdfff15`). Candidata actual: `release/academy-standalone`, desde `origin/main` verificado (`73efd4b`). Módulo educativo bajo `/admin/academy`. El shell aislado proviene de la candidata combinada, sin incorporar Capital. Esta evidencia histórica no sustituye el dictamen actual **NO-GO** de `docs/ACADEMY_STANDALONE_RELEASE.md`.

## 13.1 · Interfaz principal

Panel, catálogo inicial de ocho cursos y navegación a laboratorio, evaluaciones, progreso, entrenador y tutor. Reutiliza CrmCard y tokens del CRM. La candidata independiente conserva `ProtectedRoute` y usa el shell educativo aislado; añade la entrada en `CrmSidebar.jsx` sin cambiar permisos. La publicación queda bloqueada por la validación de sesión heredada descrita en el informe actual.

El avance inicial es cero, sin resultados inventados. Los seis destinos quedaron funcionales al completar las subetapas siguientes.

Validación inicial: `node --test tests/academy.test.js`. Verificación visual y compilación completa registradas en 13.8.

## Límites

Los componentes y motores educativos no consultan endpoints operativos ni usan datos de clientes, ventas o tesorería en ejercicios. No se incorpora MongoDB, migraciones, proveedores de IA ni cambios en autenticación, seguridad, auditoría o cálculos existentes. Sin push, merge o deploy.

En la candidata independiente la página completa usa el shell educativo: no monta encabezado, sidebar, navegación inferior ni tour administrativos. La prueba de aislamiento recorre sus secciones y exige que la única solicitud administrativa sea `/api/admin/auth/me`. El dashboard y el shell general siguen intactos en las demás rutas. La evidencia de las subetapas siguientes es histórica; para resultados y límites actuales consultar `ACADEMY_STANDALONE_RELEASE.md`.

## 13.7 · Tutor estructurado

Tutor funcional con selección de curso/lección y cuatro consultas predefinidas: concepto, ejemplo, ejercicio resuelto y glosario. Respuestas con fuente y enlace a la lección. Declara expresamente que no hay IA conectada. Conversación temporal limitada a 20 consultas, sin envío ni guardado remoto. Adaptador `structuredTutor.respond` separado de la interfaz, con manejo de error; un proveedor futuro requiere autorización. Prueba de 96 combinaciones de respuesta, determinismo y rechazo de temas inexistentes.

## 13.6 · Entrenador

Seis escenarios, dos alternativas cada uno: compra/liquidez, descuento/espera, financiación, permuta, diversificación y stock lento. Selección y comparación con resultados hipotéticos, fórmulas, ventajas, riesgos y costo de oportunidad. Se registra práctica local, sin puntuar decisiones como universalmente correctas. Pruebas de cada alternativa y comprobaciones de caja intermedia, valor presente y consistencia de asignación.

## 13.5 · Seguimiento local

Repositorio local versionado y sustituible, separado por identificador del usuario autenticado existente. No almacena token, nombre, contenido operativo ni respuestas privadas. Sin identificador estable funciona temporalmente en memoria. Guarda lecciones completadas después de resolver el ejercicio, hasta 100 intentos y 50 decisiones; métricas calculadas desde la actividad, sin precarga ficticia. Dashboard y enlaces permiten continuar el recorrido; cursos aceptan enlaces directos por curso/lección.

Se informa cuando el almacenamiento falla. Incluye estado vacío, historial y restablecimiento con confirmación dentro de Academy. La corrección posterior incorpora consolidación entre pestañas; sigue sin sincronización entre dispositivos ni valor de certificación. Persistencia de servidor, políticas nuevas y certificaciones quedan pendientes de autorización posterior.

## 13.4 · Evaluaciones

40 preguntas: conceptos de opción múltiple, ejercicios numéricos y casos prácticos. Filtros por curso y nivel, puntaje por igual ponderación, explicaciones, repaso y reintentos. Resultados formativos, sin certificación ni cambios de acceso. Corrección pura testeada con respuestas completas, erróneas, parciales e incompletas. No se crea persistencia remota de respuestas ni perfiles educativos; el banco y sus soluciones forman parte del código cliente, apropiado para evaluación formativa local.

## 13.3 · Laboratorio

16 simuladores con valores ficticios editables, fórmulas, unidades y supuestos visibles; resultados inmediatos y cronograma francés. Motor puro en `src/lib/academy/simulators.js`, sin dependencias operativas. Validaciones de rangos, tasas/plazos, denominadores, sobreasignación y desbordamiento. Cálculos sin redondeo intermedio; presentación con dos decimales. Los modelos excluyen cargos e impuestos salvo costos explícitos; TEA no es CFT. Payback simple con flujos uniformes y reserva sin rendimiento.

Pruebas: `node --test tests/academy*.test.js`; incluye valores conocidos, pérdidas, tasa cero y casi cero, recurrencia y conservación de principal, entradas inválidas y límites.

## 13.2 · Cursos

Ocho cursos, 24 lecciones progresivas, 24 ejemplos ficticios y 24 ejercicios numéricos con explicación. Glosario por curso y navegación secuencial. El contenido distingue contribución, utilidad bruta, caja, margen/recargo y retorno sobre capital. Tasas educativas, sin cotizaciones reales. Validación: pruebas de integridad del currículo y corrección de entradas numéricas en `tests/academy.test.js`.

Referencias de contraste conceptual (contenido propio, no transcripción):
- BCRA: https://www.bcra.gob.ar/prestamos-personales-comparar-costos-y-condiciones/ (TNA, TEA y CFT).
- CFPB: https://www.consumerfinance.gov/ask-cfpb/how-does-compound-interest-work-en-1683/ (capitalización).
- Lean Enterprise Institute: https://www.lean.org/lexicon-terms/inventory-turns/ (rotación al costo).

## 13.8 · Verificación y reproducción

Fecha: 22 de octubre de 2026. Rama `feature/academy-financiera`.

Comandos desde la raíz:

```powershell
npm ci
npm run test:academy
npm run check
npm run build
npm run test:academy:ui
node --test tests/dashboardGains.test.js tests/saleCommercial.test.js
npm run test:help
```

La configuración de navegador usa Chrome instalado: escritorio 1280×720 y emulación móvil iPhone 13 (390×664, DPR 3). No requiere credenciales: todas las APIs y la sesión del navegador son ficticias e interceptadas; se bloquea tráfico externo. No se ejecuta el backend Express ni se conecta una base de datos. Para usar otro servidor local ya iniciado, establecer `ACADEMY_BASE_URL` y ejecutar el comando UI. Esta variable es solo de pruebas.

Resultados:
- 16 pruebas unitarias de Academy: aprobadas, con múltiples casos y límites por prueba.
- 14 pruebas de navegador (7 en escritorio y 7 en móvil): navegación, 16 simuladores, recarga/restablecimiento del avance, corrección/puntaje, seis escenarios, tutor, enlaces a ocho cursos, dificultad y recuperación de almacenamiento corrupto.
- `npm run check`: aprobado; 18 advertencias preexistentes de directivas ESLint sin uso en archivos ajenos a Academy, cero errores.
- `npm run build`: aprobado. Sitemap usa su fallback estático porque el backend local no está disponible; no se configuró una conexión real.
- Regresión offline de ganancias: 22 casos aprobados; cálculo comercial y certificación del manual de ayuda aprobados.
- Capturas desktop/móvil revisadas. Se corrigió texto negro heredado de botones nativos en el selector de cursos, con colores explícitos y selección visible solo en Academy. Sin desbordamiento horizontal en las pantallas probadas.
- Diferencia de Git revisada: sin cambios en autenticación, permisos, auditoría, servidor, modelos o servicios/cálculos financieros existentes.

Las capturas y trazas de Playwright se escriben en `%TEMP%/autosporting-academy-playwright`, fuera del repositorio; cada ejecución renueva esa carpeta. Los primeros fallos UI fueron selectores que también encontraban el buscador del CRM o el anunciador interno de Next; se corrigieron delimitando la búsqueda al contenido principal. En este entorno se usó un servidor local separado para evitar que el cierre del proceso hijo de Playwright quedara esperando; se detuvo al terminar.

## Inventario de archivos

Nuevos:
- `src/app/admin/academy/`: `layout.jsx`, `page.jsx`, `[section]/page.jsx`.
- `src/components/crm/academy/`: `AcademyFrame.jsx`, `AcademyDashboard.jsx`, `AcademyCourses.jsx`, `AcademyCourseCase.jsx`, `AcademyLab.jsx`, `AcademyAssessments.jsx`, `AcademyProgressProvider.jsx`, `AcademyProgress.jsx`, `AcademyDecisions.jsx`, `AcademyTutor.jsx`.
- `src/lib/academy/`: `catalog.js`, `curriculum.js`, `deepening.js`, `courseCases.js`, `assessmentVariants.js`, `decimal.js`, `simulators.js`, `assessments.js`, `progress.js`, `decisions.js`, `tutor.js`.
- `tests/`: `academy.test.js`, `academySimulators.test.js`, `academyAssessments.test.js`, `academyProgress.test.js`, `academyCorrections.test.js`, `academyEducation.test.js`, `academyDecisions.test.js`, `academyTutor.test.js`, `academy.spec.js`.
- `playwright.academy.config.js` y este documento.

Modificados fuera del módulo:
- `src/components/crm/layout/CrmSidebar.jsx`: una entrada de menú; función de permisos intacta.
- `package.json`: comandos de prueba de Academy y dependencia de desarrollo `@playwright/test`, que faltaba aunque el repositorio ya tenía pruebas Playwright.
- `package-lock.json`: resolución reproducible de esa dependencia de desarrollo. No se actualizan dependencias de producción.

## Commits por subetapa

| Subetapa | Commit | Avance |
| --- | --- | --- |
| 13.1 | `76fb916` | Panel y navegación |
| 13.2 | `664e960` | Cursos y ejercicios |
| 13.3 | `c539916` | Laboratorio de 16 simuladores |
| 13.4 | `1e9a74a` | Evaluaciones y repaso |
| 13.5 | `3995a17` | Seguimiento local |
| 13.6 | `2a93876` | Escenarios de decisión |
| 13.7 | `b4b7a35` | Tutor estructurado |
| 13.8 | Consultar `git log -1` | Pruebas UI, contraste y documentación final |

## Pendientes y próximos pasos

- Persistencia remota por usuario y sincronización entre dispositivos, previa autorización. La información local es editable por quien controla el navegador: no sirve para certificación.
- IA externa, elección de proveedor, costos y políticas del tutor, previa autorización. Actualmente solo responde preguntas predefinidas; no hay interpretación de texto libre.
- Ampliar contenido y variantes de casos según necesidades de capacitación; los escenarios actuales son fijos y los simuladores permiten entradas manuales.
- La revisión de regresión fue estática, de compilación, unitarias offline y navegación de Academy. No se ejecutaron integraciones con MongoDB ni una certificación end-to-end de todos los módulos operativos.
- La auditoría posterior detectó ocho hallazgos. Su corrección y evidencia se registran abajo; los resultados originales de 13.8 son históricos y no certifican por sí solos la versión corregida.

## Corrección de auditoría · Grupo 1 (hallazgos 1, 5, 7 y 8)

- Amortización calculada desde el valor presente del saldo restante y amortizaciones geométricas, sin acumular restas inestables ni forzar una última cuota. Tolerancia absoluta de $0,01 por identidad monetaria y por total; se rechazan combinaciones cuya resolución numérica o verificaciones internas no permiten cumplirla. Cronograma teórico sin redondeo intermedio; no es un contrato de cuotas redondeadas a centavos.
- Rotación cero sin ventas; días no definidos cuando no existe estimación finita. Inventario promedio cero produce indicadores no definidos. Recuperación imposible con inversión positiva y flujo uniforme nulo/negativo; inversión nula se recupera en cero períodos. Negativos no admitidos, campos vacíos y formatos inválidos siguen siendo errores de entrada.
- Parser decimal único para simuladores y respuestas; admite signo, coma o punto decimal y espacios exteriores. Rechaza agrupaciones, exponentes, prefijos hexadecimales/binarios/octales y números no finitos.
- Descuento bruto de $750.000 identificado frente a lista; diferencia neta de esperar de $450.000 identificada después de $300.000 de costos.
- Pruebas: 20 tests de Academy aprobados, incluyendo 105 combinaciones de principal/tasa/plazo con oráculo de valor presente independiente, conservación, cierre, recurrencia y uniformidad de cuotas. Lint focalizado y `git diff --check` aprobados.

El hallazgo documental 6 queda corregido en la sección Límites: se explicita el encabezado heredado sin modificarlo.

## Corrección de auditoría · Grupo 2 (hallazgo 2)

Operaciones de lectura/modificación/escritura serializadas por usuario mediante Web Locks. Cada operación lee el último estado guardado, y las pestañas reciben eventos `storage` y actualizaciones al recuperar visibilidad. El restablecimiento escribe una generación nueva: las operaciones pendientes de la anterior se rechazan para impedir resucitar datos borrados. Migra los documentos v1 en la siguiente escritura local; no hay migración de base de datos.

Sin Web Locks el avance es temporal y se informa expresamente: no se ofrece persistencia concurrente insegura. Los errores de escritura no se presentan como guardados exitosos. La corrupción exige restablecimiento explícito. Pruebas unitarias con exclusión mutua: actualizaciones simultáneas, conservación de historial, reset contra una escritura pendiente, generaciones, migración, corrupción, fallo de cuota e identidad separada. Los 22 tests acumulados pasan; se incorpora además un flujo Playwright de dos pestañas para la verificación final.

## Corrección de auditoría · Grupo 3 (hallazgos 3 y 4)

Se mantienen 24 lecciones para preservar el seguimiento existente. Cada una incorpora desarrollo propio con ejemplos interpretados y análisis de decisiones, sin aumentar artificialmente la cantidad. Los ocho cursos añaden un caso integrado con 4–5 pasos de resolución, alternativas, riesgos, preguntas de justificación y ejercicios interactivos; hay 25 respuestas adicionales de práctica.

Dirección Financiera Avanzada desarrolla presupuesto de capital con restricciones por fecha, unidades indivisibles, selección factible, costo ponderado sin efecto fiscal automático, consistencia entre flujos y tasas, escenarios de estrés y revisión de desvíos. El caso compara tres carteras y demuestra por qué una contribución futura no resuelve un vencimiento intermedio. No se presenta como una certificación profesional ni cubre toda la disciplina.

Las 40 preguntas de examen conservan 16 preguntas conceptuales/casos y reemplazan las 24 numéricas por un banco independiente de la práctica: nuevas cifras, enunciados y resoluciones; incluye problemas de varios pasos y redondeo de unidades enteras. El tutor estructurado también usa el desarrollo ampliado al explicar. Los casos integrados son práctica formativa y no alteran permisos ni añaden marcas de lección al progreso.

Pruebas acumuladas: 24 tests aprobados. Se contrastan las 25 respuestas de casos y las 24 variantes numéricas con fórmulas independientes, incluyendo VAN, valor presente, presupuesto temporal y medias al costo. Las pruebas estructurales ayudan a detectar contenido faltante, pero la profundidad se sustenta en los desarrollos y casos, no en un mínimo artificial de palabras.

Referencias adicionales de contraste (material original): [consistencia entre flujos y tasa, NYU Stern](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/background/valintro.htm) y [especificación Web Locks, W3C](https://www.w3.org/TR/web-locks/).

## Verificación final de las correcciones

Rama `feature/academy-financiera`, base de auditoría `10a85ef`. Commits por grupo: `4c18bef` (cálculos, decimal, estados económicos, descuento y límites documentales), `db23d72` (concurrencia) y `16aea8c` (profundidad educativa y evaluación independiente).

Resultados sobre el código corregido:

| Comprobación | Resultado |
| --- | --- |
| `npm run test:academy` | 24 tests aprobados; incluyen 105 combinaciones de amortización y oráculos independientes para 49 respuestas nuevas |
| Academy + ganancias + comercial + ayuda con `node --test` | 27 tests del runner aprobados; ganancias contiene además sus 22 aserciones propias |
| `npm run test:academy:ui` con servidor local compilado | 18 tests aprobados: 9 desktop y 9 móvil; incluye dos pestañas, reset, aislamiento, casos integrados, cuota a 600 períodos y estados sin ventas/sin recuperación |
| `npm run check` | Aprobado: cero errores y las 18 advertencias preexistentes ya contrastadas con la base |
| `npm run build` | Aprobado; sitemap usa fallback estático por ausencia de backend real |
| `tests/integration/*.test.js` | 14 suites aprobadas, 110 aserciones internas, MongoDB temporal en 127.0.0.1 |
| `tests/treasuryDistribution.test.js` | Fallo preexistente en línea 553: al anular gasto espera 500.000 y obtiene 300.000; también reproducido sobre copia temporal del commit `10a85ef` con idéntico resultado |

Se instalaron herramientas de MongoDB en una carpeta temporal y se utilizó una junction ignorada dentro de node_modules para resolverlas, sin editar package.json ni package-lock.json. Los binarios y bases fueron locales y temporales; no se leyó una URI de producción. Para reproducir integraciones se requiere `mongodb-memory-server`; el directorio de descarga puede establecerse con `MONGOMS_DOWNLOAD_DIR`. Se corrigió una configuración inicial de caché antes de obtener los resultados anteriores.

Las pruebas UI heredadas (`admin-smoke`, `ayuda-interactions`, `user-profile`, `visual-help`) se ejecutaron aparte con Chrome local y configuración temporal, sin editar esos tests. Una primera ejecución acotada a 6 segundos no superó la carga de recursos externos. Se repitió con el timeout normal de 30 segundos, bloqueando DNS externo y conservando el servidor local: **6 smoke tests pasaron y 17 pruebas fallaron esperando la navegación a `/admin` en el login de preparación**. No había backend ni credenciales de prueba configurados; no se consideran verificadas las interacciones de ayuda/perfil. Los smoke tests solo comprueban renderizado básico y no certifican acceso funcional a datos. Login, sus componentes y estos tests no cambiaron respecto de `10a85ef`. No se considera que las integraciones o UI no aprobadas estén resueltas por estas correcciones de Academy.

La suite global, por tanto, **no está completamente verde**. El fallo de reversión de gasto de Tesorería está reproducido antes y después de estas correcciones; los 17 fallos UI heredados corresponden a precondiciones de autenticación del entorno, no a una comprobación funcional superada. Se dejan pendientes sin tocar los módulos excluidos ni iniciar EX.5.

Evidencia local de esta ejecución (archivos temporales, no versionados):
- `%TEMP%/autosporting-academy-integration.log`: 14 suites aprobadas y el fallo de Tesorería.
- `%TEMP%/autosporting-academy-baseline-treasury.log`: el mismo fallo sobre copia del commit anterior.
- `%TEMP%/autosporting-legacy-ui-final.log`: 6 smoke aprobados y 17 timeouts en `page.waitForURL('/admin')` durante `beforeEach`.
- `%TEMP%/autosporting-academy-playwright`: capturas desktop/móvil de la versión corregida.

Reproducción del fallo de Tesorería, con la dependencia temporal disponible:

```powershell
$env:MONGOMS_DOWNLOAD_DIR = "$env:TEMP\autosporting-academy-mongodb"
node --test tests/treasuryDistribution.test.js
```

Para verificar Academy se usó `npm run build`, un servidor `npm run start -- --hostname 127.0.0.1 --port 3104` y `$env:ACADEMY_BASE_URL='http://127.0.0.1:3104'; npm run test:academy:ui`. Al terminar se detuvo el servidor. No quedó una sesión de MongoDB de prueba activa.

Se revisaron capturas responsive del contenido ampliado. Diferencia de Git de autenticación, permisos, auditoría, encabezado compartido, servidor, modelos, servicios y módulos financieros operativos: cero. Dependencias de producción idénticas a la base.

### Límites vigentes

- El cronograma es teórico sin redondeo intermedio; no sustituye un contrato con reglas de redondeo. Se rechazan combinaciones sin precisión garantizada, aunque sus entradas individuales estén en rango.
- Web Locks requiere un contexto compatible (HTTPS o localhost). Si no está disponible se informa avance temporal; no hay fallback a escrituras concurrentes inseguras. Todas las pestañas deben recargar la versión corregida; clientes antiguos no participan del protocolo nuevo.
- No hay sincronización entre dispositivos, certificación, permisos nuevos, IA externa ni datos operativos dentro de ejercicios. El encabezado CRM conserva su conducta existente.
- La corrección de Tesorería y la adecuación de tests UI heredados son trabajos separados: no se modifican módulos financieros, autenticación ni seguridad para hacer pasar la suite global.
- No se inició EX.5. Sin push, merge, deploy ni cambios en main.

`main` permanece en `73efd4b65ff0966aad2306c368f3fe2fb93f6ab4`. No se ejecutaron push, merge, deploy, migraciones ni conexiones con producción.
