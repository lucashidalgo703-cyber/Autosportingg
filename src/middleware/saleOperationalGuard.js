import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Installment from '../models/Installment.js';
import Transaction from '../models/Transaction.js';
import connectDB from '../config/db.js';

// Una URL directa no debe permitir cobrar o comprometer stock desde un borrador.
// No interfiere con anulaciones/reversas de movimientos ya existentes.
export function requireOperationalSale({ saleParam = false, installmentParam = false, transactionParam = false } = {}) {
    return async (req, res, next) => {
        try {
            await connectDB();
            const saleIds = new Set();
            if (req.body?.saleId) saleIds.add(String(req.body.saleId));
            if (saleParam && req.params.id) saleIds.add(String(req.params.id));
            const refs = [
                [Installment, installmentParam ? req.params.id : req.body?.installmentId],
                [Transaction, transactionParam ? req.params.id : null]
            ];
            for (const [Model, id] of refs) {
                if (!id) continue;
                if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Referencia inválida.' });
                const record = await Model.findById(id).select('saleId').lean();
                if (!record) return res.status(404).json({ message: 'No se encontró el registro vinculado.' });
                if (Model === Installment && req.body?.saleId && record.saleId && String(record.saleId) !== String(req.body.saleId)) {
                    return res.status(409).json({ code: 'INSTALLMENT_SALE_MISMATCH', message: 'La cuota no pertenece a la venta seleccionada.' });
                }
                if (record.saleId) saleIds.add(String(record.saleId));
            }
            for (const id of saleIds) {
                if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Referencia de venta inválida.' });
                const sale = await Sale.findById(id).select('status historicalOnly').lean();
                if (!sale) return res.status(404).json({ message: 'La venta asociada no existe.' });
                if (sale.status === 'borrador') {
                    return res.status(409).json({
                        code: 'SALE_DRAFT_NOT_OPERATIONAL',
                        message: 'Activá el borrador antes de generar movimientos, cuotas o cambios de stock.'
                    });
                }
                if (sale.historicalOnly === true) {
                    return res.status(409).json({ code: 'SALE_HISTORICAL_NOT_OPERATIONAL', message: 'Esta carga histórica es solo de consulta y no genera operaciones actuales.' });
                }
            }
            next();
        } catch (error) {
            console.error('Error validating sale state:', error.message);
            res.status(500).json({ message: 'No se pudo verificar el estado de la operación.' });
        }
    };
}
