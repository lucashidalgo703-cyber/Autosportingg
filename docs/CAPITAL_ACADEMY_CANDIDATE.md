# Candidata local: Capital y Reinversión + Academy

## Alcance e historial

Esta rama se prepara únicamente para revisión local. Parte de Capital y Reinversión `0f36f9498db8f6a2639b40ec177941a4326d0d67` y conserva el historial de Academy `7fdfff15c0ce1dd19bfddf5c7668805323aa8bdf`. Las ramas de origen `feature/capital-owner-only-adaptation` y `feature/academy-financiera` no se modifican. No se integra código de Antigravity.

Capital conserva el motor, el adaptador de solo lectura, las métricas de conciliación y la corrección idempotente de reversión de gastos. Academy conserva cursos, simuladores, prácticas, evaluaciones, progreso local, entrenador de decisiones y tutor estructurado. No se crean modelos ni migraciones.

## Aislamiento de Academy

Academy mantiene el `ProtectedRoute` y el contexto de autenticación existentes. Usa un shell educativo para `/admin/academy`; no monta los encabezados y navegaciones globales que consultaban saldos de cuentas, ventas, stock, notificaciones, configuración, búsqueda y suscripción. Al abrir y recorrer sus secciones, la única llamada a una API administrativa es `/api/admin/auth/me`, requerida para validar la sesión existente. La navegación propia ofrece el regreso al CRM.

Los ejemplos y entradas iniciales de los simuladores son ficticios. El progreso se guarda localmente bajo la clave del usuario autenticado; no se incorpora persistencia en servidor ni se envían respuestas educativas. No se modifica el dashboard general, la autenticación ni los permisos.

## Seguridad pendiente

La ruta `GET /api/admin/capital-reinvestment/projection` debe continuar respondiendo `503 OWNER_ONLY_SECURITY_CONTRACT_PENDING`. Esta candidata no habilita a owner, admin ni ningún otro rol para consultar la proyección. La prueba de compatibilidad cubre rechazos fail-closed, no acceso positivo de propietario.

Antes de habilitar Capital hace falta integrar el contrato oficial de Seguridad de Antigravity: propietario exclusivo, sesión y dispositivo activos con revocación efectiva, y PIN de Tesorería ligado al mismo propietario. Debe aplicarse en servidor también ante llamada directa a la API; se requiere registrar la lectura sensible según la política de auditoría. No se ha copiado ni recreado autenticación, passkeys, sesiones o auditoría.

## Datos financieros y validación

No ejecutar esta candidata contra Atlas productivo. Capital sigue siendo analítico y de solo lectura; sus lecturas y cifras dependen de los vínculos operativos existentes y pueden quedar pendientes de conciliación. No se corrigen datos históricos automáticamente. No se cambian fórmulas ni se contabilizan cuotas futuras o permutas como liquidez. Las monedas ARS y USD siguen separadas.

Los tests de persistencia deben ejecutarse con MongoDB en memoria y fixtures ficticios. El servidor de demostración no debe tener una URI de producción ni permitir escrituras financieras. El rendimiento con volumen representativo, los índices potenciales y la conciliación histórica siguen pendientes fuera de esta etapa.

## Comprobaciones locales de esta candidata

- `npm run test:academy`: 24/24 aprobadas.
- `npm run test:academy:ui`: 20/20 aprobadas, 10 escritorio y 10 móvil. Incluye navegación, progreso/reset, ejercicios, simuladores y comprobación de que Academy solo llama `/api/admin/auth/me`; las demás respuestas de la prueba son interceptadas y ficticias.
- 17 archivos de pruebas financieras/comerciales aprobados: motor y ownership de Capital, distribución de Tesorería, ganancias, contrato Owner-Only fail-closed, adaptador de solo lectura, integraciones de Tesorería, reversión, Ventas, compras, permutas, cuotas y consistencia de stock. Además, `saleCommercial.test.js` informa `OK`. Se usó MongoDB temporal en memoria.
- `npm run check`: aprobado, cero errores y 18 advertencias de ESLint por directivas `eslint-disable` sin uso.
- `npm run build`: aprobado; todas las rutas de Academy, Tesorería Estratégica y demo de Capital compilaron. El sitemap recurrió al fallback estático porque no había backend conectado durante el build.
- El ayudante de demo crea un propietario y fixtures ficticios en una instancia MongoDB en memoria, limpia variables de entorno heredadas, enlaza Express y Next únicamente a loopback, excluye `.env*`, scripts, tests y documentación del snapshot temporal, y elimina dicho snapshot al cerrar los servicios.

El servidor local de demostración quedó iniciado, pero la herramienta de navegador de esta sesión rechazó el acceso a `127.0.0.1:3100` por su política de navegación local. Por ese bloqueo no se completó el login manual en navegador ni la captura de Capital desde la ruta demo en esta ejecución. Las capturas Playwright de Academy son del flujo UI con sesión/endpoints ficticios interceptados; las capturas existentes de Capital en `artifacts/` corresponden al panel integrado previo. Se informa esta diferencia para no presentar capturas de prueba como revisión visual autenticada de la demo actual.

## Publicación

Dictamen de esta candidata: **NO-GO para producción y NO-GO para habilitar Capital** hasta completar la integración oficial de Seguridad, pruebas de acceso positivo/negativo, revisión de carga y conciliación de historias relevantes. La demo ficticia separada puede mostrar la interfaz de Capital sin retirar el `503` del endpoint operativo. Cualquier futura integración con Seguridad, push, merge a `main` o despliegue requiere autorización independiente.
