import {randomUUID} from 'node:crypto';
import mongoose from 'mongoose';
import {limits,model} from './financialAnalysisProvider.js';

const reservationCents = Math.round(limits.reservation*100);
const budgetId = 'autosporting-ai-official-v1';

export function officialAgencyAiConfig(env=process.env) {
    if (env.AUTOSPORTING_AI_OFFICIAL!=='1') return null;
    try {
        const origin = new URL(env.AUTOSPORTING_AI_OFFICIAL_ORIGIN);
        if (origin.protocol!=='https:' || origin.origin!==env.AUTOSPORTING_AI_OFFICIAL_ORIGIN) return null;
        const limitCents = Number(env.AUTOSPORTING_AI_OFFICIAL_BUDGET_CENTS);
        const ready = Number.isSafeInteger(limitCents) && limitCents>=reservationCents &&
            Boolean(env.AUTOSPORTING_AI_OFFICIAL_OPENAI_KEY?.trim());
        return {origin,ready,limitCents,env:{AUTOSPORTING_OPENAI_TEST_KEY:env.AUTOSPORTING_AI_OFFICIAL_OPENAI_KEY,
            AUTOSPORTING_FINANCIAL_AI_MODEL:model}};
    } catch { return null; }
}

export function officialAgencyAiBudget(config, database=mongoose.connection.db) {
    return async () => {
        if (!config.ready || !database) throw Object.assign(new Error('Presupuesto oficial de AutoSporting AI no disponible.'),{status:503});
        const budgets=database.collection('autosporting_ai_budgets');
        const attempts=database.collection('autosporting_ai_attempts');
        try { await budgets.updateOne({_id:budgetId},{$setOnInsert:{reservedCents:0}},{upsert:true}); }
        catch (error) { if (error.code!==11000) throw error; }
        const reservation=await budgets.updateOne({_id:budgetId,reservedCents:{$lte:config.limitCents-reservationCents}},
            {$inc:{reservedCents:reservationCents},$set:{updatedAt:new Date()}});
        if (!reservation.modifiedCount) throw Object.assign(new Error('Se alcanzó el presupuesto configurado de AutoSporting AI.'),{status:429});
        const id=randomUUID();
        await attempts.insertOne({_id:id,budgetId,reservationCents,model,status:'reserved',at:new Date()});
        return async (usage,status,diagnostic)=>{
            await attempts.updateOne({_id:id},{$set:{usage,status,diagnostic:diagnostic ?? null,completedAt:new Date()}});
        };
    };
}
