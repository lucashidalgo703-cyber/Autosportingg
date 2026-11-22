import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chatSchema, executeChatTurn, resolveChatCommand, simulatedCommand } from '../src/services/financialChatEngine.js';
import { limits } from '../src/services/financialAnalysisProvider.js';

const context={sampleId:'AS-SINT-01',variant:'revised',scenario:'stress'};
const fresh=()=>({context,revisions:[]});
const turn=(chat,command)=>{
    const value=executeChatTurn(chat,command);
    if(value.revision)chat.revisions.push(value.revision);
    return value;
};

test('structured revisions replace an immediate expense and compare independent options',()=>{
    const chat=fresh();
    const results=Array.from({length:5},(_,index)=>turn(chat,simulatedCommand('liquidity',index)));
    const {minimum,capacity,floor}=results[0].evidence.base;
    assert.deepEqual([minimum.free,capacity,floor],[370,20,350]);
    assert.deepEqual(chat.revisions.map(({evaluation:{liquidity}})=>[liquidity.minimum.free,liquidity.gap,liquidity.buffer]),
        [[340,10,-10],[345,5,-5],[350,0,0]]);
    assert.deepEqual(chat.revisions.map(row=>row.assumptions.flows.map(flow=>flow.amount)),[[-30],[-25],[-20]]);
    assert.match(results[4].text,/exactamente el piso/);
    assert.equal(results[4].evidence.alternatives.length,3);
    const correction=turn(chat,{action:'update',flowAction:'replace',flowIndex:0,date:'2026-11-27'});
    assert.equal(correction.revision.assumptions.flows[0].date,'2026-11-27');
    assert.equal(chat.revisions[2].assumptions.flows[0].date,'2026-10-31');
    assert.equal(turn(fresh(),{action:'compare'}).evidence.alternatives.length,0);
});

test('trade asks for missing inputs and keeps proceeds, inventory and credit distinct',()=>{
    const chat=fresh();
    const first=turn(chat,simulatedCommand('trade',0));
    assert.deepEqual(first.revision.evaluation.missing,['cost','direct','share']);
    assert.equal(first.revision.evaluation.economics,null);
    const second=turn(chat,simulatedCommand('trade',1));
    assert.deepEqual(second.revision.evaluation.economics,{revenue:120,cost:100,direct:5,margin:20,contribution:15,
        currency:'ARS',inventoryReceived:60,credit:20,cash:40,share:100});
    assert.equal(second.revision.evaluation.liquidity,null);
    const funded=turn(chat,{action:'update',cashCollected:40,cashAgency:40,cashRestricted:0,flowAction:'append',amount:40,date:'2026-11-01',currency:'ARS'});
    assert.equal(funded.revision.evaluation.liquidity.incremental[0].amount,40);
    assert.equal(funded.revision.evaluation.economics.credit,20);
});

test('rejects forged context, references and inconsistent terms; preserves unknown currencies',()=>{
    const chat=fresh();
    for(const forged of [{action:'compare',scenario:'base'}, {action:'capacity',evidence:['inventado']}, {action:'compare',amount:123},
        {action:'update',kind:'trade',operationCurrency:'ARS',salePrice:120,cost:100,cash:40,credit:30,direct:5,share:100,tradeValue:60}])
        assert.throws(()=>turn(chat,forged),{status:422});
    const foreign=turn(chat,{action:'update',kind:'purchase',flowAction:'append',amount:-20,date:'2026-10-31',currency:'USD'});
    assert.equal(foreign.revision.evaluation.liquidity.minimum,null);
    assert.equal(foreign.revision.evaluation.liquidity.incremental[0].currency,'USD');
    assert.ok(foreign.revision.evaluation.liquidity.alerts.some(alert=>alert.code==='missing_fx'));
    assert.equal(chatSchema.additionalProperties,false);
    assert.ok((limits.input*0.75+limits.output*4.5)/1e6 < limits.reservation);
    const comparison=turn(chat,{action:'compare'});
    assert.doesNotMatch(comparison.text,/renegociar/);
});

test('a draft keeps its amount while waiting for a date',()=>{
    const chat=fresh();
    const drafted=turn(chat,{action:'update',kind:'purchase',flowAction:'append',amount:-25,currency:'ARS'});
    assert.equal(drafted.revision.evaluation.liquidity,null);
    assert.match(drafted.text,/fecha/);
    const complete=turn(chat,{action:'update',flowAction:'replace',flowIndex:0,date:'2026-10-31'});
    assert.deepEqual(complete.revision.assumptions.flows,[{amount:-25,currency:'ARS',date:'2026-10-31'}]);
    assert.equal(complete.revision.evaluation.liquidity.minimum.free,345);
});

test('trade separates hypothetical cash, free agency cash, intake cost and principal',()=>{
    const chat=fresh();
    const first=turn(chat,simulatedCommand('trade',0)).revision.evaluation.settlement;
    assert.deepEqual([first.contractualCash,first.collectedCash,first.freeAgencyCash,first.contractualTradeValue,first.assignedInventoryCost,first.creditPrincipal],
        [40,null,null,60,null,20]);
    const final=turn(chat,{action:'update',cost:100,direct:5,share:50,cashCollected:30,cashAgency:15,cashRestricted:5,inventoryCost:52,creditDueDate:'2026-11-25'}).revision.evaluation;
    assert.deepEqual([final.settlement.collectedCash,final.settlement.agencyCash,final.settlement.freeAgencyCash,final.settlement.assignedInventoryCost,
        final.settlement.creditDueDate,final.settlement.ownResult,final.settlement.source,final.liquidity],
        [30,15,10,52,'2026-11-25',null,'user_hypothesis',null]);
    assert.throws(()=>turn(chat,{action:'update',cashCollected:45}),{status:422});
    assert.throws(()=>turn(chat,{action:'update',creditDueDate:'2026-11-31'}),{status:422});
});

test('a standalone reinvestment question recovers from an unsupported classification',()=>{
    const unsupported={action:'unsupported'};
    for (const question of ['¿Cuánto puedo reinvertir y por qué?', 'En este cierre sintético corregido bajo estrés, ¿cuánto puedo reinvertir y por qué?']) {
        const result=turn(fresh(),resolveChatCommand(question,unsupported));
        assert.deepEqual([result.evidence.base.capacity,result.evidence.base.minimum.free,result.evidence.base.floor],[20,370,350]);
        assert.equal(result.revision,undefined);
    }
    assert.equal(resolveChatCommand('¿Cuánto puedo reinvertir y cuánto debo pagar de impuestos?',unsupported),unsupported);
    assert.equal(resolveChatCommand('¿Cuánto puedo reinvertir? Simulá además una compra de 30.',unsupported),unsupported);
    const update={action:'update'};
    assert.equal(resolveChatCommand('¿Cuánto puedo reinvertir?',update),update);
});

test('a trade draft discards the invented receipt equal to the nominal price',()=>{
    const chat=fresh();
    const draft=turn(chat,{...simulatedCommand('trade',0),flowAction:'append',amount:120,date:'2026-10-31',currency:'ARS'});
    assert.deepEqual(draft.revision.assumptions.flows,[]);
    assert.equal(draft.revision.evaluation.economics,null);
    assert.equal(draft.revision.evaluation.liquidity,null);
    assert.equal(draft.revision.evaluation.settlement.freeAgencyCash,null);
    assert.equal(draft.evidence.base.minimum.free,370);
    assert.match(draft.text,/cuánto ya se cobró/i);
    assert.match(draft.text,/caja de esta permuta queda pendiente/i);
    const confirmed=turn(chat,{action:'update',cost:100,direct:5,share:100,cashCollected:40,cashAgency:40,cashRestricted:0});
    assert.deepEqual(confirmed.revision.assumptions.flows,[]);
    assert.equal(confirmed.revision.evaluation.liquidity,null);
    const inflated=turn(chat,{action:'update',flowAction:'append',amount:120,date:'2026-10-31',currency:'ARS'});
    assert.deepEqual(inflated.revision.assumptions.flows,[]);
    assert.equal(inflated.revision.evaluation.liquidity,null);
});

test('direct trade separates the explicit nominal breakdown from inferred cash flows',()=>{
    const query='Quiero analizar una permuta sintética: ARS 40 en efectivo, un vehículo tomado por ARS 60 y ARS 20 por cobrar. ¿Cuál es el resultado y cuánta caja me queda disponible?';
    const invalidSelections=[
        {action:'clarify',kind:'trade',tradeValue:120},
        {action:'update',kind:'trade',tradeValue:120,credit:20,amount:120,date:'2026-10-31',currency:'ARS'}
    ];
    for(const command of invalidSelections){
        const reply=turn(fresh(),resolveChatCommand(query,command,{newDraft:true}));
        const {settlement,economics,liquidity}=reply.revision.evaluation;
        assert.deepEqual([settlement.contractualCash,settlement.contractualTradeValue,settlement.creditPrincipal],[40,60,20]);
        assert.equal(reply.revision.assumptions.terms.salePrice,120);
        assert.deepEqual(reply.revision.assumptions.flows,[]);
        assert.equal(economics,null);
        assert.equal(liquidity,null);
        assert.match(reply.text,/cu[aá]nto ya se cobr[oó]/i);
        assert.match(reply.text,/costo de la unidad/);
    }
    assert.equal(resolveChatCommand(query,invalidSelections[0]),invalidSelections[0]);
    assert.equal(resolveChatCommand(query.replace('ARS 40','ARS 40,50'),invalidSelections[0],{newDraft:true}),invalidSelections[0]);
});

test('a wholly owned trade recognizes its contribution and projects only settled dated cash',()=>{
    const chat=fresh();
    turn(chat,simulatedCommand('trade',0));
    const completed=turn(chat,{action:'update',cost:100,direct:5,share:100,inventoryCost:60,
        cashCollected:40,cashAgency:40,cashRestricted:0,cashCollectedDate:'2026-10-31',directPaidDate:'2026-10-31',
        creditDueDate:'2026-11-30'}).revision;
    assert.equal(completed.evaluation.settlement.ownResult,15);
    assert.equal(completed.evaluation.liquidity.minimum.free,405);
    assert.deepEqual(completed.assumptions.flows.map(({amount,date})=>[amount,date]),[[40,'2026-10-31'],[-5,'2026-10-31']]);
    assert.equal(completed.evaluation.settlement.creditPrincipal,20);
    const changed=turn(chat,{action:'update',directPaidDate:'2026-11-01'}).revision;
    assert.deepEqual(changed.assumptions.flows.map(({amount,date})=>[amount,date]),[[40,'2026-10-31'],[-5,'2026-11-01']]);
});

test('an initial trade keeps all supplied terms and only asks for the missing settlement date',()=>{
    const complete={...simulatedCommand('trade',0),cost:100,direct:5,share:100,inventoryCost:60,
        cashCollected:40,cashAgency:40,cashRestricted:0,cashCollectedDate:'2026-10-31',
        directPaidDate:'2026-10-31',creditDueDate:'2026-11-30'};
    const full=turn(fresh(),complete);
    assert.deepEqual(full.revision.evaluation.missing,[]);
    assert.equal(full.revision.evaluation.liquidity.minimum.free,405);
    assert.equal(full.revision.evaluation.settlement.ownResult,15);
    assert.doesNotMatch(full.text,/\?|pendiente|confirmá/i);

    const message='El efectivo se cobró el 31/10/2026. Crédito pendiente de ARS 20 que vence el 30/11/2026. Pagamos ARS 5 de gastos directos.';
    const received={...complete,creditDueDate:null};
    const partial=turn(fresh(),resolveChatCommand(message,received,{newDraft:true}));
    assert.equal(partial.revision.evaluation.liquidity,null);
    assert.equal(partial.revision.evaluation.settlement.ownResult,15);
    assert.equal(partial.revision.evaluation.settlement.creditDueDate,'2026-11-30');
    assert.equal(partial.revision.assumptions.terms.directPaidDate,undefined);
    assert.deepEqual(partial.text.match(/¿[^?]+\?/g),['¿En qué fecha se pagaron los gastos directos?']);
    const previous=partial.revision.assumptions;
    const dateOnly=resolveChatCommand('los gastos se pagaron el 31/10/2026',
        {action:'update',sourceRevision:1,cashCollectedDate:'2026-11-30'},{previous});
    assert.deepEqual(dateOnly,{action:'update',directPaidDate:'2026-10-31'});
    const after=turn({...fresh(),revisions:[partial.revision]},dateOnly).revision;
    assert.deepEqual(after.assumptions.terms,{...previous.terms,directPaidDate:'2026-10-31'});
    assert.equal(after.evaluation.liquidity.minimum.free,405);
    assert.equal(after.evaluation.settlement.ownResult,15);
});

test('a dated collection closes the trade receivable without changing the price, earlier minimum or result',()=>{
    const chat=fresh();
    turn(chat,simulatedCommand('trade',0));
    const settled=turn(chat,{action:'update',cost:100,direct:5,share:100,inventoryCost:60,cashCollected:40,cashAgency:40,
        cashRestricted:0,cashCollectedDate:'2026-10-31',directPaidDate:'2026-10-31',creditDueDate:'2026-11-30'}).revision;
    turn(chat,{action:'update',clear:'credit'});
    const collect={action:'collect_credit',sourceRevision:settled.number,amount:20,date:'2026-11-30',currency:'ARS'};
    const {revision}=turn(chat,collect);
    assert.deepEqual([revision.evaluation.settlement.creditPrincipal,revision.evaluation.settlement.creditRemaining,
        revision.evaluation.liquidity.minimum.free,revision.evaluation.liquidity.minimum.date,
        revision.evaluation.settlement.ownResult],[20,0,405,'2026-11-25',15]);
    assert.deepEqual(revision.assumptions.flows.map(({amount,date})=>[amount,date]),
        [[40,'2026-10-31'],[-5,'2026-10-31'],[20,'2026-11-30']]);
    const message='cobré los ARS 20 el 30/11/2026';
    const interpreted={...collect,kind:'trade',operationCurrency:'ARS',credit:0};
    const resolved=resolveChatCommand(message,interpreted);
    assert.deepEqual(resolved,{action:'collect_credit',amount:20,date:'2026-11-30',currency:'ARS'});
    const duplicate=turn(chat,resolved);
    assert.equal(duplicate.revision,undefined);
    assert.deepEqual(duplicate.evidence.revision,revision);
    const mixed=message+' y cambiá el precio';
    assert.equal(resolveChatCommand(mixed,interpreted),interpreted);
    assert.throws(()=>turn(chat,{...collect,amount:1,date:'2026-12-01'}),/supera el crédito/);
});
