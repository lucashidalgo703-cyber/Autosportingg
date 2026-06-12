# Checklist QA final

## 1. Preparación

- [ ] Ambiente de QA usa datos ficticios.
- [ ] No hay credenciales en repositorio, fixtures o capturas.
- [ ] Migrations aplicadas y rollback probado.
- [ ] Roles de prueba disponibles.
- [ ] Zona horaria y monedas definidas.
- [ ] Feature flags documentadas.

## 2. Layout y navegación

- [ ] Todas las rutas cargan por navegación y deep link.
- [ ] Refresh no genera 404.
- [ ] No existen prefijos duplicados como `/v2/v2/`.
- [ ] Active state correcto.
- [ ] Sidebar colapsa y conserva estado si corresponde.
- [ ] Header sticky no cubre contenido.
- [ ] Bottom nav no cubre acciones.
- [ ] Permisos ocultan y bloquean módulos correctamente.

## 3. Desktop

- [ ] Validado en 1280 x 720.
- [ ] Validado en 1440 x 900.
- [ ] Tablas mantienen headers y acciones legibles.
- [ ] No hay doble scroll inesperado.
- [ ] Modales caben y tienen scroll interno controlado.
- [ ] Tooltips y menús no se cortan.
- [ ] FAB no cubre acciones.

## 4. Mobile y tablet

- [ ] Validado a 360 x 800.
- [ ] Validado a 390 x 844.
- [ ] Validado a 768 x 1024.
- [ ] Validado a 1024 x 768.
- [ ] No hay scroll horizontal de página.
- [ ] Tabs/chips tienen alternativa usable.
- [ ] Tablas se convierten en cards o permiten inspección accesible.
- [ ] Inputs no provocan zoom inesperado.
- [ ] Teclado virtual no tapa CTA.
- [ ] Bottom nav respeta safe areas.
- [ ] Textos largos no rompen cards.

## 5. Sistema visual

- [ ] Tokens usados en vez de colores hardcodeados.
- [ ] Tipografía consistente.
- [ ] Radios y bordes consistentes.
- [ ] Botón primario inequívoco.
- [ ] Estados success/warning/error/info consistentes.
- [ ] Disabled no parece habilitado.
- [ ] Loading no se confunde con valor cero.
- [ ] Empty states incluyen próxima acción.
- [ ] Iconografía consistente y con labels accesibles.

## 6. Accesibilidad

- [ ] Contraste WCAG AA.
- [ ] Focus visible.
- [ ] Orden de tabulación lógico.
- [ ] Escape cierra diálogos no destructivos.
- [ ] Diálogos tienen título y descripción.
- [ ] Inputs tienen label.
- [ ] Errores se anuncian y vinculan al campo.
- [ ] Tablas tienen headers semánticos.
- [ ] Estados no dependen solo del color.
- [ ] Zoom 200% usable.

## 7. Dashboard

- [ ] Cada KPI tiene fórmula documentada.
- [ ] KPIs reconcilian con módulos fuente.
- [ ] ARS y USD no se suman sin conversión explícita.
- [ ] Períodos y zona horaria correctos.
- [ ] Cards navegan a detalle filtrado.
- [ ] Usuarios sin permiso no ven montos sensibles.
- [ ] Error de carga no muestra cero.

## 8. Stock y vehículo

- [ ] Filtros combinables.
- [ ] Ordenamiento estable.
- [ ] Búsqueda normaliza patente/VIN.
- [ ] Duplicados bloqueados o advertidos.
- [ ] Estado respeta ventas/reservas vinculadas.
- [ ] Propio, consignado y mandato diferenciados.
- [ ] Moneda siempre visible.
- [ ] Fotos cargan, fallan y reintentan correctamente.
- [ ] Eliminar requiere permiso y confirmación.
- [ ] Mobile conserva datos críticos.

## 9. Clientes

- [ ] DNI, email y teléfono normalizados.
- [ ] Deduplicación probada.
- [ ] Pipeline conserva orden.
- [ ] Reasignaciones auditadas.
- [ ] Filtros por ownership correctos.
- [ ] PII no aparece en logs.
- [ ] Importación informa errores por fila.

## 10. Cotizaciones, reservas y ventas

- [ ] Transiciones documentadas.
- [ ] Transiciones inválidas bloqueadas.
- [ ] Reserva bloquea stock una sola vez.
- [ ] Cancelación libera stock cuando corresponde.
- [ ] Señas múltiples no se duplican por retry.
- [ ] Comprobantes respetan permisos.
- [ ] Permuta actualiza importes correctamente.
- [ ] Comisión respeta regla vigente.
- [ ] Venta histórica no dispara workflows operativos.
- [ ] Caída/cancelación revierte efectos definidos.
- [ ] Auditoría registra actor, fecha y cambio.

## 11. Cobranzas y finanzas

- [ ] Importes usan decimal o minor units.
- [ ] Pagos son idempotentes.
- [ ] Pagos parciales conservan saldo.
- [ ] Vencimientos usan timezone correcta.
- [ ] Reversos no borran movimientos originales.
- [ ] Saldos reconcilian con ledger.
- [ ] ARS/USD permanecen separados.
- [ ] Cuentas por cobrar/pagar concilian con ventas y cuotas.
- [ ] Cierre requiere rol.
- [ ] Conciliación deja auditoría.

## 12. Mensajes e integraciones

- [ ] Webhooks validan firma.
- [ ] Eventos repetidos son idempotentes.
- [ ] Estados enviado/entregado/fallido visibles.
- [ ] Opt-out respetado.
- [ ] Ventana del proveedor respetada.
- [ ] Plantillas validadas antes de enviar.
- [ ] Tokens OAuth solo server-side.
- [ ] Adjuntos validan tamaño y tipo.
- [ ] Fallo del proveedor tiene retry controlado.

## 13. Usuarios y seguridad

- [ ] RBAC validado en backend.
- [ ] No existen contraseñas en texto plano.
- [ ] Hash usa algoritmo y parámetros vigentes.
- [ ] Reset de clave invalida sesiones según política.
- [ ] 2FA requerido para roles sensibles.
- [ ] Configuración no devuelve secretos.
- [ ] Backups cifrados y restore probado.
- [ ] Logs no contienen PII ni tokens.
- [ ] Acciones destructivas requieren confirmación.

## 14. Performance y resiliencia

- [ ] No hay requests duplicados evitables.
- [ ] Listas grandes usan paginación o virtualización.
- [ ] Imágenes optimizadas.
- [ ] Inputs de búsqueda usan debounce.
- [ ] Skeletons no causan layout shift severo.
- [ ] Errores de red permiten retry.
- [ ] Sesión expirada redirige sin perder datos no enviados cuando sea posible.
- [ ] No hay warnings ni errores de consola en flujos críticos.

## 15. Cierre

- [ ] Todas las tareas P0 cerradas.
- [ ] P1 abiertas tienen dueño y fecha.
- [ ] Capturas desktop/mobile aprobadas.
- [ ] Pruebas críticas automatizadas.
- [ ] Documentación de operación actualizada.
- [ ] Rollback ensayado.
- [ ] No se copiaron marcas, textos propietarios ni datos sensibles del CRM de referencia.
