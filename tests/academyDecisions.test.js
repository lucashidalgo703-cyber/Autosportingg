import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarios, evaluateDecision } from '../src/lib/academy/decisions.js';

test('Seis escenarios ofrecen alternativas explícitas con ventajas y riesgos', () => {
    assert.equal(scenarios.length, 6);
    for (const scenario of scenarios) {
        assert.equal(scenario.options.length, 2);
        for (let index = 0; index < 2; index++) {
            const result = evaluateDecision(scenario.id, index);
            assert.ok(result.advantage && result.risk && result.opportunity && result.formula);
            assert.ok(result.metrics.every(m => Number.isFinite(m.value)));
        }
    }
    assert.throws(() => evaluateDecision('comprar', 9));
    assert.throws(() => evaluateDecision('inexistente', 0));
});
test('Escenarios conservan relaciones económicas y muestran el faltante intermedio', () => {
    assert.equal(evaluateDecision('comprar', 0).metrics[1].value, -3000000);
    assert.equal(evaluateDecision('comprar', 1).metrics[1].value, 10000000);
    assert.equal(evaluateDecision('permuta', 0).metrics[2].value, 4000000);
    assert.ok(evaluateDecision('financiar', 1).metrics[2].value < 16500000);
    assert.ok(evaluateDecision('financiar', 1).metrics[2].value > 15000000);
    const concentrated = evaluateDecision('distribuir', 0).metrics;
    const diversified = evaluateDecision('distribuir', 1).metrics;
    assert.equal(concentrated[0].value, diversified[0].value);
    assert.equal(concentrated[1].value - diversified[1].value, 2600000);
    assert.equal(evaluateDecision('stock-lento', 1).metrics[0].value, 1400000);
});
