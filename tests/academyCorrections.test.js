import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAcademyDecimal } from '../src/lib/academy/decimal.js';
import { checkNumericAnswer } from '../src/lib/academy/curriculum.js';
import { calculateSimulator, amortization, AMORTIZATION_TOLERANCE as tolerance } from '../src/lib/academy/simulators.js';
import { evaluateDecision } from '../src/lib/academy/decisions.js';

test('Parser decimal único: admite coma/punto y rechaza prefijos, exponentes y agrupaciones', () => {
    for (const [raw, expected] of [['25', 25], [' -12,50 ', -12.5], ['+12.50', 12.5], [0, 0]]) assert.equal(parseAcademyDecimal(raw), expected);
    for (const raw of ['0x19', '0b11', '0o10', '1e3', '1_000', '1.000.000', '1,000.50', '1 000', '', ' ', '.', '1.', true, null, NaN, Infinity]) {
        assert.throws(() => parseAcademyDecimal(raw));
        assert.equal(checkNumericAnswer(raw, 25), false);
    }
    assert.throws(() => calculateSimulator('simple', { principal: '0x10', rate: 1, periods: 1 }));
});

test('Cronograma estable: uniformidad, cierre, conservación y recurrencia con tolerancia absoluta de $0,01', () => {
    let combinations = 0;
    for (const principal of [0.01, 1000000, 1000000000]) for (const rate of [0, 1e-12, 0.1, 5, 10, 100, 1000]) for (const count of [1, 12, 60, 360, 600]) {
        const rows = amortization(principal, rate, count);
        const payment = rows[0].payment;
        let opening = principal, sum = 0;
        for (const row of rows) {
            assert.ok(Math.abs(row.payment - payment) <= tolerance);
            assert.ok(Math.abs(row.payment - row.interest - row.capital) <= tolerance);
            assert.ok(Math.abs(opening - row.capital - row.balance) <= tolerance);
            assert.ok(Math.abs(row.interest - opening * rate / 100) <= tolerance);
            assert.ok(row.capital >= 0 && row.balance >= 0);
            opening = row.balance; sum += row.capital;
        }
        assert.ok(Math.abs(sum - principal) <= tolerance);
        assert.equal(rows.at(-1).balance, 0);
        // Oráculo independiente: VP por suma de pagos descontados, sin annuity().
        const pv = rows.reduce((total, row) => total + row.payment / (1 + rate / 100) ** row.period, 0);
        assert.ok(Math.abs(pv - principal) <= tolerance);
        combinations++;
    }
    assert.equal(combinations, 105);
    const rows = amortization(1000000, 10, 600);
    assert.equal(rows[0].payment, rows.at(-1).payment);
    assert.ok(Math.abs(amortization(1200000, 0, 6)[0].payment - 200000) <= tolerance);
    assert.throws(() => amortization(1e12, 1000, 600), /precisión monetaria/);
});

test('Estados económicos válidos se distinguen de entradas inválidas', () => {
    const rotation = calculateSimulator('rotacion', { sold: 0, opening: 1000, closing: 1000, days: 365 });
    assert.equal(rotation.metrics[1].value, 0);
    assert.equal(rotation.metrics[2].state, 'undefined');
    for (const flow of [0, -100]) {
        const recovery = calculateSimulator('recuperacion', { investment: 1000, flow });
        assert.equal(recovery.metrics[0].state, 'impossible');
        assert.equal(recovery.metrics[0].value, null);
    }
    assert.deepEqual(calculateSimulator('recuperacion', { investment: 0, flow: 0 }).metrics.map(m => m.value), [0, 0]);
    assert.throws(() => calculateSimulator('rotacion', { sold: -1, opening: 1000, closing: 1000, days: 365 }));
    assert.throws(() => calculateSimulator('recuperacion', { investment: -1, flow: 100 }));
});

test('Descuento bruto y diferencia neta de espera tienen bases explícitas', () => {
    const result = evaluateDecision('descuento', 0);
    assert.equal(result.metrics.find(m => m.label.includes('bruto')).value, 750000);
    assert.equal(result.metrics.find(m => m.label.includes('adicional de esperar')).value, 450000);
    assert.equal(evaluateDecision('descuento', 1).metrics[0].value - result.metrics[1].value, 450000);
});
