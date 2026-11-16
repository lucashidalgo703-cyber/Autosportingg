# Dictar y confirmar gastos desde el celular

## Carga directa dentro del CRM

Se agregó una pantalla propia: **Finanzas → Dictar gasto**, en `/admin/gastos/rapido`. Este recorrido usa tu sesión habitual del CRM y no requiere crear un GPT, configurar OAuth de ChatGPT ni contratar una API de inteligencia artificial.

La pantalla se implementó y probó con datos ficticios en una base aislada. El 16 de noviembre de 2026 se autorizó publicar la rama completa en el CRM real, junto con Stock y Mis Ventas. Las pruebas de gastos y ventas se realizan en local; el despliegue prepara los índices de producción sin cargar movimientos de prueba.

Cuando esa rama esté publicada en el entorno elegido:

1. Abrí el CRM desde Safari o Chrome en el celular e iniciá sesión con la verificación por correo habitual.
2. Entrá en **Finanzas → Dictar gasto**. También hay un acceso en el menú lateral.
3. Tocá **Dictar con el teclado** y después el micrófono del teclado de tu teléfono. Dictá: “Pagué 85 mil pesos en efectivo por la alineación de la Amarok Extreme”. La frase queda visible para revisar o corregir antes de continuar.
4. Tocá **Preparar gasto**. Si hay dos Amarok, elegí la correcta por año y patente. Si dictaste una transferencia y hay varios bancos posibles, elegí la cuenta desde la que pagaste.
5. Revisá la línea con importe, moneda, concepto, unidad, cuenta y fecha. **Corregir datos** permite cambiar lo interpretado. **Guardar corrección** actualiza el borrador; todavía no registra el egreso.
6. Tocá **Confirmar gasto**. El servidor guarda el movimiento, el débito y el costo asociado a la unidad en una sola operación.
7. Usá **Ver movimiento** para abrirlo en **Finanzas → Taller / Mecánico**, o **Ver unidad** para abrir el vehículo. Para otro gasto, tocá **Cargar otro gasto**.

Si se pierde la respuesta al confirmar, usá **Recuperar resultado** o actualizá la página. Se consulta la misma solicitud y se devuelve el mismo movimiento si ya quedó guardado. No hace falta volver a dictarlo ni crear otro gasto.

Después de registrarlo, desde **Ver movimiento** podés corregirlo o anularlo usando Finanzas. El movimiento, el saldo de la cuenta, el costo de la unidad y el efecto real de Tesorería se ajustan juntos. Recuperar una solicitud cuyo movimiento fue anulado muestra la anulación y no vuelve a cargar el gasto.

La interpretación reconoce frases habituales, importes numéricos o en palabras y fechas como hoy o ayer. Ante importes múltiples, monedas contradictorias u otros datos sin resolver, pide completar o corregir el borrador antes de permitir la confirmación.

El botón del CRM enfoca el campo de texto. El micrófono y la transcripción los proporciona el teclado del teléfono. Si no aparece, consultá [Dictado en iPhone, de Apple](https://support.apple.com/es-lamr/guide/iphone/iph2c0651d2/ios) o [Escribir con la voz, de Gboard](https://support.google.com/gboard/answer/2781851?hl=es-la). No se probó físicamente el micrófono de tu teléfono: las pruebas automáticas introducen el texto que produciría el dictado y comprueban todo el recorrido del CRM.

### Prueba local de esta pantalla

```powershell
npm run dev:mobile-preview
```

Abrí `http://127.0.0.1:3200/admin/gastos/rapido` en esta computadora. Usá el administrador ficticio y el buzón de prueba que imprime la terminal. En otra terminal, `npm run test:expenses:browser` prueba el recorrido completo con vista de celular, corrección y recuperación de una confirmación cuya respuesta se pierde. La dirección local no es accesible desde el celular ni corresponde al CRM publicado.

Para instalar en un staging separado hacen falta las variables existentes del CRM (`MONGODB_URI`, `JWT_SECRET`, configuración de correo y `SECURITY_ALERT_EMAIL`) y preparar los índices mediante `npm run expenses:setup -- --isolated-db autosporting_staging`, reemplazando el nombre por el de la base aislada verificada. La carga falla sin crear un borrador nuevo si falta el índice único de solicitudes. Las cuatro variables `GPT_EXPENSE_*` solo corresponden a la alternativa de ChatGPT que se describe más abajo; no son necesarias para la pantalla directa del CRM.

## Alternativa mediante un GPT de ChatGPT

Guía del 16 de noviembre de 2026. El código está preparado en `codex/mobile-expenses-stock-sales`, con datos ficticios y MongoDB aislado. No está activado en producción.

## Disponibilidad actual y prueba pendiente

**El GPT privado todavía no está creado ni conectado.** OpenAI informa que las cuentas personales Free, Go, Plus y Pro no pueden crear ni publicar GPTs nuevos. Los GPTs existentes pueden seguir siendo editables cuando el plan y los permisos lo permitan. En espacios administrados, la disponibilidad depende de su configuración. Como no tenés un GPT existente, no se puede completar hoy una activación nueva desde una cuenta personal; cambiar simplemente a otro plan personal no resuelve la restricción. [Disponibilidad oficial del editor](https://help.openai.com/en/articles/8554397-creating-and-editing-gpts).

OpenAI anunció además la transición de GPTs personalizados a plugins, con fechas según la cuenta o el espacio. Antes de usar los pasos condicionales del editor, revisar el aviso del espacio que se vaya a utilizar. [Calendario y migración oficiales](https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq).

**El recorrido real dictando dentro de ChatGPT en el celular queda pendiente de esa disponibilidad y de un staging HTTPS.** La prueba local ya cubre el equivalente por API: preparar el gasto de taller, elegir unidad, corregir, confirmar y verificar un único egreso ante doble toque o reintento. Eso no equivale a haber probado una cuenta de ChatGPT conectada ni el dictado real del celular.

## Prueba local disponible ahora

Desde la carpeta del repositorio, en PowerShell:

```powershell
node tests/integration/gptExpenses.integration.test.js
node tests/integration/gptExpenseOAuth.integration.test.js
```

La primera suite prueba gastos, ambigüedades, confirmación y transacción contable. La segunda prueba OAuth vinculado a la sesión verificada del CRM. Crean y destruyen su propia base en memoria y no requieren credenciales de producción.

Para abrir el CRM de prueba en esta computadora:

```powershell
node scripts/start-mobile-crm-preview.js
```

1. Abrí `http://127.0.0.1:3200/login` en esta computadora.
2. Usá `admin@example.test` y la contraseña ficticia que imprime el runner. No es una cuenta de empleado.
3. Leé el código en `http://127.0.0.1:3200/__test-mail.json` y completá el login. Este buzón captura correos de prueba; no envía mensajes externos.
4. Consultá Stock, Mis Ventas y Finanzas con los datos ficticios cargados. La prueba de gastos por acción se ejecuta mediante la suite indicada arriba.
5. Al terminar, `Ctrl+C` destruye la base y el buzón de esa ejecución.

El runner escucha solo en `127.0.0.1`. ChatGPT externo y el celular no pueden alcanzar esa dirección de esta computadora. No publicar ese runner ni su buzón: la prueba externa requiere un despliegue separado.

## Preparar un staging externo aislado

Este paso aún debe realizarse. `STAGING_HOST`, `<HOST_STAGING_REAL>` y `<CALLBACK_EXACTO_EDITOR>` son **marcadores para reemplazar**, no direcciones existentes.

El responsable técnico debe preparar:

1. Un despliegue HTTPS de esta rama en un proyecto/entorno de pruebas, con páginas y `/api/gpt/*` en el mismo origen. No desplegar sobre producción para esta prueba.
2. Un `MONGODB_URI` exclusivo de una base de staging vacía, con credenciales limitadas a esa base y transacciones MongoDB mediante replica set. Verificar por configuración que está separado de producción. El servicio falla cerrado si no puede guardar atómicamente.
3. Usuarios ficticios con login normal y código por correo. El gasto de taller requiere `finanzas.write`, `stock.write` y `taller.payments.write`; un administrador ficticio reúne los permisos habituales. Los vendedores conservan sus restricciones financieras.
4. Cuentas y vehículos ficticios: `Caja efectivo prueba` en ARS, saldo inicial $1.000.000; dos Volkswagen Amarok Extreme, 2022 patente `QA001AA` y 2020 patente `QA002AA`. Usar registros propios de la base de prueba. Referencia: `tests/fixtures/mobileCrmFixtures.js`.
5. Correo del proveedor existente con un remitente autorizado. Probar la entrega del código centralizado al administrador antes de conectar ChatGPT.
6. Acceso al API HTTPS desde ChatGPT. Si Vercel exige otra sesión para llegar al API, resolver el acceso de ese entorno: ChatGPT no tiene la cookie de tu cuenta de Vercel. El OAuth del CRM permanece obligatorio.

## Variables de Vercel para staging

En Vercel: **proyecto de staging → Settings → Environment Variables**. Elegir exclusivamente el entorno de prueba/Preview y, si se usa alcance por rama, `codex/mobile-expenses-stock-sales`. Volver a desplegar ese entorno después de cargar los valores. Ninguna variable de esta tabla lleva prefijo `NEXT_PUBLIC_`.

| Variable | Valor de prueba |
| --- | --- |
| `GPT_EXPENSE_CLIENT_ID` | Identificador, por ejemplo `gastos-autosporting-staging`; se copia también al editor de la acción. |
| `GPT_EXPENSE_CLIENT_SECRET` | Secreto aleatorio de al menos 32 caracteres, exclusivo de staging; solo en Vercel y el campo secreto OAuth del editor. |
| `GPT_EXPENSE_REDIRECT_URIS` | Callback HTTPS exacto del editor para el GPT autorizado; varios valores separados por coma. Sin comodines, parámetros ni fragmentos. Falta completar hasta disponer de un editor/GPT elegible. |
| `GPT_EXPENSE_PUBLIC_ORIGIN` | `https://<HOST_STAGING_REAL>`, sin ruta; origen de prueba para los enlaces de movimientos. |
| `MONGODB_URI` | URI de la base de staging verificada como separada de producción. |
| `JWT_SECRET` | Secreto estable exclusivo de staging para sesiones del CRM. |
| `SECURITY_ALERT_EMAIL` | `tomasbrazao@icloud.com` para probar la entrega centralizada. No cambia el titular de Vercel. |
| `EMAIL_LOGIN_HMAC_SECRET` | Secreto para los códigos, recomendado; si se omite usa `JWT_SECRET`, según el circuito existente. |
| `TWO_FACTOR_ENCRYPTION_KEY` | Configuración de seguridad del CRM con secreto propio de staging. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Configuración del proveedor existente para un remitente autorizado en staging. |

Si el proveedor usa Gmail OAuth2, conservar `SMTP_USER`, `SMTP_OAUTH_CLIENT_ID`, `SMTP_OAUTH_CLIENT_SECRET`, `SMTP_OAUTH_REFRESH_TOKEN` y el remitente, en lugar de la contraseña SMTP. El adaptador existente admite ambas configuraciones. No se necesita una clave de OpenAI en el CRM: el GPT interpreta el texto y llama a la acción estructurada.

El responsable puede generar un secreto nuevo localmente:

```powershell
node --input-type=module -e "import crypto from 'node:crypto'; console.log(crypto.randomBytes(48).toString('base64url'))"
```

No copiar los valores reales a archivos versionados, al esquema, a las instrucciones o al chat.

## Preparar índices en la base de staging seleccionada

El CRM desactiva `autoIndex`. Con `MONGODB_URI` ya configurada y verificada como la base de prueba, ejecutar desde el repositorio:

```powershell
node scripts/create-auth-indexes.js
```

Después, en esa misma terminal conectada únicamente a staging, ejecutar este comando en una sola línea:

```powershell
npm run gpt:setup -- --isolated-db autosporting_staging
```

Crea los índices de autorización, tokens, límites, idempotencia de borradores y claves de Tesorería. Los borradores confirmados se conservan para devolver el mismo resultado en un reintento.

## Configurar el editor, solo si la cuenta tiene disponibilidad

Estos pasos requieren un GPT existente editable o un espacio que permita crearlo. Se configura desde la web y luego se usa desde la app móvil. [Edición y uso móvil oficiales](https://help.openai.com/en/articles/8554397-creating-and-editing-gpts).

1. Entrá a [GPTs de ChatGPT](https://chatgpt.com/gpts) desde la computadora. Abrí el existente en **Mis GPTs → Editar**; si el espacio permite crear uno, usá su opción de creación.
2. Nombre: **Gastos AutoSporting**. Pegá el contenido completo de `Gastos-AutoSporting-instrucciones.md` en Instrucciones.
3. Agregá una Acción e importá `gastos-autosporting.openapi.yaml`. Primero reemplazá las tres apariciones de `STAGING_HOST` por el host HTTPS real, sin duplicar `/api/gpt`.
4. Elegí autenticación **OAuth** con estos valores del servidor implementado:

| Campo | Valor |
| --- | --- |
| Client ID | El mismo `GPT_EXPENSE_CLIENT_ID` de staging. |
| Client Secret | El mismo `GPT_EXPENSE_CLIENT_SECRET` de staging. |
| Authorization URL | `https://<HOST_STAGING_REAL>/gpt/autorizar` |
| Token URL | `https://<HOST_STAGING_REAL>/api/gpt/oauth/token` |
| Scope | `expenses.write` |
| Intercambio de credenciales, si se pregunta | Basic o envío en el cuerpo; el servidor admite ambos. |

5. Copiá el callback exacto del editor en `GPT_EXPENSE_REDIRECT_URIS`. Si el mismo GPT necesita más de un dominio de callback, registrar los valores exactos separados por coma. Volver a desplegar staging después del cambio.
6. Guardá/actualizá con visibilidad privada **Solo yo / Only me**, si esa opción está disponible. No se requiere publicación pública. Si el editor exige política de privacidad, usar una URL real que corresponda al tratamiento de datos; no inventar una dirección para completar el formulario.
7. En Preview, pedí consultar las cuentas de prueba. Al conectar se abre el CRM: ingresá con el administrador ficticio y completá allí el código recibido por correo. Elegí **Autorizar gastos** para volver a ChatGPT. No escribir contraseña ni código en la conversación.
8. Comprobá que aparecen únicamente referencias de staging y guardá el enlace privado cuando el editor lo proporcione.

La importación del esquema y las acciones están documentadas por OpenAI. [Configurar acciones](https://help.openai.com/en/articles/9442513-configuring-actions-in-gpts). Los campos y callbacks corresponden al OAuth de acciones. [Autenticación oficial](https://developers.openai.com/api/docs/actions/authentication).

La conexión implementada revisa permisos vigentes en cada petición y termina con la sesión verificada del CRM. Cerrar sesión, su vencimiento, desactivar la cuenta o revocar su permiso financiero obliga a reconectar. El token delegado no habilita las demás API privadas del CRM.

## Prueba completa desde el celular, cuando esté conectado

1. Abrí ChatGPT con la misma cuenta y el enlace privado de **Gastos AutoSporting**. Verificá que esté conectado a staging.
2. Tocá el mensaje y el micrófono del **teclado del celular**. Dictá: “Pagué 85 mil pesos en efectivo por la alineación de la Amarok Extreme”. Revisá la transcripción y enviala.
3. Debe pedir elegir entre las dos Amarok por año y patente. Respondé “La 2022, QA001AA”. Si hay una sola caja ARS de efectivo, no debe volver a preguntar desde cuál cuenta pagaste.
4. Debe mostrar una línea equivalente a **$85.000 ARS · Alineación · Volkswagen Amarok Extreme 2022 (QA001AA) · Caja efectivo prueba · [fecha argentina]**. La fecha es la real devuelta por staging.
5. Para probar corrección, respondé “Me equivoqué, fueron 84 mil”. Debe actualizar el mismo borrador y mostrar $84.000. Volvé a $85.000 mediante otra corrección para repetir los importes del ejemplo.
6. Confirmá expresamente el último resumen. Aceptá la confirmación de la acción si ChatGPT la muestra. Debe devolver identificador del movimiento y enlace **del staging real**. Es el ID existente en el CRM, no un número inventado.
7. Abrí el enlace: debe abrir el movimiento exacto en **Finanzas → Taller / Mecánico**. Verificá concepto, fecha, ARS, $85.000, caja y unidad vinculada.
8. En **Stock**, abrí la Amarok 2022 `QA001AA` y sus gastos/costos: debe haber una alineación de $85.000 vinculada al movimiento. En **Finanzas → Cuentas**, la caja debe pasar de $1.000.000 a $915.000 si no hubo otros movimientos. La anotación de costo no genera otro egreso.
9. Para un reintento tras una respuesta perdida, pedí recuperar/reintentar **ese mismo borrador**, conservando `draftId`. Debe devolver igual identificador y enlace. Un doble toque también tiene un único impacto. Pedir explícitamente “otro gasto igual” es una operación nueva con otro `requestId`.
10. Probá “Transferí 12 mil por internet”: con dos bancos y los demás datos completos, debe preguntar solo desde cuál cuenta pagaste. Para tarjeta debe distinguir pago realizado de consumo pendiente; el segundo queda en **Finanzas → Tarjeta**, pendiente y sin débito hasta completar el pago mediante el circuito del CRM.
11. Cerrá sesión en el CRM e intentá otra acción: debe pedir reconectar con un nuevo ingreso verificado, aunque uses el mismo celular.

## Pendiente para completar la prueba externa

- Disponer de un editor/GPT elegible; hoy no hay un GPT existente en esta cuenta personal.
- Preparar staging HTTPS, base separada, datos ficticios, correo e índices. No se inventó ni desplegó una URL de staging en este trabajo.
- Registrar el callback real, cargar secretos y conectar la cuenta desde el editor.
- Observar el recorrido real de dictado → GPT → staging → movimiento y costo de unidad. El equivalente local por API está automatizado; el recorrido externo todavía no se realizó.

La activación en producción queda fuera de esta implementación y de estos pasos de prueba.
