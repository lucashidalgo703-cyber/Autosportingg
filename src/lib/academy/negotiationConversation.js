/** Conversation state shared by the simulated buyer and its service adapter. */
export const MAX_NEGOTIATION_TURNS = 15;

const normalizeText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// The UI sends the current seller message in both fields. Keep only previous
// turns here so the service counts it once and the AI receives it once.
export function getPreviousNegotiationHistory(history = [], sellerMessage = '') {
    const previous = Array.isArray(history) ? [...history] : [];
    const last = previous.at(-1);
    if (last?.sender === 'seller' && normalizeText(last.text) === normalizeText(sellerMessage)) previous.pop();
    return previous;
}

export function hasBuyerReply(history, reply) {
    const replyKey = value => normalizeText(value).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    const text = replyKey(reply);
    return history.some(message => message.sender === 'buyer' && replyKey(message.text) === text);
}

const nextQuestions = [
    'Antes de decidir, pasame el precio final por escrito y qué gastos quedan a mi cargo.',
    '¿Qué documentación podemos revisar hoy para avanzar con el Corolla?',
    'Separá el valor del auto de los gastos de transferencia así comparo el total.',
    'Si hay una atención posible, consultala y avisame qué condición tiene antes de que transfiera.',
    '¿Podemos revisar el historial y el estado del auto juntos antes de definir el número?',
    'Decime cuál sería el próximo paso concreto si acepto la propuesta.',
    'Quiero saber qué incluye la operación y qué tendría que pagar aparte.',
    '¿Cuándo podrías confirmarme una propuesta autorizada con todos los importes?',
    'Antes de reservar, necesito conocer el monto, el plazo y las condiciones por escrito.',
    '¿Quién me confirma las condiciones definitivas de la operación en la agencia?',
    'Si hoy no tenemos una propuesta confirmada, coordinemos un horario para retomarlo.',
    'Prefiero revisar el detalle completo antes de comprometer una transferencia.',
    'No quiero dejar puntos abiertos: aclaremos precio, gastos y documentación pendiente.',
    'Dejame una propuesta escrita para revisarla con calma y darte una respuesta.',
    'Por ahora no voy a avanzar sin esas condiciones claras. Acordemos cómo seguimos.'
];

/** Guillermo advances using the seller's answers, without recycling a script. */
export function simulateDiscountBuyerReply(history, sellerMessage) {
    const text = normalizeText(sellerMessage);
    const sellerText = normalizeText([...history.filter(m => m.sender === 'seller').map(m => m.text), sellerMessage].join(' '));
    const hasValue = /servic|historial|neumatic|cubierta|verificacion|procedencia|unico dueno|documentacion/.test(sellerText);
    const hasApproval = /consult|autoriz|titular|gerencia/.test(sellerText);
    const currentApproval = /consult|autoriz|titular|gerencia/.test(text);
    let candidates = [];

    if (/te bajo|te lo dejo en 27|te hago un descuento|te regalo/.test(text) && !currentApproval) {
        candidates = [
            'Mmm... que me bajes el precio tan rápido sin consultar me genera dudas. ¿Está todo en orden con el auto y la documentación?',
            'Antes de aceptar esa rebaja, confirmame quién la autoriza y qué incluye el precio final.',
            'No quiero cerrar con un número que después cambie. Revisá la autorización y dejámelo por escrito.'
        ];
    } else if (/que uso|para que|que buscas|que necesita|que presupuesto|cuanto pensabas/.test(text)) {
        candidates = [
            'Lo quiero para moverme por Comodoro y por trabajo. Priorizo un auto confiable, pero necesito entender el gasto total.',
            'Lo usaría todos los días; el historial de mantenimiento me importa tanto como el precio. ¿Lo podemos revisar?',
            'Busco resolver el cambio con una operación clara. Mostrame qué incluye la propuesta al contado.'
        ];
    } else if (/reserva|sena|recibo|cuenta oficial|cuenta institucional/.test(text) && hasValue && hasApproval) {
        candidates = [
            'Dale, si el titular confirma la atención y dejamos el precio total por escrito, avancemos con la reserva oficial. ¿Cuál es el monto y el plazo?',
            'Quiero revisar el recibo y las condiciones antes de transferir a la cuenta autorizada de la agencia.',
            'Con esas condiciones documentadas podemos avanzar. Confirmame cuándo revisamos los papeles y el próximo paso.'
        ];
    } else if (hasValue && currentApproval) {
        candidates = [
            'Con el historial que me explicás me quedo más tranquilo. Si el titular autoriza una atención de $300.000, puedo evaluar reservar hoy; confirmame también los gastos.',
            'Consultá esa atención sin darla por confirmada todavía. Cuando tengas la respuesta, pasame el total y las condiciones de la reserva.',
            'Si queda autorizado ese número, revisemos la documentación y cómo formalizamos la operación.'
        ];
    } else if (/no podemos bajar|precio fijo|es lo que vale|no hacemos descuento|no hago descuento/.test(text)) {
        candidates = [
            'En Trelew vi uno similar por dos millones menos. Mostrame qué diferencia hay en estado, kilometraje y documentación para comparar bien.',
            'Entiendo que sostengas el precio. ¿Qué respaldo concreto me ofrecés para justificar la diferencia?',
            'Si no hay una atención posible, pasame la propuesta completa y la reviso sin compromiso.'
        ];
    } else if (/servic|historial|neumatic|cubierta|verificacion|procedencia|documentacion/.test(text)) {
        candidates = [
            'El historial suma, sí. ¿Podemos verlo y revisar qué gastos tendría además de los $28.500.000?',
            'Eso me ayuda a comparar con el de Trelew. ¿Podés consultar una atención al titular si avanzamos con una reserva oficial?',
            'Bien, ya me queda más claro el valor del Corolla. Ahora necesito una propuesta final con las condiciones de pago.'
        ];
    } else if (currentApproval) {
        candidates = [
            'Está bien que lo consultes. Antes explicame qué respalda el precio del Corolla y después vemos la propuesta autorizada.',
            'Espero la respuesta del titular, pero necesito el total con los gastos para decidir.',
            'Avisame cuando tengas condiciones confirmadas y coordinamos el próximo paso.'
        ];
    }

    return [...candidates, ...nextQuestions].find(reply => !hasBuyerReply(history, reply)) || nextQuestions.at(-1);
}


// These continuations belong to the same exercise. They never borrow another
// client's vehicle, budget or family situation when the main branch is exhausted.
const scenarioContinuations = {
    'toma-02': [
        'Mi duda es la toma de la EcoSport: quiero entender cómo llegaron a ese valor.',
        'Reconozco que hay que revisar las cubiertas; veamos el informe sin desmerecer la camioneta.',
        'Distingo el precio publicado por un particular del importe que una agencia puede reconocer.',
        'Me interesa mirar la operación completa para pasar de la EcoSport a la Amarok.',
        'Anotemos por separado la toma, el precio de la Amarok y los gastos de la operación.',
        'La diferencia neta es lo que necesito comparar con mi presupuesto.',
        'Si hay que consultar una mejora de la toma, espero esa respuesta antes de comprometerme.',
        'Prefiero que la propuesta aclare qué ajustes están autorizados y cuáles siguen pendientes.',
        'Podemos dejar agendada la revisión del peritaje y los papeles de mi EcoSport.',
        'Conservo la documentación de mantenimiento para incorporarla a la revisión.',
        'Me llevo el detalle de la operación para evaluar la diferencia con calma.',
        'No voy a entregar la EcoSport hasta que ambos tengamos claras las condiciones.',
        'Si todavía falta una autorización, coordinemos cuándo retomamos la propuesta de la Amarok.',
        'Prefiero una respuesta concreta sobre la toma antes que un acuerdo apresurado.',
        'Dejemos la propuesta por escrito y un próximo contacto; sin esos números no confirmo el cambio.'
    ],
    'inde-03': [
        'El Cruze me gusta, pero necesito decidir sin quedarme intranquilo con los gastos.',
        'Me sirve separar lo que pago al comprar de los costos de mantener el auto.',
        'Quiero llevarme la información para conversar la compra en casa.',
        'Podemos incluir a mi señora en una próxima charla para evaluar la operación juntos.',
        'Si falta algún importe, prefiero que figure pendiente antes que tomar un estimado como definitivo.',
        'Una prueba de manejo me ayudaría a saber si el Cruze nos resulta cómodo.',
        'Prefiero revisar las opciones con calma y después decidir el cambio.',
        'No quiero que confundamos mi interés con una compra ya confirmada.',
        'Podemos preparar las preguntas pendientes para la próxima conversación.',
        'Me sirve llevar un resumen verificable de lo que fuimos hablando.',
        'Voy a evaluar la compra con el presupuesto familiar, sin dejar una seña por presión.',
        'Si hoy no cerramos todos los números, dejemos un seguimiento con un objetivo concreto.',
        'Antes de confirmar, quiero que podamos revisar la propuesta en casa.',
        'Podemos retomar la conversación cuando esté el detalle que falta.',
        'Por ahora dejo la decisión pendiente; acordemos el próximo contacto sin comprometer fondos.'
    ],
    'comp-04': [
        'La diferencia entre las dos Renegade sigue siendo el punto que quiero evaluar.',
        'Me sirve comparar las unidades con la misma información, no solo dos precios publicados.',
        'Podemos separar el precio del vehículo de lo que incluye cada propuesta.',
        'Prefiero revisar datos de kilometraje e historial antes que opiniones sobre otra agencia.',
        'Voy a considerar el respaldo documental como parte del valor de la operación.',
        'Si hay algún dato de la otra unidad que no tenemos, dejémoslo pendiente en la comparación.',
        'Me interesa que el detalle de AutoSporting quede por escrito para poder compararlo.',
        'No necesito que descalifiquemos a nadie para evaluar esta Renegade.',
        'Podemos revisar la carpeta disponible y después definir si la diferencia se justifica.',
        'Prefiero tomar la decisión con los gastos de ambas operaciones a la vista.',
        'Si evaluamos una atención comercial, tiene que quedar sujeta a quien la autoriza.',
        'Me llevo la comparación completa antes de comprometer una reserva.',
        'Podemos acordar un contacto cuando estén confirmados los puntos pendientes.',
        'No voy a elegir únicamente por una rebaja si después aparecen diferencias en los papeles.',
        'Dejemos una propuesta verificable y un próximo paso; sin eso todavía no confirmo la Renegade.'
    ],
    'fina-05': [
        'Para la Kangoo cuento con siete millones; necesito evaluar cómo cubrir el saldo.',
        'No quiero confundir una simulación de cuota con una aprobación del banco.',
        'Podemos separar la entrega inicial, el saldo a financiar y los gastos.',
        'Prefiero saber qué documentación preparar antes de dejar dinero comprometido.',
        'Si la entidad todavía no evaluó la solicitud, mantengamos la compra condicionada.',
        'Me sirve que la propuesta detalle tasa, plazo y costo total cuando estén confirmados.',
        'La cuota tiene que poder sostenerse con los ingresos que podamos demostrar.',
        'No voy a tomar como definitiva una condición que todavía dependa del análisis crediticio.',
        'Podemos acordar un próximo contacto cuando la entidad responda la consulta.',
        'Si esta opción no resulta, quiero evaluar una alternativa compatible con mis ingresos.',
        'Prefiero revisar el detalle financiero por escrito antes de reservar la Kangoo.',
        'Quiero que cualquier reserva aclare qué ocurre si el crédito no se aprueba.',
        'Me llevo la lista de requisitos para reunir la documentación pendiente.',
        'Podemos retomar la operación cuando estén claras las condiciones de financiación.',
        'Por ahora no confirmo la compra: primero necesitamos la evaluación de la entidad y una propuesta completa.'
    ],
    'difi-06': [
        'La Hilux me interesa, pero necesito verificar la procedencia antes de confiar.',
        'Prefiero revisar pruebas concretas y dejar de lado las promesas de palabra.',
        'Podemos recorrer juntos la camioneta y anotar lo que requiera una revisión.',
        'Me sirve que cada punto de la carpeta documental pueda verificarse.',
        'Si algún informe todavía no está disponible, quiero que quede expresamente pendiente.',
        'Mi mecánico puede participar de la revisión antes de que yo decida.',
        'Quiero evaluar tanto el estado mecánico como la situación registral de la Hilux.',
        'Con un trato claro podemos seguir conversando sin apurarnos a firmar.',
        'No voy a confundir una inspección pendiente con una garantía ya comprobada.',
        'Podemos registrar las observaciones y definir cómo se responde cada una.',
        'Me llevo un detalle de lo revisado para no depender de lo que recordemos después.',
        'Si falta documentación, coordinemos otra visita cuando esté disponible.',
        'Prefiero confirmar la operación después de revisar la camioneta y los papeles.',
        'Podemos dejar acordado un próximo paso con el mecánico y la agencia.',
        'Sin las verificaciones pendientes no cierro la Hilux; retomemos cuando estén resueltas.'
    ],
    'sena-07': [
        'Quiero el 208, pero por ahora tengo trescientos mil pesos disponibles.',
        'Entiendo que querer comprarlo no alcanza para bloquearlo de palabra.',
        'Prefiero que el dinero se reciba por un canal autorizado de AutoSporting.',
        'Necesito saber qué condición queda pendiente antes de asumir que la reserva existe.',
        'Si el importe no alcanza para la seña prevista, consultemos la excepción antes de transferir.',
        'No quiero dar por aceptado un plazo que todavía no autorizó la dirección.',
        'El recibo tiene que identificar la unidad y las condiciones que acordemos.',
        'Voy a organizar los fondos para cumplir las condiciones que finalmente se aprueben.',
        'Hasta que esté formalizada la reserva, entiendo que la unidad sigue sujeta a disponibilidad.',
        'Podemos coordinar cuándo confirmar el pago y la documentación de la reserva.',
        'Me sirve recibir por escrito el importe, el plazo y el destino autorizado del dinero.',
        'Si no se aprueba la excepción, prefiero saberlo antes de comprometerme.',
        'Quiero evitar malentendidos sobre hasta cuándo se mantiene la propuesta del 208.',
        'Podemos retomar cuando tenga los fondos o una excepción confirmada formalmente.',
        'Por ahora no doy el auto por reservado; primero cerremos el procedimiento y las condiciones por escrito.'
    ],
    'inte-08': [
        'Para la Ranger necesito mirar la toma del Gol, el contado y el saldo por separado.',
        'Me sirve ordenar la operación antes de negociar un número global.',
        'Quiero que el valor de toma se apoye en el peritaje del Gol.',
        'Podemos dejar visibles los gastos para que no cambie la diferencia al final.',
        'Si proponemos una mejora de la toma, debe figurar pendiente de autorización.',
        'No voy a considerar aprobado un crédito que la entidad todavía no analizó.',
        'La propuesta tiene que distinguir el dinero de contado del importe que se solicita financiar.',
        'Prefiero que la fecha de entrega dependa de los requisitos que efectivamente se cumplan.',
        'Podemos dejar por escrito qué documentación necesita gestoría para avanzar.',
        'Quiero revisar el conjunto sin mezclar una concesión comercial con un requisito registral.',
        'Si alguna variable cambia, revisemos el saldo completo antes de firmar.',
        'Me llevo el desglose para evaluar la operación de la Ranger con el Gol.',
        'Podemos acordar un contacto cuando estén las autorizaciones y la respuesta financiera.',
        'No confirmo una entrega anticipada mientras falten condiciones documentales.',
        'Dejemos cada punto pendiente identificado; sin ese detalle no cierro el paquete de la Ranger.'
    ]
};

/** All simulated clients remember the conversation and advance their own case. */
export function simulateNegotiationBuyerReply(scenario, history = [], currentMsg = '', _turnNumber, _level) {
    if (scenario.id === 'desc-01') return simulateDiscountBuyerReply(history, currentMsg);
    const text = normalizeText(currentMsg);
    const sellerText = normalizeText([...history.filter(message => message.sender === 'seller').map(message => message.text), currentMsg].join(' '));
    const buyerText = normalizeText(history.filter(message => message.sender === 'buyer').map(message => message.text).join(' '));
    const has = pattern => pattern.test(sellerText);
    const is = pattern => pattern.test(text);
    const approval = has(/consult|autoriz|titular|gerencia|responsable/);
    const closing = is(/reserva|sena|recibo|coordina|agend|llamad|contact|jueves|horario/);
    // A refused or prohibited promise must not be read as a new concession.
    const promises = pattern => {
        const matches = text.matchAll(new RegExp(pattern.source, 'g'));
        return [...matches].some(match => {
            const clause = text.slice(0, match.index).split(/[,;.!?]|\bpero\b|\baunque\b/).at(-1);
            return !/\b(?:no|nunca|jamas|prohibido|prohibida)\b/.test(clause);
        });
    };
    let candidates = [], continuationOffset = 0;
    switch (scenario.id) {
        case 'toma-02': {
            const assessment = has(/peritaje|reacondicion|garantia|informe|taller/);
            const difference = has(/diferencia|saldo|desglos|por separado/);
            if (assessment) continuationOffset = 4;
            if (promises(/esta rota|gastada|no vale nada|te quejas/)) candidates = [
                '¡Pará! Podemos hablar del peritaje sin despreciar mi EcoSport. La cuidé y quiero que revisemos los datos con respeto.',
                'Si hay observaciones del taller, veámoslas una por una; descalificar mi camioneta no me ayuda a decidir.'
            ];
            else if (closing && assessment && difference && approval) candidates = [
                'Con la toma sujeta a autorización y la diferencia neta aclarada, podemos revisar la propuesta formal para la Amarok.',
                'Dale, coordinemos la revisión de los papeles de la EcoSport y dejemos asentadas las condiciones aprobadas.'
            ];
            else if (assessment && difference) candidates = [
                approval ? 'Si gerencia evalúa una toma de $13.800.000, puedo analizar la diferencia para la Amarok; espero la autorización antes de darla por hecha.' : 'Ahora entiendo la diferencia neta. ¿Podés consultar si reconocen $13.800.000 por la EcoSport, sin dar ese ajuste por aprobado?',
                'El desglose me permite comparar mejor. Revisemos qué gastos se agregan a la diferencia y cuáles están incluidos.'
            ];
            else if (assessment) candidates = [
                'Acepto revisar el peritaje y el reacondicionamiento. Ahora mostrame cuánto tendría que poner en total para pasar a la Amarok.',
                'Entiendo que la agencia asuma costos al revenderla. Evaluemos la operación completa sin quedarnos solo con la toma.'
            ];
            else if (is(/que uso|para que|que busca|que necesita|que presupuesto/)) candidates = [
                'Quiero pasar de mi EcoSport a una camioneta más grande, pero la diferencia tiene que resultarme razonable.',
                'Me interesa la Amarok; para decidir necesito entender la tasación y cuánto tendría que agregar.'
            ];
            break;
        }
        case 'inde-03': {
            const diagnosis = has(/que te preocupa|que te frena|cual es la duda|que duda|que aspecto|contame|mantenimiento|patentes|presupuesto/);
            const costs = has(/mantenimiento|patentes|costo|gasto|service|turbo/);
            const scheduled = has(/\b(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/) && has(/a las\s*\d{1,2}|\d{1,2}(?::\d{2})?\s*(?:hs|horas)/);
            const materialSent = has(/(?:presupuesto|ficha|detalle|informacion|calculo).{0,70}(?:enviad|entregad|adjuntad|compartid)|(?:envie|enviamos|comparti|compartimos).{0,70}(?:presupuesto|ficha|detalle|informacion|calculo)/);
            if (diagnosis) continuationOffset = 3;
            if (scheduled) continuationOffset = 10;
            if (promises(/apurate|se lo lleva otro|hoy o nunca/)) candidates = [
                'No me ayuda que me apuren. Prefiero revisar la compra del Cruze tranquilo y decidir con mi familia.',
                'Si la condición es decidir bajo presión, por ahora no voy a comprometer mis ahorros.'
            ];
            else if (scheduled) candidates = [
                materialSent ? 'Queda acordado el seguimiento. Voy a revisar con mi señora el presupuesto y la ficha que ya me enviaste para llevar nuestras preguntas al llamado.' : 'Queda acordado el llamado en el día y la hora que propusiste. Para ese contacto revisemos el detalle de mantenimiento y presupuesto familiar que todavía falte confirmar.',
                'El próximo contacto ya está coordinado; voy a preparar las dudas que queden, sin tomar todavía una decisión de compra.',
                'Retomemos en el horario acordado. Evaluaremos juntos lo pendiente y después decidiré si avanzo con el Cruze.'
            ];
            else if (closing && diagnosis && costs) candidates = [
                is(/jueves/) ? 'El jueves me sirve para retomar el tema del Cruze con mi señora. Acordemos la hora y llevemos el detalle de gastos que falte confirmar.' : 'Podemos agendar una charla con mi señora para revisar los números del Cruze. Confirmemos día, hora y qué información vas a preparar.',
                'Dale, dejemos un seguimiento concreto para evaluar mantenimiento y presupuesto familiar antes de decidir.'
            ];
            else if (diagnosis && /mantenimiento|vacaciones|liquidez/.test(buyerText)) candidates = [
                'Conocés mis dudas de mantenimiento y liquidez. Si me preparás el detalle verificable, podemos evaluar la compra en casa.',
                'Una visita con mi señora o una prueba de manejo nos ayudaría a decidir; prefiero eso a repetir la misma duda.'
            ];
            else if (diagnosis) candidates = [
                'Lo que me frena es el mantenimiento del motor turbo y no quedarme sin liquidez para las vacaciones. Quiero revisar esos números con mi señora.',
                'Necesito distinguir el costo de comprar el Cruze de lo que vamos a gastar después en mantenimiento y patentes.'
            ];
            break;
        }
        case 'comp-04': {
            const comparison = has(/kilometraje|kilometros|85.000|85 mil|42.000|42 mil|historial|cubiertas|comparable/);
            const documents = has(/dominio|documentacion|gestoria|deudas|patentes|multas|80 puntos|seguridad juridica/);
            if (comparison || documents) continuationOffset = 4;
            if (promises(/son unos truchos|te van a estafar|la otra agencia es mala/)) candidates = [
                'No necesito que hables mal de la otra agencia. Comparemos las Renegade con datos verificables y explicame el valor de esta propuesta.',
                'Dejemos las descalificaciones afuera: quiero evaluar precio, estado y documentación de cada unidad.'
            ];
            else if (closing && comparison && documents) candidates = [
                'La comparación de estado y respaldo registral me sirve. Revisemos una propuesta formal de esta Renegade antes de reservar.',
                'Podemos avanzar con la carpeta y el precio final por escrito, sin igualar un número que no compara las mismas condiciones.'
            ];
            else if (comparison && documents) candidates = [
                'Con el kilometraje y la documentación en la comparación, entiendo mejor la diferencia. Quiero revisar el detalle de lo que incluye AutoSporting.',
                'La tranquilidad registral también tiene valor para mí. Evaluemos el total de la operación con esos respaldos a la vista.'
            ];
            else if (comparison) candidates = [
                /85.000|85 mil/.test(buyerText) ? 'Ya aclaramos que la otra tiene más kilometraje; ahora quiero comparar los gastos y el respaldo documental de las dos propuestas.' : 'La otra Renegade tiene unos 85.000 kilómetros. Entiendo que no son unidades idénticas: veamos también los gastos y los papeles.',
                'Acepto comparar estado e historial además del precio. Mostrame qué documentación respalda esta unidad.'
            ];
            else if (documents) candidates = [
                'Me interesa el respaldo de gestoría. También comparemos uso e historial para entender la diferencia con la otra Renegade.'
            ];
            break;
        }
        case 'fina-05': {
            const analysis = has(/banco|entidad|analisis crediticio|scoring|aprobacion/);
            const income = has(/ingresos|conyuge|marido|codeudor|recibo de sueldo|monotribut/);
            const terms = has(/tasa|plazo|costo total|cuota|condicionad/);
            const submitted = has(/(?:documentacion|carpeta|papeles|solicitud).{0,80}(?:presentad|ingresad|enviad|entregad)|(?:presentamos|enviamos|ingresamos).{0,60}(?:documentacion|carpeta|papeles|solicitud)/);
            if (analysis || income) continuationOffset = 2;
            if (submitted) continuationOffset = 4;
            if (promises(/te lo apruebo yo|sale con dni seguro|sale seguro|no te preocupes por el veraz|garantizo el credito/)) candidates = [
                'Antes de dejar una seña por la Kangoo, confirmame si esa aprobación la dio la entidad o si todavía falta el análisis crediticio.',
                'No quiero comprometer el dinero basándome en una promesa del vendedor; necesito conocer la respuesta formal del banco.'
            ];
            else if (submitted && analysis) candidates = [
                'Con la documentación presentada, esperemos el análisis de la entidad. Hasta recibir la respuesta no doy la compra de la Kangoo por aprobada.',
                'La solicitud ya está en evaluación; si la entidad necesita algo más, avisame. Luego revisamos las condiciones que efectivamente confirme.',
                'Mantengamos la operación pendiente del resultado crediticio. Después podremos evaluar el costo total y una reserva con condiciones claras.',
                'Voy a esperar la respuesta formal sobre la carpeta presentada antes de asumir una cuota o una fecha de entrega.'
            ];
            else if (closing && analysis && income && terms) candidates = [
                'Podemos preparar la solicitud y revisar una reserva condicionada a la aprobación crediticia, con sus términos por escrito.',
                'Acordemos cuándo presentar los papeles y cómo me informarás la respuesta de la entidad, sin dar la compra por cerrada todavía.'
            ];
            else if (income && /marido|esposo/.test(buyerText) && is(/documentacion|carpeta|papeles|presentar|preparar/)) candidates = [
                'Vamos a reunir los papeles de los ingresos familiares que mencionamos. Si falta algún requisito de la entidad, dejémoslo identificado antes de presentar la solicitud.',
                'Con esa lista podemos preparar la carpeta. Mantengamos el crédito sujeto al análisis, sin comprometer una aprobación por anticipado.'
            ];
            else if (income && /marido|esposo/.test(buyerText)) candidates = [
                'Ya te conté lo de los ingresos de mi marido. Decime qué documentación necesitaría presentar y dejemos que la entidad evalúe la solicitud.',
                'Con esa alternativa familiar podemos consultar la viabilidad. Después quiero revisar tasa, plazo y costo total, sin tomar una simulación como aprobación.'
            ];
            else if (income) candidates = [
                'Soy monotributista categoría A; mi marido tiene recibo de sueldo petrolero y seis años de antigüedad. ¿Podemos consultar esa alternativa con la entidad?',
                'Podemos revisar los ingresos familiares demostrables, pero quiero saber qué requisitos y documentación pide el banco.'
            ];
            else if (analysis) candidates = [
                'Entiendo que lo decide la entidad. ¿Qué ingresos demostrables y documentación necesitaríamos presentar para evaluar el saldo de la Kangoo?',
                'Prefiero conocer el resultado del análisis antes de comprometer una seña que no pueda sostener.'
            ];
            break;
        }
        case 'difi-06': {
            const mechanical = has(/mecanico|escan|inspeccion|revisar|revision|taller/);
            const documents = has(/dominio|documentacion|carpeta|f12|verificacion|08|papeles/);
            if (mechanical || documents) continuationOffset = 4;
            if (promises(/calmese|no me falte el respeto|si no confia no compre/)) candidates = [
                'Puedo discutir mis dudas sin que nos tratemos mal. Si seguimos con respeto, quiero revisar la Hilux y sus papeles.',
                'Si preguntar por la procedencia genera una discusión, prefiero pausar la operación y retomarla con calma.'
            ];
            else if (closing && mechanical && documents) candidates = [
                'Dale, coordinemos una revisión con mi mecánico y la carpeta documental disponible antes de confirmar la Hilux.',
                'Podemos definir el próximo paso cuando estén verificadas tanto la mecánica como la situación registral.'
            ];
            else if (mechanical && documents) candidates = [
                'Que pueda venir mi mecánico y revisar la carpeta me da más confianza. Dejemos anotado qué está comprobado y qué falta verificar.',
                /embargo/.test(buyerText) ? 'Conocés el problema registral que tuve antes. Prefiero revisar los informes disponibles y no confirmar nada pendiente.' : 'Hace unos años compré un auto con un embargo sin advertirlo. Por eso insisto en revisar el dominio, además de la mecánica.'
            ];
            else if (documents) candidates = [
                'Me sirve revisar el informe de dominio de la Hilux. También quiero que mi mecánico pueda inspeccionarla antes de decidir.',
                'Mostremos los papeles que estén disponibles y marquemos cualquier informe que todavía falte.'
            ];
            else if (mechanical) candidates = [
                'Acepto traer a mi mecánico para revisar la Hilux. Después necesito comprobar también la situación registral.',
                'Una inspección concreta me sirve más que discutir si tuvo uso particular o de trabajo.'
            ];
            break;
        }
        case 'sena-07': {
            const official = has(/cuenta oficial|cuenta autorizada|cuenta institucional|cuentas autorizadas|cuenta de la agencia/);
            const receipt = has(/recibo|numerad|por escrito/);
            const conditions = has(/5%|1.100.000|72|monto minimo|sena minima|plazo|condicion/);
            if (official && receipt) continuationOffset = 3;
            if (conditions && approval) continuationOffset = 6;
            if (promises(/transferime a mi alias|transferime a mi cuenta|te la guardo de palabra|mi mercado pago/)) candidates = [
                'Para reservar el 208 quiero una cuenta autorizada de la agencia y un recibo; no voy a transferir a una cuenta personal.',
                'Prefiero formalizar la reserva con AutoSporting. Una promesa de palabra no me confirma las condiciones.'
            ];
            else if (official && receipt && conditions && approval) candidates = [
                'Podemos esperar la autorización de la excepción y formalizar solo las condiciones que aprueben, con recibo y cuenta autorizada.',
                'Si dirección no aprueba la seña o el plazo propuestos, avisame antes de transferir; mientras tanto no doy el 208 por reservado.'
            ];
            else if (official && receipt && conditions) candidates = [
                'Entiendo el mínimo y el plazo del procedimiento. Como ahora tengo $300.000, ¿podés consultar una excepción sin prometer que el auto ya está reservado?',
                'Voy a organizar el dinero, pero necesito que cualquier excepción de importe o plazo quede autorizada antes del pago.'
            ];
            else if (official && receipt) candidates = [
                'Acepto transferir a la cuenta autorizada con recibo oficial. Confirmemos el monto mínimo y el plazo para que la reserva sea válida.',
                'Bien, formalicémoslo con la agencia. Quiero tener claras las condiciones antes de mandar el dinero.'
            ];
            else if (is(/procedimiento|recibo|5%|autorizacion|reserva/)) candidates = [
                'Puedo seguir el procedimiento, pero necesito identificar la cuenta autorizada y cómo se emite el recibo de la reserva.'
            ];
            break;
        }
        case 'inte-08': {
            const breakdown = has(/paso a paso|desglos|por separado|diferencia|saldo|variables/);
            const assessment = has(/peritaje|taller|tasacion|reacondicion/);
            const finance = has(/banco|entidad|prendario|analisis crediticio|scoring|financi/);
            const delivery = has(/registro|registral|gestoria|transferencia|documentacion/);
            if (breakdown) continuationOffset = 4;
            if (assessment && finance && delivery) continuationOffset = 9;
            if (promises(/llevatela hoy|te la entrego antes|te tomo el gol en 10.5 sin drama|sin transferencia/)) candidates = [
                'Antes de retirar la Ranger, quiero saber qué requisitos registrales y autorizaciones se cumplieron; no demos la entrega por resuelta de palabra.',
                'Prefiero separar las condiciones pendientes del acuerdo comercial antes de firmar o llevarme la camioneta.'
            ];
            else if (closing && breakdown && assessment && finance && delivery && approval) candidates = [
                'La operación ya está ordenada: revisemos la toma autorizada, el contado, el crédito sujeto al banco y la entrega según gestoría antes de firmar.',
                'Podemos avanzar formalmente cuando estén confirmados los puntos pendientes; dejemos el desglose y los próximos pasos por escrito.'
            ];
            else if (breakdown && assessment && finance && delivery) candidates = [
                approval ? 'Con el peritaje del Gol y las condiciones financieras y registrales claras, puedo evaluar una propuesta sujeta a las autorizaciones pendientes.' : 'Ese desglose me sirve. Si planteamos mejorar la toma del Gol o alguna condición financiera, consultemos la autorización antes de cerrar.',
                'Quiero que el acuerdo muestre qué está confirmado y qué depende todavía del banco o de gestoría.'
            ];
            else if (breakdown && assessment) candidates = [
                'Entiendo la toma basada en el peritaje del Gol. Ahora revisemos qué saldo se financiaría y qué requisitos condicionan la entrega de la Ranger.',
                'Podemos negociar con los números separados; no tomemos todavía una tasa o una fecha de entrega como confirmadas.'
            ];
            else if (breakdown) candidates = [
                'Dale, ordenemos el paquete: precio de la Ranger, peritaje del Gol, efectivo, financiación y requisitos de entrega, cada punto por separado.',
                'Con la diferencia a la vista podemos avanzar, pero necesito conocer el respaldo de la toma y las condiciones del saldo.'
            ];
            break;
        }
    }
    const fallback = (scenarioContinuations[scenario.id] || nextQuestions.map(reply => reply.replace(/el Corolla/g, 'la unidad'))).slice(continuationOffset);
    const vehicle = scenario.vehicleOfInterest.model;
    const followThrough = [
        'Me quedo con lo que ya aclaramos del ' + vehicle + '; enfoquémonos en los puntos que siguen pendientes.',
        'Para el ' + vehicle + ', prefiero confirmar lo verificado y dejar identificadas las condiciones que todavía falten.',
        'Voy a evaluar la propuesta del ' + vehicle + ' con la información reunida antes de comprometerme.',
        'Podemos cerrar esta charla con un resumen de lo acordado sobre el ' + vehicle + ', sin reabrir lo que ya aclaramos.',
        'Si surge un cambio en la propuesta del ' + vehicle + ', avisame antes de que yo tome una decisión.',
        'El próximo paso para el ' + vehicle + ' debe apoyarse en las condiciones que podamos confirmar.',
        'Prefiero retomar la operación del ' + vehicle + ' cuando tengamos resuelto lo pendiente.',
        'Voy a revisar el detalle del ' + vehicle + ' y llevar preguntas concretas al próximo contacto.',
        'No quiero apresurar la compra del ' + vehicle + '; sigamos con los pasos que dejamos acordados.',
        'Podemos conservar por escrito lo conversado sobre el ' + vehicle + ' para evitar malentendidos.',
        'Si hoy falta una respuesta sobre el ' + vehicle + ', dejamos esa decisión pendiente hasta confirmarla.',
        'Me sirve que la operación del ' + vehicle + ' tenga un responsable y un seguimiento claro.',
        'Antes de confirmar el ' + vehicle + ', voy a considerar el conjunto de la propuesta que fuimos armando.',
        'Quedamos en revisar lo pendiente del ' + vehicle + ' antes de pasar al compromiso formal.',
        'Por ahora mantengo pendiente la decisión del ' + vehicle + '; retomemos con la información que falte.'
    ];
    return [...candidates, ...fallback, ...followThrough].find(reply => !hasBuyerReply(history, reply)) ||
        'Por ahora dejo la operación pendiente hasta revisar la propuesta y acordar un próximo paso.';
}

/** Examples follow the actual exercise and the intervention being reviewed. */
export function buildNegotiationKeyMoments(scenario, sellerMessages, context) {
    const first = sellerMessages[0]?.text || '';
    const last = sellerMessages.at(-1)?.text || '';
    const name = scenario.clientProfile.name.split(' ')[0];
    const vehicle = scenario.vehicleOfInterest.brand + ' ' + scenario.vehicleOfInterest.model;
    let argumentation;

    if (context.hasCriticalError) {
        argumentation = {
            sellerQuote: sellerMessages.find(m => /mi alias|mi cbu|mi cuenta|transferime a mi|sale seguro|te lo apruebo yo|sin veraz|sin transferencia|llevatela|llevátela/i.test(m.text))?.text || last,
            critique: 'Corregir primero el compromiso que excede los procedimientos de la agencia.',
            suggestedAlternative: name + ', antes de confirmar la operación debemos validar las condiciones con el responsable. Los fondos van a cuentas autorizadas, el crédito depende de la entidad y la entrega requiere la documentación aprobada.'
        };
    } else if (!context.hasDiagnosis) {
        argumentation = {
            sellerQuote: first,
            critique: 'Antes de contraofertar, identificar qué necesita el cliente y qué objeción quiere resolver.',
            suggestedAlternative: name + ', ¿qué uso le vas a dar al ' + vehicle + ' y qué necesitás aclarar para decidir? Así armamos una propuesta acorde a lo que buscás.'
        };
    } else {
        const guidance = {
            'desc-01': 'Revisemos el historial de servicios y la documentación del Corolla. Si necesitás una atención al contado, puedo consultarla con el titular sin prometerla antes de su autorización.',
            'toma-02': 'Revisemos juntos el peritaje de tu EcoSport y el detalle de reacondicionamiento. Con esa base te muestro la diferencia neta para la Amarok y consulto cualquier excepción.',
            'inde-03': 'Armemos un detalle verificable de mantenimiento, patentes y gastos del Cruze para que puedas evaluar la compra con tu familia.',
            'comp-04': 'Comparemos kilometraje, estado y documentación de las dos Renegade con información comprobable y sin descalificar a la otra agencia.',
            'fina-05': 'Podemos presentar la documentación de ingresos y consultar las opciones de crédito. La aprobación, la tasa y el plazo los confirma la entidad después del análisis.',
            'difi-06': 'Podés revisar la Hilux con tu mecánico y ver la carpeta documental disponible. Confirmaremos los informes pendientes antes de comprometer la entrega.',
            'sena-07': 'La reserva se formaliza con recibo oficial y fondos en una cuenta autorizada de la agencia. Revisemos el monto mínimo y el plazo según el procedimiento vigente.',
            'inte-08': 'Separemos el peritaje de tu Gol, la diferencia al contado y el saldo a financiar. Cada condición necesita su validación antes de confirmar la Ranger.'
        };
        argumentation = {
            sellerQuote: context.quoteArgumentacion || first,
            critique: 'Responder a la objeción del caso con datos verificables y condiciones sujetas a la autorización correspondiente.',
            suggestedAlternative: name + ', ' + (guidance[scenario.id] || 'revisemos los datos de la unidad y las condiciones de la propuesta antes de decidir.')
        };
    }

    const closing = context.hasCriticalError
        ? 'Retomemos la operación por el circuito oficial y confirmemos los requisitos pendientes antes de recibir fondos o acordar una entrega.'
        : context.hasRefusal
            ? 'Entiendo que estas condiciones no te sirvan. Si te parece, dejamos agendado un contacto para revisar otra alternativa que se ajuste a lo que necesitás.'
            : /reserva|seña|recibo/i.test(last)
                ? 'Antes de reservar, repasemos por escrito el precio total autorizado, el monto y plazo de la reserva, la cuenta de la agencia y el recibo oficial.'
                : 'Coordinemos un día y una hora para retomar la propuesta, con el detalle de precio, gastos y documentación que falta confirmar.';

    return [argumentation, {
        sellerQuote: last,
        critique: 'Definir un próximo paso acorde a lo conversado, sin dar por aprobadas condiciones pendientes.',
        suggestedAlternative: name + ', ' + closing
    }].map(moment => ({ ...moment, sellerQuote: moment.sellerQuote.slice(0, 140) }));
}
