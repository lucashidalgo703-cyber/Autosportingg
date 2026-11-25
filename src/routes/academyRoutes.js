import { Router } from 'express';
import connectDB from '../config/db.js';
import {
    getUserProgress,
    syncLocalProgress,
    recordLessonCompletion,
    recordRoleModuleCompletion,
    recordSimulationAttempt,
    recordNegotiationSession,
    saveErrorReflection,
    assignTrack,
    recommendActivity,
    getTeamProgressForSupervisor
} from '../services/academyProgressService.js';
import {
    generateBuyerReply,
    evaluateNegotiation,
    generateTutorReply
} from '../services/academyAIService.js';
import {
    getBudgetStatus,
    setAuthorizedBudget
} from '../services/academyBudgetService.js';
import {
    getOrCreateDailyChallenge,
    getSellerDailyStatus,
    submitChallengeAttempt
} from '../services/academyDailyChallengeService.js';
import {
    getDailyControlOverview,
    getSellerIndividualCard,
    getAttemptQuestionDetail,
    invalidateAttemptQuestion
} from '../services/academySupervisionService.js';
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead
} from '../services/academyNotificationService.js';
import {
    validateIntakeCarForEvaluation,
    generateNewIntakeMiniChallenge
} from '../services/academyNewIntakeChallengeService.js';

const endpoint = callback => async (req, res) => {
    try {
        await connectDB();
        const result = await callback(req);
        res.json(result);
    } catch (error) {
        console.error('[AcademyRoute Error]', error);
        res.status(error.status || 500).json({
            message: error.message || 'Error en el servicio de Academy.'
        });
    }
};

const requireSupervisor = (req, res, next) => {
    if (!req.user || (req.user.role !== 'owner' && req.user.role !== 'admin')) {
        return res.status(403).json({ message: 'Acceso restringido a supervisión educativa.' });
    }
    next();
};

export function createAcademyRouter({ authenticate }) {
    const router = Router();

    router.use((_req, res, next) => {
        res.set({
            'Cache-Control': 'private, no-store',
            'Referrer-Policy': 'no-referrer',
            'X-Robots-Tag': 'noindex, nofollow, noarchive',
            'X-Content-Type-Options': 'nosniff'
        });
        next();
    }, authenticate);

    // Progreso individual
    router.get('/progress', endpoint(req => getUserProgress(req.user)));
    router.post('/progress/sync', endpoint(req => syncLocalProgress(req.user, req.body)));
    router.post('/module/complete', endpoint(req => recordRoleModuleCompletion(req.user, req.body.moduleId, req.body.trackId)));
    router.post('/lesson/complete', endpoint(req => recordLessonCompletion(req.user, req.body.lessonId, req.body.courseId)));
    router.post('/simulation/record', endpoint(req => recordSimulationAttempt(req.user, req.body)));
    router.post('/reflection', endpoint(req => saveErrorReflection(req.user, req.body)));

    // =========================================================================
    // DESAFÍOS DIARIOS (VENDEDORES Y REPASO PRÁCTICO)
    // =========================================================================
    router.get('/daily-challenge/today', endpoint(async req => {
        const challenge = await getOrCreateDailyChallenge(req.query.date);
        const status = await getSellerDailyStatus(req.user, req.query.date);
        return { challenge, status };
    }));

    router.get('/daily-challenge/status', endpoint(req => getSellerDailyStatus(req.user, req.query.date)));

    router.post('/daily-challenge/submit', endpoint(req => {
        const { challengeId, answers, durationSeconds, attemptType } = req.body;
        return submitChallengeAttempt(req.user, {
            challengeId,
            answers: Array.isArray(answers) ? answers : [],
            durationSeconds: Number(durationSeconds) || 0,
            attemptType: attemptType || 'official_daily'
        });
    }));

    // =========================================================================
    // CONTROL DE CAPACITACIÓN (PROPIETARIO / ADMINISTRADOR)
    // =========================================================================
    router.get('/control/overview', requireSupervisor, endpoint(req => getDailyControlOverview(req.query.date)));
    router.get('/control/seller/:id', requireSupervisor, endpoint(req => getSellerIndividualCard(req.params.id)));
    router.get('/control/attempt/:id', requireSupervisor, endpoint(req => getAttemptQuestionDetail(req.params.id)));
    router.post('/control/attempt/:id/invalidate', requireSupervisor, endpoint(req => {
        return invalidateAttemptQuestion(req.params.id, req.body.questionId, req.user, req.body.reason);
    }));

    // =========================================================================
    // NOTIFICACIONES INTERNAS DE ACADEMY (PROPIETARIO)
    // =========================================================================
    router.get('/notifications', requireSupervisor, endpoint(req => getNotifications(req.user, { limit: Number(req.query.limit) || 20 })));
    router.post('/notifications/:id/read', requireSupervisor, endpoint(req => markNotificationRead(req.params.id)));
    router.post('/notifications/read-all', requireSupervisor, endpoint(req => markAllNotificationsRead(req.user)));

    // =========================================================================
    // EVALUACIÓN DE VEHÍCULOS RECIÉN INGRESADOS (NUEVOS INGRESOS)
    // =========================================================================
    router.get('/intake/validate/:carId', requireSupervisor, endpoint(req => validateIntakeCarForEvaluation(req.params.carId)));
    router.post('/intake/generate', requireSupervisor, endpoint(async req => {
        const challenge = await generateNewIntakeMiniChallenge(req.body.carId, {
            title: req.body.title,
            assignedUserIds: Array.isArray(req.body.assignedUserIds) ? req.body.assignedUserIds : []
        });
        return { success: true, challenge };
    }));

    // =========================================================================
    // SIMULADOR DE NEGOCIACIÓN CON IA
    // =========================================================================
    router.post('/negotiation/chat', endpoint(async req => {
        const { scenarioId, conversationHistory, sellerMessage, level } = req.body;
        if (!scenarioId || typeof scenarioId !== 'string') {
            const err = new Error('Escenario no válido.');
            err.status = 400;
            throw err;
        }
        const safeSellerMessage = typeof sellerMessage === 'string' ? sellerMessage.slice(0, 500) : '';
        const safeHistory = Array.isArray(conversationHistory) ? conversationHistory.slice(-31) : [];
        return await generateBuyerReply({
            scenarioId,
            conversationHistory: safeHistory,
            sellerMessage: safeSellerMessage,
            level: ['principiante', 'intermedio', 'avanzado'].includes(level) ? level : 'intermedio',
            userId: req.user?.id || req.user?.userId
        });
    }));

    router.post('/negotiation/evaluate', endpoint(async req => {
        const { scenarioId, conversationHistory, level } = req.body;
        if (!scenarioId || typeof scenarioId !== 'string') {
            const err = new Error('Escenario no válido.');
            err.status = 400;
            throw err;
        }
        const safeHistory = Array.isArray(conversationHistory) ? conversationHistory.slice(-30) : [];
        const evaluation = await evaluateNegotiation({
            scenarioId,
            conversationHistory: safeHistory,
            userId: req.user?.id || req.user?.userId
        });
        
        await recordNegotiationSession(req.user, {
            scenarioId,
            level: ['principiante', 'intermedio', 'avanzado'].includes(level) ? level : 'intermedio',
            turnsCount: safeHistory.filter(m => m.sender === 'seller').length,
            messages: safeHistory,
            evaluation
        });

        return evaluation;
    }));

    // Tutor comercial con IA
    router.post('/tutor/chat', endpoint(async req => {
        const { message, conversationHistory } = req.body;
        const safeMessage = typeof message === 'string' ? message.slice(0, 500) : '';
        const safeHistory = Array.isArray(conversationHistory) ? conversationHistory.slice(-10) : [];
        return await generateTutorReply({
            userMessage: safeMessage,
            userRole: req.user.role || 'vendedor',
            conversationHistory: safeHistory,
            userId: req.user?.id || req.user?.userId
        });
    }));

    // Gestión y supervisión de dirección (Owner / Admin estrictamente protegidos)
    router.get('/supervision/team', requireSupervisor, endpoint(req => getTeamProgressForSupervisor(req.user)));
    router.post('/supervision/assign', requireSupervisor, endpoint(req => assignTrack(req.user, req.body.userId, req.body.trackId)));
    router.post('/supervision/recommend', requireSupervisor, endpoint(req => recommendActivity(req.user, req.body.userId, req.body.activity)));

    // Presupuesto persistente de OpenAI (Solo Supervisores)
    router.get('/budget/status', requireSupervisor, endpoint(req => getBudgetStatus(req.user?.id || req.user?.userId)));
    router.post('/budget/configure', requireSupervisor, endpoint(req => setAuthorizedBudget(req.body.authorizedBudgetUSD)));

    return router;
}
