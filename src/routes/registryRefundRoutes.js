import connectDB from '../config/db.js';
import { PERMISSIONS, hasPermission } from '../utils/adminPermissions.js';
import { createRegistryRefund, resolveRegistryRefund, listRegistryRefunds } from '../services/registryRefundService.js';
export function registerRegistryRefundRoutes(app, { authenticateToken, requirePermission }) {
    const wrap = action => async (req, res) => { try { await connectDB(); res.setHeader('Cache-Control', 'private, no-store'); await action(req, res); } catch (error) { res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'No se pudo completar la gestión del reintegro.', code: error.code, errors: error.errors }); } };
    app.get('/api/admin/finance/registry-refunds', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), wrap(async (req, res) => res.json(await listRegistryRefunds(req.query))));
    app.get('/api/admin/gestoria/:id/registry-refunds', authenticateToken, requirePermission(PERMISSIONS.GESTORIA_READ), wrap(async (req, res) => res.json(await listRegistryRefunds({ gestoriaId: req.params.id }))));
    app.post('/api/admin/gestoria/:id/registry-refunds', authenticateToken, requirePermission(PERMISSIONS.GESTORIA_READ), requirePermission(PERMISSIONS.GESTORIA_WRITE), wrap(async (req, res) => { const result = await createRegistryRefund(req.params.id, req.body || {}, req.user, req.get('X-Idempotency-Key') || req.body?.idempotencyKey); res.status(result.replayed ? 200 : 201).json(result); }));
    app.patch('/api/admin/finance/registry-refunds/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), requirePermission(PERMISSIONS.FINANZAS_WRITE), wrap(async (req, res) => {
        if (req.body?.status === 'acreditada' && !hasPermission(req.user, PERMISSIONS.CAJA_WRITE)) return res.status(403).json({ message: 'Necesitás permiso de edición de Caja para confirmar un ingreso.' });
        return res.json(await resolveRegistryRefund(req.params.id, req.body || {}, req.user));
    }));
}
