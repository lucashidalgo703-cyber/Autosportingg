// Motor educativo independiente: no importa servicios ni cálculos operativos del CRM.
import { parseAcademyDecimal } from './decimal.js';
const money = (id, label, value, min = 0) => ({ id, label, value, min, max: 1e12, step: 'any', unit: 'pesos' });
const rate = (id, label, value, min = 0) => ({ id, label, value, min, max: 1000, step: 'any', unit: '%' });
const periods = (id, label, value, max = 600) => ({ id, label, value, min: 1, max, step: 1, unit: 'períodos' });
const metric = (label, value, unit = 'pesos') => ({ label, value, unit });
const unavailable = (label, state, explanation) => ({ label, value: null, unit: '', state, explanation });
const definition = (id, title, formula, assumption, fields, run) => ({ id, title, formula, assumption, fields, run });

export const simulators = [
    definition('margen', 'Margen comercial', 'Contribución = venta − compra − costos; margen = contribución / venta × 100', 'Costos variables atribuibles. Excluye estructura, financiación e impuestos no ingresados. No es utilidad neta.', [money('sale', 'Precio de venta', 12000000, 0.01), money('cost', 'Costo de compra', 9000000), money('extra', 'Otros costos variables', 600000)], v => {
        const profit = v.sale - v.cost - v.extra;
        return [metric('Contribución', profit), metric('Margen sobre venta', profit / v.sale * 100, '%'), metric('Capital de compra y preparación', v.cost + v.extra)];
    }),
    definition('capital', 'Rentabilidad sobre capital', 'Retorno = resultado / capital comprometido × 100', 'Resultado y capital definidos para una misma operación y horizonte; no anualiza ni representa ROIC contable.', [money('profit', 'Resultado de la operación', 1800000, -1e12), money('capital', 'Capital comprometido', 10000000, 0.01)], v => [metric('Retorno por operación', v.profit / v.capital * 100, '%')]),
    definition('roi', 'ROI', 'ROI = (retornos totales − inversión inicial) / inversión inicial × 100', 'Retornos acumulados netos de costos posteriores, incluyendo recuperación del desembolso. Sin descuento temporal.', [money('investment', 'Inversión inicial', 2000000, 0.01), money('returns', 'Retornos totales del horizonte', 2600000, -1e12)], v => [metric('Beneficio neto de la inversión', v.returns - v.investment), metric('ROI del horizonte', (v.returns - v.investment) / v.investment * 100, '%')]),
    definition('rotacion', 'Rotación de inventario', 'Promedio = (stock inicial + final) / 2; rotación = costo vendido / promedio; días = días del período / rotación', 'Todos los valores de stock al costo, en la misma moneda. Promedio de dos extremos; no mide la edad individual de cada auto.', [money('sold', 'Costo de vehículos vendidos en el período', 120000000), money('opening', 'Inventario inicial al costo', 25000000), money('closing', 'Inventario final al costo', 35000000), periods('days', 'Duración del período en días', 365, 3660)], v => {
        const average = (v.opening + v.closing) / 2;
        if (average === 0) return [metric('Inventario promedio', 0), unavailable('Rotación del período', 'undefined', 'Sin inventario promedio positivo, esta razón no está definida. Revisá si los extremos representan el stock del período.'), unavailable('Permanencia aproximada', 'undefined', 'No se puede estimar con inventario promedio cero.')];
        if (v.sold === 0) return [metric('Inventario promedio', average), metric('Rotación del período', 0, 'veces'), unavailable('Permanencia aproximada', 'undefined', 'No hubo ventas: no existe una estimación finita de días basada en la rotación observada.')];
        return [metric('Inventario promedio', average), metric('Rotación del período', v.sold / average, 'veces'), metric('Permanencia aproximada', v.days * average / v.sold, 'días')];
    }),
    definition('oportunidad', 'Costo de oportunidad', 'Resultado alternativo = capital × tasa alternativa; diferencia = resultado elegido − alternativo', 'Mismo plazo, moneda y riesgo supuesto. Tasa de un solo horizonte, sin capitalización.', [money('capital', 'Capital disponible', 10000000), rate('alternative', 'Retorno alternativo del horizonte', 12, -100), money('chosen', 'Resultado de la alternativa elegida', 900000, -1e12)], v => [metric('Resultado alternativo no obtenido', v.capital * v.alternative / 100), metric('Diferencia de la elegida frente a alternativa', v.chosen - v.capital * v.alternative / 100)]),
    definition('simple', 'Interés simple', 'Interés = P × i × n; monto = P + interés', 'Tasa por período y plazo en períodos de igual duración. Sin cargos ni impuestos.', [money('principal', 'Principal', 1000000), rate('rate', 'Tasa por período', 10), periods('periods', 'Cantidad de períodos', 2)], v => [metric('Interés', v.principal * v.rate / 100 * v.periods), metric('Monto final', v.principal * (1 + v.rate / 100 * v.periods))]),
    definition('compuesto', 'Interés compuesto', 'Monto = P × (1 + i)^n', 'Reinversión de intereses a tasa constante por período, sin aportes, retiros ni costos.', [money('principal', 'Principal', 1000000), rate('rate', 'Tasa por período', 10), periods('periods', 'Cantidad de períodos', 2)], v => [metric('Monto final', v.principal * (1 + v.rate / 100) ** v.periods), metric('Interés acumulado', v.principal * ((1 + v.rate / 100) ** v.periods - 1))]),
    definition('tasas', 'Tasas nominales y efectivas', 'i = TNA / m; TEA = (1 + i)^m − 1', 'TNA convertible en m períodos iguales por año. TEA no equivale al CFT: no incluye cargos ni impuestos.', [rate('nominal', 'TNA', 24), periods('frequency', 'Capitalizaciones por año', 12, 365)], v => [metric('Tasa efectiva por período', v.nominal / v.frequency, '%'), metric('Tasa efectiva anual', ((1 + v.nominal / 100 / v.frequency) ** v.frequency - 1) * 100, '%')]),
    definition('inflacion', 'Inflación y retorno real', 'Valor en pesos iniciales = monto / (1 + inflación)^n; retorno real = (1 + r) / (1 + inflación)^n − 1', 'Inflación constante por período; retorno nominal ingresado para el horizonte completo. No proyecta inflación real.', [money('amount', 'Monto nominal al final', 1200000), rate('inflation', 'Inflación por período', 20, -99.99), periods('periods', 'Cantidad de períodos', 1), rate('nominal', 'Retorno nominal de todo el horizonte', 32, -100)], v => [metric('Poder adquisitivo en pesos iniciales', v.amount / (1 + v.inflation / 100) ** v.periods), metric('Retorno real del horizonte', ((1 + v.nominal / 100) / (1 + v.inflation / 100) ** v.periods - 1) * 100, '%')]),
    definition('presente', 'Valor presente', 'VP = flujo futuro / (1 + tasa)^n', 'Un único flujo al final del plazo; tasa de descuento constante por período y en la misma moneda del flujo.', [money('future', 'Flujo futuro', 1210000, -1e12), rate('rate', 'Tasa de descuento por período', 10, -99.99), periods('periods', 'Cantidad de períodos', 2)], v => [metric('Valor presente', v.future / (1 + v.rate / 100) ** v.periods)]),
    definition('cuotas', 'Financiación en cuotas', 'Cuota = P × i / [1 − (1 + i)^(−n)]; si i = 0: P/n', 'Sistema francés, tasa fija por período, cuotas vencidas de igual duración. Sin seguros, impuestos ni comisiones: no calcula CFT.', [money('principal', 'Principal financiado', 1000000, 0.01), rate('rate', 'Tasa por período', 5), periods('periods', 'Cantidad de cuotas', 12)], v => {
        const schedule = amortization(v.principal, v.rate, v.periods);
        const total = compensatedSum(schedule.map(row => row.payment));
        return { metrics: [metric('Cuota teórica', schedule[0].payment), metric('Total pagado', total), metric('Interés total', total - v.principal)], rows: schedule };
    }),
    definition('flujo', 'Flujo de caja', 'Saldo final = saldo inicial + cobros − pagos, período por período', 'Tres meses ficticios; cobros y pagos se agrupan al cierre mensual. Puede haber faltantes dentro de cada mes no visibles aquí.', [money('opening', 'Saldo inicial', 3000000, -1e12), ...[1, 2, 3].flatMap(n => [money(`income${n}`, `Cobros mes ${n}`, 4000000), money(`expense${n}`, `Pagos mes ${n}`, n === 2 ? 6000000 : 3000000)])], v => {
        let balance = v.opening;
        const result = [1, 2, 3].map(n => { balance += v[`income${n}`] - v[`expense${n}`]; return metric(`Saldo al cierre del mes ${n}`, balance); });
        return [...result, metric('Menor saldo entre apertura y cierres', Math.min(v.opening, ...result.map(m => m.value)))];
    }),
    definition('descuentos', 'Descuentos', 'Venta descontada = precio × (1 − descuento); contribución = venta descontada − costo total', 'Descuento sobre precio comercial. Costo total atribuible ingresado manualmente, sin cambios en el CRM.', [money('price', 'Precio antes del descuento', 15000000, 0.01), { ...rate('discount', 'Descuento', 5), max: 100 }, money('cost', 'Costo total atribuible', 12000000)], v => [metric('Precio con descuento', v.price * (1 - v.discount / 100)), metric('Contribución después del descuento', v.price * (1 - v.discount / 100) - v.cost), metric('Descuento bruto sobre precio de lista', v.price * v.discount / 100)]),
    definition('permutas', 'Permutas', 'Efectivo inicial = venta − toma; resultado al realizar ambas unidades = efectivo + reventa − costo vendido − preparación', 'Se supone reventa futura al valor ingresado y cobro completo; sin costos de tiempo, financiación ni impuestos. La toma no es efectivo ni ganancia realizada.', [money('sale', 'Precio de venta de la unidad original', 18000000), money('trade', 'Valor reconocido por la permuta', 8000000), money('resale', 'Reventa estimada de la permuta', 8500000), money('cost', 'Costo atribuible de la unidad original', 14000000), money('prep', 'Preparación y venta de la permuta', 500000)], v => [metric('Efectivo inicial (negativo: se entrega dinero)', v.sale - v.trade), metric('Capital reconocido en permuta', v.trade), metric('Resultado hipotético al completar ambas ventas', v.sale - v.trade + v.resale - v.cost - v.prep)]),
    definition('recuperacion', 'Recuperación de capital', 'Payback simple = inversión / flujo neto periódico uniforme', 'Flujo neto constante al cierre de cada período; si no es positivo, una inversión positiva no se recupera. La fracción supone distribución uniforme; muestra también períodos completos. No descuenta ni considera flujos posteriores.', [money('investment', 'Inversión inicial', 9000000), money('flow', 'Flujo neto por período', 1500000, -1e12)], v => {
        if (v.investment === 0) return [metric('Recuperación simple aproximada', 0, 'períodos'), metric('Períodos completos para recuperar', 0, 'períodos')];
        if (v.flow <= 0) return [unavailable('Recuperación de la inversión', 'impossible', 'No se recupera bajo un flujo neto constante nulo o negativo. Cambiar el flujo futuro requiere otro escenario.')];
        return [metric('Recuperación simple aproximada', v.investment / v.flow, 'períodos'), metric('Períodos completos para recuperar', Math.ceil(v.investment / v.flow), 'períodos')];
    }),
    definition('asignacion', 'Asignación de capital', 'Reserva = capital − A − B; resultado supuesto = A × rA + B × rB', 'Dos alternativas de igual horizonte. Reserva sin rendimiento; no optimiza ni garantiza retornos. No permite invertir más capital del disponible.', [money('capital', 'Capital total', 30000000, 0.01), money('a', 'Capital en alternativa A', 12000000), rate('rateA', 'Retorno supuesto A', 12, -100), money('b', 'Capital en alternativa B', 10000000), rate('rateB', 'Retorno supuesto B', 18, -100)], v => {
        if (v.a + v.b > v.capital) throw new Error('La asignación supera el capital disponible.');
        const profit = v.a * v.rateA / 100 + v.b * v.rateB / 100;
        return [metric('Reserva sin asignar', v.capital - v.a - v.b), metric('Resultado hipotético del horizonte', profit), metric('Retorno sobre capital total', profit / v.capital * 100, '%')];
    }),
];

// Cota absoluta por identidad monetaria y por total: un centavo de peso.
export const AMORTIZATION_TOLERANCE = 0.01;
export function compensatedSum(values) {
    let sum = 0, correction = 0;
    for (const value of values) {
        const y = value - correction;
        const next = sum + y;
        correction = (next - sum) - y;
        sum = next;
    }
    return sum;
}

export function amortization(principal, percent, count) {
    if (!Number.isFinite(principal) || principal <= 0 || principal > 1e12 || !Number.isFinite(percent) || percent < 0 || percent > 1000 || !Number.isInteger(count) || count < 1 || count > 600) throw new Error('Condiciones de financiación inválidas.');
    const i = percent / 100;
    const log = Math.log1p(i);
    const annuity = n => i === 0 ? n : -Math.expm1(-n * log) / i;
    const payment = principal / annuity(count);
    const failure = () => { throw new Error('Esta combinación excede la precisión monetaria garantizada de $0,01. Reducí el capital, la tasa o el plazo.'); };
    if (!Number.isFinite(payment) || Number.EPSILON * payment * count > AMORTIZATION_TOLERANCE / 4) failure();
    let opening = principal;
    const rows = Array.from({ length: count }, (_, index) => {
        const remaining = count - index;
        // Saldo como VP de cuotas restantes; amortización geométrica directa.
        // No se acumulan restas cuota-interés ni se fuerza un pago final.
        const capital = i === 0 ? payment : payment * Math.exp(-remaining * log);
        const interest = opening * i;
        const balance = payment * annuity(remaining - 1);
        if (![capital, interest, balance].every(Number.isFinite) || capital < 0 || balance < 0 || Math.abs(payment - capital - interest) > AMORTIZATION_TOLERANCE || Math.abs(opening - capital - balance) > AMORTIZATION_TOLERANCE) failure();
        opening = balance;
        return { period: index + 1, payment, interest, capital, balance };
    });
    if (Math.abs(compensatedSum(rows.map(row => row.capital)) - principal) > AMORTIZATION_TOLERANCE || rows.at(-1).balance !== 0 || Math.abs(compensatedSum(rows.map(row => row.interest)) + principal - payment * count) > AMORTIZATION_TOLERANCE) failure();
    return rows;
}

export function calculateSimulator(id, input) {
    const simulator = simulators.find(item => item.id === id);
    if (!simulator) throw new Error('Simulador desconocido.');
    const values = {};
    for (const field of simulator.fields) {
        const raw = input[field.id];
        if (raw === '' || raw === null || raw === undefined || !['string', 'number'].includes(typeof raw) || String(raw).trim() === '') throw new Error(`Completá ${field.label}.`);
        let value;
        try { value = parseAcademyDecimal(raw); } catch (error) { throw new Error(field.label + ': ' + error.message); }
        if (!Number.isFinite(value) || value < field.min || value > field.max || (field.step === 1 && !Number.isInteger(value))) throw new Error(`Revisá ${field.label}: rango ${field.min} a ${field.max}${field.step === 1 ? ', número entero' : ''}.`);
        values[field.id] = value;
    }
    const result = simulator.run(values);
    const normalized = Array.isArray(result) ? { metrics: result, rows: [] } : result;
    if (normalized.metrics.some(item => item.value === null ? !['undefined', 'impossible'].includes(item.state) : !Number.isFinite(item.value)) || normalized.rows.some(row => Object.values(row).some(value => !Number.isFinite(value)))) throw new Error('El resultado excede el rango numérico. Reducí tasas o plazos.');
    return normalized;
}

export function defaultInputs(simulator) { return Object.fromEntries(simulator.fields.map(field => [field.id, field.value])); }
