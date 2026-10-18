// scripts/verify-browser-flows.mjs
// Verificación real en navegador Chromium (Playwright) contra la vista previa aislada (MongoMemoryServer en http://localhost:3000).
// Cubre los puntos 3 y 4 solicitados antes de publicar.

import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.PREVIEW_URL || 'http://localhost:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runBrowserVerification() {
    console.log(`Iniciando verificación en navegador Google Chrome contra ${BASE_URL}...`);
    const browser = await chromium.launch({
        headless: true,
        executablePath: CHROME_PATH
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
        // 0. Iniciar sesión en el navegador
        console.log('-> 0. Iniciando sesión como admin@autosporting.test...');
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
        await page.fill('input[type="email"]', 'admin@autosporting.test');
        await page.fill('input[type="password"]', 'Admin1234!');
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/admin/, { timeout: 15000 });
        console.log('   OK: Sesión iniciada en el navegador.');

        // Obtener IDs sembrados desde la API autenticada dentro del navegador
        const seededData = await page.evaluate(async () => {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const [carsRes, salesRes] = await Promise.all([
                fetch('/api/admin/cars?status=todos&limit=50', { headers }).then(r => r.json()),
                fetch('/api/admin/sales?limit=50', { headers }).then(r => r.json())
            ]);
            const cars = carsRes.cars || carsRes || [];
            const sales = salesRes.sales || salesRes || [];
            return {
                amarokCar: cars.find(c => c.name?.includes('Amarok')),
                rangerCar: cars.find(c => c.name?.includes('Ranger')),
                hiluxSale: sales.find(s => s.paymentMethod === 'permuta' || s.saleCurrency === 'USD'),
                peugeotSale: sales.find(s => s.paymentMethod === 'financiado')
            };
        });

        assert.ok(seededData.amarokCar?._id, 'Debe existir Amarok V6 en stock');
        assert.ok(seededData.rangerCar?._id, 'Debe existir Ranger Limited en stock');
        assert.ok(seededData.hiluxSale?._id, 'Debe existir venta de Hilux con condiciones comerciales');
        assert.ok(seededData.peugeotSale?._id, 'Debe existir venta financiada de Peugeot 208');

        // =========================================================================
        // 1. Guardar y reabrir condiciones comerciales y comisión
        // =========================================================================
        console.log('-> 1. Probando en navegador: Guardar y reabrir condiciones comerciales y comisión...');
        await page.goto(`${BASE_URL}/admin/ventas/${seededData.hiluxSale._id}`, { waitUntil: 'networkidle' });
        await page.waitForSelector('text=Condiciones Comerciales', { timeout: 10000 });

        // Abrir edición en el panel de Condiciones Comerciales
        const editBtn = page.locator('button:has-text("Editar")').first();
        await editBtn.click();

        // Cambiar comisión a modo Porcentaje = 2.5%
        await page.locator('button:has-text("Porcentaje")').click();
        const percentInput = page.locator('input[placeholder="Ej: 1,3"]');
        await percentInput.fill('2.5');

        // Agregar un gasto de venta comercial ("Gestoría transferencia bonificada", USD 200)
        await page.locator('button:has-text("Agregar Gasto")').click();
        const expDescInput = page.locator('input[placeholder*="Descripción (ej. Transferencia"]').last();
        await expDescInput.fill('Gestoría transferencia bonificada');

        // Guardar condiciones comerciales y comisión
        await page.locator('button:has-text("Guardar")').first().click();
        await page.waitForTimeout(1200);

        // Recargar / reabrir la página de la venta y comprobar que persisten en el DOM
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForSelector('text=Condiciones Comerciales', { timeout: 10000 });
        const salePageText = await page.locator('body').innerText();
        assert.match(salePageText, /2,5%/, 'El porcentaje de comisión 2,5% debe verse al reabrir la venta');
        assert.match(salePageText, /950/, 'El importe calculado USD 950 (2,5% de 38.000) debe verse al reabrir');
        assert.match(salePageText, /Gestoría transferencia bonificada/, 'El gasto comercial guardado debe verse al reabrir');
        console.log('   OK: Condiciones comerciales y comisión guardadas y verificadas al reabrir.');

        // =========================================================================
        // 2. Ver una cadena de permutas y su resultado
        // =========================================================================
        console.log('-> 2. Probando en navegador: Ver una cadena de permutas y su resultado...');
        await page.goto(`${BASE_URL}/admin/stock/${seededData.amarokCar._id}`, { waitUntil: 'networkidle' });
        await page.waitForSelector('text=Historial de permutas y rentabilidad', { timeout: 10000 });
        await page.waitForTimeout(800);
        const chainText = await page.locator('body').innerText();
        assert.match(chainText, /Historial de permutas y rentabilidad/i, 'Debe mostrarse el panel Historial de permutas y rentabilidad');
        assert.match(chainText, /Hilux SRX/i, 'Debe verse el vehículo origen de la cadena (Toyota Hilux SRX)');
        assert.match(chainText, /Amarok V6/i, 'Debe verse el vehículo recibido en parte de pago (VW Amarok V6)');
        assert.match(chainText, /Ganancia acumulada/i, 'Debe mostrarse el resultado acumulado de la cadena');
        console.log('   OK: Cadena de permutas y su resultado verificados en el navegador.');

        // =========================================================================
        // 3. Cobrar una cuota y distribuirla una sola vez
        // =========================================================================
        console.log('-> 3. Probando en navegador: Cobrar una cuota y distribuirla una sola vez...');
        await page.goto(`${BASE_URL}/admin/tesoreria-estrategica`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // Desbloquear Tesorería Estratégica con el PIN 1234 usando el teclado en pantalla
        for (const digit of ['1', '2', '3', '4']) {
            const btn = page.locator(`button:has-text("${digit}")`).first();
            if (await btn.isVisible()) {
                await btn.click();
                await page.waitForTimeout(100);
            }
        }
        await page.waitForTimeout(1500);

        // Cobrar la Cuota #1 y verificar en la bandeja de Tesorería que se distribuye una única vez
        const collectAndDistributeResult = await page.evaluate(async (peugeotSaleId) => {
            const token = localStorage.getItem('token');
            const authHeaders = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            };

            // Verificar PIN 1234 para obtener el token efímero de sesión de Tesorería Estratégica
            const pinRes = await fetch('/api/admin/tesoreria-estrategica/pin/verify', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ pin: '1234' })
            }).then(r => r.json());

            const headers = {
                ...authHeaders,
                'x-treasury-token': pinRes.treasuryToken
            };

            // Obtener cuotas pendientes de la venta financiada
            const instRes = await fetch(`/api/admin/installments?saleId=${peugeotSaleId}`, { headers }).then(r => r.json());
            const installments = instRes.installments || instRes || [];
            const firstPending = installments.find(i => i.status === 'pendiente') || installments[0];

            // Obtener cuenta ARS
            const accRes = await fetch('/api/accounts', { headers }).then(r => r.json());
            const accounts = accRes.accounts || accRes || [];
            const arsAcc = accounts.find(a => a.currency === 'ARS');

            // Cobrar la cuota #1 (POST /api/admin/installments/:id/pay)
            const payRes = await fetch(`/api/admin/installments/${firstPending._id}/pay`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    amount: firstPending.amount,
                    paymentMethod: 'transferencia',
                    accountId: arsAcc._id,
                    paymentDate: new Date().toISOString(),
                    notes: 'Cobro cuota #1 verificado desde navegador'
                })
            });
            const payJson = await payRes.json();

            // Consultar bandeja de pendientes en Tesorería Estratégica
            const dashBefore = await fetch('/api/admin/tesoreria-estrategica/data', { headers }).then(r => r.json());
            const pendingList = dashBefore?.data?.pendingIncomes || [];
            const txId = payJson?.transaction?._id || payJson?.treasuryIntegration?.transactionId;
            const matchingPending = pendingList.filter(p =>
                (txId && String(p._id || p.id) === String(txId)) ||
                String(p.installmentId || '') === String(firstPending._id) ||
                String(p.description || '').includes(`Cuota #${firstPending.installmentNumber}`)
            );
            const targetIncome = matchingPending[0] || pendingList[0];

            // Distribuir por primera vez
            const dist1 = await fetch('/api/admin/tesoreria-estrategica/incomes/distribute', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    transactionId: targetIncome._id || targetIncome.id,
                    distribution: [
                        { boxKey: 'operativa', amount: 1000000 },
                        { boxKey: 'stock', amount: 1500000 }
                    ]
                })
            });
            const dist1Json = await dist1.json();

            // Intentar distribuir una segunda vez el mismo cobro (debe ser bloqueado)
            const dist2 = await fetch('/api/admin/tesoreria-estrategica/incomes/distribute', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    transactionId: targetIncome._id || targetIncome.id,
                    distribution: [
                        { boxKey: 'operativa', amount: 1000000 }
                    ]
                })
            });
            const dist2Json = await dist2.json();

            return {
                payStatus: payRes.status,
                payJson,
                pendingCountForInstallment: matchingPending.length,
                dist1Status: dist1.status,
                dist1Ok: dist1Json.ok,
                dist2Status: dist2.status,
                dist2Message: dist2Json.message || dist2Json.error
            };
        }, seededData.peugeotSale._id);

        assert.equal(collectAndDistributeResult.payStatus, 200, 'El cobro de la cuota #1 debe acreditarse con 200');
        assert.equal(collectAndDistributeResult.pendingCountForInstallment, 1, 'El cobro debe aparecer una única vez en bandeja de Tesorería');
        assert.equal(collectAndDistributeResult.dist1Status, 200, 'La primera distribución del cobro debe completarse con éxito');
        assert.equal(collectAndDistributeResult.dist1Ok, true);
        assert.equal(collectAndDistributeResult.dist2Status, 400, 'El intento de segunda distribución debe ser rechazado con 400');
        assert.match(collectAndDistributeResult.dist2Message, /ya fue distribuido/i, 'Debe informar que ya fue distribuido previamente');
        console.log('   OK: Cuota cobrada y distribuida una sola vez (doble distribución bloqueada).');

        // =========================================================================
        // 4. Modificar el costo de un vehículo y consultar su justificación
        // =========================================================================
        console.log('-> 4. Probando en navegador: Modificar el costo de un vehículo y consultar su justificación...');
        await page.goto(`${BASE_URL}/admin/stock/${seededData.rangerCar._id}`, { waitUntil: 'networkidle' });
        await page.waitForSelector('text=Ranger Limited', { timeout: 10000 });

        // Abrir el modal de edición del vehículo desde el botón Editar Ficha / Editar
        await page.locator('button:has-text("Editar")').first().click();
        await page.waitForSelector('text=Editar Vehículo', { timeout: 5000 });

        // Modificar purchasePrice de 31000000 a 31400000
        const purchaseInput = page.locator('input[name="purchasePrice"]');
        await purchaseInput.fill('31400000');

        // Verificar que aparece el bloque de justificación obligatoria en el modal
        await page.waitForSelector('select[name="purchasePriceChangeType"]', { timeout: 5000 });
        await page.selectOption('select[name="purchasePriceChangeType"]', 'gasto_adicional');
        await page.fill('input[name="purchasePriceExpenseConcept"]', 'Batería nueva y alineación');
        await page.fill('input[name="purchasePriceJustification"]', 'Reemplazo de batería previo a entrega en salón');

        // Guardar cambios en el modal
        await page.locator('button[type="submit"]:has-text("Guardar")').click();
        await page.waitForTimeout(1500);

        // Consultar la justificación en el Historial Interno (Audit Log) en la misma vista
        const stockDetailText = await page.locator('body').innerText();
        assert.match(stockDetailText, /Gasto Adicional/i, 'El Historial Interno debe mostrar la etiqueta Gasto Adicional');
        assert.match(stockDetailText, /Reemplazo de batería previo a entrega en salón/i, 'El Historial Interno debe mostrar la justificación obligatoria');
        console.log('   OK: Costo modificado con justificación obligatoria y verificado en el Historial Interno.');

        // =========================================================================
        // 5. Seleccionar ALWAYS SAS
        // =========================================================================
        console.log('-> 5. Probando en navegador: Seleccionar ALWAYS SAS en Empresa Receptora...');
        await page.goto(`${BASE_URL}/admin/finanzas`, { waitUntil: 'networkidle' });
        await page.waitForSelector('button:has-text("Pago Empresas")', { timeout: 10000 });
        await page.locator('button:has-text("Pago Empresas")').click();

        await page.waitForSelector('button:has-text("Nuevo pago a empresa")', { timeout: 5000 });
        await page.locator('button:has-text("Nuevo pago a empresa")').click();

        // Seleccionar ALWAYS SAS en el desplegable de Empresa Receptora
        const modalForm = page.locator('form');
        await modalForm.locator('input[type="number"]').fill('1500');
        const selects = modalForm.locator('select');
        // El segundo select del modal es Empresa Receptora (el primero es Moneda)
        await selects.nth(1).selectOption('ALWAYS SAS');
        await modalForm.locator('input[placeholder*="Amarok"]').fill('Ford Ranger Limited AF123BC');
        await modalForm.locator('button[type="submit"]:has-text("Confirmar Pago")').click();
        await page.waitForTimeout(1200);

        // Recargar /admin/finanzas, volver a la pestaña Pago Empresas y verificar que ALWAYS SAS persiste sin duplicados
        await page.reload({ waitUntil: 'networkidle' });
        await page.locator('button:has-text("Pago Empresas")').click();
        await page.waitForTimeout(600);
        const finanzasText = await page.locator('body').innerText();
        assert.match(finanzasText, /ALWAYS SAS/, 'ALWAYS SAS debe mostrarse de forma persistente en la tabla de Pago Empresas');
        const alwaysRowsCount = await page.locator('td:has-text("ALWAYS SAS")').count();
        assert.equal(alwaysRowsCount, 1, 'ALWAYS SAS debe haberse registrado una sola vez sin duplicados');
        console.log('   OK: Empresa receptora ALWAYS SAS seleccionada y persistida sin duplicados.');

        // =========================================================================
        // 6. Comprobación completa del Modo Offline en el navegador
        // =========================================================================
        console.log('-> 6. Probando en navegador: Modo Offline (Preparar -> Desconectar -> Recargar -> Navegar y ver fotos offline -> Guardar borrador -> Cerrar/Reabrir -> Reconectar y Sincronizar)...');
        await page.goto(`${BASE_URL}/admin/stock`, { waitUntil: 'networkidle' });

        // Abrir el control de Modo Offline en el encabezado
        const offlineHeaderBtn = page.locator('button[title="Modo Offline y Sincronización"]');
        await offlineHeaderBtn.click();
        await page.waitForSelector('text=Modo Offline y Sincronización del Dispositivo', { timeout: 5000 });

        // Preparar el dispositivo (con fotos principales activadas)
        await page.locator('button:has-text("Preparar para uso sin conexión")').click();
        await page.waitForSelector('text=Última preparación:', { timeout: 15000 });
        await page.waitForTimeout(1000);

        // Cerrar modal antes de desconectar
        await page.keyboard.press('Escape').catch(() => {});
        const closeModalBtn = page.locator('div.fixed.inset-0 button').first();
        if (await closeModalBtn.isVisible()) {
            await closeModalBtn.click();
        }

        // DESCONECTAR LA RED DEL NAVEGADOR
        console.log('   -> Desconectando red del navegador (context.setOffline(true))...');
        await context.setOffline(true);
        await page.waitForTimeout(400);

        const isBrowserOffline = await page.evaluate(() => navigator.onLine === false);
        assert.equal(isBrowserOffline, true, 'El navegador debe estar efectivamente sin conexión (navigator.onLine === false)');

        // RECARGAR LA PÁGINA SIN CONEXIÓN
        console.log('   -> Recargando la página sin conexión...');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        // Verificar que la página recargó sin error de red y muestra el catálogo desde el snapshot offline
        const offlineStockText = await page.locator('body').innerText();
        assert.match(offlineStockText, /Amarok|Ranger/i, 'Al recargar sin conexión debe verse el stock descargado');

        // Abrir el modal Offline sin conexión y navegar por los datos descargados + verificar que las fotos descargadas se ven sin conexión
        await page.locator('button[title="Modo Offline y Sincronización"]').click();
        await page.locator('button:has-text("Datos Offline")').click();
        await page.waitForSelector('img[data-offline-photo="true"]', { timeout: 5000 });

        const offlinePhotoCheck = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img[data-offline-photo="true"]'));
            return {
                count: imgs.length,
                allLoaded: imgs.length > 0 && imgs.every(img => img.complete && img.naturalWidth > 0),
                sampleSrcPrefix: imgs[0]?.src?.slice(0, 30) || ''
            };
        });
        assert.ok(offlinePhotoCheck.count >= 2, 'Deben existir fotos de vehículos en el catálogo offline');
        assert.equal(offlinePhotoCheck.allLoaded, true, 'Todas las fotos descargadas deben renderizarse sin conexión (naturalWidth > 0)');
        assert.match(offlinePhotoCheck.sampleSrcPrefix, /^data:image\//, 'Las fotos descargadas deben servirse desde caché local sin depender de la red');
        console.log(`   OK: ${offlinePhotoCheck.count} fotos descargadas visibles sin conexión (naturalWidth > 0).`);

        // Guardar un borrador sin conexión (Pestaña "Carga Rápida Offline")
        await page.locator('button:has-text("Carga Rápida Offline")').click();
        await page.locator('button:has-text("Nuevo Cliente")').click();
        await page.fill('input[placeholder="Nombre completo"]', 'Roberto Offline Test');
        await page.fill('input[placeholder="Teléfono"]', '1199887766');
        await page.fill('textarea[placeholder*="detalles operativos"]', 'Cliente cargado durante prueba sin conexión en navegador');
        await page.locator('button:has-text("Guardar en cola offline")').click();
        await page.waitForTimeout(500);

        // Verificar que pasó a la pestaña Cola y muestra 1 operación pendiente
        const queueTextBeforeReload = await page.locator('body').innerText();
        assert.match(queueTextBeforeReload, /1 operación\(es\) listas para enviar/i, 'Debe figurar 1 borrador en la cola offline');

        // CERRAR Y REABRIR (recargar la página todavía sin conexión y reabrir el modal)
        console.log('   -> Cerrando y reabriendo sin conexión para verificar persistencia del borrador...');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);
        await page.locator('button[title="Modo Offline y Sincronización"]').click();
        await page.locator('button:has-text("Cola y Conflictos")').click();
        const queueTextAfterReload = await page.locator('body').innerText();
        assert.match(queueTextAfterReload, /1 operación\(es\) listas para enviar/i, 'El borrador debe persistir tras cerrar y reabrir sin conexión');
        assert.match(queueTextAfterReload, /CLIENT_DRAFT/i, 'Debe verse la operación CLIENT_DRAFT en cola');

        // RECONECTAR LA RED Y SINCRONIZAR SIN DUPLICADOS
        console.log('   -> Reconectando la red (context.setOffline(false)) y sincronizando...');
        await context.setOffline(false);
        await page.waitForTimeout(500);

        await page.locator('button:has-text("Sincronizar ahora")').click();
        await page.waitForTimeout(1500);

        const queueTextAfterSync = await page.locator('body').innerText();
        assert.match(queueTextAfterSync, /0 operación\(es\) listas para enviar/i, 'La cola debe quedar en 0 tras sincronizar');

        // Verificar en el backend que el cliente "Roberto Offline Test" se creó exactamente 1 vez sin duplicados
        const clientDuplicatesCheck = await page.evaluate(async () => {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/clients?search=Roberto%20Offline%20Test', {
                headers: { Authorization: `Bearer ${token}` }
            }).then(r => r.json());
            const list = res.clients || res || [];
            return list.filter(c => c.fullName === 'Roberto Offline Test').length;
        });
        assert.equal(clientDuplicatesCheck, 1, 'El borrador sincronizado debe haber creado exactamente 1 cliente sin duplicados');
        console.log('   OK: Reconexión y sincronización completadas sin duplicados.');

        console.log('\n==============================================================');
        console.log('TODAS LAS COMPROBACIONES EN EL NAVEGADOR PASARON EXITOSAMENTE');
        console.log('==============================================================');
    } finally {
        await browser.close();
    }
}

runBrowserVerification().catch((err) => {
    console.error('Fallo en la verificación en navegador:', err);
    process.exit(1);
});
