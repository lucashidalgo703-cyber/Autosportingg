import mongoose from 'mongoose';
import Client from '../models/Client.js';
import Lead from '../models/Lead.js';
import { normalizePhoneToWhatsApp } from '../utils/phoneNormalizer.js';

export async function isClientContactBlocked({ clientId, leadId, to, channel }) {
    const conditions = [];
    if (mongoose.isValidObjectId(clientId)) conditions.push({ _id: clientId });
    if (mongoose.isValidObjectId(leadId)) {
        const lead = await Lead.findById(leadId).select('clientId phone email').lean();
        if (lead?.clientId) conditions.push({ _id: lead.clientId });
        if (lead?.phone) {
            const phone = normalizePhoneToWhatsApp(lead.phone).replace(/\D/g, '');
            if (phone) conditions.push({ phoneNormalized: phone });
        }
        if (lead?.email) conditions.push({ emailNormalized: lead.email.trim().toLowerCase() });
    }
    const emailRecipients = (value, depth = 0) => {
        if (depth > 5) throw Object.assign(new Error('El formato de destinatarios del correo no es válido.'), { code: 'CONTACT_RECIPIENT_INVALID', statusCode: 400, deliveryUncertain: false });
        return Array.isArray(value) ? value.flatMap(item => emailRecipients(item, depth + 1)) : value && typeof value === 'object' ? emailRecipients(value.address || value.group, depth + 1) : typeof value === 'string' ? value.split(/[,;]/) : [];
    };
    const recipients = channel === 'email' ? emailRecipients(to) : Array.isArray(to) ? to : [to];
    for (const recipient of recipients) {
        if (typeof recipient !== 'string') continue;
        if (channel === 'email') {
            const email = (/<([^<>]+)>/.exec(recipient)?.[1] || recipient).trim().toLowerCase();
            if (email) conditions.push({ emailNormalized: email }, { email });
        }
        else {
            const digits = recipient.replace(/\D/g, '');
            const normalized = normalizePhoneToWhatsApp(recipient).replace(/\D/g, '');
            if (digits) conditions.push({ phoneNormalized: { $in: [...new Set([digits, normalized])] } }, { phone: { $in: [...new Set([digits, normalized])] } });
        }
    }
    return conditions.length ? Boolean(await Client.exists({ doNotContact: true, $or: conditions })) : false;
}

export async function assertClientContactAllowed(context) {
    if (await isClientContactBlocked(context)) throw Object.assign(new Error('Este cliente pidió no recibir contactos. No se enviará el mensaje.'), { code: 'CLIENT_DO_NOT_CONTACT', statusCode: 409, deliveryUncertain: false });
}
