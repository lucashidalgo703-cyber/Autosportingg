import assert from 'assert';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import Transaction from '../src/models/Transaction.js';
import Installment from '../src/models/Installment.js';
import ExpenseQuotaAssignment from '../src/models/ExpenseQuotaAssignment.js';
import Account from '../src/models/Account.js';
import {
    assignQuotaToExpense,
    getExpenseAssignmentSummary,
    releaseQuotaAssignment,
    searchQuotasForExpense,
    createManualQuotaAndAssign,
    getQuotaCoveredExpenses,
    findDuplicateInstallments
} from '../src/services/expenseQuotaAssignmentService.js';

async function runTests() {
    console.log('--- Iniciando Suite de Verificación: Asignación de Cuotas a Gastos ---');
    await connectDB();

    const testTag = `TEST_${Date.now()}`;

    // Clean up any test leftovers
    await Transaction.deleteMany({ concept: new RegExp(testTag) });
    await Installment.deleteMany({ concept: new RegExp(testTag) });
    await ExpenseQuotaAssignment.deleteMany({ notes: new RegExp(testTag) });

    let dummyAccount = await Account.findOne({ currency: 'ARS', isActive: true });
    if (!dummyAccount) {
        dummyAccount = new Account({
            name: `Test Account ${testTag}`,
            currency: 'ARS',
            type: 'Efectivo',
            balance: 10000000
        });
        await dummyAccount.save();
    }

    try {
        // ========================================================
        // TEST 1: Caso Base del Enunciado (Sueldo $1.100.000 y Cuota $1.350.000)
        // ========================================================
        console.log('\n[TEST 1] Asignación parcial de cuota a un sueldo...');
        const sueldoTx = new Transaction({
            type: 'Egreso',
            category: 'Sueldos',
            concept: `Pago sueldo operador ${testTag}`,
            description: `Pago sueldo operador ${testTag}`,
            amount: 1100000,
            currency: 'ARS',
            status: 'pendiente',
            beneficiary: 'Juan Perez',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
            accountId: dummyAccount._id
        });
        await sueldoTx.save();

        const cuotaDoc = new Installment({
            source: 'venta',
            customerName: `Cliente Prueba ${testTag}`,
            concept: `Cuota 3 venta ${testTag}`,
            installmentNumber: 3,
            amount: 1350000,
            paidAmount: 0,
            currency: 'ARS',
            status: 'pendiente',
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days
        });
        await cuotaDoc.save();

        // Asignar $1.100.000 de la cuota al sueldo
        const summary1 = await assignQuotaToExpense({
            expenseId: sueldoTx._id,
            installmentId: cuotaDoc._id,
            assignedAmount: 1100000,
            user: 'Tester',
            notes: testTag
        });

        assert.strictEqual(summary1.summary.coveredTotal, 1100000, 'El total cubierto debe ser 1.100.000');
        assert.strictEqual(summary1.summary.remainingToCover, 0, 'El saldo faltante debe ser 0');
        assert.strictEqual(summary1.summary.coveragePercentage, 100, 'La cobertura debe ser 100%');
        assert.strictEqual(summary1.summary.isFullyCovered, true, 'Debe marcarse como totalmente cubierto');

        // Verificar que la cuota tiene $250.000 disponibles
        const twoWay1 = await getQuotaCoveredExpenses(cuotaDoc._id);
        assert.strictEqual(twoWay1.totalCommitted, 1100000, 'Comprometido en cuota debe ser 1.100.000');
        assert.strictEqual(twoWay1.availableAmount, 250000, 'Disponible en cuota debe ser 250.000');
        console.log('✓ TEST 1 PASADO: Sueldo $1.100.000 cubierto al 100%, cuota retiene $250.000 disponibles.');

        // ========================================================
        // TEST 2: Validación de Excedentes y Monedas
        // ========================================================
        console.log('\n[TEST 2] Validación de límites (no superar saldo disponible de cuota ni faltante de gasto)...');
        // Intentar comprometer más de los $250.000 restantes en un nuevo gasto
        const nuevoGasto = new Transaction({
            type: 'Egreso',
            category: 'Alquiler',
            concept: `Alquiler local ${testTag}`,
            description: `Alquiler local ${testTag}`,
            amount: 500000,
            currency: 'ARS',
            status: 'pendiente',
            accountId: dummyAccount._id
        });
        await nuevoGasto.save();

        let errorLImiteCuota = null;
        try {
            await assignQuotaToExpense({
                expenseId: nuevoGasto._id,
                installmentId: cuotaDoc._id,
                assignedAmount: 300000, // supera los 250.000 disponibles
                user: 'Tester'
            });
        } catch (e) {
            errorLImiteCuota = e.message;
        }
        assert(errorLImiteCuota && errorLImiteCuota.includes('supera el saldo disponible de la cuota'), 'Debe rechazar si supera el saldo disponible');

        // Asignar los 250.000 exactos permitidos
        await assignQuotaToExpense({
            expenseId: nuevoGasto._id,
            installmentId: cuotaDoc._id,
            assignedAmount: 250000,
            user: 'Tester',
            notes: testTag
        });
        const summaryGasto2 = await getExpenseAssignmentSummary(nuevoGasto._id);
        assert.strictEqual(summaryGasto2.summary.coveredTotal, 250000, 'Debe cubrir 250.000');
        assert.strictEqual(summaryGasto2.summary.remainingToCover, 250000, 'Faltan 250.000');

        // Rechazo por mezclar monedas (USD vs ARS)
        const cuotaUSD = new Installment({
            source: 'venta',
            customerName: `Cliente USD ${testTag}`,
            concept: `Cuota USD ${testTag}`,
            installmentNumber: 1,
            amount: 1000,
            currency: 'USD',
            status: 'pendiente',
            dueDate: new Date()
        });
        await cuotaUSD.save();

        let errorMoneda = null;
        try {
            await assignQuotaToExpense({
                expenseId: nuevoGasto._id, // ARS
                installmentId: cuotaUSD._id, // USD
                assignedAmount: 500,
                user: 'Tester'
            });
        } catch (e) {
            errorMoneda = e.message;
        }
        assert(errorMoneda && errorMoneda.includes('Monedas incompatibles'), 'Debe rechazar mezcla de monedas sin conversión');
        console.log('✓ TEST 2 PASADO: Validaciones estrictas de límites y monedas comprobadas.');

        // ========================================================
        // TEST 3: Asignar Varias Cuotas a un Mismo Gasto
        // ========================================================
        console.log('\n[TEST 3] Asignar varias cuotas a un mismo gasto...');
        const cuotaDoc2 = new Installment({
            source: 'venta',
            customerName: `Cliente 2 ${testTag}`,
            concept: `Cuota 1 ${testTag}`,
            installmentNumber: 1,
            amount: 250000,
            currency: 'ARS',
            status: 'pendiente',
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        });
        await cuotaDoc2.save();

        // Completar los 250.000 faltantes de nuevoGasto con cuotaDoc2
        const summaryGasto2Comp = await assignQuotaToExpense({
            expenseId: nuevoGasto._id,
            installmentId: cuotaDoc2._id,
            assignedAmount: 250000,
            user: 'Tester',
            notes: testTag
        });
        assert.strictEqual(summaryGasto2Comp.summary.coveredTotal, 500000, 'Total cubierto debe ser 500.000');
        assert.strictEqual(summaryGasto2Comp.summary.remainingToCover, 0, 'Faltante debe ser 0');
        assert.strictEqual(summaryGasto2Comp.summary.activeCount, 2, 'Debe tener 2 cuotas activas asignadas');
        console.log('✓ TEST 3 PASADO: Gasto cubierto combinando 2 cuotas distintas.');

        // ========================================================
        // TEST 4: Cargar Cuota Manual y Detección de Duplicados
        // ========================================================
        console.log('\n[TEST 4] Carga de cuota manual y detección de duplicados...');
        const manualResult = await createManualQuotaAndAssign({
            customerName: `Deudor Manual ${testTag}`,
            customerPhone: '11223344',
            concept: `Pagaré manual ${testTag}`,
            amount: 800000,
            currency: 'ARS',
            dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
            user: 'Tester',
            forceCreate: false
        });

        assert.strictEqual(manualResult.duplicateWarning, false, 'No debe dar duplicado en primera creación');
        assert(manualResult.installment && manualResult.installment._id, 'Debe retornar la cuota creada');
        assert.strictEqual(manualResult.installment.source, 'manual', 'El source debe ser manual');

        // Intentar crear la misma cuota nuevamente sin forzar
        const duplicateCheck = await createManualQuotaAndAssign({
            customerName: `Deudor Manual ${testTag}`,
            concept: `Pagaré manual duplicado ${testTag}`,
            amount: 800000,
            currency: 'ARS',
            dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
            user: 'Tester',
            forceCreate: false
        });

        assert.strictEqual(duplicateCheck.duplicateWarning, true, 'Debe detectar duplicado');
        assert(duplicateCheck.duplicates.length > 0, 'Debe listar los posibles duplicados');
        console.log('✓ TEST 4 PASADO: Cuota manual creada con source:manual y duplicados prevenidos.');

        // ========================================================
        // TEST 5: Separación de Asignación, Cobranza y Pago Real
        // ========================================================
        console.log('\n[TEST 5] Verificación de cobranza parcial y no pago automático del gasto...');
        // Simular que el cliente paga $500.000 de la cuotaDoc (de $1.350.000)
        cuotaDoc.paidAmount = 500000;
        cuotaDoc.status = 'parcial';
        await cuotaDoc.save();

        const summarySueldoConCobro = await getExpenseAssignmentSummary(sueldoTx._id);
        // El sueldo sigue pendiente
        assert.strictEqual(summarySueldoConCobro.expense.status, 'pendiente', 'El gasto debe seguir en estado pendiente');
        // La cuota recaudada para este sueldo refleja la porción recibida
        assert(summarySueldoConCobro.summary.collectedPortionTotal > 0, 'Debe reflejar dinero efectivamente recaudado');
        console.log(`✓ TEST 5 PASADO: Cuota con cobro parcial de $500.000 reflejada (${summarySueldoConCobro.summary.collectedPortionTotal}) mientras el sueldo sigue en estado ${summarySueldoConCobro.expense.status}.`);

        // ========================================================
        // TEST 6: Liberación de Asignación y Auditoría
        // ========================================================
        console.log('\n[TEST 6] Liberación de asignación pendiente...');
        const assignmentToRelease = summary1.assignments[0];
        const releasedSummary = await releaseQuotaAssignment(assignmentToRelease._id, 'Tester', 'Prueba de liberación');
        
        assert.strictEqual(releasedSummary.summary.coveredTotal, 0, 'Al liberar la cuota, el total cubierto debe ser 0');
        assert.strictEqual(releasedSummary.summary.remainingToCover, 1100000, 'El faltante debe volver a 1.100.000');

        const cuotaLiberadaTwoWay = await getQuotaCoveredExpenses(cuotaDoc._id);
        assert.strictEqual(cuotaLiberadaTwoWay.totalCommitted, 250000, 'Solo debe quedar comprometido lo del otro gasto ($250.000)');
        assert.strictEqual(cuotaLiberadaTwoWay.availableAmount, 1100000, 'El saldo disponible de la cuota vuelve a $1.100.000');
        console.log('✓ TEST 6 PASADO: Asignación liberada con éxito y saldo restituido a cartera.');

        console.log('\n========================================================');
        console.log('✅ TODOS LOS TESTS DE INTEGRACIÓN Y REGLAS FINANCIERAS PASARON EXITOSAMENTE!');
        console.log('========================================================');

    } finally {
        // Cleanup test docs
        await Transaction.deleteMany({ concept: new RegExp(testTag) });
        await Installment.deleteMany({ concept: new RegExp(testTag) });
        await Installment.deleteMany({ customerName: new RegExp(testTag) });
        await ExpenseQuotaAssignment.deleteMany({ notes: new RegExp(testTag) });
        if (dummyAccount && dummyAccount.name.includes(testTag)) {
            await Account.findByIdAndDelete(dummyAccount._id);
        }
        await mongoose.disconnect();
    }
}

runTests().catch(err => {
    console.error('❌ Error en test suite:', err);
    process.exit(1);
});
