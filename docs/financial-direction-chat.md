# Chat de dirección sintético

Rama local: piloto/financiero-sintetico. HEAD: 724f4b8c70fb992713b185c19858efd5fd84b3fc. El árbol edf04b2ca17c1b4aa1ab76fb9e9a42f88c34c2f5 contiene el estado anterior del piloto y del análisis, incluidos sus cambios locales. Se usó un índice alternativo para el diff.

## Ejecutar y apagar

Seguir docs/financial-pilot.md para dependencias y navegador. Desde el checkout aislado, sin archivos .env:

    $env:FINANCIAL_PILOT_CHAT='1'
    $env:FINANCIAL_PILOT_AI_MODE='simulated'
    node scripts/financial-pilot-preview.mjs --serve

Pruebas:

    node --test tests/financialChat.test.js tests/financialPilot.test.js tests/financialAnalysis.test.js
    node scripts/financial-pilot-preview.mjs --browser RUTA_DE_SALIDA
    node scripts/validate-codebase.js

La vista previa ejecuta autenticación real sobre MongoDB descartable en loopback. Configurar FINANCIAL_PILOT_CHROME si se usa Chrome instalado en vez de Chromium de Playwright. El modo simulado ofrece dos demostraciones guionadas de comandos del intérprete. El texto del usuario se escribe y guarda, pero el guion se elige explícitamente por demostración y turno, nunca por coincidencias con palabras o frases. Las demostraciones prueban el historial, el contrato, el motor y la interfaz. No evalúan comprensión de texto libre.

Para modo real usar FINANCIAL_PILOT_AI_MODE=real únicamente con los requisitos de docs/financial-analysis.md. La clave de prueba, snapshot y directorio de reservas son los de la etapa anterior. Nunca usar un nuevo directorio para reiniciar el cupo. En el chat real escribir únicamente consultas e hipótesis sintéticas. Se envía el mensaje del turno, el turno anterior y un conjunto acotado de alternativas estructuradas. Se excluyen el actor, credenciales y documentos. Si falta la clave, la UI informa IA pendiente de conexión. La selección de texto libre en modo real queda sin validar con OpenAI.

Para desactivar el chat, quitar FINANCIAL_PILOT_CHAT o AUTOSPORTING_FINANCIAL_CHAT según el entorno y reiniciar. La ruta aplica la bandera en el servidor. Para apagar también la IA y el piloto, seguir las banderas de financial-analysis.md. Detener la vista previa elimina la base descartable: el historial se puede retomar entre pestañas, recargas y sesiones durante esa instancia, pero no se conserva al apagarla.

## Flujo y controles

El panel inicia una conversación ligada a la muestra, cierre, revisión, escenario, corte y política. Puede iniciarla con una simulación ya calculada. La API vuelve a resolver esos parámetros con el motor. La sesión autenticada fija el propietario de cada conversación. Listar, recuperar un chat y agregar un turno filtran por ese propietario. La evidencia forma parte del turno autorizado. Un ID ajeno no devuelve contenido.

El prompt autosporting-direction-chat/1 devuelve un comando estructurado: consultar capacidad, proponer una modificación de términos o flujo, comparar, aclarar o informar alcance. El modelo no devuelve cifras calculadas ni referencias. El motor valida parámetros, usa la revisión previa como base y aplica reemplazos, agregados explícitos o eliminaciones. Guarda la hipótesis y la evaluación por separado, incluidas las condiciones pendientes. Corregir importe o fecha del mismo flujo conserva las revisiones anteriores y los demás flujos. Las comparaciones se limitan al cierre fijo y el tipo activo de operación. La recomendación de renegociar requiere un resultado por debajo del piso. Alcanzar el piso genera una advertencia específica. Los textos de recomendación provienen de reglas del servidor. El análisis anterior también distingue si el cobro queda dentro o fuera del horizonte seleccionado.

Para permutas y ventas se separan efectivo contractual, inventario recibido, crédito y contribución total. La proyección de caja usa los flujos fechados suministrados, que son hipótesis aparte y no una acreditación efectiva. El piloto requiere datos decisivos y no calcula resultados atribuibles cuando faltan reglas de reparto. En otras áreas informa alcance y necesidad de evidencia. No ejecuta acciones de negocio ni cambios a las políticas del cierre. No incluye un catálogo completo de políticas hipotéticas, agenda, Academy ni automatización.

MongoDB aislado guarda los turnos y revisiones mediante una actualización condicionada a la versión y al lease vigente. El requestId permite recuperar un envío exitoso sin repetirlo. Una respuesta tardía sin lease no puede modificar el chat. Si falla el intérprete, se libera el turno y el usuario puede volver a intentar, con los presupuestos aplicados. El cierre determinístico sigue disponible. Se admiten hasta 20 turnos por chat y mensajes de 1.200 caracteres.

## Presupuesto

Se comparte el mismo adaptador, lock y directorio de reservas de la etapa anterior. Consulta oficial de GPT-5.4 mini el 21/11/2026. USD 0,75 por millón de tokens de entrada y USD 4,50 por millón de salida estándar. Con 16.384 tokens de entrada presupuestados (bytes más margen, incluido contexto y esquema) y 700 de salida, el máximo estimado es USD 0,015438. La reserva por intento de USD 0,02 cubre ese máximo. Una invocación por turno, sin reintento automático, salida acotada y timeout de 20 segundos. Una llamada incierta conserva la reserva. El acumulado es USD 1 para análisis y chat juntos, sin renovación automática. No se usó la API real en esta entrega.

Tarifa oficial: https://developers.openai.com/api/docs/models/gpt-5.4-mini
Contrato del proveedor: https://developers.openai.com/api/docs/guides/structured-outputs

## Archivos

- FinancialDirectionChat.jsx y page.jsx: historial, texto libre, estado de conexión, evidencias y revisiones.
- financialPilotRoutes.js: endpoints protegidos de chat y catálogo.
- financialChatStore.js: sesión por propietario, idempotencia, lease y almacenamiento.
- financialChatEngine.js: prompt, contrato, comandos, herramientas determinísticas y demos.
- financialPilotSource.js: opción interna para proyectar cobros sin exigir un egreso en una venta.
- financialAnalysisProvider.js y financialAnalysisContext.js: transporte compartido y condición de aplicación del análisis previo.
- financial-pilot-preview.mjs y financialChat.test.js: pruebas aisladas de API, navegador y motor.

Pendientes para datos reales: credencial de prueba, evaluación de comprensión y calidad en llamadas reales, políticas aprobadas, muestra autorizada y conciliada, validación del adaptador y revisión profesional donde corresponda. El asesoramiento de áreas sin datos y los escenarios complejos de aportes, FX y tributación no forman parte del motor validado.
