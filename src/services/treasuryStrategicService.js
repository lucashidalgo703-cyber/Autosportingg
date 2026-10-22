import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import TreasurySecurity from '../models/TreasurySecurity.js';
import TreasuryBox from '../models/TreasuryBox.js';
import TreasuryReconciliation from '../models/TreasuryReconciliation.js';
import TreasuryCategoryRule from '../models/TreasuryCategoryRule.js';
import TreasuryConfig from '../models/TreasuryConfig.js';
import TreasuryBatchLog from '../models/TreasuryBatchLog.js';
import TreasuryAuditLog from '../models/TreasuryAuditLog.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Installment from '../models/Installment.js';
import AdminUser from '../models/AdminUser.js';
import Sale from '../models/Sale.js';
import Car from '../models/Car.js';
import Client from '../models/Client.js';
import FinanceRecurringRule from '../models/FinanceRecurringRule.js';
import Settlement from '../models/Settlement.js';
import { resolveOriginForCar } from './tradeInChainService.js';
import { roundMoney } from '../utils/saleCommercial.js';
import {
    computeOperationRecoveryState,
    computeSixStepWaterfallForCollection,
    computeSchemeDistributionForCollection,
    DISTRIBUTION_SCHEMES
} from './treasuryWaterfallHelpers.js';

export { DISTRIBUTION_SCHEMES };

const JWT_SECRET = process.env.JWT_SECRET?.trim() || 'autosporting_secret_jwt_key_crm_2026';
const LOCK_TIME_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

function escapeRegex(string) {
    return string ? string.replace(/[.*+?^${}()|[\]\\]/g, '\\// Hashing seguro con scrypt nativo') : '';
}

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

export async function ensureDefaultBoxes() {
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
            reinvestmentExtraConfigured: false,
            reinvestmentExtraPct: null,
            priorityOrder: ['operativa', 'impuestos', 'deudas', 'postventa', 'reserva', 'personal', 'stock', 'crecimiento'],
            autoDistributeIncomes: false,
            requirePinForAutoDistribution: false,
            isSetupCompleted: false
        });
        await cfg.save();
    }
    return cfg;
}

export async function loadSaleOperationRecoveryState(saleOrId, config = null, excludeTransactionId = null) {
    if (!saleOrId) return null;
    const cfg = config || await getOrCreateTreasuryConfig();

    let saleDoc = null;
    if (typeof saleOrId === 'object' && saleOrId._id && saleOrId.salePrice !== undefined) {
        saleDoc = saleOrId;
    } else {
        saleDoc = await Sale.findById(saleOrId)
            .populate('vehicleId')
            .populate('clientId', 'firstName lastName fullName')
            .lean();
    }
    if (!saleDoc) return null;

    let vehicleDoc = saleDoc.vehicleId && typeof saleDoc.vehicleId === 'object' && saleDoc.vehicleId._id
        ? saleDoc.vehicleId
        : null;
    if (!vehicleDoc && saleDoc.vehicleId) {
        vehicleDoc = await Car.findById(saleDoc.vehicleId).lean();
    }

    let legacyOrigin = null;
    if (vehicleDoc && !(Number(vehicleDoc.purchasePrice) > 0)) {
        try {
            legacyOrigin = await resolveOriginForCar(vehicleDoc);
        } catch {
            legacyOrigin = null;
        }
    }

    const vehId = vehicleDoc?._id || saleDoc.vehicleId || null;
    const txFilter = vehId
        ? {
            $or: [
                { saleId: saleDoc._id },
                { vehicleId: vehId, saleId: null },
                { carId: vehId, saleId: null }
            ]
        }
        : { saleId: saleDoc._id };

    const [saleTransactions, paidSettlements] = await Promise.all([
        Transaction.find(txFilter).sort({ date: 1, createdAt: 1 }).lean(),
        Settlement.find({ status: 'pagada', 'includedSales.saleId': saleDoc._id }).lean()
    ]);

    const state = computeOperationRecoveryState({
        sale: saleDoc,
        vehicle: vehicleDoc,
        legacyOrigin,
        saleTransactions,
        paidSettlements,
        config: cfg,
        excludeTransactionId
    });

    const clientName = saleDoc.clientId
        ? (saleDoc.clientId.fullName || `${saleDoc.clientId.firstName || ''} ${saleDoc.clientId.lastName || ''}`.trim() || 'Cliente')
        : (saleDoc.customerName || 'Cliente');
    const vehicleLabel = vehicleDoc
        ? `${vehicleDoc.brand || ''} ${vehicleDoc.name || ''} ${vehicleDoc.year || ''}`.trim()
        : 'Vehículo sin vincular';

    return {
        ...state,
        saleDate: saleDoc.saleDate,
        saleStatus: saleDoc.status,
        vehicleId: vehId ? String(vehId) : null,
        vehicleLabel,
        clientName
    };
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

    // Gastos pagados en el mes para evitar duplicar reglas recurrentes o presupuestos mensuales
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const horizonDays = Number(config.operationalHorizonDays || 30);
    const horizonCutoff = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);

    const existingCurrentMonthTransactions = await Transaction.find({
        type: 'Egreso',
        status: { $in: ['activo', 'Completado'] },
        date: { $gte: startOfCurrentMonth }
    }).sort({ date: -1 }).lean();

    const recentPaidExpenses = await Transaction.find({
        type: 'Egreso',
        status: { $in: ['activo', 'Completado'] }
    }).sort({ date: -1 }).limit(120).lean();

    // Asegurar que catToBoxMap también incluya el mapeo canónico
    Object.entries(CANONICAL_EXPENSE_BOX_MAP).forEach(([k, v]) => {
        if (!catToBoxMap[k]) catToBoxMap[k] = v;
    });

    const existingCategoryTotalsThisMonth = {};
    const pendingCategoryTotalsThisMonth = {};
    const paidByBoxThisMonth = {
        operativa: { ARS: 0, USD: 0 },
        impuestos: { ARS: 0, USD: 0 },
        deudas: { ARS: 0, USD: 0 },
        personal: { ARS: 0, USD: 0 },
        postventa: { ARS: 0, USD: 0 },
        reserva: { ARS: 0, USD: 0 },
        stock: { ARS: 0, USD: 0 },
        crecimiento: { ARS: 0, USD: 0 }
    };

    existingCurrentMonthTransactions.forEach(tx => {
        const cat = (tx.category || '').trim().toLowerCase();
        const curr = tx.currency === 'USD' ? 'USD' : 'ARS';
        const amt = Number(tx.amount || 0);
        const key = `${cat}:${curr}`;
        existingCategoryTotalsThisMonth[key] = (existingCategoryTotalsThisMonth[key] || 0) + amt;
        existingCategoryTotalsThisMonth[cat] = (existingCategoryTotalsThisMonth[cat] || 0) + amt;
        const bKey = tx.treasuryBoxKey || catToBoxMap[cat] || 'operativa';
        if (paidByBoxThisMonth[bKey]) {
            paidByBoxThisMonth[bKey][curr] = roundMoney(paidByBoxThisMonth[bKey][curr] + amt);
        }
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
        const txDate = tx.date ? new Date(tx.date) : now;

        if (txDate >= startOfCurrentMonth) {
            const key = `${cat}:${curr}`;
            pendingCategoryTotalsThisMonth[key] = (pendingCategoryTotalsThisMonth[key] || 0) + amt;
        }

        // Considerar vencidos o dentro del horizonte operativo configurado
        if (txDate <= horizonCutoff && commitmentsByBox[targetBoxKey]) {
            commitmentsByBox[targetBoxKey][curr] = roundMoney(commitmentsByBox[targetBoxKey][curr] + amt);
            commitmentsByBox[targetBoxKey].items.push({
                id: tx._id,
                type: 'gasto_pendiente',
                description: tx.description || tx.concept || 'Gasto pendiente',
                category: tx.category,
                amount: amt,
                currency: curr,
                date: tx.date,
                user: tx.createdBy || 'Sistema',
                reason: tx.notes || tx.description || tx.concept || 'Compromiso pendiente'
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
            if (curr === 'USD') monthlyOperationalBurnRateUSD = roundMoney(monthlyOperationalBurnRateUSD + ruleAmt);
            else monthlyOperationalBurnRateARS = roundMoney(monthlyOperationalBurnRateARS + ruleAmt);
        }

        // Evitar duplicar un gasto entre presupuesto recurrente, gasto pendiente y gasto ya pagado del mismo período
        const key = `${cat}:${curr}`;
        const alreadyCoveredInMonth = roundMoney(
            Number(existingCategoryTotalsThisMonth[key] || 0) + Number(pendingCategoryTotalsThisMonth[key] || 0)
        );
        const uncoveredRuleAmt = roundMoney(Math.max(0, ruleAmt - alreadyCoveredInMonth));

        if (uncoveredRuleAmt > 0 && commitmentsByBox[targetBoxKey]) {
            commitmentsByBox[targetBoxKey][curr] = roundMoney(commitmentsByBox[targetBoxKey][curr] + uncoveredRuleAmt);
            commitmentsByBox[targetBoxKey].items.push({
                id: rule._id,
                type: 'regla_recurrente',
                description: `${rule.name} (Día ${rule.dayOfMonth})`,
                category: rule.category,
                amount: uncoveredRuleAmt,
                currency: curr,
                dueDateDay: rule.dayOfMonth,
                user: 'Regla Recurrente',
                reason: alreadyCoveredInMonth > 0
                    ? `Porción restante del mes (Regla ${curr} ${ruleAmt.toLocaleString('es-AR')} − Ya registrado ${curr} ${alreadyCoveredInMonth.toLocaleString('es-AR')})`
                    : `Gasto recurrente mensual programado (Día ${rule.dayOfMonth})`
            });
        }
    });

    // Provisión de postventa por vehículo: contar 1 vez por vehículo entregado/vendido en ventana de garantía (90 días), NUNCA por cuota
    const warrantyCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const eligibleWarrantySales = await Sale.find({
        status: { $in: ['confirmada', 'pendiente_entrega', 'entregada'] },
        saleDate: { $gte: warrantyCutoff }
    }).select('_id vehicleId saleDate').lean();
    const uniqueWarrantyVehiclesCount = new Set(
        eligibleWarrantySales.map(s => String(s.vehicleId?._id || s.vehicleId || s._id))
    ).size;

    // Agrupar gastos pagados recientes por caja para el detalle de cada caja
    const paidExpensesByBox = {};
    for (const expTx of recentPaidExpenses) {
        const cat = (expTx.category || '').trim().toLowerCase();
        const bKey = expTx.treasuryBoxKey || catToBoxMap[cat] || 'operativa';
        if (!paidExpensesByBox[bKey]) paidExpensesByBox[bKey] = [];
        if (paidExpensesByBox[bKey].length < 25) {
            paidExpensesByBox[bKey].push({
                id: expTx._id,
                date: expTx.date,
                amount: Number(expTx.amount || 0),
                currency: expTx.currency || 'ARS',
                category: expTx.category || 'Gasto',
                description: expTx.description || expTx.concept || expTx.category || 'Egreso pagado',
                reason: expTx.notes || expTx.description || expTx.concept || 'Pago registrado en Finanzas',
                user: expTx.createdBy || 'Sistema'
            });
        }
    }

    // Enriquecer cajas con explicación del cálculo y detalle completo de movimientos
    const enrichedBoxes = boxes.map(box => {
        const comms = commitmentsByBox[box.key] || { ARS: 0, USD: 0, items: [] };
        const paidMonth = paidByBoxThisMonth[box.key] || { ARS: 0, USD: 0 };
        const balARS = roundMoney(Number(box.balanceARS || 0));
        const balUSD = roundMoney(Number(box.balanceUSD || 0));
        const availableARS = roundMoney(Math.max(0, balARS - comms.ARS));
        const availableUSD = roundMoney(Math.max(0, balUSD - comms.USD));
        const uncoveredCommitmentsARS = roundMoney(Math.max(0, comms.ARS - balARS));
        const uncoveredCommitmentsUSD = roundMoney(Math.max(0, comms.USD - balUSD));

        let targetARS = 0;
        let targetUSD = 0;
        let missingDataNote = null;
        let calculationExplanation = '';

        const boxMonthlyBudgetARS = Number(box.monthlyTargetARS || box.monthlyBudgetARS || 0);
        const boxMonthlyBudgetUSD = Number(box.monthlyTargetUSD || box.monthlyBudgetUSD || 0);
        // Presupuesto mensual restante (descontando lo ya pagado este mes para no duplicar con egresos ejecutados)
        const remainingMonthlyBudgetARS = roundMoney(Math.max(0, boxMonthlyBudgetARS - paidMonth.ARS));
        const remainingMonthlyBudgetUSD = roundMoney(Math.max(0, boxMonthlyBudgetUSD - paidMonth.USD));

        if (box.key === 'operativa') {
            targetARS = roundMoney(Math.max(comms.ARS, remainingMonthlyBudgetARS));
            targetUSD = roundMoney(Math.max(comms.USD, remainingMonthlyBudgetUSD));
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Sin gastos operativos pendientes ni reglas recurrentes cargadas.';
            }
            calculationExplanation = `Objetivo = máx(Compromisos en horizonte de ${horizonDays} días [ARS ${comms.ARS.toLocaleString('es-AR')}], Presupuesto mensual restante [ARS ${remainingMonthlyBudgetARS.toLocaleString('es-AR')}]). Incluye sueldos de empleados, alquiler y funcionamiento, sin duplicar gastos del mismo período.`;
        } else if (box.key === 'impuestos') {
            targetARS = roundMoney(Math.max(comms.ARS, remainingMonthlyBudgetARS));
            targetUSD = roundMoney(Math.max(comms.USD, remainingMonthlyBudgetUSD));
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Sin vencimientos tributarios registrados.';
            }
            calculationExplanation = `Objetivo = máx(Impuestos/patentes pendientes en horizonte [ARS ${comms.ARS.toLocaleString('es-AR')}], Presupuesto tributario restante [ARS ${remainingMonthlyBudgetARS.toLocaleString('es-AR')}]).`;
        } else if (box.key === 'deudas') {
            targetARS = roundMoney(Math.max(comms.ARS, remainingMonthlyBudgetARS));
            targetUSD = roundMoney(Math.max(comms.USD, remainingMonthlyBudgetUSD));
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Sin pasivos comerciales ni mutuos pendientes.';
            }
            calculationExplanation = `Objetivo = máx(Pasivos y préstamos comprometidos [ARS ${comms.ARS.toLocaleString('es-AR')}], Presupuesto de deudas restante [ARS ${remainingMonthlyBudgetARS.toLocaleString('es-AR')}]).`;
        } else if (box.key === 'personal') {
            const cfgPersARS = Number(box.monthlyTargetARS || box.monthlyBudgetARS || config.personalMonthlyBudgetARS || 0);
            const cfgPersUSD = Number(box.monthlyTargetUSD || box.monthlyBudgetUSD || config.personalMonthlyBudgetUSD || 0);
            const remPersARS = roundMoney(Math.max(0, cfgPersARS - paidMonth.ARS));
            const remPersUSD = roundMoney(Math.max(0, cfgPersUSD - paidMonth.USD));
            targetARS = roundMoney(Math.max(comms.ARS, remPersARS));
            targetUSD = roundMoney(Math.max(comms.USD, remPersUSD));
            if (cfgPersARS === 0 && cfgPersUSD === 0 && targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Presupuesto personal no configurado.';
            }
            calculationExplanation = `Exclusivo para retiros del titular. Objetivo = Presupuesto mensual (${cfgPersARS.toLocaleString('es-AR')} ARS) − Retiros ya efectuados este mes (${paidMonth.ARS.toLocaleString('es-AR')} ARS).`;
        } else if (box.key === 'reserva') {
            const months = Number(box.reserveMonths || config.reserveMonths || 2);
            targetARS = roundMoney(Math.max(monthlyOperationalBurnRateARS * months, boxMonthlyBudgetARS));
            targetUSD = roundMoney(Math.max(monthlyOperationalBurnRateUSD * months, boxMonthlyBudgetUSD));
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Faltan reglas de gastos fijos para proyectar reserva de meses lentos.';
            }
            calculationExplanation = `Reserva mínima = Base operativa mensual (${monthlyOperationalBurnRateARS.toLocaleString('es-AR')} ARS) × ${months} mes(es) de respaldo.`;
        } else if (box.key === 'postventa') {
            const provPerVehARS = Number(config.postventaProvisionPerVehicleARS || 0);
            const provFixedARS = Number(box.monthlyTargetARS || box.monthlyBudgetARS || config.postventaProvisionARS || 0);
            const provFixedUSD = Number(box.monthlyTargetUSD || box.monthlyBudgetUSD || config.postventaProvisionUSD || 0);
            const computedProvARS = provPerVehARS > 0
                ? roundMoney(provPerVehARS * uniqueWarrantyVehiclesCount)
                : provFixedARS;
            targetARS = roundMoney(Math.max(comms.ARS, computedProvARS));
            targetUSD = roundMoney(Math.max(comms.USD, provFixedUSD));
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Provisión de postventa configurable.';
            }
            calculationExplanation = provPerVehARS > 0
                ? `Provisión por vehículo (ARS ${provPerVehARS.toLocaleString('es-AR')}) × ${uniqueWarrantyVehiclesCount} unidad(es) entregadas en ventana de garantía (se calcula 1 sola vez por vehículo, sin repetirse por cuota).`
                : `Provisión global de garantía postventa (ARS ${targetARS.toLocaleString('es-AR')}).`;
        } else if (box.key === 'stock') {
            targetARS = roundMoney(Math.max(comms.ARS, boxMonthlyBudgetARS));
            targetUSD = roundMoney(Math.max(comms.USD, boxMonthlyBudgetUSD));
            const extraText = config.reinvestmentExtraConfigured && config.reinvestmentExtraPct !== null
                ? `Extra de reinversión configurado: ${config.reinvestmentExtraPct}% sobre inversión real.`
                : 'Extra de reinversión (%) aún no configurado.';
            calculationExplanation = `Recibe la recuperación de inversión propia (Paso 2), el extra de reinversión sobre inversión real (Paso 5) y el porcentaje de excedente configurado (Paso 6). ${extraText}`;
        } else if (box.key === 'crecimiento') {
            targetARS = roundMoney(Math.max(comms.ARS, boxMonthlyBudgetARS));
            targetUSD = roundMoney(Math.max(comms.USD, boxMonthlyBudgetUSD));
            const crPctText = config.surplusRule?.configured
                ? `Recibe el ${Number(config.surplusRule.crecimientoPercent || 0)}% del remanente (Paso 6).`
                : 'Sin regla de excedente configurada.';
            calculationExplanation = `Fondo patrimonial de expansión. ${crPctText}`;
        }

        // El faltante real de una caja es lo que resta asignar a su saldo (balance) para cubrir su objetivo/compromisos
        // (Los fondos ya asignados en la caja que reservan compromisos NO vuelven a pedirse como faltante).
        const effectiveRequirementARS = Math.max(targetARS, comms.ARS);
        const effectiveRequirementUSD = Math.max(targetUSD, comms.USD);
        const shortfallARS = roundMoney(Math.max(0, effectiveRequirementARS - balARS));
        const shortfallUSD = roundMoney(Math.max(0, effectiveRequirementUSD - balUSD));
        const coveragePercentARS = effectiveRequirementARS > 0
            ? Math.min(100, Math.round((balARS / effectiveRequirementARS) * 100))
            : 100;
        const coveragePercentUSD = effectiveRequirementUSD > 0
            ? Math.min(100, Math.round((balUSD / effectiveRequirementUSD) * 100))
            : 100;

        // Clasificar el historial de la caja para el modal de Detalle Auditable
        const rawHistory = Array.isArray(box.history) ? [...box.history].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)) : [];
        const contributingCollections = rawHistory
            .filter(h => ['distribucion_cobro', 'recuperacion_capital', 'extra_reinversion', 'reserva_costos_operacion', 'reversion_cobro'].includes(h.type))
            .slice(0, 40)
            .map(h => ({
                id: h._id,
                date: h.date,
                type: h.type,
                step: h.step || null,
                amount: Number(h.amount || 0),
                currency: h.currency || 'ARS',
                reason: h.reason || 'Distribución de cobro',
                user: h.user || 'Sistema',
                sourceIncomeId: h.sourceIncomeId || null,
                saleId: h.saleId || null
            }));

        const historyExpenses = rawHistory
            .filter(h => ['egreso_finanzas', 'reversion_egreso'].includes(h.type))
            .slice(0, 30)
            .map(h => ({
                id: h._id,
                date: h.date,
                type: h.type,
                amount: Number(h.amount || 0),
                currency: h.currency || 'ARS',
                reason: h.reason || 'Movimiento de egreso',
                user: h.user || 'Sistema',
                sourceExpenseId: h.sourceExpenseId || null
            }));

        const transfers = rawHistory
            .filter(h => h.type === 'transferencia_entre_cajas')
            .slice(0, 40)
            .map(h => ({
                id: h._id,
                date: h.date,
                type: h.type,
                amount: Number(h.amount || 0),
                currency: h.currency || 'ARS',
                fromBox: h.fromBox || null,
                toBox: h.toBox || null,
                reason: h.reason || 'Transferencia entre cajas',
                user: h.user || 'Admin'
            }));

        const manualAdjustments = rawHistory
            .filter(h => ['ajuste', 'asignacion_inicial', 'redistribucion_explicita'].includes(h.type))
            .slice(0, 40)
            .map(h => ({
                id: h._id,
                date: h.date,
                type: h.type,
                amount: Number(h.amount || 0),
                currency: h.currency || 'ARS',
                reason: h.reason || 'Ajuste manual',
                user: h.user || 'Admin'
            }));

        return {
            ...box,
            balanceARS: balARS,
            balanceUSD: balUSD,
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
            missingDataNote,
            calculationExplanation,
            paidThisMonthARS: paidMonth.ARS,
            paidThisMonthUSD: paidMonth.USD,
            detail: {
                contributingCollections,
                paidExpenses: paidExpensesByBox[box.key] || [],
                historyExpenses,
                pendingExpenses: comms.items,
                transfers,
                manualAdjustments
            }
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
        .populate('vehicleId', 'brand name year investor jointOwnership consignedBy consignmentCommission agencyOwned ownerName')
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
    // ESTADO DE RECUPERACIÓN DE INVERSIÓN Y EXTRA DE REINVERSIÓN POR OPERACIÓN
    // -------------------------------------------------------------
    const recentSalesDocs = await Sale.find({
        status: { $in: ['confirmada', 'pendiente_entrega', 'entregada'] }
    })
        .populate('vehicleId')
        .populate('clientId', 'firstName lastName fullName')
        .sort({ saleDate: -1 })
        .limit(30)
        .lean();

    const operationStateBySaleId = new Map();
    const operationStateByVehicleId = new Map();
    const operationsRecovery = [];

    for (const sDoc of recentSalesDocs) {
        const st = await loadSaleOperationRecoveryState(sDoc, config);
        if (st) {
            operationStateBySaleId.set(String(sDoc._id), st);
            if (st.vehicleId && !operationStateByVehicleId.has(st.vehicleId)) {
                operationStateByVehicleId.set(st.vehicleId, st);
            }
            operationsRecovery.push(st);
        }
    }

    // -------------------------------------------------------------
    // BANDEJA DE COBROS POSTERIORES AL CORTE CON CASCADA DE 6 PASOS
    // -------------------------------------------------------------
    const inboxCandidates = activeIncomesForOwnership.filter(inc =>
        inc.isTreasuryDistributed !== true &&
        inc.treasuryControl?.inboxStatus !== 'excluido_corte' &&
        inc.treasuryControl?.isBeforeCutoff !== true
    );

    const unassignedIncomeCards = [];
    for (const inc of inboxCandidates) {
        const own = computeIncomeOwnership(inc);
        const curr = inc.currency === 'USD' ? 'USD' : 'ARS';
        const incSaleId = inc.saleId ? String(inc.saleId._id || inc.saleId) : null;
        const incVehId = inc.vehicleId ? String(inc.vehicleId._id || inc.vehicleId) : (inc.carId ? String(inc.carId) : null);

        let opState = null;
        if (incSaleId) {
            opState = operationStateBySaleId.get(incSaleId) || await loadSaleOperationRecoveryState(incSaleId, config, inc._id);
            if (opState) operationStateBySaleId.set(incSaleId, opState);
        } else if (incVehId) {
            opState = operationStateByVehicleId.get(incVehId) || null;
        }

        const waterfall = computeSixStepWaterfallForCollection({
            amount: own.totalAmount,
            currency: curr,
            ownership: own,
            operationState: opState,
            enrichedBoxes,
            config
        });

        unassignedIncomeCards.push({
            id: inc._id,
            _id: inc._id,
            description: inc.description || inc.concept || 'Cobro registrado',
            category: inc.category,
            totalAmount: own.totalAmount,
            tercerosAmount: own.tercerosAmount,
            thirdPartyCapitalReturn: waterfall.thirdPartyCapitalReturn,
            thirdPartyProfitShare: waterfall.thirdPartyProfitShare,
            propioAmount: own.propioAmount,
            thirdPartyOwner: own.thirdPartyOwner,
            currency: curr,
            date: inc.date,
            accountName: inc.accountId?.name || 'Cuenta',
            thirdPartyNote: own.thirdPartyNote,
            saleId: incSaleId || opState?.saleId || null,
            installmentId: inc.installmentId || null,
            vehicleId: incVehId || null,
            waterfallSuggestion: waterfall,
            suggestedAllocations: waterfall.appliedAllocations
        });
    }

    // -------------------------------------------------------------
    // FONDOS PROTEGIDOS Y DISPONIBLE PARA COMPRAR STOCK (SOLO FONDOS PROPIOS)
    // -------------------------------------------------------------
    const reservaBox = enrichedBoxes.find(b => b.key === 'reserva') || { balanceARS: 0, balanceUSD: 0 };
    const impuestosBox = enrichedBoxes.find(b => b.key === 'impuestos') || { balanceARS: 0, balanceUSD: 0, commitmentsARS: 0, commitmentsUSD: 0 };
    const deudasBox = enrichedBoxes.find(b => b.key === 'deudas') || { balanceARS: 0, balanceUSD: 0, commitmentsARS: 0, commitmentsUSD: 0 };
    const stockBox = enrichedBoxes.find(b => b.key === 'stock') || { availableARS: 0, availableUSD: 0 };

    const fondosProtegidosARS = roundMoney((reservaBox.balanceARS || 0) + (impuestosBox.commitmentsARS || 0) + (deudasBox.commitmentsARS || 0));
    const fondosProtegidosUSD = roundMoney((reservaBox.balanceUSD || 0) + (impuestosBox.commitmentsUSD || 0) + (deudasBox.commitmentsUSD || 0));

    // Disponible para comprar: usa exclusivamente fondos propios disponibles en Stock + fondos propios sin asignar (jamás fondos de terceros)
    const availableToBuyARS = roundMoney(Math.max(0, (stockBox.availableARS || 0) + Math.max(0, propiosSinAsignarARS)));
    const availableToBuyUSD = roundMoney(Math.max(0, (stockBox.availableUSD || 0) + Math.max(0, propiosSinAsignarUSD)));

    // Totales de compromisos y faltantes por moneda
    let totalCommitmentsARS = 0;
    let totalCommitmentsUSD = 0;
    let totalShortfallsARS = 0;
    let totalShortfallsUSD = 0;
    enrichedBoxes.forEach(b => {
        totalCommitmentsARS = roundMoney(totalCommitmentsARS + Number(b.commitmentsARS || 0));
        totalCommitmentsUSD = roundMoney(totalCommitmentsUSD + Number(b.commitmentsUSD || 0));
        totalShortfallsARS = roundMoney(totalShortfallsARS + Number(b.shortfallARS || 0));
        totalShortfallsUSD = roundMoney(totalShortfallsUSD + Number(b.shortfallUSD || 0));
    });

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
            projectedARS: roundMoney((totalCuentasARS - retenidosTercerosARS) - (commitmentsByBox.operativa.ARS + commitmentsByBox.impuestos.ARS + commitmentsByBox.deudas.ARS)),
            projectedUSD: roundMoney((totalCuentasUSD - retenidosTercerosUSD) - (commitmentsByBox.operativa.USD + commitmentsByBox.impuestos.USD + commitmentsByBox.deudas.USD)),
            notes: 'Descuenta fondos de terceros, egresos pendientes y gastos operativos calendarizados.'
        },
        {
            period: 'Próximos 60 días',
            days: 60,
            projectedARS: roundMoney((totalCuentasARS - retenidosTercerosARS) - (commitmentsByBox.operativa.ARS + commitmentsByBox.impuestos.ARS + commitmentsByBox.deudas.ARS) - conservativeBurnRateARS),
            projectedUSD: roundMoney((totalCuentasUSD - retenidosTercerosUSD) - (commitmentsByBox.operativa.USD + commitmentsByBox.impuestos.USD + commitmentsByBox.deudas.USD) - conservativeBurnRateUSD),
            notes: 'Escenario conservador sin sumar ventas futuras.'
        },
        {
            period: 'Próximos 90 días',
            days: 90,
            projectedARS: roundMoney((totalCuentasARS - retenidosTercerosARS) - (commitmentsByBox.operativa.ARS + commitmentsByBox.impuestos.ARS + commitmentsByBox.deudas.ARS) - (conservativeBurnRateARS * 2)),
            projectedUSD: roundMoney((totalCuentasUSD - retenidosTercerosUSD) - (commitmentsByBox.operativa.USD + commitmentsByBox.impuestos.USD + commitmentsByBox.deudas.USD) - (conservativeBurnRateUSD * 2)),
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

    // Historial reciente de cobros y distribuciones en Tesorería Estratégica
    const recentCollectionsDocs = await Transaction.find({
        type: { $in: ['Ingreso', 'ingreso'] },
        category: { $nin: EXCLUDED_INBOX_CATEGORIES }
    })
        .populate('accountId', 'name type currency')
        .populate('saleId', 'salePrice saleCurrency customerName buyerName vehicleId')
        .populate('vehicleId', 'brand name year plate plateOrVin')
        .sort({ date: -1, createdAt: -1 })
        .limit(40)
        .lean();

    const recentCollectionsHistory = recentCollectionsDocs.map(t => {
        const bd = t.treasuryBreakdown || {};
        const splits = Array.isArray(t.paymentSplits) && t.paymentSplits.length > 0
            ? t.paymentSplits
            : (t.accountId ? [{
                accountId: t.accountId._id || t.accountId,
                accountName: t.accountId.name || 'Cuenta',
                accountType: t.accountId.type || '',
                paymentMethod: t.paymentMethod,
                amount: t.amount,
                currency: t.currency
            }] : []);

        const veh = t.vehicleId || t.saleId?.vehicleId;
        const vehLabel = veh ? `${veh.brand || ''} ${veh.name || ''} ${veh.year ? '(' + veh.year + ')' : ''}`.trim() : 'Vehículo s/v';
        const plate = veh?.plateOrVin || veh?.plate || '';
        const client = t.clientId?.fullName || t.saleId?.customerName || t.saleId?.buyerName || 'Cliente';

        return {
            id: t._id,
            _id: t._id,
            date: t.date,
            createdAt: t.createdAt,
            amount: t.amount,
            currency: t.currency,
            concept: t.concept || t.description || 'Cobro registrado',
            description: t.description || t.concept || '',
            paymentMethod: t.paymentMethod,
            paymentSplits: splits,
            receiptReference: t.receiptReference || '',
            notes: t.notes || '',
            status: t.status,
            saleId: t.saleId?._id || t.saleId || null,
            clientName: client,
            vehicleLabel: vehLabel,
            plate,
            createdBy: t.createdBy || 'Sistema',
            distributedBy: t.distributedBy || null,
            distributedAt: t.distributedAt || null,
            isTreasuryDistributed: Boolean(t.isTreasuryDistributed && !t.isTreasuryDistributionReversed),
            isTreasuryDistributionReversed: Boolean(t.isTreasuryDistributionReversed),
            inboxStatus: t.treasuryControl?.inboxStatus || (t.isTreasuryDistributed ? 'distribuido' : 'pendiente'),
            installmentId: t.installmentId || null,
            breakdown: {
                totalCollected: Number(bd.totalCollected ?? t.amount ?? 0),
                ownGrossAmount: Number(bd.ownGrossAmount ?? t.amount ?? 0),
                thirdPartyAmount: Number(bd.thirdPartyAmount ?? t.thirdPartyAmount ?? 0),
                capitalRecoveredToStock: Number(bd.capitalRecoveredToStock || 0),
                obligationsSeparated: Number(bd.obligationsSeparated ?? bd.operationPendingCostsReserved ?? 0),
                taxObligationsSeparated: Number(bd.taxObligationsSeparated || 0),
                distributableMargin: Number(bd.distributableMargin ?? bd.marginCollected ?? 0),
                marginDistributed: Number(bd.marginDistributed ?? ((bd.essentialShortfallsCovered || 0) + (bd.reserveCovered || 0) + (bd.extraReinvestmentToStock || 0) + (bd.remainderDistributed || 0))),
                pendingDistributionAmount: Number(bd.pendingDistributionAmount ?? (!t.isTreasuryDistributed ? (t.amount - (t.thirdPartyAmount || 0)) : 0)),
                pendingReason: bd.pendingReason || bd.unassignedReason || null,
                schemeKey: bd.schemeKey || null,
                schemeName: bd.schemeName || null,
                schemePercentages: bd.schemePercentages || null,
                destinationBreakdown: bd.destinationBreakdown || [],
                appliedAllocations: bd.appliedAllocations || []
            }
        };
    });

    const updatedAtIso = new Date().toISOString();
    const isBalancedARS = Math.abs(totalCuentasARS - (propiosAsignadosARS + propiosSinAsignarARS + retenidosTercerosARS)) < 0.01;
    const isBalancedUSD = Math.abs(totalCuentasUSD - (propiosAsignadosUSD + propiosSinAsignarUSD + retenidosTercerosUSD)) < 0.01;
    const reconciliationStatusLabel = isReconciliationConfirmed
        ? `Conciliado (Corte: ${new Date(lastCutoffDate).toLocaleDateString('es-AR')})`
        : 'Pendiente de conciliación inicial';

    const overlappingIndicatorsNote =
        'Aclaración de indicadores superpuestos: (1) El Saldo Real en Cuentas se compone exactamente de Fondos Propios Asignados en Cajas + Fondos Propios Sin Asignar + Fondos de Terceros. (2) Los Compromisos muestran los pagos próximos que están reservados dentro del Saldo Asignado de cada caja (o en Faltantes cuando el saldo asignado aún no alcanza); no son saldo adicional. (3) El Disponible para Comprar Stock combina el Disponible Libre de Caja Stock más los Fondos Propios Sin Asignar, sin incluir nunca fondos de terceros ni fondos protegidos.';

    return {
        accounts: accountsWithAudit,
        boxes: enrichedBoxes,
        categoryRules,
        config,
        operationsRecovery,
        auditInfo: {
            isReconciliationConfirmed,
            lastCutoffDate,
            updatedAt: updatedAtIso,
            reconciliationStatus: reconciliationStatusLabel,
            hasPhysicalCashInconsistency,
            statusLabel: isReconciliationConfirmed
                ? `Corte confirmado: ${new Date(lastCutoffDate).toLocaleDateString('es-AR')} ${new Date(lastCutoffDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Pendiente de corte inicial'
        },
        summary: {
            updatedAt: updatedAtIso,
            reconciliationStatus: reconciliationStatusLabel,
            overlappingIndicatorsNote,
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
            totalCommitmentsARS,
            totalCommitmentsUSD,
            totalShortfallsARS,
            totalShortfallsUSD,
            byCurrency: {
                ARS: {
                    currency: 'ARS',
                    saldoReal: totalCuentasARS,
                    fondosPropiosAsignados: propiosAsignadosARS,
                    fondosPropiosSinAsignar: propiosSinAsignarARS,
                    fondosDeTerceros: retenidosTercerosARS,
                    compromisos: totalCommitmentsARS,
                    faltantes: totalShortfallsARS,
                    disponibleParaComprarStock: availableToBuyARS,
                    updatedAt: updatedAtIso,
                    reconciliationStatus: reconciliationStatusLabel,
                    isBalanced: isBalancedARS
                },
                USD: {
                    currency: 'USD',
                    saldoReal: totalCuentasUSD,
                    fondosPropiosAsignados: propiosAsignadosUSD,
                    fondosPropiosSinAsignar: propiosSinAsignarUSD,
                    fondosDeTerceros: retenidosTercerosUSD,
                    compromisos: totalCommitmentsUSD,
                    faltantes: totalShortfallsUSD,
                    disponibleParaComprarStock: availableToBuyUSD,
                    updatedAt: updatedAtIso,
                    reconciliationStatus: reconciliationStatusLabel,
                    isBalanced: isBalancedUSD
                }
            },
            reconciliationEquation: {
                ARS: {
                    saldoEnCuentas: totalCuentasARS,
                    fondosPropiosAsignados: propiosAsignadosARS,
                    fondosPropiosSinAsignar: propiosSinAsignarARS,
                    fondosRetenidosTerceros: retenidosTercerosARS,
                    isBalanced: isBalancedARS
                },
                USD: {
                    saldoEnCuentas: totalCuentasUSD,
                    fondosPropiosAsignados: propiosAsignadosUSD,
                    fondosPropiosSinAsignar: propiosSinAsignarUSD,
                    fondosRetenidosTerceros: retenidosTercerosUSD,
                    isBalanced: isBalancedUSD
                }
            }
        },
        distributionSchemes: DISTRIBUTION_SCHEMES,
        activeDistributionScheme: config.activeDistributionScheme || null,
        recentCollectionsHistory,
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


/**
 * Busca ventas activas para "Registrar cobro y distribuir" por:
 *  - Nombre del cliente
 *  - Patente
 *  - Marca y modelo
 *  - Número de operación / ID
 */
export async function searchSalesForCollection(query = {}) {
    const { q = '', limit = 25, saleId = null } = query;
    const cfg = await getOrCreateTreasuryConfig();

    if (saleId && mongoose.Types.ObjectId.isValid(saleId)) {
        const saleDoc = await Sale.findById(saleId)
            .populate('vehicleId')
            .populate('clientId')
            .lean();
        if (!saleDoc) return [];
        const state = await loadSaleOperationRecoveryState(saleDoc, cfg);
        return state ? [state] : [];
    }

    const trimmed = String(q || '').trim();
    const filter = {
        status: { $nin: ['cancelada', 'borrador'] }
    };

    let sales = [];
    if (trimmed) {
        const regex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\// 10. Flujo "Cobrar y Distribuir" (Una Sola Carga)'), 'i');
        
        // Buscar clientes coincidentes
        const matchingClients = await Client.find({
            $or: [
                { firstName: regex },
                { lastName: regex },
                { fullName: regex },
                { dni: regex }
            ]
        }).select('_id').lean();
        const clientIds = matchingClients.map(c => c._id);

        // Buscar vehículos coincidentes
        const matchingCars = await Car.find({
            $or: [
                { brand: regex },
                { name: regex },
                { model: regex },
                { plateOrVin: regex },
                { plate: regex }
            ]
        }).select('_id').lean();
        const carIds = matchingCars.map(c => c._id);

        const idMatches = [];
        if (mongoose.Types.ObjectId.isValid(trimmed)) {
            idMatches.push({ _id: new mongoose.Types.ObjectId(trimmed) });
        }

        filter.$or = [
            ...idMatches,
            { customerName: regex },
            { buyerName: regex },
            { operationNumber: regex },
            ...(clientIds.length > 0 ? [{ clientId: { $in: clientIds } }] : []),
            ...(carIds.length > 0 ? [{ vehicleId: { $in: carIds } }] : [])
        ];
    }

    sales = await Sale.find(filter)
        .populate('vehicleId')
        .populate('clientId')
        .sort({ saleDate: -1, createdAt: -1 })
        .limit(Math.min(50, Math.max(1, Number(limit) || 25)))
        .lean();

    const results = [];
    for (const s of sales) {
        const state = await loadSaleOperationRecoveryState(s, cfg);
        if (state) {
            results.push(state);
        }
    }

    return results;
}

/**
 * Resumen integral de Tesorería para una venta específica (utilizado por el modal y el panel de detalle)
 */
export async function getSaleTreasurySummary(saleId) {
    await ensureDefaultBoxes();
    if (!saleId || !mongoose.Types.ObjectId.isValid(saleId)) {
        throw new Error('ID de venta inválido.');
    }
    const cfg = await getOrCreateTreasuryConfig();
    const [accounts, boxes] = await Promise.all([
        Account.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean(),
        TreasuryBox.find().lean()
    ]);

    const state = await loadSaleOperationRecoveryState(saleId, cfg);
    if (!state) {
        throw new Error('Venta no encontrada.');
    }

    return {
        ok: true,
        summary: state,
        saleState: state,
        accounts: accounts.map(a => ({
            id: a._id,
            _id: a._id,
            name: a.name,
            type: a.type,
            currency: a.currency,
            balance: a.balance
        })),
        activeDistributionScheme: cfg.activeDistributionScheme || null,
        schemes: DISTRIBUTION_SCHEMES
    };
}

/**
 * Previsualización server-side de la propuesta de cobro y distribución antes de confirmar
 */
export async function previewSaleCollectionDistribution(payload = {}) {
    await ensureDefaultBoxes();
    const {
        saleId,
        installmentId = null,
        transactionId = null,
        amount,
        currency = 'ARS',
        schemeKey = null,
        registeredTaxAmount = 0,
        forcePendingDistribution = false
    } = payload;

    const numAmount = roundMoney(Number(amount || 0));
    if (numAmount <= 0) {
        throw new Error('El importe debe ser mayor a cero.');
    }

    const cfg = await getOrCreateTreasuryConfig();
    const boxes = await TreasuryBox.find().lean();

    let resolvedSaleId = saleId;
    let linkedInstallment = null;

    if (installmentId && mongoose.Types.ObjectId.isValid(installmentId)) {
        linkedInstallment = await Installment.findById(installmentId).lean();
        if (linkedInstallment?.saleId) {
            resolvedSaleId = linkedInstallment.saleId;
        }
    }

    if (!resolvedSaleId || !mongoose.Types.ObjectId.isValid(resolvedSaleId)) {
        throw new Error('Debés seleccionar una venta válida.');
    }

    const saleDoc = await Sale.findById(resolvedSaleId).populate('vehicleId').populate('clientId').lean();
    if (!saleDoc) {
        throw new Error('Venta no encontrada.');
    }

    const saleCurrency = saleDoc.saleCurrency === 'USD' ? 'USD' : 'ARS';
    const cleanCurrency = currency === 'USD' ? 'USD' : 'ARS';
    if (saleCurrency !== cleanCurrency) {
        throw new Error(`El cobro (${cleanCurrency}) no coincide con la moneda pactada de la venta (${saleCurrency}). Respetá la moneda de la operación sin conversiones silenciosas.`);
    }

    if (linkedInstallment) {
        if (['pagada', 'anulada'].includes(linkedInstallment.status)) {
            throw new Error(`La cuota #${linkedInstallment.installmentNumber} ya figura como ${linkedInstallment.status}.`);
        }
        const pendingInst = roundMoney(Math.max(0, Number(linkedInstallment.amount || 0) - Number(linkedInstallment.paidAmount || 0)));
        if (numAmount > pendingInst + 0.01) {
            throw new Error(`El importe (${cleanCurrency} ${numAmount.toLocaleString('es-AR')}) supera el saldo pendiente de la cuota #${linkedInstallment.installmentNumber} (${cleanCurrency} ${pendingInst.toLocaleString('es-AR')}).`);
        }
    }

    const opState = await loadSaleOperationRecoveryState(saleDoc, cfg, transactionId);
    const vehicleDoc = saleDoc.vehicleId && typeof saleDoc.vehicleId === 'object' ? saleDoc.vehicleId : null;
    const ownership = computeIncomeOwnership({
        amount: numAmount,
        currency: cleanCurrency,
        vehicleId: vehicleDoc
    });

    const proposal = computeSchemeDistributionForCollection({
        amount: numAmount,
        currency: cleanCurrency,
        ownership,
        operationState: opState,
        schemeKey,
        enrichedBoxes: boxes,
        config: cfg,
        registeredTaxAmount,
        forcePendingDistribution
    });

    // Proyección de acumuladores de la venta post-cobro
    const projectedSaleState = {
        agreedPrice: opState.agreedPrice,
        effectivelyCollectedCash: roundMoney(Number(opState.effectivelyCollectedCash || 0) + numAmount),
        pendingSaleBalance: roundMoney(Math.max(0, Number(opState.pendingSaleBalance || 0) - numAmount)),
        alreadyRecoveredCapital: roundMoney(Number(opState.alreadyRecoveredCapital || 0) + Number(proposal.capitalRecoveredToStock || 0)),
        remainingCapitalToRecover: roundMoney(Math.max(0, Number(opState.remainingCapitalToRecover || 0) - Number(proposal.capitalRecoveredToStock || 0))),
        alreadyAllocatedExtraReinvestment: roundMoney(Number(opState.alreadyAllocatedExtraReinvestment || 0) + Number(proposal.extraReinvestmentToStock || 0)),
        remainingExtraReinvestmentTarget: roundMoney(Math.max(0, Number(opState.remainingExtraReinvestmentTarget || 0) - Number(proposal.extraReinvestmentToStock || 0))),
        alreadyReservedPendingCosts: roundMoney(Number(opState.alreadyReservedPendingCosts || 0) + Number(proposal.obligationsSeparated || 0)),
        remainingPendingCostsToReserve: roundMoney(Math.max(0, Number(opState.remainingPendingCostsToReserve || 0) - Number(proposal.obligationsSeparated || 0))),
        alreadyDistributedMargin: roundMoney(Number(opState.alreadyDistributedMargin || 0) + Number(proposal.marginDistributed || 0)),
        pendingDistributionAmount: roundMoney(Number(opState.pendingDistributionAmount || 0) + Number(proposal.pendingDistributionAmount || 0))
    };

    return {
        ok: true,
        proposal,
        saleState: opState,
        projectedSaleState,
        schemes: DISTRIBUTION_SCHEMES,
        activeDistributionScheme: cfg.activeDistributionScheme || null
    };
}

// 10. Flujo "Cobrar y Distribuir" (Una Sola Carga)


function normalizeTreasuryPaymentMethod(pm) {
    if (!pm) return 'transferencia';
    const s = String(pm).trim();
    const lower = s.toLowerCase();
    if (lower.includes('transf')) {
        if (lower.includes('galicia')) return 'transferencia BANCO GALICIA';
        if (lower.includes('santander')) return 'transferencia BANCO SANTANDER';
        if (lower.includes('nacion') || lower.includes('nación')) return 'transferencia BANCO NACION';
        return 'transferencia';
    }
    if (lower.includes('efect')) return 'efectivo';
    if (lower.includes('tarj')) return 'tarjeta';
    if (lower.includes('cheq')) return 'cheque';
    if (lower.includes('dolar') || lower.includes('dólar')) return 'dolares';
    if (lower.includes('deposit') || lower.includes('depósito')) return 'deposito';
    if (lower.includes('mixt')) return 'mixto';
    return lower;
}

// 10. Flujo "Cobrar y Distribuir" (Una Sola Carga, Idempotencia y Destinos Múltiples)
export async function collectAndDistribute(payload, user) {
    await ensureDefaultBoxes();
    const {
        idempotencyKey = null,
        installmentId = null,
        saleId = null,
        vehicleId: explicitVehicleId = null,
        clientId: explicitClientId = null,
        amount,
        currency = 'ARS',
        accountId = null,
        paymentMethod = 'transferencia',
        paymentSplits = null, // [{ accountId, paymentMethod, amount }]
        conceptType = 'otro', // 'entrega_inicial' | 'saldo' | 'cuota' | 'otro'
        concept: customConcept = null,
        date = new Date(),
        notes = '',
        receiptReference = '',
        comprobante = '',
        schemeKey = null,
        saveAsActiveScheme = false,
        distributeNow = true,
        forcePendingDistribution = false,
        registeredTaxAmount = 0,
        // Legacy fallback
        useSuggested = false,
        distributions = []
    } = payload || {};

    const userName = user?.name || user?.email || user?.username || 'Admin';

    // 0. Protección estricta contra doble envío / reintentos (Idempotencia)
    if (idempotencyKey && String(idempotencyKey).trim()) {
        const cleanIdemp = String(idempotencyKey).trim();
        const existingTx = await Transaction.findOne({ idempotencyKey: cleanIdemp })
            .populate('accountId', 'name type currency')
            .lean();
        if (existingTx) {
            return {
                ok: true,
                idempotentReplay: true,
                transactionId: existingTx._id,
                amount: existingTx.amount,
                currency: existingTx.currency,
                isTreasuryDistributed: existingTx.isTreasuryDistributed,
                message: 'Cobro procesado previamente (idempotencia confirmada). No se duplicaron movimientos ni saldos.'
            };
        }
    }

    const payAmount = roundMoney(Number(amount || 0));
    if (isNaN(payAmount) || payAmount <= 0) {
        throw new Error('El importe a cobrar debe ser mayor a cero.');
    }

    const cleanCurrency = currency === 'USD' ? 'USD' : 'ARS';

    // 1. Resolver y validar la Venta y la Cuota
    let linkedInstallment = null;
    let resolvedSaleId = saleId;

    if (installmentId && mongoose.Types.ObjectId.isValid(installmentId)) {
        linkedInstallment = await Installment.findById(installmentId);
        if (!linkedInstallment) {
            throw new Error('Cuota no encontrada.');
        }
        if (linkedInstallment.status === 'pagada') {
            throw new Error(`La cuota #${linkedInstallment.installmentNumber} ya figura como pagada.`);
        }
        if (linkedInstallment.status === 'anulada') {
            throw new Error(`La cuota #${linkedInstallment.installmentNumber} está anulada.`);
        }
        if (linkedInstallment.currency !== cleanCurrency) {
            throw new Error(`La moneda del cobro (${cleanCurrency}) no coincide con la moneda de la cuota (${linkedInstallment.currency}).`);
        }
        const pendingInst = roundMoney(Math.max(0, Number(linkedInstallment.amount || 0) - Number(linkedInstallment.paidAmount || 0)));
        if (payAmount > pendingInst + 0.01) {
            throw new Error(`El importe (${cleanCurrency} ${payAmount.toLocaleString('es-AR')}) supera el saldo pendiente de la cuota #${linkedInstallment.installmentNumber} (${cleanCurrency} ${pendingInst.toLocaleString('es-AR')}).`);
        }
        if (!resolvedSaleId && linkedInstallment.saleId) {
            resolvedSaleId = linkedInstallment.saleId;
        }
    }

    if (!resolvedSaleId || !mongoose.Types.ObjectId.isValid(resolvedSaleId)) {
        throw new Error('Debés seleccionar una operación de venta vinculada.');
    }

    const saleDoc = await Sale.findById(resolvedSaleId)
        .populate('vehicleId')
        .populate('clientId');
    if (!saleDoc) {
        throw new Error('Venta vinculada no encontrada.');
    }

    const saleCurrency = saleDoc.saleCurrency === 'USD' ? 'USD' : 'ARS';
    if (saleCurrency !== cleanCurrency) {
        throw new Error(`El cobro (${cleanCurrency}) no coincide con la moneda pactada de la venta (${saleCurrency}). No se permiten conversiones silenciosas.`);
    }

    // 2. Resolver destinos del cobro (cuenta única o pago dividido)
    const resolvedSplits = [];
    if (Array.isArray(paymentSplits) && paymentSplits.length > 0) {
        let sumSplits = 0;
        for (const sp of paymentSplits) {
            const spAmount = roundMoney(Number(sp.amount || 0));
            if (spAmount <= 0) continue;
            if (!sp.accountId) {
                throw new Error('Cada división de cobro debe tener una cuenta o caja de destino seleccionada.');
            }
            const acc = await Account.findById(sp.accountId);
            if (!acc) throw new Error('Cuenta de destino no encontrada.');
            if (acc.currency !== cleanCurrency) {
                throw new Error(`La cuenta "${acc.name}" (${acc.currency}) no coincide con la moneda del cobro (${cleanCurrency}).`);
            }
            resolvedSplits.push({
                accountId: acc._id,
                accountName: acc.name,
                accountType: acc.type,
                paymentMethod: normalizeTreasuryPaymentMethod(sp.paymentMethod || paymentMethod),
                amount: spAmount,
                currency: cleanCurrency
            });
            sumSplits = roundMoney(sumSplits + spAmount);
        }

        if (Math.abs(sumSplits - payAmount) > 0.01) {
            throw new Error(`La suma de los destinos (${cleanCurrency} ${sumSplits.toLocaleString('es-AR')}) debe coincidir exactamente con el total cobrado (${cleanCurrency} ${payAmount.toLocaleString('es-AR')}).`);
        }
    } else {
        if (!accountId) {
            throw new Error('Seleccioná la caja física o cuenta bancaria de destino.');
        }
        const acc = await Account.findById(accountId);
        if (!acc) throw new Error('Cuenta receptora no encontrada.');
        if (acc.currency !== cleanCurrency) {
            throw new Error(`La cuenta "${acc.name}" (${acc.currency}) no coincide con la moneda del cobro (${cleanCurrency}).`);
        }
        resolvedSplits.push({
            accountId: acc._id,
            accountName: acc.name,
            accountType: acc.type,
            paymentMethod: normalizeTreasuryPaymentMethod(paymentMethod),
            amount: payAmount,
            currency: cleanCurrency
        });
    }

    // 3. Construir concepto claro y legible
    let conceptLabel = customConcept || payload.description || '';
    if (!conceptLabel) {
        if (linkedInstallment) {
            conceptLabel = `Cobro Cuota #${linkedInstallment.installmentNumber}`;
        } else if (conceptType === 'entrega_inicial') {
            conceptLabel = 'Entrega inicial';
        } else if (conceptType === 'saldo') {
            conceptLabel = 'Saldo de venta';
        } else {
            conceptLabel = 'Cobro vinculado a venta';
        }
    }

    const receiptRef = receiptReference || comprobante || '';

    // 4. Calcular propuesta de distribución con el esquema acordado
    const cfg = await getOrCreateTreasuryConfig();
    const boxes = await TreasuryBox.find().lean();
    const opState = await loadSaleOperationRecoveryState(saleDoc, cfg);
    const vehicleDoc = saleDoc.vehicleId && typeof saleDoc.vehicleId === 'object' ? saleDoc.vehicleId : null;
    const ownership = computeIncomeOwnership({
        amount: payAmount,
        currency: cleanCurrency,
        vehicleId: vehicleDoc
    });

    const proposal = computeSchemeDistributionForCollection({
        amount: payAmount,
        currency: cleanCurrency,
        ownership,
        operationState: opState,
        schemeKey,
        enrichedBoxes: boxes,
        config: cfg,
        registeredTaxAmount,
        forcePendingDistribution: (!distributeNow || forcePendingDistribution)
    });

    // 5. Registrar el cobro UNA SOLA VEZ
    const tx = new Transaction({
        type: 'Ingreso',
        amount: payAmount,
        currency: cleanCurrency,
        description: conceptLabel,
        concept: conceptLabel,
        category: payload.category || (linkedInstallment ? 'Cobro cuota' : 'Cobro venta'),
        paymentMethod: normalizeTreasuryPaymentMethod(resolvedSplits[0]?.paymentMethod || paymentMethod),
        accountId: resolvedSplits[0]?.accountId,
        paymentSplits: resolvedSplits,
        receiptReference: receiptRef,
        date: new Date(date),
        saleId: saleDoc._id,
        installmentId: linkedInstallment?._id || undefined,
        installmentPaidAmountApplied: linkedInstallment ? payAmount : 0,
        clientId: saleDoc.clientId?._id || saleDoc.clientId || explicitClientId || undefined,
        vehicleId: vehicleDoc?._id || explicitVehicleId || undefined,
        thirdPartyAmount: ownership.tercerosAmount,
        thirdPartyOwner: ownership.thirdPartyOwner,
        thirdPartyCapitalReturn: proposal.thirdPartyCapitalReturn || 0,
        thirdPartyProfitShare: proposal.thirdPartyProfitShare || 0,
        notes: notes || '',
        module: 'crm_v2',
        source: linkedInstallment ? 'cuota' : 'venta',
        status: 'activo',
        isTreasuryDistributed: !proposal.isPendingDistribution,
        isTreasuryDistributionReversed: false,
        distributedAt: !proposal.isPendingDistribution ? new Date() : null,
        distributedBy: !proposal.isPendingDistribution ? userName : null,
        treasuryBreakdown: proposal,
        treasuryControl: {
            inboxStatus: proposal.isPendingDistribution ? 'pendiente' : 'distribuido',
            isBeforeCutoff: false
        },
        idempotencyKey: idempotencyKey ? String(idempotencyKey).trim() : undefined,
        createdBy: userName,
        transactionAuditLog: [{
            action: 'COBRO_TESORERIA_DISTRIBUIDO',
            details: `Cobro de ${cleanCurrency} ${payAmount.toLocaleString('es-AR')} acreditado en ${resolvedSplits.map(s => `${s.accountName} (${cleanCurrency} ${s.amount.toLocaleString('es-AR')})`).join(' + ')}. ${proposal.isPendingDistribution ? 'Queda pendiente de distribución.' : `Distribuido con esquema ${proposal.schemeName || 'Directo'}.`}`,
            user: userName,
            date: new Date()
        }]
    });
    await tx.save();

    // 6. Acreditar saldo en las cuentas de destino
    for (const split of resolvedSplits) {
        const acc = await Account.findById(split.accountId);
        if (acc) {
            acc.balance = roundMoney(Number(acc.balance || 0) + split.amount);
            await acc.save();
        }
    }

    // 7. Imputar pago a la cuota si corresponde
    if (linkedInstallment) {
        const prevPaid = Number(linkedInstallment.paidAmount || 0);
        const nextPaid = roundMoney(prevPaid + payAmount);
        const instTotal = Number(linkedInstallment.amount || 0);

        linkedInstallment.paidAmount = nextPaid;
        linkedInstallment.status = nextPaid >= roundMoney(instTotal - 0.01) ? 'pagada' : 'parcial';
        linkedInstallment.paymentDate = new Date(date);
        linkedInstallment.installmentAuditLog.push({
            action: 'COBRO_REGISTRADO',
            user: userName,
            date: new Date(),
            details: `Cobro registrado vía Tesorería Estratégica por ${cleanCurrency} ${payAmount.toLocaleString('es-AR')} (Total pagado: ${cleanCurrency} ${nextPaid.toLocaleString('es-AR')} de ${cleanCurrency} ${instTotal.toLocaleString('es-AR')})`
        });
        await linkedInstallment.save();
    }

    // 8. Aplicar distribución interna a Cajas si no quedó pendiente
    let distributedTotal = 0;
    if (!proposal.isPendingDistribution && Array.isArray(proposal.appliedAllocations)) {
        for (const alloc of proposal.appliedAllocations) {
            const amt = roundMoney(Number(alloc.amount || 0));
            if (amt <= 0) continue;
            const box = await TreasuryBox.findOne({ key: alloc.boxKey });
            if (box) {
                const prevBal = cleanCurrency === 'USD' ? (box.balanceUSD || 0) : (box.balanceARS || 0);
                const nextBal = roundMoney(prevBal + amt);
                if (cleanCurrency === 'USD') {
                    box.balanceUSD = nextBal;
                } else {
                    box.balanceARS = nextBal;
                }
                box.history.push({
                    date: new Date(),
                    type: alloc.historyType || 'distribucion_cobro',
                    step: alloc.step || 'paso_3_margen_esquema',
                    amount: amt,
                    currency: cleanCurrency,
                    reason: alloc.reason || `Cobro #${tx._id} (${conceptLabel})`,
                    user: userName,
                    sourceIncomeId: tx._id,
                    saleId: saleDoc._id
                });

                const auditEntry = new TreasuryAuditLog({
                    operationId: 'col_' + tx._id,
                    actionType: alloc.historyType === 'recuperacion_capital' ? 'recuperacion_capital' : 'distribucion_cobro',
                    boxKey: box.key,
                    boxName: box.name,
                    currency: cleanCurrency,
                    amount: amt,
                    balanceBefore: prevBal,
                    balanceAfter: nextBal,
                    reason: alloc.reason || `Cobro #${tx._id} (${conceptLabel})`,
                    user: userName,
                    userRole: user?.role || 'Admin',
                    saleId: saleDoc._id,
                    saleIdentifier: saleDoc.vehicleDetails?.plate || saleDoc.client?.name || String(saleDoc._id),
                    incomeId: tx._id,
                    date: new Date()
                });

                await Promise.all([box.save(), auditEntry.save()]);
                distributedTotal = roundMoney(distributedTotal + amt);
            }
        }
    }

    // 9. Actualizar esquema activo en configuración si se solicitó o si estaba vacío
    if (schemeKey && DISTRIBUTION_SCHEMES[schemeKey] && (saveAsActiveScheme || !cfg.activeDistributionScheme)) {
        cfg.activeDistributionScheme = schemeKey;
        cfg.updatedBy = userName;
        await cfg.save();
    }

    // 10. Cargar estado actualizado de la venta post-cobro
    const updatedSaleState = await loadSaleOperationRecoveryState(saleDoc._id, cfg);

    return {
        ok: true,
        transactionId: tx._id,
        amount: payAmount,
        currency: cleanCurrency,
        concept: conceptLabel,
        isTreasuryDistributed: !proposal.isPendingDistribution,
        distributedTotal,
        proposal,
        paymentSplits: resolvedSplits,
        saleState: updatedSaleState,
        summary: {
            totalCollected: payAmount,
            capitalRecovered: proposal.capitalRecoveredToStock || 0,
            obligationsSeparated: proposal.obligationsSeparated || 0,
            extraReinvestmentToStock: proposal.extraReinvestmentToStock || 0,
            distributableMargin: proposal.distributableMargin || 0,
            marginDistributed: proposal.marginDistributed || 0,
            totalDistributedToBoxes: distributedTotal,
            pendingDistribution: proposal.pendingDistributionAmount || 0,
            pendingReason: proposal.pendingReason || null,
            schemeUsed: proposal.schemeName || 'Sin esquema (Pendiente)',
            destinations: proposal.destinationBreakdown || [],
            accountsCredited: resolvedSplits
        },
        message: proposal.isPendingDistribution
            ? `Cobro de ${cleanCurrency} ${payAmount.toLocaleString('es-AR')} acreditado en cuenta y registrado como Pendiente de distribución (${proposal.pendingReason || 'Faltan datos'}).`
            : `Cobro y distribución de ${cleanCurrency} ${payAmount.toLocaleString('es-AR')} completados con éxito bajo el esquema ${proposal.schemeName || 'acordado'}.`
    };
}


export async function updateTreasuryConfig(payload, user) {
    const userName = user?.name || user?.email || 'Admin';
    const cfg = await getOrCreateTreasuryConfig();

    if (payload.activeDistributionScheme !== undefined) {
        if (payload.activeDistributionScheme === null || payload.activeDistributionScheme === '') {
            cfg.activeDistributionScheme = null;
        } else if (DISTRIBUTION_SCHEMES[payload.activeDistributionScheme]) {
            cfg.activeDistributionScheme = payload.activeDistributionScheme;
        } else {
            throw new Error('Esquema de distribución inválido. Elegí Caja ajustada, Estabilización o Caja sólida.');
        }
    }
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

    // Extra de reinversión sobre inversión real (%): admite decimales y 0%, sin fijar porcentaje arbitrario sin configuración
    if (payload.reinvestmentExtraConfigured !== undefined) {
        cfg.reinvestmentExtraConfigured = Boolean(payload.reinvestmentExtraConfigured);
    }
    if (payload.reinvestmentExtraPct !== undefined) {
        if (payload.reinvestmentExtraPct === null || payload.reinvestmentExtraPct === '') {
            cfg.reinvestmentExtraPct = null;
            if (payload.reinvestmentExtraConfigured === undefined) {
                cfg.reinvestmentExtraConfigured = false;
            }
        } else {
            const parsedPct = Number(String(payload.reinvestmentExtraPct).replace(',', '.'));
            if (!Number.isFinite(parsedPct) || parsedPct < 0 || parsedPct > 100) {
                throw new Error('El Extra de reinversión (%) debe ser un número entre 0 y 100 (admite decimales y 0%).');
            }
            cfg.reinvestmentExtraPct = roundMoney(parsedPct);
            if (payload.reinvestmentExtraConfigured === undefined) {
                cfg.reinvestmentExtraConfigured = true;
            }
        }
    }

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

    // Sincronizar parámetros en TreasuryBox si corresponde (los cambios de reglas se aplican a nuevos movimientos, sin deshacer saldos existentes)
    if (cfg.reserveMonths) {
        await TreasuryBox.findOneAndUpdate({ key: 'reserva' }, { reserveMonths: cfg.reserveMonths });
    }
    if (cfg.personalMonthlyBudgetARS !== undefined) {
        await TreasuryBox.findOneAndUpdate({ key: 'personal' }, { monthlyBudgetARS: cfg.personalMonthlyBudgetARS });
    }

    return {
        ok: true,
        config: cfg,
        message: 'Configuración de Tesorería guardada con éxito. Las nuevas reglas se aplican a los próximos movimientos (los fondos ya asignados no se redistribuyen sin tu confirmación explícita).'
    };
}

// 12. Traspaso entre Cajas (Con Vista Previa, Motivo Obligatorio y Alerta de Consumo de Capital de Stock)
export async function transferBetweenBoxes(payload, user) {
    const {
        fromBoxKey,
        toBoxKey,
        amount,
        currency = 'ARS',
        reason,
        previewOnly = false
    } = payload || {};
    const numAmount = roundMoney(Math.abs(Number(amount) || 0));
    const curr = currency === 'USD' ? 'USD' : 'ARS';

    if (numAmount <= 0) throw new Error('El importe debe ser mayor a cero.');
    if (!fromBoxKey || !toBoxKey || fromBoxKey === toBoxKey) throw new Error('Elegí cajas de origen y destino distintas.');
    if (!previewOnly && (!reason || !String(reason).trim())) {
        throw new Error('Debés indicar un motivo obligatorio para transferir fondos entre cajas.');
    }

    const fromBox = await TreasuryBox.findOne({ key: fromBoxKey });
    const toBox = await TreasuryBox.findOne({ key: toBoxKey });
    if (!fromBox || !toBox) throw new Error('Caja inexistente.');

    const field = curr === 'USD' ? 'balanceUSD' : 'balanceARS';
    const fromBefore = roundMoney(Number(fromBox[field]) || 0);
    const toBefore = roundMoney(Number(toBox[field]) || 0);
    const fromAfter = roundMoney(fromBefore - numAmount);
    const toAfter = roundMoney(toBefore + numAmount);

    const consumesStockCapital = fromBoxKey === 'stock' && ['operativa', 'impuestos', 'deudas', 'personal', 'postventa'].includes(toBoxKey);
    const stockConsumptionWarning = consumesStockCapital
        ? `Atención: estás reasignando ${curr} ${numAmount.toLocaleString('es-AR')} de capital de Caja Stock hacia ${toBox.name}. Esto reduce el capital disponible para reponer vehículos de ${curr} ${fromBefore.toLocaleString('es-AR')} a ${curr} ${Math.max(0, fromAfter).toLocaleString('es-AR')} y no modifica el saldo bancario.`
        : null;

    const previewData = {
        currency: curr,
        amount: numAmount,
        fromBox: {
            key: fromBox.key,
            name: fromBox.name,
            balanceBefore: fromBefore,
            balanceAfter: fromAfter
        },
        toBox: {
            key: toBox.key,
            name: toBox.name,
            balanceBefore: toBefore,
            balanceAfter: toAfter
        },
        affectsBankBalances: false,
        consumesStockCapital,
        stockConsumptionWarning
    };

    if (previewOnly) {
        return {
            ok: true,
            isPreview: true,
            preview: previewData,
            message: stockConsumptionWarning || `Vista previa: transferencia de ${curr} ${numAmount.toLocaleString('es-AR')} desde ${fromBox.name} hacia ${toBox.name} (sin modificar cuentas bancarias).`
        };
    }

    const cleanReason = String(reason).trim();
    if (fromBefore < numAmount) {
        throw new Error(`Saldo insuficiente en ${fromBox.name} (${curr} ${fromBefore.toLocaleString('es-AR')}) para transferir ${curr} ${numAmount.toLocaleString('es-AR')}. No se permiten saldos negativos.`);
    }

    fromBox[field] = fromAfter;
    toBox[field] = toAfter;

    const userName = user?.name || user?.email || 'Admin';
    const userRole = user?.role || 'Admin';
    const opId = 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    fromBox.history.push({
        date: new Date(),
        type: 'transferencia_entre_cajas',
        amount: -numAmount,
        currency: curr,
        fromBox: fromBox.name,
        toBox: toBox.name,
        reason: cleanReason,
        user: userName
    });
    toBox.history.push({
        date: new Date(),
        type: 'transferencia_entre_cajas',
        amount: numAmount,
        currency: curr,
        fromBox: fromBox.name,
        toBox: toBox.name,
        reason: cleanReason,
        user: userName
    });

    const auditFrom = new TreasuryAuditLog({
        operationId: opId,
        actionType: 'transferencia_entre_cajas',
        boxKey: fromBox.key,
        boxName: fromBox.name,
        targetBoxKey: toBox.key,
        targetBoxName: toBox.name,
        currency: curr,
        amount: -numAmount,
        balanceBefore: fromBefore,
        balanceAfter: fromAfter,
        reason: cleanReason,
        user: userName,
        userRole,
        date: new Date()
    });

    const auditTo = new TreasuryAuditLog({
        operationId: opId,
        actionType: 'transferencia_entre_cajas',
        boxKey: toBox.key,
        boxName: toBox.name,
        targetBoxKey: fromBox.key,
        targetBoxName: fromBox.name,
        currency: curr,
        amount: numAmount,
        balanceBefore: toBefore,
        balanceAfter: toAfter,
        reason: cleanReason,
        user: userName,
        userRole,
        date: new Date()
    });

    await Promise.all([fromBox.save(), toBox.save(), auditFrom.save(), auditTo.save()]);

    return {
        ok: true,
        preview: previewData,
        message: `Traspaso de ${curr} ${numAmount.toLocaleString('es-AR')} desde ${fromBox.name} a ${toBox.name} realizado con éxito.`
    };
}

// 13. Distribuir / Editar Asignación de Fondos en Cajas (Con Vista Previa y Motivo Obligatorio)
export async function distributeToBoxes(payload, user) {
    await ensureDefaultBoxes();
    const {
        distributions = [],
        allocations = [],
        reason,
        previewOnly = false
    } = payload || {};
    const userName = user?.name || user?.email || 'Admin';
    const items = Array.isArray(allocations) && allocations.length > 0 ? allocations : (distributions || []);

    if (!previewOnly && (!reason || !String(reason).trim())) {
        throw new Error('Debés indicar un motivo obligatorio para editar la asignación de las cajas.');
    }
    const cleanReason = reason ? String(reason).trim() : 'Vista previa de edición de caja';

    const changesPreview = [];

    for (const dist of items) {
        const box = await TreasuryBox.findOne({ key: dist.boxKey });
        if (!box) continue;

        const prevARS = roundMoney(Number(box.balanceARS || 0));
        const prevUSD = roundMoney(Number(box.balanceUSD || 0));
        const valARS = dist.amountARS !== undefined ? dist.amountARS : (dist.assignARS !== undefined ? dist.assignARS : dist.balanceARS);
        const valUSD = dist.amountUSD !== undefined ? dist.amountUSD : (dist.assignUSD !== undefined ? dist.assignUSD : dist.balanceUSD);

        const nextARS = valARS !== undefined ? roundMoney(Number(valARS)) : prevARS;
        const nextUSD = valUSD !== undefined ? roundMoney(Number(valUSD)) : prevUSD;
        const diffARS = roundMoney(nextARS - prevARS);
        const diffUSD = roundMoney(nextUSD - prevUSD);

        changesPreview.push({
            boxKey: box.key,
            boxName: box.name,
            balanceARSBefore: prevARS,
            balanceARSAfter: nextARS,
            diffARS,
            balanceUSDBefore: prevUSD,
            balanceUSDAfter: nextUSD,
            diffUSD
        });

        if (!previewOnly) {
            const auditLogs = [];
            const opId = 'dist_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
            const userRole = user?.role || 'Admin';

            if (valARS !== undefined) {
                box.balanceARS = nextARS;
                if (Math.abs(diffARS) > 0) {
                    box.history.push({ date: new Date(), type: 'ajuste', amount: diffARS, currency: 'ARS', reason: cleanReason, user: userName });
                    auditLogs.push(new TreasuryAuditLog({
                        operationId: opId,
                        actionType: 'ajuste_saldo',
                        boxKey: box.key,
                        boxName: box.name,
                        currency: 'ARS',
                        amount: diffARS,
                        balanceBefore: prevARS,
                        balanceAfter: nextARS,
                        reason: cleanReason,
                        user: userName,
                        userRole,
                        date: new Date()
                    }));
                }
            }
            if (valUSD !== undefined) {
                box.balanceUSD = nextUSD;
                if (Math.abs(diffUSD) > 0) {
                    box.history.push({ date: new Date(), type: 'ajuste', amount: diffUSD, currency: 'USD', reason: cleanReason, user: userName });
                    auditLogs.push(new TreasuryAuditLog({
                        operationId: opId,
                        actionType: 'ajuste_saldo',
                        boxKey: box.key,
                        boxName: box.name,
                        currency: 'USD',
                        amount: diffUSD,
                        balanceBefore: prevUSD,
                        balanceAfter: nextUSD,
                        reason: cleanReason,
                        user: userName,
                        userRole,
                        date: new Date()
                    }));
                }
            }
            const configMods = [];
            if (dist.targetPercent !== undefined && Number(dist.targetPercent) !== box.targetPercent) {
                configMods.push({ fieldName: 'targetPercent', fieldLabel: 'Meta %', previousValue: box.targetPercent, newValue: Number(dist.targetPercent) });
                box.targetPercent = Number(dist.targetPercent);
            }
            if (dist.monthlyBudgetARS !== undefined && Number(dist.monthlyBudgetARS) !== box.monthlyBudgetARS) {
                configMods.push({ fieldName: 'monthlyBudgetARS', fieldLabel: 'Presupuesto mensual ARS', previousValue: box.monthlyBudgetARS, newValue: Number(dist.monthlyBudgetARS) });
                box.monthlyBudgetARS = Number(dist.monthlyBudgetARS);
            }
            if (dist.monthlyBudgetUSD !== undefined && Number(dist.monthlyBudgetUSD) !== box.monthlyBudgetUSD) {
                configMods.push({ fieldName: 'monthlyBudgetUSD', fieldLabel: 'Presupuesto mensual USD', previousValue: box.monthlyBudgetUSD, newValue: Number(dist.monthlyBudgetUSD) });
                box.monthlyBudgetUSD = Number(dist.monthlyBudgetUSD);
            }
            if (dist.monthlyTargetARS !== undefined) box.monthlyTargetARS = Number(dist.monthlyTargetARS);
            if (dist.monthlyTargetUSD !== undefined) box.monthlyTargetUSD = Number(dist.monthlyTargetUSD);
            if (dist.reserveMonths !== undefined && Number(dist.reserveMonths) !== box.reserveMonths) {
                configMods.push({ fieldName: 'reserveMonths', fieldLabel: 'Meses de reserva', previousValue: box.reserveMonths, newValue: Number(dist.reserveMonths) });
                box.reserveMonths = Number(dist.reserveMonths);
            }
            if (configMods.length > 0 && Math.abs(diffARS) === 0 && Math.abs(diffUSD) === 0) {
                auditLogs.push(new TreasuryAuditLog({
                    operationId: opId,
                    actionType: 'edicion_configuracion',
                    boxKey: box.key,
                    boxName: box.name,
                    fieldsModified: configMods,
                    reason: cleanReason,
                    user: userName,
                    userRole,
                    date: new Date()
                }));
            }
            await box.save();
            if (auditLogs.length > 0) {
                await Promise.all(auditLogs.map(l => l.save()));
            }
        }
    }

    if (previewOnly) {
        return {
            ok: true,
            isPreview: true,
            affectsBankBalances: false,
            changes: changesPreview,
            message: 'Vista previa de edición de asignaciones (sin modificar saldos bancarios).'
        };
    }

    return {
        ok: true,
        changes: changesPreview,
        message: 'Cajas actualizadas con éxito (sin modificar saldos bancarios).'
    };
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

// 17. Distribuir Cobro Específico con Cascada de 6 Pasos (Recuperación de Inversión + Extra de Reinversión + Reglas)
export async function distributeSingleIncome(payload, user) {
    await ensureDefaultBoxes();
    const {
        transactionId,
        boxKey,
        distribution = [],
        allocations = [],
        useSuggested = false,
        reason: customReason = null
    } = payload || {};
    const userName = user?.name || user?.email || 'Admin';

    const tx = await Transaction.findById(transactionId).populate('vehicleId', 'brand name year investor jointOwnership consignedBy consignmentCommission agencyOwned ownerName purchasePrice purchaseCurrency expenses');
    if (!tx) {
        throw new Error('Transacción de cobro no encontrada.');
    }
    if (tx.type !== 'Ingreso') {
        throw new Error('Solo se pueden distribuir transacciones de ingreso.');
    }
    if (tx.status !== 'activo' && tx.status !== 'Completado') {
        throw new Error('Solo se puede distribuir dinero confirmado como cobrado (estado activo).');
    }
    if (tx.isTreasuryDistributed && !tx.isTreasuryDistributionReversed) {
        throw new Error('Este cobro ya fue distribuido previamente en Tesorería.');
    }

    // Vincular automáticamente la venta si el cobro tiene cuota o vehículo pero le falta saleId
    if (!tx.saleId) {
        if (tx.installmentId) {
            const instDoc = await Installment.findById(tx.installmentId).select('saleId vehicleId').lean();
            if (instDoc?.saleId) tx.saleId = instDoc.saleId;
            if (!tx.vehicleId && instDoc?.vehicleId) tx.vehicleId = instDoc.vehicleId;
        }
        const vehId = tx.vehicleId?._id || tx.vehicleId || tx.carId || null;
        if (!tx.saleId && vehId) {
            const activeSale = await Sale.findOne({ vehicleId: vehId, status: { $ne: 'cancelada' } }).sort({ saleDate: -1 }).select('_id').lean();
            if (activeSale) tx.saleId = activeSale._id;
        }
    }

    const curr = tx.currency === 'USD' ? 'USD' : 'ARS';
    const config = await getOrCreateTreasuryConfig();
    const ownership = computeIncomeOwnership(tx);
    const maxDistributable = roundMoney(ownership.propioAmount);

    const operationState = tx.saleId
        ? await loadSaleOperationRecoveryState(tx.saleId, config, tx._id)
        : null;

    const rawList = Array.isArray(allocations) && allocations.length > 0 ? allocations : (Array.isArray(distribution) ? distribution : []);
    let effectiveDistribution = [...rawList];
    let waterfallResult = null;

    if (useSuggested && effectiveDistribution.length === 0) {
        const dashboard = await getTreasuryDashboardData();
        const activeScheme = payload.schemeKey || tx.treasuryBreakdown?.schemeKey || config.activeDistributionScheme || null;
        if (payload.schemeKey || payload.useSchemeDistribution || (activeScheme && DISTRIBUTION_SCHEMES[activeScheme])) {
            waterfallResult = computeSchemeDistributionForCollection({
                amount: tx.amount,
                currency: curr,
                ownership,
                operationState,
                schemeKey: activeScheme,
                enrichedBoxes: dashboard.boxes,
                config
            });
        } else {
            waterfallResult = computeSixStepWaterfallForCollection({
            amount: tx.amount,
            currency: curr,
            ownership,
            operationState,
            enrichedBoxes: dashboard.boxes,
            config
            });
        }

        // Si falta información de costos de la operación, no asumir costo cero ni bloquear el CRM:
        // dejar el importe afectado sin asignar en la bandeja explicando qué falta.
        if (!waterfallResult.calculable) {
            tx.thirdPartyAmount = ownership.tercerosAmount;
            tx.thirdPartyOwner = ownership.thirdPartyOwner;
            tx.thirdPartyCapitalReturn = waterfallResult.thirdPartyCapitalReturn;
            tx.thirdPartyProfitShare = waterfallResult.thirdPartyProfitShare;
            tx.isTreasuryDistributed = false;
            tx.treasuryBreakdown = waterfallResult;
            await tx.save();

            return {
                ok: true,
                calculable: false,
                transactionId: tx._id,
                distributedTotal: 0,
                appliedBoxes: [],
                thirdPartyRetained: ownership.tercerosAmount,
                unassignedRemainder: maxDistributable,
                unassignedReason: waterfallResult.unassignedReason,
                waterfall: waterfallResult,
                message: `No se asignó automáticamente porque faltan datos de costo: ${waterfallResult.unassignedReason}`
            };
        }

        effectiveDistribution = waterfallResult.appliedAllocations.map(a => ({
            boxKey: a.boxKey,
            amount: a.amount,
            step: a.step,
            historyType: a.historyType,
            reason: a.reason
        }));
    } else if (!effectiveDistribution.length && boxKey) {
        effectiveDistribution = [{
            boxKey,
            amount: maxDistributable,
            step: 'asignacion_manual',
            historyType: 'distribucion_cobro',
            reason: customReason || `Asignación manual a Caja ${boxKey}`
        }];
    }

    const requestedSum = roundMoney(effectiveDistribution.reduce((acc, d) => acc + Math.max(0, Number(d.amount || 0)), 0));
    if (requestedSum > maxDistributable + 0.01) {
        throw new Error(
            `El monto a distribuir (${curr} ${requestedSum.toLocaleString('es-AR')}) supera los fondos propios disponibles del cobro (${curr} ${maxDistributable.toLocaleString('es-AR')}). Los fondos de terceros (${curr} ${ownership.tercerosAmount.toLocaleString('es-AR')}) están retenidos y no pueden asignarse a cajas propias.`
        );
    }

    // Si la distribución fue personalizada manualmente, calcular igual el desglose base para trazabilidad
    if (!waterfallResult) {
        const dashboard = await getTreasuryDashboardData();
        const baseWf = computeSixStepWaterfallForCollection({
            amount: tx.amount,
            currency: curr,
            ownership,
            operationState,
            enrichedBoxes: dashboard.boxes,
            config
        });
        let capRec = 0;
        let extraReinv = 0;
        let pendRes = 0;
        for (const d of effectiveDistribution) {
            const amt = roundMoney(Number(d.amount || 0));
            if (d.historyType === 'recuperacion_capital' || (d.boxKey === 'stock' && operationState && capRec < (operationState.remainingCapitalToRecover || 0))) {
                const takeCap = d.historyType === 'recuperacion_capital'
                    ? amt
                    : roundMoney(Math.min(amt, Math.max(0, (operationState.remainingCapitalToRecover || 0) - capRec)));
                capRec = roundMoney(capRec + takeCap);
                const remStick = roundMoney(amt - takeCap);
                if (remStick > 0 && operationState && extraReinv < (operationState.remainingExtraReinvestmentTarget || 0)) {
                    extraReinv = roundMoney(extraReinv + Math.min(remStick, (operationState.remainingExtraReinvestmentTarget || 0) - extraReinv));
                }
            } else if (d.historyType === 'extra_reinversion') {
                extraReinv = roundMoney(extraReinv + amt);
            } else if (d.historyType === 'reserva_costos_operacion') {
                pendRes = roundMoney(pendRes + amt);
            }
        }
        waterfallResult = {
            ...baseWf,
            operationPendingCostsReserved: pendRes,
            capitalRecoveredToStock: capRec,
            extraReinvestmentToStock: extraReinv,
            unassignedRemainder: roundMoney(Math.max(0, maxDistributable - requestedSum))
        };
    }

    let distributedTotal = 0;
    const appliedBoxes = [];

    for (const dist of effectiveDistribution) {
        const amt = roundMoney(Number(dist.amount || 0));
        if (amt <= 0) continue;
        const box = await TreasuryBox.findOne({ key: dist.boxKey });
        if (!box) throw new Error(`Caja ${dist.boxKey} no encontrada.`);

        if (curr === 'USD') box.balanceUSD = roundMoney((box.balanceUSD || 0) + amt);
        else box.balanceARS = roundMoney((box.balanceARS || 0) + amt);

        const histType = dist.historyType || 'distribucion_cobro';
        const stepName = dist.step || 'asignacion_manual';
        const entryReason = dist.reason || customReason || `Distribución de cobro #${tx._id}: ${tx.description || tx.concept || tx.notes || ''}`;

        box.history.push({
            date: new Date(),
            type: histType,
            step: stepName,
            amount: amt,
            currency: curr,
            reason: entryReason,
            user: userName,
            sourceIncomeId: tx._id,
            saleId: tx.saleId || null
        });
        await box.save();
        distributedTotal = roundMoney(distributedTotal + amt);
        appliedBoxes.push({
            boxKey: dist.boxKey,
            boxName: box.name,
            amount: amt,
            step: stepName,
            historyType: histType,
            reason: entryReason
        });
    }

    waterfallResult.appliedAllocations = appliedBoxes;
    waterfallResult.unassignedRemainder = roundMoney(Math.max(0, maxDistributable - distributedTotal));

    tx.thirdPartyAmount = ownership.tercerosAmount;
    tx.thirdPartyOwner = ownership.thirdPartyOwner;
    tx.thirdPartyCapitalReturn = waterfallResult.thirdPartyCapitalReturn || 0;
    tx.thirdPartyProfitShare = waterfallResult.thirdPartyProfitShare || 0;
    tx.treasuryBreakdown = waterfallResult;
    // Se marca como procesado si se distribuyó monto o si todas las cajas con meta ya estaban cubiertas y el excedente queda legítimamente sin asignar
    tx.isTreasuryDistributed = distributedTotal > 0 || (useSuggested && waterfallResult.calculable);
    tx.isTreasuryDistributionReversed = false;
    tx.distributedAt = new Date();
    tx.distributedBy = userName;
    tx.treasuryBoxKey = appliedBoxes[0]?.boxKey || boxKey || null;
    if (tx.treasuryControl) {
        tx.treasuryControl.inboxStatus = tx.isTreasuryDistributed ? 'distribuido' : 'pendiente';
    }

    tx.transactionAuditLog.push({
        action: 'DISTRIBUCION_TESORERIA',
        user: userName,
        date: new Date(),
        details: `Cobro procesado en Tesorería (${curr} ${distributedTotal.toLocaleString('es-AR')} asignado a cajas; Capital a Stock: ${curr} ${(waterfallResult.capitalRecoveredToStock || 0).toLocaleString('es-AR')}; Extra Reinversión: ${curr} ${(waterfallResult.extraReinvestmentToStock || 0).toLocaleString('es-AR')}; Terceros retenido: ${curr} ${ownership.tercerosAmount.toLocaleString('es-AR')}; Sin asignar: ${curr} ${waterfallResult.unassignedRemainder.toLocaleString('es-AR')}).`
    });
    await tx.save();

    return {
        ok: true,
        calculable: true,
        transactionId: tx._id,
        distributedTotal,
        appliedBoxes,
        thirdPartyRetained: ownership.tercerosAmount,
        thirdPartyCapitalReturn: tx.thirdPartyCapitalReturn,
        thirdPartyProfitShare: tx.thirdPartyProfitShare,
        unassignedRemainder: waterfallResult.unassignedRemainder,
        unassignedReason: waterfallResult.unassignedReason,
        waterfall: waterfallResult,
        message: 'Cobro distribuido exitosamente a las cajas sin duplicar el ingreso.'
    };
}

// 17b. Revertir Distribución de un Cobro Anulado o Cancelado (Con Auditoría y Sin Duplicar)
export async function reverseIncomeDistribution(txOrId, options = {}) {
    const tx = (typeof txOrId === 'object' && txOrId !== null && txOrId.type !== undefined && typeof txOrId.save === 'function')
        ? txOrId
        : await Transaction.findById(txOrId);
    if (!tx || tx.type !== 'Ingreso') {
        return { ok: false, reversed: false, reason: 'not_income' };
    }
    if (tx.isTreasuryDistributionReversed) {
        return { ok: true, reversed: false, reason: 'already_reversed' };
    }

    const userName = options.user || 'Sistema';
    const curr = tx.currency === 'USD' ? 'USD' : 'ARS';
    const boxes = await TreasuryBox.find();
    let totalReversed = 0;

    for (const box of boxes) {
        const matchingEntries = (box.history || []).filter(
            h => h.sourceIncomeId && String(h.sourceIncomeId) === String(tx._id) && Number(h.amount || 0) > 0 && h.type !== 'reversion_cobro'
        );
        if (matchingEntries.length === 0) continue;

        const sumInBox = roundMoney(matchingEntries.reduce((acc, h) => acc + Number(h.amount || 0), 0));
        if (sumInBox <= 0) continue;

        if (curr === 'USD') {
            box.balanceUSD = roundMoney(Math.max(0, (box.balanceUSD || 0) - sumInBox));
        } else {
            box.balanceARS = roundMoney(Math.max(0, (box.balanceARS || 0) - sumInBox));
        }

        box.history.push({
            date: new Date(),
            type: 'reversion_cobro',
            step: 'reversion_anulacion',
            amount: -sumInBox,
            currency: curr,
            reason: `Reversión por anulación de cobro #${tx._id}: ${options.reason || tx.description || tx.concept || ''}`,
            user: userName,
            sourceIncomeId: tx._id,
            saleId: tx.saleId || null
        });
        await box.save();
        totalReversed = roundMoney(totalReversed + sumInBox);
    }

    tx.isTreasuryDistributed = false;
    tx.isTreasuryDistributionReversed = true;
    if (!tx.treasuryControl) tx.treasuryControl = {};
    tx.treasuryControl.inboxStatus = 'revertido';
    tx.transactionAuditLog.push({
        action: 'REVERSION_DISTRIBUCION_TESORERIA',
        user: userName,
        date: new Date(),
        details: `Reversión de distribución en cajas por anulación de cobro (${curr} ${totalReversed.toLocaleString('es-AR')} descontado de cajas).`
    });
    await tx.save();

    return {
        ok: true,
        reversed: true,
        totalReversed,
        currency: curr
    };
}


/**
 * Anula un cobro de forma integral y consistente:
 *  1. Reversa los saldos acreditados en cuentas/cajas (incluyendo divisiones en paymentSplits)
 *  2. Reversa la imputación a la cuota vinculada (restaura paidAmount y recalcula status a pendiente o parcial)
 *  3. Reversa las asignaciones de fondos realizadas en TreasuryBox
 *  4. Marca la transacción como "anulado" conservando el historial y auditoría
 */
export async function annulCollectionAndReverse(txOrId, options = {}) {
    const tx = (typeof txOrId === 'object' && txOrId !== null && typeof txOrId.save === 'function')
        ? txOrId
        : await Transaction.findById(txOrId);

    if (!tx) {
        throw new Error('Transacción de cobro no encontrada.');
    }
    if (tx.status === 'anulado') {
        return { ok: true, alreadyAnnulled: true, message: 'El cobro ya se encontraba anulado.' };
    }

    const userName = options.user || 'Sistema';
    const oldStatus = tx.status;

    // 1. Revertir saldo de cuentas físicas / bancarias si el cobro estaba activo
    if (oldStatus === 'activo' || oldStatus === 'Completado') {
        if (Array.isArray(tx.paymentSplits) && tx.paymentSplits.length > 0) {
            for (const sp of tx.paymentSplits) {
                if (sp.accountId && Number(sp.amount || 0) > 0) {
                    const acc = await Account.findById(sp.accountId);
                    if (acc) {
                        acc.balance = roundMoney(Number(acc.balance || 0) - Number(sp.amount));
                        await acc.save();
                    }
                }
            }
        } else if (tx.accountId) {
            const acc = await Account.findById(tx.accountId);
            if (acc) {
                acc.balance = roundMoney(Number(acc.balance || 0) - Number(tx.amount || 0));
                await acc.save();
            }
        }
    }

    // 2. Revertir imputación a cuota si corresponde
    if (tx.installmentId) {
        const inst = await Installment.findById(tx.installmentId);
        if (inst) {
            const appliedAmt = Number(tx.installmentPaidAmountApplied ?? tx.amount ?? 0);
            const currentPaid = Number(inst.paidAmount || 0);
            const nextPaid = roundMoney(Math.max(0, currentPaid - appliedAmt));
            inst.paidAmount = nextPaid;
            inst.status = nextPaid <= 0 ? 'pendiente' : (nextPaid < roundMoney(inst.amount - 0.01) ? 'parcial' : 'pagada');
            inst.installmentAuditLog.push({
                action: 'COBRO_REGISTRADO',
                user: userName,
                date: new Date(),
                details: `Reversión por anulación de cobro #${tx._id} (Descontados ${tx.currency} ${appliedAmt.toLocaleString('es-AR')}. Nuevo saldo pagado: ${tx.currency} ${nextPaid.toLocaleString('es-AR')})`
            });
            await inst.save();
        }
    }

    // 3. Revertir asignaciones en Tesorería si estaba distribuido
    let revTreasuryRes = null;
    if (tx.isTreasuryDistributed || tx.treasuryBreakdown) {
        revTreasuryRes = await reverseIncomeDistribution(tx, {
            user: userName,
            reason: options.reason || 'Anulación integral de cobro'
        });
    }

    // 4. Marcar transacción como anulada
    tx.status = 'anulado';
    tx.isTreasuryDistributed = false;
    tx.isTreasuryDistributionReversed = true;
    if (!tx.treasuryControl) tx.treasuryControl = {};
    tx.treasuryControl.inboxStatus = 'revertido';
    tx.transactionAuditLog.push({
        action: 'ANULACION_COBRO_INTEGRAL',
        user: userName,
        date: new Date(),
        details: `Cobro anulado integralmente. Saldos de cuentas y cuota revertidos. ${revTreasuryRes?.reversed ? 'Asignaciones de cajas revertidas.' : ''}`
    });
    await tx.save();

    return {
        ok: true,
        transactionId: tx._id,
        status: 'anulado',
        treasuryReversed: revTreasuryRes?.reversed || false,
        message: 'Cobro anulado y movimientos relacionados revertidos con éxito.'
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

    const oldBoxKey = tx.treasuryBoxKey;
    const amt = roundMoney(Number(tx.amount || 0));
    const curr = tx.currency === 'USD' ? 'USD' : 'ARS';
    const isActivo = tx.status === 'activo' || tx.status === 'Completado';

    if (category) tx.category = category;
    if (boxKey) tx.treasuryBoxKey = boxKey;

    // Si el gasto ya estaba pagado y cambió de caja, trasladar el descuento entre la caja anterior y la nueva
    if (isActivo && oldBoxKey && boxKey && oldBoxKey !== boxKey && amt > 0) {
        const [oldBox, newBox] = await Promise.all([
            TreasuryBox.findOne({ key: oldBoxKey }),
            TreasuryBox.findOne({ key: boxKey })
        ]);
        if (oldBox && newBox) {
            const field = curr === 'USD' ? 'balanceUSD' : 'balanceARS';
            oldBox[field] = roundMoney((oldBox[field] || 0) + amt);
            newBox[field] = roundMoney(Math.max(0, (newBox[field] || 0) - amt));
            oldBox.history.push({
                date: new Date(),
                type: 'reversion_egreso',
                amount: amt,
                currency: curr,
                reason: `Reclasificación de gasto #${tx._id} hacia ${newBox.name}: ${reason || 'Ajuste operativo'}`,
                user: userName,
                sourceExpenseId: tx._id
            });
            newBox.history.push({
                date: new Date(),
                type: 'egreso_finanzas',
                amount: -amt,
                currency: curr,
                reason: `Reclasificación de gasto #${tx._id} desde ${oldBox.name}: ${reason || 'Ajuste operativo'}`,
                user: userName,
                sourceExpenseId: tx._id
            });
            await Promise.all([oldBox.save(), newBox.save()]);
        }
    }

    tx.transactionAuditLog.push({
        action: 'RECLASIFICACION_TESORERIA',
        user: userName,
        date: new Date(),
        details: `Reclasificado a categoría '${tx.category}', Caja '${tx.treasuryBoxKey}' (Antes: '${oldBoxKey}'). Motivo: ${reason || 'Ajuste operativo'}`
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
    'funcionamiento': 'operativa',
    'operativa': 'operativa',
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
    'tarjeta de crédito': 'deudas',
    'tarjeta': 'deudas',
    'gastos personales': 'personal',
    'retiros personales': 'personal',
    'retiros': 'personal',
    'retiro': 'personal',
    'retiro socio': 'personal',
    'retiro titular': 'personal',
    'taller': 'postventa',
    'mecánica': 'postventa',
    'mecánica postventa': 'postventa',
    'postventa': 'postventa',
    'garantía': 'postventa',
    'compra vehículo': 'stock',
    'stock': 'stock',
    'inversión': 'crecimiento',
    'inversion': 'crecimiento'
};

// 20. Sincronización Automática e Idempotente de Gastos de Finanzas con Cajas Estratégicas
export async function syncExpenseWithTreasury(tx, options = {}) {
    if (!tx || tx.type !== 'Egreso') return;
    if (EXCLUDED_INBOX_CATEGORIES.includes(tx.category)) return;
    if (tx.category === 'compra_vehiculo' || tx.category === 'Pago compra vehículo' || tx.category === 'Pago Empresas') return;
    if (tx.isTreasuryExpenseSynced && !options.statusChanged) return;

    await ensureDefaultBoxes();
    await ensureDefaultCategoryRules();

    // 1. Si no tiene treasuryBoxKey asignada, buscar en reglas de categorías o mapeo canónico
    if (!tx.treasuryBoxKey && tx.category) {
        const cleanCat = tx.category.trim();
        const rule = await TreasuryCategoryRule.findOne({ category: cleanCat });
        const resolvedKey = (rule && rule.boxKey) || CANONICAL_EXPENSE_BOX_MAP[cleanCat.toLowerCase()] || null;
        if (resolvedKey) {
            tx.treasuryBoxKey = resolvedKey;
        }
    }

    const boxKey = tx.treasuryBoxKey;
    if (!boxKey) return;

    const box = await TreasuryBox.findOne({ key: boxKey });
    if (!box) return;

    const amt = roundMoney(Number(tx.amount || 0));
    const curr = tx.currency === 'USD' ? 'USD' : 'ARS';
    const isActivo = tx.status === 'activo' || tx.status === 'Completado';
    const isPendiente = tx.status === 'pendiente';

    if (options.isNew) {
        // Idempotencia: no volver a descontar si este gasto ya fue sincronizado como pagado
        const alreadyDiscounted = Boolean(
            tx.isTreasuryExpenseSynced ||
            (box.history || []).some(h => h.sourceExpenseId && String(h.sourceExpenseId) === String(tx._id) && h.type === 'egreso_finanzas')
        );
        if (alreadyDiscounted) return;

        if (isActivo) {
            if (curr === 'USD') box.balanceUSD = roundMoney(Math.max(0, (box.balanceUSD || 0) - amt));
            else box.balanceARS = roundMoney(Math.max(0, (box.balanceARS || 0) - amt));

            box.history.push({
                date: new Date(),
                type: 'egreso_finanzas',
                amount: -amt,
                currency: curr,
                reason: `Gasto Finanzas #${tx._id}: ${tx.concept || tx.description || tx.category}`,
                user: options.user || tx.createdBy || 'Sistema',
                sourceExpenseId: tx._id
            });
            await box.save();
            tx.isTreasuryExpenseSynced = true;
            await tx.save();
        } else if (isPendiente) {
            if (curr === 'USD') box.pendingCommitmentsUSD = roundMoney((box.pendingCommitmentsUSD || 0) + amt);
            else box.pendingCommitmentsARS = roundMoney((box.pendingCommitmentsARS || 0) + amt);
            await box.save();
        }
    } else if (options.statusChanged) {
        if (options.oldStatus === 'pendiente' && isActivo) {
            if (tx.isTreasuryExpenseSynced) return;
            if (curr === 'USD') {
                box.pendingCommitmentsUSD = roundMoney(Math.max(0, (box.pendingCommitmentsUSD || 0) - amt));
                box.balanceUSD = roundMoney(Math.max(0, (box.balanceUSD || 0) - amt));
            } else {
                box.pendingCommitmentsARS = roundMoney(Math.max(0, (box.pendingCommitmentsARS || 0) - amt));
                box.balanceARS = roundMoney(Math.max(0, (box.balanceARS || 0) - amt));
            }

            box.history.push({
                date: new Date(),
                type: 'egreso_finanzas',
                amount: -amt,
                currency: curr,
                reason: `Pago de Gasto Finanzas #${tx._id}: ${tx.concept || tx.description || tx.category}`,
                user: options.user || 'Sistema',
                sourceExpenseId: tx._id
            });
            await box.save();
            tx.isTreasuryExpenseSynced = true;
            await tx.save();
        } else if (options.oldStatus === 'pendiente' && !isActivo && !isPendiente) {
            if (curr === 'USD') box.pendingCommitmentsUSD = roundMoney(Math.max(0, (box.pendingCommitmentsUSD || 0) - amt));
            else box.pendingCommitmentsARS = roundMoney(Math.max(0, (box.pendingCommitmentsARS || 0) - amt));
            await box.save();
        } else if (options.oldStatus !== 'activo' && isActivo) {
            if (tx.isTreasuryExpenseSynced) return;
            if (curr === 'USD') box.balanceUSD = roundMoney(Math.max(0, (box.balanceUSD || 0) - amt));
            else box.balanceARS = roundMoney(Math.max(0, (box.balanceARS || 0) - amt));

            box.history.push({
                date: new Date(),
                type: 'egreso_finanzas',
                amount: -amt,
                currency: curr,
                reason: `Pago de Gasto Finanzas #${tx._id}: ${tx.concept || tx.description || tx.category}`,
                user: options.user || 'Sistema',
                sourceExpenseId: tx._id
            });
            await box.save();
            tx.isTreasuryExpenseSynced = true;
            await tx.save();
        } else if ((options.oldStatus === 'activo' || options.oldStatus === 'Completado') && !isActivo) {
            // Revertir efecto en caja una sola vez si se anuló o volvió a pendiente
            if (curr === 'USD') {
                box.balanceUSD = roundMoney((box.balanceUSD || 0) + amt);
                if (isPendiente) box.pendingCommitmentsUSD = roundMoney((box.pendingCommitmentsUSD || 0) + amt);
            } else {
                box.balanceARS = roundMoney((box.balanceARS || 0) + amt);
                if (isPendiente) box.pendingCommitmentsARS = roundMoney((box.pendingCommitmentsARS || 0) + amt);
            }

            box.history.push({
                date: new Date(),
                type: 'reversion_egreso',
                amount: amt,
                currency: curr,
                reason: `Reversión de Gasto Finanzas #${tx._id} (Estado: ${tx.status})`,
                user: options.user || 'Sistema',
                sourceExpenseId: tx._id
            });
            await box.save();
            tx.isTreasuryExpenseSynced = false;
            await tx.save();
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

// 22. Integración Automática e Idempotente de Cobros (Cuotas, Entregas y Ventas) con Tesorería
export async function registerCollectionForTreasury(tx, options = {}) {
    if (!tx || tx.type !== 'Ingreso') {
        return { action: 'ignored', reason: 'not_income', status: 'ignored' };
    }
    if (EXCLUDED_INBOX_CATEGORIES.includes(tx.category) || tx.isHistoricallyRegularized) {
        return { action: 'ignored', reason: 'excluded_category_or_historical', status: 'ignored' };
    }
    if (tx.status && tx.status !== 'activo' && tx.status !== 'Completado') {
        return { action: 'ignored', reason: 'not_confirmed_collected', status: 'ignored' };
    }

    // Idempotencia estricta: si este cobro ya fue distribuido, no volver a procesarlo
    if (tx.isTreasuryDistributed === true && !tx.isTreasuryDistributionReversed) {
        return {
            action: 'already_distributed',
            status: 'distributed',
            requiresTreasuryPin: false,
            message: 'Este cobro ya fue procesado en Tesorería previamente.'
        };
    }

    // Vincular automáticamente la venta si el cobro tiene cuota o vehículo pero no saleId
    if (!tx.saleId) {
        if (tx.installmentId) {
            const instDoc = await Installment.findById(tx.installmentId).select('saleId vehicleId').lean();
            if (instDoc?.saleId) tx.saleId = instDoc.saleId;
            if (!tx.vehicleId && instDoc?.vehicleId) tx.vehicleId = instDoc.vehicleId;
        }
        const vehId = (tx.vehicleId && typeof tx.vehicleId === 'object' ? tx.vehicleId._id : tx.vehicleId) || tx.carId || null;
        if (!tx.saleId && vehId) {
            const activeSale = await Sale.findOne({ vehicleId: vehId, status: { $ne: 'cancelada' } }).sort({ saleDate: -1 }).select('_id').lean();
            if (activeSale) tx.saleId = activeSale._id;
        }
    }

    // 1. Calcular participación de terceros/socios si está vinculada a un vehículo o venta
    let vehicleDoc = null;
    const rawVehId = (tx.vehicleId && typeof tx.vehicleId === 'object' ? tx.vehicleId._id : tx.vehicleId) || tx.carId || null;
    if (rawVehId) {
        if (typeof tx.vehicleId === 'object' && (tx.vehicleId.investor !== undefined || tx.vehicleId.consignedBy !== undefined)) {
            vehicleDoc = tx.vehicleId;
        } else {
            vehicleDoc = await Car.findById(rawVehId).select('brand name year investor jointOwnership consignedBy consignmentCommission agencyOwned ownerName').lean();
        }
    }

    const ownership = computeIncomeOwnership({
        ...(tx.toObject ? tx.toObject() : tx),
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

        // Distribuir automáticamente usando la cascada de 6 pasos sobre fondos propios
        await tx.save();
        if (ownership.propioAmount > 0) {
            const distRes = await distributeSingleIncome({
                transactionId: tx._id,
                useSuggested: true
            }, options.user || { name: tx.createdBy || 'Sistema' });

            return {
                action: distRes.calculable === false ? 'queued_missing_data' : 'auto_distributed',
                status: distRes.calculable === false ? 'pending_distribution' : 'distributed',
                requiresTreasuryPin: false,
                distributedTotal: distRes.distributedTotal,
                appliedBoxes: distRes.appliedBoxes,
                waterfall: distRes.waterfall,
                ownDistributableAmount: ownership.propioAmount,
                thirdPartyRetained: ownership.tercerosAmount,
                message: distRes.message
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

// 25. Vista Previa de Conciliación Inicial y Activación de Reglas (Conservar saldos, corte e historial)
export async function previewInitialReconciliationAndActivation(payload = {}) {
    const dashboard = await getTreasuryDashboardData();
    const { accounts, boxes, summary, auditInfo, config, unassignedIncomeCards, operationsRecovery } = dashboard;

    const proposedExtraPct = payload.reinvestmentExtraPct !== undefined && payload.reinvestmentExtraPct !== null && payload.reinvestmentExtraPct !== ''
        ? Number(String(payload.reinvestmentExtraPct).replace(',', '.'))
        : (config.reinvestmentExtraConfigured ? config.reinvestmentExtraPct : null);

    return {
        ok: true,
        isPreview: true,
        preservesExistingCutoff: Boolean(auditInfo.isReconciliationConfirmed),
        existingCutoffDate: auditInfo.lastCutoffDate,
        affectsAccountBalances: false,
        resetsBoxes: false,
        reprocessesHistoricalIncomes: false,
        redistributesExistingFundsAutomatically: false,
        accountsCount: accounts.length,
        byCurrency: summary.byCurrency,
        currentBoxes: boxes.map(b => ({
            key: b.key,
            name: b.name,
            balanceARS: b.balanceARS,
            balanceUSD: b.balanceUSD,
            commitmentsARS: b.commitmentsARS,
            availableARS: b.availableARS,
            targetMoneyARS: b.targetMoneyARS,
            shortfallARS: b.shortfallARS,
            manualAdjustmentsCount: (b.detail?.manualAdjustments || []).length
        })),
        pendingInboxCount: unassignedIncomeCards.length,
        pendingInboxPreview: unassignedIncomeCards.map(c => ({
            id: c.id,
            description: c.description,
            currency: c.currency,
            totalAmount: c.totalAmount,
            propioAmount: c.propioAmount,
            tercerosAmount: c.tercerosAmount,
            waterfallSuggestion: c.waterfallSuggestion
        })),
        operationsCount: (operationsRecovery || []).length,
        proposedRules: {
            autoDistributeIncomes: payload.autoDistributeIncomes !== undefined ? Boolean(payload.autoDistributeIncomes) : true,
            requirePinForAutoDistribution: false,
            reinvestmentExtraConfigured: proposedExtraPct !== null && Number.isFinite(proposedExtraPct),
            reinvestmentExtraPct: proposedExtraPct !== null && Number.isFinite(proposedExtraPct) ? roundMoney(proposedExtraPct) : null,
            operationalHorizonDays: payload.operationalHorizonDays !== undefined ? Number(payload.operationalHorizonDays) : config.operationalHorizonDays,
            reserveMonths: payload.reserveMonths !== undefined ? Number(payload.reserveMonths) : config.reserveMonths,
            personalMonthlyBudgetARS: payload.personalMonthlyBudgetARS !== undefined ? Number(payload.personalMonthlyBudgetARS) : config.personalMonthlyBudgetARS,
            surplusRule: payload.surplusRule || config.surplusRule
        },
        explanation: 'Esta activación conserva intactos los saldos bancarios, las cajas actuales, los ajustes manuales y el corte inicial confirmado. No vuelve a sumar cobros históricos ni redistribuye fondos existentes automáticamente; activa la cascada de 6 pasos para los cobros pendientes y futuros.'
    };
}

// 26. Vista Previa y Ejecución Explícita de Redistribución de Fondos Existentes (Sin deshacer ajustes manuales silenciosamente)
export async function previewRedistributeExistingFunds(payload = {}) {
    const { currency = 'ARS' } = payload || {};
    const curr = currency === 'USD' ? 'USD' : 'ARS';
    const dashboard = await getTreasuryDashboardData();
    const { boxes, summary, config } = dashboard;

    const unassignedOwn = curr === 'USD'
        ? roundMoney(Math.max(0, Number(summary.propiosSinAsignarUSD || 0)))
        : roundMoney(Math.max(0, Number(summary.propiosSinAsignarARS || 0)));

    let rem = unassignedOwn;
    const priorityOrder = Array.isArray(config.priorityOrder) && config.priorityOrder.length > 0
        ? config.priorityOrder
        : ['operativa', 'impuestos', 'deudas', 'postventa', 'reserva', 'personal', 'stock', 'crecimiento'];

    const proposedAllocations = [];
    for (const key of priorityOrder) {
        if (rem <= 0) break;
        if (key === 'stock' || key === 'crecimiento') continue;
        const b = boxes.find(x => x.key === key);
        if (!b) continue;
        const sf = curr === 'USD' ? Number(b.shortfallUSD || 0) : Number(b.shortfallARS || 0);
        if (sf > 0) {
            const take = roundMoney(Math.min(rem, sf));
            if (take > 0) {
                proposedAllocations.push({
                    boxKey: b.key,
                    boxName: b.name,
                    currentBalance: curr === 'USD' ? b.balanceUSD : b.balanceARS,
                    addAmount: take,
                    newBalance: roundMoney((curr === 'USD' ? b.balanceUSD : b.balanceARS) + take),
                    reason: `Cobertura de faltante hacia objetivo (${b.name})`
                });
                rem = roundMoney(rem - take);
            }
        }
    }

    if (rem > 0 && config.surplusRule?.configured) {
        const stPct = Math.max(0, Number(config.surplusRule.stockPercent || 0));
        const crPct = Math.max(0, Number(config.surplusRule.crecimientoPercent || 0));
        const stAmt = roundMoney(rem * (stPct / 100));
        const crAmt = roundMoney(Math.min(rem - stAmt, rem * (crPct / 100)));
        const stockB = boxes.find(x => x.key === 'stock');
        const crecB = boxes.find(x => x.key === 'crecimiento');

        if (stAmt > 0 && stockB) {
            proposedAllocations.push({
                boxKey: 'stock',
                boxName: stockB.name,
                currentBalance: curr === 'USD' ? stockB.balanceUSD : stockB.balanceARS,
                addAmount: stAmt,
                newBalance: roundMoney((curr === 'USD' ? stockB.balanceUSD : stockB.balanceARS) + stAmt),
                reason: `Excedente según regla configurada (${stPct}% a Stock)`
            });
            rem = roundMoney(rem - stAmt);
        }
        if (crAmt > 0 && crecB) {
            proposedAllocations.push({
                boxKey: 'crecimiento',
                boxName: crecB.name,
                currentBalance: curr === 'USD' ? crecB.balanceUSD : crecB.balanceARS,
                addAmount: crAmt,
                newBalance: roundMoney((curr === 'USD' ? crecB.balanceUSD : crecB.balanceARS) + crAmt),
                reason: `Excedente según regla configurada (${crPct}% a Crecimiento)`
            });
            rem = roundMoney(rem - crAmt);
        }
    }

    return {
        ok: true,
        isPreview: true,
        currency: curr,
        unassignedPoolBefore: unassignedOwn,
        totalProposedToAssign: roundMoney(unassignedOwn - rem),
        unassignedPoolAfter: rem,
        preservesManualAdjustments: true,
        affectsBankBalances: false,
        proposedAllocations,
        explanation: 'Vista previa de asignación explícita de fondos propios sin asignar según las reglas actuales. Conserva los saldos y ajustes manuales ya cargados en cada caja.'
    };
}

export async function executeRedistributeExistingFunds(payload = {}, user) {
    const { currency = 'ARS', allocations = null, reason } = payload || {};
    if (!reason || !String(reason).trim()) {
        throw new Error('Debés indicar un motivo obligatorio para ejecutar la redistribución explícita.');
    }
    const cleanReason = String(reason).trim();
    const curr = currency === 'USD' ? 'USD' : 'ARS';
    const userName = user?.name || user?.email || 'Admin';

    const preview = await previewRedistributeExistingFunds({ currency: curr });
    const listToApply = Array.isArray(allocations) && allocations.length > 0
        ? allocations
        : preview.proposedAllocations;

    const totalRequested = roundMoney(listToApply.reduce((acc, a) => acc + Math.max(0, Number(a.addAmount ?? a.amount ?? 0)), 0));
    if (totalRequested > preview.unassignedPoolBefore + 0.01) {
        throw new Error(`El total a asignar (${curr} ${totalRequested.toLocaleString('es-AR')}) supera los fondos propios sin asignar disponibles (${curr} ${preview.unassignedPoolBefore.toLocaleString('es-AR')}).`);
    }

    let appliedTotal = 0;
    const appliedItems = [];
    for (const item of listToApply) {
        const addAmt = roundMoney(Number(item.addAmount ?? item.amount ?? 0));
        if (addAmt <= 0) continue;
        const box = await TreasuryBox.findOne({ key: item.boxKey });
        if (!box) continue;

        if (curr === 'USD') box.balanceUSD = roundMoney((box.balanceUSD || 0) + addAmt);
        else box.balanceARS = roundMoney((box.balanceARS || 0) + addAmt);

        box.history.push({
            date: new Date(),
            type: 'redistribucion_explicita',
            step: 'redistribucion_explicita',
            amount: addAmt,
            currency: curr,
            reason: `${cleanReason}${item.reason ? ` (${item.reason})` : ''}`,
            user: userName
        });
        await box.save();
        appliedTotal = roundMoney(appliedTotal + addAmt);
        appliedItems.push({ boxKey: box.key, boxName: box.name, amount: addAmt });
    }

    return {
        ok: true,
        currency: curr,
        appliedTotal,
        appliedItems,
        message: `Redistribución explícita aplicada por ${curr} ${appliedTotal.toLocaleString('es-AR')} conservando el historial y los ajustes manuales.`
    };
}

/**
 * Actualiza la configuración de una caja (nombre, porcentaje meta, presupuestos, meses reserva, estado activo)
 * con motivo obligatorio y registro en TreasuryAuditLog.
 */
export async function updateBoxConfig(payload, user) {
    const {
        boxKey,
        name,
        targetPercent,
        monthlyBudgetARS,
        monthlyBudgetUSD,
        reserveMonths,
        description,
        isActive,
        reason
    } = payload || {};

    if (!reason || !String(reason).trim()) {
        throw new Error('El motivo de la modificación es obligatorio.');
    }
    const cleanReason = String(reason).trim();
    const userName = user?.name || user?.email || 'Admin';
    const userRole = user?.role || 'Admin';

    const box = await TreasuryBox.findOne({ key: boxKey });
    if (!box) throw new Error(`Caja ${boxKey} no encontrada.`);

    const fieldsModified = [];

    if (name !== undefined && String(name).trim() !== '' && String(name).trim() !== box.name) {
        fieldsModified.push({
            fieldName: 'name',
            fieldLabel: 'Nombre',
            previousValue: box.name,
            newValue: String(name).trim()
        });
        box.name = String(name).trim();
    }

    if (targetPercent !== undefined) {
        const numPct = Number(targetPercent);
        if (numPct !== box.targetPercent) {
            fieldsModified.push({
                fieldName: 'targetPercent',
                fieldLabel: 'Porcentaje sugerido',
                previousValue: box.targetPercent,
                newValue: numPct
            });
            box.targetPercent = numPct;
        }
    }

    if (monthlyBudgetARS !== undefined) {
        const num = Number(monthlyBudgetARS);
        if (num !== box.monthlyBudgetARS) {
            fieldsModified.push({
                fieldName: 'monthlyBudgetARS',
                fieldLabel: 'Presupuesto mensual ARS',
                previousValue: box.monthlyBudgetARS,
                newValue: num
            });
            box.monthlyBudgetARS = num;
        }
    }

    if (monthlyBudgetUSD !== undefined) {
        const num = Number(monthlyBudgetUSD);
        if (num !== box.monthlyBudgetUSD) {
            fieldsModified.push({
                fieldName: 'monthlyBudgetUSD',
                fieldLabel: 'Presupuesto mensual USD',
                previousValue: box.monthlyBudgetUSD,
                newValue: num
            });
            box.monthlyBudgetUSD = num;
        }
    }

    if (reserveMonths !== undefined) {
        const num = Number(reserveMonths);
        if (num !== box.reserveMonths) {
            fieldsModified.push({
                fieldName: 'reserveMonths',
                fieldLabel: 'Meses de reserva',
                previousValue: box.reserveMonths,
                newValue: num
            });
            box.reserveMonths = num;
        }
    }

    if (description !== undefined && description !== box.description) {
        fieldsModified.push({
            fieldName: 'description',
            fieldLabel: 'Descripción',
            previousValue: box.description,
            newValue: description
        });
        box.description = description;
    }

    if (isActive !== undefined && Boolean(isActive) !== box.isActive) {
        if (isActive === false && (box.balanceARS > 0 || box.balanceUSD > 0)) {
            throw new Error(`No podés desactivar la caja ${box.name} mientras tenga saldo pendiente (${box.balanceARS > 0 ? 'ARS ' + box.balanceARS : ''} ${box.balanceUSD > 0 ? 'USD ' + box.balanceUSD : ''}). Transferí o asigná sus fondos antes de desactivarla.`);
        }
        fieldsModified.push({
            fieldName: 'isActive',
            fieldLabel: 'Estado Activo',
            previousValue: box.isActive,
            newValue: Boolean(isActive)
        });
        box.isActive = Boolean(isActive);
    }

    if (fieldsModified.length === 0) {
        return { ok: true, box, message: 'No se detectaron cambios en la configuración.' };
    }

    const opId = 'cfg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    const log = new TreasuryAuditLog({
        operationId: opId,
        actionType: 'edicion_configuracion',
        boxKey: box.key,
        boxName: box.name,
        fieldsModified,
        reason: cleanReason,
        user: userName,
        userRole,
        date: new Date()
    });

    box.history.push({
        date: new Date(),
        type: 'ajuste',
        reason: `${cleanReason} (Edición de configuración)`,
        user: userName
    });

    await Promise.all([box.save(), log.save()]);

    return {
        ok: true,
        box,
        log,
        message: `Configuración de ${box.name} actualizada con éxito.`
    };
}

/**
 * Ajusta el saldo asignado de una caja con motivo obligatorio y registro en TreasuryAuditLog.
 * No permite saldos negativos ni aumentos arbitrarios sin justificación.
 */
export async function adjustBoxBalance(payload, user) {
    const {
        boxKey,
        currency = 'ARS',
        newBalance,
        adjustmentAmount,
        reason,
        counterpartyBoxKey,
        previewOnly = false
    } = payload || {};

    if (!reason || !String(reason).trim()) {
        throw new Error('El motivo del ajuste es obligatorio.');
    }
    const cleanReason = String(reason).trim();
    const curr = currency === 'USD' ? 'USD' : 'ARS';
    const field = curr === 'USD' ? 'balanceUSD' : 'balanceARS';

    await ensureDefaultBoxes();
    const box = await TreasuryBox.findOne({ key: boxKey });
    if (!box) throw new Error(`Caja ${boxKey} no encontrada.`);

    const prevBalance = roundMoney(Number(box[field]) || 0);
    let targetBalance = prevBalance;

    if (newBalance !== undefined && newBalance !== null && newBalance !== '') {
        targetBalance = roundMoney(Number(newBalance));
    } else if (adjustmentAmount !== undefined && adjustmentAmount !== null && adjustmentAmount !== '') {
        targetBalance = roundMoney(prevBalance + Number(adjustmentAmount));
    } else {
        throw new Error('Debés indicar el nuevo saldo o el importe a ajustar.');
    }

    if (targetBalance < 0) {
        throw new Error(`El saldo de la caja ${box.name} no puede quedar negativo (${curr} ${targetBalance.toLocaleString('es-AR')}).`);
    }

    const diff = roundMoney(targetBalance - prevBalance);
    if (diff === 0) {
        return { ok: true, box, message: 'El saldo ingresado es idéntico al actual; no hay variación.' };
    }

    let sourceBox = null;
    let targetBox = null;

    if (diff > 0) {
        if (counterpartyBoxKey) {
            sourceBox = await TreasuryBox.findOne({ key: counterpartyBoxKey });
            if (!sourceBox) throw new Error(`Caja de origen ${counterpartyBoxKey} no encontrada.`);
            if (sourceBox.key === box.key) throw new Error('La caja de origen no puede ser la misma caja a ajustar.');
            const sourceBalance = roundMoney(Number(sourceBox[field]) || 0);
            if (sourceBalance < diff) {
                throw new Error(`Saldo insuficiente en ${sourceBox.name} para transferir a ${box.name}. Requiere ${curr} ${diff.toLocaleString('es-AR')}, pero solo dispone de ${curr} ${sourceBalance.toLocaleString('es-AR')}.`);
            }
        } else {
            // Validar contrapartida con fondos pendientes de asignar si existen cuentas bancarias registradas
            const accounts = await Account.find({ isActive: { $ne: false } }).lean();
            if (accounts && accounts.length > 0) {
                let totalCuentas = 0;
                accounts.forEach(acc => {
                    if ((curr === 'USD' && acc.currency === 'USD') || (curr === 'ARS' && acc.currency !== 'USD')) {
                        totalCuentas += Number(acc.balance || 0);
                    }
                });
                const allBoxes = await TreasuryBox.find().lean();
                let totalCajas = 0;
                allBoxes.forEach(b => {
                    totalCajas += Number(b[field] || 0);
                });
                const unallocated = roundMoney(totalCuentas - totalCajas);
                if (diff > unallocated) {
                    throw new Error(`No se puede aumentar el saldo de ${box.name} en ${curr} ${diff.toLocaleString('es-AR')} porque supera los fondos pendientes de asignar en cuentas (${curr} ${Math.max(0, unallocated).toLocaleString('es-AR')} disponibles). Toda asignación debe tener respaldo en dinero real.`);
                }
            }
        }
    } else if (diff < 0 && counterpartyBoxKey) {
        targetBox = await TreasuryBox.findOne({ key: counterpartyBoxKey });
        if (!targetBox) throw new Error(`Caja de destino ${counterpartyBoxKey} no encontrada.`);
        if (targetBox.key === box.key) throw new Error('La caja de destino no puede ser la misma caja a ajustar.');
    }

    const preview = {
        boxKey: box.key,
        boxName: box.name,
        currency: curr,
        previousBalance: prevBalance,
        newBalance: targetBalance,
        diff,
        counterpartyBoxKey: sourceBox?.key || targetBox?.key || null,
        counterpartyBoxName: sourceBox?.name || targetBox?.name || (diff > 0 ? 'Fondos pendientes de asignar' : 'Fondos liberados a cuentas'),
        reason: cleanReason,
        affectsBankBalances: false
    };

    if (previewOnly) {
        return {
            ok: true,
            isPreview: true,
            preview,
            message: `Vista previa de ajuste: ${box.name} pasa de ${curr} ${prevBalance.toLocaleString('es-AR')} a ${curr} ${targetBalance.toLocaleString('es-AR')} (variación: ${diff > 0 ? '+' : ''}${diff.toLocaleString('es-AR')}).`
        };
    }

    const userName = user?.name || user?.email || 'Admin';
    const userRole = user?.role || 'Admin';
    const opId = 'adj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    box[field] = targetBalance;

    if (sourceBox) {
        sourceBox[field] = roundMoney((sourceBox[field] || 0) - diff);
        sourceBox.history.push({
            date: new Date(),
            type: 'ajuste',
            amount: -diff,
            currency: curr,
            reason: `${cleanReason} (Transferido hacia ${box.name})`,
            user: userName
        });
        await sourceBox.save();
    } else if (targetBox) {
        targetBox[field] = roundMoney((targetBox[field] || 0) + Math.abs(diff));
        targetBox.history.push({
            date: new Date(),
            type: 'ajuste',
            amount: Math.abs(diff),
            currency: curr,
            reason: `${cleanReason} (Transferido desde ${box.name})`,
            user: userName
        });
        await targetBox.save();
    }

    const log = new TreasuryAuditLog({
        operationId: opId,
        actionType: 'ajuste_saldo',
        boxKey: box.key,
        boxName: box.name,
        targetBoxKey: sourceBox?.key || targetBox?.key || null,
        targetBoxName: sourceBox?.name || targetBox?.name || null,
        currency: curr,
        amount: diff,
        balanceBefore: prevBalance,
        balanceAfter: targetBalance,
        fieldsModified: [{
            fieldName: field,
            fieldLabel: `Saldo ${curr}`,
            previousValue: prevBalance,
            newValue: targetBalance
        }],
        reason: cleanReason,
        user: userName,
        userRole,
        date: new Date()
    });

    box.history.push({
        date: new Date(),
        type: 'ajuste',
        amount: diff,
        currency: curr,
        reason: cleanReason,
        user: userName
    });

    await Promise.all([box.save(), log.save()]);

    return {
        ok: true,
        box,
        preview,
        log,
        message: `Saldo de ${box.name} ajustado con éxito a ${curr} ${targetBalance.toLocaleString('es-AR')}.`
    };
}

/**
 * Revierte un ajuste o transferencia manual registrado en TreasuryAuditLog.
 * Genera un nuevo registro de reversión vinculado, sin borrar ni sobrescribir el historial original.
 */
export async function revertAdjustment(payload, user) {
    const { logId, reason } = payload || {};
    if (!reason || !String(reason).trim()) {
        throw new Error('El motivo de la reversión es obligatorio.');
    }
    const cleanReason = String(reason).trim();
    const userName = user?.name || user?.email || 'Admin';
    const userRole = user?.role || 'Admin';

    const originalLog = await TreasuryAuditLog.findById(logId);
    if (!originalLog) throw new Error('Registro de historial no encontrado.');
    if (originalLog.isReversal) throw new Error('No podés revertir un registro que ya es una reversión.');

    const alreadyReverted = await TreasuryAuditLog.findOne({ revertedLogId: originalLog._id });
    if (alreadyReverted) throw new Error('Esta operación ya fue revertida previamente.');

    const curr = originalLog.currency || 'ARS';
    const field = curr === 'USD' ? 'balanceUSD' : 'balanceARS';
    const opId = 'rev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    if (originalLog.actionType === 'transferencia_entre_cajas') {
        const fromBoxKey = originalLog.boxKey;
        const toBoxKey = originalLog.targetBoxKey;
        const amount = Math.abs(originalLog.amount);

        const fromBox = await TreasuryBox.findOne({ key: fromBoxKey });
        const toBox = await TreasuryBox.findOne({ key: toBoxKey });

        if (!fromBox || !toBox) throw new Error('Una de las cajas de la transferencia ya no existe.');
        if ((toBox[field] || 0) < amount) {
            throw new Error(`Saldo insuficiente en ${toBox.name} para revertir la transferencia (requiere ${curr} ${amount.toLocaleString('es-AR')}, saldo actual: ${curr} ${(toBox[field] || 0).toLocaleString('es-AR')}).`);
        }

        const toBefore = roundMoney(toBox[field]);
        const fromBefore = roundMoney(fromBox[field]);

        toBox[field] = roundMoney(toBefore - amount);
        fromBox[field] = roundMoney(fromBefore + amount);

        const revLogFrom = new TreasuryAuditLog({
            operationId: opId,
            actionType: 'reversion_ajuste',
            boxKey: fromBox.key,
            boxName: fromBox.name,
            targetBoxKey: toBox.key,
            targetBoxName: toBox.name,
            currency: curr,
            amount,
            balanceBefore: fromBefore,
            balanceAfter: fromBox[field],
            reason: cleanReason,
            revertedLogId: originalLog._id,
            isReversal: true,
            user: userName,
            userRole,
            date: new Date()
        });

        const revLogTo = new TreasuryAuditLog({
            operationId: opId,
            actionType: 'reversion_ajuste',
            boxKey: toBox.key,
            boxName: toBox.name,
            targetBoxKey: fromBox.key,
            targetBoxName: fromBox.name,
            currency: curr,
            amount: -amount,
            balanceBefore: toBefore,
            balanceAfter: toBox[field],
            reason: cleanReason,
            revertedLogId: originalLog._id,
            isReversal: true,
            user: userName,
            userRole,
            date: new Date()
        });

        fromBox.history.push({ date: new Date(), type: 'reversion_cobro', amount, currency: curr, reason: cleanReason, user: userName });
        toBox.history.push({ date: new Date(), type: 'reversion_cobro', amount: -amount, currency: curr, reason: cleanReason, user: userName });

        await Promise.all([fromBox.save(), toBox.save(), revLogFrom.save(), revLogTo.save()]);

        return {
            ok: true,
            message: `Transferencia revertida exitosamente. Se restituyeron ${curr} ${amount.toLocaleString('es-AR')} a ${fromBox.name}.`
        };
    } else if (originalLog.actionType === 'ajuste_saldo') {
        const box = await TreasuryBox.findOne({ key: originalLog.boxKey });
        if (!box) throw new Error(`Caja ${originalLog.boxKey} no encontrada.`);

        const prevBalance = roundMoney(box[field] || 0);
        const amountToUndo = originalLog.amount;
        const resultingBalance = roundMoney(prevBalance - amountToUndo);

        if (resultingBalance < 0) {
            throw new Error(`No se puede revertir el ajuste porque la caja quedaría con saldo negativo (${curr} ${resultingBalance.toLocaleString('es-AR')}).`);
        }

        box[field] = resultingBalance;

        const revLog = new TreasuryAuditLog({
            operationId: opId,
            actionType: 'reversion_ajuste',
            boxKey: box.key,
            boxName: box.name,
            currency: curr,
            amount: -amountToUndo,
            balanceBefore: prevBalance,
            balanceAfter: resultingBalance,
            reason: cleanReason,
            revertedLogId: originalLog._id,
            isReversal: true,
            user: userName,
            userRole,
            date: new Date()
        });

        box.history.push({
            date: new Date(),
            type: 'ajuste',
            amount: -amountToUndo,
            currency: curr,
            reason: `Reversión: ${cleanReason}`,
            user: userName
        });

        await Promise.all([box.save(), revLog.save()]);

        return {
            ok: true,
            message: `Ajuste revertido exitosamente en ${box.name}. Saldo restituido a ${curr} ${resultingBalance.toLocaleString('es-AR')}.`
        };
    } else {
        throw new Error(`La acción de tipo ${originalLog.actionType} debe revertirse mediante su flujo específico.`);
    }
}

/**
 * Consulta el historial de movimientos de tesorería con filtros y paginación.
 */
export async function getTreasuryHistory(query = {}) {
    const {
        boxKey,
        actionType,
        user,
        startDate,
        endDate,
        page = 1,
        limit = 20
    } = query;

    const filter = {};
    if (boxKey && boxKey !== 'todas') {
        filter.$or = [{ boxKey }, { targetBoxKey: boxKey }];
    }
    if (actionType && actionType !== 'todos') {
        filter.actionType = actionType;
    }
    if (user && user.trim()) {
        filter.user = { $regex: escapeRegex(user.trim()), $options: 'i' };
    }
    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.date.$lte = end;
        }
    }

    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const total = await TreasuryAuditLog.countDocuments(filter);
    const items = await TreasuryAuditLog.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

    return {
        ok: true,
        items,
        total,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit),
        limit: parsedLimit
    };
}

/**
 * Diagnóstico integral en modo de solo lectura de movimientos, cuentas, cajas, pagos de compra y cobros.
 * No muta la base de datos ni crea transacciones automáticas.
 */
export async function runTreasuryDiagnosticAudit() {
    await ensureDefaultBoxes();
    const accounts = await Account.find({ isActive: { $ne: false } }).lean();
    const boxes = await TreasuryBox.find({ isActive: true }).lean();

    let totalCuentasARS = 0;
    let totalCuentasUSD = 0;
    let totalEfectivoARS = 0;
    let totalEfectivoUSD = 0;
    let totalBancosARS = 0;
    let totalBancosUSD = 0;
    const accountIssues = [];

    accounts.forEach(acc => {
        const bal = roundMoney(Number(acc.balance || 0));
        const isPhysical = acc.type === 'Efectivo';
        if (acc.currency === 'USD') {
            totalCuentasUSD += bal;
            if (isPhysical) totalEfectivoUSD += bal;
            else totalBancosUSD += bal;
        } else {
            totalCuentasARS += bal;
            if (isPhysical) totalEfectivoARS += bal;
            else totalBancosARS += bal;
        }

        if (isPhysical && bal < 0) {
            accountIssues.push({
                accountId: acc._id,
                accountName: acc.name,
                currency: acc.currency,
                balance: bal,
                severity: 'error',
                description: `Saldo negativo en caja de efectivo físico (${acc.currency} ${bal.toLocaleString('es-AR')}). Requiere arqueo conciliatorio.`
            });
        } else if (!isPhysical && bal < 0) {
            accountIssues.push({
                accountId: acc._id,
                accountName: acc.name,
                currency: acc.currency,
                balance: bal,
                severity: 'warning',
                description: `Descubierto bancario registrado (${acc.currency} ${bal.toLocaleString('es-AR')}).`
            });
        }
    });

    totalCuentasARS = roundMoney(totalCuentasARS);
    totalCuentasUSD = roundMoney(totalCuentasUSD);

    let totalCajasARS = 0;
    let totalCajasUSD = 0;
    const negativeBoxes = [];

    boxes.forEach(b => {
        const bARS = roundMoney(Number(b.balanceARS || 0));
        const bUSD = roundMoney(Number(b.balanceUSD || 0));
        totalCajasARS += bARS;
        totalCajasUSD += bUSD;

        if (bARS < 0 || bUSD < 0) {
            negativeBoxes.push({
                boxKey: b.key,
                boxName: b.name,
                balanceARS: bARS,
                balanceUSD: bUSD,
                severity: 'error',
                description: `Caja estratégica ${b.name} tiene saldo negativo.`
            });
        }
    });

    totalCajasARS = roundMoney(totalCajasARS);
    totalCajasUSD = roundMoney(totalCajasUSD);

    const unallocatedARS = roundMoney(totalCuentasARS - totalCajasARS);
    const unallocatedUSD = roundMoney(totalCuentasUSD - totalCajasUSD);

    // Ecuación Central: Liquidez real === Cajas + Sin Asignar
    const diffConciliacionARS = roundMoney(totalCuentasARS - (totalCajasARS + unallocatedARS));
    const diffConciliacionUSD = roundMoney(totalCuentasUSD - (totalCajasUSD + unallocatedUSD));

    // Detección de Pagos de compra sin deducción estratégica vinculada
    const purchaseTxs = await Transaction.find({
        type: 'Egreso',
        $or: [
            { category: 'compra_vehiculo' },
            { category: 'Pago compra vehículo' },
            { category: 'Pago Empresas' },
            { carId: { $exists: true, $ne: null } }
        ]
    }).sort({ date: -1 }).limit(100).lean();

    const unlinkedPurchasePayments = [];
    purchaseTxs.forEach(tx => {
        if (!tx.treasuryBoxKey && !tx.isTreasuryExpenseSynced && (!tx.notes || !tx.notes.includes('unallocated'))) {
            unlinkedPurchasePayments.push({
                transactionId: tx._id,
                amount: tx.amount,
                currency: tx.currency,
                concept: tx.concept,
                date: tx.date,
                notes: 'Pago de compra registrado sin caja estratégica ni dinero sin asignar explícito.'
            });
        }
    });

    // Detección de Posibles Duplicados (misma fecha aprox, monto y cuenta)
    const recentTxs = await Transaction.find().sort({ createdAt: -1 }).limit(300).lean();
    const potentialDuplicates = [];
    for (let i = 0; i < recentTxs.length; i++) {
        for (let j = i + 1; j < recentTxs.length; j++) {
            const a = recentTxs[i];
            const b = recentTxs[j];
            if (
                a.type === b.type &&
                Math.abs(Number(a.amount || 0) - Number(b.amount || 0)) < 0.01 &&
                a.currency === b.currency &&
                String(a.accountId || '') === String(b.accountId || '') &&
                a.category === b.category &&
                Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) < 10 * 60 * 1000 // 10 min
            ) {
                potentialDuplicates.push({
                    tx1Id: a._id,
                    tx2Id: b._id,
                    amount: a.amount,
                    currency: a.currency,
                    concept: a.concept,
                    category: a.category,
                    date: a.date
                });
            }
        }
    }

    // Detección de Inconsistencias en Autos
    const carsWithPayments = await Car.find({
        'purchasePaymentState.amountPaid': { $gt: 0 }
    }).select('brand name plateOrVin purchasePrice purchaseCurrency purchasePaymentState').lean();

    const carInconsistencies = [];
    carsWithPayments.forEach(c => {
        const state = c.purchasePaymentState;
        if (state && state.status !== 'conciliacion_pendiente') {
            const agencyCost = Number(state.agencyCost || state.totalCost || c.purchasePrice || 0);
            const paid = Number(state.amountPaid || 0);
            const pending = Number(state.pendingDebt || 0);
            if (Math.abs((paid + pending) - agencyCost) > 1) {
                carInconsistencies.push({
                    carId: c._id,
                    carLabel: `${c.brand} ${c.name} (${c.plateOrVin || 'S/P'})`,
                    agencyCost,
                    paid,
                    pending,
                    difference: roundMoney(agencyCost - (paid + pending))
                });
            }
        }
    });

    const isSystemBalanced = diffConciliacionARS === 0 && diffConciliacionUSD === 0 && accountIssues.filter(i => i.severity === 'error').length === 0 && negativeBoxes.length === 0;

    return {
        ok: true,
        timestamp: new Date(),
        isSystemBalanced,
        reconciliationEquation: {
            ARS: {
                totalCuentas: totalCuentasARS,
                totalCajas: totalCajasARS,
                unallocated: unallocatedARS,
                difference: diffConciliacionARS,
                formula: `${totalCuentasARS} = ${totalCajasARS} (cajas) + ${unallocatedARS} (sin asignar)`,
                isBalanced: diffConciliacionARS === 0
            },
            USD: {
                totalCuentas: totalCuentasUSD,
                totalCajas: totalCajasUSD,
                unallocated: unallocatedUSD,
                difference: diffConciliacionUSD,
                formula: `${totalCuentasUSD} = ${totalCajasUSD} (cajas) + ${unallocatedUSD} (sin asignar)`,
                isBalanced: diffConciliacionUSD === 0
            }
        },
        liquidityDetails: {
            accounts: {
                totalARS: totalCuentasARS,
                totalUSD: totalCuentasUSD,
                efectivoARS: totalEfectivoARS,
                efectivoUSD: totalEfectivoUSD,
                bancosARS: totalBancosARS,
                bancosUSD: totalBancosUSD,
                list: accounts.map(a => ({ id: a._id, name: a.name, type: a.type, currency: a.currency, balance: a.balance }))
            },
            boxes: {
                totalARS: totalCajasARS,
                totalUSD: totalCajasUSD,
                list: boxes.map(b => ({ key: b.key, name: b.name, balanceARS: b.balanceARS, balanceUSD: b.balanceUSD }))
            }
        },
        auditFindings: {
            accountIssues,
            negativeBoxes,
            unlinkedPurchasePayments: unlinkedPurchasePayments.slice(0, 20),
            potentialDuplicates: potentialDuplicates.slice(0, 10),
            carInconsistencies: carInconsistencies.slice(0, 20)
        },
        summary: {
            totalAccounts: accounts.length,
            totalBoxes: boxes.length,
            issuesCount: accountIssues.length + negativeBoxes.length + unlinkedPurchasePayments.length + carInconsistencies.length,
            statusLabel: isSystemBalanced ? 'Conciliación Cuadrada y Equilibrada' : 'Observaciones para Conciliación'
        }
    };
}
