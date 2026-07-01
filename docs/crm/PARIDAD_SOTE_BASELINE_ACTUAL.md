# Estado de Paridad con CRM SOTE - Fase 1

## Matriz de Capacidades

| Función | Estado Real | Archivos Involucrados | Endpoints | Riesgo | Prueba Necesaria |
|---|---|---|---|---|---|
| Round-robin de leads | Parcial (Backend) | `src/models/LeadAssignmentState.js`<br>`src/services/leadRoutingService.js` | N/A | Alto | Probar asignación atómica sin perder turnos con peticiones concurrentes. |
| Gmail OAuth | Implementado | `src/models/CrmSettings.js`<br>`src/lib/emailAdapter.js`<br>`src/app/admin/correos/page.jsx` | N/A | Medio | Verificar renovación del token OAuth y envío de correos salientes. |
| Google Calendar | No detectado | N/A | N/A | Medio | Confirmar si la UI usa un selector nativo o si hay sync 2-way pendiente. |
| WhatsApp | Implementado | `src/lib/whatsappAdapter.js`<br>`src/components/WhatsAppButton.jsx`<br>`src/app/admin/whatsapp/page.jsx` | N/A | Alto | Validar recepción de webhooks y timeouts de la sesión. |
| Mercado Libre y Portales | Interfaz / Parcial | `src/components/crm/stock/MLActionModal.jsx`<br>`src/components/crm/stock/StockTable.jsx` | N/A | Alto | Verificar si el sync de publicaciones es bidireccional y soporta reautenticación. |
| OCR de DNI | No detectado | N/A | N/A | Bajo | Integrar servicio para procesar imágenes de DNI y autocompletar formulario. |
| Reserva → Venta | Implementado | `src/components/crm/reservations/ReservationModal.jsx`<br>`src/components/crm/sales/SaleCreateModal.jsx` | N/A | Alto | Convertir reserva a venta sin duplicar importes ni perder el cliente. |
| Venta → Expediente/Tesoreria | Implementado / Interfaz | `src/components/crm/sales/detail/SaleLinkedEntitiesPanel.jsx`<br>`src/app/admin/expedientes/page.jsx` | N/A | Alto | Transferencia correcta de montos y estados a caja y expedientes. |
| Cuotas y Pagos | Implementado | `src/components/crm/installments/InstallmentsTable.jsx`<br>`src/components/crm/installments/InstallmentModal.jsx` | N/A | Crítico | Precisión de decimales, recargos por mora y estados al saldar. |
| Consignación → Liquidación | Interfaz | `src/app/admin/consignaciones/page.jsx`<br>`src/app/admin/liquidaciones/page.jsx` | N/A | Medio | Flujo contable correcto al liquidar un vehículo consignado vendido. |
