import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Car from '../models/Car.js';
import Client from '../models/Client.js';
import AdminUser from '../models/AdminUser.js';
import Gestoria from '../models/Gestoria.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import FinanceManualEntry from '../models/FinanceManualEntry.js';
import AuditLog from '../models/AuditLog.js';
import ExpedienteOperation from '../models/ExpedienteOperation.js';
import {listSaleDocuments} from './saleDocumentService.js';
import {createFinanceManualEntry,prepareFinanceManualStorage} from './financeManualService.js';
import {hasPermission,PERMISSIONS} from '../utils/adminPermissions.js';
import {computeSaleCollection} from '../utils/saleCollection.js';
import {getSaleBuyer} from '../utils/salePresentation.js';
import {roundMoney} from '../utils/saleCommercial.js';
import {stockCapitalOwnership,stockIsAgencyOwned} from '../utils/stockOwnership.js';
import {ExpedienteError,EXPEDIENTE_STATUSES,EXPEDIENTE_PARTIES,EXPEDIENTE_MILESTONES,DOC_STATUS_OPTIONS,expedienteDay,expedienteToday,addExpedienteDays,expedientePresentationStatus,expedienteDocumentRows,expedienteDocumentSummary,normalizeExpedienteQuery} from '../utils/expedienteWorkspace.js';

const fail=(message,statusCode=400,code='EXPEDIENTE_INVALID',errors)=>{throw new ExpedienteError(message,statusCode,code,errors);};
const id=value=>value?String(value._id||value):null;
const validId=value=>typeof value==='string'&&/^[a-f\d]{24}$/i.test(value);
const person=value=>value?{id:id(value),name:value.name||[value.firstName,value.lastName].filter(Boolean).join(' ')||value.username||'Sin nombre'}:null;
const nameOf=actor=>actor.username||actor.name||'Usuario';
const actorId=actor=>String(actor?.id||actor?.userId||'');
const plain=value=>value?.toObject?value.toObject():value;
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const actorCan=(actor,permission)=>hasPermission(actor,permission)||actor?.role==='admin';
export function expedienteCapabilities(actor){
    const canWrite=actorCan(actor,PERMISSIONS.VENTAS_WRITE),canReadDocuments=actorCan(actor,PERMISSIONS.DOCUMENTACION_READ),canReadFinance=actorCan(actor,PERMISSIONS.FINANZAS_READ);
    return {canWrite,canReadDocuments,canWriteDocuments:canWrite&&canReadDocuments&&actorCan(actor,PERMISSIONS.DOCUMENTACION_WRITE),canReadFinance,canWriteFinance:canWrite&&canReadFinance&&actorCan(actor,PERMISSIONS.FINANZAS_WRITE),canArchive:canWrite&&['owner','admin'].includes(actor?.role),canOverrideConfirmation:canWrite&&['owner','admin'].includes(actor?.role)};
}
const assertCapability=(actor,key)=>{if(!expedienteCapabilities(actor)[key])fail('No tenés permiso para esta acción.',403,'EXPEDIENTE_FORBIDDEN');};
function text(value,field,max=500,required=false){if(value===null||value===undefined)value='';if(typeof value!=='string'||value.trim().length>max||required&&!value.trim())fail('Revisá '+field+'.',400,'EXPEDIENTE_INVALID',{[field]:'El texto no es válido.'});return value.trim();}
function date(value,field,required=false){if(value===null||value==='')return required?fail('Completá '+field+'.'):null;const day=expedienteDay(value);if(!day)fail('La fecha no es válida.',400,'EXPEDIENTE_INVALID',{[field]:'Ingresá una fecha válida.'});return day;}
function money(value,field){if(typeof value==='boolean'||value===''||value===null||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>1e12)fail('El importe no es válido.',400,'EXPEDIENTE_INVALID',{[field]:'Usá un importe no negativo.'});return roundMoney(Number(value));}
function currency(value){if(!['ARS','USD'].includes(value))fail('Elegí ARS o USD.');return value;}
const finiteCurrency=value=>['USD','U$S','US$'].includes(value)?'USD':['ARS','$'].includes(value)?'ARS':null;
const allowed=(payload,fields)=>{const extra=Object.keys(payload||{}).filter(key=>!['expectedVersion','idempotencyKey',...fields].includes(key));if(extra.length)fail('El formulario incluye campos no admitidos.',400,'EXPEDIENTE_FIELDS_INVALID');};
async function activeUser(value,session,field='responsibleId'){if(value===null||value==='')return null;if(!validId(value)||!await AdminUser.exists({_id:value,active:true}).session(session))fail('Elegí un responsable activo.',400,'EXPEDIENTE_INVALID',{[field]:'El responsable no está disponible.'});return value;}
function initialized(sale){if(!sale.expediente)sale.expediente={};return sale.expediente;}
function populate(query){return query.populate({path:'clientId',select:'fullName firstName lastName phone email dniCuit birthDate occupation'}).populate({path:'vehicleId',select:'brand name model year plateOrVin km color engineNumber chassisNumber vehicleType ownerName ownerPhone ownerEmail purchasePrice purchaseCurrency agencyOwned investor consignedBy tradeInOrigin'}).populate({path:'assignedTo',select:'name username'}).populate({path:'consignationOwnerId',select:'name username'}).populate({path:'expedienteResponsible',select:'name username'});}
function partyDto(sale,party){
    const saved=sale.expediente?.parties?.[party]||{},buyer=getSaleBuyer(sale),car=sale.vehicleId||{},client=sale.clientId||{};
    const fallback=party==='buyer'?{fullName:buyer.name,dniCuit:buyer.dni,phone:buyer.phone,email:buyer.email,birthDate:expedienteDay(client.birthDate),occupation:client.occupation||'',clientId:id(sale.clientId)}:{fullName:sale.vehicleOwnerName||car.ownerName||'',dniCuit:'',phone:sale.vehicleOwnerPhone||car.ownerPhone||'',email:car.ownerEmail||'',birthDate:null,occupation:'',clientId:null};
    return {...fallback,...saved,clientId:id(Object.hasOwn(saved,'clientId')?saved.clientId:fallback.clientId),birthDate:expedienteDay(Object.hasOwn(saved,'birthDate')?saved.birthDate:fallback.birthDate)};
}
function confirmationDto(row){return {confirmed:Boolean(row?.confirmed),confirmedAt:row?.confirmedAt||null,confirmedBy:row?.confirmedBy||'',note:row?.note||''};}
function safeVehicle(car){if(!car||!car._id)return null;return {id:id(car),name:[car.brand,car.name||car.model].filter(Boolean).join(' '),brand:car.brand||'',model:car.name||car.model||'',plate:car.plateOrVin||'',year:car.year||null,mileage:car.km??null,color:car.color||'',engine:car.engineNumber||'',chassis:car.chassisNumber||'',type:car.vehicleType||''};}
function expenseTotals(expenses){const totals={seller:{ARS:{declared:0,pending:0,retained:0,paid:0},USD:{declared:0,pending:0,retained:0,paid:0}},buyer:{ARS:{declared:0,pending:0,retained:0,paid:0},USD:{declared:0,pending:0,retained:0,paid:0}}};for(const party of ['seller','buyer'])for(const row of expenses[party]||[]){if(!totals[party][row.currency])continue;const target=totals[party][row.currency];target.declared=roundMoney(target.declared+row.amount);target[row.status]=roundMoney(target[row.status]+row.amount);}return totals;}
function expenseRows(sale,transactions,files=[]){const byId=new Map(transactions.map(row=>[id(row),row]));return Object.fromEntries(['seller','buyer'].map(party=>[party,(sale.expediente?.expenses?.[party]||[]).filter(row=>!row.deletedAt).map(row=>{const linked=byId.get(id(row.transactionId)),paid=linked?.status==='activo';return {...row,id:id(row),_id:id(row),accountId:id(row.accountId),financeManualEntryId:id(row.financeManualEntryId),transactionId:id(row.transactionId),status:paid?'paid':row.status||'pending',paymentVoided:Boolean(row.transactionId&&!paid),files:files.filter(file=>file.party===party&&['expense_'+row._id,'expense_'+party+'_'+row._id].includes(file.documentKey)&&!file.deletedAt)};})]));}
function financeDto(sale,transactions,expenses){const collection=computeSaleCollection(sale,transactions),totals=expenseTotals(expenses),car=sale.vehicleId||{},own=stockCapitalOwnership(car),rawCost=car.purchasePrice,costCurrency=finiteCurrency(car.purchaseCurrency);return {...collection,collection,currency:sale.saleCurrency,salePrice:sale.salePrice,paymentMethod:sale.paymentMethod,financingDetails:sale.financingDetails||null,expenses:{ARS:roundMoney(totals.seller.ARS.declared+totals.buyer.ARS.declared),USD:roundMoney(totals.seller.USD.declared+totals.buyer.USD.declared)},expensesByParty:totals,acquisitionCost:{amount:Number.isFinite(rawCost)?rawCost:null,currency:costCurrency,known:Number.isFinite(rawCost)&&Boolean(costCurrency),agencyOwned:stockIsAgencyOwned(car),ownPercentage:own.ownPct,ownerName:sale.vehicleOwnerName||car.ownerName||''}};}
function summaryDto(sale,capabilities,transactions=[],now=new Date()){
    const sellerParty=partyDto(sale,'seller'),buyerParty=partyDto(sale,'buyer'),status=expedientePresentationStatus(sale),docSummary=expedienteDocumentSummary(sale,now),today=expedienteToday(now),dueDate=expedienteDay(sale.expedienteDueDate),confirmations={buyer:confirmationDto(sale.expediente?.confirmations?.buyer),consignment:confirmationDto(sale.expediente?.confirmations?.consignment)};
    const issues=[];if(sale.expedienteStatus==='observado')issues.push({code:'observed',label:'Observado'});if(dueDate&&dueDate<today&&status!=='entregado')issues.push({code:'overdue',label:'Vencido'});if(docSummary.pending)issues.push({code:'pending_documents',label:'Documentación pendiente'});if(!confirmations.buyer.confirmed||(sale.consignationOwnerId||stockCapitalOwnership(sale.vehicleId).isConsignment)&&!confirmations.consignment.confirmed)issues.push({code:'pending_confirmation',label:'Confirmación pendiente'});
    return {id:id(sale),saleId:id(sale),version:sale.__v||0,status,rawStatus:sale.expedienteStatus||'en_proceso',saleStatus:sale.status,title:sale.expediente?.title||[safeVehicle(sale.vehicleId)?.name,buyerParty.fullName].filter(Boolean).join(' · ')||'Expediente',openedAt:sale.expediente?.openedAt||expedienteDay(sale.saleDate)||expedienteDay(sale.createdAt),dueDate,priority:sale.expediente?.priority||'medium',responsible:person(sale.expedienteResponsible),salesperson:person(sale.assignedTo)||(sale.salesperson?{id:null,name:sale.salesperson}:null),consignationSeller:person(sale.consignationOwnerId),vehicle:safeVehicle(sale.vehicleId),buyer:{name:buyerParty.fullName,phone:buyerParty.phone,email:buyerParty.email,dni:buyerParty.dniCuit},seller:{name:sellerParty.fullName,phone:sellerParty.phone,email:sellerParty.email,dni:sellerParty.dniCuit},confirmations,docSummary,issues,archivedAt:sale.expediente?.archivedAt||null,finance:capabilities.canReadFinance?financeDto(sale,transactions,expenseRows(sale,transactions)):null};
}
export async function listExpedientes(rawQuery,actor){
    const q=normalizeExpedienteQuery(rawQuery),capabilities=expedienteCapabilities(actor),now=new Date(),today=expedienteToday(now);
    const sales=await populate(Sale.find({historicalOnly:{$ne:true},status:{$nin:['borrador','cancelada']}})).lean();
    const users=await AdminUser.find({active:true}).select('_id name username').lean();
    const transactions=capabilities.canReadFinance?await Transaction.find({saleId:{$in:sales.map(row=>row._id)}}).select('_id saleId status currency amount type source category concept description financeManualEntryId').lean():[];
    const txBySale=new Map();for(const tx of transactions){const key=id(tx.saleId);if(!txBySale.has(key))txBySale.set(key,[]);txBySale.get(key).push(tx);}
    const rows=sales.map(sale=>summaryDto(sale,capabilities,txBySale.get(id(sale))||[],now));
    const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const match=(row,{view=q.view,status=q.status,responsible=q.responsible}={})=>{
        if(view==='activos'&&(row.archivedAt||row.status==='entregado')||view==='finalizados'&&(row.archivedAt||row.status!=='entregado')||view==='archivados'&&!row.archivedAt)return false;
        if(status!=='all'&&row.status!==status)return false;
        if(q.search&&!norm([row.id,row.title,row.vehicle?.name,row.vehicle?.plate,row.buyer.name,row.buyer.phone,row.buyer.dni,row.seller.name,row.salesperson?.name,row.responsible?.name].join(' ')).includes(norm(q.search)))return false;
        if(q.seller&&row.salesperson?.id!==q.seller)return false;
        if(responsible&&(responsible==='unassigned'?Boolean(row.responsible?.id):row.responsible?.id!==responsible))return false;
        if(q.priority!=='all'&&row.priority!==q.priority)return false;
        if(q.due==='overdue'&&(!row.dueDate||row.dueDate>=today)||q.due==='next7'&&(!row.dueDate||row.dueDate<today||row.dueDate>addExpedienteDays(today,6)))return false;
        return true;
    };
    const facet=rows.filter(row=>match(row,{view:'todos',status:'all',responsible:''}));
    const counts={active:facet.filter(row=>!row.archivedAt&&row.status!=='entregado').length,finalized:facet.filter(row=>!row.archivedAt&&row.status==='entregado').length,archived:facet.filter(row=>row.archivedAt).length,overdue:facet.filter(row=>!row.archivedAt&&row.status!=='entregado'&&row.dueDate&&row.dueDate<today).length};
    const responsibleBase=rows.filter(row=>match(row,{responsible:''})),statusBase=rows.filter(row=>match(row,{status:'all'}));
    const makeOptions=(field,includeUnassigned=false)=>{const options=new Map(users.map(user=>[id(user),{value:id(user),label:person(user).name,count:0}]));for(const row of rows){const user=row[field];if(user?.id&&!options.has(user.id))options.set(user.id,{value:user.id,label:user.name,count:0});}const base=field==='responsible'?responsibleBase:rows;for(const row of base){const key=row[field]?.id;if(key&&options.has(key))options.get(key).count++;}return [...(includeUnassigned?[{value:'unassigned',label:'Sin asignar',count:responsibleBase.filter(row=>!row.responsible?.id).length}]:[]),...options.values()];};
    const statusCounts=Object.fromEntries(EXPEDIENTE_STATUSES.map(status=>[status.value,statusBase.filter(row=>row.status===status.value).length]));
    const filtered=rows.filter(row=>match(row)),direction=q.direction==='asc'?1:-1,value=row=>q.sort==='vehicle'?row.vehicle?.name:q.sort==='buyer'?row.buyer.name:q.sort==='seller'?row.seller.name:q.sort==='status'?row.status:q.sort==='dueDate'?row.dueDate:row.openedAt;
    filtered.sort((a,b)=>{const first=value(a)||'',second=value(b)||'';return String(first).localeCompare(String(second),'es',{numeric:true})*direction||a.id.localeCompare(b.id);});
    const total=filtered.length,pages=Math.max(1,Math.ceil(total/q.limit)),page=Math.min(q.page,pages);
    return {items:q.exportAll?filtered:filtered.slice((page-1)*q.limit,page*q.limit),total,page:q.exportAll?1:page,pages:q.exportAll?1:pages,limit:q.exportAll?total:q.limit,counts,statusCounts,sellerOptions:makeOptions('salesperson'),responsibleOptions:makeOptions('responsible',true),capabilities,generatedAt:now.toISOString()};
}
export async function getExpediente(saleId,actor){
    if(!validId(saleId))fail('El expediente no es válido.');
    const sale=await populate(Sale.findById(saleId)).lean();if(!sale||sale.historicalOnly||sale.status==='borrador')fail('El expediente no existe.',404,'EXPEDIENTE_NOT_FOUND');
    const capabilities=expedienteCapabilities(actor),summary=summaryDto(sale,capabilities),metadata=sale.expediente||{};
    const files=capabilities.canReadDocuments?(await listSaleDocuments(saleId,actor)).documents:[];
    const transactions=capabilities.canReadFinance?await Transaction.find({saleId}).select('_id saleId status currency amount type source category concept description financeManualEntryId').lean():[];
    const expenses=capabilities.canReadFinance?expenseRows(sale,transactions,files):{seller:[],buyer:[]};
    const milestones=Object.fromEntries(EXPEDIENTE_MILESTONES.map(key=>[key,key==='papersDelivered'?summary.status==='entregado':Boolean(metadata.milestones?.[key])]));
    const users=await AdminUser.find({active:true}).select('_id name username').lean();
    const gestorias=actorCan(actor,PERMISSIONS.GESTORIA_READ)?await Gestoria.find({$or:[{saleId:sale._id},...(metadata.linkedGestoriaId?[{_id:metadata.linkedGestoriaId}]:[])]}).select('_id title type status saleId vehicleId').lean():[];
    const documents=Object.fromEntries(EXPEDIENTE_PARTIES.map(party=>[party,expedienteDocumentRows(sale,party).map(row=>({...row,files:files.filter(file=>file.slot==='expediente_document'&&file.party===party&&file.documentKey===row.key&&!file.deletedAt)}))]));
    return {...summary,parties:{seller:partyDto(sale,'seller'),buyer:partyDto(sale,'buyer')},documents,linkedGestoriaId:id(metadata.linkedGestoriaId),externalGestor:{name:metadata.externalGestor?.name||'',phone:metadata.externalGestor?.phone||''},administration:{registrationAccounts:capabilities.canReadFinance?(metadata.registrationAccounts||[]).map(row=>({...row,id:id(row),files:files.filter(file=>file.documentKey==='registration_account_'+row._id&&!file.deletedAt)})):[],registrationDeposit:capabilities.canReadFinance?{amount:metadata.registrationDeposit?.amount??0,currency:metadata.registrationDeposit?.currency||'ARS',notes:metadata.registrationDeposit?.notes||'',files:files.filter(file=>file.documentKey==='registration_deposit'&&!file.deletedAt)}:null,milestones,refundDeclared:Boolean(metadata.refundDeclared)},expenses,tasks:(metadata.tasks||[]).filter(row=>!row.deletedAt).map(row=>({...row,id:id(row),responsibleId:id(row.responsibleId)})),generalNotes:(metadata.generalNotes||[]).map(row=>({...row,id:id(row)})),managementNotes:(sale.managementNotes||[]).filter(row=>row.recipient!=='finanzas'||capabilities.canReadFinance),auditLog:(sale.saleAuditLog||[]).filter(row=>row.action?.startsWith('EXPEDIENTE_')),responsibleOptions:users.map(user=>({value:id(user),label:person(user).name})),gestoriaOptions:gestorias.map(row=>({value:id(row),label:[row.title,row.type,row.status].filter(Boolean).join(' · ')})),capabilities,finance:capabilities.canReadFinance?financeDto(sale,transactions,expenses):null,tradeIns:(sale.tradeIns||[]).map(row=>({id:id(row),stockCarId:id(row.linkedStockCarId),brand:row.brand,model:row.model,year:row.year,plate:row.plate,mileage:row.mileage,value:row.estimatedValue,currency:row.currency,documentationStatus:row.documentationStatus,transferStatus:row.transferStatus}))};
}

async function mutation(saleId,payload,actor,action,update,{capability='canWrite',idempotent=false,allowArchived=false}={}){
    assertCapability(actor,capability);if(!validId(saleId))fail('El expediente no es válido.');if(!Number.isInteger(payload?.expectedVersion)||payload.expectedVersion<0)fail('Actualizá el expediente antes de guardar.',409,'EXPEDIENTE_VERSION_REQUIRED');
    const key=payload.idempotencyKey||null;if(idempotent&&!key||key&&(typeof key!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(key)))fail('La identificación de la operación no es válida.');
    const digest=hash({action,payload}),receipt=key?{saleId,actorId:actorId(actor),key}:null;if(!actorId(actor))fail('La sesión no es válida.',401);
    await ExpedienteOperation.createCollection().catch(error=>{if(error.code!==48)throw error;});await ExpedienteOperation.init();
    for(let attempt=0;attempt<3;attempt++){
        const session=await mongoose.startSession();let replayed=false;
        try{await session.withTransaction(async()=>{
            if(receipt){const previous=await ExpedienteOperation.findOne(receipt).session(session).lean();if(previous){if(previous.digest!==digest)fail('Esta identificación ya se utilizó con otros datos.',409,'EXPEDIENTE_OPERATION_CONFLICT');replayed=true;return;}}
            const sale=await Sale.findById(saleId).session(session);if(!sale||sale.historicalOnly||sale.status==='borrador')fail('El expediente no existe.',404,'EXPEDIENTE_NOT_FOUND');
            if(!allowArchived&&(sale.status==='cancelada'||sale.expediente?.archivedAt))fail('Este expediente no admite cambios. Conserva su historial.',409,'EXPEDIENTE_READ_ONLY');
            if((sale.__v||0)!==payload.expectedVersion)fail('El expediente cambió. Actualizalo antes de guardar.',409,'EXPEDIENTE_CHANGED');
            initialized(sale);await update(sale,session);sale.updatedBy=nameOf(actor);
            sale.saleAuditLog.push({action:'EXPEDIENTE_'+action,details:'Gestión de expediente. '+(typeof payload.reason==='string'?payload.reason.trim():''),user:nameOf(actor),source:'CRM_V2'});
            sale.$where={__v:payload.expectedVersion};sale.increment();await sale.save({session});
            await AuditLog.create([{userId:actorId(actor),userName:nameOf(actor),userRole:actor.role,action:'EXPEDIENTE_'+action,module:'expedientes',entityType:'Sale',entityId:saleId,description:action==='GASTO_PAGADO'?'Egreso real registrado mediante el servicio financiero canónico y vinculado al gasto del expediente.':'Datos administrativos del expediente actualizados. Sin movimiento de caja.',metadata:{changedFields:Object.keys(payload).filter(field=>!['expectedVersion','idempotencyKey'].includes(field))}}],{session});
            if(receipt)await ExpedienteOperation.create([{...receipt,digest,action}],{session});
        });return {...await getExpediente(saleId,actor),replayed};}
        catch(error){if(error.code===11000&&receipt&&attempt<2)continue;if(['DocumentNotFoundError','VersionError'].includes(error.name))fail('El expediente cambió. Actualizalo antes de guardar.',409,'EXPEDIENTE_CHANGED');throw error;}
        finally{await session.endSession();}
    }
}

export async function updateExpediente(saleId,payload,actor){
    allowed(payload,['title','openedAt','dueDate','priority','responsibleId','linkedGestoriaId','externalGestor','administration']);
    return mutation(saleId,payload,actor,'RESUMEN_EDITADO',async(sale,session)=>{
        const exp=initialized(sale);
        if(Object.hasOwn(payload,'title'))exp.title=text(payload.title,'title',300);
        if(Object.hasOwn(payload,'openedAt'))exp.openedAt=date(payload.openedAt,'openedAt',true);
        if(Object.hasOwn(payload,'dueDate')){const day=date(payload.dueDate,'dueDate');sale.expedienteDueDate=day?new Date(day+'T00:00:00.000Z'):null;}
        if(Object.hasOwn(payload,'priority')){if(!['high','medium','low'].includes(payload.priority))fail('La prioridad no es válida.');exp.priority=payload.priority;}
        if(Object.hasOwn(payload,'responsibleId'))sale.expedienteResponsible=await activeUser(payload.responsibleId,session);
        if(Object.hasOwn(payload,'linkedGestoriaId')){
            if(!actorCan(actor,PERMISSIONS.GESTORIA_READ))fail('Necesitás permiso de Gestoría para vincular el trámite.',403);
            if(!payload.linkedGestoriaId)exp.linkedGestoriaId=null;
            else if(!validId(payload.linkedGestoriaId)||!await Gestoria.exists({_id:payload.linkedGestoriaId,saleId:sale._id}).session(session))fail('El trámite debe pertenecer a esta venta.');
            else exp.linkedGestoriaId=payload.linkedGestoriaId;
        }
        if(Object.hasOwn(payload,'externalGestor')){const value=payload.externalGestor;if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['name','phone'].includes(key)))fail('El gestor externo no es válido.');exp.externalGestor={name:text(value.name,'name',300),phone:text(value.phone,'phone',100)};}
        if(Object.hasOwn(payload,'administration'))await applyAdministration(sale,payload.administration,actor,session);
    });
}
export async function updateExpedienteParty(saleId,party,payload,actor){
    if(!['seller','buyer'].includes(party))fail('La parte no es válida.');
    allowed(payload,['fullName','dniCuit','phone','email','birthDate','occupation','clientId']);
    return mutation(saleId,payload,actor,'PARTE_'+party.toUpperCase(),async(sale,session)=>{
        const exp=initialized(sale),current=plain(exp.parties?.[party])||{},values={...current};
        for(const field of ['fullName','dniCuit','phone','email','occupation'])if(Object.hasOwn(payload,field))values[field]=text(payload[field],field,field==='email'?320:field==='fullName'?300:field==='occupation'?200:100);
        if(values.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))fail('El email no es válido.',400,'EXPEDIENTE_INVALID',{email:'Revisá el email.'});
        if(Object.hasOwn(payload,'birthDate')){values.birthDate=date(payload.birthDate,'birthDate');if(values.birthDate&&values.birthDate>expedienteToday())fail('La fecha de nacimiento no puede ser futura.');}
        if(Object.hasOwn(payload,'clientId')){
            if(!payload.clientId)values.clientId=null;
            else {if(!actorCan(actor,PERMISSIONS.CLIENTES_READ))fail('Necesitás permiso de Clientes para vincular una ficha.',403);if(!validId(payload.clientId)||!await Client.exists({_id:payload.clientId}).session(session))fail('La ficha de cliente no existe.');values.clientId=payload.clientId;}
        }else if(!values.clientId&&actorCan(actor,PERMISSIONS.CLIENTES_READ)){
            const clauses=[];if(values.dniCuit?.replace(/\D/g,'').length>=6)clauses.push({dniCuit:values.dniCuit});if(values.email)clauses.push({email:values.email.toLowerCase()});if(values.phone?.replace(/\D/g,'').length>=8)clauses.push({phone:values.phone});
            if(clauses.length){const matches=await Client.find({$or:clauses}).select('_id').limit(2).session(session).lean();if(matches.length===1)values.clientId=matches[0]._id;}
        }
        exp.set('parties.'+party,values);
    });
}
export async function updateExpedienteDocument(saleId,party,documentKey,payload,actor){
    if(!EXPEDIENTE_PARTIES.includes(party))fail('La parte documental no es válida.');allowed(payload,['status','issueDate','notes','validityDays']);
    return mutation(saleId,payload,actor,'DOCUMENTO_EDITADO',async sale=>{
        const rows=expedienteDocumentRows(sale.toObject(),party),row=rows.find(item=>item.key===documentKey);if(!row)fail('El documento no existe.',404);
        if(Object.hasOwn(payload,'status')){if(!DOC_STATUS_OPTIONS.some(option=>option.value===payload.status))fail('El estado documental no es válido.');row.status=payload.status;}
        if(Object.hasOwn(payload,'issueDate'))row.issueDate=date(payload.issueDate,'issueDate');
        if(Object.hasOwn(payload,'notes'))row.notes=text(payload.notes,'notes',5000);
        if(Object.hasOwn(payload,'validityDays')){if(payload.validityDays===null||payload.validityDays==='')row.validityDays=null;else if(!Number.isInteger(payload.validityDays)||payload.validityDays<1||payload.validityDays>3650)fail('El plazo interno no es válido.');else row.validityDays=payload.validityDays;}
        row.updatedAt=new Date();row.updatedBy=nameOf(actor);sale.expediente.set('documents.'+party,rows);
    },{capability:'canWriteDocuments'});
}
export async function addExpedienteDocument(saleId,party,payload,actor){
    if(!EXPEDIENTE_PARTIES.includes(party))fail('La parte documental no es válida.');allowed(payload,['label','required']);
    return mutation(saleId,payload,actor,'DOCUMENTO_AGREGADO',async sale=>{
        const rows=expedienteDocumentRows(sale.toObject(),party);if(rows.length>=100)fail('Esta parte admite hasta 100 documentos.');
        if(payload.required!==undefined&&typeof payload.required!=='boolean')fail('Indicá si el documento es requerido.');
        rows.push({key:'custom_'+new mongoose.Types.ObjectId(),label:text(payload.label,'label',200,true),status:'pendiente',issueDate:null,validityDays:null,required:Boolean(payload.required),custom:true,notes:'',updatedAt:new Date(),updatedBy:nameOf(actor)});
        sale.expediente.set('documents.'+party,rows);
    },{capability:'canWriteDocuments',idempotent:true});
}
async function proofGuard(sale,session){
    const SaleDocument=(await import('../models/SaleDocument.js')).default;
    const rows=await SaleDocument.find({saleId:sale._id,slot:'expediente_document',party:'procedure',documentKey:{$in:['transferred_title','registry_fee']},deletedAt:null}).select('documentKey').session(session).lean();
    if(!['transferred_title','registry_fee'].every(key=>rows.some(row=>row.documentKey===key)))fail('Adjuntá el título transferido y el comprobante del arancel del registro antes de avanzar.',409,'EXPEDIENTE_PROOFS_REQUIRED');
}
async function forwardGuard(sale,target,actor,session,overrideReason){
    if(!sale.expedienteResponsible||!await AdminUser.exists({_id:sale.expedienteResponsible,active:true}).session(session))fail('Asigná un responsable activo antes de avanzar.',409,'EXPEDIENTE_RESPONSIBLE_REQUIRED');
    if(expedienteDocumentSummary(sale.toObject()).pending)fail('Completá los documentos requeridos (Recibido o No aplica) antes de avanzar. Los plazos son de seguimiento interno.',409,'EXPEDIENTE_DOCUMENTS_PENDING');
    if(['transferido','entregado'].includes(target))await proofGuard(sale,session);
    const car=sale.vehicleId?await Car.findById(sale.vehicleId).select('agencyOwned consignedBy ownerName tradeInOrigin investor.percentage').session(session).lean():null;
    const requiresConsignment=Boolean(sale.consignationOwnerId||car&&stockCapitalOwnership(car).isConsignment);
    const pending=!sale.expediente.confirmations?.buyer?.confirmed||requiresConsignment&&!sale.expediente.confirmations?.consignment?.confirmed;
    if(pending){if(!expedienteCapabilities(actor).canOverrideConfirmation||!text(overrideReason,'overrideReason',5000))fail('Falta la confirmación manual de las partes. Un administrador puede avanzar dejando un motivo expreso.',409,'EXPEDIENTE_CONFIRMATIONS_PENDING');sale.saleAuditLog.push({action:'EXPEDIENTE_AVANCE_CON_PENDIENTES',details:text(overrideReason,'overrideReason',5000,true),user:nameOf(actor),source:'CRM_V2'});}
}
export async function changeExpedienteStatus(saleId,payload,actor){
    allowed(payload,['status','reason','overrideReason']);if(!EXPEDIENTE_STATUSES.some(row=>row.value===payload.status))fail('El estado del expediente no es válido.');
    return mutation(saleId,payload,actor,'ESTADO',async(sale,session)=>{
        const current=expedientePresentationStatus(sale),currentIndex=EXPEDIENTE_STATUSES.findIndex(row=>row.value===current),targetIndex=EXPEDIENTE_STATUSES.findIndex(row=>row.value===payload.status);
        if(targetIndex<currentIndex)text(payload.reason,'reason',5000,true);
        if(targetIndex>currentIndex+1)fail('Avanzá el expediente de a un paso para revisar cada etapa.',409,'EXPEDIENTE_STEP_REQUIRED');
        if(targetIndex>currentIndex)await forwardGuard(sale,payload.status,actor,session,payload.overrideReason);
        sale.expedienteStatus={en_proceso:'en_proceso',documentacion_completa:'listo',transferido:'transferido',entregado:'entregado'}[payload.status];
        if(payload.status==='entregado')sale.expediente.set('milestones.papersDelivered',true);
        if(current==='entregado'&&payload.status!=='entregado')sale.expediente.set('milestones.papersDelivered',false);
    },{capability:'canWriteDocuments',idempotent:true});
}
export async function confirmExpedienteParty(saleId,party,payload,actor){
    if(!['buyer','consignment'].includes(party))fail('La confirmación no es válida.');allowed(payload,['confirmed','note']);if(typeof payload.confirmed!=='boolean')fail('Indicá la confirmación recibida.');
    return mutation(saleId,payload,actor,'CONFIRMACION_'+party.toUpperCase(),async sale=>{
        const previous=plain(sale.expediente.confirmations?.[party])||{};
        const note=text(payload.note,'note',5000);if(!payload.confirmed&&!note)fail('Dejá el motivo para quitar la confirmación.');
        sale.expediente.set('confirmations.'+party,{confirmed:payload.confirmed,confirmedAt:payload.confirmed?(previous.confirmed?previous.confirmedAt:new Date()):null,confirmedBy:payload.confirmed?(previous.confirmed?previous.confirmedBy:nameOf(actor)):'',note});
    },{idempotent:true});
}
export async function appendExpedienteNote(saleId,payload,actor){
    allowed(payload,['text','recipient']);const value=text(payload.text,'text',5000,true),recipient=payload.recipient||'general';if(!['general','gestoria','finanzas'].includes(recipient))fail('El destinatario no es válido.');
    return mutation(saleId,payload,actor,'NOTA',async sale=>{
        if(recipient==='finanzas'&&!actorCan(actor,PERMISSIONS.FINANZAS_READ))fail('No tenés acceso a Finanzas.',403);
        if(recipient==='general'){if(sale.expediente.generalNotes.length>=500)fail('El expediente alcanzó el límite de notas.');sale.expediente.generalNotes.push({text:value,date:new Date(),author:nameOf(actor),authorId:actorId(actor)});}
        else sale.managementNotes.push({recipient,text:value,date:new Date(),author:nameOf(actor)});
    },{idempotent:true});
}
export async function addExpedienteTask(saleId,payload,actor){
    allowed(payload,['title','dueDate','responsibleId']);
    return mutation(saleId,payload,actor,'TAREA_AGREGADA',async(sale,session)=>{
        if(sale.expediente.tasks.filter(row=>!row.deletedAt).length>=200)fail('El expediente admite hasta 200 tareas activas.');
        sale.expediente.tasks.push({title:text(payload.title,'title',500,true),dueDate:payload.dueDate?date(payload.dueDate,'dueDate'):null,responsibleId:await activeUser(payload.responsibleId||null,session),completed:false,createdAt:new Date(),createdBy:nameOf(actor)});
    },{idempotent:true});
}
export async function updateExpedienteTask(saleId,taskId,payload,actor,deleted=false){
    allowed(payload,['title','dueDate','responsibleId','completed']);if(!validId(taskId))fail('La tarea no es válida.');
    return mutation(saleId,payload,actor,deleted?'TAREA_ARCHIVADA':'TAREA_EDITADA',async(sale,session)=>{
        const task=sale.expediente.tasks.id(taskId);if(!task||task.deletedAt)fail('La tarea no existe.',404);
        if(deleted){task.deletedAt=new Date();return;}
        if(Object.hasOwn(payload,'title'))task.title=text(payload.title,'title',500,true);
        if(Object.hasOwn(payload,'dueDate'))task.dueDate=date(payload.dueDate,'dueDate');
        if(Object.hasOwn(payload,'responsibleId'))task.responsibleId=await activeUser(payload.responsibleId,session);
        if(Object.hasOwn(payload,'completed')){if(typeof payload.completed!=='boolean')fail('El estado de la tarea no es válido.');task.completed=payload.completed;task.completedAt=payload.completed?new Date():null;task.completedBy=payload.completed?nameOf(actor):'';}
    });
}
export async function archiveExpediente(saleId,payload,actor){
    allowed(payload,['archived','reason']);if(typeof payload.archived!=='boolean')fail('Indicá si querés archivar el expediente.');text(payload.reason,'reason',5000,true);
    return mutation(saleId,payload,actor,payload.archived?'ARCHIVADO':'RESTAURADO',async sale=>{sale.expediente.archivedAt=payload.archived?new Date():null;sale.expediente.archivedBy=payload.archived?nameOf(actor):'';sale.expediente.archiveReason=payload.reason.trim();},{capability:'canArchive',idempotent:true,allowArchived:true});
}

async function applyAdministration(sale,payload,actor,session){
    if(!payload||typeof payload!=='object'||Array.isArray(payload))fail('La administración no es válida.');
    allowed(payload,['registrationAccounts','registrationDeposit','milestones','refundDeclared','overrideReason']);
    const financial=Object.hasOwn(payload,'registrationAccounts')||Object.hasOwn(payload,'registrationDeposit');
    if(financial)assertCapability(actor,'canWriteFinance');
    if(Object.hasOwn(payload,'milestones')||Object.hasOwn(payload,'refundDeclared'))assertCapability(actor,'canWriteDocuments');
        const exp=initialized(sale);
        if(Object.hasOwn(payload,'registrationAccounts')){
            if(!Array.isArray(payload.registrationAccounts)||payload.registrationAccounts.length>30)fail('Se admiten hasta 30 cuentas de registro.');
            const oldIds=new Set((exp.registrationAccounts||[]).map(row=>id(row)));
            const rows=payload.registrationAccounts.map(row=>{
                if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(key=>!['id','bank','cbuAlias','holder','amount','currency','notes'].includes(key)))fail('La cuenta de registro no es válida.');
                if(row.id&&(!validId(row.id)||!oldIds.has(row.id)))fail('La cuenta de registro no pertenece al expediente.');
                const result={_id:row.id||new mongoose.Types.ObjectId(),bank:text(row.bank,'bank',300),cbuAlias:text(row.cbuAlias,'cbuAlias',200),holder:text(row.holder,'holder',300),amount:money(row.amount??0,'amount'),currency:currency(row.currency),notes:text(row.notes,'notes',5000)};
                if(!result.bank&&!result.cbuAlias&&!result.holder)fail('Completá el banco, alias o titular de la cuenta.');return result;
            });
            const ids=rows.map(row=>String(row._id));if(new Set(ids).size!==ids.length)fail('Hay cuentas de registro repetidas.');
            const removed=[...oldIds].filter(key=>!ids.includes(key));if(removed.length){const SaleDocument=(await import('../models/SaleDocument.js')).default;if(await SaleDocument.exists({saleId:sale._id,slot:'expediente_document',party:'procedure',documentKey:{$in:removed.map(key=>'registration_account_'+key)},deletedAt:null}).session(session))fail('Una cuenta tiene comprobantes activos. Conservá su identificación o archivá primero esos comprobantes.',409);}
            exp.registrationAccounts=rows;
        }
        if(Object.hasOwn(payload,'registrationDeposit')){const value=payload.registrationDeposit;if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['amount','currency','notes'].includes(key)))fail('El depósito de registro no es válido.');exp.registrationDeposit={amount:money(value.amount??0,'amount'),currency:currency(value.currency),notes:text(value.notes,'notes',5000)};}
        if(Object.hasOwn(payload,'refundDeclared')){if(typeof payload.refundDeclared!=='boolean')fail('El estado de reintegro no es válido.');exp.refundDeclared=payload.refundDeclared;}
        if(Object.hasOwn(payload,'milestones')){
            if(!payload.milestones||typeof payload.milestones!=='object'||Array.isArray(payload.milestones)||Object.entries(payload.milestones).some(([key,value])=>!EXPEDIENTE_MILESTONES.includes(key)||typeof value!=='boolean'))fail('Los hitos no son válidos.');
            if(payload.milestones.papersDelivered&&expedientePresentationStatus(sale)!=='entregado'){if(expedientePresentationStatus(sale)!=='transferido')fail('La entrega de papeles requiere el estado Transferido.',409,'EXPEDIENTE_TRANSFER_REQUIRED');await proofGuard(sale,session);await forwardGuard(sale,'entregado',actor,session,payload.overrideReason);sale.expedienteStatus='entregado';}
            if(payload.milestones.papersDelivered===false&&expedientePresentationStatus(sale)==='entregado')fail('Para corregir la entrega de papeles cambiá el estado del expediente dejando el motivo.',409,'EXPEDIENTE_BACKWARD_REASON_REQUIRED');
            for(const [key,value]of Object.entries(payload.milestones))exp.set('milestones.'+key,value);
        }
}
export async function updateExpedienteAdministration(saleId,payload,actor){
    return mutation(saleId,payload,actor,'ADMINISTRACION',async(sale,session)=>applyAdministration(sale,payload,actor,session));
}
async function expenseAccount(value,expectedCurrency,session){if(!value)return null;if(!validId(value)||!await Account.exists({_id:value,currency:expectedCurrency,isActive:{$ne:false}}).session(session))fail('Elegí una cuenta activa de la misma moneda.',400,'EXPEDIENTE_ACCOUNT_INVALID');return value;}
export async function saveExpedienteExpense(saleId,party,expenseId,payload,actor){
    if(!['seller','buyer'].includes(party)||expenseId&&!validId(expenseId))fail('El gasto no es válido.');
    allowed(payload,['concept','amount','currency','status','accountId','notes']);
    return mutation(saleId,payload,actor,expenseId?'GASTO_EDITADO':'GASTO_DECLARADO',async(sale,session)=>{
        const exp=initialized(sale);if(!exp.expenses)exp.expenses={seller:[],buyer:[]};
        const rows=exp.expenses[party],existing=expenseId?rows.id(expenseId):null;if(expenseId&&!existing)fail('El gasto no existe.',404);
        const values={...(existing?plain(existing):{})};
        if(!existing&&rows.length>=200)fail('La parte admite hasta 200 gastos declarados.');
        if(Object.hasOwn(payload,'concept')||!existing)values.concept=text(payload.concept,'concept',500,true);
        if(Object.hasOwn(payload,'amount')||!existing)values.amount=money(payload.amount,'amount');
        if(Object.hasOwn(payload,'currency')||!existing)values.currency=currency(payload.currency);
        if(Object.hasOwn(payload,'status')||!existing){if(!['pending','retained'].includes(payload.status||'pending'))fail('Los pagos se registran en Finanzas. No se puede declarar Pagado sin un egreso real.',409,'EXPEDIENTE_REAL_PAYMENT_REQUIRED');values.status=payload.status||'pending';}
        if(Object.hasOwn(payload,'notes')||!existing)values.notes=text(payload.notes,'notes',5000);
        if(Object.hasOwn(payload,'accountId')||!existing)values.accountId=await expenseAccount(payload.accountId,values.currency,session);
        else if(values.accountId&&values.currency!==existing.currency)values.accountId=await expenseAccount(id(values.accountId),values.currency,session);
        if(existing?.transactionId&&['concept','amount','currency','accountId','status'].some(field=>(field==='accountId'?id(values[field]):values[field])!==(field==='accountId'?id(existing[field]):existing[field])))fail('Este gasto está vinculado a un pago registrado. Conservá sus términos y corregí el pago desde Finanzas.',409,'EXPEDIENTE_POSTED_EXPENSE_PROTECTED');
        values.updatedAt=new Date();values.updatedBy=nameOf(actor);
        if(existing)existing.set(values);else rows.push({...values,createdAt:new Date(),createdBy:nameOf(actor)});
    },{capability:'canWriteFinance',idempotent:!expenseId});
}
export async function linkExpedienteExpensePayment(saleId,party,expenseId,payload,actor){
    if(!['seller','buyer'].includes(party)||!validId(expenseId)||!validId(payload.financeManualEntryId))fail('El pago o el gasto no es válido.');allowed(payload,['financeManualEntryId']);
    return mutation(saleId,payload,actor,'GASTO_PAGO_VINCULADO',async(sale,session)=>{
        const expense=sale.expediente.expenses?.[party]?.id(expenseId);if(!expense||expense.deletedAt)fail('El gasto no existe.',404);
        if(expense.financeManualEntryId){if(id(expense.financeManualEntryId)===payload.financeManualEntryId)return;fail('Este gasto ya está vinculado a otro pago.',409,'EXPEDIENTE_PAYMENT_ALREADY_LINKED');}
        const entry=await FinanceManualEntry.findOne({_id:payload.financeManualEntryId,kind:'payable',status:'Pagado',saleId:sale._id,amount:expense.amount,currency:expense.currency}).session(session).lean();
        if(!entry?.transactionId)fail('Seleccioná un pago real de esta venta por el importe y moneda del gasto.',409,'EXPEDIENTE_PAYMENT_MISMATCH');
        const tx=await Transaction.findOne({_id:entry.transactionId,financeManualEntryId:entry._id,saleId:sale._id,type:'Egreso',status:'activo',amount:expense.amount,currency:expense.currency,...(expense.accountId?{accountId:expense.accountId}:{})}).session(session).lean();
        if(!tx)fail('El egreso no está activo o no coincide con el gasto.',409,'EXPEDIENTE_PAYMENT_MISMATCH');
        const claimed=await FinanceManualEntry.updateOne({_id:entry._id,transactionId:tx._id,expedienteExpenseId:null},{$set:{expedienteExpenseId:expense._id,expedienteSaleId:sale._id,expedienteParty:party}},{session});
        if(claimed.modifiedCount!==1)fail('Este pago ya está vinculado a otro gasto.',409,'EXPEDIENTE_PAYMENT_ALREADY_LINKED');
        expense.financeManualEntryId=entry._id;expense.transactionId=tx._id;expense.accountId=tx.accountId;expense.updatedAt=new Date();expense.updatedBy=nameOf(actor);
    },{capability:'canWriteFinance',idempotent:true});
}
export async function payExpedienteExpense(saleId,party,expenseId,payload,actor){
    if(!['seller','buyer'].includes(party)||!validId(expenseId))fail('El gasto no es válido.');allowed(payload,['accountId','date','notes']);
    assertCapability(actor,'canWriteFinance');await prepareFinanceManualStorage();
    return mutation(saleId,payload,actor,'GASTO_PAGADO',async(sale,session)=>{
        const expense=sale.expediente.expenses?.[party]?.id(expenseId);if(!expense||expense.deletedAt)fail('El gasto no existe.',404);
        if(expense.transactionId||expense.financeManualEntryId)fail('El gasto ya tiene un pago vinculado. Revisá su fuente en Finanzas.',409,'EXPEDIENTE_PAYMENT_ALREADY_LINKED');
        const accountId=await expenseAccount(payload.accountId,expense.currency,session);if(!accountId)fail('Elegí una cuenta activa para registrar el pago.');
        const day=date(payload.date,'date',true),notes=text(payload.notes,'notes',5000);
        const lock=await Sale.updateOne({_id:sale._id,__v:payload.expectedVersion},{$set:{'expediente.writeNonce':crypto.randomUUID()}},{session,timestamps:false});
        if(lock.matchedCount!==1)fail('El expediente cambió. Actualizalo antes de pagar.',409,'EXPEDIENTE_CHANGED');
        const result=await createFinanceManualEntry('payable',{label:expense.concept,status:'Pagado',amount:expense.amount,currency:expense.currency,date:day,accountId,saleId:id(sale),notes},actor,'exp-payment-'+hash({saleId,expenseId,key:payload.idempotencyKey,actor:actorId(actor)}),{session});
        const entry=result.item;
        if(!entry.transactionId)fail('El pago no generó un egreso verificable.',409,'EXPEDIENTE_PAYMENT_MISMATCH');
        const claimed=await FinanceManualEntry.updateOne({_id:entry._id,transactionId:entry.transactionId,expedienteExpenseId:null},{$set:{expedienteExpenseId:expense._id,expedienteSaleId:sale._id,expedienteParty:party}},{session});
        if(claimed.modifiedCount!==1)fail('El pago ya está vinculado a otro gasto.',409,'EXPEDIENTE_PAYMENT_ALREADY_LINKED');
        expense.financeManualEntryId=entry._id;expense.transactionId=entry.transactionId;expense.accountId=accountId;expense.updatedAt=new Date();expense.updatedBy=nameOf(actor);
    },{capability:'canWriteFinance',idempotent:true});
}
