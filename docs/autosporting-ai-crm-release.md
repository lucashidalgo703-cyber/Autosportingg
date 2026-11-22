# Habilitar AutoSporting AI en el CRM

El modo oficial habilita **Chat general** y **Propuesta desde una cotización** para el propietario autenticado. Academy conserva sus rutas y su presupuesto.

Configuración del entorno de destino:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_AUTOSPORTING_AI_OFFICIAL` | `1` durante el build para mostrar el módulo al propietario |
| `AUTOSPORTING_AI_OFFICIAL` | `1` en el servidor para habilitar la API |
| `AUTOSPORTING_AI_OFFICIAL_ORIGIN` | Origen HTTPS exacto del CRM, sin barra final |
| `AUTOSPORTING_AI_OFFICIAL_OPENAI_KEY` | Clave dedicada, cargada como secreto del servidor |
| `AUTOSPORTING_AI_OFFICIAL_BUDGET_CENTS` | Cupo acumulado explícito, en centavos de USD |

El modo oficial reserva el máximo por llamada en MongoDB mediante un contador atómico. Guarda el estado y los tokens en `autosporting_ai_attempts`. Las reservas sobreviven a los reinicios y no se liberan ante consumo incierto. No se guardan mensajes, Excel ni resultados en esas colecciones. Este presupuesto es independiente del registro del piloto y del de Academy.

Antes de publicar, verificá en un entorno de prueba que el propietario pueda usar el chat y elegir una cotización del CRM, que otras cuentas reciban 403 y que la configuración local de clave y la carga de Excel estén ausentes. Las propuestas leen precio, toma y costo de stock propio mediante consultas de solo lectura. Sus datos no se agregan al chat ni se envían a OpenAI. El chat general envía el texto escrito y hasta dos turnos previos de esa misma pestaña.

Para deshabilitar el módulo, quitá `AUTOSPORTING_AI_OFFICIAL=1`. Para ocultar el acceso del menú, quitá también la variable pública y reconstruí el frontend.
