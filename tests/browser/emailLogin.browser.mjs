// Requires npm run dev:auth-preview in a separate terminal; uses fictitious accounts only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base='http://127.0.0.1:3100';
const chrome = process.env.CHROME_PATH || (process.platform === 'win32' && fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
const browser=await chromium.launch({...(chrome ? {executablePath:chrome} : {}),headless:true});
const contexts=[]; let passed=0;
async function newPage(){ const c=await browser.newContext({viewport:{width:1280,height:950}}); contexts.push(c); await c.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort()); return c.newPage(); }
async function goto(page,path){ await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:120000}); }
async function login(page,email,recipientType='account'){ await goto(page,'/login'); await page.locator('input[type=email]').fill(email); await page.locator('input[type=password]').fill('Ficticia-Local-2026!'); const response=page.waitForResponse(r=>r.url()===base+'/api/login'&&r.request().method()==='POST'); await page.getByRole('button',{name:'INICIAR SESIÓN // LOGIN'}).click(); const res=await response; assert.equal(res.status(),200); const data=await res.json(); assert.equal(data.emailRecipientType,recipientType); await page.getByRole('heading',{name:recipientType==='account'?'Ingresá el código de 6 dígitos enviado a tu correo':'Ingresá el código de 6 dígitos enviado al administrador',exact:true}).waitFor(); assert.equal(await page.evaluate(()=>localStorage.getItem('token')),null); assert.equal(data.requireEmailVerification,true); return data; }
async function codeFor(page,name,recipient){ const html=await (await page.request.get(base+'/__test-mail')).text(); const result=await page.evaluate(({html,name})=>{const doc=new DOMParser().parseFromString(html,'text/html');const row=[...doc.querySelectorAll('tbody tr')].find(r=>r.children[2]?.textContent.includes(name));if(!row)return null;const mail=new DOMParser().parseFromString(row.querySelector('iframe').getAttribute('srcdoc'),'text/html');return {recipient:row.children[1].textContent.trim(),code:mail.body.textContent.match(/\b\d{6}\b/)?.[0]};},{html,name}); assert.ok(result,'El buzón local debe contener la solicitud ficticia'); assert.equal(result.recipient,recipient,'El código se entrega solo al destino correspondiente a la cuenta'); assert.ok(result.code,'El mensaje debe contener un código de seis dígitos'); return result.code; }
async function verify(page,code){ await page.getByLabel('Código de verificación').fill(code); const response=page.waitForResponse(r=>r.url()===base+'/api/login/email/verify'); await page.getByRole('button',{name:'Verificar código',exact:true}).click(); return response; }
function ok(name){passed++; console.log('ok - '+name);}
try{
 const admin=await newPage(); const pending=await login(admin,'admin@example.test','administrator');
 await codeFor(admin,'Administrador ficticio','administrador@example.test');
 assert.equal((await admin.request.get(base+'/api/admin/auth/me')).status(),401);
 assert.equal((await admin.request.get(base+'/api/admin/cars',{headers:{Authorization:'Bearer '+pending.challengeId}})).status(),401);
 assert.equal((await admin.request.get(base+'/api/admin/telefonos',{headers:{Authorization:'Bearer '+pending.challengeId}})).status(),401);
 if(process.env.AUTH_QA_SCREENSHOT) await admin.screenshot({path:process.env.AUTH_QA_SCREENSHOT});
 await goto(admin,'/admin'); await admin.waitForURL(base+'/login',{timeout:60000});
 ok('Administrador pendiente sin token; URL directa y APIs Express/Next bloqueadas');
 const a=await newPage(),b=await newPage();
 const [pa,pb]=await Promise.all([login(a,'vendedor.uno@example.test'),login(b,'vendedor.dos@example.test')]);
 assert.notEqual(pa.challengeId,pb.challengeId);
 const ca=await codeFor(a,'Vendedor ficticio uno','vendedor.uno@example.test'),cb=await codeFor(b,'Vendedor ficticio dos','vendedor.dos@example.test');
 if(process.env.AUTH_QA_SELLER_SCREENSHOT){ fs.mkdirSync(path.dirname(process.env.AUTH_QA_SELLER_SCREENSHOT),{recursive:true}); await a.setViewportSize({width:390,height:844}); assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true); await a.waitForTimeout(500); await a.screenshot({path:process.env.AUTH_QA_SELLER_SCREENSHOT,animations:'disabled'}); await a.setViewportSize({width:1280,height:950}); }
 const wrong=await verify(b,ca); assert.equal(wrong.status(),401); assert.equal(await b.evaluate(()=>localStorage.getItem('token')),null);
 assert.equal((await verify(a,ca)).status(),200); assert.equal((await verify(b,cb)).status(),200);
 await Promise.all([a.waitForURL(base+'/admin/mis-ventas',{timeout:120000}),b.waitForURL(base+'/admin/mis-ventas',{timeout:120000})]);
 ok('Cada vendedor recibe el código en su correo; dos navegadores rechazan códigos cruzados');
 const token=await a.evaluate(()=>localStorage.getItem('token')); assert.ok(token);
 await a.reload({waitUntil:'domcontentloaded'}); await a.getByRole('button',{name:'Cerrar sesión',exact:false}).first().waitFor({timeout:90000});
 assert.equal(await a.evaluate(()=>localStorage.getItem('token')),token);
 assert.equal((await a.request.get(base+'/api/admin/auth/me',{headers:{Authorization:'Bearer '+token}})).status(),200);
 ok('Recargar conserva la sesión verificada activa');
 const logout=a.waitForResponse(r=>r.url()===base+'/api/logout');
 await a.getByRole('button',{name:'Cerrar sesión',exact:false}).first().click(); assert.equal((await logout).status(),204);
 await a.waitForURL(base+'/login',{timeout:30000});
 assert.equal((await a.request.get(base+'/api/admin/auth/me',{headers:{Authorization:'Bearer '+token}})).status(),401);
 const next=await login(a,'vendedor.uno@example.test'); assert.notEqual(next.challengeId,pa.challengeId);
 assert.equal((await verify(a,ca)).status(),401);
 ok('Cerrar sesión revoca el token y el mismo navegador pide un código nuevo');
 await login(admin,'admin@example.test','administrator');
 const adminCode=await codeFor(admin,'Administrador ficticio','administrador@example.test'); assert.equal((await verify(admin,adminCode)).status(),200);
 await admin.waitForURL(base+'/admin',{timeout:60000});
 const adminToken=await admin.evaluate(()=>localStorage.getItem('token'));
 assert.equal((await admin.request.get(base+'/api/admin/telefonos',{headers:{Authorization:'Bearer '+adminToken}})).status(),200);
 ok('Administrador verificado accede también a API nativa Next con la misma sesión');
 console.log(passed+' pruebas reales de navegador aprobadas; solo datos ficticios y buzón local.');
}finally{ await browser.close(); }
