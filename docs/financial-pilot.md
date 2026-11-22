# Piloto financiero sintético

Base auditada: Autosportingg/main, 724f4b8c70fb992713b185c19858efd5fd84b3fc. Rama local: piloto/financiero-sintetico.

## Ejecutar en local

Usar un checkout sin archivos .env y Node 24. Instalar las dependencias del lockfile con npm ci --ignore-scripts. El piloto reutiliza Next, Express, Playwright y mongodb-memory-server del repositorio. MongoMemoryServer puede descargar su binario de prueba la primera vez y Playwright necesita un navegador local. En Windows, si Chrome está instalado, se puede establecer FINANCIAL_PILOT_CHROME con la ruta a chrome.exe. En otros casos se puede usar el Chromium administrado por Playwright.

- node --test tests/financialPilot.test.js
- node scripts/financial-pilot-preview.mjs --api
- node scripts/financial-pilot-preview.mjs --browser RUTA_DE_SALIDA
- node scripts/financial-pilot-preview.mjs --serve

El modo serve abre el piloto en una ventana de navegador con una identidad sintética y una sesión emitida por el servicio de autenticación existente. Escucha únicamente en 127.0.0.1:3240. Cerrar esa ventana o interrumpir el proceso detiene la réplica descartable. Los modos api y browser verifican autenticación, propietarios, administradores con concesión explícita, cuentas denegadas y el flag inactivo. El modo browser también prueba el panel y guarda dos PNG.

El lanzador evita archivos .env, limpia variables de integraciones y utiliza una base descartable con cuentas ficticias únicamente para autenticación. El proxy expone solo las rutas del piloto, validación de sesión y configuración del administrador. El navegador de prueba bloquea destinos externos. El adaptador financiero lee tres archivos congelados y no accede a MongoDB. No ejecutar esta revisión arrancando el CRM con una configuración real.

## Alcance y control

El módulo está deshabilitado por defecto. Para deshabilitar una sesión de revisión, detener el lanzador. Fuera del lanzador, quitar AUTOSPORTING_FINANCIAL_PILOT y NEXT_PUBLIC_AUTOSPORTING_FINANCIAL_PILOT y reiniciar, recompilando el frontend si ya estuviera compilado. El servidor exige además un MongoDB loopback con el nombre de base del arnés descartable y rechaza Vercel. La navegación y el panel requieren el rol propietario o un administrador con financialPilot.read explícito. Los permisos anteriores se preservan.

El contrato JSON financial-pilot/1 contiene importe, moneda, escala, política sintética, evidencia y calidad por indicador. Incluye cierres separados, serie diaria, flujos, alertas y simulación. Los importes congelados son enteros ARS de escala 0. Las participaciones se calculan en puntos base con desempate alejándose de cero. El residual se conserva al repartir. La proyección agrega movimientos del mismo día y evalúa caja al cierre de cada fecha. Los USD de una simulación permanecen identificados y bloquean el cálculo en ARS porque la muestra no ofrece cotización. Se preserva el saldo nominal de cartera si no hay atribución suficiente. El pago restringido tiene vínculo con su obligación y afecta únicamente la caja libre por cualquier parte no cubierta.

El piloto omite persistencia de sesiones financieras y uso de datos de negocio. La única persistencia de la vista previa son usuarios y sesiones ficticios dentro de la base descartable. El cambio de fecha en la simulación tiene efecto solo en la proyección. Ni la API de cálculo ni el panel tienen rutas de escritura de operaciones, compra, venta, pagos, precios o saldos.

Antes de ampliar el piloto: validar perímetro, política, redondeo, FX, acuerdos y liquidez con dueño y contador; aprobar una muestra anonimizada y reconciliarla; ampliar la normalización de fuentes y controlar correcciones históricas; revisar permisos y trazabilidad del entorno autorizado. Para OpenAI, consumir únicamente el contrato validado y fuentes acotadas, con minimización de datos, verificación de importes y control de permisos independiente. Cron, eventos operativos y OpenAI quedan fuera de esta rama.
# Acceso al chat general

En el piloto habilitado, el propietario encuentra **Chat general de la agencia** en **AutoSporting AI**. La conexión de prueba se puede configurar en la sección de Excel del panel. El chat general envía el mensaje y hasta dos turnos recientes a OpenAI. Conserva la conversación en la pestaña hasta recargarla o iniciar una nueva. No lee el CRM ni recibe el Excel.

La carga de permutas calcula en el servidor local. **Probar con OpenAI** envía únicamente las dos instrucciones genéricas de carga y cobro. Ambas funciones comparten el presupuesto de prueba existente.
