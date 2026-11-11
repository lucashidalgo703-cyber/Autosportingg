import {clientCalendarKey, clientTodayKey, getClientPipelineStage} from './clientCommercial.js';
import {saleCalendarKey} from './saleCalendarDate.js';
export {vehicleDraftIdentity as clientDraftIdentity} from './vehicleFormDraft.js';

const PREFIX='autosporting_client_form_v1_';
export const CLIENT_DRAFT_MAX_AGE=7*24*60*60*1000;
const DRAFT_FIELDS=new Set(['fullName','firstName','lastName','phone','email','locality','province','address','type','status','source','reason','assignedTo','autoAssign','pipelineStage','description','vehicleOfInterest','interestedVehicleId','brand','model','currency','maxBudget','yearFrom','yearTo','nextAction','nextActionDate','lastContactDate','createdAt','notes','segment','gender','birthDate','occupation','purchaseMethod','purchaseTiming','availableDownPayment','downPaymentCurrency','tradeInIntent']);
export function clientToForm(client=null,now=new Date()) {
    return {
        fullName:client?.fullName || [client?.firstName,client?.lastName].filter(Boolean).join(' '), firstName:client?.firstName || '',lastName:client?.lastName || '',
        phone:client?.phone || '',email:client?.email || '',dniCuit:client?.dniCuit || '',
        locality:client?.locality || '',province:client?.province || '',address:client?.address || '',
        type:client?.type || 'potencial',source:client?.source || 'otro',status:client?.status || 'activo',reason:client?.reason || 'lead_digital',
        assignedTo:client?.assignedTo?._id || client?.assignedTo || '',autoAssign:false,
        pipelineStage:getClientPipelineStage(client),description:client?.description || '',vehicleOfInterest:client?.vehicleOfInterest || '',
        interestedVehicleId:client?.interestedVehicleId?._id || client?.interestedVehicleId || '',brand:client?.brand || '',model:client?.model || '',
        currency:client?.currency || 'USD',maxBudget:client?.maxBudget ?? '',yearFrom:client?.yearFrom ?? '',yearTo:client?.yearTo ?? '',
        nextAction:client?.nextAction || '',nextActionDate:clientCalendarKey(client?.nextActionDate),lastContactDate:clientCalendarKey(client?.lastContactDate),
        createdAt:client?.createdAt ? saleCalendarKey({createdAt:client.createdAt}) : clientTodayKey(now),notes:client?.notes || '',
        segment:client?.segment || 'regular',gender:client?.gender || '',birthDate:clientCalendarKey(client?.birthDate),occupation:client?.occupation || '',
        purchaseMethod:client?.purchaseMethod || '',purchaseTiming:client?.purchaseTiming || '',availableDownPayment:client?.availableDownPayment ?? '',downPaymentCurrency:client?.downPaymentCurrency || 'USD',tradeInIntent:client?.tradeInIntent || ''
    };
}
export function buildClientFormPayload(form,client=null) {
    const payload={...form,fullName:String(form.fullName || '').trim()};
    if (!payload.fullName) throw Object.assign(new Error('El nombre es obligatorio.'),{errors:{fullName:'El nombre es obligatorio.'}});
    const originalName=client?.fullName || [client?.firstName,client?.lastName].filter(Boolean).join(' ');
    if (client && payload.fullName === originalName) {payload.firstName=client.firstName || payload.fullName;payload.lastName=client.lastName || '';}
    else { const [first,...last]=payload.fullName.split(/\s+/);payload.firstName=first;payload.lastName=last.join(' '); }
    for(const key of ['maxBudget','yearFrom','yearTo','availableDownPayment']) {
        const raw=form[key];
        payload[key]=raw === '' || raw === null || raw === undefined ? null : Number(raw);
        if(payload[key] !== null && (!Number.isFinite(payload[key]) || payload[key] < 0)) throw Object.assign(new Error('Revisá los importes y años.'),{errors:{[key]:'Ingresá un número válido mayor o igual a cero.'}});
    }
    if(payload.availableDownPayment === null) payload.downPaymentCurrency=null;
    payload.autoAssign=!client && Boolean(form.autoAssign) && !form.assignedTo;
    if(!client && form.reason === 'entro_puerta') payload.source='local';
    if(client && form.createdAt === saleCalendarKey({createdAt:client.createdAt})) delete payload.createdAt;
    return payload;
}
function draftValues(values) {
    const filtered={};
    for(const [key,value]of Object.entries(values || {})) {
        if(!DRAFT_FIELDS.has(key) || key === 'autoAssign')continue;
        if(typeof value === 'string') filtered[key]=value.slice(0,key === 'notes' ? 20000 : 5000);
        else if(typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) filtered[key]=value;
    }
    return filtered;
}
export function readClientDraft(storage,userId,now=Date.now()) {
    if(!storage || !userId)return null;
    try {const draft=JSON.parse(storage.getItem(PREFIX+encodeURIComponent(userId)));if(!draft || draft.version !== 1 || draft.userId !== userId || !Number.isFinite(draft.savedAt) || draft.savedAt > now || now-draft.savedAt > CLIENT_DRAFT_MAX_AGE)return null;return {savedAt:draft.savedAt,values:draftValues(draft.values)};}catch{return null;}
}
export function writeClientDraft(storage,userId,values,now=Date.now()) {
    if(!storage || !userId)return false;
    try{storage.setItem(PREFIX+encodeURIComponent(userId),JSON.stringify({version:1,userId,savedAt:now,values:draftValues(values)}));return true;}catch{return false;}
}
export function clearClientDraft(storage,userId) {if(!storage || !userId)return;try{storage.removeItem(PREFIX+encodeURIComponent(userId));}catch{}}

// The assistant proposes only explicitly labelled text. It never invents contact
// details, deadlines, money amounts or a person's name from an unlabelled sentence.
export function prepareClientText(text) {
    const value=String(text || '').trim().slice(0,10000);
    if(!value)return {};
    const proposals={};
    const aliases={nombre:'fullName','nombre completo':'fullName',telefono:'phone','teléfono':'phone',tel:'phone',email:'email',correo:'email',busco:'description',busca:'description',interes:'description','interés':'description','proxima accion':'nextAction','próxima acción':'nextAction','proximo paso':'nextAction','próximo paso':'nextAction'};
    for(const line of value.split(/[\n;]+/)) {const match=/^\s*([^:]{2,35}):\s*(.+)$/.exec(line);if(!match)continue;const key=aliases[match[1].trim().toLowerCase()];if(key)proposals[key]=match[2].trim();}
    return Object.keys(proposals).length ? proposals : {description:value};
}
