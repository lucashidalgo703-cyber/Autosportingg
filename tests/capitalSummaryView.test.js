import assert from 'node:assert/strict';
import { capitalSummaryCurrencyView, formatCapitalAmount } from '../src/utils/capitalSummaryView.js';
const summary = {
    componentes: {
        stockPropioCosto: { monto: 1000, byCurrency: { ARS: 1000, USD: 90 }, items: [{ id: 'mixed', ownCostByCurrency: { ARS: 1000, USD: 90 } }] },
        efectivoPropio: { monto: 200, byCurrency: { ARS: 200, USD: 10 } },
        carteraPropia: { monto: 300, byCurrency: { ARS: 300, USD: 20 }, nominalByCurrency: { ARS: 600, USD: 40 } },
        otrosCreditos: { monto: 0, byCurrency: { ARS: 0, USD: 0 } },
        deudasPropia: { monto: 50, byCurrency: { ARS: 50, USD: 5 } }
    },
    totales: { capitalPropioCosto: 1450 },
    totalsByCurrency: { ARS: { capitalPropioCosto: 1450 }, USD: { capitalPropioCosto: 115 } }
};
const before = structuredClone(summary);
for (const currency of ['ARS', 'USD']) {
    const view = capitalSummaryCurrencyView(summary, currency);
    const c = view.componentes;
    assert.equal(c.stockPropioCosto.monto + c.efectivoPropio.monto + c.carteraPropia.monto + c.otrosCreditos.monto - c.deudasPropia.monto, view.totales.capitalPropioCosto);
    assert.match(formatCapitalAmount(view.totales.capitalPropioCosto, currency), new RegExp(`^${currency} `));
}
assert.equal(capitalSummaryCurrencyView(summary, 'USD').componentes.carteraPropia.montoTotalNominal, 40);
assert.deepEqual(summary, before, 'Cambiar la moneda de presentación no altera el resumen ni convierte importes');
const legacy = { componentes: { stockPropioCosto: { monto: 1234 } }, totales: { capitalPropioCosto: 1234 } };
assert.equal(capitalSummaryCurrencyView(legacy, 'ARS').componentes.stockPropioCosto.monto, 1234);
assert.equal(capitalSummaryCurrencyView(legacy, 'USD').componentes.stockPropioCosto.monto, 0, 'Nunca presentar un monto legacy ARS como USD');
console.log('capitalSummaryView: 6 verificaciones OK (ecuaciones ARS/USD, moneda explícita, nominal, inmutabilidad y fallback legacy)');
