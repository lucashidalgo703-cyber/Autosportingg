# AutoSporting Academy

Rama: `feature/academy-financiera`. Módulo educativo bajo `/admin/academy`.

## 13.1 · Interfaz principal

Panel, catálogo inicial de ocho cursos y navegación a laboratorio, evaluaciones, progreso, entrenador y tutor. Hereda el layout administrativo y reutiliza CrmCard y tokens del CRM. Único cambio compartido: una entrada en `CrmSidebar.jsx`; no se cambia la función de permisos. Academy queda disponible para las sesiones que ya acceden al área administrativa.

Los destinos de las siguientes subetapas muestran explícitamente que están en preparación. El avance inicial es cero, sin resultados inventados.

Validación: `node --test tests/academy.test.js`. Verificación visual y compilación completa previstas en 13.8.

## Límites

Sin endpoints, MongoDB, migraciones, datos operativos, proveedores de IA ni cambios en autenticación, seguridad, auditoría o cálculos existentes. Sin push, merge o deploy.
