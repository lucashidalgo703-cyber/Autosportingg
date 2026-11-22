import { analysisContext } from './financialAnalysisContext.js';
import { analysisMode, openAiAnalysis } from './financialAnalysisProvider.js';
import { promptVersion } from './financialAnalysisPrompt.js';

const sections = ['conclusion','evidence','risks','alternatives','limitations','nextStep'];
const failure = (message,status) => Object.assign(new Error(message),{status});
const rejected = () => failure('El análisis no coincide con la evidencia seleccionada. El cierre sigue disponible.',502);

export function analysisSchema(choices) {
    return { type:'object', additionalProperties:false, required:sections, properties:Object.fromEntries(sections.map(section =>
        [section,{type:'string',enum:Object.keys(choices).filter(id => choices[id].section === section)}])) };
}

export function materializeAnalysis(selection, context) {
    if (!selection || typeof selection !== 'object' || Array.isArray(selection) ||
        Object.keys(selection).length !== sections.length) throw rejected();
    return Object.fromEntries(sections.map(section => {
        const id = selection[section];
        if (typeof id !== 'string' || !Object.hasOwn(context.choices,id)) throw rejected();
        const choice = context.choices[id];
        if (choice.section !== section || choice.refs.some(ref => !Object.hasOwn(context.evidence,ref))) throw rejected();
        return [section,{text:choice.text,evidence:choice.refs.map(id => ({ id,...context.evidence[id] }))}];
    }));
}

export function createFinancialAnalysis({ provider = openAiAnalysis, env = process.env, clock = Date.now } = {}) {
    const active = new Map(), cached = new Map(), lastAttempt = new Map();
    return async function analyze(input,user) {
        const mode = analysisMode(env);
        if (mode === 'disabled') throw failure('El análisis con IA está deshabilitado.',404);
        if (mode === 'pending') throw failure('IA pendiente de conexión.',503);
        const actor = user?.id;
        const resolved = analysisContext(input,actor);
        const moment = clock();
        for (const [key,value] of cached) if (value.until <= moment) cached.delete(key);
        for (const [key,value] of lastAttempt) if (value <= moment) lastAttempt.delete(key);
        const key = mode + ':' + resolved.id;
        if (cached.has(key)) return cached.get(key).result;
        if (active.has(key)) return active.get(key);
        if (active.size || lastAttempt.has(actor)) throw failure('Hay un análisis en curso o la solicitud es demasiado reciente.',429);
        lastAttempt.set(actor,moment + 5000);
        const work = Promise.resolve().then(async () => {
            const schema = analysisSchema(resolved.choices);
            const usedRefs = new Set(Object.values(resolved.choices).flatMap(choice => choice.refs));
            const evidence = Object.fromEntries(Object.entries(resolved.evidence).filter(([id]) => usedRefs.has(id)).map(([id,e]) =>
                [id,{label:e.label,value:e.value,currency:e.currency,date:e.date,quality:e.quality,scenario:e.scenario}]));
            const result = mode === 'simulated' ? { selection:Object.fromEntries(sections.map(section => [section,schema.properties[section].enum[0]])),
                model:null,usage:null } : await provider({ input:{context:resolved.context,evidence,choices:resolved.choices},schema,env });
            const report = { id:resolved.id,context:resolved.context,promptVersion,model:result.model,usage:result.usage,mode:mode === 'simulated' ? mode : 'real',
                sections:materializeAnalysis(result.selection,resolved) };
            if (cached.size >= 40) cached.delete(cached.keys().next().value);
            cached.set(key,{until:clock()+300000,result:report});
            return report;
        });
        active.set(key,work);
        try { return await work; }
        finally { active.delete(key); }
    };
}
