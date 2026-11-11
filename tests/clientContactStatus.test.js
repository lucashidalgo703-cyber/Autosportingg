import assert from 'node:assert/strict';
import { test } from 'node:test';
import { effectiveClientContacted, getClientPriorities, clientContactCalendarKey } from '../src/utils/clientCommercial.js';
import { buildClientPurchaseRanking } from '../src/utils/clientPurchaseRanking.js';

test('la confirmación explícita prevalece sin borrar etapa, fecha ni historia', () => {
    const client = { contactConfirmed: false, pipelineStage: 'negociacion', lastContactDate: '2026-11-10T12:00:00Z', interactions: [{ type: 'visita', note: 'Respuesta previa' }] };
    const before = JSON.stringify(client);
    assert.equal(effectiveClientContacted(client), false); assert.equal(getClientPriorities(client).primera, true); assert.equal(JSON.stringify(client), before);
    assert.equal(effectiveClientContacted({ contactConfirmed: true, pipelineStage: 'sin_contactar', lastContactDate: null }), true);
    assert.deepEqual(getClientPriorities({ ...client, pipelineStage: 'cerrado' }), { primera: false, hoy: false, sinfecha: false });
    assert.deepEqual(getClientPriorities({ ...client, doNotContact: true }), { primera: false, hoy: false, sinfecha: false });
});
test('los registros anteriores infieren contacto sin confundir intentos o anotaciones con respuesta', () => {
    assert.equal(effectiveClientContacted({ pipelineStage: 'sin_contactar', interactions: [{ type: 'llamada', outboundNoReply: true }, { type: 'nota' }, { type: 'cita_agendada' }] }), false);
    assert.equal(effectiveClientContacted({ pipelineStage: 'sin_contactar', interactions: [{ type: 'whatsapp', outboundNoReply: false }] }), true);
    assert.equal(effectiveClientContacted({ contactConfirmed: null, lastContactDate: '2026-11-10' }), true);
    assert.equal(effectiveClientContacted({ pipelineStage: 'propuesta_enviada' }), true);
});
test('los meses de contacto respetan tanto fechas calendario legacy como instantes de Argentina', () => {
    assert.equal(clientContactCalendarKey('2026-11-01T00:00:00.000Z'), '2026-11-01');
    assert.equal(clientContactCalendarKey('2026-11-01T01:00:00.000Z'), '2026-10-31');
    assert.equal(clientContactCalendarKey('2026-11-01T03:00:00.000Z'), '2026-11-01');
    assert.equal(clientContactCalendarKey('inválido'), '');
});
test('ranking separa cerradas y abiertas, mantiene primera/última y monedas sin FX', () => {
    const client = { _id: 'c1', fullName: 'Comprador ficticio', dniCuit: '30-12345678-1' };
    const result = buildClientPurchaseRanking([
        { clientId: 'c1', status: 'entregada', salePrice: 1000, saleCurrency: 'USD', saleDate: '2026-01-02', historicalOnly: true },
        { clientId: 'c1', status: 'entregada', salePrice: 200000, saleCurrency: 'ARS', saleDate: '2026-11-10' },
        { clientId: 'c1', status: 'confirmada', salePrice: 9999, saleCurrency: 'USD', saleDate: '2026-11-10' },
        { clientId: 'c1', status: 'cancelada', salePrice: 99999, saleCurrency: 'USD', saleDate: '2026-11-10' }
    ], [client]);
    const row = result.purchaseRanking[0]; assert.equal(row.salesCount, 2); assert.equal(row.openCount, 1); assert.equal(row.historicalCount, 1);
    assert.deepEqual(row.totals, { ARS: 200000, USD: 1000 }); assert.equal(row.firstPurchaseDate, '2026-01-02'); assert.equal(row.lastPurchaseDate, '2026-11-10');
    assert.equal(result.rankingSummary.returningBuyers, 1); assert.equal(result.rankingSummary.vehiclesSold, 2);
});
test('abiertas sin compras se muestran aparte y no aumentan compradores ni facturación', () => {
    const result = buildClientPurchaseRanking([{ clientId: 'c1', status: 'señado', salePrice: 10000, saleCurrency: 'USD', saleDate: '2026-11-10' }], [{ _id: 'c1', fullName: 'Consulta ficticia' }]);
    assert.equal(result.purchaseRanking.length, 0); assert.equal(result.openPurchaseRanking.length, 1); assert.equal(result.rankingSummary.openOnlyClients, 1);
    assert.equal(result.rankingSummary.buyers, 0); assert.deepEqual(result.rankingSummary.billed, { ARS: 0, USD: 0 }); assert.equal(result.openPurchaseRanking[0].firstPurchaseDate, null);
});
test('el rescate por DNI es exacto y unívoco, nunca modifica la venta ni atribuye un duplicado', () => {
    const sale = { status: 'entregada', salePrice: 1000, saleCurrency: 'USD', saleDate: '2026-11-10', draftData: { buyerDni: '30123456781' } };
    const before = JSON.stringify(sale), client = { _id: 'c1', fullName: 'Persona ficticia', dniCuit: '30-12345678-1' };
    const result = buildClientPurchaseRanking([sale], [client]); assert.equal(result.purchaseRanking[0].dniMatchedCount, 1); assert.equal(JSON.stringify(sale), before);
    const ambiguous = buildClientPurchaseRanking([sale], [client, { ...client, _id: 'c2' }]); assert.equal(ambiguous.purchaseRanking.length, 0); assert.equal(ambiguous.rankingSummary.ambiguousDniCount, 1); assert.equal(ambiguous.rankingSummary.unmatchedClosedCount, 1);
});
