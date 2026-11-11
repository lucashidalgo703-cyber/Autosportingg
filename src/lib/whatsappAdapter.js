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

    static async sendPayload(payload) {
        if (!this.isConfigured()) {
            throw new Error('Integracion de WhatsApp no configurada.');
        }

        const response = await fetch(this.getApiUrl(), {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + process.env.WHATSAPP_API_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error?.message || 'Error enviando WhatsApp');
        }

        return data;
    }

    static async sendMessage(to, text) {
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

        return this.sendPayload(payload);
    }

    static async sendTemplateMessage(to, templateName, languageCode = 'es_AR', components = []) {
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

        return this.sendPayload(payload);
    }
}
