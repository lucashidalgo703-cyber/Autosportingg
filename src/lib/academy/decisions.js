import { calculateSimulator } from './simulators.js';

const M = 1000000;
const metric = (label, value, unit = 'pesos') => ({ label, value, unit });

export const scenarios = [
    {
        id: 'comprar', title: 'Comprar un vehículo o conservar liquidez', courseId: 'liquidez',
        context: 'Caja inicial de $22 millones. Vencen $12 millones a los 30 días. Una unidad cuesta $12 millones más $1 millón de preparación al inicio y se supone que se venderá a $15 millones al día 60. Sin cobros adicionales ni financiación.',
        objective: 'Compará contribución potencial y capacidad de pagar el vencimiento intermedio.',
        options: [
            { title: 'Comprar ahora', advantage: 'Podría aportar una contribución de $2 millones si se vende al precio supuesto.', risk: 'Se genera una brecha de caja de $3 millones al día 30; requiere una solución que este caso no aporta.', opportunity: 'Los $13 millones de compra y preparación no estarán disponibles para otra alternativa hasta la venta.', formula: 'Contribución = 15 − 12 − 1; menor caja = 22 − 12 − 1 − 12 (millones).', metrics: () => [metric('Contribución hipotética', 2 * M), metric('Menor caja del escenario', -3 * M), metric('Caja al día 60 después de vender y pagar', 12 * M)] },
            { title: 'Conservar liquidez', advantage: 'Permite pagar el vencimiento sin depender de una venta futura.', risk: 'Se renuncia a la contribución potencial; el efectivo también puede perder poder adquisitivo.', opportunity: 'Se deja pasar una contribución potencial de $2 millones, que no estaba garantizada.', formula: 'Caja después del vencimiento = 22 − 12 (millones); rendimiento de la reserva supuesto: cero.', metrics: () => [metric('Contribución de esta compra no realizada', 0), metric('Caja después del vencimiento', 10 * M)] },
        ],
    },
    {
        id: 'descuento', title: 'Vender con descuento o esperar', courseId: 'rentabilidad',
        context: 'Unidad con costo total de $12 millones y precio de $15 millones. Hay oferta inmediata con 5% de descuento. Esperar dos meses suma $300.000 de costos y supone conseguir el precio completo. Se omiten impuestos y nueva rentabilidad del dinero liberado.',
        objective: 'Evaluá $450.000 más de contribución potencial a cambio de dos meses de espera.',
        options: [
            { title: 'Aceptar el descuento', advantage: 'Se liberan $14,25 millones hoy y se elimina el riesgo de esa espera.', risk: 'La contribución es menor que en la venta futura supuesta.', opportunity: 'Frente al caso de espera exitoso se resignan $450.000; el capital liberado podría tener otro uso.', formula: 'Venta = 15 × 0,95; contribución = 14,25 − 12 (millones).', metrics: () => calculateSimulator('descuentos', { price: 15 * M, discount: 5, cost: 12 * M }).metrics },
            { title: 'Esperar dos meses', advantage: 'Contribución potencial de $2,7 millones si se mantiene el precio.', risk: 'Puede no venderse en el plazo o precio supuesto; los costos podrían subir.', opportunity: 'Se posterga disponer de $14,25 millones durante dos meses.', formula: 'Contribución = 15 − 12 − 0,3 (millones); sin rendimiento alternativo incluido.', metrics: () => [metric('Contribución hipotética', 2.7 * M), metric('Costos adicionales de espera', 0.3 * M), metric('Tiempo adicional supuesto', 2, 'meses')] },
        ],
    },
    {
        id: 'financiar', title: 'Financiar una operación', courseId: 'financiacion',
        context: 'Costo de unidad $12 millones. Oferta de contado $15 millones; alternativa financiada: anticipo de $6 millones y tres cobros mensuales de $3,5 millones. Tasa de descuento educativa: 2% mensual. Se supone cobro completo y puntual, sin gastos de crédito.',
        objective: 'Compará caja inicial, contribución nominal y valor presente de los cobros.',
        options: [
            { title: 'Cobrar al contado', advantage: 'Cobro completo inmediato sin exposición de crédito futura.', risk: 'Se resigna el mayor precio nominal de la venta financiada.', opportunity: 'La financiación podría generar más valor, pero depende de cobros y costos no incorporados.', formula: 'Contribución = 15 − 12 (millones); VP del cobro inmediato = 15 millones.', metrics: () => [metric('Cobro inmediato', 15 * M), metric('Contribución nominal', 3 * M), metric('Valor presente de los cobros', 15 * M)] },
            { title: 'Aceptar el plan financiado', advantage: 'Mayor contribución nominal si se cobran las tres cuotas.', risk: 'Solo ingresan $6 millones hoy; hay mora, incumplimiento y gestión no incluidos en el cálculo.', opportunity: 'Quedan $10,5 millones nominales por cobrar, que no están disponibles para reinvertir hoy.', formula: 'VP = 6 + 3,5/1,02 + 3,5/1,02² + 3,5/1,02³ (millones).', metrics: () => [metric('Cobro inmediato', 6 * M), metric('Contribución nominal hipotética', 4.5 * M), metric('Valor presente de cobros supuestos', 6 * M + [1, 2, 3].reduce((sum, n) => sum + 3.5 * M / 1.02 ** n, 0))] },
        ],
    },
    {
        id: 'permuta', title: 'Aceptar una permuta', courseId: 'riesgos',
        context: 'Unidad al costo total de $14 millones, venta acordada por $18 millones. El comprador propone entregar $10 millones y una permuta tomada en $8 millones. Reventa estimada de la permuta: $8,5 millones, preparación y cierre: $500.000.',
        objective: 'Diferenciá precio reconocido, efectivo y resultado al realizar la permuta.',
        options: [
            { title: 'Aceptar la permuta', advantage: 'Facilita el cierre y podría mantener $4 millones de resultado combinado.', risk: 'Se incorporan nuevo inventario, costos y una reventa incierta.', opportunity: 'Los $8 millones reconocidos en la permuta no son efectivo para otra compra.', formula: 'Resultado combinado = 18 − 8 + 8,5 − 14 − 0,5 (millones).', metrics: () => calculateSimulator('permutas', { sale: 18 * M, trade: 8 * M, resale: 8.5 * M, cost: 14 * M, prep: 0.5 * M }).metrics },
            { title: 'Mantener oferta solo de contado', advantage: 'Si aparece un comprador al mismo precio, el cobro sería completo.', risk: 'No se supone que exista hoy ese comprador; podría demorar o requerir menor precio.', opportunity: 'Se puede perder la operación actual y mantener $14 millones de costo inmovilizado.', formula: 'Venta hipotética futura de contado: resultado = 18 − 14 (millones), sin costos de espera.', metrics: () => [metric('Resultado hipotético si se vende al contado', 4 * M), metric('Costo que permanece en inventario mientras espera', 14 * M)] },
        ],
    },
    {
        id: 'distribuir', title: 'Distribuir capital entre vehículos', courseId: 'direccion',
        context: 'Capital $50 millones; se exige conservar $10 millones de reserva. Horizonte común: 90 días. Alternativa concentrada: $40 millones en una unidad, retorno supuesto 20%. Diversificada: $20 millones al 12% y $20 millones al 15%. Reserva sin rendimiento.',
        objective: 'Compará retorno supuesto y concentración, sin confundir diversificación con ausencia de riesgo.',
        options: [
            { title: 'Concentrar en una unidad', advantage: 'Mayor resultado bajo el supuesto de venta y retorno elegido.', risk: 'El 80% del capital total depende de una sola unidad.', opportunity: 'Se renuncia a diversificar; una demora afecta gran parte del capital.', formula: 'Resultado = 40 × 20% = 8 millones; reserva = 50 − 40.', metrics: () => calculateSimulator('asignacion', { capital: 50 * M, a: 40 * M, rateA: 20, b: 0, rateB: 0 }).metrics },
            { title: 'Diversificar entre dos alternativas', advantage: 'Distribuye el capital de compra entre dos exposiciones.', risk: 'Los riesgos pueden estar correlacionados y ambas unidades podrían demorarse.', opportunity: 'El resultado supuesto es $2,6 millones menor que en el caso concentrado exitoso.', formula: 'Resultado = 20 × 12% + 20 × 15% = 5,4 millones; reserva = 10 millones.', metrics: () => calculateSimulator('asignacion', { capital: 50 * M, a: 20 * M, rateA: 12, b: 20 * M, rateB: 15 }).metrics },
        ],
    },
    {
        id: 'stock-lento', title: 'Gestionar inventario de baja rotación', courseId: 'capital',
        context: 'Unidad al costo de $12 millones. Venta inmediata posible por $13,2 millones. Esperar tres meses supone vender a $14 millones con $200.000 mensuales de mantenimiento. Como sensibilidad, el capital liberado hoy podría financiar una nueva operación con contribución neta supuesta de $1 millón dentro de esos tres meses.',
        objective: 'Compará la contribución aislada con una alternativa de reinversión incierta.',
        options: [
            { title: 'Vender y evaluar reinversión', advantage: 'Libera capital hoy; con la nueva operación supuesta, el resultado combinado sería mayor.', risk: 'La reinversión no está asegurada; sin ella la contribución es $1,2 millones.', opportunity: 'Se resignan $200.000 frente al caso de espera exitoso, antes de reinvertir.', formula: 'Contribución actual = 13,2 − 12 = 1,2; con reinversión supuesta = 1,2 + 1 = 2,2 (millones).', metrics: () => [metric('Contribución de venta inmediata', 1.2 * M), metric('Resultado combinado condicionado a reinversión', 2.2 * M), metric('Efectivo liberado hoy', 13.2 * M)] },
            { title: 'Mantener la unidad tres meses', advantage: 'Podría obtener $1,4 millones sin encontrar una nueva operación.', risk: 'Precio y plazo inciertos; siguen los costos de mantenimiento.', opportunity: 'No se libera el capital para la alternativa supuesta de $1 millón; no es un costo contable adicional.', formula: 'Contribución = 14 − 12 − 3 × 0,2 = 1,4 millones.', metrics: () => [metric('Contribución hipotética', 1.4 * M), metric('Costo de mantenimiento', 0.6 * M), metric('Espera adicional', 3, 'meses')] },
        ],
    },
];

export function evaluateDecision(id, option) {
    const scenario = scenarios.find(item => item.id === id);
    if (!scenario || !Number.isInteger(option) || !scenario.options[option]) throw new Error('Escenario o alternativa inválidos.');
    const selected = scenario.options[option];
    return { title: selected.title, metrics: selected.metrics(), advantage: selected.advantage, risk: selected.risk, opportunity: selected.opportunity, formula: selected.formula };
}
