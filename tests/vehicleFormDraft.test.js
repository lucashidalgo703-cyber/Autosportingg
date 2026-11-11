import test from 'node:test';
import assert from 'node:assert/strict';
import {vehicleDraftIdentity, readVehicleDraft, writeVehicleDraft, clearVehicleDraft, VEHICLE_DRAFT_MAX_AGE} from '../src/utils/vehicleFormDraft.js';

const NOW = Date.UTC(2026,10,10,12);
const token = payload => `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
const storage = () => { const data = new Map(); return {data, getItem:key => data.get(key) ?? null, setItem:(key,value) => data.set(key,value), removeItem:key => data.delete(key)}; };

test('draft identity requires an unexpired parseable session and has no anonymous fallback', () => {
    assert.equal(vehicleDraftIdentity(token({id:'user-a',exp:NOW/1000+60}),NOW),'user-a');
    for(const value of [null,'broken',token({id:'user-a'}),token({id:'user-a',exp:NOW/1000}),token({exp:NOW/1000+60})]) assert.equal(vehicleDraftIdentity(value,NOW),null);
});
test('draft identity reads UTF-8 usernames when a legacy session has no id', () => {
    assert.equal(vehicleDraftIdentity(token({username:'José',exp:NOW/1000+60}),NOW),'José');
});
test('drafts survive reopening only within the exact user namespace', () => {
    const store=storage();
    writeVehicleDraft(store,'user-a',{brand:'Marca ficticia',price:0,agencyOwned:false},NOW);
    assert.equal(readVehicleDraft(store,'user-b',NOW),null);
    assert.deepEqual(readVehicleDraft(store,'user-a',NOW).values,{brand:'Marca ficticia',price:0,agencyOwned:false});
});
test('escaped namespace identifiers cannot collide', () => {
    const store=storage();
    writeVehicleDraft(store,'user/a',{brand:'A'},NOW);
    writeVehicleDraft(store,'user_a',{brand:'B'},NOW);
    assert.equal(readVehicleDraft(store,'user/a',NOW).values.brand,'A');
    assert.equal(readVehicleDraft(store,'user_a',NOW).values.brand,'B');
});
test('draft excludes credentials, payment accounts, operation links and file objects', () => {
    const store=storage();
    writeVehicleDraft(store,'user-a',{brand:'Demo',token:'secret',accountId:'account',purchasePayment:{modality:'pagar_ahora'},strategicBoxKey:'stock',tradeInOriginSaleId:'sale',images:['blob:local'],documentationFiles:{tituloAutomotor:'private-url'},extra:{a:1},files:[{}]},NOW);
    assert.deepEqual(readVehicleDraft(store,'user-a',NOW).values,{brand:'Demo'});
    const serialized=[...store.data.values()][0];
    assert.ok(!serialized.includes('secret'));
    assert.ok(!serialized.includes('blob:'));
});
test('draft retains only supported documentation states', () => {
    const store=storage();
    writeVehicleDraft(store,'user-a',{documentation:{tituloAutomotor:'recibido',cedulaVerde:'pendiente',informeDominio:'no aplica',formulario08:'unexpected',unknown:'recibido'}},NOW);
    assert.deepEqual(readVehicleDraft(store,'user-a',NOW).values.documentation,{tituloAutomotor:'recibido',cedulaVerde:'pendiente',informeDominio:'no aplica'});
});
test('draft preserves purchase intent without retaining any account or payment authorization', () => {
    const store=storage();
    writeVehicleDraft(store,'user-a',{agencyOwned:true,draftPurchaseModality:'pago_parcial',purchasePayment:{accountId:'account',amountPaid:100}},NOW);
    assert.deepEqual(readVehicleDraft(store,'user-a',NOW).values,{agencyOwned:true,draftPurchaseModality:'pago_parcial'});
    writeVehicleDraft(store,'user-a',{draftPurchaseModality:'unexpected'},NOW);
    assert.deepEqual(readVehicleDraft(store,'user-a',NOW).values,{});
});
test('draft expires after seven days and rejects future timestamps', () => {
    const store=storage();
    writeVehicleDraft(store,'user-a',{brand:'Demo'},NOW);
    assert.ok(readVehicleDraft(store,'user-a',NOW+VEHICLE_DRAFT_MAX_AGE));
    assert.equal(readVehicleDraft(store,'user-a',NOW+VEHICLE_DRAFT_MAX_AGE+1),null);
    assert.equal(readVehicleDraft(store,'user-a',NOW-1),null);
});
test('draft rejects mismatched ownership and unknown versions', () => {
    const store=storage();
    writeVehicleDraft(store,'user-a',{brand:'Demo'},NOW);
    const key=[...store.data.keys()][0], data=JSON.parse(store.getItem(key));
    store.setItem(key,JSON.stringify({...data,userId:'user-b'}));
    assert.equal(readVehicleDraft(store,'user-a',NOW),null);
    store.setItem(key,JSON.stringify({...data,version:2}));
    assert.equal(readVehicleDraft(store,'user-a',NOW),null);
});
test('corrupt or unavailable storage never prevents opening a form', () => {
    const store=storage();
    writeVehicleDraft(store,'user-a',{brand:'Demo'},NOW);
    store.setItem([...store.data.keys()][0],'{broken');
    assert.equal(readVehicleDraft(store,'user-a',NOW),null);
    const broken={getItem(){throw Error('disabled');},setItem(){throw Error('disabled');},removeItem(){throw Error('disabled');}};
    assert.equal(readVehicleDraft(broken,'user-a',NOW),null);
    assert.equal(writeVehicleDraft(broken,'user-a',{},NOW),false);
    assert.doesNotThrow(()=>clearVehicleDraft(broken,'user-a'));
});
test('clear after a successful create removes only that user draft', () => {
    const store=storage();
    writeVehicleDraft(store,'user-a',{brand:'A'},NOW);
    writeVehicleDraft(store,'user-b',{brand:'B'},NOW);
    clearVehicleDraft(store,'user-a');
    assert.equal(readVehicleDraft(store,'user-a',NOW),null);
    assert.equal(readVehicleDraft(store,'user-b',NOW).values.brand,'B');
});

test('draft roundtrip retains public catalog fields, description, optional owners and commercial entry date', () => {
    const store=storage();
    const values={description:'Descripción de prueba',publicEquipment:'Equipamiento verificado',publicMaintenance:'Mantenimiento informado',publicPurchaseConditions:'Condiciones declaradas',youtubeUrl:'https://youtu.be/demo',owners:2,createdAt:'2026-11-10'};
    writeVehicleDraft(store,'user-a',values,NOW);
    assert.deepEqual(readVehicleDraft(store,'user-a',NOW).values,values);
});
