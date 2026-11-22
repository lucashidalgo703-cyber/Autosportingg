// src/services/academyNotificationService.js
/**
 * Servicio de notificaciones internas de Academy para supervisión del Propietario.
 * Persistentes, con conteo de no leídas, prevención de duplicados y acceso directo al examen.
 */

import mongoose from 'mongoose';
import AcademyNotification from '../models/AcademyNotification.js';

const inMemoryNotificationStore = new Map();

export async function createChallengeCompletedNotification({
    attemptId,
    challengeId,
    seller,
    score,
    correctCount,
    totalQuestions,
    weakCategories = [],
    recommendation = ''
}) {
    const sellerId = String(seller?.id || seller?._id || seller?.userId);
    const sellerName = seller?.name || seller?.username || 'Vendedor';
    const idempotencyKey = `notif-attempt-${attemptId}`;

    const weakText = weakCategories.length > 0
        ? ` Temas con errores: ${weakCategories.join(', ')}.`
        : ' ¡Examen sin errores críticos!';

    const message = `${sellerName} finalizó su evaluación diaria. Resultado: ${score}/100. Correctas: ${correctCount} de ${totalQuestions}.${weakText}${recommendation ? ` Recomendación: ${recommendation}` : ''}`;

    const actionUrl = `/admin/academy/gestion?tab=control&attemptId=${attemptId}&sellerId=${sellerId}`;

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        if (inMemoryNotificationStore.has(idempotencyKey)) {
            return inMemoryNotificationStore.get(idempotencyKey);
        }
        const notif = {
            _id: idempotencyKey,
            recipientRole: 'owner',
            type: 'challenge_completed',
            title: 'Academy — Desafío completado',
            message,
            sellerId,
            sellerName,
            challengeId,
            attemptId,
            score,
            correctCount,
            totalQuestions,
            weakCategories,
            recommendation,
            actionUrl,
            read: false,
            readAt: null,
            idempotencyKey,
            createdAt: new Date()
        };
        inMemoryNotificationStore.set(idempotencyKey, notif);
        return notif;
    }

    try {
        const existing = await AcademyNotification.findOne({ idempotencyKey });
        if (existing) return existing;

        const notif = new AcademyNotification({
            recipientRole: 'owner',
            type: 'challenge_completed',
            title: 'Academy — Desafío completado',
            message,
            sellerId,
            sellerName,
            challengeId,
            attemptId,
            score,
            correctCount,
            totalQuestions,
            weakCategories,
            recommendation,
            actionUrl,
            read: false,
            readAt: null,
            idempotencyKey
        });

        await notif.save();
        return notif;
    } catch (err) {
        if (err.code === 11000) {
            return await AcademyNotification.findOne({ idempotencyKey });
        }
        throw err;
    }
}

export async function getNotifications(user, { limit = 20 } = {}) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        const all = Array.from(inMemoryNotificationStore.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const unreadCount = all.filter(n => !n.read).length;
        return {
            notifications: all.slice(0, limit),
            unreadCount
        };
    }

    const [notifications, unreadCount] = await Promise.all([
        AcademyNotification.find({
            $or: [{ recipientRole: 'owner' }, { recipientRole: user?.role }]
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean(),
        AcademyNotification.countDocuments({
            $or: [{ recipientRole: 'owner' }, { recipientRole: user?.role }],
            read: false
        })
    ]);

    return { notifications, unreadCount };
}

export async function markNotificationRead(notificationId) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        for (const notif of inMemoryNotificationStore.values()) {
            if (String(notif._id) === String(notificationId)) {
                notif.read = true;
                notif.readAt = new Date();
                return notif;
            }
        }
        return null;
    }

    return await AcademyNotification.findByIdAndUpdate(
        notificationId,
        { read: true, readAt: new Date() },
        { new: true }
    );
}

export async function markAllNotificationsRead(user) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        for (const notif of inMemoryNotificationStore.values()) {
            notif.read = true;
            notif.readAt = new Date();
        }
        return { modifiedCount: inMemoryNotificationStore.size };
    }

    const res = await AcademyNotification.updateMany(
        { $or: [{ recipientRole: 'owner' }, { recipientRole: user?.role }], read: false },
        { $set: { read: true, readAt: new Date() } }
    );
    return { modifiedCount: res.modifiedCount };
}

export function resetNotificationsForTesting() {
    inMemoryNotificationStore.clear();
}
