import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateVehicleInput, normalizeVehicleIdentifier, vehicleIdentifierPattern, resolveVehicleImageOrder } from '../src/utils/vehicleValidation.js';

const payload = overrides => ({ brand: ' QA ', name: ' Modelo ficticio ', year: 2024, km: 100, fuel: 'Nafta', condition: 'Usado', price: 1000, currency: 'USD', ...overrides });

test('valida mínimos y formatos argentinos sin convertir campos ausentes a cero', () => {
    const result = validateVehicleInput(payload({ price: '15.000.000,50', purchasePrice: '', currency: '$', km: '12.500' }));
    assert.deepEqual(result.errors, {});
    assert.equal(result.values.brand, 'QA'); assert.equal(result.values.price, 15000000.5);
    assert.equal(result.values.km, 12500); assert.equal(result.values.currency, 'ARS');
    assert.equal(Object.hasOwn(result.values, 'purchasePrice'), false);
    assert.deepEqual(validateVehicleInput({ notes: ' Nota ' }, { partial: true }), { values: { notes: 'Nota' }, errors: {} });
    const missing = validateVehicleInput({});
    for (const key of ['brand', 'name', 'year', 'km', 'fuel', 'condition', 'price', 'currency']) assert.ok(missing.errors[key], key);
});

test('rechaza números inválidos, blancos, negativos y años/puertas fuera de rango', () => {
    for (const input of [{ price: -1 }, { price: 'Infinity' }, { price: true }, { km: null }, { km: -1 }, { year: 2024.5 }, { year: 1885 }, { year: 2100 }, { doors: -1 }, { doors: 13 }, { doors: 2.5 }, { owners: 0 }, { purchasePrice: NaN }, { currency: 'EUR' }]) {
        const { errors } = validateVehicleInput(input, { partial: true, now: new Date('2026-11-10') });
        assert.ok(Object.keys(errors).length > 0, JSON.stringify(input));
    }
    assert.ok(validateVehicleInput({ purchasePrice: '' }, { partial: true }).errors.purchasePrice, 'No se borra silenciosamente un costo auditado');
});

test('campos técnicos opcionales y alias monetarios conservan ausencia y cero explícito', () => {
    const { values, errors } = validateVehicleInput({ transmission: ' Manual ', bodyType: '', engine: ' 1.6 ', version: ' Sport ', doors: '0', purchaseCurrency: ' U$S ', agencyOwned: 'false' }, { partial: true });
    assert.deepEqual(errors, {}); assert.equal(values.transmission, 'Manual'); assert.equal(values.doors, 0);
    assert.equal(values.engine, '1.6'); assert.equal(values.version, 'Sport'); assert.equal(values.purchaseCurrency, 'USD'); assert.equal(values.agencyOwned, false);
    assert.equal(validateVehicleInput({ doors: '' }, { partial: true }).values.doors, null);
    assert.equal(Object.hasOwn(validateVehicleInput({}, { partial: true }).values, 'doors'), false);
});

test('rechaza estructuras como texto y participaciones inválidas sin inventar inversor', () => {
    for (const input of [{ brand: { $ne: null } }, { version: [] }, { investor: 'no-json' }, { investor: { name: '', percentage: 50 } }, { investor: { name: 'QA', percentage: -1 } }, { investor: { name: 'QA', percentage: 101 } }]) {
        assert.ok(Object.keys(validateVehicleInput(input, { partial: true }).errors).length, JSON.stringify(input));
    }
    assert.deepEqual(validateVehicleInput({ investor: '{"name":"QA","percentage":50}' }, { partial: true }).values.investor, { name: 'QA', percentage: 50 });
});

test('documentación acepta JSON multipart y solo estados reales del contrato vigente', () => {
    const good = validateVehicleInput({ documentation: '{"cedulaVerde":"recibido","formulario08":"no aplica"}' }, { partial: true });
    assert.deepEqual(good.errors, {}); assert.equal(good.values.documentation.cedulaVerde, 'recibido');
    for (const value of ['[object Object]', '[]', { cedulaVerde: 'aprobado' }, { desconocido: 'recibido' }]) assert.ok(validateVehicleInput({ documentation: value }, { partial: true }).errors.documentation);
});

test('identidades equivalentes detectan guiones, espacios y mayúsculas sin bloquear placeholders', () => {
    assert.equal(normalizeVehicleIdentifier(' ab-123 cd '), 'AB123CD');
    assert.ok(vehicleIdentifierPattern('AB123CD').test('  ab-123.cd '));
    assert.equal(vehicleIdentifierPattern('AB123CD').test('AB123CDE'), false);
    for (const value of ['', 'S/D', 'S/P', 'N/A', 'Sin patente', 'Sin dominio', '0km', 'af', 'QA']) assert.equal(normalizeVehicleIdentifier(value), '');
});

test('fotos mantienen orden explícito de existentes/nuevas y permiten quitar todas', () => {
    const data = { existing: ['foto-a', 'foto-b'], uploaded: ['foto-nueva'] };
    assert.deepEqual(resolveVehicleImageOrder({ ...data, order: '["foto-b","__new__0","foto-a"]' }), ['foto-b', 'foto-nueva', 'foto-a']);
    assert.deepEqual(resolveVehicleImageOrder({ ...data }), ['foto-a', 'foto-b', 'foto-nueva']);
    assert.deepEqual(resolveVehicleImageOrder({ ...data, order: '[]' }), []);
    assert.deepEqual(resolveVehicleImageOrder({ ...data, images: ['foto-b'] }), ['foto-b']);
});

test('fotos rechazan orden roto, cargas no recibidas, URLs ajenas y duplicados', () => {
    for (const order of ['roto', '{}', '["__new__2"]', '["foto-ajena"]', '["foto-a","foto-a"]', '[null]']) {
        assert.throws(() => resolveVehicleImageOrder({ existing: ['foto-a'], uploaded: ['foto-nueva'], order }), undefined, order);
    }
});

test('pago de compra rechaza JSON inválido, modalidades ajenas e importes no finitos', () => {
    for (const value of ['mal-json', 'null', '[]', { modality: 'inventada' }, { modality: 'pago_parcial', amountPaid: 'Infinity' }, { modality: 'pago_parcial', amountPaid: -1 }]) {
        assert.ok(Object.keys(validateVehicleInput({ purchasePayment: value }, { partial: true }).errors).length, JSON.stringify(value));
    }
    const { values, errors } = validateVehicleInput({ purchasePayment: '{"modality":"pago_parcial","amountPaid":"1.250,50"}' }, { partial: true });
    assert.deepEqual(errors, {}); assert.equal(values.purchasePayment.amountPaid, 1250.5);
});
