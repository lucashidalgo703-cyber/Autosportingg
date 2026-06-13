const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// 1. Add Check model
content = content.replace(
  "import TeamGoal from './src/models/TeamGoal.js';",
  "import TeamGoal from './src/models/TeamGoal.js';\nimport Check from './src/models/Check.js';"
);

// 2. Add Tesoreria Routes
const routes = `
// --- TESORERIA ROUTES ---

// Dashboard (Aggregates)
app.get('/api/admin/tesoreria/dashboard', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const accounts = await Account.find().lean();
        
        // Cuentas por cobrar/pagar de Installment
        const installments = await Installment.find({ status: { $in: ['pendiente', 'vencida'] } }).lean();
        let cuentasPorCobrar = { ARS: 0, USD: 0 };
        installments.forEach(inst => {
            const bal = Number(inst.amount) - Number(inst.paidAmount || 0);
            if (bal > 0) {
                if (inst.currency === 'USD') cuentasPorCobrar.USD += bal;
                else cuentasPorCobrar.ARS += bal;
            }
        });

        // Cheques en cartera
        const checks = await Check.find({ status: 'en_cartera' }).lean();

        res.json({ accounts, cuentasPorCobrar, checks });
    } catch (error) {
        console.error('GET /api/admin/tesoreria/dashboard error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Transfers between accounts
app.post('/api/admin/tesoreria/transfer', authenticateToken, requirePermission(PERMISSIONS.CAJA_WRITE), async (req, res) => {
    try {
        const { fromAccountId, toAccountId, amount, currency, concept, date } = req.body;
        if (!fromAccountId || !toAccountId || !amount || !currency) {
            return res.status(400).json({ message: 'Campos requeridos faltantes' });
        }

        const [fromAccount, toAccount] = await Promise.all([
            Account.findById(fromAccountId),
            Account.findById(toAccountId)
        ]);

        if (!fromAccount || !toAccount) {
            return res.status(404).json({ message: 'Cuentas no encontradas' });
        }

        const txDate = date ? new Date(date) : new Date();

        // Egreso
        const egreso = new Transaction({
            type: 'Egreso',
            amount: Number(amount),
            currency,
            description: \`Transferencia enviada a \${toAccount.name}\`,
            category: 'Transferencia Interna',
            accountId: fromAccountId,
            concept: concept || 'Transferencia entre cuentas',
            module: 'crm_v2',
            source: 'manual',
            paymentMethod: 'otro',
            date: txDate,
            createdBy: req.user.username,
            transactionAuditLog: [{ action: 'CREACION', details: 'Transferencia saliente', user: req.user.username }]
        });

        // Ingreso
        const ingreso = new Transaction({
            type: 'Ingreso',
            amount: Number(amount),
            currency,
            description: \`Transferencia recibida de \${fromAccount.name}\`,
            category: 'Transferencia Interna',
            accountId: toAccountId,
            concept: concept || 'Transferencia entre cuentas',
            module: 'crm_v2',
            source: 'manual',
            paymentMethod: 'otro',
            date: txDate,
            createdBy: req.user.username,
            transactionAuditLog: [{ action: 'CREACION', details: 'Transferencia entrante', user: req.user.username }]
        });

        await Promise.all([egreso.save(), ingreso.save()]);

        await logAudit({
            req,
            action: 'TRANSFERENCIA_INTERNA',
            module: 'finanzas',
            entityId: null,
            entityType: 'Transaction',
            description: \`Transferencia de \${currency} \${amount} desde \${fromAccount.name} a \${toAccount.name}\`
        });

        res.json({ message: 'Transferencia exitosa' });
    } catch (error) {
        console.error('POST /api/admin/tesoreria/transfer error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Arqueo
app.post('/api/admin/tesoreria/arqueo', authenticateToken, requirePermission(PERMISSIONS.CAJA_WRITE), async (req, res) => {
    try {
        const { accountId, declaredBalance, systemBalance, notes } = req.body;
        
        await logAudit({
            req,
            action: 'ARQUEO_CAJA',
            module: 'finanzas',
            entityId: accountId,
            entityType: 'Account',
            description: \`Arqueo de cuenta. Sistema: \${systemBalance}, Declarado: \${declaredBalance}. Notas: \${notes || '-'}\`
        });

        res.json({ message: 'Arqueo registrado' });
    } catch (error) {
        console.error('POST /api/admin/tesoreria/arqueo error:', error);
        res.status(500).json({ message: error.message });
    }
});

// --- CHECKS ROUTES ---
app.get('/api/admin/checks', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_READ), async (req, res) => {
    try {
        const checks = await Check.find().sort({ dueDate: 1 }).lean();
        res.json(checks);
    } catch (error) {
        console.error('GET /api/admin/checks error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/checks', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const newCheck = new Check({ ...req.body, createdBy: req.user.username });
        const saved = await newCheck.save();
        await logAudit({
            req, action: 'CREACION', module: 'finanzas', entityId: saved._id, entityType: 'Check', description: \`Cheque \${saved.number} registrado\`
        });
        res.status(201).json(saved);
    } catch (error) {
        console.error('POST /api/admin/checks error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/admin/checks/:id', authenticateToken, requirePermission(PERMISSIONS.FINANZAS_WRITE), async (req, res) => {
    try {
        const updated = await Check.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user.username, updatedAt: Date.now() }, { new: true });
        if (!updated) return res.status(404).json({ message: 'Cheque no encontrado' });
        await logAudit({
            req, action: 'MODIFICACION', module: 'finanzas', entityId: updated._id, entityType: 'Check', description: \`Cheque \${updated.number} actualizado a estado \${updated.status}\`
        });
        res.json(updated);
    } catch (error) {
        console.error('PATCH /api/admin/checks/:id error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Global Error Handler`;

content = content.replace('// Global Error Handler', routes);

fs.writeFileSync('server.js', content);
console.log('Patch applied successfully!');
