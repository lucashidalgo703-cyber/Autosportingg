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

    // Simulador de negociación con IA (validación y sanitización de entrada)
    router.post('/negotiation/chat', endpoint(async req => {
        const { scenarioId, conversationHistory, sellerMessage, level } = req.body;
        if (!scenarioId || typeof scenarioId !== 'string') {
            const err = new Error('Escenario no válido.');
            err.status = 400;
            throw err;
        }
        const safeSellerMessage = typeof sellerMessage === 'string' ? sellerMessage.slice(0, 500) : '';
        const safeHistory = Array.isArray(conversationHistory) ? conversationHistory.slice(-20) : [];
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
        const evaluation = await evaluateNegotiation({ scenarioId, conversationHistory: safeHistory });
        
        // Persistir la sesión evaluada en el progreso del usuario
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

    return router;
}
