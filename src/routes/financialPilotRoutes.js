import { raw, Router } from 'express';
import { chatMode, listChats, createChat, getChat, sendChat } from '../services/financialChatStore.js';
import { createFinancialAnalysis } from '../services/financialAnalysisService.js';
import { analysisMode, model } from '../services/financialAnalysisProvider.js';
import { canReadFinancialPilot } from '../utils/adminPermissions.js';
import { financialPilotCatalog, financialPilotReport } from '../services/financialPilotSource.js';
import { verifyTradeWorkbook } from '../services/financialTradeWorkbook.js';
import { verifyWorkbookIntent } from '../services/financialTradeWorkbookIntents.js';
import { answerGeneralChat, maxChatMessage } from '../services/generalAgencyChat.js';
import { officialAgencyAiConfig, officialAgencyAiBudget } from '../services/officialAgencyAiConfig.js';
import { listProposalQuotes, loadQuoteProposal } from '../services/crmQuoteProposal.js';

function pilotEnabled() {
    if (process.env.AUTOSPORTING_FINANCIAL_PILOT !== '1' || process.env.VERCEL === '1') return false;
    try {
        const database = new URL(process.env.MONGODB_URI);
        return database.protocol === 'mongodb:' && database.hostname === '127.0.0.1' &&
            ['/autosporting_mobile_crm_test','/autosporting_financial_pilot_local'].includes(database.pathname) && !database.username && !database.password;
    } catch {
        return false;
    }
}

export function createFinancialPilotRouter({ authenticate }) {
    const router = Router();
    let workbookKey;
    const localRequest = req => ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress) &&
        /^(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(req.headers.host ?? '') &&
        (!req.headers.origin || req.headers.origin === `http://${req.headers.host}`);
    const workbookEnv = () => workbookKey ? {
        AUTOSPORTING_FINANCIAL_AI:'1',AUTOSPORTING_FINANCIAL_AI_MODE:'real',AUTOSPORTING_FINANCIAL_AI_MODEL:model,
        AUTOSPORTING_OPENAI_TEST_KEY:workbookKey,AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR:process.env.AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR
    } : process.env;
    const workbookSetupEnabled = req => localRequest(req) && req.user?.role==='owner' &&
        process.env.FINANCIAL_PILOT_WORKBOOK_SETUP==='1' && Boolean(process.env.AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR);
    const providerOptions = hosted => hosted ? {env:hosted.env,reserve:officialAgencyAiBudget(hosted)} : {env:workbookEnv()};
    const providerReady = hosted => hosted ? hosted.ready : analysisMode(workbookEnv())==='configured';
    router.use((req, res, next) => {
        res.set({ 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' });
        if (pilotEnabled()) return next();
        const hosted = officialAgencyAiConfig();
        const quotePath = req.method==='GET' && /^\/proposals\/quotes(?:\/[a-f0-9]{24})?$/i.test(req.path);
        if (!hosted || req.headers.host!==hosted.origin.host ||
            (req.method==='POST' && req.headers.origin!==hosted.origin.origin) ||
            (!quotePath && !['/','/general-chat'].includes(req.path)))
            return res.status(404).json({ message: 'El piloto financiero está deshabilitado.' });
        res.locals.hostedAgencyAi=hosted;
        next();
    });
    router.use(authenticate, (req, res, next) => (res.locals.hostedAgencyAi ? req.user?.role==='owner' : canReadFinancialPilot(req.user)) ? next() :
        res.status(403).json({ message: 'No tenés permiso para acceder al piloto financiero.' }));
    const analyze = createFinancialAnalysis();
    router.get('/', (req, res) => res.locals.hostedAgencyAi ? res.json({official:true,workbookOpenAiReady:providerReady(res.locals.hostedAgencyAi),generalChatAvailable:true,crmProposalsAvailable:true}) :
        res.json({ ...financialPilotCatalog(), analysisMode:analysisMode(), chatMode:chatMode(),
        workbookOpenAiReady:localRequest(req) && analysisMode(workbookEnv())==='configured',
        generalChatAvailable:localRequest(req) && req.user?.role==='owner',
        crmProposalsAvailable:localRequest(req) && req.user?.role==='owner',
        workbookSetupAvailable:workbookSetupEnabled(req) }));
    const proposalEndpoint = handler => async (req,res) => {
        if (req.user?.role!=='owner' || (!res.locals.hostedAgencyAi && !localRequest(req))) return res.sendStatus(403);
        try { return await handler(req,res); }
        catch { return res.status(503).json({message:'No se pudo consultar la cotización del CRM.'}); }
    };
    router.get('/proposals/quotes',proposalEndpoint(async (_req,res)=>res.json({quotes:await listProposalQuotes()})));
    router.get('/proposals/quotes/:id',proposalEndpoint(async (req,res)=>{
        if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({message:'La cotización no es válida.'});
        const proposal = await loadQuoteProposal(req.params.id);
        return proposal ? res.json(proposal) : res.status(404).json({message:'No se encontró la cotización.'});
    }));
    router.post('/general-chat',async(req,res)=>{
        const hosted = res.locals.hostedAgencyAi;
        if ((!hosted && !localRequest(req)) || req.user?.role!=='owner') return res.status(403).json({message:'El chat general está reservado al propietario.'});
        const {message,history=[]} = req.body ?? {};
        const validText = (value,max) => typeof value==='string' && value.trim().length>0 && value.length<=max;
        if (!validText(message,maxChatMessage) || !Array.isArray(history) || history.length>2 ||
            history.some(turn=>!validText(turn?.message,maxChatMessage) || !validText(turn?.reply,1200)) ||
            Object.keys(req.body).some(key=>!['message','history'].includes(key)))
            return res.status(400).json({message:'Ingresá un mensaje válido de hasta 1500 caracteres.'});
        if (!providerReady(hosted)) return res.status(503).json({message:'Configurá la conexión con OpenAI.'});
        try { return res.json(await answerGeneralChat(message.trim(),history,providerOptions(hosted))); }
        catch (error) { return res.status(error.status ?? 502).json({message:error.status ? error.message : 'No se pudo completar la consulta.'}); }
    });
    router.post('/trade-workbook/connect', (req,res) => {
        if (!workbookSetupEnabled(req)) return res.status(404).json({message:'Configuración local de Excel no disponible.'});
        const key = typeof req.body?.key==='string' ? req.body.key.trim() : '';
        if (!/^sk-[a-zA-Z0-9_-]{16,512}$/.test(key)) return res.status(400).json({message:'Ingresá la clave dedicada de prueba de OpenAI.'});
        const nextEnv = {...workbookEnv(),AUTOSPORTING_FINANCIAL_AI:'1',AUTOSPORTING_FINANCIAL_AI_MODE:'real',
            AUTOSPORTING_FINANCIAL_AI_MODEL:model,AUTOSPORTING_OPENAI_TEST_KEY:key};
        if (analysisMode(nextEnv)!=='configured') return res.status(503).json({message:'El registro de presupuesto local no está disponible.'});
        workbookKey=key;
        return res.json({workbookOpenAiReady:true});
    });
    const workbookBody = raw({type:'application/octet-stream',limit:2_000_000,inflate:false});
    router.post(['/trade-workbook','/trade-workbook/openai'], (req,res,next) => {
        const hosted = res.locals.hostedAgencyAi;
        if (!hosted && !localRequest(req))
            return res.status(404).json({message:'La prueba de Excel está disponible únicamente en el piloto local.'});
        if (req.path.endsWith('/openai') && !providerReady(hosted))
            return res.status(503).json({message:'Configurá la conexión de prueba y el presupuesto del piloto para usar OpenAI.'});
        workbookBody(req,res,error=>error ? res.status(error.status ?? 400).json({message:'Seleccioná un archivo Excel de hasta 2 MB.'}) : next());
    }, async (req,res) => {
        let result;
        try { result = verifyTradeWorkbook(req.body); }
        catch (error) {
            const message = error.code === 'ERR_ASSERTION' ? error.message : 'No se pudo verificar el archivo. Seleccioná una copia válida de la plantilla de permuta.';
            return res.status(400).json({message});
        }
        if (!req.path.endsWith('/openai')) return res.json(result);
        try {
            const options = providerOptions(res.locals.hostedAgencyAi);
            await verifyWorkbookIntent('update',options);
            await verifyWorkbookIntent('collect_credit',options);
            return res.json({...result,model});
        } catch (error) {
            return res.status(error.status ?? 502).json({message:error.status ? error.message : 'No se pudo verificar la interpretación con OpenAI.'});
        }
    });
    router.post('/analysis', async (req,res) => {
        try { return res.json(await analyze(req.body,req.user)); }
        catch (error) { return res.status(error.status ?? 500).json({message:error.status ? error.message : 'No se pudo verificar el análisis.'}); }
    });
    const chatEndpoint = handler => async (req,res) => {
        if (chatMode()==='disabled') return res.status(404).json({message:'Chat deshabilitado.'});
        try { return res.json(await handler(req)); }
        catch (error) { return res.status(error.status ?? 500).json({message:error.status ? error.message : 'No se pudo completar el turno. El cierre sigue disponible.'}); }
    };
    router.get('/chats',chatEndpoint(req=>listChats(req.user.id)));
    router.post('/chats',chatEndpoint(req=>createChat(req.user.id,req.body,{seedFromSimulation:true})));
    router.get('/chats/:id',chatEndpoint(req=>getChat(req.user.id,req.params.id)));
    router.post('/chats/:id/messages',chatEndpoint(req=>sendChat(req.user.id,req.params.id,req.body)));
    router.post('/calculate', (req, res) => {
        const body = req.body;
        if (!body || typeof body !== 'object' || Array.isArray(body) ||
            Object.keys(body).some(key => !['sampleId', 'variant', 'scenario', 'purchase'].includes(key))) {
            return res.status(400).json({ message: 'El piloto solo admite muestras y parámetros de simulación.' });
        }
        try { return res.json(financialPilotReport(body)); }
        catch (error) { return res.status(error.status ?? 500).json({ message: error.status ? error.message : 'No se pudo recalcular la muestra.' }); }
    });
    return router;
}
