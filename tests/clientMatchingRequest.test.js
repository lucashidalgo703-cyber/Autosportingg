import test from 'node:test';
import assert from 'node:assert/strict';
import {buildClientRequestSnapshot,isClientRequestActive,clientMatchingRequestLabel,clientRequestYearRange} from '../src/utils/clientMatchingRequest.js';
const client={_id:'client-a',fullName:'Cliente ficticio',phone:'teléfono de prueba',brand:'Marca QA',model:'Modelo QA',yearFrom:2010,yearTo:2020,maxBudget:0,currency:'USD',assignedTo:{_id:'seller-a'}};
test('request snapshots preserve zero budget, currency, actual contact, owner and exact criteria',()=>{
    const snapshot=buildClientRequestSnapshot(client);
    assert.deepEqual(snapshot,{clientId:'client-a',clientName:client.fullName,clientPhone:client.phone,requestedBrand:client.brand,requestedModel:client.model,yearRange:'2010 - 2020',budget:0,currency:'USD',assignedTo:'seller-a'});
    assert.equal(clientMatchingRequestLabel(client),'Marca QA · Modelo QA · 2010 - 2020');
});
test('missing optional budget or years remain unspecified instead of inventing zero or a year range',()=>{
    const snapshot=buildClientRequestSnapshot({...client,yearFrom:null,yearTo:null,maxBudget:null,assignedTo:null});
    assert.equal(snapshot.budget,null);assert.equal(snapshot.yearRange,'');assert.equal(snapshot.assignedTo,null);
    assert.equal(clientRequestYearRange({yearFrom:2015}),'Desde 2015');
    assert.equal(clientRequestYearRange({yearTo:2025}),'Hasta 2025');
});
test('request activation rejects incomplete, inverted or invalid criteria with actionable field errors',()=>{
    for(const [override,field]of [[{brand:''},'brand'],[{model:' '},'model'],[{yearFrom:2025,yearTo:2020},'yearTo'],[{yearFrom:2010.5},'yearFrom'],[{maxBudget:-1},'maxBudget'],[{currency:'EUR'},'currency']]){
        assert.throws(()=>buildClientRequestSnapshot({...client,...override}),error=>error.statusCode === 400 && Boolean(error.errors[field]));
    }
});
test('only open request statuses are active and fulfilled/cancelled requests stay closed',()=>{
    for(const status of ['Pendiente','Buscando'])assert.equal(isClientRequestActive({status}),true);
    for(const pedido of [null,{},{status:'Cumplido'},{status:'Cancelado'}])assert.equal(isClientRequestActive(pedido),false);
});
