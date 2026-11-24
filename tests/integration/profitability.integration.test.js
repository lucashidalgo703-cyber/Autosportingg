// tests/integration/profitability.integration.test.js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createProfitabilityRouter } from '../../src/routes/profitabilityRoutes.js';
import { ROLES, PERMISSIONS } from '../../src/utils/adminPermissions.js';

test('Integration: Profitability Router Security Gates & CSV Export', async () => {
    const mockService = {
        getVehicleProfitabilityOverview: async () => ({
            ok: true,
            summary: {
                realized: {
                    totalCount: 1,
                    totalRealizedNetProfit: { ARS: 3150000, USD: 0 },
                    totalRealizedAgencyNetProfit: { ARS: 3150000, USD: 0 },
                    averageMarginPct: 21.0,
                    averageDaysImmobilized: 25,
                    totalCashCollected: { ARS: 15000000, USD: 0 },
                    totalPendingReceivable: { ARS: 0, USD: 0 }
                },
                inStock: {
                    totalCount: 1,
                    totalPotentialNetProfit: { ARS: 2000000, USD: 0 },
                    totalAgencyCapitalImmobilized: { ARS: 8000000, USD: 0 },
                    averagePotentialMarginPct: 25.0,
                    averageDaysInStock: 45
                }
            },
            soldVehicles: [
                {
                    carId: 'car-123',
                    brand: 'Toyota',
                    name: 'Corolla XEI',
                    year: 2022,
                    plateOrVin: 'AF123CD',
                    currency: 'ARS',
                    agreedPrice: 15000000,
                    acquisitionCost: 11000000,
                    acquisitionSource: 'compra',
                    vehicleExpensesTotal: 500000,
                    saleExpensesTotal: 150000,
                    totalExpenses: 650000,
                    commission: { amount: 200000 },
                    netProfit: 3150000,
                    agencyNetProfit: 3150000,
                    marginOnCostPct: 27.0,
                    marginOnSalePct: 21.0,
                    participation: { agencyPercentage: 100, partnerPercentage: 0, hasPartner: false },
                    daysImmobilized: 25,
                    capitalEfficiency: { annualizedRoiPct: 394.2, dailyProfit: 126000 },
                    cashMetrics: { cashCollected: { ARS: 15000000 }, pendingReceivable: { ARS: 0 } },
                    tradeIns: { hasTradeInOrigin: false, receivedTradeIns: [] }
                }
            ],
            stockVehicles: [
                {
                    carId: 'car-456',
                    brand: 'Volkswagen',
                    name: 'Taos Highline',
                    year: 2023,
                    plateOrVin: 'AG987XY',
                    status: 'Disponible',
                    currency: 'ARS',
                    listPrice: 25000000,
                    acquisitionCost: 20000000,
                    acquisitionSource: 'compra',
                    vehicleExpensesTotal: 300000,
                    totalEconomicCost: 20300000,
                    estimatedCommission: 325000,
                    potentialNetProfit: 4375000,
                    potentialAgencyNetProfit: 4375000,
                    potentialMarginPct: 21.5,
                    participation: { agencyPercentage: 100, partnerPercentage: 0, hasPartner: false },
                    daysInStock: 45,
                    agencyCapitalInvested: 20300000,
                    capitalEfficiency: { potentialAnnualizedRoiPct: 174.7 },
                    tradeIns: { hasTradeInOrigin: false }
                }
            ]
        }),
        getVehicleDetailedProfitability: async (id) => ({
            ok: true,
            vehicle: { carId: id, name: 'Toyota Corolla XEI' }
        })
    };

    let authUser = { role: ROLES.VENTAS, permissions: [PERMISSIONS.VENTAS_READ] };
    const fakeAuth = (req, res, next) => {
        req.user = authUser;
        next();
    };

    const app = express();
    app.use(express.json());
    app.use('/api/admin/profitability', createProfitabilityRouter({ authenticate: fakeAuth, service: mockService }));

    const server = app.listen(0);
    const port = server.address().port;

    try {
        // 1. Vendedor bloqueado: 403
        const resForbidden = await fetch(`http://localhost:${port}/api/admin/profitability`);
        assert.equal(resForbidden.status, 403, 'Vendedor debe recibir 403 Forbidden');
        const jsonForbidden = await resForbidden.json();
        assert.equal(jsonForbidden.ok, false);
        assert.match(jsonForbidden.message, /Acceso denegado/);

        // 2. Propietario autorizado: 200 con datos completos
        authUser = { role: ROLES.OWNER };
        const resOwner = await fetch(`http://localhost:${port}/api/admin/profitability`);
        assert.equal(resOwner.status, 200, 'Owner debe recibir 200 OK');
        const jsonOwner = await resOwner.json();
        assert.equal(jsonOwner.ok, true);
        assert.equal(jsonOwner.soldVehicles.length, 1);
        assert.equal(jsonOwner.stockVehicles.length, 1);
        assert.equal(jsonOwner.summary.realized.totalRealizedNetProfit.ARS, 3150000);

        // 3. Exportación CSV autorizada
        const resCsv = await fetch(`http://localhost:${port}/api/admin/profitability/export/csv?view=sold`);
        assert.equal(resCsv.status, 200, 'CSV export debe responder 200');
        assert.match(resCsv.headers.get('content-type'), /text\/csv/);
        const csvText = await resCsv.text();
        assert.match(csvText, /Toyota Corolla XEI/);
        assert.match(csvText, /MARGEN COMERCIAL NETO/);
        assert.match(csvText, /3150000/);

        // 4. Detalle individual
        const resDetail = await fetch(`http://localhost:${port}/api/admin/profitability/507f1f77bcf86cd799439011`);
        assert.equal(resDetail.status, 200, 'Detalle individual responde 200');
        const jsonDetail = await resDetail.json();
        assert.equal(jsonDetail.ok, true);
        assert.equal(jsonDetail.vehicle.name, 'Toyota Corolla XEI');

    } finally {
        server.close();
    }
});

console.log('Test de integración completado exitosamente.');
