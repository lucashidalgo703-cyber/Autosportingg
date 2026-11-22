/**
 * Servicio de backend para persistencia, sincronización y seguimiento de AutoSporting Academy 2.0.
 * Gestiona el progreso en MongoDB con aislamiento estricto de privacidad para las reflexiones de error.
 */

import AcademyProgress from '../models/AcademyProgress.js';
import AdminUser from '../models/AdminUser.js';

function resolveUserId(user) {
    if (!user) throw new Error('Usuario no autenticado.');
    return String(user.id || user.userId || user._id || user.sub);
}

/**
 * Obtiene o inicializa el progreso de un usuario.
 */
export async function getUserProgress(user) {
    const userId = resolveUserId(user);
    let progress = await AcademyProgress.findOne({ userId });

    if (!progress) {
        // Inicializar progreso predeterminado
        const role = user.role || 'vendedor';
        const defaultTrack = role === 'gestor' ? 'track-gestoria' : (role === 'admin' ? 'track-administracion' : 'track-vendedor');

        progress = await AcademyProgress.create({
            userId,
            userName: user.name || user.username || 'Usuario',
            userEmail: user.email || '',
            userRole: role,
            assignedTrack: defaultTrack,
            assignedModules: [],
            recommendedActivities: [],
            completedLessons: [],
            completedRoleModules: [],
            assessmentAttempts: [],
            simulationAttempts: [],
            negotiationSessions: [],
            errorReflections: [],
            lastActiveAt: new Date()
        });
    }

    return progress;
}

/**
 * Sincroniza y migra progreso desde el cliente local (localStorage) a MongoDB de forma segura.
 */
export async function syncLocalProgress(user, localData = {}) {
    const progress = await getUserProgress(user);

    // Sincronizar lecciones financieras completadas
    if (Array.isArray(localData.completedLessons)) {
        for (const lessonId of localData.completedLessons) {
            if (!progress.completedLessons.some(l => l.lessonId === lessonId)) {
                progress.completedLessons.push({ lessonId, completedAt: new Date() });
            }
        }
    }

    // Sincronizar módulos de rol completados
    if (Array.isArray(localData.completedRoleModules)) {
        for (const moduleId of localData.completedRoleModules) {
            if (!progress.completedRoleModules.some(m => m.moduleId === moduleId)) {
                progress.completedRoleModules.push({ moduleId, completedAt: new Date() });
            }
        }
    }

    // Sincronizar evaluaciones
    if (Array.isArray(localData.assessmentAttempts)) {
        for (const att of localData.assessmentAttempts) {
            if (att.assessmentId && !progress.assessmentAttempts.some(a => a.assessmentId === att.assessmentId && Math.abs(new Date(a.completedAt) - new Date(att.completedAt)) < 5000)) {
                progress.assessmentAttempts.push(att);
            }
        }
    }

    // Sincronizar reflexiones de error (respetando privacidad)
    if (Array.isArray(localData.errorReflections)) {
        for (const ref of localData.errorReflections) {
            if (ref.situation && !progress.errorReflections.some(r => r.situation === ref.situation && r.actionTaken === ref.actionTaken)) {
                progress.errorReflections.push({
                    situation: ref.situation,
                    actionTaken: ref.actionTaken,
                    difficultyEncountered: ref.difficultyEncountered || '',
                    alternativeApproach: ref.alternativeApproach || '',
                    reinforcementModuleId: ref.reinforcementModuleId || '',
                    sharedWithSupervisor: Boolean(ref.sharedWithSupervisor),
                    sharedAt: ref.sharedWithSupervisor ? new Date() : null,
                    createdAt: ref.createdAt ? new Date(ref.createdAt) : new Date()
                });
            }
        }
    }

    progress.lastActiveAt = new Date();
    await progress.save();
    return progress;
}

/**
 * Registra una lección financiera completada.
 */
export async function recordLessonCompletion(user, lessonId, courseId) {
    const progress = await getUserProgress(user);
    if (!progress.completedLessons.some(l => l.lessonId === lessonId)) {
        progress.completedLessons.push({ lessonId, courseId, completedAt: new Date() });
        progress.lastActiveAt = new Date();
        await progress.save();
    }
    return progress;
}

/**
 * Registra un módulo de capacitación por rol completado.
 */
export async function recordRoleModuleCompletion(user, moduleId, trackId) {
    const progress = await getUserProgress(user);
    if (!progress.completedRoleModules.some(m => m.moduleId === moduleId)) {
        progress.completedRoleModules.push({ moduleId, trackId, completedAt: new Date() });
        progress.lastActiveAt = new Date();
        await progress.save();
    }
    return progress;
}

/**
 * Registra una simulación de caso de negocio completada.
 */
export async function recordSimulationAttempt(user, simData = {}) {
    const progress = await getUserProgress(user);
    if (!simData.simulationId) return progress;

    progress.simulationAttempts.push({
        simulationId: simData.simulationId,
        score: typeof simData.score === 'number' ? simData.score : 0,
        passed: Boolean(simData.passed ?? (simData.score >= 70)),
        decisions: simData.decisions || [simData.selectedOption].filter(Boolean),
        feedback: simData.feedback || '',
        completedAt: new Date()
    });

    progress.lastActiveAt = new Date();
    await progress.save();
    return progress;
}

/**
 * Registra una sesión de negociación completada con su evaluación.
 */
export async function recordNegotiationSession(user, sessionData) {
    const progress = await getUserProgress(user);

    progress.negotiationSessions.push({
        scenarioId: sessionData.scenarioId,
        level: sessionData.level || 'intermedio',
        status: sessionData.status || 'completed',
        turnsCount: sessionData.turnsCount || 0,
        messages: sessionData.messages || [],
        evaluation: sessionData.evaluation || null,
        createdAt: sessionData.createdAt || new Date(),
        completedAt: new Date()
    });

    progress.lastActiveAt = new Date();
    await progress.save();
    return progress;
}

/**
 * Guarda o actualiza una reflexión en "Aprender del error".
 * Garantiza aislamiento de privacidad si sharedWithSupervisor es false.
 */
export async function saveErrorReflection(user, reflectionData) {
    const progress = await getUserProgress(user);

    if (reflectionData._id || reflectionData.id) {
        const refId = String(reflectionData._id || reflectionData.id);
        const existing = progress.errorReflections.id(refId);
        if (existing) {
            existing.situation = reflectionData.situation || existing.situation;
            existing.actionTaken = reflectionData.actionTaken || existing.actionTaken;
            existing.difficultyEncountered = reflectionData.difficultyEncountered || existing.difficultyEncountered;
            existing.alternativeApproach = reflectionData.alternativeApproach || existing.alternativeApproach;
            existing.reinforcementModuleId = reflectionData.reinforcementModuleId || existing.reinforcementModuleId;
            existing.sharedWithSupervisor = Boolean(reflectionData.sharedWithSupervisor);
            if (existing.sharedWithSupervisor && !existing.sharedAt) {
                existing.sharedAt = new Date();
            }
            existing.updatedAt = new Date();
            await progress.save();
            return existing;
        }
    }

    const newReflection = {
        situation: reflectionData.situation,
        actionTaken: reflectionData.actionTaken,
        difficultyEncountered: reflectionData.difficultyEncountered || '',
        alternativeApproach: reflectionData.alternativeApproach || '',
        reinforcementModuleId: reflectionData.reinforcementModuleId || '',
        sharedWithSupervisor: Boolean(reflectionData.sharedWithSupervisor),
        sharedAt: reflectionData.sharedWithSupervisor ? new Date() : null,
        relatedNegotiationId: reflectionData.relatedNegotiationId || null,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    progress.errorReflections.push(newReflection);
    progress.lastActiveAt = new Date();
    await progress.save();
    return progress.errorReflections[progress.errorReflections.length - 1];
}

/**
 * Asigna un recorrido educativo a un usuario (solo para dirección / admin).
 */
export async function assignTrack(supervisorUser, targetUserId, trackId) {
    if (supervisorUser.role !== 'owner' && supervisorUser.role !== 'admin') {
        const err = new Error('No tenés permisos para asignar recorridos de capacitación.');
        err.status = 403;
        throw err;
    }

    let progress = await AcademyProgress.findOne({ userId: targetUserId });
    if (!progress) {
        progress = await AcademyProgress.create({
            userId: targetUserId,
            assignedTrack: trackId,
            lastActiveAt: new Date()
        });
    } else {
        progress.assignedTrack = trackId;
        progress.lastActiveAt = new Date();
        await progress.save();
    }

    return progress;
}

/**
 * Recomienda un módulo o práctica a un usuario.
 */
export async function recommendActivity(supervisorUser, targetUserId, activity) {
    if (supervisorUser.role !== 'owner' && supervisorUser.role !== 'admin') {
        const err = new Error('No tenés permisos para recomendar actividades.');
        err.status = 403;
        throw err;
    }

    const progress = await getUserProgress({ id: targetUserId });
    progress.recommendedActivities.push({
        id: activity.id,
        title: activity.title,
        type: activity.type || 'module',
        assignedBy: supervisorUser.name || 'Dirección',
        assignedAt: new Date(),
        completed: false
    });
    await progress.save();
    return progress;
}

/**
 * Obtiene el panel de seguimiento del equipo para el supervisor (Owner / Admin).
 * REGLA ESTRICTA DE PRIVACIDAD:
 * Las reflexiones privadas de "Aprender del error" quedan filtradas;
 * ÚNICAMENTE se exponen aquellas donde sharedWithSupervisor === true.
 */
export async function getTeamProgressForSupervisor(supervisorUser) {
    if (supervisorUser.role !== 'owner' && supervisorUser.role !== 'admin') {
        const err = new Error('Acceso restringido a supervisión educativa.');
        err.status = 403;
        throw err;
    }

    const [allProgress, allUsers] = await Promise.all([
        AcademyProgress.find().lean(),
        AdminUser.find({ active: true }).select('name email role active').lean()
    ]);

    const progressMap = new Map(allProgress.map(p => [String(p.userId), p]));

    const team = allUsers.map(u => {
        const uid = String(u._id);
        const p = progressMap.get(uid) || {
            userId: uid,
            userName: u.name,
            userEmail: u.email,
            userRole: u.role,
            assignedTrack: u.role === 'gestor' ? 'track-gestoria' : (u.role === 'admin' ? 'track-administracion' : 'track-vendedor'),
            completedLessons: [],
            completedRoleModules: [],
            assessmentAttempts: [],
            simulationAttempts: [],
            negotiationSessions: [],
            errorReflections: [],
            recommendedActivities: []
        };

        // Filtrar reflexiones: SÓLO las expresamente compartidas
        const sharedReflections = (p.errorReflections || []).filter(r => r.sharedWithSupervisor);

        // Promedios de negociación
        const negotiationScores = (p.negotiationSessions || [])
            .map(s => s.evaluation?.score)
            .filter(score => typeof score === 'number');
        const avgNegotiationScore = negotiationScores.length
            ? Math.round(negotiationScores.reduce((a, b) => a + b, 0) / negotiationScores.length)
            : null;

        return {
            userId: uid,
            name: u.name,
            email: u.email,
            role: u.role,
            assignedTrack: p.assignedTrack,
            completedLessonsCount: p.completedLessons?.length || 0,
            completedRoleModulesCount: p.completedRoleModules?.length || 0,
            negotiationAttemptsCount: p.negotiationSessions?.length || 0,
            avgNegotiationScore,
            recommendedActivities: p.recommendedActivities || [],
            sharedReflectionsCount: sharedReflections.length,
            sharedReflections,
            lastActiveAt: p.lastActiveAt
        };
    });

    // Calcular estadísticas globales del equipo para detectar áreas débiles
    let totalNegotiations = 0;
    const competencySums = {
        identificacionNecesidades: { sum: 0, count: 0 },
        comunicacionClaridad: { sum: 0, count: 0 },
        argumentacionComercial: { sum: 0, count: 0 },
        manejoObjeciones: { sum: 0, count: 0 },
        negociacionAutorizaciones: { sum: 0, count: 0 },
        cierreOProximoPaso: { sum: 0, count: 0 }
    };

    allProgress.forEach(p => {
        (p.negotiationSessions || []).forEach(s => {
            if (s.evaluation?.competencies) {
                totalNegotiations++;
                for (const [key, comp] of Object.entries(s.evaluation.competencies)) {
                    if (competencySums[key] && typeof comp.score === 'number') {
                        competencySums[key].sum += comp.score;
                        competencySums[key].count++;
                    }
                }
            }
        });
    });

    const teamWeaknesses = Object.entries(competencySums).map(([key, data]) => ({
        competency: key,
        avgScore: data.count > 0 ? Math.round(data.sum / data.count) : null
    })).sort((a, b) => (a.avgScore ?? 100) - (b.avgScore ?? 100));

    return {
        team,
        totalNegotiations,
        teamWeaknesses,
        supervisorNotice: 'El seguimiento educativo mide exclusivamente el desarrollo de competencias formativas. No modifica permisos operativos del CRM ni condiciones laborales.'
    };
}
