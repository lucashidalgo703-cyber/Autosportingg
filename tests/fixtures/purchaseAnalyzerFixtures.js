export const now = new Date('2026-11-23T15:00:00Z');
export const vehicle = { brand: 'Toyota', model: 'Corolla', version: '2.0 XEI CVT', year: 2022, km: 42000,
    engine: '2.0 nafta', transmission: 'Automática', traction: 'Delantera', condition: 'Usado en buen estado',
    location: 'Buenos Aires', market: 'Nacional' };
export const terms = { currency: 'USD', asking: 20000, offer: 18000, cashNow: 12000, tradeVehicle: 'Permuta ficticia',
    tradeValue: 4000, repairsCost: 500, commercialCost: 500, share: 50, expensePayer: 'agency',
    targetProfit: 1500, targetConfirmed: true, payments: [{ date: '2099-12-15', amount: 2000 }] };
export const dashboard = { auditInfo: { updatedAt: now.toISOString(), isReconciliationConfirmed: true, hasPhysicalCashInconsistency: false },
    summary: { totalEfectivoUSD: 10000, byCurrency: { USD: { saldoReal: 25000, fondosDeTerceros: 1000, compromisos: 3500,
        faltantes: 500, disponibleParaComprarStock: 12000, isBalanced: true } } },
    boxes: [{ key: 'reserva', targetMoneyUSD: 5000 }] };
export const listings = [20000, 22000, 24000].map((price, i) => ({
    ...vehicle, location: 'Ubicación ficticia ' + i, title: 'Aviso sintético ' + i,
    url: 'https://auto.mercadolibre.com.ar/MLA-000000' + i + '-aviso-ficticio-_JM', price,
    currency: 'USD', priceType: 'contado', verification: 'cotejado manualmente', checkedAt: now.toISOString()
}));
