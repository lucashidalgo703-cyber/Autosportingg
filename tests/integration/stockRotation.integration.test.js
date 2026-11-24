// tests/integration/stockRotation.integration.test.js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createStockRotationRouter } from '../../src/routes/stockRotationRoutes.js';
import { ROLES, PERMISSIONS } from '../../src/utils/adminPermissions.js';

test('Integration: Stock Rotation Router Security Gates, Endpoints & Sanitization', async () => {
    const mockService = {
        getStrategicRotationOverview: async ({ user }) => {
            const isOwnerOrFinance = user?.role === 'owner' || (user?.permissions || []).includes('finanzas.read');
            if (!isOwnerOrFinance) {
                return {
                    ok: true,
                    isRestrictedSellerView: true,
                    summary: {
                        totalStockCount: 2,
                        unitsRequiringAttentionCount: 1
                    },
                    vehicles: [
                        {
                            carId: 'car-123',
                            brand: 'Toyota',
                            name: 'Corolla',
                            year: 2022,
                            price: 18000000,
                            currency: 'ARS',
                            status: 'Disponible',
                            daysInStock: 75,
                            priorityTier: 'Alta',
                            commercialFocusTag: 'Prioridad de Venta'
                        }
                    ]
                };
            }

            return {
                ok: true,
                isRestrictedSellerView: false,
                kpis: {
                    capitalOwnImmobilizedSlowRotation: { ARS: 14000000, USD: 0 },
                    totalCapitalOwnInStock: { ARS: 32000000, USD: 0 },
                    totalPartnerCapitalInStock: { ARS: 8000000, USD: 0 },
                    totalInventoryListValue: { ARS: 48000000, USD: 0 },
                    potentialRecoverableLiquidity: { ARS: 32000000, USD: 0 },
                    averageSoldRotationDays: 38,
                    unitsRequiringAttentionCount: 2,
                    criticalUnitsCount: 1,
                    totalStockCount: 3
                },
                vehicles: [
                    {
                        carId: 'car-123',
                        brand: 'Toyota',
                        name: 'Corolla',
                        year: 2022,
                        price: 18000000,
                        currency: 'ARS',
                        status: 'Disponible',
                        daysInStock: 75,
                        acquisitionCost: 13500000,
                        totalEconomicCost: 14000000,
                        capitalOwnInvested: 14000000,
                        projectedNetProfit: 3460000,
                        marginOnCostPct: 24.71,
                        priorityScore: 78,
                        priorityTier: 'Alta',
                        recommendation: {
                            actionKey: 'revisar_precio_mercado',
                            actionLabel: 'Revisar precio respecto al mercado'
                        }
                    }
                ]
            };
        },
        getVehicleFinancials: async (id) => ({
            carId: id,
            price: 18000000,
            totalEconomicCost: 14000000,
            commissionRate: 0.03,
            participation: { agencyPercentage: 100 }
        }),
        simulatePriceReduction: (car, opts) => [
            { scenarioName: 'Precio Actual', finalPrice: 18000000, netProfit: 3460000, recoverableCash: 17460000 },
            { scenarioName: 'Reducción 5%', finalPrice: 17100000, netProfit: 2587000, recoverableCash: 16587000 }
        ],
        calculateLiquidityRecoveryPlan: (vehicles, { targetAmount, currency }) => ({
            targetAmount,
            currency,
            achieved: true,
            packages: [
                {
                    packageName: 'Plan Desarme de Stock Antiguo',
                    accumulatedRecoverable: targetAmount,
                    totalUnits: 1,
                    vehicles: []
                }
            ]
        }),
        saveDecision: async (data) => ({
            _id: 'dec-123',
            ...data,
            date: new Date()
        }),
        getDecisions: async (carId) => [
            {
                _id: 'dec-123',
                carId,
                decisionType: 'ajuste_precio',
                previousPrice: 18000000,
                newAuthorizedPrice: 17100000,
                reason: 'Ajuste para acelerar rotación'
            }
        ]
    };

    let authUser = { role: ROLES.VENTAS, permissions: [PERMISSIONS.VENTAS_READ] };
    const fakeAuth = (req, res, next) => {
        req.user = authUser;
        next();
    };

    const app = express();
    app.use(express.json());
    app.use('/api/admin/stock/rotation', createStockRotationRouter({ authenticate: fakeAuth, service: mockService }));

    const server = app.listen(0);
    const port = server.address().port;

    try {
        // 1. Acceso de Vendedor a la ruta principal de rotación
        // Debe responder 200 pero con vista sanitizada (isRestrictedSellerView: true)
        const resSeller = await fetch(`http://localhost:${port}/api/admin/stock/rotation`);
        assert.equal(resSeller.status, 200);
        const jsonSeller = await resSeller.json();
        assert.equal(jsonSeller.ok, true);
        assert.equal(jsonSeller.isRestrictedSellerView, true, 'Vendedor debe recibir vista restringida');
        assert.equal(jsonSeller.kpis, undefined, 'Vendedor no debe ver KPIs financieros');
        assert.equal(jsonSeller.vehicles[0].acquisitionCost, undefined, 'Vendedor no debe ver costos de compra');
        assert.equal(jsonSeller.vehicles[0].commercialFocusTag, 'Prioridad de Venta');

        // 2. Intento de Vendedor de ejecutar el simulador de precios: 403 Forbidden
        const resSimForbidden = await fetch(`http://localhost:${port}/api/admin/stock/rotation/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ carId: 'car-123' })
        });
        assert.equal(resSimForbidden.status, 403, 'Vendedor debe recibir 403 en simulador de precios');

        // 3. Intento de Vendedor de consultar plan de liquidez: 403 Forbidden
        const resPlanForbidden = await fetch(`http://localhost:${port}/api/admin/stock/rotation/liquidity-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetAmount: 20000000 })
        });
        assert.equal(resPlanForbidden.status, 403, 'Vendedor debe recibir 403 en plan de liquidez');

        // 4. Intento de Vendedor de registrar decisiones comerciales: 403 Forbidden
        const resDecForbidden = await fetch(`http://localhost:${port}/api/admin/stock/rotation/decision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                carId: 'car-123',
                decisionType: 'ajuste_precio',
                reason: 'Prueba no autorizada'
            })
        });
        assert.equal(resDecForbidden.status, 403, 'Vendedor debe recibir 403 en registro de decisiones');

        // 5. Propietario autorizado
        authUser = { role: ROLES.OWNER, name: 'Propietario AutoSporting' };
        const resOwner = await fetch(`http://localhost:${port}/api/admin/stock/rotation`);
        assert.equal(resOwner.status, 200);
        const jsonOwner = await resOwner.json();
        assert.equal(jsonOwner.ok, true);
        assert.equal(jsonOwner.isRestrictedSellerView, false, 'Propietario debe recibir vista completa');
        assert.ok(jsonOwner.kpis, 'Propietario debe recibir KPIs completos');
        assert.equal(jsonOwner.kpis.averageSoldRotationDays, 38);
        assert.equal(jsonOwner.vehicles[0].capitalOwnInvested, 14000000);

        // 6. Propietario ejecuta simulador de precios
        const resSimOwner = await fetch(`http://localhost:${port}/api/admin/stock/rotation/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ carId: 'car-123', customDiscountPct: 5 })
        });
        assert.equal(resSimOwner.status, 200);
        const jsonSim = await resSimOwner.json();
        assert.equal(jsonSim.ok, true);
        assert.equal(jsonSim.scenarios.length, 2);

        // 7. Propietario consulta plan de recuperación de liquidez
        const resPlanOwner = await fetch(`http://localhost:${port}/api/admin/stock/rotation/liquidity-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetAmount: 15000000, currency: 'ARS' })
        });
        assert.equal(resPlanOwner.status, 200);
        const jsonPlan = await resPlanOwner.json();
        assert.equal(jsonPlan.ok, true);
        assert.equal(jsonPlan.plan.achieved, true);

        // 8. Propietario registra decisión comercial
        const resDecOwner = await fetch(`http://localhost:${port}/api/admin/stock/rotation/decision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                carId: 'car-123',
                decisionType: 'ajuste_precio',
                previousPrice: 18000000,
                newAuthorizedPrice: 17100000,
                reason: 'Ajuste de precio tras 75 días'
            })
        });
        assert.equal(resDecOwner.status, 200);
        const jsonDec = await resDecOwner.json();
        assert.equal(jsonDec.ok, true);

        // 9. Historial de decisiones para el vehículo
        const resHistory = await fetch(`http://localhost:${port}/api/admin/stock/rotation/decision/car-123`);
        assert.equal(resHistory.status, 200);
        const jsonHistory = await resHistory.json();
        assert.equal(jsonHistory.ok, true);
        assert.equal(jsonHistory.decisions.length, 1);

    } finally {
        server.close();
    }
});
