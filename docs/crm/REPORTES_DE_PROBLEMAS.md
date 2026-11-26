# Reportes de problemas del CRM

La sección **Reportar problema**, en `/admin/reportar-problema`, está disponible para todos los perfiles internos, incluido Solo lectura. También se abre desde el icono de insecto del encabezado, que conserva la ruta de la pantalla de origen sin parámetros de consulta.

## Uso

1. Elegir **Nuevo reporte** y completar el título y la descripción.
2. Indicar tipo, prioridad y, cuando corresponda, pantalla, pasos para reproducir, resultado esperado y resultado obtenido.
3. Adjuntar opcionalmente hasta tres capturas PNG, JPEG o WebP, con un máximo de 3 MB entre todas.
4. Enviar y consultar el estado desde el listado. Los estados son Pendiente, En revisión, Resuelto y Cerrado.

Cada usuario consulta únicamente sus reportes. Quienes tienen el permiso existente `suggestions.manage` pueden consultar todos, actualizar el estado y agregar respuestas. El autor y el estado inicial se asignan en el servidor.

## Avisos de nuevos reportes

Cada reporte nuevo genera un aviso para el propietario en la campana y en **Notificaciones > Fallas del CRM**. El aviso conserva su estado de leído por usuario y abre el reporte exacto, incluso después de iniciar sesión.

También se intenta enviar un email al correo administrativo ya configurado en `SECURITY_ALERT_EMAIL`, mediante el SMTP/Gmail existente. El mensaje incluye autor, título, descripción, sección, prioridad y enlace protegido al CRM. Las capturas se consultan dentro del CRM.

El estado de entrega se guarda junto con el reporte. Un fallo del correo no impide registrar el problema ni mostrar la notificación. El propietario puede reintentar desde el detalle si el fallo permite confirmar que no se envió; un resultado incierto requiere revisar el correo y evita reenvíos que podrían duplicar el mensaje. Los reportes anteriores a esta función no generan emails retroactivos.

## Implementación

- Frontend: `/admin/reportar-problema`.
- API autenticada: `/api/admin/issue-reports` (GET y POST), `/:id` (GET y PATCH).
- Capturas: `/:id/attachments/:attachmentId` (GET autenticado y autorizado).
- Reintento de email: `/:id/email/retry` (POST, solo propietario).
- Persistencia: modelo MongoDB `IssueReport`, independiente de Sugerencias y de reclamos de clientes. Las capturas se almacenan con el reporte y no se publican en Cloudinary.
- No requiere variables de entorno nuevas ni cambios en cuentas o permisos existentes.

## Verificación local

Usar un checkout sin `.env`, con las dependencias instaladas, y ejecutar:

```text
npm run test:issue-reports
npm run test:issue-report-notifications
npm run test:issue-reports:browser
npm run build
```

La prueba usa el servidor real y una réplica MongoDB temporal con usuarios y datos ficticios. No debe apuntarse a la base de producción para probar el formulario.
