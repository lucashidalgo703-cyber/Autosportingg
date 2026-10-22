# AUTOSPORTING CRM — ARQUITECTURA DE SEGURIDAD Y AUDITORÍA FORENSE

**Módulo:** Registro Definitivo de Computadoras, Autenticación Asimétrica y Auditoría Forense  
**Rama:** `feature/seguridad-dispositivos-auditoria`  
**Última actualización:** Octubre 2026

---

## 1. GARANTÍAS REALES DEL SISTEMA VS. LIMITACIONES TÉCNICAS

### 1.1. Integridad Verificable y Cadena de Custodia (HMAC-SHA256)
- **Garantía real:** Cada evento en `AuditLog` genera una firma HMAC-SHA256 (`currentHash`) calculada a partir de los datos del evento, la marca de tiempo, el hash anterior (`previousHash`) y la clave secreta del servidor (`AUDIT_HMAC_SECRET` o `JWT_SECRET`).
- **Detección de manipulaciones:** La herramienta `verifyAuditLogIntegrity` recorre la cadena recalculando las firmas. Si un atacante altera campos históricos o borra registros intermedios, la herramienta detecta inmediatamente `CORRUPTED_PAYLOAD` o `BROKEN_CHAIN_LINK`.
- **Protección contra recálculo offline:** Dado que el cálculo requiere el secreto de entorno del servidor, un atacante con acceso de solo lectura o volcado de base de datos no puede generar una cadena falsificada válida.
- **Lo que NO garantiza (Aclaración de Inmutabilidad):**  
  MongoDB no es un almacenamiento WORM (*Write Once, Read Many*) por hardware. Un administrador con credenciales de superusuario de MongoDB Atlas que también conozca las variables de entorno de producción podría modificar registros y recalcular los HMACs. Por tanto, el sistema ofrece **integridad verificable y detección de alteraciones**, no **inmutabilidad absoluta indestructible**.

### 1.2. Frontera Criptográfica Independiente y Manifiesto Histórico Sellado
- **Frontera de Verificabilidad:** Los registros creados en MongoDB con anterioridad al despliegue del módulo carecen intrínsecamente de firma HMAC (`currentHash`), secuencia (`sequence`) y enlace previo (`previousHash`).
- **Política de Inmutabilidad Histórica:** El sistema **no elimina, no reescribe ni firma retroactivamente** registros antiguos en la base de datos. Forzar firmas extemporáneas sobre eventos pasados violaría el principio de trazabilidad forense.
- **Vulnerabilidad de Despojo Total Mitigada:** Un atacante con acceso de escritura directo a MongoDB que elimine conjuntamente `currentHash`, `sequence`, `sessionId`, `deviceId` y `previousHash`, y modifique `createdAt` para situarlo antes de Genesis, no puede evadir la verificación porque el sistema **no depende exclusivamente de los campos del propio documento**.
- **Anclaje Histórico Independiente (Manifiesto Criptográfico):**  
  El sistema incorpora la función canónica `computeHistoricalManifest`, que genera un resumen criptográfico sellado con HMAC-SHA256 (`AUDIT_HMAC_SECRET`) a partir de la huella digital canónica (`_id|action|module|description|createdAt`) de cada registro histórico legítimo:
  1. **Conteo Cardinal Inmutable (`count`):** La cantidad de registros legacy queda congelada de forma definitiva.
  2. **Raíz Hash de Huellas (`rootHash`):** SHA-256 concatenado de las huellas de todos los registros preexistentes.
  3. **Firma de Servidor (`signature`):** HMAC-SHA256 firmado con el secreto maestro.
- **Estados Explícitos de Integridad (Sin Falsos Positivos ni Falsas Garantías):**
  - **`VERIFIED` (`ok: true`):** La cadena firmada post-Genesis es válida y continua, y la era histórica (si existen registros sin firma) coincide exactamente con el manifiesto independiente autorizado (`VERIFIED_ANCHORED_HISTORICAL_ERA`).
  - **`UNVERIFIED` (`ok: false`):** Existen registros sin firma en la base de datos pero aún no se ha configurado la variable de anclaje independiente (`AUDIT_HISTORICAL_ANCHOR`). El sistema rechaza otorgar `ok: true` como garantía cuando falta evidencia independiente (`UNANCHORED_HISTORICAL_MANIFEST`).
  - **`COMPROMISED` (`ok: false`):** Se detecta manipulación de registros firmados (`CORRUPTED_PAYLOAD`), enlaces rotos (`BROKEN_CHAIN_LINK`), inyecciones de registros despojados (`INJECTED_UNHASHED_RECORD`), adulteración de marcas temporales o descripciones en registros históricos (`TAMPERED_LEGACY_RECORD`), o firmas de manifiesto adulteradas (`INVALID_HISTORICAL_ANCHOR_SIGNATURE`).
- **Garantía Resultante:** Ninguna modificación, inyección, borrado o despojo de registros puede evadir la verificación sin ser delatada por el anclaje criptográfico independiente.

### 1.3. Concurrencia Serverless y Resiliencia ante Bifurcaciones (Forks)
- En Vercel o entornos multi-instancia, dos peticiones simultáneas pueden consultar el último registro al mismo milisegundo y enlazar al mismo `previousHash`.
- El verificador `verifyAuditLogIntegrity` reconoce este patrón como `CONCURRENT_FORK` legítimo (escrituras paralelas), validando la autenticidad individual de cada bloque sin reportar una falsa corrupción de datos.

### 1.4. Poda de Documentos y Mitigación de DoS
- En `TrustedDevice`, el campo `trustHistory` se limita automáticamente a los **50 eventos más recientes** mediante un hook de pre-guardado, impidiendo ataques de agotamiento de memoria BSON (límite de 16MB por documento).
- El historial forense exhaustivo e ilimitado se almacena de forma independiente en la colección `AuditLog`.

---

## 2. LÍMITE DE CONFIANZA DE PROXY Y RESOLUCIÓN DE IP (`securityIpResolver.js`)

### 2.1. Regla de Decisión Estricta
| Entorno Detectado | Condición Inviolable | Comportamiento con Cabeceras de IP |
|---|---|---|
| **Vercel Edge Network** | `process.env.VERCEL === '1'` | Confía autoritativamente en `x-real-ip` inyectada por el borde perimetral. |
| **Proxy Confiable Explícito** | `process.env.TRUST_PROXY === 'true'` | Confía en la última IP validada de `x-forwarded-for`. |
| **Express Directo / Servidor Autónomo** | Variables de entorno ausentes | **Descarta absolutamente** `x-real-ip`, `x-vercel-forwarded-for` y `x-vercel-id`. Utiliza únicamente la dirección del socket TCP (`req.socket.remoteAddress`). |

> [!IMPORTANT]
> La presencia de la cabecera `x-vercel-id` enviada por el cliente **no confiere ninguna confianza**. Cualquier cliente HTTP puede inyectarla libremente. Solo las variables de entorno del servidor dictan el límite de confianza.

---

## 3. AUTORIZACIÓN DE DISPOSITIVOS Y PROCEDIMIENTO PARA EL PROPIETARIO

### 3.1. Estado y Precondición de 2FA
- **Restricción estricta:** Para autorizar "PC Agencia" o "PC Privada", el Propietario debe contar obligatoriamente con autenticación en dos pasos (TOTP o código de recuperación).
- **Protección contra Bloqueo:** Si el Propietario intenta autorizar un equipo sin tener 2FA activo en su cuenta, el sistema responde con **409 Conflict (`MFA_NOT_CONFIGURED`)** y **no consume intentos del rate limiter**.
- **Endpoint de Comprobación:** El Propietario puede consultar `GET /api/admin/devices/owner-mfa-status` para conocer si su cuenta está lista para autorizar terminales, sin exponer secretos ni hashes.

### 3.2. Procedimiento de Activación Previa
1. Iniciar sesión como Propietario con credenciales maestras.
2. Navegar a **Configuración > 2FA** (`/admin/configuracion/2fa`).
3. Escanear el código QR con Google Authenticator / Authy e ingresar el token de 6 dígitos.
4. **Respaldar y guardar los 10 códigos de recuperación** provistos por el sistema.
5. Regresar a la sección de terminales y autorizar "PC Agencia" o "PC Privada" ingresando el código TOTP actual.

---

## 4. IMPACTO DEL CORTE DE SESIONES LEGACY Y MODO FAIL-SECURE

### 4.1. Cierre Obligatorio de Sesiones Legacy
- Todos los JWT antiguos emitidos sin el campo `sessionId` son rechazados con **401 `LEGACY_TOKEN_REJECTED`**.
- El frontend limpia las credenciales almacenadas y redirige a `/login`.
- Esta medida elimina el riesgo de sesiones zombi o accesos no auditables previos a la implementación.

### 4.2. Principio Fail-Secure
- Si la base de datos MongoDB sufre una interrupción o timeout durante la validación de sesión, `validateSessionAndDevice` responde **503 `AUTH_INFRASTRUCTURE_ERROR`**.
- Ningún error o caída transitoria permite acceso administrativo accidental (*fail-open*).

---

## 5. ÍNDICES TTL Y PURGA AUTOMÁTICA EN MONGODB
- Las colecciones `SecurityChallenge` (desafíos criptográficos, TTL 90s) y `SecurityRateLimit` (intentos de autorización, TTL 15m) cuentan con índices `{ expiresAt: 1 }` con `expireAfterSeconds: 0`.
- Como MongoDB ejecuta su hilo de purga de TTL en segundo plano aproximadamente cada 60 segundos, la lógica de negocio realiza adicionalmente un filtrado en memoria `expiresAt > new Date()` para garantizar que ningún documento expirado sea utilizable incluso antes de la recolección física.
