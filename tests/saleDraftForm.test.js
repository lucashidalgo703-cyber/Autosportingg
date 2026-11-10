import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSaleForm, saleToForm, buildSaleCreatePayload } from '../src/utils/saleDraftForm.js';

test('an incomplete draft can be saved without inventing a vehicle or a payment', () => {
    const form = createSaleForm();
    const payload = buildSaleCreatePayload(form, 'borrador');
    assert.equal(form.status, 'borrador');
    assert.equal(payload.status, 'borrador');
    assert.equal(payload.vehicleId, null);
    assert.equal(payload.clientId, null);
    assert.equal(payload.salePrice, 0);
    assert.equal(payload.saleCurrency, 'USD');
    assert.equal(payload.depositAppliedAmount, 0);
    assert.equal(payload.installmentsCount, 0);
});

test('reopening and saving a draft preserves buyer, raw notes, dates and operation data', () => {
    const original = {
        ...createSaleForm(), vehicleId: 'car-1', clientId: 'client-1', leadId: 'lead-1',
        buyerName: 'Cliente de prueba', buyerPhone: '0000000000', buyerEmail: 'prueba@example.test', buyerDni: 'DEMO',
        mileage: '32100', salePrice: '23000', saleCurrency: 'USD',
        saleDate: '2026-11-10', estimatedDeliveryDate: '2026-11-24',
        vehicleOwnerName: 'Propietario de prueba', notes: 'Revisar condiciones antes de activar.',
        depositAppliedAmount: '1500', depositAppliedCurrency: 'ARS',
        manualCommission: true, extraAmount: '500', extraCurrency: 'ARS',
        splitCommission: true, deliveryItems: { securityNut: false, manuals: true, spareKey: true, vehicleCard: false }
    };
    const firstSave = buildSaleCreatePayload(original, 'borrador');
    const recovered = saleToForm({ ...firstSave, _id: 'draft-1', vehicleId: { _id: 'car-1' }, clientId: { _id: 'client-1' } });
    const secondSave = buildSaleCreatePayload(recovered, 'borrador');
    assert.deepEqual(secondSave, firstSave);
    assert.equal(recovered.notes, original.notes);
    assert.equal((secondSave.notes.match(/Comprador manual:/g) || []).length, 1);
    assert.equal(recovered.estimatedDeliveryDate, '2026-11-24');
    assert.equal(recovered.extraAmount, 500);
});

test('Save draft keeps an assigned vehicle uncommitted even when the form says Active', () => {
    const form = { ...createSaleForm(), vehicleId: 'car-1', status: 'confirmada', salePrice: '20000' };
    assert.equal(buildSaleCreatePayload(form, 'borrador').status, 'borrador');
});

test('activation requires a vehicle and an explicit price; an entered zero remains supported', () => {
    const form = { ...createSaleForm(), status: 'confirmada' };
    assert.throws(() => buildSaleCreatePayload(form), /precio/);
    assert.throws(() => buildSaleCreatePayload({ ...form, salePrice: '100' }), /vehículo/);
    assert.equal(buildSaleCreatePayload({ ...form, vehicleId: 'car-1', salePrice: '0' }).salePrice, 0);
    for (const salePrice of ['no-numero', '-1', Infinity]) {
        assert.throws(() => buildSaleCreatePayload({ ...form, vehicleId: 'car-1', salePrice }), /precio/);
    }
});

test('clearing IDs and dates is preserved rather than omitted from PATCH', () => {
    const recovered = saleToForm({ status: 'borrador', vehicleId: 'car-1', clientId: 'client-1', salePrice: 1, saleCurrency: 'ARS' });
    const payload = buildSaleCreatePayload({ ...recovered, vehicleId: '', clientId: '', estimatedDeliveryDate: '' });
    assert.equal(payload.vehicleId, null);
    assert.equal(payload.clientId, null);
    assert.equal(payload.estimatedDeliveryDate, null);
});

test('draft snapshots exclude files and unrecognized fields', () => {
    const form = { ...createSaleForm(), documents: { 'DNI Frente': { name: 'no-upload.pdf', bytes: 'not-saved' } }, extraField: 'ignore' };
    const payload = buildSaleCreatePayload(form);
    assert.equal('documents' in payload, false);
    assert.equal('documents' in payload.draftData, false);
    assert.equal('extraField' in payload.draftData, false);
    assert.doesNotMatch(JSON.stringify(payload), /no-upload|not-saved/);
});

test('a historical manual import is created closed rather than as an operational draft', () => {
    const payload = buildSaleCreatePayload({ ...createSaleForm(), manualImport: true, salePrice: '10' }, 'borrador');
    assert.equal(payload.isManualImport, true);
    assert.equal(payload.status, 'entregada');
});
