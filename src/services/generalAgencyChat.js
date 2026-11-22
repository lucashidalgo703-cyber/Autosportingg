import {openAiAnalysis} from './financialAnalysisProvider.js';

export const maxChatMessage = 1500;
const schema = {type:'object',additionalProperties:false,required:['reply'],properties:{reply:{type:'string'}}};
const systemPrompt = 'Sos el asistente general de AutoSporting AI. Respondé en español salvo pedido contrario. Ayudá a redactar, resumir texto aportado y resolver consultas generales. Tus respuestas se muestran como texto. No tenés acceso al CRM, a archivos, a Internet ni al motor financiero. No inventes accesos, resultados financieros ni acciones realizadas. Si faltan datos esenciales, preguntá.';

export async function answerGeneralChat(message, history, options) {
    const result = await openAiAnalysis({...options,schema,systemPrompt,input:{
        message, history:history.slice(-2).map(({message:previous,reply})=>({message:previous,reply:reply.slice(0,1200)}))
    }});
    const reply = result.selection?.reply;
    if (typeof reply!=='string' || !reply.trim()) {
        throw Object.assign(new Error('OpenAI no devolvió una respuesta de chat válida.'),{status:502});
    }
    return {reply,model:result.model};
}
