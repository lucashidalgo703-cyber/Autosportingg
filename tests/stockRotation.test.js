// tests/stockRotation.test.js
// Validación completa de Inteligencia de Rotación del Stock y Recuperación Estratégica de Capital.
// Verifica antigüedad, estados, unidades compartidas, permutas, umbrales, simulador, prioridad comercial y seguridad.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    classifyAging,
    calculateVehicleDaysBreakdown,
    calculatePriceThresholds,
    simulatePriceReduction,
    calculateOpportunityCosts,
    calculateCommercialPriorityIndex,
    generateStrategicRecommendation,
    calculateLiquidityRecoveryPlan,
    sanitizeRotationForSeller,
    resolvePartnerParticipation,
    AGING_RANGES
} from '../src/services/stockRotationService.js';
import { listingIdentity } from '../src/services/purchaseListingSources.js';
import { canReadStrategicRotation } from '../src/utils/adminPermissions.js';
import { computeSaleProfit, roundMoney } from '../src/utils/saleCommercial.js';

test('1. Clasificación por Antigüedad: Rangos canónicos 0-30, 31-60, 61-90 y +90 días', () => {
    // 0 a 30 días: Rotación saludable
    assert.equal(classifyAging(0).key, 'saludable');
    assert.equal(classifyAging(15).key, 'saludable');
    assert.equal(classifyAging(30).key, 'saludable');

    // 31 a 60 días: Seguimiento
    assert.equal(classifyAging(31).key, 'seguimiento');
    assert.equal(classifyAging(45).key, 'seguimiento');
    assert.equal(classifyAging(60).key, 'seguimiento');

    // 61 a 90 días: Atención
    assert.equal(classifyAging(61).key, 'atencion');
    assert.equal(classifyAging(75).key, 'atencion');
    assert.equal(classifyAging(90).key, 'atencion');

    // Más de 90 días: Revisión prioritaria
    assert.equal(classifyAging(91).key, 'revision_prioritaria');
    assert.equal(classifyAging(120).key, 'revision_prioritaria');
    assert.equal(classifyAging(365).key, 'revision_prioritaria');
});

test('2. Descomposición de Días: Disponible, Pausado, Reservado sin reseteo artificial', () => {
    const now = new Date('2026-06-01T12:00:00Z');
    const createdAt = new Date('2026-03-03T12:00:00Z'); // 90 días atrás

    const carPausado = {
        createdAt,
        status: 'Pausado',
        auditLog: [
            { action: 'PRECIO', date: new Date('2026-05-01T12:00:00Z') }, // Edición de precio NO resetea
            { action: 'ESTADO', newValue: 'Pausado', date: new Date('2026-05-18T12:00:00Z') } // Pausado hace 14 días
        ]
    };

    const breakdown = calculateVehicleDaysBreakdown(carPausado, now);
    assert.equal(breakdown.totalDays, 90, 'Días totales debe ser 90');
    assert.equal(breakdown.daysPaused, 14, 'Días pausado debe ser 14');
    assert.equal(breakdown.daysAvailable, 76, 'Días disponibles debe ser 90 - 14 = 76');
});

test('3. Unidades Compartidas y Capital Propio Inmovilizado', () => {
    // Vehículo con 40% inversor / 60% agencia
    const car = {
        jointOwnership: {
            hasPartner: true,
            partnerName: 'Inversiones Australes',
            partnerPercentage: 40
        }
    };

    const participation = resolvePartnerParticipation(car);
    assert.equal(participation.hasPartner, true);
    assert.equal(participation.partnerPercentage, 40);
    assert.equal(participation.agencyPercentage, 60);

    // Costo total = $20.000.000
    const totalCost = 20000000;
    const ownCapital = roundMoney(totalCost * (participation.agencyPercentage / 100));
    const partnerCapital = roundMoney(totalCost * (participation.partnerPercentage / 100));

    assert.equal(ownCapital, 12000000, 'Capital propio = $12.000.000');
    assert.equal(partnerCapital, 8000000, 'Capital socio = $8.000.000');
    assert.equal(ownCapital + partnerCapital, totalCost);
});

test('4. Trazabilidad de Permutas Encadenadas: No-duplicación de ganancia', () => {
    // Vehículo tomado como parte de pago por valor acordado de $10.000.000
    const carTradeIn = {
        brand: 'Ford',
        name: 'Focus SE',
        year: 2018,
        price: 13500000,
        currency: 'ARS',
        tradeInOrigin: {
            saleId: '507f1f77bcf86cd799439011',
            value: 10000000,
            currency: 'ARS'
        },
        expenses: [
            { concept: 'Service y tren delantero', amount: 500000, currency: 'ARS' }
        ]
    };

    const profitResult = computeSaleProfit({
        salePrice: carTradeIn.price,
        saleCurrency: carTradeIn.currency,
        vehicle: carTradeIn,
        legacyTradeInOrigin: carTradeIn.tradeInOrigin,
        vehicleExpenses: carTradeIn.expenses,
        commissionAmount: 200000
    });

    assert.equal(profitResult.calculable, true);
    assert.equal(profitResult.acquisitionCost, 10000000, 'Costo económico es el valor de toma');
    assert.equal(profitResult.vehicleExpensesTotal, 500000, 'Gastos de taller = $500k');
    const totalCost = profitResult.acquisitionCost + profitResult.vehicleExpensesTotal;
    assert.equal(totalCost, 10500000);
    // Ganancia Neta = 13.5M - 10.5M - 0.2M comisión = 2.8M
    assert.equal(profitResult.netProfit, 2800000);
});

test('5. Fuentes de Mercado Verificadas y Deduplicación con purchaseListingSources', () => {
    // 1. Mercado Libre Autos válido
    const mlUrl = 'https://auto.mercadolibre.com.ar/MLA-1489234891-toyota-corolla-xei-2022-_JM';
    const mlIdentity = listingIdentity(mlUrl);
    assert.ok(mlIdentity);
    assert.equal(mlIdentity.source, 'Mercado Libre Autos');
    assert.equal(mlIdentity.id, 'MLA1489234891');

    // 2. Kavak Argentina válido
    const kavakUrl = 'https://www.kavak.com/ar/venta/ford-focus-2018?id=123456';
    const kavakIdentity = listingIdentity(kavakUrl);
    assert.ok(kavakIdentity);
    assert.equal(kavakIdentity.source, 'Kavak Argentina');
    assert.equal(kavakIdentity.id, '123456');

    // 3. URL inválida o no soportada
    assert.equal(listingIdentity('http://inseguro.com/auto'), null, 'HTTP no seguro rechazado');
    assert.equal(listingIdentity('https://facebook.com/marketplace/item/123'), null, 'Plataforma no autorizada');
});

test('6. Umbrales de Precio Comercial: Break-even, Margen Objetivo y Liquidación', () => {
    // Costo total = $10.000.000, Comisión vendedor = 3%, Margen objetivo = 10%
    const thresholds = calculatePriceThresholds({
        totalCost: 10000000,
        commissionRate: 0.03,
        fixedCommission: 0,
        targetMarginPct: 10
    });

    // Punto de equilibrio: P * (1 - 0.03) = 10.000.000 -> P = 10.000.000 / 0.97 = 10.309.278,35
    assert.equal(thresholds.breakEvenPrice, 10309278.35);

    // Margen objetivo 10%: P * 0.97 = 11.000.000 -> P = 11.000.000 / 0.97 = 11.340.206,19
    assert.equal(thresholds.targetMinPrice, 11340206.19);

    // Liquidación: $10.000.000
    assert.equal(thresholds.liquidationPrice, 10000000);
});

test('7. Simulador de Reducción de Precio (-3%, -5%, -8%, personalizado)', () => {
    const carFinancials = {
        price: 15000000,
        totalEconomicCost: 11000000,
        commissionRate: 0.03,
        participation: { agencyPercentage: 100, partnerPercentage: 0 }
    };

    const scenarios = simulatePriceReduction(carFinancials, { customDiscountPct: 10 });
    assert.equal(scenarios.length, 5);

    // Escenario 1: Precio Actual ($15.000.000)
    const base = scenarios[0];
    assert.equal(base.finalPrice, 15000000);
    assert.equal(base.commissionAmount, 450000);
    assert.equal(base.netProfit, 3550000); // 15M - 11M - 450k
    assert.equal(base.differenceVsOriginal, 0);

    // Escenario 2: Reducción 5% ($14.250.000)
    const sc5 = scenarios[2];
    assert.equal(sc5.finalPrice, 14250000);
    assert.equal(sc5.commissionAmount, 427500);
    assert.equal(sc5.netProfit, 2822500); // 14.25M - 11M - 427.5k
    assert.equal(sc5.differenceVsOriginal, -727500); // Se sacrifican $727.500 de margen

    // Escenario 3: Personalizado 10% ($13.500.000)
    const scCustom = scenarios[4];
    assert.equal(scCustom.finalPrice, 13500000);
    assert.equal(scCustom.isProfitable, true);
});

test('8. Costo de Oportunidad Proyectado a 15, 30, 60 y 90 días', () => {
    const oppCosts = calculateOpportunityCosts({
        totalCost: 10000000,
        currency: 'ARS',
        annualCapitalRate: 0.365, // 36.5% anual = 0.1% diario = $10.000/día
        monthlyCarryingCost: 90000 // $3.000/día
    });

    assert.equal(oppCosts.length, 4);
    // A 30 días:
    // Costo capital: $10.000.000 * (0.365/365) * 30 = $300.000
    // Mantenimiento y seguro: (90.000 / 30) * 30 = $90.000
    // Total a 30 días = $390.000
    const d30 = oppCosts[1];
    assert.equal(d30.days, 30);
    assert.equal(d30.capitalCost, 300000);
    assert.equal(d30.carryingCost, 90000);
    assert.equal(d30.totalEstimatedHoldingCost, 390000);
});

test('9. Índice de Prioridad Comercial Explicable (0 a 100) y Factores Determinantes', () => {
    // Caso de alta urgencia: 110 días en stock, precio +12% sobre mercado, 0 consultas
    const urgentIndex = calculateCommercialPriorityIndex({
        daysInStock: 110,
        priceDifferenceVsMarket: 12,
        hasMarketEvidence: true,
        capitalOwnInvested: 25000000,
        fleetMedianCapital: 15000000,
        demandMetrics: { inquiriesCount: 0, activeLeadsCount: 0, testDrivesCount: 0, hasActiveReservation: false },
        projectedMarginOnCostPct: 6
    });

    assert.ok(urgentIndex.totalScore >= 80, `Puntaje debe ser >= 80 (Urgente). Actual: ${urgentIndex.totalScore}`);
    assert.equal(urgentIndex.priorityTier, 'Urgente');
    assert.ok(urgentIndex.drivingFactors.some(f => f.factor === 'Antigüedad'));
    assert.ok(urgentIndex.drivingFactors.some(f => f.factor === 'Baja demanda'));

    // Caso saludable: 15 días en stock, precio alineado, consultas activas
    const healthyIndex = calculateCommercialPriorityIndex({
        daysInStock: 15,
        priceDifferenceVsMarket: -2,
        hasMarketEvidence: true,
        capitalOwnInvested: 10000000,
        fleetMedianCapital: 15000000,
        demandMetrics: { inquiriesCount: 3, activeLeadsCount: 2, testDrivesCount: 1, hasActiveReservation: false },
        projectedMarginOnCostPct: 22
    });

    assert.ok(healthyIndex.totalScore <= 35, `Puntaje debe ser <= 35 (Saludable). Actual: ${healthyIndex.totalScore}`);
    assert.equal(healthyIndex.priorityTier, 'Baja');
});

test('10. Recomendaciones Estratégicas: Motivo, Evidencia, Capital y Acción', () => {
    const recCritical = generateStrategicRecommendation({
        daysInStock: 95,
        priceDifferenceVsMarket: 10,
        hasMarketEvidence: true,
        priorityScore: 85,
        projectedMarginOnCostPct: 7,
        demandMetrics: { inquiriesCount: 0 },
        totalEconomicCost: 15000000,
        capitalOwnInvested: 15000000,
        currency: 'ARS'
    });

    assert.equal(recCritical.actionKey, 'revisar_precio_mercado');
    assert.equal(recCritical.badge, 'red');
    assert.match(recCritical.motive, /Inmovilización crítica/);
    assert.match(recCritical.evidence, /95 días/);
    assert.equal(recCritical.capitalInvolved, 15000000);
});

test('11. Plan de Recuperación de Liquidez: Selección Óptima de Unidades', () => {
    const stock = [
        { carId: 'c1', brand: 'Toyota', name: 'Etios', year: 2019, price: 12000000, totalEconomicCost: 9500000, capitalOwnInvested: 9500000, currency: 'ARS', status: 'Disponible', daysInStock: 95, priorityScore: 88, marginOnCostPct: 26 },
        { carId: 'c2', brand: 'Volkswagen', name: 'Gol', year: 2020, price: 10000000, totalEconomicCost: 8000000, capitalOwnInvested: 8000000, currency: 'ARS', status: 'Disponible', daysInStock: 70, priorityScore: 72, marginOnCostPct: 25 },
        { carId: 'c3', brand: 'Jeep', name: 'Compass', year: 2022, price: 28000000, totalEconomicCost: 23000000, capitalOwnInvested: 23000000, currency: 'ARS', status: 'Disponible', daysInStock: 15, priorityScore: 25, marginOnCostPct: 21 },
        { carId: 'c4', brand: 'BMW', name: '320i', year: 2021, price: 45000, totalEconomicCost: 38000, capitalOwnInvested: 38000, currency: 'USD', status: 'Disponible', daysInStock: 40, priorityScore: 40, marginOnCostPct: 18 } // Otra moneda
    ];

    // Objetivo: recuperar $15.000.000 ARS
    const plan = calculateLiquidityRecoveryPlan(stock, { targetAmount: 15000000, currency: 'ARS' });

    assert.equal(plan.achieved, true);
    assert.equal(plan.packages.length, 2);

    const urgencyPkg = plan.packages[0];
    assert.ok(urgencyPkg.accumulatedRecoverable >= 15000000);
    // Debe haber seleccionado c1 (Etios >90d) primero
    assert.equal(urgencyPkg.vehicles[0].carId, 'c1');
    assert.equal(urgencyPkg.vehicles[1].carId, 'c2');
    assert.equal(urgencyPkg.vehicles.length, 2); // c1 + c2 = 9.5M + 8M = 17.5M >= 15M
});

test('12. Seguridad y Permisos: Sanitización de datos para perfil Vendedor', () => {
    // 1. Permisos en adminPermissions
    assert.equal(canReadStrategicRotation({ role: 'owner' }), true);
    assert.equal(canReadStrategicRotation({ role: 'admin', permissions: ['finanzas.read'] }), true);
    assert.equal(canReadStrategicRotation({ role: 'ventas', permissions: [] }), false, 'Vendedor no tiene acceso financiero');

    // 2. Sanitización estricta para vendedores
    const fullVehicle = {
        carId: 'car-789',
        brand: 'Ford',
        name: 'Ranger XLT',
        year: 2022,
        km: 45000,
        color: 'Gris',
        plate: 'AF987PZ',
        status: 'Disponible',
        daysInStock: 85,
        price: 32000000,
        currency: 'ARS',
        // Datos confidenciales que NUNCA deben ver los vendedores:
        acquisitionCost: 24000000,
        expensesTotal: 800000,
        totalEconomicCost: 24800000,
        capitalOwnInvested: 24800000,
        partnerCapitalInvested: 0,
        projectedNetProfit: 6240000,
        marginOnCostPct: 25.16,
        breakEvenPrice: 25567010,
        liquidationPrice: 24800000,
        // Datos comerciales autorizados:
        priorityTier: 'Alta',
        priorityBadge: 'amber',
        urgencyLabel: 'Atención comercial requerida',
        recommendation: {
            suggestedAction: 'Ofrecer activamente a interesados en pickups'
        }
    };

    const sanitized = sanitizeRotationForSeller(fullVehicle);

    // Debe conservar datos comerciales
    assert.equal(sanitized.carId, 'car-789');
    assert.equal(sanitized.brand, 'Ford');
    assert.equal(sanitized.name, 'Ranger XLT');
    assert.equal(sanitized.price, 32000000);
    assert.equal(sanitized.priorityTier, 'Alta');
    assert.equal(sanitized.commercialFocusTag, 'Prioridad de Venta');

    // NUNCA debe incluir datos financieros privados
    assert.equal(sanitized.acquisitionCost, undefined);
    assert.equal(sanitized.totalEconomicCost, undefined);
    assert.equal(sanitized.capitalOwnInvested, undefined);
    assert.equal(sanitized.projectedNetProfit, undefined);
    assert.equal(sanitized.marginOnCostPct, undefined);
    assert.equal(sanitized.breakEvenPrice, undefined);
    assert.equal(sanitized.liquidationPrice, undefined);
});
