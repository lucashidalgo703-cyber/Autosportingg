import {formSaleDate,saleCalendarKey} from './saleCalendarDate.js';

export const EXPEDIENTE_STATUSES=[
    {value:'en_proceso',label:'En proceso'},
    {value:'documentacion_completa',label:'Documentación completa'},
    {value:'transferido',label:'Transferido'},
    {value:'entregado',label:'Entregado'}
];
export const DOC_STATUS_OPTIONS=[
    {value:'pendiente',label:'Pendiente'},
    {value:'recibido',label:'Recibido'},
    {value:'no_aplica',label:'No aplica'},
    {value:'agencia',label:'Lo saca la agencia'}
];
export const EXPEDIENTE_DOCUMENT_CATALOGUE={
    seller:[
        {key:'dni_front',label:'DNI Frente'},
        {key:'dni_back',label:'DNI Dorso'},
        {key:'vehicle_title',label:'Título del automotor'},
        {key:'vehicle_card_front',label:'Cédula verde frente'},
        {key:'vehicle_card_back',label:'Cédula verde dorso'},
        {key:'signed_08',label:'08 firmado'},
        {key:'police_verification',label:'Verificación policial',validityDays:180},
        {key:'historical_domain',label:'Informe histórico de dominio',validityDays:30},
        {key:'patent_debt_clearance',label:'Libre deuda de patentes',validityDays:30},
        {key:'fine_debt_clearance',label:'Libre deuda de multas',validityDays:30},
        {key:'lien_cancellation',label:'Cancelación de prenda'}
    ],
    buyer:[
        {key:'dni_front',label:'DNI Frente'},
        {key:'dni_back',label:'DNI Dorso'},
        {key:'address',label:'Domicilio'},
        {key:'agreement_receipt',label:'Boleto / recibo'}
    ],
    procedure:[
        {key:'transferred_title',label:'Título transferido',required:false},
        {key:'registry_fee',label:'Arancel del registro',required:false},
        {key:'registration_deposit',label:'Comprobante de depósito al registro',required:false},
        {key:'owner_transfer',label:'Comprobante de transferencia al propietario',required:false}
    ]
};
export const EXPEDIENTE_PRIORITIES=[{value:'high',label:'Alta'},{value:'medium',label:'Media'},{value:'low',label:'Baja'}];
export const EXPEDIENTE_MILESTONES=['sellerDocsSigned','duplicateDelivered','procedureComplete','papersDelivered'];
export const EXPEDIENTE_PARTIES=['seller','buyer','procedure'];
export const EXPEDIENTE_SORT_FIELDS=['openedAt','vehicle','buyer','seller','status','dueDate'];
export class ExpedienteError extends Error{constructor(message,statusCode=400,code='EXPEDIENTE_INVALID',errors){super(message);this.statusCode=statusCode;this.code=code;this.errors=errors;}}
export const expedienteDay=value=>formSaleDate(value)||null;
export function expedienteToday(now=new Date()){return saleCalendarKey({createdAt:now});}
export function addExpedienteDays(day,amount){if(!expedienteDay(day))return null;const d=new Date(day+'T00:00:00.000Z');d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);}
export function expedientePresentationStatus(sale){const raw=sale?.expedienteStatus;return ['entregado','finalizado'].includes(raw)?'entregado':raw==='transferido'?'transferido':raw==='listo'?'documentacion_completa':'en_proceso';}
export function expedienteIsOperational(sale){return Boolean(sale&&!sale.historicalOnly&&sale.status!=='borrador'&&sale.status!=='cancelada');}
export function expedienteDocumentRows(sale,party){
    const saved=sale?.expediente?.documents?.[party]||[];
    const map=new Map(saved.map(item=>[item.key,item]));
    const defaults=(EXPEDIENTE_DOCUMENT_CATALOGUE[party]||[]).map(def=>({required:party!=='procedure',validityDays:null,...def,status:'pendiente',issueDate:null,notes:'',custom:false,...(map.get(def.key)||{})}));
    const known=new Set(defaults.map(item=>item.key));
    return [...defaults,...saved.filter(item=>!known.has(item.key)).map(item=>({required:false,validityDays:null,status:'pendiente',issueDate:null,notes:'',custom:true,...item}))].map(item=>({...item,issueDate:expedienteDay(item.issueDate),dueDate:item.validityDays&&expedienteDay(item.issueDate)?addExpedienteDays(expedienteDay(item.issueDate),item.validityDays):null}));
}
export function expedienteDocumentSummary(sale,now=new Date()){
    const today=expedienteToday(now),rows=['seller','buyer'].flatMap(party=>expedienteDocumentRows(sale,party)).filter(row=>row.required);
    const pending=rows.filter(row=>!['recibido','no_aplica'].includes(row.status)||row.status==='recibido'&&row.dueDate&&row.dueDate<today);
    return {required:rows.length,received:rows.length-pending.length,pending:pending.length,expired:rows.filter(row=>row.status==='recibido'&&row.dueDate&&row.dueDate<today).length};
}
export function normalizeExpedienteQuery(query={}){
    const q={view:query.view||'activos',status:query.status||'all',search:String(query.search||'').trim(),seller:String(query.seller||''),responsible:String(query.responsible||''),due:query.due||'all',priority:query.priority==='normal'?'medium':query.priority||'all',sort:query.sort||'openedAt',direction:query.direction||'desc',page:Number(query.page||1),limit:Number(query.limit||20),exportAll:query.export==='1'};
    if(!['activos','finalizados','archivados','todos'].includes(q.view)||!['all',...EXPEDIENTE_STATUSES.map(row=>row.value)].includes(q.status)||!['all','overdue','next7'].includes(q.due)||!['all','high','medium','low'].includes(q.priority)||!EXPEDIENTE_SORT_FIELDS.includes(q.sort)||!['asc','desc'].includes(q.direction)||!Number.isInteger(q.page)||q.page<1||q.page>100000||![20,50,100].includes(q.limit)||q.search.length>300)throw new ExpedienteError('Los filtros del expediente no son válidos.');
    for(const field of ['seller','responsible'])if(q[field]&&!/^[a-f\d]{24}$/i.test(q[field])&&!(field==='responsible'&&q[field]==='unassigned'))throw new ExpedienteError('El responsable o vendedor no es válido.');
    return q;
}
