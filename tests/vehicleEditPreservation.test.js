import test from 'node:test';
import assert from 'node:assert/strict';
import {vehicleAcquisitionEditPatch, vehicleEditorExistingFiles, reorderVehicleEditorPhotos, removeVehicleEditorPhoto, vehicleEditorDateValue, vehicleDateEditPatch} from '../src/utils/vehicleEditPreservation.js';

test('an unchanged entry date keeps its original timestamp across a metadata edit', () => {
    const original = { createdAt: '2026-11-10T01:30:00.000Z' };
    assert.equal(vehicleEditorDateValue(original.createdAt), '2026-11-09');
    assert.deepEqual(vehicleDateEditPatch(original, { createdAt: '2026-11-09', color: 'Azul' }), {});
});

test('an explicit entry calendar change is persisted on that day in Argentina', () => {
    const patch = vehicleDateEditPatch({ createdAt: '2026-11-10T17:00:00.000Z' }, { createdAt: '2026-11-12' });
    assert.equal(patch.createdAt, '2026-11-12T03:00:00.000Z');
    assert.equal(vehicleEditorDateValue(patch.createdAt), '2026-11-12');
});

test('an empty optional sale date is not invented and invalid calendar changes are rejected', () => {
    assert.deepEqual(vehicleDateEditPatch({}, { soldAt: '', createdAt: '' }), {});
    assert.throws(() => vehicleDateEditPatch({}, { createdAt: '2026-02-30' }));
});

test('legacy cover-only car is retained as an existing photo on edit', () => {
    const car={images:[],coverImage:'https://example.test/cover.jpg'};
    assert.deepEqual(vehicleEditorExistingFiles(car),[{preview:car.coverImage,isExisting:true,url:car.coverImage}]);
    assert.deepEqual(car.images,[]);
});
test('normal image arrays retain their order and do not duplicate cover', () => {
    assert.deepEqual(vehicleEditorExistingFiles({images:['a','b'],coverImage:'a'}).map(file=>file.url),['a','b']);
    assert.deepEqual(vehicleEditorExistingFiles({images:[]}),[]);
});
test('unchanged derived acquisition display never replays a raw purchase correction', () => {
    for (const rawPurchase of [undefined,0,150]) {
        const record={purchasePrice:rawPurchase,tradeInOrigin:{value:250,currency:'ARS'}};
        const initial={purchasePrice:record.tradeInOrigin.value,purchaseCurrency:'ARS'};
        assert.deepEqual(vehicleAcquisitionEditPatch(initial,{...initial,brand:'Marca editada'}),{});
        assert.equal(record.purchasePrice,rawPurchase);
    }
});
test('an absent amount and unchanged currency are omitted from metadata save', () => {
    assert.deepEqual(vehicleAcquisitionEditPatch({purchasePrice:'',purchaseCurrency:'USD'},{purchasePrice:'',purchaseCurrency:'U$S'}),{});
});
test('explicit acquisition amount correction remains present without replaying currency', () => {
    assert.deepEqual(vehicleAcquisitionEditPatch({purchasePrice:250,purchaseCurrency:'USD'},{purchasePrice:'300',purchaseCurrency:'U$S'}),{purchasePrice:300});
});
test('explicit currency-only correction does not replay a derived amount', () => {
    assert.deepEqual(vehicleAcquisitionEditPatch({purchasePrice:250,purchaseCurrency:'USD'},{purchasePrice:250,purchaseCurrency:'ARS'}),{purchaseCurrency:'ARS'});
});
test('reordering carries photo framing and recomputes the cover framing', () => {
    const files=[{url:'a'},{url:'b'},{url:'c'}], positions=['50% 10%','50% 20%','50% 30%'];
    const next=reorderVehicleEditorPhotos(files,positions,'50% 10%',2,0);
    assert.deepEqual(next.files.map(file=>file.url),['c','a','b']);
    assert.deepEqual(next.imagePositions,['50% 30%','50% 10%','50% 20%']);
    assert.equal(next.imagePosition,'50% 30%');
    assert.deepEqual(files.map(file=>file.url),['a','b','c']);
    assert.deepEqual(positions,['50% 10%','50% 20%','50% 30%']);
});
test('removing a cover carries remaining per-photo framing', () => {
    const next=removeVehicleEditorPhoto(['a','b','c'],['50% 10%','50% 20%','50% 30%'],'50% 10%',0);
    assert.deepEqual(next,{files:['b','c'],imagePositions:['50% 20%','50% 30%'],imagePosition:'50% 20%'});
});
test('sparse legacy framing defaults stay attached to each photo during reordering', () => {
    const next=reorderVehicleEditorPhotos(['a','b'],[],'50% 25%',1,0);
    assert.deepEqual(next.imagePositions,['50% 75%','50% 25%']);
    assert.equal(next.imagePosition,'50% 75%');
});
test('removing the final image clears framing and leaves the default for later uploads', () => {
    assert.deepEqual(removeVehicleEditorPhoto(['a'],['50% 10%'],'50% 10%',0),{files:[],imagePositions:[],imagePosition:'50% 75%'});
});
