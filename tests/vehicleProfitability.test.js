// tests/vehicleProfitability.test.js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    calculateDaysImmobilized,
    calculateAnnualizedRoi
} from '../src/services/vehicleProfitabilityService.js';
import {
    canReadRentabilidad,
    ROLES,
    PERMISSIONS
} from '../src/utils/adminPermissions.js';
import { computeSaleProfit, roundMoney } from '../src/utils/saleCommercial.js';

test('1. Permisos de Rentabilidad: Propietario y permiso financiero explícito', () => {
    // Propietario SIEMPRE tiene acceso
    assert.equal(canReadRentabilidad({ role: ROLES.OWNER }), true, 'El propietario debe tener acceso total a Rentabilidad');

    // Admin con permisos por defecto (incluye finanzas) tiene acceso
    assert.equal(canReadRentabilidad({ role: ROLES.ADMIN }), true, 'Admin con finanzas por defecto tiene acceso');

    // Admin con permisos explícitos sin finanzas NO debe tener acceso
    assert.equal(canReadRentabilidad({ role: ROLES.ADMIN, permissions: [PERMISSIONS.STOCK_READ] }), false, 'Admin sin permiso financiero debe ser denegado');

    // Perfil con permiso explícito rentabilidad.read tiene acceso
    assert.equal(canReadRentabilidad({ role: 'auditor', permissions: [PERMISSIONS.RENTABILIDAD_READ] }), true, 'Perfil con rentabilidad.read debe tener acceso');

    // Perfil con permiso explícito finanzas.read tiene acceso
    assert.equal(canReadRentabilidad({ role: ROLES.ADMINISTRATIVO, permissions: [PERMISSIONS.FINANZAS_READ] }), true, 'Administrativo con finanzas.read debe tener acceso');

    // Vendedor y Gestoría SIEMPRE bloqueados para rentabilidad general
    assert.equal(canReadRentabilidad({ role: ROLES.VENTAS, permissions: [PERMISSIONS.FINANZAS_READ] }), false, 'Ventas nunca debe acceder a rentabilidad general');
    assert.equal(canReadRentabilidad({ role: ROLES.GESTORIA_CONTABILIDAD, permissions: [PERMISSIONS.FINANZAS_READ] }), false, 'Gestoría nunca debe acceder a rentabilidad general');
    assert.equal(canReadRentabilidad(null), false, 'Sin usuario debe ser denegado');
});

test('2. Cálculo de días de inmovilización y Eficiencia del Capital (ROI Anualizado)', () => {
    // 30 días de inmovilización
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-31T00:00:00Z');
    const days = calculateDaysImmobilized(start, end);
    assert.equal(days, 30, 'Debe calcular exactamente 30 días');

    // Ganancia 1.000.000 sobre costo 10.000.000 en 30 días
    // Margen = 10%. ROI anualizado = 10% * (365 / 30) = 121.67%
    const roi = calculateAnnualizedRoi({ netProfit: 1000000, totalCost: 10000000, days: 30 });
    assert.equal(roi, 121.67, 'El ROI anualizado debe ser 121.67%');

    // En 180 días (rotación lenta):
    // Margen = 10%. ROI anualizado = 10% * (365 / 180) = 20.28%
    const slowRoi = calculateAnnualizedRoi({ netProfit: 1000000, totalCost: 10000000, days: 180 });
    assert.equal(slowRoi, 20.28, 'Rotación lenta debe reducir drásticamente el ROI anualizado');

    // Costo 0 no divide por cero
    assert.equal(calculateAnnualizedRoi({ netProfit: 1000, totalCost: 0, days: 10 }), null);
});

test('3. Motor Financiero Canónico: Operación 100% Agencia', () => {
    const saleResult = computeSaleProfit({
        salePrice: 15000000,
        saleCurrency: 'ARS',
        hasVehicle: true,
        purchaseCost: 11000000,
        purchaseCurrency: 'ARS',
        acquisitionSource: 'compra',
        vehicleExpenses: [
            { amount: 300000, currency: 'ARS', concept: 'Mecánica y service' },
            { amount: 200000, currency: 'ARS', concept: 'Pintura y detailing' }
        ],
        saleExpenses: [
            { amount: 150000, currency: 'ARS', description: 'Gestoría de transferencia' }
        ],
        commissionAmount: 200000,
        commissionCurrency: 'ARS',
        investorPercentage: 0
    });

    assert.equal(saleResult.calculable, true);
    // Costo adquisición: 11.000.000
    // Gastos vehículo: 500.000
    // Gastos venta: 150.000
    // Comisión: 200.000
    // Total costos y deducciones: 11.850.000
    // Ganancia Neta: 15.000.000 - 11.850.000 = 3.150.000
    assert.equal(saleResult.acquisitionCost, 11000000);
    assert.equal(saleResult.vehicleExpensesTotal, 500000);
    assert.equal(saleResult.saleExpensesTotal, 150000);
    assert.equal(saleResult.totalExpenses, 650000);
    assert.equal(saleResult.netProfit, 3150000);
    assert.equal(saleResult.agencyNetProfit, 3150000);
    assert.equal(saleResult.investorProfitShare, 0);
});

test('4. Operaciones Compartidas / Socios: Reparto de margen exacto', () => {
    // 50% Socio / 50% Agencia
    const saleResult = computeSaleProfit({
        salePrice: 20000,
        saleCurrency: 'USD',
        hasVehicle: true,
        purchaseCost: 15000,
        purchaseCurrency: 'USD',
        acquisitionSource: 'compra',
        vehicleExpenses: [{ amount: 500, currency: 'USD' }],
        commissionAmount: 300,
        commissionCurrency: 'USD',
        investorPercentage: 50
    });

    assert.equal(saleResult.calculable, true);
    // Margen neto total = 20.000 - 15.000 - 500 - 300 = 4.200 USD
    assert.equal(saleResult.netProfit, 4200);
    // Socio (50%): 2.100 USD
    assert.equal(saleResult.investorProfitShare, 2100);
    // Agencia (50%): 2.100 USD
    assert.equal(saleResult.agencyNetProfit, 2100);
    assert.equal(saleResult.agencySharePercentage, 50);
});

test('5. Permutas Encadenadas: Toma en permuta como base de costo', () => {
    // Vehículo tomado en valor de toma $8.000.000
    const vehicle = {
        _id: 'car-child-1',
        name: 'Ford Fiesta Kinetic 2017',
        tradeInOrigin: {
            saleId: 'sale-parent-1',
            value: 8000000,
            currency: 'ARS'
        },
        expenses: [{ amount: 400000, currency: 'ARS', concept: 'Embrague' }]
    };

    const profit = computeSaleProfit({
        salePrice: 10500000,
        saleCurrency: 'ARS',
        vehicle,
        commissionAmount: 150000,
        commissionCurrency: 'ARS'
    });

    assert.equal(profit.calculable, true);
    assert.equal(profit.acquisitionSource, 'valor_de_toma');
    assert.equal(profit.acquisitionCost, 8000000);
    assert.equal(profit.vehicleExpensesTotal, 400000);
    // Ganancia Neta: 10.500.000 - 8.000.000 - 400.000 - 150.000 = 1.950.000
    assert.equal(profit.netProfit, 1950000);
});

console.log('Todos los tests de rentabilidad pasaron exitosamente.');
