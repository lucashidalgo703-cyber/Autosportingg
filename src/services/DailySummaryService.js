import mongoose from 'mongoose';
import DailySummaryLog from '../models/DailySummaryLog.js';
import Lead from '../models/Lead.js';
import Sale from '../models/Sale.js';
import Installment from '../models/Installment.js';
import Complaint from '../models/Complaint.js';
import AuditLog from '../models/AuditLog.js';
import Conversation from '../models/Conversation.js';
import InternalMessage from '../models/InternalMessage.js';

export class DailySummaryService {
    static async generateData(sections) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        let metrics = {};

        if (sections.newLeads) {
            metrics.newLeads = await Lead.countDocuments({
                createdAt: { $gte: startOfToday, $lte: endOfToday }
            });
        }

        if (sections.unansweredConversations) {
            // Using leads in 'nuevo' status as a proxy for unanswered initial contact
            metrics.unansweredConversations = await Lead.countDocuments({
                crmStatus: 'nuevo'
            });
        }

        if (sections.dailySales) {
            metrics.dailySales = await Sale.countDocuments({
                $or: [
                    { saleDate: { $gte: startOfToday, $lte: endOfToday } },
                    { createdAt: { $gte: startOfToday, $lte: endOfToday }, saleDate: null }
                ],
                status: { $ne: 'borrador' }
            });
        }

        if (sections.dueInstallments) {
            metrics.dueInstallments = await Installment.countDocuments({
                dueDate: { $lte: endOfToday },
                status: { $in: ['pendiente', 'parcial'] }
            });
        }

        if (sections.openComplaints) {
            metrics.openComplaints = await Complaint.countDocuments({
                status: { $in: ['open', 'in_progress'] }
            });
        }

        if (sections.criticalAlerts) {
            metrics.criticalAlerts = await AuditLog.countDocuments({
                createdAt: { $gte: startOfToday, $lte: endOfToday },
                action: { $in: ['LOGIN_FALLIDO', 'CUOTA_ELIMINADA_DEFINITIVAMENTE', 'MOVIMIENTO_ANULADO', 'ROL_ACTUALIZADO'] }
            });
        }

        return metrics;
    }

    static formatToMarkdown(metrics, date) {
        const formattedDate = date.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        let md = `## Resumen Diario Operativo\n**Fecha:** ${formattedDate}\n\n`;

        if (metrics.newLeads !== undefined) {
            md += `- **Leads Nuevos Hoy:** ${metrics.newLeads}\n`;
        }
        if (metrics.unansweredConversations !== undefined) {
            md += `- **Leads/Conversaciones sin respuesta:** ${metrics.unansweredConversations}\n`;
        }
        if (metrics.dailySales !== undefined) {
            md += `- **Ventas del Día:** ${metrics.dailySales}\n`;
        }
        if (metrics.dueInstallments !== undefined) {
            md += `- **Cuotas Vencidas o Próximas:** ${metrics.dueInstallments}\n`;
        }
        if (metrics.openComplaints !== undefined) {
            md += `- **Reclamos Abiertos/En Curso:** ${metrics.openComplaints}\n`;
        }
        if (metrics.criticalAlerts !== undefined) {
            md += `- **Alertas Críticas de Seguridad:** ${metrics.criticalAlerts}\n`;
        }

        md += `\n*Este resumen fue generado automáticamente por el sistema.*`;
        return md;
    }

    static async dispatch(channel, payloadText, recipients) {
        if (channel === 'internal') {
            const systemUserId = process.env.SYSTEM_USER_ID || 'Sistema';
            
            // Find or create group conversation
            let conv = await Conversation.findOne({ type: 'group', subject: 'Resumen Diario Operativo' });
            if (!conv) {
                conv = new Conversation({
                    type: 'group',
                    subject: 'Resumen Diario Operativo',
                    participants: [systemUserId], // Add system user, admins will see it anyway or we can add them later
                });
                await conv.save();
            }

            const msg = new InternalMessage({
                conversationId: conv._id,
                author: systemUserId,
                content: payloadText
            });
            await msg.save();
            
            conv.lastMessageAt = new Date();
            await conv.save();

            return { status: 'sent', message: 'Mensaje interno creado.' };
        } 
        
        if (channel === 'email') {
            // Future implementation
            throw new Error("El canal 'email' no cuenta con credenciales configuradas en esta fase.");
        }

        if (channel === 'whatsapp') {
            // Future implementation
            throw new Error("El canal 'whatsapp' no cuenta con credenciales configuradas en esta fase.");
        }

        throw new Error(`Canal desconocido: ${channel}`);
    }

    static async runJob(config) {
        if (!config || !config.enabled) {
            return { status: 'skipped', reason: 'disabled' };
        }

        const channel = config.channel || 'internal';
        
        // Formato para asegurar idempotencia local por huso horario
        const dateString = new Date().toLocaleDateString('en-CA', { timeZone: process.env.DAILY_SUMMARY_TIMEZONE || 'America/Argentina/Buenos_Aires' }); // YYYY-MM-DD format based on local tz

        // Check idempotency
        const existingLog = await DailySummaryLog.findOne({ dateString, channel });
        if (existingLog && existingLog.status === 'sent') {
            return { status: 'skipped', reason: 'already_sent_today' };
        }

        try {
            const metrics = await this.generateData(config.sections);
            const payload = this.formatToMarkdown(metrics, new Date());
            
            await this.dispatch(channel, payload, config.recipients);

            await DailySummaryLog.findOneAndUpdate(
                { dateString, channel },
                { status: 'sent', payload, metrics, errorMessage: '' },
                { upsert: true, new: true }
            );

            return { status: 'sent', channel };

        } catch (error) {
            console.error('Daily Summary Job Error:', error);
            
            // E11000 duplicate key error means another instance already saved this run
            if (error.code === 11000) {
                return { status: 'skipped', reason: 'already_sent_by_another_instance' };
            }

            await DailySummaryLog.findOneAndUpdate(
                { dateString, channel },
                { status: 'failed', payload: 'ERROR', errorMessage: error.message },
                { upsert: true, new: true }
            );
            return { status: 'failed', channel, error: error.message };
        }
    }
}
