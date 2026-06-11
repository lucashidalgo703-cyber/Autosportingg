# Fase 0.2 - Secretos y login

Fecha: 11 de junio de 2026

Estado: **codigo completado, despliegue pendiente de configurar JWT_SECRET**

## 1. Objetivo

Eliminar credenciales de respaldo inseguras, retirar el login maestro legacy y proteger el acceso normal por email y contraseña.

## 2. Cambios aplicados

### Backend

Archivo:

- `server.js`

Cambios:

- eliminado el valor fallback literal de `JWT_SECRET`;
- eliminado `ADMIN_PASSWORD`;
- eliminado `getOrCreateMasterAdminUser`;
- eliminado el login por contraseña maestra sin email;
- email y contraseña son obligatorios;
- login permitido solo para usuarios activos de `AdminUser`;
- respuestas de credenciales invalidas no revelan si el usuario existe;
- si `JWT_SECRET` falta, login y endpoints autenticados responden `503`;
- agregado limite temporal de intentos:
  - 5 intentos por combinacion IP/email;
  - 20 intentos por IP;
  - ventana de 15 minutos;
  - respuesta `429` y header `Retry-After`.

El rate limit en memoria es una primera defensa. En un despliegue serverless puede variar entre instancias, por lo que luego debe reforzarse con Vercel Firewall, Redis/Upstash u otro almacenamiento compartido.

### Frontend

Archivo:

- `src/views/Login.jsx`

Cambios:

- email obligatorio;
- eliminado el texto de contraseña maestra;
- eliminado el placeholder de Master Admin;
- agregados `autocomplete` de usuario y contraseña;
- mensajes orientados al login individual.

### Configuracion

Archivo:

- `.env.example`

Incluye solo nombres de variables, sin secretos:

- `MONGODB_URI`
- `JWT_SECRET`
- `PORT`
- variables de Cloudinary;
- `NEXT_PUBLIC_API_URL`.

`ADMIN_PASSWORD` ya no forma parte de la configuracion.

## 3. Validaciones

### Sintaxis

- `node --check server.js`: OK.
- `git diff --check`: OK.

`node --check` no admite archivos `.jsx`; la validacion de `Login.jsx` se realizo mediante el build de Next.js.

### Build

Comando:

```powershell
cmd.exe /d /c "npm.cmd run build"
```

Resultado:

- compilacion exitosa;
- TypeScript exitoso;
- 55/55 paginas generadas;
- codigo de salida 0.

### JWT no configurado

Prueba local sin `JWT_SECRET`:

- `POST /api/login`
- respuesta: `503`
- no se consulto la base de datos;
- no se uso ninguna clave fallback.

### Limite de intentos

Prueba local con clave temporal y payload vacio:

```text
400, 400, 400, 400, 400, 429
```

No se usaron credenciales ni datos reales.

## 4. Paso obligatorio antes del push

**No desplegar este cambio hasta confirmar `JWT_SECRET` en Vercel.**

En Vercel:

1. Abrir el proyecto AutoSporting.
2. Ir a `Settings`.
3. Abrir `Environment Variables`.
4. Crear `JWT_SECRET`.
5. Aplicarlo a `Production`, `Preview` y `Development` segun corresponda.
6. Usar un valor aleatorio largo, no una contraseña humana.
7. Confirmar que `MONGODB_URI` sigue configurada.
8. Despues del despliegue, iniciar sesion nuevamente con email y contraseña.
9. Eliminar `ADMIN_PASSWORD` de Vercel cuando el nuevo login este validado.

Cambiar `JWT_SECRET` invalida los tokens existentes. Esto es esperado y obliga a iniciar sesion nuevamente.

### Generar un secreto en PowerShell

Ejecutar localmente:

```powershell
$bytes = New-Object byte[] 64
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Copiar el resultado directamente al campo `JWT_SECRET` de Vercel. No guardarlo en el repositorio, documentos, capturas ni mensajes.

## 5. Validacion posterior al despliegue

1. Abrir `/login`.
2. Confirmar que email es obligatorio.
3. Iniciar sesion con un usuario real.
4. Confirmar acceso a `/admin`.
5. Cerrar sesion.
6. Probar una contraseña incorrecta.
7. Confirmar que el mensaje no revela si el email existe.
8. Comprobar que `/api/admin/cars` sin token devuelve `401`.
9. Confirmar que los endpoints publicos siguen funcionando.

## 6. Archivos modificados

- `server.js`
- `src/views/Login.jsx`
- `.env.example`
- `docs/crm/FASE_0_2_SECRETOS_LOGIN.md`

No se modificaron:

- modelos;
- datos;
- ventas;
- reservas;
- finanzas;
- endpoints de negocio;
- permisos;
- Cloudinary.

## 7. Riesgo residual

- El rate limit en memoria no es global entre instancias serverless.
- El JWT sigue almacenado en `localStorage`.
- CORS sigue abierto.
- Faltan permisos backend uniformes.
- El comentario `Master Admin` restante en configuracion no participa del login, pero debe limpiarse cuando se normalice `updatedBy`.

Estos puntos se trataran en fases posteriores.

## 8. Proxima fase

Fase 0.3 - Permisos:

- definir permisos faltantes;
- corregir el contrato de `PermissionGuard`;
- denegar por defecto tokens legacy incompletos;
- crear middleware backend por permiso;
- aplicarlo primero a operaciones sensibles.

## 9. Confirmaciones

- No se expusieron valores secretos.
- No se guardaron credenciales.
- No se modificaron datos.
- No se instalaron dependencias.
- No se hizo `git add`, commit ni push.
