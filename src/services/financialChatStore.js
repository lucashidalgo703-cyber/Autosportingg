import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { financialPilotReport } from './financialPilotSource.js';
import { analysisMode, openAiAnalysis } from './financialAnalysisProvider.js';
import { chatPrompt, chatPromptVersion, chatSchema, executeChatTurn, resolveChatCommand, simulatedCommand } from './financialChatEngine.js';

const fail = (message,status=400) => Object.assign(new Error(message),{status});
const collection = () => mongoose.connection.collection('financial_direction_chats');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publicChat = ({_id,title,context,messages,revisions,updatedAt,demo}) => ({id:_id,title,context,messages,revisions,updatedAt,demo});
const only = (input,keys) => input && typeof input==='object' && !Array.isArray(input) && Object.keys(input).every(key=>keys.includes(key));

export function chatMode() {
    return process.env.AUTOSPORTING_FINANCIAL_CHAT === '1' ? analysisMode() : 'disabled';
}

export async function listChats(owner) {
    const rows = await collection().find({owner},{projection:{title:1,context:1,updatedAt:1}}).sort({updatedAt:-1}).limit(40).toArray();
    return rows.map(({_id,...row})=>({id:_id,...row}));
}

export async function findChat(owner,id) {
    if (typeof id!=='string' || !uuid.test(id)) throw fail('Conversación no encontrada.',404);
    const row = await collection().findOne({_id:id,owner});
    if (!row) throw fail('Conversación no encontrada.',404);
    return row;
}

export async function createChat(owner,input,{ seedFromSimulation = false } = {}) {
    if (!only(input,['sampleId','variant','scenario','demo','purchase']) || (input.demo!=null && !['liquidity','trade'].includes(input.demo)) ||
        (input.demo && chatMode()!=='simulated') || (input.purchase!=null && !seedFromSimulation))
        throw fail('Contexto de conversación inválido.');
    const report=financialPilotReport({sampleId:input.sampleId,variant:input.variant,scenario:input.scenario,
        ...(input.purchase!=null ? {purchase:input.purchase} : {})});
    if (input.demo && (report.variant!=='revised' || report.scenario!=='stress')) throw fail('La demostración usa el cierre corregido bajo estrés.');
    if (await collection().countDocuments({owner},{limit:40})>=40) throw fail('Se alcanzó el límite de conversaciones de prueba.',429);
    const {sampleId,variant,scenario,closeVersion,cutoff,policyVersion} = report;
    const context={sampleId,variant,scenario,closeVersion,cutoff,policyVersion};
    const revisions=[];
    if (report.simulation) {
        const flows=report.simulation.scheduled.filter(row=>row.id.startsWith('simulation-'))
            .map(({currency,date,amount})=>({currency,date,amount}));
        const p=report.simulation;
        revisions.push({number:1,assumptions:{kind:'purchase',flows,terms:{}},evaluation:{economics:null,missing:[],liquidity:{
            minimum:p.minimum,gap:p.gap,floor:p.floor,currency:p.currency,source:report.manifest.forecast,capacity:p.capacity,
            buffer:p.minimum?p.minimum.free-p.floor:null,incremental:flows
        }}});
    }
    const row={_id:randomUUID(),owner,title:input.demo==='trade'?'Permuta sintética':input.demo ? 'Reinversión sintética' :
        report.simulation ? 'Simulación de compra' : 'Dirección financiera',context,revisions,messages:[],turnVersion:0,updatedAt:new Date(),demo:input.demo??null};
    await collection().insertOne(row);
    return publicChat(row);
}

const activeOwners=new Set();
export async function sendChat(owner,id,input) {
    if (!only(input,['message','requestId']) || typeof input.message!=='string' || !input.message.trim() ||
        input.message.length>1200 || typeof input.requestId!=='string' || !uuid.test(input.requestId)) throw fail('Mensaje inválido.');
    const row=await findChat(owner,id);
    const message=input.message.trim();
    const prior=row.messages.find(item=>item.requestId===input.requestId);
    if (prior) {
        if (prior.message!==message) throw fail('El identificador de turno ya corresponde a otro mensaje.',409);
        return publicChat(row);
    }
    const mode=chatMode();
    if (mode==='pending') throw fail('IA pendiente de conexión.',503);
    if (mode==='simulated' && !row.demo) throw fail('En modo simulado abrí una demostración guionada. La interpretación libre requiere conexión.',503);
    if (mode==='configured' && row.demo) throw fail('Las demostraciones guionadas se retoman en modo simulado.',409);
    if (mode!=='configured' && mode!=='simulated') throw fail('Chat deshabilitado.',404);
    if (row.messages.length>=20 || activeOwners.has(owner)) throw fail('Hay un turno en curso o se alcanzó el límite de turnos.',429);
    activeOwners.add(owner);
    const lease=randomUUID();
    try {
        const now=new Date();
        const claimed=await collection().findOneAndUpdate({_id:id,owner,turnVersion:row.turnVersion,
            $or:[{lease:{$exists:false}},{leaseUntil:{$lte:now}}]},
            {$set:{lease,leaseUntil:new Date(now.getTime()+30000)}},{returnDocument:'after'});
        if (!claimed) throw fail('El turno cambió. Volvé a abrir la conversación.',409);
        try {
            const result=mode==='simulated' ? {selection:simulatedCommand(row.demo,row.messages.length),model:null,usage:null} :
                await openAiAnalysis({schema:chatSchema,systemPrompt:chatPrompt,input:{message,context:row.context,
                    alternatives:row.revisions.slice(-3).map(({number,assumptions})=>({number,assumptions})),
                    lastTurn:row.messages.length ? {message:row.messages.at(-1).message,reply:row.messages.at(-1).reply.text.slice(0,400)} : null}});
            if (chatMode()!==mode) throw fail('El modo del chat cambió durante el turno.',409);
            const {revision,...reply}=executeChatTurn(row,resolveChatCommand(message,result.selection,{
                newDraft:row.revisions.length===0,previous:row.revisions.at(-1)?.assumptions}));
            const turn={requestId:input.requestId,message,reply,at:new Date(),mode:mode==='simulated'?'simulated':'real',
                model:result.model,usage:result.usage,promptVersion:chatPromptVersion};
            const updated=await collection().findOneAndUpdate({_id:id,owner,lease,leaseUntil:{$gt:new Date()}},{
                $push:{messages:turn,...(revision ? {revisions:revision} : {})},
                $inc:{turnVersion:1},$set:{updatedAt:new Date()},$unset:{lease:'',leaseUntil:''}
            },{returnDocument:'after'});
            if (!updated) throw fail('El turno venció. Volvé a abrir la conversación.',409);
            return publicChat(updated);
        } finally { await collection().updateOne({_id:id,owner,lease},{$unset:{lease:'',leaseUntil:''}}); }
    } finally { activeOwners.delete(owner); }
}

export const getChat = async (owner,id) => publicChat(await findChat(owner,id));
