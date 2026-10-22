# AutoSporting Academy

Rama: `feature/academy-financiera`. Módulo educativo bajo `/admin/academy`.

## 13.1 · Interfaz principal

Panel, catálogo inicial de ocho cursos y navegación a laboratorio, evaluaciones, progreso, entrenador y tutor. Hereda el layout administrativo y reutiliza CrmCard y tokens del CRM. Único cambio compartido: una entrada en `CrmSidebar.jsx`; no se cambia la función de permisos. Academy queda disponible para las sesiones que ya acceden al área administrativa.

Los destinos de las siguientes subetapas muestran explícitamente que están en preparación. El avance inicial es cero, sin resultados inventados.

Validación: `node --test tests/academy.test.js`. Verificación visual y compilación completa previstas en 13.8.

## Límites

Sin endpoints, MongoDB, migraciones, datos operativos, proveedores de IA ni cambios en autenticación, seguridad, auditoría o cálculos existentes. Sin push, merge o deploy.

## 13.2 · Cursos

Ocho cursos, 24 lecciones progresivas, 24 ejemplos ficticios y 24 ejercicios numéricos con explicación. Glosario por curso y navegación secuencial. El contenido distingue contribución, utilidad bruta, caja, margen/recargo y retorno sobre capital. Tasas educativas, sin cotizaciones reales. Validación: pruebas de integridad del currículo y corrección de entradas numéricas en `tests/academy.test.js`.

Referencias de contraste conceptual (contenido propio, no transcripción):
- BCRA: https://www.bcra.gob.ar/prestamos-personales-comparar-costos-y-condiciones/ (TNA, TEA y CFT).
- CFPB: https://www.consumerfinance.gov/ask-cfpb/how-does-compound-interest-work-en-1683/ (capitalización).
- Lean Enterprise Institute: https://www.lean.org/lexicon-terms/inventory-turns/ (rotación al costo).
