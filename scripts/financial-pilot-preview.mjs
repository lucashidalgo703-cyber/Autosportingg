import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { persistentPilotStorage, seedFinancialPilotUser } from './financial-pilot-storage.mjs';
import { bootIsolatedReplica } from '../tests/integration/isolatedReplicaHarness.js';

const mode = process.argv[2] ?? '--api';
if (!['--api', '--browser', '--serve', '--verify-trade'].includes(mode)) throw new Error('Usá --api, --browser, --serve o --verify-trade.');
if (mode === '--verify-trade' && (process.env.FINANCIAL_PILOT_AI_MODE !== 'real' ||
    process.env.FINANCIAL_PILOT_CHAT !== '1' || !process.env.AUTOSPORTING_OPENAI_TEST_KEY?.trim())) {
    throw new Error('La verificación requiere el chat real del piloto y la clave de prueba cargada en esta terminal.');
}
const host = '127.0.0.1';
const port = Number(process.env.FINANCIAL_PILOT_PORT || 3240);
assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);

for (const key of Object.keys(process.env)) {
    if (/^(?:OPENAI|ANTHROPIC|CLOUDINARY|SMTP|WHATSAPP|MONGODB|REDIS|VERCEL|GMAIL|INFOAUTO|NEXT_PUBLIC|SENTRY)_/i.test(key))
        delete process.env[key];
}
Object.assign(process.env, { AUTOSPORTING_FINANCIAL_PILOT:'1', NEXT_PUBLIC_AUTOSPORTING_FINANCIAL_PILOT:'1',
    AUTOSPORTING_FINANCIAL_CHAT:process.env.FINANCIAL_PILOT_CHAT === '1' ? '1' : '0',
    AUTOSPORTING_FINANCIAL_AI:process.env.FINANCIAL_PILOT_AI_MODE ? '1' : '0',
    AUTOSPORTING_FINANCIAL_AI_MODE:process.env.FINANCIAL_PILOT_AI_MODE ?? '',
    NEXT_PUBLIC_API_URL:'http://' + host + ':' + port, NEXT_TELEMETRY_DISABLED:'1', ENABLE_DAILY_SUMMARY_SCHEDULER:'false' });
const storageMode=process.env.FINANCIAL_PILOT_STORAGE ?? 'disposable';
if (!['disposable','persistent'].includes(storageMode)) throw new Error('Modo de almacenamiento desconocido.');
const persistent=storageMode==='persistent' ?
    persistentPilotStorage(process.env.FINANCIAL_PILOT_DATA_DIR ?? '',Number(process.env.FINANCIAL_PILOT_MONGO_PORT || 32529)) : null;
const isolated = await bootIsolatedReplica({listen:false,persistent});
let server, nextApp, browser;
try {
    const createSession = (await import('../src/services/authSessionService.js')).createLoginSession;
    const identities = await Promise.all([
        ['owner', 'owner', []],
        ['seller', 'ventas', ['financialPilot.read']],
        ['admin', 'admin', []],
        ['authorized', 'admin', ['financialPilot.read']]
    ].map(async ([name, role, permissions]) => {
        const user = await seedFinancialPilotUser(isolated.models.AdminUser,{ name,
            passwordHash:crypto.randomBytes(32).toString('hex'), role, permissions });
        return [name, { session:await createSession(user), id:String(user._id) }];
    }));
    const users = Object.fromEntries(identities);
    assert.equal(new URL(process.env.MONGODB_URI).hostname, host);
    const web = mode === '--browser' || mode === '--serve';
    if (web) {
        process.env.NODE_ENV = 'development';
        const next = (await import('next')).default;
        nextApp = next({ dev:true, webpack:true, hostname:host, port });
        await nextApp.prepare();
    }
    const handler = nextApp?.getRequestHandler();
    const api = '/api/admin/autosporting-ai';
    let browserTicket = mode==='--serve' && storageMode==='disposable' && process.env.FINANCIAL_PILOT_BROWSER_TICKET==='1' ?
        crypto.randomBytes(32).toString('hex') : null;
    const ticketDeadline = Date.now()+180_000;
    server = http.createServer((req, res) => {
        const pathname = new URL(req.url, 'http://' + host).pathname;
        if (pathname.startsWith('/__pilot-session/')) {
            const ticket = pathname.slice('/__pilot-session/'.length);
            if (req.method!=='GET' || req.socket.remoteAddress!==host || req.headers.host!==host+':'+port ||
                !browserTicket || Date.now()>ticketDeadline || ticket.length!==browserTicket.length ||
                !/^[0-9a-f]{64}$/.test(ticket) || !crypto.timingSafeEqual(Buffer.from(ticket),Buffer.from(browserTicket))) {
                res.writeHead(404).end();
                return;
            }
            browserTicket=null;
            const nonce=crypto.randomBytes(18).toString('base64');
            const {session,id}=users.owner;
            res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
                'Referrer-Policy':'no-referrer','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'`});
            res.end(`<!doctype html><title>Piloto local</title><script nonce="${nonce}">localStorage.setItem('token',${JSON.stringify(session.token)});localStorage.setItem(${JSON.stringify('autosporting_tour_seen_'+id)},'true');location.replace('/admin/autosporting-ai');</script>`);
            return;
        }
        const chatPath = /^\/api\/admin\/autosporting-ai\/chats(?:\/[0-9a-f-]{36}(?:\/messages)?)?$/i.test(pathname);
        const proposalPath = /^\/api\/admin\/autosporting-ai\/proposals\/quotes(?:\/[a-f0-9]{24})?$/i.test(pathname);
        if (chatPath && ['GET','POST'].includes(req.method)) return isolated.app(req,res);
        if (proposalPath && req.method==='GET') return isolated.app(req,res);
        if ((req.method === 'GET' && (pathname === api || /^\/api\/admin\/(auth\/me|settings)$/.test(pathname))) ||
            (req.method === 'POST' && [api + '/calculate',api + '/analysis',api + '/general-chat',api + '/trade-workbook',api + '/trade-workbook/openai',api + '/trade-workbook/connect'].includes(pathname)))
            return isolated.app(req,res);
        if (pathname.startsWith('/api/') || !handler) { res.writeHead(404); res.end(); return; }
        void handler(req,res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end('Error de vista previa.'); });
    });
    server.listen(web ? port : 0, host);
    await once(server,'listening');
    const base = 'http://' + host + ':' + server.address().port;
    if (browserTicket) console.log('Abrir sesión local una vez: '+base+'/__pilot-session/'+browserTicket);
    const payload = { sampleId:'AS-SINT-01',variant:'original',scenario:'base' };
    const call = (route = '', identity, body) => fetch(base + api + route, {
        method:body ? 'POST' : 'GET',
        headers:{ ...(identity ? { Authorization:'Bearer ' + users[identity].session.token } : {}), ...(body ? { 'Content-Type':'application/json' } : {}) },
        ...(body ? { body:JSON.stringify(body) } : {})
    });

    assert.equal((await call()).status,401);
    assert.equal((await call('', 'seller')).status,403);
    assert.equal((await call('/calculate?role=owner','seller',{ ...payload,role:'owner' })).status,403);
    assert.equal((await call('', 'admin')).status,403);
    assert.equal((await call('', 'authorized')).status,200);
    const generalInput={message:'Redactá un saludo para un cliente ficticio.'};
    assert.equal((await call('/general-chat',null,generalInput)).status,401);
    assert.equal((await call('/general-chat','authorized',generalInput)).status,403);
    assert.equal((await call('/general-chat','owner',{...generalInput,excel:'archivo'})).status,400);
    if (process.env.FINANCIAL_PILOT_AI_MODE!=='real') assert.equal((await call('/general-chat','owner',generalInput)).status,503);
    assert.equal((await call('/proposals/quotes','authorized')).status,403);
    assert.equal((await call('/proposals/quotes','owner')).status,200);
    if (mode==='--api') {
        const {default:Quote} = await import('../src/models/Quote.js');
        const {default:Car} = await import('../src/models/Car.js');
        const {insertedId:vehicleId} = await Car.collection.insertOne({agencyOwned:true,purchasePrice:12000,purchaseCurrency:'USD'});
        const {insertedId:quoteId} = await Quote.collection.insertOne({quoteNumber:999001,vehicleId,price:15000,
            currency:'USD',tradeIn:{value:6000,currency:'USD'},status:'enviada',notes:'Texto ficticio excluido de la propuesta'});
        const listed = await (await call('/proposals/quotes','owner')).json();
        assert.ok(listed.quotes.some(quote=>quote.id===String(quoteId) && quote.quoteNumber===999001));
        const response = await call('/proposals/quotes/'+quoteId,'owner');
        assert.equal(response.status,200);
        const proposal = await response.json();
        assert.equal(proposal.remaining,9000);
        assert.equal(proposal.marginBeforeExpenses,3000);
        assert.equal(Object.hasOwn(proposal,'notes'),false);
        console.log('OK: propuesta leída de cotización y stock del CRM aislado, sin Excel ni OpenAI.');
    }
    assert.equal((await call('/calculate','owner',{ ...payload,sampleId:'production' })).status,400);
    assert.equal((await call('/calculate','owner',{ ...payload,entries:[] })).status,400);
    const original = await call('/calculate','owner',payload);
    assert.equal(original.status,200);
    assert.equal((await original.json()).projection.capacity,73);
    process.env.AUTOSPORTING_FINANCIAL_PILOT = '0';
    assert.equal((await call('', 'owner')).status,404);
    process.env.AUTOSPORTING_FINANCIAL_PILOT = '1';
    const analysisInput = { sampleId:payload.sampleId,variant:'revised',scenario:'stress',intent:'liquidity_demo' };
    assert.equal((await call('/analysis',null,analysisInput)).status,401);
    assert.equal((await call('/analysis?role=owner','seller',analysisInput)).status,403);
    if (process.env.FINANCIAL_PILOT_AI_MODE === 'simulated') {
        assert.equal((await call('/analysis','owner',{ ...analysisInput,amount:999 })).status,400);
        const result = await call('/analysis','owner',analysisInput);
        assert.equal(result.status,200);
        assert.equal((await result.json()).mode,'simulated');
        process.env.AUTOSPORTING_FINANCIAL_AI = '0';
        assert.equal((await call('/analysis','owner',analysisInput)).status,404);
        assert.equal((await call('/calculate','owner',payload)).status,200);
        process.env.AUTOSPORTING_FINANCIAL_AI = '1';
    } else if (!process.env.FINANCIAL_PILOT_AI_MODE) assert.equal((await call('/analysis','owner',analysisInput)).status,404);
    if (process.env.FINANCIAL_PILOT_CHAT==='1' && process.env.FINANCIAL_PILOT_AI_MODE==='simulated') {
        const create={sampleId:'AS-SINT-01',variant:'revised',scenario:'stress',demo:'liquidity'};
        assert.equal((await call('/chats',null)).status,401);
        assert.equal((await call('/chats','seller',create)).status,403);
        const created=await call('/chats','owner',create);
        assert.equal(created.status,200);
        const {id}=await created.json();
        assert.equal((await call('/chats/'+id,'authorized')).status,404);
        assert.equal((await call('/chats/'+id+'/messages','authorized',{message:'Prueba',requestId:crypto.randomUUID()})).status,404);
        const send={message:'Consulta sintética',requestId:crypto.randomUUID()};
        const first=await call('/chats/'+id+'/messages','owner',send);
        assert.equal(first.status,200);
        assert.equal((await first.json()).messages[0].reply.evidence.base.capacity,20);
        assert.equal((await (await call('/chats/'+id+'/messages','owner',send)).json()).messages.length,1);
        assert.equal((await call('/chats/'+id+'/messages','owner',{...send,scenario:'base'})).status,400);
        assert.equal((await (await call('/chats/'+id,'owner')).json()).messages.length,1);
        const another=await (await call('/chats','owner',create)).json();
        assert.equal(another.revisions.length,0);
        process.env.AUTOSPORTING_FINANCIAL_CHAT='0';
        assert.equal((await call('/chats/'+id,'owner')).status,404);
        assert.equal((await call('/calculate','owner',payload)).status,200);
        process.env.AUTOSPORTING_FINANCIAL_CHAT='1';
        console.log('OK: permisos del chat, retomado, idempotencia, aislamiento y apagado.');
    }
    console.log('OK: Express, autenticación real con MongoDB local, controles de rol y módulo deshabilitado.');

    if (mode === '--verify-trade') {
        const input = {sampleId:'AS-SINT-01',variant:'revised',scenario:'stress'};
        const message = 'Registrá una permuta sintética por ARS 120: ARS 40 de efectivo pactado, cobrados el 31/10/2026, íntegramente para la agencia y con ARS 0 restringidos. Vehículo tomado por ARS 60 con costo de inventario asignado de ARS 60. Crédito pendiente de ARS 20 que vence el 30/11/2026. La unidad entregada costó ARS 100. Por acuerdo, el 100% del resultado y los gastos corresponden a la agencia. Pagamos ARS 5 de gastos directos';
        const incompleteMessage = message + '.';
        const freshTrade = process.argv.includes('--fresh-trade');
        const collectCredit = freshTrade || process.argv.includes('--collect-trade-credit');
        const resumeTrade = collectCredit || process.argv.includes('--complete-expense-date');
        if (resumeTrade) {
            assert.equal(storageMode,'persistent','La continuación requiere el almacenamiento persistente del piloto.');
            let saved;
            if (freshTrade) {
                const created = await call('/chats','owner',input);
                assert.equal(created.status,200,'No se pudo crear la conversación sintética.');
                const {id} = await created.json();
                const initial = await call(`/chats/${id}/messages`,'owner',{
                    message:incompleteMessage,requestId:crypto.randomUUID()
                });
                saved = await initial.json();
                assert.equal(initial.status,200,saved.message ?? 'Falló la carga inicial.');
                const first = saved.messages[0];
                assert.equal(first.mode,'real');
                assert.ok(first.model && first.usage,'Falta evidencia del proveedor.');
                assert.deepEqual(first.reply.text.match(/¿[^?]+\?/g),['¿En qué fecha se pagaron los gastos directos?']);
                assert.deepEqual(saved.revisions[0].assumptions.terms,{
                    operationCurrency:'ARS',salePrice:120,cost:100,cash:40,credit:20,direct:5,share:100,
                    tradeValue:60,inventoryCost:60,cashCollected:40,cashAgency:40,cashRestricted:0,
                    cashCollectedDate:'2026-10-31',creditDueDate:'2026-11-30'
                });
            }
            const history = freshTrade ? null : await call('/chats','owner');
            if (history) assert.equal(history.status,200);
            for (const {id} of history ? await history.json() : []) {
                const detail = await call(`/chats/${id}`,'owner');
                assert.equal(detail.status,200);
                const chat = await detail.json();
                if (chat.messages[0]?.message === incompleteMessage && chat.revisions[0]?.assumptions.terms.creditDueDate === '2026-11-30' &&
                    chat.revisions[0].assumptions.terms.directPaidDate == null) {
                    saved = chat;
                    break;
                }
            }
            assert.ok(saved,'No se encontró la permuta incompleta verificada en el historial.');
            const followup = 'los gastos se pagaron el 31/10/2026';
            let result = saved;
            if (saved.messages.length === 1) {
                const response = await call(`/chats/${saved.id}/messages`,'owner',{message:followup,requestId:crypto.randomUUID()});
                result = await response.json();
                assert.equal(response.status,200,result.message ?? 'Falló la continuación.');
            }
            assert.ok(result.messages.length >= 2 && result.revisions.length >= 2);
            const turn = result.messages[1];
            assert.equal(turn.message,followup);
            assert.equal(turn.mode,'real');
            assert.ok(turn.model && turn.usage,'Falta evidencia del proveedor.');
            const [before,after] = result.revisions;
            assert.deepEqual(after.assumptions.terms,{...before.assumptions.terms,directPaidDate:'2026-10-31'});
            assert.equal(after.evaluation.settlement.creditDueDate,'2026-11-30');
            assert.equal(after.evaluation.settlement.ownResult,15);
            assert.equal(after.evaluation.liquidity.minimum.free,405);
            console.log(`Continuación verificada · ${turn.model} · solo fecha de gastos 31/10/2026 · crédito vence 30/11/2026 · caja mínima ARS 405 · agencia ARS 15`);
            if (collectCredit) {
                const receipt = 'cobré los ARS 20 el 30/11/2026';
                assert.equal(after.evaluation.settlement.creditRemaining,20);
                if (result.messages.length === 2) {
                    const response = await call(`/chats/${saved.id}/messages`,'owner',{message:receipt,requestId:crypto.randomUUID()});
                    result = await response.json();
                    assert.equal(response.status,200,result.message ?? 'Falló el cobro.');
                }
                assert.equal(result.messages.length,3);
                assert.equal(result.revisions.length,3);
                const receiptTurn = result.messages[2];
                assert.equal(receiptTurn.message,receipt);
                assert.equal(receiptTurn.mode,'real');
                assert.ok(receiptTurn.model && receiptTurn.usage,'Falta evidencia del proveedor.');
                const collected = result.revisions[2];
                assert.deepEqual(collected.assumptions.terms,after.assumptions.terms);
                assert.deepEqual(collected.assumptions.creditReceipts,[{amount:20,date:'2026-11-30',currency:'ARS'}]);
                assert.equal(collected.evaluation.settlement.creditRemaining,0);
                assert.equal(collected.evaluation.liquidity.minimum.free,405);
                assert.equal(collected.evaluation.settlement.ownResult,15);
                console.log(`Cobro verificado en la misma permuta · ${receiptTurn.model} · saldo ARS 0 · caja mínima ARS 405 · agencia ARS 15`);
            }
        }
        const cases = resumeTrade ? [] :
            process.argv.includes('--missing-expense-date') ? [false] : [true,false];
        for (const complete of cases) {
            const created = await call('/chats','owner',input);
            assert.equal(created.status,200,'No se pudo crear la conversación sintética.');
            const {id} = await created.json();
            const response = await call(`/chats/${id}/messages`,'owner',{
                message:message + (complete ? ' el 31/10/2026.' : '.'),requestId:crypto.randomUUID()
            });
            const result = await response.json();
            assert.equal(response.status,200,result.message ?? 'Falló el turno.');
            const [turn] = result.messages;
            assert.equal(turn.mode,'real');
            assert.ok(turn.model && turn.usage,'Falta evidencia del proveedor.');
            const {assumptions:{terms},evaluation:{settlement,liquidity}} = result.revisions[0];
            assert.deepEqual(terms,{operationCurrency:'ARS',salePrice:120,cost:100,cash:40,credit:20,direct:5,
                share:100,tradeValue:60,inventoryCost:60,cashCollected:40,cashAgency:40,cashRestricted:0,
                cashCollectedDate:'2026-10-31',creditDueDate:'2026-11-30',...(complete ? {directPaidDate:'2026-10-31'} : {})});
            assert.equal(settlement.ownResult,15);
            assert.equal(liquidity?.minimum.free ?? null,complete ? 405 : null);
            assert.deepEqual(turn.reply.text.match(/¿[^?]+\?/g) ?? [],complete ? [] : ['¿En qué fecha se pagaron los gastos directos?']);
            console.log(`${complete ? 'Completa' : 'Sin fecha de gastos'} · ${turn.model} · ${turn.reply.text}`);
        }
    }

    if (web) {
        const { chromium } = await import('playwright');
        browser = await chromium.launch({ executablePath:process.env.FINANCIAL_PILOT_CHROME,
            headless:mode === '--browser', args:['--disable-gpu','--disable-background-networking'] });
        const context = await browser.newContext({ viewport:{ width:1440,height:1000 } });
        await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        const owner = users.owner;
        await context.addInitScript(({ token,id }) => {
            localStorage.setItem('token', token);
            localStorage.setItem('autosporting_tour_seen_' + id, 'true');
        }, { token:owner.session.token,id:owner.id });
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        const pilotUrl = base + '/admin/autosporting-ai';
        try {
            await page.goto(pilotUrl, { waitUntil:'domcontentloaded',timeout:120000 });
        } catch (error) {
            if (mode !== '--serve' || (!error.message.includes('net::ERR_ABORTED') &&
                !page.isClosed() && browser.isConnected())) throw error;
            console.warn('Se interrumpió la carga inicial del panel. El servidor sigue activo.');
        }
        if (mode === '--browser') {
            await page.getByText('PILOTO — DATOS SINTÉTICOS').first().waitFor({ timeout:120000 });
            const general = page.getByRole('region',{name:'Chat general de la agencia'});
            await general.getByRole('textbox',{name:'Tu mensaje'}).waitFor();
            assert.ok(await general.getByRole('button',{name:'Enviar consulta'}).isDisabled());
            const crmProposal = page.getByRole('region',{name:'Propuesta desde una cotización'});
            await crmProposal.getByLabel('Cotización del CRM').waitFor();
            if (process.env.FINANCIAL_PILOT_WORKBOOK_FIXTURE) {
                const workbook = page.getByRole('region',{name:'Probar permuta desde Excel'});
                const upload = workbook.getByLabel('Archivo de permuta (.xlsx)');
                const submit = workbook.getByRole('button',{name:'Probar Excel'});
                const trial = page.waitForResponse(response=>response.url()===base+api+'/trade-workbook');
                await upload.setInputFiles(process.env.FINANCIAL_PILOT_WORKBOOK_FIXTURE);
                if (process.env.FINANCIAL_PILOT_AI_MODE!=='real') {
                    assert.ok(await workbook.getByRole('button',{name:'Probar con OpenAI'}).isDisabled());
                    const unconfigured = await fetch(base+api+'/trade-workbook/openai',{
                        method:'POST',headers:{Authorization:'Bearer '+owner.session.token,'Content-Type':'application/octet-stream'}
                    });
                    assert.equal(unconfigured.status,503);
                }
                await submit.click();
                assert.equal((await trial).status(),200);
                await workbook.getByText('Los resultados coinciden con los controles del Excel.').waitFor();
                for (const [label,expected] of [['Saldo por cobrar','ARS 0'],['Caja mínima bajo estrés','ARS 417'],['Resultado para la agencia','ARS 22']]) {
                    const actual = await workbook.getByRole('row',{name:new RegExp(label)}).getByRole('cell').last().innerText();
                    assert.equal(actual.split('\n')[0],expected);
                }
                console.log('OK: carga del Excel ficticio por el panel con ARS 0, ARS 417 y ARS 22.');
            }
            await page.locator('[data-capacity]').getByText('ARS 73',{exact:true}).waitFor();
            const output = resolve(process.argv[3] ?? '.');
            await mkdir(output,{recursive:true});
            await page.screenshot({ path:resolve(output,'piloto-cierre-original.png'),fullPage:true });
            await page.getByLabel('Cierre',{exact:true}).selectOption('revised');
            console.log('Cierre corregido seleccionado.');
            await page.locator('[data-indicator="result"]').getByText('ARS 20',{exact:true}).waitFor();
            await page.getByLabel('Escenario',{exact:true}).selectOption('stress');
            console.log('Escenario de estrés seleccionado.');
            await page.locator('[data-capacity]').getByText('ARS 20',{exact:true}).waitFor();
            await page.getByLabel('Importe entero').fill('-30');
            await page.getByRole('button',{name:'Simular compra'}).click();
            console.log('Simulación enviada.');
            await page.getByText('Resultado de la simulación').waitFor();
            await page.getByText('ARS 340',{exact:true}).waitFor();
            await page.getByText('ARS 10',{exact:true}).waitFor();
            await page.screenshot({ path:resolve(output,'piloto-cierre-corregido.png'),fullPage:true });
            if (process.env.FINANCIAL_PILOT_AI_MODE === 'simulated') {
                await page.getByLabel('Pregunta o análisis').selectOption('liquidity_demo');
                await page.getByRole('button',{name:'Ejecutar análisis'}).click();
                const analysis = page.getByRole('article',{name:'Informe financiero'});
                await analysis.getByText('Resultado de prueba simulada',{exact:false}).waitFor();
                await analysis.getByText('Ver referencias',{exact:true}).first().click();
                await analysis.getByText('Caja utilizable al corte · ARS 475',{exact:false}).waitFor();
                await analysis.screenshot({path:resolve(output,'analisis-financiero-simulado.png')});
                console.log('OK: demostración de análisis simulado y evidencia visible.');
            }
            if (process.env.FINANCIAL_PILOT_CHAT==='1' && process.env.FINANCIAL_PILOT_AI_MODE==='simulated') {
                const chat=page.getByRole('region',{name:'Chat de dirección'});
                await chat.getByRole('button',{name:'Demostración de reinversión'}).click();
                const labels=['¿Cuánto puedo reinvertir?','Simulá una compra inmediata de ARS 30.','Corregí el importe a ARS 25.','Probá con ARS 20.','Compará las tres alternativas.'];
                const history=chat.getByRole('list',{name:'Mensajes de la conversación'});
                for (const [i,message] of labels.entries()) {
                    await chat.getByRole('textbox',{name:'Mensaje de dirección'}).fill(message);
                    await chat.getByRole('button',{name:'Enviar mensaje'}).click();
                    await history.locator(':scope > li').nth(i).waitFor();
                }
                await history.getByText('Mínimo ARS 345',{exact:false}).first().waitFor();
                await chat.screenshot({path:resolve(output,'chat-reinversion.png')});
                const chats=await (await call('/chats','owner')).json();
                const saved=await (await call('/chats/'+chats[0].id,'owner')).json();
                const {writeFile}=await import('node:fs/promises');
                await writeFile(resolve(output,'conversacion-reinversion.json'),JSON.stringify(saved,null,2));
                await chat.getByRole('button',{name:'Demostración de permuta'}).click();
                await history.locator(':scope > li').first().waitFor({state:'detached'});
                for (const [i,message] of ['Hipótesis de permuta sintética','Aclaro el costo, los gastos y la participación'].entries()) {
                    await chat.getByRole('textbox',{name:'Mensaje de dirección'}).fill(message);
                    await chat.getByRole('button',{name:'Enviar mensaje'}).click();
                    await history.locator(':scope > li').nth(i).waitFor();
                }
                await history.getByText('Valor contractual de la toma ARS 60',{exact:false}).waitFor();
                await chat.screenshot({path:resolve(output,'chat-permuta.png')});
                await chat.getByLabel('Historial de conversaciones').selectOption(saved.id);
                await history.getByText('Mínimo ARS 345',{exact:false}).first().waitFor();
                console.log('OK: cinco turnos, permuta, comparación y reapertura en navegador.');
            }
            console.log('OK: panel Next.js, cambio de cierre y escenario, y simulación de compra.');
        } else {
            console.log('Piloto local: ' + pilotUrl);
            console.log('Para detener el servidor, presioná Ctrl+C en esta terminal.');
            browser.once('disconnected', () => console.warn('Se cerró el navegador del piloto. El servidor sigue activo.'));
            await new Promise(resolveStop => {
                process.once('SIGINT',resolveStop);
                process.once('SIGTERM',resolveStop);
            });
        }
    }
} catch (error) {
    console.error(error);
    process.exitCode = 1;
} finally {
    await browser?.close();
    if (server) { server.closeAllConnections(); await new Promise(done => server.close(done)); }
    await isolated.stop();
    await nextApp?.close();
    console.log('Recursos locales cerrados.');
}
process.exit(process.exitCode ?? 0);
