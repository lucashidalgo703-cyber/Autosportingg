# AutoSporting Academy — Ampliación de Capacitación Práctica por Rol

Fecha de entrega: 22 de Noviembre de 2026.
Agencia: AutoSporting (Comodoro Rivadavia, Chubut).
Repositorio: `lucashidalgo703-cyber/Autosportingg`.
Rama de trabajo aislada: `feature/academy-role-training`.
Base técnica: `origin/main` (`724f4b8`), integrando la base validada de Academy proveniente de `origin/release/academy-auth-fixed`.

---

## 1. Diagnóstico breve de lo encontrado y reutilizado

1. **Estado del Repositorio y Checkout Inicial**:
   - El workspace local se encontraba en la rama `fix/auth-me-fail-closed` (`70d1a37`).
   - Tras consultar el remoto `origin`, se localizó la rama candidata `origin/release/academy-auth-fixed` (`b520e9c`), la cual contenía la implementación inicial de Academy (8 cursos financieros, 16 simuladores, 40 evaluaciones, motor de tutor estructurado y persistencia local serializada con Web Locks).
   - Se investigaron las referencias históricas mencionadas: `feature/academy-financiera`, `release/academy-auth-fixed` y `feature/academy-aprender-del-error`. Se constató que `release/academy-auth-fixed` era la rama efectiva con código, mientras que `feature/academy-aprender-del-error` no existía como rama en los refs remotos ni locales, por lo que se implementó como una sección integrada dentro del sistema.
   - En `origin/main` se detectaron avances funcionales recientes: perfiles de personal y altas con autorización (`ventas`, `gestoria_contabilidad`), Facturación / ARCA privada y gestión de dominio en negociación (`d6dd2d2`, `671175e`, `724f4b8`).

2. **Estrategia de Integración Aislada**:
   - Se creó una rama de trabajo aislada: `feature/academy-role-training` a partir de `origin/main`.
   - Se incorporó la base de Academy de `origin/release/academy-auth-fixed` (`src/app/admin/academy/`, `src/components/crm/academy/`, `src/lib/academy/`, `tests/academy*.test.js`), preservando el 100% de los 8 cursos y 16 simuladores existentes sin regresiones.
   - No se realizaron push, merge a producción ni modificaciones en bases de datos de producción. El desarrollo financiero previo y los módulos de CRM se mantuvieron intactos.

---

## 2. Los Once Módulos Iniciales y Seis Casos Completos

### A. Módulo Común (Todos los roles)
- **`comun-trabajo` (MOD-COM-01 v1.0.0)** — *Cómo trabajamos en AutoSporting*:
  - Recorrido completo de una operación automotriz en 6 etapas.
  - Distinción crítica entre dato confirmado, supuesto no verificado y promesa al cliente.
  - Cuidado y confidencialidad de datos conforme a Ley 25.326.
  - Cuándo solicitar autorización formal al Propietario en el CRM.
  - Checklist de 5 puntos, errores frecuentes, actividad práctica y 3 preguntas situacionales con retroalimentación inmediata.

### B. Cuatro Módulos para Vendedores
1. **`ventas-consulta-presentacion` (MOD-VTA-01 v1.0.0)** — *Primera consulta y presentación del vehículo*:
   - Indagación con preguntas abiertas: uso (ciudad, ripio patagónico, trabajo), presupuesto, plazo y permuta.
   - Presentación basada en el pasaporte de la unidad: kilometraje real verificado, libreta de services oficial, segunda llave física comprobada, rueda de auxilio, cric y tuerca de seguridad.
   - 3 preguntas situacionales con devolución pedagógica.
2. **`ventas-negociacion-objeciones` (MOD-VTA-02 v1.0.0)** — *Negociación y manejo de objeciones*:
   - Tratamiento de las 5 objeciones típicas: "está caro", "en otra agencia me dan más por el mío", "si me bajás cierro hoy", "quiero pensarlo", "¿cuánto me descontás de contado?".
   - Concesiones condicionadas dentro de pauta autorizada.
   - Prohibición de falsa urgencia, ocultamiento de defectos y secreto sobre costos y márgenes de la agencia.
3. **`ventas-permutas-financiacion-autorizaciones` (MOD-VTA-03 v1.0.0)** — *Permutas, financiación y autorizaciones*:
   - Relevamiento de 6 fotos estandarizadas y titularidad registral. Toda tasación preliminar queda sujeta a peritaje físico en taller.
   - Financiación transparente en cuotas (sistema Francés) sin promesas falsas de aprobación crediticia.
   - Regla inquebrantable de no entrega sin fondos acreditados y canal de autorizaciones del CRM.
4. **`ventas-seguimiento-entrega` (MOD-VTA-04 v1.0.0)** — *Seguimiento, coordinación y entrega*:
   - Seguimiento de valor sin spam invasivo.
   - Derivación ordenada de legajos a Gestoría y Administración sin saltar áreas.
   - Protocolo exhaustivo de entrega física con remito de conformidad y seguimiento postventa a los 7 y 30 días.

### C. Tres Módulos para Gestoría
1. **`gestoria-lectura-expediente` (MOD-GES-01 v1.0.0)** — *Lectura y organización del expediente*:
   - Personas intervinientes, acreditación de personería y asentimiento conyugal (Art. 470 CCyC).
   - Identificación de la unidad (dominio, chasis, motor).
   - Estados documentales en el CRM: Pendiente, Recibido, Revisado y Observado.
2. **`gestoria-control-faltantes` (MOD-GES-02 v1.0.0)** — *Control de consistencia y detección de faltantes*:
   - Cotejo cruzado alfanumérico entre título digital, cédula y Formulario 12 policial.
   - Análisis de informes de dominio: prendas activas (cancelación 03/24), embargos e inhibiciones generales de bienes.
   - Verificación de legibilidad y legalización de escribanos en extraña jurisdicción.
3. **`gestoria-transferencias-coordinacion` (MOD-GES-03 v1.0.0)** — *Seguimiento, transferencias y coordinación de entrega*:
   - Trámites en DNRPA (SITE), liquidación de sellados provinciales (DGR Chubut).
   - Gestión y subsanación de vistas/observaciones en menos de 24 horas.
   - Regla de oro: emisión de la "Liberación Registral para Entrega" únicamente con constancia oficial fehaciente.

### D. Tres Módulos para Administración y Facturación
1. **`admin-preparacion-validacion` (MOD-ADM-01 v1.0.0)** — *Preparación y validación de datos*:
   - Diferenciación estricta entre borrador cargado en CRM, documento preparado y comprobante fiscal emitido con CAE en ARCA/AFIP.
   - Matriz oficial de comprobantes ARCA (Ley 27.618 y RG 5003): Emisor Responsable Inscripto → Receptor Responsable Inscripto o Monotributista (Factura A con leyenda y subtipo habilitado); Receptor Consumidor Final o Exento (Factura B); Emisor Monotributista (Factura C).
   - Régimen de consignaciones (facturación de comisión por cuenta y orden de terceros) vs venta de stock propio.
2. **`admin-cobros-comprobantes` (MOD-ADM-02 v1.0.0)** — *Cobros, comprobantes e imputaciones*:
   - Regla de Oro: Un ticket o captura de pantalla de transferencia de WhatsApp NO es un cobro.
   - Acreditación bancaria efectiva e indisponible en el extracto oficial antes de validar cualquier cobro o entrega.
   - Prevención de fraudes con transferencias programadas canceladas o cheques sin fondos.
3. **`admin-observaciones-contador` (MOD-ADM-03 v1.0.0)** — *Observaciones, correcciones y consulta al contador*:
   - Trazabilidad y auditoría inalterable de ajustes contables; prohibición de modificaciones de palabra.
   - Circuito de emisión de Notas de Crédito / Débito con CAE.
   - Protocolo estructurado de 4 puntos para elevar consultas al Contador Público externo con respaldo suficiente.

---

### Seis Casos Prácticos Completos y Simulaciones Interactivas
1. **Caso 1 (Ventas)**: *Hilux SRX vs. otra agencia (cliente que considera caro el vehículo)*:
   - Dilema: Cliente compara con unidad supuestamente más barata en Trelew y exige rebaja no autorizada.
   - Opciones: Ceder de palabra (riesgo grave), agredir a la competencia, o indagar costos de cubiertas/traslado y negociar concesión condicionada autorizada.
2. **Caso 2 (Ventas)**: *Amarok V6 y EcoSport (exigencia de sobretasación del usado y descuento)*:
   - Dilema: Cliente exige tomar permuta por encima de tabla desconociendo deuda de patentes y cubiertas gastadas.
   - Opciones: Sobrepagar la toma (destruye margen), o explicar transparentemente la planilla de peritaje y alistamiento.
3. **Caso 3 (Ventas)**: *Seña condicionada y entrega previa no autorizada*:
   - Dilema: Cliente quiere llevarse un Jeep Renegade dejando el 2% de seña bajo amenaza de no comprar.
   - Opciones: Ceder y entregar sin cobro (negligencia gravísima), o sostener firmemente el protocolo de seguridad y ofrecer reserva con alistamiento prioritario.
4. **Caso 4 (Ventas)**: *Cruze Premier (seguimiento estructurado de valor vs abandono comercial)*:
   - Dilema: Cliente analítico posterga decisión para consultar a su familia.
   - Opciones: Abandono pasivo, spam agresivo, o seguimiento de valor con video de seguridad familiar e invitación a prueba de manejo.
5. **Caso 5 (Gestoría)**: *Discrepancia en nombres y falta de asentimiento conyugal bajo presión*:
   - Dilema: Vendedor presiona para entregar Renault Duster pero el legajo tiene discordancia en DNI del comprador y falta la firma de la cónyuge en la permuta (Art. 470 CCyC).
   - Opciones: Ceder ante la presión interna, o bloquear el legajo y liderar la subsanación urgente con escribanía y registro.
6. **Caso 6 (Facturación)**: *Captura de transferencia no acreditada y alícuota errónea en borrador*:
   - Dilema: Vendedor exige facturar Factura A por $26.000.000 por una consignación con captura bancaria no acreditada para llegar al objetivo del mes.
   - Opciones: Emitir con CAE por el total sin plata (fraude y quiebra fiscal), o frenar la entrega, conciliar el extracto bancario y encuadrar la factura solo sobre la comisión de consignación.

---

## 3. Matriz de Recorridos y Separación de Permisos

| Rol en CRM | Perfil Operativo | Recorrido Formativo Asignado | Alcance de Capacitación | Permisos Operativos Reales |
|---|---|---|---|---|
| `ventas` | Vendedor con altas autorizadas | **Recorrido Vendedores** | 5 módulos (común + 4 ventas), 4 casos prácticos, tutor comercial y aprender del error | Negociación, Clientes, Oportunidades, Mis Ventas. Altas requieren aprobación del Propietario. **Sin acceso a Caja, Finanzas ni inventario completo**. |
| `gestoria_contabilidad` | Gestoría / Contabilidad | **Recorrido Gestoría** | 4 módulos (común + 3 gestoría), caso práctico de legajos, tutor registral y aprender del error | Expedientes, Trámites, Facturación / ARCA, Clientes. **Sin acceso a Caja ni Finanzas generales**. |
| `administrativo` | Administrativo general | **Recorrido Administración y Facturación** | 4 módulos (común + 3 admin), caso práctico de conciliación/consignación, tutor y aprender del error | Caja, Cuotas, Cobranzas, Trámites administrativos previos. |
| `owner` / `admin` | Propietario / Administrador | **Panel de Gestión de Capacitación** + Catálogo Completo | Supervisión de los 11 módulos, asignación de recorridos a colaboradores, revisión de reflexiones compartidas | Acceso total al CRM, aprobación de altas y supervisión formativa. |

> [!IMPORTANT]
> **Separación Estricta entre Aprendizaje y Permisos**:
> Completar el 100% de los módulos o aprobar las simulaciones acredita competencia educativa y práctica, pero **no altera los permisos operativos en el servidor** ni abre rutas restringidas a otros roles.

---

## 4. Tutor, Progreso, Supervisión y "Aprender del Error"

1. **Tutor de Capacitación Integrado**:
   - Conmutador entre *Procedimientos por Rol* (operativo) y *Conceptos Financieros* (matemático/financiero).
   - Base de conocimientos estructurada con procedimientos codificados (`PROC-VTA-01`, `PROC-VTA-02`, `PROC-GES-01`, `PROC-ADM-01`, `PROC-ADM-02`).
   - Cita textual de fuentes y versiones oficiales vigentes.
   - Consultas rápidas para preguntas clave (objeción de precio, objeción de toma, checklist de expedientes, transferencias pendientes).
   - **Aislamiento de seguridad**: No accede a costos de inventario, márgenes reales, contraseñas bancarias ni cuentas de tesorería.

2. **"Aprender del Error"**:
   - Sección dedicada bajo `/admin/academy/aprender-del-error`.
   - Formulario guiado en 5 pasos obligatorios:
     1. ¿Qué pasó y qué intentabas lograr?
     2. ¿Qué información tenías y qué faltaba?
     3. ¿Qué podrías haber hecho de otra manera?
     4. ¿Qué criterio o procedimiento te puede ayudar?
     5. ¿Qué vas a practicar y cómo comprobarás la mejora?
   - Seguimiento de planes de mejora con estado (*En práctica* / *Completado*) y fecha límite.
   - **Privacidad estricta**: Guardado local aislado por `learnerId`. Casilla de consentimiento voluntario para compartir con el Propietario/Dirección. Las reflexiones privadas no aparecen en reportes grupales.

3. **Mi Progreso**:
   - Desglose triple observable:
     1. *Contenido recorrido*: porcentaje de módulos leídos.
     2. *Prácticas realizadas*: cantidad de simulaciones intentadas.
     3. *Competencia demostrada*: porcentaje de aciertos en preguntas situacionales y casos aprobados (score >= 70).
   - Sección de "Temas para reforzar" con enlaces directos a módulos pendientes.
   - Explicación de privacidad transparente al alumno.

4. **Gestión de Capacitación (Propietario / Dirección)**:
   - Sección exclusiva para `owner` y `admin` bajo `/admin/academy/gestion`.
   - Asignación de recorridos por colaborador.
   - Envío de recomendaciones formativas específicas.
   - Visor de reflexiones compartidas voluntariamente por los miembros del equipo.
   - Tabla de auditoría de versiones de contenidos y control de necesidad de validación profesional externa.

---

## 5. Comandos y Resultados de Pruebas Ejecutadas

### Ejecución de Pruebas Unitarias de Academy
```powershell
$env:PATH = "C:\Users\Tomas\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\Tomas\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;" + $env:PATH
node --test tests/academy*.test.js
```
**Resultado**:
```text
✔ Academy expone ocho cursos únicos y seis destinos de navegación (22.4ms)
✔ Los ocho cursos contienen tres lecciones, glosario y ejercicios corregibles (2.0ms)
✔ 40 preguntas cubren todos los cursos, formatos y tres niveles (3.7ms)
✔ Corrección completa, parcial, equivocada e incompleta (0.7ms)
✔ Parser decimal único: admite coma/punto y rechaza prefijos (2.8ms)
✔ Cronograma estable: uniformidad, cierre, conservación y recurrencia (22.8ms)
✔ Estados económicos válidos se distinguen de entradas inválidas (0.8ms)
✔ Descuento bruto y diferencia neta de espera tienen bases explícitas (1.4ms)
✔ Seis escenarios ofrecen alternativas explícitas con ventajas y riesgos (9.0ms)
✔ Escenarios conservan relaciones económicas y muestran el faltante intermedio (0.1ms)
✔ Casos de práctica: 25 resultados contrastados con operaciones independientes (7.9ms)
✔ 24 variantes de examen independientes de práctica y resueltas con oráculos propios (1.0ms)
✔ Concurrencia: dos pestañas conservan ambas lecciones e historiales (30.7ms)
✔ Reset serializado invalida escrituras pendientes y no afecta otro usuario (18.4ms)
✔ Migración local conserva v1; corrupción requiere reset explícito y se informan fallos (0.4ms)
✔ Normaliza historial y enlaces sin campos ajenos al aprendizaje (0.2ms)
✔ Academy expone exactamente once módulos completos distribuidos por rol (5.7ms)
✔ Cada uno de los 11 módulos contiene todos los campos obligatorios y al menos 3 preguntas situacionales con devolución (0.5ms)
✔ Academy expone exactamente seis casos prácticos completos con rúbrica explícita (0.7ms)
✔ Tutor de procedimientos responde las cuatro consultas obligatorias citando fuentes y versiones oficiales (0.3ms)
✔ Aprender del error estructura las cinco preguntas y garantiza privacidad predeterminada (0.6ms)
✔ SummarizeRoleProgress calcula el avance triple: módulos, prácticas y competencias (0.3ms)
✔ Role Tracks y navegación de Academy mapean correctamente según roles (0.4ms)
✔ 16 simuladores producen resultados finitos y rechazan campos vacíos o inválidos (27.4ms)
✔ Margen, retorno y ROI utilizan sus denominadores respectivos (0.2ms)
✔ Rotación al costo y oportunidad para el mismo horizonte (0.1ms)
✔ Intereses, conversión de tasas, inflación y valor presente (0.2ms)
✔ Sistema francés conserva principal, liquida saldo y cumple recurrencia (0.3ms)
✔ Caja, descuentos, permutas y recuperación muestran pérdidas y reservas (1.6ms)
✔ Asignación respeta capital disponible y contempla reserva sin rendimiento (0.1ms)
✔ Tutor responde las cuatro preguntas de cada lección con fuente y sin IA (2.2ms)

ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
```

### Ejecución de Pruebas de Permisos y Prevención de Regresiones del CRM
```powershell
node tests/managedRolePermissions.test.js
node tests/sellerAccessCache.test.js
node tests/vehiclePlate.test.js
node tests/capitalHistoryPermissions.test.js
node tests/stockNegotiationPermissions.test.js
node scripts/validate-codebase.js
```
**Resultado**:
```text
PASS: 2 restricted profiles expose requested modules, retain approval separation and legacy roles, and enforce route/inventory limits with custom permissions.
PASS: previous shared cache removed; internal APIs never use offline cache fallback.
PASS: plate normalization preserves existing identifiers, and invoice/plate permissions remain scoped with broad custom grants.
PASS: monthly agency capital is owner-only in permission checks, navigation and role details, including custom broad grants.
PASS: seller route caps, home, inventory restrictions and negotiation-only grants remain enforced with custom permissions.
Successfully parsed 95 permissions from adminPermissions.js
Checked 665 files.
✅ All validations passed!
```

---

## 6. Instrucciones de Ejecución y Configuración

1. **Variables de Entorno**: No se requieren variables de entorno nuevas ni claves secretas para la ejecución local de Academy.
2. **Ejecución Local**:
   ```powershell
   npm run dev
   # o
   npm run start
   ```
3. **Acceso a Academy**:
   - Navegación directa: `http://localhost:3000/admin/academy`
   - O desde el sidebar del CRM bajo **PRINCIPAL → Academy 🎓**.
4. **Ejecución de la Suite de Pruebas de Academy**:
   ```powershell
   npm run test:academy
   ```

---

## 8. AutoSporting Academy 2.0: Negociación con IA, Persistencia en Backend y Capacitación Avanzada

### A. Persistencia Real en Base de Datos (MongoDB) y Privacidad Estricta
Se incorporó el modelo Mongoose `AcademyProgress` (`src/models/AcademyProgress.js`) y el servicio de backend `academyProgressService.js` para asegurar que el avance de cada colaborador esté asociado a su identificador de usuario del CRM y sea accesible de manera persistente desde cualquier dispositivo:
1. **Datos Persistidos**: Cursos financieros y lecciones completadas, módulos de rol completados, intentos de evaluación, simulaciones realizadas, sesiones de negociación con IA (mensajes y reporte de evaluación), y reflexiones de "Aprender del error".
2. **Aislamiento y Regla Inquebrantable de Privacidad**:
   - Cada usuario solo accede a su propio progreso (`GET /api/admin/academy/progress`).
   - Las reflexiones personales de "Aprender del error" permanecen estrictamente privadas por defecto (`sharedWithSupervisor: false`).
   - El endpoint de supervisión de dirección (`GET /api/admin/academy/supervision/team`) filtra automáticamente las reflexiones, exponiendo única y exclusivamente aquellas que el empleado haya marcado de manera voluntaria y expresa como `sharedWithSupervisor: true`.
   - El progreso educativo no concede permisos operativos del CRM ni altera salarios o condiciones laborales.

### B. Simulador de Negociación con IA (8 Escenarios y 6 Competencias Ponderadas)
Se implementó el espacio **Entrenamiento de negociación** (`/admin/academy/negociacion`), con interfaz interactiva libre (chat de texto natural, sin opciones múltiples predeterminadas):
1. **8 Escenarios de Negociación**:
   - `desc-01`: *Cliente que pide descuento inmediato* (Guillermo Morales / Toyota Corolla 2022). Nivel principiante.
   - `toma-02`: *Cliente que exige mayor toma por su permuta* (Patricia Rossi / VW Amarok V6 y Ford EcoSport). Nivel intermedio.
   - `inde-03`: *Cliente indeciso que pospone la decisión* (Martín Benítez / Chevrolet Cruze 2020). Nivel principiante.
   - `comp-04`: *Cliente que compara con otra agencia* (Claudio Mansilla / Jeep Renegade 2021). Nivel intermedio.
   - `fina-05`: *Cliente que quiere financiar sin requisitos* (Lorena Paredes / Renault Kangoo Stepway). Nivel intermedio.
   - `difi-06`: *Cliente difícil o altamente exigente* (Héctor Cárdenas / Toyota Hilux 2020). Nivel avanzado.
   - `sena-07`: *Cliente que quiere señar de palabra o con términos no autorizados* (Valeria Soria / Peugeot 208 Feline). Nivel intermedio.
   - `inte-08`: *Negociación integral compleja: precio, permuta, cuotas y entrega* (Carlos Albarracín / Ford Ranger y VW Gol Trend). Nivel avanzado.
2. **Separación de Roles IA**:
   - **Buyer Agent**: Interpreta al comprador manteniendo personalidad patagónica, objeciones y presupuesto oculto sin revelar información secreta del escenario.
   - **Evaluador Independiente**: Analiza la conversación una vez finalizada y califica las 6 competencias según sus pesos exactos:
     - Identificación de necesidades y diagnóstico (20%)
     - Comunicación y claridad profesional (15%)
     - Argumentación comercial y defensa de valor (20%)
     - Manejo constructivo de objeciones (20%)
     - Negociación y respeto a los límites de autorización (15%)
     - Cierre o definición de próximo paso concreto (10%)
   - **Reporte Posterior**: Estado del resultado (`acuerdo_cerrado`, `seguimiento_agendado`, `desistido_con_criterio`, `sin_acuerdo_error_grave`), fortalezas, áreas de mejora, momentos clave con citas textuales y frases alternativas recomendadas, y botón de transferencia directa a "Aprender del error".

### C. Tutor Comercial con IA Ampliado y Protección de Confidencialidad
El servicio `academyAIService.js` provee respuestas pedagógicas basadas en los procedimientos institucionales `PROC-*`:
- Responde consultas operativas sobre señas, permutas, gestoría registral y facturación.
- Bloquea activamente cualquier intento de consultar costos de compra, márgenes de ganancia del propietario, saldos de tesorería o claves privadas (`policy_guard`).

### D. Casos Prácticos Avanzados de Gestoría y Facturación
Se incorporaron dos simulaciones interactivas guiadas adicionales (`ALL_ROLE_SIMULATIONS`):
- `sim-ges-02`: *Embargo latente en informe de dominio e inhibición a 24 hs de la entrega*. Aplicación de `PROC-GES-02`, bloqueo de entrega física y articulación con Dirección y Legales.
- `sim-adm-02`: *Retención de IIBB Chubut no acreditada, saldo dispar y consulta al contador*. Exigencia de certificados oficiales de retención y consulta contable obligatoria sin regalar margen de la agencia.

### E. Conexión Segura con IA y Control de Costos
- Opera por defecto con un **Adaptador Pedagógico Simulado de alta fidelidad** que asegura funcionamiento ininterrumpido sin costo alguno de API externa (`provider: 'simulated'`).
- Conexión real con OpenAI opcional y controlada mediante `ACADEMY_OPENAI_API_KEY` (o `OPENAI_API_KEY` con `ACADEMY_AI_ENABLED=true`).
- Límite estricto de seguridad: máximo 15 turnos por sesión y topes de tokens en respuestas (250 tokens para el comprador y 900 tokens para la evaluación).

### F. Verificación Integral de Pruebas
- Total de pruebas automáticas de Academy ejecutadas: **48 pruebas** (100% pasando).
- Pruebas del núcleo del CRM y permisos de acceso: **5 suites ejecutadas** (100% pasando).
- Validación del repositorio: **671 archivos auditados**, 95 permisos verificados, 0 inconsistencias.

---

## 9. Informe de Validación Final y Auditoría de Seguridad (Candidato a Revisión)

### 1. Estado Inicial Encontrado
- **Rama**: `feature/academy-role-training`
- **Commit Inicial**: `e7c91da`
- **Rutas verificadas**: `/admin/academy`, `/admin/academy/negociacion`, `/admin/academy/aprender`, `/admin/academy/practicar`, `/admin/academy/aprender-del-error`, `/admin/academy/progreso`, `/admin/academy/gestion`.

### 2. Defectos Detectados y Mitigados
1. **Riesgo de Activación No Autorizada de OpenAI**: La función de verificación permitía el fallback hacia `OPENAI_API_KEY` del CRM general.
   - *Corrección*: Se eliminó todo fallback. Se implementó triple candado estricto: requiere obligatoriamente `ACADEMY_OPENAI_API_KEY`, `ACADEMY_AI_ENABLED === 'true'` y `ACADEMY_AI_BUDGET_USD > 0`. Sin estos 3 elementos, permanece 100% en modo simulado.
2. **Rehidratación Multidispositivo en Cliente**: Al iniciar sesión en un dispositivo nuevo B, `AcademyProgressProvider` no incorporaba al estado local las reflexiones guardadas en MongoDB.
   - *Corrección*: Se añadió la rehidratación y mezcla segura de reflexiones y actividades recomendadas en `AcademyProgressProvider.jsx`.
3. **Visibilidad de Casos Prácticos en UI**: `AcademyPracticar.jsx` importaba los 6 casos canónicos originales, omitiendo los 2 casos avanzados (`sim-ges-02` y `sim-adm-02`).
   - *Corrección*: Se actualizó a `ALL_ROLE_SIMULATIONS`, haciendo disponibles los 8 casos en la interfaz.
4. **Alerta de Material en Revisión Profesional**: Los módulos de Gestoría y Administración no mostraban en pantalla la advertencia obligatoria de revisión legal/fiscal.
   - *Corrección*: Se agregó un banner destacado de advertencia cuando `requiresProfessionalValidation === true` en `AcademyAprender.jsx`.
5. **Defensa en Profundidad en Endpoints de Supervisión**:
   - *Corrección*: Se agregó el middleware de Express `requireSupervisor` en `academyRoutes.js` retornando HTTP 403 inmediato ante cualquier llamado de un vendedor o gestor a `/supervision/*`.
6. **Robustecimiento del Filtro Antifiltración Financiera**:
   - *Corrección*: Se amplió `checkConfidentialityPolicy` con expresiones regulares exhaustivas para bloquear consultas complejas sobre caja fuerte, saldos de tesorería y sueldos de compañeros.

### 3. Matriz de Permisos Verificada

| Perfil / Rol | Acceso a Mi Capacitación | Completar Módulos y Negociar | Aprender del Error (Privado) | Acceso a Supervisión (`/gestion`) | Endpoints de Dirección (`/supervision/*`) | Acceso a Finanzas del CRM |
|---|---|---|---|---|---|---|
| **Owner / Admin** | Sí (Recorrido Ventas / Todos) | Sí | Sí | **Habilitado** (ve solo compartidas) | **Habilitado** (HTTP 200) | Según permisos CRM |
| **Vendedor** | Sí (Recorrido Ventas) | Sí | Sí (100% privado) | **Bloqueado** (Oculto en UI + pantalla bloqueo) | **Rechazado** (HTTP 403 Forbidden) | **Bloqueado** |
| **Gestoría** | Sí (Recorrido Gestoría) | Sí | Sí (100% privado) | **Bloqueado** | **Rechazado** (HTTP 403 Forbidden) | **Bloqueado** |
| **Administración** | Sí (Recorrido Administración)| Sí | Sí (100% privado) | **Bloqueado** | **Rechazado** (HTTP 403 Forbidden) | **Bloqueado** |

### 4. Estado de Conexión Real con OpenAI
- **Estado Actual**: **Deshabilitada de manera segura (Modo Simulado Activo)**.
- **Motivo**: No se han configurado `ACADEMY_OPENAI_API_KEY` ni `ACADEMY_AI_BUDGET_USD` en el entorno, preservando el cupo financiero de Codex y evitando facturación.
- **Para Habilitar a Futuro**: La dirección debe definir una clave API dedicada exclusiva para Academy y fijar un presupuesto máximo aprobado (ej. `ACADEMY_AI_BUDGET_USD=10.00`).

### 5. Veredicto Final
**GO PARA REVISIÓN VISUAL DEL PROPIETARIO**  
La plataforma cumple con la integridad pedagógica, la seguridad técnica, el aislamiento de roles y la fidelidad visual de AutoSporting. No debe desplegarse en producción hasta que el propietario la revise y apruebe localmente.

---

## 10. Correcciones Finales de Seguridad, Presupuesto Persistente, Cuotas y Evaluación Contextual

### 1. Presupuesto Persistente de OpenAI (`AcademyBudget` y `academyBudgetService.js`)
- **Independencia Total de Codex**: El sistema de presupuestos opera con su propio modelo y colección `AcademyBudget` en MongoDB, sin compartir saldo ni colisionar con el cupo de USD 1 asignado al piloto financiero de Codex.
- **Identificador Estable**: Mantiene el identificador `academy-primary`.
- **Saldo Autorizado por Defecto**: Estricta regla de seguridad: el presupuesto autorizado inicial es de **$0.00 USD** (nunca un importe positivo por defecto). Requiere configuración explícita por variable `ACADEMY_AI_BUDGET_USD` o mediante el panel de dirección.
- **Ciclo Transaccional de Reserva y Liquidación**:
  1. *Reserva Atómica Previa*: Antes de invocar a OpenAI (`buyer`, `evaluator` o `tutor`), el servicio reserva atómicamente el costo máximo estimado (`reservedUSD`). Si `availableUSD < estimatedCost`, deniega la llamada externa y deriva automáticamente al motor pedagógico simulado.
  2. *Liquidación Exitosa (`success`)*: Libera la reserva y suma el consumo confirmado en `confirmedSpentUSD`, calculando el importe exacto en base a los tokens de entrada y salida consumidos.
  3. *Manejo de Timeouts y Errores Inciertos (`uncertain`)*: Si la petición a OpenAI aborta por timeout (12 segundos) o respuesta interrumpida, la reserva se libera y el costo estimado se traslada a `uncertainSpentUSD`, preservando la exactitud del saldo disponible sin subestimar el consumo real del proveedor.
  4. *Fallback Seguro*: Si el saldo se agota o la IA está deshabilitada, el sistema continúa operando al 100% mediante el adaptador formativo local.

### 2. Control de Cuotas de Consumo por Empleado (`USER_QUOTA_LIMITS`)
Para prevenir abusos o consumo desmedido de tokens:
- **Máximo de Sesiones por Día**: 10 prácticas de negociación diarias por usuario.
- **Máximo de Consultas al Tutor por Día**: 20 consultas diarias por usuario.
- **Concurrencia por Usuario**: Máximo 1 solicitud en procesamiento simultáneo por usuario (candado anti-doble clic o envíos concurrentes).
- **Límites de Entrada y Salida**: Textos de usuario recortados a 500 caracteres como máximo; tokens de respuesta acotados (250 tokens para el comprador simulado, 300 para el tutor, 900 para la evaluación).
- **Mensaje Claro y Continuidad**: Al alcanzar el límite diario, se le presenta al empleado un mensaje explicativo cordial sin interrumpir su práctica, derivando la sesión al motor pedagógico simulado.

### 3. Sincronización Segura Multidispositivo y Aislamiento Multiusuario
- **Unión de Lecciones y Módulos**: Al alternar entre dispositivos (computadora de la agencia y teléfono móvil), el estado se concilia realizando la unión matemática (Set) de las lecciones financieras y módulos de rol completados.
- **Mejor Calificación en Simulaciones**: En caso de conflicto de puntajes en una misma simulación, se preserva automáticamente la calificación más alta obtenida por el empleado.
- **Preservación de Ediciones Concurrentes en Aprender del Error**: Si dos dispositivos modificaron una misma reflexión privada, el sistema concilia ambas conservando la versión con mayor contenido y desarrollo, sin descartar texto ni observaciones del empleado.
- **Autoridad Absoluta del Servidor sobre Asignaciones del Supervisor**: Las directivas del Propietario (`assignedTrack` y `recommendedActivities`) residen en el backend y tienen autoridad inmutable; las sincronizaciones desde dispositivos locales no pueden degradar ni sobreescribir la asignación formativa dictada por la dirección.
- **Aislamiento Estricto al Cambiar de Usuario en Navegador Compartido**: Al cerrar sesión o ingresar con otra cuenta en la misma terminal, el contenedor `LearnerProgress` está indexado por `learnerId`, forzando el desmontaje completo del estado en memoria y utilizando claves de `localStorage` estrictamente aisladas (`autosporting.academy.v1:<learnerId>`). Ningún empleado hereda el avance, notas o reflexiones del usuario previo.

### 4. Evaluador Contextual de Negociaciones y Calificaciones Ajustadas
El evaluador independiente analiza el contexto integral de la interacción comercial:
- **Rechazo Justificado con Criterio Comercial (`desistido_con_criterio`)**: Si el vendedor diagnosticó las necesidades del cliente, explicó por qué no puede acceder a una rebaja desmedida (defendiendo el margen de la agencia y el historial de la unidad) y ofreció alternativas viables dentro de pautas, la evaluación reconoce este criterio comercial con una **calificación alta (80 a 95 puntos)**. Desistir de un mal negocio no se penaliza como fracaso.
- **Rechazo Injustificado o Prematuro (`desistido_injustificado`)**: Si el vendedor clausuró la negociación de plano sin diagnosticar las inquietudes del cliente, sin fundamentar el valor de la unidad y sin proponer opciones, recibe una **calificación menor (<= 65 puntos)**.
- **Faltas Graves Institucionales (`sin_acuerdo_error_grave`)**: Si el vendedor promete entrega física sin transferencia registral ingresada, solicita cobro o seña a una cuenta/alias personal de Mercado Pago, o garantiza créditos bancarios a sola firma sin análisis de scoring, la práctica queda **terminantemente desaprobada (<= 40 puntos)**, con independencia de la cortesía empleada.
- **Transparencia y Citas Textuales**: El informe formativo desglosa las 6 competencias ponderadas, cita fragmentos textuales de la conversación que fundamentan cada nota y exhibe el aviso institucional expreso de que el modo simulado constituye una orientación pedagógica heurística.

### 5. Interfaz de Gestión Presupuestaria para el Propietario
- En `/admin/academy/gestion`, la dirección cuenta con un panel visual que detalla en tiempo real:
  - Saldo Autorizado USD.
  - Consumo Confirmado USD.
  - Consumo Incierto USD (por peticiones abortadas/timeouts).
  - Saldo Disponible USD.
  - Tokens totales consumidos.
  - Formulario ágil para ajustar el presupuesto autorizado mediante `POST /api/admin/academy/budget/configure`.

### 6. Matriz de Resultados de Pruebas Automatizadas

| Suite de Pruebas | Archivo | Pruebas | Estado |
|---|---|:---:|:---:|
| **Hardening Final Academy 2.0** | `tests/academy2FinalHarden.test.js` | 12 | **100% PASS** |
| **Integración y Gobernanza** | `tests/academy2.integration.test.js` | 9 | **100% PASS** |
| **Validación Final de Seguridad** | `tests/academyValidationFinal.test.js` | 7 | **100% PASS** |
| **Módulos de Rol y Simulador** | `tests/academyRoleTraining.test.js` | 7 | **100% PASS** |
| **Backend y Privacidad** | `tests/academyBackend.test.js` | 3 | **100% PASS** |
| **Currículum y Evaluaciones** | `tests/academyAssessments.test.js` | 2 | **100% PASS** |
| **Simuladores Financieros** | `tests/academySimulators.test.js` | 7 | **100% PASS** |
| **Persistencia Local y Web Locks** | `tests/academyProgress.test.js` | 4 | **100% PASS** |
| **Decisiones y Práctica** | `tests/academyDecisions.test.js` | 3 | **100% PASS** |
| **Tutor Local** | `tests/academyTutor.test.js` | 1 | **100% PASS** |
| **Estructura General** | `tests/academy.test.js` | 5 | **100% PASS** |
| **Total Pruebas Academy** | | **60** | **100% PASS** |
| **Permisos de Roles CRM** | `tests/managedRolePermissions.test.js` | 1 | **100% PASS** |
| **Aislamiento de Caché Vendedor** | `tests/sellerAccessCache.test.js` | 1 | **100% PASS** |
| **Normalización de Patentes** | `tests/vehiclePlate.test.js` | 1 | **100% PASS** |
| **Permisos de Capital de Agencia** | `tests/capitalHistoryPermissions.test.js` | 1 | **100% PASS** |
| **Permisos de Stock y Negociación** | `tests/stockNegotiationPermissions.test.js` | 1 | **100% PASS** |
| **Auditoría de Código y Permisos** | `scripts/validate-codebase.js` | 673 archivos | **100% PASS** |



1. **Contenidos con Validación Profesional Pendiente**:
   - Módulos de Gestoría (`MOD-GES-01`, `MOD-GES-02`, `MOD-GES-03`): Las referencias normativas a aranceles de DNRPA, Formulario 12 y sellados de DGR Chubut reflejan la normativa vigente a noviembre de 2026. Requieren revisión periódica ante circulares de la Dirección Nacional de los Registros de la Propiedad Automotor.
   - Módulos de Administración (`MOD-ADM-01`, `MOD-ADM-02`, `MOD-ADM-03`): El tratamiento fiscal de comisiones por consignación e Ingresos Brutos debe contrastarse con el criterio del Contador Público matriculado de AutoSporting.
2. **Capacidades Pendientes de Conexión de IA**:
   - El tutor opera en modo determinístico estructurado local (`kind: 'structured'`). No realiza llamadas a APIs externas de OpenAI, Gemini ni Anthropic, preservando la confidencialidad absoluta de la empresa y evitando costos imprevistos de tokens.
3. **Persistencia**:
   - El avance educativo se resguarda en `localStorage` con serialización Web Locks por identificador del usuario conectado (`learnerId`). No se ha creado un modelo MongoDB en producción para almacenar respuestas educativas, evitando migraciones en bases de datos existentes.
