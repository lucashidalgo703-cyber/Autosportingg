import assert from 'assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
    computeOperationRecoveryState,
    computeSixStepWaterfallForCollection
} from '../src/services/treasuryWaterfallHelpers.js';
import * as treasuryStrategicService from '../src/services/treasuryStrategicService.js';
import TreasuryBox from '../src/models/TreasuryBox.js';
import TreasuryConfig from '../src/models/TreasuryConfig.js';
import Account from '../src/models/Account.js';
import Transaction from '../src/models/Transaction.js';
import Car from '../src/models/Car.js';
import Sale from '../src/models/Sale.js';

function makeBoxes(shortfalls = {}) {
    const keys = ['operativa', 'impuestos', 'deudas', 'personal', 'postventa', 'reserva', 'stock', 'crecimiento'];
    return keys.map(key => ({
        key,
        name: `Caja ${key}`,
        shortfallARS: Number(shortfalls[key] || 0),
        shortfallUSD: 0
    }));
}

async function runTests() {
    console.log('=== INICIANDO PRUEBAS DE DISTRIBUCIÓN DE TESORERÍA ESTRATÉGICA (SECCIONES 2 A 9) ===\n');

    // -------------------------------------------------------------------------
    // TEST 1: Ejemplo exacto del prompt (Sección 3)
    // Inversión total ya pagada: $12.700.000
    // Venta totalmente cobrada: $15.500.000
    // Ganancia: $2.800.000
    // Extra configurado: 10% = $1.270.000
    // Si los gastos esenciales y la reserva ya están cubiertos:
    // Stock recibe $12.700.000 de capital + $1.270.000 de reinversión = $13.970.000.
    // Quedan $1.530.000 para otros destinos.
    // La ganancia sigue siendo $2.800.000.
    // -------------------------------------------------------------------------
    {
        const vehicle = {
            _id: 'car_ejemplo',
            brand: 'Toyota',
            name: 'Corolla',
            purchasePrice: 12700000,
            purchaseCurrency: 'ARS',
            expenses: []
        };
        const sale = {
            _id: 'sale_ejemplo',
            salePrice: 15500000,
            saleCurrency: 'ARS',
            commissionSettings: { enabled: false },
            saleExpenses: []
        };

        const opState = computeOperationRecoveryState({
            sale,
            vehicle,
            saleTransactions: [],
            paidSettlements: [],
            config: {
                reinvestmentExtraConfigured: true,
                reinvestmentExtraPct: 10
            }
        });

        assert.strictEqual(opState.calculable, true);
        assert.strictEqual(opState.realInvestmentTotal, 12700000, 'Inversión real debe ser $12.700.000');
        assert.strictEqual(opState.ownRealInvestment, 12700000, 'Capital propio invertido debe ser $12.700.000');
        assert.strictEqual(opState.reportedNetProfit, 2800000, 'Ganancia informada debe ser $2.800.000');
        assert.strictEqual(opState.extraReinvestmentTarget, 1270000, 'Extra configurado 10% debe ser $1.270.000');

        // Simulamos el cobro total de $15.500.000 con gastos esenciales y reserva ya cubiertos (shortfalls = 0)
        const wf = computeSixStepWaterfallForCollection({
            amount: 15500000,
            currency: 'ARS',
            ownership: { tercerosAmount: 0, propioAmount: 15500000 },
            operationState: opState,
            enrichedBoxes: makeBoxes({
                operativa: 0,
                impuestos: 0,
                deudas: 0,
                postventa: 0,
                reserva: 0,
                personal: 1530000
            }),
            config: {
                reinvestmentExtraConfigured: true,
                reinvestmentExtraPct: 10,
                surplusRule: { configured: true, stockPercent: 0, crecimientoPercent: 100 }
            }
        });

        assert.strictEqual(wf.capitalRecoveredToStock, 12700000, 'Stock recibe $12.700.000 de recuperación de capital');
        assert.strictEqual(wf.marginCollected, 2800000, 'Margen cobrado disponible es $2.800.000');
        assert.strictEqual(wf.extraReinvestmentToStock, 1270000, 'Stock recibe $1.270.000 de extra de reinversión');

        const totalToStock = wf.appliedAllocations
            .filter(a => a.boxKey === 'stock')
            .reduce((acc, a) => acc + a.amount, 0);
        const totalToOtherDestinations = wf.appliedAllocations
            .filter(a => a.boxKey !== 'stock')
            .reduce((acc, a) => acc + a.amount, 0);

        assert.strictEqual(totalToStock, 13970000, 'Stock recibe en total $12.700.000 + $1.270.000 = $13.970.000');
        assert.strictEqual(totalToOtherDestinations, 1530000, 'Quedan $1.530.000 para otros destinos');
        assert.strictEqual(opState.reportedNetProfit, 2800000, 'La ganancia informada sigue siendo $2.800.000');
        console.log('✓ Test 1 OK: Ejemplo exacto del prompt ($12.700.000 capital + $1.270.000 extra reinversión a Stock, $1.530.000 otros destinos, ganancia $2.800.000)');
    }

    // -------------------------------------------------------------------------
    // TEST 2: Cuotas con recuperación progresiva y cruce de capital a margen
    // Inversión pagada: $10.000.000, Venta: $14.000.000, Extra: 10% ($1.000.000)
    // Entrega: $6.000.000 -> 100% a Stock (recuperación parcial)
    // Cuota 1: $5.500.000 -> $4.000.000 completa capital en Stock + $1.500.000 margen ($1.000.000 completa extra 10% + $500.000 remanente)
    // Cuota 2: $2.500.000 -> capital ya recuperado, extra ya completado (no se repite en cada cuota), 100% margen ($2.500.000)
    // -------------------------------------------------------------------------
    {
        const vehicle = {
            _id: 'car_cuotas',
            purchasePrice: 10000000,
            purchaseCurrency: 'ARS',
            expenses: []
        };
        const sale = {
            _id: 'sale_cuotas',
            salePrice: 14000000,
            saleCurrency: 'ARS',
            commissionSettings: { enabled: false },
            saleExpenses: []
        };
        const cfg = {
            reinvestmentExtraConfigured: true,
            reinvestmentExtraPct: 10,
            surplusRule: { configured: true, stockPercent: 0, crecimientoPercent: 100 }
        };
        const zeroBoxes = makeBoxes();

        // 1) Entrega $6.000.000
        const stateBeforeDelivery = computeOperationRecoveryState({
            sale, vehicle, saleTransactions: [], paidSettlements: [], config: cfg
        });
        const wfDelivery = computeSixStepWaterfallForCollection({
            amount: 6000000,
            currency: 'ARS',
            ownership: { tercerosAmount: 0, propioAmount: 6000000 },
            operationState: stateBeforeDelivery,
            enrichedBoxes: zeroBoxes,
            config: cfg
        });
        assert.strictEqual(wfDelivery.capitalRecoveredToStock, 6000000);
        assert.strictEqual(wfDelivery.marginCollected, 0);
        assert.strictEqual(wfDelivery.extraReinvestmentToStock, 0);

        // 2) Cuota 1 $5.500.000 (habiendo ya cobrado y distribuido los $6.000.000 de entrega)
        const txDelivery = {
            _id: 'tx_del',
            type: 'Ingreso',
            status: 'activo',
            amount: 6000000,
            currency: 'ARS',
            isTreasuryDistributed: true,
            treasuryBreakdown: wfDelivery
        };
        const stateBeforeCuota1 = computeOperationRecoveryState({
            sale, vehicle, saleTransactions: [txDelivery], paidSettlements: [], config: cfg
        });
        assert.strictEqual(stateBeforeCuota1.remainingCapitalToRecover, 4000000, 'Faltan recuperar $4.000.000 de capital');
        assert.strictEqual(stateBeforeCuota1.remainingExtraReinvestmentTarget, 1000000, 'Faltan $1.000.000 de extra de reinversión');

        const wfCuota1 = computeSixStepWaterfallForCollection({
            amount: 5500000,
            currency: 'ARS',
            ownership: { tercerosAmount: 0, propioAmount: 5500000 },
            operationState: stateBeforeCuota1,
            enrichedBoxes: zeroBoxes,
            config: cfg
        });
        assert.strictEqual(wfCuota1.capitalRecoveredToStock, 4000000, 'Cuota 1 separa $4.000.000 para completar capital');
        assert.strictEqual(wfCuota1.marginCollected, 1500000, 'Cuota 1 separa $1.500.000 de excedente/margen');
        assert.strictEqual(wfCuota1.extraReinvestmentToStock, 1000000, 'Cuota 1 completa el objetivo de $1.000.000 de extra de reinversión');
        assert.strictEqual(wfCuota1.remainderDistributed, 500000, 'Cuota 1 envía $500.000 de remanente a crecimiento');

        // 3) Cuota 2 $2.500.000 (no repite el extra de reinversión ni vuelve a recuperar capital)
        const txCuota1 = {
            _id: 'tx_c1',
            type: 'Ingreso',
            status: 'activo',
            amount: 5500000,
            currency: 'ARS',
            isTreasuryDistributed: true,
            treasuryBreakdown: wfCuota1
        };
        const stateBeforeCuota2 = computeOperationRecoveryState({
            sale, vehicle, saleTransactions: [txDelivery, txCuota1], paidSettlements: [], config: cfg
        });
        assert.strictEqual(stateBeforeCuota2.remainingCapitalToRecover, 0, 'Capital 100% recuperado antes de Cuota 2');
        assert.strictEqual(stateBeforeCuota2.remainingExtraReinvestmentTarget, 0, 'Extra de reinversión 100% completado antes de Cuota 2');

        const wfCuota2 = computeSixStepWaterfallForCollection({
            amount: 2500000,
            currency: 'ARS',
            ownership: { tercerosAmount: 0, propioAmount: 2500000 },
            operationState: stateBeforeCuota2,
            enrichedBoxes: zeroBoxes,
            config: cfg
        });
        assert.strictEqual(wfCuota2.capitalRecoveredToStock, 0, 'Cuota 2 no repite recuperación de capital');
        assert.strictEqual(wfCuota2.extraReinvestmentToStock, 0, 'Cuota 2 no repite extra de reinversión');
        assert.strictEqual(wfCuota2.marginCollected, 2500000, 'Cuota 2 es 100% margen');
        assert.strictEqual(wfCuota2.remainderDistributed, 2500000);
        console.log('✓ Test 2 OK: Cuotas con recuperación progresiva, separación capital/excedente y sin repetir el extra en cada cuota');
    }

    // -------------------------------------------------------------------------
    // TEST 3: Costos de la operación y comisiones pendientes de pago
    // Si hay costos pendientes ($400.000 de taller + $100.000 de comisión pendiente = $500.000),
    // reserva primero esos $500.000 para cancelarlos y evita asignar ese mismo dinero simultáneamente a Stock.
    // -------------------------------------------------------------------------
    {
        const vehicle = {
            _id: 'car_pend',
            purchasePrice: 8000000,
            purchaseCurrency: 'ARS',
            expenses: [
                { description: 'Chapa y pintura pendiente', amount: 400000, status: 'pendiente' }
            ]
        };
        const sale = {
            _id: 'sale_pend',
            salePrice: 10000000,
            saleCurrency: 'ARS',
            commissionSettings: { enabled: true, totalCommissionPct: 1, totalCommissionAmount: 100000 },
            saleExpenses: []
        };
        const opState = computeOperationRecoveryState({
            sale, vehicle, saleTransactions: [], paidSettlements: [], config: { reinvestmentExtraConfigured: false }
        });
        assert.strictEqual(opState.pendingOperationCostsTotal, 500000, 'Debe detectar $400.000 de gasto pendiente + $100.000 de comisión impaga');

        const wf = computeSixStepWaterfallForCollection({
            amount: 3000000,
            currency: 'ARS',
            ownership: { tercerosAmount: 0, propioAmount: 3000000 },
            operationState: opState,
            enrichedBoxes: makeBoxes(),
            config: { reinvestmentExtraConfigured: false }
        });

        assert.strictEqual(wf.operationPendingCostsReserved, 500000, 'Paso 1 reserva $500.000 para costos pendientes de la operación');
        assert.strictEqual(wf.capitalRecoveredToStock, 2500000, 'Paso 2 envía a Stock solo $2.500.000 para no asignar dos veces los $500.000 reservados');
        console.log('✓ Test 3 OK: Reserva de costos y comisiones pendientes de pago sin duplicar asignación a Stock');
    }

    // -------------------------------------------------------------------------
    // TEST 4: Margen insuficiente o pérdida + Extra en 0% y sin configurar
    // -------------------------------------------------------------------------
    {
        const vehicleLoss = {
            _id: 'car_loss',
            purchasePrice: 15000000,
            purchaseCurrency: 'ARS',
            expenses: []
        };
        const saleLoss = {
            _id: 'sale_loss',
            salePrice: 13500000,
            saleCurrency: 'ARS',
            commissionSettings: { enabled: false },
            saleExpenses: []
        };
        const opLoss = computeOperationRecoveryState({
            sale: saleLoss,
            vehicle: vehicleLoss,
            saleTransactions: [],
            paidSettlements: [],
            config: { reinvestmentExtraConfigured: true, reinvestmentExtraPct: 10 }
        });
        assert.strictEqual(opLoss.reportedNetProfit, -1500000, 'Pérdida de -$1.500.000');

        const wfLoss = computeSixStepWaterfallForCollection({
            amount: 13500000,
            currency: 'ARS',
            ownership: { tercerosAmount: 0, propioAmount: 13500000 },
            operationState: opLoss,
            enrichedBoxes: makeBoxes({ operativa: 500000 }),
            config: { reinvestmentExtraConfigured: true, reinvestmentExtraPct: 10 }
        });
        assert.strictEqual(wfLoss.capitalRecoveredToStock, 13500000, 'En venta a pérdida, todo el cobro propio recupera capital hasta donde alcanza');
        assert.strictEqual(wfLoss.marginCollected, 0, 'No hay margen cobrado en venta con pérdida');
        assert.strictEqual(wfLoss.extraReinvestmentToStock, 0, 'No se asigna extra de reinversión si no hay margen');

        // Prueba con Extra de Reinversión en 0%
        const opZeroExtra = computeOperationRecoveryState({
            sale: { _id: 's0', salePrice: 12000000, saleCurrency: 'ARS' },
            vehicle: { _id: 'c0', purchasePrice: 10000000, purchaseCurrency: 'ARS' },
            config: { reinvestmentExtraConfigured: true, reinvestmentExtraPct: 0 }
        });
        assert.strictEqual(opZeroExtra.extraReinvestmentTarget, 0, 'Con 0% configurado, el objetivo de extra es 0');
        console.log('✓ Test 4 OK: Margen insuficiente / pérdida y Extra de reinversión en 0% y sin configurar');
    }

    // -------------------------------------------------------------------------
    // TEST 5: Gastos esenciales y Reserva con faltantes (Pasos 3 y 4)
    // -------------------------------------------------------------------------
    {
        const op = computeOperationRecoveryState({
            sale: { _id: 's_short', salePrice: 15000000, saleCurrency: 'ARS' },
            vehicle: { _id: 'c_short', purchasePrice: 10000000, purchaseCurrency: 'ARS' },
            config: { reinvestmentExtraConfigured: true, reinvestmentExtraPct: 10 } // Extra = $1.000.000
        });
        const wf = computeSixStepWaterfallForCollection({
            amount: 15000000,
            currency: 'ARS',
            ownership: { tercerosAmount: 0, propioAmount: 15000000 },
            operationState: op,
            enrichedBoxes: makeBoxes({
                operativa: 1200000,
                impuestos: 300000,
                deudas: 0,
                postventa: 200000,
                reserva: 800000,
                personal: 500000
            }),
            config: {
                reinvestmentExtraConfigured: true,
                reinvestmentExtraPct: 10,
                surplusRule: { configured: true, stockPercent: 0, crecimientoPercent: 100 }
            }
        });
        assert.strictEqual(wf.capitalRecoveredToStock, 10000000);
        assert.strictEqual(wf.essentialShortfallsCovered, 1700000);
        assert.strictEqual(wf.reserveCovered, 800000);
        assert.strictEqual(wf.extraReinvestmentToStock, 1000000);
        assert.strictEqual(wf.remainderDistributed, 1500000);
        console.log('✓ Test 5 OK: Cobertura estricta en orden (Pasos 3 y 4 antes del Extra de Reinversión en Paso 5 y Remanente en Paso 6)');
    }

    // -------------------------------------------------------------------------
    // TEST 6: Permutas (capital en otro vehículo) y Socios (acuerdo registrado)
    // -------------------------------------------------------------------------
    {
        const opPermuta = computeOperationRecoveryState({
            sale: {
                _id: 's_perm',
                salePrice: 20000000,
                saleCurrency: 'ARS',
                tradeInTotalAmount: 8000000,
                tradeIns: [{ estimatedValue: 8000000, currency: 'ARS' }]
            },
            vehicle: { _id: 'c_perm', purchasePrice: 14000000, purchaseCurrency: 'ARS' },
            config: { reinvestmentExtraConfigured: true, reinvestmentExtraPct: 10 }
        });
        assert.strictEqual(opPermuta.tradeInCapitalInVehicles, 8000000, 'Permuta representa $8.000.000 de capital en otro vehículo');
        assert.strictEqual(opPermuta.ownCashInvestmentToRecover, 6000000, 'Solo faltan recuperar $6.000.000 en efectivo porque $8.000.000 están en el auto tomado');

        const wfPermuta = computeSixStepWaterfallForCollection({
            amount: 12000000,
            currency: 'ARS',
            ownership: { tercerosAmount: 0, propioAmount: 12000000 },
            operationState: opPermuta,
            enrichedBoxes: makeBoxes(),
            config: {
                reinvestmentExtraConfigured: true,
                reinvestmentExtraPct: 10,
                surplusRule: { configured: true, stockPercent: 0, crecimientoPercent: 100 }
            }
        });
        assert.strictEqual(wfPermuta.capitalRecoveredToStock, 6000000, 'En efectivo se recuperan $6.000.000 sin duplicar los $8.000.000 del vehículo tomado');
        assert.strictEqual(wfPermuta.marginCollected, 6000000, 'El margen cobrado en efectivo es $6.000.000');

        // Socio 50%: Inversión total $10.000.000 (Agencia 50% = $5.000.000, Socio 50% = $5.000.000)
        const opSocio = computeOperationRecoveryState({
            sale: { _id: 's_soc', salePrice: 14000000, saleCurrency: 'ARS' },
            vehicle: {
                _id: 'c_soc',
                purchasePrice: 10000000,
                purchaseCurrency: 'ARS',
                investor: { name: 'Socio Juan', percentage: 50 }
            },
            config: { reinvestmentExtraConfigured: true, reinvestmentExtraPct: 10 }
        });
        assert.strictEqual(opSocio.ownRealInvestment, 5000000, 'Inversión propia agencia (50%) = $5.000.000');
        assert.strictEqual(opSocio.thirdPartyRealInvestment, 5000000, 'Capital de socio (50%) = $5.000.000');
        assert.strictEqual(opSocio.extraReinvestmentTarget, 500000, 'Extra 10% se calcula sobre la inversión propia de la agencia ($500.000)');
        console.log('✓ Test 6 OK: Permutas (capital en otro vehículo sin doble conteo) y Socios (separación capital propio vs terceros)');
    }

    // -------------------------------------------------------------------------
    // TEST 7: Integración en Base Aislada (Ajustes manuales conservados,
    // Vista previa y motivo obligatorio, Idempotencia en reintentos y Reversión)
    // -------------------------------------------------------------------------
    const mongod = await MongoMemoryServer.create();
    const testMongoUri = mongod.getUri('autosporting_test_treasury_dist');
    await mongoose.connect(testMongoUri);

    try {
        await mongoose.connection.db.dropDatabase();

        await treasuryStrategicService.getTreasuryDashboardData();
        await treasuryStrategicService.updateTreasuryConfig(
            {
                autoDistributeIncomes: true,
                requirePinForAutoDistribution: false,
                reinvestmentExtraConfigured: true,
                reinvestmentExtraPct: 10,
                surplusRule: { configured: true, stockPercent: 0, crecimientoPercent: 100 }
            },
            'AdminTest'
        );

        // 1) Ajuste manual inicial con vista previa y motivo obligatorio
        await assert.rejects(
            () => treasuryStrategicService.distributeToBoxes(
                { allocations: [{ boxKey: 'operativa', amountARS: 500000 }], reason: '' },
                { name: 'AdminTest' }
            ),
            /motivo obligatorio/i,
            'Debe rechazar edición manual sin motivo obligatorio'
        );

        const editPreview = await treasuryStrategicService.distributeToBoxes(
            {
                allocations: [{ boxKey: 'operativa', amountARS: 500000, monthlyBudgetARS: 500000 }],
                reason: 'Asignación manual inicial de prueba',
                previewOnly: true
            },
            { name: 'AdminTest' }
        );
        assert.strictEqual(editPreview.isPreview, true);
        assert.strictEqual(editPreview.affectsBankBalances, false);

        await treasuryStrategicService.distributeToBoxes(
            {
                allocations: [{ boxKey: 'operativa', amountARS: 500000, monthlyBudgetARS: 500000 }],
                reason: 'Asignación manual inicial de prueba'
            },
            { name: 'AdminTest' }
        );

        // 2) Crear auto ($12.700.000) y venta ($15.500.000) y cobrarla
        const carDoc = await Car.create({
            brand: 'Toyota',
            name: 'Corolla Test',
            model: 'XEI',
            year: 2022,
            km: 35000,
            fuel: 'Nafta',
            condition: 'Usado',
            price: 15500000,
            currency: 'ARS',
            purchasePrice: 12700000,
            purchaseCurrency: 'ARS',
            status: 'Vendido',
            agencyOwned: true
        });

        const saleDoc = await Sale.create({
            vehicleId: carDoc._id,
            customerName: 'Cliente Prueba',
            salePrice: 15500000,
            saleCurrency: 'ARS',
            commissionSettings: { enabled: false },
            status: 'confirmada'
        });

        const accDoc = await Account.create({
            name: 'Banco ARS Test',
            type: 'Banco',
            currency: 'ARS',
            balance: 16000000,
            isActive: true
        });

        const incomeTx = await Transaction.create({
            type: 'Ingreso',
            category: 'Venta de Vehículo',
            amount: 15500000,
            currency: 'ARS',
            description: 'Cobro total Corolla Test',
            accountId: accDoc._id,
            saleId: saleDoc._id,
            vehicleId: carDoc._id,
            status: 'activo',
            module: 'crm_v2'
        });

        const regRes = await treasuryStrategicService.registerCollectionForTreasury(incomeTx, { user: { name: 'AdminTest' } });
        assert.strictEqual(regRes.action, 'auto_distributed', 'El cobro debe distribuirse automáticamente');

        const opBoxAfter = await TreasuryBox.findOne({ key: 'operativa' }).lean();
        const stockBoxAfter = await TreasuryBox.findOne({ key: 'stock' }).lean();
        const crecBoxAfter = await TreasuryBox.findOne({ key: 'crecimiento' }).lean();

        assert.strictEqual(opBoxAfter.balanceARS, 500000, 'El ajuste manual de $500.000 en Operativa se conserva después de nuevos cobros');
        assert.strictEqual(stockBoxAfter.balanceARS, 13970000, 'Stock recibe $12.700.000 de capital + $1.270.000 de extra = $13.970.000');
        assert.strictEqual(crecBoxAfter.balanceARS, 1530000, 'Crecimiento recibe el remanente de $1.530.000');

        // 3) Reintento idempotente
        const incomeTxReloaded = await Transaction.findById(incomeTx._id);
        const retryRes = await treasuryStrategicService.registerCollectionForTreasury(incomeTxReloaded, { user: { name: 'AdminTest' } });
        assert.strictEqual(retryRes.action, 'already_distributed', 'Reintento detectado como idempotente sin duplicar');
        const stockAfterRetry = await TreasuryBox.findOne({ key: 'stock' }).lean();
        assert.strictEqual(stockAfterRetry.balanceARS, 13970000, 'Saldo de Stock sin duplicación tras reintento');

        // 4) Vista previa de transferencia desde Stock hacia Operativa (debe advertir consumo de capital de Stock)
        const transferPreview = await treasuryStrategicService.transferBetweenBoxes(
            {
                fromBoxKey: 'stock',
                toBoxKey: 'operativa',
                currency: 'ARS',
                amount: 300000,
                reason: 'Cobertura explícita de gasto puntual',
                previewOnly: true
            },
            { name: 'AdminTest' }
        );
        assert.strictEqual(transferPreview.isPreview, true);
        assert.ok(transferPreview.preview?.stockConsumptionWarning, 'Debe mostrar advertencia y consecuencias al transferir desde Stock');

        // 5) Reversión auditada del cobro al anularse la transacción
        const revRes = await treasuryStrategicService.reverseIncomeDistribution(incomeTx._id, {
            reason: 'Anulación de prueba',
            user: 'AdminTest'
        });
        assert.strictEqual(revRes.reversed, true, 'La distribución del cobro debe revertirse al anular');
        const stockAfterRev = await TreasuryBox.findOne({ key: 'stock' }).lean();
        const opAfterRev = await TreasuryBox.findOne({ key: 'operativa' }).lean();
        assert.strictEqual(stockAfterRev.balanceARS, 0, 'Stock vuelve a 0 tras revertir el cobro');
        assert.strictEqual(opAfterRev.balanceARS, 500000, 'Operativa conserva su ajuste manual de $500.000 tras revertir el cobro');

        // 6) Gasto pagado e idempotencia / reversión de gasto
        const expTx = await Transaction.create({
            type: 'Egreso',
            category: 'Alquiler',
            amount: 200000,
            currency: 'ARS',
            description: 'Pago alquiler local',
            accountId: accDoc._id,
            status: 'activo',
            module: 'crm_v2'
        });
        await treasuryStrategicService.syncExpenseWithTreasury(expTx, { isNew: true, user: 'AdminTest' });
        await treasuryStrategicService.syncExpenseWithTreasury(expTx, { isNew: true, user: 'AdminTest' });
        const opAfterExp = await TreasuryBox.findOne({ key: 'operativa' }).lean();
        assert.strictEqual(opAfterExp.balanceARS, 300000, 'El gasto pagado descuenta la caja Operativa una sola vez ($500.000 - $200.000 = $300.000)');

        expTx.status = 'anulado';
        await expTx.save();
        await treasuryStrategicService.syncExpenseWithTreasury(expTx, { statusChanged: true, oldStatus: 'activo', user: 'AdminTest' });
        const opAfterExpAnnul = await TreasuryBox.findOne({ key: 'operativa' }).lean();
        assert.strictEqual(opAfterExpAnnul.balanceARS, 500000, 'Al anular el gasto se restituyen los $200.000 a Operativa');

        console.log('✓ Test 7 OK: Integración en BD aislada (Ajustes manuales conservados, Vista previa con advertencia de Stock, Idempotencia en reintentos y Reversión auditada)');
    } finally {
        await mongoose.disconnect();
        await mongod.stop();
    }

    console.log('\n=== TODOS LOS TESTS DE CASCADA, PERMUTAS, SOCIOS, CUOTAS E INTEGRACIÓN PASARON EXITOSAMENTE ===');
}

runTests().catch((err) => {
    console.error('Fallo en tests de distribución:', err);
    process.exit(1);
});
