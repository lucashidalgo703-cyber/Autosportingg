import mongoose from 'mongoose';
import IssueReport, { ISSUE_REPORT_CATEGORIES, ISSUE_REPORT_PRIORITIES, ISSUE_REPORT_STATUSES } from '../models/IssueReport.js';
import { hasPermission, PERMISSIONS, ROLES } from '../utils/adminPermissions.js';
import { deliverIssueReportEmail, issueReportEmailSummary, prepareIssueReportEmailNotification } from './issueReportNotificationService.js';

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const idOf = value => String(value?._id || value || '');
const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const actor = user => idOf(user?.userId || user?.id || user?._id);
let indexPreparation;
export function prepareIssueReportIndexes() {
    if (!indexPreparation) indexPreparation = IssueReport.createIndexes().catch(error => { indexPreparation = null; throw error; });
    return indexPreparation;
}
export const canManageIssueReports = user => hasPermission(user, PERMISSIONS.SUGGESTIONS_MANAGE);
export const authorizeIssueReports = user => {
    if (!validId(actor(user)) || !Object.values(ROLES).includes(user?.role)) fail('Iniciá sesión en el CRM para reportar un problema.', 403);
};
const scope = user => canManageIssueReports(user) ? {} : { author: actor(user) };
const populate = query => query.select('-attachments.data').populate('author', 'name email').populate('comments.author', 'name email');
function text(value, label, max, required = false) {
    if (value === undefined || value === null) {
        if (required) fail(`Completá ${label}.`);
        return '';
    }
    if (typeof value !== 'string' || value.length > max) fail(`Revisá ${label}; admite hasta ${max} caracteres.`);
    const result = value.trim();
    if (required && !result) fail(`Completá ${label}.`);
    return result;
}
function choice(value, options, fallback, label) {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !options.includes(value)) fail(`Elegí ${label} válido.`);
    return value;
}
function cleanPageUrl(value) {
    const source = text(value, 'la dirección de la pantalla', 500);
    if (!source) return '';
    let parsed;
    try { parsed = new URL(source, 'https://crm.invalid'); } catch { fail('La dirección de la pantalla no es válida.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password
        || source.startsWith('//') || /[\x00-\x1f\\]/.test(source)
        || (!source.startsWith('/') && !/^https?:\/\//i.test(source))) fail('La dirección de la pantalla no es válida.');
    // Query strings and fragments can carry customer data or authentication tokens.
    return source.startsWith('/') ? parsed.pathname : parsed.origin + parsed.pathname;
}
function inspectAttachment(file) {
    const buffer = file?.buffer;
    if (!Buffer.isBuffer(buffer) || !buffer.length) fail('La captura está vacía.');
    if (buffer.length > 3 * 1024 * 1024) fail('Cada captura admite hasta 3 MB.', 413);
    let contentType;
    if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        && buffer.subarray(12, 16).toString('ascii') === 'IHDR') contentType = 'image/png';
    else if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) contentType = 'image/jpeg';
    else if (buffer.length >= 16 && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
        && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
        && ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.subarray(12, 16).toString('ascii'))) contentType = 'image/webp';
    if (!contentType || contentType !== file.mimetype) fail('Subí capturas PNG, JPG o WebP válidas.');
    const name = (typeof file.originalname === 'string' ? file.originalname : 'captura')
        .replace(/[\x00-\x1f\x7f/\\"'<>]/g, '_').trim().slice(0, 180) || 'captura';
    return { name, contentType, size: buffer.length, data: buffer };
}
const person = value => value?.name !== undefined ? { _id: idOf(value), name: value.name, email: value.email } : { _id: idOf(value), name: 'Usuario del CRM' };
export function issueReportDto(report, user) {
    const value = typeof report?.toObject === 'function' ? report.toObject() : report;
    return {
        _id: idOf(value), title: value.title, description: value.description, category: value.category,
        priority: value.priority, status: value.status, module: value.module, steps: value.steps,
        expectedBehavior: value.expectedBehavior, actualBehavior: value.actualBehavior, pageUrl: value.pageUrl,
        author: person(value.author), createdAt: value.createdAt, updatedAt: value.updatedAt,
        attachments: (value.attachments || []).map(file => ({
            _id: idOf(file), name: file.name, contentType: file.contentType, size: file.size,
            url: `/api/admin/issue-reports/${idOf(value)}/attachments/${idOf(file)}`
        })),
        comments: (value.comments || []).map(comment => ({ _id: idOf(comment), text: comment.text, author: person(comment.author), createdAt: comment.createdAt })),
        ...(canManageIssueReports(user) ? { emailNotification: issueReportEmailSummary(value.emailNotification) } : {})
    };
}
export async function listIssueReports(user, query = {}) {
    authorizeIssueReports(user);
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? 20 : Number(query.limit);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) fail('Revisá la página de resultados.');
    const filter = scope(user);
    for (const [field, options] of [['status', ISSUE_REPORT_STATUSES], ['category', ISSUE_REPORT_CATEGORIES], ['priority', ISSUE_REPORT_PRIORITIES]]) {
        if (query[field] !== undefined && query[field] !== '') filter[field] = choice(query[field], options, undefined, field);
    }
    const search = text(query.search, 'la búsqueda', 120);
    if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ title: regex }, { description: regex }, { module: regex }];
    }
    const [reports, total] = await Promise.all([
        IssueReport.find(filter).select('-attachments.data -comments -steps -expectedBehavior -actualBehavior')
            .populate('author', 'name email').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        IssueReport.countDocuments(filter)
    ]);
    return { reports: reports.map(report => issueReportDto(report, user)), total, page, pageSize: limit, canManage: canManageIssueReports(user) };
}
export async function getIssueReport(user, id) {
    authorizeIssueReports(user);
    if (!validId(id)) fail('El identificador del reporte no es válido.');
    const report = await populate(IssueReport.findOne({ _id: id, ...scope(user) })).lean();
    if (!report) fail('Reporte no encontrado.', 404);
    return issueReportDto(report, user);
}
export async function createIssueReport(user, input = {}, files = []) {
    authorizeIssueReports(user);
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Revisá los datos del reporte.');
    if (!Array.isArray(files) || files.length > 3) fail('Podés adjuntar hasta 3 capturas.');
    if (files.reduce((total, file) => total + (file?.buffer?.length || 0), 0) > 3 * 1024 * 1024) fail('Las capturas pueden sumar hasta 3 MB por reporte.', 413);
    const report = await IssueReport.create({
        title: text(input.title, 'el título', 160, true),
        description: text(input.description, 'la descripción', 10000, true),
        category: choice(input.category, ISSUE_REPORT_CATEGORIES, 'bug', 'un tipo de problema'),
        priority: choice(input.priority, ISSUE_REPORT_PRIORITIES, 'medium', 'una prioridad'),
        module: text(input.module, 'la sección', 100), steps: text(input.steps, 'los pasos', 5000),
        expectedBehavior: text(input.expectedBehavior, 'el resultado esperado', 3000),
        actualBehavior: text(input.actualBehavior, 'el resultado actual', 3000),
        pageUrl: cleanPageUrl(input.pageUrl), author: actor(user), status: 'new',
        attachments: files.map(inspectAttachment), comments: [], emailNotification: prepareIssueReportEmailNotification()
    });
    // The report and its durable delivery state already exist. SMTP failure must
    // never make a successful report submission look unsuccessful to its author.
    try { await deliverIssueReportEmail(idOf(report)); } catch { /* delivery remains observable in the persisted state */ }
    return getIssueReport(user, idOf(report));
}
export async function updateIssueReport(user, id, input = {}) {
    authorizeIssueReports(user);
    if (!canManageIssueReports(user)) fail('No tenés permiso para gestionar reportes.', 403);
    if (!validId(id)) fail('El identificador del reporte no es válido.');
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Revisá la actualización.');
    const update = {};
    if (input.status !== undefined) update.$set = { status: choice(input.status, ISSUE_REPORT_STATUSES, undefined, 'un estado') };
    const comment = text(input.commentText, 'la respuesta', 2000);
    if (comment) update.$push = { comments: { text: comment, author: actor(user), createdAt: new Date() } };
    if (!update.$set && !update.$push) fail('Elegí un estado o escribí una respuesta.');
    const filter = { _id: id, ...(comment ? { 'comments.99': { $exists: false } } : {}) };
    const report = await IssueReport.findOneAndUpdate(filter, update, { new: true, runValidators: true }).select('_id').lean();
    if (!report) {
        if (await IssueReport.exists({ _id: id })) fail('El reporte alcanzó el máximo de 100 respuestas.', 409);
        fail('Reporte no encontrado.', 404);
    }
    return getIssueReport(user, id);
}
export async function readIssueReportAttachment(user, id, attachmentId) {
    authorizeIssueReports(user);
    if (!validId(id) || !validId(attachmentId)) fail('El identificador de la captura no es válido.');
    const report = await IssueReport.findOne({ _id: id, ...scope(user), 'attachments._id': new mongoose.Types.ObjectId(attachmentId) })
        .select('+attachments.data');
    const file = report?.attachments?.id(attachmentId);
    if (!file?.data) fail('Captura no encontrada.', 404);
    return { buffer: file.data, name: file.name, contentType: file.contentType };
}
