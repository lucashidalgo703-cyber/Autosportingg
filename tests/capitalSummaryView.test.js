import test from 'node:test';
import assert from 'node:assert/strict';
import { capitalBucket, capitalAuditRows, capitalAuditCsv, formatCapitalMoney } from '../src/utils/capitalSummaryView.js';
const vehicle={id:'qa-own',brand:'Marca ficticia',name:'Modelo, "QA"',status:'Disponible',currency:'USD',originalPurchaseCurrency:'USD',originalSaleCurrency:'ARS',purchasePrice:10,expenses:2,costoBase:12,costoPropio:9,costoInv:3,price:0,precioPropio:0,precioInv:0,ownPct:75,invPct:25,isShared:true};
const bucket={currency:'USD',componentes:{stockPropioCosto:{items:[vehicle],itemsConsignaciones:[{...vehicle,id:'qa-consigned',isShared:false,isConsignment:true,status:'Retirado',ownPct:0,invPct:0,price:20,precioInv:20,costoInv:0,costoPropio:0}]}},totales:{}};
test('capital view uses only explicitly matching currency buckets and preserves missing versus zero',()=>{
 const summary={currency:'ARS',componentes:{},totales:{},byCurrency:{USD:bucket}};
 assert.equal(capitalBucket(summary,'USD'),bucket);assert.equal(capitalBucket(summary,'ARS'),null);assert.equal(capitalBucket(summary,'EUR'),null);assert.equal(capitalBucket({byCurrency:{USD:{...bucket,currency:'ARS'}}},'USD'),null);
 assert.equal(formatCapitalMoney(0,'USD'),'USD 0');assert.equal(formatCapitalMoney(undefined,'USD'),'—');assert.equal(formatCapitalMoney(10,'EUR'),'—');
});
test('stock audit includes real excluded units and filters current currency rows by status and visible identity',()=>{
 assert.equal(capitalAuditRows(bucket).length,2);assert.deepEqual(capitalAuditRows(bucket,{status:'retirado'}).map(row=>row.id),['qa-consigned']);assert.deepEqual(capitalAuditRows(bucket,{status:'consignacion'}).map(row=>row.id),['qa-consigned']);assert.deepEqual(capitalAuditRows(bucket,{status:'disponible',search:'Modelo'}).map(row=>row.id),['qa-own']);assert.equal(capitalAuditRows(bucket,{search:'not registered'}).length,0);
});
test('currency-labelled UTF8 CSV quotes actual fields, neutralizes formulas and separates outside owners from investors',()=>{
 const rows=capitalAuditRows(bucket),csv=capitalAuditCsv([{...rows[0],brand:'=FORMULA()',reason:'Línea "ficticia", ñ',expenses:-2},rows[1]],'USD');
 assert.ok(csv.startsWith('\uFEFF'));assert.match(csv,/"'\=FORMULA\(\)"/);assert.ok(csv.includes('"Modelo, ""QA"""'));assert.ok(csv.includes('"Línea ""ficticia"", ñ"'));assert.ok(csv.includes('"-2"'));assert.ok(csv.includes('"Moneda original de adquisición"'));assert.ok(csv.includes('"Publicado de terceros excluidos"'));assert.ok(csv.includes('"Consignada excluida"'));
 const third=csv.split('\r\n').at(-1);assert.ok(third.includes('"0","0","0","20"'),'Precio del propietario excluido no se presenta como precio del inversor');
});
