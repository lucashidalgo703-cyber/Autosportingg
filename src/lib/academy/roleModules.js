// src/lib/academy/roleModules.js
// AutoSporting Academy — 11 Módulos de Capacitación Práctica por Rol
// Agencia de vehículos en Comodoro Rivadavia, Chubut

export const MODULE_STATUS = {
    PUBLISHED: 'publicado',
    IN_REVIEW: 'en_revision',
    DRAFT: 'borrador'
};

export const MODULE_ROLES = {
    COMUN: 'comun',
    VENTAS: 'ventas',
    GESTORIA: 'gestoria',
    ADMINISTRACION: 'administracion'
};

export const ROLE_MODULES = [
    // =========================================================================
    // A. MÓDULO COMÚN: Cómo trabajamos en AutoSporting
    // =========================================================================
    {
        id: 'comun-trabajo',
        code: 'MOD-COM-01',
        version: '1.0.0',
        title: 'Cómo trabajamos en AutoSporting',
        role: MODULE_ROLES.COMUN,
        roleLabel: 'Común (Todos los roles)',
        status: MODULE_STATUS.PUBLISHED,
        reviewDate: '2026-11-20',
        durationMinutes: 8,
        sources: ['Manual Operativo AutoSporting v2.4', 'Ley 25.326 Protección de Datos Personales', 'Protocolo de Autorizaciones Internas'],
        requiresProfessionalValidation: false,
        validationNote: 'Procedimiento operativo interno aprobado por Dirección.',
        objective: 'Comprender el circuito integral de una operación automotriz en AutoSporting, las responsabilidades de cada área, el registro fidedigno en el CRM y los momentos exactos en que se requiere solicitar autorización.',
        importance: 'En una agencia automotriz, la descoordinación entre Ventas, Gestoría y Administración genera promesas incumplidas al cliente, riesgos registrales y pérdidas económicas. Conocer el flujo y usar el CRM responsablemente protege la reputación de la agencia y la seguridad de cada colaborador.',
        explanation: `Una operación en AutoSporting sigue un circuito estricto de 6 etapas:
1. Prospección y primer contacto: Se indagan necesidades y se carga la oportunidad en el CRM con datos comprobables.
2. Negociación y cotización: Se presenta la propuesta de valor. Si hay permuta, se solicita peritaje técnico; si hay seña o condición especial, se pide autorización previa.
3. Seña / Reserva formal: Se emite recibo oficial provisorio solo cuando el dinero ingresa o la seña es autorizada.
4. Expediente de Gestoría: Gestoría audita título, verificación policial (F12), inhibiciones, multas e impuestos antes de dar curso a la transferencia.
5. Validación administrativa y facturación: Administración constata acreditación bancaria real en extracto y emite la factura electrónica correspondiente en ARCA/AFIP.
6. Coordinación y Entrega: Se coordina día y hora solo con documentación y fondos 100% verificados, realizando checklist de entrega con el cliente.

Reglas fundamentales de trabajo:
- Diferencia entre DATO CONFIRMADO, SUPUESTO y PROMESA: Nunca transformes una suposición ("el dueño anterior me dijo que no debe patentes") en una promesa al cliente ("te lo entrego sin deuda"). Solo se promete lo verificado documentalmente.
- Comunicación de pendientes: Todo pendiente debe registrarse en el CRM indicando: qué falta, quién es responsable, fecha límite e impacto en la entrega.
- Cuándo pedir autorización: Descuentos sobre precios publicados, tomas por encima de la tabla interna, señas condicionales y entregas previas al cierre registral requieren SIEMPRE autorización formal del Propietario en el CRM.
- Confidencialidad (Ley 25.326): DNI, recibos de sueldo, datos bancarios y números personales de clientes son confidenciales. Está prohibido compartirlos por canales no autorizados.`,
        example: `En la sucursal de Comodoro Rivadavia, el cliente Marcos se interesa por una Toyota Hilux 2021.
- Acción incorrecta: El vendedor le dice "dejame $500.000 de seña de palabra y te congelo el precio en pesos por 30 días, total la chata no tiene ninguna deuda".
- Acción correcta: El vendedor indaga uso y presupuesto, explica que las señas requieren comprobante formal y autorización del propietario si congelan precio más allá de 72 hs, registra en el CRM el interés de Marcos y solicita el informe de dominio en Gestoría antes de asegurar que la unidad está libre de gravámenes.`,
        checklist: [
            'Verificar si los datos del cliente y la unidad están completos en el CRM.',
            'Distinguir claramente en las notas qué información está confirmada por documento y cuál es solo un dicho del cliente.',
            'Si hay solicitud de precio especial o plazo extendido, cargar la solicitud de autorización en el CRM.',
            'Notificar a Gestoría en cuanto haya interés en permuta para solicitar informe registral temprano.',
            'Nunca prometer fecha de entrega sin el visto bueno simultáneo de Gestoría y Administración.'
        ],
        frequentErrors: [
            {
                error: 'Prometer al cliente que la unidad se entrega "mañana" antes de que Gestoría reciba el legajo completo.',
                correction: 'Informar al cliente que los plazos de entrega dependen de la confirmación registral y administrativa, brindando una estimación prudente y consensuada con las áreas.'
            },
            {
                error: 'Considerar una captura de pantalla de WhatsApp como confirmación de cobro.',
                correction: 'Derivar el comprobante a Administración y no dar por cobrada la seña hasta que Administración confirme la acreditación bancaria.'
            },
            {
                error: 'Ocultar una diferencia o problema para "no demorar la venta".',
                correction: 'Registrar la observación inmediatamente en el CRM. Los problemas detectados a tiempo se resuelven sin costo; los ocultados terminan en reclamos graves.'
            }
        ],
        practicalActivity: 'Revisá una ficha ficticia de venta en el CRM. Identificá qué datos están verificados con documentación adjunta (DNI, informe de dominio, acreditación bancaria) y cuáles son meras notas no confirmadas. Elaborá la nota de derivación a Gestoría con el contexto necesario.',
        situationalQuestions: [
            {
                id: 'comun-q1',
                question: 'Un cliente concurre a la agencia en Comodoro Rivadavia un sábado a las 12:30 hs con intención de señar un vehículo usado. Te pide que le congeles el precio por 25 días y asegura que "el lunes a primera hora transfiere el resto". ¿Qué debés hacer?',
                options: [
                    {
                        text: 'Aceptar la seña verbal y darle la palabra de que la unidad queda reservada por 25 días para no perder la venta.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Una seña verbal no tiene validez operativa ni legal en AutoSporting. Congelar el precio por 25 días sin autorización del propietario expone a la agencia a pérdidas económicas en un contexto inflacionario.'
                    },
                    {
                        text: 'Explicar las condiciones estándar de reserva de la agencia (72 hs hábiles), registrar la oferta del cliente en el CRM y cargar una solicitud de autorización al Propietario si requiere un plazo mayor.',
                        isCorrect: true,
                        feedback: '¡Correcto! Cumple con la pauta de AutoSporting: explica con claridad la política vigente, no toma compromisos no autorizados y canaliza la excepción formalmente en el sistema.'
                    },
                    {
                        text: 'Rechazar al cliente de forma tajante diciendo que en la agencia nunca se aceptan excepciones de ningún tipo.',
                        isCorrect: false,
                        feedback: 'Incorrecto. La atención comercial debe ser profesional y receptiva. Si el cliente tiene una necesidad especial, se indaga y se eleva la consulta al responsable autorizado.'
                    }
                ]
            },
            {
                id: 'comun-q2',
                question: 'Durante la carga de datos de un cliente en el CRM, el cliente te comenta al pasar que el auto que entrega en parte de pago "está a nombre de su tío que falleció el año pasado, pero hay una declaratoria de herederos en trámite". ¿Cómo registrás y procedés?',
                options: [
                    {
                        text: 'Registrarlo como "Vehículo propio del cliente listo para transferir" para que el tasador lo cotice rápido.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Ocultar el estado registral genera un grave perjuicio: el vehículo no puede transferirse de forma ordinaria y puede bloquear la operación entera.'
                    },
                    {
                        text: 'Registrar en el CRM la observación registral precisa: "Unidad en proceso sucesorio del titular registral; requiere tracto abreviado o autorización judicial", y derivar consulta a Gestoría antes de presupuestar la toma.',
                        isCorrect: true,
                        feedback: '¡Correcto! Separa el dato confirmado del supuesto y advierte el riesgo registral a tiempo a Gestoría para verificar si la operación es jurídicamente viable.'
                    },
                    {
                        text: 'Ignorar el comentario porque el trámite de sucesión es un tema privado de la familia del cliente.',
                        isCorrect: false,
                        feedback: 'Incorrecto. La titularidad registral y el poder de disposición son esenciales para transferir legalmente un vehículo en Argentina (DNRPA).'
                    }
                ]
            },
            {
                id: 'comun-q3',
                question: 'Un compañero de otra área te pide por un grupo informal de WhatsApp fotos de la cédula y DNI de un cliente para "mostrárselas a un conocido que tal vez compre un auto parecido". ¿Qué establece la política de AutoSporting?',
                options: [
                    {
                        text: 'Enviar las fotos inmediatamente porque entre compañeros de trabajo no aplican las reglas de confidencialidad.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Viola la Ley 25.326 de Protección de Datos Personales y el secreto comercial de AutoSporting.'
                    },
                    {
                        text: 'Recordar que los datos y documentos de clientes son estrictamente confidenciales, están protegidos por la Ley 25.326 y solo deben tratarse dentro de los expedientes oficiales del CRM para las operaciones autorizadas.',
                        isCorrect: true,
                        feedback: '¡Correcto! La confidencialidad y el resguardo de la información sensible son prioritarios e innegociables en AutoSporting.'
                    },
                    {
                        text: 'Enviar los datos borrando únicamente el número de trámite del DNI.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Ningún documento de cliente puede circular fuera de las finalidades legítimas y los sistemas autorizados del negocio.'
                    }
                ]
            }
        ],
        evaluationCriteria: [
            'Comprensión del flujo secuencial entre Ventas, Gestoría y Administración.',
            'Capacidad para distinguir entre datos confirmados, supuestos y compromisos.',
            'Identificación precisa de los eventos que exigen solicitar autorización en el CRM.',
            'Cumplimiento de las normas de confidencialidad y protección de datos (Ley 25.326).'
        ],
        reinforcement: 'Revisar la guía de Procedimientos Operativos Generales y el mapa de derivaciones entre sectores del CRM.'
    },

    // =========================================================================
    // B. CUATRO MÓDULOS PARA VENDEDORES
    // =========================================================================
    {
        id: 'ventas-consulta-presentacion',
        code: 'MOD-VTA-01',
        version: '1.0.0',
        title: 'Primera consulta y presentación del vehículo',
        role: MODULE_ROLES.VENTAS,
        roleLabel: 'Ventas',
        status: MODULE_STATUS.PUBLISHED,
        reviewDate: '2026-11-20',
        durationMinutes: 7,
        sources: ['Manual Comercial AutoSporting v1.8', 'Guía de Pasaporte de Unidad AutoSporting', 'Estándares de Atención al Cliente'],
        requiresProfessionalValidation: false,
        validationNote: 'Aprobado por Dirección Comercial.',
        objective: 'Aprender a realizar una indagación profunda de las necesidades del cliente (uso, presupuesto, plazos y permutas) y a presentar las unidades con información técnica y documental rigurosamente comprobada.',
        importance: 'La primera impresión define la confianza del comprador. Una presentación honesta y documentada evita devoluciones, reclamos en postventa y negociaciones conflictivas.',
        explanation: `La indagación efectiva se basa en preguntas abiertas:
1. Necesidad y uso real: "¿Qué uso principal le vas a dar al vehículo: ciudad, ruta patagónica, trabajo de campo o familiar?"
2. Presupuesto y modalidad de pago: "¿Tenés un rango de inversión definido? ¿Estás pensando en contado, financiación bancaria o tenés un vehículo para entregar en parte de pago?"
3. Plazo de decisión: "¿Para cuándo necesitás tener la unidad en marcha?"
4. Existencia de permuta: Si entrega un usado, solicitar inmediatamente marca, modelo, año, versión, kilometraje y estado documental.

Presentación del vehículo con información verificada:
- Apoyarse en el pasaporte de la unidad: kilometraje real certificado en tablero, historial de mantenimiento comprobable con facturas o libreta de servicios.
- Equipamiento y accesorios clave: verificar en persona existencia de segunda llave (o llave de presencia de repuesto), auxilio en buen estado con llanta original, cric, llave de ruedas, tuerca de seguridad y manuales de fábrica.
- Transparencia total: si el vehículo tiene un detalle estético o desgaste proporcional a su año y kilometraje, señalarlo con naturalidad. Ocultar defectos destruye la confianza cuando el cliente lo detecta en la inspección.
- Registro en CRM: Cada contacto debe quedar registrado en Oportunidades con nombre completo, teléfono verificado, unidad de interés y fecha pactada para el próximo contacto.`,
        example: `Un cliente ingresa a la agencia consultando por una Ford Ranger 2020 3.2 4x4.
- Vendedor novato: "Es un cañón, subite que te la llevás hoy mismo, está impecable sin ningún detalle".
- Vendedor profesional AutoSporting: "Es una unidad 2020 con 78.000 km reales comprobados en nuestro peritaje. Cuenta con sus dos llaves originales, auxilio sin rodar y service oficial de los 70.000 km asentado. Como podés ver en el guardabarros trasero izquierdo, tiene una marca de estacionamiento superficial que no afectó la chapa. ¿La pensás usar para carga en el campo o para viajar en ruta con la familia?".`,
        checklist: [
            'Realizar preguntas abiertas sobre uso, presupuesto, plazo y permuta antes de hablar de precios.',
            'Revisar la ficha del vehículo en el CRM y constatar kilometraje, pasaporte y detalles informados.',
            'Confirmar físicamente la existencia de segunda llave, rueda de auxilio, cric y tuerca de seguridad.',
            'Explicar el valor del peritaje técnico de AutoSporting y la garantía de documentación.',
            'Acordar siempre un próximo paso concreto con día y hora, y agendarlo en el CRM.'
        ],
        frequentErrors: [
            {
                error: 'Afirmar que el auto "tiene segunda llave" sin haberla visto físicamente en el llavero de la agencia.',
                correction: 'Verificar en el inventario o la caja de llaves antes de confirmárselo al cliente. Una llave electrónica de reposición puede costar cientos de miles de pesos.'
            },
            {
                error: 'Hablar únicamente del precio sin haber descubierto para qué necesita el vehículo el cliente.',
                correction: 'Indagar primero para entender qué valora el cliente (seguridad, consumo, capacidad de carga, reventa) y enfocar la presentación en esos beneficios.'
            },
            {
                error: 'Despedir al cliente con un vago "cualquier cosa me llamás".',
                correction: 'Pactar un próximo paso con compromiso mutuo: "¿Te parece que te envíe el video del interior mañana a las 11 hs y combinamos una prueba de manejo?".'
            }
        ],
        practicalActivity: 'Elaborá el guion de presentación para un Chevrolet Cruze 2020 disponible en stock. Incluí 3 preguntas abiertas de indagación inicial y la presentación destacando 3 virtudes comprobadas y 1 detalle de desgaste normal.',
        situationalQuestions: [
            {
                id: 'vta-pres-q1',
                question: 'Un cliente visita la agencia interesado en un SUV familiar. Durante la charla le preguntás si tiene un auto para entregar y responde: "Capaz que sí, pero primero decime cuánto vale el tuyo de contado". ¿Cómo continuás la conversación profesionalmente?',
                options: [
                    {
                        text: 'Insistir agresivamente en que no podés darle ningún precio si no te muestra ya mismo su auto.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Genera fricción y desconfianza. El cliente tiene derecho a conocer el precio publicado de nuestra unidad.'
                    },
                    {
                        text: 'Informar el precio de lista publicado de la unidad con cordialidad y continuar la indagación técnica: "El precio publicado es de $22.500.000. Para asesorarte mejor con la diferencia exacta y el número final, contame qué modelo tenés y cómo está de mantenimiento para que nuestro tasador lo revise sin compromiso".',
                        isCorrect: true,
                        feedback: '¡Correcto! Brinda la información transparente que el cliente pide, no oculta el precio y canaliza naturalmente la tasación del usado como un beneficio para calcular su esfuerzo neto.'
                    },
                    {
                        text: 'Inventarle un descuento del 15% en el acto para impresionarlo y forzar el cierre rápido.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Está estrictamente prohibido improvisar descuentos no autorizados por la dirección.'
                    }
                ]
            },
            {
                id: 'vta-pres-q2',
                question: 'El cliente te pregunta si el auto que está viendo cuenta con la segunda llave original. Al revisar la ficha del CRM no hay nota al respecto y en el llavero de guardia solo hay una llave simple. ¿Qué le decís al cliente?',
                options: [
                    {
                        text: '"Quedate tranquilo, seguro está en la caja fuerte de administración o el dueño anterior la trae el lunes".',
                        isCorrect: false,
                        feedback: 'Incorrecto. Es una promesa no verificada. Si el dueño anterior no la entrega o se perdió, la agencia deberá costearla o afrontar un conflicto comercial.'
                    },
                    {
                        text: '"En este momento contamos con una sola llave verificada. Lo registro en la ficha y voy a consultar con Administración si la segunda llave fue recibida o si el vehículo se entrega con una sola para que lo tengas 100% claro antes de decidir".',
                        isCorrect: true,
                        feedback: '¡Correcto! Respeta el principio de transparencia: informa lo que está verificado, no asume promesas y se compromete a clarificarlo formalmente.'
                    },
                    {
                        text: 'Decirle que ningún auto usado trae segunda llave en el mercado argentino.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Es falso y resta profesionalismo a los estándares de AutoSporting.'
                    }
                ]
            },
            {
                id: 'vta-pres-q3',
                question: 'Al registrar el contacto de un nuevo interesado en el CRM, ¿qué datos mínimos debés asentar obligatoriamente para cumplir con el estándar comercial de AutoSporting?',
                options: [
                    {
                        text: 'Solo el apodo y que "le gustó el auto blanco".',
                        isCorrect: false,
                        feedback: 'Incorrecto. Esa información es inútil para el seguimiento y no permite continuar la gestión comercial.'
                    },
                    {
                        text: 'Nombre y apellido, canal de contacto verificado (teléfono/email), unidad de interés específica, presupuesto estimado, si tiene permuta y el próximo contacto agendado con fecha y hora.',
                        isCorrect: true,
                        feedback: '¡Correcto! Cumple con la trazabilidad completa requerida por el CRM comercial de AutoSporting.'
                    },
                    {
                        text: 'Copiar y pegar toda la conversación de WhatsApp sin ningún orden ni resumen de requerimientos.',
                        isCorrect: false,
                        feedback: 'Incorrecto. La ficha del CRM debe contener datos estructurados y conclusiones operativas claras.'
                    }
                ]
            }
        ],
        evaluationCriteria: [
            'Habilidad para formular preguntas de indagación abiertas sin interrogar agresivamente.',
            'Presentación basada en datos comprobables (kilometraje, llaves, pasaporte de unidad).',
            'Exactitud y consistencia en el registro de oportunidades en el CRM comercial.'
        ],
        reinforcement: 'Practicar role-playing de indagación inicial con el Tutor de Academy.'
    },

    {
        id: 'ventas-negociacion-objeciones',
        code: 'MOD-VTA-02',
        version: '1.0.0',
        title: 'Negociación y manejo de objeciones',
        role: MODULE_ROLES.VENTAS,
        roleLabel: 'Ventas',
        status: MODULE_STATUS.PUBLISHED,
        reviewDate: '2026-11-20',
        durationMinutes: 9,
        sources: ['Tácticas de Negociación Automotriz AutoSporting', 'Manual Ético Comercial', 'Políticas de Precios y Márgenes'],
        requiresProfessionalValidation: false,
        validationNote: 'Aprobado por Dirección Comercial.',
        objective: 'Dominar la preparación de la negociación, el tratamiento estructurado de las 5 objeciones comerciales más comunes, la formulación de concesiones condicionadas y el estricto apego a las políticas de precios autorizadas.',
        importance: 'Ceder precio de inmediato destruye la rentabilidad del negocio y transmite inseguridad sobre el producto. Aprender a sostener el valor de AutoSporting genera respeto y acuerdos sólidos y duraderos.',
        explanation: `Preparación antes de negociar:
- Conocer la propuesta de valor de AutoSporting: garantía mecánica de motor y caja por escrito, peritaje de 120 puntos, verificación policial y libre deuda garantizados, entrega sin sorpresas, atención personalizada y agencia física radicada en Comodoro Rivadavia con trayectoria.
- Regla de oro: No revelar jamás los costos de compra de la unidad, márgenes brutos ni comisiones internas para justificar el precio. La justificación se hace por valor del producto y servicio, no por los números internos de la agencia.
- Ética inquebrantable: Prohibida la falsa urgencia ("si no señás ya me la compra otro cliente"), el ocultamiento de vicios y la presión psicológica desleal.

Las 5 objeciones típicas y su tratamiento:
1. "Está caro":
   - Preguntar antes de conceder: "¿Respecto de qué vehículo lo estás comparando? ¿Tiene el mismo año, versión, kilometraje y estado de cubiertas?".
   - Explicar la inversión realizada: cubiertas nuevas, services al día, documentación impecable. "Un auto supuestamente más barato con cuatro cubiertas gastadas y distribución pendiente te va a costar 2 millones más en el primer mes".
2. "En otra agencia me dan más por mi auto":
   - Validar con respeto: "Es excelente que tengas una cotización de referencia. ¿Te dieron ese número de palabra o te revisaron el auto en el taller? Nuestra cotización es un valor de toma concreto y garantizado para cerrar hoy, haciéndonos cargo de la transferencia y el riesgo de venta".
3. "Si me bajás el precio cierro hoy":
   - Concesión condicionada: Nunca bajar precio a cambio de nada. "El precio publicado es el valor justo de mercado. Si tu decisión es cerrar hoy de contado, lo que puedo hacer es consultar con la gerencia si podemos incluirte el service de fluidos y la transferencia bonificada en un 50%".
4. "Quiero pensarlo":
   - Descubrir la duda oculta: "Me parece perfecto que lo evalúes con tranquilidad. Para que puedas analizarlo bien, ¿qué aspecto específico del auto o de la operación te genera dudas: el valor, la financiación o el vehículo en sí?".
5. "¿Cuánto me descontás si te pago de contado?":
   - Aclarar el valor de lista: "El precio publicado ya contempla la condición de contado. Lo que podemos evaluar son facilidades en la entrega o solicitar una excepción menor si la operación se cancela en 24 horas hábiles".

Solicitud de excepciones:
Si el cliente hace una contrapropuesta fuera de las pautas estándar, se le explica: "Ese valor excede mis facultades comerciales. Si dejás una seña ad referéndum formal, presento tu propuesta al Propietario con fundamentos".`,
        example: `El cliente Roberto mira una Amarok V6 2022 y dice: "En MercadoLibre vi una igual por $2.000.000 menos, si no me la dejás a ese precio me voy a comprar la otra".
- Respuesta incorrecta: "Bueno, te bajo $1.500.000 ya mismo porque el dueño me dijo que la vendamos como sea". (Destruye margen y desautoriza a la empresa).
- Respuesta correcta: "Es comprensible que mires opciones en el mercado, Roberto. Ahora bien, esa camioneta que viste, ¿está radicada acá en Chubut o en Buenos Aires? ¿Pudiste ver el informe de dominio y el estado de los neumáticos? Nuestra unidad está acá en Comodoro, podés traer a tu mecánico de confianza ahora mismo, tiene las 4 cubiertas Michelin nuevas y te garantizamos la transferencia inmediata sin deudas sorpresas. ¿Tiene sentido arriesgar 2 millones en una compra de este volumen por una unidad que no pudiste revisar en persona?".`,
        checklist: [
            'Preguntar para precisar la comparación del cliente antes de hablar de descuentos.',
            'Explicar el valor diferencial de AutoSporting (peritaje, documentación, garantía, presencia local).',
            'Utilizar siempre concesiones condicionadas ("si hacemos X, podemos evaluar Y").',
            'No revelar jamás costos, ganancias ni información confidencial de la empresa.',
            'Canalizar pedidos de excepción mediante el sistema formal de Autorizaciones del CRM.'
        ],
        frequentErrors: [
            {
                error: 'Bajar el precio al primer "está caro" del cliente sin haber defendido el estado de la unidad.',
                correction: 'Averiguar qué compara el cliente y demostrar por qué el estado general, cubiertas y documentación justifican plenamente el valor solicitado.'
            },
            {
                error: 'Decirle al cliente: "Es que la compramos muy cara y no nos deja ganancia".',
                correction: 'Jamás hablar de los costos o ganancias de la agencia. El valor del auto depende de su condición objetiva en el mercado, no de las finanzas internas de AutoSporting.'
            },
            {
                error: 'Usar mentiras de falsa urgencia ("tengo otra persona viniendo con la plata en 10 minutos").',
                correction: 'Construir urgencia legítima basada en la escasez real de unidades en excelente estado o en la volatilidad de listas oficiales, sin inventar compradores ficticios.'
            }
        ],
        practicalActivity: 'Simulá la respuesta a un cliente que te ofrece un 10% menos de contado sobre una unidad de alta rotación. Escribí 2 preguntas de indagación previa y una contrapropuesta con concesión condicionada respetando el margen de la agencia.',
        situationalQuestions: [
            {
                id: 'vta-neg-q1',
                question: 'Un cliente interesado en un Corolla 2021 te dice: "Tengo los dólares en mano, pero quiero que me descuentes un 8% sobre el precio de lista porque en efectivo te sirve más". ¿Cuál es la respuesta comercial adecuada?',
                options: [
                    {
                        text: 'Aceptar en el acto el 8% de descuento porque "el dólar billete manda".',
                        isCorrect: false,
                        feedback: 'Incorrecto. Un descuento del 8% compromete sensiblemente el margen bruto de la operación y viola las pautas de precios de AutoSporting.'
                    },
                    {
                        text: 'Agradecer la disposición de pago al contado, explicar que el precio publicado ya está calibrado para pago al contado en moneda fuerte, y ofrecer una concesión de servicio o elevar una consulta formal si la diferencia es menor: "Nuestro precio publicado ya es de contado. Lo que podemos evaluar para premiar tu cierre inmediato es bonificarte los gastos de gestión o solicitar una atención menor autorizada por Dirección".',
                        isCorrect: true,
                        feedback: '¡Correcto! Reconoce el valor de la propuesta del cliente, defiende el precio de lista de la agencia y ofrece alternativas dentro de las facultades comerciales.'
                    },
                    {
                        text: 'Enojarse con el cliente y decirle que si no le alcanza el dinero busque un auto más viejo.',
                        isCorrect: false,
                        feedback: 'Incorrecto. La respuesta debe ser siempre empática, profesional y orientada a encontrar una solución de mutuo beneficio.'
                    }
                ]
            },
            {
                id: 'vta-neg-q2',
                question: 'Durante una negociación tensa, el cliente te exige saber a cuánto tomó AutoSporting el auto para saber "cuánto le están ganando". ¿Cómo respondés?',
                options: [
                    {
                        text: 'Mostrarle la factura de compra o la planilla de costos internos para que vea que ganan poco.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Los costos de adquisición, peritaje y márgenes de la empresa son estrictamente confidenciales y jamás deben exhibirse a terceros.'
                    },
                    {
                        text: 'Explicar con firmeza y cortesía que los costos y balances internos son información reservada de la empresa, y redirigir el foco al valor objetivo del vehículo: "Nuestros costos operativos y de adquisición son reservados, al igual que los de cualquier comercio. Lo relevante para tu tranquilidad es que esta unidad tiene peritaje mecánico aprobado, cubiertas verificadas y garantía registral completa a un valor muy competitivo de mercado".',
                        isCorrect: true,
                        feedback: '¡Correcto! Protege la confidencialidad de la agencia sin ser agresivo y vuelve a centrar la conversación en el valor del producto y la seguridad de la compra.'
                    },
                    {
                        text: 'Inventar un costo de compra falso inflado para justificar el precio.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Mentir sobre datos comerciales es una falta grave a la ética de AutoSporting.'
                    }
                ]
            },
            {
                id: 'vta-neg-q3',
                question: 'Un cliente indeciso dice "quiero pensarlo el fin de semana". Temés que se enfríe la venta. ¿Qué técnica profesional debés aplicar?',
                options: [
                    {
                        text: 'Decirle que si no señá ya, otro vendedor tiene un cliente listo para transferir en media hora.',
                        isCorrect: false,
                        feedback: 'Incorrecto. La falsa urgencia destruye la credibilidad. Si el cliente descubre que el auto sigue en stock el lunes, la relación comercial queda arruinada.'
                    },
                    {
                        text: 'Validar su decisión de pensarlo, indagar si hay alguna duda puntual no resuelta y acordar un contacto útil con fecha y hora: "Totalmente de acuerdo, es una decisión importante. Para que lo evalúes en familia, ¿te queda alguna duda sobre la financiación o el vehículo? Si te parece bien, te reservo una prueba de manejo para el lunes a las 10 hs y lo vemos juntos".',
                        isCorrect: true,
                        feedback: '¡Correcto! Respeta el tiempo del cliente, despeja objeciones no explícitas y establece un próximo paso estructurado y profesional.'
                    },
                    {
                        text: 'Cortar la charla y no volver a contactarlo porque "el que duda no compra".',
                        isCorrect: false,
                        feedback: 'Incorrecto. El seguimiento oportuno y estructurado convierte una alta proporción de ventas en el rubro automotriz.'
                    }
                ]
            }
        ],
        evaluationCriteria: [
            'Capacidad para aplicar preguntas de indagación ante objeciones de precio.',
            'Defensa de la propuesta de valor sin revelar información confidencial de costos.',
            'Uso correcto de concesiones condicionadas y apego al circuito de autorizaciones.'
        ],
        reinforcement: 'Entrenar con el Caso 1 y Caso 2 del simulador de decisiones de ventas.'
    },

    {
        id: 'ventas-permutas-financiacion-autorizaciones',
        code: 'MOD-VTA-03',
        version: '1.0.0',
        title: 'Permutas, financiación y autorizaciones',
        role: MODULE_ROLES.VENTAS,
        roleLabel: 'Ventas',
        status: MODULE_STATUS.PUBLISHED,
        reviewDate: '2026-11-20',
        durationMinutes: 8,
        sources: ['Procedimiento de Toma de Permutas PROC-VTA-03', 'Política de Créditos y Financiación Bancaria', 'Reglamento de Autorizaciones del Propietario'],
        requiresProfessionalValidation: false,
        validationNote: 'Aprobado por Dirección General y Tesorería.',
        objective: 'Aprender qué información documental y técnica reunir de una unidad ofrecida en permuta, cómo comunicar la diferencia y las cuotas de forma transparente y cómo solicitar formalmente autorizaciones en el CRM sin comprometer a la empresa.',
        importance: 'Tomar mal un auto usado o calcular erróneamente una diferencia comercial genera pérdidas directas de caja. Respetar el peritaje y las autorizaciones protege la liquidez y el capital de trabajo de AutoSporting.',
        explanation: `Circuito de toma de permuta:
1. Relevamiento inicial del vendedor:
   - Datos básicos: Marca, modelo exacto, motorización, año, kilometraje de tablero.
   - Estado documental: ¿Es titular único? ¿Está radicado en Chubut o extraña jurisdicción? ¿Tiene prenda o inhibición? ¿VTV/RTO vigente?
   - Fotografías estandarizadas en el CRM: 4 laterales en diagonal, tablero con motor en marcha (verificando ausencia de testigos de check-engine o airbag), tapizados delanteros y vano motor.
2. Peritaje técnico y valuación:
   - Toda tasación comunicada al cliente es preliminar y "sujeta a peritaje físico en taller y control de dominio por Gestoría".
   - El tasador oficial de AutoSporting evalúa: estado de cubiertas, espesor de pintura (choques previos), mecánica, tren delantero y costo de reacondicionamiento necesario para la reventa.
3. Financiación y cuotas:
   - Brindar información clara: capital a financiar, monto estimado de cuota, sistema de amortización (generalmente Francés) y costos de seguro y gastos de otorgamiento cuando corresponda.
   - Prohibido terminantemente: inventar tasas "fantasma", prometer aprobaciones crediticias que dependen del banco o financiera, o asegurar plazos que no estén validados en el sistema.

Reglas estrictas de autorización:
- Señas ad referéndum: Cualquier seña que pretenda congelar precio por más de 72 hs o que condicione la venta a la aprobación de un crédito requiere aprobación previa del Propietario.
- Descuentos y sobretasaciones: El vendedor no puede sobretasar un usado ni bajar la diferencia sin visto bueno registrado en el módulo de Autorizaciones del CRM.
- Entregas de vehículos: Ningún vehículo se entrega al cliente hasta que la permuta esté debidamente transferida o con 08 firmado y certificado, y la diferencia económica esté acreditada en las cuentas oficiales de la agencia.`,
        example: `El cliente Matías quiere comprar un Cruze 2020 entregando un Gol Trend 2017 y financiando el saldo.
- Vendedor que actúa mal: Le dice "te tomo el Gol en 10 millones de ojos cerrados y te consigo un crédito al 20% anual en 48 cuotas fijas, firmá acá".
- Vendedor AutoSporting: "Matías, según la tabla de referencia podemos estimar una toma preliminar de entre $8.500.000 y $9.000.000 para tu Gol Trend, sujeta a la revisión técnica de nuestro taller y al informe de dominio. Con esa base, la diferencia a cubrir sería de $7.500.000. Tenemos líneas bancarias con cuota fija cuyos requisitos te entrego en este folleto oficial; iniciamos la precalificación con tu DNI y recibo de sueldo sin costo".`,
        checklist: [
            'Reunir información técnica y 6 fotos claras del vehículo de permuta.',
            'Verificar titularidad registral y estado de gravámenes con el cliente.',
            'Aclarar al cliente que toda cotización es preliminar hasta la inspección técnica en taller.',
            'Explicar el desglose de la operación: toma + saldo de contado / financiado + gastos de transferencia.',
            'Cargar en el CRM la solicitud de autorización ante cualquier condición fuera de la pauta habitual.'
        ],
        frequentErrors: [
            {
                error: 'Dar un precio de toma definitivo por teléfono o WhatsApp sin que el vehículo haya pisado la agencia.',
                correction: 'Siempre brindar un rango estimado de referencia aclarando que el valor final se define con la inspección física y documental en la agencia.'
            },
            {
                error: 'Asegurar al cliente que el crédito bancario "ya está aprobado" antes de la confirmación formal de la entidad.',
                correction: 'Informar que la operación crediticia está en etapa de análisis crediticio por parte de la entidad financiera.'
            },
            {
                error: 'Aceptar una seña con condiciones exorbitantes sin consultar con el Propietario.',
                correction: 'Ingresar la oferta en el sistema de Autorizaciones del CRM y esperar la resolución del Propietario antes de firmar cualquier compromiso.'
            }
        ],
        practicalActivity: 'Confeccioná la ficha de ingreso de permuta para una Ford EcoSport 2016 con 115.000 km que adeuda $350.000 de patentes y tiene las dos cubiertas delanteras lisas. Calculá los conceptos que deben descontarse de la valuación base de mercado.',
        situationalQuestions: [
            {
                id: 'vta-perm-q1',
                question: 'Un cliente concurre a la agencia y te pide que le tases su vehículo usado por WhatsApp porque "no tiene tiempo de llevarlo a la sucursal". ¿Cómo debés actuar?',
                options: [
                    {
                        text: 'Pasarle un precio alto definitivo para que se entusiasme y venga a la agencia.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Si luego el perito baja el precio por fallas reales del auto, el cliente se sentirá engañado y se perderá la operación.'
                    },
                    {
                        text: 'Explicarle con amabilidad que para cuidar su seguridad y la de la agencia, se puede otorgar un rango estimativo de mercado, pero que el valor final requiere una inspección de 15 minutos en nuestro taller en Comodoro Rivadavia.',
                        isCorrect: true,
                        feedback: '¡Correcto! Cumple con el estándar de AutoSporting: brinda una referencia de orientación pero salvaguarda la tasación técnica obligatoria.'
                    },
                    {
                        text: 'Decirle que si no viene personalmente no le contestás nada.',
                        isCorrect: false,
                        feedback: 'Incorrecto. La atención debe ser cordial y facilitadora, invitando al cliente a acercarse.'
                    }
                ]
            },
            {
                id: 'vta-perm-q2',
                question: 'El cliente ofrece señar una unidad dejando un cheque de pago diferido a 45 días sin certificar y exige que le entregues el vehículo el mismo día del depósito del cheque. ¿Qué procedimiento corresponde?',
                options: [
                    {
                        text: 'Aceptar el cheque y entregar el vehículo inmediatamente porque un cheque es dinero en mano.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Un cheque no es dinero acreditado y a 45 días implica un riesgo crediticio enorme que viola las políticas de tesorería.'
                    },
                    {
                        text: 'Explicar que las políticas de AutoSporting no admiten entrega de unidades con pagos en diferido sin acreditar, y que toda condición especial debe elevarse mediante una solicitud de Autorización en el CRM al Propietario antes de emitir recibo.',
                        isCorrect: true,
                        feedback: '¡Correcto! Aplica la regla fundamental de no entregar unidades sin fondos acreditados y respeta el canal de autorizaciones.'
                    },
                    {
                        text: 'Romper el cheque en la cara del cliente por intentar pagar en diferido.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Se explican las condiciones con respeto y profesionalismo.'
                    }
                ]
            },
            {
                id: 'vta-perm-q3',
                question: 'Un cliente consulta por un plan de financiación en cuotas. ¿Cuál de las siguientes afirmaciones es la adecuada para transmitirle?',
                options: [
                    {
                        text: '"Quedate tranquilo que la tasa es fija en pesos del 10% anual y el banco te la aprueba seguro en 5 minutos aunque estés en Veraz".',
                        isCorrect: false,
                        feedback: 'Incorrecto. Inventa condiciones financieras irreales y promete aprobaciones que dependen exclusivamente de la entidad bancaria.'
                    },
                    {
                        text: '"Contamos con convenios bancarios oficiales con simulación transparente. Te presento el esquema de amortización, el valor estimado de cuota y los requisitos para elevar tu carpeta a análisis crediticio".',
                        isCorrect: true,
                        feedback: '¡Correcto! Informa con datos reales, transparenta el proceso y no crea falsas expectativas.'
                    },
                    {
                        text: 'Decirle que la agencia le presta la plata de su propio bolsillo sin ningún papel.',
                        isCorrect: false,
                        feedback: 'Incorrecto. AutoSporting no realiza préstamos informales sin respaldo financiero y contractual.'
                    }
                ]
            }
        ],
        evaluationCriteria: [
            'Rigurosidad en el relevamiento de datos de permutas y estado documental.',
            'Claridad y transparencia en la explicación de financiación y cronogramas de cuotas.',
            'Cumplimiento estricto de la regla de autorizaciones para excepciones y señas especiales.'
        ],
        reinforcement: 'Revisar la guía de cálculo de cuotas y el simulador de permutas en el laboratorio.'
    },

    {
        id: 'ventas-seguimiento-entrega',
        code: 'MOD-VTA-04',
        version: '1.0.0',
        title: 'Seguimiento, coordinación y entrega',
        role: MODULE_ROLES.VENTAS,
        roleLabel: 'Ventas',
        status: MODULE_STATUS.PUBLISHED,
        reviewDate: '2026-11-20',
        durationMinutes: 7,
        sources: ['Protocolo de Entrega de Unidades AutoSporting', 'Manual de Postventa y Satisfacción NPS', 'Circuito de Derivación Inter-Áreas'],
        requiresProfessionalValidation: false,
        validationNote: 'Aprobado por Dirección de Operaciones.',
        objective: 'Aprender a realizar un seguimiento comercial de valor (sin spam), a coordinar eficazmente la derivación de expedientes a Gestoría y Administración, y a ejecutar el protocolo de entrega con checklist exhaustivo y seguimiento postventa.',
        importance: 'La venta no termina con la firma del boleto. Una entrega descuidada o una mala coordinación entre áreas arruina meses de esfuerzo comercial y destruye la recomendación del cliente.',
        explanation: `Seguimiento de valor vs. spam:
- El seguimiento profesional aporta información útil: no envíes mensajes genéricos de "hola, qué decidiste?". Aportá valor: un video del vehículo en marcha, una comparativa de consumo, el aviso de que el informe de dominio llegó 100% limpio o una alternativa viable si la anterior no encajaba.
- Cadencia de contacto: 24-48 hs tras la primera visita, luego a los 5 días y cierre de contacto a los 10 días si no hay respuesta, dejando la puerta abierta.

Derivación formal a Gestoría y Administración:
- En cuanto se concreta la seña, el vendedor debe armar el legajo en el CRM:
  1. Boleto de compraventa / recibo de reserva firmado.
  2. Datos del comprador: DNI legible de ambos lados, constancia de CUIL/CUIT, estado civil y domicilio real.
  3. Datos de la permuta (si aplica): título, cédula y fotografías del peritaje.
  4. Detalle de los saldos a cobrar y medios de pago convenidos.
- Prohibición de saltar áreas: El vendedor no puede coordinar la fecha de entrega con el cliente sin la confirmación explícita de Gestoría (trámite listo) y Administración (cobro acreditado).

Protocolo de Entrega en AutoSporting:
1. Inspección previa: vehículo lavado, aspirado, con nivel de combustible prudente, peritaje de luces y presión de neumáticos.
2. Kit obligatorio: Segunda llave, auxilio en condiciones, cric, llave de tuercas, matafuego con carga vigente y balizas triangulares.
3. Explicación al cliente: funcionamiento de mandos, emparejamiento de Bluetooth, ubicación de auxilio y documentación provisoria habilitante para circular (seguro y cédula/constancia de título).
4. Firma del remito de entrega y acta de conformidad del estado de la unidad.
5. Postventa y fidelización: Contacto de seguimiento a los 7 días para verificar satisfacción y a los 30 días para evaluar la experiencia y solicitar reseña/NPS.`,
        example: `El cliente Ignacio compró una camioneta y la entrega está pactada para el viernes a las 17 hs.
- Vendedor desprolijo: El viernes a las 16:50 hs se da cuenta de que la camioneta no tiene matafuego, no está lavada y Gestoría todavía no recibió la constancia de transferencia porque faltaba un sellado. El cliente llega y tiene que esperar 2 horas con bronca.
- Vendedor profesional AutoSporting: El jueves a la mañana revisa el tablero del CRM, constata con Gestoría que el legajo está OK, confirma con Administración el cobro total, verifica que el taller haya alistado la unidad con su kit completo y le envía un mensaje al cliente confirmando el turno de entrega con puntualidad.`,
        checklist: [
            'Programar seguimientos con contenido de valor agregado y agendarlos en el CRM.',
            'Verificar el estado del legajo en Gestoría antes de proponer fecha de entrega.',
            'Confirmar la acreditación definitiva de fondos con Administración.',
            'Realizar el checklist físico de entrega (kit de seguridad, llaves, auxilio, limpieza).',
            'Programar los contactos de postventa a los 7 y 30 días en el CRM.'
        ],
        frequentErrors: [
            {
                error: 'Entregar el vehículo sin haber hecho firmar el remito de entrega y conformidad.',
                correction: 'El remito firmado es el respaldo legal indispensable que acredita la transferencia de custodia física de la unidad.'
            },
            {
                error: 'Desaparecer una vez cobrada la comisión sin atender las consultas de postventa del cliente.',
                correction: 'La postventa es la mayor fuente de recomendaciones y recompras para el vendedor en Comodoro Rivadavia.'
            },
            {
                error: 'Presionar a Gestoría para que entregue un auto sin documentación terminada "porque el cliente está apurado".',
                correction: 'Explicar al cliente con firmeza y cortesía que las normas registrales protegen su propio patrimonio y que no se entrega ninguna unidad sin el respaldo documental exigido por ley.'
            }
        ],
        practicalActivity: 'Diseñá el mensaje de seguimiento para un cliente que visitó la agencia hace 48 horas interesado en un SUV familiar pero no volvió a contactarse. Redactá además el checklist de 8 puntos críticos para la entrega de esa unidad.',
        situationalQuestions: [
            {
                id: 'vta-seg-q1',
                question: 'Un cliente señó un auto hace 4 días. El vendedor quiere entregarle el auto hoy a la tarde para computar la venta en su comisión del mes, pero Gestoría le avisa que el Registro del Automotor aún no expidió la cédula ni el título transferido. ¿Qué debe hacer el vendedor?',
                options: [
                    {
                        text: 'Entregar el auto igual con una autorización manuscrita en un papel para no perder la comisión del mes.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Entregar un vehículo sin la documentación legal obligatoria viola la ley de tránsito, anula coberturas de seguro y genera una contingencia jurídica gravísima para AutoSporting.'
                    },
                    {
                        text: 'Explicar la situación al cliente con total transparencia, indicando el estado del trámite en el Registro y coordinando la entrega para el momento exacto en que la documentación esté legalmente liberada.',
                        isCorrect: true,
                        feedback: '¡Correcto! Prioriza la seguridad legal del cliente y de la agencia por encima del apuro comisional.'
                    },
                    {
                        text: 'Culpar a Gestoría delante del cliente diciendo que en esa oficina trabajan despacio.',
                        isCorrect: false,
                        feedback: 'Incorrecto. La agencia actúa como un solo equipo coordinado. Nunca se desautoriza a otra área interna ante el cliente.'
                    }
                ]
            },
            {
                id: 'vta-seg-q2',
                question: 'Al realizar el checklist previo de entrega de un vehículo usado, descubrís que el matafuego está vencido y falta la llave de ruedas en el baúl. El cliente ya está en la sala de espera. ¿Cómo procedés?',
                options: [
                    {
                        text: 'Entregar el auto callado y esperar a que el cliente no se dé cuenta.',
                        isCorrect: false,
                        feedback: 'Incorrecto. El cliente lo descubrirá en un control de tránsito o en una pinchadura, generando un reclamo justificado y dañando la reputación de la agencia.'
                    },
                    {
                        text: 'Acudir inmediatamente al pañol de repuestos/taller para reponer el matafuego con carga vigente y la llave de ruedas antes de hacer pasar al cliente a la entrega de la unidad.',
                        isCorrect: true,
                        feedback: '¡Correcto! Resuelve la no conformidad antes de la entrega, asegurando que el cliente reciba la unidad en óptimas condiciones de seguridad.'
                    },
                    {
                        text: 'Decirle al cliente que compre él las cosas y que después la agencia le hace un reintegro si presenta la factura.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Es una experiencia de entrega deficiente que deteriora la imagen de servicio de AutoSporting.'
                    }
                ]
            },
            {
                id: 'vta-seg-q3',
                question: '¿Cuál es el objetivo principal del contacto de postventa a los 7 días de entregado el vehículo?',
                options: [
                    {
                        text: 'Intentar venderle inmediatamente otro vehículo a sus familiares.',
                        isCorrect: false,
                        feedback: 'Incorrecto. El contacto inicial debe centrarse genuinamente en el bienestar y satisfacción del comprador.'
                    },
                    {
                        text: 'Verificar el funcionamiento del vehículo, asegurar que el cliente se sienta acompañado, responder dudas de equipamiento o documentación y consolidar una relación de confianza a largo plazo.',
                        isCorrect: true,
                        feedback: '¡Correcto! La postventa cercana construye reputación sólida, previene reclamos mayores y fideliza al cliente.'
                    },
                    {
                        text: 'Preguntarle si ya le llegó alguna multa de tránsito para deslindar responsabilidades.',
                        isCorrect: false,
                        feedback: 'Incorrecto. El propósito es acompañar la experiencia de uso y evaluar la satisfacción del cliente con AutoSporting.'
                    }
                ]
            }
        ],
        evaluationCriteria: [
            'Capacidad para coordinar el flujo inter-áreas sin puentear controles de Gestoría ni Administración.',
            'Rigurosidad en el checklist físico y documental de entrega.',
            'Calidad del seguimiento de postventa orientado a la satisfacción del cliente.'
        ],
        reinforcement: 'Revisar la planilla de remito de entrega y el protocolo de postventa.'
    },

    // =========================================================================
    // C. TRES MÓDULOS PARA GESTORÍA
    // =========================================================================
    {
        id: 'gestoria-lectura-expediente',
        code: 'MOD-GES-01',
        version: '1.0.0',
        title: 'Lectura y organización del expediente',
        role: MODULE_ROLES.GESTORIA,
        roleLabel: 'Gestoría',
        status: MODULE_STATUS.PUBLISHED,
        reviewDate: '2026-11-20',
        durationMinutes: 8,
        sources: ['Digesto de Normas Técnico-Registrales (DNRPA)', 'Manual de Procedimientos de Gestoría AutoSporting PROC-GES-01', 'Guía Registral Chubut'],
        requiresProfessionalValidation: true,
        validationNote: 'Requiere validación registral periódica ante normativas de DNRPA.',
        objective: 'Aprender a estructurar y auditar un expediente registral completo, identificando intervinientes, estados documentales y requisitos obligatorios según la tipología de la operación.',
        importance: 'Un error registral puede derivar en la imposibilidad de transferir la unidad, secuestros judiciales, reclamos por inhibición de titulares o multas cuantiosas para la agencia.',
        explanation: `Estructura del expediente registral en AutoSporting:
Todo expediente en el CRM debe contener 4 secciones perfectamente identificadas:
1. Personas intervinientes:
   - Comprador y Cónyuge (si corresponde): DNI original digitalizado (frente y dorso), constancia de CUIT/CUIL, estado civil declarado acreditado. Si es persona jurídica: estatuto, acta de designación de autoridades y poder vigente con facultades suficientes.
   - Vendedor y Cónyuge: Acreditación de titularidad registral y asentimiento conyugal (Art. 470 Código Civil y Comercial) si el vehículo fue adquirido durante el matrimonio (bien ganancial).
2. Identificación unívoca del vehículo:
   - Dominio (patente alfanumérica nueva o tradicional), número de chasis/cuadro y número de motor.
   - Cotejo con Título Digital (CAT - Código de Asignación de Título) y Cédula de Identificación del Automotor.
3. Tipología de operación y documentación requerida:
   - Venta directa de stock propio: Solicitud Tipo 08 Digital o físico con firmas certificadas, verificación policial (Formulario 12) vigente, Formulario CETA (si aplica según valuación AFIP/ARCA) o declaración correspondiente, libre deuda de patentes e infracciones.
   - Toma de permuta: 08 firmado en blanco certificado por escribano o registro (para posterior transferencia), título, informe de dominio histórico (Formulario 02 / 58), baja de patentes o certificado de libre deuda municipal.
4. Estados documentales unificados en el CRM:
   - PENDIENTE: Documento solicitado pero aún no remitido.
   - RECIBIDO: Archivo digital o papel ingresado a la oficina, pendiente de auditoría.
   - REVISADO / CONFORME: Documento cotejado, íntegro, legible y válido.
   - OBSERVADO: Documento con anomalía (falta de firma, ilegible, vencido o inconsistente). Requiere subsanación inmediata.`,
        example: `Ingresa un legajo para transferir una Ford Ecosport 2018. El gestor abre el expediente en el CRM:
- Detecta que en el 08 digital figura como titular "Esteban Gómez, casado en primeras nupcias con Claudia Morales".
- Sin embargo, en el legajo solo obra la firma certificada de Esteban Gómez, sin la firma ni el DNI de Claudia Morales.
- Acción del gestor: No aprueba el legajo. Pone el documento en estado OBSERVADO: "Falta asentimiento conyugal de Claudia Morales conforme Art. 470 CCyC". Notifica inmediatamente a Ventas para citar a la cónyuge antes de ingresar el trámite al Registro Automotor de Comodoro Rivadavia.`,
        checklist: [
            'Verificar la identidad y personería de todos los intervinientes (titular, cónyuge, apoderados).',
            'Cotejar que dominio, chasis y motor coincidan exactamente entre título, cédula y peritaje policial.',
            'Clasificar cada documento del legajo según su estado: Pendiente, Recibido, Revisado u Observado.',
            'Comprobar la vigencia temporal de formularios con caducidad (F12 peritaje policial tiene vigencia de 150 días hábiles).',
            'Registrar en la bitácora del expediente en el CRM cualquier faltante u observación con fecha y responsable.'
        ],
        frequentErrors: [
            {
                error: 'Considerar un expediente "completo" porque tiene muchos papeles cargados en PDF sin haber auditado la validez de las firmas.',
                correction: 'Auditar hoja por hoja: verificar certificaciones notariales o registrales, sellos de legalización de colegio de escribanos si es extraña jurisdicción y vigencia de poderes.'
            },
            {
                error: 'Omitir la firma del cónyuge cuando el titular registral declara ser casado en el título de propiedad.',
                correction: 'En bienes gananciales el asentimiento conyugal es inexcusable por el Art. 470 del CCyC; sin él, el Registro del Automotor observa e inscribe condicionalmente o rechaza la transferencia.'
            },
            {
                error: 'No actualizar el estado del expediente en el CRM, obligando a los vendedores a consultar verbalmente.',
                correction: 'Mantener los estados actualizados en el CRM en tiempo real para que todo el equipo comercial y directivo conozca el estado exacto sin demoras.'
            }
        ],
        practicalActivity: 'Analizá el legajo simulado de una camioneta Toyota Hilux 2021 radicada en Rada Tilly. Identificá los 4 documentos indispensables para la presentación en el Registro Seccional y redactá la observación para un Formulario 12 con numeración de motor borrosa.',
        situationalQuestions: [
            {
                id: 'ges-lec-q1',
                question: 'Al abrir un expediente en el CRM, encontrás una copia escaneada de un Formulario 08 firmado por el titular, pero la certificación de firma de escribano se realizó en la provincia de Santa Cruz y no cuenta con la legalización del Colegio de Escribanos respectivo. ¿Qué debe resolver Gestoría?',
                options: [
                    {
                        text: 'Presentarlo igual en el Registro Seccional de Comodoro Rivadavia a ver si "pasa sin que se den cuenta".',
                        isCorrect: false,
                        feedback: 'Incorrecto. Los Registros Seccionales de DNRPA rechazan inexorablemente las firmas de extraña jurisdicción sin la legalización correspondiente del Colegio de Escribanos local.'
                    },
                    {
                        text: 'Marcar el documento como OBSERVADO en el CRM con la nota: "Falta legalización del Colegio de Escribanos de Santa Cruz por firma en extraña jurisdicción" y solicitar la legalización o nueva certificación registral.',
                        isCorrect: true,
                        feedback: '¡Correcto! Aplica estrictamente la normativa registral vigente evitando demoras y aranceles de reingreso por observación.'
                    },
                    {
                        text: 'Falsificar un sello del colegio de escribanos de Chubut para apurar el trámite.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Constituye un delito penal grave que compromete a la empresa y a la persona.'
                    }
                ]
            },
            {
                id: 'ges-lec-q2',
                question: '¿Cuál es la diferencia entre clasificar un documento como "RECIBIDO" y "REVISADO" en el módulo de Gestoría del CRM?',
                options: [
                    {
                        text: 'Significan exactamente lo mismo y pueden usarse indistintamente.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Confundir la mera recepción física/digital con la auditoría técnica genera gravísimos errores registrales.'
                    },
                    {
                        text: '"RECIBIDO" indica que el archivo o papel ingresó a la agencia pero aún no fue auditado; "REVISADO" certifica que Gestoría cotejó su legitimidad, legibilidad, vigencia y correspondencia técnica con la operación.',
                        isCorrect: true,
                        feedback: '¡Correcto! Esa distinción es el corazón del control de calidad registral en AutoSporting.'
                    },
                    {
                        text: '"RECIBIDO" es para documentos de clientes y "REVISADO" solo para documentos de la AFIP.',
                        isCorrect: false,
                        feedback: 'Incorrecto. La clasificación aplica a todo tipo de documentación dentro del expediente.'
                    }
                ]
            },
            {
                id: 'ges-lec-q3',
                question: 'Un vendedor te insiste para que le des el OK de entrega a un cliente porque "ya le sacó foto al DNI y el titular prometió firmar el 08 la semana que viene". ¿Cuál es tu respuesta técnica como responsable de Gestoría?',
                options: [
                    {
                        text: 'Darle el OK si el vendedor se hace responsable de palabra.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Gestoría es la guardiana de la seguridad jurídica de la agencia. Las responsabilidades de palabra no tienen valor registral.'
                    },
                    {
                        text: 'Reiterar que el expediente permanece BLOQUEADO con estado OBSERVADO por falta de firma y certificación de la Solicitud Tipo 08, informando que la entrega solo se autoriza con respaldo registral consolidado.',
                        isCorrect: true,
                        feedback: '¡Correcto! Ejerce el control preventivo con firmeza profesional, protegiendo a la agencia y al comprador de contingencias legales.'
                    },
                    {
                        text: 'Borrar el expediente para que nadie pregunte más.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Los expedientes deben mantenerse trazables en todo momento.'
                    }
                ]
            }
        ],
        evaluationCriteria: [
            'Dominio de la estructura del expediente registral y los roles de las partes.',
            'Uso riguroso de los estados documentales (Pendiente, Recibido, Revisado, Observado).',
            'Detección oportuna de requisitos de extraña jurisdicción y asentimiento conyugal.'
        ],
        reinforcement: 'Consultar el Digesto de Normas Técnico-Registrales de la DNRPA (Título I y II).'
    },

    {
        id: 'gestoria-control-faltantes',
        code: 'MOD-GES-02',
        version: '1.0.0',
        title: 'Control de consistencia y detección de faltantes',
        role: MODULE_ROLES.GESTORIA,
        roleLabel: 'Gestoría',
        status: MODULE_STATUS.PUBLISHED,
        reviewDate: '2026-11-20',
        durationMinutes: 9,
        sources: ['Digesto DNRPA - Título II Cap. I y II', 'Protocolo de Verificación Física y Dominial AutoSporting', 'Procedimiento de Detección de Fraude e Inhibiciones'],
        requiresProfessionalValidation: true,
        validationNote: 'Requiere actualización ante modificaciones arancelarias y de sistemas de DNRPA.',
        objective: 'Entrenar el cotejo cruzado minucioso entre datos de la operación, cédulas, títulos, verificación policial e informes de dominio, detectando a tiempo discrepancias, adulteraciones, embargos, prendas e inhibiciones.',
        importance: 'Un vehículo con número de motor remarcado, embargo judicial o titular inhibido no puede transferirse. Si la agencia entrega una unidad o paga una permuta en estas condiciones, pierde el capital y asume un juicio civil o penal.',
        explanation: `Metodología de Cotejo Cruzado en 5 Puntos Críticos:
1. Identificación Numérica Exacta:
   - Comparar dígito a dígito: Dominio, número de motor y número de chasis entre el Título Digital, la Cédula de Identificación y el Formulario 12 de verificación policial física.
   - Atención a letras y números confusos (ej: '0' y 'O', '8' y 'B', '1' y 'I'). Una sola letra errónea en el motor paraliza la transferencia.
2. Informe de Dominio Histórico y Gravámenes:
   - Nunca aceptar un auto sin Informe de Estado de Dominio expedido por la DNRPA con menos de 15 días corridos de antigüedad.
   - Verificar si pesan: Embargos, Prendas (financieras o bancarias pendientes de cancelación con Formulario 03 o 24), Pedidos de Secuestro o Inhibición General de Bienes sobre el titular registral.
3. Verificación Policial Física (Formulario 12):
   - Debe ser emitido por planta verificadora policial autorizada (Policía de Chubut en Comodoro / Rada Tilly).
   - Constatar: grabado de cristales con el dominio correcto, grabado de autopartes (si aplica por normativa provincial) y que no existan observaciones de "motor con numeración devastada o cuño no original".
4. Legibilidad e Integridad Documental:
   - Archivos borrosos, fotos con sombras o recortes de firmas son inaceptables. Todo documento digitalizado debe ser perfectamente legible.
5. Deudas Tributarias y Contravencionales:
   - Informe de multas (Formulario 13 único de DNRPA y certificado de libre deuda municipal de Comodoro Rivadavia). Si hay multas, determinar contractualmente quién las asume o realizar negativa de pago con la responsabilidad correspondiente.`,
        example: `Una permuta Chevrolet Tracker 2019 entra al CRM.
- El vendedor cargó: "Titular: Roberto Carlos Gómez, DNI 28.450.120, sin deudas".
- El gestor solicita el informe de dominio en el Registro Seccional N° 2 de Comodoro Rivadavia y detecta:
  a) Roberto Carlos Gómez se encuentra INHIBIDO judicialmente por un juzgado civil de Puerto Madryn desde hace 4 meses.
  b) La camioneta registra una prenda activa a favor de un banco privado por un préstamo prendario impago.
- Resultado: El vehículo NO PUEDE ser transferido. Si AutoSporting hubiera tomado la permuta y entregado el 0 km, la agencia se quedaba con una camioneta invendible y legalmente embargable. El gestor bloquea la operación y notifica a Dirección.`,
        checklist: [
            'Cotejar dígito por dígito dominio, chasis y motor entre título, cédula y Formulario 12.',
            'Solicitar y analizar el informe de dominio oficial actualizado (vigencia máxima 15 días).',
            'Comprobar la inexistencia de prendas activas, embargos o inhibiciones sobre el titular.',
            'Verificar la legibilidad total de certificaciones notariales y sellos de legalización.',
            'Controlar el libre deuda de multas e impuestos comunales antes del cierre de cuentas.'
        ],
        frequentErrors: [
            {
                error: 'Confiar en un informe de dominio que trajo el cliente impreso hace 6 meses.',
                correction: 'El estado dominial cambia de un día para otro (un embargo puede trabarse en 24 horas). Gestoría debe gestionar siempre un informe reciente directamente en el sistema de DNRPA.'
            },
            {
                error: 'No revisar la concordancia del tipo de combustible en el título y motor (ej: vehículo naftero convertido a GNC sin homologar en el registro).',
                correction: 'Verificar si la cédula o título consignan la conversión a GNC y si la oblea y tarjeta amarilla están vigentes.'
            },
            {
                error: 'Dar por válido un documento cortado o con partes pixeladas subido al portal del CRM.',
                correction: 'Rechazar la carga con estado OBSERVADO y exigir el reenvío en alta resolución con bordes completos visibles.'
            }
        ],
        practicalActivity: 'Realizá el control cruzado entre una ficha de Formulario 12 peritaje y un Título del Automotor simulados en los que el número de motor difiere en un dígito (un "3" en lugar de un "8"). Redactá el dictamen de observación registral para solicitar la pericia complementaria.',
        situationalQuestions: [
            {
                id: 'ges-con-q1',
                question: 'Al auditar un informe de dominio de una camioneta en permuta, observás que figura una prenda inscripta hace 3 años a favor de una entidad bancaria. El cliente afirma: "Ya pagué la última cuota hace dos meses, no debo nada". ¿Qué debe exigir Gestoría?',
                options: [
                    {
                        text: 'Creer en la palabra del cliente y avanzar con la transferencia porque si pagó la cuota la prenda se cae sola.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Las prendas no caducan de hecho: requieren el levantamiento formal y la cancelación mediante Solicitud Tipo 03/24 emitida por el acreedor prendario y presentada en el Registro.'
                    },
                    {
                        text: 'Exigir la constancia de cancelación prendaria oficial emitida por el banco acreedor (Formulario 03 con firma certificada o minuta electrónica de cancelación de prenda) debidamente inscripta en el Registro del Automotor.',
                        isCorrect: true,
                        feedback: '¡Correcto! Sin la cancelación registral inscripta, el vehículo continúa gravado y el Registro no inscribirá la transferencia a favor del nuevo titular sin autorización del acreedor.'
                    },
                    {
                        text: 'Pedirle al cliente que le pague un café al encargado del registro para que borre la prenda.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Es un acto ilícito que viola todas las normas legales y éticas de la empresa.'
                    }
                ]
            },
            {
                id: 'ges-con-q2',
                question: 'Durante la revisión del Formulario 12 de verificación policial física, el perito policial anotó en el casillero de observaciones: "Numeración de chasis con vestigios de óxido y cuños con soldadura irregular". ¿Cuál es el procedimiento obligatorio de Gestoría?',
                options: [
                    {
                        text: 'Lijar el número de chasis en el taller de la agencia y mandar a verificar a otra comisaría.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Es un delito tipificado en el Código Penal argentino (adulteración de numeración registrable de automotores).'
                    },
                    {
                        text: 'Suspender inmediatamente cualquier avance de la operación, catalogar el legajo como OBSERVADO POR PERITAJE DUDOSO y elevar el caso a la Dirección General para rechazar la unidad o solicitar pericia técnica especializada en planta verificadora central.',
                        isCorrect: true,
                        feedback: '¡Correcto! Protege a la agencia de adquirir un vehículo presuntamente gemelo o robado, con responsabilidad penal directa.'
                    },
                    {
                        text: 'Tapar la observación con corrector blanco antes de escanearlo.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Es una adulteración documental punible por ley.'
                    }
                ]
            },
            {
                id: 'ges-con-q3',
                question: 'El DNI del comprador consigna domicilio en Comodoro Rivadavia, Chubut, pero el vehículo que compra está radicado en la ciudad de Córdoba Capital. ¿Qué trámite registral adicional implica y qué debe anticiparse?',
                options: [
                    {
                        text: 'Ninguno, todos los registros de Argentina son iguales y automáticos en 5 minutos.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Implica una transferencia con cambio de radicación interprovincial que requiere envío de legajo entre registros seccionales.'
                    },
                    {
                        text: 'Implica una transferencia con cambio de radicación: se presenta en el Registro de radicación o en el del nuevo domicilio, se pagan aranceles de envío de legajo y los plazos de emisión de nuevo título y cédula pueden extenderse de 7 a 15 días hábiles.',
                        isCorrect: true,
                        feedback: '¡Correcto! Conocer los plazos y aranceles reales del cambio de radicación permite coordinar expectativas reales con el comprador y evitar promesas falsas.'
                    },
                    {
                        text: 'Decirle al cliente que tiene que viajar a Córdoba a buscar la chapa patente en persona.',
                        isCorrect: false,
                        feedback: 'Incorrecto. La presentación puede realizarse válidamente en el registro seccional correspondiente al domicilio del adquirente conforme a la normativa DNRPA.'
                    }
                ]
            }
        ],
        evaluationCriteria: [
            'Habilidad para cotejar datos alfanuméricos entre piezas documentales dispares.',
            'Capacidad para interpretar informes de dominio, prendas, embargos e inhibiciones.',
            'Detección preventiva de adulteraciones físicas y observaciones policiales.'
        ],
        reinforcement: 'Entrenar con el Caso 5 de simulación de inconsistencias en expedientes.'
    },

    {
        id: 'gestoria-transferencias-coordinacion',
        code: 'MOD-GES-03',
        version: '1.0.0',
        title: 'Seguimiento, transferencias y coordinación de entrega',
        role: MODULE_ROLES.GESTORIA,
        roleLabel: 'Gestoría',
        status: MODULE_STATUS.PUBLISHED,
        reviewDate: '2026-11-20',
        durationMinutes: 8,
        sources: ['Manual de Procedimientos DNRPA - Turnos y Peticiones Web', 'Guía de Coordinación Inter-Áreas AutoSporting', 'Normativa Registral Provincial de Chubut'],
        requiresProfessionalValidation: true,
        validationNote: 'Requiere contraste con sistemas web oficiales de la Dirección Nacional.',
        objective: 'Aprender a gestionar eficientemente turnos y trámites registrales ante la DNRPA, comunicar bloqueos técnicos a las demás áreas del CRM y liberar la entrega física únicamente cuando exista plena certeza jurídica.',
        importance: 'La descoordinación entre los plazos registrales y la ansiedad comercial suele generar tensiones graves. Gestoría debe mantener la trazabilidad de los trámites y ser la voz autorizada que garantiza que ningún auto ruede sin cobertura registral.',
        explanation: `Circuito de Tramitación Registral Eficiente:
1. Precarga Digital en el Sistema DNRPA:
   - Uso de la Solicitud Tipo 08 Digital (SITE) para agilizar turnos y obtener descuento en aranceles arancelarios oficiales.
   - Verificación de la liquidación de aranceles de transferencia, sellados de rentas provinciales (DGR Chubut) y aranceles de cédulas y placas metálicas.
2. Ingreso del Trámite y Seguimiento de Observaciones:
   - Número de trámite y control diario del estado de petición en la web de DNRPA.
   - Si el Registro observa el trámite: Notificar de inmediato en el CRM el motivo exacto, el responsable de subsanar (comprador, vendedor o gestor) y el plazo límite para contestar la vista sin que caiga el trámite.
3. Distinción entre Plazos Internos y Plazos de Organismos Públicos:
   - Un plazo interno es el tiempo que tarda AutoSporting en preparar el legajo (24-48 hs).
   - Un plazo del Registro Seccional depende de la carga operativa del organismo, paros gremiales, auditorías o demoras de envío postal de legajos.
   - Regla inquebrantable: Prohibido prometer fechas cerradas al cliente antes de que el Registro Seccional entregue la documentación final o emita el título provisorio habilitante.
4. Visto Bueno Registral para la Entrega:
   - Gestoría es el área que formalmente emite la "LIBERACIÓN REGISTRAL PARA ENTREGA" en el CRM.
   - Requisitos para liberar la entrega:
     a) Transferencia inscripta favorablemente o constancia digital oficial de título y cédula emitida.
     b) En permutas: 08 firmado y certificado debidamente en custodia o transferencia de la permuta ingresada.
     c) Notificación simultánea a Ventas y Administración en el CRM.`,
        example: `Una venta ingresa el lunes al Registro Seccional N° 1 de Comodoro Rivadavia.
- El miércoles a las 11 hs el Registro emite una observación: "Falta comprobante de pago del Impuesto de Sellos de Rentas de Chubut por la transferencia del dominio".
- Gestoría proactiva: No espera a que Ventas pregunte por qué no está listo el auto. Sube la observación al CRM a las 11:15 hs, coordina con Administración la emisión de la transferencia bancaria a Rentas Chubut, abona el arancel a las 13 hs y acompaña la constancia al Registro el jueves a primera hora, subsanando la vista en menos de 24 horas.`,
        checklist: [
            'Realizar precarga en el sistema SITE de DNRPA y verificar liquidación arancelaria.',
            'Monitorear diariamente el estado de trámites ingresados en los Registros Seccionales.',
            'Registrar en el CRM cualquier vista u observación registral en menos de 2 horas hábiles.',
            'Coordinar con Administración el pago ágil de aranceles y sellados provinciales.',
            'Emitir la Liberación Registral para Entrega solo con documentación verificada en mano o constancia oficial.'
        ],
        frequentErrors: [
            {
                error: 'Culpabilizar al Registro ante el cliente por demoras sin haber hecho el seguimiento diario del expediente.',
                correction: 'Monitorear los estados periódicamente; muchas demoras se deben a observaciones subsanables en el mismo día por parte de la agencia.'
            },
            {
                error: 'Autorizar verbalmente la entrega antes de retirar la documentación final del Registro.',
                correction: 'Solo autorizar la entrega cuando el trámite esté inscripto y se cuente con la constancia fehaciente que habilite legalmente a circular al cliente.'
            },
            {
                error: 'No coordinar con Administración los pagos de sellados arancelarios, frenando expedientes por falta de fondos.',
                correction: 'Solicitar con anticipación los fondos para aranceles y sellados adjuntando la liquidación proforma oficial en el CRM.'
            }
        ],
        practicalActivity: 'Confeccioná una nota de notificación de bloqueo registral para el CRM dirigida a Ventas y Administración, explicando que un trámite fue observado por vencimiento del Formulario 12 policial y detallando las acciones y plazos para resolverlo.',
        situationalQuestions: [
            {
                id: 'ges-tra-q1',
                question: 'Un cliente concurre a la agencia el viernes a las 18 hs exigiendo retirar su camioneta porque viaja el sábado a la cordillera. El Registro Seccional cerró al mediodía y el trámite aún figura en estado "En proceso de inscripción". El vendedor te pide que autorices la entrega. ¿Cómo resolvés?',
                options: [
                    {
                        text: 'Entregar la camioneta y darle una fotocopia simple del 08 sin certificar para que se la muestre a la policía si lo paran.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Una fotocopia simple no habilita a circular. La policía secuestrará la camioneta en la ruta y el cliente responsabilizará a AutoSporting.'
                    },
                    {
                        text: 'Explicar con firmeza y serenidad que sin la inscripción final del Registro Seccional o cédula provisoria oficial de la DNRPA, el vehículo no puede circular legalmente por la ruta, resguardando la seguridad del cliente y el patrimonio de la agencia.',
                        isCorrect: true,
                        feedback: '¡Correcto! Cumple con la responsabilidad registral innegociable, protegiendo al cliente y a la empresa.'
                    },
                    {
                        text: 'Prestarle tu propio auto particular para que viaje y no se enoje.',
                        isCorrect: false,
                        feedback: 'Incorrecto. No corresponde mezclar el patrimonio personal con las operaciones de la empresa.'
                    }
                ]
            },
            {
                id: 'ges-tra-q2',
                question: 'Al realizar el trámite en el Registro Seccional de Comodoro Rivadavia, el operador te informa que el titular anterior tiene una deuda de patentes municipales de $180.000 y el comprador se niega a pagarla. ¿Qué procedimiento corresponde en el CRM?',
                options: [
                    {
                        text: 'Pagar la deuda con dinero propio del bolsillo del gestor y después ver si te lo devuelven.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Gestoría no debe disponer de fondos propios para contingencias comerciales.'
                    },
                    {
                        text: 'Asentar la observación en el CRM, adjuntar el detalle de deuda municipal y solicitar a Administración y Ventas la instrucción contractual: si la absorbe la agencia conforme al boleto de compra o si se deduce de la liquidación del vendedor de la permuta.',
                        isCorrect: true,
                        feedback: '¡Correcto! Canaliza el problema dentro de los circuitos administrativos y contractuales de la agencia con trazabilidad.'
                    },
                    {
                        text: 'Cancelar la compra del cliente y echarlo de la agencia.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Es un conflicto subsanable mediante los mecanismos habituales de resolución comercial y administrativa.'
                    }
                ]
            },
            {
                id: 'ges-tra-q3',
                question: '¿Qué documento oficial de la DNRPA acredita de forma transitoria que una transferencia está en trámite y permite justificar la posesión legítima del automotor?',
                options: [
                    {
                        text: 'Un mensaje de texto de WhatsApp enviado por el empleado de la agencia.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Carece por completo de valor legal ante autoridades de control de tránsito.'
                    },
                    {
                        text: 'El recibo oficial de aranceles con número de trámite emitido por el Registro Seccional y la constancia de asignación de trámite web con código verificable.',
                        isCorrect: true,
                        feedback: '¡Correcto! Son las constancias fehacientes expedidas por el Registro Seccional que acreditan el ingreso del expediente.'
                    },
                    {
                        text: 'Una factura de combustible de la estación de servicio.',
                        isCorrect: false,
                        feedback: 'Incorrecto. No tiene ninguna relación con el trámite registral.'
                    }
                ]
            }
        ],
        evaluationCriteria: [
            'Habilidad para gestionar los tiempos de los trámites registrales y sus excepciones.',
            'Capacidad para comunicar y destrabar observaciones con rapidez y precisión técnica.',
            'Rigor profesional para salvaguardar la regla de no entrega sin documentación habilitante.'
        ],
        reinforcement: 'Revisar los instructivos del sistema de trámites digitales de DNRPA (SITE).'
    },

    // =========================================================================
    // D. TRES MÓDULOS PARA ADMINISTRACIÓN Y FACTURACIÓN
    // =========================================================================
    {
        id: 'admin-preparacion-validacion',
        code: 'MOD-ADM-01',
        version: '1.0.0',
        title: 'Preparación y validación de datos',
        role: MODULE_ROLES.ADMINISTRACION,
        roleLabel: 'Administración y Facturación',
        status: MODULE_STATUS.PUBLISHED,
        reviewDate: '2026-11-20',
        durationMinutes: 8,
        sources: ['Normativa de Facturación ARCA / AFIP - RG 1415 y complementarias', 'Manual Administrativo AutoSporting PROC-ADM-01', 'Régimen Informativo de Operaciones con Automotores Usados'],
        requiresProfessionalValidation: true,
        validationNote: 'Sujeto a verificación tributaria periódica por el Contador Público de la agencia.',
        objective: 'Aprender a reunir, contrastar y validar la información tributaria y contractual de comprador, vendedor y unidad antes de emitir comprobantes fiscales, distinguiendo borradores de facturas formalmente emitidas.',
        importance: 'Emitir una factura con CUIT erróneo, condición fiscal equivocada (IVA) o alícuota incorrecta genera multas de ARCA/AFIP, inconsistencias en el Libro IVA Ventas y problemas graves de cómputo para el cliente.',
        explanation: `Las 3 Etapas Fundamentales de la Facturación:
1. Operación Cargada en Borrador en el CRM:
   - Es una propuesta comercial generada por Ventas. No tiene valor contable ni fiscal. Puede ser modificada o anulada sin impacto impositivo.
2. Documentación Preparada y Auditada:
   - Administración verifica en la base de ARCA/AFIP:
     a) Constancia de CUIT/CUIL del comprador con estado activo y sin bloqueo de actividades.
     b) Condición tributaria: Responsable Inscripto (emisión de Factura A sujeta a reglamentación), Monotributista o Consumidor Final (Factura B).
     c) Régimen especial de bienes usados: Identificar si la operación es venta propia (stock de la agencia) o comisión por consignación (intermediación comercial por cuenta y orden de terceros, gravada solo sobre la comisión).
3. Comprobante Efectivamente Emitido y Autorizado:
   - Factura electrónica con CAE (Código de Autorización Electrónico) y código QR generado a través del web service oficial de ARCA/AFIP.
   - Solo a partir de este momento existe una obligación fiscal y un comprobante válido exigible.

Controles obligatorios antes de facturar:
- Datos del vehículo: Marca, modelo, año, motor, chasis y patente deben coincidir con el expediente de Gestoría.
- Montos y desglose: Precio neto, IVA, percepciones de Ingresos Brutos (Convenio Multilateral / Chubut) y gastos administrativos autorizados.
- Medio de cancelación declarado y coherencia con la acreditación real en cuentas bancarias.`,
        example: `El cliente "Transportes del Sur SRL" compra una unidad para su flota.
- El vendedor cargó: "Facturar a Consumidor Final a nombre del chofer Juan Pérez".
- Administración audita antes de emitir: Detecta que la seña ingresó desde la cuenta bancaria de "Transportes del Sur SRL" (CUIT 30-71458962-9), que es Responsable Inscripto.
- Si se emitiera Factura B a Consumidor Final, la empresa compradora no podría computar el gasto ni el crédito fiscal, la agencia incurriría en inconsistencia de origen de fondos y el cliente rechazaría el comprobante.
- Acción correcta de Administración: Corrige la ficha, solicita la constancia de CUIT de Transportes del Sur SRL y prepara la Factura A correspondiente previa validación del pago.`,
        checklist: [
            'Verificar constancia de inscripción en ARCA/AFIP actualizada del comprador.',
            'Determinar con precisión el tipo de comprobante aplicable (Factura A, B o liquidación de consignación).',
            'Cotejar que datos de la unidad (patente, motor, chasis) coincidan con el legajo de Gestoría.',
            'Revisar las alícuotas impositivas aplicables y las percepciones de Ingresos Brutos Chubut.',
            'Nunca considerar un borrador del CRM como una factura emitida hasta obtener el CAE oficial.'
        ],
        frequentErrors: [
            {
                error: 'Emitir la factura antes de que el dinero esté acreditado o validado el medio de cobro.',
                correction: 'Una vez emitida la factura se devenga el impuesto (IVA e IIBB). Si la operación luego se cae, requiere emitir nota de crédito y justificar la anulación contable.'
            },
            {
                error: 'Facturar una venta en consignación como si fuera una venta propia de stock.',
                correction: 'La venta de stock propio factura el valor total de la unidad; la consignación se factura únicamente por la comisión pactada por intermediación conforme a la reglamentación impositiva.'
            },
            {
                error: 'Modificar a mano un PDF de factura para corregir un error ortográfico en el nombre del cliente.',
                correction: 'Los comprobantes fiscales no se editan a mano. Toda corrección de un comprobante con CAE requiere emisión de Nota de Crédito / Débito formal en ARCA.'
            }
        ],
        practicalActivity: 'Auditá una constancia de inscripción de ARCA simulada para un cliente que solicita Factura A. Identificá qué datos fiscales deben volcarse en la cabecera de la factura en el CRM y qué percepciones provinciales deben calcularse.',
        situationalQuestions: [
            {
                id: 'adm-pre-q1',
                question: 'Un cliente concurre a la agencia y te pide que le emitas una Factura "A" por la compra de un automóvil particular, pero al consultar su CUIT en el padrón de ARCA/AFIP figura inscripto únicamente como "Monotributista Categoría C". ¿Qué tipo de comprobante debés emitir?',
                options: [
                    {
                        text: 'Emitir Factura "A" de todas formas porque el cliente insiste y tiene CUIT.',
                        isCorrect: false,
                        feedback: 'Incorrecto. El sistema de ARCA/AFIP rechaza la emisión de Factura A a Monotributistas, y forzarlo viola las normas de facturación de la RG 1415.'
                    },
                    {
                        text: 'Explicar que de acuerdo con la normativa vigente de ARCA/AFIP, a los contribuyentes Monotributistas corresponde emitirles Factura tipo "B" (o Factura electrónica B a Consumidor Final/Monotributo con CUIT consignado).',
                        isCorrect: true,
                        feedback: '¡Correcto! Aplica estrictamente la correlación fiscal correspondiente al régimen tributario del comprador.'
                    },
                    {
                        text: 'No hacerle ninguna factura y darle un papel borrador escrito en una servilleta.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Toda operación comercial de la agencia debe respaldarse con comprobante fiscal autorizado.'
                    }
                ]
            },
            {
                id: 'adm-pre-q2',
                question: 'En el módulo de Ventas del CRM figura un registro de venta en estado "Cargado en Borrador" por $18.000.000. El vendedor le dice al cliente: "Ya estás facturado, quedate tranquilo". ¿Cuál es la realidad contable de ese registro?',
                options: [
                    {
                        text: 'La operación ya está legalmente facturada porque está cargada en la computadora de la agencia.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Un registro en borrador del CRM es solo una intención interna de venta; no tiene validez tributaria alguna.'
                    },
                    {
                        text: 'No existe factura legal hasta que Administración valide los datos, procese el comprobante en el facturador electrónico y obtenga el CAE oficial otorgado por ARCA/AFIP.',
                        isCorrect: true,
                        feedback: '¡Correcto! Esa distinción es vital para no generar confusiones tributarias con los clientes y el organismo fiscal.'
                    },
                    {
                        text: 'El borrador sirve para circular por la ruta sin pagar impuestos.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Un borrador no tiene ningún efecto jurídico ni fiscal.'
                    }
                ]
            },
            {
                id: 'adm-pre-q3',
                question: 'Al preparar la facturación de una camioneta usada, notas que el número de chasis en el CRM tiene 16 caracteres en lugar de los 17 alfanuméricos estándar. ¿Cómo procedés?',
                options: [
                    {
                        text: 'Agregarle un cero al final para que el sistema no chille y emitir la factura.',
                        isCorrect: false,
                        feedback: 'Incorrecto. La factura con chasis falso será rechazada en el Registro Seccional y no coincidirá con el título de propiedad.'
                    },
                    {
                        text: 'Frenar la emisión, cotejar con el Título Digital y el Formulario 12 del expediente en Gestoría, corregir el caracter faltante y solo entonces emitir el comprobante electrónico.',
                        isCorrect: true,
                        feedback: '¡Correcto! El control de consistencia antes de la emisión evita notas de crédito innecesarias y rechazos registrales.'
                    },
                    {
                        text: 'Dejar el casillero de chasis vacío en la factura.',
                        isCorrect: false,
                        feedback: 'Incorrecto. La facturación de vehículos automotores exige individualizar chasis, motor y dominio.'
                    }
                ]
            }
        ],
        evaluationCriteria: [
            'Diferenciación inequívoca entre borrador, documento preparado y comprobante con CAE.',
            'Dominio de las normas básicas de facturación (condiciones de IVA, tipos de factura).',
            'Control de consistencia entre datos tributarios y datos registrales de la unidad.'
        ],
        reinforcement: 'Consultar el manual de facturación electrónica y tipos de comprobantes en ARCA.'
    },

    {
        id: 'admin-cobros-comprobantes',
        code: 'MOD-ADM-02',
        version: '1.0.0',
        title: 'Cobros, comprobantes e imputaciones',
        role: MODULE_ROLES.ADMINISTRACION,
        roleLabel: 'Administración y Facturación',
        status: MODULE_STATUS.PUBLISHED,
        reviewDate: '2026-11-20',
        durationMinutes: 9,
        sources: ['Procedimiento de Conciliación y Tesorería AutoSporting PROC-ADM-02', 'Manual de Prevención de Fraudes en Transferencias Bancarias', 'Reglamento de Caja y Cobranzas'],
        requiresProfessionalValidation: true,
        validationNote: 'Requiere contraste con los procedimientos bancarios y de tesorería de la empresa.',
        objective: 'Comprender y aplicar la regla fundamental de tesorería: un comprobante recibido NO es un cobro hasta su efectiva acreditación bancaria; dominar la imputación precisa de pagos, el tratamiento de señas y la conciliación de diferencias.',
        importance: 'El fraude con comprobantes de transferencia falsos o reversibles es una de las mayores amenazas para las agencias de autos. Entregar un vehículo o emitir un recibo definitivo sin dinero acreditado puede significar la pérdida total de la unidad.',
        explanation: `Regla de Oro de AutoSporting:
"Un comprobante de transferencia, ticket de cajero o captura de pantalla de WhatsApp recibido del cliente NO es un cobro. Solo es un aviso de intento de pago. El cobro se valida ÚNICAMENTE cuando el dinero figura acreditado e indisponible en el extracto bancario oficial de AutoSporting".

Peligros y modalidades de estafa comunes:
- Comprobantes editados digitalmente con Photoshop o generadores falsos de transferencias.
- Transferencias programadas para días posteriores que el emisor cancela antes del clearing.
- Transferencias con DEBIN no consentido o cheques depositados pendientes de acreditación que luego son rebotados por falta de fondos o denuncia de robo.

Protocolo de Validación de Cobros:
1. Recepción del comprobante del cliente:
   - El vendedor o cliente remite la constancia de transferencia o depósito.
   - Administración no emite recibo definitivo ni libera la entrega. Registra en el CRM: "Comprobante en proceso de conciliación bancaria".
2. Verificación en Home Banking / Extracto:
   - El responsable de Tesorería o Administración ingresa directamente al home banking de la cuenta de AutoSporting.
   - Comprueba: Importe exacto, CUIT/nombre del ordenante, CBU de origen y estado "Acreditado" (no "Pendiente de compensación").
3. Imputación exacta a la operación en el CRM:
   - Imputar el pago al ID específico de la venta y al cliente correspondiente.
   - Registrar número de transacción bancaria / ID Coelsa.
   - Si es un pago parcial o seña: registrar el saldo remanente a cobrar con fecha límite de cancelación.
4. Emisión de Recibo Oficial Provisorio / Definitivo:
   - Solo tras la confirmación de extracto se emite el recibo oficial numerado en el sistema administrativo de AutoSporting.`,
        example: `El cliente Fernando envía a las 19:30 hs una captura de pantalla de una supuesta transferencia por $12.000.000 desde una billetera virtual a la cuenta de AutoSporting en Banco Galicia, y le pide al vendedor que le entregue la llave para irse a su casa.
- Error fatal: El vendedor ve la captura, confía en el cliente y le entrega la unidad. Al día siguiente, Administración ingresa al Galicia y el dinero NO EXISTE: la captura era falsa o fue una transferencia cancelada. La agencia perdió el vehículo.
- Procedimiento correcto: Administración no valida ningún pago por captura. Ingresa al home banking al día siguiente a primera hora; si el saldo no impactó, notifica que el pago está PENDIENTE DE ACREDITACIÓN y el vehículo permanece bajo custodia y resguardo en el salón de la agencia.`,
        checklist: [
            'Nunca dar por cobrado un importe únicamente por una captura de pantalla o ticket.',
            'Ingresar al home banking oficial y corroborar la acreditación efectiva en el extracto.',
            'Cotejar que el titular del CBU origen coincida con el comprador o persona autorizada formalmente.',
            'Imputar el cobro al número de operación y ficha del cliente correspondiente en el CRM.',
            'Emitir recibo oficial numerado solo tras la acreditación real en cuenta o caja.'
        ],
        frequentErrors: [
            {
                error: 'Imputar un pago recibido a la cuenta de otro cliente con nombre similar.',
                correction: 'Controlar siempre el CUIT del ordenante y el número de referencia para no cruzar saldos entre clientes.'
            },
            {
                error: 'Aceptar cheques comunes como dinero efectivo.',
                correction: 'Los cheques comunes o de pago diferido tienen plazos de clearing (48-72 hs) y riesgo de rechazo; se registran en cartera de valores, nunca como dinero disponible.'
            },
            {
                error: 'No conciliar diariamente los saldos de caja física en efectivo.',
                correction: 'Realizar arqueo de caja diario con doble firma al cierre de la jornada en Comodoro Rivadavia.'
            }
        ],
        practicalActivity: 'Compará un extracto bancario simulado con tres avisos de transferencias remitidos por vendedores. Identificá qué transferencias impactaron efectivamente, cuál figura solo como orden programada y cuál no registra crédito en cuenta.',
        situationalQuestions: [
            {
                id: 'adm-cob-q1',
                question: 'Un comprador envía un comprobante de transferencia bancaria por $8.500.000 a las 14:00 hs de un día hábil. Al revisar el home banking de la agencia a las 14:15 hs, el saldo no se ha incrementado y en movimientos no figura la transacción. El cliente presiona para retirar el vehículo. ¿Cómo actuás?',
                options: [
                    {
                        text: 'Entregarle el auto porque a veces las transferencias tardan y el comprobante parece legítimo.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Es el riesgo típico de estafa. Si el comprobante era falso o fue revocado, la agencia se queda sin el auto y sin el dinero.'
                    },
                    {
                        text: 'Explicar con cortesía que el protocolo de seguridad de AutoSporting exige verificar el impacto efectivo del crédito en el extracto bancario oficial antes de liberar la entrega, pidiéndole que aguarde la acreditación en la sala de espera o coordinando la entrega para cuando impacte.',
                        isCorrect: true,
                        feedback: '¡Correcto! Cumple con la regla inquebrantable de tesorería, resguardando los fondos de la empresa de manera profesional.'
                    },
                    {
                        text: 'Denunciar inmediatamente al cliente por estafa en la comisaría.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Las transferencias entre entidades bancarias a veces demoran unos minutos u horas por chequeos del BCRA. Se aguarda la verificación sin agredir al cliente.'
                    }
                ]
            },
            {
                id: 'adm-cob-q2',
                question: 'Ingresa una transferencia a la cuenta de la agencia por $5.000.000 con la referencia "PAGO AUTO", pero no coincide con ningún presupuesto exacto cargado en el CRM. ¿Qué debe hacer Administración?',
                options: [
                    {
                        text: 'Asignársela al azar al primer cliente que deba dinero en el sistema.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Genera inconsistencias gravísimas en las cuentas corrientes de los clientes.'
                    },
                    {
                        text: 'Registrarla en la cuenta transitoria de "Cobros no identificados / Por imputar", cotejar el CUIT/CBU de origen en el extracto bancario, consultar a Ventas quién espera una transferencia de ese titular y asignarla una vez acreditada la relación con la operación.',
                        isCorrect: true,
                        feedback: '¡Correcto! Mantiene la trazabilidad y evita imputaciones erróneas que perjudiquen a clientes o a la empresa.'
                    },
                    {
                        text: 'Gastar el dinero en un asado para el equipo.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Es una violación total a las normas contables y éticas.'
                    }
                ]
            },
            {
                id: 'adm-cob-q3',
                question: 'Un cliente abona una parte de la operación con dinero en efectivo en dólares estadounidenses en la administración de la agencia. ¿Qué controles son obligatorios antes de emitir el recibo?',
                options: [
                    {
                        text: 'Contar los billetes a simple vista y guardarlos en un cajón sin recibo.',
                        isCorrect: false,
                        feedback: 'Incorrecto. No verifica la legitimidad de las divisas ni deja comprobante de custodia.'
                    },
                    {
                        text: 'Verificar la legitimidad de cada billete con máquina contadora/detector de billetes UV y magnético, constatar series (evitando billetes cara chica si la pauta comercial lo establece), registrar numeración en planilla de caja y emitir recibo oficial de cobranza en moneda extranjera firmado.',
                        isCorrect: true,
                        feedback: '¡Correcto! Asegura la genuinidad de la moneda extranjera y formaliza la recepción en la tesorería de AutoSporting.'
                    },
                    {
                        text: 'Rechazar los dólares porque en la agencia solo se acepta trueque.',
                        isCorrect: false,
                        feedback: 'Incorrecto. En el mercado automotriz argentino las operaciones en dólares son habituales y están reglamentadas dentro de los circuitos de la agencia.'
                    }
                ]
            }
        ],
        evaluationCriteria: [
            'Comprensión estricta de la regla de no liberación sin fondos acreditados en extracto.',
            'Capacidad para identificar riesgos de transferencias truchas o no consolidadas.',
            'Manejo ordenado y trazable de imputaciones de cobranzas y cuentas transitorias.'
        ],
        reinforcement: 'Revisar la guía de detección de transferencias fraudulentas y el protocolo de caja.'
    },

    {
        id: 'admin-observaciones-contador',
        code: 'MOD-ADM-03',
        version: '1.0.0',
        title: 'Observaciones, correcciones y consulta al contador',
        role: MODULE_ROLES.ADMINISTRACION,
        roleLabel: 'Administración y Facturación',
        status: MODULE_STATUS.PUBLISHED,
        reviewDate: '2026-11-20',
        durationMinutes: 8,
        sources: ['Procedimiento de Auditoría y Control Interno AutoSporting', 'Protocolo de Consulta Contable Externa', 'Régimen de Retenciones y Percepciones de Chubut'],
        requiresProfessionalValidation: true,
        validationNote: 'Requiere validación y soporte del Contador Público externo matriculado.',
        objective: 'Aprender a documentar minuciosamente discrepancias contables y fiscales, aplicar los controles internos previos a cualquier corrección de saldos y formular consultas estructuradas al contador externo con contexto técnico suficiente.',
        importance: 'Tomar decisiones impositivas improvisadas o modificar registros sin trazabilidad puede generar sanciones del fisco, contingencias laborales o distorsión de los balances económicos de la empresa.',
        explanation: `Controles Internos y Trazabilidad en AutoSporting:
1. Prohibición de Correcciones "de Palabra":
   - Ningún importe, comprobante o imputación en el CRM puede ser modificado por pedido verbal.
   - Todo ajuste exige una "Nota de Observación Administrativa" con fecha, usuario solicitante, motivo fundado y evidencia adjunta.
2. Tratamiento de Notas de Crédito / Anulaciones Fiscales:
   - Para anular una factura emitida con CAE, es obligatorio contar con la autorización del responsable administrativo o Propietario.
   - Se debe justificar: error involuntario en CUIT/nombre, operación frustrada formalmente rescindida o devolución de seña autorizada.
3. Cómo formular una consulta eficiente al Contador Externo:
   - No enviar mensajes vagos como "¿cuánto paga de impuestos este auto?".
   - Protocolo de Consulta Estructurada en 4 Puntos:
     a) Operación y partes: Tipo de operación (compra directa, consignación o permuta) y condición fiscal de las partes (RI, Monotributo, Exento).
     b) Jurisdicción y radicación: Radicación del vehículo y domicilio de las partes (Comodoro Rivadavia, Chubut / Convenio Multilateral).
     c) Planteo concreto: Alícuota aplicable, procedencia de percepciones de IIBB o emisión de comprobante de retención.
     d) Documentación de respaldo adjunta: Constancia de CUIT, borrador del boleto y constancias impositivas.
4. Advertencia sobre normas impositivas:
   - Los colaboradores de administración no definen criterios fiscales por intuición. Ante la menor duda sobre alícuotas, regímenes de retención o gravámenes extraordinarios, se eleva la consulta al contador profesional.`,
        example: `Una empresa de Trelew adquiere un utilitario usado y retiene el 3% de Ingresos Brutos en el pago de la factura.
- Empleado improvisado: Elimina el saldo en el sistema para que no figure deuda sin pedir el certificado de retención oficial.
- Empleado profesional AutoSporting: Solicita el Certificado de Retención de Rentas de Chubut con sello y firma digital, coteja que el número de certificado corresponda a la factura emitida, documenta la retención en el CRM y envía la consulta al contador: "Adjunto certificado de retención IIBB Trelew por $450.000 aplicable a la Factura A 0001-00004512 para su cómputo en la declaración jurada mensual".`,
        checklist: [
            'Documentar por escrito en el CRM cualquier discrepancia contable con evidencia adjunta.',
            'No emitir notas de crédito sin la autorización previa del responsable del área.',
            'Reunir los 4 puntos de contexto (partes, jurisdicción, duda concreta y respaldo) antes de consultar al contador.',
            'Exigir certificados formales de retención para cualquier deducción de pagos.',
            'Mantener la trazabilidad de cada ajuste para auditorías internas de la dirección.'
        ],
        frequentErrors: [
            {
                error: 'Consultar al contador por audio de WhatsApp sin enviar los CUIT ni los papeles de respaldo.',
                correction: 'El profesional de contabilidad necesita números de CUIT, fechas y documentos para emitir un dictamen técnico válido.'
            },
            {
                error: 'Anular facturas a fin de mes para "bajar los impuestos a pagar".',
                correction: 'Es una maniobra ilícita que activa inspecciones de ARCA/AFIP y compromete penalmente a la empresa.'
            },
            {
                error: 'Borrar movimientos en el CRM para que coincida la caja al final del día.',
                correction: 'Las diferencias de caja se documentan como sobrantes o faltantes con investigación del origen, jamás borrando registros históricos.'
            }
        ],
        practicalActivity: 'Redactá una solicitud formal de dictamen al contador externo para una operación de venta de una unidad recibida en consignación comercial, donde el propietario del auto es un particular radicado en Santa Cruz y el comprador una empresa de Comodoro Rivadavia.',
        situationalQuestions: [
            {
                id: 'adm-obs-q1',
                question: 'Al conciliar las ventas del mes, descubrís que una Factura "A" emitida hace 15 días consignó por error un importe de IVA calculado sobre el total de la unidad en lugar de calcularse sobre la comisión de consignación. ¿Cómo debés proceder?',
                options: [
                    {
                        text: 'Tapar el error con corrector y no decirle nada a nadie para que no te reten.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Ocultar el error generará una inconsistencia en el Libro IVA Ventas y reclamos en la declaración jurada mensual.'
                    },
                    {
                        text: 'Documentar la observación técnica en el CRM, adjuntar el boleto de consignación y la factura errónea, elevar el informe a Dirección y preparar la consulta al contador para instrumentar la Nota de Crédito y la refacturación correcta con CAE.',
                        isCorrect: true,
                        feedback: '¡Correcto! Aplica el principio de trazabilidad y corrección técnica autorizada a través de los canales contables oficiales.'
                    },
                    {
                        text: 'Borrar la base de datos de facturación de la computadora.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Es una acción destructiva inadmisible.'
                    }
                ]
            },
            {
                id: 'adm-obs-q2',
                question: 'Un cliente con empresa en Chubut paga una factura deduciendo $300.000 en concepto de "retención de Ganancias", pero no te envía ningún certificado de retención emitido por el sistema SiREC de ARCA. ¿Qué hacés?',
                options: [
                    {
                        text: 'Darle el libre deuda porque "ya se lo descontó".',
                        isCorrect: false,
                        feedback: 'Incorrecto. Sin el certificado oficial de retención emitido por los sistemas de ARCA, la agencia no puede computar el pago a cuenta y ese dinero es una pérdida neta.'
                    },
                    {
                        text: 'Mantener la factura con saldo pendiente de cobro por $300.000 en el CRM y notificar al cliente que para imputar la retención debe remitir el Certificado Oficial de Retención (Formulario 1222 / SiREC) con firma válida.',
                        isCorrect: true,
                        feedback: '¡Correcto! Protege el crédito fiscal y la caja de la agencia de deducciones unilaterales no acreditadas.'
                    },
                    {
                        text: 'Exigirle que pague el doble como castigo.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Se gestiona formalmente el requerimiento del certificado legal correspondiente.'
                    }
                ]
            },
            {
                id: 'adm-obs-q3',
                question: '¿Por qué las correcciones contables o de saldos en el CRM deben conservar una bitácora inalterable de auditoría?',
                options: [
                    {
                        text: 'Para vigilar a los empleados y descontarles el sueldo ante cualquier duda.',
                        isCorrect: false,
                        feedback: 'Incorrecto. La auditoría educativa y operativa no tiene fines punitivos automáticos ni laborales.'
                    },
                    {
                        text: 'Para garantizar la transparencia operativa, prevenir fraudes, facilitar auditorías contables independientes y asegurar que todo movimiento patrimonial tenga un respaldo justificado y verificable en el tiempo.',
                        isCorrect: true,
                        feedback: '¡Correcto! La inalterabilidad y trazabilidad de los registros es el estándar de seguridad de AutoSporting.'
                    },
                    {
                        text: 'Porque lo exige una ley internacional de computación cuántica.',
                        isCorrect: false,
                        feedback: 'Incorrecto. Es un principio básico y universal de control interno y contabilidad empresarial.'
                    }
                ]
            }
        ],
        evaluationCriteria: [
            'Habilidad para documentar observaciones contables con evidencia objetiva.',
            'Comprensión del circuito formal para emisión de Notas de Crédito y correcciones con CAE.',
            'Capacidad para estructurar consultas profesionales al contador externo con contexto suficiente.'
        ],
        reinforcement: 'Revisar el protocolo de consultas impositivas y el manual de auditoría interna.'
    }
];

export const getRoleModuleById = id => ROLE_MODULES.find(m => m.id === id);
export const getRoleModulesByRole = role => role === 'todos'
    ? ROLE_MODULES
    : ROLE_MODULES.filter(m => m.role === role || m.role === MODULE_ROLES.COMUN);
