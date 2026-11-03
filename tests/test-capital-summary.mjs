import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import assert from 'assert';
dotenv.config();

import { getCapitalSummary } from '../src/services/capitalSummaryService.js';

async function runTests() {
    console.log('--- INICIANDO SUITE DE PRUEBAS DE RESUMEN DE CAPITAL Y AUDITORÍA ---');

    let uri = process.env.MONGODB_URI;
    const url = new URL(uri);
    url.pathname = '/autosporting';
    await mongoose.connect(url.toString());
    const db = mongoose.connection.db;

    // 1. Ejecutar servicio
    const res = await getCapitalSummary();
    assert(res, 'El servicio debe retornar datos');
    assert(res.componentes, 'Debe contener los 5 componentes');
    assert(res.totales, 'Debe contener los totales calculados');

    console.log('✓ Servicio ejecutado exitosamente');

    // 2. Comprobar coherencia de la ecuación patrimonial a costo:
    // Capital = Stock Propio + Efectivo Conciliado + Cartera Propia + Otros Créditos - Deudas
    const comp = res.componentes;
    const expectedCapitalCosto = 
        comp.stockPropioCosto.monto +
        comp.efectivoPropio.monto +
        comp.carteraPropia.monto +
        comp.otrosCreditos.monto -
        comp.deudasPropia.monto;

    assert.strictEqual(res.totales.capitalPropioCosto, expectedCapitalCosto, 'La suma patrimonial a costo debe ser exacta');
    console.log(`✓ Ecuación a costo verificada: $${res.totales.capitalPropioCosto.toLocaleString('es-AR')}`);

    // 3. Comprobar coherencia del escenario a precios publicados:
    const expectedCapitalPub = 
        res.totales.stockPropioPublicado +
        comp.efectivoPropio.monto +
        comp.carteraPropia.monto +
        comp.otrosCreditos.monto -
        comp.deudasPropia.monto;

    assert.strictEqual(res.totales.capitalPropioPublicado, expectedCapitalPub, 'El escenario a precio publicado debe ser exacto');
    console.log(`✓ Escenario a precios publicados verificado: $${res.totales.capitalPropioPublicado.toLocaleString('es-AR')}`);

    // 4. Comprobar que el margen potencial es la diferencia entre publicado y costo:
    assert.strictEqual(
        res.totales.margenComercialPotencial,
        res.totales.stockPropioPublicado - comp.stockPropioCosto.monto,
        'El margen comercial debe ser exactamente Stock Publicado - Stock a Costo'
    );
    console.log(`✓ Margen comercial potencial verificado: $${res.totales.margenComercialPotencial.toLocaleString('es-AR')}`);

    // 5. Comprobar Efectivo Disponible (Regla: no confundir efectivo con capital total)
    assert(res.totales.efectivoDisponible > 0, 'Debe reportar efectivo disponible real');
    assert.strictEqual(res.totales.efectivoDisponible, comp.efectivoPropio.monto, 'El efectivo disponible debe coincidir con cuentas');
    console.log(`✓ Efectivo disponible real verificado: $${res.totales.efectivoDisponible.toLocaleString('es-AR')}`);

    // 6. Auditoría de cifras de pantalla y movimiento a papelera:
    assert.strictEqual(res.totales.valorStockTotalPublicado, res.totales.stockPropioPublicado + res.totales.stockInversionistasPublicado, 'Total en vivo debe ser la suma de propio + inversionistas');
    
    // Verificar si el Fiat Cronos 2023 ($23.500.000) está en papelera:
    const trashCar = await db.collection('trashrecords').findOne({ entityId: new mongoose.Types.ObjectId('6abec2bf7938b54df8a15ac0') });
    assert(trashCar, 'Debe existir el registro en papelera del Cronos');
    
    // Si excluimos altas posteriores a la captura (Clio 2015 creado a las 20:56 UTC):
    const nuevoClio = await db.collection('cars').findOne({ _id: new mongoose.Types.ObjectId('6aea4a8519aafdcbc54b24c4') });
    const precioClio = nuevoClio ? Number(nuevoClio.price) || 0 : 0;
    const precioCronos = 23500000;

    const totalMomentoCaptura = res.totales.valorStockTotalPublicado - precioClio + precioCronos;
    assert.strictEqual(totalMomentoCaptura, 926800001, 'Reconciliación con la captura de pantalla: total previo era $926.800.001');
    console.log('✓ Reconciliación con la captura demostrada: Descontando el Clio recién creado ($13.8M) y sumando el Cronos de papelera ($23.5M), el total original es exactamente $926.800.001');

    // 7. Verificar el diagnóstico del $1
    const oddVehicles = res.auditoriaIndicadores.origenPesosUno.vehiculos;
    assert(oddVehicles.length >= 3, 'Debe identificar los vehículos causantes de la terminación en 1');
    const cronosDrive1 = oddVehicles.find(v => v.precioPublicado === 1 && v.titulo.includes('Fiat'));
    const amarok1 = oddVehicles.find(v => v.precioPublicado === 1 && v.titulo.includes('Volkswagen'));
    const polo999 = oddVehicles.find(v => v.precioPublicado === 13999999);
    assert(cronosDrive1, 'Debe detectar Fiat Cronos con precio provisorio $1');
    assert(amarok1, 'Debe detectar Amarok V6 con precio provisorio $1');
    assert(polo999, 'Debe detectar Gol Trend con precio comercial $13.999.999');
    console.log('✓ Origen de la terminación en $1 verificado (1 + 1 + 13.999.999 = 14.000.001 propio)');

    // 8. Verificar que las consignaciones no suman a capital propio
    assert.strictEqual(res.totales.consignacionesCount, 1, 'Debe haber 1 consignación (Audi de Jorge Lectio)');
    const consignmentItem = comp.stockPropioCosto.items.find(v => v.isConsignment);
    assert(!consignmentItem, 'Consignación no debe estar en stockPropioCosto');
    console.log('✓ Regla #10 Anti-doble conteo: consignaciones excluidas de capital propio');

    // 9. Verificar Cartera y cuotas de contraste (Yaris 3.54M = 3 x 1.18M, Territory 12 x 1.35M)
    const yarisCuotas = comp.carteraPropia.items.filter(i => i.vehicleTitle.toLowerCase().includes('yaris'));
    assert.strictEqual(yarisCuotas.length, 3, 'Yaris debe tener 3 cuotas pendientes');
    const totalYaris = yarisCuotas.reduce((acc, i) => acc + i.remaining, 0);
    assert.strictEqual(totalYaris, 3540000, 'Cuotas de Yaris deben sumar exactamente $3.540.000');
    console.log('✓ Caso de contraste Yaris verificado (3 cuotas de $1.180.000 = $3.540.000 total)');

    const territoryCuotas = comp.carteraPropia.items.filter(i => i.vehicleTitle.toLowerCase().includes('territory'));
    assert.strictEqual(territoryCuotas.length, 12, 'Territory 2022 debe tener 12 cuotas pendientes');
    const totalTerritory = territoryCuotas.reduce((acc, i) => acc + i.remaining, 0);
    assert.strictEqual(totalTerritory, 16200000, 'Cuotas Territory deben sumar $16.200.000');
    console.log('✓ Caso de contraste Territory verificado (12 cuotas de $1.350.000 = $16.200.000 total)');

    console.log('\n=========================================');
    console.log('TODAS LAS PRUEBAS FINANCIERAS PASARON EXITOSAMENTE.');
    console.log('=========================================');

    await mongoose.connection.close();
}

runTests().catch(err => {
    console.error('ERROR EN PRUEBAS:', err);
    process.exit(1);
});
