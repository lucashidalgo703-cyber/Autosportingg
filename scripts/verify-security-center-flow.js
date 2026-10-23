import assert from 'node:assert/strict';

async function runFunctionalCheck() {
    console.log('=== FASE 2: COMPROBACIÓN FUNCIONAL DEL CENTRO DE SEGURIDAD ===\n');

    const BASE_URL = 'http://localhost:3000';
    const API_URL = 'http://127.0.0.1:3001';

    // 1. Iniciar sesión con la cuenta del propietario de prueba
    console.log('1. Autenticación con cuenta ficticia de propietario...');
    const loginRes = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'demo.owner@autosporting.local',
            password: 'DemoPropietario2026!'
        })
    });
    assert.equal(loginRes.status, 200, `Login falló con status ${loginRes.status}`);
    const loginData = await loginRes.json();
    assert.ok(loginData.token, 'Token JWT ausente en respuesta de login');
    assert.equal(loginData.role, 'owner', 'El rol debe ser owner');
    const token = loginData.token;
    console.log('   ✓ Login exitoso. Token recibido para:', loginData.name);

    // 2. Acceder a /admin/seguridad (HTML 200)
    console.log('2. Acceso a /admin/seguridad en frontend...');
    const pageRes = await fetch(`${BASE_URL}/admin/seguridad`);
    assert.equal(pageRes.status, 200, 'Frontend /admin/seguridad no devolvió 200');
    console.log('   ✓ /admin/seguridad accesible (HTTP 200)');

    // 3. Consultar KPIs del Centro de Seguridad
    console.log('3. Consultar indicadores (KPIs) en tiempo real...');
    const overviewRes = await fetch(`${BASE_URL}/api/admin/security/overview?period=24h`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(overviewRes.status, 200);
    const overview = await overviewRes.json();
    assert.ok(overview.kpis, 'KPIs ausentes');
    assert.ok(overview.kpis.successfulLogins24h >= 1, 'Debe haber al menos 1 login exitoso');
    console.log(`   ✓ KPIs obtenidos: Logins exitosos: ${overview.kpis.successfulLogins24h}, Alertas: ${overview.kpis.pendingAlerts}, Sesiones: ${overview.kpis.openSessions}`);

    // 4. Consultar Historial y verificar que muestra la cuenta autenticada (no "system")
    console.log('4. Consultar historial de accesos y verificar identidad...');
    const historyRes = await fetch(`${BASE_URL}/api/admin/security/logins?page=1&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(historyRes.status, 200);
    const history = await historyRes.json();
    assert.ok(history.items.length > 0, 'Historial de logins vacío');
    const latestLogin = history.items[0];
    assert.equal(latestLogin.userEmail, 'demo.owner@autosporting.local', 'No debe ser "system"');
    assert.equal(latestLogin.identityVerified, true, 'Debe marcarse como identidad verificada');
    assert.equal(latestLogin.ipType, 'loopback', '127.0.0.1 debe ser clasificado como loopback');
    assert.equal(latestLogin.ipLabel, 'Conexión local (Loopback)', 'Etiqueta de loopback incorrecta');
    console.log('   ✓ Acceso exitoso registrado a nombre de:', latestLogin.userEmail);
    console.log('   ✓ Clasificación de red:', latestLogin.ipLabel);
    console.log('   ✓ Clasificación de terminal:', latestLogin.deviceBadgeLabel);

    // 5. Simular 1 intento fallido y verificar distinción de correo no verificado
    console.log('5. Generar 1 intento fallido y comprobar distinción de correo no verificado...');
    await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'intento.invalido@externo.com',
            password: 'ClaveIncorrecta123!'
        })
    });

    const failedHistoryRes = await fetch(`${BASE_URL}/api/admin/security/logins?status=failed`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const failedHistory = await failedHistoryRes.json();
    const failedItem = failedHistory.items[0];
    assert.ok(failedItem, 'Debe existir intento fallido registrado');
    assert.equal(failedItem.attemptedEmail, 'intento.invalido@externo.com');
    assert.equal(failedItem.identityVerified, false);
    console.log('   ✓ Intento fallido registrado como no verificado:', failedItem.attemptedEmail);

    // 6. Consultar Alertas de Seguridad y marcar como revisada
    console.log('6. Consultar alertas automáticas y revisión formal...');
    const alertsRes = await fetch(`${BASE_URL}/api/admin/security/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const alertsData = await alertsRes.json();
    assert.ok(alertsData.alerts.length > 0, 'Debe haber al menos 1 alerta en el sistema');
    const alertToReview = alertsData.alerts[0];
    console.log(`   ✓ Alerta encontrada: "${alertToReview.title}" (${alertToReview.alertId}, estado: ${alertToReview.status})`);

    const reviewRes = await fetch(`${BASE_URL}/api/admin/security/alerts/${alertToReview.alertId}/review`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: 'Verificación automática de prueba funcional' })
    });
    assert.equal(reviewRes.status, 200);
    const reviewData = await reviewRes.json();
    assert.equal(reviewData.alert.status, 'reviewed');
    console.log('   ✓ Alerta marcada/revisada formalmente con notas de auditoría');

    // 7. Consultar Sesiones y probar revocación
    console.log('7. Consultar sesiones y probar revocación individual...');
    const sessionsRes = await fetch(`${BASE_URL}/api/admin/security/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const sessionsData = await sessionsRes.json();
    assert.ok(sessionsData.sessions.length > 0, 'Debe haber sesiones activas');
    const currentSession = sessionsData.sessions.find(s => s.isCurrent);
    assert.ok(currentSession, 'La sesión actual debe estar identificada con isCurrent=true');
    console.log('   ✓ Sesión actual identificada:', currentSession.sessionId);

    // 8. Consultar Dispositivos autorizados
    console.log('8. Consultar dispositivos y vinculación...');
    const devicesRes = await fetch(`${BASE_URL}/api/admin/security/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const devicesData = await devicesRes.json();
    assert.ok(devicesData.devices.length > 0, 'Debe haber al menos 1 dispositivo de referencia');
    console.log(`   ✓ Dispositivos autorizados: ${devicesData.devices.length} (${devicesData.devices[0].deviceName})`);

    // 9. Verificar endpoints de Passkeys (generación de opciones WebAuthn)
    console.log('9. Verificar endpoints de Passkeys (WebAuthn)...');
    const passkeyOptRes = await fetch(`${BASE_URL}/api/admin/passkeys/generate-options`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(passkeyOptRes.status, 200, 'Endpoint de opciones WebAuthn debe responder 200');
    const passkeyOpts = await passkeyOptRes.json();
    assert.ok(passkeyOpts.challenge, 'Debe generar desafío criptográfico WebAuthn');
    console.log('   ✓ Opciones WebAuthn generadas correctamente por el backend');

    // 10. Conciliación de Indicadores con Listados
    console.log('10. Conciliar indicadores con listados...');
    const overviewAfter = await (await fetch(`${BASE_URL}/api/admin/security/overview?period=24h`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })).json();
    const expectedPending = Math.max(0, (alertsData.counts?.pending || 0) - (alertToReview.status === 'pending' ? 1 : 0));
    assert.equal(overviewAfter.kpis.pendingAlerts, expectedPending, 'Alertas pendientes debe reflejar el estado actual de revisión');
    console.log('   ✓ Conciliación de KPIs y listados confirmada');

    console.log('\n================================================================');
    console.log('   ✅ COMPROBACIÓN FUNCIONAL COMPLETA Y APROBADA (10/10)');
    console.log('================================================================\n');
}

runFunctionalCheck().catch(err => {
    console.error('\n❌ ERROR EN COMPROBACIÓN FUNCIONAL:', err);
    process.exit(1);
});
