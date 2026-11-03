import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import assert from 'assert';
dotenv.config();

async function runTests() {
    console.log('--- INICIANDO TEST DE AUDITORÍA COMERCIAL Y CONCILIACIÓN DE STOCK ---');

    let uri = process.env.MONGODB_URI;
    const url = new URL(uri);
    url.pathname = '/autosporting';
    await mongoose.connect(url.toString());
    const db = mongoose.connection.db;

    const allCars = await db.collection('cars').find({}).toArray();
    const trashRecords = await db.collection('trashrecords').find({ entityType: 'Car' }).toArray();

    // 1. Reconstruir snapshot de 34 unidades (con el Fiat Cronos de $23.500.000 enviado a papelera)
    let stockSnapshot = allCars.filter(c => {
        const st = (c.status || '').toLowerCase().trim();
        return st !== 'vendido' && st !== 'cancelado' && st !== 'anulado' && !c.sold;
    });

    const trashCronos = trashRecords.find(t => t.entityId && t.entityId.toString() === '6abec2bf7938b54df8a15ac0');
    assert(trashCronos, 'El Fiat Cronos 2023 de $23.500.000 debe existir en trashrecords');
    
    // El Clio 2015 fue creado recientemente hoy (20:56 UTC); para el snapshot original de 20 disponibles lo excluimos:
    const clioReciente = stockSnapshot.find(c => c._id.toString() === '6aea4a8519aafdcbc54b24c4');
    const snapshotCars = stockSnapshot
        .filter(c => c._id.toString() !== '6aea4a8519aafdcbc54b24c4')
        .concat([{
            ...trashCronos.snapshot,
            _id: trashCronos.entityId,
            status: 'Pausado'
        }]);

    assert.strictEqual(snapshotCars.length, 34, 'El snapshot original debe contener exactamente 34 unidades activas');
    console.log('✓ Snapshot original de 34 unidades reconstruido fielmente con el registro de papelera');

    // 2. Separar las 20 disponibles de las 14 adicionales
    const disponibles20 = snapshotCars.filter(c => (c.status || '').toLowerCase().trim() === 'disponible');
    const adicionales14 = snapshotCars.filter(c => (c.status || '').toLowerCase().trim() !== 'disponible');

    assert.strictEqual(disponibles20.length, 20, 'Debe haber exactamente 20 unidades disponibles');
    assert.strictEqual(adicionales14.length, 14, 'Debe haber exactamente 14 unidades adicionales (6 res, 6 paus, 2 s/e)');
    console.log('✓ Separación 20 Disponibles / 14 Adicionales verificada');

    // 3. Conciliar los 4 grupos de las 20 disponibles
    let propiosTotal = 0;
    let comp50Total = 0;
    let comp50Propio = 0;
    let comp50Inv = 0;
    let comp100Total = 0;
    let comp100Inv = 0;
    let sinPrecioCount = 0;

    for (const c of disponibles20) {
        const price = Number(c.price) || 0;
        const isConsignment = Boolean(c.consignedBy && c.consignedBy.trim() !== '');
        const invPct = isConsignment ? 0 : Number(c.investor?.percentage) || 0;
        const ownPct = isConsignment ? 0 : Math.max(0, 100 - invPct);

        if (price === 0 || isConsignment) {
            sinPrecioCount++;
        } else if (invPct === 0) {
            propiosTotal += price;
        } else if (invPct === 50) {
            comp50Total += price;
            comp50Propio += Math.round(price * 0.5);
            comp50Inv += Math.round(price * 0.5);
        } else if (invPct === 100) {
            comp100Total += price;
            comp100Inv += price;
        }
    }

    assert.strictEqual(propiosTotal, 377100000, 'Los 9 propios deben sumar exactamente $377.100.000');
    assert.strictEqual(comp50Total, 270000000, 'Los 7 compartidos 50% deben sumar exactamente $270.000.000');
    assert.strictEqual(comp50Propio, 135000000, 'La parte propia de compartidos 50% debe ser $135.000.000');
    assert.strictEqual(comp50Inv, 135000000, 'La parte inversor de compartidos 50% debe ser $135.000.000');
    assert.strictEqual(comp100Total, 42000000, 'Joy + EcoSport (100% mamá) deben sumar $42.000.000');
    assert.strictEqual(comp100Inv, 42000000, 'La parte inversor de Joy + EcoSport debe ser $42.000.000 y propio $0');
    assert.strictEqual(sinPrecioCount, 2, 'Debe haber 2 filas sin precio visible (Audi Q2 y Cronos Drive MT)');

    const subtotalVisibleTotal = propiosTotal + comp50Total + comp100Total;
    const subtotalVisiblePropio = propiosTotal + comp50Propio;
    const subtotalVisibleInv = comp50Inv + comp100Inv;

    assert.strictEqual(subtotalVisibleTotal, 689100000, 'Subtotal visible debe ser $689.100.000');
    assert.strictEqual(subtotalVisiblePropio, 512100000, 'Parte propia visible debe ser $512.100.000');
    assert.strictEqual(subtotalVisibleInv, 177000000, 'Parte inversionista visible debe ser $177.000.000');
    console.log('✓ Tabla de 20 disponibles conciliada con exactitud al peso ($689.100.000 total = $512.100.000 propio + $177.000.000 inv)');

    // 4. Conciliar las 14 adicionales
    let adicTotal = 0;
    let adicPropio = 0;
    let adicInv = 0;

    for (const c of adicionales14) {
        const price = Number(c.price) || 0;
        const isConsignment = Boolean(c.consignedBy && c.consignedBy.trim() !== '');
        const invPct = isConsignment ? 0 : Number(c.investor?.percentage) || 0;
        const ownPct = isConsignment ? 0 : Math.max(0, 100 - invPct);

        const contribPropio = Math.round(price * (ownPct / 100));
        const contribInv = isConsignment ? 0 : (price - contribPropio);

        adicTotal += price;
        adicPropio += contribPropio;
        adicInv += contribInv;
    }

    assert.strictEqual(adicTotal, 237700001, 'Diferencia total de las 14 unidades debe ser exactamente $237.700.001');
    assert.strictEqual(adicPropio, 178250001, 'Diferencia propia de las 14 unidades debe ser exactamente $178.250.001');
    assert.strictEqual(adicInv, 59450000, 'Diferencia inversionistas de las 14 unidades debe ser exactamente $59.450.000');
    console.log('✓ Diferencia de las 14 adicionales conciliada con exactitud al peso ($237.700.001 = $178.250.001 propio + $59.450.000 inv)');

    // 5. Conciliar la suma final de las tarjetas de captura
    assert.strictEqual(subtotalVisibleTotal + adicTotal, 926800001, 'Total de tarjetas debe ser $926.800.001');
    assert.strictEqual(subtotalVisiblePropio + adicPropio, 690350001, 'Propio de tarjetas debe ser $690.350.001');
    assert.strictEqual(subtotalVisibleInv + adicInv, 236450000, 'Inversionistas de tarjetas debe ser $236.450.000');
    console.log('✓ Reconciliación con las tarjetas de captura demostrada (689.1M + 237.7M = 926.8M)');

    // 6. Conciliar el estado en vivo actual con 33 unidades (excluyendo el Cronos de papelera)
    const liveCars = allCars.filter(c => {
        const st = (c.status || '').toLowerCase().trim();
        return st !== 'vendido' && st !== 'cancelado' && st !== 'anulado' && !c.sold;
    });
    console.log(`✓ Inventario en vivo actual: ${liveCars.length} unidades activas (incluye el nuevo Clio 2015 100% de Marcela)`);

    console.log('\n=========================================');
    console.log('TODAS LAS PRUEBAS DE CONCILIACIÓN COMERCIAL PASARON EXITOSAMENTE.');
    console.log('=========================================');

    await mongoose.connection.close();
}

runTests().catch(err => {
    console.error('ERROR EN PRUEBAS:', err);
    process.exit(1);
});
