# Etapa 3: ficha, alta y edición de vehículos

Fecha: 2026-11-10. Base publicada: `71e540fadba4f62c7d66497bc78094a41fa49e08`. Continúa las entregas de Ventas/Caja y Navegación/Stock/Clientes en el stack existente: Next.js, React, Tailwind, Express y MongoDB. No incorpora otra base, autenticación ni proveedor de archivos.

## Referencia y decisiones

Se volvió a observar el alta de vehículos en la sesión de referencia. Identidad, precio/estado y propietario se presentan primero; Ficha técnica, Documentación y Publicación son secciones progresivas. Los controles medidos tienen aproximadamente 36 px de alto, texto de 14 px y radio de 8 px. El panel utiliza superficie `#1e1e24`, borde `#33333a`, radio de 16 px y título de 16/20 px. A 390 px el formulario ocupa el ancho disponible y conserva acciones al pie.

La referencia permite conservar un borrador local antes de dar de alta. Su tenant sigue sin unidades: no se crearon registros ni se afirma haber certificado una ficha poblada o sus reglas internas. Las siete secciones de la ficha de AutoSporting organizan sus funciones propias, sin quitar capital, inversores, compromisos de compra, permutas o documentación.

## Funciones entregadas

- Alta y edición con identidad, precios, propietario, ficha técnica, documentación, publicación y fotos. Cabecera/pie persistentes, etiquetas, errores por campo, foco, Escape, protección de cambios sin guardar y tratamiento de tareas asíncronas por apertura y sesión.
- Transmisión, carrocería, puertas, motor/cilindrada y versión se guardan realmente. Son campos opcionales; no se reescriben las unidades anteriores. La descripción pública continúa separada de la versión.
- Borrador de alta explícito por usuario, con vencimiento de siete días. Recuperarlo no incorpora una unidad al stock. No conserva archivos, cuentas, importes pagados, autorizaciones estratégicas ni vínculos de operaciones. Recuperar una intención de permuta exige volver a seleccionar su origen. Un alta aceptada elimina únicamente el borrador de ese usuario.
- Ficha con enlaces General, Costos y capital, Fotos, Documentos, Publicación, Permutas e Historial. El inventario conserva en su URL filtros, página, vista y presentación; los enlaces de vuelta recuperan ese contexto. `editar=1` abre la edición autorizada. Los retornos se limitan a la ruta de Stock.
- Transmisión se puede filtrar antes de paginar, tanto en el servidor como en la instantánea offline y la exportación filtrada.
- Lectores conservan la consulta de fichas; altas, edición, fotos, documentos, publicación, orden y bajas respetan los permisos actuales. Las acciones que escriben requieren conexión. El circuito de reservas conserva su permiso separado.

## Correcciones de integridad

- Cambiar la visibilidad web guarda solo la visibilidad: deja de enviar un estado Disponible predeterminado que podía alterar una unidad vendida o reservada.
- La edición conserva propietario y campos técnicos, evita serializar objetos internos como texto y mantiene el estado financiero derivado en sus rutas específicas.
- Compra/toma, gastos y costos se presentan por moneda. El margen previo a comisiones solo se calcula cuando los datos son suficientes y están en la misma moneda. No se inventa un precio mínimo del 5 %, una comisión fija ni un tipo de cambio. Los resúmenes patrimoniales existentes mantienen su contrato anterior.
- Importes, años, porcentajes, documentación y datos técnicos se validan también en la API. Patente/VIN/chasis se comparan normalizados contra unidades activas; se permiten identificadores ausentes, placeholders y ediciones de duplicados legacy sin alterar la identidad. Reactivar una unidad vuelve a comprobar la identidad.
- Se protege el estado vinculado a ventas y reservas. Las escrituras de metadatos/estado verifican que otra operación no haya reclamado el estado mientras se editaba. Un cambio conjunto de estado y costo de adquisición se rechaza antes de sus efectos y pide guardarlos por separado.
- Los cambios de importe o moneda de adquisición requieren justificación. Las compras pagadas validan modalidad, importe parcial y cuenta activa de la misma moneda antes de crear stock o tocar cuentas. Las participaciones propias/de socios conservan su cálculo existente.
- PATCH guarda el orden de fotos existentes/nuevas, su eliminación y una portada coherente. Los documentos se procesan después de aceptar los datos principales; un error parcial se informa y permite reintentar. No se afirma atomicidad entre proveedor de archivos y base.
- La API pública usa una lista explícita de campos y excluye documentación, URLs documentales, propietarios, clientes, inversión y estado del pago de compra. El modelo de acceso del almacenamiento existente no se migra en esta etapa.
- Borradores e históricas de consulta no pueden originar una permuta nueva en el alta de una unidad.

## Validación y límites

Las suites `test:crm-parity` y `test:crm-parity:integration` reúnen 125 pruebas puras y 50 de API con MongoDB descartable: 175 casos. Incluyen la regresión de las entregas previas y las pruebas nuevas de formularios, borradores, navegación, importes, identidad, permisos, fotos y API. La vista previa se amplía con datos técnicos, gastos en dos monedas y casos ficticios de portada legacy y costo de toma distinto del campo de compra original.

La revisión visual confirmó el alta móvil y su borrador recuperable, persistencia de los campos técnicos, protección de cambios con Escape, foco dentro del diálogo y ausencia de desborde horizontal a 390 px. Se verificó el regreso desde una ficha a la página 2 del inventario conservando búsqueda y tarjetas; el lector conserva ficha y galería sin acciones de escritura. La edición de una permuta legacy se guardó sin exigir una corrección ficticia del costo y conservó el valor de toma y la portada. Las fechas de ingreso intactas no se reescriben al guardar otros datos.

La comprobación final de galería reordenó dos imágenes existentes, ajustó el encuadre de la nueva portada y guardó los cambios: después de recargar se conservaron el orden y ambos encuadres sin requerir credenciales de Cloudinary. La ficha de costos separó la compra en ARS del gasto en USD y mostró el margen como no calculable. La compilación de producción final generó las 79 páginas; la verificación estática terminó sin errores (18 advertencias preexistentes) y el lint de los últimos componentes de fotos pasó sin observaciones.

La detección de identidades duplicadas no sustituye un índice único ni garantiza exclusión de dos altas simultáneas: no se migran ni fusionan los datos legacy. Tampoco se convierte todo el circuito financiero de compra en una nueva transacción atómica entre documentos. Estas capacidades requieren una entrega propia.

Se conserva Cloudinary y los circuitos existentes de fotos/documentos; las pruebas locales de orden no ejecutan una subida real al proveedor. OCR y sincronización automática nueva con MercadoLibre no se presentan como implementadas. La revisión visual de la vista local utiliza exclusivamente datos ficticios.
