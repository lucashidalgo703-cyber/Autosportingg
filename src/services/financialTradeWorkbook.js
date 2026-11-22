import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import {executeChatTurn} from './financialChatEngine.js';
import {projectLiquidity} from './financialPilotLiquidity.js';

const date = value => Number.isInteger(value) && value >= 61 && value <= 2958465;
const money = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const code = (value, prefix) => typeof value === 'string' && new RegExp(`^${prefix}-[A-Z0-9]{1,8}$`).test(value);
const text = value => typeof value === 'string' && value.trim().length > 0;

function inspectWorkbook(book, issues) {
    const expectedSheets = ['Permuta', 'Movimientos', 'Caja bajo estrés'];
    if (book.SheetNames.length !== expectedSheets.length || expectedSheets.some(name => !book.Sheets[name])) {
        throw new Error('Usá una copia de la plantilla con sus tres hojas originales.');
    }
    const check = (ok, label) => { if (!ok) issues.push(label); };
    const [trade, movements, cash] = expectedSheets.map(name => book.Sheets[name]);
    const value = (sheet, address) => {
        const cell = sheet[address];
        if (cell?.f || cell?.l || cell?.c || cell?.t === 'e') throw new Error('Usá valores simples, sin fórmulas, enlaces ni comentarios en los campos de carga.');
        return cell?.v;
    };
    const field = row => value(trade, `B${row}`);
    check(trade.A5?.v === 'Código ficticio de la operación' && trade.A15?.v === 'Precio total pactado' &&
        movements.A22?.v === 'Cuota ficticia' && cash.A12?.v === 'Movimiento base o código ficticio',
    'Conservá la estructura de la plantilla, sin mover filas ni columnas.');
    check(code(field(5),'PERM') && code(field(6),'UNIDAD') && code(field(7),'UNIDAD') && field(6) !== field(7),
    'Permuta B5:B7 — completá los tres códigos ficticios y usá códigos distintos para ambas unidades.');
    check(date(field(8)) && date(field(9)) && field(8) <= field(9), 'Permuta B8:B9 — completá las fechas de operación y corte en orden.');
    check(/^(ARS|USD),\s*(pesos enteros|dólares enteros|pesos con centavos|dólares con centavos)$/i.test(field(10) ?? ''),
    'Permuta B10 — indicá moneda y escala, por ejemplo ARS, pesos enteros.');
    check(text(field(11)) && text(field(12)), 'Permuta B11:B12 — documentá el alcance autorizado y los campos autorizados para OpenAI.');
    check([15,16,17,18,20,21,22].every(row => money(field(row))), 'Permuta B15:B22 — completá precio, efectivo, toma, capital, costos y gastos con importes numéricos.');
    check(Math.abs(field(15)-field(16)-field(17)-field(18)) < 0.005, 'Permuta B15:B18 — conciliá precio contra efectivo, toma y capital.');
    check(money(field(23)) && field(23) <= 1, 'Permuta B23 — ingresá la participación como porcentaje.');
    const currency = String(field(10) ?? '').slice(0,3).toUpperCase();
    const rows = [];
    for (let row = 5; row <= 20; row++) {
        const [id,kind,when,unit,total,agency,restricted,ref,usage] = [...'ABCDEFGHI'].map(col => value(movements, `${col}${row}`));
        if ([id,kind,when,unit,total,agency,restricted,ref,usage].every(entry => entry == null)) continue;
        const isExpense = kind === 'Pago de gasto directo';
        check(code(id,'MOV') && (!ref || code(ref,'REF')) &&
            ['Cobro del efectivo pactado','Pago de gasto directo','Cobro del crédito'].includes(kind) &&
            date(when) && unit === currency && money(total) && money(agency) && agency <= total &&
            ((isExpense && restricted == null) || (money(restricted) && restricted <= agency)) &&
            ['Inicial','Reservado'].includes(usage), `Movimientos fila ${row} — revisá código, tipo, fecha, moneda, importes y uso.`);
        rows.push({id,kind,total,usage});
    }
    check(new Set(rows.map(row => row.id)).size === rows.length, 'Movimientos — usá un código distinto por fila.');
    const reserved = rows.filter(row => row.usage === 'Reservado');
    check(reserved.length === 1 && reserved[0].kind === 'Cobro del crédito' && reserved[0].total > 0,
    'Movimientos — reservá exactamente un cobro de crédito para el turno final de la prueba.');
    const paidCredit = rows.filter(row => row.kind === 'Cobro del crédito');
    const before = field(18) - paidCredit.filter(row => row.usage === 'Inicial').reduce((sum,row) => sum + row.total,0);
    const after = before - (reserved[0]?.total ?? 0);
    check(money(field(27)) && money(field(28)) && after >= -0.005 && Math.abs(before-field(27)) < 0.005 &&
        Math.abs(after-field(28)) < 0.005, 'Permuta B27:B28 — conciliá el saldo antes y después con los movimientos de crédito.');
    check(money(field(29)) && typeof field(30) === 'number' && Number.isFinite(field(30)),
    'Permuta B29:B30 — completá el efectivo libre y el resultado propio conciliados.');
    if (field(18) > 0 && !date(field(19))) {
        check(Array.from({length:10}, (_,index) => index+23).some(row => date(value(movements,`C${row}`))),
        'Permuta B19 o Movimientos C23:C32 — completá el vencimiento o calendario de cuotas.');
    }
    const cashEntered = ['B5','B6','B7','B8','B9','B10'].some(address => value(cash,address) != null);
    if (cashEntered) {
        check(date(value(cash,'B5')) && date(value(cash,'B8')) && value(cash,'B5') <= value(cash,'B8') &&
            money(value(cash,'B6')) && money(value(cash,'B9')) && text(value(cash,'B7')) && text(value(cash,'B10')),
        'Caja bajo estrés B5:B10 — completá saldo, moneda, piso, fechas y supuestos.');
        check([31,33].every(row => typeof field(row) === 'number' && Number.isFinite(field(row))) &&
            [32,34].every(row => date(field(row))), 'Permuta B31:B34 — completá los mínimos conciliados antes y después y sus fechas.');
    }
    return {cashEntered,field,value,movements,cash,currency};
}

export function parseTradeWorkbook(bytes) {
    if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 2_000_000) throw new Error('Seleccioná un Excel de hasta 2 MB.');
    const book = XLSX.read(bytes, {type:'buffer',bookFiles:true});
    if (book.keys?.some(key => /(?:externalLinks\/|connections\.xml|vbaProject)/i.test(key))) {
        throw new Error('Usá una copia sin conexiones, vínculos externos ni macros.');
    }
    const issues = [];
    const workbook = inspectWorkbook(book,issues);
    return {...workbook,issues};
}

const iso = serial => new Date((serial-25569)*86400000).toISOString().slice(0,10);
const integer = value => Number.isSafeInteger(value) && Math.abs(value)<=1e12;
export function prepareTradeWorkbook(workbook) {
    const {field,value,movements,cash,currency,cashEntered,issues} = workbook;
    assert.equal(issues.length,0,issues.join('\n'));
    assert.ok(cashEntered,'Completá el escenario de caja del Excel.');
    const moneyRows = [15,16,17,18,20,21,22,27,28,29,30,31,33];
    assert.ok(moneyRows.every(row=>integer(field(row))) && field(23)===1,
        'Esta prueba local admite importes enteros y participación íntegra de la agencia.');
    assert.ok(Number.isInteger(field(19)), 'Indicá un vencimiento único en la ficha.');
    const rows = [];
    for (let row=5; row<=20; row++) {
        const [id,kind,when,unit,total,agency,restricted,,usage] = [...'ABCDEFGHI'].map(col=>value(movements,`${col}${row}`));
        if (id == null) continue;
        assert.ok(integer(total) && total>0 && total===agency && (!restricted || restricted===0), 'Los movimientos deben ser enteros y libres, íntegramente de la agencia.');
        rows.push({id,kind,when,unit,total,usage});
    }
    const [payment,expense,receipt] = ['Cobro del efectivo pactado','Pago de gasto directo','Cobro del crédito'].map(kind=>rows.find(row=>row.kind===kind));
    assert.ok(rows.length===3 && payment && expense && receipt && payment.usage==='Inicial' && expense.usage==='Inicial' && receipt.usage==='Reservado',
        'Se requiere un cobro inicial, un gasto directo y un cobro reservado.');
    assert.equal(expense.total,field(22),'El pago de gastos debe conciliar con los gastos declarados.');
    assert.equal(payment.total,field(29),'El cobro inicial debe conciliar con el efectivo libre.');

    const initialDay = value(cash,'B5');
    const start = iso(initialDay);
    const horizon = value(cash,'B8')-initialDay;
    const usable = value(cash,'B6'), floor = value(cash,'B9');
    assert.ok(integer(usable) && integer(floor) && horizon>=0 && horizon<=366 &&
        String(value(cash,'B7')).slice(0,3).toUpperCase()===currency,'Revisá moneda, importes enteros y horizonte de caja de hasta 366 días.');
    const placements = new Map();
    for (let row=33; row<=40; row++) {
        const id=value(cash,`A${row}`);
        if (id != null) placements.set(id,value(cash,`B${row}`));
    }
    assert.ok(rows.every(({id})=>placements.get(id)==='Separado'),
        'Marcá cada movimiento como Separado. Esta versión requiere que no estén incluidos en el saldo o los flujos base.');
    const flows = [], restrictions = {};
    for (let row=13; row<=30; row++) {
        const [id,baseDay,unit,amount,stressDay,condition,movement] = [...'ABCDEFG'].map(col=>value(cash,`${col}${row}`));
        if ([id,baseDay,unit,amount,stressDay,condition,movement].every(entry=>entry==null)) continue;
        assert.ok(typeof id==='string' && /^BASE-[A-Z0-9]{1,8}$/.test(id) && unit===currency && integer(amount) && amount!==0 &&
            Number.isInteger(baseDay) && Number.isInteger(stressDay) && baseDay>=initialDay && stressDay>=initialDay && !movement,
        `Caja bajo estrés, fila ${row}: verificá código BASE, moneda, importe y fechas. No links a movimientos de la permuta.`);
        flows.push({id,amount,day:baseDay-initialDay,adverseDay:stressDay-initialDay,currency});
        if (condition==='Cargo a fondos restringidos') {
            assert.ok(amount<0,'Solo un egreso puede cargarse a fondos restringidos.');
            restrictions[id]=-amount;
        }
    }
    const projection = purchase => {
        const added = (purchase ?? []).map(({amount,date,currency:unit},index)=>{
            const day = (Date.parse(date)-Date.parse(start))/86400000;
            assert.ok(unit===currency && Number.isInteger(day) && day>=0 && day<=horizon,'Movimiento fuera de la moneda o del horizonte del Excel.');
            return {id:`simulation-${index}`,amount,day,currency:unit};
        });
        const result=projectLiquidity({start,horizon,usable,floor,currency,flows:[...flows,...added],restrictions,scenario:'stress'});
        assert.ok(result.minimum,'El escenario de caja del Excel tiene identificadores duplicados o datos inválidos.');
        return result;
    };
    return {
        reportForContext:({purchase})=>({currency,manifest:{forecast:'Excel local'},projection:projection(),
            simulation:purchase ? projection(purchase) : null}),
        initial:{action:'update',kind:'trade',operationCurrency:currency,salePrice:field(15),cash:field(16),tradeValue:field(17),
            credit:field(18),creditDueDate:iso(field(19)),cost:field(20),inventoryCost:field(21),direct:field(22),share:100,
            cashCollected:payment.total,cashAgency:payment.total,cashRestricted:0,cashCollectedDate:iso(payment.when),directPaidDate:iso(expense.when)},
        collection:{action:'collect_credit',amount:receipt.total,currency,date:iso(receipt.when)},
        expected:[[27,31,32],[28,33,34]].map(([balance,minimum,day])=>[field(balance),field(minimum),iso(field(day)),field(30)])
    };
}

export function evaluateWorkbookTurn(chat, data, command, index) {
    const {revision} = executeChatTurn(chat,command,{reportForContext:data.reportForContext});
    const {settlement,liquidity} = revision.evaluation;
    const actual = [settlement.creditRemaining,liquidity.minimum.free,liquidity.minimum.date,settlement.ownResult];
    assert.ok(actual.every((item,i)=>item===data.expected[index][i]),'El resultado no coincide con los controles conciliados del Excel.');
    chat.revisions.push(revision);
    return actual;
}

export function verifyTradeWorkbook(bytes) {
    const data = prepareTradeWorkbook(parseTradeWorkbook(bytes));
    const chat = {context:{source:'Excel local'},revisions:[]};
    const checkpoints = [data.initial,data.collection].map((command,index)=>{
        const [creditRemaining,cashMinimum,minimumDate,agencyResult] = evaluateWorkbookTurn(chat,data,command,index);
        return {creditRemaining,cashMinimum,minimumDate,agencyResult};
    });
    return {currency:data.initial.operationCurrency,before:checkpoints[0],after:checkpoints[1]};
}
