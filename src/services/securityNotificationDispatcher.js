/**
 * AUTOSPORTING INTELLIGENCE — DESPACHADOR DESACOPLADO DE NOTIFICACIONES DE SEGURIDAD
 * 
 * Arquitectura de canales desacoplados para alertas críticas y advertencias.
 * Por directiva de seguridad:
 * - NO se envían notificaciones externas activas en esta etapa (WhatsApp, Email o SMS).
 * - Los canales externos quedan formalmente diseñados con contratos limpios para su habilitación futura
 *   sin requerir refactorización del servicio principal de alertas.
 */

import { dispatchAlertPushNotification } from './webPushService.js';

class NotificationChannel {
    constructor(name) {
        this.name = name;
    }

    async send(_alert) {
        throw new Error(`Método send() no implementado en el canal ${this.name}`);
    }
}

/**
 * Canal Interno de Base de Datos y Trazabilidad (Activo)
 */
class InternalStorageChannel extends NotificationChannel {
    constructor() {
        super('internal');
    }

    async send(alert) {
        return {
            channel: this.name,
            delivered: true,
            timestamp: new Date(),
            reference: alert.alertId
        };
    }
}

/**
 * Canal Web Push para Alertas Críticas y de Alta Prioridad en Celular (Activo)
 */
class WebPushNotificationChannel extends NotificationChannel {
    constructor() {
        super('webpush');
        this.enabled = true;
    }

    async send(alert) {
        if (!this.enabled) {
            return { channel: this.name, delivered: false, reason: 'CHANNEL_DISABLED_BY_POLICY' };
        }
        try {
            const pushResult = await dispatchAlertPushNotification(alert);
            return {
                channel: this.name,
                delivered: !!pushResult.dispatched,
                targetsCount: pushResult.targetsCount || 0,
                results: pushResult.results || [],
                reason: pushResult.reason || null
            };
        } catch (err) {
            return { channel: this.name, delivered: false, error: err.message };
        }
    }
}

/**
 * Canal de WhatsApp Business (Diseñado / Inactivo en esta fase)
 */
class WhatsAppNotificationChannel extends NotificationChannel {
    constructor() {
        super('whatsapp');
        this.enabled = false; // Desactivado hasta autorización explícita de infraestructura
    }

    async send(alert) {
        if (!this.enabled) {
            return { channel: this.name, delivered: false, reason: 'CHANNEL_DISABLED_BY_POLICY' };
        }
        // Integración desacoplada futura con WhatsAppAdapter
        return { channel: this.name, delivered: false, pendingImplementation: true };
    }
}

/**
 * Canal de Correo Electrónico Transaccional (Diseñado / Inactivo en esta fase)
 */
class EmailNotificationChannel extends NotificationChannel {
    constructor() {
        super('email');
        this.enabled = false;
    }

    async send(alert) {
        if (!this.enabled) {
            return { channel: this.name, delivered: false, reason: 'CHANNEL_DISABLED_BY_POLICY' };
        }
        // Integración desacoplada futura con EmailAdapter
        return { channel: this.name, delivered: false, pendingImplementation: true };
    }
}

/**
 * Canal SMS / Telefonía (Diseñado / Inactivo en esta fase)
 */
class SmsNotificationChannel extends NotificationChannel {
    constructor() {
        super('sms');
        this.enabled = false;
    }

    async send(alert) {
        if (!this.enabled) {
            return { channel: this.name, delivered: false, reason: 'CHANNEL_DISABLED_BY_POLICY' };
        }
        return { channel: this.name, delivered: false, pendingImplementation: true };
    }
}

// Registro de canales disponibles
const registeredChannels = [
    new InternalStorageChannel(),
    new WebPushNotificationChannel(),
    new WhatsAppNotificationChannel(),
    new EmailNotificationChannel(),
    new SmsNotificationChannel()
];

/**
 * Despacha la notificación a través de todos los canales habilitados
 */
export async function dispatchSecurityAlertNotification(alert) {
    const results = [];
    for (const channel of registeredChannels) {
        try {
            const res = await channel.send(alert);
            results.push(res);
        } catch (err) {
            results.push({ channel: channel.name, delivered: false, error: err.message });
        }
    }
    return results;
}

export {
    NotificationChannel,
    InternalStorageChannel,
    WebPushNotificationChannel,
    WhatsAppNotificationChannel,
    EmailNotificationChannel,
    SmsNotificationChannel
};
