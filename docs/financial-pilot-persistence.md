# Piloto persistente y prueba real del chat

Rama local piloto/financiero-sintetico desde HEAD 724f4b8c70fb992713b185c19858efd5fd84b3fc. Árbol anterior para comparar: 727e20f0718180bb198e5b2f952518aa894a79e5, guardado con índice Git alternativo. El motor y la muestra congelada se conservan.

## Almacenamiento y reinicio

El chat ya guardaba turnos, revisiones y evidencias en MongoDB bajo el ID del usuario. La pérdida era del lanzador: al apagarlo, borraba la réplica descartable y volvía a crear identidades. El modo de prueba sigue siendo descartable por defecto.

Desde el checkout aislado sin archivos .env, con Node y dependencias instaladas:

    $env:FINANCIAL_PILOT_CHAT='1'
    $env:FINANCIAL_PILOT_AI_MODE='simulated'
    Remove-Item Env:FINANCIAL_PILOT_STORAGE -ErrorAction SilentlyContinue
    node scripts/financial-pilot-preview.mjs --serve

Para conservar el historial:

    $env:FINANCIAL_PILOT_STORAGE='persistent'
    $env:FINANCIAL_PILOT_DATA_DIR=Join-Path $env:LOCALAPPDATA 'AutoSportingAI\financial-pilot.local'
    node scripts/financial-pilot-preview.mjs --serve

Se requiere un directorio inicialmente vacío o identificado por autosporting-pilot.json. El motor local usa la base autosporting_financial_pilot_local y archivos en el subdirectorio mongo. El puerto MongoDB es 32529 por defecto, configurable con FINANCIAL_PILOT_MONGO_PORT antes de inicializar el directorio. Conservar el mismo puerto y directorio en los reinicios. Las identidades ficticias conservan su ID y el lanzador emite sesiones nuevas. Se autoriza por propietario al consultar, enviar o recuperar evidencia. La muestra financiera está en los fixtures versionados, fuera del almacenamiento del chat.

Para respaldar, cerrar el navegador de revisión o interrumpir el lanzador, esperar su cierre y copiar el directorio completo, incluido el marcador. Para reiniciar deliberadamente solo el historial, detener el lanzador y archivar el directorio o seleccionar un directorio nuevo vacío. Conservar el respaldo y el directorio de presupuesto separado. Un reinicio normal no borra el historial.

Para desactivar el chat quitar FINANCIAL_PILOT_CHAT y reiniciar. Para apagar la IA quitar también FINANCIAL_PILOT_AI_MODE. El motor queda disponible en ambos casos. No copiar configuración de producción al checkout.

## Presupuesto compartido y conexión

La base MongoDB nunca fue el libro del presupuesto. Se conserva el directorio existente AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR, absoluto, privado, exclusivo de la etapa y fuera del directorio cuyo historial se pueda reiniciar. No se propone otro registro de consumo. Conservar el mismo directorio al cambiar de modo, reiniciar o abrir otra conversación. El lock de archivo impide llamadas concurrentes al proveedor y cada reserva crea un archivo exclusivo. Hasta 50 reservas de USD 0,02 comparten un total de USD 1. Una reserva de resultado incierto sigue ocupada. Si queda un lock tras una interrupción abrupta, verificar que no exista un proceso activo antes de retirar solamente el lock. Conservar los archivos attempt.

Tarifa estándar de gpt-5.4-mini-2026-03-17, verificada el 22/11/2026: USD 0,75 por millón de entrada y USD 4,50 por millón de salida. El adaptador cobra conservadoramente entrada sin cachear y toma la salida total informada por el proveedor, incluido razonamiento facturable si lo hubiera. Configura service_tier default, reasoning effort none y sin herramientas externas del proveedor. El límite de entrada exige que el JSON UTF-8 de toda la solicitud más 1.024 bytes de margen no exceda 16.384, incluyendo prompt, esquema, mensaje, turno previo y alternativas. No es un conteo exacto de tokens del proveedor. El límite de salida es 700 tokens. El techo de estimación configurado se reproduce como (16.384 × 0,75 + 700 × 4,50) / 1.000.000 = USD 0,015438. Reserva USD 0,02, inferior al tope USD 0,10 por respuesta. Una invocación por turno, sin reintentos automáticos, con timeout de 20 segundos. Las consultas financieras locales no agregan tarifas de herramientas externas. Los consumos observados y la reserva no son una factura.

Tarifa oficial: https://developers.openai.com/api/docs/models/gpt-5.4-mini

Configuración real manual. Usar una credencial exclusiva de prueba. Bajo PowerShell, ingresar la clave en una variable temporal de la sesión sin eco:

    $secure=Read-Host 'Clave dedicada de prueba' -AsSecureString
    $env:AUTOSPORTING_OPENAI_TEST_KEY=[System.Net.NetworkCredential]::new('', $secure).Password
    $env:AUTOSPORTING_FINANCIAL_AI_MODEL='gpt-5.4-mini-2026-03-17'
    $env:AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR='RUTA ABSOLUTA DEL REGISTRO EXISTENTE'
    $env:FINANCIAL_PILOT_AI_MODE='real'
    node scripts/financial-pilot-preview.mjs --serve

No poner la clave en .env, Git ni variables públicas. Retirar AUTOSPORTING_OPENAI_TEST_KEY de esa sesión al finalizar. Si falta la configuración, el panel indica IA pendiente de conexión. Las respuestas reales se etiquetan como reales en el turno, las demostraciones como simuladas y un error del proveedor no activa un reemplazo guionado. Enviar solo texto e hipótesis sintéticas.

Validación real pendiente: preguntar capacidad, corregir una compra con otras palabras, modificar fecha y comparar, describir una permuta incompleta, presentar fecha o moneda ambigua y reiniciar con el mismo directorio. Exportar evidencia de cada respuesta y revisar interpretación y argumentos contra el motor antes de ampliar el uso. Requerido además antes de datos reales: políticas aprobadas, muestra autorizada y conciliada, validación del adaptador.

## Verificación y archivos

- financial-pilot-storage.mjs, financial-pilot-preview.mjs, isolatedReplicaHarness.js y financialPilotRoutes.js: inicio persistente opcional, identidad estable y nombre de base exclusivo dentro de loopback.
- financialAnalysisProvider.js: fórmula compartida de estimación para el máximo y consumo observado. Se preservan directorio, identidad y restricciones del cupo.
- financialChatEngine.js y FinancialDirectionChat.jsx: efectivo pactado, cobrado, atribuible, restringido y libre en la hipótesis; valor de toma separado del costo asignado; capital por cobrar y fecha; resultado propio pendiente si faltan reglas de reparto. Una hipótesis nunca acredita ni concilia cobros en el CRM.
- financialPilotRestart.integration.mjs y financialChat.test.js: dos ciclos de proceso, mismo usuario y caso, revisión posterior, permisos, bloqueo del presupuesto concurrente y conservación de un timeout. La prueba usa directorios temporales y un transporte stub, sin modificar el cupo real.

Ejecutar node tests/integration/financialPilotRestart.integration.mjs y node --test tests/financialChat.test.js tests/financialPilot.test.js tests/financialAnalysis.test.js.

### Verificación local de configuración

Desde la raíz, cargar las opciones sin secretos mediante:

    . .\scripts\financial-pilot-real.example.ps1 -BudgetDirectory 'RUTA ABSOLUTA DEL PRESUPUESTO'

Reutilizar el directorio anterior si existe. Si nunca se creó un registro, preparar una sola carpeta privada y conservarla para todos los reinicios. El ejemplo no crea, lee ni modifica el registro ni la credencial. Ingresar la clave con Read-Host -AsSecureString como se muestra arriba, en la misma terminal. No hace falta un archivo de secretos.

    node --input-type=module -e "import {analysisMode} from './src/services/financialAnalysisProvider.js'; process.exitCode = analysisMode({...process.env,AUTOSPORTING_FINANCIAL_AI:'1',AUTOSPORTING_FINANCIAL_AI_MODE:process.env.FINANCIAL_PILOT_AI_MODE}) === 'configured' ? 0 : 1; console.log(process.exitCode ? 'Pendiente' : 'Configuración local completa');"
    node scripts/financial-pilot-preview.mjs --serve

El primer comando solo comprueba configuración local y no autentica ante OpenAI. Para comprobar conexión real, enviar desde el chat del cierre corregido bajo estrés una pregunta sintética como «¿Cuánto puedo reinvertir y por qué?». Confirmar que el turno indique Interpretación de OpenAI. Una respuesta correcta debe conservar las referencias al mínimo, al piso y a los vencimientos.

El límite local acepta hasta 15.360 bytes del JSON enviado más 1.024 de margen para el envoltorio del proveedor. Contabiliza instrucciones, esquema, mensaje, turno previo y revisiones incluidas. El chat no llama herramientas remotas y el motor se ejecuta localmente después de la respuesta. Es una cota presupuestaria conservadora de texto con margen, no un conteo exacto de tokens del proveedor. La salida total se limita a 700 tokens. El adaptador usa fetch directamente, rechaza redirecciones y no reintenta. Una reserva atómica precede a cada intento.
