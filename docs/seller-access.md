# Acceso del vendedor

Las cuentas con rol **Ventas** ingresan directamente a **Mis Ventas**. No pueden abrir Dashboard, Analítica, Ventas generales ni las fichas del inventario. Dentro de **Stock** se monta solamente **Negociación**, sin cargar inventario, mandatos, contadores globales, importadores ni acciones sobre unidades. El menú y la barra del celular reflejan esa navegación. Clientes, Calendario y las demás áreas conservan sus permisos anteriores.

**Mis Ventas** consulta en el servidor sólo ventas y reservas cuyo `assignedTo` coincide con el identificador del usuario autenticado. La consulta, edición, conversión, exportación y archivos de una operación ajena no se autorizan mediante su ID ni cambiando filtros. La ficha propia se abre bajo `/admin/mis-ventas/[id]`, reutilizando el expediente existente, y vuelve a Mis Ventas. Las nuevas operaciones del vendedor quedan asignadas a su cuenta; no puede reasignarlas a otra.

Los registros históricos sin un identificador de vendedor asignado requieren que administración revise y asigne su responsable. No se asocian cuentas por coincidencias de nombre ni se modifica esa información automáticamente. No hay migraciones de registros reales en este cambio.

Las restricciones del rol tienen prioridad sobre permisos personalizados antiguos de Dashboard o inventario. El código se aplica también al validar una sesión ya emitida. Los administradores y propietarios conservan sus accesos. La consulta de Negociación no habilita la configuración de mínimos ni otorga acceso financiero general.

**Mi Espacio** carga sólo los módulos habilitados para el usuario. Un vendedor no consulta el inventario ni consulta cuotas o movimientos de agencia sin permiso financiero. Las respuestas 403 indican falta de permiso y conservan la sesión; una respuesta 401 sigue cerrando una sesión inválida. Las ventas del vendedor y los autos personales continúan disponibles, con estos últimos separados del Stock comercial. Las anotaciones personales nuevas se asignan al identificador de su creador y se consultan con `scope=my-space`; no se adjudican por nombres coincidentes. Las anotaciones privadas antiguas sin asignación requieren revisión de administración. La Agenda compartida conserva sus tareas laborales y oculta las privadas de otros usuarios sin privilegios administrativos.

El servidor bloquea las API globales de Dashboard, inventario y sus exportaciones para Ventas. También impide descargar el paquete offline general con stock y ventas; la interfaz del vendedor oculta ese acceso. Las respuestas autenticadas usan `private, no-store` y el service worker excluye las API internas y elimina su caché de versión anterior. Las API comerciales conservan sus rutas existentes y devuelven únicamente operaciones propias, con los datos del vehículo necesarios para la venta. La búsqueda de unidades al crear o editar una venta utiliza un selector limitado, sin las fichas de inventario ni operaciones ajenas. El detalle público del catálogo utiliza una lista explícita de campos públicos para conservar las fotos y especificaciones sin exponer datos internos.

No requiere variables nuevas en Vercel ni editar usuarios de producción para aplicar el límite del rol. La verificación por correo del vendedor sigue usando la dirección de su ficha.

## Verificación aislada

```sh
npm run check
npm run test:seller:access
npm run test:seller:access:browser
```

Los runners levantan MongoDB temporal y correo en memoria con dos vendedores ficticios que tienen el mismo nombre y distintos identificadores. Una cuenta tiene permisos personalizados amplios para verificar que no puedan reabrir inventario o Dashboard. Se comprueban consultas propias, intentos por URL/API, códigos de ingreso, negociación, navegación móvil y conservación de acceso de administración, sin usar cuentas de empleados ni datos de producción.
