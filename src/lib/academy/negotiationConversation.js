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
    const text = normalizeText(reply);
    return history.some(message => message.sender === 'buyer' && normalizeText(message.text) === text);
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
