import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { instructions } from './financialAnalysisPrompt.js';

export const model = 'gpt-5.4-mini-2026-03-17';
const prices = { input:0.75, output:4.5 }; // USD per million, standard tier, verified 2026-11-22.
export const limits = { total:1, perAnalysis:0.10, reservation:0.02, input:16384, output:700, timeoutMs:20000, calls:1 };
const estimatedUsd = (inputTokens,outputTokens) => (inputTokens*prices.input + outputTokens*prices.output)/1e6;
export const maxEstimatedUsd = estimatedUsd(limits.input,limits.output);
const slots = Math.floor(limits.total / limits.reservation);
const configuration = 'Configurar la clave dedicada de prueba, el modelo tarifado y el directorio persistente de presupuesto.';
const failure = (message, status = 503) => Object.assign(new Error(message), { status });

export function analysisMode(env = process.env) {
    if (env.AUTOSPORTING_FINANCIAL_AI !== '1') return 'disabled';
    if (env.AUTOSPORTING_FINANCIAL_AI_MODE === 'simulated') return 'simulated';
    if (env.AUTOSPORTING_FINANCIAL_AI_MODE === 'real' && env.AUTOSPORTING_OPENAI_TEST_KEY?.trim() &&
        env.AUTOSPORTING_FINANCIAL_AI_MODEL === model && env.AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR &&
        isAbsolute(env.AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR) && existsSync(env.AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR)) return 'configured';
    return 'pending';
}

export function reserveBudget(directory) {
    const lockPath = join(directory, 'execution.lock');
    let lock;
    try { lock = openSync(lockPath, 'wx'); }
    catch { throw failure('Presupuesto local ocupado o inaccesible.',429); }
    let reserved;
    try {
        for (let attempt = 1; attempt <= slots; attempt++) {
            const path = join(directory, 'attempt-' + attempt + '.json');
            try {
                writeFileSync(path, JSON.stringify({attempt,model,status:'reserved',reservation:limits.reservation,at:new Date().toISOString()}),
                    {flag:'wx',flush:true});
                reserved = { attempt, path };
                break;
            } catch (error) { if (error.code !== 'EEXIST') throw error; }
        }
        if (!reserved) throw failure('Se agotó el presupuesto acumulado de esta etapa.',429);
    } catch (error) {
        closeSync(lock);
        unlinkSync(lockPath);
        throw error;
    }
    return (usage,status,diagnostic) => {
        try {
            // The occupied slot remains charged at its full estimate, including failures and process restarts.
            const initial = JSON.parse(readFileSync(reserved.path,'utf8'));
            writeFileSync(reserved.path + '.outcome', JSON.stringify({...initial,usage,status,...(diagnostic ? {diagnostic} : {})}),{flag:'wx',flush:true});
        } finally { closeSync(lock); unlinkSync(lockPath); }
    };
}

export async function openAiAnalysis({ input, schema, env = process.env, transport = fetch, systemPrompt = instructions, reserve }) {
    const configured = reserve ? env.AUTOSPORTING_OPENAI_TEST_KEY?.trim() && env.AUTOSPORTING_FINANCIAL_AI_MODEL===model :
        analysisMode(env)==='configured';
    if (!configured) throw failure(configuration);
    const body = JSON.stringify({ model, store:false, service_tier:'default', reasoning:{effort:'none'},
        instructions:systemPrompt, input: JSON.stringify(input), max_output_tokens:limits.output,
        text:{format:{type:'json_schema',name:'financial_analysis',strict:true,schema}} });
    // UTF-8 bytes bound text tokens conservatively, including the schema; reserve extra for framing.
    if (Buffer.byteLength(body) + 1024 > limits.input ||
        maxEstimatedUsd > limits.reservation ||
        limits.reservation > limits.perAnalysis) throw failure('La solicitud excede el límite de entrada o costo.',400);
    const finish = reserve ? await reserve() : reserveBudget(env.AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR);
    let usage = null, status = 'uncertain', diagnostic;
    try {
        const response = await transport('https://api.openai.com/v1/responses', {
            method:'POST', redirect:'error', signal:AbortSignal.timeout(limits.timeoutMs),
            headers:{Authorization:'Bearer ' + env.AUTOSPORTING_OPENAI_TEST_KEY.trim(),'Content-Type':'application/json'}, body
        });
        if (!response.ok) {
            diagnostic = { httpStatus: response.status };
            throw new Error('Respuesta HTTP del proveedor');
        }
        const data = await response.json();
        const tokens = data.usage;
        if (Number.isSafeInteger(tokens?.input_tokens) && tokens.input_tokens >= 0 &&
            Number.isSafeInteger(tokens.output_tokens) && tokens.output_tokens >= 0) {
            usage = { inputTokens:tokens.input_tokens,outputTokens:tokens.output_tokens,
                estimatedUsd:estimatedUsd(tokens.input_tokens,tokens.output_tokens) };
        }
        if (!usage || usage.inputTokens > limits.input || usage.outputTokens > limits.output) throw new Error('Uso fuera de límites');
        status = 'rejected';
        if (data.status !== 'completed' || data.model !== model) throw new Error('Respuesta incompleta o modelo inesperado');
        const blocks = (data.output ?? []).flatMap(item => item.type === 'message' ? item.content : []);
        if (blocks.length !== 1 || blocks[0].type !== 'output_text') throw new Error('Salida inesperada');
        const selection = JSON.parse(blocks[0].text);
        status = 'received';
        return { selection, model, usage };
    } catch (error) {
        if (diagnostic?.httpStatus) {
            const explanations = {
                400: 'La API rechazó la solicitud.',
                401: 'La API rechazó la credencial.',
                403: 'La API denegó el acceso.',
                404: 'La API no encontró el modelo o recurso solicitado.',
                429: 'La API indicó un límite de cuota o frecuencia.'
            };
            const detail = explanations[diagnostic.httpStatus] ?? 'La API devolvió un error.';
            throw failure(detail + ' HTTP ' + diagnostic.httpStatus + '. El cierre sigue disponible.',502);
        }
        if (error instanceof TypeError) {
            diagnostic = { category: 'transport' };
            throw failure('No se pudo establecer la conexión con OpenAI. El cierre sigue disponible.',502);
        }
        throw failure(error.name === 'TimeoutError' || error.name === 'AbortError' ?
            'El proveedor excedió el tiempo de espera. El cierre sigue disponible.' :
            'No fue posible verificar la respuesta del proveedor. El cierre sigue disponible.',502);
    } finally { await finish(usage,status,diagnostic); }
}
