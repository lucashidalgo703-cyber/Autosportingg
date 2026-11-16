import assert from 'node:assert/strict';
import { parseExpenseText, interpretExpenseText } from '../src/services/expenseDictationService.js';

const vehicles = [
    { id: '111111111111111111111111', brand: 'Volkswagen', name: 'Amarok Extreme', year: 2022, plateOrVin: 'QA001AA', infoAuto: { versionName: 'Extreme V6' } },
    { id: '222222222222222222222222', brand: 'Volkswagen', name: 'Amarok Extreme', year: 2020, plateOrVin: 'QA002AA', infoAuto: { versionName: 'Extreme V6' } },
    { id: '333333333333333333333333', brand: 'Toyota', name: 'Hilux', year: 2021, plateOrVin: 'QA003AA' },
    { id: '444444444444444444444444', brand: 'Volkswagen', name: 'Amarok Comfortline', year: 2022, plateOrVin: 'QA004AA' }
];
const accounts = [
    { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Caja efectivo', type: 'Efectivo', currency: 'ARS' },
    { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Banco Galicia ARS', type: 'Banco', currency: 'ARS' },
    { id: 'cccccccccccccccccccccccc', name: 'Banco Santander ARS', type: 'Banco', currency: 'ARS' }
];
const options = { vehicles, accounts, now: new Date('2026-11-16T16:00:00Z') };
const parse = (text, extra = {}) => parseExpenseText(text, { ...options, ...extra });
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok - ' + name); }

test('Frase solicitada: importe, pesos, efectivo, Taller y concepto limpio sin elegir entre dos años', () => {
    const { expense, interpretationWarnings } = parse('Pagué 85 mil pesos en efectivo por la alineación de la Amarok Extreme');
    assert.deepEqual(expense, { date: '2026-11-16', amount: 85000, currency: 'ARS', paymentMethod: 'efectivo',
        vehicleQuery: 'Amarok Extreme', kind: 'workshop', category: 'Taller', concept: 'Alineación' });
    assert.equal(interpretationWarnings.length, 0);
});
test('Transferencia, miles con punto, ayer y patente exacta; no inventa un banco', () => {
    const { expense } = parse('Transferí 120.500 pesos ayer por repuestos de la Amarok QA001AA');
    assert.equal(expense.amount, 120500); assert.equal(expense.date, '2026-11-15');
    assert.equal(expense.vehicleId, vehicles[0].id); assert.equal(expense.paymentMethod, 'transferencia');
    assert.equal(expense.accountId, undefined); assert.equal(expense.concept, 'Repuestos');
});
test('Números dictados en palabras y año diferencian la versión correcta', () => {
    const { expense } = parse('Pagué ochenta y cinco mil pesos en efectivo por la alineación de la Amarok Extreme 2022');
    assert.equal(expense.amount, 85000); assert.equal(expense.vehicleId, vehicles[0].id); assert.equal(expense.concept, 'Alineación');
});
test('Una referencia parcial Amarok nunca elige silenciosamente una versión', () => {
    const { expense } = parse('Pagué 1000 pesos en efectivo por limpieza de la Amarok');
    assert.equal(expense.vehicleId, undefined); assert.equal(expense.vehicleQuery, 'amarok');
});
test('Un millón doscientos mil y categoría operativa', () => {
    const { expense } = parse('Pagué un millón doscientos mil pesos por alquiler');
    assert.equal(expense.amount, 1200000); assert.equal(expense.kind, 'operational'); assert.equal(expense.concept, 'Alquiler');
});
test('Importe compacto 85mil y advertencia explícita por ARS inferido', () => {
    const result = parse('Pagué 85mil en efectivo por cubiertas de la Amarok QA001AA');
    assert.equal(result.expense.amount, 85000); assert.equal(result.expense.currency, 'ARS');
    assert.match(result.interpretationWarnings[0], /ARS/);
});
test('Decimales con coma en USD', () => {
    const { expense } = parse('Pagué 85,50 dólares en efectivo por limpieza');
    assert.equal(expense.amount, 85.5); assert.equal(expense.currency, 'USD');
});
test('Miles y centavos argentinos', () => {
    const { expense } = parse('Pagué 1.234,56 pesos en efectivo por limpieza');
    assert.equal(expense.amount, 1234.56);
});
test('Millón y medio / medio millón no pierden la fracción dictada', () => {
    assert.equal(parse('Pagué un millón y medio de pesos por alquiler').expense.amount, 1500000);
    assert.equal(parse('Pagué medio millón de pesos por alquiler').expense.amount, 500000);
});
test('Centavos dictados en palabras se suman una vez al importe', () => {
    assert.equal(parse('Pagué ochenta y cinco pesos con cincuenta centavos en efectivo por limpieza').expense.amount, 85.5);
});
test('Símbolo U$S delante del importe', () => {
    assert.equal(parse('Pagué U$S 100 en efectivo por limpieza').expense.currency, 'USD');
});
test('Dos importes generan una pregunta antes de poder confirmar', () => {
    const result = parse('Pagué 5.000 o 7.000 pesos en efectivo por limpieza');
    assert.equal(result.expense.amount, undefined); assert.match(result.interpretationWarnings[0], /más de un importe/);
});
test('Año y patente no se convierten en monto', () => {
    assert.equal(parse('La Amarok es año 2022 patente QA001AA').expense.amount, undefined);
    assert.equal(parse('Alineación de Amarok 2022').expense.amount, undefined);
});
test('Patente y modelo contradictorios no seleccionan una unidad', () => {
    const result = parse('Pagué 5000 pesos por alineación de la Amarok QA003AA');
    assert.equal(result.expense.vehicleId, undefined); assert.match(result.interpretationWarnings[0], /no coinciden/);
});
test('Dos modelos diferentes no convierten el primero en selección', () => {
    const result = parse('Pagué 5000 pesos por alineación de Amarok o Hilux');
    assert.equal(result.expense.vehicleId, undefined); assert.ok(result.interpretationWarnings.length);
});
test('Cuenta bancaria real nombrada: Galicia', () => {
    const { expense } = parse('Transferí 5000 pesos desde Galicia por limpieza');
    assert.equal(expense.accountId, accounts[1].id);
});
test('Una cuenta inexistente mencionada no produce un identificador ficticio', () => {
    assert.equal(parse('Transferí 5000 pesos desde Banco Imaginario por limpieza').expense.accountId, undefined);
});
test('Fecha dd/mm/yyyy no es un importe y mantiene el día', () => {
    const { expense } = parse('Pagué 85000 pesos en efectivo el 15/11/2026 por alineación de Amarok QA001AA');
    assert.equal(expense.date, '2026-11-15'); assert.equal(expense.amount, 85000); assert.equal(expense.concept, 'Alineación');
});
test('Anteayer usa calendario argentino aun cerca de medianoche UTC', () => {
    const { expense } = parse('Pagué 5000 pesos anteayer en efectivo por limpieza', { now: new Date('2026-11-16T01:00:00Z') });
    assert.equal(expense.date, '2026-11-13');
});
test('Fecha imposible y fechas contradictorias se rechazan', () => {
    assert.throws(() => parse('Pagué 5000 pesos el 30/02/2026 por limpieza'), /no existe/);
    assert.throws(() => parse('Pagué 5000 pesos ayer hoy por limpieza'), /fechas distintas/);
});
test('Tarjeta pagada frente a consumo pendiente', () => {
    assert.equal(parse('Pagué 5000 pesos con tarjeta por limpieza').expense.cardTiming, 'paid');
    const pending = parse('Compré 5000 pesos con tarjeta a pagar por repuestos de Amarok QA001AA').expense;
    assert.equal(pending.cardTiming, 'deferred'); assert.equal(pending.kind, 'workshop'); assert.equal(pending.category, 'Taller');
    assert.equal(parse('5000 pesos con tarjeta por limpieza').expense.cardTiming, undefined);
});
test('Concepto conserva acentos y no se rompe por emoji anterior al importe', () => {
    assert.equal(parse('🚙 Pagué 85000 pesos en efectivo por alineación de Amarok QA001AA').expense.concept, 'Alineación');
});
test('Categorías reales del CRM se usan literalmente', () => {
    assert.equal(parse('Pagué 5000 pesos en efectivo por publicidad Marketing', { categories: ['Taller', 'Marketing', 'Gastos Varios'] }).expense.category, 'Marketing');
});
test('Negativos, texto vacío y texto excesivo se rechazan', () => {
    assert.throws(() => parse('Pagué -5000 pesos en efectivo por limpieza'), /positivo/);
    assert.throws(() => parse(''), /Escribí o dictá/);
    assert.throws(() => parse('x'.repeat(3001)), /3000/);
});
test('Texto sin un gasto reconocible conserva campos pendientes', () => {
    const { expense } = parse('hola quiero consultar algo');
    assert.equal(expense.amount, undefined); assert.equal(expense.paymentMethod, undefined); assert.equal(expense.concept, undefined);
});
await assert.rejects(() => interpretExpenseText({ id: '111111111111111111111111', role: 'owner' }, { text: 'Pagué 1000 pesos', requestId: { $ne: null } }), /identificador válido/);
passed++; console.log('ok - RequestId objeto se rechaza antes de consultar Mongo');
console.log(`${passed} pruebas del intérprete local aprobadas.`);
