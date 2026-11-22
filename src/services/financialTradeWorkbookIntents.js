import {openAiAnalysis} from './financialAnalysisProvider.js';

const messages = Object.freeze({
    update:'Cargá la permuta del archivo local.',
    collect_credit:'Aplicá el cobro reservado.'
});
export const workbookIntentSchema = {type:'object',additionalProperties:false,required:['action'],properties:{
    action:{type:'string',enum:['update','collect_credit','clarify']}
}};
export const workbookIntentPrompt = 'Clasificá la intención de este chat de permutas: update carga los términos iniciales, collect_credit aplica un cobro y clarify indica que no hay una acción clara. Solo devolvé la acción.';

export async function verifyWorkbookIntent(action, options) {
    if (!Object.hasOwn(messages,action)) throw new Error('Acción de Excel inválida.');
    const response = await openAiAnalysis({...options,input:{message:messages[action]},schema:workbookIntentSchema,systemPrompt:workbookIntentPrompt});
    if (Object.keys(response.selection ?? {}).length!==1 || response.selection.action!==action) {
        throw Object.assign(new Error('OpenAI no reconoció la acción esperada. Repetí la prueba o usá la prueba local.'),{status:502});
    }
    return response.model;
}
