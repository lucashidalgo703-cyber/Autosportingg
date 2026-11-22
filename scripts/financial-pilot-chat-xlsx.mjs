import assert from 'node:assert/strict';
import {mkdtempSync, readdirSync, rmdirSync, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readTradeWorkbook} from './financial-pilot-check-trade-xlsx.mjs';
import {model} from '../src/services/financialAnalysisProvider.js';
import {prepareTradeWorkbook, evaluateWorkbookTurn} from '../src/services/financialTradeWorkbook.js';
import {verifyWorkbookIntent, workbookIntentSchema, workbookIntentPrompt} from '../src/services/financialTradeWorkbookIntents.js';

const [filename, mode] = process.argv.slice(2);
if (!filename || !['--verify-payload','--real'].includes(mode)) {
    throw new Error('Indicá el Excel local y elegí --verify-payload o --real.');
}
const data = prepareTradeWorkbook(readTradeWorkbook(filename));
const verifying = mode==='--verify-payload';
const sandboxBudget = verifying ? mkdtempSync(join(tmpdir(),'autosporting-xlsx-budget-')) : null;
const env = {AUTOSPORTING_FINANCIAL_AI:'1',AUTOSPORTING_FINANCIAL_AI_MODE:'real',AUTOSPORTING_FINANCIAL_AI_MODEL:model,
    AUTOSPORTING_OPENAI_TEST_KEY:verifying ? 'fixture-no-network' : process.env.AUTOSPORTING_OPENAI_TEST_KEY,
    AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR:verifying ? sandboxBudget : process.env.AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR};
const chat = {context:{source:'Excel local'},revisions:[]};
try {
    for (const [index,[command,message]] of [[data.initial,'Cargá la permuta del archivo local.'],
        [data.collection,'Aplicá el cobro reservado.']].entries()) {
        // The provider receives the fixed intent only. Workbook values never enter its request.
        const transport = verifying ? async (url,{body})=>{
            assert.equal(url,'https://api.openai.com/v1/responses');
            const sent = JSON.parse(body);
            assert.deepEqual(sent,{model,store:false,service_tier:'default',reasoning:{effort:'none'},instructions:workbookIntentPrompt,
                input:JSON.stringify({message}),max_output_tokens:700,text:{format:{type:'json_schema',name:'financial_analysis',strict:true,schema:workbookIntentSchema}}});
            return Response.json({status:'completed',model,output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({action:command.action})}]}],
                usage:{input_tokens:100,output_tokens:10}});
        } : undefined;
        await verifyWorkbookIntent(command.action,{env,transport});
        const actual = evaluateWorkbookTurn(chat, data, command, index);
        console.log(`${index===0 ? 'Antes' : 'Después'} del cobro · saldo ${data.initial.operationCurrency} ${actual[0]} · mínimo ${actual[1]} (${actual[2]}) · agencia ${actual[3]}`);
    }
    console.log(verifying ? 'Carga de Excel y cuerpo de OpenAI verificados con transporte simulado, sin red.' : `Interpretación de intenciones verificada con ${model}. El Excel se procesó localmente.`);
} finally {
    if (sandboxBudget) {
        for (const file of readdirSync(sandboxBudget)) unlinkSync(join(sandboxBudget,file));
        rmdirSync(sandboxBudget);
    }
}
