import assert from 'node:assert/strict';
import test from 'node:test';
import { getInstallmentCollectionStats } from '../src/utils/installmentCollectionStats.js';

test('resumen de cuotas usa saldo neto, fecha efectiva y elegibilidad de la venta como caja', () => {
    const asOf = new Date('2026-11-10T12:00:00.000Z');
    const installment = (id, overrides = {}) => ({
        _id: id, amount: 100, paidAmount: 0, currency: 'ARS', status: 'pendiente',
        dueDate: '2026-11-12', source: 'manual', ...overrides
    });
    const records = [
        installment('vencida', { dueDate: '2026-11-09' }),
        installment('parcial', { paidAmount: 25, status: 'parcial' }),
        installment('reprogramada', { status: 'reprogramada', dueDate: '2026-10-01', isRescheduled: true, rescheduledDate: '2026-11-22' }),
        installment('borrador', { saleId: 'sale1', saleStatus: 'borrador' }),
        installment('cancelada', { saleId: 'sale2', saleStatus: 'cancelada' }),
        installment('historica', { saleId: 'sale3', saleStatus: 'entregada', saleHistoricalOnly: true }),
        installment('pagada', { status: 'pagada_manual' }),
        installment('sin-saldo', { paidAmount: 100 }),
        installment('sin-venta', { saleId: 'missing' }),
        installment('sin-fecha', { dueDate: null })
    ];
    const before = structuredClone(records);
    assert.deepEqual(getInstallmentCollectionStats(records, asOf), { vencidas: 1, porVencer: 1, enFecha: 1, sinFecha: 1 });
    assert.deepEqual(records, before, 'El resumen no modifica los acuerdos');
    assert.deepEqual(getInstallmentCollectionStats([
        installment('legacy', { saleId: 'old', saleStatus: 'entregada', isManualImport: true }),
        installment('limite7', { dueDate: '2026-11-17' })
    ], asOf), { vencidas: 0, porVencer: 1, enFecha: 1, sinFecha: 0 });
});
