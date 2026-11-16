import { Router } from 'express';
import { issueGptAuthorization, exchangeGptToken, gptRequestQuota } from '../services/gptExpenseOAuthService.js';

export function createGptExpenseOAuthRouter() {
    const router = Router();
    router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('Pragma', 'no-cache'); next(); });
    const endpoint = handler => async (req, res) => {
        try {
            await gptRequestQuota('oauth:' + req.ip);
            res.json(await handler(req));
        } catch (error) {
            if (error.status === 429) res.set('Retry-After', '60');
            res.status(error.status || 503).json({ error: error.code || 'temporarily_unavailable', message: error.status ? error.message : 'No se pudo completar la conexión.' });
        }
    };
    router.post('/authorize', endpoint(req => issueGptAuthorization(req.body, req.headers.authorization?.replace(/^Bearer /, ''))));
    router.post('/token', endpoint(req => {
        let input = { ...req.body };
        if (req.headers.authorization?.startsWith('Basic ')) {
            const credentials = Buffer.from(req.headers.authorization.slice(6), 'base64').toString('utf8');
            const separator = credentials.indexOf(':');
            input = { ...input, client_id: credentials.slice(0, separator), client_secret: credentials.slice(separator + 1) };
        }
        return exchangeGptToken(input);
    }));
    return router;
}
