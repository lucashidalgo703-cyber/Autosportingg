const purchaseTransaction = {
    _id: 'tx-corolla-purchase',
    type: 'Egreso',
    status: 'activo',
    amount: 12700000,
    currency: 'ARS',
    category: 'compra_vehiculo',
    vehicleId: 'vehicle-corolla',
    date: '2026-01-10T10:00:00.000Z'
};

const saleCollection = {
    _id: 'tx-corolla-sale',
    type: 'Ingreso',
    status: 'activo',
    amount: 15500000,
    currency: 'ARS',
    date: '2026-08-15T12:00:00.000Z',
    source: 'venta',
    saleId: 'sale-corolla',
    vehicleId: 'vehicle-corolla',
    isTreasuryDistributed: true,
    isTreasuryDistributionReversed: false,
    thirdPartyAmount: 0,
    treasuryBreakdown: {
        totalCollected: 15500000,
        capitalRecoveredToStock: 12700000,
        extraReinvestmentToStock: 1270000,
        appliedAllocations: [
            { boxKey: 'stock', amount: 12700000, historyType: 'recuperacion_capital' },
            { boxKey: 'stock', amount: 1270000, historyType: 'extra_reinversion' }
        ]
    }
};

const corolla = {
    _id: 'vehicle-corolla',
    brand: 'Toyota',
    name: 'Corolla XEI',
    year: 2022,
    purchasePrice: 12700000,
    purchaseCurrency: 'ARS',
    agencyOwned: true,
    expenses: [],
    purchasePaymentState: {
        modality: 'pagar_ahora',
        status: 'pagado',
        totalCost: 12700000,
        amountPaid: 12700000,
        pendingDebt: 0,
        currency: 'ARS',
        payments: [{ transactionId: purchaseTransaction._id, amount: 12700000, currency: 'ARS', deductedFromBox: false }]
    }
};

const reinvestmentTransaction = {
    _id: 'tx-kicks-reinvestment',
    type: 'Egreso',
    status: 'activo',
    amount: 5400000,
    currency: 'ARS',
    category: 'compra_vehiculo',
    vehicleId: 'vehicle-kicks',
    date: '2026-09-01T10:00:00.000Z'
};

const reinvestmentVehicle = {
    _id: 'vehicle-kicks',
    brand: 'Nissan',
    name: 'Kicks Advance',
    year: 2021,
    purchasePrice: 5400000,
    purchaseCurrency: 'ARS',
    purchasePaymentState: {
        status: 'pagado',
        totalCost: 5400000,
        amountPaid: 5400000,
        pendingDebt: 0,
        currency: 'ARS',
        payments: [{
            transactionId: reinvestmentTransaction._id,
            amount: 5400000,
            currency: 'ARS',
            deductedFromBox: true,
            boxKey: 'stock'
        }]
    }
};

const operation = {
    id: 'sale-corolla',
    sale: {
        _id: 'sale-corolla',
        vehicleId: corolla._id,
        salePrice: 15500000,
        saleCurrency: 'ARS',
        exchangeRate: 1,
        saleExpenses: [],
        commissionSettings: { enabled: false }
    },
    vehicle: corolla,
    saleTransactions: [saleCollection],
    paidSettlements: [],
    config: {
        activeDistributionScheme: 'estabilizacion',
        reinvestmentExtraConfigured: true,
        reinvestmentExtraPct: 10
    }
};

const boxes = [
    { key: 'stock', balanceARS: 7000000, commitmentsARS: 1000000, balanceUSD: 8000, commitmentsUSD: 500, shortfallARS: 0, shortfallUSD: 0, history: [
        { sourceIncomeId: saleCollection._id, type: 'recuperacion_capital', amount: 12700000, currency: 'ARS' },
        { sourceIncomeId: saleCollection._id, type: 'extra_reinversion', amount: 1270000, currency: 'ARS' }
    ] },
    { key: 'reserva', balanceARS: 2000000, commitmentsARS: 0, balanceUSD: 2000, commitmentsUSD: 0, history: [] },
    { key: 'operativa', balanceARS: 2000000, commitmentsARS: 0, balanceUSD: 3000, commitmentsUSD: 200, history: [] },
    { key: 'impuestos', balanceARS: 1000000, commitmentsARS: 500000, balanceUSD: 1000, commitmentsUSD: 100, history: [] },
    { key: 'deudas', balanceARS: 1000000, commitmentsARS: 250000, balanceUSD: 1000, commitmentsUSD: 200, history: [] },
    { key: 'postventa', balanceARS: 500000, commitmentsARS: 0, balanceUSD: 500, commitmentsUSD: 0, history: [] },
    { key: 'personal', balanceARS: 0, commitmentsARS: 0, balanceUSD: 0, commitmentsUSD: 0, history: [] },
    { key: 'crecimiento', balanceARS: 500000, commitmentsARS: 0, balanceUSD: 500, commitmentsUSD: 0, history: [] }
];

export const capitalReinvestmentDemoSnapshot = {
    demo: true,
    asOf: '2026-10-23T12:00:00.000Z',
    operations: [operation],
    vehicles: [reinvestmentVehicle],
    transactions: [purchaseTransaction, saleCollection, reinvestmentTransaction],
    treasury: {
        reconciliationStatus: 'conciliado',
        isBalanced: true,
        accountBalances: { ARS: 18000000, USD: 20000 },
        unassignedOwn: { ARS: 2000000, USD: 3000 },
        thirdPartyFunds: { ARS: 2000000, USD: 1000 },
        boxes,
        expenseTransactions: []
    }
};

export function makeCapitalReinvestmentDemoSnapshot(overrides = {}) {
    return {
        ...capitalReinvestmentDemoSnapshot,
        ...overrides,
        operations: overrides.operations || capitalReinvestmentDemoSnapshot.operations,
        vehicles: overrides.vehicles || capitalReinvestmentDemoSnapshot.vehicles,
        transactions: overrides.transactions || capitalReinvestmentDemoSnapshot.transactions,
        treasury: overrides.treasury || capitalReinvestmentDemoSnapshot.treasury
    };
}
