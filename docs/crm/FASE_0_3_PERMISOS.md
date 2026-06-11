# Fase 0.3 - Permisos consistentes

## Objetivo

Unificar la evaluacion de permisos entre frontend y backend sin modificar datos,
roles existentes ni logica comercial.

## Cambios

- Se declararon los permisos faltantes `ventas.cancel`, `caja.read` y
  `caja.write`.
- Se elimino el bypass frontend que concedia acceso a tokens sin rol ni
  permisos.
- `PermissionGuard` ahora acepta `permission` o `requiredPermission`, roles
  permitidos y un fallback personalizado.
- Se incorporaron middlewares reutilizables para exigir uno o varios permisos
  en endpoints sensibles.
- Se protegieron usuarios, auditoria, anulacion de ventas, finanzas,
  configuracion, salud del sistema, calidad de datos y exportaciones.

## Compatibilidad

- Los roles `owner` y `admin` mantienen acceso a los endpoints protegidos.
- Los demas roles conservan sus permisos por defecto o sus permisos explicitos.
- No se migraron ni modificaron usuarios almacenados.
