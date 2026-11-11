import { assertClientContactAllowed } from '../services/clientContactPreferenceService.js';

export class WhatsAppAdapter {
    static getRequiredEnvKeys() {
        return ['WHATSAPP_API_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];
    }

    static isConfigured() {
        return this.getRequiredEnvKeys().every((key) => !!process.env[key]);
    }

    static getStatus() {
        const missing = this.getRequiredEnvKeys().filter((key) => !process.env[key]);
        return {
            key: 'whatsapp',
            name: 'WhatsApp Meta Cloud API',
            provider: 'meta-cloud-api',
            configured: missing.length === 0,
            status: missing.length === 0 ? 'ok' : 'warning',
            detail: missing.length === 0
                ? 'Credenciales de Meta configuradas por variables de entorno.'
                : 'Faltan credenciales de Meta para enviar mensajes reales.',
            missing
        };
    }

    static formatPhoneNumber(phone) {
        if (!phone) return null;
        let cleaned = phone.replace(/\D/g, '');
        // Default to Argentina code if no prefix, this is a basic assumption
        if (cleaned.startsWith('15') && cleaned.length === 10) {
            cleaned = '549' + cleaned.substring(2);
        } else if (cleaned.length === 10) {
            cleaned = '549' + cleaned;
        } else if (cleaned.startsWith('0')) {
            cleaned = '549' + cleaned.substring(1);
        }
        return cleaned;
    }

    static getApiUrl() {
        return 'https://graph.facebook.com/v17.0/' + process.env.WHATSAPP_PHONE_NUMBER_ID + '/messages';
    }

    static async sendPayload(payload, context = {}) {
        await assertClientContactAllowed({ ...context, to: payload.to, channel: 'whatsapp' });
        if (!this.isConfigured()) {
            throw Object.assign(new Error('Integracion de WhatsApp no configurada.'), { code: 'WHATSAPP_NOT_CONFIGURED', deliveryUncertain: false });
        }

        let response;
        try { response = await fetch(this.getApiUrl(), {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + process.env.WHATSAPP_API_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(20000)
        }); } catch (error) { throw Object.assign(new Error('El proveedor no confirmó el resultado del envío. Revisá WhatsApp antes de reintentar.'), { code: 'WHATSAPP_DELIVERY_UNCERTAIN', deliveryUncertain: true, cause: error }); }

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const uncertain = response.status >= 500 || response.status === 408;
            throw Object.assign(new Error(uncertain ? 'El proveedor no confirmó el resultado del envío. Revisá WhatsApp antes de reintentar.' : data.error?.message || 'Error enviando WhatsApp'), { code: uncertain ? 'WHATSAPP_DELIVERY_UNCERTAIN' : 'WHATSAPP_REJECTED', statusCode: response.status, deliveryUncertain: uncertain });
        }
        if (!data.messages?.[0]?.id) throw Object.assign(new Error('El proveedor no confirmó el identificador del mensaje. Revisá WhatsApp antes de reintentar.'), { code: 'WHATSAPP_DELIVERY_UNCERTAIN', deliveryUncertain: true });

        return data;
    }

    static async sendMessage(to, text, context = {}) {
        const formattedTo = this.formatPhoneNumber(to);
        if (!formattedTo) {
            throw new Error('Numero de telefono invalido.');
        }

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedTo,
            type: 'text',
            text: {
                preview_url: false,
                body: text
            }
        };

        return this.sendPayload(payload, context);
    }

    static async sendTemplateMessage(to, templateName, languageCode = 'es_AR', components = [], context = {}) {
        const formattedTo = this.formatPhoneNumber(to);
        if (!formattedTo) {
            throw new Error('Numero de telefono invalido.');
        }
        if (!templateName) {
            throw new Error('Nombre de template requerido.');
        }

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedTo,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                components: Array.isArray(components) ? components : []
            }
        };

        return this.sendPayload(payload, context);
    }
}
