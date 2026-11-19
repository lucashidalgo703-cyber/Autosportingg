# Roles del personal y altas con autorización

Los perfiles se asignan en **Configuración → Usuarios → Nuevo usuario / Editar → Rol y accesos**. El selector muestra el alcance del perfil elegido. Sobre la tabla de usuarios, **Roles disponibles y sus accesos** permite revisar todos los perfiles antes de asignarlos.

| Perfil | Accesos principales | Altas y autorizaciones |
| --- | --- | --- |
| Propietario | CRM completo y configuración | Aprueba o rechaza las altas pendientes de vendedores |
| Administrador | Administración general; conserva sus permisos anteriores | No resuelve las nuevas altas reservadas al propietario |
| Vendedor · altas con autorización (`ventas`) | Gestoría, Clientes, Negociación, Mis ventas, Expedientes, Mis comisiones, Oportunidades, Calendario, Alertas, Reportes y Mi espacio; conserva sus otras secciones comerciales | Las altas de vehículos y clientes requieren aprobación del propietario. La edición de clientes existentes conserva sus permisos |
| Gestoría / Contabilidad (`gestoria_contabilidad`) | Las once secciones anteriores y Facturación / ARCA, con gestión de clientes, documentación y trámites | No tiene alta de vehículos ni aprobación de solicitudes. La gestión de clientes usa el circuito existente |
| Administrativo · perfil anterior | Conserva el perfil administrativo previo, incluidos Caja, Cuotas y Cobranzas | Perfil distinto de Gestoría / Contabilidad |
| Solo lectura | Consulta de los módulos previstos por el perfil previo | Sin edición por defecto |

Vendedor y Gestoría / Contabilidad utilizan **Mis ventas** para las operaciones asignadas a su cuenta, y **Mis comisiones** para las propias. Negociación permite consultar y simular ofertas; no configura reglas de ganancia mínima. Sus reportes y alertas respetan los módulos y datos autorizados. No reciben acceso a Dashboard, Ventas generales, fichas completas del inventario, Caja ni Finanzas generales por estos perfiles. Los límites de inventario, asignaciones, Finanzas, Caja, Liquidaciones y configuración de usuarios/sistema se mantienen incluso si una cuenta conserva permisos personalizados amplios de una versión anterior.

El vendedor solicita un vehículo desde **Stock → Solicitar alta de vehículo**. Puede adjuntar hasta 20 fotos JPG, PNG o WebP con el preparador de imágenes existente; el conjunto debe quedar por debajo de 3,8 MB para admitir la carga desde celular. La solicitud y sus datos se revisan en **Autorizaciones**. Antes de confirmar, el propietario ve el vehículo, patente, precio y costo con sus monedas, solicitante y fotografías. La aprobación crea el alta directamente, sin registrar movimientos de caja; la publicación web y el circuito de pagos conservan sus acciones existentes. Los rechazos requieren un motivo y el solicitante puede cancelar su alta mientras esté pendiente.

**Facturación / ARCA** queda reservada al propietario y al perfil Gestoría / Contabilidad. Los permisos `facturacion.read` y `facturacion.write` no abren Caja ni Finanzas generales. Los demás roles no acceden a esta sección, incluso si conservan permisos personalizados amplios.

En **Negociación**, el propietario, el vendedor y Gestoría / Contabilidad pueden **Completar dominio** cuando falta el identificador. El cambio se guarda en la misma unidad y queda auditado. Sólo se habilita en unidades disponibles sin venta o reserva activa. El dominio ya informado y los VIN se conservan; una corrección de esos datos sigue en el circuito de edición de Stock de administración. Los reintentos del mismo dominio conservan una única actualización.

Mi espacio conserva sus pendientes, autos personales y patrimonio separados del Stock. Un rechazo por permisos (403) no debe invalidar la sesión; solamente una autenticación inválida o vencida (401) activa el circuito de reingreso.

Los valores de rol anteriores siguen siendo válidos. Guardar un rol nuevo restablece los permisos propios de ese perfil; abrir el formulario no cambia la cuenta. Si la cuenta ya tenía permisos personalizados, el formulario los informa y los conserva al guardar sin cambiar de rol. **Restablecer permisos del rol** permite adoptar el perfil completo sin cambiar el nombre del rol; se aplica al guardar. No se crean ni reasignan cuentas por una migración automática.

Si el integrante ya está conectado, al recargar la página el CRM toma el rol y los permisos actuales de la respuesta validada del servidor. Conserva la sesión y su vencimiento original, aunque el token se haya emitido antes del cambio de perfil.

Prueba local del catálogo y los límites: `node tests/managedRolePermissions.test.js`. Las verificaciones de integración y navegador complementan esta prueba con solicitudes de alta, autorización del propietario y navegación por las secciones habilitadas.

## Altas del vendedor

El vendedor utiliza **Stock → Negociación → Solicitar alta de vehículo** y **Clientes → Solicitar alta de cliente**. El envío crea una solicitud en **Autorizaciones**; no crea todavía una unidad de inventario ni una ficha de cliente utilizable en una venta. Puede revisar sus propias solicitudes, el motivo de un rechazo y cancelar una solicitud pendiente.

El propietario abre **Autorizaciones → Pendientes**, revisa los datos propuestos y el solicitante, y aprueba o rechaza. Aprobar da de alta el registro una sola vez y lo mueve al histórico. Rechazar exige un comentario. Para una unidad nueva, la publicación en la web sigue siendo una acción de Stock posterior a la aprobación. Una compra propia con costo se registra con pago pendiente; el envío y la aprobación no debitan cuentas ni generan un pago de compra automático.

Las solicitudes reutilizan `ApprovalRequest` y los modelos `Car` / `Client`. La decisión y el alta se guardan en una transacción con auditoría; los reintentos reutilizan la misma solicitud y entidad. No requieren variables de entorno, una base nueva ni migraciones destructivas. Las vías alternativas de alta del vendedor (importación masiva, alta rápida desde una venta y sincronización offline de Stock/clientes) quedan sujetas a los límites del perfil.

Gestoría / Contabilidad puede revisar los expedientes documentales de todas las operaciones desde **Gestoría / Expedientes**, sin abrir las ventas generales. El vendedor sólo puede revisar los expedientes de sus propias operaciones. **Mis ventas**, **Mis comisiones**, las anotaciones privadas y los autos personales mantienen su alcance por identificador de usuario. Ambos perfiles reciben el código de inicio de sesión en el correo de su propia cuenta.

Validación aislada: `node tests/integration/managedRoles.integration.test.js` y `node tests/browser/managedRoles.browser.mjs`. Usan usuarios ficticios, MongoDB temporal y correo de prueba; no acceden a cuentas de empleados ni modifican producción.
