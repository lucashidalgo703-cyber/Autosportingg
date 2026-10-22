# AutoSporting Academy

Rama: `feature/academy-financiera`. Módulo educativo bajo `/admin/academy`.

## 13.1 · Interfaz principal

Panel, catálogo inicial de ocho cursos y navegación a laboratorio, evaluaciones, progreso, entrenador y tutor. Hereda el layout administrativo y reutiliza CrmCard y tokens del CRM. Único cambio compartido: una entrada en `CrmSidebar.jsx`; no se cambia la función de permisos. Academy queda disponible para las sesiones que ya acceden al área administrativa.

Los destinos de las siguientes subetapas muestran explícitamente que están en preparación. El avance inicial es cero, sin resultados inventados.

Validación: `node --test tests/academy.test.js`. Verificación visual y compilación completa previstas en 13.8.

## Límites

Sin endpoints, MongoDB, migraciones, datos operativos, proveedores de IA ni cambios en autenticación, seguridad, auditoría o cálculos existentes. Sin push, merge o deploy.

## 13.6 · Entrenador

Seis escenarios, dos alternativas cada uno: compra/liquidez, descuento/espera, financiación, permuta, diversificación y stock lento. Selección y comparación con resultados hipotéticos, fórmulas, ventajas, riesgos y costo de oportunidad. Se registra práctica local, sin puntuar decisiones como universalmente correctas. Pruebas de cada alternativa y comprobaciones de caja intermedia, valor presente y consistencia de asignación.

## 13.5 · Seguimiento local

Repositorio local versionado y sustituible, separado por identificador del usuario autenticado existente. No almacena token, nombre, contenido operativo ni respuestas privadas. Sin identificador estable funciona temporalmente en memoria. Guarda lecciones completadas después de resolver el ejercicio, hasta 100 intentos y 50 decisiones; métricas calculadas desde la actividad, sin precarga ficticia. Dashboard y enlaces permiten continuar el recorrido; cursos aceptan enlaces directos por curso/lección.

Se informa cuando el almacenamiento falla. Incluye estado vacío, historial y restablecimiento con confirmación dentro de Academy. Sin sincronización entre dispositivos ni consolidación multi-pestaña; no es evidencia certificada de aprendizaje. Persistencia de servidor, políticas nuevas y certificaciones quedan pendientes de autorización posterior.

## 13.4 · Evaluaciones

40 preguntas: conceptos de opción múltiple, ejercicios numéricos y casos prácticos. Filtros por curso y nivel, puntaje por igual ponderación, explicaciones, repaso y reintentos. Resultados formativos, sin certificación ni cambios de acceso. Corrección pura testeada con respuestas completas, erróneas, parciales e incompletas. No hay respuestas ni usuarios en servidor.

## 13.3 · Laboratorio

16 simuladores con valores ficticios editables, fórmulas, unidades y supuestos visibles; resultados inmediatos y cronograma francés. Motor puro en `src/lib/academy/simulators.js`, sin dependencias operativas. Validaciones de rangos, tasas/plazos, denominadores, sobreasignación y desbordamiento. Cálculos sin redondeo intermedio; presentación con dos decimales. Los modelos excluyen cargos e impuestos salvo costos explícitos; TEA no es CFT. Payback simple con flujos uniformes y reserva sin rendimiento.

Pruebas: `node --test tests/academy*.test.js`; incluye valores conocidos, pérdidas, tasa cero y casi cero, recurrencia y conservación de principal, entradas inválidas y límites.

## 13.2 · Cursos

Ocho cursos, 24 lecciones progresivas, 24 ejemplos ficticios y 24 ejercicios numéricos con explicación. Glosario por curso y navegación secuencial. El contenido distingue contribución, utilidad bruta, caja, margen/recargo y retorno sobre capital. Tasas educativas, sin cotizaciones reales. Validación: pruebas de integridad del currículo y corrección de entradas numéricas en `tests/academy.test.js`.

Referencias de contraste conceptual (contenido propio, no transcripción):
- BCRA: https://www.bcra.gob.ar/prestamos-personales-comparar-costos-y-condiciones/ (TNA, TEA y CFT).
- CFPB: https://www.consumerfinance.gov/ask-cfpb/how-does-compound-interest-work-en-1683/ (capitalización).
- Lean Enterprise Institute: https://www.lean.org/lexicon-terms/inventory-turns/ (rotación al costo).
