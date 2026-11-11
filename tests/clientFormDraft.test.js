import test from 'node:test';
import assert from 'node:assert/strict';
import {clientToForm,buildClientFormPayload,readClientDraft,writeClientDraft,clearClientDraft,CLIENT_DRAFT_MAX_AGE,prepareClientText} from '../src/utils/clientFormDraft.js';

const NOW=Date.UTC(2026,10,10,12);
const storage=()=>{const data=new Map();return {data,getItem:key=>data.get(key) ?? null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};

test('editing canonical full name preserves legacy name parts and the original creation instant',()=>{
    const client={fullName:'María del Mar Prueba',firstName:'María del Mar',lastName:'Prueba',createdAt:'2026-11-10T01:30:00.000Z',type:'vendedor',pipelineStage:'en_negociacion',assignedTo:{_id:'seller-a'}};
    const form=clientToForm(client);
    assert.equal(form.createdAt,'2026-11-09');
    assert.equal(form.pipelineStage,'negociacion');
    const payload=buildClientFormPayload({...form,notes:'Nueva nota'},client);
    assert.equal(payload.firstName,'María del Mar');
    assert.equal(payload.lastName,'Prueba');
    assert.equal(payload.fullName,client.fullName);
    assert.equal(payload.type,'vendedor');
    assert.equal(payload.assignedTo,'seller-a');
    assert.equal(payload.autoAssign,false);
    assert.equal(Object.hasOwn(payload,'createdAt'),false);
});
test('all optional qualification fields survive create/edit payloads without changing the agency relationship',()=>{
    const form={...clientToForm(null,new Date(NOW)),fullName:'Cliente ficticio',segment:'vip',gender:'mujer',birthDate:'1990-06-05',occupation:'Profesión de prueba',purchaseMethod:'financiacion',purchaseTiming:'1_3_meses',availableDownPayment:'0',downPaymentCurrency:'USD',tradeInIntent:'si',interestedVehicleId:'vehicle-a',type:'ambos',yearFrom:'2010',yearTo:'2020',maxBudget:'25000'};
    const payload=buildClientFormPayload(form);
    for(const key of ['segment','gender','birthDate','occupation','purchaseMethod','purchaseTiming','downPaymentCurrency','tradeInIntent','interestedVehicleId','type'])assert.equal(payload[key],form[key]);
    assert.equal(payload.availableDownPayment,0);
    assert.equal(payload.yearFrom,2010);
    assert.equal(payload.yearTo,2020);
    assert.equal(payload.maxBudget,25000);
    assert.equal(payload.fullName,'Cliente ficticio');
});
test('automatic assignment is explicit for creation only; a manual seller always wins',()=>{
    const base={...clientToForm(),fullName:'Cliente ficticio'};
    assert.equal(buildClientFormPayload(base).autoAssign,false);
    assert.equal(buildClientFormPayload({...base,autoAssign:true}).autoAssign,true);
    assert.equal(buildClientFormPayload({...base,autoAssign:true,assignedTo:'seller-a'}).autoAssign,false);
    assert.equal(buildClientFormPayload({...base,autoAssign:true},{fullName:'Cliente ficticio'}).autoAssign,false);
});
test('optional amounts remain null instead of inventing zero and validation keeps typed bad input reviewable',()=>{
    const base={...clientToForm(),fullName:'Cliente ficticio'};
    const payload=buildClientFormPayload(base);
    assert.equal(payload.availableDownPayment,null);assert.equal(payload.downPaymentCurrency,null);
    for(const key of ['maxBudget','yearFrom','yearTo'])assert.equal(payload[key],null);
    assert.throws(()=>buildClientFormPayload({...base,maxBudget:'no es un importe'}),error=>Boolean(error.errors.maxBudget));
    assert.throws(()=>buildClientFormPayload({...base,fullName:' '}),error=>Boolean(error.errors.fullName));
    assert.equal(base.maxBudget,'');
});
test('walk-in capture writes the real showroom origin',()=>{
    const payload=buildClientFormPayload({...clientToForm(),fullName:'Cliente ficticio',reason:'entro_puerta',source:'web'});
    assert.equal(payload.reason,'entro_puerta');assert.equal(payload.source,'local');
});

test('editing an existing walk-in client allows correcting the origin without running capture rotation',()=>{
    const client={fullName:'Cliente ficticio',reason:'entro_puerta',source:'local'};
    const payload=buildClientFormPayload({...clientToForm(client),source:'referido'},client);
    assert.equal(payload.source,'referido');assert.equal(payload.reason,'entro_puerta');assert.equal(payload.autoAssign,false);
});
test('client draft retains declared contact/preferences, excludes identity documents, files, credentials and automatic assignment',()=>{
    const store=storage();
    writeClientDraft(store,'user-a',{fullName:'Cliente ficticio',phone:'telefono ficticio',email:'cliente@example.test',notes:'Preferencia de prueba',segment:'vip',dniCuit:'identity-document',files:[{}],authToken:'private-token',attachments:['private-url'],autoAssign:true},NOW);
    assert.deepEqual(readClientDraft(store,'user-a',NOW).values,{fullName:'Cliente ficticio',phone:'telefono ficticio',email:'cliente@example.test',notes:'Preferencia de prueba',segment:'vip'});
    const serialized=[...store.data.values()][0];
    for(const secret of ['identity-document','private-token','private-url','autoAssign'])assert.ok(!serialized.includes(secret));
});
test('client drafts are isolated per exact user, versioned, expire after seven days and can be cleared independently',()=>{
    const store=storage();
    writeClientDraft(store,'user/a',{fullName:'A'},NOW);writeClientDraft(store,'user_a',{fullName:'B'},NOW);
    assert.equal(readClientDraft(store,'other-user',NOW),null);
    assert.equal(readClientDraft(store,'user/a',NOW).values.fullName,'A');
    assert.equal(readClientDraft(store,'user/a',NOW-1),null);
    assert.equal(readClientDraft(store,'user/a',NOW+CLIENT_DRAFT_MAX_AGE+1),null);
    const key=[...store.data.keys()][0],record=JSON.parse(store.getItem(key));
    store.setItem(key,JSON.stringify({...record,version:99}));assert.equal(readClientDraft(store,'user/a',NOW),null);
    store.setItem(key,JSON.stringify({...record,userId:'wrong-user'}));assert.equal(readClientDraft(store,'user/a',NOW),null);
    clearClientDraft(store,'user/a');assert.equal(readClientDraft(store,'user_a',NOW).values.fullName,'B');
});
test('the local assistant proposes only explicit fields and never invents a date, contact or name',()=>{
    assert.deepEqual(prepareClientText('Me interesa un SUV este mes. Llamame mañana.'),{description:'Me interesa un SUV este mes. Llamame mañana.'});
    assert.deepEqual(prepareClientText('Nombre: Cliente ficticio; Teléfono: texto de prueba\nEmail: cliente@example.test\nBusca: SUV\nPróxima acción: Consultar opciones\nFecha: mañana'),{fullName:'Cliente ficticio',phone:'texto de prueba',email:'cliente@example.test',description:'SUV',nextAction:'Consultar opciones'});
    assert.deepEqual(prepareClientText(''),{});
});
