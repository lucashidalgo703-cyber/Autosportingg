import assert from 'node:assert/strict';
import { changedVehiclePayload, validateVehicleFinancialChanges } from '../src/components/crm/stock/vehicleFormIntegrity.js';

const historical = { price: '', currency: '', purchasePrice: '', purchaseCurrency: '', status: '',
    isSharedInvestment: true, investorName: 'Socio ficticio', investorPercentage: '', notes: '', brand: 'Prueba' };
const noteOnly = { ...historical, notes: 'Nota de revisión' };
assert.deepEqual(changedVehiclePayload({ price: 0, currency: 'USD', purchasePrice: 0, purchaseCurrency: 'USD', status: 'Disponible', investor: { name: 'Socio ficticio', percentage: 50 }, notes: noteOnly.notes, brand: 'Prueba' }, historical, noteOnly), { notes: 'Nota de revisión' });
assert.equal(validateVehicleFinancialChanges(noteOnly, historical), null, 'editing a note preserves missing financial facts');

const newBase = { price: '12000000', currency: 'ARS', purchasePrice: '', purchaseCurrency: '', status: 'Disponible', isSharedInvestment: false, investorPercentage: '' };
assert.equal(validateVehicleFinancialChanges(newBase), null, 'an available car may have its real cost pending');
assert.match(validateVehicleFinancialChanges({ ...newBase, purchasePrice: '10.000.000' }), /moneda del costo/);
assert.match(validateVehicleFinancialChanges({ ...newBase, currency: '' }), /moneda del precio/);
assert.equal(validateVehicleFinancialChanges({ ...newBase, purchasePrice: '10.000.000', purchaseCurrency: 'ARS' }), null);
assert.match(validateVehicleFinancialChanges({ ...newBase, isSharedInvestment: true }), /porcentaje real/);
assert.equal(validateVehicleFinancialChanges({ ...newBase, isSharedInvestment: true, investorPercentage: 100 }), null, '100% investor remains 100%');
assert.match(validateVehicleFinancialChanges({ ...newBase, isSharedInvestment: true, investorPercentage: 101 }), /porcentaje real/);
assert.match(validateVehicleFinancialChanges({ ...newBase, purchasePrice: '-10', purchaseCurrency: 'ARS' }), /importe válido/);
assert.match(validateVehicleFinancialChanges({ ...historical, status: 'inventado' }, historical), /estado operativo/);

const costCorrection = { ...historical, purchasePrice: '10.000.000', purchaseCurrency: 'ARS', purchasePriceJustification: 'Costo verificado' };
assert.deepEqual(changedVehiclePayload({ purchasePrice: 10000000, purchaseCurrency: 'ARS', purchasePriceJustification: 'Costo verificado', status: 'Disponible', currency: 'USD', investor: { percentage: 50 } }, historical, costCorrection, { purchasePriceJustification: ['purchasePrice'] }), { purchasePrice: 10000000, purchaseCurrency: 'ARS', purchasePriceJustification: 'Costo verificado' });

const known = { ...newBase, investorName: '', notes: '' };
assert.deepEqual(changedVehiclePayload({ price: 12000000, currency: 'ARS', investor: { name: '', percentage: 0 }, notes: 'Foto revisada' }, known, { ...known, notes: 'Foto revisada' }), { notes: 'Foto revisada' });
console.log('vehicleFormIntegrity: 13 verificaciones OK (históricos sin defaults, monedas explícitas, costo pendiente y participación real hasta100%).');
