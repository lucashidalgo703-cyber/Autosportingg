import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStockCommercialCalculation, fetchStockCommercialCars, stockSimulationKey } from '../src/utils/stockCommercialCalculator.js';
const car=(_id,price,currency='USD',extra={})=>({_id,brand:'Marca ficticia',name:'Unidad QA',status:'Disponible',agencyOwned:true,price,currency,...extra});
test('commercial values preserve explicit currencies above legacy thresholds and use canonical ownership including legacy trade-ins',()=>{
 const cars=[car('legacy',300000,'USD',{agencyOwned:false,tradeInOrigin:{saleId:'origin'}}),car('shared',100,'USD',{agencyOwned:false,ownerName:'Anterior QA',investor:{percentage:25}}),car('cents',0.03,'USD',{investor:{percentage:50}}),car('consigned',999,'USD',{agencyOwned:false,tradeInOrigin:{saleId:'origin',consigned:true}}),car('ars',1000000,'ARS'),car('unknown',500,'EUR'),car('bad','?'),car('reserved',100,'USD',{status:'Reservado'})];
 const result=buildStockCommercialCalculation(cars,{currency:'USD'});
 assert.equal(result.rows.find(row=>row.id==='legacy').ownPct,100);assert.equal(result.rows.find(row=>row.id==='shared').ownPct,75);assert.equal(result.rows.find(row=>row.id==='consigned').isExcluded,true);
 assert.equal(result.totals.total,300100.03);assert.equal(result.totals.own,300075.02);assert.equal(result.totals.investor,25.01);assert.equal(result.totals.excluded,999);assert.equal(result.totals.missingCount,1);assert.equal(result.unknownCurrency.length,1);
 const ars=buildStockCommercialCalculation(cars,{currency:'ARS'});assert.equal(ars.rows.length,1);assert.equal(ars.totals.total,1000000);assert.equal(result.rows.some(row=>row.id==='reserved'),false);
});
test('simulation is read-only, scoped by original currency and disabled simulation always restores registered prices',()=>{
 const cars=[car('one',10),car('two',100,'ARS')],before=structuredClone(cars),simulations={[stockSimulationKey('USD','one')]:'25.5',[stockSimulationKey('ARS','one')]:'999999'};
 assert.equal(buildStockCommercialCalculation(cars,{currency:'USD',simulations,simulate:true}).totals.total,25.5);
 assert.equal(buildStockCommercialCalculation(cars,{currency:'USD',simulations,simulate:false}).totals.total,10);
 const invalid=buildStockCommercialCalculation(cars,{currency:'USD',simulate:true,simulations:{[stockSimulationKey('USD','one')]:''}});assert.equal(invalid.rows[0].currentPrice,null);assert.equal(invalid.totals.validIncludedCount,0);assert.equal(invalid.totals.missingCount,1);
 assert.equal(buildStockCommercialCalculation(cars,{currency:'USD',simulate:true,simulations:{[stockSimulationKey('USD','one')]:'0'}}).rows[0].currentPrice,0);assert.deepEqual(cars,before);
});
test('property and identity filters preserve excluded and 100 percent investor views without inventing agency ownership',()=>{
 const cars=[car('own',10),car('investor',20,'USD',{investor:{percentage:100}}),car('excluded',30,'USD',{agencyOwned:false,ownerName:'Propietario QA'})];
 assert.deepEqual(buildStockCommercialCalculation(cars,{currency:'USD',property:'inversionista_100'}).rows.map(row=>row.id),['investor']);
 assert.equal(buildStockCommercialCalculation(cars,{currency:'USD',property:'inversionista_100'}).totals.own,0);
 assert.deepEqual(buildStockCommercialCalculation(cars,{currency:'USD',property:'excluidos',search:'excluded'}).rows.map(row=>row.id),['excluded']);
});
test('complete stock query loads more than 1000 cars through every authenticated page using GET only',async t=>{
 const oldStorage=globalThis.localStorage;globalThis.localStorage={getItem:()=> 'qa'};t.after(()=>{globalThis.localStorage=oldStorage;});
 const data=Array.from({length:2001},(_,index)=>car(String(index).padStart(24,'0'),index)),seen=[],progress=[];
 const result=await fetchStockCommercialCars({token:'qa',onProgress:value=>progress.push(value),request:async(path,options)=>{
  const query=new URL(path,'http://127.0.0.1').searchParams,page=Number(query.get('page')),limit=Number(query.get('limit'));seen.push(page);assert.equal(limit,1000);assert.equal(query.get('status'),'disponible');assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer qa');
  return new Response(JSON.stringify({cars:data.slice((page-1)*limit,page*limit),total:data.length,page,limit}),{status:200});
 }});
 assert.deepEqual(seen,[1,2,3]);assert.equal(result.length,2001);assert.equal(progress.at(-1).loaded,2001);assert.equal(progress.at(-1).total,2001);
});
test('overlapping or changed pages and changed sessions reject the entire query rather than return partial totals',async t=>{
 const oldStorage=globalThis.localStorage;let session='qa';globalThis.localStorage={getItem:()=>session};t.after(()=>{globalThis.localStorage=oldStorage;});
 const request=async path=>{const page=Number(new URL(path,'http://127.0.0.1').searchParams.get('page'));return new Response(JSON.stringify({cars:[car('same',10)],total:2,page,limit:1}),{status:200});};
 await assert.rejects(fetchStockCommercialCars({token:'qa',request}),/superponen/);
 let calls=0;await assert.rejects(fetchStockCommercialCars({token:'qa',request:async()=>{calls++;session='different';return new Response(JSON.stringify({cars:[car('one',10)],total:1,page:1,limit:1000}),{status:200});}}),error=>error.name==='AbortError');assert.equal(calls,1);
 await assert.rejects(fetchStockCommercialCars({token:'qa',request:async()=>assert.fail('No debe transmitir con otra sesión')}),error=>error.name==='AbortError');
});
