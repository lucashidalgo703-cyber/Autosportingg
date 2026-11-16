import assert from 'node:assert/strict';
import Transaction from '../src/models/Transaction.js';
import { reclassifyExpense, bulkCategorizeExpenses, annulCollectionAndReverse } from '../src/services/treasuryStrategicService.js';

// Read stubs stop before any database mutation; no environment credentials or
// connection is used by these alternative-entry-point regression checks.
const read = Transaction.findById, exists = Transaction.exists;
try {
    Transaction.findById = async () => ({ _id: 'a'.repeat(24), type: 'Egreso', module: 'crm_v2', idempotencyKey: 'crm-expense:fixture' });
    Transaction.exists = async () => ({ _id: 'a'.repeat(24) });
    await assert.rejects(() => reclassifyExpense({ transactionId: 'a'.repeat(24), category: 'Gastos Varios' }, {}), error => error.status === 409);
    await assert.rejects(() => bulkCategorizeExpenses({ updates: [{ transactionId: 'a'.repeat(24), category: 'Gastos Varios' }] }, {}), error => error.status === 409);
    await assert.rejects(() => annulCollectionAndReverse('a'.repeat(24)), error => error.status === 409);
    console.log('3 alternative treasury mutation guards passed without a database connection.');
} finally { Transaction.findById = read; Transaction.exists = exists; }
