import test from 'node:test';
import assert from 'node:assert/strict';
import { NEGOTIATION_SCENARIOS } from '../src/lib/academy/negotiationScenarios.js';
import { hasBuyerReply, simulateNegotiationBuyerReply } from '../src/lib/academy/negotiationConversation.js';

const normalized = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function practice(id) {
    const scenario = NEGOTIATION_SCENARIOS.find(item => item.id === id);
    const history = [];
    return message => {
        const reply = simulateNegotiationBuyerReply(scenario, history, message, history.length / 2 + 1, scenario.level);
        assert.equal(hasBuyerReply(history, reply), false, 'Cada paso debe aportar una intervención nueva');
        history.push({ sender: 'seller', text: message }, { sender: 'buyer', text: reply });
        return normalized(reply);
    };
}

test('Lorena revela sus ingresos una vez y luego sigue con documentación y análisis pendiente', () => {
    const answer = practice('fina-05');
    const diagnosis = answer('¿Qué ingresos podés demostrar para el análisis crediticio?');
    assert.match(diagnosis, /marido|esposo|conyuge/);
    const alternative = answer('La aprobación depende del banco. Podemos presentar a tu cónyuge como codeudor si corresponde.');
    assert.doesNotMatch(alternative, /soy monotributista|categoria a|seis anos de antiguedad/);
    const paperwork = answer('Sumemos el recibo de sueldo de tu marido a la documentación y presentemos la carpeta al banco.');
    assert.doesNotMatch(paperwork, /soy monotributista|categoria a|seis anos de antiguedad/);
    const waiting = answer('La documentación queda presentada; aguardamos el análisis. Te aviso cuando tengamos respuesta de la entidad.');
    assert.match(waiting, /respuesta|analisis|entidad|banco|aprobacion|solicitud/);
    assert.doesNotMatch(waiting, /cuento con siete millones|tengo 7 millones|a sola firma|solo con dni|que documentacion necesit/);
});

test('Martín avanza desde sus dudas al seguimiento sin volver a pedir día, hora o material ya enviados', () => {
    const answer = practice('inde-03');
    const concern = answer('¿Qué te preocupa del mantenimiento o las patentes del Cruze?');
    assert.match(concern, /mantenimiento|patentes|liquidez|vacaciones/);
    answer('Te preparo un detalle verificable de mantenimiento y patentes para revisarlo con tu señora, sin apurarte.');
    const appointment = answer('Te paso el detalle por escrito y coordinemos un llamado el jueves a las 11 para revisar lo que hablaron en familia.');
    assert.match(appointment, /jueves|llamado|coordinad|acordad|horario|seguimiento|dia y la hora|contacto/);
    assert.doesNotMatch(appointment, /acordemos la hora|confirmemos dia, hora/);
    const next = answer('Retomamos en ese llamado con el presupuesto y la ficha de mantenimiento ya enviados.');
    assert.doesNotMatch(next, /confirmemos dia, hora|acordemos la hora|vas a preparar|cuanto me va a salir|lo que me frena/);
});

test('Patricia pasa del peritaje a la diferencia y propuesta formal sin reiniciar la objeción de toma', () => {
    const answer = practice('toma-02');
    const assessment = answer('Revisemos el peritaje de tu EcoSport y el detalle de reacondicionamiento.');
    assert.match(assessment, /peritaje|reacondicionamiento|diferencia/);
    const difference = answer('Podemos consultar una excepción autorizada y calcular la diferencia neta para la Amarok.');
    assert.match(difference, /diferencia|autorizacion|gerencia/);
    const proposal = answer('La propuesta queda escrita con el valor de toma autorizado y la diferencia neta. Coordinemos la revisión de documentación.');
    const reservation = answer('La documentación ya fue revisada; definamos los pasos de la reserva oficial de la Amarok.');
    assert.match(proposal + reservation, /propuesta|condiciones|reserva|formal/);
    assert.doesNotMatch(proposal + reservation, /en internet|mercadolibre|piden 16|reciban en 13|toman en 13/);
});

test('Negar una aprobación garantizada no se interpreta como prometer el crédito', () => {
    const answer = practice('fina-05');
    const reply = answer('No te lo apruebo yo ni puedo prometer que sale seguro; decide la entidad tras el análisis crediticio. ¿Qué ingresos podés demostrar?');
    assert.match(reply, /ingresos|marido|esposo|monotribut|documentacion/);
    assert.doesNotMatch(reply, /esa aprobacion|promesa del vendedor/);
});

test('Rechazar la cuenta personal permite avanzar por el circuito de reserva oficial', () => {
    const answer = practice('sena-07');
    const reply = answer('No voy a decirte transferime a mi cuenta: la reserva se formaliza en la cuenta oficial de la agencia, con recibo y condiciones de monto y plazo por escrito.');
    assert.match(reply, /minimo|plazo|condiciones|excepcion|organizar el dinero|autoriz/);
    assert.doesNotMatch(reply, /no voy a transferir a una cuenta personal|promesa de palabra/);
});

test('Rechazar entrega anticipada mantiene el avance de la operación integral', () => {
    const answer = practice('inte-08');
    answer('Vamos paso a paso: peritaje del Gol, diferencia y financiación sujeta al análisis del banco.');
    const reply = answer('No puedo decirte llevátela hoy ni te la entrego antes: gestoría debe aprobar la documentación y la transferencia. Las excepciones las consulta el titular.');
    assert.match(reply, /desglose|peritaje|acuerdo|propuesta|autorizacion/);
    assert.doesNotMatch(reply, /demos la entrega por resuelta de palabra/);
});


test('Las promesas afirmativas de crédito, pago personal y entrega anticipada conservan la objeción del cliente', () => {
    const credit = practice('fina-05')('Te lo apruebo yo y sale seguro con DNI.');
    assert.match(credit, /entidad|banco|analisis|respuesta formal/);
    const payment = practice('sena-07')('Transferime a mi cuenta y te la guardo de palabra.');
    assert.match(payment, /autorizada|oficial|recibo|formalizar/);
    const delivery = practice('inte-08')('Llevátela hoy, te la entrego antes de terminar la transferencia.');
    assert.match(delivery, /requisitos|registral|pendientes|autorizacion|no demos/);
});
