import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import TreasurySecurity from '../models/TreasurySecurity.js';
import TreasuryBox from '../models/TreasuryBox.js';
import TreasuryReconciliation from '../models/TreasuryReconciliation.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Installment from '../models/Installment.js';
import AdminUser from '../models/AdminUser.js';
import Sale from '../models/Sale.js';

const JWT_SECRET = process.env.JWT_SECRET?.trim() || 'autosporting_secret_jwt_key_crm_2026';
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutos de bloqueo por fuerza bruta
const MAX_FAILED_ATTEMPTS = 5;

// Hashing seguro de contraseñas y PINs con scrypt nativo
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

// Inicializar cajas estratégicas por defecto
const DEFAULT_BOXES = [
    {
        key: 'operativa',
        name: 'Caja Operativa',
        description: 'Capital de trabajo diario, compras de insumos, combustible y gastos operativos corrientes',
        color: 'emerald',
        icon: 'Briefcase',
        targetPercent: 50
    },
    {
        key: 'personal',
        name: 'Caja Personal',
        description: 'Retiros del propietario / socios, utilidades acumuladas y gastos personales no comerciales',
        color: 'purple',
        icon: 'User',
        targetPercent: 20
    },
    {
        key: 'impuestos',
        name: 'Impuestos y Obligaciones',
        description: 'Reserva para AFIP, ARBA, Ingresos Brutos, cargas sociales y patentes vehiculares',
        color: 'amber',
        icon: 'Landmark',
        targetPercent: 15
    },
    {
        key: 'deudas',
        name: 'Caja Deudas',
        description: 'Fondos reservados para amortización y cancelación de pasivos comerciales y financiamiento',
        color: 'red',
        icon: 'CreditCard',
        targetPercent: 10
    },
    {
        key: 'reserva',
        name: 'Fondo de Reserva',
        description: 'Respaldo financiero para contingencias, imprevistos y reinversión estratégica de capital',
        color: 'blue',
        icon: 'ShieldCheck',
        targetPercent: 5
    }
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
                targetPercent: def.targetPercent,
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

    // Comprobar bloqueo por intentos fallidos
    if (sec.lockedUntil && sec.lockedUntil > now) {
        const remainingMinutes = Math.ceil((sec.lockedUntil - now) / 60000);
        const err = new Error(`Acceso temporalmente bloqueado por seguridad (${MAX_FAILED_ATTEMPTS} intentos fallidos). Intentá nuevamente en ${remainingMinutes} minutos o reestablecé el PIN con tu contraseña de propietario.`);
        err.statusCode = 423; // Locked
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

    // Éxito: limpiar contador de fallos
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

// 4. Cambio de PIN (requiere verificar PIN actual)
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

// 5. Recuperación de PIN con reautenticación de propietario
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

    const accounts = await Account.find({ isActive: { $ne: false } }).sort({ currency: 1, name: 1 }).lean();
    const boxes = await TreasuryBox.find({ isActive: true }).sort({ key: 1 }).lean();

    // Totales en Cuentas (dónde está el dinero)
    let totalCuentasARS = 0;
    let totalCuentasUSD = 0;
    let totalEfectivoARS = 0;
    let totalEfectivoUSD = 0;
    let totalBancosARS = 0;
    let totalBancosUSD = 0;

    accounts.forEach(acc => {
        const bal = Number(acc.balance || 0);
        if (acc.currency === 'USD') {
            totalCuentasUSD += bal;
            if (acc.type === 'Efectivo') totalEfectivoUSD += bal;
            else totalBancosUSD += bal;
        } else {
            totalCuentasARS += bal;
            if (acc.type === 'Efectivo') totalEfectivoARS += bal;
            else totalBancosARS += bal;
        }
    });

    // Totales en Cajas (para qué está reservado)
    let totalCajasARS = 0;
    let totalCajasUSD = 0;

    boxes.forEach(box => {
        totalCajasARS += Number(box.balanceARS || 0);
        totalCajasUSD += Number(box.balanceUSD || 0);
    });

    // Liquidez no asignada a cajas todavía
    const unallocatedARS = totalCuentasARS - totalCajasARS;
    const unallocatedUSD = totalCuentasUSD - totalCajasUSD;

    // Cuotas pendientes para regularización histórica
    const pendingInstallments = await Installment.find({ status: { $in: ['pendiente', 'vencida'] } })
        .populate('vehicleId', 'brand name plateOrVin')
        .populate('clientId', 'firstName lastName fullName phone')
        .sort({ dueDate: 1 })
        .lean();

    // Identificar Tracker pendiente de cobro para referencia
    const trackerSale = await Sale.findOne({
        status: { $in: ['señado', 'confirmada', 'pendiente_entrega'] }
    })
    .populate({
        path: 'vehicleId',
        match: { name: { $regex: /tracker/i } }
    })
    .populate('clientId', 'firstName lastName fullName')
    .lean();

    // Historial de conciliaciones
    const recentReconciliations = await TreasuryReconciliation.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

    // Ajustes recientes en Transaction
    const recentAdjustments = await Transaction.find({
        category: { $in: ['Ajuste de Conciliación Inicial', 'Conciliación Tesorería', 'Ajuste de Saldo'] }
    })
    .sort({ date: -1 })
    .limit(15)
    .populate('accountId', 'name currency type')
    .lean();

    return {
        accounts,
        boxes,
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
            referenceNote: 'USD 5.000 de liquidez de referencia informada (sin incluir Tracker pendiente de cobro).'
        },
        pendingCollections: {
            tracker: trackerSale ? {
                found: true,
                saleId: trackerSale._id,
                vehicle: trackerSale.vehicleId ? `${trackerSale.vehicleId.brand} ${trackerSale.vehicleId.name}` : 'Chevrolet Tracker Premier',
                client: trackerSale.clientId?.fullName || `${trackerSale.clientId?.firstName || ''} ${trackerSale.clientId?.lastName || ''}`,
                price: trackerSale.salePrice,
                currency: trackerSale.saleCurrency,
                note: 'Venta pendiente de cobro total. No computada como liquidez de caja disponible hasta su acreditación.'
            } : {
                found: false,
                note: 'No se encontraron expedientes activos con nombre Tracker; las cuotas o saldos pendientes no deben sumarse a caja hasta que se cobren efectivamente.'
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
        accountsData = [], // [{ accountId, realBalance, name, type, currency }]
        reason = 'Conciliación inicial de saldos reales',
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

    // Procesar cada cuenta
    for (const item of accountsData) {
        let account = null;

        if (item.accountId) {
            account = await Account.findById(item.accountId);
        }

        if (!account && item.name && item.currency) {
            // Permite dar de alta cuentas nuevas que existían en la realidad
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

        // Si hay diferencia, registrar el ajuste formal en Transaction sin borrar historial
        if (Math.abs(diff) > 0.001) {
            const isIncrease = diff > 0;
            const adjustmentTx = new Transaction({
                type: isIncrease ? 'Ingreso' : 'Egreso',
                amount: Math.abs(diff),
                currency: account.currency,
                description: `Ajuste conciliación: ${account.name} (Saldo real ARS/USD ${realBalance})`,
                category: 'Ajuste de Conciliación Inicial',
                date: safeCutoffDate,
                accountId: account._id,
                notes: `Conciliación con corte al ${safeCutoffDate.toLocaleDateString('es-AR')}. Motivo: ${reason}. ${notes ? `Obs: ${notes}` : ''}. No computar como facturación de ventas ni ingresos corrientes.`,
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

            // Actualizar saldo de la cuenta exactamente al saldo real contado
            account.balance = realBalance;
            await account.save();
        }
    }

    // Regularizar cuotas históricas ya cobradas sin volver a sumar dinero a caja
    let regularizedCount = 0;
    if (Array.isArray(regularizeInstallmentIds) && regularizeInstallmentIds.length > 0) {
        for (const instId of regularizeInstallmentIds) {
            const inst = await Installment.findById(instId);
            if (inst && (inst.status === 'pendiente' || inst.status === 'vencida')) {
                inst.status = 'pagada';
                inst.paidAmount = inst.amount;
                inst.paymentDate = safeCutoffDate;
                inst.notes = (inst.notes ? `${inst.notes} | ` : '') + 'Regularizada en Tesorería Estratégica (fondos incluidos en saldo inicial, sin duplicación de caja).';
                inst.installmentAuditLog.push({
                    action: 'REGULARIZACION_CONCILIADA',
                    user: userName,
                    date: new Date(),
                    details: `Cuota marcada como regularizada con fecha de corte ${safeCutoffDate.toLocaleDateString('es-AR')}. No genera asiento duplicado en caja.`
                });
                await inst.save();
                regularizedCount++;
            }
        }
    }

    // Guardar el registro de conciliación
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
        message: 'Conciliación aplicada exitosamente.',
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

// 9. Asignar / Distribuir Saldos a Cajas
export async function distributeToBoxes(payload, user) {
    const { distributions = [], reason = 'Asignación estratégica de capital' } = payload;
    // distributions: [{ boxKey, amountARS, amountUSD }]

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
            await box.save();
        }
    }

    return {
        ok: true,
        message: 'Distribución de cajas actualizada con éxito.'
    };
}

// 10. Regularizar Cuotas Históricas directamente
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
