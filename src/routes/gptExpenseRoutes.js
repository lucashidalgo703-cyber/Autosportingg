import express from 'express';
import connectDB from '../config/db.js';
import { ExpenseError, expenseContext, createExpenseDraft, getExpenseDraft, editExpenseDraft, confirmExpenseDraft } from '../services/gptExpenseService.js';

export function createGptExpenseRouter({ authenticateGpt, publicOrigin = process.env.GPT_EXPENSE_PUBLIC_ORIGIN || '' } = {}) {
    if (typeof authenticateGpt !== 'function') throw new Error('Expense actions require delegated CRM authentication');
    const router = express.Router();
    router.use(authenticateGpt);
    router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    const handle = (fn, status = 200) => async (req, res) => {
        try {
            await connectDB();
            const result = await fn(req);
            if (result.url && publicOrigin) result.url = new URL(result.url, publicOrigin).href;
            if (result.vehicleUrl && publicOrigin) result.vehicleUrl = new URL(result.vehicleUrl, publicOrigin).href;
            res.status(status).json(result);
        } catch (error) {
            if (error instanceof ExpenseError) return res.status(error.status).json({ error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) });
            // Never log request content or OAuth credentials; they can contain
            // private financial data. Fail closed without a non-atomic fallback.
            console.error('Gastos GPT: error interno', { name: error.name, code: error.code });
            res.status(500).json({ error: 'EXPENSE_INTERNAL_ERROR', message: 'No se pudo completar el gasto. Reintentá con el mismo borrador.' });
        }
    };
    router.get('/expenses/context', handle((req) => expenseContext(req.user, req.query)));
    router.post('/expenses/drafts', handle((req) => createExpenseDraft(req.user, req.body), 201));
    router.get('/expenses/drafts/:id', handle((req) => getExpenseDraft(req.user, req.params.id)));
    router.patch('/expenses/drafts/:id', handle((req) => editExpenseDraft(req.user, req.params.id, req.body)));
    router.post('/expenses/drafts/:id/confirm', handle((req) => confirmExpenseDraft(req.user, req.params.id, req.body, { req })));
    return router;
}
export default createGptExpenseRouter;
