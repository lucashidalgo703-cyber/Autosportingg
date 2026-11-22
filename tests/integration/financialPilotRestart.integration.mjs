import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';
import { persistentPilotStorage, seedFinancialPilotUser } from '../../scripts/financial-pilot-storage.mjs';
import { limits, maxEstimatedUsd, model, openAiAnalysis, reserveBudget } from '../../src/services/financialAnalysisProvider.js';

const script=fileURLToPath(import.meta.url);
const [phase,root,saved]=process.argv.slice(2);
const child=(stage,directory,context)=>{
    const result=spawnSync(process.execPath,[script,stage,directory,...(context?[JSON.stringify(context)]:[])],{
        encoding:'utf8',timeout:150000,windowsHide:true
    });
    assert.equal(result.status,0,result.error?.message ?? result.stdout+result.stderr);
    return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
};

if (!phase) {
    assert.equal(maxEstimatedUsd,0.015438);
    assert.ok(maxEstimatedUsd < limits.reservation && limits.reservation < limits.perAnalysis && limits.calls <= 3);
    const directory=mkdtempSync(join(tmpdir(),'autosporting-persistent-proof-'));
    mkdirSync(join(directory,'budget-stub'));
    const first=child('first',directory);
    const second=child('second',directory,first);
    assert.deepEqual(second,{restored:true,turns:3,minimum:345,reservations:2});
    console.log('OK: dos procesos MongoDB sucesivos, mismo usuario, tres turnos, aislamiento y dos reservas en el presupuesto de prueba.');
} else if (phase==='probe') {
    assert.throws(()=>reserveBudget(join(root,'budget-stub')),{status:429});
    console.log(JSON.stringify({blocked:true}));
} else {
    const budget=join(root,'budget-stub');
    const persistent=persistentPilotStorage(join(root,'data'),32530);
    Object.assign(process.env,{AUTOSPORTING_FINANCIAL_PILOT:'1',AUTOSPORTING_FINANCIAL_CHAT:'1',
        AUTOSPORTING_FINANCIAL_AI:'1',AUTOSPORTING_FINANCIAL_AI_MODE:'simulated',ENABLE_DAILY_SUMMARY_SCHEDULER:'false'});
    const instance=await bootIsolatedReplica({persistent});
    let output;
    try {
        const {createLoginSession}=await import('../../src/services/authSessionService.js');
        const seed=async name=>{
            const user=await seedFinancialPilotUser(instance.models.AdminUser,{name,role:'owner',permissions:[],passwordHash:randomUUID()});
            return {uid:String(user._id),token:(await createLoginSession(user)).token};
        };
        const owner=await seed('restart-owner'),other=await seed('restart-other');
        const chats='/api/admin/autosporting-ai/chats';
        const call=(method,path,body,who=owner)=>instance.call(method,chats+path,body,who.token);
        const send=(id,message)=>call('POST','/'+id+'/messages',{message,requestId:randomUUID()});
        if (phase==='first') {
            const created=await call('POST','',{sampleId:'AS-SINT-01',variant:'revised',scenario:'stress',demo:'liquidity'});
            assert.equal(created.status,200);
            const {id}=created.json;
            assert.equal((await send(id,'¿Cuál es la holgura?')).status,200);
            const second=await send(id,'Simulá una compra al contado de treinta.');
            assert.equal(second.status,200);
            assert.equal(second.json.revisions[0].evaluation.liquidity.minimum.free,340);
            assert.deepEqual(readdirSync(budget),[]);
            await assert.rejects(openAiAnalysis({input:{synthetic:true},schema:{type:'object',properties:{},additionalProperties:false},
                env:{AUTOSPORTING_FINANCIAL_AI:'1',AUTOSPORTING_FINANCIAL_AI_MODE:'real',AUTOSPORTING_OPENAI_TEST_KEY:'isolated-stub',
                    AUTOSPORTING_FINANCIAL_AI_MODEL:model,AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR:budget},
                transport:async()=>{assert.deepEqual(child('probe',root),{blocked:true});throw new DOMException('stub','TimeoutError');}}),{status:502});
            assert.equal(JSON.parse(readFileSync(join(budget,'attempt-1.json.outcome'),'utf8')).status,'uncertain');
            output={id,uid:owner.uid};
        } else {
            const {id,uid}=JSON.parse(saved);
            assert.equal(owner.uid,uid);
            assert.equal((await call('GET','/'+id,undefined,other)).status,404);
            const restored=await call('GET','/'+id);
            assert.equal(restored.status,200);
            assert.equal(restored.json.messages.length,2);
            assert.equal(restored.json.context.closeVersion,2);
            assert.equal(restored.json.revisions[0].evaluation.liquidity.minimum.free,340);
            assert.equal(restored.json.revisions[0].evaluation.liquidity.source,'SINT-VENCIMIENTOS-01');
            const corrected=await send(id,'Eran veinticinco, no treinta.');
            assert.equal(corrected.status,200);
            assert.equal(corrected.json.revisions[1].assumptions.flows.length,1);
            assert.equal(corrected.json.revisions[1].evaluation.liquidity.minimum.free,345);
            assert.equal(JSON.parse(readFileSync(join(budget,'attempt-1.json'),'utf8')).reservation,limits.reservation);
            assert.equal(JSON.parse(readFileSync(join(budget,'attempt-1.json.outcome'),'utf8')).status,'uncertain');
            const finish=reserveBudget(budget);
            finish(null,'test-only');
            assert.ok(readdirSync(budget).includes('attempt-2.json'));
            output={restored:true,turns:corrected.json.messages.length,minimum:345,reservations:2};
        }
    } finally {await instance.stop();}
    console.log(JSON.stringify(output));
}
