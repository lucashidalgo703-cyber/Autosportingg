import crypto from 'node:crypto';
import IssueReport from '../models/IssueReport.js';
import { EmailAdapter } from '../lib/emailAdapter.js';
import { hasPermission, PERMISSIONS, ROLES } from '../utils/adminPermissions.js';

const MAX_ATTEMPTS = 3;
const STALE_CLAIM_MS = 120000;
const idOf = value => String(value?._id || value || '');
const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function administratorEmail() {
    const value = process.env.SECURITY_ALERT_EMAIL;
    if (typeof value !== 'string' || /[\r\n]/.test(value)) return '';
    const email = value.trim().toLowerCase();
    return email.length <= 254 && /^[^\s@<>;,"]+@[^\s@<>;,"]+\.[^\s@<>;,"]+$/u.test(email) ? email : '';
}
function configured() {
    try { return EmailAdapter.isConfigured(); } catch { return false; }
}
export function prepareIssueReportEmailNotification() {
    const email = administratorEmail();
    const mailConfigured = configured();
    return { state: email && mailConfigured ? 'pending' : 'not_configured', attempts: 0,
        ...(email ? { recipientHash: hash(email) } : {}),
        ...(!email ? { reason: 'admin_recipient_missing' } : !mailConfigured ? { reason: 'mail_unconfigured' } : {}) };
}
export function issueReportEmailSummary(event) {
    if (!event) return { status: 'not_needed', reason: null, retryable: false, sentAt: null, attempts: 0 };
    const stale = event.state === 'sending' && (!event.claimedAt || new Date(event.claimedAt).getTime() <= Date.now() - STALE_CLAIM_MS);
    const email = administratorEmail();
    const recipientMatches = email && (event.recipientHash === hash(email)
        || event.state === 'not_configured' && !event.recipientHash);
    const retryable = !stale && ['pending', 'failed', 'not_configured'].includes(event.state)
        && event.attempts < MAX_ATTEMPTS && Boolean(recipientMatches && configured());
    return { status: stale ? 'uncertain' : event.state, reason: stale ? 'delivery_uncertain' : event.reason || null,
        retryable, sentAt: event.sentAt || null, attempts: event.attempts || 0 };
}
function reviewOrigin() {
    try {
        const url = new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://autosportingg.com');
        const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
        if (url.username || url.password || url.search || url.hash || url.pathname !== '/'
            || url.protocol !== 'https:' && !(loopback && process.env.VERCEL !== '1' && url.protocol === 'http:')) throw new Error();
        return url.origin;
    } catch { return 'https://autosportingg.com'; }
}
function renderNotice(report) {
    const author = report.author;
    const authorName = String(author?.name || 'Usuario del CRM').replace(/[\r\n]/g, ' ').trim().slice(0, 160);
    const authorEmail = String(author?.email || '').replace(/[\r\n]/g, ' ').trim().slice(0, 254);
    const priority = ({ low: 'Baja', medium: 'Media', high: 'Alta' })[report.priority] || 'Media';
    const category = ({ bug: 'Bug', falla: 'Falla', otro: 'Otro' })[report.category] || 'Otro';
    const date = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' }).format(report.createdAt);
    const reviewUrl = reviewOrigin() + '/admin/reportar-problema?reportId=' + idOf(report);
    const details = [`Autor: ${authorName}${authorEmail ? ` (${authorEmail})` : ''}`, `Título: ${report.title}`,
        `Sección: ${report.module || 'No especificada'}`, `Tipo: ${category}`, `Prioridad: ${priority}`, `Fecha · Hora argentina: ${date}`];
    return {
        subject: `AutoSporting | Nuevo reporte de problema: ${String(report.title).replace(/[\r\n]/g, ' ').slice(0, 160)}`,
        text: ['AutoSporting', 'Se registró un nuevo reporte de problema en el CRM.', ...details,
            `Descripción:\n${report.description}`, `Revisar reporte en el CRM: ${reviewUrl}`,
            'El enlace requiere iniciar sesión con una cuenta autorizada. Las capturas se consultan dentro del CRM.'].join('\n\n'),
        html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#18181b"><h1 style="font-size:24px">AutoSporting</h1><h2 style="font-size:20px">Nuevo reporte de problema</h2>${details.map(line => `<p>${escape(line)}</p>`).join('')}<h3>Descripción</h3><div style="white-space:pre-wrap">${escape(report.description)}</div><p><a href="${escape(reviewUrl)}" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 20px;border-radius:8px;text-decoration:none">Revisar reporte en el CRM</a></p><p style="color:#52525b;font-size:12px">El enlace requiere iniciar sesión con una cuenta autorizada. Las capturas se consultan dentro del CRM.</p></div>`
    };
}
const knownFailure = error => String(error?.command || '').trim().toUpperCase() !== 'QUIT' && (
    ['EAUTH', 'ENOTFOUND', 'ECONNREFUSED', 'EENVELOPE', 'NOT_ACCEPTED', 'MAIL_UNCONFIGURED'].includes(error?.code)
    || error?.code === 'ECONNECTION' && error?.command === 'CONN'
    || Number(error?.responseCode) >= 400 && Number(error?.responseCode) <= 599);
async function expireStaleClaim(id) {
    await IssueReport.updateOne({ _id: id, 'emailNotification.state': 'sending', 'emailNotification.claimedAt': { $lte: new Date(Date.now() - STALE_CLAIM_MS) } },
        { $set: { 'emailNotification.state': 'uncertain', 'emailNotification.reason': 'delivery_uncertain' }, $unset: { 'emailNotification.claimId': '' } });
}
async function deliverRecord(id) {
    const claimId = crypto.randomUUID();
    const report = await IssueReport.findOneAndUpdate({ _id: id, 'emailNotification.state': { $in: ['pending', 'failed', 'not_configured'] }, 'emailNotification.attempts': { $lt: MAX_ATTEMPTS } },
        { $set: { 'emailNotification.state': 'sending', 'emailNotification.claimedAt': new Date(), 'emailNotification.claimId': claimId, 'emailNotification.reason': null },
            $inc: { 'emailNotification.attempts': 1 } }, { new: true })
        .select('title description category priority module author createdAt emailNotification').populate('author', 'name email').lean();
    if (!report) return (await IssueReport.findById(id).select('emailNotification').lean())?.emailNotification;
    const claimed = { _id: id, 'emailNotification.state': 'sending', 'emailNotification.claimId': claimId };
    const finish = async (state, reason = null) => {
        const result = await IssueReport.findOneAndUpdate(claimed, { $set: { 'emailNotification.state': state, 'emailNotification.reason': reason,
            ...(state === 'sent' ? { 'emailNotification.sentAt': new Date() } : {}) }, $unset: { 'emailNotification.claimId': '' } }, { new: true }).select('emailNotification').lean();
        return result?.emailNotification;
    };
    let email, content;
    try {
        email = administratorEmail();
        if (!email) return finish('not_configured', 'admin_recipient_missing');
        if (hash(email) !== report.emailNotification.recipientHash) return finish('failed', 'admin_recipient_changed');
        if (!configured()) return finish('not_configured', 'mail_unconfigured');
        content = renderNotice(report);
    } catch { return finish('failed', 'preparation_failed'); }
    let timeout;
    try {
        const result = await Promise.race([
            EmailAdapter.sendEmail(email, content.subject, content.html, [],
                { connectionTimeout: 4000, greetingTimeout: 4000, socketTimeout: 6000, logger: false, debug: false },
                { text: content.text, messageId: `<autosporting-issue-report-${id}@autosportingg.com>` }),
            new Promise((_, reject) => { timeout = setTimeout(() => reject(Object.assign(new Error('Mail result unknown'), { code: 'DELIVERY_TIMEOUT' })), 8000); })
        ]);
        if (!Array.isArray(result?.accepted) || !result.accepted.some(value => String(typeof value === 'string' ? value : value?.address || '').toLowerCase() === email)) {
            throw Object.assign(new Error('Recipient not accepted'), { code: 'NOT_ACCEPTED' });
        }
    } catch (error) {
        return knownFailure(error) ? finish('failed', 'delivery_failed') : finish('uncertain', 'delivery_uncertain');
    } finally { clearTimeout(timeout); }
    return finish('sent');
}
export async function deliverIssueReportEmail(id) {
    if (!validId(id)) return issueReportEmailSummary();
    try {
        await expireStaleClaim(id);
        const current = await IssueReport.findById(id).select('emailNotification').lean();
        // A missing initial recipient can only be bound by an explicit owner
        // retry, never by creation dispatch or a background invocation.
        if (!current?.emailNotification?.recipientHash || !issueReportEmailSummary(current.emailNotification).retryable) return issueReportEmailSummary(current?.emailNotification);
        return issueReportEmailSummary(await deliverRecord(id));
    } catch { return { status: 'pending', reason: 'confirmation_pending', retryable: false, sentAt: null, attempts: 0 }; }
}
export async function retryIssueReportEmail(user, id) {
    if (user?.role !== ROLES.OWNER) fail('Sólo el propietario puede reenviar el aviso de correo.', 403);
    if (!validId(id)) fail('El identificador del reporte no es válido.');
    await expireStaleClaim(id);
    const report = await IssueReport.findById(id).select('emailNotification').lean();
    if (!report) fail('Reporte no encontrado.', 404);
    const summary = issueReportEmailSummary(report.emailNotification);
    if (!summary.retryable) fail(summary.status === 'uncertain'
        ? 'No se pudo confirmar la entrega. Revisá tu correo antes de solicitar otro aviso.'
        : 'Este aviso no admite otro intento de envío.', 409);
    if (report.emailNotification.state === 'not_configured' && !report.emailNotification.recipientHash) {
        const email = administratorEmail();
        if (!email || !configured()) fail('Configurá el destino y el servicio de correo antes de reintentar.', 409);
        await IssueReport.updateOne({ _id: id, 'emailNotification.state': 'not_configured',
            'emailNotification.recipientHash': { $in: [null, ''] } },
        { $set: { 'emailNotification.recipientHash': hash(email), 'emailNotification.state': 'pending', 'emailNotification.reason': null } });
    }
    return deliverIssueReportEmail(id);
}
export async function getIssueReportNotifications(user) {
    if (user?.role !== ROLES.OWNER || !hasPermission(user, PERMISSIONS.SUGGESTIONS_MANAGE)) return [];
    const reports = await IssueReport.find({}).select('title priority createdAt').sort({ createdAt: -1, _id: -1 }).limit(100).lean();
    return reports.map(report => ({ type: 'issue_report_created', severity: ({ high: 'danger', medium: 'warning', low: 'info' })[report.priority] || 'info',
        title: 'Nuevo reporte de problema', description: report.title, module: 'fallas', entityType: 'IssueReport', entityId: idOf(report),
        href: `/admin/reportar-problema?reportId=${idOf(report)}`, dueDate: report.createdAt }));
}
