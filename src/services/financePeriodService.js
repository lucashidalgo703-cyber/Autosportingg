import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import CrmSettings from '../models/CrmSettings.js';
import AuditLog from '../models/AuditLog.js';
import FinancePeriodState from '../models/FinancePeriodState.js';
import FinancePeriodArchive from '../models/FinancePeriodArchive.js';
import FinancePeriodOperation from '../models/FinancePeriodOperation.js';
import {getCashProjection} from './cashProjectionService.js';
import {getCapitalSummary} from './capitalSummaryService.js';
import {roundMoney} from '../utils/saleCommercial.js';

const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const failure=(message,status=400,errors)=>Object.assign(Error(message),{status,errors});
const currentDto=state=>({id:state?.currentPeriodId||null,sequence:state?.currentSequence||1,startedAt:state?.currentStartedAt||null});
const archiveDto=archive=>({id:archive._id,sequence:archive.sequence,startedAt:archive.startedAt,endedAt:archive.endedAt,agencyName:archive.agencyName,reason:archive.reason,actorName:archive.actorName,snapshotHash:archive.snapshotHash,nextPeriodId:archive.nextPeriodId});

export async function listFinancePeriods({page=1}={}){
    const index=Number(page);if(!Number.isInteger(index)||index<1||index>10000)throw failure('La página no es válida.');
    const [state,settings,items]=await Promise.all([
        FinancePeriodState.findById('management').lean(),CrmSettings.findOne().select('agencyName').lean(),
        FinancePeriodArchive.find({}).select('-snapshot -actorId').sort({sequence:-1}).skip((index-1)*20).limit(21).lean()
    ]);
    return {current:currentDto(state),agencyName:settings?.agencyName?.trim()||'AutoSporting',items:items.slice(0,20).map(archiveDto),page:index,hasMore:items.length>20,scope:'management_reporting_only'};
}

export async function readFinancePeriod(id){
    if(!mongoose.isValidObjectId(id))throw failure('El período no es válido.');
    const archive=await FinancePeriodArchive.findById(id).lean();
    if(!archive)throw failure('El resumen del período no existe.',404);
    return {...archiveDto(archive),snapshot:archive.snapshot};
}

async function movementSnapshot(start,end,session){
    // A period is a registration-time boundary. Commercial dates are retained
    // separately and backdated entries are not silently moved to an old archive.
    const match=start?{createdAt:{$gte:start,$lt:end}}:{$or:[{createdAt:{$lt:end}},{createdAt:null}]};
    const groups=await Transaction.aggregate([
        {$match:match},
        {$group:{_id:{status:{$ifNull:['$status','activo']},currency:'$currency',type:'$type',internal:{$eq:[{$toLower:{$trim:{input:{$ifNull:['$category','']}}}},'transferencia interna']}},count:{$sum:1},amount:{$sum:'$amount'},invalidAmounts:{$sum:{$cond:[{$and:[{$isNumber:'$amount'},{$gte:['$amount',0]}]},0,1]}},firstRegisteredAt:{$min:'$createdAt'},lastRegisteredAt:{$max:'$createdAt'},firstCommercialDate:{$min:'$date'},lastCommercialDate:{$max:'$date'},unknownRegistrationDate:{$sum:{$cond:[{$eq:[{$ifNull:['$createdAt',null]},null]},1,0]}}}}
    ]).session(session);
    const externalActivity={ARS:{income:0,expense:0,net:0},USD:{income:0,expense:0,net:0}},counts={total:0,active:0,pending:0,annulled:0,other:0,internal:0,unknownRegistrationDate:0};
    const dateRange={firstRegisteredAt:null,lastRegisteredAt:null,firstCommercialDate:null,lastCommercialDate:null};
    for(const group of groups){
        const {status,currency,type,internal}=group._id;
        if(group.invalidAmounts||!Number.isFinite(group.amount)||!['ARS','USD'].includes(currency)||!['Ingreso','Egreso'].includes(type))throw failure('Hay movimientos con importes, monedas o tipos inválidos. Revisalos antes de iniciar el período.',409);
        counts.total+=group.count;counts.unknownRegistrationDate+=group.unknownRegistrationDate;
        counts[status==='activo'?'active':status==='pendiente'?'pending':status==='anulado'?'annulled':'other']+=group.count;
        if(internal)counts.internal+=group.count;
        if(status==='activo'&&!internal)externalActivity[currency][type==='Ingreso'?'income':'expense']+=group.amount;
        for(const field of Object.keys(dateRange)){const date=group[field];if(!date)continue;if(!dateRange[field]||(field.startsWith('first')?date<dateRange[field]:date>dateRange[field]))dateRange[field]=date;}
    }
    for(const currency of ['ARS','USD']){const row=externalActivity[currency];row.income=roundMoney(row.income);row.expense=roundMoney(row.expense);row.net=roundMoney(row.income-row.expense);}
    return {boundaryField:'createdAt',fromInclusive:start,toExclusive:end,counts,dateRange,externalActivity};
}

async function captureSnapshot(state,now,session){
    const accounts=await Account.find({}).select('name type currency balance isActive').session(session).lean();
    const registeredBalances={ARS:0,USD:0},accountRows=[];
    for(const account of accounts){
        if(!['ARS','USD'].includes(account.currency)||!Number.isFinite(account.balance))throw failure('Hay cuentas con saldo o moneda inválidos. Revisalas antes de iniciar el período.',409);
        accountRows.push({id:String(account._id),name:account.name,type:account.type,currency:account.currency,balance:account.balance,isActive:account.isActive!==false});
        if(account.isActive!==false)registeredBalances[account.currency]=roundMoney(registeredBalances[account.currency]+account.balance);
    }
    const projection=await getCashProjection({asOf:now,session});
    const capital=await getCapitalSummary({now,session});
    const pending={incoming:{ARS:0,USD:0},outgoing:{ARS:0,USD:0},count:projection.calendar.length,bySource:{}};
    for(const item of projection.calendar){
        pending[item.direction][item.currency]=roundMoney(pending[item.direction][item.currency]+item.amount);
        const source=String(item.id||'').startsWith('purchase:')?'stock_purchase':String(item.id||'').startsWith('payable:')?'payable_installment':String(item.id||'').startsWith('manual-payable:')?'manual_payable':item.source;
        const key=source+':'+item.direction+':'+item.currency,row=pending.bySource[key]||{source,direction:item.direction,currency:item.currency,count:0,amount:0};row.count++;row.amount=roundMoney(row.amount+item.amount);pending.bySource[key]=row;
    }
    pending.bySource=Object.values(pending.bySource);
    for(const currency of projection.quality.unreliableCurrencies){pending.incoming[currency]=null;pending.outgoing[currency]=null;}
    const capitalReadings=Object.fromEntries(['ARS','USD'].map(currency=>{const components=capital.byCurrency[currency].componentes;return [currency,{registeredPayables:components.deudasPropia.monto,payableCount:components.deudasPropia.items.length,registeredLoanCredits:components.otrosCreditos.monto,loanCount:components.otrosCreditos.items.length}];}));
    const movements=await movementSnapshot(state.currentStartedAt,now,session);
    return {version:1,capturedAt:now,registeredBalances,accounts:accountRows,movements,pending,projection:{overdue:projection.overdue,undated:projection.undated,periods:projection.periods,quality:projection.quality,coverage:projection.coverage},capitalReadings,capitalIssueCount:capital.issues.length,scope:'Resumen de gestión de fuentes registradas. Las lecturas de Capital y proyección se superponen: no se suman entre sí. No acredita conciliación bancaria, cierre fiscal ni copia restaurable.'};
}

export async function startFinancePeriod(input,{actor,idempotencyKey,now=null}={}){
    if(!input||typeof input!=='object'||Array.isArray(input))throw failure('El formulario del período no es válido.');
    const actorId=String(actor?.id||actor?.userId||''),key=String(idempotencyKey||input.idempotencyKey||'').trim();
    if(!actorId)throw failure('La sesión no es válida.',401);
    if(!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw failure('La clave de la operación no es válida.');
    if(!Object.hasOwn(input,'expectedCurrentPeriodId')||(input.expectedCurrentPeriodId!==null&&!mongoose.isValidObjectId(input.expectedCurrentPeriodId)))throw failure('Actualizá los períodos antes de confirmar.',409);
    const expected=input.expectedCurrentPeriodId===null?null:String(input.expectedCurrentPeriodId),reason=String(input.reason||'').trim(),confirmation=String(input.agencyConfirmation||'').trim();
    if(reason.length<3||reason.length>2000)throw failure('Completá un motivo de entre 3 y 2000 caracteres.',400,{reason:'El motivo debe tener entre 3 y 2000 caracteres.'});
    if(!confirmation||confirmation.length>300)throw failure('Escribí el nombre de la agencia.',400,{agencyConfirmation:'Escribí el nombre de la agencia para confirmar.'});
    if(now!==null&&Number.isNaN(new Date(now).getTime()))throw failure('El instante de inicio no es válido.');
    const operationId=hash([actorId,key]),digest=hash({actorId,expected,reason,confirmation}),nextPeriodId=String(new mongoose.Types.ObjectId()),initialArchiveId=String(new mongoose.Types.ObjectId());
    for(let attempt=0;attempt<3;attempt++){
        const session=await mongoose.startSession();let result;
        try{
            await session.withTransaction(async()=>{
                const previous=await FinancePeriodOperation.findById(operationId).session(session).lean();
                if(previous){if(previous.digest!==digest)throw failure('Esta clave ya se utilizó con otros datos.',409);const archive=await FinancePeriodArchive.findById(previous.archiveId).session(session).lean();if(!archive)throw failure('El archivo de la operación requiere revisión.',409);result={archive:archiveDto(archive),current:previous.current,replayed:true};return;}
                await FinancePeriodState.updateOne({_id:'management'},{$setOnInsert:{revision:0,currentPeriodId:null,currentStartedAt:null,currentSequence:1}},{upsert:true,session});
                const state=await FinancePeriodState.findById('management').session(session).lean();
                if((state.currentPeriodId||null)!==expected)throw failure('Otra persona ya inició un período. Actualizá el listado antes de confirmar.',409,{expectedCurrentPeriodId:'El período actual cambió. Actualizá el listado.'});
                const instant=now===null?new Date():new Date(now);
                if(state.currentStartedAt&&instant<=state.currentStartedAt)throw failure('El nuevo período debe empezar después del actual. Actualizá y reintentá.',409);
                const settings=await CrmSettings.findOne().select('agencyName').session(session).lean(),agencyName=settings?.agencyName?.trim()||'AutoSporting';
                if(confirmation!==agencyName)throw failure('El nombre no coincide con la agencia configurada.',400,{agencyConfirmation:'Escribí exactamente '+agencyName+'.'});
                // Taking the singleton write lock before source reads serializes
                // period starts. It does not block or mutate business writers.
                const locked=await FinancePeriodState.updateOne({_id:'management',revision:state.revision},{$inc:{revision:1},$set:{currentPeriodId:nextPeriodId,currentStartedAt:instant,currentSequence:state.currentSequence+1,updatedAt:instant}},{session});
                if(locked.modifiedCount!==1)throw failure('El período cambió. Actualizá el listado.',409);
                const snapshot=await captureSnapshot(state,instant,session),archiveId=state.currentPeriodId||initialArchiveId;
                const [archive]=await FinancePeriodArchive.create([{_id:archiveId,sequence:state.currentSequence,startedAt:state.currentStartedAt,endedAt:instant,agencyName,reason,actorId,actorName:actor.username||actor.name||'',snapshot,snapshotHash:hash(snapshot),nextPeriodId}],{session});
                const current={id:nextPeriodId,sequence:state.currentSequence+1,startedAt:instant};
                await FinancePeriodOperation.create([{_id:operationId,digest,archiveId,current,actorId,createdAt:instant}],{session});
                await AuditLog.create([{userId:actorId,userName:actor.username||actor.name||'',userRole:actor.role,action:'FINANZAS_PERIODO_INICIADO',module:'finanzas',entityType:'FinancePeriodArchive',entityId:archiveId,description:'Nuevo período de gestión; saldos, obligaciones y fuentes conservados.',metadata:{sequence:state.currentSequence,nextPeriodId,reason,snapshotHash:archive.snapshotHash}}],{session});
                result={archive:archiveDto(archive),current,replayed:false};
            },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});
            return result;
        }catch(error){if(error.code===11000&&attempt<2)continue;throw error;}finally{await session.endSession();}
    }
}
