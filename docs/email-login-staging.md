# Verificación obligatoria por correo: prueba previa a producción

Esta implementación exige un código nuevo en cada inicio de sesión para todas las cuentas, incluso administradores y navegadores conocidos. La navegación y las recargas conservan una sesión verificada activa. El código dura cinco minutos, admite cinco errores y se consume una sola vez. Los reenvíos esperan sesenta segundos; los envíos iniciales y reenvíos comparten un máximo de cinco intentos de envío por cuenta cada quince minutos.

## Entorno aislado

No reutilizar cuentas de empleados, credenciales ni una base de producción. Crear un proyecto de staging o un despliegue Preview en Vercel conectado a esta rama. Antes de iniciar sesión, verificar que `MONGODB_URI` apunte a una base de prueba separada y que su usuario de MongoDB solo tenga permisos sobre esa base. Tener otra base dentro de la misma instancia no aísla las credenciales si el usuario conserva permisos globales.

En **Vercel → proyecto → Settings → Environment Variables**, seleccionar exclusivamente **Preview** (o el entorno de staging configurado) y cargar:

| Variable de servidor | Valor |
| --- | --- |
| `SECURITY_ALERT_EMAIL` | Tu dirección de administrador, una sola casilla; sin listas ni destinatarios adicionales. |
| `MONGODB_URI` | URI exclusiva de la base de pruebas. |
| `JWT_SECRET` | Secreto aleatorio exclusivo del entorno; no compartir con producción. |
| `SMTP_FROM` | Remitente permitido por el proveedor de correo existente. |
| `SMTP_USER` | Usuario/casilla del proveedor existente. |

Conservar el método de correo ya utilizado por el CRM. Para SMTP clásico, cargar también `SMTP_HOST`, `SMTP_PORT` (normalmente `587`, o `465` para TLS directo) y `SMTP_PASS`. Para Gmail OAuth2, cargar `SMTP_OAUTH_CLIENT_ID`, `SMTP_OAUTH_CLIENT_SECRET` y `SMTP_OAUTH_REFRESH_TOKEN`; no es necesario cambiar de proveedor. Si existen ambas configuraciones, el adaptador existente prioriza Gmail OAuth2.

Las variables son de servidor: no usar el prefijo `NEXT_PUBLIC_` ni incorporarlas en código o archivos versionados. Después de guardarlas, volver a desplegar Preview para que el servidor use los valores nuevos. Mantener `TWO_FACTOR_ENCRYPTION_KEY` si las cuentas de prueba tienen el segundo factor TOTP opcional ya habilitado. Ese factor adicional no sustituye el código enviado por correo.

`EMAIL_LOGIN_HMAC_SECRET` es opcional: permite usar un secreto aleatorio dedicado para proteger los códigos almacenados. Si se omite, se utiliza `JWT_SECRET`. Mantenerlo estable dentro del entorno; cambiar cualquiera de estos secretos invalida solicitudes y sesiones asociadas.

Crear dos vendedores ficticios y un administrador ficticio únicamente en la base de pruebas mediante el mecanismo de usuarios del CRM o un script de preparación local. No copiar una base real ni ejecutar un sembrado contra producción.

Con `MONGODB_URI` ya configurada para esa base separada, ejecutar `npm run auth:indexes` desde una terminal del entorno de pruebas. Crea los índices de autenticación y la limpieza TTL; no borra ni sincroniza índices de otros módulos. El vencimiento de códigos y sesiones también se controla en cada consulta del servidor y no depende de cuándo MongoDB ejecute su limpieza.

## Pruebas automáticas locales

Desde la raíz del repositorio, con las dependencias de desarrollo instaladas:

```powershell
npm run test:auth
```

La suite usa MongoDB temporal con `mongodb-memory-server` y un servidor SMTP en `127.0.0.1`. Sobrescribe las variables del proceso con valores ficticios y no escribe archivos `.env`. Los mensajes y códigos quedan solo en memoria y no se imprimen. Si el binario de MongoDB no está en caché, el paquete puede necesitar descargarlo. Los casos de vencimiento y reenvío se aceleran cambiando fechas únicamente en esa base temporal.

Para probar también las pantallas, usar una copia limpia sin archivos `.env` y ejecutar:

```powershell
npm run dev:auth-preview
```

Abrir `http://127.0.0.1:3100/login` y el buzón de prueba `http://127.0.0.1:3100/__test-mail`. Cuentas disponibles: `vendedor.uno@example.test`, `vendedor.dos@example.test` y `admin@example.test`; todas usan la contraseña ficticia `Ficticia-Local-2026!`. Esta vista previa tiene una base temporal y reemplaza el transporte por un buzón en memoria: no envía mensajes reales. Los códigos se consultan solo en ese buzón local. Detener con Ctrl+C elimina la base y los mensajes.

Para repetir las cinco pruebas automatizadas en navegador, reiniciar primero la vista previa (para renovar la cuota de correo ficticia) y ejecutar en otra terminal `npm run test:auth:browser`. Usa Chrome local en Windows cuando está instalado; también permite indicar su ejecutable con `CHROME_PATH`. Si no hay navegador disponible, instalar el navegador de pruebas con `npx playwright install chromium`. La suite verifica la pantalla pendiente, accesos directos y API de Express/Next, dos vendedores simultáneos, recarga, cierre de sesión y nuevo ingreso en el mismo navegador. No imprime códigos.

## Confirmación con tu casilla

1. Abrir la URL de Preview. Ingresar credenciales incorrectas: debe aparecer el error y no llegar correo.
2. Ingresar con el administrador ficticio. Debe aparecer “Ingresá el código de 6 dígitos enviado al administrador”, sin poder acceder al CRM. Confirmar en tu casilla un único correo con asunto `AutoSporting | Solicitud de ingreso de [nombre]`, código grande, cuenta, fecha y hora argentina, navegador, sistema operativo y aviso de ingreso pendiente.
3. Antes de validar, abrir directamente `/admin` y consultar una API protegida como `/api/admin/auth/me` o `/api/admin/cars`: debe impedir acceso. La solicitud pendiente tampoco debe poder utilizarse como token de sesión.
4. En dos perfiles/ventanas independientes, iniciar sesión al mismo tiempo con los dos vendedores ficticios. Ingresar el código del vendedor A en la solicitud B: debe rechazarse. Usar luego cada código en su solicitud correcta: ambas deben poder completar su ingreso.
5. Actualizar y navegar con una sesión activa: debe conservarse. Cerrar sesión y volver a entrar desde la misma computadora/navegador: debe llegar otro código y solicitarse de nuevo.
6. En una solicitud nueva, fallar cinco veces: el código debe quedar bloqueado. En otra, esperar más de cinco minutos: debe rechazarse como vencido. Reutilizar un código ya consumido: debe rechazarse.
7. Intentar reenviar antes de sesenta segundos: debe estar bloqueado. Después reenviar: debe llegar un correo nuevo y el código anterior debe quedar inválido. Verificar que abrir solicitudes nuevas no permita superar el límite de envíos por cuenta.
8. Solo en Preview, simular una falla del proveedor con una configuración SMTP de prueba inválida y volver a desplegar. Las credenciales válidas deben dejar el acceso pendiente y ofrecer reintentar el envío. Restaurar la configuración de prueba y verificar el reintento. No alterar el proveedor de producción.

Los códigos nunca deben aparecer en respuestas JSON, registros de aplicación ni auditorías. No registrar cuerpos del endpoint de verificación en herramientas de observabilidad. Confirmar la recepción real, incluida la carpeta de spam, antes de habilitar el cambio en producción. La ejecución local con SMTP simulado comprueba el flujo y los límites; no acredita entrega a una casilla real ni un despliegue de staging.

## Activación posterior

Cuando todas las pruebas anteriores estén conformes, cargar `SECURITY_ALERT_EMAIL` y la configuración de servidor correspondiente en **Production**, volver a desplegar y realizar un ingreso controlado. Los tokens de sesión anteriores al cambio no cumplen la nueva verificación y se rechazan: todos deberán iniciar sesión con un código. Esta guía no autoriza ni realiza esa activación.
