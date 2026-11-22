// src/services/academyMemoryService.js
/**
 * Servicio de repetición espaciada y memoria de aprendizaje de vendedores.
 * Rastrea conceptos dominados, errores recurrentes y programa repasos espaciados.
 */

import mongoose from 'mongoose';
import AcademyKnowledgeMemory from '../models/AcademyKnowledgeMemory.js';

// Almacén en memoria para pruebas aisladas
const inMemoryMemoryStore = new Map();

function addDaysToDateStr(dateStr, days) {
    const d = new Date(`${dateStr}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
}

export function getTodayArgentinaDate() {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(now);
        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        const d = parts.find(p => p.type === 'day')?.value;
        return `${y}-${m}-${d}`;
    } catch {
        return new Date().toISOString().split('T')[0];
    }
}

export async function recordConceptOutcome(userId, { category, conceptKey, entityId = null, entityLabel, isCorrect, dateStr = null }) {
    const today = dateStr || getTodayArgentinaDate();

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        const storeKey = `${userId}::${conceptKey}`;
        const existing = inMemoryMemoryStore.get(storeKey) || {
            userId,
            category,
            conceptKey,
            entityId,
            entityLabel,
            errorCount: 0,
            successCount: 0,
            consecutiveCorrect: 0,
            status: 'en_progreso',
            nextReviewDate: today
        };

        if (isCorrect) {
            existing.successCount++;
            existing.consecutiveCorrect++;
            if (existing.consecutiveCorrect >= 3) {
                existing.status = 'dominado';
                existing.nextReviewDate = addDaysToDateStr(today, 7);
            } else {
                existing.status = 'en_progreso';
                existing.nextReviewDate = addDaysToDateStr(today, 3);
            }
        } else {
            existing.errorCount++;
            existing.consecutiveCorrect = 0;
            existing.status = 'debilitado';
            existing.nextReviewDate = addDaysToDateStr(today, 1);
        }
        existing.lastEvaluatedAt = new Date();
        inMemoryMemoryStore.set(storeKey, existing);
        return existing;
    }

    let memory = await AcademyKnowledgeMemory.findOne({ userId, conceptKey });
    if (!memory) {
        memory = new AcademyKnowledgeMemory({
            userId,
            category,
            conceptKey,
            entityId,
            entityLabel,
            errorCount: 0,
            successCount: 0,
            consecutiveCorrect: 0,
            status: 'en_progreso',
            nextReviewDate: today
        });
    }

    if (isCorrect) {
        memory.successCount++;
        memory.consecutiveCorrect++;
        if (memory.consecutiveCorrect >= 3) {
            memory.status = 'dominado';
            memory.nextReviewDate = addDaysToDateStr(today, 7);
        } else {
            memory.status = 'en_progreso';
            memory.nextReviewDate = addDaysToDateStr(today, 3);
        }
    } else {
        memory.errorCount++;
        memory.consecutiveCorrect = 0;
        memory.status = 'debilitado';
        memory.nextReviewDate = addDaysToDateStr(today, 1);
    }

    memory.lastEvaluatedAt = new Date();
    await memory.save();
    return memory;
}

export async function getWeakConceptsForUser(userId) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        return Array.from(inMemoryMemoryStore.values())
            .filter(m => m.userId === userId && (m.status === 'debilitado' || m.errorCount > m.successCount));
    }
    return await AcademyKnowledgeMemory.find({
        userId,
        $or: [{ status: 'debilitado' }, { errorCount: { $gt: 0 } }]
    }).sort({ errorCount: -1, lastEvaluatedAt: -1 }).lean();
}

export async function getMasteredConceptsForUser(userId) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        return Array.from(inMemoryMemoryStore.values())
            .filter(m => m.userId === userId && m.status === 'dominado');
    }
    return await AcademyKnowledgeMemory.find({
        userId,
        status: 'dominado'
    }).sort({ consecutiveCorrect: -1 }).lean();
}

export async function getDueConceptsForReview(userId, dateStr = null) {
    const today = dateStr || getTodayArgentinaDate();
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        return Array.from(inMemoryMemoryStore.values())
            .filter(m => m.userId === userId && m.nextReviewDate <= today);
    }
    return await AcademyKnowledgeMemory.find({
        userId,
        nextReviewDate: { $lte: today }
    }).sort({ errorCount: -1 }).lean();
}

export function resetMemoryForTesting() {
    inMemoryMemoryStore.clear();
}
