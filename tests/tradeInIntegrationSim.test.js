// Automated regression test for Trade-in value modification and synchronization
import assert from 'node:assert/strict';
import { parseArgentineMoney, resolveVehicleAcquisitionCost, roundMoney } from '../src/utils/saleCommercial.js';

console.log('--- Running Trade-In Value Modification & Financial Integrity Tests ---');

// 1. Simulación de objetos en memoria (Car y Sale)
const mockCar = {
    _id: 'car_test_001',
    brand: 'Chevrolet',
    name: 'Tracker 1.2 Turbo',
    year: 2021,
    km: 45000,
    price: 18000000,
    currency: '$',
    purchasePrice: 11000000,
    purchaseCurrency: 'ARS',
    tradeInOrigin: {
        saleId: 'sale_test_001',
        tradeInId: 'tradein_item_001',
        value: 11000000,
        currency: 'ARS',
        source: 'manual_link'
    },
    auditLog: []
};

const mockSale = {
    _id: 'sale_test_001',
    salePrice: 30000000,
    saleCurrency: 'ARS',
    status: 'confirmada',
    tradeIns: [{
        _id: 'tradein_item_001',
        brand: 'Chevrolet',
        model: 'Tracker',
        estimatedValue: 11000000,
        currency: 'ARS',
        linkedStockCarId: 'car_test_001'
    }],
    tradeInTotalAmount: 11000000,
    balanceAfterTradeIn: 19000000,
    saleAuditLog: []
};

// 2. Test: Validación de formato argentino para el valor de toma
const validFormats = [
    { input: '12500000', expected: 12500000 },
    { input: '12.500.000', expected: 12500000 },
    { input: '12.500.000,00', expected: 12500000 },
    { input: '$ 12.500.000', expected: 12500000 },
    { input: 'ARS 12.500.000', expected: 12500000 }
];

for (const { input, expected } of validFormats) {
    const parsed = parseArgentineMoney(input);
    assert.equal(parsed, expected, `Error parsing input: ${input}`);
}

const invalidFormats = ['', '   ', 'invalido', null, undefined, '$ '];
for (const input of invalidFormats) {
    const parsed = parseArgentineMoney(input);
    assert.ok(Number.isNaN(parsed), `Should be NaN for invalid input: ${input}`);
}

// 3. Simulación de la lógica de corrección del backend
function simulateTradeInValueCorrection({ car, sale, incomingPrice, incomingCurrency, changeType, justification, user = 'Tester' }) {
    const incomingPriceProvided = incomingPrice !== undefined && incomingPrice !== null && incomingPrice !== '';
    const parsed = incomingPriceProvided ? parseArgentineMoney(incomingPrice) : NaN;

    if (incomingPriceProvided && (Number.isNaN(parsed) || parsed < 0)) {
        throw new Error('Ingresá un valor de toma o costo de compra válido (número positivo).');
    }

    const oldPrice = Number(car.purchasePrice || 0);
    const nextPrice = incomingPriceProvided ? roundMoney(parsed) : oldPrice;
    const nextCurrency = incomingCurrency || car.purchaseCurrency || 'ARS';
    const changed = Math.abs(nextPrice - oldPrice) > 0.001;

    if (changed) {
        if (!justification || !justification.trim()) {
            throw new Error('Debe ingresar una justificación obligatoria para modificar el precio de compra o valor de toma.');
        }
        if (!['correccion_precio', 'gasto_adicional'].includes(changeType)) {
            throw new Error('Debe indicar si el cambio corresponde a una corrección del precio de compra/toma o a un gasto adicional.');
        }

        if (changeType === 'correccion_precio') {
            car.purchasePrice = nextPrice;
            car.purchaseCurrency = nextCurrency;

            // Sincronizar tradeInOrigin en Car
            if (!car.tradeInOrigin) car.tradeInOrigin = {};
            car.tradeInOrigin.value = nextPrice;
            car.tradeInOrigin.currency = nextCurrency;

            car.auditLog.push({
                action: 'COSTO_COMPRA',
                field: 'purchasePrice',
                oldValue: `ARS ${oldPrice}`,
                newValue: `${nextCurrency} ${nextPrice}`,
                changeType: 'correccion_precio',
                justification: justification.trim(),
                user
            });

            // Sincronizar en Sale
            if (sale && Array.isArray(sale.tradeIns)) {
                const tIndex = sale.tradeIns.findIndex(t => 
                    String(t.linkedStockCarId) === String(car._id) || 
                    (car.tradeInOrigin?.tradeInId && String(t._id) === String(car.tradeInOrigin.tradeInId))
                );
                if (tIndex >= 0) {
                    sale.tradeIns[tIndex].estimatedValue = nextPrice;
                    sale.tradeIns[tIndex].currency = nextCurrency;
                    sale.tradeInTotalAmount = roundMoney(sale.tradeIns.reduce((s, t) => s + (Number(t.estimatedValue) || 0), 0));
                    sale.balanceAfterTradeIn = Math.max(0, roundMoney((Number(sale.salePrice) || 0) - sale.tradeInTotalAmount));
                    sale.saleAuditLog.push({
                        action: 'VEHICULO_RECIBIDO_VALOR_CORREGIDO',
                        field: 'tradeIns',
                        details: `Valor corregido a ${nextCurrency} ${nextPrice}. Motivo: ${justification.trim()}`,
                        user
                    });
                }
            }
        }
    }

    return { car, sale };
}

// 4. Test: Edición válida con puntos de miles argentinos
const carCopy = JSON.parse(JSON.stringify(mockCar));
const saleCopy = JSON.parse(JSON.stringify(mockSale));

simulateTradeInValueCorrection({
    car: carCopy,
    sale: saleCopy,
    incomingPrice: '13.500.000',
    incomingCurrency: 'ARS',
    changeType: 'correccion_precio',
    justification: 'Ajuste de valuación de toma acordado con cliente'
});

assert.equal(carCopy.purchasePrice, 13500000, 'Car purchasePrice must be updated');
assert.equal(carCopy.tradeInOrigin.value, 13500000, 'Car tradeInOrigin.value must be updated');
assert.equal(saleCopy.tradeIns[0].estimatedValue, 13500000, 'Sale tradeIn item estimatedValue must match');
assert.equal(saleCopy.tradeInTotalAmount, 13500000, 'Sale tradeInTotalAmount must match');
assert.equal(saleCopy.balanceAfterTradeIn, 16500000, 'Sale balanceAfterTradeIn must be 30M - 13.5M = 16.5M');
assert.equal(carCopy.auditLog.length, 1, 'Car must have auditLog entry');
assert.equal(saleCopy.saleAuditLog.length, 1, 'Sale must have auditLog entry');

// 5. Test: Rechazo ante importe inválido
assert.throws(() => {
    simulateTradeInValueCorrection({
        car: carCopy,
        sale: saleCopy,
        incomingPrice: 'importe_invalido',
        changeType: 'correccion_precio',
        justification: 'test'
    });
}, /número positivo/);

// 6. Test: Rechazo si falta justificación obligatoria
assert.throws(() => {
    simulateTradeInValueCorrection({
        car: carCopy,
        sale: saleCopy,
        incomingPrice: '14.000.000',
        changeType: 'correccion_precio',
        justification: ''
    });
}, /justificación obligatoria/);

console.log('✅ All simulation tests passed successfully!');
