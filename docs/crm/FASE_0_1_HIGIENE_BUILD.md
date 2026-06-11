# Fase 0.1 - Higiene del build

Fecha: 11 de junio de 2026

Estado: **completada**

## 1. Objetivo

Recuperar una compilacion de produccion limpia sin modificar funcionalidades reales, datos, modelos ni endpoints administrativos.

## 2. Problema encontrado

El archivo no rastreado:

- `src/app/api/test-sales/route.js`

impedia compilar por imports inexistentes y, si se corregian sin proteccion, podia devolver todas las ventas desde un endpoint publico de prueba.

Imports rotos:

- `../../../../config/db`
- `../../../../models/Sale`

El archivo tambien conectaba directamente a MongoDB y devolvia la coleccion completa `sales`.

## 3. Cambio aplicado

Se reemplazo el contenido de la ruta por un stub inerte:

- no importa Mongoose;
- no importa modelos;
- no conecta a la base de datos;
- no lee ventas;
- no devuelve datos;
- responde siempre `404`.

Archivo modificado:

- `src/app/api/test-sales/route.js`

No se borro el archivo porque era un cambio no rastreado preexistente y se priorizo una correccion conservadora.

El script:

- `test-sales.js`

no fue modificado. No forma parte del build de Next.js, pero sigue pendiente decidir si debe conservarse.

## 4. Validaciones

### Sintaxis

- `node --check server.js`: OK.
- `node --check src/app/api/test-sales/route.js`: OK.
- `git diff --check`: OK.

### Build

Comando:

```powershell
cmd.exe /d /c "npm.cmd run build"
```

Resultado:

- Next.js 16.2.2.
- Compilacion: exitosa.
- TypeScript: exitoso.
- Paginas generadas: 55/55.
- Codigo de salida: 0.

El sitemap informo que el backend local no estaba disponible y genero su fallback estatico. Este comportamiento ya existia y no impidio el build.

## 5. Archivos afectados

Modificado:

- `src/app/api/test-sales/route.js`

Documentacion:

- `docs/crm/FASE_0_1_HIGIENE_BUILD.md`
- actualizacion de `docs/crm/FASE_0_BASELINE_SEGURIDAD.md`

No modificados:

- `server.js`
- modelos;
- hooks;
- paginas CRM;
- autenticacion;
- finanzas;
- ventas;
- datos reales.

## 6. Riesgo residual

La ruta `/api/test-sales` sigue formando parte del arbol de rutas, pero responde `404` y no tiene acceso a datos.

Antes de un commit definitivo se debe decidir:

1. eliminarla por completo;
2. mover cualquier utilidad legitima a una carpeta de scripts fuera de `src/app`;
3. mantener el stub temporalmente.

Recomendacion: eliminar la ruta antes del despliegue una vez confirmado que no se necesita.

## 7. Proxima fase

Fase 0.2 - Secretos y login:

- eliminar fallbacks literales de `JWT_SECRET` y `ADMIN_PASSWORD`;
- verificar variables en desarrollo y produccion;
- rotar secretos;
- retirar el login legacy con contraseña maestra;
- agregar proteccion contra intentos repetidos;
- mantener un procedimiento seguro de recuperacion de owner.

Esta fase afecta autenticacion y requiere una estrategia de despliegue para no bloquear el acceso al CRM.

## 8. Confirmaciones

- No se tocaron datos reales.
- No se consulto la base de datos desde la ruta de prueba.
- No se modifico `server.js`.
- No se modificaron endpoints reales.
- No se instalaron dependencias.
- No se hizo `git add`, commit ni push.
