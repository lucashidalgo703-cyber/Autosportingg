import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { computeIncomeOwnership } from '../src/services/treasuryIncomeOwnership.js';

test('la distribución de un importe explícito a terceros conserva el resultado y redondeo previos', () => {
    assert.deepEqual(computeIncomeOwnership({ amount: 1000.01, thirdPartyAmount: 250.126, currency: 'ARS' }), {
        totalAmount: 1000.01,
        tercerosAmount: 250.13,
        propioAmount: 749.88,
        thirdPartyNote: 'Fondos de Tercero / Socio: ARS 250,13 (Propio: ARS 749,88).',
        thirdPartyOwner: 'Tercero / Socio'
    });
});

test('la participación del inversor mantiene la fórmula y la nota existente', () => {
    assert.deepEqual(computeIncomeOwnership({
        amount: 1250000,
        currency: 'ARS',
        vehicleId: { investor: { name: 'Socio Demo', percentage: 35 } }
    }), {
        totalAmount: 1250000,
        tercerosAmount: 437500,
        propioAmount: 812500,
        thirdPartyNote: 'Socio (Socio Demo, 35%): ARS 437.500.',
        thirdPartyOwner: 'Socio Demo'
    });
});

test('la participación conjunta y la consignación conservan sus precedencias', () => {
    const jointOwnership = computeIncomeOwnership({
        amount: 200000,
        vehicleId: { jointOwnership: { hasPartner: true, partnerPercentage: 20, partnerName: 'Socio Conjunto' } }
    });
    assert.equal(jointOwnership.tercerosAmount, 40000);
    assert.equal(jointOwnership.thirdPartyOwner, 'Socio Conjunto');

    const consignment = computeIncomeOwnership({
        amount: 500000,
        currency: 'ARS',
        vehicleId: { consignedBy: 'Comitente Demo', consignmentCommission: 65000 }
    });
    assert.equal(consignment.tercerosAmount, 435000);
    assert.equal(consignment.propioAmount, 65000);
    assert.equal(consignment.thirdPartyOwner, 'Comitente Demo');
});

test('la propiedad de venta, los valores sin terceros y los saldos acotados se mantienen', () => {
    const consignedSale = computeIncomeOwnership({
        amount: 1200000,
        saleId: { vehicleOwnerName: 'Dueño Demo', commissionSettings: { extraAmount: 150000 } }
    });
    assert.equal(consignedSale.tercerosAmount, 1050000);
    assert.equal(consignedSale.propioAmount, 150000);
    assert.equal(consignedSale.thirdPartyOwner, 'Dueño Demo');

    const plainIncome = computeIncomeOwnership({ amount: 1234.56 });
    assert.deepEqual(plainIncome, {
        totalAmount: 1234.56,
        tercerosAmount: 0,
        propioAmount: 1234.56,
        thirdPartyNote: null,
        thirdPartyOwner: null
    });

    assert.equal(computeIncomeOwnership({ amount: 100, thirdPartyAmount: 150 }).tercerosAmount, 100);
});

test('importar y usar el motor financiero puro no registra modelos ni conecta Mongoose', async () => {
    const { projectCapitalReinvestment } = await import('../src/services/capitalReinvestmentEngine.js');
    assert.equal(mongoose.connection.readyState, 0);
    assert.deepEqual(Object.keys(mongoose.models), []);

    const { capitalReinvestmentDemoSnapshot } = await import('../src/services/capitalReinvestmentDemoFixtures.js');
    const result = projectCapitalReinvestment(capitalReinvestmentDemoSnapshot);
    assert.ok(result.operations.length > 0);
    assert.equal(mongoose.connection.readyState, 0);
    assert.deepEqual(Object.keys(mongoose.models), []);
});
