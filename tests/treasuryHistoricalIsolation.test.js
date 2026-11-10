import assert from 'node:assert/strict';
import test from 'node:test';
import Account from '../src/models/Account.js';
import Sale from '../src/models/Sale.js';
import Transaction from '../src/models/Transaction.js';
import TreasuryBox from '../src/models/TreasuryBox.js';
import TreasuryConfig from '../src/models/TreasuryConfig.js';
import { collectAndDistribute, searchSalesForCollection } from '../src/services/treasuryStrategicService.js';

const saleId = '507f1f77bcf86cd799439011';
const collection = { saleId, amount: 1000, currency: 'ARS' };

function saleQuery(sale) {
    return {
        populate() { return this; },
        lean() { return Promise.resolve(sale); },
        then(resolve, reject) { return Promise.resolve(sale).then(resolve, reject); }
    };
}

function stubCollectionReads(t, overrides) {
    t.mock.method(TreasuryBox, 'findOne', async () => ({ key: 'existing' }));
    t.mock.method(TreasuryBox, 'create', () => assert.fail('No debe crear cajas en estos escenarios.'));
    t.mock.method(Sale, 'findById', () => saleQuery({
        _id: saleId, status: 'entregada', saleCurrency: 'ARS', isManualImport: true, ...overrides
    }));
    t.mock.method(Account, 'findById', () => assert.fail('El rechazo debe ocurrir antes de consultar una cuenta.'));
    t.mock.method(Transaction, 'create', () => assert.fail('No debe registrar un movimiento.'));
}

test('una histórica nueva rechaza cobros antes de tocar cuentas o movimientos', async (t) => {
    stubCollectionReads(t, { historicalOnly: true });
    await assert.rejects(collectAndDistribute(collection, { username: 'test' }), /histórica es solo de consulta/);
});

test('una importación legacy sin la marca conserva el circuito de cobranza', async (t) => {
    stubCollectionReads(t, {});
    // Alcanzar esta validación prueba que isManualImport no la excluyó del cobro.
    await assert.rejects(collectAndDistribute(collection, { username: 'test' }), /Seleccioná la caja física o cuenta bancaria/);
});

test('la marca false también conserva el circuito de cobranza legacy', async (t) => {
    stubCollectionReads(t, { historicalOnly: false });
    await assert.rejects(collectAndDistribute(collection, { username: 'test' }), /Seleccioná la caja física o cuenta bancaria/);
});

test('la búsqueda explícita no ofrece una histórica nueva para cobrar', async (t) => {
    t.mock.method(TreasuryConfig, 'findOne', async () => ({}));
    t.mock.method(Sale, 'findById', () => saleQuery({ _id: saleId, historicalOnly: true }));
    t.mock.method(Transaction, 'find', () => assert.fail('No debe calcular recuperación ni buscar movimientos de la histórica.'));
    assert.deepEqual(await searchSalesForCollection({ saleId }), []);
});

test('la búsqueda por ID aplica el mismo filtro operativo a un borrador', async (t) => {
    t.mock.method(TreasuryConfig, 'findOne', async () => ({}));
    t.mock.method(Sale, 'findById', () => saleQuery({ _id: saleId, status: 'borrador' }));
    t.mock.method(Transaction, 'find', () => assert.fail('No debe calcular recuperación ni ofrecer cobrar un borrador.'));
    assert.deepEqual(await searchSalesForCollection({ saleId }), []);
});
