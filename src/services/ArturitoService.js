import CrmSettings from '../models/CrmSettings.js';

export class ArturitoService {
    /**
     * Revisa si Arturito está habilitado y configurado en base de datos y entorno.
     */
    static async getStatus() {
        try {
            const settings = await CrmSettings.findOne({});
            const enabled = settings?.assistantConfig?.enabled ?? false;
            const configured = Boolean(process.env.OPENAI_API_KEY);
            return {
                enabled,
                configured,
                available: enabled && configured
            };
        } catch (error) {
            return { enabled: false, configured: false, available: false };
        }
    }

    /**
     * Realiza una llamada segura a OpenAI usando fetch nativo.
     * Si no está disponible, retorna un estado honesto en vez de romper.
     */
    static async callOpenAI(messages, temperature = 0.7, maxTokens = 220) {
        const status = await this.getStatus();
        if (!status.available) {
            return null; // Silent skip for graceful degradation
        }

        const apiKey = process.env.OPENAI_API_KEY;
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 8000);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTokens
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                console.error('Arturito (OpenAI) Error:', error);
                return null;
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content?.trim() || null;
        } catch (error) {
            console.error('Arturito (OpenAI) Error:', error.message);
            return null;
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Genera una sugerencia de respuesta basada en los últimos mensajes de un Lead o Cliente.
     * @param {Object} context - Objeto con datos del contacto, los últimos mensajes y el vehículo de interés (si existe)
     */
    static async suggestReply(context) {
        const systemPrompt = `Eres Arturito, el asistente de IA operativo del CRM de AutoSporting. 
Tu tarea es sugerir la próxima respuesta de WhatsApp a un lead o cliente.
Tono: Profesional, cordial, conciso y resolutivo.

GUARDRAILS (REGLAS ESTRICTAS):
- NO puedes aprobar ni ofrecer descuentos.
- NO puedes cerrar ventas.
- NO puedes aceptar pagos, transferencias ni cambiar dinero.
- NO prometas disponibilidad asegurada de un vehículo sin validación humana.
- NUNCA te inventes precios.
- Si el cliente pregunta sobre precios o descuentos no especificados en el contexto, sugiere invitarlo a una llamada o visita al concesionario.
- Responde siempre asumiendo que un asesor humano (el vendedor) revisará tu mensaje antes de enviarlo.

Contexto proporcionado:
Contacto: ${context.contactName} (${context.contactType})
Vehículo de interés (si aplica): ${context.vehicleInfo || 'No especificado'}
Mensajes recientes (del más antiguo al más nuevo):
${context.chatHistory}`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Genera una sugerencia de respuesta para este chat. No incluyas 'Asesor:' al principio, redacta el texto directo que enviaríamos." }
        ];

        const suggestion = await this.callOpenAI(messages, 0.5, 220);
        return suggestion;
    }

    /**
     * Clasifica un mensaje entrante (Webhook) en una de las intenciones comerciales.
     * Best-effort: Si falla, retorna null.
     */
    static async classifyMessage(text) {
        if (!text || text.length < 3) return null;

        const systemPrompt = `Clasifica el siguiente mensaje entrante de un cliente de concesionario automotriz en UNA de las siguientes intenciones exactas (solo responde con el string de la intención):
- compra
- venta
- permuta
- financiacion
- reclamo
- postventa
- spam

Si no estás seguro o es un saludo genérico, responde: sin_clasificar`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Mensaje: "${String(text).slice(0, 1000)}"` }
        ];

        const intention = await this.callOpenAI(messages, 0.1, 20);
        
        const validIntentions = ['compra', 'venta', 'permuta', 'financiacion', 'reclamo', 'postventa', 'spam', 'sin_clasificar'];
        const normalized = intention ? intention.toLowerCase().replace(/[^a-z_]/g, '') : 'sin_clasificar';
        
        if (validIntentions.includes(normalized)) {
            return normalized;
        }
        return 'sin_clasificar';
    }
}
