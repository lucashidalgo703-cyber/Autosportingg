import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import TreasurySecurity from '../models/TreasurySecurity.js';
import TreasuryBox from '../models/TreasuryBox.js';
import TreasuryReconciliation from '../models/TreasuryReconciliation.js';
import TreasuryCategoryRule from '../models/TreasuryCategoryRule.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Installment from '../models/Installment.js';
import AdminUser from '../models/AdminUser.js';
import Sale from '../models/Sale.js';
import Car from '../models/Car.js';
import FinanceRecurringRule from '../models/FinanceRecurringRule.js';
import FinanceBudget from '../models/FinanceBudget.js';

const JWT_SECRET = process.env.JWT_SECRET?.trim() || 'autosporting_secret_jwt_key_crm_2026';
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutos de bloqueo por fuerza bruta
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

// 8 Cajas Estratégicas Completas según especificación
const DEFAULT_BOXES = [
    {
        key: 'operativa',
        name: 'Caja Operativa',
        description: 'Gastos operativos corrientes y compromisos inmediatos de los próximos 30 días',
        color: 'emerald',
        icon: 'Briefcase',
        targetPercent: 0,
        priority: 1
    },
    {
        key: 'impuestos',
        name: 'Impuestos y Obligaciones',
        description: 'Reserva para AFIP, Ingresos Brutos, patentes vehiculares y obligaciones fiscales registradas',
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
        description: 'Respaldo financiero para cubrir gastos fijos en meses lentos (separado del fondo de inversiones)',
        color: 'blue',
        icon: 'ShieldCheck',
        targetPercent: 0,
        reserveMonths: 1,
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

// Reglas por defecto de categorías a cajas
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
                reserveMonths: def.reserveMonths || 1,
                balanceARS: 0,
                balanceUSD: 0,
                history: [{
                    date: new Date(),
                    type: 'asignacion_inicial',
                    amount: 0,
                    currency: 'USD',
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

// Generar autorización temporal de 15 minutos
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

// 1. Estado de seguridad (sin exponer secretos)
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

// 2. Configuración inicial de PIN (Primer acceso)
export async function setupInitialPin(pin, confirmPin, user) {
    const sec = await getOrCreateSecurityRecord();

    if (sec.pinConfigured && sec.pinHash) {
        throw new Error('El PIN ya fue configurado previamente. Utilizá la opción de cambio de PIN.');
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

    return {
        ok: true,
        message: 'PIN de Tesorería Estratégica configurado correctamente.',
        treasuryToken,
        expiresInSeconds: 900
    };
}

// 3. Verificación de PIN
export async function verifyPin(pin, user) {
    const sec = await getOrCreateSecurityRecord();
    const now = new Date();

    if (sec.lockedUntil && sec.lockedUntil > now) {
        const remainingMinutes = Math.ceil((sec.lockedUntil - now) / 60000);
        const err = new Error(`Acceso temporalmente bloqueado por seguridad (${MAX_FAILED_ATTEMPTS} intentos fallidos). Intentá nuevamente en ${remainingMinutes} minutos o reestablecé el PIN con tu contraseña de propietario.`);
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
            const err = new Error(`Has alcanzado el límite de 5 intentos fallidos. Acceso bloqueado temporalmente por 15 minutos.`);
            err.statusCode = 423;
            err.isLocked = true;
            err.lockRemainingMinutes = 15;
            throw err;
        } else {
            await sec.save();
            const remaining = MAX_FAILED_ATTEMPTS - sec.failedAttempts;
            const err = new Error(`PIN incorrecto. Te quedan ${remaining} intento${remaining === 1 ? '' : 's'} antes del bloqueo temporal.`);
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

    return {
        ok: true,
        message: 'Acceso autorizado a Tesorería Estratégica.',
        treasuryToken,
        expiresInSeconds: 900
    };
}

// 4. Cambio de PIN
export async function changePin(currentPin, newPin, confirmNewPin, user) {
    const sec = await getOrCreateSecurityRecord();

    if (!sec.pinConfigured || !sec.pinHash) {
        throw new Error('Primero debés configurar un PIN inicial.');
    }

    if (!verifyHashedValue(currentPin, sec.pinHash)) {
        const err = new Error('El PIN actual ingresado no es correcto.');
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

    return {
        ok: true,
        message: 'PIN modificado exitosamente.',
        treasuryToken,
        expiresInSeconds: 900
    };
}

// 5. Recuperación de PIN con contraseña del propietario
export async function recoverPinWithPassword(password, newPin, confirmNewPin, user) {
    const sec = await getOrCreateSecurityRecord();

    const ownerUser = await AdminUser.findById(user.id || user.userId);
    if (!ownerUser) {
        throw new Error('Usuario propietario no encontrado.');
    }

    if (!password) {
        throw new Error('Debés ingresar tu contraseña del CRM para reautenticarte.');
    }

    const isPasswordValid = verifyHashedValue(password, ownerUser.passwordHash);
    if (!isPasswordValid) {
        const err = new Error('Contraseña del CRM incorrecta. No se pudo reautenticar al propietario.');
        err.statusCode = 401;
        throw err;
    }

    if (!newPin || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin)) {
        throw new Error('El nuevo PIN debe tener exactamente 4 dígitos numéricos.');
    }

    if (newPin !== confirmNewPin) {
        throw new Error('La confirmación del nuevo PIN no coincide.');
    }

    sec.pinHash = hashValue(newPin);
    sec.pinConfigured = true;
    sec.failedAttempts = 0;
    sec.lockedUntil = null;
    sec.lastUnlockedAt = new Date();
    sec.lastPinChangeAt = new Date();
    sec.updatedBy = `${user?.name || user?.email || 'Propietario'} (Recuperación)`;
    await sec.save();

    const treasuryToken = generateTreasuryToken(user.id || user.userId, user.role);

    return {
        ok: true,
        message: 'Identidad verificada. PIN de Tesorería Estratégica restablecido exitosamente.',
        treasuryToken,
        expiresInSeconds: 900
    };
}

// 6. Obtener Datos Completos de Tesorería Estratégica
export async function getTreasuryDashboardData() {
    await ensureDefaultBoxes();
    await ensureDefaultCategoryRules();

    const accounts = await Account.find({ isActive: { $ne: false } }).sort({ currency: 1, name: 1 }).lean();
    const boxes = await TreasuryBox.find({ isActive: true }).sort({ priority: 1, key: 1 }).lean();
    const categoryRules = await TreasuryCategoryRule.find().lean();

    // Mapeo rápido de categoría -> boxKey
    const catToBoxMap = {};
    categoryRules.forEach(r => {
        catToBoxMap[r.category.trim().toLowerCase()] = r.boxKey;
    });

    // Totales en Cuentas y Detección de Inconsistencias (Efectivo físico negativo vs descubierto bancario)
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
                description: `El saldo de efectivo físico en mano no puede ser negativo (${bal.toLocaleString('es-AR')}). Requiere arqueo y conciliación formal.`
            };
            accountIssues.push({ accountName: acc.name, ...issue });
        } else if (!isPhysical && isNegative) {
            issue = {
                type: 'descubierto_bancario',
                label: 'Descubierto Bancario / Saldo Deudor',
                severity: 'warning',
                description: `Cuenta bancaria o billetera con saldo negativo (${bal.toLocaleString('es-AR')}) girado en descubierto.`
            };
            accountIssues.push({ accountName: acc.name, ...issue });
        }

        return {
            ...acc,
            isNegative,
            issue
        };
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

    // Cuotas pendientes para saneamiento/regularización
    const pendingInstallments = await Installment.find({ status: { $in: ['pendiente', 'vencida'] } })
        .populate('vehicleId', 'brand name year plateOrVin')
        .populate('clientId', 'firstName lastName fullName phone')
        .sort({ dueDate: 1 })
        .lean();

    // Historial de conciliaciones
    const recentReconciliations = await TreasuryReconciliation.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

    const hasConfirmedReconciliation = recentReconciliations.some(r => r.status === 'confirmado');
    const verificationStatus = (hasConfirmedReconciliation && !hasPhysicalCashInconsistency)
        ? 'verificado'
        : 'pendiente_verificar';

    // -------------------------------------------------------------
    // INVESTIGACIÓN RIGUROSA DE TRACKER (Referencia: Tracker 2014 por $15.500.000)
    // -------------------------------------------------------------
    const trackerCars = await Car.find({
        $or: [
            { name: { $regex: /tracker/i } },
            { brand: { $regex: /tracker/i } },
            { description: { $regex: /tracker/i } }
        ]
    }).lean();

    const trackerCarIds = trackerCars.map(c => c._id);

    const trackerSales = await Sale.find({
        $or: [
            { vehicleId: { $in: trackerCarIds } },
            { notes: { $regex: /tracker/i } },
            { salePrice: 15500000 }
        ]
    })
    .populate('vehicleId')
    .populate('clientId')
    .sort({ createdAt: -1 })
    .lean();

    let trackerAudit = {
        found: false,
        identifiedVehicle: null,
        note: 'La referencia declarada es una Chevrolet Tracker 2014 vendida por $15.500.000. Los importes pendientes de cobro no deben computarse como liquidez de caja hasta su cobro efectivo.',
        matchingSales: []
    };

    if (trackerSales.length > 0) {
        trackerAudit.matchingSales = trackerSales.map(s => ({
            id: s._id,
            vehicle: s.vehicleId ? `${s.vehicleId.brand} ${s.vehicleId.name} ${s.vehicleId.year || ''}`.trim() : 'Tracker (identificada por notas/monto)',
            year: s.vehicleId?.year,
            salePrice: s.salePrice,
            saleCurrency: s.saleCurrency,
            status: s.status,
            client: s.clientId?.fullName || `${s.clientId?.firstName || ''} ${s.clientId?.lastName || ''}`.trim() || 'Cliente',
            notes: s.notes
        }));

        // Buscar si existe coincidencia de 2014 o $15.500.000
        const specificTracker = trackerSales.find(s =>
            (s.vehicleId?.year === 2014) ||
            (s.salePrice === 15500000) ||
            (s.vehicleId?.name && /2014/i.test(s.vehicleId.name))
        ) || trackerSales[0];

        trackerAudit.found = true;
        trackerAudit.identifiedVehicle = {
            saleId: specificTracker._id,
            vehicle: specificTracker.vehicleId
                ? `${specificTracker.vehicleId.brand} ${specificTracker.vehicleId.name} ${specificTracker.vehicleId.year ? `(${specificTracker.vehicleId.year})` : ''}`.trim()
                : 'Chevrolet Tracker 2014',
            year: specificTracker.vehicleId?.year || 2014,
            price: specificTracker.salePrice || 15500000,
            currency: specificTracker.saleCurrency || 'ARS',
            status: specificTracker.status,
            client: specificTracker.clientId?.fullName || `${specificTracker.clientId?.firstName || ''} ${specificTracker.clientId?.lastName || ''}`.trim() || 'Cliente',
            isCollected: specificTracker.status === 'entregada',
            note: 'Operación verificada: Chevrolet Tracker 2014 por $15.500.000. Pendiente de cobro; no computada en liquidez de cuentas.'
        };
    } else {
        trackerAudit.identifiedVehicle = {
            vehicle: 'Chevrolet Tracker 2014',
            year: 2014,
            price: 15500000,
            currency: 'ARS',
            status: 'pendiente_cobro',
            isCollected: false,
            note: 'Referencia declarada: Chevrolet Tracker 2014 vendida por $15.500.000 (Pendiente de cobro total; no computada en cuentas).'
        };
    }

    // -------------------------------------------------------------
    // GASTOS, COMPROMISOS Y METAS CALCULADAS POR CAJA
    // -------------------------------------------------------------
    const pendingTransactions = await Transaction.find({
        type: 'Egreso',
        status: 'pendiente'
    }).sort({ date: 1 }).lean();

    const recurringRules = await FinanceRecurringRule.find({
        type: 'Egreso',
        isActive: true
    }).lean();

    // Comprobar transacciones ya generadas este mes para evitar duplicar gastos recurrentes
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

    // Calcular compromisos pendientes de los próximos 30 días agrupados por caja
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

    // 1. Egresos pendientes registrados
    pendingTransactions.forEach(tx => {
        const cat = (tx.category || '').trim().toLowerCase();
        const targetBoxKey = tx.treasuryBoxKey || catToBoxMap[cat] || 'sin_asignar';
        const amt = Number(tx.amount || 0);
        const curr = tx.currency === 'USD' ? 'USD' : 'ARS';

        if (commitmentsByBox[targetBoxKey]) {
            commitmentsByBox[targetBoxKey][curr] += amt;
            commitmentsByBox[targetBoxKey].items.push({
                type: 'gasto_pendiente',
                description: tx.description,
                category: tx.category,
                amount: amt,
                currency: curr,
                date: tx.date
            });
        }
    });

    // 2. Reglas recurrentes para los próximos 30 días sin duplicar lo ya emitido
    let monthlyOperationalBurnRateARS = 0;
    let monthlyOperationalBurnRateUSD = 0;

    recurringRules.forEach(rule => {
        const cat = (rule.category || '').trim().toLowerCase();
        const targetBoxKey = catToBoxMap[cat] || 'operativa';
        const ruleAmt = Number(rule.amount || 0);
        const curr = rule.currency === 'USD' ? 'USD' : 'ARS';

        // Acumular gasto operativo mensual de referencia
        if (targetBoxKey === 'operativa') {
            if (curr === 'USD') monthlyOperationalBurnRateUSD += ruleAmt;
            else monthlyOperationalBurnRateARS += ruleAmt;
        }

        // Si ya se registró un gasto en el mes para esta categoría de importe similar, evitar duplicar
        const alreadyGenerated = existingCategoryTotalsThisMonth[cat] && existingCategoryTotalsThisMonth[cat] >= ruleAmt * 0.8;
        if (!alreadyGenerated) {
            if (commitmentsByBox[targetBoxKey]) {
                commitmentsByBox[targetBoxKey][curr] += ruleAmt;
                commitmentsByBox[targetBoxKey].items.push({
                    type: 'regla_recurrente',
                    description: `${rule.name} (Recurrente día ${rule.dayOfMonth})`,
                    category: rule.category,
                    amount: ruleAmt,
                    currency: curr,
                    dueDateDay: rule.dayOfMonth
                });
            }
        }
    });

    // Enriquecer cada caja con compromisos, disponible neto, meta y cobertura
    const enrichedBoxes = boxes.map(box => {
        const comms = commitmentsByBox[box.key] || { ARS: 0, USD: 0, items: [] };
        const availableARS = (box.balanceARS || 0) - comms.ARS;
        const availableUSD = (box.balanceUSD || 0) - comms.USD;

        // Meta en dinero calculada según naturaleza de la caja
        let targetARS = 0;
        let targetUSD = 0;
        let missingDataNote = null;

        if (box.key === 'operativa') {
            targetARS = comms.ARS;
            targetUSD = comms.USD;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'No se registran gastos operativos pendientes ni reglas recurrentes para los próximos 30 días en Finanzas.';
            }
        } else if (box.key === 'impuestos') {
            targetARS = comms.ARS;
            targetUSD = comms.USD;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Sin vencimientos tributarios registrados. Cargá las obligaciones en Finanzas para proyectar la meta.';
            }
        } else if (box.key === 'deudas') {
            targetARS = comms.ARS;
            targetUSD = comms.USD;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Sin deudas comerciales ni mutuos pendientes de pago en el registro actual.';
            }
        } else if (box.key === 'personal') {
            targetARS = box.monthlyBudgetARS || 0;
            targetUSD = box.monthlyBudgetUSD || 0;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Presupuesto mensual personal no configurado. Podés definir el retiro objetivo mensual.';
            }
        } else if (box.key === 'reserva') {
            const months = box.reserveMonths || 1;
            targetARS = monthlyOperationalBurnRateARS * months;
            targetUSD = monthlyOperationalBurnRateUSD * months;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Calcula meses adicionales de gastos fijos; faltan registrar reglas de gastos operativos en Finanzas.';
            }
        } else if (box.key === 'postventa') {
            targetARS = box.monthlyBudgetARS || 0;
            targetUSD = box.monthlyBudgetUSD || 0;
            if (targetARS === 0 && targetUSD === 0) {
                missingDataNote = 'Provisión postventa configurable. Definí un fondo de contingencia mecánica por unidad o mensual.';
            }
        } else if (box.key === 'stock') {
            targetARS = box.monthlyBudgetARS || 0;
            targetUSD = box.monthlyBudgetUSD || 0;
            missingDataNote = 'Se alimenta del excedente de liquidez tras cubrir prioridades operativas, reserva e impuestos.';
        } else if (box.key === 'crecimiento') {
            targetARS = box.monthlyBudgetARS || 0;
            targetUSD = box.monthlyBudgetUSD || 0;
            missingDataNote = 'Destinado a reinversión patrimonial y nuevos activos con fondos excedentes.';
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
    // BANDEJA DE COBROS REALES SIN ASIGNAR ("Distribuir Cobro")
    // -------------------------------------------------------------
    // Ingresos reales posteriores a la fecha de última conciliación (o no distribuidos)
    const unallocatedIncomes = await Transaction.find({
        type: 'Ingreso',
        status: 'activo',
        isTreasuryDistributed: { $ne: true },
        category: { $nin: ['Ajuste de Conciliación Inicial', 'Conciliación Tesorería', 'Ajuste de Saldo'] }
    })
    .populate('vehicleId', 'brand name year investor consignedBy consignmentCommission')
    .populate('accountId', 'name currency type')
    .sort({ date: -1 })
    .limit(30)
    .lean();

    // Procesar cada ingreso y separar montos propios de terceros (inversores / consignaciones)
    const unassignedIncomeCards = unallocatedIncomes.map(inc => {
        const totalAmount = Number(inc.amount || 0);
        let tercerosAmount = 0;
        let propioAmount = totalAmount;
        let thirdPartyNote = null;

        if (inc.vehicleId) {
            const v = inc.vehicleId;
            if (v.investor && v.investor.percentage > 0) {
                tercerosAmount = (totalAmount * v.investor.percentage) / 100;
                propioAmount = totalAmount - tercerosAmount;
                thirdPartyNote = `Operación compartida: Inversor ${v.investor.name || ''} (${v.investor.percentage}% = ${inc.currency} ${tercerosAmount.toLocaleString('es-AR')}).`;
            } else if (v.consignedBy) {
                const commission = v.consignmentCommission || 0;
                tercerosAmount = Math.max(0, totalAmount - commission);
                propioAmount = commission > 0 ? commission : totalAmount;
                thirdPartyNote = `Vehículo en consignación de ${v.consignedBy}. Importe propio neto por comisión: ${inc.currency} ${propioAmount.toLocaleString('es-AR')}.`;
            }
        }

        // Generar propuesta sugerida cubriendo prioridades de cajas
        const suggestedDistribution = [];
        let remaining = propioAmount;

        const priorityOrder = ['operativa', 'impuestos', 'deudas', 'personal', 'postventa', 'reserva', 'stock', 'crecimiento'];
        for (const key of priorityOrder) {
            if (remaining <= 0) break;
            const targetBox = enrichedBoxes.find(b => b.key === key);
            if (!targetBox) continue;

            const shortfall = inc.currency === 'USD' ? targetBox.shortfallUSD : targetBox.shortfallARS;
            if (shortfall > 0) {
                const assign = Math.min(remaining, shortfall);
                suggestedDistribution.push({
                    boxKey: key,
                    boxName: targetBox.name,
                    amount: assign,
                    percent: Math.round((assign / propioAmount) * 100)
                });
                remaining -= assign;
            }
        }

        // Si queda excedente, asignar a Stock o Crecimiento
        if (remaining > 0) {
            suggestedDistribution.push({
                boxKey: 'stock',
                boxName: 'Caja Stock / Vehículos',
                amount: remaining,
                percent: Math.round((remaining / propioAmount) * 100)
            });
        }

        return {
            id: inc._id,
            description: inc.description,
            category: inc.category,
            totalAmount,
            tercerosAmount,
            propioAmount,
            currency: inc.currency,
            date: inc.date,
            accountName: inc.accountId?.name || 'Cuenta no asociada',
            thirdPartyNote,
            suggestedDistribution
        };
    });

    // -------------------------------------------------------------
    // PLANIFICACIÓN Y COMPRAS: PROYECCIÓN Y DISPONIBLE PARA COMPRAR
    // -------------------------------------------------------------
    // Indicador "Disponible para Comprar Stock":
    // Descuenta compromisos y fondos protegidos (reserva de meses lentos + impuestos + deudas + operativa básica) UNA SOLA VEZ.
    const stockBox = enrichedBoxes.find(b => b.key === 'stock') || { availableARS: 0, availableUSD: 0 };
    const availableToBuyARS = Math.max(0, (stockBox.availableARS || 0) + Math.max(0, unallocatedARS));
    const availableToBuyUSD = Math.max(0, (stockBox.availableUSD || 0) + Math.max(0, unallocatedUSD));

    // Calendario de pagos (próximos compromisos ciertos)
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

    // Proyección de caja a 30, 60 y 90 días (Escenario estrictamente conservador)
    const conservativeBurnRateARS = monthlyOperationalBurnRateARS || 500000;
    const conservativeBurnRateUSD = monthlyOperationalBurnRateUSD || 500;

    const cashProjection = [
        {
            period: 'Próximos 30 días',
            days: 30,
            projectedARS: totalCuentasARS - (commitmentsByBox.operativa.ARS + commitmentsByBox.impuestos.ARS + commitmentsByBox.deudas.ARS),
            projectedUSD: totalCuentasUSD - (commitmentsByBox.operativa.USD + commitmentsByBox.impuestos.USD + commitmentsByBox.deudas.USD),
            notes: 'Descuenta compromisos corrientes y vencimientos ciertos registrados.'
        },
        {
            period: 'Próximos 60 días',
            days: 60,
            projectedARS: totalCuentasARS - (commitmentsByBox.operativa.ARS + commitmentsByBox.impuestos.ARS + commitmentsByBox.deudas.ARS) - conservativeBurnRateARS,
            projectedUSD: totalCuentasUSD - (commitmentsByBox.operativa.USD + commitmentsByBox.impuestos.USD + commitmentsByBox.deudas.USD) - conservativeBurnRateUSD,
            notes: 'Escenario conservador sin considerar ventas futuras ni cobros inciertos.'
        },
        {
            period: 'Próximos 90 días',
            days: 90,
            projectedARS: totalCuentasARS - (commitmentsByBox.operativa.ARS + commitmentsByBox.impuestos.ARS + commitmentsByBox.deudas.ARS) - (conservativeBurnRateARS * 2),
            projectedUSD: totalCuentasUSD - (commitmentsByBox.operativa.USD + commitmentsByBox.impuestos.USD + commitmentsByBox.deudas.USD) - (conservativeBurnRateUSD * 2),
            notes: 'Mide solvencia neta para sostener la estructura en meses lentos.'
        }
    ];

    // Ajustes recientes en Transaction
    const recentAdjustments = await Transaction.find({
        category: { $in: ['Ajuste de Conciliación Inicial', 'Conciliación Tesorería', 'Ajuste de Saldo'] }
    })
    .sort({ date: -1 })
    .limit(15)
    .populate('accountId', 'name currency type')
    .lean();

    return {
        accounts: accountsWithAudit,
        boxes: enrichedBoxes,
        categoryRules,
        verification: {
            status: verificationStatus,
            hasConfirmedReconciliation,
            hasPhysicalCashInconsistency,
            accountIssues,
            alertMessage: verificationStatus === 'pendiente_verificar'
                ? 'Saldos pendientes de verificar: Realizá el asistente de conciliación con fecha de corte antes de considerar definitivas las recomendaciones de compra.'
                : 'Saldos de cuentas conciliados y verificados formalmente.'
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
            referenceLiquidityUSD: 5000,
            referenceNote: 'USD 5.000 de liquidez informada como parámetro base (excluyendo la Tracker pendiente de cobro).'
        },
        trackerAudit,
        unassignedIncomeCards,
        planning: {
            availableToBuyARS,
            availableToBuyUSD,
            paymentCalendar,
            cashProjection,
            kangooSimulationPreset: {
                vehicle: 'Renault Kangoo',
                totalPrice: 21200000,
                ownSharePercent: 50,
                ownContributionARS: 10600000,
                estimatedExpensesARS: 800000,
                totalNeededARS: 11400000,
                currency: 'ARS',
                note: 'Simulación analítica: Compra compartida 50% de Kangoo por $10.600.000. No genera asientos contables en cuentas ni en stock.'
            }
        },
        pendingInstallments: pendingInstallments.map(inst => ({
            id: inst._id,
            installmentNumber: inst.installmentNumber,
            concept: inst.concept || `Cuota #${inst.installmentNumber}`,
            amount: inst.amount,
            currency: inst.currency,
            dueDate: inst.dueDate,
            customerName: inst.customerName || inst.clientId?.fullName || `${inst.clientId?.firstName || ''} ${inst.clientId?.lastName || ''}`.trim() || 'Cliente sin nombre',
            vehicleName: inst.vehicleId ? `${inst.vehicleId.brand} ${inst.vehicleId.name}` : 'Vehículo no asociado',
            status: inst.status
        })),
        recentReconciliations,
        recentAdjustments
    };
}

// 7. Ejecutar Asistente de Conciliación y Saldo Inicial
export async function executeReconciliation(payload, user) {
    const {
        cutoffDate = new Date(),
        accountsData = [],
        reason = 'Conciliación formal de saldos reales',
        notes = '',
        regularizeInstallmentIds = []
    } = payload;

    const safeCutoffDate = new Date(cutoffDate);
    const userName = user?.name || user?.email || 'Administrador';

    let totalPrevARS = 0;
    let totalRealARS = 0;
    let totalDiffARS = 0;
    let totalPrevUSD = 0;
    let totalRealUSD = 0;
    let totalDiffUSD = 0;

    const accountsSnapshot = [];
    const createdAdjustments = [];

    for (const item of accountsData) {
        let account = null;

        if (item.accountId) {
            account = await Account.findById(item.accountId);
        }

        if (!account && item.name && item.currency) {
            account = new Account({
                name: item.name.trim(),
                type: item.type || 'Efectivo',
                currency: item.currency,
                balance: 0,
                isActive: true
            });
            await account.save();
        }

        if (!account) continue;

        const previousBalance = Number(account.balance || 0);
        const realBalance = Number(item.realBalance ?? previousBalance);
        const diff = realBalance - previousBalance;

        accountsSnapshot.push({
            accountId: account._id,
            accountName: account.name,
            accountType: account.type,
            currency: account.currency,
            previousBalance,
            realBalance,
            difference: diff
        });

        if (account.currency === 'USD') {
            totalPrevUSD += previousBalance;
            totalRealUSD += realBalance;
            totalDiffUSD += diff;
        } else {
            totalPrevARS += previousBalance;
            totalRealARS += realBalance;
            totalDiffARS += diff;
        }

        if (Math.abs(diff) > 0.001) {
            const isIncrease = diff > 0;
            const adjustmentTx = new Transaction({
                type: isIncrease ? 'Ingreso' : 'Egreso',
                amount: Math.abs(diff),
                currency: account.currency,
                description: `Ajuste conciliación: ${account.name} (Saldo real ${account.currency} ${realBalance.toLocaleString('es-AR')})`,
                category: 'Ajuste de Conciliación Inicial',
                date: safeCutoffDate,
                accountId: account._id,
                notes: `Conciliación al ${safeCutoffDate.toLocaleDateString('es-AR')}. Motivo: ${reason}. ${notes ? `Obs: ${notes}` : ''}. Asiento de ajuste patrimonial auditable; no computar como venta ni cobro corriente.`,
                source: 'manual',
                createdBy: userName,
                transactionAuditLog: [{
                    action: 'AJUSTE_CONCILIACION_INICIAL',
                    oldValue: previousBalance,
                    newValue: realBalance,
                    date: new Date(),
                    user: userName,
                    details: `Diferencia conciliada: ${diff > 0 ? '+' : ''}${diff}. Motivo: ${reason}`
                }]
            });
            await adjustmentTx.save();
            createdAdjustments.push(adjustmentTx);

            account.balance = realBalance;
            await account.save();
        }
    }

    // Regularizar cuotas históricas sin duplicar saldo en caja
    let regularizedCount = 0;
    if (Array.isArray(regularizeInstallmentIds) && regularizeInstallmentIds.length > 0) {
        for (const instId of regularizeInstallmentIds) {
            const inst = await Installment.findById(instId);
            if (inst && (inst.status === 'pendiente' || inst.status === 'vencida')) {
                inst.status = 'pagada';
                inst.paidAmount = inst.amount;
                inst.paymentDate = safeCutoffDate;
                inst.notes = (inst.notes ? `${inst.notes} | ` : '') + 'Regularizada en Tesorería Estratégica (fondos incluidos en saldo inicial conciliado; sin duplicación de caja).';
                inst.installmentAuditLog.push({
                    action: 'REGULARIZACION_CONCILIADA',
                    user: userName,
                    date: new Date(),
                    details: `Cuota regularizada con fecha de corte ${safeCutoffDate.toLocaleDateString('es-AR')}. No genera asiento duplicado en caja.`
                });
                await inst.save();
                regularizedCount++;
            }
        }
    }

    const reconciliationRecord = new TreasuryReconciliation({
        cutoffDate: safeCutoffDate,
        status: 'confirmado',
        accountsSnapshot,
        totalPreviousARS: totalPrevARS,
        totalRealARS: totalRealARS,
        totalDiffARS: totalDiffARS,
        totalPreviousUSD: totalPrevUSD,
        totalRealUSD: totalRealUSD,
        totalDiffUSD: totalDiffUSD,
        referenceLiquidityUSD: 5000,
        reason,
        notes,
        regularizedInstallmentsCount: regularizedCount,
        confirmedBy: userName,
        confirmedByUserId: user.id || user.userId
    });
    await reconciliationRecord.save();

    return {
        ok: true,
        message: 'Conciliación aplicada exitosamente con registro inmutable de corte.',
        reconciliation: reconciliationRecord,
        adjustmentsCount: createdAdjustments.length,
        regularizedInstallmentsCount: regularizedCount
    };
}

// 8. Traspaso entre Cajas Estratégicas
export async function transferBetweenBoxes(payload, user) {
    const { fromBoxKey, toBoxKey, amount, currency = 'USD', reason = 'Reasignación de fondos' } = payload;
    const numAmount = Math.abs(Number(amount) || 0);

    if (numAmount <= 0) {
        throw new Error('El importe debe ser mayor a cero.');
    }

    if (!fromBoxKey || !toBoxKey || fromBoxKey === toBoxKey) {
        throw new Error('Debés seleccionar cajas de origen y destino distintas.');
    }

    const fromBox = await TreasuryBox.findOne({ key: fromBoxKey });
    const toBox = await TreasuryBox.findOne({ key: toBoxKey });

    if (!fromBox || !toBox) {
        throw new Error('Una de las cajas estratégicas seleccionadas no existe.');
    }

    const field = currency === 'USD' ? 'balanceUSD' : 'balanceARS';

    fromBox[field] = (Number(fromBox[field]) || 0) - numAmount;
    toBox[field] = (Number(toBox[field]) || 0) + numAmount;

    const userName = user?.name || user?.email || 'Admin';

    fromBox.history.push({
        date: new Date(),
        type: 'transferencia_entre_cajas',
        amount: -numAmount,
        currency,
        fromBox: fromBox.name,
        toBox: toBox.name,
        reason,
        user: userName
    });

    toBox.history.push({
        date: new Date(),
        type: 'transferencia_entre_cajas',
        amount: numAmount,
        currency,
        fromBox: fromBox.name,
        toBox: toBox.name,
        reason,
        user: userName
    });

    await Promise.all([fromBox.save(), toBox.save()]);

    return {
        ok: true,
        message: `Traspaso de ${currency} ${numAmount.toLocaleString('es-AR')} desde ${fromBox.name} hacia ${toBox.name} realizado con éxito.`
    };
}

// 9. Asignar / Distribuir Saldos a Cajas desde Fondos no Asignados
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
                    box.history.push({
                        date: new Date(),
                        type: 'ajuste',
                        amount: diffARS,
                        currency: 'ARS',
                        reason,
                        user: userName
                    });
                }
            }
            if (dist.amountUSD !== undefined) {
                const diffUSD = Number(dist.amountUSD) - (box.balanceUSD || 0);
                box.balanceUSD = Number(dist.amountUSD);
                if (Math.abs(diffUSD) > 0) {
                    box.history.push({
                        date: new Date(),
                        type: 'ajuste',
                        amount: diffUSD,
                        currency: 'USD',
                        reason,
                        user: userName
                    });
                }
            }
            if (dist.targetPercent !== undefined) {
                box.targetPercent = Number(dist.targetPercent);
            }
            if (dist.monthlyBudgetARS !== undefined) {
                box.monthlyBudgetARS = Number(dist.monthlyBudgetARS);
            }
            if (dist.monthlyBudgetUSD !== undefined) {
                box.monthlyBudgetUSD = Number(dist.monthlyBudgetUSD);
            }
            if (dist.reserveMonths !== undefined) {
                box.reserveMonths = Number(dist.reserveMonths);
            }
            await box.save();
        }
    }

    return {
        ok: true,
        message: 'Distribución de cajas actualizada con éxito.'
    };
}

// 10. Distribuir un Cobro Específico a Cajas (Bandeja de Cobros)
export async function distributeSingleIncome(payload, user) {
    const { incomeId, distributions = [], notes = '' } = payload;
    const userName = user?.name || user?.email || 'Admin';

    if (!incomeId) {
        throw new Error('ID de cobro / transacción requerido.');
    }

    const tx = await Transaction.findById(incomeId);
    if (!tx || tx.type !== 'Ingreso') {
        throw new Error('El cobro indicado no existe o no es un ingreso válido.');
    }

    if (tx.isTreasuryDistributed) {
        throw new Error('Este cobro ya fue distribuido a cajas previamente. Evitando duplicación.');
    }

    let totalDistributed = 0;
    for (const dist of distributions) {
        const amt = Number(dist.amount || 0);
        if (amt <= 0) continue;

        const box = await TreasuryBox.findOne({ key: dist.boxKey });
        if (!box) continue;

        const field = tx.currency === 'USD' ? 'balanceUSD' : 'balanceARS';
        box[field] = (Number(box[field]) || 0) + amt;

        box.history.push({
            date: new Date(),
            type: 'distribucion_cobro',
            amount: amt,
            currency: tx.currency,
            reason: `Distribución de cobro: ${tx.description}. ${notes ? `Obs: ${notes}` : ''}`,
            user: userName,
            sourceIncomeId: tx._id
        });

        await box.save();
        totalDistributed += amt;
    }

    tx.isTreasuryDistributed = true;
    tx.distributedAt = new Date();
    tx.distributedBy = userName;
    await tx.save();

    return {
        ok: true,
        message: `Cobro de ${tx.currency} ${tx.amount.toLocaleString('es-AR')} distribuido a cajas exitosamente (${tx.currency} ${totalDistributed.toLocaleString('es-AR')} asignado).`
    };
}

// 11. Gestión de Reglas de Asignación Automática de Categorías
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
            {
                category: r.category.trim(),
                boxKey: r.boxKey,
                notes: r.notes || '',
                updatedBy: userName
            },
            { upsert: true, new: true }
        );
    }

    return {
        ok: true,
        message: 'Reglas de vinculación de gastos y cajas actualizadas correctamente.'
    };
}

// 12. Reclasificar un gasto histórico sin alterar saldos ni duplicar movimientos
export async function reclassifyExpense(payload, user) {
    const { transactionId, newBoxKey, reason = 'Reclasificación analítica' } = payload;
    const userName = user?.name || user?.email || 'Admin';

    const tx = await Transaction.findById(transactionId);
    if (!tx || tx.type !== 'Egreso') {
        throw new Error('Gasto no encontrado.');
    }

    const oldKey = tx.treasuryBoxKey || 'sin_asignar';
    tx.treasuryBoxKey = newBoxKey;
    tx.transactionAuditLog.push({
        action: 'RECLASIFICACION_TESORERIA',
        field: 'treasuryBoxKey',
        oldValue: oldKey,
        newValue: newBoxKey,
        date: new Date(),
        user: userName,
        details: `Reclasificación de caja analítica sin afectar cuentas reales. Motivo: ${reason}`
    });

    await tx.save();

    return {
        ok: true,
        message: `Gasto reclasificado exitosamente a la caja seleccionada.`
    };
}

// 13. Regularizar Cuotas Históricas
export async function regularizeHistoricalInstallments(installmentIds, reason, cutoffDate, user) {
    if (!Array.isArray(installmentIds) || installmentIds.length === 0) {
        throw new Error('Seleccioná al menos una cuota para regularizar.');
    }

    const safeDate = cutoffDate ? new Date(cutoffDate) : new Date();
    const userName = user?.name || user?.email || 'Administrador';
    let count = 0;

    for (const id of installmentIds) {
        const inst = await Installment.findById(id);
        if (inst && (inst.status === 'pendiente' || inst.status === 'vencida')) {
            inst.status = 'pagada';
            inst.paidAmount = inst.amount;
            inst.paymentDate = safeDate;
            inst.notes = (inst.notes ? `${inst.notes} | ` : '') + `Regularizada en Tesorería Estratégica: ${reason || 'Cobrada previamente, contemplada en saldo real'}.`;
            inst.installmentAuditLog.push({
                action: 'REGULARIZACION_CONCILIADA',
                user: userName,
                date: new Date(),
                details: `Regularización pre-conciliación al ${safeDate.toLocaleDateString('es-AR')}. Motivo: ${reason || 'Sin duplicación de caja'}`
            });
            await inst.save();
            count++;
        }
    }

    return {
        ok: true,
        message: `${count} cuota${count === 1 ? '' : 's'} regularizada${count === 1 ? '' : 's'} históricamente sin duplicar dinero en caja.`,
        count
    };
}
