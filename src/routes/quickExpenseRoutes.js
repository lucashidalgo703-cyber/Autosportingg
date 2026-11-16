import { Router } from 'express';
import connectDB from '../config/db.js';
import { assertExpensePermission, ExpenseError } from '../services/expenseCreationService.js';
import { expenseContext, getExpenseDraft, editExpenseDraft, confirmExpenseDraft } from '../services/gptExpenseService.js';
import { interpretExpenseText } from '../services/expenseDictationService.js';
import { gptRequestQuota } from '../services/gptExpenseOAuthService.js';

// Normal CRM sessions only: neither an API key nor an OAuth grant can bypass login.
export function createQuickExpenseRouter({ authenticate }) {
    const router = Router();
    router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    router.use(authenticate);
    router.use(async (req, res, next) => {
        try {
            assertExpensePermission(req.user);
            await gptRequestQuota('crm-quick-expense:' + req.user.id, 60);
            next();
        } catch (error) {
            if (error.status === 429) res.set('Retry-After', '60');
            res.status(error.status || 503).json({ error: error.code || 'SERVICE_UNAVAILABLE', message: error.status ? error.message : 'No se pudo validar el acceso a gastos. Reintentá.' });
        }
    });
    const endpoint = (handler, status = 200) => async (req, res) => {
        try {
            await connectDB();
            res.status(status).json(await handler(req));
        } catch (error) {
            if (error instanceof ExpenseError) return res.status(error.status).json({ error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) });
            // The text can contain private financial data. Never log the request.
            console.error('Carga rápida: error interno', { name: error.name, code: error.code });
            res.status(503).json({ error: 'QUICK_EXPENSE_UNAVAILABLE', message: 'No se pudo completar el gasto. Reintentá con la misma solicitud.' });
        }
    };
    router.get('/context', endpoint(req => expenseContext(req.user, req.query)));
    router.post('/interpret', endpoint(req => interpretExpenseText(req.user, req.body), 201));
    router.get('/drafts/:id', endpoint(req => getExpenseDraft(req.user, req.params.id)));
    router.patch('/drafts/:id', endpoint(req => editExpenseDraft(req.user, req.params.id, req.body)));
    router.post('/drafts/:id/confirm', endpoint(req => confirmExpenseDraft(req.user, req.params.id, req.body, { req })));
    return router;
}
