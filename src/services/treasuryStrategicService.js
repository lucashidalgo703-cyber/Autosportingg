import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import TreasurySecurity from '../models/TreasurySecurity.js';
import TreasuryBox from '../models/TreasuryBox.js';
import TreasuryReconciliation from '../models/TreasuryReconciliation.js';
import TreasuryCategoryRule from '../models/TreasuryCategoryRule.js';
import TreasuryConfig from '../models/TreasuryConfig.js';
import TreasuryBatchLog from '../models/TreasuryBatchLog.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Installment from '../models/Installment.js';
import AdminUser from '../models/AdminUser.js';
import Sale from '../models/Sale.js';
import Car from '../models/Car.js';
import FinanceRecurringRule from '../models/FinanceRecurringRule.js';

const JWT_SECRET = process.env.JWT_SECRET?.trim() || 'autosporting_secret_jwt_key_crm_2026';
const LOCK_TIME_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

// Hashing seguro con scrypt nativo
function hashValue(val) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(val, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyHashedValue(val, storedHash) {
    try {
        if (!storedHash || !storedHash.includes(':')) return false;
        const [salt, key] = storedHash.split(':');
        if (!salt || !key) return false;

        const hashBuffer = crypto.scryptSync(val, salt, 64);
        const keyBuffer = Buffer.from(key, 'hex');

        if (hashBuffer.length !== keyBuffer.length) return false;
        return crypto.timingSafeEqual(hashBuffer, keyBuffer);
    } catch {
        return false;
    }
}

// Inicializar o recuperar registro de seguridad
async function getOrCreateSecurityRecord() {
    let sec = await TreasurySecurity.findOne();
    if (!sec) {
        sec = new TreasurySecurity({
            pinHash: null,
            pinConfigured: false,
            failedAttempts: 0,
            lockedUntil: null
        });
        await sec.save();
    }
    return sec;
}

// 8 Cajas Estratégicas Completas
const DEFAULT_BOXES = [
    {
        key: 'operativa',
        name: 'Caja Operativa',
        description: 'Gastos operativos corrientes y compromisos inmediatos del horizonte elegido',
        color: 'emerald',
        icon: 'Briefcase',
        targetPercent: 0,
        priority: 1
    },
    {
        key: 'impuestos',
        name: 'Impuestos y Obligaciones',
        description: 'Reserva para AFIP, Ingresos Brutos, patentes vehiculares y obligaciones fiscales',
        color: 'amber',
        icon: 'Landmark',
        targetPercent: 0,
        priority: 2
    },
    {
        key: 'deudas',
        name: 'Caja Deudas',
        description: 'Amortización y pagos comprometidos de pasivos comerciales y préstamos',
        color: 'red',
        icon: 'CreditCard',
        targetPercent: 0,
        priority: 3
    },
    {
        key: 'personal',
        name: 'Caja Personal',
        description: 'Presupuesto mensual asignado para retiros del propietario / socios',
        color: 'purple',
        icon: 'User',
        targetPercent: 0,
        priority: 4
    },
    {
        key: 'postventa',
        name: 'Fondo Postventa',
        description: 'Provisión para garantías, reparaciones y contingencias mecánicas de vehículos',
        color: 'orange',
        icon: 'Wrench',
        targetPercent: 0,
        priority: 5
    },
    {
        key: 'reserva',
        name: 'Reserva de Liquidez',
        description: 'Respaldo financiero para cubrir gastos fijos en meses lentos (separado de inversiones)',
        color: 'blue',
        icon: 'ShieldCheck',
        targetPercent: 0,
        reserveMonths: 2,
        priority: 6
    },
    {
        key: 'stock',
        name: 'Caja Stock / Vehículos',
        description: 'Capital disponible para compra de oportunidades y reposición de vehículos',
        color: 'cyan',
        icon: 'Car',
        targetPercent: 0,
        priority: 7
    },
    {
        key: 'crecimiento',
        name: 'Fondo de Crecimiento',
        description: 'Fondo reservado para inversiones estratégicas y expansión patrimonial del negocio',
        color: 'emerald',
        icon: 'TrendingUp',
        targetPercent: 0,
        priority: 8
    }
];

// Reglas por defecto de categorías
const DEFAULT_CATEGORY_RULES = [
    { category: 'Sueldos', boxKey: 'operativa', notes: 'Gastos de personal operativo' },
    { category: 'Servicios', boxKey: 'operativa', notes: 'Luz, agua, internet, telefonía' },
    { category: 'Alquiler', boxKey: 'operativa', notes: 'Alquiler de local y cocheras' },
    { category: 'Mantenimiento', boxKey: 'operativa', notes: 'Mantenimiento del salón y oficina' },
    { category: 'Comisiones', boxKey: 'operativa', notes: 'Comisiones comerciales de venta' },
    { category: 'Publicidad', boxKey: 'operativa', notes: 'Marketing y portales automotores' },
    { category: 'Gastos Varios', boxKey: 'operativa', notes: 'Gastos operativos menores' },
    { category: 'AFIP/IVA', boxKey: 'impuestos', notes: 'Impuestos nacionales e IVA' },
    { category: 'Impuestos', boxKey: 'impuestos', notes: 'Impuestos provinciales y municipales' },
    { category: 'Patentes', boxKey: 'impuestos', notes: 'Radicación y deuda de patentes' },
    { category: 'Pago Empresas', boxKey: 'deudas', notes: 'Cancelación de compromisos comerciales' },
    { category: 'Préstamos', boxKey: 'deudas', notes: 'Devolución de mutuos y créditos' },
    { category: 'Gastos Personales', boxKey: 'personal', notes: 'Gastos personales del titular' },
    { category: 'Retiros', boxKey: 'personal', notes: 'Retiros de utilidades del propietario' },
    { category: 'Taller', boxKey: 'postventa', notes: 'Garantía y reparaciones postventa' },
    { category: 'Mecánica', boxKey: 'postventa', notes: 'Alistamiento y arreglos post-entrega' },
    { category: 'Compra Vehículo', boxKey: 'stock', notes: 'Ingreso de unidades al stock' },
    { category: 'Inversión', boxKey: 'crecimiento', notes: 'Inversiones estratégicas' }
];

async function ensureDefaultBoxes() {
    for (const def of DEFAULT_BOXES) {
        const exists = await TreasuryBox.findOne({ key: def.key });
        if (!exists) {
            await TreasuryBox.create({
                key: def.key,
                name: def.name,
                description: def.description,
                color: def.color,
                icon: def.icon,
                targetPercent: 0,
                priority: def.priority,
                reserveMonths: def.reserveMonths || 2,
                balanceARS: 0,
                balanceUSD: 0,
                history: [{
                    date: new Date(),
                    type: 'asignacion_inicial',
                    amount: 0,
                    currency: 'ARS',
                    reason: 'Inicialización de caja estratégica',
                    user: 'Sistema'
                }]
            });
        }
    }
}

async function ensureDefaultCategoryRules() {
    for (const def of DEFAULT_CATEGORY_RULES) {
        const exists = await TreasuryCategoryRule.findOne({ category: def.category });
        if (!exists) {
            await TreasuryCategoryRule.create({
                category: def.category,
                boxKey: def.boxKey,
                notes: def.notes,
                isDefault: true,
                updatedBy: 'Sistema'
            });
        }
    }
}

async function getOrCreateTreasuryConfig() {
    let cfg = await TreasuryConfig.findOne();
    if (!cfg) {
        cfg = new TreasuryConfig({
            operationalHorizonDays: 30,
            reserveMonths: 2,
            personalMonthlyBudgetARS: 0,
            personalMonthlyBudgetUSD: 0,
            postventaProvisionARS: 0,
            postventaProvisionUSD: 0,
            priorityOrder: ['operativa', 'impuestos', 'deudas', 'personal', 'postventa', 'reserva', 'stock', 'crecimiento'],
            isSetupCompleted: false
        });
        await cfg.save();
    }
    return cfg;
}

function generateTreasuryToken(userId, role) {
    return jwt.sign(
        {
            userId,
            role,
            purpose: 'strategic_treasury',
            timestamp: Date.now()
        },
        JWT_SECRET,
        { expiresIn: '15m' }
    );
}

// 1. Estado de seguridad
export async function getSecurityStatus() {
    const sec = await getOrCreateSecurityRecord();
    const now = new Date();
    const isLocked = Boolean(sec.lockedUntil && sec.lockedUntil > now);
    const lockRemainingMinutes = isLocked ? Math.ceil((sec.lockedUntil - now) / 60000) : 0;

    return {
        pinConfigured: Boolean(sec.pinConfigured && sec.pinHash),
        isLocked,
        lockRemainingMinutes,
        failedAttempts: sec.failedAttempts || 0,
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - (sec.failedAttempts || 0)),
        lastUnlockedAt: sec.lastUnlockedAt,
        lastPinChangeAt: sec.lastPinChangeAt
    };
}

// 2. Setup PIN
export async function setupInitialPin(pin, confirmPin, user) {
    const sec = await getOrCreateSecurityRecord();
    if (sec.pinConfigured && sec.pinHash) {
        throw new Error('El PIN ya fue configurado previamente.');
    }
    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
        throw new Error('El PIN debe contener exactamente 4 dígitos numéricos.');
    }
    if (pin !== confirmPin) {
        throw new Error('La confirmación del PIN no coincide.');
    }

    sec.pinHash = hashValue(pin);
    sec.pinConfigured = true;
    sec.failedAttempts = 0;
    sec.lockedUntil = null;
    sec.lastUnlockedAt = new Date();
    sec.lastPinChangeAt = new Date();
    sec.updatedBy = user?.name || user?.email || 'Admin';
    await sec.save();

    const treasuryToken = generateTreasuryToken(user.id || user.userId, user.role);
    return { ok: true, message: 'PIN configurado correctamente.', treasuryToken, expiresInSeconds: 900 };
}

// 3. Verify PIN
export async function verifyPin(pin, user) {
    const sec = await getOrCreateSecurityRecord();
    const now = new Date();

    if (sec.lockedUntil && sec.lockedUntil > now) {
        const remainingMinutes = Math.ceil((sec.lockedUntil - now) / 60000);
        const err = new Error(`Acceso temporalmente bloqueado. Intentá en ${remainingMinutes} min.`);
        err.statusCode = 423;
        err.isLocked = true;
        err.lockRemainingMinutes = remainingMinutes;
        throw err;
    }

    if (!sec.pinConfigured || !sec.pinHash) {
        const err = new Error('El PIN aún no ha sido configurado.');
        err.requiresSetup = true;
        err.statusCode = 400;
        throw err;
    }

    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
        const err = new Error('El PIN debe tener exactamente 4 dígitos.');
        err.statusCode = 400;
        throw err;
    }

    const isValid = verifyHashedValue(pin, sec.pinHash);

    if (!isValid) {
        sec.failedAttempts = (sec.failedAttempts || 0) + 1;
        if (sec.failedAttempts >= MAX_FAILED_ATTEMPTS) {
            sec.lockedUntil = new Date(Date.now() + LOCK_TIME_MS);
            await sec.save();
            const err = new Error(`5 intentos fallidos alcanzados. Bloqueado por 15 minutos.`);
            err.statusCode = 423;
            err.isLocked = true;
            err.lockRemainingMinutes = 15;
            throw err;
        } else {
            await sec.save();
            const remaining = MAX_FAILED_ATTEMPTS - sec.failedAttempts;
            const err = new Error(`PIN incorrecto. Te quedan ${remaining} intento${remaining === 1 ? '' : 's'}.`);
            err.statusCode = 401;
            err.remainingAttempts = remaining;
            throw err;
        }
    }

    sec.failedAttempts = 0;
    sec.lockedUntil = null;
    sec.lastUnlockedAt = new Date();
    await sec.save();

    const treasuryToken = generateTreasuryToken(user.id || user.userId, user.role);
    return { ok: true, message: 'Acceso autorizado.', treasuryToken, expiresInSeconds: 900 };
}

// 4. Change PIN
export async function changePin(currentPin, newPin, confirmNewPin, user) {
    const sec = await getOrCreateSecurityRecord();
    if (!sec.pinConfigured || !sec.pinHash) {
        throw new Error('Primero debés configurar un PIN inicial.');
    }
    if (!verifyHashedValue(currentPin, sec.pinHash)) {
        const err = new Error('El PIN actual no es correcto.');
        err.statusCode = 401;
        throw err;
    }
    if (!newPin || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin)) {
        throw new Error('El nuevo PIN debe tener exactamente 4 dígitos numéricos.');
    }
    if (newPin !== confirmNewPin) {
        throw new Error('La confirmación del nuevo PIN no coincide.');
    }
    if (newPin === currentPin) {
        throw new Error('El nuevo PIN no puede ser idéntico al actual.');
    }

    sec.pinHash = hashValue(newPin);
    sec.failedAttempts = 0;
    sec.lockedUntil = null;
    sec.lastPinChangeAt = new Date();
    sec.updatedBy = user?.name || user?.email || 'Admin';
    await sec.save();

    const treasuryToken = generateTreasuryToken(user.id || user.userId, user.role);
    return { ok: true, message: 'PIN modificado exitosamente.', treasuryToken, expiresInSeconds: 900 };
}

// 5. Recover PIN with owner password
export async function recoverPinWithPassword(password, newPin, confirmNewPin, user) {
    const sec = await getOrCreateSecurityRecord();
    const ownerUser = await AdminUser.findById(user.id || user.userId);
    if (!ownerUser) throw new Error('Usuario propietario no encontrado.');
    if (!password) throw new Error('Ingresá tu contraseña de CRM.');

    const isPasswordValid = verifyHashedValue(password, ownerUser.passwordHash);
    if (!isPasswordValid) {
        const err = new Error('Contraseña incorrecta.');
        err.statusCode = 401;
        throw err;
    }

    if (!newPin || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin)) {
        throw new Error('El nuevo PIN debe tener 4 dígitos.');
    }
    if (newPin !== confirmNewPin) throw new Error('La confirmación del PIN no coincide.');

    sec.pinHash = hashValue(newPin);
    sec.pinConfigured = true;
    sec.failedAttempts = 0;
    sec.lockedUntil = null;
    sec.lastUnlockedAt = new Date();
    sec.lastPinChangeAt = new Date();
    sec.updatedBy = `${user?.name || user?.email || 'Propietario'} (Recuperación)`;
    await sec.save();

    const treasuryToken = generateTreasuryToken(user.id || user.userId, user.role);
    return { ok: true, message: 'PIN restablecido exitosamente.', treasuryToken, expiresInSeconds: 900 };
}

// 6. Obtener Datos Completos de Tesorería Estratégica (Sin datos ficticios de la conversación)
export async function getTreasuryDashboardData() {
    await ensureDefaultBoxes();
    await ensureDefaultCategoryRules();
    const config = await getOrCreateTreasuryConfig();

    const accounts = await Account.find({ isActive: { $ne: false } }).sort({ currency: 1, name: 1 }).lean();
    const boxes = await TreasuryBox.find({ isActive: true }).sort({ priority: 1, key: 1 }).lean();
    const categoryRules = await TreasuryCategoryRule.find().lean();

    // Mapeo categoría -> boxKey
    const catToBoxMap = {};
    categoryRules.forEach(r => {
        catToBoxMap[r.category.trim().toLowerCase()] = r.boxKey;
    });

    // Totales en Cuentas
    let totalCuentasARS = 0;
    let totalCuentasUSD = 0;
    let totalEfectivoARS = 0;
    let totalEfectivoUSD = 0;
    let totalBancosARS = 0;
    let totalBancosUSD = 0;
    let hasPhysicalCashInconsistency = false;
    const accountIssues = [];

    const accountsWithAudit = accounts.map(acc => {
        const bal = Number(acc.balance || 0);
        const isPhysical = acc.type === 'Efectivo';
        const isNegative = bal < 0;

        if (acc.currency === 'USD') {
            totalCuentasUSD += bal;
            if (isPhysical) totalEfectivoUSD += bal;
            else totalBancosUSD += bal;
        } else {
            totalCuentasARS += bal;
            if (isPhysical) totalEfectivoARS += bal;
            else totalBancosARS += bal;
        }

        let issue = null;
        if (isPhysical && isNegative) {
            hasPhysicalCashInconsistency = true;
            issue = {
                type: 'inconsistencia_fisica',
                label: 'Inconsistencia de Efectivo Físico',
                severity: 'error',
                description: `El saldo de efectivo físico no puede ser negativo (${bal.toLocaleString('es-AR')}). Requiere arqueo o conciliación.`
            };
            accountIssues.push({ accountName: acc.name, ...issue });
        } else if (!isPhysical && isNegative) {
            issue = {
                type: 'descubierto_bancario',
                label: 'Descubierto Bancario / Saldo Deudor',
                severity: 'warning',
                description: `Cuenta bancaria con saldo en descubierto (${bal.toLocaleString('es-AR')}).`
            };
            accountIssues.push({ accountName: acc.name, ...issue });
        }

        return { ...acc, isNegative, issue };
    });

    // Totales en Cajas
    let totalCajasARS = 0;
    let totalCajasUSD = 0;
    boxes.forEach(box => {
        totalCajasARS += Number(box.balanceARS || 0);
        totalCajasUSD += Number(box.balanceUSD || 0);
    });

    const unallocatedARS = totalCuentasARS - totalCajasARS;
    const unallocatedUSD = totalCuentasUSD - totalCajasUSD;

    // Historial de conciliaciones y fecha de último corte
    const recentReconciliations = await TreasuryReconciliation.find()
        .sort({ cutoffDate: -1, createdAt: -1 })
        .limit(10)
        .lean();

    const lastConfirmedReconciliation = recentReconciliations.find(r => r.status === 'confirmado');
    const lastCutoffDate = lastConfirmedReconciliation ? lastConfirmedReconciliation.cutoffDate : null;
    const isReconciliationConfirmed = Boolean(lastConfirmedReconciliation);

    // -------------------------------------------------------------
    // GASTOS, COMPROMISOS Y CONEXIÓN CON FINANZAS
    // -------------------------------------------------------------
    const pendingTransactions = await Transaction.find({
        type: 'Egreso',
        status: 'pendiente'
    }).sort({ date: 1 }).lean();

    const recurringRules = await FinanceRecurringRule.find({
        type: 'Egreso',
        isActive: true
    }).lean();

    // Detección de gastos existentes incompletos o sin categoría
    const incompleteExpenses = await Transaction.find({
        type: 'Egreso',
        $or: [
            { category: { $in: ['', null, 'Otra Categoría', 'Sin clasificar', 'Otro'] } },
            { treasuryBoxKey: null }
        ]
    })
    .sort({ date: -1 })
    .limit(20)
    .lean();

    // Gastos pagados en el mes para evitar duplicar reglas recurrentes
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const existingCurrentMonthTransactions = await Transaction.find({
        type: 'Egreso',
        date: { $gte: startOfCurrentMonth }
    }).lean();

    const existingCategoryTotalsThisMonth = {};
    existingCurrentMonthTransactions.forEach(tx => {
        const cat = (tx.category || '').trim().toLowerCase();
        existingCategoryTotalsThisMonth[cat] = (existingCategoryTotalsThisMonth[cat] || 0) + Number(tx.amount || 0);
    });

    // Compromisos por caja
    const commitmentsByBox = {
        operativa: { ARS: 0, USD: 0, items: [] },
        impuestos: { ARS: 0, USD: 0, items: [] },
        deudas: { ARS: 0, USD: 0, items: [] },
        personal: { ARS: 0, USD: 0, items: [] },
        postventa: { ARS: 0, USD: 0, items: [] },
        reserva: { ARS: 0, USD: 0, items: [] },
        stock: { ARS: 0, USD: 0, items: [] },
        crecimiento: { ARS: 0, USD: 0, items: [] },
        sin_asignar: { ARS: 0, USD: 0, items: [] }
    };

    pendingTransactions.forEach(tx => {
        const cat = (tx.category || '').trim().toLowerCase();
        const targetBoxKey = tx.treasuryBoxKey || catToBoxMap[cat] || 'sin_asignar';
        const amt = Number(tx.amount || 0);
        const curr = tx.currency === 'USD' ? 'USD' : 'ARS';

        if (commitmentsByBox[targetBoxKey]) {
            commitmentsByBox[targetBoxKey][curr] += amt;
            commitmentsByBox[targetBoxKey].items.push({
                type: 'gasto_pendiente',
                description: tx.description || tx.concept || 'Gasto pendiente',
                category: tx.category,
                amount: amt,
                currency: curr,
                date: tx.date
            });
        }
    });

    let monthlyOperationalBurnRateARS = 0;
    let monthlyOperationalBurnRateUSD = 0;

    recurringRules.forEach(rule => {
        const cat = (rule.category || '').trim().toLowerCase();
        const targetBoxKey = catToBoxMap[cat] || 'operativa';
        const ruleAmt = Number(rule.amount || 0);
        const curr = rule.currency === 'USD' ? 'USD' : 'ARS';

        if (targetBoxKey === 'operativa') {
            if (curr === 'USD') monthlyOperationalBurnRateUSD += ruleAmt;
            else monthlyOperationalBurnRateARS += ruleAmt;
        }

        const alreadyGenerated = existingCategoryTotalsThisMonth[cat] && existingCategoryTotalsThisMonth[cat] >= ruleAmt * 0.8;
        if (!alreadyGenerated) {
            if (commitmentsByBox[targetBoxKey]) {
                commitmentsByBox[targetBoxKey][curr] += ruleAmt;
                commitmentsByBox[targetBoxKey].items.push({
                    type: 'regla_recurrente',
                    description: `${rule.name} (Día ${rule.dayOfMonth})`,
                    category: rule.category,
                    amount: ruleAmt,
                    currency: curr,
                    dueDateDay: rule.dayOfMonth
                });
            }
        }
    });

    // Enriquecer cajas
    const enrichedBoxes = boxes.map(box => {
        const comms = commitmentsByBox[box.key] || { ARS: 0, USD: 0, items: [] };
        const availableARS = Math.max(0, (box.balanceARS || 0) - comms.ARS);
        const availableUSD = Math.max(0, (box.balanceUSD || 0) - comms.USD);
        const uncoveredCommitmentsARS = Math.max(0, comms.ARS - (box.balanceARS || 0));
        const uncoveredCommitmentsUSD = Math.max(0, comms.USD - (box.balanceUSD || 0));

        let targetARS = 0;
        let targetUSD = 0;
        let missingDataNote = null;

        if (box.key === 'operativa') {
            targetARS = comms.ARS;
            targetUSD = comms.USD;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Sin gastos operativos pendientes ni reglas recurrentes cargadas.';
            }
        } else if (box.key === 'impuestos') {
            targetARS = comms.ARS;
            targetUSD = comms.USD;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Sin vencimientos tributarios registrados.';
            }
        } else if (box.key === 'deudas') {
            targetARS = comms.ARS;
            targetUSD = comms.USD;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Sin pasivos comerciales ni mutuos pendientes.';
            }
        } else if (box.key === 'personal') {
            targetARS = box.monthlyBudgetARS || config.personalMonthlyBudgetARS || 0;
            targetUSD = box.monthlyBudgetUSD || config.personalMonthlyBudgetUSD || 0;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Presupuesto personal no configurado.';
            }
        } else if (box.key === 'reserva') {
            const months = box.reserveMonths || config.reserveMonths || 2;
            targetARS = monthlyOperationalBurnRateARS * months;
            targetUSD = monthlyOperationalBurnRateUSD * months;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Faltan reglas de gastos fijos para proyectar reserva de meses lentos.';
            }
        } else if (box.key === 'postventa') {
            targetARS = box.monthlyBudgetARS || config.postventaProvisionARS || 0;
            targetUSD = box.monthlyBudgetUSD || config.postventaProvisionUSD || 0;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Provisión de postventa configurable.';
            }
        } else if (box.key === 'stock') {
            targetARS = box.monthlyBudgetARS || 0;
            targetUSD = box.monthlyBudgetUSD || 0;
        } else if (box.key === 'crecimiento') {
            targetARS = box.monthlyBudgetARS || 0;
            targetUSD = box.monthlyBudgetUSD || 0;
        }

        const shortfallARS = Math.max(0, targetARS - availableARS);
        const shortfallUSD = Math.max(0, targetUSD - availableUSD);
        let coveragePercentARS = targetARS > 0 ? Math.min(100, Math.round((availableARS / targetARS) * 100)) : 100;
        let coveragePercentUSD = targetUSD > 0 ? Math.min(100, Math.round((availableUSD / targetUSD) * 100)) : 100;

        return {
            ...box,
            commitmentsARS: comms.ARS,
            commitmentsUSD: comms.USD,
            commitmentsCount: comms.items.length,
            uncoveredCommitmentsARS,
            uncoveredCommitmentsUSD,
            availableARS,
            availableUSD,
            targetMoneyARS: targetARS,
            targetMoneyUSD: targetUSD,
            shortfallARS,
            shortfallUSD,
            coveragePercentARS,
            coveragePercentUSD,
            missingDataNote
        };
    });

    // -------------------------------------------------------------
    // BANDEJA DE COBROS POSTERIORES AL CORTE (EXCLUYENDO HISTÓRICOS Y AJUSTES)
    // -------------------------------------------------------------
    let unassignedIncomeCards = [];
    if (lastCutoffDate) {
        const postCutoffIncomes = await Transaction.find({
            type: 'Ingreso',
            status: 'activo',
            date: { $gt: lastCutoffDate },
            isTreasuryDistributed: { $ne: true },
            category: { $nin: ['Ajuste de Conciliación Inicial', 'Conciliación Tesorería', 'Ajuste de Saldo', 'Transferencia Interna', 'Traspaso'] }
        })
        .populate('vehicleId', 'brand name year investor consignedBy consignmentCommission')
        .populate('accountId', 'name currency type')
        .sort({ date: -1 })
        .lean();

        unassignedIncomeCards = postCutoffIncomes.map(inc => {
            const totalAmount = Number(inc.amount || 0);
            let tercerosAmount = 0;
            let propioAmount = totalAmount;
            let thirdPartyNote = null;

            if (inc.vehicleId) {
                const v = inc.vehicleId;
                if (v.investor && v.investor.percentage > 0) {
                    tercerosAmount = (totalAmount * v.investor.percentage) / 100;
                    propioAmount = totalAmount - tercerosAmount;
                    thirdPartyNote = `Inversor: ${v.investor.name || ''} (${v.investor.percentage}% = ${inc.currency} ${tercerosAmount.toLocaleString('es-AR')}).`;
                } else if (v.consignedBy) {
                    const commission = v.consignmentCommission || 0;
                    tercerosAmount = Math.max(0, totalAmount - commission);
                    propioAmount = commission > 0 ? commission : totalAmount;
                    thirdPartyNote = `Consignación de ${v.consignedBy}. Comisión propia: ${inc.currency} ${propioAmount.toLocaleString('es-AR')}.`;
                }
            }

            return {
                id: inc._id,
                description: inc.description || inc.concept || 'Cobro registrado',
                category: inc.category,
                totalAmount,
                tercerosAmount,
                propioAmount,
                currency: inc.currency,
                date: inc.date,
                accountName: inc.accountId?.name || 'Cuenta',
                thirdPartyNote
            };
        });
    }

    // -------------------------------------------------------------
    // FONDOS PROTEGIDOS Y DISPONIBLE PARA COMPRAR STOCK
    // -------------------------------------------------------------
    // Fondos protegidos: Reserva de liquidez + Impuestos comprometidos + Deudas comprometidas
    const reservaBox = enrichedBoxes.find(b => b.key === 'reserva') || { balanceARS: 0, balanceUSD: 0 };
    const impuestosBox = enrichedBoxes.find(b => b.key === 'impuestos') || { balanceARS: 0, balanceUSD: 0, commitmentsARS: 0, commitmentsUSD: 0 };
    const deudasBox = enrichedBoxes.find(b => b.key === 'deudas') || { balanceARS: 0, balanceUSD: 0, commitmentsARS: 0, commitmentsUSD: 0 };
    const stockBox = enrichedBoxes.find(b => b.key === 'stock') || { availableARS: 0, availableUSD: 0 };

    const fondosProtegidosARS = (reservaBox.balanceARS || 0) + (impuestosBox.commitmentsARS || 0) + (deudasBox.commitmentsARS || 0);
    const fondosProtegidosUSD = (reservaBox.balanceUSD || 0) + (impuestosBox.commitmentsUSD || 0) + (deudasBox.commitmentsUSD || 0);

    const availableToBuyARS = Math.max(0, (stockBox.availableARS || 0) + Math.max(0, unallocatedARS));
    const availableToBuyUSD = Math.max(0, (stockBox.availableUSD || 0) + Math.max(0, unallocatedUSD));

    // Calendario de pagos (próximos compromisos)
    const paymentCalendar = [];
    Object.keys(commitmentsByBox).forEach(boxKey => {
        commitmentsByBox[boxKey].items.forEach(item => {
            paymentCalendar.push({
                ...item,
                boxKey,
                boxName: enrichedBoxes.find(b => b.key === boxKey)?.name || 'Sin Asignar'
            });
        });
    });
    paymentCalendar.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    // Proyección de caja conservadora
    const conservativeBurnRateARS = monthlyOperationalBurnRateARS || 0;
    const conservativeBurnRateUSD = monthlyOperationalBurnRateUSD || 0;

    const cashProjection = [
        {
            period: 'Próximos 30 días',
            days: 30,
            projectedARS: totalCuentasARS - (commitmentsByBox.operativa.ARS + commitmentsByBox.impuestos.ARS + commitmentsByBox.deudas.ARS),
            projectedUSD: totalCuentasUSD - (commitmentsByBox.operativa.USD + commitmentsByBox.impuestos.USD + commitmentsByBox.deudas.USD),
            notes: 'Descuenta egresos pendientes y gastos operativos calendarizados.'
        },
        {
            period: 'Próximos 60 días',
            days: 60,
            projectedARS: totalCuentasARS - (commitmentsByBox.operativa.ARS + commitmentsByBox.impuestos.ARS + commitmentsByBox.deudas.ARS) - conservativeBurnRateARS,
            projectedUSD: totalCuentasUSD - (commitmentsByBox.operativa.USD + commitmentsByBox.impuestos.USD + commitmentsByBox.deudas.USD) - conservativeBurnRateUSD,
            notes: 'Escenario conservador sin sumar ventas futuras.'
        },
        {
            period: 'Próximos 90 días',
            days: 90,
            projectedARS: totalCuentasARS - (commitmentsByBox.operativa.ARS + commitmentsByBox.impuestos.ARS + commitmentsByBox.deudas.ARS) - (conservativeBurnRateARS * 2),
            projectedUSD: totalCuentasUSD - (commitmentsByBox.operativa.USD + commitmentsByBox.impuestos.USD + commitmentsByBox.deudas.USD) - (conservativeBurnRateUSD * 2),
            notes: 'Solvencia neta para sostener estructura en meses lentos.'
        }
    ];

    // Ajustes recientes
    const recentAdjustments = await Transaction.find({
        category: { $in: ['Ajuste de Conciliación Inicial', 'Conciliación Tesorería', 'Ajuste de Saldo'] }
    })
    .sort({ date: -1 })
    .limit(10)
    .populate('accountId', 'name currency type')
    .lean();

    // Lotes de regularización histórica
    const batchLogs = await TreasuryBatchLog.find().sort({ appliedAt: -1 }).limit(10).lean();

    return {
        accounts: accountsWithAudit,
        boxes: enrichedBoxes,
        categoryRules,
        config,
        auditInfo: {
            isReconciliationConfirmed,
            lastCutoffDate,
            hasPhysicalCashInconsistency,
            statusLabel: isReconciliationConfirmed
                ? `Corte confirmado: ${new Date(lastCutoffDate).toLocaleDateString('es-AR')} ${new Date(lastCutoffDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Pendiente de corte inicial'
        },
        summary: {
            totalCuentasARS,
            totalCuentasUSD,
            totalEfectivoARS,
            totalEfectivoUSD,
            totalBancosARS,
            totalBancosUSD,
            totalCajasARS,
            totalCajasUSD,
            unallocatedARS,
            unallocatedUSD,
            fondosProtegidosARS,
            fondosProtegidosUSD
        },
        incompleteExpenses,
        unassignedIncomeCards,
        planning: {
            availableToBuyARS,
            availableToBuyUSD,
            paymentCalendar,
            cashProjection
        },
        batchLogs,
        recentReconciliations,
        recentAdjustments
    };
}

// 7. Confirmar Corte Inicial sobre Saldo Actual
export async function confirmInitialCutoff(payload, user) {
    const { cutoffDate = new Date(), reason = 'Confirmación de corte inicial sobre saldo real' } = payload;
    const userName = user?.name || user?.email || 'Administrador';

    const accounts = await Account.find({ isActive: { $ne: false } });
    let totalRealARS = 0;
    let totalRealUSD = 0;

    const accountsSnapshot = accounts.map(acc => {
        const bal = Number(acc.balance || 0);
        if (acc.currency === 'USD') totalRealUSD += bal;
        else totalRealARS += bal;

        return {
            accountId: acc._id,
            accountName: acc.name,
            accountType: acc.type,
            currency: acc.currency,
            previousBalance: bal,
            realBalance: bal,
            difference: 0
        };
    });

    const rec = new TreasuryReconciliation({
        cutoffDate: new Date(cutoffDate),
        status: 'confirmado',
        accountsSnapshot,
        totalPreviousARS: totalRealARS,
        totalRealARS,
        totalDiffARS: 0,
        totalPreviousUSD: totalRealUSD,
        totalRealUSD,
        totalDiffUSD: 0,
        reason,
        notes: 'Corte inicial confirmado sobre los saldos existentes en cuentas. Sin generación de asientos duplicados.',
        confirmedBy: userName,
        confirmedByUserId: user.id || user.userId
    });

    await rec.save();

    return {
        ok: true,
        message: `Corte inicial confirmado sobre los saldos actuales (${totalRealARS.toLocaleString('es-AR')} ARS / ${totalRealUSD.toLocaleString('es-AR')} USD).`,
        cutoffDate: rec.cutoffDate
    };
}

// 8. Organizar Saldo Inicial en Cajas (Sin tocar cuentas bancarias)
export async function organizeInitialBalance(payload, user) {
    const { distributions = [], allocations = [], reason = 'Organización de saldo inicial en cajas' } = payload;
    const userName = user?.name || user?.email || 'Admin';
    const items = Array.isArray(allocations) && allocations.length > 0 ? allocations : (distributions || []);

    for (const dist of items) {
        if (!dist.boxKey) continue;
        const box = await TreasuryBox.findOne({ key: dist.boxKey });
        if (box) {
            // Manejo de ARS: si dist tiene balanceARS explícito o mode === 'set', se establece el balance y se audita la diferencia
            if (dist.mode === 'set' || dist.balanceARS !== undefined) {
                const prevARS = Number(box.balanceARS || 0);
                const newARS = Number(dist.balanceARS !== undefined ? dist.balanceARS : dist.amountARS || 0);
                const diffARS = newARS - prevARS;
                box.balanceARS = newARS;

                if (Math.abs(diffARS) > 0) {
                    box.history.push({
                        date: new Date(),
                        type: 'asignacion_inicial',
                        amount: diffARS,
                        currency: 'ARS',
                        reason,
                        user: userName
                    });
                }
            } else {
                const addARS = Number(dist.amountARS || 0);
                if (addARS > 0) {
                    box.balanceARS = (box.balanceARS || 0) + addARS;
                    box.history.push({
                        date: new Date(),
                        type: 'asignacion_inicial',
                        amount: addARS,
                        currency: 'ARS',
                        reason,
                        user: userName
                    });
                }
            }

            // Manejo de USD
            if (dist.mode === 'set' || dist.balanceUSD !== undefined) {
                const prevUSD = Number(box.balanceUSD || 0);
                const newUSD = Number(dist.balanceUSD !== undefined ? dist.balanceUSD : dist.amountUSD || 0);
                const diffUSD = newUSD - prevUSD;
                box.balanceUSD = newUSD;

                if (Math.abs(diffUSD) > 0) {
                    box.history.push({
                        date: new Date(),
                        type: 'asignacion_inicial',
                        amount: diffUSD,
                        currency: 'USD',
                        reason,
                        user: userName
                    });
                }
            } else {
                const addUSD = Number(dist.amountUSD || 0);
                if (addUSD > 0) {
                    box.balanceUSD = (box.balanceUSD || 0) + addUSD;
                    box.history.push({
                        date: new Date(),
                        type: 'asignacion_inicial',
                        amount: addUSD,
                        currency: 'USD',
                        reason,
                        user: userName
                    });
                }
            }

            await box.save();
        }
    }

    return {
        ok: true,
        message: 'Saldo inicial organizado en cajas exitosamente.'
    };
}


// 9. Regularización Histórica de Cuotas en Lote
export async function getGroupedPendingInstallments() {
    const installments = await Installment.find({
        status: { $in: ['pendiente', 'vencida'] },
        isHistoricallyRegularized: { $ne: true }
    })
    .populate('vehicleId', 'brand name year plateOrVin')
    .populate('clientId', 'firstName lastName fullName phone')
    .populate('saleId', 'salePrice saleCurrency saleDate')
    .sort({ dueDate: 1 })
    .lean();

    const groups = {};
    installments.forEach(inst => {
        const saleKey = inst.saleId?._id ? String(inst.saleId._id) : (inst.clientId?._id ? String(inst.clientId._id) : 'sin_venta');
        if (!groups[saleKey]) {
            const clientName = inst.clientId?.fullName || `${inst.clientId?.firstName || ''} ${inst.clientId?.lastName || ''}`.trim() || inst.customerName || 'Cliente sin identificar';
            const vehicleName = inst.vehicleId ? `${inst.vehicleId.brand} ${inst.vehicleId.name} ${inst.vehicleId.year || ''}`.trim() : 'Vehículo no asociado';

            groups[saleKey] = {
                saleId: inst.saleId?._id || null,
                clientId: inst.clientId?._id || null,
                customerName: clientName,
                vehicleName,
                currency: inst.currency,
                totalPendingAmount: 0,
                installments: []
            };
        }

        groups[saleKey].totalPendingAmount += Number(inst.amount || 0);
        groups[saleKey].installments.push({
            id: inst._id,
            installmentNumber: inst.installmentNumber,
            amount: inst.amount,
            currency: inst.currency,
            dueDate: inst.dueDate,
            status: inst.status,
            paidAmount: inst.paidAmount || 0
        });
    });

    return Object.values(groups);
}

export async function batchRegularizeInstallments(payload, user) {
    const { installmentIds = [], reason = 'Pagos históricos incluidos en saldo inicial' } = payload;
    const userName = user?.name || user?.email || 'Administrador';

    if (!Array.isArray(installmentIds) || installmentIds.length === 0) {
        throw new Error('Seleccioná al menos una cuota para regularizar.');
    }

    const batchId = `BATCH-REG-${Date.now().toString().slice(-6)}`;
    let totalARS = 0;
    let totalUSD = 0;
    const salesSet = new Set();
    let regularizedCount = 0;

    for (const id of installmentIds) {
        const inst = await Installment.findById(id);
        if (inst && (inst.status === 'pendiente' || inst.status === 'vencida')) {
            inst.status = 'pagada';
            inst.isHistoricallyRegularized = true;
            inst.regularizationBatchId = batchId;
            inst.regularizedAt = new Date();
            inst.regularizedBy = userName;
            inst.paidAmount = inst.amount;
            inst.paymentDate = inst.dueDate; // conserva vencimiento referencial
            inst.notes = (inst.notes ? `${inst.notes} | ` : '') + `Regularizada en lote ${batchId}: ${reason}`;

            inst.installmentAuditLog.push({
                action: 'REGULARIZACION_CONCILIADA',
                user: userName,
                date: new Date(),
                details: `Lote ${batchId}. Pago histórico incluido en saldo inicial. Sin impacto en caja ni cobro nuevo.`
            });

            await inst.save();

            if (inst.currency === 'USD') totalUSD += Number(inst.amount || 0);
            else totalARS += Number(inst.amount || 0);

            if (inst.saleId) salesSet.add(String(inst.saleId));
            regularizedCount++;
        }
    }

    // Registrar el lote en TreasuryBatchLog
    const batchRecord = new TreasuryBatchLog({
        batchId,
        actionType: 'regularizacion_cuotas',
        title: `Regularización de ${regularizedCount} cuotas`,
        reason,
        count: regularizedCount,
        totalARS,
        totalUSD,
        affectedSalesCount: salesSet.size,
        status: 'aplicado',
        appliedBy: userName,
        appliedAt: new Date()
    });
    await batchRecord.save();

    return {
        ok: true,
        batchId,
        count: regularizedCount,
        totalARS,
        totalUSD,
        affectedSalesCount: salesSet.size,
        message: `${regularizedCount} cuotas regularizadas en lote ${batchId}. No aumentaron la caja ni los fondos disponibles.`
    };
}

export async function revertBatchRegularization(payload, user) {
    const { batchId, reason = 'Reversión de lote' } = payload;
    const userName = user?.name || user?.email || 'Administrador';

    const batchRecord = await TreasuryBatchLog.findOne({ batchId, actionType: 'regularizacion_cuotas' });
    if (!batchRecord) throw new Error('Lote no encontrado.');
    if (batchRecord.status === 'revertido') throw new Error('Este lote ya fue revertido previamente.');

    const installments = await Installment.find({ regularizationBatchId: batchId });
    let revertedCount = 0;

    for (const inst of installments) {
        inst.status = new Date(inst.dueDate) < new Date() ? 'vencida' : 'pendiente';
        inst.isHistoricallyRegularized = false;
        inst.regularizationBatchId = null;
        inst.regularizedAt = null;
        inst.regularizedBy = null;
        inst.paidAmount = 0;
        inst.paymentDate = null;

        inst.installmentAuditLog.push({
            action: 'REGULARIZACION_REVERTIDA',
            user: userName,
            date: new Date(),
            details: `Reversión de lote ${batchId}. Motivo: ${reason}`
        });

        await inst.save();
        revertedCount++;
    }

    batchRecord.status = 'revertido';
    batchRecord.revertedBy = userName;
    batchRecord.revertedAt = new Date();
    batchRecord.revertReason = reason;
    await batchRecord.save();

    return {
        ok: true,
        revertedCount,
        message: `Lote ${batchId} revertido con éxito. ${revertedCount} cuotas retornadas a pendientes.`
    };
}

// 10. Flujo "Cobrar y Distribuir" (Una Sola Carga)
export async function collectAndDistribute(payload, user) {
    const {
        installmentId,
        saleId,
        amount,
        currency = 'ARS',
        accountId,
        paymentMethod = 'transferencia',
        date = new Date(),
        notes = '',
        distributeNow = true,
        distributions = [] // [{ boxKey, amount }]
    } = payload;

    const userName = user?.name || user?.email || 'Admin';

    if (!accountId) throw new Error('Seleccioná la cuenta receptora del dinero.');
    const account = await Account.findById(accountId);
    if (!account) throw new Error('Cuenta receptora no encontrada.');

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) throw new Error('Importe inválido.');

    let linkedInstallment = null;
    let concept = 'Cobro comercial';

    if (installmentId) {
        linkedInstallment = await Installment.findById(installmentId);
        if (linkedInstallment) {
            if (linkedInstallment.status === 'pagada') {
                throw new Error('Esta cuota ya figura como pagada.');
            }
            concept = `Cobro Cuota #${linkedInstallment.installmentNumber || ''}`;
        }
    }

    // 1. Registrar el movimiento de ingreso UNA SOLA VEZ
    const tx = new Transaction({
        type: 'Ingreso',
        amount: payAmount,
        currency,
        description: concept,
        concept,
        category: 'Cobranzas',
        paymentMethod,
        date: new Date(date),
        accountId: account._id,
        saleId: saleId || linkedInstallment?.saleId || undefined,
        installmentId: linkedInstallment?._id || undefined,
        clientId: linkedInstallment?.clientId || undefined,
        vehicleId: linkedInstallment?.vehicleId || undefined,
        notes: notes || '',
        module: 'crm_v2',
        source: linkedInstallment ? 'cuota' : 'venta',
        status: 'activo',
        isTreasuryDistributed: distributeNow && distributions.length > 0,
        distributedAt: distributeNow && distributions.length > 0 ? new Date() : null,
        distributedBy: distributeNow && distributions.length > 0 ? userName : null,
        createdBy: userName,
        transactionAuditLog: [{
            action: 'COBRO_TESORERIA',
            details: `Cobro registrado y ${distributeNow ? 'distribuido' : 'dejado pendiente de distribuir'}.`,
            user: userName
        }]
    });
    await tx.save();

    // 2. Acreditar saldo en la cuenta
    account.balance = Number(account.balance || 0) + payAmount;
    await account.save();

    // 3. Marcar cuota como pagada si corresponde
    if (linkedInstallment) {
        linkedInstallment.status = 'pagada';
        linkedInstallment.paidAmount = payAmount;
        linkedInstallment.paymentDate = new Date(date);
        linkedInstallment.notes = (linkedInstallment.notes ? `${linkedInstallment.notes} | ` : '') + 'Cobrado vía Tesorería';
        linkedInstallment.installmentAuditLog.push({
            action: 'COBRO_REGISTRADO',
            user: userName,
            date: new Date(),
            details: `Cobro registrado en ${account.name} por ${currency} ${payAmount}`
        });
        await linkedInstallment.save();
    }

    // 4. Si se seleccionó distribuir ahora, asignar a las cajas
    let distributedTotal = 0;
    if (distributeNow && Array.isArray(distributions) && distributions.length > 0) {
        for (const dist of distributions) {
            const distAmt = Number(dist.amount || 0);
            if (distAmt <= 0) continue;

            const box = await TreasuryBox.findOne({ key: dist.boxKey });
            if (box) {
                const field = currency === 'USD' ? 'balanceUSD' : 'balanceARS';
                box[field] = Number(box[field] || 0) + distAmt;

                box.history.push({
                    date: new Date(),
                    type: 'distribucion_cobro',
                    amount: distAmt,
                    currency,
                    reason: `Cobro: ${concept}. Asignación directa.`,
                    user: userName,
                    sourceIncomeId: tx._id
                });
                await box.save();
                distributedTotal += distAmt;
            }
        }
    }

    return {
        ok: true,
        transactionId: tx._id,
        message: `Cobro de ${currency} ${payAmount.toLocaleString('es-AR')} acreditado en ${account.name} exitosamente ${distributeNow ? `(${currency} ${distributedTotal.toLocaleString('es-AR')} distribuido en cajas)` : '(enviado a bandeja para distribuir después)'}.`
    };
}

// 11. Guardar Configuración Guiada
export async function updateTreasuryConfig(payload, user) {
    const userName = user?.name || user?.email || 'Admin';
    const cfg = await getOrCreateTreasuryConfig();

    if (payload.operationalHorizonDays !== undefined) cfg.operationalHorizonDays = Number(payload.operationalHorizonDays);
    if (payload.reserveMonths !== undefined) cfg.reserveMonths = Number(payload.reserveMonths);
    if (payload.reserveMonthsTarget !== undefined) cfg.reserveMonths = Number(payload.reserveMonthsTarget);
    
    if (payload.personalMonthlyBudgetARS !== undefined) cfg.personalMonthlyBudgetARS = Number(payload.personalMonthlyBudgetARS);
    if (payload.monthlyPersonalBudgetARS !== undefined) cfg.personalMonthlyBudgetARS = Number(payload.monthlyPersonalBudgetARS);
    if (payload.personalMonthlyBudgetUSD !== undefined) cfg.personalMonthlyBudgetUSD = Number(payload.personalMonthlyBudgetUSD);

    if (payload.postventaProvisionARS !== undefined) cfg.postventaProvisionARS = Number(payload.postventaProvisionARS);
    if (payload.postventaProvisionUSD !== undefined) cfg.postventaProvisionUSD = Number(payload.postventaProvisionUSD);
    if (payload.postventaProvisionPerVehicleARS !== undefined) cfg.postventaProvisionPerVehicleARS = Number(payload.postventaProvisionPerVehicleARS);
    if (payload.postventaPerVehicleARS !== undefined) cfg.postventaProvisionPerVehicleARS = Number(payload.postventaPerVehicleARS);

    if (payload.surplusRule !== undefined) {
        cfg.surplusRule = {
            configured: Boolean(payload.surplusRule.configured),
            stockPercent: Number(payload.surplusRule.stockPercent || 0),
            crecimientoPercent: Number(payload.surplusRule.crecimientoPercent || 0)
        };
    }

    if (Array.isArray(payload.priorityOrder)) cfg.priorityOrder = payload.priorityOrder;

    cfg.isSetupCompleted = true;
    cfg.lastSetupAt = new Date();
    cfg.updatedBy = userName;
    await cfg.save();

    // Sincronizar parámetros en TreasuryBox si corresponde
    if (cfg.reserveMonths) {
        await TreasuryBox.findOneAndUpdate({ key: 'reserva' }, { reserveMonths: cfg.reserveMonths });
    }
    if (cfg.personalMonthlyBudgetARS) {
        await TreasuryBox.findOneAndUpdate({ key: 'personal' }, { monthlyBudgetARS: cfg.personalMonthlyBudgetARS });
    }

    return {
        ok: true,
        config: cfg,
        message: 'Configuración de Tesorería guardada con éxito.'
    };
}

// 12. Traspaso entre Cajas
export async function transferBetweenBoxes(payload, user) {
    const { fromBoxKey, toBoxKey, amount, currency = 'ARS', reason = 'Reasignación de fondos' } = payload;
    const numAmount = Math.abs(Number(amount) || 0);

    if (numAmount <= 0) throw new Error('El importe debe ser mayor a cero.');
    if (!fromBoxKey || !toBoxKey || fromBoxKey === toBoxKey) throw new Error('Elegí cajas distintas.');

    const fromBox = await TreasuryBox.findOne({ key: fromBoxKey });
    const toBox = await TreasuryBox.findOne({ key: toBoxKey });
    if (!fromBox || !toBox) throw new Error('Caja inexistente.');

    const field = currency === 'USD' ? 'balanceUSD' : 'balanceARS';
    fromBox[field] = (Number(fromBox[field]) || 0) - numAmount;
    toBox[field] = (Number(toBox[field]) || 0) + numAmount;

    const userName = user?.name || user?.email || 'Admin';
    fromBox.history.push({ date: new Date(), type: 'transferencia_entre_cajas', amount: -numAmount, currency, fromBox: fromBox.name, toBox: toBox.name, reason, user: userName });
    toBox.history.push({ date: new Date(), type: 'transferencia_entre_cajas', amount: numAmount, currency, fromBox: fromBox.name, toBox: toBox.name, reason, user: userName });

    await Promise.all([fromBox.save(), toBox.save()]);

    return {
        ok: true,
        message: `Traspaso de ${currency} ${numAmount.toLocaleString('es-AR')} desde ${fromBox.name} a ${toBox.name} realizado con éxito.`
    };
}

// 13. Distribuir / Asignar Fondos a Cajas
export async function distributeToBoxes(payload, user) {
    const { distributions = [], reason = 'Asignación estratégica de capital' } = payload;
    const userName = user?.name || user?.email || 'Admin';

    for (const dist of distributions) {
        const box = await TreasuryBox.findOne({ key: dist.boxKey });
        if (box) {
            if (dist.amountARS !== undefined) {
                const diffARS = Number(dist.amountARS) - (box.balanceARS || 0);
                box.balanceARS = Number(dist.amountARS);
                if (Math.abs(diffARS) > 0) {
                    box.history.push({ date: new Date(), type: 'ajuste', amount: diffARS, currency: 'ARS', reason, user: userName });
                }
            }
            if (dist.amountUSD !== undefined) {
                const diffUSD = Number(dist.amountUSD) - (box.balanceUSD || 0);
                box.balanceUSD = Number(dist.amountUSD);
                if (Math.abs(diffUSD) > 0) {
                    box.history.push({ date: new Date(), type: 'ajuste', amount: diffUSD, currency: 'USD', reason, user: userName });
                }
            }
            if (dist.targetPercent !== undefined) box.targetPercent = Number(dist.targetPercent);
            if (dist.monthlyBudgetARS !== undefined) box.monthlyBudgetARS = Number(dist.monthlyBudgetARS);
            if (dist.monthlyBudgetUSD !== undefined) box.monthlyBudgetUSD = Number(dist.monthlyBudgetUSD);
            if (dist.reserveMonths !== undefined) box.reserveMonths = Number(dist.reserveMonths);
            await box.save();
        }
    }

    return { ok: true, message: 'Cajas actualizadas con éxito.' };
}

// 14. Reglas de Categorías
export async function getCategoryRules() {
    await ensureDefaultCategoryRules();
    return await TreasuryCategoryRule.find().sort({ category: 1 }).lean();
}

export async function updateCategoryRules(rules = [], user) {
    const userName = user?.name || user?.email || 'Admin';
    for (const r of rules) {
        if (!r.category || !r.boxKey) continue;
        await TreasuryCategoryRule.findOneAndUpdate(
            { category: r.category.trim() },
            { category: r.category.trim(), boxKey: r.boxKey, notes: r.notes || '', updatedBy: userName },
            { upsert: true, new: true }
        );
    }
    return { ok: true, message: 'Reglas actualizadas.' };
}

// 15. Categorizar Gastos en Lote
export async function bulkCategorizeExpenses(payload, user) {
    const { updates = [] } = payload; // [{ transactionId, category, boxKey }]
    const userName = user?.name || user?.email || 'Admin';
    let count = 0;

    for (const item of updates) {
        if (!item.transactionId) continue;
        const tx = await Transaction.findById(item.transactionId);
        if (tx && tx.type === 'Egreso') {
            if (item.category) tx.category = item.category;
            if (item.boxKey) tx.treasuryBoxKey = item.boxKey;
            tx.transactionAuditLog.push({
                action: 'CATEGORIZACION_LOTE',
                user: userName,
                date: new Date(),
                details: `Categorizado a ${tx.category} / Caja ${tx.treasuryBoxKey || 'automática'}`
            });
            await tx.save();
            count++;
        }
    }

    return { ok: true, count, message: `${count} gastos categorizados con éxito.` };
}

// 16. Compatibilidad y Asistente de Conciliación
export async function executeReconciliation(payload, user) {
    const { accounts = [], cutoffDate = new Date(), reason = 'Conciliación y ajuste de cuentas' } = payload;
    const userName = user?.name || user?.email || 'Admin';

    if (Array.isArray(accounts) && accounts.length > 0) {
        for (const item of accounts) {
            if (!item.accountId) continue;
            const acc = await Account.findById(item.accountId);
            if (!acc) continue;
            const realBal = Number(item.realBalance);
            if (isNaN(realBal)) continue;
            const currentBal = Number(acc.balance || 0);
            const diff = realBal - currentBal;
            if (Math.abs(diff) > 0.01) {
                acc.balance = realBal;
                acc.lastReconciliationDate = cutoffDate;
                await acc.save();

                const adjTx = new Transaction({
                    type: diff > 0 ? 'Ingreso' : 'Egreso',
                    category: 'Ajuste de Conciliación Inicial',
                    amount: Math.abs(diff),
                    currency: acc.currency,
                    accountId: acc._id,
                    date: cutoffDate,
                    notes: `Ajuste por conciliación de saldo real: ${reason} (Diferencia: ${diff >= 0 ? '+' : ''}${diff})`,
                    treasuryBoxKey: null,
                    isTreasuryDistributed: true,
                    status: 'Completado',
                    createdBy: userName
                });
                await adjTx.save();
            }
        }
    }

    return await confirmInitialCutoff({ cutoffDate, reason }, user);
}

// 17. Distribuir Cobro Específico
export async function distributeSingleIncome(payload, user) {
    const { transactionId, boxKey, distribution = [] } = payload;
    const userName = user?.name || user?.email || 'Admin';

    const tx = await Transaction.findById(transactionId);
    if (!tx) {
        throw new Error('Transacción de cobro no encontrada.');
    }

    const curr = tx.currency || 'ARS';
    const totalAmount = Number(tx.amount || 0);

    if (Array.isArray(distribution) && distribution.length > 0) {
        for (const dist of distribution) {
            const amt = Number(dist.amount || 0);
            if (amt <= 0) continue;
            const box = await TreasuryBox.findOne({ key: dist.boxKey });
            if (box) {
                if (curr === 'USD') box.balanceUSD = (box.balanceUSD || 0) + amt;
                else box.balanceARS = (box.balanceARS || 0) + amt;
                box.history.push({
                    date: new Date(),
                    type: 'distribucion_cobro',
                    amount: amt,
                    currency: curr,
                    reason: `Distribución de cobro #${tx._id}: ${tx.notes || ''}`,
                    user: userName
                });
                await box.save();
            }
        }
        tx.isTreasuryDistributed = true;
        tx.treasuryBoxKey = distribution[0]?.boxKey || null;
    } else if (boxKey) {
        const box = await TreasuryBox.findOne({ key: boxKey });
        if (!box) throw new Error(`Caja ${boxKey} no encontrada.`);
        if (curr === 'USD') box.balanceUSD = (box.balanceUSD || 0) + totalAmount;
        else box.balanceARS = (box.balanceARS || 0) + totalAmount;
        box.history.push({
            date: new Date(),
            type: 'distribucion_cobro',
            amount: totalAmount,
            currency: curr,
            reason: `Distribución de cobro #${tx._id}: ${tx.notes || ''}`,
            user: userName
        });
        await box.save();
        tx.isTreasuryDistributed = true;
        tx.treasuryBoxKey = boxKey;
    }

    tx.transactionAuditLog.push({
        action: 'DISTRIBUCION_TESORERIA',
        user: userName,
        date: new Date(),
        details: `Cobro distribuido a cajas estratégicas`
    });
    await tx.save();

    return { ok: true, message: 'Cobro distribuido exitosamente a las cajas.' };
}

// 18. Reclasificar Gasto
export async function reclassifyExpense(payload, user) {
    const { transactionId, boxKey, category, reason } = payload;
    const userName = user?.name || user?.email || 'Admin';

    const tx = await Transaction.findById(transactionId);
    if (!tx || tx.type !== 'Egreso') {
        throw new Error('Gasto no encontrado.');
    }

    const oldBox = tx.treasuryBoxKey;
    if (category) tx.category = category;
    if (boxKey) tx.treasuryBoxKey = boxKey;

    tx.transactionAuditLog.push({
        action: 'RECLASIFICACION_TESORERIA',
        user: userName,
        date: new Date(),
        details: `Reclasificado a categoría '${tx.category}', Caja '${tx.treasuryBoxKey}' (Antes: '${oldBox}'). Motivo: ${reason || 'Ajuste operativo'}`
    });
    await tx.save();

    return { ok: true, message: 'Gasto reclasificado exitosamente.', transaction: tx };
}

// 19. Wrapper de regularización histórica
export async function regularizeHistoricalInstallments(installmentIds = [], reason, cutoffDate, user) {
    return await batchRegularizeInstallments({
        installments: (installmentIds || []).map(id => ({ installmentId: id })),
        reason,
        cutoffDate
    }, user);
}

// 20. Sincronización Automática de Gastos de Finanzas con Cajas Estratégicas
export async function syncExpenseWithTreasury(tx, options = {}) {
    if (!tx || tx.type !== 'Egreso') return;

    // 1. Si no tiene treasuryBoxKey asignada, buscar en reglas de categorías
    if (!tx.treasuryBoxKey && tx.category) {
        const rule = await TreasuryCategoryRule.findOne({ category: tx.category.trim() });
        if (rule && rule.boxKey) {
            tx.treasuryBoxKey = rule.boxKey;
            await tx.save();
        }
    }

    const boxKey = tx.treasuryBoxKey;
    if (!boxKey) return;

    const box = await TreasuryBox.findOne({ key: boxKey });
    if (!box) return;

    const amt = Number(tx.amount || 0);
    const curr = tx.currency || 'ARS';
    const isActivo = tx.status === 'activo' || tx.status === 'Completado';

    // Si es un nuevo egreso ya pagado/activo
    if (options.isNew && isActivo) {
        if (curr === 'USD') box.balanceUSD = Math.max(0, (box.balanceUSD || 0) - amt);
        else box.balanceARS = Math.max(0, (box.balanceARS || 0) - amt);

        box.history.push({
            date: new Date(),
            type: 'egreso_finanzas',
            amount: -amt,
            currency: curr,
            reason: `Gasto Finanzas #${tx._id}: ${tx.concept || tx.description || tx.category}`,
            user: options.user || 'Sistema'
        });
        await box.save();
    } else if (options.statusChanged) {
        // Transición de estado: si pasó de pendiente a activo
        if (options.oldStatus !== 'activo' && isActivo) {
            if (curr === 'USD') box.balanceUSD = Math.max(0, (box.balanceUSD || 0) - amt);
            else box.balanceARS = Math.max(0, (box.balanceARS || 0) - amt);

            box.history.push({
                date: new Date(),
                type: 'egreso_finanzas',
                amount: -amt,
                currency: curr,
                reason: `Pago de Gasto Finanzas #${tx._id}: ${tx.concept || tx.description || tx.category}`,
                user: options.user || 'Sistema'
            });
            await box.save();
        } else if (options.oldStatus === 'activo' && !isActivo) {
            // Revertir efecto en caja si se anuló o volvió a pendiente
            if (curr === 'USD') box.balanceUSD = (box.balanceUSD || 0) + amt;
            else box.balanceARS = (box.balanceARS || 0) + amt;

            box.history.push({
                date: new Date(),
                type: 'reversion_egreso',
                amount: amt,
                currency: curr,
                reason: `Reversión de Gasto Finanzas #${tx._id} (Estado: ${tx.status})`,
                user: options.user || 'Sistema'
            });
            await box.save();
        }
    }
}

// 21. Calcular Reparto Sugerido Determinístico (Sin porcentajes de respaldo silenciosos)
export async function calculateSuggestedAllocation(query = {}, user) {
    await ensureDefaultBoxes();
    const config = await getOrCreateTreasuryConfig();
    const boxes = await TreasuryBox.find().lean();
    const accounts = await Account.find({ isActive: { $ne: false } }).lean();

    let totalCuentasARS = 0;
    let totalCuentasUSD = 0;
    accounts.forEach(acc => {
        const bal = Number(acc.balance || 0);
        if (acc.currency === 'USD') totalCuentasUSD += bal;
        else totalCuentasARS += bal;
    });

    let totalCajasARS = 0;
    let totalCajasUSD = 0;
    boxes.forEach(b => {
        totalCajasARS += Number(b.balanceARS || 0);
        totalCajasUSD += Number(b.balanceUSD || 0);
    });

    // Fondos disponibles: si se pasa liquidityARS (simulación o preview), usar ese valor
    const liquidityOverrideARS = query.liquidityARS !== undefined ? Number(query.liquidityARS) : null;
    const effectiveTotalARS = liquidityOverrideARS !== null ? liquidityOverrideARS : totalCuentasARS;

    // Reglas de categorías guardadas en la base de datos
    const categoryRules = await TreasuryCategoryRule.find().lean();
    const catToBoxMap = {};
    categoryRules.forEach(r => {
        if (r.category && r.boxKey) {
            catToBoxMap[r.category.trim().toLowerCase()] = r.boxKey;
        }
    });

    // Mapeos canónicos estrictos: los sueldos del personal y comisiones van a OPERATIVA
    const defaultMappings = {
        'sueldos': 'operativa',
        'sueldo': 'operativa',
        'comisiones': 'operativa',
        'comisiones ventas': 'operativa',
        'comision': 'operativa',
        'servicios': 'operativa',
        'alquiler': 'operativa',
        'alquileres': 'operativa',
        'mantenimiento': 'operativa',
        'publicidad': 'operativa',
        'gastos varios': 'operativa',
        'afip/iva': 'impuestos',
        'afip': 'impuestos',
        'iva': 'impuestos',
        'impuestos': 'impuestos',
        'patentes': 'impuestos',
        'tasas': 'impuestos',
        'pago empresas': 'deudas',
        'préstamos': 'deudas',
        'prestamos': 'deudas',
        'préstamos y deudas': 'deudas',
        'deudas': 'deudas',
        'gastos personales': 'personal',
        'retiros': 'personal',
        'retiro': 'personal',
        'taller': 'postventa',
        'mecánica': 'postventa',
        'mecánica postventa': 'postventa',
        'compra vehículo': 'stock',
        'stock': 'stock',
        'inversión': 'crecimiento',
        'inversion': 'crecimiento'
    };
    Object.entries(defaultMappings).forEach(([k, v]) => {
        if (!catToBoxMap[k]) catToBoxMap[k] = v;
    });

    const now = new Date();
    const horizonDays = Number(config.operationalHorizonDays || 30);
    const horizonCutoff = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);

    // Egresos pendientes
    const pendingTransactions = await Transaction.find({
        type: 'Egreso',
        status: 'pendiente'
    }).sort({ date: 1 }).lean();

    // Reglas recurrentes de egresos activas
    const recurringRules = await FinanceRecurringRule.find({
        type: 'Egreso',
        isActive: true
    }).lean();

    // Pagos ya emitidos este mes para no duplicar reglas recurrentes
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidThisMonthTransactions = await Transaction.find({
        type: 'Egreso',
        date: { $gte: startOfCurrentMonth }
    }).lean();

    const paidCategoryTotalsThisMonth = {};
    paidThisMonthTransactions.forEach(tx => {
        const cat = (tx.category || '').trim().toLowerCase();
        paidCategoryTotalsThisMonth[cat] = (paidCategoryTotalsThisMonth[cat] || 0) + Number(tx.amount || 0);
    });

    // Agrupación de compromisos reales
    const commitmentsByBox = {
        operativa: { items: [], totalARS: 0 },
        impuestos: { items: [], totalARS: 0 },
        deudas: { items: [], totalARS: 0 }
    };

    pendingTransactions.forEach(tx => {
        const cat = (tx.category || '').trim().toLowerCase();
        const targetBoxKey = tx.treasuryBoxKey || catToBoxMap[cat] || 'operativa';
        const amt = Number(tx.amount || 0);
        const txDate = tx.date ? new Date(tx.date) : now;

        // Gastos pendientes pasados (vencidos) o dentro del horizonte
        const isWithinHorizon = txDate <= horizonCutoff;

        if (isWithinHorizon && commitmentsByBox[targetBoxKey]) {
            commitmentsByBox[targetBoxKey].totalARS += amt;
            commitmentsByBox[targetBoxKey].items.push({
                type: 'gasto_pendiente',
                description: tx.description || tx.concept || tx.category || 'Gasto pendiente',
                category: tx.category || 'Sin categoría',
                amount: amt,
                date: tx.date
            });
        }
    });

    // Burn rate operativo mensual basado en reglas recurrentes activas
    let monthlyOperationalBurnRateARS = 0;

    recurringRules.forEach(rule => {
        const cat = (rule.category || '').trim().toLowerCase();
        const targetBoxKey = catToBoxMap[cat] || 'operativa';
        const ruleAmt = Number(rule.amount || 0);

        if (targetBoxKey === 'operativa') {
            monthlyOperationalBurnRateARS += ruleAmt;
        }

        const alreadyPaid = paidCategoryTotalsThisMonth[cat] && paidCategoryTotalsThisMonth[cat] >= ruleAmt * 0.8;
        if (!alreadyPaid && commitmentsByBox[targetBoxKey]) {
            commitmentsByBox[targetBoxKey].totalARS += ruleAmt;
            commitmentsByBox[targetBoxKey].items.push({
                type: 'regla_recurrente',
                description: `${rule.name || rule.category} (Día ${rule.dayOfMonth || 1})`,
                category: rule.category,
                amount: ruleAmt,
                dayOfMonth: rule.dayOfMonth
            });
        }
    });

    // Si no hay reglas recurrentes pero sí egresos operativos registrados en el mes actual, estimar burn rate base
    if (monthlyOperationalBurnRateARS === 0 && commitmentsByBox.operativa.totalARS > 0) {
        monthlyOperationalBurnRateARS = commitmentsByBox.operativa.totalARS;
    }

    // Postventa: Operaciones elegibles en ventana de garantía (últimos 90 días)
    // Se cuenta exactamente 1 por vehículo/operación, NUNCA por cuota financiada
    const warrantyCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const eligibleSales = await Sale.find({
        status: { $in: ['confirmada', 'pendiente_entrega', 'entregada'] },
        saleDate: { $gte: warrantyCutoff }
    }).populate('vehicleId', 'brand name year').lean();

    const eligibleSalesCount = eligibleSales.length;

    // Metas determinísticas por caja (sin porcentajes inventados)
    const targetMap = {};

    // 1. Operativa
    const opTotal = commitmentsByBox.operativa.totalARS;
    targetMap.operativa = {
        targetARS: opTotal,
        originDescription: `Gastos pendientes y reglas recurrentes en el horizonte de ${horizonDays} días`,
        originDetails: commitmentsByBox.operativa.items,
        isConfigIncomplete: commitmentsByBox.operativa.items.length === 0,
        missingDataNote: commitmentsByBox.operativa.items.length === 0 ? 'Sin gastos operativos pendientes ni reglas recurrentes cargadas.' : null
    };

    // 2. Impuestos
    const impTotal = commitmentsByBox.impuestos.totalARS;
    targetMap.impuestos = {
        targetARS: impTotal,
        originDescription: 'Obligaciones tributarias e impositivas registradas con vencimiento',
        originDetails: commitmentsByBox.impuestos.items,
        isConfigIncomplete: commitmentsByBox.impuestos.items.length === 0,
        missingDataNote: commitmentsByBox.impuestos.items.length === 0 ? 'Sin impuestos pendientes ni vencimientos tributarios cargados.' : null
    };

    // 3. Deudas
    const deudasTotal = commitmentsByBox.deudas.totalARS;
    targetMap.deudas = {
        targetARS: deudasTotal,
        originDescription: 'Pasivos comerciales, préstamos y cuotas comprometidas',
        originDetails: commitmentsByBox.deudas.items,
        isConfigIncomplete: false,
        missingDataNote: null
    };

    // 4. Personal (Presupuesto exclusivo de retiros del propietario)
    const personalBudget = Number(config.personalMonthlyBudgetARS || 0);
    targetMap.personal = {
        targetARS: personalBudget,
        originDescription: 'Presupuesto mensual confirmado de retiros del propietario (sueldos de empleados van a Operativa)',
        originDetails: personalBudget > 0 ? [{ description: 'Presupuesto mensual de retiros del propietario', amount: personalBudget }] : [],
        isConfigIncomplete: personalBudget <= 0,
        missingDataNote: personalBudget <= 0 ? 'Presupuesto mensual de retiros del propietario no configurado.' : null
    };

    // 5. Reserva de liquidez (Base mensual operativa × meses configurados)
    const reserveMonths = Number(config.reserveMonths || 2);
    const reserveTarget = monthlyOperationalBurnRateARS * reserveMonths;
    targetMap.reserva = {
        targetARS: reserveTarget,
        originDescription: `Respaldo financiero para ${reserveMonths} meses lentos (Base operativa mensual: ARS ${Math.round(monthlyOperationalBurnRateARS).toLocaleString('es-AR')})`,
        originDetails: reserveTarget > 0 ? [{ description: `Base operativa × ${reserveMonths} meses`, amount: reserveTarget }] : [],
        isConfigIncomplete: monthlyOperationalBurnRateARS <= 0,
        missingDataNote: monthlyOperationalBurnRateARS <= 0 ? 'Faltan reglas de gastos fijos operativos para proyectar la reserva de meses lentos.' : null
    };

    // 6. Postventa (Provisión confirmada × autos elegibles)
    const provPerVehicle = Number(config.postventaProvisionPerVehicleARS || 0);
    const provFixed = Number(config.postventaProvisionARS || 0);
    let postventaTarget = 0;
    let postventaDesc = '';
    let postventaDetails = [];
    let postventaIncomplete = false;
    let postventaMissingNote = null;

    if (provPerVehicle > 0) {
        postventaTarget = provPerVehicle * eligibleSalesCount;
        postventaDesc = `Provisión de ARS ${provPerVehicle.toLocaleString('es-AR')} por vehículo × ${eligibleSalesCount} vehículos entregados en garantía (últimos 90 días)`;
        postventaDetails = eligibleSales.map(s => ({
            description: `Garantía unidad ${s.vehicleId?.brand || ''} ${s.vehicleId?.name || ''} (${s.vehicleId?.year || ''})`,
            amount: provPerVehicle,
            date: s.saleDate
        }));
    } else if (provFixed > 0) {
        postventaTarget = provFixed;
        postventaDesc = `Provisión fija de postventa confirmada: ARS ${provFixed.toLocaleString('es-AR')}`;
        postventaDetails = [{ description: 'Provisión global fija de postventa', amount: provFixed }];
    } else {
        postventaTarget = 0;
        postventaDesc = 'Provisión de postventa no configurada';
        postventaIncomplete = true;
        postventaMissingNote = 'Provisión de postventa por vehículo o global no configurada.';
    }

    targetMap.postventa = {
        targetARS: postventaTarget,
        originDescription: postventaDesc,
        originDetails: postventaDetails,
        isConfigIncomplete: postventaIncomplete,
        missingDataNote: postventaMissingNote
    };

    // 7 y 8. Stock y Crecimiento (Reciben EXCLUSIVAMENTE excedente si hay regla expresamente configurada)
    const surplusRuleConfigured = Boolean(config.surplusRule && config.surplusRule.configured);
    const stockPercent = Number(config.surplusRule?.stockPercent || 0);
    const crecimientoPercent = Number(config.surplusRule?.crecimientoPercent || 0);

    targetMap.stock = {
        targetARS: 0,
        originDescription: surplusRuleConfigured ? `Asignación de excedente (${stockPercent}%)` : 'Sin regla de excedente configurada. El remanente permanece sin asignar en cuentas.',
        originDetails: [],
        isConfigIncomplete: !surplusRuleConfigured,
        missingDataNote: !surplusRuleConfigured ? 'Regla de excedente no configurada.' : null
    };

    targetMap.crecimiento = {
        targetARS: 0,
        originDescription: surplusRuleConfigured ? `Asignación de excedente (${crecimientoPercent}%)` : 'Sin regla de excedente configurada. El remanente permanece sin asignar en cuentas.',
        originDetails: [],
        isConfigIncomplete: !surplusRuleConfigured,
        missingDataNote: !surplusRuleConfigured ? 'Regla de excedente no configurada.' : null
    };

    // Cascada de prioridades determinística
    const priorityOrder = Array.isArray(config.priorityOrder) && config.priorityOrder.length > 0
        ? config.priorityOrder
        : ['operativa', 'impuestos', 'deudas', 'personal', 'postventa', 'reserva', 'stock', 'crecimiento'];

    // Determinar pool a repartir: si totalCajasARS === 0 (primera asignación), se reparte effectiveTotalARS.
    // Si ya hay dinero en cajas, se reparte el dinero sin asignar en cuentas.
    const unallocatedPoolARS = Math.max(0, effectiveTotalARS - (liquidityOverrideARS !== null ? 0 : totalCajasARS));
    let remainingFunds = unallocatedPoolARS;
    const boxResultsMap = {};

    // FASE 1: Cubrir cajas prioritarias con compromisos/metas (Operativa, Impuestos, Deudas, Personal, Postventa, Reserva)
    for (const key of priorityOrder) {
        if (key === 'stock' || key === 'crecimiento') continue;

        const boxDoc = boxes.find(b => b.key === key);
        const currentBal = Number(boxDoc?.balanceARS || 0);
        const meta = targetMap[key] || { targetARS: 0, originDescription: '', originDetails: [], isConfigIncomplete: false, missingDataNote: null };
        const target = meta.targetARS;
        const shortfall = Math.max(0, target - currentBal);

        const suggested = Math.min(remainingFunds, shortfall);
        const uncovered = shortfall - suggested;
        remainingFunds -= suggested;

        boxResultsMap[key] = {
            key,
            name: boxDoc?.name || `Caja ${key}`,
            color: boxDoc?.color || 'purple',
            icon: boxDoc?.icon || 'Briefcase',
            targetARS: target,
            originDescription: meta.originDescription,
            originDetails: meta.originDetails,
            currentBalanceARS: currentBal,
            shortfallARS: shortfall,
            suggestedAmountARS: suggested,
            uncoveredShortfallARS: uncovered,
            isConfigIncomplete: meta.isConfigIncomplete,
            missingDataNote: meta.missingDataNote
        };
    }

    // FASE 2: Asignación de Excedente a Stock y Crecimiento
    const surplusPoolARS = Math.max(0, remainingFunds);
    let stockSuggested = 0;
    let crecimientoSuggested = 0;

    if (surplusRuleConfigured && surplusPoolARS > 0) {
        stockSuggested = Math.round(surplusPoolARS * (stockPercent / 100));
        crecimientoSuggested = Math.round(surplusPoolARS * (crecimientoPercent / 100));
        remainingFunds -= (stockSuggested + crecimientoSuggested);
    }

    const stockDoc = boxes.find(b => b.key === 'stock');
    const stockCurrentBal = Number(stockDoc?.balanceARS || 0);
    boxResultsMap.stock = {
        key: 'stock',
        name: stockDoc?.name || 'Caja Stock / Vehículos',
        color: stockDoc?.color || 'cyan',
        icon: stockDoc?.icon || 'Car',
        targetARS: stockCurrentBal + stockSuggested,
        originDescription: surplusRuleConfigured
            ? `Excedente asignado por regla configurada (${stockPercent}% de ARS ${surplusPoolARS.toLocaleString('es-AR')})`
            : 'Regla de excedente no configurada. El remanente permanece en cuentas sin asignar.',
        originDetails: stockSuggested > 0 ? [{ description: `Excedente a Stock (${stockPercent}%)`, amount: stockSuggested }] : [],
        currentBalanceARS: stockCurrentBal,
        shortfallARS: stockSuggested,
        suggestedAmountARS: stockSuggested,
        uncoveredShortfallARS: 0,
        isConfigIncomplete: !surplusRuleConfigured,
        missingDataNote: !surplusRuleConfigured ? 'Regla de excedente no configurada.' : null
    };

    const crecimientoDoc = boxes.find(b => b.key === 'crecimiento');
    const crecimientoCurrentBal = Number(crecimientoDoc?.balanceARS || 0);
    boxResultsMap.crecimiento = {
        key: 'crecimiento',
        name: crecimientoDoc?.name || 'Fondo de Crecimiento',
        color: crecimientoDoc?.color || 'emerald',
        icon: crecimientoDoc?.icon || 'TrendingUp',
        targetARS: crecimientoCurrentBal + crecimientoSuggested,
        originDescription: surplusRuleConfigured
            ? `Excedente asignado por regla configurada (${crecimientoPercent}% de ARS ${surplusPoolARS.toLocaleString('es-AR')})`
            : 'Regla de excedente no configurada. El remanente permanece en cuentas sin asignar.',
        originDetails: crecimientoSuggested > 0 ? [{ description: `Excedente a Crecimiento (${crecimientoPercent}%)`, amount: crecimientoSuggested }] : [],
        currentBalanceARS: crecimientoCurrentBal,
        shortfallARS: crecimientoSuggested,
        suggestedAmountARS: crecimientoSuggested,
        uncoveredShortfallARS: 0,
        isConfigIncomplete: !surplusRuleConfigured,
        missingDataNote: !surplusRuleConfigured ? 'Regla de excedente no configurada.' : null
    };

    // Ordenar resultados respetando el orden canónico
    const boxKeysOrder = ['operativa', 'impuestos', 'deudas', 'personal', 'postventa', 'reserva', 'stock', 'crecimiento'];
    const boxResults = boxKeysOrder.map(k => boxResultsMap[k]).filter(Boolean);

    // Resumen global y detección de déficits
    let totalSuggestedARS = 0;
    let totalDeficitARS = 0;
    boxResults.forEach(b => {
        totalSuggestedARS += b.suggestedAmountARS;
        totalDeficitARS += b.uncoveredShortfallARS;
    });

    const unassignedRemainderARS = Math.max(0, remainingFunds);
    const hasDeficit = totalDeficitARS > 0;
    const hasIncompleteConfig = boxResults.some(b => b.isConfigIncomplete);

    return {
        ok: true,
        boxes: boxResults,
        summary: {
            effectiveTotalARS,
            totalCuentasARS,
            totalCuentasUSD,
            totalCajasARS,
            unallocatedPoolARS,
            totalSuggestedARS,
            unassignedRemainderARS,
            totalDeficitARS,
            hasDeficit,
            hasIncompleteConfig,
            surplusPoolARS,
            surplusRuleConfigured
        },
        config: {
            operationalHorizonDays: horizonDays,
            reserveMonths,
            personalMonthlyBudgetARS: personalBudget,
            postventaProvisionPerVehicleARS: provPerVehicle,
            postventaProvisionARS: provFixed,
            surplusRule: config.surplusRule,
            priorityOrder
        }
    };
}



