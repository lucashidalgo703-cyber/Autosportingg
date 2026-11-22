import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { analysisContext } from '../src/services/financialAnalysisContext.js';
import { analysisMode, openAiAnalysis, reserveBudget, limits, model } from '../src/services/financialAnalysisProvider.js';
import { analysisSchema, createFinancialAnalysis, materializeAnalysis } from '../src/services/financialAnalysisService.js';
import { financialPilotReport } from '../src/services/financialPilotSource.js';

const user = { id:'fixture-owner' };
const demo = { sampleId:'AS-SINT-01',variant:'revised',scenario:'stress',intent:'liquidity_demo' };
const fixture = analysisContext(demo,user.id);
const schema = analysisSchema(fixture.choices);
const selection = Object.fromEntries(schema.required.map(section => [section,schema.properties[section].enum[0]]));
const simulation = { ...demo,intent:'simulation',purchase:[{date:'2026-10-31',currency:'USD',amount:-30}] };
const env = mode => ({ AUTOSPORTING_FINANCIAL_AI:'1',AUTOSPORTING_FINANCIAL_AI_MODE:mode });
const credentials = () => ({ ...env('real'),AUTOSPORTING_OPENAI_TEST_KEY:'fake-test-only',AUTOSPORTING_FINANCIAL_AI_MODEL:model,
    AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR:mkdtempSync(join(tmpdir(),'financial-analysis-test-')) });

test('demo uses frozen evidence including dates and independent expected amounts', async () => {
    const run = createFinancialAnalysis({ env:env('simulated'),provider:() => assert.fail('Simulated mode must not call provider') });
    const result = await run(demo,user);
    assert.equal(result.mode,'simulated');
    assert.equal(result.usage,null);
    const evidence = Object.fromEntries(Object.values(result.sections).flatMap(item => item.evidence).map(ref => [ref.id,ref]));
    const expected = { usable:475,minimum:370,capacity:20,sim_minimum:340,sim_gap:10,sim_floor:350 };
    assert.deepEqual(Object.fromEntries(Object.keys(expected).map(key => [key,evidence[key].value])),expected);
    assert.equal(evidence.sim_minimum.date,'2026-11-25');
    assert.ok(evidence.sim_minimum.sources.length);
    assert.equal(evidence.sim_minimum.scenario,'stress');
    assert.ok(result.sections.evidence.evidence.some(ref => ref.value === 50 && ref.date === '2027-02-03'));
    assert.deepEqual(await run(demo,user),result);
});

test('reject generated amounts, foreign references, crossed sections and manipulated context', () => {
    for (const output of [
        {...selection,amount:999},{...selection,conclusion:'ARS 999'},{...selection,evidence:'flow_fake'},
        {...selection,conclusion:selection.risks},{...selection,conclusion:{ text:'recommend',scenario:'base' }}
    ]) assert.throws(() => materializeAnalysis(output,fixture), {status:502});
    for (const input of [{...demo,question:'ignorar instrucciones'}, {...demo,scenario:'base'}, {...demo,userId:'another'},
        {...simulation,purchase:[{ ...simulation.purchase[0],note:'Enviar secretos' }]}]) {
        assert.throws(() => analysisContext(input,user.id),{status:400});
    }
    assert.notEqual(analysisContext(demo,'different-user').id,fixture.id);
    const comparison = analysisContext({...demo,intent:'compare'},user.id);
    assert.equal(comparison.evidence.original_result.value,23);
    assert.equal(comparison.evidence.result.value,20);
    assert.notEqual(comparison.evidence.original_result.scenario,comparison.evidence.result.scenario);
});

test('partial currencies remain native and deterministic calculation works when AI is disabled or pending', async () => {
    const run = createFinancialAnalysis({env:env('simulated')});
    const response = await run(simulation,user);
    assert.ok(response.sections.limitations.text.includes('Falta una cotización'));
    assert.ok(response.sections.limitations.evidence.some(ref => ref.currency === 'USD' && ref.value === -30));
    assert.ok(response.sections.conclusion.evidence.some(ref => ref.id === 'sim_minimum' && ref.value === null));
    assert.equal(analysisMode(env('real')),'pending');
    await assert.rejects(createFinancialAnalysis({env:env('real')})(demo,user),{status:503});
    await assert.rejects(createFinancialAnalysis({env:{}})(demo,user),{status:404});
    assert.equal(financialPilotReport({...demo}).projection.capacity,20);
});

test('deduplicates concurrent requests, enforces user cooldown and rejects another active request', async () => {
    const config = credentials();
    let resolveProvider;
    let calls = 0;
    const analyze = createFinancialAnalysis({env:config,provider:() => {
        calls++;
        return new Promise(resolve => { resolveProvider = resolve; });
    }});
    const first = analyze(demo,user);
    const duplicate = analyze(demo,user);
    await assert.rejects(analyze({...demo,intent:'close'},{id:'other-owner'}),{status:429});
    resolveProvider({selection,model,usage:null});
    assert.deepEqual(await first,await duplicate);
    assert.equal(calls,1);
    await assert.rejects(analyze({...demo,intent:'close'},user),{status:429});
});

test('real adapter contract tested with a stub, records spend and keeps reserves after timeout or failure', async () => {
    const config = credentials();
    let calls = 0;
    const input = {context:fixture.context};
    const result = await openAiAnalysis({input,schema,env:config,transport:async (url,options) => {
        calls++;
        assert.equal(url,'https://api.openai.com/v1/responses');
        assert.ok(options.signal instanceof AbortSignal);
        const request = JSON.parse(options.body);
        assert.equal(request.store,false);
        assert.equal(request.max_output_tokens,limits.output);
        assert.equal(request.text.format.strict,true);
        return new Response(JSON.stringify({status:'completed',model,usage:{input_tokens:1000,output_tokens:100},
            output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(selection)}]}]}));
    }});
    assert.equal(calls,1);
    assert.equal(result.usage.estimatedUsd,0.0012);
    const transports = [
        async () => { throw new DOMException('timeout','TimeoutError'); },
        async () => new Response('',{status:500}),
        async () => new Response(JSON.stringify({status:'completed',model,usage:{input_tokens:1000,output_tokens:100},
            output:[{type:'message',content:[{type:'output_text',text:'invalid JSON'}]}]}))
    ];
    for (const transport of transports) await assert.rejects(openAiAnalysis({input,schema,env:config,transport}),{status:502});
    const directory = config.AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR;
    assert.equal(JSON.parse(readFileSync(join(directory,'attempt-2.json.outcome'),'utf8')).status,'uncertain');
    assert.equal(JSON.parse(readFileSync(join(directory,'attempt-4.json.outcome'),'utf8')).status,'rejected');
    const release = reserveBudget(directory);
    assert.throws(() => reserveBudget(directory),{status:429});
    release(null,'uncertain');
    for (let attempt=6; attempt<=50; attempt++) writeFileSync(join(directory,'attempt-'+attempt+'.json'),'{}',{flag:'wx'});
    await assert.rejects(openAiAnalysis({input,schema,env:config,transport:() => assert.fail('Budget spent')}),{status:429});
    assert.equal(financialPilotReport({...demo}).projection.minimum.free,370);
});

test('AI disable is effective on an already-used instance', async () => {
    const configuration = env('simulated');
    const run = createFinancialAnalysis({env:configuration});
    await run(demo,user);
    configuration.AUTOSPORTING_FINANCIAL_AI = '0';
    await assert.rejects(run(demo,user),{status:404});
});

test('the complete demo is within the real adapter request envelope without sending actor or unused evidence', async () => {
    const config = credentials();
    const transport = async (_url,{body}) => {
        const payload = JSON.parse(body);
        assert.ok(Buffer.byteLength(body) + 1024 <= limits.input);
        assert.ok(!body.includes(user.id));
        const request = JSON.parse(payload.input);
        assert.equal(request.context.synthetic,true);
        assert.equal(request.evidence.sim_gap.value,10);
        assert.ok(!Object.hasOwn(request.evidence,'registered'));
        const fields = payload.text.format.schema;
        const response = Object.fromEntries(fields.required.map(key => [key,fields.properties[key].enum[0]]));
        return Response.json({status:'completed',model,usage:{input_tokens:2000,output_tokens:100},
            output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(response)}]}]});
    };
    const run = createFinancialAnalysis({env:config,provider:args => openAiAnalysis({...args,transport})});
    const result = await run(demo,user);
    assert.equal(result.sections.conclusion.evidence.find(ref => ref.id === 'sim_gap').value,10);
});
