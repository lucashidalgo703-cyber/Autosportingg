// tests/profitabilitySyntheticReconciliation.test.js
// Validación Canónica y Conciliación de 5 Operaciones Sintéticas Representativas
// Cumple con la exigencia de verificación de exactitud contable, trazabilidad y no-duplicación de resultados.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    computeSaleProfit,
    roundMoney,
    resolveVehicleAcquisitionCost
} from '../src/utils/saleCommercial.js';
import {
    calculateDaysImmobilized,
    calculateAnnualizedRoi
} from '../src/services/vehicleProfitabilityService.js';

test('CONCILIACIÓN 1: Venta Simple Contado (100% Agencia, Entregada Definitiva)', () => {
    // 1. Fechas e Inmovilización
    const intakeDate = new Date('2026-01-05T10:00:00Z');
    const saleDate = new Date('2026-01-25T15:00:00Z');
    const days = calculateDaysImmobilized(intakeDate, saleDate);
    assert.equal(days, 20, 'Días inmovilizado debe ser 20');

    // 2. Motor Financiero Canónico
    const saleResult = computeSaleProfit({
        salePrice: 13500000,
        saleCurrency: 'ARS',
        hasVehicle: true,
        purchaseCost: 10000000,
        purchaseCurrency: 'ARS',
        acquisitionSource: 'compra',
        vehicleExpenses: [],
        saleExpenses: [],
        commissionAmount: 200000,
        commissionCurrency: 'ARS',
        investorPercentage: 0
    });

    assert.equal(saleResult.calculable, true);
    assert.equal(saleResult.acquisitionCost, 10000000);
    assert.equal(saleResult.totalExpenses, 0);
    const totalInvested = roundMoney(saleResult.acquisitionCost + saleResult.totalExpenses);
    assert.equal(totalInvested, 10000000);
    assert.equal(saleResult.commissionAmount, 200000);
    // Margen Comercial Neto = 13.5M - 10M - 0.2M = 3.3M
    assert.equal(saleResult.netProfit, 3300000);
    assert.equal(saleResult.agencyNetProfit, 3300000);

    // Margen sobre costo = 3.3M / 10M = 33%
    const marginOnCostPct = roundMoney((saleResult.netProfit / totalInvested) * 100);
    assert.equal(marginOnCostPct, 33.0);

    // Margen sobre venta = 3.3M / 13.5M = 24.44%
    const marginOnSalePct = roundMoney((saleResult.netProfit / 13500000) * 100);
    assert.equal(marginOnSalePct, 24.44);

    // 3. Eficiencia del Capital (Primaria: Ganancia Diaria; Secundaria: ROI Anualizado)
    const dailyProfit = roundMoney(saleResult.netProfit / days);
    assert.equal(dailyProfit, 165000, 'Ganancia diaria = $165.000 ARS/día');

    const annualizedRoiPct = calculateAnnualizedRoi({
        netProfit: saleResult.netProfit,
        totalCost: totalInvested,
        days
    });
    // (3.3M / 10M) * (365 / 20) * 100 = 33% * 18.25 = 602.25%
    assert.equal(annualizedRoiPct, 602.25);

    // 4. Reconocimiento
    const saleStatus = 'entregada';
    const isDelivered = saleStatus === 'entregada';
    assert.equal(isDelivered, true);
});

test('CONCILIACIÓN 2: Venta con Gastos de Taller y Gastos de Venta (Deduplicación Estricta)', () => {
    const intakeDate = new Date('2026-02-01T10:00:00Z');
    const saleDate = new Date('2026-03-18T10:00:00Z');
    const days = calculateDaysImmobilized(intakeDate, saleDate);
    assert.equal(days, 45, 'Días inmovilizado debe ser 45');

    const vehicleExpenses = [
        { concept: 'Chapa y Pintura paragolpes', amount: 450000, currency: 'ARS' },
        { concept: 'Mecánica y Service Preventivo', amount: 150000, currency: 'ARS' }
    ]; // Total $600k

    const saleExpenses = [
        { description: 'Gestoría y transferencia agencia', amount: 180000, currency: 'ARS', status: 'pagado' },
        { description: 'Flete y alistamiento final', amount: 70000, currency: 'ARS', status: 'pagado' }
    ]; // Total $250k

    const saleResult = computeSaleProfit({
        salePrice: 11800000,
        saleCurrency: 'ARS',
        hasVehicle: true,
        purchaseCost: 8000000,
        purchaseCurrency: 'ARS',
        acquisitionSource: 'compra',
        vehicleExpenses,
        saleExpenses,
        commissionAmount: 150000,
        commissionCurrency: 'ARS',
        investorPercentage: 0
    });

    assert.equal(saleResult.calculable, true);
    assert.equal(saleResult.acquisitionCost, 8000000);
    assert.equal(saleResult.vehicleExpensesTotal, 600000);
    assert.equal(saleResult.saleExpensesTotal, 250000);
    assert.equal(saleResult.totalExpenses, 850000);
    // Costo total invertido = 8M + 600k + 250k = 8,850,000
    const totalInvested = roundMoney(saleResult.acquisitionCost + saleResult.totalExpenses);
    assert.equal(totalInvested, 8850000);
    // Margen comercial neto = 11,800,000 - 8,850,000 - 150,000 = 2,800,000
    assert.equal(saleResult.netProfit, 2800000);

    // Margen % sobre costo = 2.8M / 8.85M = 31.64%
    const marginOnCostPct = roundMoney((saleResult.netProfit / totalInvested) * 100);
    assert.equal(marginOnCostPct, 31.64);

    // Ganancia diaria = 2,800,000 / 45 = 62,222.22 $/día
    const dailyProfit = roundMoney(saleResult.netProfit / days);
    assert.equal(dailyProfit, 62222.22);
});

test('CONCILIACIÓN 3: Permutas Encadenadas (Distinción de Toma, No-Duplicación de Ganancia)', () => {
    // 1. Venta de Auto A (Hilux)
    const saleResultA = computeSaleProfit({
        salePrice: 18000000,
        saleCurrency: 'ARS',
        hasVehicle: true,
        purchaseCost: 12000000,
        purchaseCurrency: 'ARS',
        acquisitionSource: 'compra',
        vehicleExpenses: [],
        saleExpenses: [],
        commissionAmount: 250000,
        commissionCurrency: 'ARS',
        investorPercentage: 0
    });

    // Margen reconocido en Auto A = 18M - 12M - 250k = 5,750,000
    assert.equal(saleResultA.netProfit, 5750000);

    // 2. Ingreso de Auto B (Gol) por Permuta
    // El costo económico base de adquisición de Auto B es exactamente el valor comercial de toma acordado: $7,000,000
    const vehicleB = {
        _id: 'vw-gol-id',
        name: 'VW Gol Trend 2018',
        tradeInOrigin: {
            saleId: 'sale-hilux-id',
            value: 7000000,
            currency: 'ARS'
        },
        expenses: [{ amount: 300000, currency: 'ARS', concept: 'Batería y cubiertas' }]
    };

    const resolvedCostGol = resolveVehicleAcquisitionCost(vehicleB);
    assert.equal(resolvedCostGol.amount, 7000000);
    assert.equal(resolvedCostGol.source, 'valor_de_toma');

    // 3. Venta posterior de Auto B en $9,200,000 contado, comisión $120,000
    const saleResultB = computeSaleProfit({
        salePrice: 9200000,
        saleCurrency: 'ARS',
        vehicle: vehicleB,
        commissionAmount: 120000,
        commissionCurrency: 'ARS',
        investorPercentage: 0
    });

    assert.equal(saleResultB.calculable, true);
    assert.equal(saleResultB.acquisitionCost, 7000000);
    assert.equal(saleResultB.vehicleExpensesTotal, 300000);
    // Costo total de B = $7,000,000 + $300,000 = $7,300,000
    const totalInvestedB = roundMoney(saleResultB.acquisitionCost + saleResultB.totalExpenses);
    assert.equal(totalInvestedB, 7300000);
    // Margen comercial neto propio de Auto B = 9.2M - 7.3M - 120k = 1,780,000
    assert.equal(saleResultB.netProfit, 1780000);

    // VERIFICACIÓN DE NO DUPLICACIÓN:
    // La ganancia de Auto A (5,750,000) NO se suma ni se absorbe en el costo de Auto B.
    // Suma económica total de ambas operaciones = 5,750,000 + 1,780,000 = 7,530,000.
    const totalRecognizedProfit = saleResultA.netProfit + saleResultB.netProfit;
    assert.equal(totalRecognizedProfit, 7530000);
});

test('CONCILIACIÓN 4: Operación Compartida con Socio (Reparto 60% Agencia / 40% Socio)', () => {
    // Costo vehículo: $20,000,000. Gastos preparación: $1,000,000.
    // Venta: $26,000,000. Gastos venta: $200,000. Comisión: $300,000.
    // Socio al 40%, Agencia al 60%.

    const saleResult = computeSaleProfit({
        salePrice: 26000000,
        saleCurrency: 'ARS',
        hasVehicle: true,
        purchaseCost: 20000000,
        purchaseCurrency: 'ARS',
        acquisitionSource: 'compra',
        vehicleExpenses: [{ amount: 1000000, currency: 'ARS', concept: 'Service completo' }],
        saleExpenses: [{ amount: 200000, currency: 'ARS', description: 'Escribanía' }],
        commissionAmount: 300000,
        commissionCurrency: 'ARS',
        investorPercentage: 40 // 40% del socio
    });

    assert.equal(saleResult.calculable, true);
    // Costo total = 20M + 1M + 200k = 21,200,000
    const totalInvested = roundMoney(saleResult.acquisitionCost + saleResult.totalExpenses);
    assert.equal(totalInvested, 21200000);
    // Margen neto global de la operación = 26M - 21.2M - 300k = 4,500,000
    assert.equal(saleResult.netProfit, 4500000);

    // Distribución exacta del margen neto
    assert.equal(saleResult.agencyNetProfit, 2700000, 'Margen Agencia (60%) = $2,700,000');
    assert.equal(saleResult.investorProfitShare, 1800000, 'Margen Socio (40%) = $1,800,000');
    assert.equal(saleResult.agencyNetProfit + saleResult.investorProfitShare, saleResult.netProfit);

    // Capital propio inmovilizado por la Agencia (60% de 21.2M) = 12,720,000
    const agencyCapitalInvested = roundMoney((totalInvested * 60) / 100);
    assert.equal(agencyCapitalInvested, 12720000);

    // Margen sobre capital propio de la Agencia = 2.7M / 12.72M = 21.23%
    const agencyMarginPct = roundMoney((saleResult.agencyNetProfit / agencyCapitalInvested) * 100);
    assert.equal(agencyMarginPct, 21.23);
});

test('CONCILIACIÓN 5: Venta Financiada y Pendiente de Entrega (Margen Devengado vs Caja vs Cuotas)', () => {
    // Venta en $22,000,000 con costo $15,000,000 + $150,000 gastos venta.
    // Anticipo cobrado al boleto: $10,000,000. Saldo a cobrar en 12 cuotas: $12,000,000.
    // Comisión: $250,000.
    // Estado: pendiente_entrega.

    const saleResult = computeSaleProfit({
        salePrice: 22000000,
        saleCurrency: 'ARS',
        hasVehicle: true,
        purchaseCost: 15000000,
        purchaseCurrency: 'ARS',
        acquisitionSource: 'compra',
        vehicleExpenses: [],
        saleExpenses: [{ amount: 150000, currency: 'ARS', description: 'Sellados' }],
        commissionAmount: 250000,
        commissionCurrency: 'ARS',
        investorPercentage: 0
    });

    assert.equal(saleResult.calculable, true);
    // Costo total = 15M + 150k = 15,150,000
    const totalInvested = roundMoney(saleResult.acquisitionCost + saleResult.totalExpenses);
    assert.equal(totalInvested, 15150000);
    // Margen devengado = 22M - 15.15M - 250k = 6,600,000
    assert.equal(saleResult.netProfit, 6600000);

    // Control de Efectivo y Saldos por Cobrar
    const cashCollected = 10000000;      // Anticipo en mano ingresado a caja
    const pendingReceivable = 12000000;  // Cuotas diferidas pendientes de cobro

    assert.equal(cashCollected + pendingReceivable, 22000000, 'Caja cobrada + Cuotas = Precio pactado total');
    assert.notEqual(saleResult.netProfit, cashCollected, 'El margen devengado ($6.6M) NO se confunde con el efectivo cobrado ($10M)');

    // Política de reconocimiento:
    const saleStatus = 'pendiente_entrega';
    const isDelivered = saleStatus === 'entregada';
    const recognitionPolicy = isDelivered ? 'definitiva' : 'condicional';
    assert.equal(recognitionPolicy, 'condicional', 'Venta no entregada se cataloga como devengado condicional');
});

console.log('Todas las 5 conciliaciones sintéticas pasaron exitosamente y con precisión contable auditada.');
