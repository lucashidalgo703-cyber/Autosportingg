# Análisis financiero sintético

Punto de partida: rama piloto/financiero-sintetico, commit 724f4b8c70fb992713b185c19858efd5fd84b3fc. El árbol Git 49a3bd3a7b2542da8cac889c187be6776b6a451e captura el piloto anterior con sus cambios locales, sin alterar el índice principal. El diff de esta etapa compara contra ese árbol.

## Decisiones de revisión

Se preservan el filtro comercial, las muestras, las expectativas y los cálculos del piloto. El montaje compartido en server.js, los permisos y la navegación se mantienen como estaban en el punto de partida. El servidor continúa exigiendo la bandera del piloto, MongoDB descartable local, autenticación y rol autorizado. La nueva ruta de análisis aplica esos controles antes de leer la muestra. Una bandera separada deshabilita la IA en la API y conserva /calculate.

La extensión ofrece cinco consultas acotadas: cierre, comparación con octubre v1, proyección, explicación de una simulación ya ejecutada y la pregunta de ejemplo. La interfaz no envía preguntas libres, documentos ni datos reales. El cuerpo solo contiene IDs de selección y, para explicar una compra, montos, fechas y monedas. El servidor vuelve a calcular esa simulación y fija el contexto para cada selección. El identificador del análisis incorpora el actor autorizado, la selección y los flujos. No hay historial persistente ni rutas de acceso a resultados guardados. La UI conserva un informe previo durante el cambio de selección y muestra su contexto original. La caché temporal se aísla por actor y contexto.

## Flujo y archivos de esta etapa

- src/app/admin/autosporting-ai/page.jsx y FinancialAnalysisPanel.jsx integran selección, estados de conexión, informe, evidencia y error. Un fallo del análisis no cambia el cierre ni sus alertas.
- src/routes/financialPilotRoutes.js agrega POST /analysis y el estado de disponibilidad en el catálogo autenticado. La ruta reutiliza la sesión y la autorización del piloto.
- src/services/financialAnalysisContext.js resuelve la consulta y la evidencia tipada desde el motor. La comparación etiqueta cada versión. La simulación distingue sus flujos de los del caso base. La IA recibe solo la proyección de datos mínimos y no necesita ejecutar funciones remotas ni acceder a archivos o base de datos.
- src/services/financialAnalysisPrompt.js versiona las instrucciones como autosporting-financial-analysis/1. El prompt conserva la distinción entre caja, resultado, patrimonio, riesgos y políticas, y limita la interpretación al caso sintético.
- src/services/financialAnalysisService.js define y valida la respuesta. Es un objeto de seis elecciones de catálogo: conclusion, evidence, risks, alternatives, limitations, nextStep. El esquema prohíbe campos adicionales y el servidor comprueba sección y pertenencia de cada referencia. Materializa textos acotados e importa importes, signos, fechas, escenarios y fuentes desde el contexto. La salida pública agrega contexto, modo, versión de prompt, modelo y uso si aplica.
- src/services/financialAnalysisProvider.js implementa el adaptador HTTPS de Responses, reservas persistentes y control de tiempo. No hay SDK OpenAI en package.json o package-lock.json. Se reutiliza fetch de Node sin nuevas dependencias.
- tests/financialAnalysis.test.js prueba la integración del motor y la salida. scripts/financial-pilot-preview.mjs amplía el recorrido local aislado y su prueba de autenticación.
- docs/financial-analysis.md documenta esta etapa.

La salida acotada reduce contradicciones y cifras fabricadas al renderizar únicamente hechos y textos construidos en el servidor. No prueba que la elección del modelo sea siempre la más útil. El resultado simulado usa el primer ítem por sección. En modo real, el modelo selecciona de las opciones disponibles. Algunas secciones críticas tienen una única opción para preservar riesgos y limitaciones obligatorios. No hay conversación libre, historial durable ni evaluación de calidad real.

## Ejecución y desactivación

Desde el checkout sin archivos .env, seguir las dependencias de la guía del piloto. Node 24. En PowerShell, para demostrar sin conexión:

    $env:FINANCIAL_PILOT_AI_MODE = 'simulated'
    node scripts/financial-pilot-preview.mjs --serve

Para automatizar la revisión:

    node --test tests/financialPilot.test.js tests/financialAnalysis.test.js
    node scripts/financial-pilot-preview.mjs --api
    node scripts/financial-pilot-preview.mjs --browser RUTA_DE_SALIDA

El modo browser ejecuta la demostración de análisis si FINANCIAL_PILOT_AI_MODE es simulated. En Windows, FINANCIAL_PILOT_CHROME apunta al ejecutable local si no se instaló Chromium de Playwright. MONGOMS_DOWNLOAD_DIR puede identificar la caché local del binario descartable.

El modo real solo se habilita manualmente con FINANCIAL_PILOT_AI_MODE=real en el lanzador. Requiere las siguientes variables de servidor:

- AUTOSPORTING_OPENAI_TEST_KEY, credencial dedicada a la prueba, cargada por un mecanismo seguro. No se reutiliza OPENAI_API_KEY. Sin credencial dedicada la UI informa IA pendiente de conexión.
- AUTOSPORTING_FINANCIAL_AI_MODEL=gpt-5.4-mini-2026-03-17. Otros modelos quedan bloqueados hasta validar sus tarifas y comportamiento.
- AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR, directorio absoluto, privado y persistente, exclusivo de esta etapa. Usar el mismo directorio entre reinicios y procesos. No borrar ni mover sus registros para reanudar pruebas. Si un cierre abrupto deja un lock, comprobar que ningún proceso siga activo antes de retirarlo. El intento reservado se conserva.

No hay llamada de arranque. Las pruebas automatizadas de esta entrega no usan credenciales ni llamadas reales. La vista previa limpia la clave general, usa cuentas de autenticación ficticias y mantiene la réplica en loopback. No persiste resultados de IA. La API tiene una ejecución activa, reutiliza solicitudes idénticas durante la ejecución y por cinco minutos, y limita nuevas solicitudes por actor. Los registros de presupuesto contienen consumo, fecha, modelo y resultado técnico, sin prompts ni secretos.

Para desactivar únicamente la IA, quitar FINANCIAL_PILOT_AI_MODE y reiniciar la vista previa. El servidor exige AUTOSPORTING_FINANCIAL_AI=1, independiente de la UI. Para desactivar todo el piloto, cerrar el lanzador o quitar también AUTOSPORTING_FINANCIAL_PILOT y NEXT_PUBLIC_AUTOSPORTING_FINANCIAL_PILOT fuera del lanzador. En el frontend compilado, recompilar después de cambiar la variable pública.

## Modelo, costos y evidencia

Tarifa oficial consultada el 21/11/2026: GPT-5.4 mini, USD 0,75 entrada y USD 4,50 salida por millón de tokens estándar. Se eligió el snapshot por compatibilidad con Responses y salida estructurada, y por su costo de lista. Calidad y latencia reales quedan sin medir. Una llamada por análisis, sin reintentos automáticos, máximo 16.384 tokens de entrada presupuestados (límite conservador por bytes más margen), 700 de salida y 20 segundos. Costo máximo estimado a tarifa de lista USD 0,015438. Se reserva USD 0,02 por intento en hasta 50 registros persistentes, con lock exclusivo incluso entre procesos. Un intento fallido o incierto conserva su reserva completa. El tope de etapa es USD 1 en el registro, sin renovación automática. El uso reportado se registra aparte y no libera cupo. Son estimaciones, no una factura.

Fuentes oficiales:
- https://developers.openai.com/api/docs/models/gpt-5.4-mini
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/reference/resources/responses/methods/create

Demostración: octubre v2 bajo estrés, caja utilizable 475 al 31/10. El cobro 50 del 03/02 queda fuera del horizonte. Los pagos de proveedor, estructura, principal y gasto tardío llevan el mínimo previo a 370 el 25/11. Con piso 350, la capacidad es 20. Una compra inmediata de 30 lleva el mínimo a 340, con faltante de 10. El pago al socio consume su cuenta restringida.

Antes de datos reales: política firmada de reconocimiento, liquidez, monedas y acuerdos con socios. Muestra anonimizada autorizada y conciliada. Validación del adaptador, permisos, integración, retención del proveedor y evaluación de calidad y latencia con datos autorizados. Academy y automatización quedan fuera de esta etapa.
