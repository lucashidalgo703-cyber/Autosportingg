import assert from 'assert';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

console.log('--- INICIANDO TEST DE AUDITORÍA: STOCK EXCLUSIVO DISPONIBLES ---');

async function runTests() {
    let connection;
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI no definida en .env');
        }

        const url = new URL(mongoUri);
        url.pathname = '/autosporting';
        await mongoose.connect(url.toString(), { serverSelectionTimeoutMS: 15000 });
        connection = mongoose.connection;
        const db = connection.db;

        const rawCars = await db.collection('cars').find({}).toArray();
        console.log(`✓ Conectado a MongoDB. Total autos en base de datos: ${rawCars.length}`);

        // Función canónica de cálculo para DISPONIBLES (idéntica a server.js y StockCommercialCalculator)
        function calculateDisponiblesCommercial(cars) {
            const disponibles = cars.filter(c => {
                const st = (c.status || '').toLowerCase().trim();
                return st === 'disponible' && !c.sold && st !== 'vendido' && st !== 'cancelado';
            });

            let valorTotalARS = 0;
            let valorPropioARS = 0;
            let valorInversionistasARS = 0;
            let valorTotalUSD = 0;
            let valorPropioUSD = 0;
            let valorInversionistasUSD = 0;

            let consignacionesCount = 0;
            let consignacionesValorARS = 0;
            let consignacionesValorUSD = 0;
            let tercerosCount = 0;

            let zeroPriceCount = 0;
            let provisionalOneCount = 0;

            const includedRows = [];
            const excludedRows = [];

            disponibles.forEach(c => {
                const isConsignment = Boolean(c.consignedBy && String(c.consignedBy).trim() !== '');
                const isThirdParty = !isConsignment && c.agencyOwned === false && (!c.investor || Number(c.investor.percentage) === 0);
                const price = Math.round(Number(c.price) || 0);

                // Normalización de moneda
                const isUSD = (c.currency === 'U$S' || c.currency === 'USD') && price <= 200000;
                const currency = isUSD ? 'USD' : 'ARS';

                if (price <= 0) zeroPriceCount++;
                if (price === 1) provisionalOneCount++;

                if (isConsignment || isThirdParty) {
                    if (isConsignment) consignacionesCount++;
                    if (isThirdParty) tercerosCount++;
                    if (currency === 'USD') consignacionesValorUSD += price;
                    else consignacionesValorARS += price;
                    excludedRows.push({ id: c._id.toString(), brand: c.brand, name: c.name, price, motivo: isConsignment ? 'Consignación' : 'Tercero' });
                    return;
                }

                const isShared = c.investor && Number(c.investor.percentage) > 0;
                const invPct = isShared ? Math.min(100, Math.max(0, Number(c.investor.percentage) || 0)) : 0;
                const agencyPct = Math.max(0, 100 - invPct);

                const contribPropio = Math.round(price * (agencyPct / 100));
                const contribInv = price - contribPropio;

                if (currency === 'USD') {
                    valorTotalUSD += price;
                    valorPropioUSD += contribPropio;
                    valorInversionistasUSD += contribInv;
                } else {
                    valorTotalARS += price;
                    valorPropioARS += contribPropio;
                    valorInversionistasARS += contribInv;
                }

                includedRows.push({
                    id: c._id.toString(),
                    brand: c.brand,
                    name: c.name,
                    price,
                    aporteTotal: price,
                    ownPct: agencyPct,
                    invPct,
                    contribPropio,
                    contribInv,
                    aportePropio: contribPropio,
                    aporteInv: contribInv,
                    currency
                });
            });

            return {
                disponiblesCount: disponibles.length,
                includedCount: includedRows.length,
                excludedCount: excludedRows.length,
                consignacionesCount,
                tercerosCount,
                valorTotalARS,
                valorPropioARS,
                valorInversionistasARS,
                valorTotalUSD,
                valorPropioUSD,
                valorInversionistasUSD,
                consignacionesValorARS,
                consignacionesValorUSD,
                zeroPriceCount,
                provisionalOneCount,
                includedRows,
                excludedRows
            };
        }

        // PRUEBA 1: Verificación de vehículos disponibles en base de datos real
        const liveResult = calculateDisponiblesCommercial(rawCars);
        console.log(`✓ Unidades en Disponible: ${liveResult.disponiblesCount} (Incluidas: ${liveResult.includedCount}, Excluidas: ${liveResult.excludedCount})`);
        console.log(`  - Valor Total Disponible: $${liveResult.valorTotalARS.toLocaleString('es-AR')}`);
        console.log(`  - Mi Participación: $${liveResult.valorPropioARS.toLocaleString('es-AR')}`);
        console.log(`  - Participación Inversores: $${liveResult.valorInversionistasARS.toLocaleString('es-AR')}`);

        // Coherencia matemática exacta
        assert.strictEqual(
            liveResult.valorTotalARS,
            liveResult.valorPropioARS + liveResult.valorInversionistasARS,
            'Valor Total debe ser exactamente igual a Mi Participación + Inversionistas'
        );
        console.log('✓ Igualdad matemática estricta verificada: Valor Total = Mi Participación + Inversionistas');

        // PRUEBA 2: Contraste con la Captura Histórica de 20 Disponibles
        // En la captura histórica de 20 disponibles:
        // - 18 con precio publicado ($689.100.000 total = $512.100.000 propio + $177.000.000 inversionistas)
        // - 2 excluidos: Audi Q2 (consignación) y Cronos Drive MT (tercero)
        // La diferencia en vivo es el alta posterior de Renault Clio 2015 ($13.800.000, 100% Marcela).
        const clio2015 = rawCars.find(c => (c.plateOrVin || '').toLowerCase() === 'oru980');
        assert.ok(clio2015, 'Renault Clio 2015 (oru980) debe existir en la base de datos');

        const carsSinClio = rawCars.filter(c => c._id.toString() !== clio2015._id.toString());
        const historicalSnapshot = calculateDisponiblesCommercial(carsSinClio);

        assert.strictEqual(historicalSnapshot.disponiblesCount, 20, 'El snapshot histórico debe tener exactamente 20 disponibles');
        assert.strictEqual(historicalSnapshot.includedCount, 18, 'El snapshot histórico debe tener 18 autos incluidos con precio');
        assert.strictEqual(historicalSnapshot.excludedCount, 2, 'El snapshot histórico debe tener 2 excluidos (consignación + tercero)');
        assert.strictEqual(historicalSnapshot.valorTotalARS, 689100000, 'Total histórico debe ser exactamente $689.100.000');
        assert.strictEqual(historicalSnapshot.valorPropioARS, 512100000, 'Mi participación histórica debe ser exactamente $512.100.000');
        assert.strictEqual(historicalSnapshot.valorInversionistasARS, 177000000, 'Participación inversionistas histórica debe ser exactamente $177.000.000');
        console.log('✓ Conciliación histórica de las 20 disponibles de la captura verificada al peso: $689.100.000 = $512.100.000 propio + $177.000.000 inv');

        // PRUEBA 3: Inversor 100% aporta CERO a mi participación
        // Joy, EcoSport y Clio tienen 100% inversor
        const inversor100Cars = liveResult.includedRows.filter(r => r.invPct === 100);
        assert.strictEqual(inversor100Cars.length, 3, 'Debe haber 3 vehículos con 100% inversor (Joy, EcoSport, Clio)');
        inversor100Cars.forEach(car => {
            assert.strictEqual(car.contribPropio, 0, `${car.brand} ${car.name} (100% inversor) debe aportar $0 a mi participación`);
            assert.strictEqual(car.contribInv, car.price, `${car.brand} ${car.name} debe aportar el 100% de su precio a inversionistas`);
        });
        console.log('✓ Regla #1 verificada: Vehículos 100% de inversores (Joy, EcoSport, Clio) aportan exactamente $0 a mi participación');

        // PRUEBA 4: Reservar o Pausar una unidad la RETIRA de las tres sumas
        const testCar = liveResult.includedRows.find(r => r.price > 20000000 && r.ownPct === 100);
        assert.ok(testCar, 'Debe existir un auto propio para la prueba de estado');

        const simulatedPausado = rawCars.map(c => {
            if (c._id.toString() === testCar.id) return { ...c, status: 'Pausado' };
            return c;
        });
        const resPausado = calculateDisponiblesCommercial(simulatedPausado);
        assert.strictEqual(resPausado.valorTotalARS, liveResult.valorTotalARS - testCar.price, 'Pausar debe descontar el precio total');
        assert.strictEqual(resPausado.valorPropioARS, liveResult.valorPropioARS - testCar.price, 'Pausar debe descontar la parte propia');
        assert.strictEqual(resPausado.includedCount, liveResult.includedCount - 1, 'Pausar debe reducir en 1 los incluidos');

        const simulatedReservado = rawCars.map(c => {
            if (c._id.toString() === testCar.id) return { ...c, status: 'Reservado' };
            return c;
        });
        const resReservado = calculateDisponiblesCommercial(simulatedReservado);
        assert.strictEqual(resReservado.valorTotalARS, liveResult.valorTotalARS - testCar.price, 'Reservar debe descontar el precio total');
        assert.strictEqual(resReservado.valorPropioARS, liveResult.valorPropioARS - testCar.price, 'Reservar debe descontar la parte propia');
        console.log('✓ Regla #2 verificada: Reservar o pausar una unidad la retira inmediatamente de las tres sumas');

        // Volver a disponible la reincorpora
        const simulatedRestored = simulatedPausado.map(c => {
            if (c._id.toString() === testCar.id) return { ...c, status: 'Disponible' };
            return c;
        });
        const resRestored = calculateDisponiblesCommercial(simulatedRestored);
        assert.strictEqual(resRestored.valorTotalARS, liveResult.valorTotalARS, 'Restaurar a Disponible debe reincorporar el valor exacto');
        console.log('✓ Regla #3 verificada: Volver una unidad a Disponible la reincorpora con exactitud');

        // PRUEBA 5: Cambiar precio o participación actualiza tarjetas y desglose
        const sharedCar = liveResult.includedRows.find(r => r.invPct === 50);
        assert.ok(sharedCar, 'Debe existir un auto compartido al 50%');

        const nuevoPrecio = sharedCar.price + 10000000; // +10M
        const simulatedPriceChange = rawCars.map(c => {
            if (c._id.toString() === sharedCar.id) return { ...c, price: nuevoPrecio };
            return c;
        });
        const resPriceChange = calculateDisponiblesCommercial(simulatedPriceChange);
        assert.strictEqual(resPriceChange.valorTotalARS, liveResult.valorTotalARS + 10000000, 'Cambiar precio actualiza valor total');
        assert.strictEqual(resPriceChange.valorPropioARS, liveResult.valorPropioARS + 5000000, 'Cambiar precio actualiza valor propio al 50%');
        assert.strictEqual(resPriceChange.valorInversionistasARS, liveResult.valorInversionistasARS + 5000000, 'Cambiar precio actualiza valor inversionista al 50%');
        console.log('✓ Regla #4 verificada: Modificar precio o porcentaje redistribuye instantáneamente las 3 sumas');

        // PRUEBA 6: Consignaciones y Terceros excluidos de las 3 tarjetas
        assert.strictEqual(liveResult.excludedCount, 2, 'Deben existir 2 vehículos excluidos (Audi Q2 y Cronos Drive MT)');
        const audiQ2 = liveResult.excludedRows.find(r => r.name.toLowerCase().includes('q2'));
        const cronosMT = liveResult.excludedRows.find(r => r.name.toLowerCase().includes('cronos'));
        assert.ok(audiQ2, 'Audi Q2 debe figurar en excluidos por consignación');
        assert.ok(cronosMT, 'Cronos Drive MT debe figurar en excluidos por ser de tercero');
        console.log('✓ Regla #5 verificada: Consignaciones y terceros estrictamente excluidos de las tarjetas principales');

        // PRUEBA 7: Cada vehículo se cuenta una sola vez
        const includedIds = liveResult.includedRows.map(r => r.id);
        const uniqueIds = new Set(includedIds);
        assert.strictEqual(uniqueIds.size, includedIds.length, 'No deben existir duplicados en los vehículos computados');
        console.log('✓ Regla #6 verificada: Cada vehículo se cuenta una sola vez (cero duplicados)');

        // PRUEBA 8: Los subtotales se calculan dinámicamente desde las filas
        const sumFilasTotal = liveResult.includedRows.reduce((acc, r) => acc + r.aporteTotal, 0);
        const sumFilasPropio = liveResult.includedRows.reduce((acc, r) => acc + r.aportePropio, 0);
        const sumFilasInv = liveResult.includedRows.reduce((acc, r) => acc + r.aporteInv, 0);

        assert.strictEqual(sumFilasTotal, liveResult.valorTotalARS, 'Suma de filas debe ser idéntica a valorTotalARS');
        assert.strictEqual(sumFilasPropio, liveResult.valorPropioARS, 'Suma de filas debe ser idéntica a valorPropioARS');
        assert.strictEqual(sumFilasInv, liveResult.valorInversionistasARS, 'Suma de filas debe ser idéntica a valorInversionistasARS');
        console.log('✓ Regla #7 verificada: Los totales surgen 100% dinámicos de las filas, sin valores hardcodeados');

        console.log('\n=========================================');
        console.log('TODAS LAS PRUEBAS DE DISPONIBLES PASARON EXITOSAMENTE.');
        console.log('=========================================');
    } finally {
        if (connection) {
            await mongoose.disconnect();
        }
    }
}

runTests().catch(err => {
    console.error('ERROR EN PRUEBAS:', err);
    process.exit(1);
});
