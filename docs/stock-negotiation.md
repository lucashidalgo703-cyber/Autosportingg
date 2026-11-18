# Negociación de Stock

En **Stock → Negociación**, el personal autorizado puede buscar marca, modelo o dominio y consultar cuatro precios de contado: Publicado, Primera rebaja, Cierre sugerido y Piso autorizado. Cada precio muestra la ganancia proyectada; las unidades compartidas muestran también la parte de AutoSporting según el acuerdo existente. En celular se presentan tarjetas. **Probar oferta** recalcula los datos en el servidor y muestra el margen para bajar o la autorización necesaria.

Administración configura **Configurar mínimo general** como importe en ARS o porcentaje del costo total invertido. **Mínimo de la unidad** crea una excepción que tiene prioridad; **Usar mínimo general** la retira. No se precarga un mínimo supuesto: mientras falte, el piso queda pendiente. La regla protege la ganancia total de la operación después del costo y las comisiones; la participación de AutoSporting se informa por separado.

El costo reutiliza compra/toma, gastos de la unidad y gastos comerciales de su único borrador vigente, con la deduplicación del cálculo comercial existente. Los movimientos de caja que reflejan esos mismos gastos no se vuelven a sumar. Por decisión de administración, se descuenta únicamente la comisión configurada en el panel comercial de la venta, fija o porcentual. Sin un borrador vigente se usa el valor inicial de ese panel (cero). No se añade la comisión habitual del vendedor ni se heredan comisiones de ventas canceladas. Las conversiones requieren un tipo de cambio guardado en el CRM; no se inventa una equivalencia entre pesos y dólares.

El piso se redondea hacia arriba a una unidad de la moneda del precio publicado y se verifica con el cálculo comercial real. Los intermedios son redondos, distintos y descendentes; se omiten los que no entran entre publicado y piso. Si el publicado queda por debajo del mínimo, aparece **Revisar precio publicado**. Costos, monedas, acuerdos o comisiones incompletos se identifican y no autorizan un piso. Una reserva u operación vigente contradictoria también requiere revisión.

Los vendedores consultan y simulan; sólo owner/admin configuran reglas. Para usuarios con permisos personalizados: **Configuración → Usuarios → editar usuario → Consultar Negociación en Stock**. Ese permiso requiere acceso a Stock y no concede acceso general a Finanzas. Las acciones de reserva, seña y venta mantienen sus permisos anteriores. La simulación no modifica precios, caja, saldos ni estados.

No requiere nuevas variables de Vercel. Las reglas y su historial de cambios se guardan en una colección interna separada del catálogo. La API exige sesión verificada y permiso, usa `private, no-store` y queda excluida del caché del service worker. Las actualizaciones de mínimos verifican revisión para evitar sobrescribir otro cambio.

## Verificación aislada

```sh
npm run check
npm run test:stock:negotiation
npm run dev:review-preview
# Cuando esté listo http://127.0.0.1:3200, en otra terminal:
npm run test:stock:negotiation:browser
```

Los runners usan MongoDB temporal, usuarios ficticios y correo de prueba. No conectar a producción. Las pruebas cubren piso exacto, un peso por debajo, oferta superior, costo o regla faltante, monedas sin conversión, gastos sin duplicar, comisión y participación compartidas, excepciones, revisiones concurrentes, privacidad y permisos. El navegador comprueba búsqueda, configuración y simulación en escritorio y en celulares de 390 y 320 px, y genera capturas.
