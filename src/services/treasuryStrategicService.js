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
            priorityOrder: ['operativa', 'personal', 'impuestos', 'deudas', 'postventa', 'reserva', 'stock', 'crecimiento'],
            autoDistributeIncomes: false,
            requirePinForAutoDistribution: true,
            isSetupCompleted: false
        });
        await cfg.save();
    }
    return cfg;
}

const EXCLUDED_INBOX_CATEGORIES = [
    'Ajuste de Conciliación Inicial',
    'Conciliación Tesorería',
    'Ajuste de Saldo',
    'Transferencia Interna',
    'Traspaso',
    'Regularización Histórica'
];

export function computeIncomeOwnership(inc) {
    const totalAmount = Number(inc?.amount || 0);
    let tercerosAmount = 0;
    let propioAmount = totalAmount;
    let thirdPartyNote = null;
    let thirdPartyOwner = inc?.thirdPartyOwner || null;

    if (Number(inc?.thirdPartyAmount) > 0) {
        tercerosAmount = Math.min(totalAmount, Math.round(Number(inc.thirdPartyAmount) * 100) / 100);
        propioAmount = Math.max(0, Math.round((totalAmount - tercerosAmount) * 100) / 100);
        thirdPartyOwner = thirdPartyOwner || 'Tercero / Socio';
        thirdPartyNote = `Fondos de ${thirdPartyOwner}: ${inc.currency || 'ARS'} ${tercerosAmount.toLocaleString('es-AR')} (Propio: ${inc.currency || 'ARS'} ${propioAmount.toLocaleString('es-AR')}).`;
        return { totalAmount, tercerosAmount, propioAmount, thirdPartyNote, thirdPartyOwner };
    }

    const v = inc?.vehicleId && typeof inc.vehicleId === 'object' ? inc.vehicleId : null;
    const s = inc?.saleId && typeof inc.saleId === 'object' ? inc.saleId : null;

    if (v) {
        const partnerPct = Number(
            (v.investor && v.investor.percentage > 0 ? v.investor.percentage : 0) ||
            (v.jointOwnership && v.jointOwnership.hasPartner && v.jointOwnership.partnerPercentage > 0 ? v.jointOwnership.partnerPercentage : 0)
        );
        if (partnerPct > 0) {
            tercerosAmount = Math.round((totalAmount * partnerPct)) / 100;
            propioAmount = Math.max(0, Math.round((totalAmount - tercerosAmount) * 100) / 100);
            thirdPartyOwner = v.investor?.name || v.jointOwnership?.partnerName || 'Socio';
            thirdPartyNote = `Socio (${thirdPartyOwner}, ${partnerPct}%): ${inc.currency || 'ARS'} ${tercerosAmount.toLocaleString('es-AR')}.`;
        } else if (v.consignedBy || (v.agencyOwned === false && v.ownerName)) {
            const commission = Number(v.consignmentCommission || 0);
            tercerosAmount = commission > 0 ? Math.max(0, totalAmount - commission) : totalAmount;
            propioAmount = commission > 0 ? Math.min(totalAmount, commission) : 0;
            thirdPartyOwner = v.consignedBy || v.ownerName || 'Comitente';
            thirdPartyNote = `Consignación de ${thirdPartyOwner}. Retenido: ${inc.currency || 'ARS'} ${tercerosAmount.toLocaleString('es-AR')}.`;
        }
    } else if (s && (s.vehicleOwnerName || s.ownerName || s.consignationOwnerId)) {
        thirdPartyOwner = s.vehicleOwnerName || s.ownerName || 'Propietario Comitente';
        const commAmt = Number(s.commissionSettings?.extraAmount || 0);
        tercerosAmount = commAmt > 0 && commAmt < totalAmount ? Math.max(0, totalAmount - commAmt) : totalAmount;
        propioAmount = Math.max(0, totalAmount - tercerosAmount);
        thirdPartyNote = `Liquidación pendiente a ${thirdPartyOwner}: ${inc.currency || 'ARS'} ${tercerosAmount.toLocaleString('es-AR')}.`;
    }

    return { totalAmount, tercerosAmount, propioAmount, thirdPartyNote, thirdPartyOwner };
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
            targetARS = Math.max(comms.ARS, Number(box.monthlyTargetARS || box.monthlyBudgetARS || 0));
            targetUSD = Math.max(comms.USD, Number(box.monthlyTargetUSD || box.monthlyBudgetUSD || 0));
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Sin gastos operativos pendientes ni reglas recurrentes cargadas.';
            }
        } else if (box.key === 'impuestos') {
            targetARS = Math.max(comms.ARS, Number(box.monthlyTargetARS || box.monthlyBudgetARS || 0));
            targetUSD = Math.max(comms.USD, Number(box.monthlyTargetUSD || box.monthlyBudgetUSD || 0));
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Sin vencimientos tributarios registrados.';
            }
        } else if (box.key === 'deudas') {
            targetARS = Math.max(comms.ARS, Number(box.monthlyTargetARS || box.monthlyBudgetARS || 0));
            targetUSD = Math.max(comms.USD, Number(box.monthlyTargetUSD || box.monthlyBudgetUSD || 0));
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Sin pasivos comerciales ni mutuos pendientes.';
            }
        } else if (box.key === 'personal') {
            targetARS = box.monthlyTargetARS || box.monthlyBudgetARS || config.personalMonthlyBudgetARS || 0;
            targetUSD = box.monthlyTargetUSD || box.monthlyBudgetUSD || config.personalMonthlyBudgetUSD || 0;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Presupuesto personal no configurado.';
            }
        } else if (box.key === 'reserva') {
            const months = box.reserveMonths || config.reserveMonths || 2;
            targetARS = Math.max(monthlyOperationalBurnRateARS * months, Number(box.monthlyTargetARS || box.monthlyBudgetARS || 0));
            targetUSD = Math.max(monthlyOperationalBurnRateUSD * months, Number(box.monthlyTargetUSD || box.monthlyBudgetUSD || 0));
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Faltan reglas de gastos fijos para proyectar reserva de meses lentos.';
            }
        } else if (box.key === 'postventa') {
            targetARS = box.monthlyTargetARS || box.monthlyBudgetARS || config.postventaProvisionARS || 0;
            targetUSD = box.monthlyTargetUSD || box.monthlyBudgetUSD || config.postventaProvisionUSD || 0;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Provisión de postventa configurable.';
            }
        } else if (box.key === 'stock') {
            targetARS = box.monthlyTargetARS || box.monthlyBudgetARS || 0;
            targetUSD = box.monthlyTargetUSD || box.monthlyBudgetUSD || 0;
        } else if (box.key === 'crecimiento') {
            targetARS = box.monthlyTargetARS || box.monthlyBudgetARS || 0;
            targetUSD = box.monthlyTargetUSD || box.monthlyBudgetUSD || 0;
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
    // FONDOS RETENIDOS PARA TERCEROS Y SOCIOS (POR MONEDA)
    // -------------------------------------------------------------
    const activeIncomeFilter = {
        type: 'Ingreso',
        status: { $in: ['activo', 'Completado'] },
        category: { $nin: EXCLUDED_INBOX_CATEGORIES },
        isHistoricallyRegularized: { $ne: true }
    };
    if (lastCutoffDate) {
        activeIncomeFilter.date = { $gt: lastCutoffDate };
    }

    const activeIncomesForOwnership = await Transaction.find(activeIncomeFilter)
        .populate('vehicleId', 'brand name year investor consignedBy consignmentCommission')
        .populate('accountId', 'name currency type')
        .sort({ date: -1 })
        .lean();

    let grossThirdPartyARS = 0;
    let grossThirdPartyUSD = 0;
    for (const inc of activeIncomesForOwnership) {
        if (inc.thirdPartySettled) continue;
        const own = computeIncomeOwnership(inc);
        if (own.tercerosAmount > 0) {
            if (inc.currency === 'USD') grossThirdPartyUSD += own.tercerosAmount;
            else grossThirdPartyARS += own.tercerosAmount;
        }
    }

    const thirdPartyPayoutFilter = {
        type: 'Egreso',
        status: { $in: ['activo', 'Completado'] },
        category: { $in: ['Pago a Propietario', 'Liquidación Socio', 'Pago Consignación', 'Liquidación Tercero'] }
    };
    if (lastCutoffDate) {
        thirdPartyPayoutFilter.date = { $gt: lastCutoffDate };
    }
    const thirdPartyPayouts = await Transaction.find(thirdPartyPayoutFilter).lean();
    let paidOutThirdPartyARS = 0;
    let paidOutThirdPartyUSD = 0;
    for (const p of thirdPartyPayouts) {
        const amt = Number(p.amount || 0);
        if (p.currency === 'USD') paidOutThirdPartyUSD += amt;
        else paidOutThirdPartyARS += amt;
    }

    const retenidosTercerosARS = Math.round(Math.max(0, grossThirdPartyARS - paidOutThirdPartyARS) * 100) / 100;
    const retenidosTercerosUSD = Math.round(Math.max(0, grossThirdPartyUSD - paidOutThirdPartyUSD) * 100) / 100;

    // Ecuación contable estricta por moneda:
    // Saldo en cuentas = fondos propios asignados (totalCajas) + fondos propios sin asignar + fondos retenidos para terceros
    const propiosAsignadosARS = Math.round(totalCajasARS * 100) / 100;
    const propiosAsignadosUSD = Math.round(totalCajasUSD * 100) / 100;
    const propiosSinAsignarARS = Math.round((totalCuentasARS - propiosAsignadosARS - retenidosTercerosARS) * 100) / 100;
    const propiosSinAsignarUSD = Math.round((totalCuentasUSD - propiosAsignadosUSD - retenidosTercerosUSD) * 100) / 100;

    // -------------------------------------------------------------
    // BANDEJA DE COBROS POSTERIORES AL CORTE (EXCLUYENDO HISTÓRICOS, AJUSTES, GASTOS Y TRASPASOS)
    // -------------------------------------------------------------
    const inboxCandidates = activeIncomesForOwnership.filter(inc =>
        inc.isTreasuryDistributed !== true &&
        inc.treasuryControl?.inboxStatus !== 'excluido_corte' &&
        inc.treasuryControl?.isBeforeCutoff !== true
    );
    const priorityOrder = Array.isArray(config.priorityOrder) && config.priorityOrder.length > 0
        ? config.priorityOrder
        : ['operativa', 'impuestos', 'deudas', 'personal', 'postventa', 'reserva', 'stock', 'crecimiento'];

    const buildSuggestedAllocationsForAmount = (propioAmt, curr) => {
        if (!propioAmt || propioAmt <= 0) return [];
        let rem = propioAmt;
        const sugg = [];
        for (const key of priorityOrder) {
            if (rem <= 0) break;
            if (key === 'stock' || key === 'crecimiento') continue;
            const b = enrichedBoxes.find(x => x.key === key);
            if (!b) continue;
            const sf = curr === 'USD' ? Number(b.shortfallUSD || 0) : Number(b.shortfallARS || 0);
            if (sf > 0) {
                const take = Math.min(rem, sf);
                rem -= take;
                sugg.push({ boxKey: b.key, boxName: b.name, amount: Math.round(take * 100) / 100 });
            }
        }
        if (rem > 0 && config.surplusRule?.configured) {
            const stPct = Number(config.surplusRule.stockPercent || 0);
            const crPct = Number(config.surplusRule.crecimientoPercent || 0);
            if (stPct > 0) {
                const stAmt = Math.round(rem * (stPct / 100));
                if (stAmt > 0) sugg.push({ boxKey: 'stock', boxName: 'Caja Stock / Vehículos', amount: stAmt });
            }
            if (crPct > 0) {
                const crAmt = Math.round(rem * (crPct / 100));
                if (crAmt > 0) sugg.push({ boxKey: 'crecimiento', boxName: 'Fondo de Crecimiento', amount: crAmt });
            }
        }
        return sugg;
    };

    const unassignedIncomeCards = inboxCandidates.map(inc => {
        const own = computeIncomeOwnership(inc);
        const curr = inc.currency || 'ARS';
        return {
            id: inc._id,
            _id: inc._id,
            description: inc.description || inc.concept || 'Cobro registrado',
            category: inc.category,
            totalAmount: own.totalAmount,
            tercerosAmount: own.tercerosAmount,
            propioAmount: own.propioAmount,
            thirdPartyOwner: own.thirdPartyOwner,
            currency: curr,
            date: inc.date,
            accountName: inc.accountId?.name || 'Cuenta',
            thirdPartyNote: own.thirdPartyNote,
            saleId: inc.saleId || null,
            installmentId: inc.installmentId || null,
            vehicleId: inc.vehicleId?._id || inc.vehicleId || null,
            suggestedAllocations: buildSuggestedAllocationsForAmount(own.propioAmount, curr)
        };
    });

    // -------------------------------------------------------------
    // FONDOS PROTEGIDOS Y DISPONIBLE PARA COMPRAR STOCK (SOLO FONDOS PROPIOS)
    // -------------------------------------------------------------
    // Fondos protegidos: Reserva de liquidez + Impuestos comprometidos + Deudas comprometidas
    const reservaBox = enrichedBoxes.find(b => b.key === 'reserva') || { balanceARS: 0, balanceUSD: 0 };
    const impuestosBox = enrichedBoxes.find(b => b.key === 'impuestos') || { balanceARS: 0, balanceUSD: 0, commitmentsARS: 0, commitmentsUSD: 0 };
    const deudasBox = enrichedBoxes.find(b => b.key === 'deudas') || { balanceARS: 0, balanceUSD: 0, commitmentsARS: 0, commitmentsUSD: 0 };
    const stockBox = enrichedBoxes.find(b => b.key === 'stock') || { availableARS: 0, availableUSD: 0 };

    const fondosProtegidosARS = (reservaBox.balanceARS || 0) + (impuestosBox.commitmentsARS || 0) + (deudasBox.commitmentsARS || 0);
    const fondosProtegidosUSD = (reservaBox.balanceUSD || 0) + (impuestosBox.commitmentsUSD || 0) + (deudasBox.commitmentsUSD || 0);

    // Disponible para comprar: usa exclusivamente fondos propios disponibles en Stock + fondos propios sin asignar (jamás fondos de terceros)
    const availableToBuyARS = Math.max(0, (stockBox.availableARS || 0) + Math.max(0, propiosSinAsignarARS));
    const availableToBuyUSD = Math.max(0, (stockBox.availableUSD || 0) + Math.max(0, propiosSinAsignarUSD));

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
            projectedARS: (totalCuentasARS - retenidosTercerosARS) - (commitmentsByBox.operativa.ARS + commitmentsByBox.impuestos.ARS + commitmentsByBox.deudas.ARS),
            projectedUSD: (totalCuentasUSD - retenidosTercerosUSD) - (commitmentsByBox.operativa.USD + commitmentsByBox.impuestos.USD + commitmentsByBox.deudas.USD),
            notes: 'Descuenta fondos de terceros, egresos pendientes y gastos operativos calendarizados.'
        },
        {
            period: 'Próximos 60 días',
            days: 60,
            projectedARS: (totalCuentasARS - retenidosTercerosARS) - (commitmentsByBox.operativa.ARS + commitmentsByBox.impuestos.ARS + commitmentsByBox.deudas.ARS) - conservativeBurnRateARS,
            projectedUSD: (totalCuentasUSD - retenidosTercerosUSD) - (commitmentsByBox.operativa.USD + commitmentsByBox.impuestos.USD + commitmentsByBox.deudas.USD) - conservativeBurnRateUSD,
            notes: 'Escenario conservador sin sumar ventas futuras.'
        },
        {
            period: 'Próximos 90 días',
            days: 90,
            projectedARS: (totalCuentasARS - retenidosTercerosARS) - (commitmentsByBox.operativa.ARS + commitmentsByBox.impuestos.ARS + commitmentsByBox.deudas.ARS) - (conservativeBurnRateARS * 2),
            projectedUSD: (totalCuentasUSD - retenidosTercerosUSD) - (commitmentsByBox.operativa.USD + commitmentsByBox.impuestos.USD + commitmentsByBox.deudas.USD) - (conservativeBurnRateUSD * 2),
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
            totalCajasARS: propiosAsignadosARS,
            totalCajasUSD: propiosAsignadosUSD,
            totalAsignadoCajasARS: propiosAsignadosARS,
            totalAsignadoCajasUSD: propiosAsignadosUSD,
            propiosAsignadosARS,
            propiosAsignadosUSD,
            propiosSinAsignarARS,
            propiosSinAsignarUSD,
            sinAsignarARS: propiosSinAsignarARS,
            sinAsignarUSD: propiosSinAsignarUSD,
            retenidosTercerosARS,
            retenidosTercerosUSD,
            fondosRetenidosTercerosARS: retenidosTercerosARS,
            fondosRetenidosTercerosUSD: retenidosTercerosUSD,
            unallocatedARS: propiosSinAsignarARS,
            unallocatedUSD: propiosSinAsignarUSD,
            fondosProtegidosARS,
            fondosProtegidosUSD,
            reconciliationEquation: {
                ARS: {
                    saldoEnCuentas: totalCuentasARS,
                    fondosPropiosAsignados: propiosAsignadosARS,
                    fondosPropiosSinAsignar: propiosSinAsignarARS,
                    fondosRetenidosTerceros: retenidosTercerosARS,
                    isBalanced: Math.abs(totalCuentasARS - (propiosAsignadosARS + propiosSinAsignarARS + retenidosTercerosARS)) < 0.01
                },
                USD: {
                    saldoEnCuentas: totalCuentasUSD,
                    fondosPropiosAsignados: propiosAsignadosUSD,
                    fondosPropiosSinAsignar: propiosSinAsignarUSD,
                    fondosRetenidosTerceros: retenidosTercerosUSD,
                    isBalanced: Math.abs(totalCuentasUSD - (propiosAsignadosUSD + propiosSinAsignarUSD + retenidosTercerosUSD)) < 0.01
                }
            }
        },
        incompleteExpenses,
        unassignedIncomeCards,
        pendingIncomes: unassignedIncomeCards,
        planning: {
            availableToBuyARS,
            availableToBuyUSD,
            monthlyOperationalBurnRateARS: conservativeBurnRateARS,
            monthlyOperationalBurnRateUSD: conservativeBurnRateUSD,
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
    await ensureDefaultBoxes();
    const { distributions = [], allocations = [], reason = 'Organización de saldo inicial en cajas' } = payload;
    const userName = user?.name || user?.email || 'Admin';
    const items = Array.isArray(allocations) && allocations.length > 0 ? allocations : (distributions || []);

    for (const dist of items) {
        if (!dist.boxKey) continue;
        const box = await TreasuryBox.findOne({ key: dist.boxKey });
        if (box) {
            const valARS = dist.balanceARS !== undefined ? dist.balanceARS : (dist.assignARS !== undefined ? dist.assignARS : dist.amountARS);
            if (dist.mode === 'set' || dist.balanceARS !== undefined || dist.assignARS !== undefined) {
                const prevARS = Number(box.balanceARS || 0);
                const newARS = Number(valARS || 0);
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
                const addARS = Number(valARS || 0);
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

            const valUSD = dist.balanceUSD !== undefined ? dist.balanceUSD : (dist.assignUSD !== undefined ? dist.assignUSD : dist.amountUSD);
            if (dist.mode === 'set' || dist.balanceUSD !== undefined || dist.assignUSD !== undefined) {
                const prevUSD = Number(box.balanceUSD || 0);
                const newUSD = Number(valUSD || 0);
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
                const addUSD = Number(valUSD || 0);
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
    .sort({ installmentNumber: 1, dueDate: 1 })
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
            _id: inst._id,
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

async function resolveInstallmentsToRegularize(payload = {}) {
    const {
        installmentIds = [],
        installments = [],
        saleId = null,
        upToInstallmentNumber = null,
        bySaleRules = [] // [{ saleId, upToInstallmentNumber, knownPaymentDate }]
    } = payload;

    const targetMap = new Map(); // idStr -> { installment, knownPaymentDate }

    // 1. Direct IDs array
    if (Array.isArray(installmentIds)) {
        for (const rawId of installmentIds) {
            if (!rawId) continue;
            const inst = await Installment.findById(rawId);
            if (inst && (inst.status === 'pendiente' || inst.status === 'vencida')) {
                targetMap.set(String(inst._id), {
                    installment: inst,
                    knownPaymentDate: payload.knownPaymentDate || null
                });
            }
        }
    }

    // 2. Objects array [{ installmentId, id, _id, knownPaymentDate }]
    if (Array.isArray(installments)) {
        for (const item of installments) {
            const rawId = typeof item === 'object' ? (item.installmentId || item._id || item.id) : item;
            if (!rawId) continue;
            const inst = await Installment.findById(rawId);
            if (inst && (inst.status === 'pendiente' || inst.status === 'vencida')) {
                targetMap.set(String(inst._id), {
                    installment: inst,
                    knownPaymentDate: (typeof item === 'object' ? item.knownPaymentDate : null) || payload.knownPaymentDate || null
                });
            }
        }
    }

    // 3. Single sale rule: "Pagadas hasta la cuota N"
    const rulesToProcess = [...(Array.isArray(bySaleRules) ? bySaleRules : [])];
    if (saleId && upToInstallmentNumber !== null && upToInstallmentNumber !== undefined && Number(upToInstallmentNumber) > 0) {
        rulesToProcess.push({
            saleId,
            upToInstallmentNumber: Number(upToInstallmentNumber),
            knownPaymentDate: payload.knownPaymentDate || null
        });
    }

    for (const rule of rulesToProcess) {
        if (!rule.saleId || !rule.upToInstallmentNumber || Number(rule.upToInstallmentNumber) <= 0) continue;
        const maxNum = Number(rule.upToInstallmentNumber);
        const matched = await Installment.find({
            saleId: rule.saleId,
            installmentNumber: { $lte: maxNum },
            status: { $in: ['pendiente', 'vencida'] }
        }).sort({ installmentNumber: 1 });

        for (const inst of matched) {
            targetMap.set(String(inst._id), {
                installment: inst,
                knownPaymentDate: rule.knownPaymentDate || payload.knownPaymentDate || null
            });
        }
    }

    return Array.from(targetMap.values());
}

export async function previewBatchRegularization(payload = {}) {
    const targets = await resolveInstallmentsToRegularize(payload);
    let totalARS = 0;
    let totalUSD = 0;
    const salesSet = new Set();

    const items = targets.map(({ installment: inst, knownPaymentDate }) => {
        const amt = Number(inst.amount || 0);
        if (inst.currency === 'USD') totalUSD += amt;
        else totalARS += amt;
        if (inst.saleId) salesSet.add(String(inst.saleId));

        return {
            installmentId: inst._id,
            saleId: inst.saleId || null,
            installmentNumber: inst.installmentNumber,
            amount: amt,
            currency: inst.currency || 'ARS',
            dueDate: inst.dueDate,
            previousStatus: inst.status,
            newStatus: 'pagada',
            isHistoricallyRegularized: true,
            paymentDateToRecord: knownPaymentDate ? new Date(knownPaymentDate) : null,
            affectsAccountBalances: false,
            entersPendingDistributionInbox: false
        };
    });

    return {
        ok: true,
        count: items.length,
        installmentsCount: items.length,
        totalARS,
        totalUSD,
        accountBalanceImpactARS: 0,
        boxBalanceImpactARS: 0,
        affectedSalesCount: salesSet.size,
        affectsAccountBalances: false,
        entersPendingDistributionInbox: false,
        items,
        explanation: `Se marcarán ${items.length} cuotas como pagadas por regularización histórica (${salesSet.size} operación/es). No sumarán dinero nuevamente a cuentas ni a cajas, ni aparecerán en la bandeja de pendientes de distribuir.`
    };
}

export async function batchRegularizeInstallments(payload, user) {
    const { reason = 'Pagos históricos incluidos en saldo inicial' } = payload || {};
    const userName = user?.name || user?.email || 'Administrador';

    const targets = await resolveInstallmentsToRegularize(payload);
    if (targets.length === 0) {
        throw new Error('Seleccioná al menos una cuota pendiente o indicá "Pagadas hasta la cuota N" para regularizar.');
    }

    const batchId = `BATCH-REG-${Date.now().toString().slice(-6)}`;
    let totalARS = 0;
    let totalUSD = 0;
    const salesSet = new Set();
    let regularizedCount = 0;

    for (const { installment: inst, knownPaymentDate } of targets) {
        if (inst && (inst.status === 'pendiente' || inst.status === 'vencida')) {
            inst.status = 'pagada';
            inst.isHistoricallyRegularized = true;
            inst.regularizationBatchId = batchId;
            inst.regularizedAt = new Date();
            inst.regularizedBy = userName;
            inst.paidAmount = inst.amount;
            // Regla estricta: no fabricar fecha de pago con el vencimiento si no se conoce la fecha real
            inst.paymentDate = knownPaymentDate ? new Date(knownPaymentDate) : null;
            inst.notes = (inst.notes ? `${inst.notes} | ` : '') + `Regularizada en lote ${batchId}: ${reason}`;

            inst.installmentAuditLog.push({
                action: 'REGULARIZACION_CONCILIADA',
                user: userName,
                date: new Date(),
                details: `Lote ${batchId}. Pago histórico incluido en saldo inicial.${knownPaymentDate ? ` Fecha real informada: ${new Date(knownPaymentDate).toISOString().slice(0, 10)}.` : ' Fecha exacta de cobro histórico no informada (registrada como regularización histórica).'} Sin impacto en caja ni cobro nuevo.`
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
        regularizedCount,
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
        inst.status = 'pendiente';
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
        vehicleId: explicitVehicleId,
        clientId: explicitClientId,
        amount,
        currency = 'ARS',
        accountId,
        paymentMethod = 'transferencia',
        date = new Date(),
        notes = '',
        distributeNow = true,
        useSuggested = false,
        distributions = [] // [{ boxKey, amount }]
    } = payload;

    const userName = user?.name || user?.email || 'Admin';

    if (!accountId) throw new Error('Seleccioná la cuenta receptora del dinero.');
    const account = await Account.findById(accountId);
    if (!account) throw new Error('Cuenta receptora no encontrada.');

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) throw new Error('Importe inválido.');

    let linkedInstallment = null;
    let concept = payload.concept || payload.description || 'Cobro comercial';

    if (installmentId) {
        linkedInstallment = await Installment.findById(installmentId);
        if (linkedInstallment) {
            if (linkedInstallment.status === 'pagada') {
                throw new Error('Esta cuota ya figura como pagada.');
            }
            concept = `Cobro Cuota #${linkedInstallment.installmentNumber || ''}`;
        }
    }

    const resolvedVehicleId = explicitVehicleId || linkedInstallment?.vehicleId || undefined;
    let vehicleDoc = null;
    if (resolvedVehicleId) {
        vehicleDoc = await Car.findById(resolvedVehicleId).select('brand name year investor consignedBy consignmentCommission').lean();
    }
    const ownership = computeIncomeOwnership({
        amount: payAmount,
        currency,
        vehicleId: vehicleDoc
    });

    // 1. Registrar el movimiento de ingreso UNA SOLA VEZ
    const tx = new Transaction({
        type: 'Ingreso',
        amount: payAmount,
        currency,
        description: concept,
        concept,
        category: payload.category || 'Cobranzas',
        paymentMethod,
        date: new Date(date),
        accountId: account._id,
        saleId: saleId || linkedInstallment?.saleId || undefined,
        installmentId: linkedInstallment?._id || undefined,
        clientId: explicitClientId || linkedInstallment?.clientId || undefined,
        vehicleId: resolvedVehicleId,
        thirdPartyAmount: ownership.tercerosAmount,
        thirdPartyOwner: ownership.thirdPartyOwner,
        notes: notes || '',
        module: 'crm_v2',
        source: linkedInstallment ? 'cuota' : 'venta',
        status: 'activo',
        isTreasuryDistributed: false,
        createdBy: userName,
        transactionAuditLog: [{
            action: 'COBRO_TESORERIA',
            details: `Cobro registrado en cuenta ${account.name}.`,
            user: userName
        }]
    });
    await tx.save();

    // 2. Acreditar saldo en la cuenta UNA SOLA VEZ
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

    // 4. Si se seleccionó distribuir ahora o aplicar distribución sugerida, usar este mismo cobro sin crear segundo ingreso
    let distributedTotal = 0;
    let appliedDistributions = Array.isArray(distributions) ? distributions : [];

    if (distributeNow && useSuggested && appliedDistributions.length === 0 && ownership.propioAmount > 0 && currency === 'ARS') {
        const suggestion = await calculateSuggestedAllocation({ liquidityARS: ownership.propioAmount }, user);
        appliedDistributions = (suggestion.boxes || [])
            .filter(b => b.suggestedAmountARS > 0)
            .map(b => ({ boxKey: b.key, amount: b.suggestedAmountARS }));
    }

    if (distributeNow && appliedDistributions.length > 0) {
        const distRes = await distributeSingleIncome({
            transactionId: tx._id,
            distribution: appliedDistributions
        }, user);
        distributedTotal = distRes.distributedTotal || 0;
    }

    return {
        ok: true,
        transactionId: tx._id,
        distributedTotal,
        thirdPartyRetained: ownership.tercerosAmount,
        ownDistributableAmount: ownership.propioAmount,
        message: `Cobro de ${currency} ${payAmount.toLocaleString('es-AR')} acreditado en ${account.name} exitosamente ${distributedTotal > 0 ? `(${currency} ${distributedTotal.toLocaleString('es-AR')} distribuido en cajas)` : '(enviado a bandeja para distribuir después)'}.`
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

    if (payload.autoDistributeIncomes !== undefined) cfg.autoDistributeIncomes = Boolean(payload.autoDistributeIncomes);
    if (payload.requirePinForAutoDistribution !== undefined) cfg.requirePinForAutoDistribution = Boolean(payload.requirePinForAutoDistribution);

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
    await ensureDefaultBoxes();
    const { distributions = [], allocations = [], reason = 'Asignación estratégica de capital' } = payload;
    const userName = user?.name || user?.email || 'Admin';
    const items = Array.isArray(allocations) && allocations.length > 0 ? allocations : (distributions || []);

    for (const dist of items) {
        const box = await TreasuryBox.findOne({ key: dist.boxKey });
        if (box) {
            const valARS = dist.amountARS !== undefined ? dist.amountARS : (dist.assignARS !== undefined ? dist.assignARS : dist.balanceARS);
            if (valARS !== undefined) {
                const diffARS = Number(valARS) - (box.balanceARS || 0);
                box.balanceARS = Number(valARS);
                if (Math.abs(diffARS) > 0) {
                    box.history.push({ date: new Date(), type: 'ajuste', amount: diffARS, currency: 'ARS', reason, user: userName });
                }
            }
            const valUSD = dist.amountUSD !== undefined ? dist.amountUSD : (dist.assignUSD !== undefined ? dist.assignUSD : dist.balanceUSD);
            if (valUSD !== undefined) {
                const diffUSD = Number(valUSD) - (box.balanceUSD || 0);
                box.balanceUSD = Number(valUSD);
                if (Math.abs(diffUSD) > 0) {
                    box.history.push({ date: new Date(), type: 'ajuste', amount: diffUSD, currency: 'USD', reason, user: userName });
                }
            }
            if (dist.targetPercent !== undefined) box.targetPercent = Number(dist.targetPercent);
            if (dist.monthlyBudgetARS !== undefined) box.monthlyBudgetARS = Number(dist.monthlyBudgetARS);
            if (dist.monthlyBudgetUSD !== undefined) box.monthlyBudgetUSD = Number(dist.monthlyBudgetUSD);
            if (dist.monthlyTargetARS !== undefined) box.monthlyTargetARS = Number(dist.monthlyTargetARS);
            if (dist.monthlyTargetUSD !== undefined) box.monthlyTargetUSD = Number(dist.monthlyTargetUSD);
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
                    description: `Ajuste por conciliación de saldo real (${acc.name})`,
                    concept: `Ajuste por conciliación de saldo real (${acc.name})`,
                    amount: Math.abs(diff),
                    currency: acc.currency,
                    accountId: acc._id,
                    date: cutoffDate,
                    notes: `Ajuste por conciliación de saldo real: ${reason} (Diferencia: ${diff >= 0 ? '+' : ''}${diff})`,
                    treasuryBoxKey: null,
                    isTreasuryDistributed: true,
                    status: 'activo',
                    createdBy: userName
                });
                await adjTx.save();
            }
        }
    }

    return await confirmInitialCutoff({ cutoffDate, reason }, user);
}

// 17. Distribuir Cobro Específico (Usa el mismo cobro, sin crear un segundo ingreso, y protege fondos de terceros)
export async function distributeSingleIncome(payload, user) {
    await ensureDefaultBoxes();
    const { transactionId, boxKey, distribution = [], allocations = [], useSuggested = false } = payload;
    const userName = user?.name || user?.email || 'Admin';

    const tx = await Transaction.findById(transactionId).populate('vehicleId', 'brand name year investor consignedBy consignmentCommission');
    if (!tx) {
        throw new Error('Transacción de cobro no encontrada.');
    }
    if (tx.type !== 'Ingreso') {
        throw new Error('Solo se pueden distribuir transacciones de ingreso.');
    }
    if (tx.isTreasuryDistributed) {
        throw new Error('Este cobro ya fue distribuido previamente en Tesorería.');
    }

    const curr = tx.currency || 'ARS';
    const ownership = computeIncomeOwnership(tx);
    const maxDistributable = ownership.propioAmount;

    const rawList = Array.isArray(allocations) && allocations.length > 0 ? allocations : (Array.isArray(distribution) ? distribution : []);
    let effectiveDistribution = [...rawList];

    if (useSuggested && effectiveDistribution.length === 0 && maxDistributable > 0) {
        if (curr === 'ARS') {
            const suggestion = await calculateSuggestedAllocation({ liquidityARS: maxDistributable }, user);
            effectiveDistribution = (suggestion.boxes || [])
                .filter(b => b.suggestedAmountARS > 0)
                .map(b => ({ boxKey: b.key, amount: b.suggestedAmountARS }));
        } else {
            effectiveDistribution = [{ boxKey: boxKey || 'stock', amount: maxDistributable }];
        }
    } else if (!effectiveDistribution.length && boxKey) {
        effectiveDistribution = [{ boxKey, amount: maxDistributable }];
    }

    const requestedSum = effectiveDistribution.reduce((acc, d) => acc + Math.max(0, Number(d.amount || 0)), 0);
    if (requestedSum > maxDistributable + 0.01) {
        throw new Error(
            `El monto a distribuir (${curr} ${requestedSum.toLocaleString('es-AR')}) supera los fondos propios disponibles del cobro (${curr} ${maxDistributable.toLocaleString('es-AR')}). Los fondos de terceros (${curr} ${ownership.tercerosAmount.toLocaleString('es-AR')}) están retenidos y no pueden asignarse a cajas propias.`
        );
    }

    let distributedTotal = 0;
    const appliedBoxes = [];

    for (const dist of effectiveDistribution) {
        const amt = Math.round(Number(dist.amount || 0) * 100) / 100;
        if (amt <= 0) continue;
        const box = await TreasuryBox.findOne({ key: dist.boxKey });
        if (!box) throw new Error(`Caja ${dist.boxKey} no encontrada.`);

        if (curr === 'USD') box.balanceUSD = Math.round(((box.balanceUSD || 0) + amt) * 100) / 100;
        else box.balanceARS = Math.round(((box.balanceARS || 0) + amt) * 100) / 100;

        box.history.push({
            date: new Date(),
            type: 'distribucion_cobro',
            amount: amt,
            currency: curr,
            reason: `Distribución de cobro #${tx._id}: ${tx.description || tx.concept || tx.notes || ''}`,
            user: userName,
            sourceIncomeId: tx._id
        });
        await box.save();
        distributedTotal += amt;
        appliedBoxes.push({ boxKey: dist.boxKey, boxName: box.name, amount: amt });
    }

    tx.thirdPartyAmount = ownership.tercerosAmount;
    tx.thirdPartyOwner = ownership.thirdPartyOwner;
    tx.isTreasuryDistributed = true;
    tx.distributedAt = new Date();
    tx.distributedBy = userName;
    tx.treasuryBoxKey = appliedBoxes[0]?.boxKey || boxKey || null;

    tx.transactionAuditLog.push({
        action: 'DISTRIBUCION_TESORERIA',
        user: userName,
        date: new Date(),
        details: `Cobro distribuido a cajas estratégicas (${curr} ${distributedTotal.toLocaleString('es-AR')}). Fondos terceros retenidos: ${curr} ${ownership.tercerosAmount.toLocaleString('es-AR')}.`
    });
    await tx.save();

    return {
        ok: true,
        transactionId: tx._id,
        distributedTotal,
        appliedBoxes,
        thirdPartyRetained: ownership.tercerosAmount,
        unassignedRemainder: Math.max(0, maxDistributable - distributedTotal),
        message: 'Cobro distribuido exitosamente a las cajas sin duplicar el ingreso.'
    };
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

const CANONICAL_EXPENSE_BOX_MAP = {
    'sueldos': 'operativa',
    'sueldo': 'operativa',
    'sueldos y comisiones': 'operativa',
    'honorarios y comisiones': 'operativa',
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
    'retiros personales': 'personal',
    'retiros': 'personal',
    'retiro': 'personal',
    'taller': 'postventa',
    'mecánica': 'postventa',
    'mecánica postventa': 'postventa',
    'postventa': 'postventa',
    'compra vehículo': 'stock',
    'stock': 'stock',
    'inversión': 'crecimiento',
    'inversion': 'crecimiento'
};

// 20. Sincronización Automática de Gastos de Finanzas con Cajas Estratégicas
export async function syncExpenseWithTreasury(tx, options = {}) {
    if (!tx || tx.type !== 'Egreso') return;

    await ensureDefaultBoxes();
    await ensureDefaultCategoryRules();

    // 1. Si no tiene treasuryBoxKey asignada, buscar en reglas de categorías o mapeo canónico
    if (!tx.treasuryBoxKey && tx.category) {
        const cleanCat = tx.category.trim();
        const rule = await TreasuryCategoryRule.findOne({ category: cleanCat });
        const resolvedKey = (rule && rule.boxKey) || CANONICAL_EXPENSE_BOX_MAP[cleanCat.toLowerCase()] || null;
        if (resolvedKey) {
            tx.treasuryBoxKey = resolvedKey;
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
    const isPendiente = tx.status === 'pendiente';

    if (options.isNew) {
        if (isActivo) {
            // Descuenta una sola vez al registrarse como pagado
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
        } else if (isPendiente) {
            // Reserva como compromiso pendiente sin descontar el saldo real todavía
            if (curr === 'USD') box.pendingCommitmentsUSD = (box.pendingCommitmentsUSD || 0) + amt;
            else box.pendingCommitmentsARS = (box.pendingCommitmentsARS || 0) + amt;
            await box.save();
        }
    } else if (options.statusChanged) {
        if (options.oldStatus === 'pendiente' && isActivo) {
            // Libera la reserva pendiente y descuenta una sola vez del saldo real
            if (curr === 'USD') {
                box.pendingCommitmentsUSD = Math.max(0, (box.pendingCommitmentsUSD || 0) - amt);
                box.balanceUSD = Math.max(0, (box.balanceUSD || 0) - amt);
            } else {
                box.pendingCommitmentsARS = Math.max(0, (box.pendingCommitmentsARS || 0) - amt);
                box.balanceARS = Math.max(0, (box.balanceARS || 0) - amt);
            }

            box.history.push({
                date: new Date(),
                type: 'egreso_finanzas',
                amount: -amt,
                currency: curr,
                reason: `Pago de Gasto Finanzas #${tx._id}: ${tx.concept || tx.description || tx.category}`,
                user: options.user || 'Sistema'
            });
            await box.save();
        } else if (options.oldStatus === 'pendiente' && !isActivo && !isPendiente) {
            // Se anuló un compromiso que estaba pendiente: liberar reserva sin tocar balance
            if (curr === 'USD') box.pendingCommitmentsUSD = Math.max(0, (box.pendingCommitmentsUSD || 0) - amt);
            else box.pendingCommitmentsARS = Math.max(0, (box.pendingCommitmentsARS || 0) - amt);
            await box.save();
        } else if (options.oldStatus !== 'activo' && isActivo) {
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
            if (curr === 'USD') {
                box.balanceUSD = (box.balanceUSD || 0) + amt;
                if (isPendiente) box.pendingCommitmentsUSD = (box.pendingCommitmentsUSD || 0) + amt;
            } else {
                box.balanceARS = (box.balanceARS || 0) + amt;
                if (isPendiente) box.pendingCommitmentsARS = (box.pendingCommitmentsARS || 0) + amt;
            }

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

    Object.entries(CANONICAL_EXPENSE_BOX_MAP).forEach(([k, v]) => {
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

    const opBoxDoc = boxes.find(b => b.key === 'operativa');
    const impBoxDoc = boxes.find(b => b.key === 'impuestos');
    const deuBoxDoc = boxes.find(b => b.key === 'deudas');
    const persBoxDoc = boxes.find(b => b.key === 'personal');
    const resBoxDoc = boxes.find(b => b.key === 'reserva');
    const postBoxDoc = boxes.find(b => b.key === 'postventa');

    // 1. Operativa
    const opTotal = Math.max(commitmentsByBox.operativa.totalARS, Number(opBoxDoc?.monthlyTargetARS || opBoxDoc?.monthlyBudgetARS || 0));
    targetMap.operativa = {
        targetARS: opTotal,
        originDescription: `Gastos pendientes y reglas recurrentes en el horizonte de ${horizonDays} días`,
        originDetails: commitmentsByBox.operativa.items,
        isConfigIncomplete: opTotal === 0 && commitmentsByBox.operativa.items.length === 0,
        missingDataNote: opTotal === 0 && commitmentsByBox.operativa.items.length === 0 ? 'Sin gastos operativos pendientes ni reglas recurrentes cargadas.' : null
    };

    // 2. Impuestos
    const impTotal = Math.max(commitmentsByBox.impuestos.totalARS, Number(impBoxDoc?.monthlyTargetARS || impBoxDoc?.monthlyBudgetARS || 0));
    targetMap.impuestos = {
        targetARS: impTotal,
        originDescription: 'Obligaciones tributarias e impositivas registradas con vencimiento',
        originDetails: commitmentsByBox.impuestos.items,
        isConfigIncomplete: impTotal === 0 && commitmentsByBox.impuestos.items.length === 0,
        missingDataNote: impTotal === 0 && commitmentsByBox.impuestos.items.length === 0 ? 'Sin impuestos pendientes ni vencimientos tributarios cargados.' : null
    };

    // 3. Deudas
    const deudasTotal = Math.max(commitmentsByBox.deudas.totalARS, Number(deuBoxDoc?.monthlyTargetARS || deuBoxDoc?.monthlyBudgetARS || 0));
    targetMap.deudas = {
        targetARS: deudasTotal,
        originDescription: 'Pasivos comerciales, préstamos y cuotas comprometidas',
        originDetails: commitmentsByBox.deudas.items,
        isConfigIncomplete: false,
        missingDataNote: null
    };

    // 4. Personal (Presupuesto exclusivo de retiros del propietario)
    const personalBudget = Number(config.personalMonthlyBudgetARS || persBoxDoc?.monthlyTargetARS || persBoxDoc?.monthlyBudgetARS || 0);
    targetMap.personal = {
        targetARS: personalBudget,
        originDescription: 'Presupuesto mensual confirmado de retiros del propietario (sueldos de empleados van a Operativa)',
        originDetails: personalBudget > 0 ? [{ description: 'Presupuesto mensual de retiros del propietario', amount: personalBudget }] : [],
        isConfigIncomplete: personalBudget <= 0,
        missingDataNote: personalBudget <= 0 ? 'Presupuesto mensual de retiros del propietario no configurado.' : null
    };

    // 5. Reserva de liquidez (Base mensual operativa × meses configurados)
    const reserveMonths = Number(config.reserveMonths || 2);
    const reserveTarget = Math.max(monthlyOperationalBurnRateARS * reserveMonths, Number(resBoxDoc?.monthlyTargetARS || resBoxDoc?.monthlyBudgetARS || 0));
    targetMap.reserva = {
        targetARS: reserveTarget,
        originDescription: `Respaldo financiero para ${reserveMonths} meses lentos (Base operativa mensual: ARS ${Math.round(monthlyOperationalBurnRateARS).toLocaleString('es-AR')})`,
        originDetails: reserveTarget > 0 ? [{ description: `Base operativa × ${reserveMonths} meses`, amount: reserveTarget }] : [],
        isConfigIncomplete: reserveTarget <= 0,
        missingDataNote: reserveTarget <= 0 ? 'Faltan reglas de gastos fijos operativos para proyectar la reserva de meses lentos.' : null
    };

    // 6. Postventa (Provisión confirmada × autos elegibles)
    const provPerVehicle = Number(config.postventaProvisionPerVehicleARS || 0);
    const provFixed = Number(config.postventaProvisionARS || postBoxDoc?.monthlyTargetARS || postBoxDoc?.monthlyBudgetARS || 0);
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

// 22. Integración Automática de Cobros (Cuotas, Entregas y Ventas) con Tesorería
export async function registerCollectionForTreasury(tx, options = {}) {
    if (!tx || tx.type !== 'Ingreso') {
        return { action: 'ignored', reason: 'not_income', status: 'ignored' };
    }
    if (EXCLUDED_INBOX_CATEGORIES.includes(tx.category) || tx.isHistoricallyRegularized) {
        return { action: 'ignored', reason: 'excluded_category_or_historical', status: 'ignored' };
    }

    // 1. Calcular participación de terceros/socios si está vinculada a un vehículo
    let vehicleDoc = null;
    if (tx.vehicleId) {
        if (typeof tx.vehicleId === 'object' && (tx.vehicleId.investor !== undefined || tx.vehicleId.consignedBy !== undefined)) {
            vehicleDoc = tx.vehicleId;
        } else {
            vehicleDoc = await Car.findById(tx.vehicleId).select('brand name year investor consignedBy consignmentCommission').lean();
        }
    }

    const ownership = computeIncomeOwnership({
        ...tx.toObject ? tx.toObject() : tx,
        vehicleId: vehicleDoc
    });

    tx.thirdPartyAmount = ownership.tercerosAmount;
    tx.thirdPartyOwner = ownership.thirdPartyOwner;

    // 2. Revisar configuración de distribución automática
    const config = await getOrCreateTreasuryConfig();
    const isTreasurySessionUnlocked = Boolean(options.isTreasuryUnlocked);

    if (config.autoDistributeIncomes) {
        if (config.requirePinForAutoDistribution && !isTreasurySessionUnlocked) {
            tx.isTreasuryDistributed = false;
            await tx.save();
            return {
                action: 'pending_pin_authorization',
                status: 'pending_distribution',
                requiresTreasuryPin: true,
                ownDistributableAmount: ownership.propioAmount,
                thirdPartyRetained: ownership.tercerosAmount,
                message: 'Cobro registrado en cuenta y dejado pendiente en bandeja de Tesorería (requiere autorización con PIN para distribuir).'
            };
        }

        // Distribuir automáticamente usando el reparto sugerido sobre fondos propios
        await tx.save();
        if (ownership.propioAmount > 0) {
            const distRes = await distributeSingleIncome({
                transactionId: tx._id,
                useSuggested: true
            }, options.user || { name: tx.createdBy || 'Sistema' });

            return {
                action: 'auto_distributed',
                status: 'distributed',
                requiresTreasuryPin: false,
                distributedTotal: distRes.distributedTotal,
                appliedBoxes: distRes.appliedBoxes,
                ownDistributableAmount: ownership.propioAmount,
                thirdPartyRetained: ownership.tercerosAmount,
                message: 'Cobro registrado y distribuido automáticamente según la configuración de Tesorería.'
            };
        }
    }

    // Por defecto: queda en bandeja de pendientes de distribuir
    if (tx.isTreasuryDistributed === undefined || tx.isTreasuryDistributed === null) {
        tx.isTreasuryDistributed = false;
    }
    await tx.save();

    return {
        action: 'queued_in_inbox',
        status: 'pending_distribution',
        requiresTreasuryPin: false,
        ownDistributableAmount: ownership.propioAmount,
        thirdPartyRetained: ownership.tercerosAmount,
        message: 'Cobro registrado en cuenta y disponible en la bandeja de pendientes de distribuir.'
    };
}

// 23. Recuperación Segura de Cobros Posteriores al Corte que no entraron a la Bandeja
export async function previewRecoverableIncomes() {
    const lastConfirmedRec = await TreasuryReconciliation.findOne({ status: 'confirmado' })
        .sort({ cutoffDate: -1, createdAt: -1 })
        .lean();
    const lastCutoffDate = lastConfirmedRec ? new Date(lastConfirmedRec.cutoffDate) : null;

    // Buscar asientos de distribución ya aplicados en las cajas para saber qué cobros sí fueron distribuidos realmente
    const boxes = await TreasuryBox.find().select('key name history').lean();
    const distributedIncomeIdsInBoxes = new Set();
    for (const box of boxes) {
        for (const h of (box.history || [])) {
            if (h.sourceIncomeId) {
                distributedIncomeIdsInBoxes.add(String(h.sourceIncomeId));
            }
        }
    }

    const query = {
        type: 'Ingreso',
        status: { $in: ['activo', 'Completado'] },
        category: { $nin: EXCLUDED_INBOX_CATEGORIES },
        isHistoricallyRegularized: { $ne: true }
    };
    if (lastCutoffDate) {
        query.date = { $gt: lastCutoffDate };
    }

    const postCutoffIncomes = await Transaction.find(query)
        .populate('vehicleId', 'brand name year investor consignedBy consignmentCommission')
        .populate('accountId', 'name currency type')
        .sort({ date: -1 })
        .lean();

    const alreadyInInbox = [];
    const recoverableItems = [];

    for (const inc of postCutoffIncomes) {
        const idStr = String(inc._id);
        const hasBoxHistory = distributedIncomeIdsInBoxes.has(idStr);
        const own = computeIncomeOwnership(inc);
        const isExcludedByControl = inc.treasuryControl?.inboxStatus === 'excluido_corte' || inc.treasuryControl?.isBeforeCutoff === true;

        const formatted = {
            id: inc._id,
            _id: inc._id,
            description: inc.description || inc.concept || 'Cobro registrado',
            category: inc.category,
            totalAmount: own.totalAmount,
            propioAmount: own.propioAmount,
            tercerosAmount: own.tercerosAmount,
            currency: inc.currency || 'ARS',
            date: inc.date,
            accountName: inc.accountId?.name || 'Cuenta',
            isTreasuryDistributed: Boolean(inc.isTreasuryDistributed),
            hasBoxHistory
        };

        if ((inc.isTreasuryDistributed || isExcludedByControl) && !hasBoxHistory && !inc.treasuryBoxKey) {
            // Fue marcado como distribuido o excluido por corte sin haber tocado ninguna caja
            recoverableItems.push(formatted);
        } else if (!inc.isTreasuryDistributed && !isExcludedByControl) {
            alreadyInInbox.push(formatted);
        }
    }

    return {
        ok: true,
        lastCutoffDate,
        alreadyInInboxCount: alreadyInInbox.length,
        recoverableCount: recoverableItems.length,
        recoverableItems,
        recoverableToInbox: recoverableItems,
        alreadyInInbox
    };
}

export async function recoverPendingIncomes(payload = {}, user) {
    const { transactionIds = [] } = payload;
    const userName = user?.name || user?.email || 'Administrador';

    const preview = await previewRecoverableIncomes();
    const recoverableMap = new Map(preview.recoverableItems.map(item => [String(item._id), item]));

    const targetIds = Array.isArray(transactionIds) && transactionIds.length > 0
        ? transactionIds.map(String).filter(id => recoverableMap.has(id))
        : Array.from(recoverableMap.keys());

    let recoveredCount = 0;
    for (const id of targetIds) {
        const tx = await Transaction.findById(id);
        if (!tx) continue;
        tx.isTreasuryDistributed = false;
        tx.distributedAt = null;
        tx.distributedBy = null;
        if (tx.treasuryControl) {
            tx.treasuryControl.isBeforeCutoff = false;
            tx.treasuryControl.inboxStatus = 'pendiente';
        }
        tx.transactionAuditLog.push({
            action: 'RECUPERACION_BANDEJA_TESORERIA',
            user: userName,
            date: new Date(),
            details: 'Cobro posterior al corte recuperado hacia la bandeja de pendientes de distribuir (sin duplicar ingreso en cuentas).'
        });
        await tx.save();
        recoveredCount++;
    }

    return {
        ok: true,
        recoveredCount,
        message: `${recoveredCount} cobro(s) recuperado(s) en la bandeja de pendientes de distribuir.`
    };
}

// 24. Simulador de Capacidad de Compra de Vehículos (Solo lectura, sin persistir ni alterar saldos)
export async function simulateVehiclePurchase(payload = {}) {
    const dashboard = await getTreasuryDashboardData();
    const { summary, boxes, planning, config } = dashboard;

    const rawPrice = payload.purchasePrice !== undefined ? payload.purchasePrice : payload.totalPrice;
    const rawAgencyPct = payload.agencySharePercent !== undefined ? payload.agencySharePercent : payload.agencySharePct;
    const inferredOwnershipMode = payload.ownershipMode || (rawAgencyPct !== undefined && Number(rawAgencyPct) < 100 ? 'partner' : 'own');

    const {
        currency = 'ARS',
        exchangeRate = 1,
        additionalExpenses = 0,
        expensesCurrency = currency,
        expensesPaidBy = 'agency', // 'agency' | 'shared' | 'partner'
        ownershipMode = inferredOwnershipMode, // 'own' (100% propio) | 'partner' (compartido con socio/inversor)
        agencySharePercent = rawAgencyPct !== undefined ? rawAgencyPct : (inferredOwnershipMode === 'partner' ? 50 : 100),
        partnerSharePercent = inferredOwnershipMode === 'partner' ? (100 - Number(rawAgencyPct !== undefined ? rawAgencyPct : 50)) : 0
    } = payload;

    const priceNum = Math.max(0, Number(rawPrice) || 0);
    const expensesNum = Math.max(0, Number(additionalExpenses) || 0);
    const rateNum = Math.max(0, Number(exchangeRate) || 0);

    if (currency !== expensesCurrency && rateNum <= 0) {
        throw new Error('Indicá una cotización válida para convertir entre ARS y USD.');
    }

    const normAgencyPct = ownershipMode === 'partner'
        ? Math.min(100, Math.max(0, Number(agencySharePercent) || 0))
        : 100;
    const normPartnerPct = ownershipMode === 'partner'
        ? Math.min(100, Math.max(0, Number(partnerSharePercent !== undefined ? partnerSharePercent : (100 - normAgencyPct))))
        : 0;

    // Convertir gastos adicionales a la moneda de la operación principal si difieren
    let expensesInOpCurrency = expensesNum;
    if (expensesCurrency !== currency) {
        if (expensesCurrency === 'USD' && currency === 'ARS') {
            expensesInOpCurrency = expensesNum * rateNum;
        } else if (expensesCurrency === 'ARS' && currency === 'USD') {
            expensesInOpCurrency = rateNum > 0 ? expensesNum / rateNum : 0;
        }
    }

    const agencyVehicleCost = Math.round((priceNum * (normAgencyPct / 100)) * 100) / 100;
    const partnerVehicleCost = Math.round((priceNum * (normPartnerPct / 100)) * 100) / 100;

    let agencyExpensesCost = 0;
    let partnerExpensesCost = 0;
    if (expensesPaidBy === 'partner') {
        partnerExpensesCost = expensesInOpCurrency;
    } else if (expensesPaidBy === 'shared') {
        agencyExpensesCost = Math.round((expensesInOpCurrency * (normAgencyPct / 100)) * 100) / 100;
        partnerExpensesCost = Math.round((expensesInOpCurrency - agencyExpensesCost) * 100) / 100;
    } else {
        agencyExpensesCost = expensesInOpCurrency;
    }

    const totalOperationCost = Math.round((priceNum + expensesInOpCurrency) * 100) / 100;
    const totalAgencyOutflow = Math.round((agencyVehicleCost + agencyExpensesCost) * 100) / 100;
    const totalPartnerContribution = Math.round((partnerVehicleCost + partnerExpensesCost) * 100) / 100;

    // Disponibilidad actual en la moneda seleccionada (exclusivamente fondos propios)
    const isUSD = currency === 'USD';
    const stockBox = boxes.find(b => b.key === 'stock') || { availableARS: 0, availableUSD: 0, balanceARS: 0, balanceUSD: 0 };
    const crecimientoBox = boxes.find(b => b.key === 'crecimiento') || { availableARS: 0, availableUSD: 0, balanceARS: 0, balanceUSD: 0 };
    const operativaBox = boxes.find(b => b.key === 'operativa') || { availableARS: 0, availableUSD: 0, balanceARS: 0, balanceUSD: 0, commitmentsARS: 0, commitmentsUSD: 0 };
    const reservaBox = boxes.find(b => b.key === 'reserva') || { availableARS: 0, availableUSD: 0, balanceARS: 0, balanceUSD: 0 };
    const impuestosBox = boxes.find(b => b.key === 'impuestos') || { commitmentsARS: 0, commitmentsUSD: 0, balanceARS: 0, balanceUSD: 0 };
    const deudasBox = boxes.find(b => b.key === 'deudas') || { commitmentsARS: 0, commitmentsUSD: 0, balanceARS: 0, balanceUSD: 0 };

    const stockAvailableBefore = isUSD ? Number(stockBox.availableUSD || 0) : Number(stockBox.availableARS || 0);
    const ownUnassignedBefore = isUSD ? Number(summary.propiosSinAsignarUSD || 0) : Number(summary.propiosSinAsignarARS || 0);
    const crecimientoAvailableBefore = isUSD ? Number(crecimientoBox.availableUSD || 0) : Number(crecimientoBox.availableARS || 0);
    const totalOwnLiquidBefore = isUSD
        ? Math.max(0, Number(summary.totalCuentasUSD || 0) - Number(summary.retenidosTercerosUSD || 0))
        : Math.max(0, Number(summary.totalCuentasARS || 0) - Number(summary.retenidosTercerosARS || 0));

    const availableToBuyBefore = Math.max(0, stockAvailableBefore + Math.max(0, ownUnassignedBefore));
    const availableToBuyAfter = Math.max(0, availableToBuyBefore - totalAgencyOutflow);

    // Orden de consumo para la compra: 1. Caja Stock -> 2. Propios sin asignar -> 3. Crecimiento -> 4. Cajas operativas/protegidas
    let remainingOutflow = totalAgencyOutflow;
    const usedFromStockBox = Math.min(stockAvailableBefore, remainingOutflow);
    remainingOutflow -= usedFromStockBox;

    const usedFromUnassignedOwn = Math.min(Math.max(0, ownUnassignedBefore), remainingOutflow);
    remainingOutflow -= usedFromUnassignedOwn;

    const usedFromCrecimiento = Math.min(crecimientoAvailableBefore, remainingOutflow);
    remainingOutflow -= usedFromCrecimiento;

    const invadedProtectedOrOperationalAmount = Math.round(remainingOutflow * 100) / 100;

    // Evaluar qué cajas protegidas u operativas se verían afectadas si invade más allá de Stock + Sin Asignar + Crecimiento
    const affectedProtectedBoxes = [];
    if (invadedProtectedOrOperationalAmount > 0) {
        let deficitWalker = invadedProtectedOrOperationalAmount;
        const candidateProtected = [
            { key: 'operativa', name: 'Caja Operativa', balance: isUSD ? Number(operativaBox.balanceUSD || 0) : Number(operativaBox.balanceARS || 0) },
            { key: 'reserva', name: 'Reserva de Liquidez', balance: isUSD ? Number(reservaBox.balanceUSD || 0) : Number(reservaBox.balanceARS || 0) },
            { key: 'impuestos', name: 'Caja Impuestos', balance: isUSD ? Number(impuestosBox.balanceUSD || 0) : Number(impuestosBox.balanceARS || 0) },
            { key: 'deudas', name: 'Caja Deudas', balance: isUSD ? Number(deudasBox.balanceUSD || 0) : Number(deudasBox.balanceARS || 0) }
        ];
        for (const c of candidateProtected) {
            if (deficitWalker <= 0) break;
            if (c.balance > 0) {
                const taken = Math.min(c.balance, deficitWalker);
                deficitWalker -= taken;
                affectedProtectedBoxes.push({
                    boxKey: c.key,
                    boxName: c.name,
                    affectedAmount: Math.round(taken * 100) / 100
                });
            }
        }
        if (deficitWalker > 0) {
            affectedProtectedBoxes.push({
                boxKey: 'descubierto_total',
                boxName: 'Faltante sobre liquidez propia total',
                affectedAmount: Math.round(deficitWalker * 100) / 100
            });
        }
    }

    // Días de cobertura operativa antes y después (en base al burn rate real, sin valores fijos inventados)
    const monthlyBurnRate = isUSD
        ? Number(planning.monthlyOperationalBurnRateUSD || 0)
        : Number(planning.monthlyOperationalBurnRateARS || 0);
    const dailyBurnRate = monthlyBurnRate > 0 ? (monthlyBurnRate / 30) : 0;

    const operationalLiquidityBefore = (isUSD ? Number(operativaBox.balanceUSD || 0) : Number(operativaBox.balanceARS || 0))
        + (isUSD ? Number(reservaBox.balanceUSD || 0) : Number(reservaBox.balanceARS || 0));
    const operationalLiquidityAfter = Math.max(0, operationalLiquidityBefore - invadedProtectedOrOperationalAmount);

    const operatingCoverageDaysBefore = dailyBurnRate > 0
        ? Math.floor(operationalLiquidityBefore / dailyBurnRate)
        : null;
    const operatingCoverageDaysAfter = dailyBurnRate > 0
        ? Math.floor(operationalLiquidityAfter / dailyBurnRate)
        : null;

    let status = 'viable'; // 'viable' | 'ajustado' | 'compromete_cajas' | 'insuficiente'
    if (totalAgencyOutflow > totalOwnLiquidBefore) {
        status = 'insuficiente';
    } else if (invadedProtectedOrOperationalAmount > 0) {
        status = 'compromete_cajas';
    } else if (usedFromCrecimiento > 0 || availableToBuyAfter === 0) {
        status = 'ajustado';
    }

    return {
        ok: true,
        isSimulationOnly: true,
        currency,
        exchangeRate: rateNum,
        ownershipMode,
        agencySharePercent: normAgencyPct,
        partnerSharePercent: normPartnerPct,
        expensesPaidBy,
        agencyPriceShare: agencyVehicleCost,
        partnerPriceShare: partnerVehicleCost,
        agencyExpensesShare: agencyExpensesCost,
        agencyTotalRequired: totalAgencyOutflow,
        viableWithoutProtectedFunds: invadedProtectedOrOperationalAmount === 0,
        affectsProtectedFunds: invadedProtectedOrOperationalAmount > 0,
        shortfall: invadedProtectedOrOperationalAmount,
        availableAfterPurchase: availableToBuyAfter,
        breakdown: {
            purchasePrice: priceNum,
            additionalExpensesInOpCurrency: Math.round(expensesInOpCurrency * 100) / 100,
            totalOperationCost,
            agencyVehicleCost,
            agencyExpensesCost,
            totalAgencyOutflow,
            partnerVehicleCost,
            partnerExpensesCost,
            totalPartnerContribution
        },
        availability: {
            availableToBuyBefore,
            availableToBuyAfter,
            stockAvailableBefore,
            stockAvailableAfter: Math.max(0, stockAvailableBefore - usedFromStockBox),
            ownUnassignedBefore,
            ownUnassignedAfter: Math.max(0, ownUnassignedBefore - usedFromUnassignedOwn),
            crecimientoAvailableBefore,
            crecimientoAvailableAfter: Math.max(0, crecimientoAvailableBefore - usedFromCrecimiento),
            totalOwnLiquidBefore,
            totalOwnLiquidAfter: Math.max(0, totalOwnLiquidBefore - totalAgencyOutflow),
            thirdPartyRetainedExcluded: isUSD ? Number(summary.retenidosTercerosUSD || 0) : Number(summary.retenidosTercerosARS || 0)
        },
        fundingSourcesUsed: {
            fromStockBox: usedFromStockBox,
            fromUnassignedOwn: usedFromUnassignedOwn,
            fromCrecimientoBox: usedFromCrecimiento,
            invadedProtectedOrOperationalAmount
        },
        affectedProtectedBoxes,
        coverage: {
            monthlyBurnRate,
            dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
            operatingCoverageDaysBefore,
            operatingCoverageDaysAfter,
            reserveMonthsTarget: Number(config.reserveMonths || 2),
            burnRateConfigured: monthlyBurnRate > 0
        },
        status
    };
}




