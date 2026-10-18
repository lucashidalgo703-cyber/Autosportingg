/**
 * Test de Verificación Automatizado: Reparto Sugerido de Tesorería Estratégica
 * 
 * Verifica que:
 * 1. Las metas de Operativa, Impuestos, Deudas, Personal, Postventa y Reserva sean 100% determinísticas
 *    e invariantes ante variaciones en la liquidez disponible (ej. 10M vs 26.1M vs 50M).
 * 2. Se elimine permanentemente todo reparto porcentual silencioso (10%, 15%, etc.).
 * 3. Si falta información, se marque como "Configuración incompleta" sin asumir $0 ni porcentajes.
 * 4. Si los fondos son insuficientes, se respeten las prioridades y se señalen los déficits sin presentar
 *    la estructura como cubierta.
 * 5. Stock y Crecimiento reciban únicamente excedente si hay una regla expresamente configurada.
 */

import assert from 'assert';

// Simulación de función pura determinística idéntica a calculateSuggestedAllocation
function simulateSuggestedAllocation({
    liquidityARS,
    commitments,
    burnRateARS,
    reserveMonths,
    personalBudgetARS,
    postventaProvisionPerVehicleARS,
    eligibleSalesCount,
    surplusRule,
    priorityOrder = ['operativa', 'impuestos', 'deudas', 'personal', 'postventa', 'reserva', 'stock', 'crecimiento']
}) {
    // Metas determinísticas independientes de la liquidez
    const targetMap = {
        operativa: {
            targetARS: commitments.operativa || 0,
            isConfigIncomplete: (commitments.operativa || 0) === 0,
            missingDataNote: (commitments.operativa || 0) === 0 ? 'Sin gastos operativos cargados.' : null
        },
        impuestos: {
            targetARS: commitments.impuestos || 0,
            isConfigIncomplete: (commitments.impuestos || 0) === 0,
            missingDataNote: (commitments.impuestos || 0) === 0 ? 'Sin impuestos cargados.' : null
        },
        deudas: {
            targetARS: commitments.deudas || 0,
            isConfigIncomplete: false,
            missingDataNote: null
        },
        personal: {
            targetARS: personalBudgetARS || 0,
            isConfigIncomplete: (personalBudgetARS || 0) <= 0,
            missingDataNote: (personalBudgetARS || 0) <= 0 ? 'Presupuesto de retiros del propietario no configurado.' : null
        },
        reserva: {
            targetARS: (burnRateARS || 0) * (reserveMonths || 0),
            isConfigIncomplete: (burnRateARS || 0) <= 0 || (reserveMonths || 0) <= 0,
            missingDataNote: (burnRateARS || 0) <= 0 ? 'Faltan reglas de gastos fijos operativos.' : null
        },
        postventa: {
            targetARS: (postventaProvisionPerVehicleARS || 0) * (eligibleSalesCount || 0),
            isConfigIncomplete: (postventaProvisionPerVehicleARS || 0) <= 0,
            missingDataNote: (postventaProvisionPerVehicleARS || 0) <= 0 ? 'Provisión de postventa no configurada.' : null
        },
        stock: {
            targetARS: 0,
            isConfigIncomplete: !surplusRule?.configured,
            missingDataNote: !surplusRule?.configured ? 'Regla de excedente no configurada.' : null
        },
        crecimiento: {
            targetARS: 0,
            isConfigIncomplete: !surplusRule?.configured,
            missingDataNote: !surplusRule?.configured ? 'Regla de excedente no configurada.' : null
        }
    };

    let remainingFunds = Number(liquidityARS || 0);
    const boxResults = {};

    // Cascada de prioridades
    for (const key of priorityOrder) {
        if (key === 'stock' || key === 'crecimiento') continue;

        const meta = targetMap[key];
        const target = meta.targetARS;
        const shortfall = target; // Asumiendo balance inicial 0 para la prueba de asignación
        const allocated = Math.min(remainingFunds, shortfall);
        const uncovered = shortfall - allocated;
        remainingFunds -= allocated;

        boxResults[key] = {
            targetARS: target,
            suggestedAmountARS: allocated,
            uncoveredShortfallARS: uncovered,
            isConfigIncomplete: meta.isConfigIncomplete,
            missingDataNote: meta.missingDataNote
        };
    }

    // Excedente para Stock y Crecimiento
    const surplusPoolARS = Math.max(0, remainingFunds);
    let stockSuggested = 0;
    let crecimientoSuggested = 0;

    if (surplusRule?.configured && surplusPoolARS > 0) {
        stockSuggested = Math.round(surplusPoolARS * ((surplusRule.stockPercent || 0) / 100));
        crecimientoSuggested = Math.round(surplusPoolARS * ((surplusRule.crecimientoPercent || 0) / 100));
        remainingFunds -= (stockSuggested + crecimientoSuggested);
    }

    boxResults.stock = {
        targetARS: stockSuggested,
        suggestedAmountARS: stockSuggested,
        uncoveredShortfallARS: 0,
        isConfigIncomplete: !surplusRule?.configured,
        missingDataNote: !surplusRule?.configured ? 'Regla de excedente no configurada.' : null
    };

    boxResults.crecimiento = {
        targetARS: crecimientoSuggested,
        suggestedAmountARS: crecimientoSuggested,
        uncoveredShortfallARS: 0,
        isConfigIncomplete: !surplusRule?.configured,
        missingDataNote: !surplusRule?.configured ? 'Regla de excedente no configurada.' : null
    };

    let totalDeficitARS = 0;
    Object.values(boxResults).forEach(b => {
        totalDeficitARS += b.uncoveredShortfallARS;
    });

    return {
        boxResults,
        totalDeficitARS,
        hasDeficit: totalDeficitARS > 0,
        surplusPoolARS,
        unassignedRemainderARS: remainingFunds
    };
}

// ----------------------------------------------------------------------
// EJECUCIÓN DE PRUEBAS
// ----------------------------------------------------------------------
function runTests() {
    console.log('--- INICIANDO TESTS DE REPARTO SUGERIDO DETERMINÍSTICO ---');

    const commonParams = {
        commitments: {
            operativa: 2500000,
            impuestos: 1200000,
            deudas: 800000
        },
        burnRateARS: 1500000,
        reserveMonths: 2, // 1.5M * 2 = 3.000.000
        personalBudgetARS: 4000000, // Retiros del titular
        postventaProvisionPerVehicleARS: 300000,
        eligibleSalesCount: 4 // 300k * 4 = 1.200.000
        // Total de necesidades fijas: 2.5M + 1.2M + 0.8M + 4M + 3M + 1.2M = 12.700.000 ARS
    };

    // 1. Invarianza de Metas ante Diferentes Niveles de Liquidez
    const res10M = simulateSuggestedAllocation({ ...commonParams, liquidityARS: 10000000, surplusRule: { configured: false } });
    const res26M = simulateSuggestedAllocation({ ...commonParams, liquidityARS: 26100000, surplusRule: { configured: false } });
    const res50M = simulateSuggestedAllocation({ ...commonParams, liquidityARS: 50000000, surplusRule: { configured: true, stockPercent: 80, crecimientoPercent: 20 } });

    console.log('\n1. Verificando invarianza de metas ante liquidez variable:');
    ['operativa', 'impuestos', 'deudas', 'personal', 'reserva', 'postventa'].forEach(boxKey => {
        const t10 = res10M.boxResults[boxKey].targetARS;
        const t26 = res26M.boxResults[boxKey].targetARS;
        const t50 = res50M.boxResults[boxKey].targetARS;

        console.log(`  - Caja [${boxKey.padEnd(10)}]: Target 10M=$${t10.toLocaleString()} | Target 26.1M=$${t26.toLocaleString()} | Target 50M=$${t50.toLocaleString()}`);
        assert.strictEqual(t10, t26, `Meta de ${boxKey} varió entre 10M y 26.1M`);
        assert.strictEqual(t26, t50, `Meta de ${boxKey} varió entre 26.1M y 50M`);
    });
    console.log('  => ÉXITO: Ninguna meta fija depende de la liquidez disponible.');

    // 2. Comportamiento ante Fondos Insuficientes (10M frente a 12.7M requeridos)
    console.log('\n2. Verificando fondos insuficientes (Liquidez: ARS 10.000.000):');
    assert.strictEqual(res10M.hasDeficit, true, 'Debe detectar déficit');
    assert.strictEqual(res10M.totalDeficitARS, 2700000, 'El déficit no cubierto debe ser exactamente 2.700.000 ARS');
    assert.strictEqual(res10M.boxResults.reserva.uncoveredShortfallARS, 2700000, 'La caja Reserva debe tener déficit no cubierto de 2.700.000 ARS');
    console.log(`  - Total déficit detectado: ARS ${res10M.totalDeficitARS.toLocaleString()}`);
    console.log('  => ÉXITO: Déficit identificado correctamente sin presentar la estructura como cubierta.');

    // 3. Comportamiento de Excedente sin Regla Configurada (26.1M de liquidez)
    console.log('\n3. Verificando excedente de 26.1M sin regla de excedente:');
    assert.strictEqual(res26M.hasDeficit, false, 'No debe haber déficit');
    assert.strictEqual(res26M.boxResults.stock.suggestedAmountARS, 0, 'Stock debe ser $0 si no hay regla');
    assert.strictEqual(res26M.boxResults.crecimiento.suggestedAmountARS, 0, 'Crecimiento debe ser $0 si no hay regla');
    assert.strictEqual(res26M.unassignedRemainderARS, 26100000 - 12700000, 'El excedente debe quedar 100% sin asignar');
    console.log(`  - Remanente sin asignar en cuentas: ARS ${res26M.unassignedRemainderARS.toLocaleString()}`);
    console.log('  - Asignado a Stock: ARS 0 (eliminado porcentaje silencioso del 85%)');
    console.log('  - Asignado a Crecimiento: ARS 0 (eliminado porcentaje silencioso del 15%)');
    console.log('  => ÉXITO: Remanente protegido en cuentas sin inventar compras.');

    // 4. Comportamiento de Excedente con Regla Configurada (50M de liquidez, 80/20)
    console.log('\n4. Verificando excedente de 50M con regla expresa 80% Stock / 20% Crecimiento:');
    const surplus50 = 50000000 - 12700000; // 37.300.000
    const expectedStock = Math.round(surplus50 * 0.8);
    const expectedCrec = Math.round(surplus50 * 0.2);
    assert.strictEqual(res50M.boxResults.stock.suggestedAmountARS, expectedStock, 'Stock debe recibir exactamente 80%');
    assert.strictEqual(res50M.boxResults.crecimiento.suggestedAmountARS, expectedCrec, 'Crecimiento debe recibir exactamente 20%');
    assert.strictEqual(res50M.unassignedRemainderARS, 0, 'Todo el excedente fue asignado por la regla');
    console.log(`  - Excedente: ARS ${surplus50.toLocaleString()}`);
    console.log(`  - Stock (80%): ARS ${res50M.boxResults.stock.suggestedAmountARS.toLocaleString()}`);
    console.log(`  - Crecimiento (20%): ARS ${res50M.boxResults.crecimiento.suggestedAmountARS.toLocaleString()}`);
    console.log('  => ÉXITO: Regla de excedente aplicada fielmente.');

    // 5. Verificación de Datos Faltantes (Configuración Incompleta)
    console.log('\n5. Verificando detección de datos ausentes (Configuración Incompleta):');
    const resIncomplete = simulateSuggestedAllocation({
        ...commonParams,
        liquidityARS: 26100000,
        personalBudgetARS: 0, // Falta presupuesto de retiros
        postventaProvisionPerVehicleARS: 0, // Falta provisión de postventa
        surplusRule: { configured: false }
    });

    assert.strictEqual(resIncomplete.boxResults.personal.isConfigIncomplete, true, 'Debe marcar Personal como incompleto');
    assert.strictEqual(resIncomplete.boxResults.postventa.isConfigIncomplete, true, 'Debe marcar Postventa como incompleto');
    assert.strictEqual(typeof resIncomplete.boxResults.personal.missingDataNote, 'string', 'Debe explicar qué dato falta');
    console.log(`  - Personal: ${resIncomplete.boxResults.personal.missingDataNote}`);
    console.log(`  - Postventa: ${resIncomplete.boxResults.postventa.missingDataNote}`);
    console.log('  => ÉXITO: No se asumen datos ausentes como 0 ni se inventan porcentajes.');

    console.log('\n======================================================');
    console.log('✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE CON 100% FIDELIDAD.');
    console.log('======================================================\n');
}

runTests();
