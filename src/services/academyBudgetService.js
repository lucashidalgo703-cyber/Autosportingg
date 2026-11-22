import crypto from 'crypto';
import mongoose from 'mongoose';
import AcademyBudget from '../models/AcademyBudget.js';

const PRIMARY_BUDGET_ID = 'academy-primary';

// Almacén en memoria seguro para tests o cuando Mongoose no está conectado
let inMemoryDoc = null;

function getInMemoryBudgetDoc() {
    if (!inMemoryDoc) {
        const envBudget = parseFloat(process.env.ACADEMY_AI_BUDGET_USD || '0');
        const initialAuthorized = !isNaN(envBudget) && envBudget > 0 ? envBudget : 0;
        inMemoryDoc = {
            budgetConfigId: PRIMARY_BUDGET_ID,
            authorizedBudgetUSD: initialAuthorized,
            confirmedSpentUSD: 0,
            reservedUSD: 0,
            uncertainSpentUSD: 0,
            totalTokensUsed: 0,
            reservations: [],
            callLogs: [],
            userQuotas: [],
            lastUpdated: new Date(),
            async save() {
                this.lastUpdated = new Date();
                return this;
            }
        };
    } else {
        const envBudget = parseFloat(process.env.ACADEMY_AI_BUDGET_USD || '0');
        if (!isNaN(envBudget) && envBudget > inMemoryDoc.authorizedBudgetUSD) {
            inMemoryDoc.authorizedBudgetUSD = envBudget;
        }
    }
    return inMemoryDoc;
}

// Costos estimados para reserva atómica previa a la llamada (GPT-4o-mini estándar)
const ESTIMATED_CALL_COSTS = {
    buyer: 0.0005,
    tutor: 0.0005,
    evaluator: 0.0020
};

// Límites configurables por usuario
export const USER_QUOTA_LIMITS = {
    MAX_SESSIONS_PER_DAY: 10,
    MAX_TURNS_PER_SESSION: 15,
    MAX_TUTOR_REQUESTS_PER_DAY: 20,
    MAX_CONCURRENT_RESERVATIONS_PER_USER: 1
};

/**
 * Obtiene o inicializa el documento de presupuesto persistente.
 * No asigna un presupuesto positivo por defecto (regla estricta).
 */
export async function getBudgetDoc() {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        return getInMemoryBudgetDoc();
    }

    let doc = await AcademyBudget.findOne({ budgetConfigId: PRIMARY_BUDGET_ID });
    if (!doc) {
        // Inicializar con 0 USD autorizado por defecto
        const envBudget = parseFloat(process.env.ACADEMY_AI_BUDGET_USD || '0');
        const initialAuthorized = !isNaN(envBudget) && envBudget > 0 ? envBudget : 0;

        doc = await AcademyBudget.create({
            budgetConfigId: PRIMARY_BUDGET_ID,
            authorizedBudgetUSD: initialAuthorized,
            confirmedSpentUSD: 0,
            reservedUSD: 0,
            uncertainSpentUSD: 0,
            totalTokensUsed: 0,
            reservations: [],
            callLogs: [],
            userQuotas: [],
            lastUpdated: new Date()
        });
    } else {
        // Sincronizar si se definió una variable de entorno de presupuesto mayor
        const envBudget = parseFloat(process.env.ACADEMY_AI_BUDGET_USD || '0');
        if (!isNaN(envBudget) && envBudget > doc.authorizedBudgetUSD) {
            doc.authorizedBudgetUSD = envBudget;
            await doc.save();
        }
    }
    return doc;
}

/**
 * Consulta el estado actual del presupuesto y de la cuota del usuario.
 */
export async function getBudgetStatus(userId = null) {
    const doc = await getBudgetDoc();
    const authorized = doc.authorizedBudgetUSD || 0;
    const confirmed = doc.confirmedSpentUSD || 0;
    const reserved = doc.reservedUSD || 0;
    const uncertain = doc.uncertainSpentUSD || 0;
    const totalCommitted = confirmed + reserved + uncertain;
    const availableUSD = Math.max(0, authorized - totalCommitted);

    let userQuota = null;
    if (userId) {
        const today = new Date().toISOString().split('T')[0];
        const existing = (doc.userQuotas || []).find(q => q.userId === userId && q.periodDate === today);
        userQuota = {
            userId,
            periodDate: today,
            sessionsToday: existing?.negotiationSessionsCount || 0,
            tutorToday: existing?.tutorRequestsCount || 0,
            sessionsRemaining: Math.max(0, USER_QUOTA_LIMITS.MAX_SESSIONS_PER_DAY - (existing?.negotiationSessionsCount || 0)),
            tutorRemaining: Math.max(0, USER_QUOTA_LIMITS.MAX_TUTOR_REQUESTS_PER_DAY - (existing?.tutorRequestsCount || 0))
        };
    }

    return {
        budgetConfigId: doc.budgetConfigId,
        authorizedBudgetUSD: authorized,
        confirmedSpentUSD: confirmed,
        reservedUSD: reserved,
        uncertainSpentUSD: uncertain,
        availableUSD,
        totalTokensUsed: doc.totalTokensUsed || 0,
        isExhausted: availableUSD <= 0.0001,
        userQuota
    };
}

/**
 * Reserva atómicamente el costo máximo estimado antes de despachar una llamada a OpenAI.
 * Si no hay saldo, o la IA está deshabilitada, o el usuario superó su cuota, retorna simulated: true.
 */
export async function reserveAICall({ userId = 'anon', callType = 'buyer' }) {
    const key = process.env.ACADEMY_OPENAI_API_KEY?.trim();
    const enabled = process.env.ACADEMY_AI_ENABLED === 'true';

    // 1. Candado de credenciales dedicadas e interruptor de servidor
    if (!key || key.length < 10) {
        return { allowed: false, simulated: true, reason: 'missing_dedicated_key', message: 'No se configuró ACADEMY_OPENAI_API_KEY.' };
    }
    if (!enabled) {
        return { allowed: false, simulated: true, reason: 'disabled_by_config', message: 'ACADEMY_AI_ENABLED está desactivado.' };
    }

    const estimatedCost = ESTIMATED_CALL_COSTS[callType] || 0.001;
    const doc = await getBudgetDoc();

    // 2. Candado de presupuesto positivo
    if (doc.authorizedBudgetUSD <= 0) {
        return { allowed: false, simulated: true, reason: 'no_budget_authorized', message: 'No hay presupuesto ACADEMY_AI_BUDGET_USD autorizado (> 0).' };
    }

    // 3. Candado de cuota por usuario
    const today = new Date().toISOString().split('T')[0];
    const userQ = (doc.userQuotas || []).find(q => q.userId === userId && q.periodDate === today);

    if (callType === 'buyer' && (userQ?.negotiationSessionsCount || 0) >= USER_QUOTA_LIMITS.MAX_SESSIONS_PER_DAY) {
        return {
            allowed: false,
            simulated: true,
            reason: 'user_session_quota_reached',
            message: `Alcanzaste tu límite diario de ${USER_QUOTA_LIMITS.MAX_SESSIONS_PER_DAY} prácticas de negociación. Podés repasar reportes previos o continuar en modo formativo guiado.`
        };
    }

    if (callType === 'tutor' && (userQ?.tutorRequestsCount || 0) >= USER_QUOTA_LIMITS.MAX_TUTOR_REQUESTS_PER_DAY) {
        return {
            allowed: false,
            simulated: true,
            reason: 'user_tutor_quota_reached',
            message: `Alcanzaste tu límite diario de ${USER_QUOTA_LIMITS.MAX_TUTOR_REQUESTS_PER_DAY} consultas al tutor. Podés consultar los manuales de procedimiento directamente.`
        };
    }

    // 4. Candado de concurrencia por usuario (evitar múltiples llamadas simultáneas del mismo usuario)
    const activeUserReservations = (doc.reservations || []).filter(
        r => r.userId === userId && r.status === 'pending' && (Date.now() - new Date(r.createdAt).getTime()) < 20000
    );
    if (activeUserReservations.length >= USER_QUOTA_LIMITS.MAX_CONCURRENT_RESERVATIONS_PER_USER) {
        return {
            allowed: false,
            simulated: true,
            reason: 'user_concurrency_limit',
            message: 'Ya tenés una solicitud de IA en procesamiento. Esperá la respuesta antes de enviar otra.'
        };
    }

    // 5. Reserva atómica contra el saldo disponible
    const totalCommitted = (doc.confirmedSpentUSD || 0) + (doc.reservedUSD || 0) + (doc.uncertainSpentUSD || 0);
    const available = (doc.authorizedBudgetUSD || 0) - totalCommitted;

    if (available < estimatedCost) {
        return {
            allowed: false,
            simulated: true,
            reason: 'budget_exhausted',
            message: `El presupuesto de Academy está agotado ($${doc.authorizedBudgetUSD.toFixed(2)} USD asignados, $${totalCommitted.toFixed(4)} USD comprometidos).`
        };
    }

    const reservationId = crypto.randomUUID();
    doc.reservedUSD = Number(((doc.reservedUSD || 0) + estimatedCost).toFixed(6));
    doc.reservations.push({
        reservationId,
        userId,
        callType,
        estimatedCostUSD: estimatedCost,
        status: 'pending',
        createdAt: new Date()
    });
    doc.lastUpdated = new Date();
    await doc.save();

    return {
        allowed: true,
        simulated: false,
        reservationId,
        estimatedCostUSD: estimatedCost
    };
}

/**
 * Liquida una reserva previa confirmando el consumo real, o registrando consumo incierto en caso de timeout.
 */
export async function settleAICall({
    reservationId,
    tokensIn = 0,
    tokensOut = 0,
    actualCostUSD = 0,
    status = 'success', // 'success' | 'uncertain' | 'failed'
    errorMessage = null,
    userId = 'anon',
    callType = 'buyer'
}) {
    const doc = await getBudgetDoc();
    const resIdx = (doc.reservations || []).findIndex(r => r.reservationId === reservationId);
    let estimatedCost = ESTIMATED_CALL_COSTS[callType] || 0.0005;

    if (resIdx !== -1) {
        estimatedCost = doc.reservations[resIdx].estimatedCostUSD;
        doc.reservations[resIdx].status = status === 'success' ? 'settled' : status;
    }

    // Liberar la reserva en todos los casos
    doc.reservedUSD = Math.max(0, Number(((doc.reservedUSD || 0) - estimatedCost).toFixed(6)));

    if (status === 'success') {
        // Consumo confirmado
        const finalCost = actualCostUSD > 0
            ? actualCostUSD
            : Number(((tokensIn * 0.00000015) + (tokensOut * 0.00000060)).toFixed(6));

        doc.confirmedSpentUSD = Number(((doc.confirmedSpentUSD || 0) + finalCost).toFixed(6));
        doc.totalTokensUsed = (doc.totalTokensUsed || 0) + tokensIn + tokensOut;

        doc.callLogs.push({
            timestamp: new Date(),
            userId,
            callType,
            tokensIn,
            tokensOut,
            costUSD: finalCost,
            status: 'success',
            errorMessage: null
        });
    } else if (status === 'uncertain') {
        // Timeout o estado no confirmable: se asume consumo incierto por el costo estimado reservado
        doc.uncertainSpentUSD = Number(((doc.uncertainSpentUSD || 0) + estimatedCost).toFixed(6));

        doc.callLogs.push({
            timestamp: new Date(),
            userId,
            callType,
            tokensIn,
            tokensOut,
            costUSD: estimatedCost,
            status: 'uncertain',
            errorMessage: errorMessage || 'Timeout o respuesta interrumpida del proveedor externo.'
        });
    } else {
        // Fallo antes de despachar o error local de validación: se libera la reserva sin impacto
        doc.callLogs.push({
            timestamp: new Date(),
            userId,
            callType,
            tokensIn: 0,
            tokensOut: 0,
            costUSD: 0,
            status: 'failed',
            errorMessage: errorMessage || 'Error al invocar API externa.'
        });
    }

    doc.lastUpdated = new Date();
    await doc.save();
    return doc;
}

/**
 * Incrementa el contador de cuota por usuario al finalizar una sesión o consulta.
 */
export async function incrementUserQuota(userId, type = 'session') {
    if (!userId) return;
    const doc = await getBudgetDoc();
    const today = new Date().toISOString().split('T')[0];

    let userQ = (doc.userQuotas || []).find(q => q.userId === userId && q.periodDate === today);
    if (!userQ) {
        userQ = {
            userId,
            periodDate: today,
            negotiationSessionsCount: 0,
            tutorRequestsCount: 0,
            lastActiveAt: new Date()
        };
        doc.userQuotas.push(userQ);
    }

    if (type === 'session') {
        userQ.negotiationSessionsCount += 1;
    } else if (type === 'tutor') {
        userQ.tutorRequestsCount += 1;
    }
    userQ.lastActiveAt = new Date();
    doc.lastUpdated = new Date();
    await doc.save();
}

/**
 * Configura el presupuesto autorizado (solo dirección / supervisor).
 */
export async function setAuthorizedBudget(amountUSD) {
    const num = parseFloat(amountUSD);
    if (isNaN(num) || num < 0) {
        throw new Error('El presupuesto debe ser un número mayor o igual a 0.');
    }
    const doc = await getBudgetDoc();
    doc.authorizedBudgetUSD = Number(num.toFixed(2));
    doc.lastUpdated = new Date();
    await doc.save();
    return doc;
}

/**
 * Reinicia contadores de prueba para entornos de tests aislados.
 */
export async function resetBudgetForTesting(authorizedUSD = 0) {
    if (inMemoryDoc) {
        inMemoryDoc.authorizedBudgetUSD = authorizedUSD;
        inMemoryDoc.confirmedSpentUSD = 0;
        inMemoryDoc.reservedUSD = 0;
        inMemoryDoc.uncertainSpentUSD = 0;
        inMemoryDoc.totalTokensUsed = 0;
        inMemoryDoc.reservations = [];
        inMemoryDoc.callLogs = [];
        inMemoryDoc.userQuotas = [];
        inMemoryDoc.lastUpdated = new Date();
    }
    if (mongoose.connection && mongoose.connection.readyState === 1) {
        const doc = await getBudgetDoc();
        doc.authorizedBudgetUSD = authorizedUSD;
        doc.confirmedSpentUSD = 0;
        doc.reservedUSD = 0;
        doc.uncertainSpentUSD = 0;
        doc.totalTokensUsed = 0;
        doc.reservations = [];
        doc.callLogs = [];
        doc.userQuotas = [];
        doc.lastUpdated = new Date();
        await doc.save();
        return doc;
    }
    return inMemoryDoc;
}
