import { Router } from 'express';
import connectDB from '../config/db.js';
import {
    getUserProgress,
    syncLocalProgress,
    recordLessonCompletion,
    recordRoleModuleCompletion,
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
    router.post('/reflection', endpoint(req => saveErrorReflection(req.user, req.body)));

    // Simulador de negociación con IA
    router.post('/negotiation/chat', endpoint(async req => {
        const { scenarioId, conversationHistory, sellerMessage, level } = req.body;
        return await generateBuyerReply({ scenarioId, conversationHistory, sellerMessage, level });
    }));

    router.post('/negotiation/evaluate', endpoint(async req => {
        const { scenarioId, conversationHistory, level } = req.body;
        const evaluation = await evaluateNegotiation({ scenarioId, conversationHistory });
        
        // Persistir la sesión evaluada en el progreso del usuario
        await recordNegotiationSession(req.user, {
            scenarioId,
            level,
            turnsCount: (conversationHistory || []).filter(m => m.sender === 'seller').length,
            messages: conversationHistory,
            evaluation
        });

        return evaluation;
    }));

    // Tutor comercial con IA
    router.post('/tutor/chat', endpoint(async req => {
        const { message, conversationHistory } = req.body;
        return await generateTutorReply({
            userMessage: message,
            userRole: req.user.role || 'vendedor',
            conversationHistory
        });
    }));

    // Gestión y supervisión de dirección (Owner / Admin)
    router.get('/supervision/team', endpoint(req => getTeamProgressForSupervisor(req.user)));
    router.post('/supervision/assign', endpoint(req => assignTrack(req.user, req.body.userId, req.body.trackId)));
    router.post('/supervision/recommend', endpoint(req => recommendActivity(req.user, req.body.userId, req.body.activity)));

    return router;
}
