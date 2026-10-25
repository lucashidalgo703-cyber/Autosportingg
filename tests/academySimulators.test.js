import test from 'node:test';
import assert from 'node:assert/strict';
import { simulators, defaultInputs, calculateSimulator, amortization } from '../src/lib/academy/simulators.js';
const near = (actual, expected, epsilon = 1e-6) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≠ ${expected}`);
const values = (id, overrides = {}) => {
    const simulator = simulators.find(s => s.id === id);
    return calculateSimulator(id, { ...defaultInputs(simulator), ...overrides }).metrics.map(m => m.value);
};

test('16 simuladores producen resultados finitos y rechazan campos vacíos o inválidos', () => {
    assert.equal(simulators.length, 16);
    for (const simulator of simulators) {
        const defaults = defaultInputs(simulator);
        assert.ok(calculateSimulator(simulator.id, defaults).metrics.length > 0);
        for (const field of simulator.fields) {
            for (const invalid of ['', ' ', null, true, NaN, Infinity, '1.000.000', field.max + 1, field.min - 1]) assert.throws(() => calculateSimulator(simulator.id, { ...defaults, [field.id]: invalid }));
            if (field.step === 1) assert.throws(() => calculateSimulator(simulator.id, { ...defaults, [field.id]: 1.5 }));
        }
    }
    assert.throws(() => calculateSimulator('inexistente', {}));
});
test('Margen, retorno y ROI utilizan sus denominadores respectivos', () => {
    const margin = values('margen'); near(margin[0], 2400000); near(margin[1], 20);
    near(values('capital')[0], 18); near(values('roi')[1], 30);
    near(values('margen', { sale: 8000000 })[0], -1600000);
    near(values('roi', { returns: 0 })[1], -100);
});
test('Rotación al costo y oportunidad para el mismo horizonte', () => {
    const rotation = values('rotacion'); near(rotation[0], 30000000); near(rotation[1], 4); near(rotation[2], 91.25);
    assert.equal(calculateSimulator('rotacion', { sold: 0, opening: 0, closing: 0, days: 365 }).metrics[1].state, 'undefined');
    const opportunity = values('oportunidad'); near(opportunity[0], 1200000); near(opportunity[1], -300000);
});
test('Intereses, conversión de tasas, inflación y valor presente', () => {
    near(values('simple')[1], 1200000); near(values('compuesto')[0], 1210000);
    near(values('simple', { rate: 0 })[1], 1000000); near(values('compuesto', { rate: 0 })[0], 1000000);
    const rates = values('tasas'); near(rates[0], 2); near(rates[1], 26.82417945625455);
    near(values('inflacion')[0], 1000000); near(values('inflacion')[1], 10);
    near(values('inflacion', { nominal: -100 })[1], -100);
    near(values('presente')[0], 1000000);
    near(values('presente', { rate: 0 })[0], 1210000);
    assert.throws(() => values('compuesto', { rate: 1000, periods: 600 }));
});
test('Sistema francés conserva principal, liquida saldo y cumple recurrencia', () => {
    for (const rate of [0, 1e-10, 5, 1000]) {
        const rows = amortization(1000000, rate, 12);
        near(rows.reduce((sum, row) => sum + row.capital, 0), 1000000);
        near(rows.at(-1).balance, 0);
        let opening = 1000000;
        for (const row of rows) {
            near(row.interest, opening * rate / 100);
            near(row.payment, row.capital + row.interest);
            near(row.balance, opening - row.capital);
            assert.ok(row.capital >= 0 && row.balance >= 0);
            opening = row.balance;
        }
    }
    near(amortization(1200000, 0, 6)[0].payment, 200000);
    near(amortization(1000000, 5, 1)[0].payment, 1050000);
    for (const args of [[0, 5, 12], [1000, -1, 12], [1000, 5, 0], [1000, 5, 2.5]]) assert.throws(() => amortization(...args));
});
test('Caja, descuentos, permutas y recuperación muestran pérdidas y reservas', () => {
    assert.deepEqual(values('flujo'), [4000000, 2000000, 3000000, 2000000]);
    near(values('flujo', { expense1: 9000000 })[0], -2000000);
    assert.deepEqual(values('descuentos'), [14250000, 2250000, 750000]);
    near(values('descuentos', { discount: 100 })[1], -12000000);
    assert.deepEqual(values('permutas'), [10000000, 8000000, 4000000]);
    near(values('permutas', { resale: 0 })[2], -4500000);
    assert.deepEqual(values('recuperacion'), [6, 6]);
    assert.deepEqual(values('recuperacion', { investment: 1000000 }), [2 / 3, 1]);
});
test('Asignación respeta capital disponible y contempla reserva sin rendimiento', () => {
    const allocation = values('asignacion'); near(allocation[0], 8000000); near(allocation[1], 3240000); near(allocation[2], 10.8);
    assert.throws(() => values('asignacion', { a: 30000000, b: 1 }));
    assert.deepEqual(values('asignacion', { a: 0, b: 0 }), [30000000, 0, 0]);
});
