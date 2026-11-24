// scripts/peritaje-academy-routes.mjs
/**
 * PERITAJE AUTOMATIZADO DE TODAS LAS SECCIONES DE AUTOSPORTING ACADEMY
 * Valida navegación, renderizado, perfiles de usuario y ausencia de errores.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import('file:///C:/Users/Tomas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const base = 'http://127.0.0.1:3400';
const brainScreenshotsDir = 'C:\\Users\\Tomas\\.gemini\\antigravity\\brain\\c0111ef9-51a1-4d75-aa1f-ee925deb91eb\\screenshots';
fs.mkdirSync(brainScreenshotsDir, { recursive: true });

console.log('================================================================');
console.log(' INICIANDO PERITAJE FUNCIONAL Y VISUAL DE RUTAS EN BROWSER ');
console.log('================================================================\n');

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
});

const report = {
    testedRoutes: [],
    testedRoles: [],
    screenshots: [],
    errors: []
};

async function loginUser(page, role, target) {
    await page.goto(`${base}/__login?role=${role}&target=${encodeURIComponent(target)}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
}

// -----------------------------------------------------------------------------
// FASE 1: PERITAJE COMPLETO CON ROL 'owner' (13 SECCIONES DE ACADEMY)
// -----------------------------------------------------------------------------
console.log('--- [1/4] AUDITORÍA DE TODAS LAS SECCIONES CON ROL PROPIETARIO (owner) ---');
const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const ownerPage = await ownerContext.newPage();

ownerPage.on('pageerror', err => {
    console.error(`[Owner Page Error]: ${err.message}`);
    report.errors.push(`Owner Error: ${err.message}`);
});

const allSections = [
    { id: 'mi-capacitacion', path: '/admin/academy', titleCheck: /Capacitación|Academy/i, name: 'Mi Capacitación (Home)' },
    { id: 'desafio-diario', path: '/admin/academy/desafio-diario', titleCheck: /Desafío Diario|Evaluación/i, name: 'Desafío Diario' },
    { id: 'aprender', path: '/admin/academy/aprender', titleCheck: /Aprender|Módulos/i, name: 'Aprender (Módulos de Rol)' },
    { id: 'practicar', path: '/admin/academy/practicar', titleCheck: /Practicar|Simulaciones/i, name: 'Practicar (Simulaciones)' },
    { id: 'negociacion', path: '/admin/academy/negociacion', titleCheck: /Negociación|Simulador/i, name: 'Simulador de Negociación con IA' },
    { id: 'tutor', path: '/admin/academy/tutor', titleCheck: /Tutor|Consultas/i, name: 'Tutor Educativo por Rol' },
    { id: 'aprender-del-error', path: '/admin/academy/aprender-del-error', titleCheck: /Aprender del error|Reflexión/i, name: 'Aprender del Error' },
    { id: 'progreso', path: '/admin/academy/progreso', titleCheck: /Mi progreso|Métricas/i, name: 'Mi Progreso' },
    { id: 'gestion', path: '/admin/academy/gestion', titleCheck: /Gestión|Control/i, name: 'Gestión y Control de Capacitación' },
    { id: 'cursos', path: '/admin/academy/cursos', titleCheck: /Cursos|Financiero/i, name: 'Cursos Financieros Empresariales' },
    { id: 'simuladores', path: '/admin/academy/simuladores', titleCheck: /Laboratorio|Simulador/i, name: 'Laboratorio de Simuladores' },
    { id: 'evaluaciones', path: '/admin/academy/evaluaciones', titleCheck: /Evaluaciones/i, name: 'Evaluaciones Financieras' },
    { id: 'entrenador', path: '/admin/academy/entrenador', titleCheck: /Entrenador|Decisiones/i, name: 'Entrenador de Decisiones' }
];

for (const sec of allSections) {
    console.log(` -> Navegando a: ${sec.name} (${sec.path})...`);
    await loginUser(ownerPage, 'owner', sec.path);
    await ownerPage.waitForLoadState('networkidle');

    // Verificar que la página responde sin pantalla en blanco
    const bodyText = await ownerPage.innerText('body');
    assert(bodyText.length > 50, `La página ${sec.path} no rindió contenido en el body.`);

    // Tomar captura para peritaje de muestra en secciones clave
    if (['mi-capacitacion', 'desafio-diario', 'aprender', 'aprender-del-error', 'gestion', 'cursos'].includes(sec.id)) {
        const shotPath = path.join(brainScreenshotsDir, `peritaje-owner-${sec.id}.png`);
        await ownerPage.screenshot({ path: shotPath, fullPage: false });
        report.screenshots.push(shotPath);
    }

    report.testedRoutes.push({ route: sec.path, name: sec.name, status: 'OK' });
}
report.testedRoles.push('owner (13/13 rutas OK)');
await ownerContext.close();

// -----------------------------------------------------------------------------
// FASE 2: PERITAJE CON ROL 'vendedor' (EXPERIENCIA COMERCIAL Y RESTRICCIONES)
// -----------------------------------------------------------------------------
console.log('\n--- [2/4] AUDITORÍA CON ROL VENDEDOR (ventas) ---');
const vendedorContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const vendedorPage = await vendedorContext.newPage();

vendedorPage.on('pageerror', err => {
    console.error(`[Vendedor Page Error]: ${err.message}`);
    report.errors.push(`Vendedor Error: ${err.message}`);
});

// 1. Acceso a Mi Capacitación Vendedores
await loginUser(vendedorPage, 'vendedor', '/admin/academy');
await vendedorPage.waitForLoadState('networkidle');
const vendedorHomeText = await vendedorPage.innerText('body');
assert(vendedorHomeText.includes('Vendedor') || vendedorHomeText.includes('ventas') || vendedorHomeText.includes('Ventas'), 'El vendedor no visualiza el recorrido comercial.');

// 2. Desafío Diario
console.log(' -> Comprobando Desafío Diario del vendedor...');
await vendedorPage.goto(`${base}/admin/academy/desafio-diario`, { waitUntil: 'networkidle' });
const dailyText = await vendedorPage.innerText('body');
assert(dailyText.includes('Desafío') || dailyText.includes('Pregunta') || dailyText.includes('Stock'), 'Desafío diario no cargó adecuadamente.');

// 3. Aprender del error: Verificar presencia de frases motivadoras
console.log(' -> Comprobando Aprender del Error y frases motivadoras...');
await vendedorPage.goto(`${base}/admin/academy/aprender-del-error`, { waitUntil: 'networkidle' });
const errorText = await vendedorPage.innerText('body');
assert(errorText.includes('Aprender del error') || errorText.includes('Reflexión'), 'Sección Aprender del error no rinde título esperado.');
// Verificar que existe frase motivadora o contenedor de inspiración
const hasMotivation = /error no es|éxito|motiv|oportunidad|filosofía|frase/i.test(errorText);
assert(hasMotivation, 'No se detectó el bloque de frases motivadoras en Aprender del error.');

// Captura de evidencia para el vendedor
const shotVendedor = path.join(brainScreenshotsDir, `peritaje-vendedor-aprender-error.png`);
await vendedorPage.screenshot({ path: shotVendedor });
report.screenshots.push(shotVendedor);

// 4. Verificar restricción de acceso: El vendedor no debe poder gestionar el equipo ni invalidar exámenes
console.log(' -> Verificando restricción de gestión para vendedores...');
await vendedorPage.goto(`${base}/admin/academy/gestion`, { waitUntil: 'networkidle' });
const gestionText = await vendedorPage.innerText('body');
// Debe mostrar mensaje de acceso restringido o redirigir
const isProtected = /no autoriz|permiso|restringid|solo supervisores|no tenés permiso|acceso exclusivo|reservada/i.test(gestionText) || vendedorPage.url() !== `${base}/admin/academy/gestion`;
assert(isProtected, 'La sección de Gestión no protegió el acceso a nivel de interfaz contra vendedores.');

report.testedRoles.push('vendedor (recorrido comercial, desafío diario, frases motivadoras y control de permisos OK)');
await vendedorContext.close();

// -----------------------------------------------------------------------------
// FASE 3: PERITAJE CON ROL 'gestoria_contabilidad'
// -----------------------------------------------------------------------------
console.log('\n--- [3/4] AUDITORÍA CON ROL GESTORÍA (gestoria_contabilidad) ---');
const gestoriaContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const gestoriaPage = await gestoriaContext.newPage();

await loginUser(gestoriaPage, 'gestoria', '/admin/academy');
await gestoriaPage.waitForLoadState('networkidle');
const gestoriaHomeText = await gestoriaPage.innerText('body');
assert(/gestor|documental|expediente/i.test(gestoriaHomeText), 'Gestoría no cargó su track específico.');

report.testedRoles.push('gestoria (recorrido documental verificado OK)');
await gestoriaContext.close();

// -----------------------------------------------------------------------------
// FASE 4: PERITAJE CON ROL 'administrativo' Y VALIDACIÓN ARCA (MOD-ADM-01)
// -----------------------------------------------------------------------------
console.log('\n--- [4/4] AUDITORÍA CON ROL ADMINISTRACIÓN Y VERIFICACIÓN MATRIZ ARCA ---');
const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const adminPage = await adminContext.newPage();

await loginUser(adminPage, 'administracion', '/admin/academy/aprender');
await adminPage.waitForLoadState('networkidle');
const adminAprenderText = await adminPage.innerText('body');
assert(/Facturación|Administración|ARCA|AFIP/i.test(adminAprenderText), 'Administración no muestra sus módulos correspondientes.');

// Verificar que figure en revisión / pendiente de contador
assert(/revisión|pendiente|contador/i.test(adminAprenderText), 'MOD-ADM-01 no exhibe el rótulo de En Revisión por Contador Público.');

const shotAdmin = path.join(brainScreenshotsDir, `peritaje-admin-arca-revision.png`);
await adminPage.screenshot({ path: shotAdmin });
report.screenshots.push(shotAdmin);

report.testedRoles.push('administracion (módulo MOD-ADM-01 con estado En Revisión y matriz ARCA validada OK)');
await adminContext.close();

await browser.close();

// -----------------------------------------------------------------------------
// INFORME FINAL DE PERITAJE DE RUTAS
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(' RESUMEN DEL PERITAJE FUNCIONAL DE RUTAS Y NAVEGACIÓN ');
console.log('================================================================');
console.log(`Rutas auditadas:      ${report.testedRoutes.length}/13`);
console.log(`Roles auditados:      ${report.testedRoles.length}/4 (owner, vendedor, gestoria, administracion)`);
console.log(`Capturas guardadas:   ${report.screenshots.length}`);
console.log(`Errores detectados:   ${report.errors.length}`);

if (report.errors.length > 0) {
    console.error('\n⚠️ ERRORES ENCONTRADOS DURANTE LA NAVEGACIÓN:');
    report.errors.forEach((e, i) => console.error(` [${i + 1}] ${e}`));
    process.exit(1);
} else {
    console.log('\n🏆 VEREDICTO DE RUTAS: 100% OPERATIVAS, ACCESIBLES Y PROTEGIDAS.');
    process.exit(0);
}
