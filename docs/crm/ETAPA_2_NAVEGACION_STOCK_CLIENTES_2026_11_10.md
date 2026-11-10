# Etapa 2: navegación y operación comercial

Fecha: 2026-11-10. Base: `8fe26182a6897132086ceefb3098844b59e6d3e1`, después de la entrega de Ventas y Caja. Esta etapa continúa el plan por módulos, en un checkout aislado. No incluye una publicación ni una migración masiva de datos.

## Evidencia y alcance visual

La referencia se volvió a observar en el navegador, con tamaños de 1440 × 1000, 768 × 1000 y 390 × 844. El tenant de referencia sigue sin vehículos ni clientes: permite verificar controles, formularios, navegación y medidas, pero no certificar filas pobladas ni reglas internas de su servidor.

Medidas observadas: sidebar de 256 px y cabecera de 56 px; enlaces de 36 px, Inter 14/500 y línea de 20 px. Stock y Clientes usan título de 20/600, línea de 28 px. Las acciones tienen altura de 32 px y texto de 12/500; el panel de filtros tiene padding de 16 px, radio de 12 px, fondo `#1e1e24` y borde `#33333a`.

A 768 px se mantiene la sidebar. En móvil se usa el menú desplegable y los accesos Dashboard, Stock, Clientes, Finanzas y Mi Espacio. Se conservan la marca AutoSporting y los accesos de sus módulos propios; no se copia la suscripción ni los canales del proveedor de referencia.

## Contratos de esta etapa

### Navegación

La compactación y los accesos rápidos conservan las rutas de la agencia. La visibilidad de un enlace no sustituye los permisos de la API. El botón de tema reutiliza el proveedor existente. Los cambios de sesión deben limpiar los resultados, resúmenes y solicitudes anteriores del encabezado.

El menú móvil contiene el foco, cierra con Escape y restaura el foco y el desplazamiento. Se elimina el contenedor de desplazamiento vertical implícito que impedía mantener visibles el menú y el encabezado al recorrer una página larga. Las cabeceras compactas preservan la envoltura en pantallas estrechas y el buscador móvil se mantiene dentro del ancho visible.

### Stock

Los filtros y la ordenación deben aplicarse antes de paginar. La normalización de marca y modelo agrupa grafías equivalentes para buscar, sin reescribir los valores de origen ni fusionar vehículos.

Los rangos de precio comparan el importe nominal en la moneda elegida; requieren ARS o USD y no convierten monedas. El orden manual del catálogo se conserva. Capital, inversores, compartidos, consignaciones y mandatos mantienen sus circuitos actuales.

Exportar todo conserva la descarga completa. Exportar vista aplica los filtros y la ordenación del inventario sin limitarse a la página visible. Los llamados existentes de otros módulos con `limit=1000` siguen siendo válidos. La clasificación monetaria reconoce variantes de espacios y mayúsculas; la heurística anterior de estadísticas para importes USD superiores a 200.000 se conserva expresamente y no se presenta como una conversión monetaria nueva.

Los controles de referencia sin una fuente equivalente confirmada —transmisión, consultas registradas, demanda y la cola compuesta Para resolver hoy— no se presentan como funciones completadas. Las vistas usan campos y acciones existentes de AutoSporting; su equivalencia funcional no certifica el diseño de una fila poblada de referencia.

### Clientes

El pipeline, la asignación, la búsqueda comercial y el próximo paso deben persistirse realmente. Las etapas se presentan mediante equivalencias de siete estados; los alias anteriores siguen siendo legibles y no se ejecuta una migración masiva.

El alta requiere un nombre no vacío; teléfono y email son opcionales, como en el formulario de referencia. No se inventa un contacto para poder guardar una primera atención.

Las prioridades de AutoSporting se definen explícitamente: Primera atención corresponde a Sin contactar; Para atender hoy incorpora primera atención y próximos pasos vencidos o de hoy de fichas activas; Sin próxima fecha reúne fichas activas abiertas sin fecha. Cerrado y Perdido quedan fuera de las prioridades pendientes. No se afirma que estas equivalencias describan reglas ocultas de la referencia.

Un próximo paso de Cliente es una fuente identificada del calendario; no se replica como una tarea ni como un Lead. Las métricas del conjunto filtrado y la paginación deben distinguirse de las tarjetas visibles de una página.

La ficha expone Seguimiento comercial también para los lectores sin permiso de edición. Muestra etapa, responsable, próximo paso, interés y presupuesto con su moneda; un presupuesto explícito de cero se distingue de uno no registrado.

El alta y la edición dejan de mostrar controles sin implementación de escaneo y adjuntos. Guardar la ficha conserva datos y notas; no promete cargar archivos ni realizar OCR. La sugerencia de posibles coincidencias de teléfono o email no es una garantía de unicidad por documento ni una fusión automática.

### Modo sin conexión

La búsqueda de una instantánea offline se limita a la identidad de la sesión actual. Si no existe una instantánea propia, no se toma la de otra persona guardada en el dispositivo. El inventario puede filtrar su instantánea autorizada; los importes patrimoniales que requieren fuentes del servidor se indican como no disponibles sin conexión, evitando presentar ceros o cifras de un filtro anterior.

## Conservación y límites

Se mantiene la primera entrega de Ventas y Caja, incluido el aislamiento de borradores e históricas nuevas, las cobranzas legacy, las monedas separadas y los permisos de Tesorería Estratégica/PIN. Esta etapa no reemplaza fórmulas de capital, no crea movimientos financieros y no envía mensajes.

La asignación a un vendedor no crea por sí sola una nueva política de acceso por propietario. La autorización vigente de Clientes es por permiso del recurso; cualquier aislamiento adicional por cartera requiere un contrato propio y pruebas de API. La ayuda debe describir este alcance sin prometer una restricción que la API no aplica.

## Validación

Las suites integradas reúnen 74 pruebas puras y 35 de API con MongoDB real descartable: 109 casos, de los cuales 45 se incorporan en esta etapa. La etapa agrega 5 de navegación, 11 de filtros de Stock, 5 de prioridades de Clientes, 8 de aislamiento de instantáneas, 8 de API de Stock y 8 de API de Clientes. Los 64 casos de la primera entrega siguen en los mismos comandos.

Los tests verifican el conjunto completo antes de paginar, compatibilidad de `limit=1000`, exportación global y filtrada, consistencia online/offline, calendarios, permisos, persistencia y edición de alias anteriores. Los fixtures de vista previa se amplían con 28 vehículos y 27 clientes ficticios adicionales y perfiles de propietario, ventas y solo lectura.

`npm run check` pasó con cero errores y los 18 avisos heredados de directivas ESLint sin uso. La certificación de la ayuda y las pruebas existentes de cálculo comercial y ganancias también pasaron. El build final con webpack terminó correctamente y generó 79 páginas.

La verificación en el navegador confirmó filtros combinados de Stock, las tres vistas y la segunda página; cambio de etapa persistente después de recargar; alta sin teléfono ni email; recuperación de la fecha del próximo paso y su aparición en Calendario como un único evento nuevo; lector sin alta ni cambio de etapa y con acceso al seguimiento de la ficha; limpieza de búsqueda al cambiar de usuario; tema claro/oscuro; menú móvil con Escape y restauración del foco.

Se verificaron anchos de 1440, 768 y 390 px. En escritorio, con desplazamiento de 206 px, encabezado y sidebar permanecieron en `y=0`. En móvil, el documento tuvo ancho visible y de contenido de 380 px dentro de un viewport de 390 px; el buscador quedó entre `x=16` y `x=364`, sin recorte horizontal. Las capturas usan únicamente la vista local con datos ficticios.

El checkout y los parches quedan disponibles para revisión. No se publicaron cambios ni se alteraron registros de producción; la publicación sigue pendiente de la autenticación de GitHub y de su validación en el entorno final.
