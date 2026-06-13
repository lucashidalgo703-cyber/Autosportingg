const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

if (!content.includes("import Settlement")) {
    content = content.replace(
        "import Check from './src/models/Check.js';",
        "import Check from './src/models/Check.js';\nimport Settlement from './src/models/Settlement.js';"
    );
}

const routes = `
// --- LIQUIDACIONES Y COMISIONES ---

app.get('/api/admin/settlements', authenticateToken, requirePermission(PERMISSIONS.LIQUIDACIONES_READ), async (req, res) => {
    try {
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.period) query.period = req.query.period;
        if (req.query.username) query.username = req.query.username;

        const settlements = await Settlement.find(query)
            .sort({ createdAt: -1 })
            .lean();
        res.json(settlements);
    } catch (error) {
        console.error('GET /api/admin/settlements error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/settlements/pending-sales/:username', authenticateToken, requirePermission(PERMISSIONS.LIQUIDACIONES_READ), async (req, res) => {
    try {
        const { username } = req.params;
        
        // Find user by username
        const user = await AdminUser.findOne({ username });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        // Buscamos liquidaciones activas (no anuladas) de este usuario
        const activeSettlements = await Settlement.find({ 
            username, 
            status: { $ne: 'anulada' } 
        }).select('includedSales.saleId').lean();

        const alreadyIncludedSaleIds = activeSettlements.flatMap(s => s.includedSales.map(is => is.saleId.toString()));

        // Buscamos ventas confirmadas o entregadas asignadas al vendedor que no estén ya liquidadas
        const sales = await Sale.find({
            $or: [{ salesperson: username }, { assignedTo: user._id }],
            status: { $in: ['confirmada', 'entregada'] },
            _id: { $nin: alreadyIncludedSaleIds }
        }).populate('vehicleId', 'brand model year').lean();

        res.json(sales);
    } catch (error) {
        console.error('GET /api/admin/settlements/pending-sales error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/settlements', authenticateToken, requirePermission(PERMISSIONS.LIQUIDACIONES_WRITE), async (req, res) => {
    try {
        const { period, username, includedSales, adjustments, totalAmount, currency, notes } = req.body;

        // Double check no sale is already in an active settlement
        const saleIds = includedSales.map(s => s.saleId);
        const existingSettlement = await Settlement.findOne({
            status: { $ne: 'anulada' },
            'includedSales.saleId': { $in: saleIds }
        });

        if (existingSettlement) {
            return res.status(400).json({ message: 'Una o más ventas ya están incluidas en otra liquidación activa' });
        }

        const newSettlement = new Settlement({
            period,
            username,
            includedSales,
            adjustments,
            totalAmount,
            currency,
            status: 'borrador',
            createdBy: req.user.username,
            history: [{
                action: 'CREADA',
                user: req.user.username,
                notes: notes || 'Borrador inicial creado'
            }]
        });

        const saved = await newSettlement.save();
        
        await logAudit({
            req, action: 'CREACION', module: 'finanzas', entityId: saved._id, entityType: 'Settlement',
            description: \`Liquidación \${period} para \${username} creada (\${currency} \${totalAmount})\`
        });

        res.status(201).json(saved);
    } catch (error) {
        console.error('POST /api/admin/settlements error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/settlements/:id', authenticateToken, requirePermission(PERMISSIONS.LIQUIDACIONES_WRITE), async (req, res) => {
    try {
        const { status, notes, accountId, adjustments, totalAmount } = req.body;
        const settlement = await Settlement.findById(req.params.id);
        
        if (!settlement) return res.status(404).json({ message: 'Liquidación no encontrada' });

        if (settlement.status === 'pagada' && status !== 'anulada') {
            return res.status(400).json({ message: 'Una liquidación pagada no puede editarse salvo para ser anulada' });
        }

        // Si se actualizan montos o ajustes (sólo en borrador/revisada)
        if (['borrador', 'revisada'].includes(settlement.status)) {
            if (adjustments) settlement.adjustments = adjustments;
            if (totalAmount) settlement.totalAmount = totalAmount;
        }

        const oldStatus = settlement.status;
        settlement.status = status;
        settlement.updatedBy = req.user.username;

        if (status === 'pagada' && oldStatus !== 'pagada') {
            if (!accountId) return res.status(400).json({ message: 'Se requiere una cuenta de origen para pagar' });
            
            const account = await Account.findById(accountId);
            if (!account) return res.status(404).json({ message: 'Cuenta origen no encontrada' });

            // Create Transaction
            const tx = new Transaction({
                type: 'Egreso',
                amount: settlement.totalAmount,
                currency: settlement.currency,
                description: \`Pago liquidación comisiones \${settlement.period} a \${settlement.username}\`,
                category: 'Comisiones',
                accountId: accountId,
                concept: 'Honorarios y Comisiones',
                module: 'crm_v2',
                source: 'manual',
                paymentMethod: 'transferencia', // Por defecto o tomar de request
                date: new Date(),
                createdBy: req.user.username,
                transactionAuditLog: [{ action: 'CREACION', details: 'Pago generado por liquidación', user: req.user.username }]
            });

            const savedTx = await tx.save();
            settlement.paymentInfo = {
                paymentDate: new Date(),
                transactionId: savedTx._id,
                accountId: accountId
            };
        }

        settlement.history.push({
            action: status.toUpperCase(),
            user: req.user.username,
            notes: notes || \`Estado cambiado a \${status}\`
        });

        const updated = await settlement.save();

        await logAudit({
            req, action: 'MODIFICACION', module: 'finanzas', entityId: updated._id, entityType: 'Settlement',
            description: \`Liquidación \${updated.period} de \${updated.username} pasó a \${status}\`
        });

        res.json(updated);
    } catch (error) {
        console.error('PATCH /api/admin/settlements/:id error:', error);
        res.status(500).json({ message: error.message });
    }
});

// My Commissions endpoint (for Ventas)
app.get('/api/admin/my-commissions', authenticateToken, requirePermission(PERMISSIONS.COMISIONES_READ), async (req, res) => {
    try {
        const username = req.user.username;
        const user = await AdminUser.findOne({ username });

        // Mis liquidaciones
        const settlements = await Settlement.find({ username }).sort({ createdAt: -1 }).lean();

        // Mis ventas pendientes
        const alreadyIncludedSaleIds = settlements
            .filter(s => s.status !== 'anulada')
            .flatMap(s => s.includedSales.map(is => is.saleId.toString()));

        const pendingSales = await Sale.find({
            $or: [{ salesperson: username }, { assignedTo: user?._id }],
            status: { $in: ['confirmada', 'entregada'] },
            _id: { $nin: alreadyIncludedSaleIds }
        }).populate('vehicleId', 'brand model year price currency').lean();

        res.json({ settlements, pendingSales });
    } catch (error) {
        console.error('GET /api/admin/my-commissions error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Global Error Handler`;

if (!content.includes('// --- LIQUIDACIONES Y COMISIONES ---')) {
    content = content.replace('// Global Error Handler', routes);
    fs.writeFileSync('server.js', content);
    console.log('Routes added successfully');
} else {
    console.log('Routes already exist');
}
