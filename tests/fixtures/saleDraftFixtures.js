// Datos sintéticos para pruebas locales; nunca se envían a servicios externos.
export const carFixture = (overrides = {}) => ({
    brand: 'QA', name: 'Unidad de prueba', year: 2024, km: 100,
    fuel: 'Nafta', condition: 'Usado', price: 1200, currency: 'U$S',
    purchasePrice: 900, purchaseCurrency: 'USD', status: 'Disponible',
    plateOrVin: 'QA-UNIDAD', ...overrides
});

export const clientFixture = (overrides = {}) => ({
    firstName: 'Cliente', lastName: 'QA', fullName: 'Cliente QA',
    phone: '0000000000', email: 'cliente-qa@example.invalid', ...overrides
});

export const leadFixture = (overrides = {}) => ({
    name: 'Consulta QA', phone: '0000000000', source: 'otro',
    crmStatus: 'nuevo', leadAuditLog: [], ...overrides
});

export const accountFixture = (overrides = {}) => ({
    name: 'Caja de prueba ARS', currency: 'ARS', type: 'Efectivo',
    balance: 1000, isActive: true, ...overrides
});

export const installmentFixture = (overrides = {}) => ({
    source: 'manual', installmentNumber: 1, amount: 100, paidAmount: 0,
    currency: 'ARS', status: 'pendiente', concept: 'Cuota QA', ...overrides
});

export const transactionFixture = (overrides = {}) => ({
    type: 'Ingreso', amount: 1000, currency: 'ARS', description: 'Movimiento QA',
    category: 'Pruebas', status: 'activo', module: 'crm_v2', ...overrides
});

export const draftFormFixture = (overrides = {}) => ({
    buyerName: 'Comprador QA', buyerPhone: '0000000000',
    buyerEmail: 'comprador-qa@example.invalid', buyerDni: 'QA-DOCUMENTO',
    mileage: '100', hasTradeIn: true, notes: 'Borrador anónimo de integración',
    ...overrides
});
