import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDemandGroups,matchDemandToCar,stockPreparation} from '../src/utils/stockWorkbench.js';
import {stockIsAgencyOwned} from '../src/utils/stockOwnership.js';
const car={_id:'car',brand:'Ford',name:'Focus',year:2022,currency:'USD',price:10000,status:'Disponible',createdAt:'2026-10-01'};
const request=(overrides={})=>({brand:'Ford',model:'Focus',source:'pedido',personKeys:['client:1'],...overrides});
test('demand deduplicates people across channels and connected identities without merging names',()=>{
 const result=buildDemandGroups([request(),request({source:'lead',personKeys:['client:1','phone:54']}),request({source:'consulta',personKeys:['phone:54']}),request({personKeys:['client:2']}),request({personKeys:[],name:'Same name'})],[]);
 assert.equal(result.people,2);assert.equal(result.groups[0].peopleCount,2);assert.equal(result.groups[0].demandCount,5);assert.equal(result.groups[0].unidentifiedCount,1);assert.deepEqual(result.groups[0].sources,{pedido:2,lead:1,consulta:1});
});
test('reserved cars do not cover demand and only validated active requests justify sourcing',()=>{
 const result=buildDemandGroups([request({budget:9000,currency:'USD'}),request({source:'lead',personKeys:['lead:2']}),request({importedUnvalidated:true,personKeys:['client:3']})],[{...car,status:'Reservado'}]);
 assert.equal(result.groups[0].stockCount,0);assert.equal(result.groups[0].validatedGapPeople,1);assert.equal(result.groups[0].unvalidatedPeople,1);
});
test('matching respects year and currency, including legacy aliases, without inventing exchange rates',()=>{
 assert.equal(matchDemandToCar(request({budget:10000,currency:'USD',yearFrom:2022,yearTo:2022}),{...car,currency:'U$S'}),true);
 for(const overrides of [{budget:9000,currency:'USD'},{budget:20000000,currency:'ARS'},{yearFrom:2023},{yearTo:2021},{model:'Fiesta'}])assert.equal(matchDemandToCar(request(overrides),car),false);
 assert.equal(matchDemandToCar(request({budget:10000,currency:'USD'}),{...car,price:0}),false);
});
test('no-demand list contains only available units and uses real aging',()=>{
 const result=buildDemandGroups([], [car,{...car,_id:'reserved',status:'Reservado'},{...car,_id:'withdrawn',status:'Retirado'}],new Date('2026-11-10T15:00Z'));
 assert.equal(result.withoutDemand.length,1);assert.ok(result.withoutDemand[0].days>=39);
});
test('preparation excludes sold or withdrawn units and describes actual missing fields',()=>{
 assert.equal(stockPreparation({...car,status:'Retirado'}).length,0);
 assert.deepEqual(stockPreparation({...car,images:['/car.jpg'],publishedOnML:'Si',inspection:{updatedAt:new Date()}}),[]);
 assert.ok(stockPreparation({...car,price:0}).includes('Falta precio'));
});
test('legacy trade-ins remain owned while an explicitly consigned trade-in retains its owner',()=>{
 assert.equal(stockIsAgencyOwned({tradeInOrigin:{saleId:'legacy'}}),true);
 assert.equal(stockIsAgencyOwned({agencyOwned:false,tradeInOrigin:{saleId:'new',consigned:true,agencyOwned:false}}),false);
 assert.equal(stockIsAgencyOwned({agencyOwned:true}),true);
});
