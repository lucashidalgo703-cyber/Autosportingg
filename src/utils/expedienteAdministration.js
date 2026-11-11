import {parseArgentineMoney, roundMoney} from './saleCommercial.js';

export const EXPEDIENTE_EXPENSE_CONCEPTS = ['Patentes adeudadas','Multas adeudadas','Verificación policial','Informe de dominio','Arancel del registro','Honorarios de gestoría','Preparación de la unidad','Otro'];
export const expedienteEntityId = value => String(value?.id || value?._id || value || '');
export function expedienteMoney(value, currency) {
    if (!['ARS','USD'].includes(currency) || value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return 'Sin importe confirmado';
    return currency+' '+Number(value).toLocaleString('es-AR',{maximumFractionDigits:2});
}
export function expedienteExpenseTotals(rows=[]) {
    const totals={ARS:0,USD:0}; let invalid=0;
    for(const row of rows){if(row.deletedAt)continue;const amount=Number(row.amount);if(!['ARS','USD'].includes(row.currency)||!Number.isFinite(amount)||amount<0){invalid++;continue;}totals[row.currency]=roundMoney(totals[row.currency]+amount);}
    return {totals,invalid};
}
export function expedienteExpenseInput(values) {
    const errors={},amount=parseArgentineMoney(values.amount),concept=String(values.concept||'').trim();
    if(!concept || concept.length>500)errors.concept='Completá un concepto de hasta 500 caracteres.';
    if(!Number.isFinite(amount)||amount<=0)errors.amount='Ingresá un importe mayor a cero.';
    if(!['ARS','USD'].includes(values.currency))errors.currency='Elegí ARS o USD.';
    if(!['pending','retained'].includes(values.status))errors.status='El pago se registra desde la acción correspondiente.';
    return {errors,payload:{concept,amount,currency:values.currency,status:values.status,accountId:values.accountId||null,notes:String(values.notes||'').trim()}};
}
export function expedienteRegistryInput(values) {
    const errors={},rows=[];
    for(const [index,row]of (values.registrationAccounts||[]).entries()){
        const amount=parseArgentineMoney(row.amount),bank=String(row.bank||'').trim(),cbuAlias=String(row.cbuAlias||'').trim(),holder=String(row.holder||'').trim();
        if(!bank||!cbuAlias||!holder||!['ARS','USD'].includes(row.currency)||!Number.isFinite(amount)||amount<=0)errors['account'+index]='Revisá banco, CBU/alias, titular, importe y moneda de la cuenta '+(index+1)+'.';
        rows.push({...( /^[a-f\d]{24}$/i.test(String(row.id||''))?{id:row.id}:{}),bank,cbuAlias,holder,amount,currency:row.currency,notes:String(row.notes||'').trim()});
    }
    const raw=values.registrationDeposit||{},amount=raw.amount===''||raw.amount===null||raw.amount===undefined?null:parseArgentineMoney(raw.amount);
    if(amount!==null&&(!Number.isFinite(amount)||amount<0))errors.deposit='El total del registro no puede ser negativo.';
    if(amount!==null&&!['ARS','USD'].includes(raw.currency))errors.currency='Elegí la moneda del total del registro.';
    return {errors,payload:{registrationAccounts:rows,registrationDeposit:{amount,currency:raw.currency||'ARS',notes:String(raw.notes||'').trim()}}};
}
export function expedienteDocumentValues(detail, direction, issuer={}) {
    const purchase=direction==='purchase',party=detail.parties?.seller||detail.seller||{},buyer=detail.parties?.buyer||detail.buyer||{},finance=detail.finance||{},cost=finance.acquisitionCost||{},vehicle=detail.vehicle||{};
    const person=value=>({name:value.fullName||value.name||'',dni:value.dniCuit||value.dni||'',phone:value.phone||'',address:value.address||''});
    const agency={name:issuer.name||'AutoSporting',dni:issuer.dni||'',phone:issuer.phone||'',address:issuer.address||''};
    const validCost=cost.known===true&&Number.isFinite(Number(cost.amount))&&['ARS','USD'].includes(cost.currency);
    const method=purchase?'':finance.paymentMethod,financing=finance.financingDetails||{};
    const paymentMethod=method==='contado'?'Contado':method==='financiado'?'Financiado':method==='permuta'?'Permuta':method?'Otro':'';
    const paymentOther=({mixto:'Pago mixto',leasing:'Leasing',criptomonedas:'Criptomonedas',otro:'Otro'})[method]||'';
    return {sourceId:detail.id+':'+direction,issuer:agency,buyer:purchase?agency:person(buyer),seller:purchase?person(party):agency,
        amount:purchase?(validCost?Number(cost.amount):''):(Number.isFinite(Number(finance.salePrice))?Number(finance.salePrice):''),currency:purchase?(validCost?cost.currency:'ARS'):(finance.currency||'ARS'),
        paymentMethod,paymentOther,tradeIns:purchase?[]:(detail.tradeIns||[]).map(row=>({owner:row.ownerName||'',brand:row.brand||'',model:row.model||'',year:row.year||'',plate:row.plate||'',km:row.mileage??'',value:row.value??'',currency:row.currency||''})),balancePaymentMethod:financing.hasFinancing?'Financiado':'',financing:{installments:financing.installmentsCount??'',amount:financing.financedBalance??'',currency:finance.currency||'ARS',installmentAmount:financing.installmentAmount??'',installmentCurrency:finance.currency||'ARS'},vehicle:{brand:vehicle.brand||'',model:vehicle.model||vehicle.name||'',type:vehicle.vehicleType||vehicle.type||'',engine:vehicle.engineNumber||vehicle.engine||'',chassis:vehicle.chassisNumber||vehicle.chassis||'',plate:vehicle.plate||'',km:vehicle.mileage??vehicle.km??''},
        notes:purchase?'Compra de la agencia a la parte vendedora. Revisá los datos y condiciones antes de emitir el documento.':'Venta de la agencia a la parte compradora. Revisá los datos y condiciones antes de emitir el documento.'};
}
