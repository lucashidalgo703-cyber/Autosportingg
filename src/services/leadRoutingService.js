import connectDB from '../config/db.js';
import AdminUser from '../models/AdminUser.js';
import LeadAssignmentState from '../models/LeadAssignmentState.js';
import CrmSettings from '../models/CrmSettings.js';
import CrmTask from '../models/CrmTask.js';
import Lead from '../models/Lead.js';

const normalizeKeyPart = (value, fallback) => String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .slice(0, 64);

const getEligibleUsers = async () => {
    const sellers = await AdminUser.find({
        active: { $ne: false },
        role: 'ventas'
    }).select('_id name email role createdAt').sort({ createdAt: 1, _id: 1 }).lean();

    if (sellers.length > 0) return sellers;

    // Agencias chicas pueden operar sin un usuario con rol "ventas". En ese
    // caso evitamos perder el lead y usamos responsables administrativos.
    return AdminUser.find({
        active: { $ne: false },
        role: { $in: ['owner', 'admin'] }
    }).select('_id name email role createdAt').sort({ createdAt: 1, _id: 1 }).lean();
};

export async function getNextLeadAssignee({ source, sourceDetail }) {
    await connectDB();

    const channelSource = normalizeKeyPart(source, 'unknown');
    const settings = await CrmSettings.findOne().lean();
    const leadRouting = settings?.leadRouting || { enabled: false, rules: [] };

    let candidates = [];
    let slaMinutes = 60;
    let fallbackUsed = false;
    let rule = null;

    if (leadRouting.enabled) {
        rule = leadRouting.rules?.find(r => r.channel === channelSource) ||
               leadRouting.rules?.find(r => r.channel === 'default');

        if (rule && rule.enabled) {
            slaMinutes = rule.slaMinutes || 60;
            
            if (rule.participants && rule.participants.length > 0) {
                const activeParticipantIds = rule.participants.filter(id => 
                    !rule.pausedParticipants?.some(pId => pId.toString() === id.toString())
                );

                if (activeParticipantIds.length > 0) {
                    candidates = await AdminUser.find({
                        _id: { $in: activeParticipantIds },
                        active: { $ne: false }
                    }).select('_id name email role createdAt').sort({ _id: 1 }).lean();
                }
            }

            if (candidates.length === 0 && rule.fallbackUser) {
                const fallback = await AdminUser.findById(rule.fallbackUser).select('_id name email role createdAt').lean();
                if (fallback && fallback.active !== false) {
                    candidates = [fallback];
                    fallbackUsed = true;
                }
            }
        }
    }

    // Fallback global si no hay reglas o fallaron
    if (candidates.length === 0) {
        candidates = await getEligibleUsers();
        fallbackUsed = true;
    }

    if (candidates.length === 0) {
        // Alerta crítica: No hay nadie a quien asignar
        console.error(`[LeadRouting] Falla crítica de enrutamiento para canal ${channelSource}. No hay responsables.`);
        try {
            const adminUser = await AdminUser.findOne({ role: 'owner', active: true });
            if (adminUser) {
                await CrmTask.create({
                    title: `Falla de enrutamiento de Lead - ${channelSource}`,
                    description: `No se pudo asignar un responsable al lead del canal ${source}. Verifica la configuración de asignación.`,
                    type: 'lead',
                    priority: 'alta',
                    dueDate: new Date(),
                    assignedTo: adminUser._id,
                    source: 'leads',
                    user: 'Sistema'
                });
            }
        } catch (e) {
            console.error("No se pudo crear alerta de falla de enrutamiento", e);
        }
        return null;
    }

    // Incremento atómico para la secuencia
    const channelKey = `${channelSource}:${normalizeKeyPart(sourceDetail, 'unknown')}`;
    const state = await LeadAssignmentState.findOneAndUpdate(
        { channelKey },
        {
            $inc: { sequence: 1 },
            $setOnInsert: { channelKey }
        },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
    ).lean();

    const sequence = Math.max(1, Number(state?.sequence || 1));
    const user = candidates[(sequence - 1) % candidates.length];
    const assignedAt = new Date();

    await LeadAssignmentState.updateOne(
        { channelKey },
        {
            $set: {
                lastAssignedTo: user._id,
                lastAssignedAt: assignedAt
            }
        }
    );

    return { user, channelKey, sequence, assignedAt, slaMinutes, fallbackUsed };
}

export async function checkLeadSLA() {
    await connectDB();
    const settings = await CrmSettings.findOne().lean();
    if (!settings?.leadRouting?.enabled) return { status: 'disabled', count: 0 };

    let alertsGenerated = 0;
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const leads = await Lead.find({
        createdAt: { $gte: twoDaysAgo },
        slaAlertGenerated: { $ne: true },
        assignedTo: { $ne: null }
    });

    for (const lead of leads) {
        if (!lead.assignedAt) continue;
        
        const channelSource = lead.source || 'unknown';
        const rule = settings.leadRouting.rules?.find(r => r.channel === channelSource) ||
                     settings.leadRouting.rules?.find(r => r.channel === 'default');
        
        const slaMinutes = (rule && rule.enabled && typeof rule.slaMinutes === 'number') ? rule.slaMinutes : 60;
        const limitTime = new Date(lead.assignedAt.getTime() + slaMinutes * 60000);
        
        // Asumimos que si crmStatus es distinto de 'nuevo' o lastActivityAt es mayor a assignedAt + margen, ya fue atendido
        const wasAttended = lead.crmStatus !== 'nuevo' || (lead.lastActivityAt && lead.lastActivityAt.getTime() > lead.assignedAt.getTime() + 1000);

        if (Date.now() > limitTime.getTime() && !wasAttended) {
            await CrmTask.create({
                title: `SLA Vencido: Lead de ${lead.name}`,
                description: `El lead ingresó por ${channelSource} y no ha recibido atención en ${slaMinutes} min.`,
                type: 'lead',
                priority: 'alta',
                dueDate: new Date(),
                assignedTo: lead.assignedTo,
                leadId: lead._id,
                source: 'leads',
                user: 'Sistema'
            });
            lead.slaAlertGenerated = true;
            await lead.save();
            alertsGenerated++;
        }
    }

    return { status: 'success', alertsGenerated };
}
